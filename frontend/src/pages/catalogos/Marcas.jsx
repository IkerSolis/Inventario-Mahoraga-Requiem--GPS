
import { useState } from "react";
import {
  Plus, Search, Pencil, Eye, X, Save, Tag, Globe, CircleCheck, CircleX
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const initialBrands = [
  {
    id: 1,
    nombre: "Samsung",
    descripcion: "Tecnología y electrónica",
    sitio: "https://www.samsung.com",
    estado: "Activa"
  },
  {
    id: 2,
    nombre: "HP",
    descripcion: "Computadoras y accesorios",
    sitio: "https://www.hp.com",
    estado: "Activa"
  },
  {
    id: 3,
    nombre: "Logitech",
    descripcion: "Periféricos y accesorios",
    sitio: "https://www.logitech.com",
    estado: "Activa"
  },
  {
    id: 4,
    nombre: "Truper",
    descripcion: "Herramientas y ferretería",
    sitio: "https://www.truper.com",
    estado: "Inactiva"
  }
];

const emptyForm = {
  nombre: "",
  descripcion: "",
  sitio: "",
  estado: "Activa"
};

function Marcas() {
  const { t } = useTheme();

  const [brands, setBrands] = useState(initialBrands);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const translateStatus = (status) =>
    status === "Activa" ? t("active") : t("inactive");

  const filteredBrands = brands.filter((brand) => {
    const matchesSearch =
      brand.nombre.toLowerCase().includes(search.toLowerCase()) ||
      brand.descripcion.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "Todas" || brand.estado === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openCreate = () => {
    setForm(emptyForm);
    setSelectedBrand(null);
    setModalMode("create");
    setError("");
    setModalOpen(true);
  };

  const openEdit = (brand) => {
    setForm({ ...brand });
    setSelectedBrand(brand);
    setModalMode("edit");
    setError("");
    setModalOpen(true);
  };

  const openView = (brand) => {
    setSelectedBrand(brand);
    setModalMode("view");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedBrand(null);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const name = form.nombre.trim();

    if (!name) {
      setError(t("brandNameRequired"));
      return;
    }

    const duplicate = brands.some(
      (brand) =>
        brand.nombre.toLowerCase() === name.toLowerCase() &&
        brand.id !== selectedBrand?.id
    );

    if (duplicate) {
      setError(t("brandAlreadyExists"));
      return;
    }

    const newBrand = {
      id: selectedBrand?.id ?? Date.now(),
      nombre: name,
      descripcion: form.descripcion.trim(),
      sitio: form.sitio.trim(),
      estado: form.estado
    };

    if (modalMode === "edit") {
      setBrands((previous) =>
        previous.map((brand) =>
          brand.id === selectedBrand.id ? newBrand : brand
        )
      );
    } else {
      setBrands((previous) => [...previous, newBrand]);
    }

    closeModal();
  };

  const toggleStatus = (brand) => {
    const newStatus =
      brand.estado === "Activa" ? "Inactiva" : "Activa";

    setBrands((previous) =>
      previous.map((item) =>
        item.id === brand.id ? { ...item, estado: newStatus } : item
      )
    );
  };

  return (
    <div className="page-content">
      <div className="welcome-section">
        <div>
          <h1>{t("brands")}</h1>
          <p>{t("brandsDescription")}</p>
        </div>

        <button className="primary-button" onClick={openCreate}>
          <Plus size={18} /> {t("newBrand")}
        </button>
      </div>

      <div className="category-summary">
        <div className="summary-icon">
          <Tag size={24} />
        </div>
        <div>
          <span>{t("totalBrands")}</span>
          <h2>{brands.length}</h2>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <h2>{t("brandList")}</h2>
            <p>{t("brandListDescription")}</p>
          </div>

          <div className="category-filters">
            <div className="search-box">
              <Search size={17} />
              <input
                type="text"
                placeholder={t("searchBrand")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Todas">{t("allStatuses")}</option>
              <option value="Activa">{t("activeBrands")}</option>
              <option value="Inactiva">{t("inactiveBrands")}</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("brand")}</th>
                <th>{t("name")}</th>
                <th>{t("description")}</th>
                <th>{t("website")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>

            <tbody>
              {filteredBrands.map((brand) => (
                <tr key={brand.id}>
                  <td>
                    <div className="brand-avatar">
                      {brand.nombre.charAt(0).toUpperCase()}
                    </div>
                  </td>

                  <td><strong>{brand.nombre}</strong></td>

                  <td>{brand.descripcion || t("noDescription")}</td>

                  <td>
                    {brand.sitio ? (
                      <a
                        className="brand-link"
                        href={brand.sitio}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Globe size={14} /> {t("visitWebsite")}
                      </a>
                    ) : (
                      t("notRegistered")
                    )}
                  </td>

                  <td>
                    <span
                      className={
                        brand.estado === "Activa"
                          ? "status-active"
                          : "status-inactive"
                      }
                    >
                      {translateStatus(brand.estado)}
                    </span>
                  </td>

                  <td>
                    <div className="table-actions">
                      <button
                        title={t("viewDetails")}
                        onClick={() => openView(brand)}
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        title={t("edit")}
                        onClick={() => openEdit(brand)}
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        title={
                          brand.estado === "Activa"
                            ? t("deactivate")
                            : t("activate")
                        }
                        onClick={() => toggleStatus(brand)}
                      >
                        {brand.estado === "Activa" ? (
                          <CircleX size={17} />
                        ) : (
                          <CircleCheck size={17} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredBrands.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    {t("noBrandsFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          {t("showing")} {filteredBrands.length} {t("of")} {brands.length} {t("brands").toLowerCase()}
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="category-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>
                  {modalMode === "create"
                    ? t("newBrand")
                    : modalMode === "edit"
                    ? t("editBrand")
                    : t("brandDetails")}
                </h2>

                <p>
                  {modalMode === "view"
                    ? t("brandViewDescription")
                    : t("brandFormDescription")}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                aria-label={t("close")}
              >
                <X size={20} />
              </button>
            </div>

            {modalMode === "view" ? (
              <div className="category-details">
                <div className="brand-avatar large-avatar">
                  {selectedBrand.nombre.charAt(0).toUpperCase()}
                </div>

                <h3>{selectedBrand.nombre}</h3>

                <p>
                  {selectedBrand.descripcion || t("noDescription")}
                </p>

                <div className="detail-row">
                  <span>{t("website")}</span>
                  <strong>
                    {selectedBrand.sitio || t("notRegistered")}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>{t("status")}</span>
                  <strong>{translateStatus(selectedBrand.estado)}</strong>
                </div>

                <button
                  className="primary-button full-button"
                  onClick={closeModal}
                >
                  {t("close")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>{t("brandName")} *</label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder={t("brandNamePlaceholder")}
                    maxLength={60}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>{t("description")}</label>
                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    placeholder={t("brandDescriptionPlaceholder")}
                    rows="3"
                    maxLength={200}
                  />
                </div>

                <div className="form-group">
                  <label>{t("website")}</label>
                  <input
                    type="url"
                    name="sitio"
                    value={form.sitio}
                    onChange={handleChange}
                    placeholder="https://www.ejemplo.com"
                  />
                </div>

                <div className="form-group">
                  <label>{t("status")}</label>
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                  >
                    <option value="Activa">{t("active")}</option>
                    <option value="Inactiva">{t("inactive")}</option>
                  </select>
                </div>

                {error && <div className="form-error">{error}</div>}

                <div className="modal-footer">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={closeModal}
                  >
                    {t("cancel")}
                  </button>

                  <button type="submit" className="primary-button">
                    <Save size={17} />
                    {modalMode === "edit"
                      ? t("saveChanges")
                      : t("saveBrand")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Marcas;
