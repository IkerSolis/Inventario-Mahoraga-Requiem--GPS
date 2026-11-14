
import { useState } from "react";
import {
  ShieldCheck,
  RotateCcw,
  Save,
  LockKeyhole,
  Info,
  AlertTriangle,
} from "lucide-react";
import "./RolesPermisos.css";

const roles = [
  { id: "R0", code: "owner", name: "Propietario / Dueño" },
  { id: "R1", code: "system_admin", name: "Administrador del sistema" },
  { id: "R2", code: "inventory_manager", name: "Gerente de inventario" },
  { id: "R3", code: "warehouse_supervisor", name: "Supervisor de almacén" },
  { id: "R4", code: "warehouse_operator", name: "Almacenista / Operador" },
  { id: "R5", code: "purchasing", name: "Compras" },
  { id: "R6", code: "sales", name: "Ventas / Mostrador" },
  { id: "R7", code: "auditor", name: "Auditor / Consulta" },
];

const permissionGroups = [
  {
    name: "Inventario",
    permissions: [
      { id: "stock.view", label: "Consultar existencias" },
      { id: "stock.create", label: "Registrar entradas y salidas" },
      { id: "stock.adjust", label: "Realizar ajustes de inventario" },
      { id: "stock.approve", label: "Aprobar ajustes" },
      { id: "stock.receive", label: "Registrar recepción de mercancía" },
      { id: "stock.transfer", label: "Transferir entre almacenes" },
    ],
  },
  {
    name: "Catálogos y compras",
    permissions: [
      { id: "catalog.view", label: "Consultar catálogos" },
      { id: "catalog.manage", label: "Administrar catálogos" },
      { id: "suppliers.manage", label: "Administrar proveedores" },
      { id: "purchases.manage", label: "Gestionar órdenes de compra" },
    ],
  },
  {
    name: "Ventas",
    permissions: [
      { id: "sales.view", label: "Consultar productos y disponibilidad" },
      { id: "sales.create", label: "Registrar pedidos y ventas" },
      { id: "sales.costs.view", label: "Consultar costos y precios" },
    ],
  },
  {
    name: "Administración",
    permissions: [
      { id: "users.manage", label: "Administrar usuarios" },
      { id: "roles.manage", label: "Administrar roles y permisos" },
      { id: "branches.manage", label: "Administrar sucursales" },
      { id: "settings.manage", label: "Modificar configuración global" },
    ],
  },
  {
    name: "Reportes y auditoría",
    permissions: [
      { id: "reports.view", label: "Consultar reportes" },
      { id: "reports.export", label: "Exportar reportes" },
      { id: "audit.view", label: "Consultar registros de auditoría" },
    ],
  },
];

// Configuración demostrativa inicial.
// Debe revisarse y aprobarse con el equipo antes de considerarla definitiva.
const initialPermissions = {
  "stock.view": ["R0", "R1", "R2", "R3", "R4", "R5", "R6", "R7"],
  "stock.create": ["R0", "R1", "R2", "R3", "R4"],
  "stock.adjust": ["R0", "R1", "R2", "R3"],
  "stock.approve": ["R0", "R1", "R2", "R3"],
  "stock.receive": ["R0", "R1", "R2", "R3", "R4"],
  "stock.transfer": ["R0", "R1", "R2", "R3", "R4"],

  "catalog.view": ["R0", "R1", "R2", "R3", "R4", "R5", "R6", "R7"],
  "catalog.manage": ["R0", "R1"],
  "suppliers.manage": ["R0", "R1", "R5"],
  "purchases.manage": ["R0", "R1", "R2", "R5"],

  "sales.view": ["R0", "R1", "R2", "R3", "R4", "R5", "R6", "R7"],
  "sales.create": ["R0", "R1", "R6"],
  "sales.costs.view": ["R0", "R1"],

  "users.manage": ["R0", "R1"],
  "roles.manage": ["R0", "R1"],
  "branches.manage": ["R0", "R1"],
  "settings.manage": ["R0", "R1"],

  "reports.view": ["R0", "R1", "R2", "R3", "R7"],
  "reports.export": ["R0", "R1", "R2"],
  "audit.view": ["R0", "R1", "R2", "R7"],
};

const initialLimits = {
  R0: "",
  R1: "",
  R2: "",
  R3: "",
  R4: "0",
  R5: "0",
  R6: "0",
  R7: "0",
};

const restrictions = [
  {
    role: "R0 · Propietario",
    description:
      "No puede eliminarse ni quedar sin titular. La transferencia de propiedad requiere confirmación reforzada y 2FA.",
  },
  {
    role: "R1 · Administrador",
    description:
      "No puede transferir la propiedad ni modificar al propietario inicial o las reglas críticas.",
  },
  {
    role: "R2 · Gerente de inventario",
    description:
      "Sus permisos pueden limitarse a determinadas sucursales y almacenes. Las aprobaciones dependen de sus límites.",
  },
  {
    role: "R3 · Supervisor",
    description:
      "Solo administra operaciones dentro de su ámbito. No administra usuarios privilegiados ni la configuración global.",
  },
  {
    role: "R4 · Almacenista",
    description:
      "No puede aprobar sus propios ajustes sensibles ni borrar movimientos confirmados.",
  },
  {
    role: "R5 · Compras",
    description:
      "No modifica existencias directamente, salvo que tenga el permiso explícito stock.receive.",
  },
  {
    role: "R6 · Ventas",
    description:
      "No administra existencias manualmente. La visualización de costos y precios es configurable.",
  },
  {
    role: "R7 · Auditor",
    description:
      "Es de solo lectura. No puede crear, editar, aprobar ni borrar registros.",
  },
];

export default function RolesPermisos() {
  const [permissions, setPermissions] = useState(initialPermissions);
  const [limits, setLimits] = useState(initialLimits);
  const [showRestore, setShowRestore] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const togglePermission = (permissionId, roleId) => {
    // R7 es exclusivamente de lectura.
    if (
      roleId === "R7" &&
      !["stock.view", "catalog.view", "sales.view", "reports.view", "audit.view"].includes(permissionId)
    ) {
      return;
    }

    // Algunas restricciones no se pueden quitar desde esta matriz.
    if (
      roleId === "R4" &&
      permissionId === "stock.approve"
    ) {
      return;
    }

    setPermissions((previous) => {
      const currentRoles = previous[permissionId] || [];
      const hasPermission = currentRoles.includes(roleId);

      return {
        ...previous,
        [permissionId]: hasPermission
          ? currentRoles.filter((role) => role !== roleId)
          : [...currentRoles, roleId],
      };
    });

    setShowSaved(false);
  };

  const updateLimit = (roleId, value) => {
    if (value !== "" && Number(value) < 0) return;

    setLimits((previous) => ({
      ...previous,
      [roleId]: value,
    }));

    setShowSaved(false);
  };

  const restoreDefaults = () => {
    setPermissions(initialPermissions);
    setLimits(initialLimits);
    setShowRestore(false);
    setShowSaved(false);
  };

  const handleSave = () => {
    // Por ahora solo se simula el guardado.
    // Posteriormente se conectará con el backend.
    setShowSaved(true);
  };

  return (
    <main className="roles-page">
      <header className="roles-header">
        <div>
          <span className="roles-eyebrow">SEGURIDAD Y ESTRUCTURA</span>
          <h1>Roles y permisos</h1>
          <p>
            Configura los niveles de acceso y las responsabilidades de cada rol.
          </p>
        </div>

        <div className="roles-header-icon">
          <ShieldCheck size={30} />
        </div>
      </header>

      <section className="roles-info">
        <Info size={19} />
        <p>
          <strong>Configuración inicial demostrativa.</strong> Los permisos
          propuestos deben ser revisados y aprobados por el equipo antes de
          utilizarse como reglas definitivas.
        </p>
      </section>

      <section className="roles-section">
        <div className="roles-section-heading">
          <div>
            <h2>Matriz de permisos</h2>
            <p>Activa o desactiva permisos para cada rol.</p>
          </div>
          <span className="roles-count">8 roles · R0 a R7</span>
        </div>

        <div className="roles-matrix-wrapper">
          <table className="roles-matrix">
            <thead>
              <tr>
                <th className="permission-name-column">Permiso</th>
                {roles.map((role) => (
                  <th key={role.id}>
                    <span className="role-code">{role.id}</span>
                    <span className="role-short-name">
                      {role.name.split(" ")[0]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {permissionGroups.map((group) => (
                <>
                  <tr className="permission-group-row" key={group.name}>
                    <td colSpan={9}>{group.name}</td>
                  </tr>

                  {group.permissions.map((permission) => (
                    <tr key={permission.id}>
                      <td className="permission-name-column">
                        <span>{permission.label}</span>
                        <small>{permission.id}</small>
                      </td>

                      {roles.map((role) => {
                        const checked = (
                          permissions[permission.id] || []
                        ).includes(role.id);

                        const readOnly =
                          role.id === "R7" &&
                          ![
                            "stock.view",
                            "catalog.view",
                            "sales.view",
                            "reports.view",
                            "audit.view",
                          ].includes(permission.id);

                        const restricted =
                          role.id === "R4" &&
                          permission.id === "stock.approve";

                        return (
                          <td key={role.id}>
                            <input
                              type="checkbox"
                              className="permission-checkbox"
                              checked={checked}
                              disabled={readOnly || restricted}
                              onChange={() =>
                                togglePermission(permission.id, role.id)
                              }
                              aria-label={`${permission.label} para ${role.id}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        <p className="roles-matrix-note">
          <LockKeyhole size={15} />
          Algunas restricciones obligatorias están bloqueadas para evitar
          configuraciones incompatibles con las reglas del negocio.
        </p>
      </section>

      <section className="roles-section">
        <div className="roles-section-heading">
          <div>
            <h2>Límites de aprobación</h2>
            <p>
              Define el importe máximo que puede aprobar cada rol. Deja el
              campo vacío si todavía no se ha definido.
            </p>
          </div>
        </div>

        <div className="approval-grid">
          {roles.map((role) => (
            <label className="approval-card" key={role.id}>
              <span className="approval-role-code">{role.id}</span>
              <strong>{role.name}</strong>
              <span className="approval-input-label">
                Límite de aprobación
              </span>
              <div className="approval-input-wrapper">
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Sin definir"
                  value={limits[role.id]}
                  onChange={(event) =>
                    updateLimit(role.id, event.target.value)
                  }
                />
              </div>
              <small>Importe en MXN</small>
            </label>
          ))}
        </div>
      </section>

      <section className="roles-section">
        <div className="roles-section-heading">
          <div>
            <h2>Restricciones obligatorias</h2>
            <p>Reglas especiales que deben respetarse para cada rol.</p>
          </div>
        </div>

        <div className="restrictions-list">
          {restrictions.map((item) => (
            <article className="restriction-card" key={item.role}>
              <div className="restriction-icon">
                <LockKeyhole size={18} />
              </div>
              <div>
                <strong>{item.role}</strong>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="roles-actions">
        {showSaved && (
          <span className="roles-saved-message">
            Configuración guardada localmente.
          </span>
        )}

        <button
          type="button"
          className="roles-button roles-button-secondary"
          onClick={() => setShowRestore(true)}
        >
          <RotateCcw size={17} />
          Restaurar valores iniciales
        </button>

        <button
          type="button"
          className="roles-button roles-button-primary"
          onClick={handleSave}
        >
          <Save size={17} />
          Guardar configuración
        </button>
      </footer>

      {showRestore && (
        <div className="roles-modal-backdrop">
          <section
            className="roles-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-title"
          >
            <div className="restore-warning-icon">
              <AlertTriangle size={25} />
            </div>
            <h2 id="restore-title">¿Restaurar configuración?</h2>
            <p>
              Se recuperarán los permisos y límites de la configuración
              demostrativa inicial. Los cambios actuales se perderán.
            </p>

            <div className="restore-modal-actions">
              <button
                type="button"
                className="roles-button roles-button-secondary"
                onClick={() => setShowRestore(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="roles-button roles-button-danger"
                onClick={restoreDefaults}
              >
                Restaurar
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
