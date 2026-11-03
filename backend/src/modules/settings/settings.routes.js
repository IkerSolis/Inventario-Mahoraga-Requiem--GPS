const { Router } = require('express');
const settingsController = require('./settings.controller');
const { authenticateToken, requirePermission } = require('../../middlewares/authMiddleware');
const { uploadLogo } = require('../../utils/multer');

const router = Router();

router.use(authenticateToken);

// Empresa y Configuración
router.get('/company', requirePermission('settings.manage'), settingsController.getCompanySettings);
router.put(
  '/company',
  requirePermission('settings.manage'),
  settingsController.updateCompanySettings
);
router.post(
  '/company/logo',
  requirePermission('settings.manage'),
  uploadLogo.single('logo'),
  settingsController.uploadCompanyLogo
);

// Tema visual CSS / Design Tokens
router.get('/theme', settingsController.getTheme);
router.put('/theme', requirePermission('settings.manage'), settingsController.updateTheme);

// Sucursales y Almacenes
router.get('/branches', settingsController.listBranches);
router.post('/branches', requirePermission('locations.manage'), settingsController.createBranch);

router.get('/warehouses', settingsController.listWarehouses);
router.post(
  '/warehouses',
  requirePermission('locations.manage'),
  settingsController.createWarehouse
);

module.exports = router;
