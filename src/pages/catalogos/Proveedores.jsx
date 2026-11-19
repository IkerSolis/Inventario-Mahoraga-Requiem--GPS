
import { useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Eye,
  X,
  Save,
  Truck,
  CircleCheck,
  CircleX
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const initialSuppliers = [
  {
    id: 1,
    nombre: "Distribuidora del Norte",
    contacto: "Carlos Méndez",
    telefono: "5551234567",
    correo: "ventas@norte.com",
    direccion: "Av. Principal 120",
    estado: "Activo"
  },
  {
    id: 2,
    nombre: "Comercializadora Central",
    contacto: "Laura Sánchez",
    telefono: "5559876543",
    correo: "contacto@central.com",
    direccion: "Calle Hidalgo 45",
    estado: "Activo"
  },
  {
    id: 3,
    nombre: "Suministros Industriales",
    contacto: "Pedro Ramírez",
    telefono: "5554567890",
    correo: "ventas@suministros.com",
    direccion: "Zona Industrial 23",
    estado: "Inactivo"
  },
  {
    id: 4,
    nombre: "Materiales del Valle",
    contacto: "Ana Torres",
    telefono: "5556543210",
    correo: "info@materiales.com",
    direccion: "Av. del Valle 80",
    estado: "Activo"
  }
];

const emptyForm = {
  nombre: "",
  contacto: "",
  telefono: "",
  correo: "",
  direccion: "",
  estado: "Activo"
};

function Proveedores() {
  const { t } = useTheme();

  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const translateStatus = (status) =>
    status === "Activo" ? t("active") : t("inactive");

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.nombre.toLowerCase().includes(search.toLowerCase()) ||
      supplier.contacto.toLowerCase().includes(search.toLowerCase()) ||
      supplier.correo.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "Todos" || supplier.estado === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openCreate = () => {
    setForm(emptyForm);
    setSelectedSupplier(null);
    setModalMode("create");
    setError("");
    setModalOpen(true);
  };

  const openEdit = (supplier) => {
    setForm({ ...supplier });
    setSelectedSupplier(supplier);
    setModalMode("edit");
    setError("");
    setModalOpen(true);
  };

  const openView = (supplier) => {
    setSelectedSupplier(supplier);
    setModalMode("view");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedSupplier(null);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const nombre = form.nombre.trim();

    if (!nombre) {
      setError(t("supplierNameRequired"));
      return;
    }

    const duplicate = suppliers.some(
      (supplier) =>
        supplier.nombre.toLowerCase() === nombre.toLowerCase() &&
        supplier.id !== selectedSupplier?.id
    );

    if (duplicate) {
      setError(t("supplierAlreadyExists"));
      return;
    }

    const newSupplier = {
      ...form,
      id: selectedSupplier?.id ?? Date.now(),
      nombre
    };

    if (modalMode === "edit") {
      setSuppliers((previous) =>
        previous.map((supplier) =>
          supplier.id === selectedSupplier.id ? newSupplier : supplier
        )
      );
    } else {
      setSuppliers((previous) => [...previous, newSupplier]);
    }

    closeModal();
  };

  const toggleStatus = (supplier) => {
    const newStatus =
      supplier.estado === "Activo" ? "Inactivo" : "Activo";

    setSuppliers((previous) =>
      previous.map((item) =>
        item.id === supplier.id
          ? { ...item, estado: newStatus }
          : item
      )
    );
  };

  return (
    <div className="page-content">
      <div className="welcome-section">
        <div>
          <h1>{t("suppliers")}</h1>
          <p>{t("suppliersDescription")}</p>
        </div>

        <button className="primary-button" onClick={openCreate}>
          <Plus size={18} />
          {t("newSupplier")}
        </button>
      </div>

      <div className="category-summary">
        <div className="summary-icon">
          <Truck size={24} />
        </div>

        <div>
          <span>{t("totalSuppliers")}</span>
          <h2>{suppliers.length}</h2>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <h2>{t("supplierList")}</h2>
            <p>{t("supplierListDescription")}</p>
          </div>

          <div className="category-filters">
            <div className="search-box">
              <Search size={17} />
              <input
                type="text"
                placeholder={t("searchSupplier")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Todos">{t("allStatuses")}</option>
              <option value="Activo">{t("active")}</option>
              <option value="Inactivo">{t("inactive")}</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("supplier")}</th>
                <th>{t("contact")}</th>
                <th>{t("phone")}</th>
                <th>{t("email")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>

            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td><strong>{supplier.nombre}</strong></td>
                  <td>{supplier.contacto || t("notRegistered")}</td>
                  <td>{supplier.telefono || t("notRegistered")}</td>
                  <td>{supplier.correo || t("notRegistered")}</td>

                  <td>
                    <span
                      className={
                        supplier.estado === "Activo"
                          ? "status-active"
                          : "status-inactive"
                      }
                    >
                      {translateStatus(supplier.estado)}
                    </span>
                  </td>

                  <td>
                    <div className="table-actions">
                      <button
                        title={t("viewDetails")}
                        onClick={() => openView(supplier)}
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        title={t("edit")}
                        onClick={() => openEdit(supplier)}
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        title={
                          supplier.estado === "Activo"
                            ? t("deactivate")
                            : t("activate")
                        }
                        onClick={() => toggleStatus(supplier)}
                      >
                        {supplier.estado === "Activo" ? (
                          <CircleX size={17} />
                        ) : (
                          <CircleCheck size={17} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    {t("noSuppliersFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          {t("showing")} {filteredSuppliers.length} {t("of")} {suppliers.length} {t("suppliers").toLowerCase()}
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
                    ? t("newSupplier")
                    : modalMode === "edit"
                    ? t("editSupplier")
                    : t("supplierDetails")}
                </h2>

                <p>
                  {modalMode === "view"
                    ? t("supplierViewDescription")
                    : t("supplierFormDescription")}
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
                  {selectedSupplier.nombre.charAt(0).toUpperCase()}
                </div>

                <h3>{selectedSupplier.nombre}</h3>

                <p>
                  {selectedSupplier.direccion || t("noAddressRegistered")}
                </p>

                <div className="detail-row">
                  <span>{t("contact")}</span>
                  <strong>{selectedSupplier.contacto || t("notRegistered")}</strong>
                </div>

                <div className="detail-row">
                  <span>{t("phone")}</span>
                  <strong>{selectedSupplier.telefono || t("notRegistered")}</strong>
                </div>

                <div className="detail-row">
                  <span>{t("email")}</span>
                  <strong>{selectedSupplier.correo || t("notRegistered")}</strong>
                </div>

                <div className="detail-row">
                  <span>{t("status")}</span>
                  <strong>{translateStatus(selectedSupplier.estado)}</strong>
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
                  <label>{t("supplierName")} *</label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder={t("supplierNamePlaceholder")}
                    maxLength={100}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>{t("contactPerson")}</label>
                  <input
                    name="contacto"
                    value={form.contacto}
                    onChange={handleChange}
                    placeholder={t("contactPlaceholder")}
                    maxLength={100}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("phone")}</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={form.telefono}
                      onChange={handleChange}
                      placeholder={t("phonePlaceholder")}
                      maxLength={20}
                    />
                  </div>

                  <div className="form-group">
                    <label>{t("email")}</label>
                    <input
                      type="email"
                      name="correo"
                      value={form.correo}
                      onChange={handleChange}
                      placeholder="correo@ejemplo.com"
                      maxLength={120}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>{t("address")}</label>
                  <textarea
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    placeholder={t("supplierAddressPlaceholder")}
                    rows="2"
                    maxLength={200}
                  />
                </div>

                <div className="form-group">
                  <label>{t("status")}</label>
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                  >
                    <option value="Activo">{t("active")}</option>
                    <option value="Inactivo">{t("inactive")}</option>
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
                      : t("saveSupplier")}
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

export default Proveedores;
