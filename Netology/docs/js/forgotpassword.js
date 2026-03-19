// forgotpassword.js — Handles the forgot password form and reset.

(function () {
  "use strict";

  var API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  var ENDPOINTS = window.ENDPOINTS || {};

  // toggle the is-invalid class on a form input
  function setInputInvalid(inputElement, isInvalid) {
    if (inputElement) {
      if (isInvalid) {
        inputElement.classList.add("is-invalid");
      } else {
        inputElement.classList.remove("is-invalid");
      }
    }
  }

  // show a popup toast message, falls back to alert
  function showToastMessage(message, toastType) {
    if (!message) {
      return;
    }
    var type = toastType || "info";
    if (window.NetologyToast && window.NetologyToast.showMessageToast) {
      window.NetologyToast.showMessageToast(String(message), type, 3200);
      return;
    }
    alert(String(message));
  }

  // show the inline banner at the top of the forgot form
  function showForgotBanner(message, bannerType) {
    var type = bannerType || "error";
    if (window.NetologyToast && window.NetologyToast.showInlineBanner) {
      window.NetologyToast.showInlineBanner({
        bannerId: "forgotBanner",
        message: message,
        type: type,
        timeoutMs: 4500,
        fallbackToPopupType: type === "success" ? "success" : "error",
        timerKey: "forgot"
      });
      return;
    }
    var bannerElement = document.getElementById("forgotBanner");
    if (bannerElement) {
      bannerElement.classList.add("d-none");
    }
    showToastMessage(message, type === "success" ? "success" : "error");
  }

  // hide the forgot banner
  function hideForgotBanner() {
    if (window.NetologyToast && window.NetologyToast.hideInlineBanner) {
      window.NetologyToast.hideInlineBanner("forgotBanner", "forgot");
      return;
    }
    var bannerElement = document.getElementById("forgotBanner");
    if (bannerElement) {
      bannerElement.classList.add("d-none");
    }
  }

  // set up show/hide toggle buttons on password fields
  function setupPasswordToggleButtons() {
    var toggleButtons = document.querySelectorAll('[data-toggle="password"]');
    for (var i = 0; i < toggleButtons.length; i++) {
      var toggleButton = toggleButtons[i];
      if (toggleButton.dataset.bound === "true") {
        continue;
      }
      toggleButton.dataset.bound = "true";
      toggleButton.addEventListener("click", handlePasswordToggleClick);
    }
  }

  // handle a click on a password toggle button
  function handlePasswordToggleClick() {
    var targetSelector = this.getAttribute("data-target");
    var passwordInput = targetSelector ? document.querySelector(targetSelector) : null;
    if (!passwordInput) {
      return;
    }
    var isCurrentlyHidden = passwordInput.getAttribute("type") === "password";
    passwordInput.setAttribute("type", isCurrentlyHidden ? "text" : "password");
    var toggleIcon = this.querySelector("i");
    if (toggleIcon) {
      toggleIcon.className = isCurrentlyHidden ? "bi bi-eye-slash" : "bi bi-eye";
    }
  }

  // set up the forgot password form submit handler
  function setupForgotFormSubmitHandler(formElement) {
    if (!formElement) {
      return;
    }
    formElement.addEventListener("submit", function (event) {
      event.preventDefault();
      handleForgotFormSubmit();
    });
  }

  // handle the forgot password form submission
  async function handleForgotFormSubmit() {
    var emailInput = document.getElementById("fp_email");
    var passwordInput = document.getElementById("fp_password");
    var confirmInput = document.getElementById("fp_confirm");
    var formView = document.getElementById("forgotFormView");
    var successView = document.getElementById("forgotSuccessView");

    hideForgotBanner();
    setInputInvalid(emailInput, false);
    setInputInvalid(passwordInput, false);
    setInputInvalid(confirmInput, false);

    var email = String((emailInput && emailInput.value) || "").trim();
    var password = String((passwordInput && passwordInput.value) || "").trim();
    var confirmPassword = String((confirmInput && confirmInput.value) || "").trim();

    // validate the email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setInputInvalid(emailInput, true);
      showForgotBanner("Please enter a valid email address.", "warning");
      return;
    }

    // validate the password length
    if (password.length < 8) {
      setInputInvalid(passwordInput, true);
      showForgotBanner("Password must be at least 8 characters.", "warning");
      return;
    }

    // check that passwords match
    if (password !== confirmPassword) {
      setInputInvalid(confirmInput, true);
      showForgotBanner("Passwords do not match.", "warning");
      return;
    }

    // submit to the server
    try {
      var resetPath = (ENDPOINTS.auth && ENDPOINTS.auth.forgotPassword) || "/forgot-password";
      var resetUrl = API_BASE ? (API_BASE + resetPath) : resetPath;
      var response = await fetch(resetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password })
      });

      var responseData = await response.json();
      if (!responseData || !responseData.success) {
        var errorMessage = (responseData && responseData.message) ? responseData.message : "Reset failed.";
        showForgotBanner(errorMessage, "error");
        return;
      }

      showToastMessage("Password updated successfully.", "success");
      if (formView) {
        formView.classList.add("d-none");
      }
      if (successView) {
        successView.classList.remove("d-none");
      }
    } catch (networkError) {
      showForgotBanner("Server error. Please try again.", "error");
    }
  }

  // main entry point for the forgot password page
  function initialiseForgotPasswordPage() {
    var forgotForm = document.getElementById("forgotForm");
    if (!forgotForm) {
      return;
    }
    setupForgotFormSubmitHandler(forgotForm);
    setupPasswordToggleButtons();
  }

  // wait for the DOM to be ready, then start
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initialiseForgotPasswordPage();
    }, { once: true });
  } else {
    initialiseForgotPasswordPage();
  }
})();
