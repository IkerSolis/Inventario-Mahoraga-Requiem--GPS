
import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import translations from "../translations/translations";

const ThemeContext = createContext(null);

const DEFAULT_SETTINGS = {
  theme: "light",
  primaryColor: "#4F46E5",
  language: "es"
};

const COLOR_PALETTES = {
  indigo: "#4F46E5",
  blue: "#2563EB",
  teal: "#0F8B7D",
  purple: "#9333EA",
  orange: "#EA580C",
  green: "#16A34A"
};

function applyTheme(settings) {
  const root = document.documentElement;
  const dark = settings.theme === "dark";
  const primary = settings.primaryColor || "#4F46E5";
  const primaryHover =
    primary.toUpperCase() === "#4F46E5"
      ? "#3525CD"
      : `color-mix(in srgb, ${primary} 85%, black)`;
  const primarySoft = dark ? `${primary}33` : `${primary}1A`;
  const bg = dark ? "#0F172A" : "#F8FAFC";
  const surface = dark ? "#1E293B" : "#FFFFFF";
  const textPrimary = dark ? "#F8FAFC" : "#0F172A";
  const textSecondary = dark ? "#CBD5E1" : "#64748B";
  const border = dark ? "#334155" : "#E2E8F0";

  root.dataset.theme = settings.theme;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = settings.theme;

  // Variables oficiales OmniStock Pulse (Frontend 2 + Diseño Maestro)
  root.style.setProperty("--color-primario", primary);
  root.style.setProperty("--color-primario-hover", primaryHover);
  root.style.setProperty("--color-primario-suave", primarySoft);
  root.style.setProperty("--color-fondo", bg);
  root.style.setProperty("--color-superficie", surface);
  root.style.setProperty("--color-texto", textPrimary);
  root.style.setProperty("--color-texto-suave", textSecondary);
  root.style.setProperty("--color-borde", border);
  root.style.setProperty("--color-optimo", "#10B981");
  root.style.setProperty("--color-alerta", "#F59E0B");
  root.style.setProperty("--color-critico", "#EF4444");

  // Alias sincronizados para Dashboard Modular (Frontend 1)
  root.style.setProperty("--color-primary", primary);
  root.style.setProperty("--color-primary-strong", primaryHover);
  root.style.setProperty("--color-bg", bg);
  root.style.setProperty("--color-surface", surface);
  root.style.setProperty("--color-border", border);
  root.style.setProperty("--color-text", textPrimary);
  root.style.setProperty("--color-text-muted", textSecondary);
  root.style.setProperty("--color-optimal", "#10B981");
  root.style.setProperty("--color-warning", "#F59E0B");
  root.style.setProperty("--color-critical", "#EF4444");

  // Alias sincronizados para módulos de Frontend 3
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-dark", primaryHover);
  root.style.setProperty("--primary-light", primarySoft);
  root.style.setProperty("--background", bg);
  root.style.setProperty("--surface", surface);
  root.style.setProperty("--text-primary", textPrimary);
  root.style.setProperty("--text-secondary", textSecondary);
  root.style.setProperty("--text-muted", "#94A3B8");
  root.style.setProperty("--border", border);
  root.style.setProperty("--success", "#10B981");
  root.style.setProperty("--warning", "#F59E0B");
  root.style.setProperty("--danger", "#EF4444");
}

export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("inventario-settings");

      return saved
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
        : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    applyTheme(settings);

    localStorage.setItem(
      "inventario-settings",
      JSON.stringify(settings)
    );
  }, [settings]);

  const setTheme = (theme) => {
    setSettings((prev) => ({ ...prev, theme }));
  };

  const setPrimaryColor = (primaryColor) => {
    setSettings((prev) => ({ ...prev, primaryColor }));
  };

  const setLanguage = (language) => {
    setSettings((prev) => ({ ...prev, language }));
  };

  const resetTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: DEFAULT_SETTINGS.theme,
      primaryColor: DEFAULT_SETTINGS.primaryColor
    }));
  };

  // Función central para traducir textos
  const t = (key) => {
    return (
      translations[settings.language]?.[key] ??
      translations.es?.[key] ??
      key
    );
  };

  return (
    <ThemeContext.Provider
      value={{
        ...settings,
        setTheme,
        setPrimaryColor,
        setLanguage,
        resetTheme,
        colorPalettes: COLOR_PALETTES,
        t
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme debe utilizarse dentro de ThemeProvider"
    );
  }

  return context;
}
