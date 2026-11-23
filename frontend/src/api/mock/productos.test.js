import { beforeEach, describe, expect, test } from 'vitest'
import { archivar, actualizar, crear, generarSku, listar, listarCategorias, obtener } from './productos.js'
import { obtenerSesion } from './sesion.js'

// El mock debe responder EXACTO como Backend 2: inglés, snake_case y { ok, data, pagination }
describe('mock de /products', () => {
  beforeEach(() => obtenerSesion('owner'))

  test('la lista viene paginada como el servidor', async () => {
    const respuesta = await listar({ page: 2, limit: 10 })
    expect(respuesta.ok).toBe(true)
    expect(respuesta.data).toHaveLength(10)
    expect(respuesta.pagination).toEqual({ page: 2, limit: 10, total: expect.any(Number), totalPages: 5 })
    expect(Object.keys(respuesta.data[0])).toEqual(
      expect.arrayContaining([
        'sku',
        'name',
        'barcode',
        'cost_price',
        'sale_price',
        'category_id',
        'status',
        'image_url',
      ]),
    )
  })

  test('sin costs.read no viaja cost_price', async () => {
    await obtenerSesion('sales')
    const { data } = await listar({ limit: 100 })
    expect(data.every((p) => !('cost_price' in p))).toBe(true)
    expect('cost_price' in (await obtener(1)).data).toBe(false)
  })

  test('search busca en SKU, nombre y código de barras, sin distinguir mayúsculas', async () => {
    expect((await listar({ search: 'mod-1000' })).data.map((p) => p.sku)).toEqual(['MOD-1000'])
    expect((await listar({ search: 'CINTURÓN' })).data.every((p) => p.name.startsWith('Cinturón'))).toBe(true)
    expect((await listar({ search: '7500000000015' })).data.map((p) => p.id)).toEqual([1])
  })

  test('filtra por categoría y por estado', async () => {
    const { data, pagination } = await listar({ category_id: 6, limit: 100 })
    expect(pagination.total).toBe(data.length)
    expect(data.every((p) => p.category_id === 6)).toBe(true)
  })

  test('limit mayor a 100 es un error 400', async () => {
    await expect(listar({ limit: 500 })).rejects.toMatchObject({ estado: 400 })
  })

  test('crear exige SKU y responde 409 si se repite', async () => {
    await expect(crear({ name: 'Sin SKU' })).rejects.toMatchObject({ estado: 400 })
    const { sku } = await generarSku('PRB')
    expect(sku).toMatch(/^PRB-\d{4}$/)
    const creado = await crear({ sku, name: 'Producto de prueba', sale_price: 10 })
    expect(creado.data).toMatchObject({ sku, name: 'Producto de prueba', status: 'active', barcode: null })
    await expect(crear({ sku, name: 'Otro' })).rejects.toMatchObject({ estado: 409 })
  })

  test('archivar no devuelve el producto; restaurar es un PUT con status active', async () => {
    const respuesta = await archivar(2)
    expect(respuesta).toEqual({ ok: true, message: expect.any(String), id: 2, status: 'archived' })
    expect((await listar({ status: 'archived', limit: 100 })).data.map((p) => p.id)).toContain(2)

    const restaurado = await actualizar(2, { status: 'active' })
    expect(restaurado.data.status).toBe('active')
  })

  test('cada acción pide su permiso (403)', async () => {
    await obtenerSesion('auditor')
    await expect(crear({ sku: 'XX-1', name: 'Nada' })).rejects.toMatchObject({ estado: 403 })
    await expect(actualizar(1, { name: 'Nada' })).rejects.toMatchObject({ estado: 403 })
    await expect(archivar(1)).rejects.toMatchObject({ estado: 403 })
  })

  test('las categorías vienen como objetos', async () => {
    const { data } = await listarCategorias()
    expect(data[0]).toMatchObject({ id: expect.any(Number), name: expect.any(String), slug: expect.any(String) })
  })
})
