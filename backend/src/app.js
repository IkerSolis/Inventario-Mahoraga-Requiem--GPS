const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const rolesRoutes = require('./modules/roles/roles.routes');
const dashboardsRoutes = require('./modules/dashboards/dashboards.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const rolesController = require('./modules/roles/roles.controller');
const { authenticateToken, requirePermission } = require('./middlewares/authMiddleware');
const errorHandler = require('./middlewares/errorHandler');
const db = require('./database/connection');

const app = express();

// Seguridad de cabeceras HTTP con Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Configuración de CORS con credenciales (para cookies HttpOnly)
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir solicitudes locales de desarrollo y herramientas como Postman/Supertest
      if (!origin || origin === allowedOrigin || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error('Bloqueado por política CORS'));
      }
    },
    credentials: true
  })
);

app.use(cookieParser(process.env.COOKIE_SECRET || 'mahoraga_cookie_secret_2026'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos subidos (avatares y logos)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Inventarios Mahoraga - API REST Backend 1',
    timestamp: new Date().toISOString()
  });
});

// Enrutamiento modular bajo /api
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.get(
  '/api/permissions',
  authenticateToken,
  requirePermission('roles.read'),
  rolesController.listPermissions
);
app.get(
  '/api/audit-logs',
  authenticateToken,
  requirePermission('audit.read'),
  async (req, res, next) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = (page - 1) * limit;

      let query = db('audit_logs').where('business_id', req.user.business_id);
      if (req.query.entityType) {
        query = query.where('entity_type', req.query.entityType);
      }
      if (req.query.action) {
        query = query.where('action', 'like', `%${req.query.action}%`);
      }

      const countRes = await query.clone().count('id as total').first();
      const total = Number(countRes.total) || 0;

      const logs = await query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset);

      const formatted = logs.map((l) => ({
        id: l.id,
        userId: l.user_id,
        action: l.action,
        entityType: l.entity_type,
        entityId: l.entity_id,
        oldValues: l.old_values_json ? JSON.parse(l.old_values_json) : null,
        newValues: l.new_values_json ? JSON.parse(l.new_values_json) : null,
        ipAddress: l.ip_address,
        userAgent: l.user_agent,
        createdAt: l.created_at
      }));

      res.status(200).json({
        logs: formatted,
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
);
app.use('/api/dashboards', dashboardsRoutes);
app.use('/api/settings', settingsRoutes);

// Manejo de ruta no encontrada (404)
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta solicitada ${req.method} ${req.originalUrl} no existe en este servidor.`
  });
});

// Middleware centralizado de errores
app.use(errorHandler);

module.exports = app;
