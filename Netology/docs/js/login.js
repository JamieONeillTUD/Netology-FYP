/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: login.js
Purpose: Handle login form submission and session setup
---------------------------------------------------------
*/

(() => {
  "use strict";

  // ============================================================
  // CONFIGURATION
  // ============================================================

  const API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  const ENDPOINTS = window.ENDPOINTS || {};

  // ============================================================
  // UTILITIES
  // ============================================================

  function getById(elementId) {
    return document.getElementById(elementId);
  }

  function parseJsonSafely(jsonString) {
    try {
      return jsonString ? JSON.parse(jsonString) : null;
    } catch {
      return null;
    }
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());
  }

  function apiUrl(path) {
    return API_BASE ? `${API_BASE}${path}` : path;
  }

  function authPath(pathKey, fallbackPath) {
    return ENDPOINTS.auth?.[pathKey] || fallbackPath;
  }

  function setInvalidState(inputElement, isInvalid) {
    if (!inputElement) return;
    inputElement.classList.toggle("is-invalid", Boolean(isInvalid));
  }

  // ============================================================
  // BANNER & TOAST HELPERS
  // ============================================================

  function showToast(message, type = "info") {
    if (!message) return;
    if (window.NetologyToast?.showMessageToast) {
      window.NetologyToast.showMessageToast(String(message), type, 3200);
      return;
    }
    alert(String(message));
  }

  function showLoginBanner(message, type = "error") {
    if (window.NetologyToast?.showInlineBanner) {
      window.NetologyToast.showInlineBanner({
        bannerId: "loginBanner",
        message,
        type,
        timeoutMs: 4000,
        fallbackToPopupType: type === "success" ? "success" : "error",
        timerKey: "login"
      });
      return;
    }

    const banner = getById("loginBanner");
    if (banner) banner.classList.add("d-none");
    showToast(message, type === "success" ? "success" : "error");
  }

  // ============================================================
  // PASSWORD TOGGLE
  // ============================================================

  function initPasswordToggles() {
    const toggleButtons = document.querySelectorAll('[data-toggle="password"]');

    toggleButtons.forEach((buttonElement) => {
      if (buttonElement.dataset.bound === "true") return;
      buttonElement.dataset.bound = "true";

      buttonElement.addEventListener("click", () => {
        const targetSelector = buttonElement.getAttribute("data-target");
        const inputElement = targetSelector ? document.querySelector(targetSelector) : null;
        if (!inputElement) return;

        const isPasswordHidden = inputElement.getAttribute("type") === "password";
        inputElement.setAttribute("type", isPasswordHidden ? "text" : "password");

        const iconElement = buttonElement.querySelector("i");
        if (iconElement) iconElement.className = isPasswordHidden ? "bi bi-eye-slash" : "bi bi-eye";
      });
    });
  }

  // ============================================================
  // OVERLAY & SESSION
  // ============================================================

  function openOverlay(overlayId) {
    const overlay = getById(overlayId);
    if (!overlay) return null;

    overlay.classList.remove("d-none");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    return overlay;
  }

  function showLoginSuccessOverlay(firstName) {
    const overlayElement = openOverlay("loginSuccessOverlay");
    if (!overlayElement) return false;

    const nameElement = getById("loginSuccessName");
    if (nameElement) {
      const safeFirstName = String(firstName || "").trim();
      nameElement.textContent = safeFirstName || "there";
    }

    return true;
  }

  function persistUserSession(userPayload) {
    if (!userPayload) return;

    localStorage.setItem("user", JSON.stringify(userPayload));
    localStorage.setItem("netology_user", JSON.stringify(userPayload));
    if (userPayload.email) localStorage.setItem("netology_last_email", String(userPayload.email));
  }

  function buildLoginPayload(loginData, email) {
    return {
      email,
      first_name: loginData.first_name,
      last_name: loginData.last_name,
      username: loginData.username,
      level: loginData.level,
      rank: loginData.rank || loginData.level,
      numeric_level: Number.isFinite(Number(loginData.numeric_level)) ? Number(loginData.numeric_level) : undefined,
      xp: Number.isFinite(Number(loginData.xp)) ? Number(loginData.xp) : 0,
      xp_into_level: Number.isFinite(Number(loginData.xp_into_level)) ? Number(loginData.xp_into_level) : undefined,
      next_level_xp: Number.isFinite(Number(loginData.next_level_xp)) ? Number(loginData.next_level_xp) : undefined,
      is_first_login: Boolean(loginData.is_first_login),
      onboarding_completed: Boolean(loginData.onboarding_completed)
    };
  }

  // ============================================================
  // ONBOARDING
  // ============================================================

  function getOnboardingApi() {
    return window.NetologyOnboarding || null;
  }

  function stageOnboardingForUser(email) {
    const onboardingApi = getOnboardingApi();
    if (!onboardingApi?.stageUser) return;
    onboardingApi.stageUser(email, "dashboard");
  }

  function setOnboardingSessionActive(isActive) {
    const onboardingApi = getOnboardingApi();
    if (!onboardingApi?.setSessionActive) return;
    onboardingApi.setSessionActive(isActive);
  }

  function isOnboardingDoneForUser(email) {
    const onboardingApi = getOnboardingApi();
    if (!onboardingApi?.isUserDone) return false;
    return Boolean(onboardingApi.isUserDone(email));
  }

  // ============================================================
  // LOGIN HANDLER
  // ============================================================

  function handleLoginSubmit(formElement) {
    if (!formElement) return;

    formElement.addEventListener("submit", async (event) => {
      event.preventDefault();

      const emailInput = getById("email");
      const passwordInput = getById("password");

      const email = String(emailInput?.value || "").trim();
      const password = String(passwordInput?.value || "").trim();

      setInvalidState(emailInput, false);
      setInvalidState(passwordInput, false);

      // Validation
      if (!email) {
        setInvalidState(emailInput, true);
        showLoginBanner("Please enter your email address.", "warning");
        emailInput?.focus();
        return;
      }

      if (!isValidEmail(email)) {
        setInvalidState(emailInput, true);
        showLoginBanner("That email format does not look right. Please check and try again.", "warning");
        emailInput?.focus();
        return;
      }

      if (!password) {
        setInvalidState(passwordInput, true);
        showLoginBanner("Please enter your password.", "warning");
        passwordInput?.focus();
        return;
      }

      if (password.length < 8) {
        setInvalidState(passwordInput, true);
        showLoginBanner("Password must be at least 8 characters.", "warning");
        passwordInput?.focus();
        return;
      }

      // Submit
      try {
        const response = await fetch(apiUrl(authPath("login", "/login")), {
          method: "POST",
          body: new FormData(formElement)
        });

        const responseData = await response.json().catch(() => null);
        if (!response.ok || !responseData?.success) {
          const isInvalidCredentials = response.status === 401;
          if (isInvalidCredentials) {
            setInvalidState(emailInput, true);
            setInvalidState(passwordInput, true);
          }

          showLoginBanner(
            responseData?.message ||
              (isInvalidCredentials
                ? "Incorrect email or password. Please try again."
                : "Login failed. Please try again in a moment."),
            "error"
          );
          return;
        }

        // Build and persist session
        const normalizedEmail = normalizeEmail(email);
        const loginPayload = buildLoginPayload(responseData, normalizedEmail);
        persistUserSession(loginPayload);

        // Onboarding setup
        const hasEmailCompletion =
          Boolean(responseData.onboarding_completed) ||
          isOnboardingDoneForUser(normalizedEmail);

        const shouldStartOnboarding =
          !hasEmailCompletion &&
          Boolean(responseData.is_first_login);

        if (shouldStartOnboarding) {
          stageOnboardingForUser(normalizedEmail);
          setOnboardingSessionActive(true);
        }

        // Show success
        const overlayShown = showLoginSuccessOverlay(responseData.first_name || loginPayload.first_name);
        if (!overlayShown) {
          const firstName = responseData.first_name || loginPayload.first_name || "there";
          showLoginBanner(`Welcome back, ${firstName}! Redirecting...`, "success");
        }

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, overlayShown ? 2200 : 900);
      } catch (error) {
        console.error("Login request failed", error);
        showLoginBanner("Cannot reach the server right now. Please check your connection and try again.", "error");
      }
    });
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  function initLoginPage() {
    const loginFormElement = getById("loginForm");
    if (loginFormElement) {
      handleLoginSubmit(loginFormElement);
      initPasswordToggles();
    }
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLoginPage, { once: true });
  } else {
    initLoginPage();
  }
})();
