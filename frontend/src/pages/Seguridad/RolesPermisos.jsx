
import { Fragment, useState } from "react";
import {
  ShieldCheck,
  RotateCcw,
  Save,
  LockKeyhole,
  Info,
  AlertTriangle,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import "./RolesPermisos.css";

const roles = [
  { id: "R0", nameKey: "roleOwner" },
  { id: "R1", nameKey: "roleSystemAdmin" },
  { id: "R2", nameKey: "roleInventoryManager" },
  { id: "R3", nameKey: "roleWarehouseSupervisor" },
  { id: "R4", nameKey: "roleWarehouseOperator" },
  { id: "R5", nameKey: "rolePurchasing" },
  { id: "R6", nameKey: "roleSales" },
  { id: "R7", nameKey: "roleAuditor" },
];

const permissionGroups = [
  {
    nameKey: "permissionGroupInventory",
    permissions: [
      { id: "stock.view", labelKey: "permissionStockView" },
      { id: "stock.create", labelKey: "permissionStockCreate" },
      { id: "stock.adjust", labelKey: "permissionStockAdjust" },
      { id: "stock.approve", labelKey: "permissionStockApprove" },
      { id: "stock.receive", labelKey: "permissionStockReceive" },
      { id: "stock.transfer", labelKey: "permissionStockTransfer" },
    ],
  },
  {
    nameKey: "permissionGroupCatalogs",
    permissions: [
      { id: "catalog.view", labelKey: "permissionCatalogView" },
      { id: "catalog.manage", labelKey: "permissionCatalogManage" },
      { id: "suppliers.manage", labelKey: "permissionSuppliersManage" },
      { id: "purchases.manage", labelKey: "permissionPurchasesManage" },
    ],
  },
  {
    nameKey: "permissionGroupSales",
    permissions: [
      { id: "sales.view", labelKey: "permissionSalesView" },
      { id: "sales.create", labelKey: "permissionSalesCreate" },
      { id: "sales.costs.view", labelKey: "permissionSalesCostsView" },
    ],
  },
  {
    nameKey: "permissionGroupAdministration",
    permissions: [
      { id: "users.manage", labelKey: "permissionUsersManage" },
      { id: "roles.manage", labelKey: "permissionRolesManage" },
      { id: "branches.manage", labelKey: "permissionBranchesManage" },
      { id: "settings.manage", labelKey: "permissionSettingsManage" },
    ],
  },
  {
    nameKey: "permissionGroupReports",
    permissions: [
      { id: "reports.view", labelKey: "permissionReportsView" },
      { id: "reports.export", labelKey: "permissionReportsExport" },
      { id: "audit.view", labelKey: "permissionAuditView" },
    ],
  },
];

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
  { roleKey: "roleOwnerShort", descriptionKey: "restrictionOwner" },
  { roleKey: "roleAdminShort", descriptionKey: "restrictionAdmin" },
  { roleKey: "roleManagerShort", descriptionKey: "restrictionManager" },
  { roleKey: "roleSupervisorShort", descriptionKey: "restrictionSupervisor" },
  { roleKey: "roleOperatorShort", descriptionKey: "restrictionOperator" },
  { roleKey: "rolePurchasingShort", descriptionKey: "restrictionPurchasing" },
  { roleKey: "roleSalesShort", descriptionKey: "restrictionSales" },
  { roleKey: "roleAuditorShort", descriptionKey: "restrictionAuditor" },
];

const readOnlyPermissions = [
  "stock.view",
  "catalog.view",
  "sales.view",
  "reports.view",
  "audit.view",
];

export default function RolesPermisos() {
  const { t } = useTheme();

  const [permissions, setPermissions] = useState(initialPermissions);
  const [limits, setLimits] = useState(initialLimits);
  const [showRestore, setShowRestore] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const togglePermission = (permissionId, roleId) => {
    if (roleId === "R7" && !readOnlyPermissions.includes(permissionId)) {
      return;
    }

    if (roleId === "R4" && permissionId === "stock.approve") {
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
    <section className="roles-page">
      <header className="roles-header">
        <div>
          <span className="roles-eyebrow">{t("rolesEyebrow")}</span>
          <h1>{t("rolesPermissionsTitle")}</h1>
          <p>{t("rolesPermissionsDescription")}</p>
        </div>

        <div className="roles-header-icon">
          <ShieldCheck size={30} />
        </div>
      </header>

      <section className="roles-info">
        <Info size={19} />
        <p>
          <strong>{t("demonstrationConfiguration")}</strong>{" "}
          {t("demonstrationConfigurationDescription")}
        </p>
      </section>

      <section className="roles-section">
        <div className="roles-section-heading">
          <div>
            <h2>{t("permissionsMatrix")}</h2>
            <p>{t("permissionsMatrixDescription")}</p>
          </div>
          <span className="roles-count">{t("rolesCount")}</span>
        </div>

        <div className="roles-matrix-wrapper">
          <table className="roles-matrix">
            <thead>
              <tr>
                <th className="permission-name-column">{t("permission")}</th>
                {roles.map((role) => (
                  <th key={role.id}>
                    <span className="role-code">{role.id}</span>
                    <span className="role-short-name">
                      {t(role.nameKey).split(" ")[0]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {permissionGroups.map((group) => (
                <Fragment key={group.nameKey}>
                  <tr className="permission-group-row">
                    <td colSpan={9}>{t(group.nameKey)}</td>
                  </tr>

                  {group.permissions.map((permission) => (
                    <tr key={permission.id}>
                      <td className="permission-name-column">
                        <span>{t(permission.labelKey)}</span>
                        <small>{permission.id}</small>
                      </td>

                      {roles.map((role) => {
                        const checked = (
                          permissions[permission.id] || []
                        ).includes(role.id);

                        const readOnly =
                          role.id === "R7" &&
                          !readOnlyPermissions.includes(permission.id);

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
                              aria-label={`${t(permission.labelKey)} - ${role.id}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <p className="roles-matrix-note">
          <LockKeyhole size={15} />
          {t("mandatoryRestrictionsNote")}
        </p>
      </section>

      <section className="roles-section">
        <div className="roles-section-heading">
          <div>
            <h2>{t("approvalLimits")}</h2>
            <p>{t("approvalLimitsDescription")}</p>
          </div>
        </div>

        <div className="approval-grid">
          {roles.map((role) => (
            <label className="approval-card" key={role.id}>
              <span className="approval-role-code">{role.id}</span>
              <strong>{t(role.nameKey)}</strong>
              <span className="approval-input-label">
                {t("approvalLimit")}
              </span>
              <div className="approval-input-wrapper">
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t("notDefined")}
                  value={limits[role.id]}
                  onChange={(event) =>
                    updateLimit(role.id, event.target.value)
                  }
                />
              </div>
              <small>{t("amountInMxn")}</small>
            </label>
          ))}
        </div>
      </section>

      <section className="roles-section">
        <div className="roles-section-heading">
          <div>
            <h2>{t("mandatoryRestrictions")}</h2>
            <p>{t("mandatoryRestrictionsDescription")}</p>
          </div>
        </div>

        <div className="restrictions-list">
          {restrictions.map((item) => (
            <article className="restriction-card" key={item.roleKey}>
              <div className="restriction-icon">
                <LockKeyhole size={18} />
              </div>
              <div>
                <strong>{t(item.roleKey)}</strong>
                <p>{t(item.descriptionKey)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="roles-actions">
        {showSaved && (
          <span className="roles-saved-message">
            {t("configurationSavedLocally")}
          </span>
        )}

        <button
          type="button"
          className="roles-button roles-button-secondary"
          onClick={() => setShowRestore(true)}
        >
          <RotateCcw size={17} />
          {t("restoreInitialValues")}
        </button>

        <button
          type="button"
          className="roles-button roles-button-primary"
          onClick={handleSave}
        >
          <Save size={17} />
          {t("saveConfiguration")}
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
            <h2 id="restore-title">{t("restoreConfigurationTitle")}</h2>
            <p>{t("restoreConfigurationDescription")}</p>

            <div className="restore-modal-actions">
              <button
                type="button"
                className="roles-button roles-button-secondary"
                onClick={() => setShowRestore(false)}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="roles-button roles-button-danger"
                onClick={restoreDefaults}
              >
                {t("restore")}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
