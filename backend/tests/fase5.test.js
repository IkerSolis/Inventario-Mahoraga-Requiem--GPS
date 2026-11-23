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

test('Fase 5 (Onboarding): Devuelve initialized=true cuando existe negocio y bloquea re-ejecución (403)', async () => {
  const statusRes = await request(app).get('/api/settings/onboarding/status');
  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.body.initialized, true);

  const blockedRes = await request(app).post('/api/settings/onboarding').send({
    companyName: 'Empresa Intrusa',
    ownerName: 'Intruso',
    ownerEmail: 'intruso@mahoraga.local',
    ownerPassword: 'Password123*'
  });
  assert.equal(blockedRes.status, 403);
  assert.equal(blockedRes.body.error, 'Sistema ya inicializado');
});

test('Fase 5 (Idiomas y Monedas): Consultar y actualizar configuración regional', async () => {
  const auth = await loginAs();

  const updateRes = await request(app)
    .put('/api/settings/regional')
    .set('Cookie', auth.cookies)
    .send({
      locale: 'en-US',
      currency: 'USD',
      currencySymbol: '$',
      decimals: 2,
      dateFormat: 'YYYY-MM-DD',
      timezone: 'America/New_York'
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.regional.currency, 'USD');
  assert.equal(updateRes.body.regional.locale, 'en-US');

  const getRes = await request(app).get('/api/settings/regional').set('Cookie', auth.cookies);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.regional.currency, 'USD');
  assert.equal(getRes.body.regional.dateFormat, 'YYYY-MM-DD');
});

test('Fase 5 (Notificaciones): Consultar y actualizar umbrales de alertas operativas', async () => {
  const auth = await loginAs();

  const updateRes = await request(app)
    .put('/api/settings/notifications')
    .set('Cookie', auth.cookies)
    .send({
      lowStockAlert: true,
      pendingApprovalAlert: true,
      fifoExpirationAlertDays: 7,
      dailySummaryEmail: true,
      pushEnabled: true,
      emailEnabled: true
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.notifications.fifoExpirationAlertDays, 7);
  assert.equal(updateRes.body.notifications.dailySummaryEmail, true);

  const getRes = await request(app).get('/api/settings/notifications').set('Cookie', auth.cookies);

  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.notifications.fifoExpirationAlertDays, 7);
});

test('Fase 5 (Correos SMTP): Guardar configuración sin exponer contraseña y probar envío', async () => {
  const auth = await loginAs();

  const updateRes = await request(app).put('/api/settings/smtp').set('Cookie', auth.cookies).send({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    user: 'noreply@mahoraga.local',
    pass: 'SecretoSuperSeguro2026!',
    from: '"Inventarios Mahoraga" <noreply@mahoraga.local>'
  });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.smtp.host, 'smtp-relay.brevo.com');
  assert.equal(updateRes.body.smtp.hasPassword, true);
  assert.equal(updateRes.body.smtp.pass, undefined);

  const getRes = await request(app).get('/api/settings/smtp').set('Cookie', auth.cookies);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.smtp.host, 'smtp-relay.brevo.com');
  assert.equal(getRes.body.smtp.hasPassword, true);
  assert.equal(getRes.body.smtp.pass, undefined);

  const testMailRes = await request(app)
    .post('/api/settings/smtp/test')
    .set('Cookie', auth.cookies)
    .send({ to: 'owner@mahoraga.local' });

  assert.equal(testMailRes.status, 200);
  assert.ok(testMailRes.body.message.includes('owner@mahoraga.local'));
});

test('Fase 5 (Temas Claro/Oscuro): Actualizar modo oscuro y colores semánticos CSS', async () => {
  const auth = await loginAs();

  const updateRes = await request(app).put('/api/settings/theme').set('Cookie', auth.cookies).send({
    mode: 'dark',
    colorPrimary: '#6366F1',
    colorBg: '#0F172A',
    colorSurface: '#1E293B',
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorDanger: '#EF4444'
  });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.theme.mode, 'dark');
  assert.equal(updateRes.body.theme.colorBg, '#0F172A');
});

test('Fase 5 (Sucursales y Almacenes): Editar nombre y estado de sucursal y almacén', async () => {
  const auth = await loginAs();

  const updateBranchRes = await request(app)
    .put('/api/settings/branches/br000000-0000-0000-0000-000000000001')
    .set('Cookie', auth.cookies)
    .send({
      name: 'Sucursal Matriz CDMX Renovada',
      address: 'Av. Reforma #500, CDMX',
      isActive: true
    });

  assert.equal(updateBranchRes.status, 200);

  const updateWarehouseRes = await request(app)
    .put('/api/settings/warehouses/wh000000-0000-0000-0000-000000000001')
    .set('Cookie', auth.cookies)
    .send({
      name: 'Almacén Central Hub #01',
      isActive: true
    });

  assert.equal(updateWarehouseRes.status, 200);
});

test('Fase 5 (Seguridad): Auditor (R7) recibe 403 al intentar modificar configuración regional o SMTP', async () => {
  const auth = await loginAs();

  await request(app)
    .post('/api/users')
    .set('Cookie', auth.cookies)
    .send({
      name: 'Auditor Fase 5',
      email: 'auditor.fase5@mahoraga.local',
      password: 'AuditorPassword123*',
      status: 'active',
      roleIds: ['r7-auditor']
    });

  const auditorLogin = await loginAs('auditor.fase5@mahoraga.local', 'AuditorPassword123*');

  const forbiddenRegional = await request(app)
    .put('/api/settings/regional')
    .set('Cookie', auditorLogin.cookies)
    .send({ currency: 'EUR' });

  assert.equal(forbiddenRegional.status, 403);
  assert.equal(forbiddenRegional.body.code, 'FORBIDDEN_PERMISSION');

  const forbiddenSmtp = await request(app)
    .get('/api/settings/smtp')
    .set('Cookie', auditorLogin.cookies);

  assert.equal(forbiddenSmtp.status, 403);
  assert.equal(forbiddenSmtp.body.code, 'FORBIDDEN_PERMISSION');
});
