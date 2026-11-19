
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

import { useTheme } from "../../context/ThemeContext";

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
  const { t } = useTheme();

  const [categories, setCategories] = useState(initialCategories);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todas");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const getParentName = (parentId) => {
    if (!parentId) return t("mainCategory");

    return (
      categories.find((cat) => cat.id === Number(parentId))?.nombre ||
      t("mainCategory")
    );
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
      setError(t("categoryNameRequired"));
      return;
    }

    const duplicate = categories.some(
      (cat) =>
        cat.nombre.toLowerCase() === name.toLowerCase() &&
        cat.id !== selectedCategory?.id
    );

    if (duplicate) {
      setError(t("categoryDuplicate"));
      return;
    }

    if (
      selectedCategory &&
      Number(form.padre) === selectedCategory.id
    ) {
      setError(t("categoryCannotBeOwnParent"));
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

  const translateStatus = (status) => {
    return status === "Activa" ? t("active") : t("inactive");
  };

  const translateIcon = (icon) => {
    const labels = {
      folder: "folder",
      package: "package",
      tools: "tools",
      shopping: "shopping",
      laptop: "electronics"
    };

    return t(labels[icon] || "folder");
  };

  return (
    <div className="page-content">
      <div className="welcome-section">
        <div>
          <h1>{t("categories")}</h1>
          <p>{t("categoriesPageDescription")}</p>
        </div>

        <button className="primary-button" onClick={openCreate}>
          <Plus size={18} />
          {t("newCategory")}
        </button>
      </div>

      <div className="category-summary">
        <div className="summary-icon">
          <FolderTree size={24} />
        </div>

        <div>
          <span>{t("totalCategories")}</span>
          <h2>{categories.length}</h2>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <h2>{t("categoryList")}</h2>
            <p>{t("manageProductCategories")}</p>
          </div>

          <div className="category-filters">
            <div className="search-box">
              <Search size={17} />

              <input
                type="text"
                placeholder={t("searchCategory")}
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
              <option value="Activa">{t("activePlural")}</option>
              <option value="Inactiva">{t("inactivePlural")}</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("icon")}</th>
                <th>{t("name")}</th>
                <th>{t("description")}</th>
                <th>{t("parentCategory")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
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

                    <td>
                      {category.descripcion || t("noDescription")}
                    </td>

                    <td>{getParentName(category.padre)}</td>

                    <td>
                      <span
                        className={
                          category.estado === "Activa"
                            ? "status-active"
                            : "status-inactive"
                        }
                      >
                        {translateStatus(category.estado)}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          title={t("viewDetails")}
                          onClick={() => openView(category)}
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          title={t("edit")}
                          onClick={() => openEdit(category)}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          title={
                            category.estado === "Activa"
                              ? t("deactivate")
                              : t("activate")
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
                    {t("noCategoriesFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          {t("showing")} {filteredCategories.length} {t("of")}{" "}
          {categories.length} {t("categoriesLower")}
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
                    ? t("newCategory")
                    : modalMode === "edit"
                    ? t("editCategory")
                    : t("categoryDetails")}
                </h2>

                <p>
                  {modalMode === "view"
                    ? t("viewCategoryInfo")
                    : t("completeCategoryInfo")}
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
                  {selectedCategory.descripcion || t("noDescription")}
                </p>

                <div className="detail-row">
                  <span>{t("parentCategory")}</span>
                  <strong>{getParentName(selectedCategory.padre)}</strong>
                </div>

                <div className="detail-row">
                  <span>{t("status")}</span>
                  <strong>
                    {translateStatus(selectedCategory.estado)}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>{t("color")}</span>
                  <span
                    className="category-color"
                    style={{
                      backgroundColor: selectedCategory.color
                    }}
                  />
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
                  <label>{t("categoryNameRequiredLabel")}</label>

                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder={t("categoryNamePlaceholder")}
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
                    placeholder={t("categoryDescriptionPlaceholder")}
                    rows="3"
                    maxLength={200}
                  />
                </div>

                <div className="form-group">
                  <label>{t("parentCategory")}</label>

                  <select
                    name="padre"
                    value={form.padre}
                    onChange={handleChange}
                  >
                    <option value="">
                      {t("noneMainCategory")}
                    </option>

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
                    <label>{t("color")}</label>

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
                    <label>{t("icon")}</label>

                    <select
                      name="icono"
                      value={form.icono}
                      onChange={handleChange}
                    >
                      {Object.keys(iconOptions).map((icon) => (
                        <option key={icon} value={icon}>
                          {translateIcon(icon)}
                        </option>
                      ))}
                    </select>
                  </div>
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

                {error && (
                  <div className="form-error">{error}</div>
                )}

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
                      : t("saveCategory")}
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
