
import { useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Eye,
  X,
  Save,
  Users,
  CircleX,
  CircleCheck
} from "lucide-react";

import { useTheme } from "../../context/ThemeContext";

const initialData = [
  {
    id: 1,
    nombre: "Juan Pérez",
    tipo: "Persona",
    telefono: "4431234567",
    correo: "juan@email.com",
    direccion: "Morelia, Michoacán",
    estado: "Activo"
  },
  {
    id: 2,
    nombre: "Comercial ABC",
    tipo: "Empresa",
    telefono: "4439876543",
    correo: "contacto@abc.com",
    direccion: "Av. Madero 120",
    estado: "Activo"
  },
  {
    id: 3,
    nombre: "María López",
    tipo: "Persona",
    telefono: "4435551234",
    correo: "maria@email.com",
    direccion: "Centro, Morelia",
    estado: "Inactivo"
  }
];

const emptyForm = {
  nombre: "",
  tipo: "Persona",
  telefono: "",
  correo: "",
  direccion: "",
  estado: "Activo"
};

export default function Clientes() {
  const { t } = useTheme();

  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const filtered = data.filter((x) =>
    `${x.nombre} ${x.correo} ${x.telefono}`
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

    if (!nombre) {
      return setError(t("clientNameRequired"));
    }

    if (
      data.some(
        (x) =>
          x.nombre.toLowerCase() === nombre.toLowerCase() &&
          x.id !== selected?.id
      )
    ) {
      return setError(t("clientDuplicate"));
    }

    const item = {
      ...form,
      nombre,
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

  const translateStatus = (status) =>
    status === "Activo" ? t("active") : t("inactive");

  const translateType = (type) =>
    type === "Persona" ? t("person") : t("companyType");

  return (
    <div className="page-content">
      <div className="welcome-section">
        <div>
          <h1>{t("clients")}</h1>
          <p>{t("clientsPageDescription")}</p>
        </div>

        <button
          className="primary-button"
          onClick={() => open("create")}
        >
          <Plus size={18} />
          {t("newClient")}
        </button>
      </div>

      <div className="category-summary">
        <div className="summary-icon">
          <Users size={24} />
        </div>

        <div>
          <span>{t("totalClients")}</span>
          <h2>{data.length}</h2>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <h2>{t("clientList")}</h2>
            <p>{t("manageRegisteredClients")}</p>
          </div>

          <div className="category-filters">
            <div className="search-box">
              <Search size={17} />

              <input
                placeholder={t("searchClient")}
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
              <option value="Activo">{t("activePlural")}</option>
              <option value="Inactivo">{t("inactivePlural")}</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("type")}</th>
                <th>{t("phone")}</th>
                <th>{t("email")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>{x.nombre}</strong>
                  </td>

                  <td>{translateType(x.tipo)}</td>

                  <td>{x.telefono || t("notRegistered")}</td>

                  <td>{x.correo || t("notRegistered")}</td>

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
                      <button
                        title={t("view")}
                        onClick={() => open("view", x)}
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        title={t("edit")}
                        onClick={() => open("edit", x)}
                      >
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
                  <td colSpan="6" className="empty-state">
                    {t("noClientsFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          {t("showing")} {filtered.length} {t("of")} {data.length}{" "}
          {t("clientsLower")}
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
                    ? t("newClient")
                    : mode === "edit"
                    ? t("editClient")
                    : t("clientDetails")}
                </h2>

                <p>{t("clientInformation")}</p>
              </div>

              <button
                className="modal-close"
                onClick={close}
                aria-label={t("close")}
              >
                <X size={20} />
              </button>
            </div>

            {mode === "view" ? (
              <div className="category-details">
                <h3>{selected.nombre}</h3>

                {[
                  [t("type"), translateType(selected.tipo)],
                  [t("phone"), selected.telefono],
                  [t("email"), selected.correo],
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
                  <label>{t("clientNameRequiredLabel")}</label>

                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={change}
                    placeholder={t("clientNamePlaceholder")}
                  />
                </div>

                <div className="form-group">
                  <label>{t("clientType")}</label>

                  <select
                    name="tipo"
                    value={form.tipo}
                    onChange={change}
                  >
                    <option value="Persona">{t("person")}</option>
                    <option value="Empresa">{t("companyType")}</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("phone")}</label>

                    <input
                      name="telefono"
                      value={form.telefono}
                      onChange={change}
                      placeholder={t("phonePlaceholder")}
                    />
                  </div>

                  <div className="form-group">
                    <label>{t("email")}</label>

                    <input
                      type="email"
                      name="correo"
                      value={form.correo}
                      onChange={change}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>{t("address")}</label>

                  <textarea
                    name="direccion"
                    value={form.direccion}
                    onChange={change}
                    rows="2"
                    placeholder={t("clientAddressPlaceholder")}
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

                  <button type="submit" className="primary-button">
                    <Save size={17} />
                    {t("saveClient")}
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
