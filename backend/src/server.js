require('dotenv').config();
const app = require('./app');
const db = require('./database/connection');

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // Probar conexión a la base de datos
    await db.raw('SELECT 1');
    console.log('[DATABASE] Conexión a base de datos establecida exitosamente.');

    app.listen(PORT, () => {
      console.log(
        `[SERVER] Servidor Backend 1 de Inventarios Mahoraga corriendo en el puerto ${PORT}`
      );
      console.log(`[SERVER] Health check disponible en: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('[SERVER ERROR] Error fatal iniciando el servidor:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
