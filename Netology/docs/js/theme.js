// theme.js — Applies light/dark mode and dyslexic font settings.

(() => {
  "use strict";

  const DARK_QUERY = "(prefers-color-scheme: dark)";

  // Reads the saved theme from localStorage.
  function savedTheme() {
    return localStorage.getItem("netology_theme") || "light";
  }

  // Checks if dyslexic mode is turned on.
  function dyslexicOn() {
    return localStorage.getItem("netology_dyslexic") === "true";
  }

  // Applies saved theme and dyslexic settings to the page.
  function apply() {
    const target = document.body || document.documentElement;
    if (!target) return;

    const raw = String(savedTheme()).toLowerCase();
    const theme = raw === "system"
      ? (window.matchMedia(DARK_QUERY).matches ? "dark" : "light")
      : raw;

    target.setAttribute("data-theme", theme);
    target.classList.toggle("net-dyslexic", dyslexicOn());
  }

  // Saves a theme name and applies it.
  function setTheme(name) {
    localStorage.setItem("netology_theme", String(name || "light"));
    apply();
  }

  // Saves dyslexic mode and applies it.
  function setDyslexic(on) {
    localStorage.setItem("netology_dyslexic", on ? "true" : "false");
    apply();
  }

  // Toggles dyslexic mode on/off.
  function toggleDyslexic() {
    setDyslexic(!dyslexicOn());
  }

  // Apply theme as soon as possible.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }

  // Re-apply when system theme changes (only matters if user picked "system").
  try {
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      if (String(savedTheme()).toLowerCase() === "system") apply();
    };
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);
    else if (typeof mq.addListener === "function") mq.addListener(onChange);
  } catch (_) {}

  // Public API used by account.js.
  window.NetologyTheme = { apply, setTheme, setDyslexic, toggleDyslexic };
})();
