/**
 * Rutas para el Módulo de Categorías y Jerarquías.
 * Prefijo: /api/categories
 * 
 * Permisos requeridos :
 * - products.read: Para consultar categorías y su árbol jerárquico
 * - products.create: Para crear categorías o subcategorías
 * - products.update: Para actualizar o eliminar categorías (validando productos activos)
 */
const { Router } = require('express');
const categoriesController = require('./categories.controller');
const { authenticateUser, authorizePermission } = require('../../middlewares/auth.middleware');

const router = Router();

// Middleware de autenticación común para obtener req.user y business_id
router.use(authenticateUser);

/**
 * @route   GET /api/categories
 * @desc    Listar categorías
 * @access  Privado (products.read)
 */
router.get(
  '/',
  authorizePermission('products.read'),
  (req, res) => categoriesController.index(req, res)
);

/**
 * @route   GET /api/categories/:id
 * @desc    Obtener categoría y sus subcategorías directas
 * @access  Privado (products.read)
 */
router.get(
  '/:id',
  authorizePermission('products.read'),
  (req, res) => categoriesController.show(req, res)
);

/**
 * @route   POST /api/categories
 * @desc    Crear categoría o subcategoría multinivel
 * @access  Privado (products.create)
 */
router.post(
  '/',
  authorizePermission('products.create'),
  (req, res) => categoriesController.store(req, res)
);

/**
 * @route   PUT /api/categories/:id
 * @desc    Actualizar categoría
 * @access  Privado (products.update)
 */
router.put(
  '/:id',
  authorizePermission('products.update'),
  (req, res) => categoriesController.update(req, res)
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Eliminar categoría sin productos activos asociados
 * @access  Privado (products.update)
 */
router.delete(
  '/:id',
  authorizePermission('products.update'),
  (req, res) => categoriesController.destroy(req, res)
);

module.exports = router;

