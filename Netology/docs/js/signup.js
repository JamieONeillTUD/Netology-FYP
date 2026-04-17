/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 17/04/2026

signup.js - Signup Page Script
---
This file handles the signup wizard on Netology.
It checks the form step by step, sends the registration request
to the backend, and logs the user in after a successful signup.

It is used by Signup.html and keeps the account creation flow in one place.
*/

(function () {
  "use strict";

  var API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  var ENDPOINTS = window.ENDPOINTS || {};

  // Each signup field and its empty-field error message.
  var SIGNUP_FIELDS = [
    { id: "first_name", message: "Please enter your first name." },
    { id: "last_name", message: "Please enter your last name." },
    { id: "username", message: "Please choose a username." },
    { id: "dob", message: "Please select your date of birth." },
    { id: "email", message: "Please enter your email address." },
    { id: "password", message: "Please enter a password." },
    { id: "confirm_password", message: "Please confirm your password." }
  ];

  var STEP_TITLES = ["Your details", "Your level", "Your reasons", "Review"];
  var CONFETTI_COLORS = ["#06b6d4", "#14b8a6", "#38bdf8", "#67e8f9", "#a78bfa", "#0d9488", "#22d3ee"];
  var TOTAL_STEPS = 4;
  var currentStep = 1;

  // Convert a value to a number and return 0 if it is not valid.
  function safeNumber(value) {
    var parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    return 0;
  }

  // Build a backend URL from a route path.
  function buildApiUrl(path) {
    return API_BASE ? (API_BASE + path) : path;
  }

  // Trim and lowercase an email address.
  function normaliseEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  // Show a popup toast message and fall back to alert.
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

  // Show the inline banner at the top of the signup form.
  function showSignupBanner(message, bannerType) {
    var type = bannerType || "error";
    if (window.NetologyToast && window.NetologyToast.showInlineBanner) {
      window.NetologyToast.showInlineBanner({
        bannerId: "signupBanner",
        message: message,
        type: type,
        timeoutMs: 4500,
        fallbackToPopupType: type === "success" ? "success" : "error",
        timerKey: "signup"
      });
      return;
    }
    var bannerElement = document.getElementById("signupBanner");
    if (bannerElement) {
      bannerElement.classList.add("d-none");
    }
    showToastMessage(message, type === "success" ? "success" : "error");
  }

  // Hide the signup banner.
  function hideSignupBanner() {
    if (window.NetologyToast && window.NetologyToast.hideInlineBanner) {
      window.NetologyToast.hideInlineBanner("signupBanner", "signup");
      return;
    }
    var bannerElement = document.getElementById("signupBanner");
    if (bannerElement) {
      bannerElement.classList.add("d-none");
    }
  }

  // Set up show/hide toggle buttons on password fields.
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
    var isCurrentlyHidden = passwordInput.type === "password";
    passwordInput.type = isCurrentlyHidden ? "text" : "password";
    var toggleIcon = this.querySelector("i");
    if (toggleIcon) {
      toggleIcon.className = isCurrentlyHidden ? "bi bi-eye-slash" : "bi bi-eye";
    }
  }

  // Grab all form field elements by their ids.
  function getAllFieldElements() {
    var fieldElements = {};
    for (var i = 0; i < SIGNUP_FIELDS.length; i++) {
      var fieldId = SIGNUP_FIELDS[i].id;
      fieldElements[fieldId] = document.getElementById(fieldId);
    }
    return fieldElements;
  }

  // Read and trim all form field values.
  function getAllFieldValues(fieldElements) {
    var fieldValues = {};
    for (var i = 0; i < SIGNUP_FIELDS.length; i++) {
      var fieldId = SIGNUP_FIELDS[i].id;
      var element = fieldElements[fieldId];
      fieldValues[fieldId] = String((element && element.value) || "").trim();
    }
    return fieldValues;
  }

  // Find the first empty required field.
  function findFirstMissingField(fieldValues) {
    for (var i = 0; i < SIGNUP_FIELDS.length; i++) {
      if (!fieldValues[SIGNUP_FIELDS[i].id]) {
        return SIGNUP_FIELDS[i];
      }
    }
    return null;
  }

  // Check all fields and return the first error or null.
  function validateAllFields(fieldValues, checkRequired) {
    if (checkRequired !== false) {
      var missingField = findFirstMissingField(fieldValues);
      if (missingField) {
      return missingField;
    }
  }
    if (fieldValues.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fieldValues.email.trim())) {
      return { id: "email", message: "That email format does not look right. Please check and try again." };
    }
    if (fieldValues.password && fieldValues.password.length < 8) {
      return { id: "password", message: "Password must be at least 8 characters." };
    }
    if (fieldValues.password && fieldValues.confirm_password && fieldValues.password !== fieldValues.confirm_password) {
      return { id: "confirm_password", message: "Your passwords do not match. Please confirm your password." };
    }
    return null;
  }

  // Get the selected level radio button.
  function getSelectedLevelRadio() {
    return document.querySelector('input[name="level"]:checked');
  }

  // Get all checked reason checkboxes as an array of values.
  function getSelectedReasonValues() {
    var checkedBoxes = document.querySelectorAll('input[name="reasons"]:checked');
    var values = [];
    for (var i = 0; i < checkedBoxes.length; i++) {
      values.push(checkedBoxes[i].value);
    }
    return values;
  }

  // Show a full screen overlay by its element id.
  function showFullScreenOverlay(overlayId) {
    var overlayElement = document.getElementById(overlayId);
    if (!overlayElement) {
      return null;
    }
    overlayElement.classList.remove("d-none");
    overlayElement.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    return overlayElement;
  }

  // Fill the success overlay with confetti pieces.
  function createConfettiPieces(overlayElement) {
    if (!overlayElement) {
      return;
    }
    var confettiContainer = overlayElement.querySelector(".net-signup-success-confetti");
    if (!confettiContainer || confettiContainer.childElementCount > 0) {
      return;
    }

    for (var i = 0; i < 55; i++) {
      var confettiPiece = document.createElement("span");
      var pieceSize = 4 + Math.random() * 8;
      confettiPiece.style.left = (Math.random() * 100) + "%";
      confettiPiece.style.width = pieceSize + "px";
      confettiPiece.style.height = pieceSize + "px";
      confettiPiece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      confettiPiece.style.animationDelay = (Math.random() * 2) + "s";
      confettiPiece.style.animationDuration = (2.5 + Math.random() * 2.5) + "s";
      confettiPiece.style.boxShadow = "0 0 " + pieceSize + "px " + CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      confettiContainer.appendChild(confettiPiece);
    }
  }

  // Log the user in right after signup so they skip the login page.
  async function autoLoginAfterSignup(email, password) {
    var formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    var loginPath = (ENDPOINTS.auth && ENDPOINTS.auth.login) || "/login";
    var loginUrl = buildApiUrl(loginPath);
    var response = await fetch(loginUrl, { method: "POST", body: formData });
    var responseData = await response.json();

    if (!responseData || !responseData.success) {
      return false;
    }

    var sessionData = {
      email: normaliseEmail(email),
      first_name: responseData.first_name,
      last_name: responseData.last_name,
      username: responseData.username,
      level: responseData.level,
      rank: responseData.rank || responseData.level,
      numeric_level: safeNumber(responseData.numeric_level) || 1,
      xp: safeNumber(responseData.xp),
      xp_into_level: safeNumber(responseData.xp_into_level),
      next_level_xp: safeNumber(responseData.next_level_xp) || 100,
      is_first_login: true,
      onboarding_completed: false
    };

    localStorage.setItem("user", JSON.stringify(sessionData));
    localStorage.setItem("netology_user", JSON.stringify(sessionData));

    var onboarding = window.NetologyOnboarding || null;
    if (onboarding && onboarding.stageUser) {
      onboarding.stageUser(sessionData.email, "dashboard");
    }
    if (onboarding && onboarding.setSessionActive) {
      onboarding.setSessionActive(true);
    }

    return true;
  }

  // Switch to a specific wizard step and update the UI.
  function goToWizardStep(stepNumber, stepLabel, stepTitle, progressBar, backButton, nextButton, submitButton) {
    currentStep = stepNumber;

    var stepPages = document.querySelectorAll(".net-step-page");
    for (var i = 0; i < stepPages.length; i++) {
      stepPages[i].classList.add("d-none");
    }
    var activePage = document.querySelector('.net-step-page[data-step="' + currentStep + '"]');
    if (activePage) {
      activePage.classList.remove("d-none");
    }

    stepLabel.textContent = "Step " + currentStep + " of " + TOTAL_STEPS;
    stepTitle.textContent = STEP_TITLES[currentStep - 1] || "";
    progressBar.style.width = ((currentStep / TOTAL_STEPS) * 100) + "%";

    // Mark step pills as active or done.
    var allPills = document.querySelectorAll(".net-step-pill");
    for (var p = 0; p < allPills.length; p++) {
      var pillStep = Number(allPills[p].getAttribute("data-pill") || 0);
      if (pillStep === currentStep) {
        allPills[p].classList.add("is-active");
      } else {
        allPills[p].classList.remove("is-active");
      }
      if (pillStep < currentStep) {
        allPills[p].classList.add("is-done");
      } else {
        allPills[p].classList.remove("is-done");
      }
    }

    backButton.disabled = currentStep === 1;

    if (currentStep === TOTAL_STEPS) {
      nextButton.classList.add("d-none");
      submitButton.classList.remove("d-none");
    } else {
      nextButton.classList.remove("d-none");
      submitButton.classList.add("d-none");
    }

    if (currentStep === TOTAL_STEPS) {
      fillReviewPage();
    }
    hideSignupBanner();
  }

  // Check all personal detail fields on step 1.
  function validatePersonalDetailsStep() {
    var fieldElements = getAllFieldElements();
    var fieldValues = getAllFieldValues(fieldElements);
    var validationError = validateAllFields(fieldValues, true);

    // Clear all red borders first.
    for (var key in fieldElements) {
      if (fieldElements[key]) {
        fieldElements[key].classList.remove("is-invalid");
      }
    }

    if (validationError) {
      var errorElement = document.getElementById(validationError.id);
      if (errorElement) {
        errorElement.classList.add("is-invalid");
        errorElement.focus();
      }
      showSignupBanner(validationError.message, "warning");
      return false;
    }
    return true;
  }

  // Make sure a level is picked on step 2.
  function validateLevelSelectionStep() {
    if (getSelectedLevelRadio()) {
      return true;
    }
    showSignupBanner("Please choose your starting level.", "warning");
    return false;
  }

  // Make sure at least one reason is checked on step 3.
  function validateReasonSelectionStep() {
    if (getSelectedReasonValues().length > 0) {
      return true;
    }
    showSignupBanner("Please select at least one reason to continue.", "warning");
    return false;
  }

  // Run the right validation for the current step.
  function validateCurrentWizardStep(stepNumber) {
    if (stepNumber === 1) {
      return validatePersonalDetailsStep();
    }
    if (stepNumber === 2) {
      return validateLevelSelectionStep();
    }
    if (stepNumber === 3) {
      return validateReasonSelectionStep();
    }
    return true;
  }

  // Fill the review page with the user's entered values.
  function fillReviewPage() {
    var reviewMappings = [
      ["reviewFirst", "first_name"],
      ["reviewLast", "last_name"],
      ["reviewUser", "username"],
      ["reviewEmail", "email"],
      ["reviewDob", "dob"]
    ];

    for (var i = 0; i < reviewMappings.length; i++) {
      var reviewId = reviewMappings[i][0];
      var fieldId = reviewMappings[i][1];
      var reviewElement = document.getElementById(reviewId);
      var fieldElement = document.getElementById(fieldId);
      if (reviewElement) {
        reviewElement.textContent = (fieldElement && fieldElement.value) || "-";
      }
    }

    var levelRadio = getSelectedLevelRadio();
    var levelReview = document.getElementById("reviewLevel");
    if (levelReview) {
      levelReview.textContent = levelRadio ? levelRadio.value : "-";
    }

    var reasons = getSelectedReasonValues();
    var reasonsReview = document.getElementById("reviewReasons");
    if (reasonsReview) {
      reasonsReview.textContent = reasons.length > 0 ? reasons.join(", ") : "None selected";
    }
  }

  // Set up the multi-step signup wizard.
  function setupSignupWizard(formElement) {
    var stepPages = document.querySelectorAll(".net-step-page");
    var stepLabel = document.getElementById("stepLabel");
    var stepTitle = document.getElementById("stepTitle");
    var progressBar = document.getElementById("stepProgress");
    var backButton = document.getElementById("backBtn");
    var nextButton = document.getElementById("nextBtn");
    var submitButton = document.getElementById("submitBtn");

    if (!formElement || !stepPages.length || !stepLabel || !stepTitle || !progressBar || !backButton || !nextButton || !submitButton) {
      return;
    }

    // Clear the red border when the user starts typing.
    for (var i = 0; i < SIGNUP_FIELDS.length; i++) {
      var fieldElement = document.getElementById(SIGNUP_FIELDS[i].id);
      if (fieldElement) {
        fieldElement.addEventListener("input", function () {
          this.classList.remove("is-invalid");
        });
      }
    }

    backButton.addEventListener("click", function () {
      if (currentStep > 1) {
        goToWizardStep(currentStep - 1, stepLabel, stepTitle, progressBar, backButton, nextButton, submitButton);
      }
    });

    nextButton.addEventListener("click", function () {
      if (validateCurrentWizardStep(currentStep) && currentStep < TOTAL_STEPS) {
        goToWizardStep(currentStep + 1, stepLabel, stepTitle, progressBar, backButton, nextButton, submitButton);
      }
    });

    goToWizardStep(1, stepLabel, stepTitle, progressBar, backButton, nextButton, submitButton);
  }

  // Handle the signup form submission.
  async function handleSignupFormSubmit(formElement) {
    var fieldElements = getAllFieldElements();
    var fieldValues = getAllFieldValues(fieldElements);
    var selectedLevel = getSelectedLevelRadio();
    var selectedReasons = getSelectedReasonValues();

    if (findFirstMissingField(fieldValues)) {
      showSignupBanner("Please complete all required fields before creating your account.", "warning");
      return;
    }

    var validationError = validateAllFields(fieldValues, false);
    if (validationError) {
      showSignupBanner(validationError.message, "warning");
      return;
    }
    if (!selectedLevel) {
      showSignupBanner("Please choose your starting level.", "warning");
      return;
    }
    if (selectedReasons.length === 0) {
      showSignupBanner("Please select at least one reason. This helps personalise your learning.", "warning");
      return;
    }

    var levelValue = String(selectedLevel.value || "").trim().toLowerCase();
    var validTiers = ["novice", "intermediate", "advanced"];
    var levelTier = "novice";
    for (var t = 0; t < validTiers.length; t++) {
      if (validTiers[t] === levelValue) {
        levelTier = levelValue;
        break;
      }
    }
    localStorage.setItem("unlock_tier_pending", levelTier);

    try {
      var registerPath = (ENDPOINTS.auth && ENDPOINTS.auth.register) || "/register";
      var registerUrl = buildApiUrl(registerPath);
      var response = await fetch(registerUrl, { method: "POST", body: new FormData(formElement) });
      var responseData = await response.json();

      if (!responseData || !responseData.success) {
        var errorMessage = (responseData && responseData.message) ? responseData.message : "Signup failed. Try again.";
        showToastMessage(errorMessage, "error");
        return;
      }

      var isLoggedIn = false;
      try {
        isLoggedIn = await autoLoginAfterSignup(fieldValues.email, fieldValues.password);
      } catch (loginError) {
        isLoggedIn = false;
      }

      var successOverlay = showFullScreenOverlay("signupSuccessOverlay");
      if (successOverlay) {
        createConfettiPieces(successOverlay);
        setTimeout(function () {
          window.location.href = isLoggedIn ? "dashboard.html" : "login.html";
        }, 3800);
        return;
      }

      var successMessage = isLoggedIn ? "Account created! Heading to your dashboard..." : "Account created! Please sign in.";
      showToastMessage(successMessage, "success");
      setTimeout(function () {
        window.location.href = isLoggedIn ? "dashboard.html" : "login.html";
      }, 1200);
    } catch (networkError) {
      showToastMessage("Server error. Please try again.", "error");
    }
  }

  // Main entry point for the signup page.
  function initialiseSignupPage() {
    var signupForm = document.getElementById("signupForm");
    if (!signupForm) {
      return;
    }
    setupSignupWizard(signupForm);
    signupForm.addEventListener("submit", function (event) {
      event.preventDefault();
      handleSignupFormSubmit(signupForm);
    });
    setupPasswordToggleButtons();
  }

  // Wait for the DOM to be ready, then start.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initialiseSignupPage();
    }, { once: true });
  } else {
    initialiseSignupPage();
  }
})();
