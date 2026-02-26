/*
---------------------------------------------------------
Student: C22320301 - Jamie O’Neill
File: ui-theme.js
Purpose: Applies and updates light mode and dyslexic mode settings.
Notes: Moved theme logic out of config.js into a dedicated UI helper file.
---------------------------------------------------------
*/

(() => {
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

    targetElement.setAttribute("data-theme", getSavedTheme());
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

  window.NetologyTheme = {
    apply: applyThemeSettings,
    setTheme,
    setDyslexic,
    toggleDyslexic
  };
})();
