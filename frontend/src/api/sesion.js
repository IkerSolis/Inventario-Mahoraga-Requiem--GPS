import { pedir, usarMock } from './cliente.js'
import * as mock from './mock/sesion.js'
import { aSesion } from './traductores.js'

// GET /api/auth/me (Backend 1). La sesión viaja en la cookie HttpOnly access_token.
// Devuelve { usuario, negocio, roles, permisos, esPropietario }; la UI pregunta por permisos, nunca por rol.
// claveRolDePrueba: solo lo usa el mock (selector de rol de prueba); el servidor real lo ignora.
export async function obtenerSesion(claveRolDePrueba) {
  const respuesta = usarMock ? await mock.obtenerSesion(claveRolDePrueba) : await pedir('/auth/me')
  return aSesion(respuesta)
}
