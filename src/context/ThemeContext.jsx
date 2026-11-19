
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
  primaryColor: "#0F8B7D",
  language: "es"
};

const COLOR_PALETTES = {
  teal: "#0F8B7D",
  blue: "#2563EB",
  purple: "#9333EA",
  orange: "#EA580C",
  pink: "#DB2777",
  green: "#16A34A"
};

function applyTheme(settings) {
  const root = document.documentElement;
  const dark = settings.theme === "dark";
  const primary = settings.primaryColor;

  root.dataset.theme = settings.theme;
  root.style.colorScheme = settings.theme;

  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-dark", primary);
  root.style.setProperty(
    "--primary-light",
    dark ? `${primary}33` : `${primary}1A`
  );

  root.style.setProperty(
    "--background",
    dark ? "#111827" : "#F8FAFC"
  );

  root.style.setProperty(
    "--surface",
    dark ? "#1F2937" : "#FFFFFF"
  );

  root.style.setProperty(
    "--text-primary",
    dark ? "#F9FAFB" : "#1E293B"
  );

  root.style.setProperty(
    "--text-secondary",
    dark ? "#CBD5E1" : "#64748B"
  );

  root.style.setProperty("--text-muted", "#94A3B8");

  root.style.setProperty(
    "--border",
    dark ? "#374151" : "#E2E8F0"
  );

  root.style.setProperty("--success", "#16A34A");
  root.style.setProperty("--warning", "#D97706");
  root.style.setProperty("--danger", "#DC2626");
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
