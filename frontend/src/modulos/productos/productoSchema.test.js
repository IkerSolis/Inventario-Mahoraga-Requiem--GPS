import { describe, expect, test } from 'vitest'
import { erroresPorCampo, esquemaSegunPermisos, productoSchema, validarImagen } from './productoSchema.js'

// Así llegan los datos desde el formulario: todo como texto
const formularioValido = {
  sku: ' MOD-0049 ',
  codigoBarras: '',
  nombre: '  Camiseta  ',
  descripcion: '',
  categoriaId: '1',
  unidad: 'pieza',
  precioCompra: '100',
  precioVenta: '189.50',
}

describe('productoSchema', () => {
  test('acepta datos válidos, recorta espacios y convierte números', () => {
    const resultado = productoSchema.safeParse(formularioValido)
    expect(resultado.success).toBe(true)
    expect(resultado.data.sku).toBe('MOD-0049')
    expect(resultado.data.nombre).toBe('Camiseta')
    expect(resultado.data.categoriaId).toBe(1)
    expect(resultado.data.precioVenta).toBe(189.5)
  })

  test('da un mensaje por campo', () => {
    const resultado = productoSchema.safeParse({
      ...formularioValido,
      sku: 'M',
      nombre: '   ',
      categoriaId: '',
      precioVenta: '',
      precioCompra: '-5',
      unidad: 'tonelada',
    })
    expect(erroresPorCampo(resultado.error)).toEqual({
      sku: 'Mínimo 2 caracteres',
      nombre: 'Mínimo 2 caracteres',
      categoriaId: 'Elige una categoría',
      precioVenta: 'Escribe un número',
      precioCompra: 'No puede ser negativo',
      unidad: 'Elige una unidad',
    })
  })

  test('el precio de venta debe ser mayor a 0', () => {
    const resultado = productoSchema.safeParse({ ...formularioValido, precioVenta: '0' })
    expect(erroresPorCampo(resultado.error)).toEqual({ precioVenta: 'Debe ser mayor a 0' })
  })

  test('ya no pide stock mínimo, ubicación ni marca (son por bodega o no existen en el backend)', () => {
    const resultado = productoSchema.safeParse({ ...formularioValido, pasillo: '1', marca: 'Norte', stockMinimo: '5' })
    expect(resultado.success).toBe(true)
    expect(resultado.data).not.toHaveProperty('pasillo')
    expect(resultado.data).not.toHaveProperty('marca')
    expect(resultado.data).not.toHaveProperty('stockMinimo')
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

  test('acepta PNG y JPG de hasta 5 MB', () => {
    expect(validarImagen({ type: 'image/png', size: 500 * 1024 })).toBeNull()
    expect(validarImagen({ type: 'image/jpeg', size: 5 * MB })).toBeNull()
  })

  test('rechaza otros formatos', () => {
    expect(validarImagen({ type: 'image/gif', size: 1000 })).toBe('Solo se aceptan imágenes PNG o JPG')
    expect(validarImagen({ type: 'application/pdf', size: 1000 })).toBe('Solo se aceptan imágenes PNG o JPG')
  })

  test('rechaza imágenes de más de 5 MB', () => {
    expect(validarImagen({ type: 'image/png', size: 5 * MB + 1 })).toBe('La imagen no puede pesar más de 5 MB')
  })
})
