const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');

/**
 * Función utilitaria para registrar eventos de auditoría de forma segura y consistente
 */
async function recordAuditLog({
  businessId,
  userId = null,
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  req = null
}) {
  try {
    const ipAddress = req
      ? req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip
      : null;
    const userAgent = req ? req.headers['user-agent'] : null;

    // Sanitizar objetos para no guardar nunca contraseñas ni tokens
    const sanitize = (data) => {
      if (!data) return null;
      const copy = { ...data };
      delete copy.password;
      delete copy.password_hash;
      delete copy.token;
      delete copy.refreshToken;
      delete copy.refresh_token_hash;
      return copy;
    };

    await db('audit_logs').insert({
      id: uuidv4(),
      business_id: businessId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      old_values_json: oldValues ? JSON.stringify(sanitize(oldValues)) : null,
      new_values_json: newValues ? JSON.stringify(sanitize(newValues)) : null,
      ip_address: ipAddress ? String(ipAddress).slice(0, 45) : null,
      user_agent: userAgent ? String(userAgent).slice(0, 255) : null,
      created_at: new Date()
    });
  } catch (err) {
    console.error('[AUDIT LOG ERROR] No se pudo escribir en audit_logs:', err.message);
  }
}

module.exports = {
  recordAuditLog
};
