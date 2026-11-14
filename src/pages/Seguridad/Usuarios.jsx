
import { useMemo, useState } from "react";
import {
  Plus, Search, Users, UserCheck, UserX, Mail,
  Pencil, Eye, X, Save, Shield, Monitor,
  Smartphone, LogOut, CircleCheck, Clock,
  Ban, Send
} from "lucide-react";

const usuariosIniciales = [
  {
    id: 1,
    nombre: "Carlos Hernández",
    correo: "carlos@empresa.com",
    rol: "R1",
    sucursal: "Matriz",
    estado: "Activo",
    sesiones: [
      { id: 1, dispositivo: "Windows · Chrome", ubicacion: "Matriz", tipo: "desktop" },
      { id: 2, dispositivo: "Android · Chrome", ubicacion: "Remoto", tipo: "mobile" },
    ],
  },
  {
    id: 2,
    nombre: "María González",
    correo: "maria@empresa.com",
    rol: "R2",
    sucursal: "Sucursal Norte",
    estado: "Activo",
    sesiones: [
      { id: 3, dispositivo: "Windows · Edge", ubicacion: "Sucursal Norte", tipo: "desktop" },
    ],
  },
  {
    id: 3,
    nombre: "Luis Martínez",
    correo: "luis@empresa.com",
    rol: "R3",
    sucursal: "Matriz",
    estado: "Activo",
    sesiones: [],
  },
  {
    id: 4,
    nombre: "Ana Rodríguez",
    correo: "ana@empresa.com",
    rol: "R4",
    sucursal: "Sucursal Sur",
    estado: "Pendiente",
    sesiones: [],
  },
  {
    id: 5,
    nombre: "Pedro Sánchez",
    correo: "pedro@empresa.com",
    rol: "R2",
    sucursal: "Matriz",
    estado: "Desactivado",
    sesiones: [],
  },
];

const formularioVacio = {
  nombre: "",
  correo: "",
  rol: "R7",
  sucursal: "Matriz",
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState(usuariosIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [modal, setModal] = useState("");
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [error, setError] = useState("");

  const filtrados = useMemo(() => {
    return usuarios.filter((usuario) => {
      const coincideTexto =
        usuario.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        usuario.correo.toLowerCase().includes(busqueda.toLowerCase());

      const coincideEstado =
        filtroEstado === "Todos" || usuario.estado === filtroEstado;

      return coincideTexto && coincideEstado;
    });
  }, [usuarios, busqueda, filtroEstado]);

  const activos = usuarios.filter((u) => u.estado === "Activo").length;
  const pendientes = usuarios.filter((u) => u.estado === "Pendiente").length;
  const desactivados = usuarios.filter((u) => u.estado === "Desactivado").length;

  const abrirNuevo = () => {
    setFormulario(formularioVacio);
    setError("");
    setUsuarioSeleccionado(null);
    setModal("nuevo");
  };

  const abrirEdicion = (usuario) => {
    setFormulario({
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      sucursal: usuario.sucursal,
    });
    setUsuarioSeleccionado(usuario);
    setError("");
    setModal("editar");
  };

  const guardarUsuario = (e) => {
    e.preventDefault();

    const correo = formulario.correo.trim().toLowerCase();

    if (usuarios.some((u) =>
      u.correo.toLowerCase() === correo &&
      u.id !== usuarioSeleccionado?.id
    )) {
      setError("Ya existe un usuario con ese correo.");
      return;
    }

    if (modal === "nuevo") {
      const nuevo = {
        ...formulario,
        id: Date.now(),
        nombre: formulario.nombre.trim(),
        correo,
        estado: "Pendiente",
        sesiones: [],
      };

      setUsuarios((actuales) => [...actuales, nuevo]);
    } else {
      setUsuarios((actuales) =>
        actuales.map((u) =>
          u.id === usuarioSeleccionado.id
            ? { ...u, ...formulario, correo }
            : u
        )
      );
    }

    setModal("");
    setError("");
  };

  const cambiarEstado = (usuario) => {
    const nuevoEstado =
      usuario.estado === "Desactivado" ? "Activo" : "Desactivado";

    setUsuarios((actuales) =>
      actuales.map((u) =>
        u.id === usuario.id
          ? { ...u, estado: nuevoEstado, sesiones: nuevoEstado === "Desactivado" ? [] : u.sesiones }
          : u
      )
    );

    setModal("");
  };

  const abrirDetalle = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModal("detalle");
  };

  const abrirSesiones = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModal("sesiones");
  };

  const cerrarSesion = (sesionId) => {
    setUsuarios((actuales) =>
      actuales.map((u) =>
        u.id === usuarioSeleccionado.id
          ? { ...u, sesiones: u.sesiones.filter((s) => s.id !== sesionId) }
          : u
      )
    );

    setUsuarioSeleccionado((actual) => ({
      ...actual,
      sesiones: actual.sesiones.filter((s) => s.id !== sesionId),
    }));
  };

  const estadoClase = (estado) => {
    if (estado === "Activo") return "status-active";
    if (estado === "Desactivado") return "status-inactive";
    return "status-pending";
  };

  return (
    <div className="page-content">
      <section className="welcome-section">
        <div>
          <h1>Gestión de usuarios</h1>
          <p>Administra las cuentas, invitaciones y sesiones del sistema.</p>
        </div>
        <button className="primary-button" onClick={abrirNuevo}>
          <Plus size={18} /> Invitar usuario
        </button>
      </section>

      <section className="users-summary">
        <article className="users-summary-card">
          <div className="users-summary-icon"><Users /></div>
          <div><span>Total de usuarios</span><strong>{usuarios.length}</strong></div>
        </article>
        <article className="users-summary-card">
          <div className="users-summary-icon"><UserCheck /></div>
          <div><span>Activos</span><strong>{activos}</strong></div>
        </article>
        <article className="users-summary-card">
          <div className="users-summary-icon"><Clock /></div>
          <div><span>Invitaciones pendientes</span><strong>{pendientes}</strong></div>
        </article>
        <article className="users-summary-card">
          <div className="users-summary-icon"><UserX /></div>
          <div><span>Desactivados</span><strong>{desactivados}</strong></div>
        </article>
      </section>

      <section className="table-container">
        <div className="table-toolbar">
          <div>
            <h2>Usuarios registrados</h2>
            <p>Consulta y administra las cuentas del sistema.</p>
          </div>
          <div className="users-toolbar-actions">
            <div className="search-box">
              <Search size={17} />
              <input
                placeholder="Buscar por nombre o correo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option>Todos</option>
              <option>Activo</option>
              <option>Pendiente</option>
              <option>Desactivado</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Sucursal</th>
                <th>Estado</th>
                <th>Sesiones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((usuario) => (
                <tr key={usuario.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {usuario.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{usuario.nombre}</strong>
                        <span>{usuario.correo}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="role-badge">{usuario.rol}</span></td>
                  <td>{usuario.sucursal}</td>
                  <td>
                    <span className={`user-status ${estadoClase(usuario.estado)}`}>
                      {usuario.estado}
                    </span>
                  </td>
                  <td>
                    <button className="session-link" onClick={() => abrirSesiones(usuario)}>
                      <Monitor size={15} /> {usuario.sesiones.length}
                    </button>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button title="Ver usuario" onClick={() => abrirDetalle(usuario)}>
                        <Eye size={17} />
                      </button>
                      <button title="Editar usuario" onClick={() => abrirEdicion(usuario)}>
                        <Pencil size={17} />
                      </button>
                      <button title="Sesiones" onClick={() => abrirSesiones(usuario)}>
                        <Monitor size={17} />
                      </button>
                      {usuario.estado !== "Pendiente" && (
                        <button
                          title={usuario.estado === "Activo" ? "Desactivar" : "Activar"}
                          onClick={() => cambiarEstado(usuario)}
                        >
                          {usuario.estado === "Activo" ? <Ban size={17} /> : <CircleCheck size={17} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan="6" className="empty-state">No se encontraron usuarios.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          Mostrando {filtrados.length} de {usuarios.length} usuarios
        </div>
      </section>

      {modal !== "" && (
        <div className="modal-overlay" onClick={() => setModal("")}>
          <div className="category-modal users-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>
                  {modal === "nuevo" && "Invitar usuario"}
                  {modal === "editar" && "Editar usuario"}
                  {modal === "detalle" && "Información del usuario"}
                  {modal === "sesiones" && "Sesiones activas"}
                </h2>
                <p>
                  {modal === "nuevo" && "Registra una invitación para un nuevo integrante."}
                  {modal === "editar" && "Actualiza la información de la cuenta."}
                  {modal === "detalle" && "Consulta los datos de esta cuenta."}
                  {modal === "sesiones" && "Consulta y cierra sesiones de este usuario."}
                </p>
              </div>
              <button className="modal-close" onClick={() => setModal("")}><X /></button>
            </div>

            {(modal === "nuevo" || modal === "editar") && (
              <form onSubmit={guardarUsuario}>
                <div className="form-group">
                  <label>Nombre completo</label>
                  <input
                    required
                    value={formulario.nombre}
                    onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div className="form-group">
                  <label>Correo electrónico</label>
                  <input
                    required
                    type="email"
                    value={formulario.correo}
                    onChange={(e) => setFormulario({ ...formulario, correo: e.target.value })}
                    placeholder="usuario@empresa.com"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Rol asignado</label>
                    <select
                      value={formulario.rol}
                      onChange={(e) => setFormulario({ ...formulario, rol: e.target.value })}
                    >
                      {["R0", "R1", "R2", "R3", "R4", "R5", "R6", "R7"].map((rol) => (
                        <option key={rol}>{rol}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sucursal</label>
                    <select
                      value={formulario.sucursal}
                      onChange={(e) => setFormulario({ ...formulario, sucursal: e.target.value })}
                    >
                      <option>Matriz</option>
                      <option>Sucursal Norte</option>
                      <option>Sucursal Sur</option>
                    </select>
                  </div>
                </div>

                {error && <p className="form-error">{error}</p>}

                {modal === "nuevo" && (
                  <p className="invitation-note">
                    <Mail size={16} /> La invitación se registrará como pendiente. El envío real de correo se integrará con el backend.
                  </p>
                )}

                <div className="modal-footer">
                  <button type="button" className="secondary-button" onClick={() => setModal("")}>Cancelar</button>
                  <button type="submit" className="primary-button">
                    {modal === "nuevo" ? <><Send size={16} /> Crear invitación</> : <><Save size={16} /> Guardar cambios</>}
                  </button>
                </div>
              </form>
            )}

            {modal === "detalle" && usuarioSeleccionado && (
              <div className="user-details">
                <div className="user-detail-avatar">{usuarioSeleccionado.nombre.charAt(0)}</div>
                <h3>{usuarioSeleccionado.nombre}</h3>
                <p>{usuarioSeleccionado.correo}</p>
                <div className="detail-row"><span>Rol</span><strong>{usuarioSeleccionado.rol}</strong></div>
                <div className="detail-row"><span>Sucursal</span><strong>{usuarioSeleccionado.sucursal}</strong></div>
                <div className="detail-row"><span>Estado</span><strong>{usuarioSeleccionado.estado}</strong></div>
                <div className="detail-row"><span>Sesiones activas</span><strong>{usuarioSeleccionado.sesiones.length}</strong></div>
                <div className="modal-footer">
                  <button className="secondary-button" onClick={() => setModal("")}>Cerrar</button>
                </div>
              </div>
            )}

            {modal === "sesiones" && usuarioSeleccionado && (
              <div className="sessions-list">
                <div className="sessions-user">
                  <strong>{usuarioSeleccionado.nombre}</strong>
                  <span>{usuarioSeleccionado.correo}</span>
                </div>
                {usuarioSeleccionado.sesiones.length === 0 ? (
                  <div className="empty-state">Este usuario no tiene sesiones activas.</div>
                ) : (
                  usuarioSeleccionado.sesiones.map((sesion) => (
                    <div className="session-item" key={sesion.id}>
                      <div className="session-device">
                        {sesion.tipo === "mobile" ? <Smartphone /> : <Monitor />}
                      </div>
                      <div className="session-info">
                        <strong>{sesion.dispositivo}</strong>
                        <span>{sesion.ubicacion}</span>
                      </div>
                      <button
                        className="session-close"
                        title="Cerrar sesión"
                        onClick={() => cerrarSesion(sesion.id)}
                      >
                        <LogOut size={17} />
                      </button>
                    </div>
                  ))
                )}
                <div className="modal-footer">
                  <button className="secondary-button" onClick={() => setModal("")}>Cerrar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
