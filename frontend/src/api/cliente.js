// Si es true, los archivos de src/api/ responden con src/api/mock/ en lugar de llamar al servidor.
export const usarMock = import.meta.env.VITE_USE_MOCK === 'true'

// Petición al backend real. La sesión viaja en una cookie HttpOnly, por eso credentials: 'include'.
// El encabezado JSON solo va cuando el cuerpo es texto; con FormData (archivos) el navegador pone el suyo.
export async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch('/api' + ruta, {
    credentials: 'include',
    headers: typeof opciones.body === 'string' ? { 'Content-Type': 'application/json' } : {},
    ...opciones,
  })
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status} en ${ruta}`)
  }
  return respuesta.json()
}
