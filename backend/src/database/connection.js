const knex = require('knex');
const knexConfig = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

if (!config) {
  throw new Error(
    `No se encontró configuración de base de datos para el entorno: "${environment}"`
  );
}

const db = knex(config);

module.exports = db;
