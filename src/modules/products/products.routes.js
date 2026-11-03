/**
 * Rutas de la API para el Módulo de Productos.
 * Prefijo: /api/products
 * 
 * Cumple con los requerimientos de seguridad y permisos:
 * - products.read: Para consultar catálogo de productos
 * - products.create: Para dar de alta nuevos productos
 * - products.update: Para modificar datos
 * - products.archive: Para archivar productos (sin eliminación destructiva)
 */
const { Router } = require('express');
const productsController = require('./products.controller');
const { authenticateUser, authorizePermission } = require('../../middlewares/auth.middleware');
const uploadProductImage = require('../../middlewares/upload.middleware');

const router = Router();

// Middleware común de autenticación para asegurar que exista req.user y business_id
router.use(authenticateUser);

/**
 * @route   GET /api/products
 * @desc    Listado de productos con paginación y filtros
 * @access  Privado (requiere permiso: products.read)
 */
router.get(
  '/',
  authorizePermission('products.read'),
  (req, res) => productsController.index(req, res)
);

/**
 * @route   GET /api/products/:id
 * @desc    Obtener detalle de un producto por su ID
 * @access  Privado (requiere permiso: products.read)
 */
router.get(
  '/:id',
  authorizePermission('products.read'),
  (req, res) => productsController.show(req, res)
);

/**
 * @route   POST /api/products
 * @desc    Crear un nuevo producto (soporta subida de imagen 'image')
 * @access  Privado (requiere permiso: products.create)
 */
router.post(
  '/',
  authorizePermission('products.create'),
  uploadProductImage.single('image'),
  (req, res) => productsController.store(req, res)
);

/**
 * @route   PUT /api/products/:id
 * @desc    Actualizar datos de un producto (opcional nueva imagen 'image')
 * @access  Privado (requiere permiso: products.update)
 */
router.put(
  '/:id',
  authorizePermission('products.update'),
  uploadProductImage.single('image'),
  (req, res) => productsController.update(req, res)
);

/**
 * @route   DELETE /api/products/:id y PATCH /api/products/:id/archive
 * @desc    Archivar producto (soft delete para proteger Kardex e historial)
 * @access  Privado (requiere permiso: products.archive)
 */
router.delete(
  '/:id',
  authorizePermission('products.archive'),
  (req, res) => productsController.archive(req, res)
);

router.patch(
  '/:id/archive',
  authorizePermission('products.archive'),
  (req, res) => productsController.archive(req, res)
);

module.exports = router;

