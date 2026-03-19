// signup.js - handles the signup wizard and account creation

(() => {
  "use strict";

  const API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  const ENDPOINTS = window.ENDPOINTS || {};

  // each signup field and its empty field error message
  const SIGNUP_FIELDS = [
    { id: "first_name", message: "Please enter your first name." },
    { id: "last_name", message: "Please enter your last name." },
    { id: "username", message: "Please choose a username." },
    { id: "dob", message: "Please select your date of birth." },
    { id: "email", message: "Please enter your email address." },
    { id: "password", message: "Please enter a password." },
    { id: "confirm_password", message: "Please confirm your password." }
  ];

  // show a popup toast message, falls back to alert
  function showToast(message, toastType = "info") {
    if (!message) return;
    if (window.NetologyToast?.showMessageToast) {
      window.NetologyToast.showMessageToast(String(message), toastType, 3200);
      return;
    }
    alert(String(message));
  }

  // show the inline banner at top of the signup form
  function showBanner(message, bannerType = "error") {
    if (window.NetologyToast?.showInlineBanner) {
      window.NetologyToast.showInlineBanner({
        bannerId: "signupBanner", message: message, type: bannerType,
        timeoutMs: 4500,
        fallbackToPopupType: bannerType === "success" ? "success" : "error",
        timerKey: "signup"
      });
      return;
    }
    const bannerElement = document.getElementById("signupBanner");
    if (bannerElement) bannerElement.classList.add("d-none");
    showToast(message, bannerType === "success" ? "success" : "error");
  }

  // hide the signup banner
  function hideBanner() {
    if (window.NetologyToast?.hideInlineBanner) {
      window.NetologyToast.hideInlineBanner("signupBanner", "signup");
      return;
    }
    const bannerElement = document.getElementById("signupBanner");
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

        const isHidden = passwordInput.type === "password";
        passwordInput.type = isHidden ? "text" : "password";

        const toggleIcon = toggleButton.querySelector("i");
        if (toggleIcon) toggleIcon.className = isHidden ? "bi bi-eye-slash" : "bi bi-eye";
      });
    });
  }

  // grab all form field elements by their ids
  function getFieldElements() {
    const fieldElements = {};
    SIGNUP_FIELDS.forEach((field) => { fieldElements[field.id] = document.getElementById(field.id); });
    return fieldElements;
  }

  // read and trim all form field values
  function getFieldValues(fieldElements) {
    const fieldValues = {};
    SIGNUP_FIELDS.forEach((field) => { fieldValues[field.id] = String(fieldElements[field.id]?.value || "").trim(); });
    return fieldValues;
  }

  // find the first empty required field
  function findFirstMissingField(fieldValues) {
    return SIGNUP_FIELDS.find((field) => !fieldValues[field.id]) || null;
  }

  // check all fields and return the first error or null
  function validateFields(fieldValues, checkRequired = true) {
    if (checkRequired) {
      const missingField = findFirstMissingField(fieldValues);
      if (missingField) return missingField;
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

  // get the selected level radio button
  function getSelectedLevel() {
    return document.querySelector('input[name="level"]:checked');
  }

  // get all checked reason checkboxes as an array of values
  function getSelectedReasons() {
    return Array.from(document.querySelectorAll('input[name="reasons"]:checked')).map((checkbox) => checkbox.value);
  }

  // show a full screen overlay by its element id
  function showOverlay(overlayId) {
    const overlayElement = document.getElementById(overlayId);
    if (!overlayElement) return null;
    overlayElement.classList.remove("d-none");
    overlayElement.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    return overlayElement;
  }

  // fill the success overlay with confetti pieces
  function createConfetti(overlayElement) {
    if (!overlayElement) return;
    const confettiContainer = overlayElement.querySelector(".net-signup-success-confetti");
    if (!confettiContainer || confettiContainer.childElementCount > 0) return;

    const confettiColors = ["#06b6d4", "#14b8a6", "#38bdf8", "#67e8f9", "#a78bfa", "#0d9488", "#22d3ee"];
    for (let index = 0; index < 55; index++) {
      const confettiPiece = document.createElement("span");
      const pieceSize = 4 + Math.random() * 8;
      confettiPiece.style.left = `${Math.random() * 100}%`;
      confettiPiece.style.width = `${pieceSize}px`;
      confettiPiece.style.height = `${pieceSize}px`;
      confettiPiece.style.background = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      confettiPiece.style.animationDelay = `${Math.random() * 2}s`;
      confettiPiece.style.animationDuration = `${2.5 + Math.random() * 2.5}s`;
      confettiPiece.style.boxShadow = `0 0 ${pieceSize}px ${confettiColors[Math.floor(Math.random() * confettiColors.length)]}`;
      confettiContainer.appendChild(confettiPiece);
    }
  }

  // log the user in right after signup so they skip the login page
  async function autoLoginAfterSignup(email, password) {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const loginPath = ENDPOINTS.auth?.login || "/login";
    const response = await fetch(API_BASE ? `${API_BASE}${loginPath}` : loginPath, { method: "POST", body: formData });
    const responseData = await response.json();
    if (!responseData?.success) return false;

    const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

    const sessionData = {
      email: String(email || "").trim().toLowerCase(),
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

    const onboarding = window.NetologyOnboarding || null;
    if (onboarding?.stageUser) onboarding.stageUser(sessionData.email, "dashboard");
    if (onboarding?.setSessionActive) onboarding.setSessionActive(true);

    return true;
  }

  // set up the multi step signup wizard
  function setupWizard(formElement) {
    const stepPages = Array.from(document.querySelectorAll(".net-step-page"));
    const stepLabel = document.getElementById("stepLabel");
    const stepTitle = document.getElementById("stepTitle");
    const progressBar = document.getElementById("stepProgress");
    const backButton = document.getElementById("backBtn");
    const nextButton = document.getElementById("nextBtn");
    const submitButton = document.getElementById("submitBtn");

    const totalSteps = 4;
    let currentStep = 1;

    if (!formElement || !stepPages.length || !stepLabel || !stepTitle || !progressBar || !backButton || !nextButton || !submitButton) return;

    // clear the red border when user starts typing
    SIGNUP_FIELDS.forEach((field) => {
      const fieldElement = document.getElementById(field.id);
      if (fieldElement) fieldElement.addEventListener("input", () => fieldElement.classList.remove("is-invalid"));
    });

    backButton.addEventListener("click", () => { if (currentStep > 1) goToStep(currentStep - 1); });
    nextButton.addEventListener("click", () => { if (validateCurrentStep(currentStep) && currentStep < totalSteps) goToStep(currentStep + 1); });

    goToStep(1);

    // switch to a specific step and update the ui
    function goToStep(stepNumber) {
      currentStep = stepNumber;
      stepPages.forEach((page) => page.classList.add("d-none"));
      const activePage = document.querySelector(`.net-step-page[data-step="${currentStep}"]`);
      if (activePage) activePage.classList.remove("d-none");

      stepLabel.textContent = `Step ${currentStep} of ${totalSteps}`;
      stepTitle.textContent = ["Your details", "Your level", "Your reasons", "Review"][currentStep - 1] || "";
      progressBar.style.width = `${(currentStep / totalSteps) * 100}%`;

      // mark step pills as active or done
      document.querySelectorAll(".net-step-pill").forEach((pill) => {
        const pillStep = Number(pill.getAttribute("data-pill") || 0);
        pill.classList.toggle("is-active", pillStep === currentStep);
        pill.classList.toggle("is-done", pillStep < currentStep);
      });

      backButton.disabled = currentStep === 1;
      nextButton.classList.toggle("d-none", currentStep === totalSteps);
      submitButton.classList.toggle("d-none", currentStep !== totalSteps);

      if (currentStep === totalSteps) fillReviewPage();
      hideBanner();
    }

    // run the right validation for the current step
    function validateCurrentStep(stepNumber) {
      if (stepNumber === 1) return validatePersonalDetails();
      if (stepNumber === 2) return validateLevelSelection();
      if (stepNumber === 3) return validateReasonSelection();
      return true;
    }

    // check all personal detail fields on step 1
    function validatePersonalDetails() {
      const fieldElements = getFieldElements();
      const fieldValues = getFieldValues(fieldElements);
      const validationError = validateFields(fieldValues);
      Object.values(fieldElements).forEach((element) => { if (element) element.classList.remove("is-invalid"); });
      if (validationError) {
        const errorElement = document.getElementById(validationError.id);
        if (errorElement) errorElement.classList.add("is-invalid");
        showBanner(validationError.message, "warning");
        errorElement?.focus();
        return false;
      }
      return true;
    }

    // make sure a level is picked on step 2
    function validateLevelSelection() {
      if (getSelectedLevel()) return true;
      showBanner("Please choose your starting level.", "warning");
      return false;
    }

    // make sure at least one reason is checked on step 3
    function validateReasonSelection() {
      if (getSelectedReasons().length > 0) return true;
      showBanner("Please select at least one reason to continue.", "warning");
      return false;
    }

    // fill the review page with the users entered values
    function fillReviewPage() {
      [["reviewFirst", "first_name"], ["reviewLast", "last_name"], ["reviewUser", "username"],
       ["reviewEmail", "email"], ["reviewDob", "dob"]].forEach(([reviewId, fieldId]) => {
        const reviewElement = document.getElementById(reviewId);
        if (reviewElement) reviewElement.textContent = document.getElementById(fieldId)?.value || "-";
      });
      const levelRadio = getSelectedLevel();
      const levelReview = document.getElementById("reviewLevel");
      if (levelReview) levelReview.textContent = levelRadio ? levelRadio.value : "-";
      const reasons = getSelectedReasons();
      const reasonsReview = document.getElementById("reviewReasons");
      if (reasonsReview) reasonsReview.textContent = reasons.length ? reasons.join(", ") : "None selected";
    }
  }

  // handle the final form submit to register, auto login, and show success
  function setupFormSubmit(formElement) {
    if (!formElement) return;

    formElement.addEventListener("submit", async (event) => {
      event.preventDefault();

      const fieldElements = getFieldElements();
      const fieldValues = getFieldValues(fieldElements);
      const selectedLevel = getSelectedLevel();
      const selectedReasons = getSelectedReasons();

      if (findFirstMissingField(fieldValues)) {
        showBanner("Please complete all required fields before creating your account.", "warning");
        return;
      }
      const validationError = validateFields(fieldValues, false);
      if (validationError) { showBanner(validationError.message, "warning"); return; }
      if (!selectedLevel) { showBanner("Please choose your starting level.", "warning"); return; }
      if (!selectedReasons.length) { showBanner("Please select at least one reason. This helps personalise your learning.", "warning"); return; }

      const levelValue = String(selectedLevel.value || "").trim().toLowerCase();
      const levelTier = ["novice", "intermediate", "advanced"].includes(levelValue) ? levelValue : "novice";
      localStorage.setItem("unlock_tier_pending", levelTier);

      try {
        const registerPath = ENDPOINTS.auth?.register || "/register";
        const response = await fetch(API_BASE ? `${API_BASE}${registerPath}` : registerPath, { method: "POST", body: new FormData(formElement) });
        const responseData = await response.json();

        if (!responseData?.success) {
          showToast(responseData?.message || "Signup failed. Try again.", "error");
          return;
        }

        let isLoggedIn = false;
        try { isLoggedIn = await autoLoginAfterSignup(fieldValues.email, fieldValues.password); } catch { isLoggedIn = false; }

        const successOverlay = showOverlay("signupSuccessOverlay");
        if (successOverlay) {
          createConfetti(successOverlay);
          setTimeout(() => { window.location.href = isLoggedIn ? "dashboard.html" : "login.html"; }, 3800);
          return;
        }

        showToast(isLoggedIn ? "Account created! Heading to your dashboard..." : "Account created! Please sign in.", "success");
        setTimeout(() => { window.location.href = isLoggedIn ? "dashboard.html" : "login.html"; }, 1200);
      } catch {
        showToast("Server error. Please try again.", "error");
      }
    });
  }

  // start everything when the page is ready
  function initSignupPage() {
    const signupForm = document.getElementById("signupForm");
    if (!signupForm) return;
    setupWizard(signupForm);
    setupFormSubmit(signupForm);
    setupPasswordToggles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSignupPage, { once: true });
  } else {
    initSignupPage();
  }
})();
