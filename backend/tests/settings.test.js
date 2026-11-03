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

test('Módulo 5 (Configuración): Obtener configuración y límites de la empresa', async () => {
  const auth = await loginAs();

  const res = await request(app).get('/api/settings/company').set('Cookie', auth.cookies);

  assert.equal(res.status, 200);
  assert.equal(res.body.company.name, 'Mahoraga Central');
  assert.ok(res.body.company.approvalLimits);
});

test('Módulo 5 (Configuración): Actualizar tokens de diseño visual (tema CSS)', async () => {
  const auth = await loginAs();

  const res = await request(app).put('/api/settings/theme').set('Cookie', auth.cookies).send({
    colorPrimary: '#6366F1',
    colorBg: '#0F172A',
    tableDensity: 'compact'
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.theme.colorPrimary, '#6366F1');

  // Verificar obtención pública/autenticada
  const getTheme = await request(app).get('/api/settings/theme').set('Cookie', auth.cookies);

  assert.equal(getTheme.status, 200);
  assert.equal(getTheme.body.theme.colorPrimary, '#6366F1');
});

test('Módulo 5 (Configuración): Crear y listar sucursales y almacenes', async () => {
  const auth = await loginAs();

  // 1. Crear sucursal
  const branchRes = await request(app)
    .post('/api/settings/branches')
    .set('Cookie', auth.cookies)
    .send({
      code: 'SUC-GDL-02',
      name: 'Sucursal Guadalajara Norte',
      address: 'Av. Vallarta #2000, Zapopan, Jal.'
    });

  assert.equal(branchRes.status, 201);
  const branchId = branchRes.body.branchId;

  // 2. Crear almacén en esa sucursal
  const whRes = await request(app)
    .post('/api/settings/warehouses')
    .set('Cookie', auth.cookies)
    .send({
      branchId,
      code: 'ALM-FRIO-01',
      name: 'Cámara de Refrigeración Almacén Norte'
    });

  assert.equal(whRes.status, 201);

  // 3. Listar almacenes filtrados por sucursal
  const listWh = await request(app)
    .get(`/api/settings/warehouses?branchId=${branchId}`)
    .set('Cookie', auth.cookies);

  assert.equal(listWh.status, 200);
  assert.equal(listWh.body.warehouses.length, 1);
  assert.equal(listWh.body.warehouses[0].code, 'ALM-FRIO-01');
});
