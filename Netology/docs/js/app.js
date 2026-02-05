/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript
---------------------------------------
app.js – Handles authentication on the frontend.

Purpose:
- Signup form validation + sending signup data to backend
- Login form submission + saving user info
- User feedback via popups (global) and inline login banner (login.html)
- Small UX helpers (password show/hide toggle on login)

Notes:
- Uses window.API_BASE injected into each page (Render deployment)
- Keeps original showPopup() for consistent feedback across the app
- Adds a login-specific banner for clearer mobile UX (email/password issues)
*/

// NEW (C3 safety): ensure API base is never undefined
const API_BASE = (window.API_BASE || "").replace(/\/$/, "");

document.addEventListener("DOMContentLoaded", () => {
  /* =========================================================
     SIGNUP FORM HANDLING (signup.html)
     - Checks inputs
     - Validates
     - Sends data to backend
  ========================================================== */
  const signupForm = document.getElementById("signupForm");

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Get field values from the form
      const first = document.getElementById("first_name").value.trim();
      const last = document.getElementById("last_name").value.trim();
      const username = document.getElementById("username").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      const level = document.querySelector('input[name="level"]:checked');
      const reasons = document.querySelectorAll('input[name="reasons"]:checked');

      // Validation checks
      if (!first || !last || !username || !email || !password) {
        showPopup("Please fill in all required fields.", "error");
        return;
      }

      if (!isValidEmail(email)) {
        showPopup("Enter a valid email address.", "error");
        return;
      }

      if (password.length < 8) {
        showPopup("Password must be at least 8 characters.", "error");
        return;
      }

      if (!level) {
        showPopup("Please select your networking level.", "error");
        return;
      }

      if (reasons.length === 0) {
        showPopup("Please select at least one reason.", "error");
        return;
      }

      // Send data to backend for registration
      try {
        const res = await fetch(`${API_BASE}/register`, {
          method: "POST",
          body: new FormData(signupForm),
        });

        const data = await res.json();

        if (data.success) {
          showPopup("Account created! Redirecting...", "success");

          // Redirect user to login page after short delay
          setTimeout(() => {
            window.location.href = "login.html";
          }, 1500);
        } else {
          showPopup(data.message || "Signup failed. Try again.", "error");
        }
      } catch {
        showPopup("Server error. Please try again.", "error");
      }
    });
  }

  /* =========================================================
     LOGIN FORM HANDLING (login.html)
     UPDATED:
     - Strong validation barriers
     - Inline banner messages (better mobile UX)
     - Password show/hide toggle
     - Keeps backend call identical (/login)
  ========================================================== */
  const loginForm = document.getElementById("loginForm");

  // Helper: inline banner (login page only)
  function showLoginBanner(message, type) {
    const banner = document.getElementById("loginBanner");

    // Fallback: if banner doesn't exist (other pages), use popup
    if (!banner) {
      showPopup(message, type === "success" ? "success" : "error");
      return;
    }

    // Reset banner state
    banner.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
    banner.classList.add("alert");

    // Colour by type
    if (type === "success") banner.classList.add("alert-success");
    else if (type === "warning") banner.classList.add("alert-warning");
    else banner.classList.add("alert-danger");

    banner.textContent = message;

    // Auto hide after 4 seconds (more readable on mobile)
    window.clearTimeout(showLoginBanner._t);
    showLoginBanner._t = window.setTimeout(() => {
      banner.classList.add("d-none");
    }, 4000);
  }

  // Helper: set invalid UI state on fields (Bootstrap style)
  function setInvalid(el, isInvalid) {
    if (!el) return;
    if (isInvalid) el.classList.add("is-invalid");
    else el.classList.remove("is-invalid");
  }

  // Password show/hide toggle (if present on login page)
  if (loginForm) {
    const toggleBtn = document.getElementById("togglePassword");
    const passEl = document.getElementById("password");

    if (toggleBtn && passEl) {
      toggleBtn.addEventListener("click", () => {
        const isHidden = passEl.getAttribute("type") === "password";
        passEl.setAttribute("type", isHidden ? "text" : "password");

        toggleBtn.setAttribute("aria-pressed", String(isHidden));
        toggleBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");

        const icon = toggleBtn.querySelector("i");
        if (icon) {
          icon.className = isHidden ? "bi bi-eye-slash" : "bi bi-eye";
        }
      });
    }

    // Live validation: clear invalid state as user types
    const emailElLive = document.getElementById("email");
    const passElLive = document.getElementById("password");

    if (emailElLive) {
      emailElLive.addEventListener("input", () => setInvalid(emailElLive, false));
      emailElLive.addEventListener("blur", () => {
        const v = String(emailElLive.value || "").trim();
        if (v && !isValidEmail(v)) setInvalid(emailElLive, true);
      });
    }

    if (passElLive) {
      passElLive.addEventListener("input", () => setInvalid(passElLive, false));
      passElLive.addEventListener("blur", () => {
        const v = String(passElLive.value || "");
        if (v && v.length < 8) setInvalid(passElLive, true);
      });
    }

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const emailEl = document.getElementById("email");
      const passwordEl = document.getElementById("password");

      const email = (emailEl?.value || "").trim();
      const password = (passwordEl?.value || "").trim();

      // Reset invalid styles
      setInvalid(emailEl, false);
      setInvalid(passwordEl, false);

      // Validation barriers
      if (!email) {
        setInvalid(emailEl, true);
        showLoginBanner("Please enter your email address.", "warning");
        emailEl?.focus();
        return;
      }

      if (!isValidEmail(email)) {
        setInvalid(emailEl, true);
        showLoginBanner("That email format doesn’t look right. Please check and try again.", "warning");
        emailEl?.focus();
        return;
      }

      if (!password) {
        setInvalid(passwordEl, true);
        showLoginBanner("Please enter your password.", "warning");
        passwordEl?.focus();
        return;
      }

      if (password.length < 8) {
        setInvalid(passwordEl, true);
        showLoginBanner("Password must be at least 8 characters.", "warning");
        passwordEl?.focus();
        return;
      }

      // Send login form to backend
      try {
        const res = await fetch(`${API_BASE}/login`, {
          method: "POST",
          body: new FormData(loginForm),
        });

        const data = await res.json();

        // If login successful, save user data and send to dashboard
        if (data.success) {
          localStorage.setItem("user", JSON.stringify({
            email: email,
            first_name: data.first_name,
            level: data.level,
            xp: data.xp,
          }));

          showLoginBanner(`Welcome back, ${data.first_name}! Redirecting…`, "success");

          setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 900);
        } else {
          // Backend typically returns a combined error
          setInvalid(emailEl, true);
          setInvalid(passwordEl, true);

          const msg = data.message || "Incorrect email or password. Please try again.";
          showLoginBanner(msg, "error");
        }
      } catch {
        showLoginBanner("Can’t reach the server right now. Please check your connection and try again.", "error");
      }
    });
  }
});

/* =========================================================
   SHARED HELPERS (All pages)
========================================================= */

// Email validation helper (used by signup + login)
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim());
}

// AI Prompted Code Below:
// "Can you Please write me a pop up alert function in JavaScript that displays a message to the user
// The function should accept a message string and a type (success, error, info) and style the popup accordingly.
// The popup should automatically disappear after 2.5 seconds."
function showPopup(message, type) {
  // Remove any existing popup before creating a new one
  const old = document.getElementById("alertBox");
  if (old) old.remove();

  // Create popup container
  const popup = document.createElement("div");
  popup.id = "alertBox";
  popup.className = "net-toast net-toast-enter";
  popup.setAttribute("role", "status");
  popup.setAttribute("aria-live", "polite");

  // Type styling
  // success | error | info
  popup.dataset.type = type || "info";

  // Content
  popup.innerHTML = `
    <div class="net-toast-inner">
      <div class="net-toast-icon" aria-hidden="true"></div>
      <div class="net-toast-text">${escapeHtml(String(message || ""))}</div>
      <button class="net-toast-close" type="button" aria-label="Dismiss message">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  `;

  document.body.appendChild(popup);

  // Close button + tap anywhere to dismiss (mobile friendly)
  const closeBtn = popup.querySelector(".net-toast-close");
  const dismiss = () => {
    popup.classList.remove("net-toast-enter");
    popup.classList.add("net-toast-exit");
    setTimeout(() => popup.remove(), 220);
  };

  closeBtn?.addEventListener("click", dismiss);
  popup.addEventListener("click", (e) => {
    // Don't double-trigger on button click
    if (e.target && e.target.closest(".net-toast-close")) return;
    dismiss();
  });

  // Auto-remove after 3.2 seconds (a bit longer + smoother on mobile)
  setTimeout(dismiss, 3200);
}

// Small helper to prevent HTML injection
function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
