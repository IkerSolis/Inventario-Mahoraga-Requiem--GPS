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

module.exports = {
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  listPermissions
};
