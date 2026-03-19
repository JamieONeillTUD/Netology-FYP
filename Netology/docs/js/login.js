// login.js - handles the login form and session setup

(() => {
  "use strict";

  const API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  const ENDPOINTS = window.ENDPOINTS || {};

  // toggle the is-invalid class on a form input
  function setInvalid(inputElement, isInvalid) {
    if (inputElement) inputElement.classList.toggle("is-invalid", Boolean(isInvalid));
  }

  // show a popup toast message, falls back to alert
  function showToast(message, toastType) {
    if (!message) return;
    if (window.NetologyToast?.showMessageToast) {
      window.NetologyToast.showMessageToast(String(message), toastType || "info", 3200);
      return;
    }
    alert(String(message));
  }

  // show the inline banner at top of the login form
  function showBanner(message, bannerType) {
    bannerType = bannerType || "error";
    if (window.NetologyToast?.showInlineBanner) {
      window.NetologyToast.showInlineBanner({
        bannerId: "loginBanner", message: message, type: bannerType,
        timeoutMs: 4000,
        fallbackToPopupType: bannerType === "success" ? "success" : "error",
        timerKey: "login"
      });
      return;
    }
    const bannerElement = document.getElementById("loginBanner");
    if (bannerElement) bannerElement.classList.add("d-none");
    showToast(message, bannerType === "success" ? "success" : "error");
  }

  // set up show/hide toggle buttons on password fields
  function setupPasswordToggles() {
    document.querySelectorAll('[data-toggle="password"]').forEach((toggleButton) => {
      if (toggleButton.dataset.bound === "true") return;
      toggleButton.dataset.bound = "true";
      toggleButton.addEventListener("click", () => {
        const targetSelector = toggleButton.getAttribute("data-target");
        const passwordInput = targetSelector ? document.querySelector(targetSelector) : null;
        if (!passwordInput) return;
        const isHidden = passwordInput.getAttribute("type") === "password";
        passwordInput.setAttribute("type", isHidden ? "text" : "password");
        const toggleIcon = toggleButton.querySelector("i");
        if (toggleIcon) toggleIcon.className = isHidden ? "bi bi-eye-slash" : "bi bi-eye";
      });
    });
  }

  // show the success overlay with the users first name
  function showSuccessOverlay(firstName) {
    const overlay = document.getElementById("loginSuccessOverlay");
    if (!overlay) return false;
    overlay.classList.remove("d-none");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const nameElement = document.getElementById("loginSuccessName");
    if (nameElement) nameElement.textContent = String(firstName || "").trim() || "there";
    return true;
  }

  // save user data to local storage
  function saveSession(userData) {
    if (!userData) return;
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("netology_user", JSON.stringify(userData));
    if (userData.email) localStorage.setItem("netology_last_email", String(userData.email));
  }

  // build a clean user object from the server response
  function buildUserFromResponse(responseData, email) {
    const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : undefined;
    return {
      email,
      first_name: responseData.first_name,
      last_name: responseData.last_name,
      username: responseData.username,
      level: responseData.level,
      rank: responseData.rank || responseData.level,
      numeric_level: safeNumber(responseData.numeric_level),
      xp: safeNumber(responseData.xp) ?? 0,
      xp_into_level: safeNumber(responseData.xp_into_level),
      next_level_xp: safeNumber(responseData.next_level_xp),
      is_first_login: Boolean(responseData.is_first_login),
      onboarding_completed: Boolean(responseData.onboarding_completed)
    };
  }

  // set up the login form submit handler
  function setupLoginForm(formElement) {
    if (!formElement) return;

    formElement.addEventListener("submit", async (event) => {
      event.preventDefault();

      const emailInput = document.getElementById("email");
      const passwordInput = document.getElementById("password");
      const email = String(emailInput?.value || "").trim();
      const password = String(passwordInput?.value || "").trim();

      setInvalid(emailInput, false);
      setInvalid(passwordInput, false);

      // validate the email field
      if (!email) {
        setInvalid(emailInput, true);
        showBanner("Please enter your email address.", "warning");
        emailInput?.focus();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        setInvalid(emailInput, true);
        showBanner("That email format does not look right. Please check and try again.", "warning");
        emailInput?.focus();
        return;
      }

      // validate the password field
      if (!password) {
        setInvalid(passwordInput, true);
        showBanner("Please enter your password.", "warning");
        passwordInput?.focus();
        return;
      }
      if (password.length < 8) {
        setInvalid(passwordInput, true);
        showBanner("Password must be at least 8 characters.", "warning");
        passwordInput?.focus();
        return;
      }

      // submit to the server
      try {
        const loginPath = ENDPOINTS.auth?.login || "/login";
        const loginUrl = API_BASE ? `${API_BASE}${loginPath}` : loginPath;
        const response = await fetch(loginUrl, { method: "POST", body: new FormData(formElement) });
        const responseData = await response.json().catch(() => null);

        if (!response.ok || !responseData?.success) {
          const wrongCredentials = response.status === 401;
          if (wrongCredentials) { setInvalid(emailInput, true); setInvalid(passwordInput, true); }
          showBanner(
            responseData?.message || (wrongCredentials
              ? "Incorrect email or password. Please try again."
              : "Login failed. Please try again in a moment."),
            "error"
          );
          return;
        }

        // save the session to local storage
        const cleanEmail = String(email).trim().toLowerCase();
        const user = buildUserFromResponse(responseData, cleanEmail);
        saveSession(user);

        // start onboarding for first time users
        const onboarding = window.NetologyOnboarding;
        const onboardingDone = Boolean(responseData.onboarding_completed) || Boolean(onboarding?.isUserDone?.(cleanEmail));
        if (!onboardingDone && responseData.is_first_login) {
          onboarding?.stageUser?.(cleanEmail, "dashboard");
          onboarding?.setSessionActive?.(true);
        }

        // show success overlay or banner then redirect to dashboard
        const overlayShown = showSuccessOverlay(responseData.first_name || user.first_name);
        if (!overlayShown) {
          const displayName = responseData.first_name || user.first_name || "there";
          showBanner(`Welcome back, ${displayName}! Redirecting...`, "success");
        }

        setTimeout(() => { window.location.href = "dashboard.html"; }, overlayShown ? 2200 : 900);
      } catch (error) {
        console.error("Login request failed", error);
        showBanner("Cannot reach the server right now. Please check your connection and try again.", "error");
      }
    });
  }

  // start everything when the page is ready
  function initLoginPage() {
    const loginForm = document.getElementById("loginForm");
    if (!loginForm) return;
    setupLoginForm(loginForm);
    setupPasswordToggles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLoginPage, { once: true });
  } else {
    initLoginPage();
  }
})();
