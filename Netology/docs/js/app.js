/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: app.js
Purpose: Runs auth-page logic for signup, login, forgot password,
onboarding handoff, and daily login sync.


---------------------------------------------------------
*/

(() => {
  "use strict";

  // Shared application references used across auth pages.
  const API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  const ENDPOINTS = window.ENDPOINTS || {};
  const XP = window.NetologyXP || null;

  // Local storage keys used to keep session and temporary auth data.
  const STORAGE_KEYS = {
    // Session copies used across older and newer pages.
    user: "user",
    netologyUser: "netology_user",
    lastEmail: "netology_last_email",

    // Temporary value stored after signup so the selected tier
    // is still available during the first login.
    unlockTierPending: "unlock_tier_pending"
  };

  const DEFAULT_ONBOARDING_STAGE = "dashboard";

  // Small shortcut for selecting elements by ID.
  function byId(elementId) {
    return document.getElementById(elementId);
  }

  // Runs a callback immediately if the page is ready.
  // Otherwise waits until the DOM has finished loading.
  function runWhenDomReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  // Safely parses JSON and returns a fallback value if parsing fails.
  function parseJson(value, fallbackValue = null) {
    try {
      return JSON.parse(value);
    } catch {
      return fallbackValue;
    }
  }

  // Builds a full API URL when API_BASE is available.
  function apiUrl(path) {
    return API_BASE ? `${API_BASE}${path}` : path;
  }

  // Normalises emails so comparisons remain consistent.
  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  // Restricts level values to the supported set.
  function normalizeTier(value, fallback = "novice") {
    const normalized = String(value || "").trim().toLowerCase();
    if (["novice", "intermediate", "advanced"].includes(normalized)) return normalized;
    return fallback;
  }

  // Basic email format check used by auth forms.
  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());
  }

  // Toggles Bootstrap invalid styling on form fields.
  function setInvalidState(inputElement, isInvalid) {
    if (!inputElement) return;
    inputElement.classList.toggle("is-invalid", Boolean(isInvalid));
  }

  // Reads an auth endpoint from the shared endpoint map,
  // falling back to a default path when needed.
  function authPath(pathKey, fallbackPath) {
    return ENDPOINTS.auth?.[pathKey] || fallbackPath;
  }

  // Returns the onboarding helper API if it is available.
  function getOnboardingApi() {
    return window.NetologyOnboarding || null;
  }

  // Tells onboarding-tour.js which user should begin onboarding
  // and at which stage.
  function stageOnboardingForUser(email, stage = DEFAULT_ONBOARDING_STAGE) {
    const onboardingApi = getOnboardingApi();
    if (!onboardingApi?.stageUser) return;
    onboardingApi.stageUser(email, stage);
  }

  // Marks the onboarding session as active or inactive.
  // The session flag itself is managed by onboarding-tour.js.
  function setOnboardingSessionActive(isActive) {
    const onboardingApi = getOnboardingApi();
    if (!onboardingApi?.setSessionActive) return;
    onboardingApi.setSessionActive(isActive);
  }

  // Checks whether onboarding has already been completed for this user.
  function isOnboardingDoneForUser(email) {
    const onboardingApi = getOnboardingApi();
    if (!onboardingApi?.isUserDone) return false;
    return Boolean(onboardingApi.isUserDone(email));
  }

  // Inline banner configuration for each auth screen.
  const AUTH_BANNERS = Object.freeze({
    login: { id: "loginBanner", timer: "login", timeoutMs: 4000 },
    signup: { id: "signupBanner", timer: "signup", timeoutMs: 4500 },
    forgot: { id: "forgotBanner", timer: "forgot", timeoutMs: 4500 }
  });

  // Displays a message toast using the shared UI toast API.
  // Falls back to alert if the helper is missing.
  function showToast(message, type = "info") {
    if (!message) return;
    if (window.NetologyToast?.showMessageToast) {
      window.NetologyToast.showMessageToast(String(message), type, 3200);
      return;
    }
    alert(String(message));
  }

  // Displays an inline auth banner when supported.
  // Falls back to a popup if no inline banner helper is present.
  function showAuthBanner(bannerKey, message, type = "error") {
    const banner = AUTH_BANNERS[bannerKey];
    if (!banner) {
      showToast(message, type === "success" ? "success" : "error");
      return;
    }

    if (window.NetologyToast?.showInlineBanner) {
      window.NetologyToast.showInlineBanner({
        bannerId: banner.id,
        message,
        type,
        timeoutMs: banner.timeoutMs,
        fallbackToPopupType: type === "success" ? "success" : "error",
        timerKey: banner.timer
      });
      return;
    }

    const bannerElement = byId(banner.id);
    if (bannerElement) bannerElement.classList.add("d-none");
    showToast(message, type === "success" ? "success" : "error");
  }

  // Hides a banner for the selected auth screen.
  function hideAuthBanner(bannerKey) {
    const banner = AUTH_BANNERS[bannerKey];
    if (!banner) return;

    if (window.NetologyToast?.hideInlineBanner) {
      window.NetologyToast.hideInlineBanner(banner.id, banner.timer);
      return;
    }

    const bannerElement = byId(banner.id);
    if (bannerElement) bannerElement.classList.add("d-none");
  }

  function showLoginBanner(message, type = "error") {
    showAuthBanner("login", message, type);
  }

  function showSignupBanner(message, type = "error") {
    showAuthBanner("signup", message, type);
  }

  function hideSignupBanner() {
    hideAuthBanner("signup");
  }

  function showForgotBanner(message, type = "error") {
    showAuthBanner("forgot", message, type);
  }

  function hideForgotBanner() {
    hideAuthBanner("forgot");
  }

  // Enables show/hide behaviour for password inputs.
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

        buttonElement.setAttribute("aria-pressed", String(isPasswordHidden));
        buttonElement.setAttribute("aria-label", isPasswordHidden ? "Hide password" : "Show password");

        const iconElement = buttonElement.querySelector("i");
        if (iconElement) iconElement.className = isPasswordHidden ? "bi bi-eye-slash" : "bi bi-eye";
      });
    });
  }

  // Signup fields used throughout the multi-step form.
  const SIGNUP_FIELD_IDS = Object.freeze([
    "first_name",
    "last_name",
    "username",
    "dob",
    "email",
    "password",
    "confirm_password"
  ]);

  // Required fields and messages used during signup validation.
  const REQUIRED_SIGNUP_FIELDS = Object.freeze([
    { valueKey: "firstName", fieldId: "first_name", message: "Please enter your first name." },
    { valueKey: "lastName", fieldId: "last_name", message: "Please enter your last name." },
    { valueKey: "username", fieldId: "username", message: "Please choose a username." },
    { valueKey: "dateOfBirth", fieldId: "dob", message: "Please select your date of birth." },
    { valueKey: "email", fieldId: "email", message: "Please enter your email address." },
    { valueKey: "password", fieldId: "password", message: "Please enter a password." },
    { valueKey: "confirmPassword", fieldId: "confirm_password", message: "Please confirm your password." }
  ]);

  // Titles shown at the top of each signup wizard step.
  const SIGNUP_WIZARD_STEP_TITLES = Object.freeze({
    1: "Your details",
    2: "Your level",
    3: "Your reasons",
    4: "Review"
  });

  // Field mappings used to fill the final review step before submit.
  const SIGNUP_REVIEW_FIELDS = Object.freeze([
    { reviewId: "reviewFirst", inputId: "first_name" },
    { reviewId: "reviewLast", inputId: "last_name" },
    { reviewId: "reviewUser", inputId: "username" },
    { reviewId: "reviewEmail", inputId: "email" },
    { reviewId: "reviewDob", inputId: "dob" }
  ]);

  // Returns a map of all signup field elements.
  function getSignupFieldRefs() {
    const refs = {};
    SIGNUP_FIELD_IDS.forEach((fieldId) => {
      refs[fieldId] = byId(fieldId);
    });
    return refs;
  }

  // Reads all visible signup form values into a single object.
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

  // Clears invalid styling from a list of inputs.
  function clearInvalidStates(inputElements) {
    (inputElements || []).forEach((inputElement) => setInvalidState(inputElement, false));
  }

  // Returns the first missing required signup field, if any.
  function findMissingRequiredSignupField(signupValues) {
    return REQUIRED_SIGNUP_FIELDS.find((field) => !signupValues[field.valueKey]) || null;
  }

  // Validates the identity and credential values entered during signup.
  function validateSignupIdentityValues(signupValues, options = {}) {
    const includeRequiredChecks = options.includeRequiredChecks !== false;
    const mismatchMessage = options.passwordMismatchMessage || "Passwords do not match. Please confirm again.";

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
      return { fieldId: "confirm_password", message: mismatchMessage };
    }

    return null;
  }

  // Returns the selected starting level from the signup form.
  function getSelectedSignupLevelInput() {
    return document.querySelector('input[name="level"]:checked');
  }

  // Returns all selected signup reasons.
  function getSelectedSignupReasons() {
    return Array.from(document.querySelectorAll('input[name="reasons"]:checked'))
      .map((inputElement) => inputElement.value);
  }

  // Sets up the multi-step signup experience.
  function initSignupWizard(formElement) {
    const signupPages = Array.from(document.querySelectorAll(".net-step-page"));
    const stepLabelElement = byId("stepLabel");
    const stepTitleElement = byId("stepTitle");
    const stepProgressElement = byId("stepProgress");
    const backButton = byId("backBtn");
    const nextButton = byId("nextBtn");
    const submitButton = byId("submitBtn");

    const totalSteps = 4;
    let currentStep = 1;

    if (
      !formElement ||
      !signupPages.length ||
      !stepLabelElement ||
      !stepTitleElement ||
      !stepProgressElement ||
      !backButton ||
      !nextButton ||
      !submitButton
    ) {
      return;
    }

    // Remove invalid styling as the user edits fields.
    SIGNUP_FIELD_IDS.forEach((fieldId) => {
      const inputElement = byId(fieldId);
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

    // Runs validation only for the current visible step.
    function validateStep(stepNumber) {
      if (stepNumber === 1) return validateStepOne();
      if (stepNumber === 2) return validateStepTwo();
      if (stepNumber === 3) return validateStepThree();
      return true;
    }

    // Validates the basic account details step.
    function validateStepOne() {
      const fieldRefs = getSignupFieldRefs();
      const signupValues = collectSignupFormValues(fieldRefs);
      const issue = validateSignupIdentityValues(signupValues);

      clearInvalidStates(Object.values(fieldRefs));

      if (issue) {
        const invalidInput = byId(issue.fieldId);
        setInvalidState(invalidInput, true);
        showSignupBanner(issue.message, "warning");
        invalidInput?.focus();
        return false;
      }

      return true;
    }

    // Ensures the user chooses a starting level.
    function validateStepTwo() {
      const selectedLevel = getSelectedSignupLevelInput();
      if (selectedLevel) return true;
      showSignupBanner("Please choose your starting level.", "warning");
      return false;
    }

    // Ensures at least one reason is selected.
    function validateStepThree() {
      const selectedReasons = getSelectedSignupReasons();
      if (selectedReasons.length > 0) return true;
      showSignupBanner("Please select at least one reason to continue.", "warning");
      return false;
    }

    // Small helper used when filling the review screen.
    function setReviewText(elementId, value) {
      const element = byId(elementId);
      if (element) element.textContent = value;
    }

    // Copies entered values into the final review step.
    function fillReviewValues() {
      SIGNUP_REVIEW_FIELDS.forEach(({ reviewId, inputId }) => {
        setReviewText(reviewId, byId(inputId)?.value || "-");
      });

      const selectedLevel = getSelectedSignupLevelInput();
      setReviewText("reviewLevel", selectedLevel ? selectedLevel.value : "-");

      const selectedReasons = getSelectedSignupReasons();
      setReviewText("reviewReasons", selectedReasons.length ? selectedReasons.join(", ") : "None selected");
    }
  }

  // Saves the active user session to local storage.
  function persistUserSession(userPayload) {
    if (!userPayload) return;

    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userPayload));
    localStorage.setItem(STORAGE_KEYS.netologyUser, JSON.stringify(userPayload));
    if (userPayload.email) localStorage.setItem(STORAGE_KEYS.lastEmail, String(userPayload.email));
  }

  // Builds the local session object after a successful login response.
  function buildLoginPayload(loginData, email, unlockTier) {
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
      unlock_tier: normalizeTier(unlockTier),
      is_first_login: Boolean(loginData.is_first_login),
      onboarding_completed: Boolean(loginData.onboarding_completed)
    };
  }

  // Shows an overlay and locks body scrolling while it is visible.
  function openOverlay(overlayId) {
    const overlay = byId(overlayId);
    if (!overlay) return null;

    overlay.classList.remove("d-none");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    return overlay;
  }

  // Creates the confetti pieces for the signup success overlay.
  // Only runs once per overlay instance.
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

  // Attempts an automatic login right after signup succeeds.
  // This allows the user to land directly on the dashboard.
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
      unlock_tier: unlockTier,
      is_first_login: true,
      onboarding_completed: false
    };

    persistUserSession(sessionPayload);
    stageOnboardingForUser(normalizedEmail, DEFAULT_ONBOARDING_STAGE);
    setOnboardingSessionActive(true);

    recordLoginDay(normalizedEmail);
    return true;
  }

  // Shows the login success overlay and inserts the user's first name.
  function showLoginSuccessOverlay(firstName) {
    const overlayElement = openOverlay("loginSuccessOverlay");
    if (!overlayElement) return false;

    const nameElement = byId("loginSuccessName");
    if (nameElement) {
      const safeFirstName = String(firstName || "").trim();
      nameElement.textContent = safeFirstName || "there";
    }

    return true;
  }

  // Handles final signup form submission.
  function wireSignupSubmit(formElement) {
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

      const valueIssue = validateSignupIdentityValues(signupValues, {
        includeRequiredChecks: false,
        passwordMismatchMessage: "Your passwords do not match. Please confirm your password."
      });
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

      // Preserve the selected tier so it is still available during first login.
      localStorage.setItem(STORAGE_KEYS.unlockTierPending, selectedTier);

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

  // Handles login form submission and session setup.
  function wireLoginSubmit(formElement) {
    if (!formElement) return;

    formElement.addEventListener("submit", async (event) => {
      event.preventDefault();

      const emailInput = byId("email");
      const passwordInput = byId("password");

      const email = String(emailInput?.value || "").trim();
      const password = String(passwordInput?.value || "").trim();

      setInvalidState(emailInput, false);
      setInvalidState(passwordInput, false);

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

        const pendingTier = normalizeTier(localStorage.getItem(STORAGE_KEYS.unlockTierPending), "");
        const existingUser = parseJson(localStorage.getItem(STORAGE_KEYS.user), {});
        const existingTier = normalizeTier(existingUser.unlock_tier || existingUser.unlock_level || existingUser.unlockTier, "");
        const serverTier = normalizeTier(responseData.start_level, "");

        const unlockTier = normalizeTier(serverTier || existingTier || pendingTier || "novice");
        const normalizedEmail = normalizeEmail(email);

        const loginPayload = buildLoginPayload(responseData, normalizedEmail, unlockTier);
        persistUserSession(loginPayload);

        const hasEmailCompletion =
          Boolean(responseData.onboarding_completed) ||
          isOnboardingDoneForUser(normalizedEmail);

        const shouldStartOnboarding =
          !hasEmailCompletion &&
          Boolean(responseData.is_first_login);

        // Only first-time users who have not completed onboarding are staged here.
        if (shouldStartOnboarding) {
          stageOnboardingForUser(normalizedEmail, DEFAULT_ONBOARDING_STAGE);
          setOnboardingSessionActive(true);
        }

        recordLoginDay(normalizedEmail);

        if (pendingTier) {
          localStorage.removeItem(STORAGE_KEYS.unlockTierPending);
        }

        const overlayShown = showLoginSuccessOverlay(responseData.first_name || loginPayload.first_name);
        if (!overlayShown) {
          const firstName = responseData.first_name || loginPayload.first_name || "there";
          showLoginBanner(`Welcome back, ${firstName}! Redirecting...`, "success");
        }

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, overlayShown ? 2200 : 900);
      } catch (error) {
        console.error("Login request failed", {
          error,
          loginUrl: apiUrl(authPath("login", "/login")),
          apiBase: API_BASE,
          online: navigator.onLine
        });
        showLoginBanner("Cannot reach the server right now. Please check your connection and try again.", "error");
      }
    });
  }

  // Handles forgot-password form validation and submission.
  function initForgotPasswordForm() {
    const forgotFormElement = byId("forgotForm");
    if (!forgotFormElement) return;

    const emailInput = byId("fp_email");
    const passwordInput = byId("fp_password");
    const confirmPasswordInput = byId("fp_confirm");

    const formViewElement = byId("forgotFormView");
    const successViewElement = byId("forgotSuccessView");

    forgotFormElement.addEventListener("submit", async (event) => {
      event.preventDefault();

      hideForgotBanner();
      setInvalidState(emailInput, false);
      setInvalidState(passwordInput, false);
      setInvalidState(confirmPasswordInput, false);

      const email = String(emailInput?.value || "").trim();
      const password = String(passwordInput?.value || "").trim();
      const confirmPassword = String(confirmPasswordInput?.value || "").trim();

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

  // Initialises whichever auth form exists on the current page.
  function initAuthForms() {
    const signupFormElement = byId("signupForm");
    if (signupFormElement) {
      initSignupWizard(signupFormElement);
      wireSignupSubmit(signupFormElement);
    }

    const loginFormElement = byId("loginForm");
    if (loginFormElement) wireLoginSubmit(loginFormElement);

    initForgotPasswordForm();
    initPasswordToggles();
  }

  // Prefix used for storing local login-day history per user.
  const LOGIN_LOG_KEY_PREFIX = "netology_login_log:";

  // Converts a date into a simple YYYY-MM-DD key.
  function dateToKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Builds the local storage key for a user's login history.
  function getLoginLogKey(email) {
    return `${LOGIN_LOG_KEY_PREFIX}${email}`;
  }

  // Reads the locally stored login history for a user.
  function readLoginLog(email) {
    try {
      return JSON.parse(localStorage.getItem(getLoginLogKey(email)) || "[]");
    } catch {
      return [];
    }
  }

  // Writes the login history array back to local storage.
  function writeLoginLog(email, logDays) {
    localStorage.setItem(getLoginLogKey(email), JSON.stringify(logDays));
  }

  // Applies XP to the locally stored user object.
  // Uses the shared XP helper when available.
  function applyXpToUser(userData, additionalXp) {
    if (XP?.applyXpToUser) return XP.applyXpToUser(userData, additionalXp);
    const nextTotalXp = Math.max(0, Number(userData?.xp || 0) + Number(additionalXp || 0));
    return { ...(userData || {}), xp: nextTotalXp };
  }

  // Adds XP to any matching stored user sessions.
  function addXpToStoredUser(email, deltaXp) {
    if (!deltaXp) return;

    [STORAGE_KEYS.user, STORAGE_KEYS.netologyUser].forEach((storageKey) => {
      const currentUser = parseJson(localStorage.getItem(storageKey), null);
      if (!currentUser || normalizeEmail(currentUser.email) !== normalizeEmail(email)) return;

      const updatedUser = applyXpToUser(currentUser, deltaXp);
      localStorage.setItem(storageKey, JSON.stringify(updatedUser));
    });
  }

  // Sends the latest login day to the server so streaks, achievements,
  // and related rewards can be updated in the background.
  function syncLoginDayToServer(normalizedEmail) {
    if (!API_BASE) return;

    const recordLoginPath = authPath("recordLogin", "/record-login");
    fetch(apiUrl(recordLoginPath), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail })
    }).then(async (response) => {
      const data = await response.json().catch(() => null);
      if (!data || !data.success) return;

      if (Array.isArray(data.log) && data.log.length) {
        writeLoginLog(normalizedEmail, data.log);
      }

      const unlocks = Array.isArray(data.newly_unlocked) ? data.newly_unlocked : [];
      if (unlocks.length && window.NetologyAchievements?.queueUnlocks) {
        window.NetologyAchievements.queueUnlocks(normalizedEmail, unlocks);
      }

      const achievementXp = Number(data.achievement_xp_added || 0);
      if (achievementXp > 0) {
        addXpToStoredUser(normalizedEmail, achievementXp);
      }
    }).catch(() => {
      // Network errors here are ignored because local tracking
      // has already been updated and this sync is non-blocking.
    });
  }

  // Records today's login locally and then syncs it to the server.
  function recordLoginDay(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return [];

    const loginLog = readLoginLog(normalizedEmail);
    const todayKey = dateToKey();

    if (!loginLog.includes(todayKey)) {
      loginLog.push(todayKey);
      loginLog.sort();
      writeLoginLog(normalizedEmail, loginLog);
    }

    // Local update happens immediately.
    // Server sync is sent in the background.
    syncLoginDayToServer(normalizedEmail);

    return loginLog;
  }

  // Exposed globally so other pages such as dashboard.js can reuse it.
  window.recordLoginDay = recordLoginDay;

  // Start auth-related behaviour once the page is ready.
  runWhenDomReady(() => {
    initAuthForms();
  });
})();
