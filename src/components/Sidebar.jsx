
import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  FolderTree,
  Tag,
  Truck,
  Users,
  Ruler,
  Package,
  ShieldCheck,
  Building2,
  Warehouse,
  BarChart3,
  Settings
} from "lucide-react";

import { useTheme } from "../context/ThemeContext";

const menuItems = [
  { name: "dashboard", path: "/", icon: LayoutDashboard },
  { name: "categories", path: "/categorias", icon: FolderTree },
  { name: "brands", path: "/marcas", icon: Tag },
  { name: "suppliers", path: "/proveedores", icon: Truck },
  { name: "clients", path: "/clientes", icon: Users },
  { name: "units", path: "/unidades", icon: Ruler },
  { name: "users", path: "/usuarios", icon: Users },
  { name: ("warehouses"),path: "/almacenes",icon: Warehouse},
  { name: "roles", path: "/roles-permisos", icon: ShieldCheck },
  { name: "company", path: "/empresa-sucursales", icon: Building2 },
  { name: "reports", path: "/reportes", icon: BarChart3 },
  { name: "settings", path: "/configuracion", icon: Settings }
];

function Sidebar() {
  const { t } = useTheme();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Package size={23} />
        </div>

        <div>
          <h2>GestiónInv</h2>
          <span>Control Profesional</span>
        </div>
      </div>

      <div className="sidebar-section">
        <span className="section-label">
          {t("mainMenu")}
        </span>

        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  isActive ? "menu-link active" : "menu-link"
                }
              >
                <Icon size={18} />
                <span>{t(item.name)}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">CR</div>

        <div>
          <strong>Carlos Ruiz</strong>
          <span>Administrador</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
