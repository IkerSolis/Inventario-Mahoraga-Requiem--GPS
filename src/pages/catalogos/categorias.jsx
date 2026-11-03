
import { useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Eye,
  FolderTree,
  X,
  Save,
  Folder,
  Package,
  Wrench,
  ShoppingBag,
  Laptop,
  CircleCheck,
  CircleX
} from "lucide-react";

const iconOptions = {
  folder: Folder,
  package: Package,
  tools: Wrench,
  shopping: ShoppingBag,
  laptop: Laptop
};

const initialCategories = [
  {
    id: 1,
    nombre: "Electrónica",
    descripcion: "Productos electrónicos",
    padre: "",
    color: "#0F8B7D",
    icono: "laptop",
    estado: "Activa"
  },
  {
    id: 2,
    nombre: "Accesorios",
    descripcion: "Accesorios tecnológicos",
    padre: 1,
    color: "#3B82F6",
    icono: "package",
    estado: "Activa"
  },
  {
    id: 3,
    nombre: "Herramientas",
    descripcion: "Herramientas de trabajo",
    padre: "",
    color: "#E99A32",
    icono: "tools",
    estado: "Activa"
  },
  {
    id: 4,
    nombre: "Papelería",
    descripcion: "Artículos de oficina",
    padre: "",
    color: "#8B5CF6",
    icono: "folder",
    estado: "Activa"
  }
];

const emptyForm = {
  nombre: "",
  descripcion: "",
  padre: "",
  color: "#0F8B7D",
  icono: "folder",
  estado: "Activa"
};

function Categorias() {
  const [categories, setCategories] = useState(initialCategories);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todas");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const getParentName = (parentId) => {
    if (!parentId) return "Principal";

    return categories.find((cat) => cat.id === Number(parentId))?.nombre
      || "Principal";
  };

  const filteredCategories = categories.filter((category) => {
    const text = search.toLowerCase();

    const matchesSearch =
      category.nombre.toLowerCase().includes(text) ||
      category.descripcion.toLowerCase().includes(text) ||
      getParentName(category.padre).toLowerCase().includes(text);

    const matchesStatus =
      statusFilter === "Todas" || category.estado === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openCreate = () => {
    setForm(emptyForm);
    setSelectedCategory(null);
    setModalMode("create");
    setError("");
    setModalOpen(true);
  };

  const openEdit = (category) => {
    setForm({
      ...category,
      padre: category.padre ? String(category.padre) : ""
    });

    setSelectedCategory(category);
    setModalMode("edit");
    setError("");
    setModalOpen(true);
  };

  const openView = (category) => {
    setSelectedCategory(category);
    setModalMode("view");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedCategory(null);
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
      setError("El nombre de la categoría es obligatorio.");
      return;
    }

    const duplicate = categories.some(
      (cat) =>
        cat.nombre.toLowerCase() === name.toLowerCase() &&
        cat.id !== selectedCategory?.id
    );

    if (duplicate) {
      setError("Ya existe una categoría con ese nombre.");
      return;
    }

    if (
      selectedCategory &&
      Number(form.padre) === selectedCategory.id
    ) {
      setError("Una categoría no puede ser su propia categoría padre.");
      return;
    }

    const newCategory = {
      id: selectedCategory?.id ?? Date.now(),
      nombre: name,
      descripcion: form.descripcion.trim(),
      padre: form.padre ? Number(form.padre) : "",
      color: form.color,
      icono: form.icono,
      estado: form.estado
    };

    if (modalMode === "edit") {
      setCategories((previous) =>
        previous.map((cat) =>
          cat.id === selectedCategory.id ? newCategory : cat
        )
      );
    } else {
      setCategories((previous) => [...previous, newCategory]);
    }

    closeModal();
  };

  const toggleStatus = (category) => {
    const newStatus =
      category.estado === "Activa" ? "Inactiva" : "Activa";

    setCategories((previous) =>
      previous.map((cat) =>
        cat.id === category.id
          ? { ...cat, estado: newStatus }
          : cat
      )
    );
  };

  return (
    <div className="page-content">
      <div className="welcome-section">
        <div>
          <h1>Categorías</h1>
          <p>
            Organiza tus productos mediante categorías y subcategorías.
          </p>
        </div>

        <button className="primary-button" onClick={openCreate}>
          <Plus size={18} />
          Nueva categoría
        </button>
      </div>

      <div className="category-summary">
        <div className="summary-icon">
          <FolderTree size={24} />
        </div>

        <div>
          <span>Total de categorías</span>
          <h2>{categories.length}</h2>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <h2>Listado de categorías</h2>
            <p>Administra las categorías de tus productos.</p>
          </div>

          <div className="category-filters">
            <div className="search-box">
              <Search size={17} />

              <input
                type="text"
                placeholder="Buscar categoría..."
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
                <th>Icono</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Categoría padre</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredCategories.map((category) => {
                const Icon = iconOptions[category.icono] || Folder;

                return (
                  <tr key={category.id}>
                    <td>
                      <span
                        className="category-icon"
                        style={{
                          backgroundColor: `${category.color}20`,
                          color: category.color
                        }}
                      >
                        <Icon size={17} />
                      </span>
                    </td>

                    <td>
                      <strong>{category.nombre}</strong>
                    </td>

                    <td>{category.descripcion || "Sin descripción"}</td>

                    <td>{getParentName(category.padre)}</td>

                    <td>
                      <span
                        className={
                          category.estado === "Activa"
                            ? "status-active"
                            : "status-inactive"
                        }
                      >
                        {category.estado}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          title="Ver detalles"
                          onClick={() => openView(category)}
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          title="Editar"
                          onClick={() => openEdit(category)}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          title={
                            category.estado === "Activa"
                              ? "Desactivar"
                              : "Activar"
                          }
                          onClick={() => toggleStatus(category)}
                        >
                          {category.estado === "Activa" ? (
                            <CircleX size={17} />
                          ) : (
                            <CircleCheck size={17} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No se encontraron categorías.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          Mostrando {filteredCategories.length} de {categories.length} categorías
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
                    ? "Nueva categoría"
                    : modalMode === "edit"
                    ? "Editar categoría"
                    : "Detalles de categoría"}
                </h2>

                <p>
                  {modalMode === "view"
                    ? "Consulta la información registrada."
                    : "Completa la información de la categoría."}
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
                <div
                  className="detail-icon"
                  style={{
                    backgroundColor: `${selectedCategory.color}20`,
                    color: selectedCategory.color
                  }}
                >
                  {(() => {
                    const Icon =
                      iconOptions[selectedCategory.icono] || Folder;
                    return <Icon size={30} />;
                  })()}
                </div>

                <h3>{selectedCategory.nombre}</h3>

                <p>
                  {selectedCategory.descripcion || "Sin descripción"}
                </p>

                <div className="detail-row">
                  <span>Categoría padre</span>
                  <strong>{getParentName(selectedCategory.padre)}</strong>
                </div>

                <div className="detail-row">
                  <span>Estado</span>
                  <strong>{selectedCategory.estado}</strong>
                </div>

                <div className="detail-row">
                  <span>Color</span>
                  <span
                    className="category-color"
                    style={{
                      backgroundColor: selectedCategory.color
                    }}
                  />
                </div>

                <button className="primary-button full-button" onClick={closeModal}>
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Nombre de la categoría *</label>

                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Ej. Electrónica"
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
                    placeholder="Describe esta categoría..."
                    rows="3"
                    maxLength={200}
                  />
                </div>

                <div className="form-group">
                  <label>Categoría padre</label>

                  <select
                    name="padre"
                    value={form.padre}
                    onChange={handleChange}
                  >
                    <option value="">Ninguna (categoría principal)</option>

                    {categories
                      .filter(
                        (cat) => cat.id !== selectedCategory?.id
                      )
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Color</label>

                    <div className="color-input">
                      <input
                        type="color"
                        name="color"
                        value={form.color}
                        onChange={handleChange}
                      />

                      <span>{form.color.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Icono</label>

                    <select
                      name="icono"
                      value={form.icono}
                      onChange={handleChange}
                    >
                      <option value="folder">Carpeta</option>
                      <option value="package">Paquete</option>
                      <option value="tools">Herramientas</option>
                      <option value="shopping">Compras</option>
                      <option value="laptop">Electrónica</option>
                    </select>
                  </div>
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
                    {modalMode === "edit" ? "Guardar cambios" : "Guardar categoría"}
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

export default Categorias;
