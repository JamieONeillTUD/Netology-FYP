// signup.js — Signup wizard and account creation.

(() => {
  "use strict";

  const API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  const ENDPOINTS = window.ENDPOINTS || {};

  // Each signup field and its empty-field error
  const FIELDS = [
    { id: "first_name", msg: "Please enter your first name." },
    { id: "last_name", msg: "Please enter your last name." },
    { id: "username", msg: "Please choose a username." },
    { id: "dob", msg: "Please select your date of birth." },
    { id: "email", msg: "Please enter your email address." },
    { id: "password", msg: "Please enter a password." },
    { id: "confirm_password", msg: "Please confirm your password." }
  ];

  // Shows a popup toast message, falls back to alert.
  function toast(msg, type = "info") {
    if (!msg) return;
    if (window.NetologyToast?.showMessageToast) {
      window.NetologyToast.showMessageToast(String(msg), type, 3200);
      return;
    }
    alert(String(msg));
  }

  // Shows the inline banner at top of the signup form.
  function showBanner(msg, type = "error") {
    if (window.NetologyToast?.showInlineBanner) {
      window.NetologyToast.showInlineBanner({
        bannerId: "signupBanner", message: msg, type,
        timeoutMs: 4500,
        fallbackToPopupType: type === "success" ? "success" : "error",
        timerKey: "signup"
      });
      return;
    }
    const el = document.getElementById("signupBanner");
    if (el) el.classList.add("d-none");
    toast(msg, type === "success" ? "success" : "error");
  }

  // Hides the signup banner.
  function hideBanner() {
    if (window.NetologyToast?.hideInlineBanner) {
      window.NetologyToast.hideInlineBanner("signupBanner", "signup");
      return;
    }
    const el = document.getElementById("signupBanner");
    if (el) el.classList.add("d-none");
  }

  // Sets up show/hide buttons on password fields.
  function initPasswordToggles() {
    document.querySelectorAll('[data-toggle="password"]').forEach((btn) => {
      if (btn.dataset.bound === "true") return;
      btn.dataset.bound = "true";

      btn.addEventListener("click", () => {
        const input = btn.getAttribute("data-target") ? document.querySelector(btn.getAttribute("data-target")) : null;
        if (!input) return;

        const hidden = input.type === "password";
        input.type = hidden ? "text" : "password";

        const icon = btn.querySelector("i");
        if (icon) icon.className = hidden ? "bi bi-eye-slash" : "bi bi-eye";
      });
    });
  }

  // Grabs all form field elements.
  function getFields() {
    const refs = {};
    FIELDS.forEach((f) => { refs[f.id] = document.getElementById(f.id); });
    return refs;
  }

  // Reads and trims all form field values.
  function getValues(fields) {
    const vals = {};
    FIELDS.forEach((f) => { vals[f.id] = String(fields[f.id]?.value || "").trim(); });
    return vals;
  }

  // Finds the first empty required field.
  function findMissing(vals) {
    return FIELDS.find((f) => !vals[f.id]) || null;
  }

  // Checks all fields, returns the first error or null.
  function validate(vals, checkRequired = true) {
    if (checkRequired) {
      const missing = findMissing(vals);
      if (missing) return missing;
    }
    if (vals.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(vals.email.trim())) {
      return { id: "email", msg: "That email format does not look right. Please check and try again." };
    }
    if (vals.password && vals.password.length < 8) {
      return { id: "password", msg: "Password must be at least 8 characters." };
    }
    if (vals.password && vals.confirm_password && vals.password !== vals.confirm_password) {
      return { id: "confirm_password", msg: "Your passwords do not match. Please confirm your password." };
    }
    return null;
  }

  // Gets the checked level radio button.
  function selectedLevel() {
    return document.querySelector('input[name="level"]:checked');
  }

  // Gets all checked reason checkboxes as an array of values.
  function selectedReasons() {
    return Array.from(document.querySelectorAll('input[name="reasons"]:checked')).map((el) => el.value);
  }

  // Shows a full-screen overlay by id.
  function openOverlay(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    el.classList.remove("d-none");
    el.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    return el;
  }

  // Fills the success overlay with confetti pieces.
  function fillConfetti(overlay) {
    if (!overlay) return;
    const box = overlay.querySelector(".net-signup-success-confetti");
    if (!box || box.childElementCount > 0) return;

    const colors = ["#06b6d4", "#14b8a6", "#38bdf8", "#67e8f9", "#a78bfa", "#0d9488", "#22d3ee"];
    for (let i = 0; i < 55; i++) {
      const piece = document.createElement("span");
      const size = 4 + Math.random() * 8;
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.width = `${size}px`;
      piece.style.height = `${size}px`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${Math.random() * 2}s`;
      piece.style.animationDuration = `${2.5 + Math.random() * 2.5}s`;
      piece.style.boxShadow = `0 0 ${size}px ${colors[Math.floor(Math.random() * colors.length)]}`;
      box.appendChild(piece);
    }
  }

  // Logs the user in right after signup so they skip the login page.
  async function autoLogin(email, password) {
    const body = new FormData();
    body.append("email", email);
    body.append("password", password);

    const loginPath = ENDPOINTS.auth?.login || "/login";
    const res = await fetch(API_BASE ? `${API_BASE}${loginPath}` : loginPath, { method: "POST", body });
    const data = await res.json();
    if (!data?.success) return false;

    const safe = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

    const session = {
      email: String(email || "").trim().toLowerCase(),
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.username,
      level: data.level,
      rank: data.rank || data.level,
      numeric_level: safe(data.numeric_level) || 1,
      xp: safe(data.xp),
      xp_into_level: safe(data.xp_into_level),
      next_level_xp: safe(data.next_level_xp) || 100,
      is_first_login: true,
      onboarding_completed: false
    };

    localStorage.setItem("user", JSON.stringify(session));
    localStorage.setItem("netology_user", JSON.stringify(session));

    const onboarding = window.NetologyOnboarding || null;
    if (onboarding?.stageUser) onboarding.stageUser(session.email, "dashboard");
    if (onboarding?.setSessionActive) onboarding.setSessionActive(true);

    return true;
  }

  // Sets up the multi-step signup wizard.
  function initWizard(form) {
    const pages = Array.from(document.querySelectorAll(".net-step-page"));
    const label = document.getElementById("stepLabel");
    const title = document.getElementById("stepTitle");
    const bar = document.getElementById("stepProgress");
    const backBtn = document.getElementById("backBtn");
    const nextBtn = document.getElementById("nextBtn");
    const submitBtn = document.getElementById("submitBtn");

    const total = 4;
    let step = 1;

    if (!form || !pages.length || !label || !title || !bar || !backBtn || !nextBtn || !submitBtn) return;

    // Clear red border when user starts typing
    FIELDS.forEach((f) => {
      const el = document.getElementById(f.id);
      if (el) el.addEventListener("input", () => el.classList.remove("is-invalid"));
    });

    backBtn.addEventListener("click", () => { if (step > 1) showStep(step - 1); });
    nextBtn.addEventListener("click", () => { if (validateStep(step) && step < total) showStep(step + 1); });

    showStep(1);

    // Switches to step n and updates the UI.
    function showStep(n) {
      step = n;
      pages.forEach((p) => p.classList.add("d-none"));
      const page = document.querySelector(`.net-step-page[data-step="${step}"]`);
      if (page) page.classList.remove("d-none");

      label.textContent = `Step ${step} of ${total}`;
      title.textContent = ["Your details", "Your level", "Your reasons", "Review"][step - 1] || "";
      bar.style.width = `${(step / total) * 100}%`;

      // Mark step pills as active/done
      document.querySelectorAll(".net-step-pill").forEach((pill) => {
        const s = Number(pill.getAttribute("data-pill") || 0);
        pill.classList.toggle("is-active", s === step);
        pill.classList.toggle("is-done", s < step);
      });

      backBtn.disabled = step === 1;
      nextBtn.classList.toggle("d-none", step === total);
      submitBtn.classList.toggle("d-none", step !== total);

      if (step === total) fillReview();
      hideBanner();
    }

    // Runs the right validation for the current step.
    function validateStep(n) {
      if (n === 1) return validateDetails();
      if (n === 2) return validateLevel();
      if (n === 3) return validateReasons();
      return true;
    }

    // Checks all personal detail fields on step 1.
    function validateDetails() {
      const fields = getFields();
      const vals = getValues(fields);
      const issue = validate(vals);
      Object.values(fields).forEach((el) => { if (el) el.classList.remove("is-invalid"); });
      if (issue) {
        const el = document.getElementById(issue.id);
        if (el) el.classList.add("is-invalid");
        showBanner(issue.msg, "warning");
        el?.focus();
        return false;
      }
      return true;
    }

    // Makes sure a level is picked on step 2.
    function validateLevel() {
      if (selectedLevel()) return true;
      showBanner("Please choose your starting level.", "warning");
      return false;
    }

    // Makes sure at least one reason is checked on step 3.
    function validateReasons() {
      if (selectedReasons().length > 0) return true;
      showBanner("Please select at least one reason to continue.", "warning");
      return false;
    }

    // Fills the review page with the user's entered values.
    function fillReview() {
      [["reviewFirst", "first_name"], ["reviewLast", "last_name"], ["reviewUser", "username"],
       ["reviewEmail", "email"], ["reviewDob", "dob"]].forEach(([rid, fid]) => {
        const el = document.getElementById(rid);
        if (el) el.textContent = document.getElementById(fid)?.value || "-";
      });
      const lvl = selectedLevel();
      const r = document.getElementById("reviewLevel");
      if (r) r.textContent = lvl ? lvl.value : "-";
      const reasons = selectedReasons();
      const rr = document.getElementById("reviewReasons");
      if (rr) rr.textContent = reasons.length ? reasons.join(", ") : "None selected";
    }
  }

  // Handles the final form submit — register, auto-login, show success.
  function initSubmit(form) {
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fields = getFields();
      const vals = getValues(fields);
      const level = selectedLevel();
      const reasons = selectedReasons();

      if (findMissing(vals)) {
        showBanner("Please complete all required fields before creating your account.", "warning");
        return;
      }
      const issue = validate(vals, false);
      if (issue) { showBanner(issue.msg, "warning"); return; }
      if (!level) { showBanner("Please choose your starting level.", "warning"); return; }
      if (!reasons.length) { showBanner("Please select at least one reason. This helps personalise your learning.", "warning"); return; }

      const raw = String(level.value || "").trim().toLowerCase();
      const tier = ["novice", "intermediate", "advanced"].includes(raw) ? raw : "novice";
      localStorage.setItem("unlock_tier_pending", tier);

      try {
        const regPath = ENDPOINTS.auth?.register || "/register";
        const res = await fetch(API_BASE ? `${API_BASE}${regPath}` : regPath, { method: "POST", body: new FormData(form) });
        const data = await res.json();

        if (!data?.success) {
          toast(data?.message || "Signup failed. Try again.", "error");
          return;
        }

        let loggedIn = false;
        try { loggedIn = await autoLogin(vals.email, vals.password); } catch { loggedIn = false; }

        const overlay = openOverlay("signupSuccessOverlay");
        if (overlay) {
          fillConfetti(overlay);
          setTimeout(() => { window.location.href = loggedIn ? "dashboard.html" : "login.html"; }, 3800);
          return;
        }

        toast(loggedIn ? "Account created! Heading to your dashboard..." : "Account created! Please sign in.", "success");
        setTimeout(() => { window.location.href = loggedIn ? "dashboard.html" : "login.html"; }, 1200);
      } catch {
        toast("Server error. Please try again.", "error");
      }
    });
  }

  // Kicks everything off when the page loads.
  function init() {
    const form = document.getElementById("signupForm");
    if (!form) return;
    initWizard(form);
    initSubmit(form);
    initPasswordToggles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
