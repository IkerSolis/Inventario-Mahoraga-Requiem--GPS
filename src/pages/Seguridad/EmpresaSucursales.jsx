
import { useState } from "react";
import {
  Building2,
  Store,
  Plus,
  Pencil,
  Power,
  MapPin,
  Mail,
  Phone,
  CheckCircle2,
  ChevronRight,
  X,
  Save,
  ClipboardList,
} from "lucide-react";
import "./EmpresaSucursales.css";

const initialCompany = {
  commercialName: "Mi Empresa",
  legalName: "",
  rfc: "",
  phone: "",
  email: "",
  address: "",
};

const initialBranches = [
  {
    id: 1,
    name: "Sucursal Matriz",
    code: "MAT-001",
    manager: "",
    phone: "",
    email: "",
    address: "",
    status: "Activa",
  },
];

const emptyBranch = {
  name: "",
  code: "",
  manager: "",
  phone: "",
  email: "",
  address: "",
};

export default function EmpresaSucursales() {
  const [activeTab, setActiveTab] = useState("empresa");
  const [company, setCompany] = useState(initialCompany);
  const [branches, setBranches] = useState(initialBranches);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState(emptyBranch);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardCompany, setWizardCompany] = useState(initialCompany);
  const [wizardBranch, setWizardBranch] = useState({
    ...emptyBranch,
    name: "Sucursal Matriz",
    code: "MAT-001",
  });
  const [message, setMessage] = useState("");

  const activeBranches = branches.filter(
    (branch) => branch.status === "Activa"
  ).length;

  const updateCompany = (event) => {
    const { name, value } = event.target;
    setCompany((previous) => ({ ...previous, [name]: value }));
    setMessage("");
  };

  const updateBranchForm = (event) => {
    const { name, value } = event.target;
    setBranchForm((previous) => ({ ...previous, [name]: value }));
  };

  const updateWizardCompany = (event) => {
    const { name, value } = event.target;
    setWizardCompany((previous) => ({ ...previous, [name]: value }));
  };

  const updateWizardBranch = (event) => {
    const { name, value } = event.target;
    setWizardBranch((previous) => ({ ...previous, [name]: value }));
  };

  const saveCompany = (event) => {
    event.preventDefault();
    setMessage("Los datos de la empresa se guardaron localmente.");
  };

  const openNewBranch = () => {
    setEditingBranch(null);
    setBranchForm(emptyBranch);
    setShowBranchModal(true);
  };

  const openEditBranch = (branch) => {
    setEditingBranch(branch.id);
    setBranchForm({
      name: branch.name,
      code: branch.code,
      manager: branch.manager,
      phone: branch.phone,
      email: branch.email,
      address: branch.address,
    });
    setShowBranchModal(true);
  };

  const saveBranch = (event) => {
    event.preventDefault();

    if (editingBranch !== null) {
      setBranches((previous) =>
        previous.map((branch) =>
          branch.id === editingBranch
            ? { ...branch, ...branchForm }
            : branch
        )
      );
    } else {
      const newBranch = {
        id: Date.now(),
        ...branchForm,
        status: "Activa",
      };

      setBranches((previous) => [...previous, newBranch]);
    }

    setShowBranchModal(false);
    setBranchForm(emptyBranch);
    setEditingBranch(null);
    setMessage("La sucursal se guardó localmente.");
  };

  const toggleBranchStatus = (id) => {
    setBranches((previous) =>
      previous.map((branch) =>
        branch.id === id
          ? {
              ...branch,
              status: branch.status === "Activa" ? "Inactiva" : "Activa",
            }
          : branch
      )
    );
    setMessage("Se actualizó el estado de la sucursal.");
  };

  const startWizard = () => {
    setWizardCompany(company);
    setWizardBranch({
      ...emptyBranch,
      name: "Sucursal Matriz",
      code: "MAT-001",
    });
    setWizardStep(1);
    setShowWizard(true);
  };

  const finishWizard = (event) => {
    event.preventDefault();

    setCompany(wizardCompany);
    setBranches([
      {
        id: Date.now(),
        ...wizardBranch,
        status: "Activa",
      },
    ]);
    setShowWizard(false);
    setActiveTab("empresa");
    setMessage("La configuración inicial se completó localmente.");
  };

  return (
    <main className="company-page">
      <header className="company-header">
        <div>
          <span className="company-eyebrow">SEGURIDAD Y ESTRUCTURA</span>
          <h1>Empresa y sucursales</h1>
          <p>
            Administra la información de tu empresa y los establecimientos
            donde opera tu negocio.
          </p>
        </div>

        <button
          type="button"
          className="company-wizard-button"
          onClick={startWizard}
        >
          <ClipboardList size={18} />
          Asistente inicial
        </button>
      </header>

      <section className="company-summary">
        <article className="company-summary-card">
          <div className="company-summary-icon">
            <Building2 size={21} />
          </div>
          <div>
            <span>Empresa</span>
            <strong>{company.commercialName || "Sin configurar"}</strong>
          </div>
        </article>

        <article className="company-summary-card">
          <div className="company-summary-icon">
            <Store size={21} />
          </div>
          <div>
            <span>Total de sucursales</span>
            <strong>{branches.length}</strong>
          </div>
        </article>

        <article className="company-summary-card">
          <div className="company-summary-icon">
            <CheckCircle2 size={21} />
          </div>
          <div>
            <span>Sucursales activas</span>
            <strong>{activeBranches}</strong>
          </div>
        </article>
      </section>

      <nav className="company-tabs">
        <button
          type="button"
          className={activeTab === "empresa" ? "active" : ""}
          onClick={() => setActiveTab("empresa")}
        >
          <Building2 size={17} />
          Datos de empresa
        </button>

        <button
          type="button"
          className={activeTab === "sucursales" ? "active" : ""}
          onClick={() => setActiveTab("sucursales")}
        >
          <Store size={17} />
          Sucursales
        </button>
      </nav>

      {message && (
        <div className="company-feedback">
          <CheckCircle2 size={17} />
          {message}
        </div>
      )}

      {activeTab === "empresa" && (
        <section className="company-panel">
          <div className="company-panel-heading">
            <div>
              <h2>Información general</h2>
              <p>Datos principales de identificación de tu negocio.</p>
            </div>
            <Building2 size={25} />
          </div>

          <form onSubmit={saveCompany} className="company-form">
            <div className="company-form-grid">
              <label>
                Nombre comercial *
                <input
                  name="commercialName"
                  value={company.commercialName}
                  onChange={updateCompany}
                  placeholder="Ej. GestiónInv"
                  required
                />
              </label>

              <label>
                Razón social
                <input
                  name="legalName"
                  value={company.legalName}
                  onChange={updateCompany}
                  placeholder="Nombre legal de la empresa"
                />
              </label>

              <label>
                RFC
                <input
                  name="rfc"
                  value={company.rfc}
                  onChange={updateCompany}
                  placeholder="RFC de la empresa"
                  maxLength={13}
                />
              </label>

              <label>
                Teléfono
                <input
                  name="phone"
                  value={company.phone}
                  onChange={updateCompany}
                  placeholder="Número de contacto"
                  type="tel"
                />
              </label>

              <label>
                Correo electrónico
                <input
                  name="email"
                  value={company.email}
                  onChange={updateCompany}
                  placeholder="contacto@empresa.com"
                  type="email"
                />
              </label>

              <label className="company-full-width">
                Dirección fiscal o principal
                <textarea
                  name="address"
                  value={company.address}
                  onChange={updateCompany}
                  placeholder="Calle, número, colonia, ciudad, estado y código postal"
                  rows={3}
                />
              </label>
            </div>

            <div className="company-form-actions">
              <button type="submit" className="company-primary-button">
                <Save size={17} />
                Guardar información
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === "sucursales" && (
        <section className="company-panel">
          <div className="company-panel-heading">
            <div>
              <h2>Administración de sucursales</h2>
              <p>
                Registra y administra los establecimientos de tu empresa.
              </p>
            </div>

            <button
              type="button"
              className="company-primary-button"
              onClick={openNewBranch}
            >
              <Plus size={17} />
              Nueva sucursal
            </button>
          </div>

          {branches.length === 0 ? (
            <div className="company-empty">
              <Store size={36} />
              <h3>Aún no hay sucursales</h3>
              <p>Registra la primera sucursal de tu empresa.</p>
              <button
                type="button"
                className="company-primary-button"
                onClick={openNewBranch}
              >
                <Plus size={17} />
                Registrar sucursal
              </button>
            </div>
          ) : (
            <div className="branch-grid">
              {branches.map((branch) => (
                <article className="branch-card" key={branch.id}>
                  <div className="branch-card-top">
                    <div className="branch-icon">
                      <Store size={21} />
                    </div>
                    <span
                      className={
                        branch.status === "Activa"
                          ? "branch-status active"
                          : "branch-status inactive"
                      }
                    >
                      {branch.status}
                    </span>
                  </div>

                  <h3>{branch.name}</h3>
                  <span className="branch-code">{branch.code}</span>

                  <div className="branch-details">
                    <p>
                      <MapPin size={15} />
                      {branch.address || "Dirección no registrada"}
                    </p>
                    <p>
                      <Phone size={15} />
                      {branch.phone || "Sin teléfono"}
                    </p>
                    <p>
                      <Mail size={15} />
                      {branch.email || "Sin correo"}
                    </p>
                  </div>

                  <div className="branch-card-actions">
                    <button
                      type="button"
                      onClick={() => openEditBranch(branch)}
                    >
                      <Pencil size={15} />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleBranchStatus(branch.id)}
                    >
                      <Power size={15} />
                      {branch.status === "Activa" ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {showBranchModal && (
        <div className="company-modal-backdrop">
          <section
            className="company-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-modal-title"
          >
            <div className="company-modal-heading">
              <div>
                <h2 id="branch-modal-title">
                  {editingBranch !== null ? "Editar sucursal" : "Nueva sucursal"}
                </h2>
                <p>Completa la información del establecimiento.</p>
              </div>

              <button
                type="button"
                className="company-close-button"
                onClick={() => setShowBranchModal(false)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveBranch} className="company-form">
              <div className="company-form-grid">
                <label>
                  Nombre de sucursal *
                  <input
                    name="name"
                    value={branchForm.name}
                    onChange={updateBranchForm}
                    placeholder="Ej. Sucursal Norte"
                    required
                  />
                </label>

                <label>
                  Código *
                  <input
                    name="code"
                    value={branchForm.code}
                    onChange={updateBranchForm}
                    placeholder="Ej. NOR-001"
                    required
                  />
                </label>

                <label>
                  Responsable
                  <input
                    name="manager"
                    value={branchForm.manager}
                    onChange={updateBranchForm}
                    placeholder="Nombre del encargado"
                  />
                </label>

                <label>
                  Teléfono
                  <input
                    name="phone"
                    value={branchForm.phone}
                    onChange={updateBranchForm}
                    placeholder="Teléfono"
                    type="tel"
                  />
                </label>

                <label className="company-full-width">
                  Correo electrónico
                  <input
                    name="email"
                    value={branchForm.email}
                    onChange={updateBranchForm}
                    placeholder="sucursal@empresa.com"
                    type="email"
                  />
                </label>

                <label className="company-full-width">
                  Dirección
                  <textarea
                    name="address"
                    value={branchForm.address}
                    onChange={updateBranchForm}
                    placeholder="Dirección completa de la sucursal"
                    rows={3}
                  />
                </label>
              </div>

              <div className="company-form-actions">
                <button
                  type="button"
                  className="company-secondary-button"
                  onClick={() => setShowBranchModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="company-primary-button">
                  <Save size={17} />
                  Guardar sucursal
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showWizard && (
        <div className="company-modal-backdrop">
          <section
            className="company-modal wizard-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wizard-title"
          >
            <div className="company-modal-heading">
              <div>
                <span className="company-eyebrow">ASISTENTE DE CONFIGURACIÓN</span>
                <h2 id="wizard-title">Configura tu negocio</h2>
                <p>Paso {wizardStep} de 2</p>
              </div>

              <button
                type="button"
                className="company-close-button"
                onClick={() => setShowWizard(false)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="wizard-progress">
              <span className={wizardStep >= 1 ? "completed" : ""} />
              <span className={wizardStep >= 2 ? "completed" : ""} />
            </div>

            {wizardStep === 1 ? (
              <form
                className="company-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setWizardStep(2);
                }}
              >
                <h3>1. Datos de la empresa</h3>
                <div className="company-form-grid">
                  <label>
                    Nombre comercial *
                    <input
                      name="commercialName"
                      value={wizardCompany.commercialName}
                      onChange={updateWizardCompany}
                      required
                    />
                  </label>

                  <label>
                    Razón social
                    <input
                      name="legalName"
                      value={wizardCompany.legalName}
                      onChange={updateWizardCompany}
                    />
                  </label>

                  <label>
                    RFC
                    <input
                      name="rfc"
                      value={wizardCompany.rfc}
                      onChange={updateWizardCompany}
                      maxLength={13}
                    />
                  </label>

                  <label>
                    Teléfono
                    <input
                      name="phone"
                      type="tel"
                      value={wizardCompany.phone}
                      onChange={updateWizardCompany}
                    />
                  </label>

                  <label className="company-full-width">
                    Correo electrónico
                    <input
                      name="email"
                      type="email"
                      value={wizardCompany.email}
                      onChange={updateWizardCompany}
                    />
                  </label>

                  <label className="company-full-width">
                    Dirección
                    <textarea
                      name="address"
                      value={wizardCompany.address}
                      onChange={updateWizardCompany}
                      rows={2}
                    />
                  </label>
                </div>

                <div className="company-form-actions">
                  <button type="submit" className="company-primary-button">
                    Continuar
                    <ChevronRight size={17} />
                  </button>
                </div>
              </form>
            ) : (
              <form className="company-form" onSubmit={finishWizard}>
                <h3>2. Registra tu primera sucursal</h3>
                <div className="company-form-grid">
                  <label>
                    Nombre de sucursal *
                    <input
                      name="name"
                      value={wizardBranch.name}
                      onChange={updateWizardBranch}
                      required
                    />
                  </label>

                  <label>
                    Código *
                    <input
                      name="code"
                      value={wizardBranch.code}
                      onChange={updateWizardBranch}
                      required
                    />
                  </label>

                  <label>
                    Responsable
                    <input
                      name="manager"
                      value={wizardBranch.manager}
                      onChange={updateWizardBranch}
                    />
                  </label>

                  <label>
                    Teléfono
                    <input
                      name="phone"
                      type="tel"
                      value={wizardBranch.phone}
                      onChange={updateWizardBranch}
                    />
                  </label>

                  <label className="company-full-width">
                    Correo electrónico
                    <input
                      name="email"
                      type="email"
                      value={wizardBranch.email}
                      onChange={updateWizardBranch}
                    />
                  </label>

                  <label className="company-full-width">
                    Dirección
                    <textarea
                      name="address"
                      value={wizardBranch.address}
                      onChange={updateWizardBranch}
                      rows={2}
                    />
                  </label>
                </div>

                <div className="company-form-actions">
                  <button
                    type="button"
                    className="company-secondary-button"
                    onClick={() => setWizardStep(1)}
                  >
                    Regresar
                  </button>
                  <button type="submit" className="company-primary-button">
                    <CheckCircle2 size={17} />
                    Finalizar configuración
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
