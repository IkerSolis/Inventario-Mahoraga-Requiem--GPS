// Si es true, los archivos de src/api/ responden con src/api/mock/ en lugar de llamar al servidor.
export const usarMock = import.meta.env.VITE_USE_MOCK === 'true'

// Petición al backend real. La sesión viaja en una cookie HttpOnly, por eso credentials: 'include'.
// El encabezado JSON solo va cuando el cuerpo es texto; con FormData (archivos) el navegador pone el suyo.
// Devuelve el JSON tal como lo manda el servidor; la traducción al español está en traductores.js.
export async function pedir(ruta, opciones = {}) {
  const { headers, ...resto } = opciones
  const respuesta = await fetch('/api' + ruta, {
    credentials: 'include',
    ...resto,
    headers: { ...(typeof resto.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...headers },
  })
  if (!respuesta.ok) {
    // Formatos de error de los dos backends:
    //   Backend 2: { ok: false, error: 'texto', details? }
    //   Backend 1: { error: 'título', message: 'texto', details? }
    // Se prefiere message (en Backend 1 es el texto completo); si no, error.
    let mensaje = `Error ${respuesta.status} en ${ruta}`
    let detalles = null
    try {
      const cuerpo = await respuesta.json()
      mensaje = cuerpo.message || cuerpo.error || mensaje
      detalles = cuerpo.details ?? null
    } catch {
      // la respuesta no traía JSON
    }
    throw errorHttp(respuesta.status, mensaje, detalles)
  }
  return respuesta.json()
}

// Error con el código HTTP en .estado, para poder distinguir por ejemplo "no existe" (404).
// detalles: lo que mande el servidor sobre qué campo falló (solo informativo).
export function errorHttp(estado, mensaje, detalles = null) {
  const error = new Error(mensaje)
  error.estado = estado
  error.detalles = detalles
  return error
}

// Arma "ruta?a=1&b=2" quitando los parámetros vacíos (undefined, null o '')
export function conParametros(ruta, parametros) {
  const limpios = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') limpios.set(clave, valor)
  }
  const texto = limpios.toString()
  return texto ? `${ruta}?${texto}` : ruta
}

// Cuerpo JSON para un POST/PUT/PATCH
export function json(metodo, cuerpo) {
  return { method: metodo, body: JSON.stringify(cuerpo) }
}
