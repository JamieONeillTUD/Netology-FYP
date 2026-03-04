/*
---------------------------------------------------------
Student: C22320301 - Jamie O’Neill
File: ui-theme.js
Purpose: Applies and updates light mode and dyslexic mode settings.
Notes: Moved theme logic out of config.js into a dedicated UI helper file.
---------------------------------------------------------
*/

(() => {
  const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

  // Find the element that should receive theme classes/attributes.
  function getThemeTargetElement() {
    return document.body || document.documentElement;
  }

  // Read saved theme from local storage.
  function getSavedTheme() {
    return localStorage.getItem("netology_theme") || "light";
  }

  // Read saved dyslexic setting from local storage.
  function isDyslexicModeEnabled() {
    return localStorage.getItem("netology_dyslexic") === "true";
  }

  // Apply both saved settings to the page.
  function applyThemeSettings() {
    const targetElement = getThemeTargetElement();
    if (!targetElement) return;

    const savedTheme = String(getSavedTheme() || "light").toLowerCase();
    const resolvedTheme = savedTheme === "system"
      ? (window.matchMedia(SYSTEM_THEME_QUERY).matches ? "dark" : "light")
      : savedTheme;

    targetElement.setAttribute("data-theme", resolvedTheme);
    targetElement.classList.toggle("net-dyslexic", isDyslexicModeEnabled());
  }

  // Save and apply a theme name.
  function setTheme(themeName) {
    localStorage.setItem("netology_theme", String(themeName || "light"));
    applyThemeSettings();
  }

  // Save and apply dyslexic mode.
  function setDyslexic(enabled) {
    localStorage.setItem("netology_dyslexic", enabled ? "true" : "false");
    applyThemeSettings();
  }

  // Toggle dyslexic mode.
  function toggleDyslexic() {
    setDyslexic(!isDyslexicModeEnabled());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyThemeSettings);
  } else {
    applyThemeSettings();
  }

  try {
    const query = window.matchMedia(SYSTEM_THEME_QUERY);
    const handleSystemThemeChange = () => {
      if (String(getSavedTheme() || "").toLowerCase() === "system") {
        applyThemeSettings();
      }
    };

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", handleSystemThemeChange);
    } else if (typeof query.addListener === "function") {
      query.addListener(handleSystemThemeChange);
    }
  } catch {
    // Ignore matchMedia support issues.
  }

  window.NetologyTheme = {
    apply: applyThemeSettings,
    setTheme,
    setDyslexic,
    toggleDyslexic
  };
})();
