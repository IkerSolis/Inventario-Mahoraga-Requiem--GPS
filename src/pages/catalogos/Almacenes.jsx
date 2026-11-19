
import { useState } from "react";
import {
  Plus, Search, Pencil, Eye, X, Save, Warehouse, CircleX, CircleCheck
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const initialData = [
  { id: 1, nombre: "Almacén principal", codigo: "ALM-001", responsable: "Carlos Méndez", ubicacion: "Planta baja", capacidad: "1000", direccion: "Av. Principal 120", estado: "Activo" },
  { id: 2, nombre: "Almacén secundario", codigo: "ALM-002", responsable: "Laura Sánchez", ubicacion: "Planta alta", capacidad: "500", direccion: "Calle Hidalgo 45", estado: "Activo" },
  { id: 3, nombre: "Bodega externa", codigo: "ALM-003", responsable: "Pedro Ramírez", ubicacion: "Zona industrial", capacidad: "300", direccion: "Carretera nacional km 5", estado: "Inactivo" }
];

const emptyForm = {
  nombre: "", codigo: "", responsable: "", ubicacion: "",
  capacidad: "", direccion: "", estado: "Activo"
};

export default function Almacenes() {
  const { t } = useTheme();

  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const translateStatus = (status) =>
    status === "Activo" ? t("active") : t("inactive");

  const filtered = data.filter((x) =>
    `${x.nombre} ${x.codigo} ${x.responsable}`
      .toLowerCase()
      .includes(search.toLowerCase()) &&
    (filter === "Todos" || x.estado === filter)
  );

  const open = (type, item = null) => {
    setMode(type);
    setSelected(item);
    setForm(item ? { ...item } : emptyForm);
    setError("");
    setModal(true);
  };

  const close = () => setModal(false);

  const change = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();

    const nombre = form.nombre.trim();
    const codigo = form.codigo.trim();

    if (!nombre || !codigo) {
      return setError(t("warehouseRequired"));
    }

    if (
      data.some(
        (x) =>
          x.codigo.toLowerCase() === codigo.toLowerCase() &&
          x.id !== selected?.id
      )
    ) {
      return setError(t("warehouseCodeExists"));
    }

    const item = {
      ...form,
      nombre,
      codigo,
      id: selected?.id ?? Date.now()
    };

    setData((old) =>
      mode === "edit"
        ? old.map((x) => (x.id === selected.id ? item : x))
        : [...old, item]
    );

    close();
  };

  const toggle = (item) =>
    setData((old) =>
      old.map((x) =>
        x.id === item.id
          ? {
              ...x,
              estado: x.estado === "Activo" ? "Inactivo" : "Activo"
            }
          : x
      )
    );

  return (
    <div className="page-content">
      <div className="welcome-section">
        <div>
          <h1>{t("warehouses")}</h1>
          <p>{t("warehousesDescription")}</p>
        </div>

        <button className="primary-button" onClick={() => open("create")}>
          <Plus size={18} /> {t("newWarehouse")}
        </button>
      </div>

      <div className="category-summary">
        <div className="summary-icon">
          <Warehouse size={24} />
        </div>
        <div>
          <span>{t("totalWarehouses")}</span>
          <h2>{data.length}</h2>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <h2>{t("warehouseList")}</h2>
            <p>{t("warehouseListDescription")}</p>
          </div>

          <div className="category-filters">
            <div className="search-box">
              <Search size={17} />
              <input
                placeholder={t("searchWarehouse")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
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
                <th>{t("name")}</th>
                <th>{t("code")}</th>
                <th>{t("manager")}</th>
                <th>{t("location")}</th>
                <th>{t("capacity")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((x) => (
                <tr key={x.id}>
                  <td><strong>{x.nombre}</strong></td>
                  <td>{x.codigo}</td>
                  <td>{x.responsable || t("notAssigned")}</td>
                  <td>{x.ubicacion || t("notRegistered")}</td>
                  <td>
                    {x.capacidad
                      ? `${x.capacidad} ${t("units")}`
                      : t("notDefined")}
                  </td>
                  <td>
                    <span
                      className={
                        x.estado === "Activo"
                          ? "status-active"
                          : "status-inactive"
                      }
                    >
                      {translateStatus(x.estado)}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button title={t("view")} onClick={() => open("view", x)}>
                        <Eye size={17} />
                      </button>
                      <button title={t("edit")} onClick={() => open("edit", x)}>
                        <Pencil size={17} />
                      </button>
                      <button
                        title={t("changeStatus")}
                        onClick={() => toggle(x)}
                      >
                        {x.estado === "Activo" ? (
                          <CircleX size={17} />
                        ) : (
                          <CircleCheck size={17} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-state">
                    {t("noWarehousesFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          {t("showing")} {filtered.length} {t("of")} {data.length} {t("warehouses").toLowerCase()}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={close}>
          <div
            className="category-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>
                  {mode === "create"
                    ? t("newWarehouse")
                    : mode === "edit"
                    ? t("editWarehouse")
                    : t("warehouseDetails")}
                </h2>
                <p>{t("warehouseModalDescription")}</p>
              </div>
              <button className="modal-close" onClick={close}>
                <X size={20} />
              </button>
            </div>

            {mode === "view" ? (
              <div className="category-details">
                <h3>{selected.nombre}</h3>

                {[
                  [t("code"), selected.codigo],
                  [t("manager"), selected.responsable],
                  [t("location"), selected.ubicacion],
                  [t("capacity"), selected.capacidad ? `${selected.capacidad} ${t("units")}` : ""],
                  [t("address"), selected.direccion],
                  [t("status"), translateStatus(selected.estado)]
                ].map(([key, value]) => (
                  <div className="detail-row" key={key}>
                    <span>{key}</span>
                    <strong>{value || t("notRegistered")}</strong>
                  </div>
                ))}

                <button
                  className="primary-button full-button"
                  onClick={close}
                >
                  {t("close")}
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="form-group">
                  <label>{t("warehouseName")} *</label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={change}
                    placeholder={t("warehouseNamePlaceholder")}
                  />
                </div>

                <div className="form-group">
                  <label>{t("code")} *</label>
                  <input
                    name="codigo"
                    value={form.codigo}
                    onChange={change}
                    placeholder="Ej. ALM-001"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("manager")}</label>
                    <input
                      name="responsable"
                      value={form.responsable}
                      onChange={change}
                      placeholder={t("managerPlaceholder")}
                    />
                  </div>

                  <div className="form-group">
                    <label>{t("locationZone")}</label>
                    <input
                      name="ubicacion"
                      value={form.ubicacion}
                      onChange={change}
                      placeholder={t("locationPlaceholder")}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>{t("maximumCapacity")}</label>
                  <input
                    type="number"
                    min="0"
                    name="capacidad"
                    value={form.capacidad}
                    onChange={change}
                    placeholder="Ej. 1000"
                  />
                </div>

                <div className="form-group">
                  <label>{t("address")}</label>
                  <textarea
                    name="direccion"
                    value={form.direccion}
                    onChange={change}
                    rows="2"
                    placeholder={t("warehouseAddressPlaceholder")}
                  />
                </div>

                <div className="form-group">
                  <label>{t("status")}</label>
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={change}
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
                    onClick={close}
                  >
                    {t("cancel")}
                  </button>
                  <button className="primary-button">
                    <Save size={17} /> {t("saveWarehouse")}
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
