// Signup wizard and account creation

(() => {
  "use strict";

  // CONFIGURATION

  const API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  const ENDPOINTS = window.ENDPOINTS || {};

  const SIGNUP_FIELD_IDS = [
    "first_name", "last_name", "username", "dob", "email", "password", "confirm_password"
  ];

  const REQUIRED_SIGNUP_FIELDS = [
    { valueKey: "firstName", fieldId: "first_name", message: "Please enter your first name." },
    { valueKey: "lastName", fieldId: "last_name", message: "Please enter your last name." },
    { valueKey: "username", fieldId: "username", message: "Please choose a username." },
    { valueKey: "dateOfBirth", fieldId: "dob", message: "Please select your date of birth." },
    { valueKey: "email", fieldId: "email", message: "Please enter your email address." },
    { valueKey: "password", fieldId: "password", message: "Please enter a password." },
    { valueKey: "confirmPassword", fieldId: "confirm_password", message: "Please confirm your password." }
  ];

  const SIGNUP_WIZARD_STEP_TITLES = {
    1: "Your details",
    2: "Your level",
    3: "Your reasons",
    4: "Review"
  };

  const SIGNUP_REVIEW_FIELDS = [
    { reviewId: "reviewFirst", inputId: "first_name" },
    { reviewId: "reviewLast", inputId: "last_name" },
    { reviewId: "reviewUser", inputId: "username" },
    { reviewId: "reviewEmail", inputId: "email" },
    { reviewId: "reviewDob", inputId: "dob" }
  ];

  // UTILITIES

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

  function normalizeTier(value, fallback = "novice") {
    const normalized = String(value || "").trim().toLowerCase();
    if (["novice", "intermediate", "advanced"].includes(normalized)) return normalized;
    return fallback;
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

  // BANNER & TOAST HELPERS

  function showToast(message, type = "info") {
    if (!message) return;
    if (window.NetologyToast?.showMessageToast) {
      window.NetologyToast.showMessageToast(String(message), type, 3200);
      return;
    }
    alert(String(message));
  }

  function showSignupBanner(message, type = "error") {
    if (window.NetologyToast?.showInlineBanner) {
      window.NetologyToast.showInlineBanner({
        bannerId: "signupBanner",
        message,
        type,
        timeoutMs: 4500,
        fallbackToPopupType: type === "success" ? "success" : "error",
        timerKey: "signup"
      });
      return;
    }

    const banner = getById("signupBanner");
    if (banner) banner.classList.add("d-none");
    showToast(message, type === "success" ? "success" : "error");
  }

  function hideSignupBanner() {
    if (window.NetologyToast?.hideInlineBanner) {
      window.NetologyToast.hideInlineBanner("signupBanner", "signup");
      return;
    }

    const banner = getById("signupBanner");
    if (banner) banner.classList.add("d-none");
  }

  // PASSWORD TOGGLE

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

  // FORM HELPERS

  function getSignupFieldRefs() {
    const refs = {};
    SIGNUP_FIELD_IDS.forEach((fieldId) => {
      refs[fieldId] = getById(fieldId);
    });
    return refs;
  }

  function collectSignupFormValues(fieldRefs) {
    return {
      firstName: String(fieldRefs.first_name?.value || "").trim(),
      lastName: String(fieldRefs.last_name?.value || "").trim(),
      username: String(fieldRefs.username?.value || "").trim(),
      dateOfBirth: String(fieldRefs.dob?.value || "").trim(),
      email: String(fieldRefs.email?.value || "").trim(),
      password: String(fieldRefs.password?.value || "").trim(),
      confirmPassword: String(fieldRefs.confirm_password?.value || "").trim()
    };
  }

  function clearInvalidStates(inputElements) {
    (inputElements || []).forEach((inputElement) => setInvalidState(inputElement, false));
  }

  function findMissingRequiredSignupField(signupValues) {
    return REQUIRED_SIGNUP_FIELDS.find((field) => !signupValues[field.valueKey]) || null;
  }

  function validateSignupIdentityValues(signupValues, includeRequiredChecks = true) {
    if (includeRequiredChecks) {
      const missingField = findMissingRequiredSignupField(signupValues);
      if (missingField) {
        return {
          fieldId: missingField.fieldId,
          message: missingField.message
        };
      }
    }

    if (signupValues.email && !isValidEmail(signupValues.email)) {
      return { fieldId: "email", message: "That email format does not look right. Please check and try again." };
    }

    if (signupValues.password && signupValues.password.length < 8) {
      return { fieldId: "password", message: "Password must be at least 8 characters." };
    }

    if (signupValues.password && signupValues.confirmPassword && signupValues.password !== signupValues.confirmPassword) {
      return { fieldId: "confirm_password", message: "Your passwords do not match. Please confirm your password." };
    }

    return null;
  }

  function getSelectedSignupLevelInput() {
    return document.querySelector('input[name="level"]:checked');
  }

  function getSelectedSignupReasons() {
    return Array.from(document.querySelectorAll('input[name="reasons"]:checked'))
      .map((inputElement) => inputElement.value);
  }

  // OVERLAY & CONFETTI

  function openOverlay(overlayId) {
    const overlay = getById(overlayId);
    if (!overlay) return null;

    overlay.classList.remove("d-none");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    return overlay;
  }

  function fillSignupConfetti(overlayElement) {
    if (!overlayElement) return;

    const confettiContainer = overlayElement.querySelector(".net-signup-success-confetti");
    if (!confettiContainer || confettiContainer.childElementCount > 0) return;

    const colors = ["#06b6d4", "#14b8a6", "#38bdf8", "#67e8f9", "#a78bfa", "#0d9488", "#22d3ee"];

    for (let pieceIndex = 0; pieceIndex < 55; pieceIndex += 1) {
      const confettiPiece = document.createElement("span");
      const size = 4 + Math.random() * 8;

      confettiPiece.style.left = `${Math.random() * 100}%`;
      confettiPiece.style.width = `${size}px`;
      confettiPiece.style.height = `${size}px`;
      confettiPiece.style.background = colors[Math.floor(Math.random() * colors.length)];
      confettiPiece.style.animationDelay = `${Math.random() * 2}s`;
      confettiPiece.style.animationDuration = `${2.5 + Math.random() * 2.5}s`;
      confettiPiece.style.boxShadow = `0 0 ${size}px ${colors[Math.floor(Math.random() * colors.length)]}`;

      confettiContainer.appendChild(confettiPiece);
    }
  }

  // AUTO-LOGIN AFTER SIGNUP

  async function tryAutoLoginAfterSignup(email, password, selectedTier) {
    const loginFormData = new FormData();
    loginFormData.append("email", email);
    loginFormData.append("password", password);

    const response = await fetch(apiUrl(authPath("login", "/login")), {
      method: "POST",
      body: loginFormData
    });

    const loginData = await response.json();
    if (!loginData?.success) return false;

    const normalizedEmail = normalizeEmail(email);
    const unlockTier = normalizeTier(selectedTier || loginData.start_level || "novice");

    const sessionPayload = {
      email: normalizedEmail,
      first_name: loginData.first_name,
      last_name: loginData.last_name,
      username: loginData.username,
      level: loginData.level,
      rank: loginData.rank || loginData.level,
      numeric_level: Number.isFinite(Number(loginData.numeric_level)) ? Number(loginData.numeric_level) : 1,
      xp: Number.isFinite(Number(loginData.xp)) ? Number(loginData.xp) : 0,
      xp_into_level: Number.isFinite(Number(loginData.xp_into_level)) ? Number(loginData.xp_into_level) : 0,
      next_level_xp: Number.isFinite(Number(loginData.next_level_xp)) ? Number(loginData.next_level_xp) : 100,
      is_first_login: true,
      onboarding_completed: false
    };

    localStorage.setItem("user", JSON.stringify(sessionPayload));
    localStorage.setItem("netology_user", JSON.stringify(sessionPayload));

    const onboardingApi = window.NetologyOnboarding || null;
    if (onboardingApi?.stageUser) {
      onboardingApi.stageUser(normalizedEmail, "dashboard");
    }
    if (onboardingApi?.setSessionActive) {
      onboardingApi.setSessionActive(true);
    }

    return true;
  }

  // WIZARD

  function initSignupWizard(formElement) {
    const signupPages = Array.from(document.querySelectorAll(".net-step-page"));
    const stepLabelElement = getById("stepLabel");
    const stepTitleElement = getById("stepTitle");
    const stepProgressElement = getById("stepProgress");
    const backButton = getById("backBtn");
    const nextButton = getById("nextBtn");
    const submitButton = getById("submitBtn");

    const totalSteps = 4;
    let currentStep = 1;

    if (!formElement || !signupPages.length || !stepLabelElement || !stepTitleElement || !stepProgressElement || !backButton || !nextButton || !submitButton) {
      return;
    }

    // Clear invalid on input
    SIGNUP_FIELD_IDS.forEach((fieldId) => {
      const inputElement = getById(fieldId);
      if (!inputElement) return;
      inputElement.addEventListener("input", () => setInvalidState(inputElement, false));
    });

    backButton.addEventListener("click", () => {
      if (currentStep <= 1) return;
      showStep(currentStep - 1);
    });

    nextButton.addEventListener("click", () => {
      if (!validateStep(currentStep)) return;
      if (currentStep >= totalSteps) return;
      showStep(currentStep + 1);
    });

    showStep(1);

    function showStep(stepNumber) {
      currentStep = stepNumber;

      signupPages.forEach((pageElement) => pageElement.classList.add("d-none"));
      const currentPage = document.querySelector(`.net-step-page[data-step="${currentStep}"]`);
      if (currentPage) currentPage.classList.remove("d-none");

      stepLabelElement.textContent = `Step ${currentStep} of ${totalSteps}`;
      stepTitleElement.textContent = SIGNUP_WIZARD_STEP_TITLES[currentStep] || "";
      stepProgressElement.style.width = `${(currentStep / totalSteps) * 100}%`;

      const stepPills = document.querySelectorAll(".net-step-pill");
      stepPills.forEach((pillElement) => {
        const pillStep = Number(pillElement.getAttribute("data-pill") || "0");
        pillElement.classList.toggle("is-active", pillStep === currentStep);
        pillElement.classList.toggle("is-done", pillStep < currentStep);
      });

      backButton.disabled = currentStep === 1;

      if (currentStep === totalSteps) {
        nextButton.classList.add("d-none");
        submitButton.classList.remove("d-none");
        fillReviewValues();
      } else {
        nextButton.classList.remove("d-none");
        submitButton.classList.add("d-none");
      }

      hideSignupBanner();
    }

    function validateStep(stepNumber) {
      if (stepNumber === 1) return validateStepOne();
      if (stepNumber === 2) return validateStepTwo();
      if (stepNumber === 3) return validateStepThree();
      return true;
    }

    function validateStepOne() {
      const fieldRefs = getSignupFieldRefs();
      const signupValues = collectSignupFormValues(fieldRefs);
      const issue = validateSignupIdentityValues(signupValues);

      clearInvalidStates(Object.values(fieldRefs));

      if (issue) {
        const invalidInput = getById(issue.fieldId);
        setInvalidState(invalidInput, true);
        showSignupBanner(issue.message, "warning");
        invalidInput?.focus();
        return false;
      }

      return true;
    }

    function validateStepTwo() {
      const selectedLevel = getSelectedSignupLevelInput();
      if (selectedLevel) return true;
      showSignupBanner("Please choose your starting level.", "warning");
      return false;
    }

    function validateStepThree() {
      const selectedReasons = getSelectedSignupReasons();
      if (selectedReasons.length > 0) return true;
      showSignupBanner("Please select at least one reason to continue.", "warning");
      return false;
    }

    function setReviewText(elementId, value) {
      const element = getById(elementId);
      if (element) element.textContent = value;
    }

    function fillReviewValues() {
      SIGNUP_REVIEW_FIELDS.forEach(({ reviewId, inputId }) => {
        setReviewText(reviewId, getById(inputId)?.value || "-");
      });

      const selectedLevel = getSelectedSignupLevelInput();
      setReviewText("reviewLevel", selectedLevel ? selectedLevel.value : "-");

      const selectedReasons = getSelectedSignupReasons();
      setReviewText("reviewReasons", selectedReasons.length ? selectedReasons.join(", ") : "None selected");
    }
  }

  function handleSignupSubmit(formElement) {
    if (!formElement) return;

    formElement.addEventListener("submit", async (event) => {
      event.preventDefault();

      const fieldRefs = getSignupFieldRefs();
      const signupValues = collectSignupFormValues(fieldRefs);
      const selectedLevel = getSelectedSignupLevelInput();
      const selectedReasons = getSelectedSignupReasons();

      if (findMissingRequiredSignupField(signupValues)) {
        showSignupBanner("Please complete all required fields before creating your account.", "warning");
        return;
      }

      const valueIssue = validateSignupIdentityValues(signupValues, false);
      if (valueIssue) {
        showSignupBanner(valueIssue.message, "warning");
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

      const selectedTier = normalizeTier(selectedLevel.value, "novice");
      localStorage.setItem("unlock_tier_pending", selectedTier);

      try {
        const response = await fetch(apiUrl(authPath("register", "/register")), {
          method: "POST",
          body: new FormData(formElement)
        });

        const responseData = await response.json();

        if (!responseData?.success) {
          showToast(responseData?.message || "Signup failed. Try again.", "error");
          return;
        }

        let autoLoginWorked = false;
        try {
          autoLoginWorked = await tryAutoLoginAfterSignup(signupValues.email, signupValues.password, selectedTier);
        } catch {
          autoLoginWorked = false;
        }

        const overlayElement = openOverlay("signupSuccessOverlay");
        if (overlayElement) {
          fillSignupConfetti(overlayElement);
          setTimeout(() => {
            window.location.href = autoLoginWorked ? "dashboard.html" : "login.html";
          }, 3800);
          return;
        }

        showToast(
          autoLoginWorked ? "Account created! Heading to your dashboard..." : "Account created! Please sign in.",
          "success"
        );

        setTimeout(() => {
          window.location.href = autoLoginWorked ? "dashboard.html" : "login.html";
        }, 1200);
      } catch {
        showToast("Server error. Please try again.", "error");
      }
    });
  }

  // INITIALIZATION

  function initSignupPage() {
    const signupFormElement = getById("signupForm");
    if (signupFormElement) {
      initSignupWizard(signupFormElement);
      handleSignupSubmit(signupFormElement);
      initPasswordToggles();
    }
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSignupPage, { once: true });
  } else {
    initSignupPage();
  }
})();
