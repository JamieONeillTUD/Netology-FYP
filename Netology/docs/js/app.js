/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript
---------------------------------------
app.js – Handles authentication on the frontend.

Includes:
- Signup wizard logic (signup.html)
- Signup validation + POST /register
- Login validation + POST /login + inline banner (login.html)
- Modern toast popup feedback (showPopup) consistent with Netology theme

UPDATED (Dashboard unlock tier support):
- Stores the user’s selected unlock tier (novice/intermediate/advanced) in localStorage
  so dashboard can lock/unlock courses by tier WITHOUT changing numeric level/XP.

Notes:
- Uses window.API_BASE injected into each page (Render deployment)
- Respects prefers-reduced-motion for animations
*/

// Safety: ensure API base is never undefined
const API_BASE = (window.API_BASE || "").replace(/\/$/, "");

const getById = (id) => document.getElementById(id);

function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

function parseJsonSafe(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

onReady(() => {
  const signupForm = getById("signupForm");
  if (signupForm) {
    initSignupWizard(signupForm);
    wireSignupSubmit(signupForm);
  }

  const loginForm = getById("loginForm");
  if (loginForm) {
    wireLoginSubmit(loginForm);
  }

  initForgotForm();
  wirePasswordToggles();
});

/* AI Prompt: Explain the SIGNUP SUBMISSION (signup.html) section in clear, simple terms. */
/* =========================================================
   SIGNUP SUBMISSION (signup.html)
========================================================= */

function wireSignupSubmit(form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const first = getById("first_name")?.value.trim();
    const last = getById("last_name")?.value.trim();
    const username = getById("username")?.value.trim();
    const dob = getById("dob")?.value;
    const email = getById("email")?.value.trim();
    const password = getById("password")?.value.trim();
    const confirm = getById("confirm_password")?.value.trim();

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

    // NEW: Save the chosen tier so dashboard can unlock by tier later.
    // This does NOT affect numeric level or XP.
    const selectedTier = String(level?.value || "novice").trim().toLowerCase();

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        body: new FormData(form),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("unlock_tier_pending", selectedTier);

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

/* AI Prompt: Explain the LOGIN (login.html) section in clear, simple terms. */
/* =========================================================
   LOGIN (login.html)
========================================================= */

function wireLoginSubmit(form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailEl = getById("email");
    const passwordEl = getById("password");

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
        body: new FormData(form),
      });

      const data = await res.json();

      if (data.success) {
        // Prefer an existing tier if we already stored it, else use pending signup tier, else default.
        const pendingTier = String(localStorage.getItem("unlock_tier_pending") || "").trim().toLowerCase();
        const existingUser = parseJsonSafe(localStorage.getItem("user"), {}) || {};
        const existingTier = String(existingUser.unlock_tier || existingUser.unlock_level || existingUser.unlockTier || "")
          .trim()
          .toLowerCase();

        const serverTier = String(data.start_level || "").trim().toLowerCase();
        let unlockTier = serverTier || existingTier || pendingTier || "novice";
        if (!["novice", "intermediate", "advanced"].includes(unlockTier)) unlockTier = "novice";

        const loginPayload = {
          email: email,
          first_name: data.first_name,
          last_name: data.last_name,
          username: data.username,
          level: data.level,     // keep existing field (backwards compatible)
          rank: data.rank || data.level,
          numeric_level: Number.isFinite(Number(data.numeric_level)) ? Number(data.numeric_level) : undefined,
          xp: data.xp,
          xp_into_level: Number.isFinite(Number(data.xp_into_level)) ? Number(data.xp_into_level) : undefined,
          next_level_xp: Number.isFinite(Number(data.next_level_xp)) ? Number(data.next_level_xp) : undefined,

          // NEW: dashboard uses this to unlock content tiers
          unlock_tier: unlockTier
        };

        localStorage.setItem("user", JSON.stringify(loginPayload));
        localStorage.setItem("netology_user", JSON.stringify(loginPayload));
        localStorage.setItem("netology_last_email", email);

        // Login streak tracking + badge awards
        recordLoginDay(email);
        const streak = computeLoginStreak(getLoginLog(email));
        await awardLoginStreakBadges(email, streak);

        // Once used, clear the pending value
        if (pendingTier) localStorage.removeItem("unlock_tier_pending");

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

/* AI Prompt: Explain the PASSWORD TOGGLES (signup.html + login.html) section in clear, simple terms. */
/* =========================================================
   PASSWORD TOGGLES (signup.html + login.html)
========================================================= */

function wirePasswordToggles() {
  const toggles = document.querySelectorAll('[data-toggle="password"]');
  toggles.forEach((btn) => {
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
}

/* AI Prompt: Explain the SIGNUP WIZARD IMPLEMENTATION section in clear, simple terms. */
/* =========================================================
   SIGNUP WIZARD IMPLEMENTATION
========================================================= */

function initSignupWizard(form) {
  let step = 1;
  const totalSteps = 4;

  const stepLabel = getById("stepLabel");
  const stepTitle = getById("stepTitle");
  const stepProgress = getById("stepProgress");
  const backBtn = getById("backBtn");
  const nextBtn = getById("nextBtn");
  const submitBtn = getById("submitBtn");

  const pages = Array.from(document.querySelectorAll(".net-step-page"));
  const titles = { 1: "Your details", 2: "Your level", 3: "Your reasons", 4: "Review" };

  // If the wizard UI isn't present, don't break the page
  if (!pages.length || !stepLabel || !stepTitle || !stepProgress || !backBtn || !nextBtn || !submitBtn) {
    return;
  }

  // Live invalid clearing on input
  const clearInvalidOnInput = (id) => {
    const el = getById(id);
    if (!el) return;
    el.addEventListener("input", () => setInvalid(el, false));
  };

  ["first_name", "last_name", "username", "dob", "email", "password", "confirm_password"].forEach(clearInvalidOnInput);

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

    pages.forEach((p) => p.classList.add("d-none"));
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
    const first = getById("first_name");
    const last = getById("last_name");
    const user = getById("username");
    const dob = getById("dob");
    const email = getById("email");
    const pass = getById("password");
    const conf = getById("confirm_password");

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
    setText("reviewFirst", getById("first_name")?.value || "-");
    setText("reviewLast", getById("last_name")?.value || "-");
    setText("reviewUser", getById("username")?.value || "-");
    setText("reviewEmail", getById("email")?.value || "-");
    setText("reviewDob", getById("dob")?.value || "-");

    const lvl = document.querySelector('input[name="level"]:checked');
    setText("reviewLevel", lvl ? lvl.value : "-");

    const reasons = Array.from(document.querySelectorAll('input[name="reasons"]:checked')).map((x) => x.value);
    setText("reviewReasons", reasons.length ? reasons.join(", ") : "None selected");
  }

  function setText(id, text) {
    const el = getById(id);
    if (el) el.textContent = text;
  }
}

/* AI Prompt: Explain the FORGOT PASSWORD (forgot.html) – EMAIL ONLY section in clear, simple terms. */
/* =========================================================
   FORGOT PASSWORD (forgot.html) – EMAIL ONLY
========================================================= */

function initForgotForm() {
  const form = getById("forgotForm");
  if (!form) return;

  const emailEl = getById("fp_email");
  const passEl = getById("fp_password");
  const confEl = getById("fp_confirm");

  const formView = getById("forgotFormView");
  const successView = getById("forgotSuccessView");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    setInvalid(emailEl, false);
    setInvalid(passEl, false);
    setInvalid(confEl, false);

    const email = (emailEl?.value || "").trim();
    const password = (passEl?.value || "").trim();
    const confirm = (confEl?.value || "").trim();

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
        formView?.classList.add("d-none");
        successView?.classList.remove("d-none");
      } else {
        showForgotBanner(data.message || "Reset failed.", "error");
      }
    } catch {
      showForgotBanner("Server error. Please try again.", "error");
    }
  });
}

/* AI Prompt: Explain the INLINE BANNERS (login.html + signup.html + forgot.html) section in clear, simple terms. */
/* =========================================================
   INLINE BANNERS (login.html + signup.html + forgot.html)
========================================================= */

function showLoginBanner(message, type) {
  const banner = getById("loginBanner");
  if (!banner) { showPopup(message, type === "success" ? "success" : "error"); return; }

  banner.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
  banner.classList.add("alert");

  if (type === "success") banner.classList.add("alert-success");
  else if (type === "warning") banner.classList.add("alert-warning");
  else banner.classList.add("alert-danger");

  setBannerContent(banner, type, message);

  window.clearTimeout(showLoginBanner._t);
  showLoginBanner._t = window.setTimeout(() => banner.classList.add("d-none"), 4000);
}

function showSignupBanner(message, type) {
  const banner = getById("signupBanner");
  if (!banner) { showPopup(message, type === "success" ? "success" : "error"); return; }

  banner.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
  banner.classList.add("alert");

  if (type === "success") banner.classList.add("alert-success");
  else if (type === "warning") banner.classList.add("alert-warning");
  else banner.classList.add("alert-danger");

  setBannerContent(banner, type, message);

  window.clearTimeout(showSignupBanner._t);
  showSignupBanner._t = window.setTimeout(() => banner.classList.add("d-none"), 4500);
}

function hideSignupBanner() {
  const banner = getById("signupBanner");
  if (!banner) return;
  banner.classList.add("d-none");
}

function showForgotBanner(message, type) {
  const banner = getById("forgotBanner");
  if (!banner) { showPopup(message, type === "success" ? "success" : "error"); return; }

  banner.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
  banner.classList.add("alert");

  if (type === "success") banner.classList.add("alert-success");
  else if (type === "warning") banner.classList.add("alert-warning");
  else banner.classList.add("alert-danger");

  setBannerContent(banner, type, message);

  window.clearTimeout(showForgotBanner._t);
  showForgotBanner._t = window.setTimeout(() => banner.classList.add("d-none"), 4500);
}

function hideForgotBanner() {
  const banner = getById("forgotBanner");
  if (!banner) return;
  banner.classList.add("d-none");
}

function buildBannerIcon(type) {
  const t = String(type || "").toLowerCase();
  const cls = t === "success"
    ? "bi-check-circle-fill"
    : t === "warning"
      ? "bi-exclamation-triangle-fill"
      : "bi-x-circle-fill";

  const wrap = document.createElement("span");
  wrap.className = "net-banner-icon";
  wrap.setAttribute("aria-hidden", "true");

  const icon = document.createElement("i");
  icon.className = `bi ${cls}`;
  wrap.appendChild(icon);
  return wrap;
}

function setBannerContent(banner, type, message) {
  if (!banner) return;
  banner.replaceChildren();
  const icon = buildBannerIcon(type);
  const text = document.createTextNode(String(message || ""));
  banner.append(icon, text);
}

/* AI Prompt: Explain the LOGIN STREAKS + BADGES (localStorage) section in clear, simple terms. */
/* =========================================================
   LOGIN STREAKS + BADGES (localStorage)
========================================================= */

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getLoginLog(email) {
  try {
    return JSON.parse(localStorage.getItem(`netology_login_log:${email}`) || "[]");
  } catch {
    return [];
  }
}

function saveLoginLog(email, log) {
  localStorage.setItem(`netology_login_log:${email}`, JSON.stringify(log));
}

function recordLoginDay(email) {
  if (!email) return [];
  const log = getLoginLog(email);
  const today = dateKey();
  if (!log.includes(today)) {
    log.push(today);
    log.sort();
    saveLoginLog(email, log);
  }
  try {
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (base) {
      fetch(`${base}/record-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      }).catch(() => {});
    }
  } catch {}
  return log;
}

function computeLoginStreak(log) {
  if (!Array.isArray(log) || !log.length) return 0;
  const set = new Set(log);
  let streak = 0;
  const cursor = new Date();
  while (set.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getBadges(email) {
  try {
    return JSON.parse(localStorage.getItem(`netology_badges:${email}`) || "[]");
  } catch {
    return [];
  }
}

function saveBadges(email, badges) {
  localStorage.setItem(`netology_badges:${email}`, JSON.stringify(badges));
}

function totalXpForLevel(level) {
  const lvl = Math.max(1, Number(level) || 1);
  return 100 * (lvl - 1) * lvl / 2;
}

function levelFromTotalXp(totalXp) {
  const xp = Math.max(0, Number(totalXp) || 0);
  const t = xp / 100;
  const lvl = Math.floor((1 + Math.sqrt(1 + 8 * t)) / 2);
  return Math.max(1, lvl);
}

function xpForNextLevel(level) {
  const lvl = Math.max(1, Number(level) || 1);
  return 100 * lvl;
}

function rankForLevel(level) {
  if (Number(level) >= 5) return "Advanced";
  if (Number(level) >= 3) return "Intermediate";
  return "Novice";
}

function applyXpToUser(user, addXP) {
  const nextTotal = Math.max(0, Number(user?.xp || 0) + Number(addXP || 0));
  const level = levelFromTotalXp(nextTotal);
  const levelStart = totalXpForLevel(level);
  const currentLevelXP = Math.max(0, nextTotal - levelStart);
  const xpNext = xpForNextLevel(level);
  const rank = rankForLevel(level);
  return {
    ...user,
    xp: nextTotal,
    numeric_level: level,
    xp_into_level: currentLevelXP,
    next_level_xp: xpNext,
    level: rank,
    rank
  };
}

function bumpUserXP(email, delta) {
  if (!delta) return;
  const rawUser = parseJsonSafe(localStorage.getItem("user"), null);
  if (rawUser && rawUser.email === email) {
    const updated = applyXpToUser(rawUser, delta);
    localStorage.setItem("user", JSON.stringify(updated));
  }
  const rawNet = parseJsonSafe(localStorage.getItem("netology_user"), null);
  if (rawNet && rawNet.email === email) {
    const updated = applyXpToUser(rawNet, delta);
    localStorage.setItem("netology_user", JSON.stringify(updated));
  }
}

function loginBadgeDefs() {
  return [
    { id: "login-streak-3", name: "3-Day Streak", description: "Log in 3 days in a row", target: 3, xp: 50 },
    { id: "login-streak-5", name: "5-Day Streak", description: "Log in 5 days in a row", target: 5, xp: 75 },
    { id: "login-streak-7", name: "7-Day Streak", description: "Log in 7 days in a row", target: 7, xp: 100 },
    { id: "login-streak-10", name: "10-Day Streak", description: "Log in 10 days in a row", target: 10, xp: 150 }
  ];
}

async function awardAchievementRemote(email, def) {
  if (!email || !API_BASE) return { awarded: false, xp_added: 0 };
  try {
    const res = await fetch(`${API_BASE}/award-achievement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        achievement_id: def.id,
        name: def.name,
        description: def.description,
        tier: def.tier || "bronze",
        xp: def.xp || 0
      })
    });
    const data = await res.json().catch(() => ({}));
    return data || { awarded: false, xp_added: 0 };
  } catch {
    return { awarded: false, xp_added: 0 };
  }
}

async function awardLoginStreakBadges(email, streak) {
  if (!email) return;
  const defs = loginBadgeDefs();
  const badges = getBadges(email);
  const earned = new Set(badges.map((b) => b.id));
  let changed = false;

  for (const def of defs) {
    if (streak >= def.target && !earned.has(def.id)) {
      const result = await awardAchievementRemote(email, def);
      if (result?.awarded) {
        badges.push({ id: def.id, name: def.name, description: def.description, xp: def.xp, earnedAt: dateKey() });
        earned.add(def.id);
        const xpAdded = Number(result.xp_added || def.xp || 0);
        if (xpAdded > 0) bumpUserXP(email, xpAdded);
        changed = true;
      }
    }
  }

  if (changed) saveBadges(email, badges);
}

/* AI Prompt: Explain the SHARED HELPERS section in clear, simple terms. */
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

/* AI Prompt: Explain the Modern Toast Popup (Netology themed) section in clear, simple terms. */
/* =========================================================
   Modern Toast Popup (Netology themed)
========================================================= */

function showPopup(message, type) {
  const stack = (() => {
    let existing = document.getElementById("netToastStack");
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "netToastStack";
      existing.className = "net-toast-stack";
      document.body.appendChild(existing);
    }
    return existing;
  })();

  const popup = document.createElement("div");
  popup.className = "net-toast net-toast-enter in-stack";
  popup.setAttribute("role", "status");
  popup.setAttribute("aria-live", "polite");
  popup.dataset.type = type || "info";

  const inner = document.createElement("div");
  inner.className = "net-toast-inner";

  const icon = document.createElement("div");
  icon.className = "net-toast-icon";
  icon.setAttribute("aria-hidden", "true");
  const iconEl = document.createElement("i");
  const iconType = type === "error" ? "bi-x-circle" : type === "success" ? "bi-check2-circle" : "bi-info-circle";
  iconEl.className = `bi ${iconType}`;
  icon.appendChild(iconEl);

  const text = document.createElement("div");
  text.className = "net-toast-text";
  text.textContent = String(message || "");

  const closeBtn = document.createElement("button");
  closeBtn.className = "net-toast-close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Dismiss message");

  const closeSpan = document.createElement("span");
  closeSpan.setAttribute("aria-hidden", "true");
  closeSpan.textContent = "×";

  closeBtn.appendChild(closeSpan);
  inner.append(icon, text, closeBtn);
  popup.appendChild(inner);

  stack.appendChild(popup);

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
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
