/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 17/04/2026

forgotpassword.js - Forgot Password Page Script
---
This file handles the forgot password form on Netology.
It checks the email and new password fields, sends the reset
request to the backend, and swaps the form for the success view
when the password update works.

It is used by Forgot.html and keeps the page logic in one place.
*/

(function () {
  "use strict";

  var API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  var ENDPOINTS = window.ENDPOINTS || {};

  // Toggle the is-invalid class on a form input.
  function setInputInvalid(inputElement, isInvalid) {
    if (inputElement) {
      if (isInvalid) {
        inputElement.classList.add("is-invalid");
      } else {
        inputElement.classList.remove("is-invalid");
      }
    }
  }

  // Show a popup toast message, with alert as a fallback.
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

  // Show the inline banner at the top of the forgot form.
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

  // Hide the forgot banner.
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

  // Build a full API URL for the reset request.
  function buildResetUrl(path) {
    return API_BASE ? (API_BASE + path) : path;
  }

  // Set up the show and hide toggle buttons on password fields.
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

  // Handle a click on a password toggle button.
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

  // Set up the forgot password form submit handler.
  function setupForgotFormSubmitHandler(formElement) {
    if (!formElement) {
      return;
    }
    formElement.addEventListener("submit", function (event) {
      event.preventDefault();
      handleForgotFormSubmit();
    });
  }

  // Handle the forgot password form submission.
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setInputInvalid(emailInput, true);
      showForgotBanner("Please enter a valid email address.", "warning");
      return;
    }

    if (password.length < 8) {
      setInputInvalid(passwordInput, true);
      showForgotBanner("Password must be at least 8 characters.", "warning");
      return;
    }

    if (password !== confirmPassword) {
      setInputInvalid(confirmInput, true);
      showForgotBanner("Passwords do not match.", "warning");
      return;
    }

    try {
      var resetPath = (ENDPOINTS.auth && ENDPOINTS.auth.forgotPassword) || "/forgot-password";
      var response = await fetch(buildResetUrl(resetPath), {
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

  // Main entry point for the forgot password page.
  function initialiseForgotPasswordPage() {
    var forgotForm = document.getElementById("forgotForm");
    if (!forgotForm) {
      return;
    }
    setupForgotFormSubmitHandler(forgotForm);
    setupPasswordToggleButtons();
  }

  // Wait for the DOM to be ready, then start.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initialiseForgotPasswordPage();
    }, { once: true });
  } else {
    initialiseForgotPasswordPage();
  }
})();
