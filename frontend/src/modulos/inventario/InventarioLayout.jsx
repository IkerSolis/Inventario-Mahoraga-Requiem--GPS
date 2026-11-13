import { NavLink, Outlet } from 'react-router-dom'
import { usePuede } from '../../auth/usePuede.js'
import './inventario.css'

// Pestañas del módulo de Inventario. Cada una se muestra si se tiene alguno de sus permisos
// (los mismos que pide su ruta en App.jsx).
const PESTANAS = [
  { ruta: 'existencias', texto: 'Existencias', icono: 'inventory', permisos: ['stock.read'] },
  { ruta: 'movimientos', texto: 'Movimientos', icono: 'swap_horiz', permisos: ['stock.read'] },
  { ruta: 'kardex', texto: 'Kardex', icono: 'timeline', permisos: ['stock.read'] },
  { ruta: 'ajustes', texto: 'Ajustes', icono: 'tune', permisos: ['stock.adjust.request', 'stock.adjust.approve'] },
]

export default function InventarioLayout() {
  const puede = usePuede()
  const visibles = PESTANAS.filter((p) => p.permisos.some(puede))

  return (
    <section>
      <h1>Inventario</h1>
      <nav className="inventario-pestanas" aria-label="Secciones de inventario">
        {visibles.map((p) => (
          <NavLink key={p.ruta} to={p.ruta} className="inventario-pestana">
            <span className="material-symbols-outlined" aria-hidden="true">
              {p.icono}
            </span>
            {p.texto}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </section>
  )
}
