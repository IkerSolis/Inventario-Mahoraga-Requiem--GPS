/**
 * Middleware de Autenticación y Autorización basada en Permisos (RBAC).
 * 
 * - Multi-negocio: req.user debe tener un 'business_id' para aislar datos.
 * - Códigos de permisos de productos:
 *   - products.read
 *   - products.create
 *   - products.update
 *   - products.archive
 *   - costs.read (para ver el costo de compra unitario)
 */

/**
 * Middleware para simular/extraer el usuario autenticado desde el request.
 */
function authenticateUser(req, res, next) {
  if (req.user && req.user.business_id) {
    return next();
  }

  // Soporte para pruebas en desarrollo mediante headers o valores por defecto:
  // x-business-id: ID del negocio (por defecto 1)
  // x-user-permissions: lista de permisos separados por comas
  const businessIdHeader = req.headers['x-business-id'];
  const permissionsHeader = req.headers['x-user-permissions'];

  const businessId = businessIdHeader ? parseInt(businessIdHeader, 10) : 1;
  const userIdHeader = req.headers['x-user-id'];
  const userId = userIdHeader ? parseInt(userIdHeader, 10) : 1;
  const permissions = permissionsHeader
    ? permissionsHeader.split(',').map(p => p.trim())
    : [
      'products.read',
      'products.create',
      'products.update',
      'products.archive',
      'costs.read',
      'stock.read',
      'stock.count',
      'stock.adjust.request',
      'stock.adjust.approve',
      'stock.movement.create',
      'reports.read',
      'reports.export'
    ];

  req.user = {
    id: Number.isInteger(userId) && userId > 0 ? userId : 1,
    name: 'Usuario Desarrollador',
    business_id: businessId,
    permissions: permissions
  };

  next();
}

/**
 * Verifica si el usuario autenticado cuenta con un permiso específico.
 * 
 * @param {string} requiredPermission Código del permiso (products.read,etc)
 */
function authorizePermission(requiredPermission) {
  return (req, res, next) => {
    if (!req.user || !Array.isArray(req.user.permissions)) {
      return res.status(401).json({
        ok: false,
        error: 'No autorizado. Debes iniciar sesión primero.'
      });
    }

    const hasPermission = req.user.permissions.includes(requiredPermission);

    if (!hasPermission) {
      return res.status(403).json({
        ok: false,
        error: `Acceso denegado: Se requiere el permiso '${requiredPermission}'.`
      });
    }

    next();
  };
}

module.exports = {
  authenticateUser,
  authorizePermission
};
