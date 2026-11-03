/**
 * Controlador de Productos.
 * Maneja las peticiones HTTP, validaciones con Zod y respuestas JSON.
 */
const productsService = require('./products.service');
const {
  createProductSchema,
  updateProductSchema,
  queryProductsSchema
} = require('./products.validation');

class ProductsController {
  /**
   * GET /api/products
   * Lista productos con filtros, paginación y protección de costos.
   */
  async index(req, res) {
    try {
      const parsedQuery = queryProductsSchema.safeParse(req.query);
      if (!parsedQuery.success) {
        return res.status(400).json({
          ok: false,
          error: 'Parámetros de búsqueda inválidos',
          details: parsedQuery.error.format()
        });
      }

      const businessId = req.user.business_id;
      const canReadCosts = req.user.permissions?.includes('costs.read') || false;

      const result = await productsService.list(businessId, parsedQuery.data, canReadCosts);

      return res.status(200).json({
        ok: true,
        ...result
      });
    } catch (error) {
      console.error('Error al listar productos:', error);
      return res.status(500).json({
        ok: false,
        error: 'Ocurrió un error al obtener la lista de productos.'
      });
    }
  }

  /**
   * GET /api/products/:id
   * Obtiene un producto por su ID.
   */
  async show(req, res) {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        return res.status(400).json({
          ok: false,
          error: 'El ID de producto debe ser un número entero válido.'
        });
      }

      const businessId = req.user.business_id;
      const canReadCosts = req.user.permissions?.includes('costs.read') || false;

      const product = await productsService.getById(businessId, productId, canReadCosts);

      if (!product) {
        return res.status(404).json({
          ok: false,
          error: 'Producto no encontrado en esta empresa.'
        });
      }

      return res.status(200).json({
        ok: true,
        data: product
      });
    } catch (error) {
      console.error('Error al consultar producto:', error);
      return res.status(500).json({
        ok: false,
        error: 'Ocurrió un error al consultar el producto.'
      });
    }
  }

  /**
   * POST /api/products
   * Crea un nuevo producto y guarda la imagen si se subió mediante Multer.
   */
  async store(req, res) {
    try {
      // Validamos los datos con Zod
      const parsedBody = createProductSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          ok: false,
          error: 'Error de validación en los campos del producto.',
          details: parsedBody.error.format()
        });
      }

      const productData = { ...parsedBody.data };

      // Si subieron una imagen con Multer, guardamos la URL relativa
      if (req.file) {
        productData.image_url = `/uploads/products/${req.file.filename}`;
      }

      const businessId = req.user.business_id;
      const newProduct = await productsService.create(businessId, productData);

      return res.status(201).json({
        ok: true,
        message: 'Producto creado exitosamente.',
        data: newProduct
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        ok: false,
        error: error.message || 'Ocurrió un error al crear el producto.'
      });
    }
  }

  /**
   * PUT /api/products/:id
   * Actualiza los datos de un producto.
   */
  async update(req, res) {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        return res.status(400).json({
          ok: false,
          error: 'El ID de producto debe ser un número entero válido.'
        });
      }

      // Validamos los datos recibidos
      const parsedBody = updateProductSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          ok: false,
          error: 'Error de validación al actualizar el producto.',
          details: parsedBody.error.format()
        });
      }

      const updateData = { ...parsedBody.data };

      // Si subieron una nueva imagen
      if (req.file) {
        updateData.image_url = `/uploads/products/${req.file.filename}`;
      }

      const businessId = req.user.business_id;
      const updatedProduct = await productsService.update(businessId, productId, updateData);

      return res.status(200).json({
        ok: true,
        message: 'Producto actualizado exitosamente.',
        data: updatedProduct
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        ok: false,
        error: error.message || 'Ocurrió un error al actualizar el producto.'
      });
    }
  }

  /**
   * DELETE /api/products/:id
   * Archiva el producto para no borrar el historial de movimientos ni romper el Kardex.
   */
  async archive(req, res) {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        return res.status(400).json({
          ok: false,
          error: 'El ID de producto debe ser un número entero válido.'
        });
      }

      const businessId = req.user.business_id;
      const result = await productsService.archive(businessId, productId);

      return res.status(200).json({
        ok: true,
        ...result
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        ok: false,
        error: error.message || 'Ocurrió un error al archivar el producto.'
      });
    }
  }
}

module.exports = new ProductsController();

