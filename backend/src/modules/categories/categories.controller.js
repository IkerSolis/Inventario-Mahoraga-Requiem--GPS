/**
 * Controlador de Categorías.
 * Procesa las peticiones HTTP y maneja las respuestas JSON.
 */
const categoriesService = require('./categories.service');
const {
  createCategorySchema,
  updateCategorySchema,
  queryCategoriesSchema
} = require('./categories.validation');

class CategoriesController {
  /**
   * Lista categorías en árbol jerárquico.
   */
  async index(req, res) {
    try {
      const parsedQuery = queryCategoriesSchema.safeParse(req.query);

      if (!parsedQuery.success) {
        return res.status(400).json({
          ok: false,
          error: 'Parámetros de consulta inválidos.',
          details: parsedQuery.error.format()
        });
      }

      const businessId = req.user.business_id;
      const categories = await categoriesService.list(businessId, parsedQuery.data);

      return res.status(200).json({
        ok: true,
        data: categories
      });
    } catch (error) {
      console.error('Error al listar categorías:', error);
      return res.status(500).json({
        ok: false,
        error: 'Ocurrió un error al obtener las categorías.'
      });
    }
  }

  /**
   * GET /api/categories/:id
   *categoría y sus subcategorías directas.
   */
  async show(req, res) {
    try {
      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        return res.status(400).json({
          ok: false,
          error: 'El ID de la categoría debe ser un número entero.'
        });
      }

      const businessId = req.user.business_id;
      const category = await categoriesService.getById(businessId, categoryId);

      if (!category) {
        return res.status(404).json({
          ok: false,
          error: 'Categoría no encontrada.'
        });
      }

      return res.status(200).json({
        ok: true,
        data: category
      });
    } catch (error) {
      console.error('Error al consultar categoría:', error);
      return res.status(500).json({
        ok: false,
        error: 'Ocurrió un error al consultar la categoría.'
      });
    }
  }

  /**
   * POST /api/categories
   * Crea una categoría o subcategoría.
   */
  async store(req, res) {
    try {
      const parsedBody = createCategorySchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          ok: false,
          error: 'Error de validación al crear la categoría.',
          details: parsedBody.error.format()
        });
      }

      const businessId = req.user.business_id;
      const newCategory = await categoriesService.create(businessId, parsedBody.data);

      return res.status(201).json({
        ok: true,
        message: 'Categoría creada exitosamente.',
        data: newCategory
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        ok: false,
        error: error.message || 'Error al crear la categoría.'
      });
    }
  }

  /**
   * PUT /api/categories/:id
   * Actualiza una categoría.
   */
  async update(req, res) {
    try {
      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        return res.status(400).json({
          ok: false,
          error: 'El ID de la categoría debe ser un número entero.'
        });
      }

      const parsedBody = updateCategorySchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          ok: false,
          error: 'Error de validación al actualizar la categoría.',
          details: parsedBody.error.format()
        });
      }

      const businessId = req.user.business_id;
      const updatedCategory = await categoriesService.update(businessId, categoryId, parsedBody.data);

      return res.status(200).json({
        ok: true,
        message: 'Categoría actualizada exitosamente.',
        data: updatedCategory
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        ok: false,
        error: error.message || 'Error al actualizar la categoría.'
      });
    }
  }

  /**
   * DELETE /api/categories/:id
   * Elimina la categoría asegurando que no tenga productos activos asociados.
   */
  async destroy(req, res) {
    try {
      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        return res.status(400).json({
          ok: false,
          error: 'El ID de la categoría debe ser un número entero.'
        });
      }

      const businessId = req.user.business_id;
      const result = await categoriesService.delete(businessId, categoryId);

      return res.status(200).json({
        ok: true,
        ...result
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        ok: false,
        error: error.message || 'Error al eliminar la categoría.'
      });
    }
  }
}

module.exports = new CategoriesController();

