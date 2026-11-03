import { describe, expect, test } from 'vitest'
import { barrasEan13 } from './ean13.js'

describe('barrasEan13', () => {
  test('tiene 95 módulos con las guardas en su lugar', () => {
    const barras = barrasEan13('5901234123457')
    expect(barras).toHaveLength(95)
    expect(barras.slice(0, 3)).toBe('101')
    expect(barras.slice(45, 50)).toBe('01010')
    expect(barras.slice(92)).toBe('101')
  })

  test('codifica los dígitos con la tabla correcta', () => {
    // Primer dígito 5 → paridad LGGLLG. El segundo dígito (9) va con la tabla L: 0001011
    const barras = barrasEan13('5901234123457')
    expect(barras.slice(3, 10)).toBe('0001011')
    // El tercero (0) va con la tabla G: 0100111
    expect(barras.slice(10, 17)).toBe('0100111')
    // El último (7) va con la tabla R: 1000100
    expect(barras.slice(85, 92)).toBe('1000100')
  })

  test('rechaza códigos que no tienen 13 dígitos', () => {
    expect(() => barrasEan13('123')).toThrow()
  })
})
