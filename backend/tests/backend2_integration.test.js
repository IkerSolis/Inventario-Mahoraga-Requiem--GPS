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

test('Integración B1+B2: Crear categoría, producto, registrar entrada de stock y consultar reporte', async () => {
  const auth = await loginAs();

  // 1. Crear categoría (Backend 2 protegido con JWT de Backend 1)
  const catRes = await request(app)
    .post('/api/categories')
    .set('Cookie', auth.cookies)
    .send({
      name: 'Electrónica',
      slug: 'electronica',
      description: 'Dispositivos y accesorios',
      icon_name: 'devices',
      color_hex: '#4F46E5'
    });
  assert.equal(catRes.status, 201);
  const categoryId = catRes.body.data.id;

  // 2. Crear producto bajo esa categoría
  const prodRes = await request(app)
    .post('/api/products')
    .set('Cookie', auth.cookies)
    .send({
      sku: 'ELEC-001',
      name: 'Escáner Láser USB',
      cost_price: 450,
      sale_price: 890,
      unit: 'pieza',
      category_id: categoryId
    });
  assert.equal(prodRes.status, 201);
  const productId = prodRes.body.data.id;

  // 3. Configurar stock mínimo y registrar entrada (receive)
  const levelRes = await request(app)
    .post('/api/inventory/levels')
    .set('Cookie', auth.cookies)
    .send({
      product_id: productId,
      warehouse_id: 1,
      min_stock: 5,
      max_stock: 50
    });
  assert.equal(levelRes.status, 200);

  const movRes = await request(app)
    .post('/api/inventory/movements')
    .set('Cookie', auth.cookies)
    .send({
      type: 'receive',
      warehouse_id: 1,
      product_id: productId,
      qty: 12,
      unit_cost: 450,
      reference_doc: 'OC-1001',
      idempotency_key: 'test-recv-001'
    });
  assert.equal(movRes.status, 201);

  // 4. Consultar stock dinámico y reporte de valuación
  const stockRes = await request(app).get('/api/inventory/stock').set('Cookie', auth.cookies);
  assert.equal(stockRes.status, 200);
  assert.ok(stockRes.body.data.length >= 1);

  const repRes = await request(app)
    .get('/api/reports/inventory-valuation')
    .set('Cookie', auth.cookies);
  assert.equal(repRes.status, 200);
});

test('Integración B1+B2 (Seguridad RBAC): Petición sin sesión devuelve 401 y Auditor (R7) recibe 403 al crear producto', async () => {
  // Sin cookie -> 401
  const unauthRes = await request(app).get('/api/products');
  assert.equal(unauthRes.status, 401);

  // Con rol Auditor (R7) -> puede leer productos (200), pero no crear (403)
  const owner = await loginAs();
  await request(app)
    .post('/api/users')
    .set('Cookie', owner.cookies)
    .send({
      name: 'Auditor Integración',
      email: 'auditor.b2@mahoraga.local',
      password: 'AuditorPassword123*',
      status: 'active',
      roleIds: ['r7-auditor']
    });

  const auditor = await loginAs('auditor.b2@mahoraga.local', 'AuditorPassword123*');
  const readRes = await request(app).get('/api/products').set('Cookie', auditor.cookies);
  assert.equal(readRes.status, 200);

  const createRes = await request(app)
    .post('/api/products')
    .set('Cookie', auditor.cookies)
    .send({
      sku: 'FORBIDDEN-1',
      name: 'Intento no autorizado',
      cost_price: 10,
      sale_price: 20
    });
  assert.equal(createRes.status, 403);
});
