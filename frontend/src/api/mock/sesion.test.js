import { describe, expect, test } from 'vitest'
import { PERMISOS_POR_ROL, ROLES, TODOS_LOS_PERMISOS } from './sesion.js'

describe('tabla de permisos del mock', () => {
  test('hay 30 permisos y 8 roles', () => {
    expect(TODOS_LOS_PERMISOS).toHaveLength(30)
    expect(ROLES.map((r) => r.codigo)).toEqual(Object.keys(PERMISOS_POR_ROL))
  })

  test('ningún rol tiene permisos con errores de escritura', () => {
    for (const permisos of Object.values(PERMISOS_POR_ROL)) {
      for (const permiso of permisos) {
        expect(TODOS_LOS_PERMISOS).toContain(permiso)
      }
    }
  })

  test('el auditor (R7) solo tiene permisos de lectura', () => {
    expect(PERMISOS_POR_ROL.R7.every((p) => p.endsWith('.read'))).toBe(true)
  })

  test('costos y precios están restringidos', () => {
    expect(PERMISOS_POR_ROL.R6).not.toContain('costs.read')
    expect(PERMISOS_POR_ROL.R3).not.toContain('prices.manage')
  })
})
