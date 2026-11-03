const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, setupTestDb, teardownTestDb, loginAs } = require('./helpers');

test.before(async () => {
  await setupTestDb();
});

test.after(async () => {
  await teardownTestDb();
});

test('Módulo 1 (Auth): Login exitoso con credenciales válidas emite JWT y cookies HttpOnly', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: 'owner@mahoraga.local',
    password: 'Admin123*'
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, 'owner@mahoraga.local');
  assert.equal(res.body.user.is_owner, true);
  assert.ok(res.body.tokens.access_token);
  assert.ok(res.body.tokens.refresh_token);

  // Verificar cookies HttpOnly
  const cookies = res.headers['set-cookie'];
  assert.ok(cookies.some((c) => c.includes('access_token=')));
  assert.ok(cookies.some((c) => c.includes('HttpOnly')));
});

test('Módulo 1 (Auth): Login con contraseña incorrecta responde 401', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: 'owner@mahoraga.local',
    password: 'PasswordErroneo!'
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'Credenciales inválidas');
});

test('Módulo 1 (Auth): Login con email inexistente responde 401 (sin enumeración)', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: 'noexiste@mahoraga.local',
    password: 'CualquierPassword1*'
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'Credenciales inválidas');
});

test('Módulo 1 (Auth): Renovación de sesión (/api/auth/refresh) con rotación de refresh token', async () => {
  const auth = await loginAs();

  const res = await request(app).post('/api/auth/refresh').set('Cookie', auth.cookies);

  assert.equal(res.status, 200);
  assert.ok(res.body.tokens.access_token);
  assert.ok(res.body.tokens.refresh_token);
  // El nuevo refresh token debe ser diferente al anterior (rotación)
  assert.notEqual(res.body.tokens.refresh_token, auth.refreshToken);
});

test('Módulo 1 (Auth): Perfil propio (/api/auth/me) retorna datos correctos', async () => {
  const auth = await loginAs();

  const res = await request(app).get('/api/auth/me').set('Cookie', auth.cookies);

  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, 'owner@mahoraga.local');
  assert.ok(Array.isArray(res.body.user.permissions));
  assert.equal(res.body.user.permissions.length, 30);
});

test('Módulo 1 (Auth): Logout revoca sesión en DB y limpia cookies', async () => {
  const auth = await loginAs();

  const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', auth.cookies);

  assert.equal(logoutRes.status, 200);

  // La petición posterior con ese token de sesión debe ser rechazada por estar revocada
  const protectedRes = await request(app).get('/api/auth/me').set('Cookie', auth.cookies);

  assert.equal(protectedRes.status, 401);
  assert.equal(protectedRes.body.error, 'Sesión revocada');
});
