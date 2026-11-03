// Si es true, los archivos de src/api/ responden con src/api/mock/ en lugar de llamar al servidor.
export const usarMock = import.meta.env.VITE_USE_MOCK === 'true'

// Petición al backend real. La sesión viaja en una cookie HttpOnly, por eso credentials: 'include'.
// El encabezado JSON solo va cuando el cuerpo es texto; con FormData (archivos) el navegador pone el suyo.
// Los encabezados que mande cada función (por ejemplo Idempotency-Key) se agregan a esos.
export async function pedir(ruta, opciones = {}) {
  const { headers, ...resto } = opciones
  const respuesta = await fetch('/api' + ruta, {
    credentials: 'include',
    ...resto,
    headers: { ...(typeof resto.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...headers },
  })
  if (!respuesta.ok) {
    // Si el servidor manda un mensaje en JSON lo usamos; si no, uno genérico
    let mensaje = `Error ${respuesta.status} en ${ruta}`
    try {
      const cuerpo = await respuesta.json()
      mensaje = cuerpo.mensaje || cuerpo.message || cuerpo.error || mensaje
    } catch {
      // la respuesta no traía JSON
    }
    throw errorHttp(respuesta.status, mensaje)
  }
  return respuesta.json()
}

// Error con el código HTTP en .estado, para poder distinguir por ejemplo "no existe" (404)
export function errorHttp(estado, mensaje) {
  const error = new Error(mensaje)
  error.estado = estado
  return error
}
