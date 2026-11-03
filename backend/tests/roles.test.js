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

test('Módulo 3 (Roles y Permisos): Listar catálogo de roles predeterminados (R0 a R7)', async () => {
  const auth = await loginAs();

  const res = await request(app).get('/api/roles').set('Cookie', auth.cookies);

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.roles));
  assert.equal(res.body.roles.length, 8); // Los 8 roles predeterminados
  const codes = res.body.roles.map((r) => r.code);
  assert.ok(codes.includes('owner'));
  assert.ok(codes.includes('system_admin'));
  assert.ok(codes.includes('inventory_manager'));
  assert.ok(codes.includes('warehouse_supervisor'));
  assert.ok(codes.includes('warehouse_operator'));
  assert.ok(codes.includes('purchasing'));
  assert.ok(codes.includes('sales'));
  assert.ok(codes.includes('auditor'));
});

test('Módulo 3 (Roles y Permisos): Listar los 30 permisos atómicos agrupados por módulo', async () => {
  const auth = await loginAs();

  const res = await request(app).get('/api/permissions').set('Cookie', auth.cookies);

  assert.equal(res.status, 200);
  assert.equal(res.body.total, 30);
  assert.ok(res.body.modules.users);
  assert.ok(res.body.modules.roles);
  assert.ok(res.body.modules.stock);
});

test('Módulo 3 (Roles y Permisos): Crear y modificar rol personalizado', async () => {
  const auth = await loginAs();

  // 1. Crear rol
  const createRes = await request(app)
    .post('/api/roles')
    .set('Cookie', auth.cookies)
    .send({
      code: 'custom_supervisor',
      name: 'Supervisor Especial Turno Nocturno',
      description: 'Rol con permisos especiales de recepción y conteo',
      permissions: [
        { permissionId: 'p14' }, // stock.read
        { permissionId: 'p15' } // stock.receive
      ]
    });

  assert.equal(createRes.status, 201);
  const roleId = createRes.body.roleId;

  // 2. Consultar rol
  const getRes = await request(app).get(`/api/roles/${roleId}`).set('Cookie', auth.cookies);

  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.role.permissions.length, 2);

  // 3. Modificar rol
  const updateRes = await request(app)
    .put(`/api/roles/${roleId}`)
    .set('Cookie', auth.cookies)
    .send({
      name: 'Supervisor Turno Nocturno Actualizado',
      permissions: [
        { permissionId: 'p14' } // Solo stock.read
      ]
    });

  assert.equal(updateRes.status, 200);

  // 4. Eliminar rol personalizado
  const delRes = await request(app).delete(`/api/roles/${roleId}`).set('Cookie', auth.cookies);

  assert.equal(delRes.status, 200);
});

test('Módulo 3 (Roles y Permisos): Prohibido eliminar o alterar rol R0 (owner)', async () => {
  const auth = await loginAs();

  const delRes = await request(app).delete('/api/roles/r0-owner').set('Cookie', auth.cookies);

  assert.equal(delRes.status, 403);
  assert.equal(delRes.body.error, 'Rol del sistema protegido');

  const updateRes = await request(app).put('/api/roles/r0-owner').set('Cookie', auth.cookies).send({
    name: 'Intentando cambiar nombre',
    permissions: []
  });

  assert.equal(updateRes.status, 403);
  assert.equal(updateRes.body.error, 'Rol protegido');
});

test('Módulo 3 (Seguridad RBAC): Auditor (R7) recibe 403 Forbidden al intentar mutar recursos (solo lectura estricta)', async () => {
  const auth = await loginAs();

  // Crear usuario con rol Auditor (R7)
  await request(app)
    .post('/api/users')
    .set('Cookie', auth.cookies)
    .send({
      name: 'Elena Auditora',
      email: 'elena.auditor@mahoraga.local',
      password: 'AuditorPassword123*',
      status: 'active',
      roleIds: ['r7-auditor']
    });

  // Iniciar sesión como Auditor
  const auditorLogin = await loginAs('elena.auditor@mahoraga.local', 'AuditorPassword123*');
  assert.equal(auditorLogin.res.status, 200);

  // Intentar crear un usuario -> Debe recibir 403 Forbidden por falta de permiso 'users.create'
  const forbiddenCreate = await request(app)
    .post('/api/users')
    .set('Cookie', auditorLogin.cookies)
    .send({
      name: 'Infiltrado',
      email: 'infiltrado@mahoraga.local',
      password: 'Password123*'
    });

  assert.equal(forbiddenCreate.status, 403);
  assert.equal(forbiddenCreate.body.code, 'FORBIDDEN_PERMISSION');

  // Pero SI puede leer usuarios (permiso users.read)
  const allowedRead = await request(app).get('/api/users').set('Cookie', auditorLogin.cookies);

  assert.equal(allowedRead.status, 200);
});
