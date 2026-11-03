
import { useState } from "react";
import { Plus, Search, Pencil, Eye, X, Save, Warehouse, CircleX, CircleCheck } from "lucide-react";

const initialData = [
  { id: 1, nombre: "Almacén principal", codigo: "ALM-001", responsable: "Carlos Méndez", ubicacion: "Planta baja", capacidad: "1000", direccion: "Av. Principal 120", estado: "Activo" },
  { id: 2, nombre: "Almacén secundario", codigo: "ALM-002", responsable: "Laura Sánchez", ubicacion: "Planta alta", capacidad: "500", direccion: "Calle Hidalgo 45", estado: "Activo" },
  { id: 3, nombre: "Bodega externa", codigo: "ALM-003", responsable: "Pedro Ramírez", ubicacion: "Zona industrial", capacidad: "300", direccion: "Carretera nacional km 5", estado: "Inactivo" }
];

const emptyForm = { nombre: "", codigo: "", responsable: "", ubicacion: "", capacidad: "", direccion: "", estado: "Activo" };

export default function Almacenes() {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const filtered = data.filter(x =>
    `${x.nombre} ${x.codigo} ${x.responsable}`.toLowerCase().includes(search.toLowerCase()) &&
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
    const codigo = form.codigo.trim();

    if (!nombre || !codigo) return setError("El nombre y código son obligatorios.");

    if (data.some(x => x.codigo.toLowerCase() === codigo.toLowerCase() && x.id !== selected?.id))
      return setError("Este código de almacén ya existe.");

    const item = { ...form, nombre, codigo, id: selected?.id ?? Date.now() };

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
        <div><h1>Almacenes</h1><p>Administra los espacios de almacenamiento de tu negocio.</p></div>
        <button className="primary-button" onClick={() => open("create")}><Plus size={18}/> Nuevo almacén</button>
      </div>

      <div className="category-summary"><div className="summary-icon"><Warehouse size={24}/></div><div><span>Total de almacenes</span><h2>{data.length}</h2></div></div>

      <div className="table-container">
        <div className="table-toolbar">
          <div><h2>Listado de almacenes</h2><p>Consulta y administra tus ubicaciones de almacenamiento.</p></div>
          <div className="category-filters">
            <div className="search-box"><Search size={17}/><input placeholder="Buscar almacén..." value={search} onChange={e => setSearch(e.target.value)}/></div>
            <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}><option value="Todos">Todos los estados</option><option>Activo</option><option>Inactivo</option></select>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead><tr><th>Nombre</th><th>Código</th><th>Responsable</th><th>Ubicación</th><th>Capacidad</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {filtered.map(x => <tr key={x.id}>
                <td><strong>{x.nombre}</strong></td><td>{x.codigo}</td><td>{x.responsable || "No asignado"}</td><td>{x.ubicacion || "No registrada"}</td><td>{x.capacidad ? `${x.capacidad} unidades` : "No definida"}</td>
                <td><span className={x.estado === "Activo" ? "status-active" : "status-inactive"}>{x.estado}</span></td>
                <td><div className="table-actions">
                  <button title="Ver" onClick={() => open("view", x)}><Eye size={17}/></button>
                  <button title="Editar" onClick={() => open("edit", x)}><Pencil size={17}/></button>
                  <button title="Cambiar estado" onClick={() => toggle(x)}>{x.estado === "Activo" ? <CircleX size={17}/> : <CircleCheck size={17}/>}</button>
                </div></td>
              </tr>)}
              {filtered.length === 0 && <tr><td colSpan="7" className="empty-state">No se encontraron almacenes.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footer">Mostrando {filtered.length} de {data.length} almacenes</div>
      </div>

      {modal && <div className="modal-overlay" onClick={close}>
        <div className="category-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><div><h2>{mode === "create" ? "Nuevo almacén" : mode === "edit" ? "Editar almacén" : "Detalles del almacén"}</h2><p>Información del espacio de almacenamiento.</p></div><button className="modal-close" onClick={close}><X size={20}/></button></div>

          {mode === "view" ? <div className="category-details">
            <h3>{selected.nombre}</h3>
            {Object.entries({ Código: selected.codigo, Responsable: selected.responsable, Ubicación: selected.ubicacion, Capacidad: selected.capacidad, Dirección: selected.direccion, Estado: selected.estado }).map(([k,v]) => <div className="detail-row" key={k}><span>{k}</span><strong>{v || "No registrado"}</strong></div>)}
            <button className="primary-button full-button" onClick={close}>Cerrar</button>
          </div> : <form onSubmit={submit}>
            <div className="form-group"><label>Nombre del almacén *</label><input name="nombre" value={form.nombre} onChange={change} placeholder="Ej. Almacén principal"/></div>
            <div className="form-group"><label>Código *</label><input name="codigo" value={form.codigo} onChange={change} placeholder="Ej. ALM-001"/></div>
            <div className="form-row">
              <div className="form-group"><label>Responsable</label><input name="responsable" value={form.responsable} onChange={change} placeholder="Nombre"/></div>
              <div className="form-group"><label>Ubicación / Zona</label><input name="ubicacion" value={form.ubicacion} onChange={change} placeholder="Ej. Planta baja"/></div>
            </div>
            <div className="form-group"><label>Capacidad máxima (unidades)</label><input type="number" min="0" name="capacidad" value={form.capacidad} onChange={change} placeholder="Ej. 1000"/></div>
            <div className="form-group"><label>Dirección</label><textarea name="direccion" value={form.direccion} onChange={change} rows="2" placeholder="Dirección del almacén"/></div>
            <div className="form-group"><label>Estado</label><select name="estado" value={form.estado} onChange={change}><option>Activo</option><option>Inactivo</option></select></div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-footer"><button type="button" className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button"><Save size={17}/> Guardar almacén</button></div>
          </form>}
        </div>
      </div>}
    </div>
  );
}
