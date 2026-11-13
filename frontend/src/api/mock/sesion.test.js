import { describe, expect, test } from 'vitest'
import { PERMISOS_POR_ROL, ROLES, TODOS_LOS_PERMISOS, obtenerSesion, tienePermiso, usuarioActual } from './sesion.js'

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

describe('GET /auth/me simulado', () => {
  test('responde con la forma de Backend 1', async () => {
    const respuesta = await obtenerSesion('warehouse_operator')
    expect(respuesta.user).toMatchObject({
      id: 5,
      business_id: 1,
      status: 'active',
      is_owner: false,
      roles: ['warehouse_operator'],
      permissions: PERMISOS_POR_ROL.R4,
    })
    expect(respuesta.business).toMatchObject({ id: 1, name: expect.any(String) })
  })

  test('el rol elegido define los permisos y el usuario que ven los otros mocks', async () => {
    await obtenerSesion('auditor')
    expect(tienePermiso('products.read')).toBe(true)
    expect(tienePermiso('products.update')).toBe(false)
    expect(usuarioActual()).toBe(8)

    const propietario = await obtenerSesion('owner')
    expect(propietario.user.is_owner).toBe(true)
    expect(usuarioActual()).toBe(1)
  })
})
