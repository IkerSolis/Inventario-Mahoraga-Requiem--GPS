import { describe, expect, test } from 'vitest'
import { actualizarProducto, crearProducto, listarProductos, obtenerProducto } from './productos.js'
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

describe('mock de crear y actualizar', () => {
  const datos = {
    nombre: 'Producto nuevo', descripcion: '', categoria: 'Calzado', marca: '', unidad: 'par',
    precioCompra: 50, precioVenta: 120, stockMinimo: 5, pasillo: '1', rack: 'A', gaveta: '1',
  }

  test('sin products.create se rechaza', async () => {
    await obtenerSesion('R6')
    await expect(crearProducto(datos)).rejects.toThrow('products.create')
  })

  test('sin prices.manage el precio de venta que venga se ignora', async () => {
    await obtenerSesion('R2') // puede crear, pero no gestiona precios
    const creado = await crearProducto(datos)
    expect(creado.precioVenta).toBe(0)
    expect(creado.sku).toMatch(/^MOD-/)
    expect(creado.existencias).toBe(0)
  })

  test('obtenerProducto trae el producto completo, sin costo si no hay permiso', async () => {
    await obtenerSesion('R6')
    const producto = await obtenerProducto(1)
    expect(producto).toHaveProperty('descripcion')
    expect(producto).not.toHaveProperty('precioCompra')
    await expect(obtenerProducto(9999)).rejects.toThrow('no existe')
  })

  test('actualizar cambia los datos y recalcula el estado de stock', async () => {
    await obtenerSesion('R0')
    const actualizado = await actualizarProducto(2, { nombre: 'Jeans editados', stockMinimo: 100 })
    expect(actualizado.nombre).toBe('Jeans editados')
    expect(actualizado.estadoStock).toBe('bajo')
  })
})
