import { describe, expect, test } from 'vitest'
import { listarProductos } from './productos.js'
import { obtenerSesion } from './sesion.js'

describe('mock de productos', () => {
  test('sin costs.read la respuesta no trae el costo', async () => {
    await obtenerSesion('R6')
    const { elementos } = await listarProductos()
    expect(elementos.every((p) => !('precioCompra' in p))).toBe(true)
  })

  test('con costs.read la respuesta sí trae el costo', async () => {
    await obtenerSesion('R0')
    const { elementos } = await listarProductos()
    expect(elementos.every((p) => typeof p.precioCompra === 'number')).toBe(true)
  })
})
