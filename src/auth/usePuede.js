import { useSesion } from './SesionContext.jsx'

// Uso: const puede = usePuede(); if (puede('costs.read')) { ... }
// Solo sirve para ocultar o deshabilitar en la UI; el servidor valida siempre.
export function usePuede() {
  const { permisos } = useSesion()
  return (permiso) => permisos.includes(permiso)
}
