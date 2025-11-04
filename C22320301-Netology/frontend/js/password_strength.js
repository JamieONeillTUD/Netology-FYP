/**
 * password_strength.js
 * Shared logic for password strength meter and show/hide toggle.
 * Used in signup and forgot password pages.
 */

export function setupPasswordTools(inputId, barId, toggleId) {
  const passwordInput = document.getElementById(inputId);
  const strengthBar = document.getElementById(barId);
  const togglePassword = document.getElementById(toggleId);

  if (!passwordInput || !strengthBar || !togglePassword) return;

  // --- Strength Meter ---
  passwordInput.addEventListener("input", () => {
    const val = passwordInput.value;
    let strength = 0;

    if (val.length >= 8) strength += 1;
    if (/[A-Z]/.test(val)) strength += 1;
    if (/[0-9]/.test(val)) strength += 1;
    if (/[^A-Za-z0-9]/.test(val)) strength += 1;

    switch (strength) {
      case 0:
        strengthBar.style.width = "0%";
        strengthBar.style.backgroundColor = "transparent";
        break;
      case 1:
        strengthBar.style.width = "25%";
        strengthBar.style.backgroundColor = "#dc3545"; // red
        break;
      case 2:
        strengthBar.style.width = "50%";
        strengthBar.style.backgroundColor = "#ffc107"; // orange
        break;
      case 3:
        strengthBar.style.width = "75%";
        strengthBar.style.backgroundColor = "#17a2b8"; // blue
        break;
      case 4:
        strengthBar.style.width = "100%";
        strengthBar.style.backgroundColor = "#28a745"; // green
        break;
    }
  });

  // --- Show/Hide Password ---
  togglePassword.addEventListener("click", () => {
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    togglePassword.textContent = type === "password" ? "Show Password" : "Hide Password";
  });
}
