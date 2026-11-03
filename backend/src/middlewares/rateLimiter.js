const rateLimit = require('express-rate-limit');

// Limitador de intentos para inicio de sesión (Login)
// 10 intentos por ventana de 15 minutos por IP
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  message: {
    error: 'Demasiados intentos fallidos',
    message:
      'Has excedido el número máximo de intentos de inicio de sesión. Por favor espera 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Limitador para recuperación de contraseñas
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: process.env.NODE_ENV === 'test' ? 1000 : 5,
  message: {
    error: 'Demasiadas solicitudes de recuperación',
    message: 'Has solicitado restablecer contraseña demasiadas veces. Intenta más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  loginRateLimiter,
  passwordResetLimiter
};
