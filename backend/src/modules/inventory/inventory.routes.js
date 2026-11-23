// Rutas de API para el modulo de inventario y Kardex
// Prefijo: /api/inventory
// Permisos: stock.read, stock.count, stock.adjust.request, stock.adjust.approve

const { Router } = require('express');
const inventoryController = require('./inventory.controller');
const { authenticateUser, authorizePermission } = require('../../middlewares/auth.middleware');

const router = Router();

// Middleware de autenticacion para extraer req.user y business_id
router.use(authenticateUser);

// Consulta de existencias con calculo dinamico de stock disponible y alertas
router.get(
  '/stock',
  authorizePermission('stock.read'),
  (req, res) => inventoryController.getStock(req, res)
);

// Consulta de linea de tiempo y movimientos contables de Kardex
router.get(
  '/kardex/:productId',
  authorizePermission('stock.read'),
  (req, res) => inventoryController.getKardex(req, res)
);

router.get(
  '/movements',
  authorizePermission('stock.read'),
  (req, res) => inventoryController.listMovements(req, res)
);

router.post(
  '/movements',
  authorizePermission('stock.movement.create'),
  (req, res) => inventoryController.createMovement(req, res)
);

router.post(
  '/movements/:id/receive',
  authorizePermission('stock.movement.create'),
  (req, res) => inventoryController.receiveTransfer(req, res)
);

// Configuracion de minimos y maximos de stock para reabastecimiento
router.post(
  '/levels',
  authorizePermission('stock.read'),
  (req, res) => inventoryController.setLevels(req, res)
);

// Abrir sesion de conteo ciclico
router.post(
  '/counts',
  authorizePermission('stock.count'),
  (req, res) => inventoryController.createCount(req, res)
);

// Registrar cantidades contadas por el almacenista y conciliar
router.post(
  '/counts/:id/items',
  authorizePermission('stock.count'),
  (req, res) => inventoryController.recordCountItems(req, res)
);

// Generar solicitud de ajuste de existencias
router.get(
  '/adjustments',
  authorizePermission('stock.adjust.approve'),
  (req, res) => inventoryController.listAdjustments(req, res)
);

router.post(
  '/adjustments/request',
  authorizePermission('stock.adjust.request'),
  (req, res) => inventoryController.requestAdjustment(req, res)
);

// Aprobar ajuste de stock aplicando transaccion y actualizando Kardex
router.post(
  '/adjustments/:id/approve',
  authorizePermission('stock.adjust.approve'),
  (req, res) => inventoryController.approveAdjustment(req, res)
);

module.exports = router;
