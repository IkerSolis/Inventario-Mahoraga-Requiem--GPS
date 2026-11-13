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

        {import.meta.env.DEV && <Route path="/componentes" element={<ComponentesDemo />} />}
        {import.meta.env.DEV && <Route path="/codigos-prueba" element={<CodigosPrueba />} />}
        <Route path="*" element={<p>Página no encontrada.</p>} />
      </Route>
    </Routes>
  )
}
