import { NavLink, Outlet } from 'react-router-dom'
import { usarMock } from './api/cliente.js'
import { ROLES } from './api/mock/sesion.js'
import { useSesion } from './auth/SesionContext.jsx'
import { usePuede } from './auth/usePuede.js'
import './Layout.css'

// shortcut: layout mínimo para navegar mis módulos; se reemplaza cuando Frontend 1 entregue sidebar y navbar
// permisos: el enlace se muestra si se tiene alguno (los mismos que pide la ruta en App.jsx)
const ENLACES = [
  { ruta: '/productos', texto: 'Productos', icono: 'inventory_2', permisos: ['products.read'] },
  {
    ruta: '/escaner',
    texto: 'Escáner',
    icono: 'barcode_scanner',
    permisos: ['stock.receive', 'stock.issue', 'stock.count'],
  },
  { ruta: '/inventario', texto: 'Inventario', icono: 'warehouse', permisos: ['stock.read'] },
]

const ENLACES_ADMIN = [
  { ruta: '/dashboard', texto: 'Dashboard', icono: 'dashboard', permisos: ['products.read', 'stock.read', 'reports.read'] },
  { ruta: '/categorias', texto: 'Catálogos', icono: 'category', permisos: ['products.read'] },
  { ruta: '/reportes', texto: 'Reportes', icono: 'bar_chart', permisos: ['reports.read'] },
  { ruta: '/usuarios', texto: 'Usuarios', icono: 'group', permisos: ['users.read'] },
  { ruta: '/roles-permisos', texto: 'Roles', icono: 'admin_panel_settings', permisos: ['roles.read'] },
  { ruta: '/empresa-sucursales', texto: 'Empresa', icono: 'business', permisos: ['settings.manage'] },
  { ruta: '/configuracion', texto: 'Configuración', icono: 'settings', permisos: ['settings.manage'] },
]

export default function Layout() {
  const { usuario, roles, cambiarRol } = useSesion()
  const puede = usePuede()
  const enlaces = ENLACES.filter((enlace) => enlace.permisos.some(puede))
  const enlacesAdmin = ENLACES_ADMIN.filter((enlace) => enlace.permisos.some(puede))
  const rol = roles[0] ?? '' // clave del rol en Backend 1 ('owner', 'auditor'...); solo para el selector de prueba

  return (
    <div className="layout">
      <div className="layout-menu">
        <nav aria-label="Menú principal">
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
        {enlacesAdmin.length > 0 && (
          <nav aria-label="Administración y análisis" style={{ marginTop: '1rem', borderTop: '1px solid var(--color-borde, #e2e8f0)', paddingTop: '0.75rem' }}>
            {enlacesAdmin.map((enlace) => (
              <NavLink key={enlace.ruta} to={enlace.ruta} className="layout-enlace">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {enlace.icono}
                </span>
                {enlace.texto}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

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
