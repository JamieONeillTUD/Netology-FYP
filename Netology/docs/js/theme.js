/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 17/04/2026

theme.js - Shared Theme and Accessibility Settings
---
This file applies the saved visual theme and accessibility options.
It keeps light, dark, dyslexic font, and large text settings
consistent across every page on the site.

It is loaded on all pages that need shared theme settings.
*/

(() => {
  "use strict";

  const DARK_QUERY = "(prefers-color-scheme: dark)";

  // Read the saved theme from localStorage.
  function savedTheme() {
    return localStorage.getItem("netology_theme") || "light";
  }

  // Check whether dyslexic mode is turned on.
  function dyslexicOn() {
    return localStorage.getItem("netology_dyslexic") === "true";
  }

  // Check whether large text is turned on.
  function largeTextOn() {
    return localStorage.getItem("netology_large_text") === "true";
  }

  // Toggle one class on both the body and the root element.
  function syncClass(className, enabled) {
    if (document.documentElement) {
      document.documentElement.classList.toggle(className, enabled);
    }
    if (document.body) {
      document.body.classList.toggle(className, enabled);
    }
  }

  // Apply the saved theme and accessibility settings to the page.
  function apply() {
    const target = document.body || document.documentElement;
    if (!target) return;

    const raw = String(savedTheme()).toLowerCase();
    const theme = raw === "system"
      ? (window.matchMedia(DARK_QUERY).matches ? "dark" : "light")
      : raw;

    target.setAttribute("data-theme", theme);
    syncClass("net-dyslexic", dyslexicOn());
    syncClass("net-large-text", largeTextOn());
  }

  // Save a theme name and apply it.
  function setTheme(name) {
    localStorage.setItem("netology_theme", String(name || "light"));
    apply();
  }

  // Save dyslexic mode and apply it.
  function setDyslexic(on) {
    localStorage.setItem("netology_dyslexic", on ? "true" : "false");
    apply();
  }

  // Toggle dyslexic mode on or off.
  function toggleDyslexic() {
    setDyslexic(!dyslexicOn());
  }

  // Save large text mode and apply it.
  function setLargeText(on) {
    localStorage.setItem("netology_large_text", on ? "true" : "false");
    apply();
  }

  // Toggle large text mode on or off.
  function toggleLargeText() {
    setLargeText(!largeTextOn());
  }

  // Apply the saved settings as soon as possible.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }

  // Re-apply when the system theme changes, but only if the user picked system.
  try {
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      if (String(savedTheme()).toLowerCase() === "system") apply();
    };
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);
    else if (typeof mq.addListener === "function") mq.addListener(onChange);
  } catch (_) {}

  // Public API used by page scripts.
  window.NetologyTheme = { apply, setTheme, setDyslexic, toggleDyslexic, setLargeText, toggleLargeText };
})();
