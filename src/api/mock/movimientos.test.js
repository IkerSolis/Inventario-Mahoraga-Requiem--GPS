import { describe, expect, test } from 'vitest'
import { registrarMovimiento } from './movimientos.js'
import { buscarProductoPorCodigo, digitoVerificadorEan13, obtenerProducto } from './productos.js'
import { obtenerSesion } from './sesion.js'

describe('códigos de barras del mock', () => {
  test('el dígito verificador coincide con un EAN-13 real', () => {
    // 5901234123457 es el ejemplo clásico de EAN-13 válido
    expect(digitoVerificadorEan13('590123412345')).toBe(7)
  })

  test('se puede buscar por código de barras o por SKU, sin importar mayúsculas', async () => {
    await obtenerSesion('R0')
    const producto = await obtenerProducto(1)
    expect(producto.codigoBarras).toMatch(/^750\d{10}$/)
    expect((await buscarProductoPorCodigo(producto.codigoBarras)).id).toBe(1)
    expect((await buscarProductoPorCodigo(` ${producto.sku.toLowerCase()} `)).id).toBe(1)
  })

  test('un código que no existe responde 404', async () => {
    await expect(buscarProductoPorCodigo('0000000000000')).rejects.toMatchObject({ estado: 404 })
  })
})

describe('mock de movimientos', () => {
  test('entrada suma y salida resta existencias', async () => {
    await obtenerSesion('R0')
    const antes = (await obtenerProducto(2)).existencias

    const entrada = await registrarMovimiento({ tipo: 'entrada', productoId: 2, cantidad: 10 }, 'clave-entrada')
    expect(entrada.producto.existencias).toBe(antes + 10)

    const salida = await registrarMovimiento({ tipo: 'salida', productoId: 2, cantidad: 4 }, 'clave-salida')
    expect(salida.movimiento.existenciasAntes).toBe(antes + 10)
    expect(salida.producto.existencias).toBe(antes + 6)
  })

  test('la misma clave de idempotencia no mueve el stock dos veces', async () => {
    await obtenerSesion('R0')
    const antes = (await obtenerProducto(3)).existencias
    const datos = { tipo: 'entrada', productoId: 3, cantidad: 5 }
    await registrarMovimiento(datos, 'clave-repetida')
    await registrarMovimiento(datos, 'clave-repetida')
    expect((await obtenerProducto(3)).existencias).toBe(antes + 5)
  })

  test('no se puede sacar más de lo que hay', async () => {
    await obtenerSesion('R0')
    const { existencias } = await obtenerProducto(4)
    await expect(
      registrarMovimiento({ tipo: 'salida', productoId: 4, cantidad: existencias + 1 }, 'clave-de-mas'),
    ).rejects.toMatchObject({ estado: 409 })
  })

  test('el conteo registra la diferencia pero no cambia las existencias', async () => {
    await obtenerSesion('R0')
    const { existencias } = await obtenerProducto(5)
    const { movimiento, producto } = await registrarMovimiento(
      { tipo: 'conteo', productoId: 5, cantidad: existencias - 2 },
      'clave-conteo',
    )
    expect(movimiento.diferencia).toBe(-2)
    expect(producto.existencias).toBe(existencias)
  })

  test('cada tipo exige su permiso y la cantidad debe ser válida', async () => {
    await obtenerSesion('R4') // almacenista: puede contar, pero no recibir (opcional apagado)
    await expect(registrarMovimiento({ tipo: 'entrada', productoId: 1, cantidad: 1 }, 'k1')).rejects.toMatchObject({
      estado: 403,
    })
    await expect(registrarMovimiento({ tipo: 'conteo', productoId: 1, cantidad: 2.5 }, 'k2')).rejects.toMatchObject({
      estado: 422,
    })
  })
})
