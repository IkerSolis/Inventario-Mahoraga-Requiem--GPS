const { Router } = require('express');
const rolesController = require('./roles.controller');
const { authenticateToken, requirePermission } = require('../../middlewares/authMiddleware');

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('roles.read'), rolesController.listRoles);
router.get('/:id', requirePermission('roles.read'), rolesController.getRoleById);
router.post('/', requirePermission('roles.manage'), rolesController.createRole);
router.put('/:id', requirePermission('roles.manage'), rolesController.updateRole);
router.post('/:id/reset', requirePermission('roles.manage'), rolesController.resetRoleToDefaults);
router.delete('/:id', requirePermission('roles.manage'), rolesController.deleteRole);

module.exports = router;
