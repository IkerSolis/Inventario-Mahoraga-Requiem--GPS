import { pedir, usarMock } from './cliente.js'
import * as mock from './mock/sesion.js'

// Contrato provisional (falta confirmarlo con Backend 2):
// GET /api/me → { usuario: { nombre }, rol: 'R2', permisos: ['products.read', ...] }
export function obtenerSesion(rolDePrueba) {
  if (usarMock) return mock.obtenerSesion(rolDePrueba)
  return pedir('/me')
}
