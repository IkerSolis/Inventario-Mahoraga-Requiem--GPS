import { Outlet } from 'react-router-dom'
import { usePuede } from './usePuede.js'
import './RutaProtegida.css'

// Muestra la página solo si el usuario tiene el permiso; si no, un aviso.
// permiso: 'stock.read', o una lista para "alguno de estos": ['stock.receive', 'stock.issue'].
// Sin children sirve como ruta padre: muestra las rutas hijas con <Outlet />.
// Solo es para la UI: la autorización real la hace el servidor en cada petición.
export default function RutaProtegida({ permiso, children }) {
  const puede = usePuede()
  const requeridos = Array.isArray(permiso) ? permiso : [permiso]

  if (!requeridos.some(puede)) {
    return (
      <section>
        <h1>Sin permiso</h1>
        <p className="sin-permiso">
          Tu rol no tiene acceso a esta sección. Se necesita{' '}
          {requeridos.length > 1 ? 'alguno de estos permisos' : 'el permiso'}: {requeridos.join(', ')}.
        </p>
      </section>
    )
  }
  return children ?? <Outlet />
}
