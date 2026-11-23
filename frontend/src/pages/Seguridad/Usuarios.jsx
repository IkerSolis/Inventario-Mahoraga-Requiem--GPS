
import { useMemo, useState } from "react";
import {
  Plus, Search, Users, UserCheck, UserX, Mail,
  Pencil, Eye, X, Save, Monitor,
  Smartphone, LogOut, CircleCheck, Clock,
  Ban, Send
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

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
  const { t } = useTheme();

  const [usuarios, setUsuarios] = useState(usuariosIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [modal, setModal] = useState("");
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [error, setError] = useState("");

  const traducirEstado = (estado) => {
    const estados = {
      Activo: t("active"),
      Pendiente: t("pending"),
      Desactivado: t("deactivated"),
    };

    return estados[estado] || estado;
  };

  const traducirSucursal = (sucursal) => {
    const sucursales = {
      Matriz: t("headquarters"),
      "Sucursal Norte": t("northBranch"),
      "Sucursal Sur": t("southBranch"),
      Remoto: t("remote"),
    };

    return sucursales[sucursal] || sucursal;
  };

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
      setError(t("userEmailExists"));
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
          ? {
              ...u,
              estado: nuevoEstado,
              sesiones: nuevoEstado === "Desactivado" ? [] : u.sesiones,
            }
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
          <h1>{t("userManagement")}</h1>
          <p>{t("userManagementDescription")}</p>
        </div>
        <button className="primary-button" onClick={abrirNuevo}>
          <Plus size={18} /> {t("inviteUser")}
        </button>
      </section>

      <section className="users-summary">
        <article className="users-summary-card">
          <div className="users-summary-icon"><Users /></div>
          <div>
            <span>{t("totalUsers")}</span>
            <strong>{usuarios.length}</strong>
          </div>
        </article>
        <article className="users-summary-card">
          <div className="users-summary-icon"><UserCheck /></div>
          <div>
            <span>{t("activeUsers")}</span>
            <strong>{activos}</strong>
          </div>
        </article>
        <article className="users-summary-card">
          <div className="users-summary-icon"><Clock /></div>
          <div>
            <span>{t("pendingInvitations")}</span>
            <strong>{pendientes}</strong>
          </div>
        </article>
        <article className="users-summary-card">
          <div className="users-summary-icon"><UserX /></div>
          <div>
            <span>{t("deactivatedUsers")}</span>
            <strong>{desactivados}</strong>
          </div>
        </article>
      </section>

      <section className="table-container">
        <div className="table-toolbar">
          <div>
            <h2>{t("registeredUsers")}</h2>
            <p>{t("registeredUsersDescription")}</p>
          </div>
          <div className="users-toolbar-actions">
            <div className="search-box">
              <Search size={17} />
              <input
                placeholder={t("searchUser")}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="Todos">{t("allStatuses")}</option>
              <option value="Activo">{t("active")}</option>
              <option value="Pendiente">{t("pending")}</option>
              <option value="Desactivado">{t("deactivated")}</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("user")}</th>
                <th>{t("role")}</th>
                <th>{t("branch")}</th>
                <th>{t("status")}</th>
                <th>{t("sessions")}</th>
                <th>{t("actions")}</th>
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
                  <td>{traducirSucursal(usuario.sucursal)}</td>
                  <td>
                    <span className={`user-status ${estadoClase(usuario.estado)}`}>
                      {traducirEstado(usuario.estado)}
                    </span>
                  </td>
                  <td>
                    <button className="session-link" onClick={() => abrirSesiones(usuario)}>
                      <Monitor size={15} /> {usuario.sesiones.length}
                    </button>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button title={t("viewUser")} onClick={() => abrirDetalle(usuario)}>
                        <Eye size={17} />
                      </button>
                      <button title={t("editUser")} onClick={() => abrirEdicion(usuario)}>
                        <Pencil size={17} />
                      </button>
                      <button title={t("sessions")} onClick={() => abrirSesiones(usuario)}>
                        <Monitor size={17} />
                      </button>
                      {usuario.estado !== "Pendiente" && (
                        <button
                          title={usuario.estado === "Activo" ? t("deactivate") : t("activate")}
                          onClick={() => cambiarEstado(usuario)}
                        >
                          {usuario.estado === "Activo"
                            ? <Ban size={17} />
                            : <CircleCheck size={17} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    {t("noUsersFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          {t("showing")} {filtrados.length} {t("of")} {usuarios.length} {t("users")}
        </div>
      </section>

      {modal !== "" && (
        <div className="modal-overlay" onClick={() => setModal("")}>
          <div className="category-modal users-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>
                  {modal === "nuevo" && t("inviteUser")}
                  {modal === "editar" && t("editUser")}
                  {modal === "detalle" && t("userInformation")}
                  {modal === "sesiones" && t("activeSessions")}
                </h2>
                <p>
                  {modal === "nuevo" && t("newUserDescription")}
                  {modal === "editar" && t("editUserDescription")}
                  {modal === "detalle" && t("userInformationDescription")}
                  {modal === "sesiones" && t("activeSessionsDescription")}
                </p>
              </div>
              <button className="modal-close" onClick={() => setModal("")}>
                <X />
              </button>
            </div>

            {(modal === "nuevo" || modal === "editar") && (
              <form onSubmit={guardarUsuario}>
                <div className="form-group">
                  <label>{t("fullName")}</label>
                  <input
                    required
                    value={formulario.nombre}
                    onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                    placeholder={t("userNamePlaceholder")}
                  />
                </div>
                <div className="form-group">
                  <label>{t("emailAddress")}</label>
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
                    <label>{t("assignedRole")}</label>
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
                    <label>{t("branch")}</label>
                    <select
                      value={formulario.sucursal}
                      onChange={(e) => setFormulario({ ...formulario, sucursal: e.target.value })}
                    >
                      <option value="Matriz">{t("headquarters")}</option>
                      <option value="Sucursal Norte">{t("northBranch")}</option>
                      <option value="Sucursal Sur">{t("southBranch")}</option>
                    </select>
                  </div>
                </div>

                {error && <p className="form-error">{error}</p>}

                {modal === "nuevo" && (
                  <p className="invitation-note">
                    <Mail size={16} /> {t("invitationNote")}
                  </p>
                )}

                <div className="modal-footer">
                  <button type="button" className="secondary-button" onClick={() => setModal("")}>
                    {t("cancel")}
                  </button>
                  <button type="submit" className="primary-button">
                    {modal === "nuevo"
                      ? <><Send size={16} /> {t("createInvitation")}</>
                      : <><Save size={16} /> {t("saveChanges")}</>}
                  </button>
                </div>
              </form>
            )}

            {modal === "detalle" && usuarioSeleccionado && (
              <div className="user-details">
                <div className="user-detail-avatar">
                  {usuarioSeleccionado.nombre.charAt(0)}
                </div>
                <h3>{usuarioSeleccionado.nombre}</h3>
                <p>{usuarioSeleccionado.correo}</p>
                <div className="detail-row">
                  <span>{t("role")}</span>
                  <strong>{usuarioSeleccionado.rol}</strong>
                </div>
                <div className="detail-row">
                  <span>{t("branch")}</span>
                  <strong>{traducirSucursal(usuarioSeleccionado.sucursal)}</strong>
                </div>
                <div className="detail-row">
                  <span>{t("status")}</span>
                  <strong>{traducirEstado(usuarioSeleccionado.estado)}</strong>
                </div>
                <div className="detail-row">
                  <span>{t("activeSessions")}</span>
                  <strong>{usuarioSeleccionado.sesiones.length}</strong>
                </div>
                <div className="modal-footer">
                  <button className="secondary-button" onClick={() => setModal("")}>
                    {t("close")}
                  </button>
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
                  <div className="empty-state">{t("noActiveSessions")}</div>
                ) : (
                  usuarioSeleccionado.sesiones.map((sesion) => (
                    <div className="session-item" key={sesion.id}>
                      <div className="session-device">
                        {sesion.tipo === "mobile" ? <Smartphone /> : <Monitor />}
                      </div>
                      <div className="session-info">
                        <strong>{sesion.dispositivo}</strong>
                        <span>{traducirSucursal(sesion.ubicacion)}</span>
                      </div>
                      <button
                        className="session-close"
                        title={t("closeSession")}
                        onClick={() => cerrarSesion(sesion.id)}
                      >
                        <LogOut size={17} />
                      </button>
                    </div>
                  ))
                )}
                <div className="modal-footer">
                  <button className="secondary-button" onClick={() => setModal("")}>
                    {t("close")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
