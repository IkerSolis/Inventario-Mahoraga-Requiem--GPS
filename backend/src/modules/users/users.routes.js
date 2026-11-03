const { Router } = require('express');
const usersController = require('./users.controller');
const { authenticateToken, requirePermission } = require('../../middlewares/authMiddleware');
const { uploadAvatar } = require('../../utils/multer');

const router = Router();

// Todas las rutas de usuarios requieren autenticación previa
router.use(authenticateToken);

router.get('/', requirePermission('users.read'), usersController.listUsers);
router.get('/:id', requirePermission('users.read'), usersController.getUserById);

router.post(
  '/',
  requirePermission('users.create'),
  uploadAvatar.single('avatar'),
  usersController.createUser
);

router.put(
  '/:id',
  requirePermission('users.update'),
  uploadAvatar.single('avatar'),
  usersController.updateUser
);

router.patch(
  '/:id',
  requirePermission('users.update'),
  uploadAvatar.single('avatar'),
  usersController.updateUser
);

router.patch('/:id/status', requirePermission('users.disable'), usersController.setUserStatus);

router.delete('/:id', requirePermission('users.disable'), usersController.deleteUser);

module.exports = router;
