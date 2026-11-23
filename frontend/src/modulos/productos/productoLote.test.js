import { describe, expect, test } from 'vitest'
import { resumirLote } from './productoLote.js'

const textos = { uno: 'se archivó', participio: 'archivado' }
const ok = { status: 'fulfilled' }
const falla = (mensaje) => ({ status: 'rejected', reason: new Error(mensaje) })
const productos = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, nombre: `Producto ${i + 1}` }))

describe('resumirLote', () => {
  test('un solo producto: usa su nombre', () => {
    expect(resumirLote(productos(1), [ok], textos)).toEqual({ tipo: 'exito', texto: 'Producto 1 se archivó.' })
  })

  test('varios productos: cuenta cuántos', () => {
    expect(resumirLote(productos(3), [ok, ok, ok], textos)).toEqual({ tipo: 'exito', texto: '3 productos archivados.' })
  })

  test('si algunos fallan, avisa cuántos y por qué', () => {
    expect(resumirLote(productos(3), [ok, falla('Sin permiso'), ok], textos)).toEqual({
      tipo: 'alerta',
      texto: '2 productos archivados. 1 no se pudo: Sin permiso',
    })
    expect(resumirLote(productos(3), [ok, falla('Sin permiso'), falla('Sin permiso')], textos).texto).toBe(
      '1 producto archivado. 2 no se pudieron: Sin permiso',
    )
  })

  test('si todos fallan, es un error', () => {
    expect(resumirLote(productos(2), [falla('Sin red'), falla('Sin red')], textos)).toEqual({
      tipo: 'error',
      texto: 'No se pudo completar: Sin red',
    })
  })
})
