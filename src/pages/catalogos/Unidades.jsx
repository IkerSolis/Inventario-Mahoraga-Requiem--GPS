
import { useState } from "react";
import { Plus, Search, Pencil, Eye, X, Save, Ruler, CircleX, CircleCheck } from "lucide-react";

const initialData = [
  { id: 1, nombre: "Pieza", abreviatura: "pz", tipo: "Cantidad", descripcion: "Unidad individual", estado: "Activa" },
  { id: 2, nombre: "Kilogramo", abreviatura: "kg", tipo: "Masa", descripcion: "Medida de peso", estado: "Activa" },
  { id: 3, nombre: "Litro", abreviatura: "L", tipo: "Volumen", descripcion: "Medida de líquidos", estado: "Activa" },
  { id: 4, nombre: "Metro", abreviatura: "m", tipo: "Longitud", descripcion: "Medida de distancia", estado: "Inactiva" }
];

const emptyForm = { nombre: "", abreviatura: "", tipo: "Cantidad", descripcion: "", estado: "Activa" };

export default function Unidades() {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todas");
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const filtered = data.filter(x =>
    `${x.nombre} ${x.abreviatura} ${x.tipo}`.toLowerCase().includes(search.toLowerCase()) &&
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
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = e => {
    e.preventDefault();
    const nombre = form.nombre.trim();
    const abreviatura = form.abreviatura.trim();

    if (!nombre || !abreviatura) return setError("Nombre y abreviatura son obligatorios.");

    if (data.some(x => x.abreviatura.toLowerCase() === abreviatura.toLowerCase() && x.id !== selected?.id))
      return setError("Esta abreviatura ya está registrada.");

    const item = { ...form, nombre, abreviatura, id: selected?.id ?? Date.now() };

    setData(old => mode === "edit"
      ? old.map(x => x.id === selected.id ? item : x)
      : [...old, item]
    );
    close();
  };

  const toggle = item => setData(old => old.map(x =>
    x.id === item.id ? { ...x, estado: x.estado === "Activa" ? "Inactiva" : "Activa" } : x
  ));

  return (
    <div className="page-content">
      <div className="welcome-section">
        <div><h1>Unidades</h1><p>Administra las unidades de medida de tus productos.</p></div>
        <button className="primary-button" onClick={() => open("create")}><Plus size={18}/> Nueva unidad</button>
      </div>

      <div className="category-summary"><div className="summary-icon"><Ruler size={24}/></div><div><span>Total de unidades</span><h2>{data.length}</h2></div></div>

      <div className="table-container">
        <div className="table-toolbar">
          <div><h2>Listado de unidades</h2><p>Gestiona las unidades disponibles en el inventario.</p></div>
          <div className="category-filters">
            <div className="search-box"><Search size={17}/><input placeholder="Buscar unidad..." value={search} onChange={e => setSearch(e.target.value)}/></div>
            <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}><option value="Todas">Todos los estados</option><option>Activa</option><option>Inactiva</option></select>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead><tr><th>Nombre</th><th>Abreviatura</th><th>Tipo</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {filtered.map(x => <tr key={x.id}>
                <td><strong>{x.nombre}</strong></td><td>{x.abreviatura}</td><td>{x.tipo}</td><td>{x.descripcion}</td>
                <td><span className={x.estado === "Activa" ? "status-active" : "status-inactive"}>{x.estado}</span></td>
                <td><div className="table-actions">
                  <button title="Ver" onClick={() => open("view", x)}><Eye size={17}/></button>
                  <button title="Editar" onClick={() => open("edit", x)}><Pencil size={17}/></button>
                  <button title="Cambiar estado" onClick={() => toggle(x)}>{x.estado === "Activa" ? <CircleX size={17}/> : <CircleCheck size={17}/>}</button>
                </div></td>
              </tr>)}
              {filtered.length === 0 && <tr><td colSpan="6" className="empty-state">No se encontraron unidades.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footer">Mostrando {filtered.length} de {data.length} unidades</div>
      </div>

      {modal && <div className="modal-overlay" onClick={close}>
        <div className="category-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><div><h2>{mode === "create" ? "Nueva unidad" : mode === "edit" ? "Editar unidad" : "Detalles de unidad"}</h2><p>Información de la unidad de medida.</p></div><button className="modal-close" onClick={close}><X size={20}/></button></div>

          {mode === "view" ? <div className="category-details">
            <h3>{selected.nombre}</h3>
            {Object.entries({ Abreviatura: selected.abreviatura, Tipo: selected.tipo, Descripción: selected.descripcion, Estado: selected.estado }).map(([k,v]) => <div className="detail-row" key={k}><span>{k}</span><strong>{v}</strong></div>)}
            <button className="primary-button full-button" onClick={close}>Cerrar</button>
          </div> : <form onSubmit={submit}>
            <div className="form-group"><label>Nombre de unidad *</label><input name="nombre" value={form.nombre} onChange={change} placeholder="Ej. Kilogramo"/></div>
            <div className="form-group"><label>Abreviatura *</label><input name="abreviatura" value={form.abreviatura} onChange={change} placeholder="Ej. kg"/></div>
            <div className="form-group"><label>Tipo de unidad</label><select name="tipo" value={form.tipo} onChange={change}><option>Cantidad</option><option>Masa</option><option>Volumen</option><option>Longitud</option><option>Tiempo</option></select></div>
            <div className="form-group"><label>Descripción</label><textarea name="descripcion" value={form.descripcion} onChange={change} rows="2" placeholder="Descripción de la unidad"/></div>
            <div className="form-group"><label>Estado</label><select name="estado" value={form.estado} onChange={change}><option>Activa</option><option>Inactiva</option></select></div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-footer"><button type="button" className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button"><Save size={17}/> Guardar unidad</button></div>
          </form>}
        </div>
      </div>}
    </div>
  );
}
