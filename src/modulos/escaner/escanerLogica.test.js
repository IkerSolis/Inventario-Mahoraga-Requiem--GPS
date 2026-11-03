import { describe, expect, test } from 'vitest'
import { MODOS, elegirModo, esMismoProducto, modoPorTecla, modosPermitidos } from './escanerLogica.js'

// Simula usePuede() con una lista fija de permisos
const conPermisos = (lista) => (permiso) => lista.includes(permiso)

describe('modos del escáner', () => {
  test('solo aparecen los modos con permiso', () => {
    expect(modosPermitidos(conPermisos(['stock.count'])).map((m) => m.clave)).toEqual(['auditoria'])
    expect(modosPermitidos(conPermisos([]))).toEqual([])
    expect(modosPermitidos(conPermisos(['stock.receive', 'stock.issue', 'stock.count']))).toEqual(MODOS)
  })

  test('se usa el modo de la URL solo si está permitido', () => {
    const permitidos = modosPermitidos(conPermisos(['stock.receive', 'stock.count']))
    expect(elegirModo('auditoria', permitidos).clave).toBe('auditoria')
    expect(elegirModo('salida', permitidos).clave).toBe('entrada') // salida no está permitida
    expect(elegirModo(null, permitidos).clave).toBe('entrada')
    expect(elegirModo('entrada', [])).toBeNull()
  })

  test('las teclas F1, F2 y F3 eligen su modo si está permitido', () => {
    const permitidos = modosPermitidos(conPermisos(['stock.receive', 'stock.count']))
    expect(modoPorTecla('F3', permitidos).clave).toBe('auditoria')
    expect(modoPorTecla('F2', permitidos)).toBeNull()
    expect(modoPorTecla('Enter', permitidos)).toBeNull()
  })
})

describe('esMismoProducto', () => {
  const producto = { codigoBarras: '7500000000015', sku: 'MOD-1000' }

  test('reconoce el mismo producto por código de barras o SKU', () => {
    expect(esMismoProducto('7500000000015', producto)).toBe(true)
    expect(esMismoProducto(' mod-1000 ', producto)).toBe(true)
  })

  test('otro código o sin producto en pantalla no es el mismo', () => {
    expect(esMismoProducto('7500000000022', producto)).toBe(false)
    expect(esMismoProducto('7500000000015', null)).toBe(false)
  })
})
