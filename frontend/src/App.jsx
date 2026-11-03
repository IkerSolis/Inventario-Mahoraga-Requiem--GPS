import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './Layout.jsx'
import ProductosPage from './modulos/productos/ProductosPage.jsx'
import ProductoDetallePage from './modulos/productos/ProductoDetallePage.jsx'
import EscanerPage from './modulos/escaner/EscanerPage.jsx'
import InventarioPage from './modulos/inventario/InventarioPage.jsx'
import CodigosPrueba from './CodigosPrueba.jsx'
import ComponentesDemo from './ComponentesDemo.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/productos" replace />} />
        <Route path="/productos" element={<ProductosPage />} />
        <Route path="/productos/:id" element={<ProductoDetallePage />} />
        <Route path="/escaner" element={<EscanerPage />} />
        <Route path="/inventario" element={<InventarioPage />} />
        {import.meta.env.DEV && <Route path="/componentes" element={<ComponentesDemo />} />}
        {import.meta.env.DEV && <Route path="/codigos-prueba" element={<CodigosPrueba />} />}
        <Route path="*" element={<p>Página no encontrada.</p>} />
      </Route>
    </Routes>
  )
}
