/**
 * Servicio del Módulo de Productos.
 * Contiene la lógica de negocio, consultas con Knex.js y validaciones de base de datos.
 * 
 * Reglas clave implementadas:
 * - Aislamiento multi-negocio estricto: toda operación filtra por `business_id`.
 * - Verificación de unicidad de SKU y Barcode por empresa.
 * - Protección de datos de costos: si el usuario no tiene 'costs.read', el cost_price no se expone.
 * - No borrado físico destructivo: 'archiveProduct' cambia el estado a 'archived' para proteger el Kardex.
 */
const db = require('../../config/database');

class ProductsService {
  /**
   * Sanitiza un producto según los permisos del usuario.
   * Si canReadCosts es false, oculta 'cost_price'.
   */
  sanitizeProduct(product, canReadCosts = false) {
    if (!product) return null;

    const copy = { ...product };

    // Si variants viene como string en SQLite, lo parseamos a JSON
    if (typeof copy.variants === 'string') {
      try {
        copy.variants = JSON.parse(copy.variants);
      } catch (e) {
        // En caso de que no sea JSON válido, se deja como está
      }
    }

    // Regla de seguridad: Proteger costo unitario
    if (!canReadCosts) {
      delete copy.cost_price;
    }

    return copy;
  }

  /**
   * Lista productos con paginación y filtros.
   */
  async list(businessId, filters, canReadCosts = false) {
    const { page = 1, limit = 10, search, category_id, brand_id, status } = filters;
    const offset = (page - 1) * limit;

    // Consulta base filtrando por el negocio actual
    const query = db('products').where('business_id', businessId);

    // Filtro por estado ('active', 'archived', o 'all' para ambos)
    if (status && status !== 'all') {
      query.where('status', status);
    }

    // Filtros opcionales por categoría y marca
    if (category_id) {
      query.where('category_id', category_id);
    }
    if (brand_id) {
      query.where('brand_id', brand_id);
    }

    // Búsqueda por SKU, nombre o código de barras
    if (search) {
      query.where((builder) => {
        builder.where('sku', 'like', `%${search}%`)
               .orWhere('name', 'like', `%${search}%`)
               .orWhere('barcode', 'like', `%${search}%`);
      });
    }

    // Contar total de registros para paginación
    const countResult = await query.clone().count({ total: '*' }).first();
    const total = Number(countResult.total);

    // Obtener los registros paginados
    const products = await query
      .clone()
      .select('*')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data: products.map(prod => this.sanitizeProduct(prod, canReadCosts)),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtiene un producto por su ID y su business_id.
   */
  async getById(businessId, productId, canReadCosts = false) {
    const product = await db('products')
      .where({ id: productId, business_id: businessId })
      .first();

    if (!product) {
      return null;
    }

    return this.sanitizeProduct(product, canReadCosts);
  }

  /**
   * Crea un nuevo producto validando unicidad de SKU y Barcode para ese negocio.
   */
  async create(businessId, productData) {
    const { sku, barcode } = productData;

    // 1. Validar que el SKU no esté repetido en el mismo negocio
    const existingSku = await db('products')
      .where({ business_id: businessId, sku })
      .first();

    if (existingSku) {
      const error = new Error(`Ya existe un producto con el SKU '${sku}' en tu empresa.`);
      error.statusCode = 409;
      throw error;
    }

    // 2. Validar que el código de barras no esté repetido (si se proporcionó)
    if (barcode) {
      const existingBarcode = await db('products')
        .where({ business_id: businessId, barcode })
        .first();

      if (existingBarcode) {
        const error = new Error(`Ya existe un producto con el código de barras '${barcode}' en tu empresa.`);
        error.statusCode = 409;
        throw error;
      }
    }

    // Preparamos los datos con el business_id asignado
    const insertPayload = {
      ...productData,
      business_id: businessId,
      variants: productData.variants ? JSON.stringify(productData.variants) : null,
      created_at: new Date(),
      updated_at: new Date()
    };

    const [newId] = await db('products').insert(insertPayload);
    
    // Obtenemos el producto recién creado
    const createdProduct = await db('products').where({ id: newId }).first();
    return this.sanitizeProduct(createdProduct, true);
  }

  /**
   * Actualiza un producto existente.
   */
  async update(businessId, productId, updateData) {
    // 1. Verificar si existe el producto en este negocio
    const product = await db('products')
      .where({ id: productId, business_id: businessId })
      .first();

    if (!product) {
      const error = new Error('El producto especificado no fue encontrado.');
      error.statusCode = 404;
      throw error;
    }

    // 2. Si se actualiza el SKU, validar que no colisione con otro producto del mismo negocio
    if (updateData.sku && updateData.sku !== product.sku) {
      const existingSku = await db('products')
        .where({ business_id: businessId, sku: updateData.sku })
        .whereNot({ id: productId })
        .first();

      if (existingSku) {
        const error = new Error(`El SKU '${updateData.sku}' ya está asignado a otro producto.`);
        error.statusCode = 409;
        throw error;
      }
    }

    // 3. Si se actualiza el Barcode, validar unicidad
    if (updateData.barcode && updateData.barcode !== product.barcode) {
      const existingBarcode = await db('products')
        .where({ business_id: businessId, barcode: updateData.barcode })
        .whereNot({ id: productId })
        .first();

      if (existingBarcode) {
        const error = new Error(`El código de barras '${updateData.barcode}' ya pertenece a otro producto.`);
        error.statusCode = 409;
        throw error;
      }
    }

    const payload = {
      ...updateData,
      updated_at: new Date()
    };

    if (payload.variants) {
      payload.variants = JSON.stringify(payload.variants);
    }

    await db('products')
      .where({ id: productId, business_id: businessId })
      .update(payload);

    const updatedProduct = await db('products').where({ id: productId }).first();
    return this.sanitizeProduct(updatedProduct, true);
  }

  /**
   * Archiva un producto (borrado lógico para preservar Kardex e historial de inventario).
   */
  async archive(businessId, productId) {
    const product = await db('products')
      .where({ id: productId, business_id: businessId })
      .first();

    if (!product) {
      const error = new Error('El producto especificado no fue encontrado.');
      error.statusCode = 404;
      throw error;
    }

    // Cambiamos el estado a 'archived'
    await db('products')
      .where({ id: productId, business_id: businessId })
      .update({
        status: 'archived',
        updated_at: new Date()
      });

    return {
      message: 'Producto archivado exitosamente. No se eliminó de la BD para preservar el historial del Kardex.',
      id: productId,
      status: 'archived'
    };
  }
}

module.exports = new ProductsService();

