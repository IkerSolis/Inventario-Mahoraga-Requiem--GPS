import { describe, expect, test } from 'vitest'
import { erroresPorCampo, esquemaSegunPermisos, productoSchema, validarImagen } from './productoSchema.js'

// Así llegan los datos desde el formulario: todo como texto
const formularioValido = {
  nombre: '  Camiseta  ',
  descripcion: '',
  categoria: 'Playeras',
  marca: '',
  unidad: 'pieza',
  precioCompra: '100',
  precioVenta: '189.50',
  stockMinimo: '10',
  pasillo: '1',
  rack: 'A',
  gaveta: '3',
}

describe('productoSchema', () => {
  test('acepta datos válidos, recorta espacios y convierte números', () => {
    const resultado = productoSchema.safeParse(formularioValido)
    expect(resultado.success).toBe(true)
    expect(resultado.data.nombre).toBe('Camiseta')
    expect(resultado.data.precioVenta).toBe(189.5)
    expect(resultado.data.stockMinimo).toBe(10)
  })

  test('da un mensaje por campo', () => {
    const resultado = productoSchema.safeParse({
      ...formularioValido,
      nombre: '   ',
      precioVenta: '',
      precioCompra: '-5',
      stockMinimo: '2.5',
      unidad: 'tonelada',
    })
    expect(erroresPorCampo(resultado.error)).toEqual({
      nombre: 'Este campo es obligatorio',
      precioVenta: 'Escribe un número',
      precioCompra: 'No puede ser negativo',
      stockMinimo: 'Debe ser un número entero',
      unidad: 'Elige una unidad',
    })
  })

  test('el precio de venta debe ser mayor a 0', () => {
    const resultado = productoSchema.safeParse({ ...formularioValido, precioVenta: '0' })
    expect(erroresPorCampo(resultado.error)).toEqual({ precioVenta: 'Debe ser mayor a 0' })
  })
})

describe('esquemaSegunPermisos', () => {
  test('sin permisos de costo y precio, esos campos ni se validan ni se envían', () => {
    const esquema = esquemaSegunPermisos({ puedeEditarCosto: false, puedeEditarPrecio: false })
    const resultado = esquema.safeParse({ ...formularioValido, precioCompra: 'x', precioVenta: '' })
    expect(resultado.success).toBe(true)
    expect(resultado.data).not.toHaveProperty('precioCompra')
    expect(resultado.data).not.toHaveProperty('precioVenta')
  })
})

describe('validarImagen', () => {
  const MB = 1024 * 1024

  test('acepta PNG y JPG de hasta 2 MB', () => {
    expect(validarImagen({ type: 'image/png', size: 500 * 1024 })).toBeNull()
    expect(validarImagen({ type: 'image/jpeg', size: 2 * MB })).toBeNull()
  })

  test('rechaza otros formatos', () => {
    expect(validarImagen({ type: 'image/gif', size: 1000 })).toBe('Solo se aceptan imágenes PNG o JPG')
    expect(validarImagen({ type: 'application/pdf', size: 1000 })).toBe('Solo se aceptan imágenes PNG o JPG')
  })

  test('rechaza imágenes de más de 2 MB', () => {
    expect(validarImagen({ type: 'image/png', size: 2 * MB + 1 })).toBe('La imagen no puede pesar más de 2 MB')
  })
})
