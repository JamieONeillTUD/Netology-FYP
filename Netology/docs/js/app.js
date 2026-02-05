/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript
---------------------------------------
app.js – Handles authentication on the frontend.

Includes:
- Signup wizard logic (signup.html) — moved from inline script into this file
- Signup validation + POST /register
- Login validation + POST /login + inline banner (login.html)
- Modern toast popup feedback (showPopup) consistent with Netology theme

Notes:
- Uses window.API_BASE injected into each page (Render deployment)
- Respects prefers-reduced-motion for animations
*/

// Safety: ensure API base is never undefined
const API_BASE = (window.API_BASE || "").replace(/\/$/, "");

document.addEventListener("DOMContentLoaded", () => {

  /* =========================================================
     SIGNUP WIZARD (signup.html)
     - Controls steps, buttons, progress bar, and review panel
     - Prevents moving forward unless current step is valid
  ========================================================== */
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    initSignupWizard(signupForm);
  }

  /* =========================================================
     SIGNUP SUBMISSION (signup.html)
     - Validates final payload and sends to backend
  ========================================================== */
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const first = document.getElementById("first_name")?.value.trim();
      const last = document.getElementById("last_name")?.value.trim();
      const username = document.getElementById("username")?.value.trim();
      const dob = document.getElementById("dob")?.value;
      const email = document.getElementById("email")?.value.trim();
      const password = document.getElementById("password")?.value.trim();
      const confirm = document.getElementById("confirm_password")?.value.trim();

      const level = document.querySelector('input[name="level"]:checked');
      const reasons = document.querySelectorAll('input[name="reasons"]:checked');

      // Strong barriers (final check)
      if (!first || !last || !username || !dob || !email || !password || !confirm) {
        showSignupBanner("Please complete all required fields before creating your account.", "warning");
        return;
      }

      if (!isValidEmail(email)) {
        showSignupBanner("That email format doesn’t look right. Please check and try again.", "warning");
        return;
      }

      if (password.length < 8) {
        showSignupBanner("Password must be at least 8 characters.", "warning");
        return;
      }

      if (password !== confirm) {
        showSignupBanner("Your passwords do not match. Please confirm your password.", "warning");
        return;
      }

      if (!level) {
        showSignupBanner("Please choose your starting level.", "warning");
        return;
      }

      if (reasons.length === 0) {
        showSignupBanner("Please select at least one reason (this helps personalise your learning).", "warning");
        return;
      }

      // Send data to backend
      try {
        const res = await fetch(`${API_BASE}/register`, {
          method: "POST",
          body: new FormData(signupForm),
        });

        const data = await res.json();

        if (data.success) {
          showPopup("Account created! Redirecting to login…", "success");
          setTimeout(() => {
            window.location.href = "login.html";
          }, 1200);
        } else {
          showPopup(data.message || "Signup failed. Try again.", "error");
        }
      } catch {
        showPopup("Server error. Please try again.", "error");
      }
    });
  }

  /* =========================================================
     LOGIN (login.html)
     - Validation barriers + inline banner
     - Keeps backend call identical (/login)
  ========================================================== */
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    const toggleButtons = document.querySelectorAll('[data-toggle="password"]');
    toggleButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetSel = btn.getAttribute("data-target");
        const input = targetSel ? document.querySelector(targetSel) : null;
        if (!input) return;

        const isHidden = input.getAttribute("type") === "password";
        input.setAttribute("type", isHidden ? "text" : "password");

        btn.setAttribute("aria-pressed", String(isHidden));
        btn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");

        const icon = btn.querySelector("i");
        if (icon) icon.className = isHidden ? "bi bi-eye-slash" : "bi bi-eye";
      });
    });

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const emailEl = document.getElementById("email");
      const passwordEl = document.getElementById("password");

      const email = (emailEl?.value || "").trim();
      const password = (passwordEl?.value || "").trim();

      setInvalid(emailEl, false);
      setInvalid(passwordEl, false);

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

      try {
        const res = await fetch(`${API_BASE}/login`, {
          method: "POST",
          body: new FormData(loginForm),
        });

        const data = await res.json();

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
          setInvalid(emailEl, true);
          setInvalid(passwordEl, true);
          showLoginBanner(data.message || "Incorrect email or password. Please try again.", "error");
        }
      } catch {
        showLoginBanner("Can’t reach the server right now. Please check your connection and try again.", "error");
      }
    });
  }

  /* =========================================================
     PASSWORD TOGGLES (signup.html + login.html)
     - Works for any button with data-toggle="password"
  ========================================================== */
  const globalToggles = document.querySelectorAll('[data-toggle="password"]');
  globalToggles.forEach((btn) => {
    // login has its own, signup uses same attribute — safe to attach
    if (btn._netBound) return;
    btn._netBound = true;

    btn.addEventListener("click", () => {
      const targetSel = btn.getAttribute("data-target");
      const input = targetSel ? document.querySelector(targetSel) : null;
      if (!input) return;

      const isHidden = input.getAttribute("type") === "password";
      input.setAttribute("type", isHidden ? "text" : "password");

      btn.setAttribute("aria-pressed", String(isHidden));
      btn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");

      const icon = btn.querySelector("i");
      if (icon) icon.className = isHidden ? "bi bi-eye-slash" : "bi bi-eye";
    });
  });
});

/* =========================================================
   SIGNUP WIZARD IMPLEMENTATION
========================================================= */

function initSignupWizard(form) {
  let step = 1;
  const totalSteps = 4;

  const stepLabel = document.getElementById("stepLabel");
  const stepTitle = document.getElementById("stepTitle");
  const stepProgress = document.getElementById("stepProgress");
  const backBtn = document.getElementById("backBtn");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");

  const pages = Array.from(document.querySelectorAll(".net-step-page"));
  const titles = { 1: "Your details", 2: "Your level", 3: "Your reasons", 4: "Review" };

  // If the wizard UI isn't present, don't break the page
  if (!pages.length || !stepLabel || !stepTitle || !stepProgress || !backBtn || !nextBtn || !submitBtn) {
    return;
  }

  // Live invalid clearing on input
  const clearInvalidOnInput = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => setInvalid(el, false));
  };

  ["first_name", "last_name", "username", "dob", "email", "password", "confirm_password"].forEach(clearInvalidOnInput);

  // Next/back
  backBtn.addEventListener("click", () => {
    if (step > 1) showStep(step - 1);
  });

  nextBtn.addEventListener("click", () => {
    if (!validateStep(step)) return;
    if (step < totalSteps) showStep(step + 1);
  });

  // Show first step
  showStep(1);

  function showStep(n) {
    step = n;

    pages.forEach(p => p.classList.add("d-none"));
    const page = document.querySelector(`.net-step-page[data-step="${step}"]`);
    if (page) page.classList.remove("d-none");

    stepLabel.textContent = `Step ${step} of ${totalSteps}`;
    stepTitle.textContent = titles[step] || "";
    stepProgress.style.width = `${(step / totalSteps) * 100}%`;

    // Step pills (optional UI)
    const pills = document.querySelectorAll(".net-step-pill");
    pills.forEach((pill) => {
      const s = Number(pill.getAttribute("data-pill"));
      pill.classList.toggle("is-active", s === step);
      pill.classList.toggle("is-done", s < step);
    });

    backBtn.disabled = step === 1;

    if (step === totalSteps) {
      nextBtn.classList.add("d-none");
      submitBtn.classList.remove("d-none");
      fillReview();
    } else {
      nextBtn.classList.remove("d-none");
      submitBtn.classList.add("d-none");
    }

    // Clear banner when moving steps
    hideSignupBanner();
  }

  function validateStep(currentStep) {
    if (currentStep === 1) return validateStep1();
    if (currentStep === 2) return validateStep2();
    if (currentStep === 3) return validateStep3();
    return true;
  }

  function validateStep1() {
    const first = document.getElementById("first_name");
    const last = document.getElementById("last_name");
    const user = document.getElementById("username");
    const dob = document.getElementById("dob");
    const email = document.getElementById("email");
    const pass = document.getElementById("password");
    const conf = document.getElementById("confirm_password");

    // Reset invalid
    [first, last, user, dob, email, pass, conf].forEach((el) => setInvalid(el, false));

    if (!first?.value.trim()) { setInvalid(first, true); showSignupBanner("Please enter your first name.", "warning"); first?.focus(); return false; }
    if (!last?.value.trim())  { setInvalid(last, true);  showSignupBanner("Please enter your last name.", "warning"); last?.focus(); return false; }
    if (!user?.value.trim())  { setInvalid(user, true);  showSignupBanner("Please choose a username.", "warning"); user?.focus(); return false; }
    if (!dob?.value)          { setInvalid(dob, true);   showSignupBanner("Please select your date of birth.", "warning"); dob?.focus(); return false; }

    const emailVal = email?.value.trim() || "";
    if (!emailVal)            { setInvalid(email, true); showSignupBanner("Please enter your email address.", "warning"); email?.focus(); return false; }
    if (!isValidEmail(emailVal)) { setInvalid(email, true); showSignupBanner("That email format doesn’t look right. Please check and try again.", "warning"); email?.focus(); return false; }

    const passVal = pass?.value.trim() || "";
    const confVal = conf?.value.trim() || "";
    if (!passVal)             { setInvalid(pass, true);  showSignupBanner("Please enter a password.", "warning"); pass?.focus(); return false; }
    if (passVal.length < 8)   { setInvalid(pass, true);  showSignupBanner("Password must be at least 8 characters.", "warning"); pass?.focus(); return false; }
    if (!confVal)             { setInvalid(conf, true);  showSignupBanner("Please confirm your password.", "warning"); conf?.focus(); return false; }
    if (passVal !== confVal)  { setInvalid(conf, true);  showSignupBanner("Passwords do not match. Please confirm again.", "warning"); conf?.focus(); return false; }

    return true;
  }

  function validateStep2() {
    const lvl = document.querySelector('input[name="level"]:checked');
    if (!lvl) {
      showSignupBanner("Please choose your starting level.", "warning");
      return false;
    }
    return true;
  }

  function validateStep3() {
    const reasons = document.querySelectorAll('input[name="reasons"]:checked');
    if (!reasons || reasons.length === 0) {
      showSignupBanner("Please select at least one reason to continue.", "warning");
      return false;
    }
    return true;
  }

  function fillReview() {
    setText("reviewFirst", document.getElementById("first_name")?.value || "-");
    setText("reviewLast", document.getElementById("last_name")?.value || "-");
    setText("reviewUser", document.getElementById("username")?.value || "-");
    setText("reviewEmail", document.getElementById("email")?.value || "-");
    setText("reviewDob", document.getElementById("dob")?.value || "-");

    const lvl = document.querySelector('input[name="level"]:checked');
    setText("reviewLevel", lvl ? lvl.value : "-");

    const reasons = Array.from(document.querySelectorAll('input[name="reasons"]:checked')).map(x => x.value);
    setText("reviewReasons", reasons.length ? reasons.join(", ") : "None selected");
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
}

/* =========================================================
   INLINE BANNERS (login.html + signup.html)
========================================================= */

function showLoginBanner(message, type) {
  const banner = document.getElementById("loginBanner");
  if (!banner) { showPopup(message, type === "success" ? "success" : "error"); return; }

  banner.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
  banner.classList.add("alert");

  if (type === "success") banner.classList.add("alert-success");
  else if (type === "warning") banner.classList.add("alert-warning");
  else banner.classList.add("alert-danger");

  banner.textContent = message;

  window.clearTimeout(showLoginBanner._t);
  showLoginBanner._t = window.setTimeout(() => banner.classList.add("d-none"), 4000);
}

function showSignupBanner(message, type) {
  const banner = document.getElementById("signupBanner");
  if (!banner) { showPopup(message, type === "success" ? "success" : "error"); return; }

  banner.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
  banner.classList.add("alert");

  if (type === "success") banner.classList.add("alert-success");
  else if (type === "warning") banner.classList.add("alert-warning");
  else banner.classList.add("alert-danger");

  banner.textContent = message;

  window.clearTimeout(showSignupBanner._t);
  showSignupBanner._t = window.setTimeout(() => banner.classList.add("d-none"), 4500);
}

function hideSignupBanner() {
  const banner = document.getElementById("signupBanner");
  if (!banner) return;
  banner.classList.add("d-none");
}

/* =========================================================
   FORGOT PASSWORD (forgot.html) – EMAIL ONLY
========================================================= */
const forgotForm = document.getElementById("forgotForm");

if (forgotForm) {
  const emailEl = document.getElementById("fp_email");
  const passEl = document.getElementById("fp_password");
  const confEl = document.getElementById("fp_confirm");

  const formView = document.getElementById("forgotFormView");
  const successView = document.getElementById("forgotSuccessView");

  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    setInvalid(emailEl, false);
    setInvalid(passEl, false);
    setInvalid(confEl, false);

    const email = emailEl.value.trim();
    const password = passEl.value.trim();
    const confirm = confEl.value.trim();

    if (!isValidEmail(email)) {
      setInvalid(emailEl, true);
      showForgotBanner("Please enter a valid email address.", "warning");
      return;
    }

    if (password.length < 8) {
      setInvalid(passEl, true);
      showForgotBanner("Password must be at least 8 characters.", "warning");
      return;
    }

    if (password !== confirm) {
      setInvalid(confEl, true);
      showForgotBanner("Passwords do not match.", "warning");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success) {
        showPopup("Password updated successfully.", "success");
        formView.classList.add("d-none");
        successView.classList.remove("d-none");
      } else {
        showForgotBanner(data.message || "Reset failed.", "error");
      }
    } catch {
      showForgotBanner("Server error. Please try again.", "error");
    }
  });
}

function showForgotBanner(message, type) {
  const banner = document.getElementById("forgotBanner");
  if (!banner) { showPopup(message, type === "success" ? "success" : "error"); return; }

  banner.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
  banner.classList.add("alert");

  if (type === "success") banner.classList.add("alert-success");
  else if (type === "warning") banner.classList.add("alert-warning");
  else banner.classList.add("alert-danger");

  banner.textContent = message;

  window.clearTimeout(showForgotBanner._t);
  showForgotBanner._t = window.setTimeout(() => banner.classList.add("d-none"), 4500);
}

function hideForgotBanner() {
  const banner = document.getElementById("forgotBanner");
  if (!banner) return;
  banner.classList.add("d-none");
}

/* =========================================================
   SHARED HELPERS
========================================================= */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim());
}

function setInvalid(el, isInvalid) {
  if (!el) return;
  if (isInvalid) el.classList.add("is-invalid");
  else el.classList.remove("is-invalid");
}

/* =========================================================
   Modern Toast Popup (Netology themed)
========================================================= */

function showPopup(message, type) {
  const old = document.getElementById("alertBox");
  if (old) old.remove();

  const popup = document.createElement("div");
  popup.id = "alertBox";
  popup.className = "net-toast net-toast-enter";
  popup.setAttribute("role", "status");
  popup.setAttribute("aria-live", "polite");
  popup.dataset.type = type || "info";

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

  const closeBtn = popup.querySelector(".net-toast-close");
  const dismiss = () => {
    popup.classList.remove("net-toast-enter");
    popup.classList.add("net-toast-exit");
    setTimeout(() => popup.remove(), 220);
  };

  closeBtn?.addEventListener("click", dismiss);
  popup.addEventListener("click", (e) => {
    if (e.target && e.target.closest(".net-toast-close")) return;
    dismiss();
  });

  setTimeout(dismiss, 3200);
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
