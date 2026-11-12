const db = require('../database/connection');
const { verifyAccessToken } = require('../utils/jwt');

/**
 * Middleware de Autenticación de Tokens
 * Extrae JWT de cookies HttpOnly (o cabecera Authorization Bearer)
 * Valida usuario activo, sesiones no revocadas y carga roles/permisos
 */
async function authenticateToken(req, res, next) {
  try {
    let token = null;

    // 1. Extraer preferentemente de cookie HttpOnly
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      // 2. Extraer de header Authorization para clientes API / pruebas
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Token de acceso no proporcionado o cookie no encontrada.'
      });
    }

    // Verificar firma y vigencia del JWT
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return res.status(401).json({
        error: 'Token inválido o expirado',
        message: 'La sesión ha expirado o el token es inválido. Por favor renueva tu sesión.'
      });
    }

    // Consultar usuario en base de datos
    const user = await db('users').where({ id: decoded.userId, deleted_at: null }).first();

    if (!user) {
      return res.status(401).json({
        error: 'Usuario no encontrado',
        message: 'El usuario asociado al token ya no existe.'
      });
    }

    // Comprobar estado de la cuenta
    if (user.status === 'disabled') {
      return res.status(403).json({
        error: 'Cuenta desactivada',
        message: 'Tu cuenta ha sido desactivada por un administrador. Contacta al soporte.'
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        error: 'Cuenta pendiente',
        message: 'Tu cuenta aún está pendiente de activación por correo electrónico.'
      });
    }

    // Comprobar si la sesión fue revocada explícitamente en base de datos
    if (decoded.sessionId) {
      const session = await db('user_sessions').where({ id: decoded.sessionId }).first();

      if (!session || session.revoked_at !== null) {
        return res.status(401).json({
          error: 'Sesión revocada',
          message: 'Esta sesión ha sido cerrada o revocada remotamente.'
        });
      }

      // Actualizar último acceso de telemetría de forma no bloqueante
      db('user_sessions')
        .where({ id: decoded.sessionId })
        .update({ last_accessed_at: new Date() })
        .catch((err) => console.error('Error actualizando telemetría de sesión:', err.message));
    }

    // Cargar roles y permisos del usuario
    const roles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', user.id)
      .select('roles.id', 'roles.code', 'roles.name', 'roles.is_protected');

    const roleIds = roles.map((r) => r.id);
    const roleCodes = roles.map((r) => r.code);

    let permissions = [];
    if (roleIds.length > 0) {
      const permsRows = await db('role_permissions')
        .join('permissions', 'role_permissions.permission_id', 'permissions.id')
        .whereIn('role_permissions.role_id', roleIds)
        .select('permissions.code')
        .distinct();
      permissions = permsRows.map((p) => p.code);
    }

    // Si el usuario es el dueño (is_owner) o tiene rol 'owner', asegurar acceso total
    if (user.is_owner || roleCodes.includes('owner')) {
      const allPerms = await db('permissions').select('code');
      permissions = allPerms.map((p) => p.code);
    }

    // Cargar alcances por sucursal y almacén
    const scopes = await db('user_scopes')
      .where('user_id', user.id)
      .select('branch_id', 'warehouse_id');

    // Inyectar contexto en req.user
    req.user = {
      id: user.id,
      business_id: user.business_id,
      name: user.name,
      email: user.email,
      status: user.status,
      is_owner: Boolean(user.is_owner),
      roles: roleCodes,
      permissions,
      scopes,
      sessionId: decoded.sessionId || null
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware para exigir un permiso atómico específico
 * Principio: Denegación por defecto
 */
function requirePermission(permissionCode) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Se requiere iniciar sesión antes de verificar permisos.'
      });
    }

    // El Propietario (R0) cuenta con bypass total
    if (req.user.is_owner || req.user.roles.includes('owner')) {
      return next();
    }

    // Comprobar si el permiso atómico está presente en la matriz
    if (!req.user.permissions || !req.user.permissions.includes(permissionCode)) {
      return res.status(403).json({
        error: 'Acceso denegado: permiso insuficiente',
        code: 'FORBIDDEN_PERMISSION',
        message: `No cuentas con el permiso requerido: "${permissionCode}". Contacta al administrador.`
      });
    }

    next();
  };
}

/**
 * Middleware para verificar aislamiento de multi-negocio y alcance horizontal
 * Valida business_id y, opcionalmente, verifica si el usuario tiene asignada una sucursal o almacén específico
 */
function requireScope(reqOrOptions, res, next) {
  // Caso de uso directo: router.use(requireScope)
  if (reqOrOptions && reqOrOptions.headers) {
    if (!reqOrOptions.user || !reqOrOptions.user.business_id) {
      return res.status(403).json({ error: 'Contexto de negocio no disponible' });
    }
    return next();
  }

  // Caso de uso parametrizado: requireScope({ checkBranch: true, checkWarehouse: true })
  const options = reqOrOptions || {};
  const { checkBranch = false, checkWarehouse = false } = options;

  return (req, resNext, nxt) => {
    if (!req.user || !req.user.business_id) {
      return resNext.status(403).json({ error: 'Contexto de negocio no disponible' });
    }

    // Propietario y administradores tienen acceso global sin restricción de sucursal
    if (
      req.user.is_owner ||
      req.user.roles.includes('owner') ||
      req.user.roles.includes('system_admin')
    ) {
      return nxt();
    }

    const userScopes = req.user.scopes || [];
    if (userScopes.length === 0) {
      return nxt();
    }

    if (checkBranch) {
      const branchId =
        req.params.branchId || req.query.branchId || req.body.branchId || req.body.branch_id;
      if (branchId) {
        const allowedBranch = userScopes.some(
          (s) => s.branch_id === null || s.branch_id === branchId
        );
        if (!allowedBranch) {
          return resNext.status(403).json({
            error: 'Fuera de alcance',
            code: 'FORBIDDEN_SCOPE_BRANCH',
            message: 'No tienes autorización para acceder o realizar operaciones en esta sucursal.'
          });
        }
      }
    }

    if (checkWarehouse) {
      const warehouseId =
        req.params.warehouseId ||
        req.query.warehouseId ||
        req.body.warehouseId ||
        req.body.warehouse_id;
      if (warehouseId) {
        const allowedWarehouse = userScopes.some(
          (s) => s.warehouse_id === null || s.warehouse_id === warehouseId
        );
        if (!allowedWarehouse) {
          return resNext.status(403).json({
            error: 'Fuera de alcance',
            code: 'FORBIDDEN_SCOPE_WAREHOUSE',
            message: 'No tienes autorización para acceder o realizar operaciones en este almacén.'
          });
        }
      }
    }

    nxt();
  };
}

module.exports = {
  authenticateToken,
  requirePermission,
  requireScope
};
