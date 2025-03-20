import { STORAGE_KEYS } from "./constants";

/**
 * Available application themes
 */
export const THEMES = {
  DARK: "dark",
  LIGHT: "light",
  SYSTEM: "system",
};

/**
 * Default theme configuration
 */
export const defaultTheme = THEMES.SYSTEM;

/**
 * Get the current theme from localStorage or default
 * @returns {string} Current theme
 */
export const getCurrentTheme = () => {
  try {
    const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (storedTheme && Object.values(THEMES).includes(storedTheme)) {
      return storedTheme;
    }
  } catch (error) {
    console.warn("Failed to read theme from localStorage:", error);
  }
  return defaultTheme;
};

/**
 * Set the current theme in localStorage
 * @param {string} theme - Theme to set
 */
export const setTheme = (theme) => {
  try {
    if (Object.values(THEMES).includes(theme)) {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
      applyTheme(theme);
    }
  } catch (error) {
    console.warn("Failed to save theme to localStorage:", error);
  }
};

/**
 * Apply a theme to the document
 * @param {string} theme - Theme to apply
 */
export const applyTheme = (theme) => {
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove("theme-dark", "theme-light");

  let themeToApply = theme;

  // Handle system preference
  if (theme === THEMES.SYSTEM) {
    themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? THEMES.DARK
      : THEMES.LIGHT;
  }

  // Add the theme class
  root.classList.add(`theme-${themeToApply}`);
};

/**
 * Initialize the theme system
 */
export const initializeTheme = () => {
  const theme = getCurrentTheme();
  applyTheme(theme);

  // Listen for system preference changes if using system theme
  if (theme === THEMES.SYSTEM) {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    // Initial check
    applyTheme(THEMES.SYSTEM);

    // Add change listener
    mediaQuery.addEventListener("change", () => {
      if (getCurrentTheme() === THEMES.SYSTEM) {
        applyTheme(THEMES.SYSTEM);
      }
    });
  }
};

export default {
  THEMES,
  getCurrentTheme,
  setTheme,
  applyTheme,
  initializeTheme,
};
