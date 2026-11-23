/**
 * Servicio del Módulo de Categorías.
 * Maneja jerarquías, árboles multinivel con parent_id, slugs únicos
 * e impedir eliminar categorías con productos activos asociados.
 */
const db = require('../../config/database');

class CategoriesService {
  /**
   * Helper para generar slugs a partir de texto (ej. "Laptops & Tablets" -> "laptops-tablets")
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .normalize('NFD') // Separa acentos
      .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
      .replace(/[^a-z0-9\s-]/g, '') // Quita caracteres especiales
      .trim()
      .replace(/\s+/g, '-'); // Reemplaza espacios con guiones
  }

  /**
   * Construye un árbol jerárquico a partir de una lista plana de categorías.
   */
  buildTree(categories, parentId = null) {
    const branch = [];

    for (const category of categories) {
      if (category.parent_id === parentId) {
        const children = this.buildTree(categories, category.id);
        branch.push({
          ...category,
          children: children.length > 0 ? children : []
        });
      }
    }

    return branch;
  }

  /**
   * Lista categorías, permitiendo formato plano o árbol jerárquico
   */
  async list(businessId, filters = {}) {
    const { status, parent_id, tree, search } = filters;

    const query = db('categories').where('business_id', businessId);

    if (status && status !== 'all') {
      query.where('status', status);
    }

    if (search) {
      query.where((b) => {
        b.where('name', 'like', `%${search}%`)
          .orWhere('slug', 'like', `%${search}%`);
      });
    }

    // filtrar por parent_id específico
    if (!tree && parent_id !== undefined) {
      if (parent_id === 'null') {
        query.whereNull('parent_id');
      } else {
        query.where('parent_id', parent_id);
      }
    }

    const categories = await query.orderBy('name', 'asc');

    // formato árbol jerárquico multinivel
    if (tree) {
      return this.buildTree(categories, null);
    }

    return categories;
  }

  /**
   * Obtiene el detalle de una categoría junto con sus subcategorías directas.
   */
  async getById(businessId, categoryId) {
    const category = await db('categories')
      .where({ id: categoryId, business_id: businessId })
      .first();

    if (!category) return null;

    // Obtener subcategorías hijas directas
    const children = await db('categories')
      .where({ parent_id: categoryId, business_id: businessId })
      .orderBy('name', 'asc');

    // Obtener información de la categoría padre (si tiene)
    let parent = null;
    if (category.parent_id) {
      parent = await db('categories')
        .where({ id: category.parent_id, business_id: businessId })
        .select('id', 'name', 'slug')
        .first();
    }

    return {
      ...category,
      parent,
      children
    };
  }

  /**
   * Crea una nueva categoría o subcategoría.
   */
  async create(businessId, data) {
    let { name, slug, parent_id, description, icon_name, color_hex, status } = data;

    // Si no enviaron slug, lo autogeneramos
    if (!slug) {
      slug = this.generateSlug(name);
    }

    // 1. Validar que el slug no esté repetido en el mismo negocio
    const existingSlug = await db('categories')
      .where({ business_id: businessId, slug })
      .first();

    if (existingSlug) {
      const error = new Error(`Ya existe una categoría con el slug '${slug}' en este negocio.`);
      error.statusCode = 409;
      throw error;
    }

    // 2. Si tiene parent_id, verificar que el padre exista y sea del mismo negocio
    if (parent_id) {
      const parentCategory = await db('categories')
        .where({ id: parent_id, business_id: businessId })
        .first();

      if (!parentCategory) {
        const error = new Error(`La categoría padre con ID ${parent_id} no existe en este negocio.`);
        error.statusCode = 404;
        throw error;
      }
    }

    const [newId] = await db('categories').insert({
      business_id: businessId,
      name,
      slug,
      parent_id: parent_id || null,
      description: description || null,
      icon_name: icon_name || 'category',
      color_hex: color_hex || '#4F46E5',
      status: status || 'active',
      created_at: new Date(),
      updated_at: new Date()
    });

    return await db('categories').where({ id: newId }).first();
  }

  /**
   * Actualiza una categoría existente, evitando bucles en la jerarquía.
   */
  async update(businessId, categoryId, data) {
    const category = await db('categories')
      .where({ id: categoryId, business_id: businessId })
      .first();

    if (!category) {
      const error = new Error('La categoría especificada no existe.');
      error.statusCode = 404;
      throw error;
    }

    // Si actualiza slug, validar unicidad
    if (data.slug && data.slug !== category.slug) {
      const existingSlug = await db('categories')
        .where({ business_id: businessId, slug: data.slug })
        .whereNot({ id: categoryId })
        .first();

      if (existingSlug) {
        const error = new Error(`El slug '${data.slug}' ya pertenece a otra categoría.`);
        error.statusCode = 409;
        throw error;
      }
    }

    // Si cambia parent_id, verificar que no sea ella misma
    if (data.parent_id !== undefined && data.parent_id !== null) {
      if (Number(data.parent_id) === Number(categoryId)) {
        const error = new Error('Una categoría no puede tenerse a sí misma como categoría padre.');
        error.statusCode = 400;
        throw error;
      }

      // Validar que el nuevo padre exista en el mismo negocio
      const parentCategory = await db('categories')
        .where({ id: data.parent_id, business_id: businessId })
        .first();

      if (!parentCategory) {
        const error = new Error(`La categoría padre con ID ${data.parent_id} no existe.`);
        error.statusCode = 404;
        throw error;
      }
    }

    await db('categories')
      .where({ id: categoryId, business_id: businessId })
      .update({
        ...data,
        updated_at: new Date()
      });

    return await db('categories').where({ id: categoryId }).first();
  }

  /**
   * Elimina una categoria sin eliminar categorías con productos activos asociados
   */
  async delete(businessId, categoryId) {
    const category = await db('categories')
      .where({ id: categoryId, business_id: businessId })
      .first();

    if (!category) {
      const error = new Error('La categoría especificada no existe.');
      error.statusCode = 404;
      throw error;
    }

    // Verificar si hay productos activos asociados
    const activeProductsCount = await db('products')
      .where({ category_id: categoryId, business_id: businessId, status: 'active' })
      .count({ total: '*' })
      .first();

    const activeCount = Number(activeProductsCount?.total || 0);

    if (activeCount > 0) {
      const error = new Error(
        `No se puede eliminar la categoría '${category.name}' porque tiene ${activeCount} producto(s) activo(s) asociado(s). Reasigna o archiva los productos primero.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Verificar si tiene subcategorías hijas asociadas
    const childrenCount = await db('categories')
      .where({ parent_id: categoryId, business_id: businessId })
      .count({ total: '*' })
      .first();

    const subs = Number(childrenCount?.total || 0);
    if (subs > 0) {
      const error = new Error(
        `No se puede eliminar la categoría '${category.name}' porque contiene ${subs} subcategoría(s) hija(s). Elimina o reubica las subcategorías primero.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Proceder a eliminar de forma segura
    await db('categories')
      .where({ id: categoryId, business_id: businessId })
      .del();

    return {
      message: `Categoría '${category.name}' eliminada exitosamente.`,
      id: categoryId
    };
  }
}

module.exports = new CategoriesService();

