import { Navigate, Route, Routes } from 'react-router-dom'
import RutaProtegida from './auth/RutaProtegida.jsx'
import Layout from './Layout.jsx'
import ProductosPage from './modulos/productos/ProductosPage.jsx'
import ProductoDetallePage from './modulos/productos/ProductoDetallePage.jsx'
import EscanerPage from './modulos/escaner/EscanerPage.jsx'
import InventarioLayout from './modulos/inventario/InventarioLayout.jsx'
import ExistenciasPage from './modulos/inventario/ExistenciasPage.jsx'
import MovimientosPage from './modulos/inventario/MovimientosPage.jsx'
import KardexPage from './modulos/inventario/KardexPage.jsx'
import AjustesPage from './modulos/inventario/AjustesPage.jsx'
import CodigosPrueba from './CodigosPrueba.jsx'
import ComponentesDemo from './ComponentesDemo.jsx'
import CategoriasPage from './pages/catalogos/categorias.jsx'
import CatalogosLayout from './pages/catalogos/CatalogosLayout.jsx'
import MarcasPage from './pages/catalogos/Marcas.jsx'
import ProveedoresPage from './pages/catalogos/Proveedores.jsx'
import ClientesPage from './pages/catalogos/Clientes.jsx'
import UnidadesPage from './pages/catalogos/Unidades.jsx'
import AlmacenesPage from './pages/catalogos/Almacenes.jsx'
import UsuariosPage from './pages/Seguridad/Usuarios.jsx'
import RolesPermisosPage from './pages/Seguridad/RolesPermisos.jsx'
import EmpresaSucursalesPage from './pages/Seguridad/EmpresaSucursales.jsx'
import CentroAnaliticoPage from './pages/reportes/CentroAnalitico.jsx'
import ConfiguracionPage from './pages/configuracion/Configuracion.jsx'
import DashboardModularPage from './modulos/dashboard/DashboardModularPage.tsx'

// Cada ruta pide el permiso que necesita (los mismos que usan el menú y las pestañas para mostrarse).
// Solo oculta la UI: el servidor valida siempre.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/productos" replace />} />

        <Route element={<RutaProtegida permiso="products.read" />}>
          <Route path="/productos" element={<ProductosPage />} />
          <Route path="/productos/:id" element={<ProductoDetallePage />} />
        </Route>

        <Route
          path="/escaner"
          element={
            <RutaProtegida permiso={['stock.receive', 'stock.issue', 'stock.count']}>
              <EscanerPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/inventario"
          element={
            <RutaProtegida permiso="stock.read">
              <InventarioLayout />
            </RutaProtegida>
          }
        >
          <Route index element={<Navigate to="existencias" replace />} />
          <Route path="existencias" element={<ExistenciasPage />} />
          <Route path="movimientos" element={<MovimientosPage />} />
          <Route path="kardex" element={<KardexPage />} />
          <Route path="kardex/:productoId" element={<KardexPage />} />
          <Route
            path="ajustes"
            element={
              <RutaProtegida permiso={['stock.adjust.request', 'stock.adjust.approve']}>
                <AjustesPage />
              </RutaProtegida>
            }
          />
        </Route>

        {/* Ruta integrada de Frontend 1: Dashboard y Motor de Widgets */}
        <Route path="/dashboard" element={<DashboardModularPage />} />

        {/* Rutas integradas de Frontend 3: Catálogos, Seguridad, Reportes y Configuración */}
        <Route element={<CatalogosLayout />}>
          <Route path="/categorias" element={<RutaProtegida permiso="products.read"><CategoriasPage /></RutaProtegida>} />
          <Route path="/marcas" element={<RutaProtegida permiso="products.read"><MarcasPage /></RutaProtegida>} />
          <Route path="/proveedores" element={<RutaProtegida permiso="purchases.read"><ProveedoresPage /></RutaProtegida>} />
          <Route path="/clientes" element={<RutaProtegida permiso="sales.read"><ClientesPage /></RutaProtegida>} />
          <Route path="/unidades" element={<RutaProtegida permiso="products.read"><UnidadesPage /></RutaProtegida>} />
          <Route path="/almacenes" element={<RutaProtegida permiso="stock.read"><AlmacenesPage /></RutaProtegida>} />
        </Route>
        <Route path="/usuarios" element={<RutaProtegida permiso="users.read"><UsuariosPage /></RutaProtegida>} />
        <Route path="/roles-permisos" element={<RutaProtegida permiso="roles.read"><RolesPermisosPage /></RutaProtegida>} />
        <Route path="/empresa-sucursales" element={<RutaProtegida permiso="settings.manage"><EmpresaSucursalesPage /></RutaProtegida>} />
        <Route path="/reportes" element={<RutaProtegida permiso="reports.read"><CentroAnaliticoPage /></RutaProtegida>} />
        <Route path="/configuracion" element={<RutaProtegida permiso="settings.manage"><ConfiguracionPage /></RutaProtegida>} />

        {import.meta.env.DEV && <Route path="/componentes" element={<ComponentesDemo />} />}
        {import.meta.env.DEV && <Route path="/codigos-prueba" element={<CodigosPrueba />} />}
        <Route path="*" element={<p>Página no encontrada.</p>} />
      </Route>
    </Routes>
  )
}
