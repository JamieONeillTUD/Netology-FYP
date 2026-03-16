/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: forgotpassword.js
Purpose: Handle password reset form
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

  function showForgotBanner(message, type = "error") {
    if (window.NetologyToast?.showInlineBanner) {
      window.NetologyToast.showInlineBanner({
        bannerId: "forgotBanner",
        message,
        type,
        timeoutMs: 4500,
        fallbackToPopupType: type === "success" ? "success" : "error",
        timerKey: "forgot"
      });
      return;
    }

    const banner = getById("forgotBanner");
    if (banner) banner.classList.add("d-none");
    showToast(message, type === "success" ? "success" : "error");
  }

  function hideForgotBanner() {
    if (window.NetologyToast?.hideInlineBanner) {
      window.NetologyToast.hideInlineBanner("forgotBanner", "forgot");
      return;
    }

    const banner = getById("forgotBanner");
    if (banner) banner.classList.add("d-none");
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
  // FORGOT PASSWORD HANDLER
  // ============================================================

  function handleForgotPasswordSubmit(formElement) {
    if (!formElement) return;

    formElement.addEventListener("submit", async (event) => {
      event.preventDefault();

      const emailInput = getById("fp_email");
      const passwordInput = getById("fp_password");
      const confirmPasswordInput = getById("fp_confirm");

      const formViewElement = getById("forgotFormView");
      const successViewElement = getById("forgotSuccessView");

      hideForgotBanner();
      setInvalidState(emailInput, false);
      setInvalidState(passwordInput, false);
      setInvalidState(confirmPasswordInput, false);

      const email = String(emailInput?.value || "").trim();
      const password = String(passwordInput?.value || "").trim();
      const confirmPassword = String(confirmPasswordInput?.value || "").trim();

      // Validation
      if (!isValidEmail(email)) {
        setInvalidState(emailInput, true);
        showForgotBanner("Please enter a valid email address.", "warning");
        return;
      }

      if (password.length < 8) {
        setInvalidState(passwordInput, true);
        showForgotBanner("Password must be at least 8 characters.", "warning");
        return;
      }

      if (password !== confirmPassword) {
        setInvalidState(confirmPasswordInput, true);
        showForgotBanner("Passwords do not match.", "warning");
        return;
      }

      // Submit
      try {
        const response = await fetch(apiUrl(authPath("forgotPassword", "/forgot-password")), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const responseData = await response.json();
        if (!responseData?.success) {
          showForgotBanner(responseData?.message || "Reset failed.", "error");
          return;
        }

        showToast("Password updated successfully.", "success");
        formViewElement?.classList.add("d-none");
        successViewElement?.classList.remove("d-none");
      } catch {
        showForgotBanner("Server error. Please try again.", "error");
      }
    });
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  function initForgotPasswordPage() {
    const forgotFormElement = getById("forgotForm");
    if (forgotFormElement) {
      handleForgotPasswordSubmit(forgotFormElement);
      initPasswordToggles();
    }
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initForgotPasswordPage, { once: true });
  } else {
    initForgotPasswordPage();
  }
})();
