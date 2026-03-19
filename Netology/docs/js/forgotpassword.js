// forgotpassword.js - handles the forgot password form and reset

(() => {
  "use strict";

  const API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  const ENDPOINTS = window.ENDPOINTS || {};

  // toggle the is-invalid class on a form input
  function setInvalid(inputElement, isInvalid) {
    if (inputElement) inputElement.classList.toggle("is-invalid", Boolean(isInvalid));
  }

  // show a popup toast message, falls back to alert
  function showToast(message, toastType = "info") {
    if (!message) return;
    if (window.NetologyToast?.showMessageToast) {
      window.NetologyToast.showMessageToast(String(message), toastType, 3200);
      return;
    }
    alert(String(message));
  }

  // show the inline banner at top of the forgot form
  function showBanner(message, bannerType = "error") {
    if (window.NetologyToast?.showInlineBanner) {
      window.NetologyToast.showInlineBanner({
        bannerId: "forgotBanner", message: message, type: bannerType,
        timeoutMs: 4500,
        fallbackToPopupType: bannerType === "success" ? "success" : "error",
        timerKey: "forgot"
      });
      return;
    }
    const bannerElement = document.getElementById("forgotBanner");
    if (bannerElement) bannerElement.classList.add("d-none");
    showToast(message, bannerType === "success" ? "success" : "error");
  }

  // hide the forgot banner
  function hideBanner() {
    if (window.NetologyToast?.hideInlineBanner) {
      window.NetologyToast.hideInlineBanner("forgotBanner", "forgot");
      return;
    }
    const bannerElement = document.getElementById("forgotBanner");
    if (bannerElement) bannerElement.classList.add("d-none");
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

  // set up the forgot password form submit handler
  function setupForgotForm(formElement) {
    if (!formElement) return;

    formElement.addEventListener("submit", async (event) => {
      event.preventDefault();

      const emailInput = document.getElementById("fp_email");
      const passwordInput = document.getElementById("fp_password");
      const confirmInput = document.getElementById("fp_confirm");
      const formView = document.getElementById("forgotFormView");
      const successView = document.getElementById("forgotSuccessView");

      hideBanner();
      setInvalid(emailInput, false);
      setInvalid(passwordInput, false);
      setInvalid(confirmInput, false);

      const email = String(emailInput?.value || "").trim();
      const password = String(passwordInput?.value || "").trim();
      const confirmPassword = String(confirmInput?.value || "").trim();

      // validate the email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        setInvalid(emailInput, true);
        showBanner("Please enter a valid email address.", "warning");
        return;
      }

      // validate the password length
      if (password.length < 8) {
        setInvalid(passwordInput, true);
        showBanner("Password must be at least 8 characters.", "warning");
        return;
      }

      // check that passwords match
      if (password !== confirmPassword) {
        setInvalid(confirmInput, true);
        showBanner("Passwords do not match.", "warning");
        return;
      }

      // submit to the server
      try {
        const resetPath = ENDPOINTS.auth?.forgotPassword || "/forgot-password";
        const resetUrl = API_BASE ? `${API_BASE}${resetPath}` : resetPath;
        const response = await fetch(resetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const responseData = await response.json();
        if (!responseData?.success) {
          showBanner(responseData?.message || "Reset failed.", "error");
          return;
        }

        showToast("Password updated successfully.", "success");
        formView?.classList.add("d-none");
        successView?.classList.remove("d-none");
      } catch {
        showBanner("Server error. Please try again.", "error");
      }
    });
  }

  // start everything when the page is ready
  function initForgotPage() {
    const forgotForm = document.getElementById("forgotForm");
    if (!forgotForm) return;
    setupForgotForm(forgotForm);
    setupPasswordToggles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initForgotPage, { once: true });
  } else {
    initForgotPage();
  }
})();
