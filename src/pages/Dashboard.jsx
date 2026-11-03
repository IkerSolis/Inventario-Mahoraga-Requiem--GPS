import {
  Package,
  FolderTree,
  Tag,
  Truck,
  Users,
  Ruler,
  Warehouse,
  ArrowRight
} from "lucide-react";

import { Link } from "react-router-dom";

const catalogs = [
  {
    name: "Categorías",
    description: "Organiza tus productos por categorías.",
    icon: FolderTree,
    color: "teal",
    path: "/categorias"
  },
  {
    name: "Marcas",
    description: "Administra las marcas de tus productos.",
    icon: Tag,
    color: "blue",
    path: "/marcas"
  },
  {
    name: "Proveedores",
    description: "Consulta y organiza tus proveedores.",
    icon: Truck,
    color: "orange",
    path: "/proveedores"
  },
  {
    name: "Clientes",
    description: "Gestiona la información de tus clientes.",
    icon: Users,
    color: "purple",
    path: "/clientes"
  },
  {
    name: "Unidades",
    description: "Administra unidades de medida.",
    icon: Ruler,
    color: "green",
    path: "/unidades"
  },
  {
    name: "Almacenes",
    description: "Organiza almacenes y ubicaciones.",
    icon: Warehouse,
    color: "red",
    path: "/almacenes"
  }
];

function Dashboard() {
  return (
    <div className="page-content">
      <div className="welcome-section">
        <div>
          <h1>¡Bienvenido de nuevo!</h1>
          <p>
            Administra los catálogos de tu negocio
            desde un solo lugar.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon teal">
            <Package size={22} />
          </div>
          <span>Total de productos</span>
          <h2>1,248</h2>
          <small>Productos registrados</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <FolderTree size={22} />
          </div>
          <span>Categorías</span>
          <h2>18</h2>
          <small>Categorías registradas</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <Truck size={22} />
          </div>
          <span>Proveedores</span>
          <h2>32</h2>
          <small>Proveedores registrados</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <Users size={22} />
          </div>
          <span>Clientes</span>
          <h2>156</h2>
          <small>Clientes registrados</small>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <h2>Catálogos del sistema</h2>
          <p>Selecciona el catálogo que deseas administrar.</p>
        </div>
      </div>

      <div className="catalog-grid">
        {catalogs.map((catalog) => {
          const Icon = catalog.icon;

          return (
            <Link
              to={catalog.path}
              className="catalog-card"
              key={catalog.name}
            >
              <div className={`catalog-icon ${catalog.color}`}>
                <Icon size={24} />
              </div>

              <h3>{catalog.name}</h3>

              <p>{catalog.description}</p>

              <div className="catalog-action">
                Administrar
                <ArrowRight size={16} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default Dashboard;