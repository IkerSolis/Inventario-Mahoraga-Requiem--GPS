import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import {
  Palette,
  Languages,
  Bell,
  User,
  Sun,
  Moon,
  RotateCcw,
  Check
} from "lucide-react";
import "./Configuracion.css";

const initialNotifications = {
  inventory: true,
  stock: true,
  users: false,
  reports: true
};

function Configuracion() {
  const {
    theme,
    setTheme,
    primaryColor,
    setPrimaryColor,
    language,
    setLanguage,
    resetTheme,
    colorPalettes,
    t
  } = useTheme();

  const [activeSection, setActiveSection] = useState("appearance");

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("inventario-notifications");
      return saved
        ? { ...initialNotifications, ...JSON.parse(saved) }
        : initialNotifications;
    } catch {
      return initialNotifications;
    }
  });

  const [profile, setProfile] = useState({
    name: "Carlos Ruiz",
    email: "carlos.ruiz@empresa.com",
    role: "Administrador"
  });

  const sections = [
    { id: "appearance", label: t("appearance"), icon: Palette },
    { id: "language", label: t("language"), icon: Languages },
    { id: "notifications", label: t("notifications"), icon: Bell },
    { id: "profile", label: t("profile"), icon: User }
  ];

  const translateColorName = (name) => {
    const colors = {
      teal: t("colorTeal"),
      blue: t("colorBlue"),
      purple: t("colorPurple"),
      orange: t("colorOrange"),
      pink: t("colorPink"),
      green: t("colorGreen")
    };

    return colors[name] ?? name;
  };

  const toggleNotification = (key) => {
    const updated = {
      ...notifications,
      [key]: !notifications[key]
    };

    setNotifications(updated);
    localStorage.setItem(
      "inventario-notifications",
      JSON.stringify(updated)
    );
  };

  const updateProfile = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const renderContent = () => {
    switch (activeSection) {
      case "appearance":
        return (
          <>
            <div className="configuracion-section">
              <h2>{t("appTheme")}</h2>
              <p className="configuracion-description">
                {t("appThemeDescription")}
              </p>

              <div className="configuracion-options">
                <button
                  className={`configuracion-option ${
                    theme === "light" ? "active" : ""
                  }`}
                  onClick={() => setTheme("light")}
                >
                  <Sun size={20} />
                  <span>{t("lightTheme")}</span>
                  {theme === "light" && <Check size={17} />}
                </button>

                <button
                  className={`configuracion-option ${
                    theme === "dark" ? "active" : ""
                  }`}
                  onClick={() => setTheme("dark")}
                >
                  <Moon size={20} />
                  <span>{t("darkTheme")}</span>
                  {theme === "dark" && <Check size={17} />}
                </button>
              </div>
            </div>

            <div className="configuracion-section">
              <h2>{t("primaryColor")}</h2>
              <p className="configuracion-description">
                {t("primaryColorDescription")}
              </p>

              <div className="configuracion-colors">
                {Object.entries(colorPalettes).map(([name, color]) => (
                  <button
                    key={name}
                    className={`configuracion-color ${
                      primaryColor === color ? "active" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    title={translateColorName(name)}
                    aria-label={`${t("selectColor")} ${translateColorName(name)}`}
                    onClick={() => setPrimaryColor(color)}
                  />
                ))}
              </div>

              <div className="configuracion-custom-color">
                <label htmlFor="custom-color">
                  {t("customColor")}
                </label>

                <input
                  id="custom-color"
                  type="color"
                  className="configuracion-color-input"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />

                <span>{primaryColor.toUpperCase()}</span>
              </div>
            </div>

            <div className="configuracion-section">
              <h2>{t("resetAppearance")}</h2>
              <p className="configuracion-description">
                {t("resetAppearanceDescription")}
              </p>

              <button
                className="configuracion-reset"
                onClick={resetTheme}
              >
                <RotateCcw size={16} />
                {t("resetValues")}
              </button>
            </div>
          </>
        );

      case "language":
        return (
          <div className="configuracion-section">
            <h2>{t("systemLanguage")}</h2>
            <p className="configuracion-description">
              {t("systemLanguageDescription")}
            </p>

            <div className="configuracion-field">
              <label htmlFor="language">{t("language")}</label>

              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <p className="configuracion-note">
              {t("languagePreferenceNote")}
            </p>
          </div>
        );

      case "notifications":
        return (
          <div className="configuracion-section">
            <h2>{t("notificationPreferences")}</h2>
            <p className="configuracion-description">
              {t("notificationPreferencesDescription")}
            </p>

            {[
              {
                id: "inventory",
                title: t("inventoryMovements"),
                description: t("inventoryMovementsDescription")
              },
              {
                id: "stock",
                title: t("lowStock"),
                description: t("lowStockDescription")
              },
              {
                id: "users",
                title: t("userActivity"),
                description: t("userActivityDescription")
              },
              {
                id: "reports",
                title: t("reports"),
                description: t("reportsNotificationsDescription")
              }
            ].map((item) => (
              <div className="configuracion-notification" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>

                <label className="configuracion-switch">
                  <input
                    type="checkbox"
                    checked={notifications[item.id]}
                    onChange={() => toggleNotification(item.id)}
                  />
                  <span className="configuracion-slider" />
                </label>
              </div>
            ))}
          </div>
        );

      case "profile":
        return (
          <div className="configuracion-section">
            <h2>{t("userProfile")}</h2>
            <p className="configuracion-description">
              {t("userProfileDescription")}
            </p>

            <div className="configuracion-profile-avatar">
              {profile.name.charAt(0).toUpperCase()}
            </div>

            <div className="configuracion-profile-form">
              <div className="configuracion-field">
                <label htmlFor="profile-name">
                  {t("fullName")}
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={profile.name}
                  onChange={(e) => updateProfile("name", e.target.value)}
                />
              </div>

              <div className="configuracion-field">
                <label htmlFor="profile-email">
                  {t("emailAddress")}
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => updateProfile("email", e.target.value)}
                />
              </div>

              <div className="configuracion-field">
                <label htmlFor="profile-role">{t("role")}</label>
                <input
                  id="profile-role"
                  type="text"
                  value={
                    profile.role === "Administrador"
                      ? t("administrator")
                      : profile.role
                  }
                  disabled
                />
              </div>
            </div>

            <p className="configuracion-note">
              {t("profileLocalNote")}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page-content configuracion-page">
      <div className="configuracion-header">
        <div>
          <h1>{t("settings")}</h1>
          <p>{t("settingsDescription")}</p>
        </div>
      </div>

      <div className="configuracion-layout">
        <aside className="configuracion-navigation">
          <h3>{t("preferences")}</h3>

          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <button
                key={section.id}
                className={`configuracion-nav-item ${
                  activeSection === section.id ? "active" : ""
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <Icon size={18} />
                <span>{section.label}</span>
              </button>
            );
          })}
        </aside>

        <div className="configuracion-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default Configuracion;