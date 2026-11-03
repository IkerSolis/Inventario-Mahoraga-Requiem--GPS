import { useLocation } from "react-router-dom";
import { Search, Bell } from "lucide-react";

const pageTitles = {
  "/": "Dashboard",
  "/categorias": "Categorías",
  "/marcas": "Marcas",
  "/proveedores": "Proveedores",
  "/clientes": "Clientes",
  "/unidades": "Unidades",
  "/almacenes": "Almacenes"
};

function Topbar() {
  const location = useLocation();

  const title = pageTitles[location.pathname] || "Catálogos";

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>GestiónInv</span>
        <span>/</span>
        <strong>{title}</strong>
      </div>

      <div className="topbar-actions">
        <div className="global-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar..."
          />
        </div>

        <button className="notification-button" aria-label="Notificaciones">
          <Bell size={19} />
          <span className="notification-dot"></span>
        </button>

        <div className="business-info">
          <strong>Comercial del Valle</strong>
          <span>Panel administrativo</span>
        </div>
      </div>
    </header>
  );
}

export default Topbar;