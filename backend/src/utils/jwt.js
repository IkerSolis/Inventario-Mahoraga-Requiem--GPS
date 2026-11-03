const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'mahoraga_jwt_access_secret_development_2026';
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'mahoraga_jwt_refresh_secret_development_2026';
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Genera un Access Token JWT de corta duración
 */
function signAccessToken(payload) {
  const jti = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  return jwt.sign({ ...payload, jti }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

/**
 * Genera un Refresh Token JWT de larga duración con rotación y nonce criptográfico único
 */
function signRefreshToken(payload) {
  const jti = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  return jwt.sign({ ...payload, jti }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

/**
 * Verifica un Access Token JWT
 */
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * Verifica un Refresh Token JWT
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

/**
 * Genera un hash criptográfico SHA-256 para tokens de sesión y recuperación
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Genera un token aleatorio seguro en formato hexadecimal
 */
function generateSecureRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  generateSecureRandomToken
};
