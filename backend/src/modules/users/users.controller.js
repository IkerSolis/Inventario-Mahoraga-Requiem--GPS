const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../../database/connection');
const { recordAuditLog } = require('../../middlewares/auditMiddleware');
const { sendInvitationEmail } = require('../../utils/mailer');
const { generateSecureRandomToken, hashToken } = require('../../utils/jwt');
const {
  createUserSchema,
  updateUserSchema,
  userStatusSchema,
  listUsersQuerySchema
} = require('./users.validation');

/**
 * Listar usuarios con filtros y paginación (GET /api/users)
 */
async function listUsers(req, res, next) {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const { page, limit, search, status, role } = query;
    const offset = (page - 1) * limit;

    let baseQuery = db('users')
      .where('users.business_id', req.user.business_id)
      .whereNull('users.deleted_at');

    if (status) {
      baseQuery = baseQuery.where('users.status', status);
    }

    if (search) {
      baseQuery = baseQuery.where((builder) => {
        builder
          .where('users.name', 'like', `%${search}%`)
          .orWhere('users.email', 'like', `%${search}%`);
      });
    }

    if (role) {
      baseQuery = baseQuery
        .join('user_roles', 'users.id', 'user_roles.user_id')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('roles.code', role);
    }

    // Obtener total para paginación
    const countResult = await baseQuery.clone().count('users.id as total').first();
    const total = Number(countResult.total) || 0;

    // Obtener registros paginados
    const users = await baseQuery
      .clone()
      .select(
        'users.id',
        'users.business_id',
        'users.name',
        'users.email',
        'users.status',
        'users.avatar_url',
        'users.is_owner',
        'users.last_login_at',
        'users.created_at',
        'users.updated_at'
      )
      .orderBy('users.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Cargar roles asociados a los usuarios obtenidos
    const userIds = users.map((u) => u.id);
    let rolesByUser = {};
    if (userIds.length > 0) {
      const userRoles = await db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .whereIn('user_roles.user_id', userIds)
        .select('user_roles.user_id', 'roles.id', 'roles.code', 'roles.name');

      userRoles.forEach((ur) => {
        if (!rolesByUser[ur.user_id]) rolesByUser[ur.user_id] = [];
        rolesByUser[ur.user_id].push({ id: ur.id, code: ur.code, name: ur.name });
      });
    }

    const formattedUsers = users.map((u) => ({
      ...u,
      is_owner: Boolean(u.is_owner),
      roles: rolesByUser[u.id] || []
    }));

    return res.status(200).json({
      users: formattedUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener detalle de un usuario por ID (GET /api/users/:id)
 */
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;

    const user = await db('users')
      .where({ id, business_id: req.user.business_id, deleted_at: null })
      .select(
        'id',
        'business_id',
        'name',
        'email',
        'status',
        'avatar_url',
        'is_owner',
        'last_login_at',
        'created_at',
        'updated_at'
      )
      .first();

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const roles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', user.id)
      .select('roles.id', 'roles.code', 'roles.name');

    const scopes = await db('user_scopes')
      .where('user_id', user.id)
      .select('branch_id', 'warehouse_id');

    return res.status(200).json({
      user: {
        ...user,
        is_owner: Boolean(user.is_owner),
        roles,
        scopes
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Crear o invitar usuario (POST /api/users)
 */
async function createUser(req, res, next) {
  try {
    // Si viene en multipart/form-data con Multer, los campos llegan como string en req.body
    let bodyData = { ...req.body };
    if (typeof bodyData.roleIds === 'string') {
      try {
        bodyData.roleIds = JSON.parse(bodyData.roleIds);
      } catch (e) {
        bodyData.roleIds = [bodyData.roleIds];
      }
    }
    if (typeof bodyData.scopes === 'string') {
      try {
        bodyData.scopes = JSON.parse(bodyData.scopes);
      } catch (e) {
        bodyData.scopes = [];
      }
    }

    const parsed = createUserSchema.parse(bodyData);
    const { name, email, password, roleIds, scopes } = parsed;
    let status = parsed.status;

    // Verificar unicidad de correo dentro del negocio
    const existing = await db('users')
      .where({ business_id: req.user.business_id, email, deleted_at: null })
      .first();

    if (existing) {
      return res.status(409).json({
        error: 'Conflicto',
        message: 'Ya existe un usuario registrado con este correo electrónico.'
      });
    }

    // Regla de escalación: No asignar rol de propietario (R0) a menos que el creador sea propietario
    if (roleIds && roleIds.length > 0) {
      const selectedRoles = await db('roles').whereIn('id', roleIds);
      const includesOwner = selectedRoles.some((r) => r.code === 'owner');
      if (includesOwner && !req.user.is_owner) {
        return res.status(403).json({
          error: 'Escalación no permitida',
          message: 'No tienes autorización para asignar el rol de Propietario (R0).'
        });
      }
    }

    const userId = uuidv4();
    let passwordHash = null;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    } else {
      // Si no se proporciona contraseña, el usuario nace en 'pending' para invitarlo por correo
      status = 'pending';
      const temporaryRandom = generateSecureRandomToken(16);
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(temporaryRandom, salt);
    }

    const avatarUrl = req.file ? `/uploads/avatars/${req.file.filename}` : null;

    // Transacción Knex para asegurar atomicidad
    await db.transaction(async (trx) => {
      await trx('users').insert({
        id: userId,
        business_id: req.user.business_id,
        name,
        email,
        password_hash: passwordHash,
        status,
        avatar_url: avatarUrl,
        is_owner: false,
        created_by: req.user.id,
        created_at: new Date(),
        updated_at: new Date()
      });

      if (password) {
        await trx('password_history').insert({
          id: uuidv4(),
          user_id: userId,
          password_hash: passwordHash,
          created_at: new Date()
        });
      }

      // Asignar roles
      if (roleIds && roleIds.length > 0) {
        const userRolesRows = roleIds.map((rId) => ({
          id: uuidv4(),
          user_id: userId,
          role_id: rId,
          created_at: new Date()
        }));
        await trx('user_roles').insert(userRolesRows);
      }

      // Asignar alcances
      if (scopes && scopes.length > 0) {
        const scopesRows = scopes.map((s) => ({
          id: uuidv4(),
          user_id: userId,
          branch_id: s.branch_id || null,
          warehouse_id: s.warehouse_id || null,
          created_at: new Date()
        }));
        await trx('user_scopes').insert(scopesRows);
      }
    });

    // Si nació en estado pending, enviar invitación por correo
    if (status === 'pending') {
      const resetToken = generateSecureRandomToken(32);
      const tokenHash = hashToken(resetToken);
      await db('password_reset_tokens').insert({
        id: uuidv4(),
        user_id: userId,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 horas para invitación
        created_at: new Date()
      });

      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      const inviteUrl = `${appUrl}/reset-password?token=${resetToken}`;
      await sendInvitationEmail(email, inviteUrl);
    }

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'users.create',
      entityType: 'user',
      entityId: userId,
      newValues: { name, email, status, roleIds },
      req
    });

    return res.status(201).json({
      message:
        status === 'pending'
          ? 'Usuario creado exitosamente. Se ha enviado una invitación por correo para activar su cuenta.'
          : 'Usuario creado exitosamente.',
      userId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Editar usuario (PUT/PATCH /api/users/:id)
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;

    const user = await db('users')
      .where({ id, business_id: req.user.business_id, deleted_at: null })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Regla de seguridad crítica:
    // Un administrador u otro usuario NO puede modificar la cuenta del Propietario (R0), salvo el propio Propietario
    if (user.is_owner && req.user.id !== user.id) {
      return res.status(403).json({
        error: 'Acción prohibida',
        message: 'No está permitido modificar la cuenta del Propietario (R0).'
      });
    }

    let bodyData = { ...req.body };
    if (typeof bodyData.roleIds === 'string') {
      try {
        bodyData.roleIds = JSON.parse(bodyData.roleIds);
      } catch (e) {
        bodyData.roleIds = [bodyData.roleIds];
      }
    }
    if (typeof bodyData.scopes === 'string') {
      try {
        bodyData.scopes = JSON.parse(bodyData.scopes);
      } catch (e) {
        bodyData.scopes = [];
      }
    }

    const parsed = updateUserSchema.parse(bodyData);
    const { name, email, status, roleIds, scopes } = parsed;

    // Verificar si el nuevo email ya existe en otra cuenta
    if (email && email !== user.email) {
      const emailClash = await db('users')
        .where({ business_id: req.user.business_id, email, deleted_at: null })
        .whereNot({ id })
        .first();

      if (emailClash) {
        return res.status(409).json({
          error: 'Conflicto de correo',
          message: 'Ya existe otro usuario con este correo electrónico.'
        });
      }
    }

    const updates = {
      updated_by: req.user.id,
      updated_at: new Date()
    };
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (status && !user.is_owner) updates.status = status;
    if (req.file) updates.avatar_url = `/uploads/avatars/${req.file.filename}`;

    await db.transaction(async (trx) => {
      await trx('users').where({ id }).update(updates);

      // Si se especificaron roles
      if (roleIds !== undefined) {
        // Un no-propietario no puede otorgarse el rol owner
        const selectedRoles = await trx('roles').whereIn('id', roleIds);
        const includesOwner = selectedRoles.some((r) => r.code === 'owner');
        if (includesOwner && !req.user.is_owner) {
          throw new Error('No puedes asignar el rol de Propietario.');
        }

        await trx('user_roles').where({ user_id: id }).del();
        if (roleIds.length > 0) {
          const newRoles = roleIds.map((rId) => ({
            id: uuidv4(),
            user_id: id,
            role_id: rId,
            created_at: new Date()
          }));
          await trx('user_roles').insert(newRoles);
        }
      }

      // Si se especificaron alcances
      if (scopes !== undefined) {
        await trx('user_scopes').where({ user_id: id }).del();
        if (scopes.length > 0) {
          const newScopes = scopes.map((s) => ({
            id: uuidv4(),
            user_id: id,
            branch_id: s.branch_id || null,
            warehouse_id: s.warehouse_id || null,
            created_at: new Date()
          }));
          await trx('user_scopes').insert(newScopes);
        }
      }
    });

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'users.update',
      entityType: 'user',
      entityId: id,
      oldValues: { name: user.name, email: user.email, status: user.status },
      newValues: updates,
      req
    });

    return res.status(200).json({ message: 'Usuario actualizado exitosamente.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Activar o Desactivar usuario (PATCH /api/users/:id/status)
 * Regla: Al desactivar se revoca de inmediato toda sesión activa en user_sessions
 */
async function setUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = userStatusSchema.parse(req.body);

    const user = await db('users')
      .where({ id, business_id: req.user.business_id, deleted_at: null })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.is_owner) {
      return res.status(403).json({
        error: 'Acción prohibida',
        message: 'No está permitido desactivar la cuenta del Propietario (R0).'
      });
    }

    await db('users').where({ id }).update({
      status,
      updated_by: req.user.id,
      updated_at: new Date()
    });

    // Si se desactiva, REVOCAR de inmediato todas sus sesiones activas
    if (status === 'disabled') {
      await db('user_sessions')
        .where({ user_id: id, revoked_at: null })
        .update({ revoked_at: new Date() });
    }

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: status === 'disabled' ? 'users.disable' : 'users.enable',
      entityType: 'user',
      entityId: id,
      oldValues: { status: user.status },
      newValues: { status },
      req
    });

    return res.status(200).json({
      message: `El usuario ha sido ${status === 'disabled' ? 'desactivado y sus sesiones activas revocadas' : 'activado'} exitosamente.`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Eliminar usuario lógicamente (DELETE /api/users/:id)
 * Soft delete mediante deleted_at
 */
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    const user = await db('users')
      .where({ id, business_id: req.user.business_id, deleted_at: null })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.is_owner) {
      return res.status(403).json({
        error: 'Acción prohibida',
        message: 'El Propietario (R0) no puede ser eliminado del sistema.'
      });
    }

    // Soft delete: marcar deleted_at y revocar sesiones
    await db('users').where({ id }).update({
      deleted_at: new Date(),
      status: 'disabled',
      updated_by: req.user.id,
      updated_at: new Date()
    });

    await db('user_sessions')
      .where({ user_id: id, revoked_at: null })
      .update({ revoked_at: new Date() });

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'users.soft_delete',
      entityType: 'user',
      entityId: id,
      req
    });

    return res.status(200).json({
      message: 'Usuario eliminado exitosamente (archivado lógico).'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  setUserStatus,
  deleteUser
};
