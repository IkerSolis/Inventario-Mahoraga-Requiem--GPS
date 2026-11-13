import { beforeEach, describe, expect, test } from 'vitest'
import {
  abrirConteo,
  aprobarAjuste,
  guardarNiveles,
  listarAjustes,
  listarExistencias,
  listarMovimientos,
  recibirTransferencia,
  registrarConteo,
  registrarMovimiento,
  solicitarAjuste,
  verKardex,
} from './inventario.js'
import { obtenerSesion } from './sesion.js'

// Existencias físicas de un producto en la bodega 1 (fila sin lote)
async function fisico(productId, warehouseId = 1) {
  const { data } = await listarExistencias({ product_id: productId, warehouse_id: warehouseId })
  return data[0]?.physical_qty ?? 0
}

let numeroClave = 0
function clave() {
  numeroClave += 1
  return `clave-${numeroClave}`
}

describe('mock de /inventory/stock', () => {
  beforeEach(() => obtenerSesion('owner'))

  test('calcula disponible y estado como el servidor', async () => {
    const { data, pagination } = await listarExistencias({ warehouse_id: 1, limit: 100 })
    expect(pagination.total).toBe(48)
    for (const fila of data) {
      expect(fila.available_qty).toBe(fila.physical_qty - fila.reserved_qty)
      const esperado =
        fila.physical_qty <= 0 ? 'Agotado' : fila.physical_qty <= fila.min_stock ? 'Stock Bajo' : 'Optimo'
      expect(fila.stock_state).toBe(esperado)
    }
  })

  test('filtra por estado y oculta el costo sin costs.read', async () => {
    const { data } = await listarExistencias({ state: 'agotado', limit: 100 })
    expect(data.length).toBeGreaterThan(0)
    expect(data.every((f) => f.stock_state === 'Agotado')).toBe(true)

    await obtenerSesion('warehouse_operator')
    const sinCosto = await listarExistencias({ limit: 5 })
    expect(sinCosto.data.every((f) => !('average_cost' in f))).toBe(true)
  })

  test('niveles: el máximo no puede ser menor que el mínimo', async () => {
    const { data } = await guardarNiveles({ product_id: 3, warehouse_id: 1, min_stock: 5, max_stock: 50, aisle: '9' })
    expect(data).toMatchObject({ min_stock: 5, max_stock: 50, aisle: '9' })
    await expect(guardarNiveles({ product_id: 3, min_stock: 20, max_stock: 10 })).rejects.toMatchObject({ estado: 400 })
  })
})

describe('mock de /inventory/movements', () => {
  beforeEach(() => obtenerSesion('owner'))

  test('entrada suma y salida resta, con saldo antes y después', async () => {
    const antes = await fisico(2)
    const entrada = await registrarMovimiento({
      type: 'receive',
      warehouse_id: 1,
      product_id: 2,
      qty: 10,
      idempotency_key: clave(),
    })
    expect(entrada.ok).toBe(true)
    expect(entrada.operation).toMatchObject({ movement_type: 'receive', status: 'completed', qty: 10 })
    expect(entrada.movements[0]).toMatchObject({ initial_qty: antes, resulting_qty: antes + 10 })

    await registrarMovimiento({ type: 'issue', warehouse_id: 1, product_id: 2, qty: 4, idempotency_key: clave() })
    expect(await fisico(2)).toBe(antes + 6)
  })

  test('la misma idempotency_key no mueve el stock dos veces', async () => {
    const antes = await fisico(3)
    const cuerpo = { type: 'receive', warehouse_id: 1, product_id: 3, qty: 5, idempotency_key: clave() }
    await registrarMovimiento(cuerpo)
    const repetido = await registrarMovimiento(cuerpo)
    expect(repetido.duplicate).toBe(true)
    expect(await fisico(3)).toBe(antes + 5)
    // misma clave con otros datos: 409
    await expect(registrarMovimiento({ ...cuerpo, qty: 6 })).rejects.toMatchObject({ estado: 409 })
  })

  test('no se puede sacar más de lo disponible', async () => {
    const actual = await fisico(4)
    await expect(
      registrarMovimiento({ type: 'issue', warehouse_id: 1, product_id: 4, qty: actual + 1, idempotency_key: clave() }),
    ).rejects.toMatchObject({ estado: 409 })
    expect(await fisico(4)).toBe(actual)
  })

  test('valida el cuerpo como el servidor (400)', async () => {
    const base = { type: 'receive', warehouse_id: 1, product_id: 1, qty: 1, idempotency_key: clave() }
    await expect(registrarMovimiento({ ...base, qty: 0 })).rejects.toMatchObject({ estado: 400 })
    await expect(registrarMovimiento({ ...base, qty: 1.234 })).rejects.toMatchObject({ estado: 400 })
    await expect(registrarMovimiento({ ...base, idempotency_key: '' })).rejects.toMatchObject({ estado: 400 })
    await expect(registrarMovimiento({ ...base, type: 'transfer' })).rejects.toMatchObject({ estado: 400 })
  })

  test('cada tipo pide su permiso del seed de Backend 1', async () => {
    await obtenerSesion('sales') // ventas: no mueve stock
    const cuerpo = { type: 'receive', warehouse_id: 1, product_id: 1, qty: 1, idempotency_key: clave() }
    await expect(registrarMovimiento(cuerpo)).rejects.toMatchObject({ estado: 403 })

    await obtenerSesion('warehouse_operator') // almacenista: entrada y salida, pero no transferencia
    await expect(registrarMovimiento(cuerpo)).resolves.toMatchObject({ ok: true })
    const transferencia = { ...cuerpo, type: 'transfer', destination_warehouse_id: 2, idempotency_key: clave() }
    await expect(registrarMovimiento(transferencia)).rejects.toMatchObject({ estado: 403 })
  })

  test('una transferencia sale de una bodega y entra a la otra al recibirla', async () => {
    // Producto 9: tiene 16 en el almacén principal y ninguna fila en la bodega norte
    const origen = await fisico(9, 1)
    const destino = await fisico(9, 2)
    const { operation } = await registrarMovimiento({
      type: 'transfer',
      warehouse_id: 1,
      destination_warehouse_id: 2,
      product_id: 9,
      qty: 3,
      idempotency_key: clave(),
    })
    expect(operation.status).toBe('in_transit')
    expect(await fisico(9, 1)).toBe(origen - 3)
    expect(await fisico(9, 2)).toBe(destino)

    const recibida = await recibirTransferencia(operation.id)
    expect(recibida.operation.status).toBe('completed')
    expect(await fisico(9, 2)).toBe(destino + 3)

    const { data } = await listarMovimientos({ type: 'transfer' })
    expect(data[0]).toMatchObject({ id: operation.id, status: 'completed' })
    expect(data[0]).not.toHaveProperty('request_hash')
  })

  test('el kardex queda del más viejo al más nuevo, con saldos encadenados', async () => {
    const { movements, total_movements } = await verKardex(2, { warehouse_id: 1 })
    expect(total_movements).toBe(movements.length)
    for (let i = 1; i < movements.length; i++) {
      expect(movements[i].initial_qty).toBe(movements[i - 1].resulting_qty)
    }
  })
})

describe('mock de conteos y ajustes', () => {
  beforeEach(() => obtenerSesion('owner'))

  test('el conteo crea un ajuste pendiente si hay diferencia y cierra la sesión', async () => {
    await obtenerSesion('warehouse_operator')
    const sistema = await fisico(5)
    const sesion = await abrirConteo({ warehouse_id: 1 })
    expect(sesion.data.status).toBe('in_progress')

    const { data } = await registrarConteo(sesion.data.id, { items: [{ product_id: 5, counted_qty: sistema + 2 }] })
    expect(data.status).toBe('completed')
    expect(data.items[0]).toMatchObject({ system_qty: sistema, counted_qty: sistema + 2, difference_qty: 2 })
    expect(data.items[0].adjustment_id).toEqual(expect.any(Number))
    // el conteo no mueve el stock
    expect(await fisico(5)).toBe(sistema)
    // la sesión ya está cerrada
    await expect(registrarConteo(sesion.data.id, { items: [{ product_id: 6, counted_qty: 1 }] })).rejects.toMatchObject(
      { estado: 409 },
    )
  })

  test('quien solicita un ajuste no puede aprobarlo; otro usuario sí', async () => {
    await obtenerSesion('inventory_manager')
    const sistema = await fisico(7)
    const { data: ajuste } = await solicitarAjuste({
      warehouse_id: 1,
      product_id: 7,
      adjustment_type: 'positive',
      qty: 4,
      reason: 'Mercancía encontrada en otro rack',
    })
    expect(ajuste.status).toBe('pending')
    await expect(aprobarAjuste(ajuste.id)).rejects.toMatchObject({ estado: 403 })

    await obtenerSesion('owner')
    const pendientes = await listarAjustes()
    expect(pendientes.data.map((a) => a.id)).toContain(ajuste.id)
    const aprobado = await aprobarAjuste(ajuste.id)
    expect(aprobado).toMatchObject({ status: 'approved', initial_qty: sistema, resulting_qty: sistema + 4 })
    expect(await fisico(7)).toBe(sistema + 4)
    await expect(aprobarAjuste(ajuste.id)).rejects.toMatchObject({ estado: 409 })
  })

  test('el motivo del ajuste necesita al menos 5 caracteres', async () => {
    await expect(
      solicitarAjuste({ product_id: 1, adjustment_type: 'negative', qty: 1, reason: 'no' }),
    ).rejects.toMatchObject({ estado: 400 })
  })
})
