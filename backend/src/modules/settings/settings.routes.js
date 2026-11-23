const { Router } = require('express');
const settingsController = require('./settings.controller');
const { authenticateToken, requirePermission } = require('../../middlewares/authMiddleware');
const { uploadLogo } = require('../../utils/multer');

const router = Router();

// Rutas públicas de Onboarding (solo operables si el sistema aún no está inicializado)
router.get('/onboarding/status', settingsController.getOnboardingStatus);
router.post('/onboarding', settingsController.completeOnboarding);

// A partir de aquí, todas las rutas requieren autenticación JWT
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

// Tema visual CSS / Design Tokens (Claro y Oscuro)
router.get('/theme', settingsController.getTheme);
router.put('/theme', requirePermission('settings.manage'), settingsController.updateTheme);

// Configuración Regional (Idiomas y Monedas)
router.get('/regional', settingsController.getRegionalSettings);
router.put(
  '/regional',
  requirePermission('settings.manage'),
  settingsController.updateRegionalSettings
);

// Notificaciones y Umbrales de Alertas
router.get(
  '/notifications',
  requirePermission('settings.manage'),
  settingsController.getNotificationSettings
);
router.put(
  '/notifications',
  requirePermission('settings.manage'),
  settingsController.updateNotificationSettings
);

// Servidor de Correos SMTP
router.get('/smtp', requirePermission('settings.manage'), settingsController.getSmtpSettings);
router.put('/smtp', requirePermission('settings.manage'), settingsController.updateSmtpSettings);
router.post(
  '/smtp/test',
  requirePermission('settings.manage'),
  settingsController.testSmtpSettings
);

// Sucursales y Almacenes
router.get('/branches', settingsController.listBranches);
router.post('/branches', requirePermission('locations.manage'), settingsController.createBranch);
router.put('/branches/:id', requirePermission('locations.manage'), settingsController.updateBranch);

router.get('/warehouses', settingsController.listWarehouses);
router.post(
  '/warehouses',
  requirePermission('locations.manage'),
  settingsController.createWarehouse
);
router.put(
  '/warehouses/:id',
  requirePermission('locations.manage'),
  settingsController.updateWarehouse
);

module.exports = router;
