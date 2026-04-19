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

  function savedTheme() {
    const t = localStorage.getItem("netology_theme");
    return (t === "dark") ? "dark" : "light";
  }

  function dyslexicOn() {
    return localStorage.getItem("netology_dyslexic") === "true";
  }

  function largeTextOn() {
    return localStorage.getItem("netology_large_text") === "true";
  }

  function syncClass(className, enabled) {
    if (document.documentElement) {
      document.documentElement.classList.toggle(className, enabled);
    }
    if (document.body) {
      document.body.classList.toggle(className, enabled);
    }
  }

  function apply() {
    const target = document.body || document.documentElement;
    if (!target) return;
    target.setAttribute("data-theme", savedTheme());
    syncClass("net-dyslexic", dyslexicOn());
    syncClass("net-large-text", largeTextOn());
  }

  function setTheme(name) {
    localStorage.setItem("netology_theme", name === "dark" ? "dark" : "light");
    apply();
  }

  function setDyslexic(on) {
    localStorage.setItem("netology_dyslexic", on ? "true" : "false");
    apply();
  }

  function toggleDyslexic() {
    setDyslexic(!dyslexicOn());
  }

  function setLargeText(on) {
    localStorage.setItem("netology_large_text", on ? "true" : "false");
    apply();
  }

  function toggleLargeText() {
    setLargeText(!largeTextOn());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }

  window.NetologyTheme = { apply, setTheme, setDyslexic, toggleDyslexic, setLargeText, toggleLargeText };
})();
