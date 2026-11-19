
import { useLocation } from "react-router-dom";
import { Search, Bell } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const pageTitleKeys = {
  "/": "dashboard",
  "/categorias": "categories",
  "/marcas": "brands",
  "/proveedores": "suppliers",
  "/clientes": "clients",
  "/unidades": "units",
  "/almacenes": "warehouses",
  "/usuarios": "users",
  "/roles-permisos": "roles",
  "/empresa-sucursales": "company",
  "/reportes": "reports",
  "/configuracion": "settings"
};

function Topbar() {
  const location = useLocation();
  const { t } = useTheme();

  const title = t(pageTitleKeys[location.pathname] || "catalogs");

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
            placeholder={t("search")}
          />
        </div>

        <button
          className="notification-button"
          aria-label={t("notifications")}
        >
          <Bell size={19} />
          <span className="notification-dot"></span>
        </button>

        <div className="business-info">
          <strong>Comercial del Valle</strong>
          <span>{t("adminPanel")}</span>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
