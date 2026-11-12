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

test('Fase 3 (Roles): Restaurar rol predeterminado a su configuración de fábrica (POST /api/roles/:id/reset)', async () => {
  const auth = await loginAs();

  // 1. Modificar permisos de un rol predeterminado (Supervisor de almacén)
  await request(app)
    .put('/api/roles/r3-warehouse-supervisor')
    .set('Cookie', auth.cookies)
    .send({
      name: 'Supervisor Modificado Temporal',
      permissions: [{ permissionId: 'p10' }] // Solo 1 permiso
    });

  // Verificar que cambió
  const beforeReset = await request(app)
    .get('/api/roles/r3-warehouse-supervisor')
    .set('Cookie', auth.cookies);
  assert.equal(beforeReset.body.role.permissions.length, 1);
  assert.equal(beforeReset.body.role.name, 'Supervisor Modificado Temporal');

  // 2. Ejecutar restauración de fábrica
  const resetRes = await request(app)
    .post('/api/roles/r3-warehouse-supervisor/reset')
    .set('Cookie', auth.cookies);

  assert.equal(resetRes.status, 200);
  assert.ok(resetRes.body.restoredPermissions > 1);

  // 3. Verificar que recuperó su nombre y conjunto completo de permisos de fábrica (13 permisos)
  const afterReset = await request(app)
    .get('/api/roles/r3-warehouse-supervisor')
    .set('Cookie', auth.cookies);

  assert.equal(afterReset.body.role.name, 'Supervisor de almacén');
  assert.equal(afterReset.body.role.permissions.length, 13);
});

test('Fase 3 (Seguridad): No escalación de privilegios al crear/editar roles por no-propietarios', async () => {
  const auth = await loginAs();

  // 1. Crear un rol delegado con permiso 'roles.manage' pero sin 'settings.manage' ni 'users.disable'
  const customRoleRes = await request(app)
    .post('/api/roles')
    .set('Cookie', auth.cookies)
    .send({
      code: 'gestor_roles',
      name: 'Gestor de Roles Limitado',
      permissions: [{ permissionId: 'p07' }] // roles.manage
    });
  const gestorRoleId = customRoleRes.body.roleId;

  // 2. Crear un usuario de prueba con ese rol gestor
  await request(app)
    .post('/api/users')
    .set('Cookie', auth.cookies)
    .send({
      name: 'Gestor Delegado',
      email: 'gestor.delegado@mahoraga.local',
      password: 'GestorPass123*',
      status: 'active',
      roleIds: [gestorRoleId]
    });

  // 3. Iniciar sesión como ese gestor
  const gestorLogin = await loginAs('gestor.delegado@mahoraga.local', 'GestorPass123*');

  // 4. El gestor intenta crear un nuevo rol delegando 'settings.manage' (p08) que no posee
  const forbiddenCreate = await request(app)
    .post('/api/roles')
    .set('Cookie', gestorLogin.cookies)
    .send({
      code: 'rol_con_escalacion',
      name: 'Rol no autorizado',
      permissions: [{ permissionId: 'p08' }] // settings.manage
    });

  assert.equal(forbiddenCreate.status, 403);
  assert.equal(forbiddenCreate.body.error, 'Escalación no permitida');
});

test('Fase 3 (Usuarios): Protección contra desactivar al último administrador o dueño', async () => {
  const auth = await loginAs();

  // El dueño intenta desactivarse a sí mismo -> bloqueado por ser R0
  const disableOwner = await request(app)
    .patch(`/api/users/${auth.user.id}/status`)
    .set('Cookie', auth.cookies)
    .send({ status: 'disabled' });

  assert.equal(disableOwner.status, 403);
  assert.equal(disableOwner.body.error, 'Acción prohibida');
});

test('Fase 3 (Auditoría): Consultar bitácora de auditoría (/api/audit-logs) con permiso audit.read', async () => {
  const auth = await loginAs();

  const res = await request(app).get('/api/audit-logs?page=1&limit=10').set('Cookie', auth.cookies);

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.logs));
  assert.ok(res.body.pagination.total >= 1);
});

test('Fase 3 (Dashboards): Compartir y duplicar dashboards con alcance por negocio', async () => {
  const auth = await loginAs();

  // 1. Crear tablero personal
  const createDash = await request(app)
    .post('/api/dashboards')
    .set('Cookie', auth.cookies)
    .send({
      name: 'Dashboard Operativo Fase 3',
      isShared: false,
      sharedScope: 'private',
      widgets: [
        {
          widgetType: 'kpi_stock_valuation',
          title: 'Valuación Total',
          posX: 0,
          posY: 0,
          width: 2,
          height: 1
        }
      ]
    });
  const dashId = createDash.body.dashboardId;

  // 2. Compartir tablero con el negocio
  const updateShare = await request(app)
    .put(`/api/dashboards/${dashId}`)
    .set('Cookie', auth.cookies)
    .send({
      isShared: true,
      sharedScope: 'business'
    });
  assert.equal(updateShare.status, 200);

  // 3. Duplicar tablero
  const dupRes = await request(app)
    .post(`/api/dashboards/${dashId}/duplicate`)
    .set('Cookie', auth.cookies);

  assert.equal(dupRes.status, 201);
  assert.ok(dupRes.body.dashboardId);

  // 4. Eliminar el duplicado
  const delRes = await request(app)
    .delete(`/api/dashboards/${dupRes.body.dashboardId}`)
    .set('Cookie', auth.cookies);
  assert.equal(delRes.status, 200);
});
