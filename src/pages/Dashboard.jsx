
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
import { useTheme } from "../context/ThemeContext";

const catalogs = [
  {
    nameKey: "categories",
    descriptionKey: "categoriesDescription",
    icon: FolderTree,
    color: "teal",
    path: "/categorias"
  },
  {
    nameKey: "brands",
    descriptionKey: "brandsDescription",
    icon: Tag,
    color: "blue",
    path: "/marcas"
  },
  {
    nameKey: "suppliers",
    descriptionKey: "suppliersDescription",
    icon: Truck,
    color: "orange",
    path: "/proveedores"
  },
  {
    nameKey: "clients",
    descriptionKey: "clientsDescription",
    icon: Users,
    color: "purple",
    path: "/clientes"
  },
  {
    nameKey: "units",
    descriptionKey: "unitsDescription",
    icon: Ruler,
    color: "green",
    path: "/unidades"
  },
  {
    nameKey: "warehouses",
    descriptionKey: "warehousesDescription",
    icon: Warehouse,
    color: "red",
    path: "/almacenes"
  }
];

function Dashboard() {
  const { t } = useTheme();

  return (
    <div className="page-content">
      <div className="welcome-section">
        <div>
          <h1>{t("welcomeBack")}</h1>
          <p>{t("manageCatalogsIntro")}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon teal">
            <Package size={22} />
          </div>
          <span>{t("totalProducts")}</span>
          <h2>1,248</h2>
          <small>{t("productsRegistered")}</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <FolderTree size={22} />
          </div>
          <span>{t("categories")}</span>
          <h2>18</h2>
          <small>{t("categoriesRegistered")}</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <Truck size={22} />
          </div>
          <span>{t("suppliers")}</span>
          <h2>32</h2>
          <small>{t("suppliersRegistered")}</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <Users size={22} />
          </div>
          <span>{t("clients")}</span>
          <h2>156</h2>
          <small>{t("clientsRegistered")}</small>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <h2>{t("systemCatalogs")}</h2>
          <p>{t("selectCatalog")}</p>
        </div>
      </div>

      <div className="catalog-grid">
        {catalogs.map((catalog) => {
          const Icon = catalog.icon;

          return (
            <Link
              to={catalog.path}
              className="catalog-card"
              key={catalog.path}
            >
              <div className={`catalog-icon ${catalog.color}`}>
                <Icon size={24} />
              </div>

              <h3>{t(catalog.nameKey)}</h3>

              <p>{t(catalog.descriptionKey)}</p>

              <div className="catalog-action">
                {t("manage")}
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
