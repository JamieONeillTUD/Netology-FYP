/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 17/04/2026

login.js - Login Page Script
---
This file handles the login form on Netology.
It checks the email and password fields, sends the login request
to the backend, saves the session locally, and shows the welcome
overlay for successful sign-ins.

It is used by Login.html and keeps the sign-in flow in one place.
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

  // Show the inline banner at the top of the login form.
  function showLoginBanner(message, bannerType) {
    var type = bannerType || "error";
    if (window.NetologyToast && window.NetologyToast.showInlineBanner) {
      window.NetologyToast.showInlineBanner({
        bannerId: "loginBanner",
        message: message,
        type: type,
        timeoutMs: 4000,
        fallbackToPopupType: type === "success" ? "success" : "error",
        timerKey: "login"
      });
      return;
    }
    var bannerElement = document.getElementById("loginBanner");
    if (bannerElement) {
      bannerElement.classList.add("d-none");
    }
    showToastMessage(message, type === "success" ? "success" : "error");
  }

  // Build a full API URL from a path.
  function buildApiUrl(path) {
    return API_BASE ? (API_BASE + path) : path;
  }

  // Clean an email address so it is safe to reuse.
  function normaliseEmail(value) {
    return String(value || "").trim().toLowerCase();
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

  // Show the success overlay with the user's first name.
  function showLoginSuccessOverlay(firstName) {
    var overlay = document.getElementById("loginSuccessOverlay");
    if (!overlay) {
      return false;
    }
    overlay.classList.remove("d-none");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    var nameElement = document.getElementById("loginSuccessName");
    if (nameElement) {
      var displayName = String(firstName || "").trim();
      nameElement.textContent = displayName || "there";
    }
    return true;
  }

  // Save user data to localStorage.
  function saveSessionToLocalStorage(userData) {
    if (!userData) {
      return;
    }
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("netology_user", JSON.stringify(userData));
    if (userData.email) {
      localStorage.setItem("netology_last_email", String(userData.email));
    }
  }

  // Convert a value to a number and return undefined if it is invalid.
  function safeNumber(value) {
    var parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    return undefined;
  }

  // Build a clean user object from the server response.
  function buildUserObjectFromResponse(responseData, email) {
    return {
      email: email,
      first_name: responseData.first_name,
      last_name: responseData.last_name,
      username: responseData.username,
      level: responseData.level,
      rank: responseData.rank || responseData.level,
      numeric_level: safeNumber(responseData.numeric_level),
      xp: safeNumber(responseData.xp) || 0,
      xp_into_level: safeNumber(responseData.xp_into_level),
      next_level_xp: safeNumber(responseData.next_level_xp),
      is_first_login: Boolean(responseData.is_first_login),
      onboarding_completed: Boolean(responseData.onboarding_completed)
    };
  }

  // Set up the login form submit handler.
  function setupLoginFormSubmitHandler(formElement) {
    if (!formElement) {
      return;
    }

    formElement.addEventListener("submit", function (event) {
      event.preventDefault();
      handleLoginFormSubmit(formElement);
    });
  }

  // Handle the login form submission.
  async function handleLoginFormSubmit(formElement) {
    var emailInput = document.getElementById("email");
    var passwordInput = document.getElementById("password");
    var email = String((emailInput && emailInput.value) || "").trim();
    var password = String((passwordInput && passwordInput.value) || "").trim();

    setInputInvalid(emailInput, false);
    setInputInvalid(passwordInput, false);

    if (!email) {
      setInputInvalid(emailInput, true);
      showLoginBanner("Please enter your email address.", "warning");
      if (emailInput) {
        emailInput.focus();
      }
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setInputInvalid(emailInput, true);
      showLoginBanner("That email format does not look right. Please check and try again.", "warning");
      if (emailInput) {
        emailInput.focus();
      }
      return;
    }

    if (!password) {
      setInputInvalid(passwordInput, true);
      showLoginBanner("Please enter your password.", "warning");
      if (passwordInput) {
        passwordInput.focus();
      }
      return;
    }
    if (password.length < 8) {
      setInputInvalid(passwordInput, true);
      showLoginBanner("Password must be at least 8 characters.", "warning");
      if (passwordInput) {
        passwordInput.focus();
      }
      return;
    }

    try {
      var loginPath = (ENDPOINTS.auth && ENDPOINTS.auth.login) || "/login";
      var response = await fetch(buildApiUrl(loginPath), { method: "POST", body: new FormData(formElement) });

      var responseData = null;
      try {
        responseData = await response.json();
      } catch (parseError) {
        responseData = null;
      }

      if (!response.ok || !responseData || !responseData.success) {
        var wrongCredentials = response.status === 401;
        if (wrongCredentials) {
          setInputInvalid(emailInput, true);
          setInputInvalid(passwordInput, true);
        }
        var errorMessage = "";
        if (responseData && responseData.message) {
          errorMessage = responseData.message;
        } else if (wrongCredentials) {
          errorMessage = "Incorrect email or password. Please try again.";
        } else {
          errorMessage = "Login failed. Please try again in a moment.";
        }
        showLoginBanner(errorMessage, "error");
        return;
      }

      var cleanEmail = normaliseEmail(email);
      var userObject = buildUserObjectFromResponse(responseData, cleanEmail);
      saveSessionToLocalStorage(userObject);

      var onboarding = window.NetologyOnboarding;
      var onboardingDone = Boolean(responseData.onboarding_completed);
      if (!onboardingDone && onboarding && onboarding.isUserDone) {
        onboardingDone = Boolean(onboarding.isUserDone(cleanEmail));
      }
      if (!onboardingDone && responseData.is_first_login) {
        if (onboarding && onboarding.stageUser) {
          onboarding.stageUser(cleanEmail, "dashboard");
        }
        if (onboarding && onboarding.setSessionActive) {
          onboarding.setSessionActive(true);
        }
      }

      var overlayShown = showLoginSuccessOverlay(responseData.first_name || userObject.first_name);
      if (!overlayShown) {
        var displayName = responseData.first_name || userObject.first_name || "there";
        showLoginBanner("Welcome back, " + displayName + "! Redirecting...", "success");
      }

      var redirectDelay = overlayShown ? 2200 : 900;
      setTimeout(function () {
        window.location.href = "dashboard.html";
      }, redirectDelay);
    } catch (networkError) {
      console.error("Login request failed", networkError);
      showLoginBanner("Cannot reach the server right now. Please check your connection and try again.", "error");
    }
  }

  // Main entry point for the login page.
  function initialiseLoginPage() {
    var loginForm = document.getElementById("loginForm");
    if (!loginForm) {
      return;
    }
    setupLoginFormSubmitHandler(loginForm);
    setupPasswordToggleButtons();
  }

  // Wait for the DOM to be ready, then start.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initialiseLoginPage();
    }, { once: true });
  } else {
    initialiseLoginPage();
  }
})();
