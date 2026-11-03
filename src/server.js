/**
 * Punto de entrada para iniciar el servidor HTTP.
 */
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Servidor de Inventarios Mahoraga activo`);
  console.log(`URL base: http://localhost:${PORT}/api/products`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});

