const { Router } = require('express');
const authController = require('./auth.controller');
const { authenticateToken } = require('../../middlewares/authMiddleware');
const { loginRateLimiter, passwordResetLimiter } = require('../../middlewares/rateLimiter');

const router = Router();

// Rutas públicas
router.post('/login', loginRateLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Rutas protegidas (requieren JWT en cookie o header)
router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.getProfile);
router.post('/change-password', authenticateToken, authController.changePassword);
router.get('/sessions', authenticateToken, authController.getSessions);
router.delete('/sessions/:id', authenticateToken, authController.revokeSession);

module.exports = router;
