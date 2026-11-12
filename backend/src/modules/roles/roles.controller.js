const { v4: uuidv4 } = require('uuid');
const db = require('../../database/connection');
const { recordAuditLog } = require('../../middlewares/auditMiddleware');
const { createRoleSchema, updateRoleSchema } = require('./roles.validation');

/**
 * Listar roles del negocio (GET /api/roles)
 */
async function listRoles(req, res, next) {
  try {
    const roles = await db('roles')
      .where({ business_id: req.user.business_id })
      .orderBy('is_default', 'desc')
      .orderBy('code', 'asc');

    // Contar usuarios asignados a cada rol
    const userCounts = await db('user_roles')
      .join('users', 'user_roles.user_id', 'users.id')
      .where('users.business_id', req.user.business_id)
      .whereNull('users.deleted_at')
      .groupBy('user_roles.role_id')
      .select('user_roles.role_id')
      .count('user_roles.user_id as count');

    const countMap = {};
    userCounts.forEach((c) => {
      countMap[c.role_id] = Number(c.count);
    });

    // Contar permisos asignados a cada rol
    const permCounts = await db('role_permissions')
      .groupBy('role_id')
      .select('role_id')
      .count('permission_id as count');

    const permMap = {};
    permCounts.forEach((p) => {
      permMap[p.role_id] = Number(p.count);
    });

    const result = roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      isDefault: Boolean(r.is_default),
      isProtected: Boolean(r.is_protected),
      usersCount: countMap[r.id] || 0,
      permissionsCount: permMap[r.id] || 0,
      createdAt: r.created_at
    }));

    return res.status(200).json({ roles: result });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener detalle de un rol con su matriz de permisos (GET /api/roles/:id)
 */
async function getRoleById(req, res, next) {
  try {
    const { id } = req.params;

    const role = await db('roles').where({ id, business_id: req.user.business_id }).first();

    if (!role) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    const permissions = await db('role_permissions')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .where('role_permissions.role_id', role.id)
      .select(
        'permissions.id as permission_id',
        'permissions.code',
        'permissions.module',
        'permissions.description',
        'permissions.is_critical',
        'role_permissions.approval_limit_amount',
        'role_permissions.approval_limit_qty',
        'role_permissions.requires_second_approver'
      );

    return res.status(200).json({
      role: {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        isDefault: Boolean(role.is_default),
        isProtected: Boolean(role.is_protected),
        permissions
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Crear nuevo rol personalizado (POST /api/roles)
 */
async function createRole(req, res, next) {
  try {
    const parsed = createRoleSchema.parse(req.body);
    const { code, name, description, permissions } = parsed;

    // Verificar unicidad de código dentro del negocio
    const existing = await db('roles').where({ business_id: req.user.business_id, code }).first();

    if (existing) {
      return res.status(409).json({
        error: 'Código en uso',
        message: 'Ya existe un rol con este código interno en tu empresa.'
      });
    }

    // Verificar que no se deleguen permisos no poseídos (regla de no escalación)
    if (!req.user.is_owner && permissions && permissions.length > 0) {
      const permIds = permissions.map((p) => p.permissionId);
      const requestedPerms = await db('permissions').whereIn('id', permIds).select('code');
      const userPermCodes = new Set(req.user.permissions || []);
      const unauthorized = requestedPerms.filter((p) => !userPermCodes.has(p.code));
      if (unauthorized.length > 0) {
        return res.status(403).json({
          error: 'Escalación no permitida',
          message: `No tienes autorización para delegar o asignar los siguientes permisos: ${unauthorized.map((p) => p.code).join(', ')}`
        });
      }
    }

    const roleId = uuidv4();

    await db.transaction(async (trx) => {
      await trx('roles').insert({
        id: roleId,
        business_id: req.user.business_id,
        code,
        name,
        description: description || null,
        is_default: false,
        is_protected: false,
        created_at: new Date(),
        updated_at: new Date()
      });

      if (permissions && permissions.length > 0) {
        const rows = permissions.map((p) => ({
          id: uuidv4(),
          role_id: roleId,
          permission_id: p.permissionId,
          approval_limit_amount: p.approvalLimitAmount || null,
          approval_limit_qty: p.approvalLimitQty || null,
          requires_second_approver: Boolean(p.requiresSecondApprover),
          created_at: new Date()
        }));
        await trx('role_permissions').insert(rows);
      }
    });

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'roles.create',
      entityType: 'role',
      entityId: roleId,
      newValues: { code, name, description },
      req
    });

    return res.status(201).json({
      message: 'Rol creado exitosamente.',
      roleId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Editar rol (PUT /api/roles/:id)
 */
async function updateRole(req, res, next) {
  try {
    const { id } = req.params;
    const parsed = updateRoleSchema.parse(req.body);
    const { name, description, permissions } = parsed;

    const role = await db('roles').where({ id, business_id: req.user.business_id }).first();

    if (!role) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    // El Propietario (R0) está protegido: su nombre y permisos no pueden alterarse indebidamente
    if (role.is_protected && role.code === 'owner') {
      return res.status(403).json({
        error: 'Rol protegido',
        message:
          'El rol Propietario (R0) está protegido y sus permisos universales no pueden modificarse.'
      });
    }

    // Verificar que no se deleguen permisos no poseídos (regla de no escalación)
    if (!req.user.is_owner && permissions && permissions.length > 0) {
      const permIds = permissions.map((p) => p.permissionId);
      const requestedPerms = await db('permissions').whereIn('id', permIds).select('code');
      const userPermCodes = new Set(req.user.permissions || []);
      const unauthorized = requestedPerms.filter((p) => !userPermCodes.has(p.code));
      if (unauthorized.length > 0) {
        return res.status(403).json({
          error: 'Escalación no permitida',
          message: `No tienes autorización para delegar o asignar los siguientes permisos: ${unauthorized.map((p) => p.code).join(', ')}`
        });
      }
    }

    const updates = { updated_at: new Date() };
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;

    await db.transaction(async (trx) => {
      await trx('roles').where({ id }).update(updates);

      if (permissions !== undefined) {
        await trx('role_permissions').where({ role_id: id }).del();
        if (permissions.length > 0) {
          const rows = permissions.map((p) => ({
            id: uuidv4(),
            role_id: id,
            permission_id: p.permissionId,
            approval_limit_amount: p.approvalLimitAmount || null,
            approval_limit_qty: p.approvalLimitQty || null,
            requires_second_approver: Boolean(p.requiresSecondApprover),
            created_at: new Date()
          }));
          await trx('role_permissions').insert(rows);
        }
      }
    });

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'roles.update',
      entityType: 'role',
      entityId: id,
      newValues: {
        name,
        description,
        permissionsCount: permissions ? permissions.length : undefined
      },
      req
    });

    return res.status(200).json({ message: 'Rol actualizado exitosamente.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Eliminar rol (DELETE /api/roles/:id)
 */
async function deleteRole(req, res, next) {
  try {
    const { id } = req.params;

    const role = await db('roles').where({ id, business_id: req.user.business_id }).first();

    if (!role) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    if (role.is_protected || role.is_default) {
      return res.status(403).json({
        error: 'Rol del sistema protegido',
        message: 'No puedes eliminar los roles predeterminados del sistema (R0 a R7).'
      });
    }

    // Verificar si hay usuarios con este rol asignado
    const assigned = await db('user_roles').where({ role_id: id }).first();
    if (assigned) {
      return res.status(400).json({
        error: 'Rol en uso',
        message:
          'No puedes eliminar un rol que actualmente tiene usuarios asignados. Reasigna los usuarios primero.'
      });
    }

    await db('roles').where({ id }).del();

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'roles.delete',
      entityType: 'role',
      entityId: id,
      req
    });

    return res.status(200).json({ message: 'Rol eliminado exitosamente.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Listar el catálogo de los 30 permisos atómicos agrupados por módulo (GET /api/permissions)
 */
async function listPermissions(req, res, next) {
  try {
    const permissions = await db('permissions').orderBy('module', 'asc').orderBy('code', 'asc');

    const grouped = {};
    permissions.forEach((p) => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    });

    return res.status(200).json({
      total: permissions.length,
      modules: grouped,
      permissions
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Matriz de fábrica de roles predeterminados para restauración
 */
const defaultRoleMatrices = {
  system_admin: {
    name: 'Administrador del sistema',
    description: 'Administra usuarios, roles, catálogos, sucursales, parámetros y reportes.',
    permissionIds: [
      'p01',
      'p02',
      'p03',
      'p04',
      'p05',
      'p06',
      'p07',
      'p08',
      'p09',
      'p10',
      'p11',
      'p12',
      'p13',
      'p14',
      'p15',
      'p16',
      'p17',
      'p18',
      'p19',
      'p20',
      'p21',
      'p22',
      'p23',
      'p24',
      'p25',
      'p26',
      'p27',
      'p28',
      'p29',
      'p30'
    ]
  },
  inventory_manager: {
    name: 'Gerente de inventario / Operaciones',
    description: 'Supervisa stock, almacenes, movimientos, conteos, ajustes y reportes.',
    approvalLimitAmount: 10000,
    approvalLimitQty: 50,
    requiresSecondApprover: false,
    permissionIds: [
      'p01',
      'p06',
      'p10',
      'p11',
      'p12',
      'p13',
      'p14',
      'p15',
      'p16',
      'p17',
      'p18',
      'p19',
      'p20',
      'p21',
      'p22',
      'p23',
      'p24',
      'p26',
      'p28',
      'p29',
      'p30'
    ]
  },
  warehouse_supervisor: {
    name: 'Supervisor de almacén',
    description: 'Supervisa operaciones diarias de almacén, valida conteos y recepciones.',
    approvalLimitAmount: 2500,
    approvalLimitQty: 10,
    requiresSecondApprover: true,
    permissionIds: [
      'p10',
      'p11',
      'p12',
      'p14',
      'p15',
      'p16',
      'p17',
      'p18',
      'p19',
      'p20',
      'p24',
      'p28',
      'p29'
    ]
  },
  warehouse_operator: {
    name: 'Almacenista / Operador',
    description: 'Registra entradas, salidas, transferencias y conteos físicos. Solicita ajustes.',
    permissionIds: ['p10', 'p14', 'p15', 'p16', 'p17', 'p18', 'p19']
  },
  purchasing: {
    name: 'Compras',
    description: 'Gestiona proveedores y órdenes de compra. Consulta catálogo y existencias.',
    permissionIds: ['p10', 'p14', 'p15', 'p21', 'p22', 'p26', 'p28']
  },
  sales: {
    name: 'Ventas / Mostrador',
    description: 'Consulta productos y existencias. Registra salidas de ventas.',
    permissionIds: ['p10', 'p14', 'p24', 'p25', 'p27', 'p28']
  },
  auditor: {
    name: 'Auditor / Consulta',
    description: 'Estricto acceso de solo lectura a inventarios, kárdex, auditoría y reportes.',
    permissionIds: ['p01', 'p06', 'p10', 'p14', 'p21', 'p24', 'p26', 'p28', 'p30']
  }
};

/**
 * Restaurar rol predeterminado a su configuración de fábrica (POST /api/roles/:id/reset)
 */
async function resetRoleToDefaults(req, res, next) {
  try {
    const { id } = req.params;

    const role = await db('roles').where({ id, business_id: req.user.business_id }).first();

    if (!role) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    if (!role.is_default) {
      return res.status(400).json({
        error: 'Operación no válida',
        message:
          'Solo los roles predeterminados del sistema (R1 a R7) pueden ser restaurados a valores de fábrica.'
      });
    }

    if (role.code === 'owner') {
      return res.status(403).json({
        error: 'Rol protegido',
        message:
          'El rol Propietario (R0) está permanentemente protegido y no requiere restauración.'
      });
    }

    const factoryConfig = defaultRoleMatrices[role.code];
    if (!factoryConfig) {
      return res.status(400).json({
        error: 'Configuración no encontrada',
        message: `No existe plantilla de fábrica para el código de rol "${role.code}".`
      });
    }

    await db.transaction(async (trx) => {
      // 1. Restaurar nombre y descripción original
      await trx('roles').where({ id }).update({
        name: factoryConfig.name,
        description: factoryConfig.description,
        updated_at: new Date()
      });

      // 2. Eliminar permisos existentes y reinstalar los de fábrica
      await trx('role_permissions').where({ role_id: id }).del();

      const newPermRows = factoryConfig.permissionIds.map((pId) => ({
        id: uuidv4(),
        role_id: id,
        permission_id: pId,
        approval_limit_amount: factoryConfig.approvalLimitAmount || null,
        approval_limit_qty: factoryConfig.approvalLimitQty || null,
        requires_second_approver: Boolean(factoryConfig.requiresSecondApprover),
        created_at: new Date()
      }));

      await trx('role_permissions').insert(newPermRows);
    });

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'roles.reset_to_default',
      entityType: 'role',
      entityId: id,
      newValues: { code: role.code, restoredPermissionsCount: factoryConfig.permissionIds.length },
      req
    });

    return res.status(200).json({
      message: `El rol "${factoryConfig.name}" ha sido restaurado exitosamente a su configuración de fábrica.`,
      restoredPermissions: factoryConfig.permissionIds.length
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  listPermissions,
  resetRoleToDefaults
};
