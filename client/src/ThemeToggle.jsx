import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "catLiveTrackerTheme";

function getInitialDarkMode() {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "dark") return true;
    if (savedTheme === "light") return false;
  } catch {
    return false;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);

  useEffect(() => {
    const theme = darkMode ? "dark" : "light";
    document.documentElement.dataset.theme = theme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      return;
    }
  }, [darkMode]);

  return (
    <button
      aria-label={`${darkMode ? "Disable" : "Enable"} dark mode`}
      aria-pressed={darkMode}
      className="theme-toggle"
      onClick={() => setDarkMode((current) => !current)}
      type="button"
    >
      <span>Dark mode</span>
      <span className="theme-switch" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

export default ThemeToggle;