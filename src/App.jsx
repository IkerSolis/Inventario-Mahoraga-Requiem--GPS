import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './Layout.jsx'
import ProductosPage from './modulos/productos/ProductosPage.jsx'
import EscanerPage from './modulos/escaner/EscanerPage.jsx'
import InventarioPage from './modulos/inventario/InventarioPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/productos" replace />} />
        <Route path="/productos" element={<ProductosPage />} />
        <Route path="/escaner" element={<EscanerPage />} />
        <Route path="/inventario" element={<InventarioPage />} />
        <Route path="*" element={<p>Página no encontrada.</p>} />
      </Route>
    </Routes>
  )
}
