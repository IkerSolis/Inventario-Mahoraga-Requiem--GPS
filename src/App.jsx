import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import Marcas from "./pages/catalogos/Marcas";
import Proveedores from "./pages/catalogos/Proveedores";
import Categorias from "./pages/catalogos/Categorias";
import Clientes from "./pages/catalogos/Clientes";
import Unidades from "./pages/catalogos/Unidades";
import Almacenes from "./pages/catalogos/Almacenes";
import Usuarios from "./pages/Seguridad/Usuarios";
import RolesPermisos from "./pages/Seguridad/RolesPermisos";
import EmpresaSucursales from "./pages/Seguridad/EmpresaSucursales";
import CentroAnalitico from "./pages/reportes/CentroAnalitico";


function CatalogoPendiente({ nombre }) {
  return (
    <div className="page-content">
      <div className="welcome-section">
        <div>
          <h1>{nombre}</h1>
          <p>
            Próximamente podrás administrar este catálogo.
          </p>
        </div>
      </div>

      <div className="coming-soon">
        <h2>Módulo en desarrollo</h2>
        <p>Estamos preparando esta sección.</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />

        <div className="main-area">
          <Topbar />

          <main>
            <Routes>
  <Route path="/" element={<Dashboard />} />

  <Route path="/categorias" element={<Categorias />} />

  <Route path="/marcas" element={<Marcas />} />

  <Route path="/proveedores" element={<Proveedores />} />

  <Route path="/clientes" element={<Clientes />} />

  <Route path="/unidades" element={<Unidades />} />

  <Route path="/almacenes" element={<Almacenes />} />

  <Route path="/usuarios" element={<Usuarios />} />

  <Route path="/roles-permisos" element={<RolesPermisos />} />

  <Route path="/empresa-sucursales" element={<EmpresaSucursales />}/>

  <Route path="/reportes" element={<CentroAnalitico />} />
  
</Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;