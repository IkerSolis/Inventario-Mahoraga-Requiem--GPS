const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, setupTestDb, teardownTestDb, loginAs } = require('./helpers');

test.before(async () => {
  await setupTestDb();
});

test.after(async () => {
  await teardownTestDb();
});

test('Módulo 2 (Usuarios): Listar usuarios con paginación', async () => {
  const auth = await loginAs();

  const res = await request(app).get('/api/users?page=1&limit=5').set('Cookie', auth.cookies);

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.users));
  assert.ok(res.body.pagination.total >= 1);
});

test('Módulo 2 (Usuarios): Crear nuevo usuario con Zod y asignación de rol', async () => {
  const auth = await loginAs();

  const res = await request(app)
    .post('/api/users')
    .set('Cookie', auth.cookies)
    .send({
      name: 'Carlos Almacenista',
      email: 'carlos.almacen@mahoraga.local',
      password: 'Password123*',
      status: 'active',
      roleIds: ['r4-warehouse-operator']
    });

  assert.equal(res.status, 201);
  assert.ok(res.body.userId);

  // Verificar en base de datos
  const userInDb = await db('users').where({ id: res.body.userId }).first();
  assert.equal(userInDb.name, 'Carlos Almacenista');
  assert.equal(userInDb.status, 'active');
  assert.equal(userInDb.is_owner, 0); // No es propietario
});

test('Módulo 2 (Usuarios): Rechaza creación con correo duplicado (409)', async () => {
  const auth = await loginAs();

  const res = await request(app).post('/api/users').set('Cookie', auth.cookies).send({
    name: 'Duplicado',
    email: 'owner@mahoraga.local',
    password: 'Password123*'
  });

  assert.equal(res.status, 409);
  assert.equal(res.body.error, 'Conflicto');
});

test('Módulo 2 (Usuarios): Desactivar usuario revoca inmediatamente sus sesiones activas', async () => {
  const auth = await loginAs();

  // 1. Crear un usuario de prueba
  const createRes = await request(app)
    .post('/api/users')
    .set('Cookie', auth.cookies)
    .send({
      name: 'Pedro Auditor',
      email: 'pedro.auditor@mahoraga.local',
      password: 'AuditorPassword1*',
      status: 'active',
      roleIds: ['r7-auditor']
    });
  const targetUserId = createRes.body.userId;

  // 2. Iniciar sesión como ese usuario
  const userLogin = await loginAs('pedro.auditor@mahoraga.local', 'AuditorPassword1*');
  assert.equal(userLogin.res.status, 200);

  // 3. El dueño desactiva a Pedro Auditor
  const disableRes = await request(app)
    .patch(`/api/users/${targetUserId}/status`)
    .set('Cookie', auth.cookies)
    .send({ status: 'disabled' });

  assert.equal(disableRes.status, 200);

  // 4. La sesión previa de Pedro Auditor ahora debe ser rechazada inmediatamente
  const checkRes = await request(app).get('/api/auth/me').set('Cookie', userLogin.cookies);

  assert.equal(checkRes.status, 403);
  assert.equal(checkRes.body.error, 'Cuenta desactivada');
});

test('Módulo 2 (Usuarios): Prohibido desactivar o eliminar al Propietario (R0)', async () => {
  const auth = await loginAs();

  // Intentar desactivar al Propietario
  const disableRes = await request(app)
    .patch(`/api/users/${auth.user.id}/status`)
    .set('Cookie', auth.cookies)
    .send({ status: 'disabled' });

  assert.equal(disableRes.status, 403);
  assert.equal(disableRes.body.error, 'Acción prohibida');

  // Intentar eliminar al Propietario
  const deleteRes = await request(app)
    .delete(`/api/users/${auth.user.id}`)
    .set('Cookie', auth.cookies);

  assert.equal(deleteRes.status, 403);
  assert.equal(deleteRes.body.error, 'Acción prohibida');
});

test('Módulo 2 (Usuarios): Eliminación lógica (Soft Delete) de usuario común', async () => {
  const auth = await loginAs();

  // Crear usuario transitorio
  const createRes = await request(app).post('/api/users').set('Cookie', auth.cookies).send({
    name: 'Usuario Temporal',
    email: 'temporal@mahoraga.local',
    password: 'TemporalPass1*'
  });

  const tempId = createRes.body.userId;

  // Eliminar
  const delRes = await request(app).delete(`/api/users/${tempId}`).set('Cookie', auth.cookies);

  assert.equal(delRes.status, 200);

  // Verificar en base de datos que el registro físico sigue existiendo pero con deleted_at
  const dbUser = await db('users').where({ id: tempId }).first();
  assert.ok(dbUser);
  assert.ok(dbUser.deleted_at !== null);
  assert.equal(dbUser.status, 'disabled');
});
