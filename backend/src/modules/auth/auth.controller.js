const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../../database/connection');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateSecureRandomToken
} = require('../../utils/jwt');
const { recordAuditLog } = require('../../middlewares/auditMiddleware');
const { sendPasswordResetEmail } = require('../../utils/mailer');
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
} = require('./auth.validation');

// Utilidad para configurar cookies HttpOnly seguras
function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax'
  };

  res.cookie('access_token', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000 // 15 minutos
  });

  if (refreshToken) {
    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });
  }
}

function clearAuthCookies(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax'
  };
  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', cookieOptions);
}

/**
 * Iniciar sesión (Login)
 */
async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await db('users').where({ email, deleted_at: null }).first();

    // Mensaje genérico para evitar enumeración de usuarios
    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'El correo electrónico o la contraseña ingresada son incorrectos.'
      });
    }

    // Verificar si la cuenta se encuentra bloqueada temporalmente por fuerza bruta
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({
        error: 'Cuenta bloqueada temporalmente',
        message: 'Demasiados intentos fallidos. Tu cuenta está bloqueada temporalmente.'
      });
    }

    // Comparación criptográfica de contraseña
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const updates = { failed_login_attempts: attempts };
      if (attempts >= 5) {
        // Bloquear 15 minutos tras 5 fallos consecutivos
        updates.locked_until = new Date(Date.now() + 15 * 60 * 1000);
      }
      await db('users').where({ id: user.id }).update(updates);

      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'El correo electrónico o la contraseña ingresada son incorrectos.'
      });
    }

    // Restablecer contador de fallos
    await db('users').where({ id: user.id }).update({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date()
    });

    // Validar estado de la cuenta
    if (user.status === 'disabled') {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Tu usuario ha sido desactivado. Contacta al administrador.'
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Tu cuenta está pendiente de activación por correo electrónico.'
      });
    }

    // Crear sesión de telemetría y generar Refresh Token
    const sessionId = uuidv4();
    const refreshToken = signRefreshToken({ userId: user.id, sessionId });
    const refreshTokenHash = hashToken(refreshToken);

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const userAgent = req.headers['user-agent'] || 'Desconocido';

    await db('user_sessions').insert({
      id: sessionId,
      user_id: user.id,
      business_id: user.business_id,
      refresh_token_hash: refreshTokenHash,
      ip_address: String(ipAddress).slice(0, 45),
      user_agent: String(userAgent).slice(0, 255),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      created_at: new Date(),
      last_accessed_at: new Date()
    });

    // Generar Access Token
    const accessToken = signAccessToken({
      userId: user.id,
      businessId: user.business_id,
      sessionId
    });

    // Cargar roles y permisos para responder al cliente
    const roles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', user.id)
      .select('roles.id', 'roles.code', 'roles.name');

    const roleIds = roles.map((r) => r.id);
    let permissions = [];
    if (roleIds.length > 0) {
      const permsRows = await db('role_permissions')
        .join('permissions', 'role_permissions.permission_id', 'permissions.id')
        .whereIn('role_permissions.role_id', roleIds)
        .select('permissions.code')
        .distinct();
      permissions = permsRows.map((p) => p.code);
    }
    if (user.is_owner || roles.some((r) => r.code === 'owner')) {
      const allPerms = await db('permissions').select('code');
      permissions = allPerms.map((p) => p.code);
    }

    // Establecer cookies HttpOnly
    setAuthCookies(res, accessToken, refreshToken);

    // Registrar auditoría de acceso exitoso
    await recordAuditLog({
      businessId: user.business_id,
      userId: user.id,
      action: 'auth.login_success',
      entityType: 'user_session',
      entityId: sessionId,
      req
    });

    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        business_id: user.business_id,
        name: user.name,
        email: user.email,
        status: user.status,
        is_owner: Boolean(user.is_owner),
        avatar_url: user.avatar_url,
        roles: roles.map((r) => r.code),
        permissions
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Renovar Access Token con Refresh Token (Rotación de token)
 */
async function refresh(req, res, next) {
  try {
    const refreshToken =
      (req.cookies && req.cookies.refresh_token) || (req.body && req.body.refresh_token);

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token requerido',
        message: 'No se encontró el token de refresco en cookies ni en el cuerpo de la petición.'
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      clearAuthCookies(res);
      return res.status(401).json({
        error: 'Token inválido',
        message: 'El refresh token es inválido o ha expirado. Por favor inicia sesión de nuevo.'
      });
    }

    const session = await db('user_sessions')
      .where({ id: decoded.sessionId, revoked_at: null })
      .first();

    if (!session) {
      clearAuthCookies(res);
      return res.status(401).json({
        error: 'Sesión no válida',
        message: 'La sesión no existe o ha sido revocada.'
      });
    }

    const providedHash = hashToken(refreshToken);
    if (session.refresh_token_hash !== providedHash) {
      // Posible reutilización indebida de token: revocar toda la sesión por seguridad
      await db('user_sessions').where({ id: session.id }).update({ revoked_at: new Date() });
      clearAuthCookies(res);
      return res.status(401).json({
        error: 'Violación de seguridad',
        message: 'Detección de reutilización de token. La sesión ha sido cerrada.'
      });
    }

    const user = await db('users')
      .where({ id: session.user_id, deleted_at: null, status: 'active' })
      .first();

    if (!user) {
      clearAuthCookies(res);
      return res.status(403).json({
        error: 'Usuario inactivo',
        message: 'El usuario ya no se encuentra activo.'
      });
    }

    // Rotar Refresh Token
    const newRefreshToken = signRefreshToken({ userId: user.id, sessionId: session.id });
    const newRefreshHash = hashToken(newRefreshToken);

    await db('user_sessions').where({ id: session.id }).update({
      refresh_token_hash: newRefreshHash,
      last_accessed_at: new Date()
    });

    const newAccessToken = signAccessToken({
      userId: user.id,
      businessId: user.business_id,
      sessionId: session.id
    });

    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res.status(200).json({
      message: 'Tokens renovados exitosamente',
      tokens: {
        access_token: newAccessToken,
        refresh_token: newRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cerrar sesión (Logout)
 */
async function logout(req, res, next) {
  try {
    const sessionId = req.user && req.user.sessionId;
    if (sessionId) {
      await db('user_sessions').where({ id: sessionId }).update({ revoked_at: new Date() });

      await recordAuditLog({
        businessId: req.user.business_id,
        userId: req.user.id,
        action: 'auth.logout',
        entityType: 'user_session',
        entityId: sessionId,
        req
      });
    }

    clearAuthCookies(res);
    return res.status(200).json({
      message: 'Sesión cerrada correctamente y cookies revocadas.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener perfil del usuario autenticado actual (/api/auth/me)
 */
async function getProfile(req, res, next) {
  try {
    const user = await db('users').where({ id: req.user.id }).first();

    const business = await db('businesses').where({ id: req.user.business_id }).first();

    return res.status(200).json({
      user: {
        id: user.id,
        business_id: user.business_id,
        name: user.name,
        email: user.email,
        status: user.status,
        is_owner: Boolean(user.is_owner),
        avatar_url: user.avatar_url,
        roles: req.user.roles,
        permissions: req.user.permissions,
        scopes: req.user.scopes
      },
      business: business
        ? {
            id: business.id,
            name: business.name,
            legal_name: business.legal_name,
            logo_url: business.logo_url
          }
        : null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Solicitar recuperación de contraseña (Forgot Password)
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await db('users').where({ email, deleted_at: null, status: 'active' }).first();

    if (user) {
      const resetToken = generateSecureRandomToken(32);
      const tokenHash = hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await db('password_reset_tokens').insert({
        id: uuidv4(),
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: new Date()
      });

      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    // Siempre responder 200 para evitar enumeración de correos
    return res.status(200).json({
      message:
        'Si el correo electrónico existe en nuestra base de datos, recibirás un enlace para restablecer tu contraseña.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Restablecer contraseña mediante token (Reset Password)
 */
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(token);

    const resetRecord = await db('password_reset_tokens')
      .where({ token_hash: tokenHash, used_at: null })
      .andWhere('expires_at', '>', new Date())
      .first();

    if (!resetRecord) {
      return res.status(400).json({
        error: 'Token inválido o expirado',
        message: 'El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.'
      });
    }

    const user = await db('users').where({ id: resetRecord.user_id }).first();
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Comprobar que no reutilice las últimas 3 contraseñas del historial
    const history = await db('password_history')
      .where({ user_id: user.id })
      .orderBy('created_at', 'desc')
      .limit(3);

    for (const h of history) {
      const isReused = await bcrypt.compare(newPassword, h.password_hash);
      if (isReused) {
        return res.status(400).json({
          error: 'Contraseña no permitida',
          message: 'No puedes reutilizar una de tus últimas 3 contraseñas.'
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Actualizar contraseña del usuario y marcar token como usado
    await db('users')
      .where({ id: user.id })
      .update({
        password_hash: newHash,
        failed_login_attempts: 0,
        locked_until: null,
        status: user.status === 'pending' ? 'active' : user.status,
        updated_at: new Date()
      });

    await db('password_reset_tokens').where({ id: resetRecord.id }).update({
      used_at: new Date()
    });

    // Guardar en historial
    await db('password_history').insert({
      id: uuidv4(),
      user_id: user.id,
      password_hash: newHash,
      created_at: new Date()
    });

    // Revocar todas las sesiones activas tras el cambio
    await db('user_sessions').where({ user_id: user.id, revoked_at: null }).update({
      revoked_at: new Date()
    });

    await recordAuditLog({
      businessId: user.business_id,
      userId: user.id,
      action: 'auth.password_reset',
      entityType: 'user',
      entityId: user.id,
      req
    });

    return res.status(200).json({
      message: 'Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cambiar contraseña desde sesión activa (Change Password)
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await db('users').where({ id: req.user.id }).first();
    const currentMatches = await bcrypt.compare(currentPassword, user.password_hash);

    if (!currentMatches) {
      return res.status(400).json({
        error: 'Contraseña incorrecta',
        message: 'La contraseña actual ingresada es incorrecta.'
      });
    }

    // Verificar últimas 3 contraseñas
    const history = await db('password_history')
      .where({ user_id: user.id })
      .orderBy('created_at', 'desc')
      .limit(3);

    for (const h of history) {
      const isReused = await bcrypt.compare(newPassword, h.password_hash);
      if (isReused) {
        return res.status(400).json({
          error: 'Contraseña repetida',
          message: 'No puedes reutilizar una de tus últimas 3 contraseñas.'
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db('users').where({ id: user.id }).update({
      password_hash: newHash,
      updated_at: new Date()
    });

    await db('password_history').insert({
      id: uuidv4(),
      user_id: user.id,
      password_hash: newHash,
      created_at: new Date()
    });

    // Revocar otras sesiones salvo la actual
    if (req.user.sessionId) {
      await db('user_sessions')
        .where({ user_id: user.id, revoked_at: null })
        .whereNot({ id: req.user.sessionId })
        .update({ revoked_at: new Date() });
    }

    await recordAuditLog({
      businessId: user.business_id,
      userId: user.id,
      action: 'auth.password_change',
      entityType: 'user',
      entityId: user.id,
      req
    });

    return res.status(200).json({
      message: 'Contraseña actualizada correctamente. Las demás sesiones han sido cerradas.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Listar sesiones activas de telemetría del usuario autenticado
 */
async function getSessions(req, res, next) {
  try {
    const sessions = await db('user_sessions')
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'desc')
      .select('id', 'ip_address', 'user_agent', 'created_at', 'last_accessed_at', 'revoked_at');

    const formatted = sessions.map((s) => ({
      id: s.id,
      ip: s.ip_address,
      userAgent: s.user_agent,
      startedAt: s.created_at,
      lastAccessedAt: s.last_accessed_at,
      isCurrent: s.id === req.user.sessionId,
      isActive: s.revoked_at === null
    }));

    return res.status(200).json({ sessions: formatted });
  } catch (error) {
    next(error);
  }
}

/**
 * Revocar una sesión específica remotamente
 */
async function revokeSession(req, res, next) {
  try {
    const { id } = req.params;

    const session = await db('user_sessions').where({ id, user_id: req.user.id }).first();

    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    await db('user_sessions').where({ id }).update({ revoked_at: new Date() });

    return res.status(200).json({ message: 'Sesión revocada exitosamente.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  refresh,
  logout,
  getProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  getSessions,
  revokeSession
};
