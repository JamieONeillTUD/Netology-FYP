const LEVELS = [
  { score: 0, label: "Add more characters" },
  { score: 1, label: "Weak" },
  { score: 2, label: "Fair" },
  { score: 3, label: "Strong" },
  { score: 4, label: "Excellent" },
];

function evaluateStrength(value) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return LEVELS[score];
}

export function setupPasswordTools({ input, meter, label, toggle }) {
  const passwordInput = typeof input === "string" ? document.querySelector(input) : input;
  const meterEl = typeof meter === "string" ? document.querySelector(meter) : meter;
  const labelEl = typeof label === "string" ? document.querySelector(label) : label;
  const toggleEl = typeof toggle === "string" ? document.querySelector(toggle) : toggle;

  if (!passwordInput) return;

  passwordInput.addEventListener("input", () => {
    const level = evaluateStrength(passwordInput.value);
    if (meterEl) {
      const width = (level.score / 4) * 100;
      meterEl.style.width = `${width}%`;
    }
    if (labelEl) {
      labelEl.textContent = passwordInput.value ? `Strength: ${level.label}` : "Start typing a password";
    }
  });

  if (toggleEl) {
    toggleEl.addEventListener("click", () => {
      const isPassword = passwordInput.getAttribute("type") === "password";
      passwordInput.setAttribute("type", isPassword ? "text" : "password");
      toggleEl.textContent = isPassword ? "Hide" : "Show";
    });
  }
}
