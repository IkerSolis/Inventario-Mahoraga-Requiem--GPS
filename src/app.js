/**
 * Configuración de la aplicación Express 4.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Módulos de la API
const productsRoutes = require('./modules/products/products.routes');
const categoriesRoutes = require('./modules/categories/categories.routes');

const app = express();

// Middlewares globales de seguridad y utilidades
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// acceso a carpeta de imágenes subidas de manera estática
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Montaje de rutas modulares bajo el prefijo /api
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);

// Ruta de comprobación de salud del servidor
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Servidor de Inventarios Mahoraga funcionando correctamente.'
  });
});

// Error 404 rutas inexistentes
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

// Middleware global para manejo de errores imprevistos
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);

  // Manejo de errores de límite de tamaño
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      ok: false,
      error: 'El archivo supera el límite máximo permitido de 5MB.'
    });
  }

  return res.status(500).json({
    ok: false,
    error: err.message || 'Error interno del servidor.'
  });
});

module.exports = app;

