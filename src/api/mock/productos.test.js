import { describe, expect, test } from 'vitest'
import { listarProductos } from './productos.js'
import { obtenerSesion } from './sesion.js'

describe('mock de productos', () => {
  test('sin costs.read la respuesta no trae el costo', async () => {
    await obtenerSesion('R6')
    const { elementos } = await listarProductos()
    expect(elementos.every((p) => !('precioCompra' in p))).toBe(true)
  })

  test('la búsqueda ignora mayúsculas y acentos, y busca también por SKU', async () => {
    const porNombre = await listarProductos({ busqueda: 'CINTURON' })
    expect(porNombre.total).toBeGreaterThan(0)
    expect(porNombre.elementos.every((p) => p.nombre.startsWith('Cinturón'))).toBe(true)

    const porSku = await listarProductos({ busqueda: 'mod-1000' })
    expect(porSku.elementos.map((p) => p.sku)).toEqual(['MOD-1000'])
  })

  test('los filtros se combinan y el total cuenta solo lo filtrado', async () => {
    const { elementos, total } = await listarProductos({ categoria: 'Calzado', estadoStock: 'disponible', porPagina: 100 })
    expect(total).toBe(elementos.length)
    expect(elementos.every((p) => p.categoria === 'Calzado' && p.estadoStock === 'disponible')).toBe(true)
  })

  test('con costs.read la respuesta sí trae el costo', async () => {
    await obtenerSesion('R0')
    const { elementos } = await listarProductos()
    expect(elementos.every((p) => typeof p.precioCompra === 'number')).toBe(true)
  })
})
