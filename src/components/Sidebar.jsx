import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderTree,
  Tag,
  Truck,
  Users,
  Ruler,
  Warehouse,
  Package
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Categorías", path: "/categorias", icon: FolderTree },
  { name: "Marcas", path: "/marcas", icon: Tag },
  { name: "Proveedores", path: "/proveedores", icon: Truck },
  { name: "Clientes", path: "/clientes", icon: Users },
  { name: "Unidades", path: "/unidades", icon: Ruler },
  { name: "Usuarios", path: "/usuarios", icon: Users }
];

function Sidebar() {
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
        <span className="section-label">MENÚ PRINCIPAL</span>

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
                <span>{item.name}</span>
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