import { NavLink, Outlet } from 'react-router-dom'
import { usarMock } from './api/cliente.js'
import { ROLES } from './api/mock/sesion.js'
import { useSesion } from './auth/SesionContext.jsx'
import './Layout.css'

// shortcut: layout mínimo para navegar mis módulos; se reemplaza cuando Frontend 1 entregue sidebar y navbar
const enlaces = [
  { ruta: '/productos', texto: 'Productos', icono: 'inventory_2' },
  { ruta: '/escaner', texto: 'Escáner', icono: 'barcode_scanner' },
  { ruta: '/inventario', texto: 'Inventario', icono: 'warehouse' },
]

export default function Layout() {
  const { usuario, roles, cambiarRol } = useSesion()
  const rol = roles[0] ?? '' // clave del rol en Backend 1 ('owner', 'auditor'...); solo para el selector de prueba

  return (
    <div className="layout">
      <nav className="layout-menu" aria-label="Menú principal">
        <strong className="layout-marca">Mahoraga</strong>
        {enlaces.map((enlace) => (
          <NavLink key={enlace.ruta} to={enlace.ruta} className="layout-enlace">
            <span className="material-symbols-outlined" aria-hidden="true">
              {enlace.icono}
            </span>
            {enlace.texto}
          </NavLink>
        ))}
      </nav>

      <div className="layout-contenido">
        <header className="layout-barra">
          <span>{usuario.nombre}</span>
          {usarMock && (
            <label>
              Rol de prueba{' '}
              <select value={rol} onChange={(e) => cambiarRol(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r.clave} value={r.clave}>
                    {r.codigo} · {r.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
        </header>
        <main className="layout-principal">
          {/* key={rol}: al cambiar de rol la página se monta de nuevo y vuelve a pedir sus datos, como tras un nuevo inicio de sesión */}
          <Outlet key={rol} />
        </main>
      </div>
    </div>
  )
}
