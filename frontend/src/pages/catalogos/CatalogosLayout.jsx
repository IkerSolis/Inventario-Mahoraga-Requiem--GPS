import { NavLink, Outlet } from 'react-router-dom'
import { usePuede } from '../../auth/usePuede.js'
import '../../modulos/inventario/inventario.css'

const PESTANAS = [
  { ruta: '/categorias', texto: 'Categorías', icono: 'category', permisos: ['products.read'] },
  { ruta: '/marcas', texto: 'Marcas', icono: 'sell', permisos: ['products.read'] },
  { ruta: '/proveedores', texto: 'Proveedores', icono: 'local_shipping', permisos: ['purchases.read'] },
  { ruta: '/clientes', texto: 'Clientes', icono: 'groups', permisos: ['sales.read'] },
  { ruta: '/unidades', texto: 'Unidades', icono: 'straighten', permisos: ['products.read'] },
  { ruta: '/almacenes', texto: 'Almacenes', icono: 'warehouse', permisos: ['stock.read'] },
]

export default function CatalogosLayout() {
  const puede = usePuede()
  const visibles = PESTANAS.filter((p) => p.permisos.some(puede))

  return (
    <section>
      <h1>Catálogos</h1>
      <nav className="inventario-pestanas" aria-label="Secciones de catálogos">
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
