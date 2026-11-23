import { beforeEach, describe, expect, test, vi } from 'vitest'
import { abrirConteo, registrarConteo, registrarMovimiento } from '../../api/inventario.js'
import { registrarLectura } from './registrarLectura.js'

// Se reemplaza la capa de API: aquí solo importa qué se llama y cómo se arma el registro del manifiesto
vi.mock('../../api/inventario.js', () => ({
  abrirConteo: vi.fn(),
  registrarConteo: vi.fn(),
  registrarMovimiento: vi.fn(),
}))

const producto = { id: 7, nombre: 'Jeans', sku: 'MOD-1042' }
const bodega = { id: 2, nombre: 'Bodega norte' }

beforeEach(() => vi.clearAllMocks())

describe('registrarLectura', () => {
  test('entrada y salida son movimientos con la bodega y la clave de la lectura', async () => {
    registrarMovimiento.mockResolvedValue({
      operacion: { id: 1 },
      movimientos: [{ existenciasAntes: 10, existenciasDespues: 7 }],
      duplicado: false,
    })
    const registro = await registrarLectura('salida', { producto, cantidad: 3, clave: 'k-1' }, bodega, 'OV-9')

    expect(registrarMovimiento).toHaveBeenCalledWith({
      tipo: 'salida',
      bodegaId: 2,
      productoId: 7,
      cantidad: 3,
      documento: 'OV-9',
      clave: 'k-1',
    })
    expect(registro).toMatchObject({
      tipo: 'salida',
      cantidad: 3,
      existenciasAntes: 10,
      existenciasDespues: 7,
      diferencia: null,
      bodega: 'Bodega norte',
      documento: 'OV-9',
    })
    expect(abrirConteo).not.toHaveBeenCalled()
  })

  test('el conteo abre una sesión, manda la partida y no cambia las existencias', async () => {
    abrirConteo.mockResolvedValue({ id: 5 })
    registrarConteo.mockResolvedValue({
      conteoId: 5,
      partidas: [{ productoId: 7, sistema: 12, contado: 10, diferencia: -2, ajusteId: 3 }],
    })
    const registro = await registrarLectura('conteo', { producto, cantidad: 10, clave: 'k-2' }, bodega, '')

    expect(abrirConteo).toHaveBeenCalledWith(2, null)
    expect(registrarConteo).toHaveBeenCalledWith(5, [{ productoId: 7, contado: 10 }])
    expect(registro).toMatchObject({
      tipo: 'conteo',
      cantidad: 10,
      existenciasAntes: 12,
      existenciasDespues: 12,
      diferencia: -2,
      ajusteId: 3,
    })
    expect(registrarMovimiento).not.toHaveBeenCalled()
  })
})
