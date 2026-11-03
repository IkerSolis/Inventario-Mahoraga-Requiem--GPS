
import { useState } from "react";
import { Plus, Search, Pencil, Eye, X, Save, Users, CircleX, CircleCheck } from "lucide-react";

const initialData = [
  { id: 1, nombre: "Juan Pérez", tipo: "Persona", telefono: "4431234567", correo: "juan@email.com", direccion: "Morelia, Michoacán", estado: "Activo" },
  { id: 2, nombre: "Comercial ABC", tipo: "Empresa", telefono: "4439876543", correo: "contacto@abc.com", direccion: "Av. Madero 120", estado: "Activo" },
  { id: 3, nombre: "María López", tipo: "Persona", telefono: "4435551234", correo: "maria@email.com", direccion: "Centro, Morelia", estado: "Inactivo" }
];

const emptyForm = { nombre: "", tipo: "Persona", telefono: "", correo: "", direccion: "", estado: "Activo" };

export default function Clientes() {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const filtered = data.filter(x =>
    `${x.nombre} ${x.correo} ${x.telefono}`.toLowerCase().includes(search.toLowerCase()) &&
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

  const change = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = e => {
    e.preventDefault();
    const nombre = form.nombre.trim();

    if (!nombre) return setError("El nombre del cliente es obligatorio.");

    if (data.some(x => x.nombre.toLowerCase() === nombre.toLowerCase() && x.id !== selected?.id))
      return setError("Este cliente ya está registrado.");

    const item = { ...form, nombre, id: selected?.id ?? Date.now() };

    setData(old => mode === "edit"
      ? old.map(x => x.id === selected.id ? item : x)
      : [...old, item]
    );
    close();
  };

  const toggle = item => setData(old => old.map(x =>
    x.id === item.id ? { ...x, estado: x.estado === "Activo" ? "Inactivo" : "Activo" } : x
  ));

  return (
    <div className="page-content">
      <div className="welcome-section">
        <div><h1>Clientes</h1><p>Administra la información de tus clientes.</p></div>
        <button className="primary-button" onClick={() => open("create")}><Plus size={18}/> Nuevo cliente</button>
      </div>

      <div className="category-summary">
        <div className="summary-icon"><Users size={24}/></div>
        <div><span>Total de clientes</span><h2>{data.length}</h2></div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div><h2>Listado de clientes</h2><p>Consulta y administra los clientes registrados.</p></div>
          <div className="category-filters">
            <div className="search-box"><Search size={17}/><input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}/></div>
            <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="Todos">Todos los estados</option><option>Activo</option><option>Inactivo</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead><tr><th>Nombre</th><th>Tipo</th><th>Teléfono</th><th>Correo</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {filtered.map(x => (
                <tr key={x.id}>
                  <td><strong>{x.nombre}</strong></td><td>{x.tipo}</td><td>{x.telefono || "No registrado"}</td><td>{x.correo || "No registrado"}</td>
                  <td><span className={x.estado === "Activo" ? "status-active" : "status-inactive"}>{x.estado}</span></td>
                  <td><div className="table-actions">
                    <button title="Ver" onClick={() => open("view", x)}><Eye size={17}/></button>
                    <button title="Editar" onClick={() => open("edit", x)}><Pencil size={17}/></button>
                    <button title="Cambiar estado" onClick={() => toggle(x)}>{x.estado === "Activo" ? <CircleX size={17}/> : <CircleCheck size={17}/>}</button>
                  </div></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="6" className="empty-state">No se encontraron clientes.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footer">Mostrando {filtered.length} de {data.length} clientes</div>
      </div>

      {modal && <div className="modal-overlay" onClick={close}>
        <div className="category-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div><h2>{mode === "create" ? "Nuevo cliente" : mode === "edit" ? "Editar cliente" : "Detalles del cliente"}</h2><p>Información del cliente.</p></div>
            <button className="modal-close" onClick={close}><X size={20}/></button>
          </div>

          {mode === "view" ? <div className="category-details">
            <h3>{selected.nombre}</h3>
            {Object.entries({ Tipo: selected.tipo, Teléfono: selected.telefono, Correo: selected.correo, Dirección: selected.direccion, Estado: selected.estado }).map(([k,v]) => <div className="detail-row" key={k}><span>{k}</span><strong>{v || "No registrado"}</strong></div>)}
            <button className="primary-button full-button" onClick={close}>Cerrar</button>
          </div> : <form onSubmit={submit}>
            <div className="form-group"><label>Nombre o razón social *</label><input name="nombre" value={form.nombre} onChange={change} placeholder="Nombre del cliente"/></div>
            <div className="form-group"><label>Tipo de cliente</label><select name="tipo" value={form.tipo} onChange={change}><option>Persona</option><option>Empresa</option></select></div>
            <div className="form-row">
              <div className="form-group"><label>Teléfono</label><input name="telefono" value={form.telefono} onChange={change} placeholder="Teléfono"/></div>
              <div className="form-group"><label>Correo</label><input type="email" name="correo" value={form.correo} onChange={change} placeholder="correo@ejemplo.com"/></div>
            </div>
            <div className="form-group"><label>Dirección</label><textarea name="direccion" value={form.direccion} onChange={change} rows="2" placeholder="Dirección del cliente"/></div>
            <div className="form-group"><label>Estado</label><select name="estado" value={form.estado} onChange={change}><option>Activo</option><option>Inactivo</option></select></div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-footer"><button type="button" className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button"><Save size={17}/> Guardar cliente</button></div>
          </form>}
        </div>
      </div>}
    </div>
  );
}
