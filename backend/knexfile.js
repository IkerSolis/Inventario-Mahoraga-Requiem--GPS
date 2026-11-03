require('dotenv').config();
const path = require('path');

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: process.env.SQLITE_PATH || path.resolve(__dirname, 'data/mahoraga_dev.sqlite')
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    },
    migrations: {
      directory: path.resolve(__dirname, 'src/database/migrations')
    },
    seeds: {
      directory: path.resolve(__dirname, 'src/database/seeds')
    }
  },

  test: {
    client: 'sqlite3',
    connection: {
      filename: process.env.TEST_DB_PATH || path.resolve(__dirname, 'data/mahoraga_test.sqlite')
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    },
    migrations: {
      directory: path.resolve(__dirname, 'src/database/migrations')
    },
    seeds: {
      directory: path.resolve(__dirname, 'src/database/seeds')
    }
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'mahoraga_inventory',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: path.resolve(__dirname, 'src/database/migrations')
    },
    seeds: {
      directory: path.resolve(__dirname, 'src/database/seeds')
    }
  }
};

