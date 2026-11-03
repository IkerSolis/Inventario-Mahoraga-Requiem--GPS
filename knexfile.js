// Configuración de Knex para SQLite y PostgreSQL
require('dotenv').config();
const path = require('path');

/** @type { Object.<string, import("knex").Knex.Config> } */
module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DB_FILENAME || path.resolve(__dirname, 'dev.sqlite3')
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    },
    migrations: {
      directory: path.resolve(__dirname, 'migrations')
    }
  },

  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'inventarios_mahoraga',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: path.resolve(__dirname, 'migrations')
    }
  }
};

