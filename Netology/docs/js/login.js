// login.js — Login form and session setup.

(() => {
  "use strict";

  const API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  const ENDPOINTS = window.ENDPOINTS || {};

  // Toggles the is-invalid class on an input.
  function setInvalid(el, on) {
    if (el) el.classList.toggle("is-invalid", Boolean(on));
  }

  // Shows a popup toast, falls back to alert.
  function toast(msg, type) {
    if (!msg) return;
    if (window.NetologyToast?.showMessageToast) {
      window.NetologyToast.showMessageToast(String(msg), type || "info", 3200);
      return;
    }
    alert(String(msg));
  }

  // Shows the inline banner at top of login form.
  function showBanner(msg, type) {
    type = type || "error";
    if (window.NetologyToast?.showInlineBanner) {
      window.NetologyToast.showInlineBanner({
        bannerId: "loginBanner", message: msg, type,
        timeoutMs: 4000,
        fallbackToPopupType: type === "success" ? "success" : "error",
        timerKey: "login"
      });
      return;
    }
    const el = document.getElementById("loginBanner");
    if (el) el.classList.add("d-none");
    toast(msg, type === "success" ? "success" : "error");
  }

  // Sets up show/hide buttons on password fields.
  function initPasswordToggles() {
    document.querySelectorAll('[data-toggle="password"]').forEach((btn) => {
      if (btn.dataset.bound === "true") return;
      btn.dataset.bound = "true";
      btn.addEventListener("click", () => {
        const input = btn.getAttribute("data-target");
        const el = input ? document.querySelector(input) : null;
        if (!el) return;
        const hidden = el.getAttribute("type") === "password";
        el.setAttribute("type", hidden ? "text" : "password");
        const icon = btn.querySelector("i");
        if (icon) icon.className = hidden ? "bi bi-eye-slash" : "bi bi-eye";
      });
    });
  }

  // Shows the success overlay with the user's first name.
  function showOverlay(firstName) {
    const overlay = document.getElementById("loginSuccessOverlay");
    if (!overlay) return false;
    overlay.classList.remove("d-none");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const name = document.getElementById("loginSuccessName");
    if (name) name.textContent = String(firstName || "").trim() || "there";
    return true;
  }

  // Saves user data to localStorage.
  function saveSession(user) {
    if (!user) return;
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("netology_user", JSON.stringify(user));
    if (user.email) localStorage.setItem("netology_last_email", String(user.email));
  }

  // Builds a clean user object from the server response.
  function buildUser(data, email) {
    const num = (v) => Number.isFinite(Number(v)) ? Number(v) : undefined;
    return {
      email,
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.username,
      level: data.level,
      rank: data.rank || data.level,
      numeric_level: num(data.numeric_level),
      xp: num(data.xp) ?? 0,
      xp_into_level: num(data.xp_into_level),
      next_level_xp: num(data.next_level_xp),
      is_first_login: Boolean(data.is_first_login),
      onboarding_completed: Boolean(data.onboarding_completed)
    };
  }

  // Sets up the login form submit handler.
  function initForm(form) {
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const emailEl = document.getElementById("email");
      const passwordEl = document.getElementById("password");
      const email = String(emailEl?.value || "").trim();
      const password = String(passwordEl?.value || "").trim();

      setInvalid(emailEl, false);
      setInvalid(passwordEl, false);

      // Validate fields.
      if (!email) {
        setInvalid(emailEl, true);
        showBanner("Please enter your email address.", "warning");
        emailEl?.focus();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        setInvalid(emailEl, true);
        showBanner("That email format does not look right. Please check and try again.", "warning");
        emailEl?.focus();
        return;
      }
      if (!password) {
        setInvalid(passwordEl, true);
        showBanner("Please enter your password.", "warning");
        passwordEl?.focus();
        return;
      }
      if (password.length < 8) {
        setInvalid(passwordEl, true);
        showBanner("Password must be at least 8 characters.", "warning");
        passwordEl?.focus();
        return;
      }

      // Submit to server.
      try {
        const path = ENDPOINTS.auth?.login || "/login";
        const url = API_BASE ? `${API_BASE}${path}` : path;
        const res = await fetch(url, { method: "POST", body: new FormData(form) });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          const wrongCreds = res.status === 401;
          if (wrongCreds) { setInvalid(emailEl, true); setInvalid(passwordEl, true); }
          showBanner(
            data?.message || (wrongCreds
              ? "Incorrect email or password. Please try again."
              : "Login failed. Please try again in a moment."),
            "error"
          );
          return;
        }

        // Save session.
        const cleanEmail = String(email).trim().toLowerCase();
        const user = buildUser(data, cleanEmail);
        saveSession(user);

        // Start onboarding for first-time users.
        const onboarding = window.NetologyOnboarding;
        const done = Boolean(data.onboarding_completed) || Boolean(onboarding?.isUserDone?.(cleanEmail));
        if (!done && data.is_first_login) {
          onboarding?.stageUser?.(cleanEmail, "dashboard");
          onboarding?.setSessionActive?.(true);
        }

        // Show success overlay or banner, then redirect.
        const shown = showOverlay(data.first_name || user.first_name);
        if (!shown) {
          const name = data.first_name || user.first_name || "there";
          showBanner(`Welcome back, ${name}! Redirecting...`, "success");
        }

        setTimeout(() => { window.location.href = "dashboard.html"; }, shown ? 2200 : 900);
      } catch (err) {
        console.error("Login request failed", err);
        showBanner("Cannot reach the server right now. Please check your connection and try again.", "error");
      }
    });
  }

  // Start everything when the DOM is ready.
  function init() {
    const form = document.getElementById("loginForm");
    if (!form) return;
    initForm(form);
    initPasswordToggles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
