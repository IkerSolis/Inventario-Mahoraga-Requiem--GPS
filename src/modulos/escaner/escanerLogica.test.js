import { describe, expect, test } from 'vitest'
import { MODOS, elegirModo, modoPorTecla, modosPermitidos } from './escanerLogica.js'

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
