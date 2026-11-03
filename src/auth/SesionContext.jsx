import { createContext, useContext, useEffect, useState } from 'react'
import { obtenerSesion } from '../api/sesion.js'

const SesionContext = createContext(null)

// Carga GET /api/me una vez y lo comparte con toda la app.
export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(null)
  const [error, setError] = useState(null)

  async function cargar(rolDePrueba) {
    try {
      setSesion(await obtenerSesion(rolDePrueba))
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  if (error) return <p role="alert">No se pudo cargar la sesión: {error}</p>
  if (!sesion) return <p>Cargando sesión…</p>

  // cambiarRol solo tiene efecto con el mock; el servidor real ignora el rol que mandemos
  return (
    <SesionContext.Provider value={{ ...sesion, cambiarRol: cargar }}>
      {children}
    </SesionContext.Provider>
  )
}

export function useSesion() {
  return useContext(SesionContext)
}
