import { afterEach, describe, expect, test, vi } from 'vitest'
import { existenciasDeProducto, listarExistencias, registrarConteo, registrarMovimiento } from './inventario.js'

// Igual que en productos.test.js: se reemplaza fetch para revisar ruta, cuerpo y traducción
function servidorResponde(cuerpo) {
  const fetchFalso = vi.fn(async () => ({ ok: true, status: 200, json: async () => cuerpo }))
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

afterEach(() => vi.unstubAllGlobals())

const filaStock = (cambios) => ({
  id: 1,
  warehouse_id: 1,
  product_id: 7,
  lot_number: '',
  physical_qty: 10,
  reserved_qty: 2,
  available_qty: 8,
  min_stock: 5,
  max_stock: 40,
  aisle: '1',
  rack: 'A',
  bin_location: '3',
  stock_state: 'Optimo',
  ...cambios,
})

const pagina = (data) => ({ ok: true, data, pagination: { page: 1, limit: 100, total: data.length, totalPages: 1 } })

describe('existencias', () => {
  test('el filtro de estado se traduce a ?state= del servidor', async () => {
    const fetchFalso = servidorResponde(pagina([]))
    await listarExistencias({ bodegaId: 2, estado: 'bajo' })
    expect(fetchFalso.mock.calls[0][0]).toBe('/api/inventory/stock?warehouse_id=2&state=bajo&page=1&limit=20')
  })

  test('existenciasDeProducto suma los lotes y toma la ubicación de la fila sin lote', async () => {
    servidorResponde(
      pagina([filaStock({ id: 2, lot_number: 'L-01', physical_qty: 5, available_qty: 5, aisle: '9' }), filaStock()]),
    )
    expect(await existenciasDeProducto(7, 1)).toEqual({
      fisico: 15,
      disponible: 13,
      pasillo: '1',
      rack: 'A',
      gaveta: '3',
    })
  })
})

describe('movimientos y conteos', () => {
  test('registrarMovimiento manda warehouse_id e idempotency_key en el cuerpo', async () => {
    const fetchFalso = servidorResponde({
      ok: true,
      operation: {
        id: 1,
        movement_type: 'receive',
        status: 'completed',
        source_warehouse_id: 1,
        product_id: 7,
        qty: 3,
      },
      movements: [{ id: 4, initial_qty: 10, resulting_qty: 13 }],
    })
    const resultado = await registrarMovimiento({
      tipo: 'entrada',
      bodegaId: 1,
      productoId: 7,
      cantidad: 3,
      clave: 'k-1',
    })
    const [ruta, opciones] = fetchFalso.mock.calls[0]
    expect(ruta).toBe('/api/inventory/movements')
    expect(opciones.headers).not.toHaveProperty('Idempotency-Key')
    expect(JSON.parse(opciones.body)).toEqual({
      type: 'receive',
      warehouse_id: 1,
      product_id: 7,
      qty: 3,
      idempotency_key: 'k-1',
    })
    expect(resultado.movimientos[0]).toMatchObject({ existenciasAntes: 10, existenciasDespues: 13 })
  })

  test('registrarConteo manda las partidas como items', async () => {
    const fetchFalso = servidorResponde({
      ok: true,
      data: {
        count_session_id: 3,
        status: 'completed',
        items: [{ product_id: 7, system_qty: 10, counted_qty: 9, difference_qty: -1, adjustment_id: 2 }],
      },
    })
    const resultado = await registrarConteo(3, [{ productoId: 7, contado: 9 }])
    const [ruta, opciones] = fetchFalso.mock.calls[0]
    expect(ruta).toBe('/api/inventory/counts/3/items')
    expect(JSON.parse(opciones.body)).toEqual({ items: [{ product_id: 7, counted_qty: 9 }] })
    expect(resultado.partidas[0]).toMatchObject({ sistema: 10, diferencia: -1, ajusteId: 2 })
  })
})
