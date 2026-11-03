
import { useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Eye,
  X,
  Save,
  Tag,
  Globe,
  CircleCheck,
  CircleX
} from "lucide-react";

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
  const [brands, setBrands] = useState(initialBrands);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todas");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

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

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const name = form.nombre.trim();

    if (!name) {
      setError("El nombre de la marca es obligatorio.");
      return;
    }

    const duplicate = brands.some(
      (brand) =>
        brand.nombre.toLowerCase() === name.toLowerCase() &&
        brand.id !== selectedBrand?.id
    );

    if (duplicate) {
      setError("Esta marca ya se encuentra registrada.");
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
        item.id === brand.id
          ? { ...item, estado: newStatus }
          : item
      )
    );
  };

  return (
    <div className="page-content">
      <div className="welcome-section">
        <div>
          <h1>Marcas</h1>
          <p>
            Administra las marcas asociadas a los productos de tu negocio.
          </p>
        </div>

        <button className="primary-button" onClick={openCreate}>
          <Plus size={18} />
          Nueva marca
        </button>
      </div>

      <div className="category-summary">
        <div className="summary-icon">
          <Tag size={24} />
        </div>

        <div>
          <span>Total de marcas</span>
          <h2>{brands.length}</h2>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <h2>Listado de marcas</h2>
            <p>Consulta y administra las marcas registradas.</p>
          </div>

          <div className="category-filters">
            <div className="search-box">
              <Search size={17} />
              <input
                type="text"
                placeholder="Buscar marca..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Todas">Todos los estados</option>
              <option value="Activa">Activas</option>
              <option value="Inactiva">Inactivas</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Marca</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Sitio web</th>
                <th>Estado</th>
                <th>Acciones</th>
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

                  <td>
                    <strong>{brand.nombre}</strong>
                  </td>

                  <td>{brand.descripcion || "Sin descripción"}</td>

                  <td>
                    {brand.sitio ? (
                      <a
                        className="brand-link"
                        href={brand.sitio}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Globe size={14} />
                        Visitar sitio
                      </a>
                    ) : (
                      "No registrado"
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
                      {brand.estado}
                    </span>
                  </td>

                  <td>
                    <div className="table-actions">
                      <button
                        title="Ver detalles"
                        onClick={() => openView(brand)}
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        title="Editar"
                        onClick={() => openEdit(brand)}
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        title={
                          brand.estado === "Activa"
                            ? "Desactivar"
                            : "Activar"
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
                    No se encontraron marcas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          Mostrando {filteredBrands.length} de {brands.length} marcas
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
                    ? "Nueva marca"
                    : modalMode === "edit"
                    ? "Editar marca"
                    : "Detalles de marca"}
                </h2>

                <p>
                  {modalMode === "view"
                    ? "Consulta la información de esta marca."
                    : "Completa los datos de la marca."}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                aria-label="Cerrar"
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
                  {selectedBrand.descripcion || "Sin descripción"}
                </p>

                <div className="detail-row">
                  <span>Sitio web</span>
                  <strong>
                    {selectedBrand.sitio || "No registrado"}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>Estado</span>
                  <strong>{selectedBrand.estado}</strong>
                </div>

                <button
                  className="primary-button full-button"
                  onClick={closeModal}
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Nombre de la marca *</label>

                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Ej. Samsung"
                    maxLength={60}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>Descripción</label>

                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    placeholder="Describe los productos de esta marca..."
                    rows="3"
                    maxLength={200}
                  />
                </div>

                <div className="form-group">
                  <label>Sitio web</label>

                  <input
                    type="url"
                    name="sitio"
                    value={form.sitio}
                    onChange={handleChange}
                    placeholder="https://www.ejemplo.com"
                  />
                </div>

                <div className="form-group">
                  <label>Estado</label>

                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                  >
                    <option value="Activa">Activa</option>
                    <option value="Inactiva">Inactiva</option>
                  </select>
                </div>

                {error && (
                  <div className="form-error">{error}</div>
                )}

                <div className="modal-footer">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={closeModal}
                  >
                    Cancelar
                  </button>

                  <button type="submit" className="primary-button">
                    <Save size={17} />
                    {modalMode === "edit"
                      ? "Guardar cambios"
                      : "Guardar marca"}
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
