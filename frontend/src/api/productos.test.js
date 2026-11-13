import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  actualizarProducto,
  buscarProductoPorCodigo,
  crearProducto,
  listarProductos,
  restaurarProducto,
} from './productos.js'

// En los tests no hay VITE_USE_MOCK, así que estas funciones llaman a fetch como con el servidor real.
// Aquí se reemplaza fetch para revisar qué ruta y cuerpo se mandan, y cómo se traduce la respuesta.
function servidorResponde(cuerpo, estado = 200) {
  const fetchFalso = vi.fn(async () => ({ ok: estado < 400, status: estado, json: async () => cuerpo }))
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

afterEach(() => vi.unstubAllGlobals())

const fila = (cambios) => ({
  id: 1,
  sku: 'MOD-1000',
  name: 'Camiseta',
  barcode: '7500000000015',
  sale_price: 189,
  unit: 'pieza',
  category_id: 1,
  status: 'active',
  ...cambios,
})

const pagina = (data) => ({ ok: true, data, pagination: { page: 1, limit: 100, total: data.length, totalPages: 1 } })

describe('listarProductos', () => {
  test('pide /products con los parámetros del servidor y traduce la respuesta', async () => {
    const fetchFalso = servidorResponde(pagina([fila()]))
    const resultado = await listarProductos({ pagina: 2, porPagina: 25, busqueda: 'cami', categoriaId: '3' })
    expect(fetchFalso.mock.calls[0][0]).toBe('/api/products?page=2&limit=25&search=cami&category_id=3&status=active')
    expect(resultado.elementos[0]).toMatchObject({ nombre: 'Camiseta', categoriaId: 1, archivado: false })
    expect(resultado.total).toBe(1)
  })

  test('los archivados se piden con status=archived', async () => {
    const fetchFalso = servidorResponde(pagina([]))
    await listarProductos({ archivados: true })
    expect(fetchFalso.mock.calls[0][0]).toContain('status=archived')
  })
})

describe('buscarProductoPorCodigo (escáner)', () => {
  test('busca con search y status=all, y se queda con la coincidencia exacta', async () => {
    // search compara por partes: '7500000000015' también encuentra códigos que lo contienen
    const fetchFalso = servidorResponde(
      pagina([fila({ id: 2, barcode: '17500000000015', sku: 'X-2' }), fila({ id: 1 })]),
    )
    const producto = await buscarProductoPorCodigo(' 7500000000015 ')
    expect(fetchFalso.mock.calls[0][0]).toBe('/api/products?search=7500000000015&limit=100&status=all')
    expect(producto.id).toBe(1)
  })

  test('también encuentra por SKU sin importar mayúsculas', async () => {
    servidorResponde(pagina([fila()]))
    expect((await buscarProductoPorCodigo('mod-1000')).id).toBe(1)
  })

  test('404 si no hay coincidencia exacta', async () => {
    servidorResponde(pagina([fila({ sku: 'MOD-10001' })]))
    await expect(buscarProductoPorCodigo('MOD-1000X')).rejects.toMatchObject({ estado: 404 })
  })

  test('409 si el producto está archivado', async () => {
    servidorResponde(pagina([fila({ status: 'archived' })]))
    await expect(buscarProductoPorCodigo('MOD-1000')).rejects.toMatchObject({
      estado: 409,
      message: 'Camiseta está archivado; restáuralo para moverlo',
    })
  })
})

describe('crear, editar y restaurar', () => {
  test('sin imagen va como JSON en inglés', async () => {
    const fetchFalso = servidorResponde({ ok: true, data: fila({ id: 49 }) })
    await crearProducto({ sku: 'MOD-0049', nombre: 'Camiseta', categoriaId: 1, precioVenta: 189 })
    const [ruta, opciones] = fetchFalso.mock.calls[0]
    expect(ruta).toBe('/api/products')
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body)).toEqual({ sku: 'MOD-0049', name: 'Camiseta', category_id: 1, sale_price: 189 })
  })

  test('con imagen va como multipart en la misma petición (campo image), sin valores null', async () => {
    const fetchFalso = servidorResponde({ ok: true, data: fila() })
    const imagen = new File(['png'], 'foto.png', { type: 'image/png' })
    await actualizarProducto(1, { nombre: 'Camiseta', codigoBarras: '' }, imagen)
    const [ruta, opciones] = fetchFalso.mock.calls[0]
    expect(ruta).toBe('/api/products/1')
    expect(opciones.method).toBe('PUT')
    expect(opciones.body).toBeInstanceOf(FormData)
    expect(opciones.body.get('image')).toBeInstanceOf(File)
    expect(opciones.body.get('name')).toBe('Camiseta')
    expect(opciones.body.has('barcode')).toBe(false)
  })

  test('restaurar es un PUT con status active', async () => {
    const fetchFalso = servidorResponde({ ok: true, data: fila() })
    await restaurarProducto(5)
    const [ruta, opciones] = fetchFalso.mock.calls[0]
    expect(ruta).toBe('/api/products/5')
    expect(opciones.method).toBe('PUT')
    expect(JSON.parse(opciones.body)).toEqual({ status: 'active' })
  })
})

describe('errores', () => {
  test('toma el texto de { ok: false, error } (Backend 2)', async () => {
    servidorResponde({ ok: false, error: "Ya existe un producto con el SKU 'MOD-1'" }, 409)
    await expect(crearProducto({ sku: 'MOD-1', nombre: 'X' })).rejects.toMatchObject({
      estado: 409,
      message: "Ya existe un producto con el SKU 'MOD-1'",
    })
  })

  test('toma message de { error, message } (Backend 1)', async () => {
    servidorResponde({ error: 'No autenticado', message: 'Token de acceso no proporcionado.' }, 401)
    await expect(listarProductos()).rejects.toMatchObject({ estado: 401, message: 'Token de acceso no proporcionado.' })
  })
})
