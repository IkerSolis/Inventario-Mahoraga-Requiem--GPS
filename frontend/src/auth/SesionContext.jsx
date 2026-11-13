import { createContext, useContext, useEffect, useState } from 'react'
import { obtenerSesion } from '../api/sesion.js'

const SesionContext = createContext(null)

// Carga GET /api/auth/me una vez y lo comparte con toda la app: { usuario, negocio, roles, permisos }.
export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(null)
  const [error, setError] = useState(null)

  // Solo para el selector de rol de prueba (mock)
  async function cargar(claveRol) {
    try {
      setSesion(await obtenerSesion(claveRol))
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    obtenerSesion()
      .then(setSesion)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <p role="alert">No se pudo cargar la sesión: {error}</p>
  if (!sesion) return <p>Cargando sesión…</p>

  // cambiarRol solo tiene efecto con el mock; el servidor real ignora el rol que mandemos
  return <SesionContext.Provider value={{ ...sesion, cambiarRol: cargar }}>{children}</SesionContext.Provider>
}

// El hook va en el mismo archivo que su contexto; por eso se permite exportar algo que no es componente
// eslint-disable-next-line react-refresh/only-export-components
export function useSesion() {
  return useContext(SesionContext)
}
