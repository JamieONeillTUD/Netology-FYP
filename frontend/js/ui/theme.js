const THEME_KEY = "netology.theme";

function applyTheme(theme) {
  if (theme === "auto") {
    document.body.removeAttribute("data-theme");
    return;
  }
  document.body.dataset.theme = theme;
}

export function initThemeToggle(selector) {
  const button = typeof selector === "string" ? document.querySelector(selector) : selector;
  if (!button) return;

  const stored = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = stored || (prefersDark ? "dark" : "light");
  applyTheme(initial);
  button.dataset.theme = initial;
  updateButtonLabel(button, initial);

  button.addEventListener("click", () => {
    const current = button.dataset.theme || initial;
    const next = current === "dark" ? "light" : "dark";
    button.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    updateButtonLabel(button, next);
  });
}

function updateButtonLabel(button, theme) {
  if (!button) return;
  const label = theme === "dark" ? "Switch to light" : "Switch to dark";
  button.textContent = `${theme === "dark" ? "🌙" : "☀️"} ${label}`;
}
