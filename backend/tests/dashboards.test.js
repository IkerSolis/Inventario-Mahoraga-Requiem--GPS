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

test('Módulo 4 (Dashboards): Listar dashboards del usuario', async () => {
  const auth = await loginAs();

  const res = await request(app).get('/api/dashboards').set('Cookie', auth.cookies);

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.dashboards));
  assert.ok(res.body.dashboards.length >= 1);
});

test('Módulo 4 (Dashboards): Crear dashboard con widgets en el Grid modular (OmniStock Pulse)', async () => {
  const auth = await loginAs();

  const res = await request(app)
    .post('/api/dashboards')
    .set('Cookie', auth.cookies)
    .send({
      name: 'Dashboard Operaciones Almacén',
      isDefault: false,
      isShared: true,
      sharedScope: 'business',
      widgets: [
        {
          widgetType: 'kpi_stock_summary',
          title: 'Resumen de Stock',
          posX: 0,
          posY: 0,
          width: 2,
          height: 1
        },
        {
          widgetType: 'chart_expirations',
          title: 'Caducidades FIFO',
          posX: 2,
          posY: 0,
          width: 2,
          height: 1
        }
      ]
    });

  assert.equal(res.status, 201);
  assert.ok(res.body.dashboardId);

  // Consultar detalle
  const detail = await request(app)
    .get(`/api/dashboards/${res.body.dashboardId}`)
    .set('Cookie', auth.cookies);

  assert.equal(detail.status, 200);
  assert.equal(detail.body.dashboard.widgets.length, 2);
});

test('Módulo 4 (Dashboards): Rechaza dimensiones inválidas en el Grid con Zod (400)', async () => {
  const auth = await loginAs();

  // Intentar crear widget con ancho mayor a 4 columnas (grid máximo es 4 columnas)
  const res = await request(app)
    .post('/api/dashboards')
    .set('Cookie', auth.cookies)
    .send({
      name: 'Dashboard Invalido',
      widgets: [
        {
          widgetType: 'kpi_test',
          title: 'Test',
          posX: 0,
          posY: 0,
          width: 8, // Máximo 4
          height: 1
        }
      ]
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Error de validación');
});

test('Módulo 4 (Dashboards): Duplicar dashboard', async () => {
  const auth = await loginAs();

  const listRes = await request(app).get('/api/dashboards').set('Cookie', auth.cookies);

  const dashId = listRes.body.dashboards[0].id;

  const dupRes = await request(app)
    .post(`/api/dashboards/${dashId}/duplicate`)
    .set('Cookie', auth.cookies);

  assert.equal(dupRes.status, 201);
  assert.ok(dupRes.body.dashboardId);
});
