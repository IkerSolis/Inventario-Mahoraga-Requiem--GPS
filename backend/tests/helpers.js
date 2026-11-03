process.env.NODE_ENV = 'test';
process.env.TEST_DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/database/connection');

/**
 * Inicializa la base de datos de pruebas (migraciones y semillas)
 */
async function setupTestDb() {
  await db.migrate.rollback(undefined, true);
  await db.migrate.latest();
  await db.seed.run();
}

/**
 * Cierra la conexión a la base de datos
 */
async function teardownTestDb() {
  await db.destroy();
}

/**
 * Realiza login y devuelve las cookies y token de acceso
 */
async function loginAs(email = 'owner@mahoraga.local', password = 'Admin123*') {
  const res = await request(app).post('/api/auth/login').send({ email, password });

  const cookies = res.headers['set-cookie'] || [];
  const accessToken = res.body.tokens ? res.body.tokens.access_token : null;
  const refreshToken = res.body.tokens ? res.body.tokens.refresh_token : null;

  return {
    res,
    cookies,
    accessToken,
    refreshToken,
    user: res.body.user
  };
}

module.exports = {
  app,
  db,
  setupTestDb,
  teardownTestDb,
  loginAs
};
