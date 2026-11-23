const { authenticateToken, requirePermission } = require('./authMiddleware');

/**
 * Puente de compatibilidad entre Backend 2 y el sistema real JWT/RBAC de Backend 1.
 * Reemplaza el mock de desarrollo de Backend 2 por la autenticación y permisos reales.
 */
function authenticateUser(req, res, next) {
  return authenticateToken(req, res, next);
}

/**
 * Autorización por permiso atómico con soporte para el alias 'stock.movement.create'
 * usado en las rutas de movimientos de Backend 2.
 */
function authorizePermission(requiredPermission) {
  if (requiredPermission === 'stock.movement.create') {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: 'No autenticado',
          message: 'Se requiere iniciar sesión antes de verificar permisos.'
        });
      }

      if (req.user.is_owner || (req.user.roles && req.user.roles.includes('owner'))) {
        return next();
      }

      const movementPerms = ['stock.movement.create', 'stock.receive', 'stock.issue', 'stock.transfer'];
      const hasAny = movementPerms.some((p) => (req.user.permissions || []).includes(p));
      if (!hasAny) {
        return res.status(403).json({
          ok: false,
          error: 'Acceso denegado: permiso insuficiente',
          code: 'FORBIDDEN_PERMISSION',
          message: 'No cuentas con permisos para registrar movimientos de inventario.'
        });
      }

      return next();
    };
  }

  return requirePermission(requiredPermission);
}

module.exports = {
  authenticateUser,
  authorizePermission
};
