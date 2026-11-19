
import { useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Eye,
  X,
  Save,
  Ruler,
  CircleX,
  CircleCheck
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const initialData = [
  { id: 1, nombre: "Pieza", abreviatura: "pz", tipo: "Cantidad", descripcion: "Unidad individual", estado: "Activa" },
  { id: 2, nombre: "Kilogramo", abreviatura: "kg", tipo: "Masa", descripcion: "Medida de peso", estado: "Activa" },
  { id: 3, nombre: "Litro", abreviatura: "L", tipo: "Volumen", descripcion: "Medida de líquidos", estado: "Activa" },
  { id: 4, nombre: "Metro", abreviatura: "m", tipo: "Longitud", descripcion: "Medida de distancia", estado: "Inactiva" }
];

const emptyForm = {
  nombre: "",
  abreviatura: "",
  tipo: "Cantidad",
  descripcion: "",
  estado: "Activa"
};

export default function Unidades() {
  const { t } = useTheme();

  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todas");
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const translateStatus = (status) =>
    status === "Activa" ? t("active") : t("inactive");

  const translateUnitType = (type) => {
    const types = {
      Cantidad: t("quantity"),
      Masa: t("mass"),
      Volumen: t("volume"),
      Longitud: t("length"),
      Tiempo: t("time")
    };

    return types[type] || type;
  };

  const filtered = data.filter((x) =>
    `${x.nombre} ${x.abreviatura} ${x.tipo}`
      .toLowerCase()
      .includes(search.toLowerCase()) &&
    (filter === "Todas" || x.estado === filter)
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
    const abreviatura = form.abreviatura.trim();

    if (!nombre || !abreviatura) {
      return setError(t("unitRequired"));
    }

    if (
      data.some(
        (x) =>
          x.abreviatura.toLowerCase() === abreviatura.toLowerCase() &&
          x.id !== selected?.id
      )
    ) {
      return setError(t("unitAbbreviationExists"));
    }

    const item = {
      ...form,
      nombre,
      abreviatura,
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
              estado: x.estado === "Activa" ? "Inactiva" : "Activa"
            }
          : x
      )
    );

  return (
    <div className="page-content">
      <div className="welcome-section">
        <div>
          <h1>{t("unitsOfMeasure")}</h1>
          <p>{t("unitsDescription")}</p>
        </div>

        <button className="primary-button" onClick={() => open("create")}>
          <Plus size={18} /> {t("newUnit")}
        </button>
      </div>

      <div className="category-summary">
        <div className="summary-icon">
          <Ruler size={24} />
        </div>
        <div>
          <span>{t("totalUnits")}</span>
          <h2>{data.length}</h2>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <h2>{t("unitList")}</h2>
            <p>{t("unitListDescription")}</p>
          </div>

          <div className="category-filters">
            <div className="search-box">
              <Search size={17} />
              <input
                placeholder={t("searchUnit")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="Todas">{t("allStatuses")}</option>
              <option value="Activa">{t("active")}</option>
              <option value="Inactiva">{t("inactive")}</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("abbreviation")}</th>
                <th>{t("unitType")}</th>
                <th>{t("description")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((x) => (
                <tr key={x.id}>
                  <td><strong>{x.nombre}</strong></td>
                  <td>{x.abreviatura}</td>
                  <td>{translateUnitType(x.tipo)}</td>
                  <td>{x.descripcion || t("noDescription")}</td>

                  <td>
                    <span
                      className={
                        x.estado === "Activa"
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
                        {x.estado === "Activa" ? (
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
                  <td colSpan="6" className="empty-state">
                    {t("noUnitsFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          {t("showing")} {filtered.length} {t("of")} {data.length} {t("unitsOfMeasure").toLowerCase()}
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
                    ? t("newUnit")
                    : mode === "edit"
                    ? t("editUnit")
                    : t("unitDetails")}
                </h2>
                <p>{t("unitModalDescription")}</p>
              </div>

              <button className="modal-close" onClick={close}>
                <X size={20} />
              </button>
            </div>

            {mode === "view" ? (
              <div className="category-details">
                <h3>{selected.nombre}</h3>

                {[
                  [t("abbreviation"), selected.abreviatura],
                  [t("unitType"), translateUnitType(selected.tipo)],
                  [t("description"), selected.descripcion],
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
                  <label>{t("unitName")} *</label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={change}
                    placeholder={t("unitNamePlaceholder")}
                  />
                </div>

                <div className="form-group">
                  <label>{t("abbreviation")} *</label>
                  <input
                    name="abreviatura"
                    value={form.abreviatura}
                    onChange={change}
                    placeholder="Ej. kg"
                  />
                </div>

                <div className="form-group">
                  <label>{t("unitType")}</label>
                  <select
                    name="tipo"
                    value={form.tipo}
                    onChange={change}
                  >
                    <option value="Cantidad">{t("quantity")}</option>
                    <option value="Masa">{t("mass")}</option>
                    <option value="Volumen">{t("volume")}</option>
                    <option value="Longitud">{t("length")}</option>
                    <option value="Tiempo">{t("time")}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t("description")}</label>
                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={change}
                    rows="2"
                    placeholder={t("unitDescriptionPlaceholder")}
                  />
                </div>

                <div className="form-group">
                  <label>{t("status")}</label>
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={change}
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
                    onClick={close}
                  >
                    {t("cancel")}
                  </button>
                  <button className="primary-button">
                    <Save size={17} /> {t("saveUnit")}
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
