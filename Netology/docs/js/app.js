/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: app.js
Purpose: Handles auth pages, onboarding tour flow, login streak badges, and shared popups.
Notes: Reorganized into clear sections, removed duplicate patterns, and kept existing behavior.
---------------------------------------------------------
*/

(() => {
  "use strict";

  // -------------------------------------------------------
  // Core config and small helpers
  // -------------------------------------------------------

  const API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  const ENDPOINTS = window.ENDPOINTS || {};
  const XP = window.NetologyXP || null;
  const ONBOARDING_STAGE_DEFAULT = "dashboard";
  const ONBOARDING_KEYS = {
    stage: "netology_onboarding_stage",
    user: "netology_onboarding_user",
    session: "netology_onboarding_session"
  };
  const ONBOARDING_USER_KEYS = {
    completedPrefix: "netology_onboarding_completed_",
    skippedPrefix: "netology_onboarding_skipped_"
  };
  const ONBOARDING_PATHS = {
    steps: "/api/onboarding/steps",
    start: "/api/onboarding/start",
    stepComplete: "/api/onboarding/step/:id",
    complete: "/api/onboarding/complete",
    skip: "/api/onboarding/skip"
  };

  function getElementById(elementId) {
    return document.getElementById(elementId);
  }

  function runWhenDomReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function parseJsonSafely(value, fallbackValue = null) {
    try {
      return JSON.parse(value);
    } catch {
      return fallbackValue;
    }
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeTier(value, fallback = "novice") {
    const normalized = String(value || "").trim().toLowerCase();
    if (["novice", "intermediate", "advanced"].includes(normalized)) return normalized;
    return fallback;
  }

  // Build per-user onboarding key names.
  function onboardingCompletedKey(email) {
    return `${ONBOARDING_USER_KEYS.completedPrefix}${normalizeEmail(email)}`;
  }

  function onboardingSkippedKey(email) {
    return `${ONBOARDING_USER_KEYS.skippedPrefix}${normalizeEmail(email)}`;
  }

  // Resolve onboarding API paths with local fallback values.
  function getOnboardingPath(pathKey) {
    return ENDPOINTS.onboarding?.[pathKey] || ONBOARDING_PATHS[pathKey] || "";
  }

  // Start onboarding for a specific user and stage.
  function stageOnboardingForUser(email, stage = ONBOARDING_STAGE_DEFAULT) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return;

    localStorage.setItem(ONBOARDING_KEYS.stage, stage);
    localStorage.setItem(ONBOARDING_KEYS.user, normalizedEmail);
  }

  // Clear the current onboarding stage only.
  function clearOnboardingStage() {
    localStorage.removeItem(ONBOARDING_KEYS.stage);
  }

  // Save or clear the onboarding session marker.
  function setOnboardingSessionActive(isActive) {
    try {
      if (isActive) {
        sessionStorage.setItem(ONBOARDING_KEYS.session, "true");
        return;
      }
      sessionStorage.removeItem(ONBOARDING_KEYS.session);
    } catch {
      // Ignore session storage failures.
    }
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());
  }

  function setInvalidState(inputElement, isInvalid) {
    if (!inputElement) return;
    inputElement.classList.toggle("is-invalid", Boolean(isInvalid));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // -------------------------------------------------------
  // Shared API helpers
  // -------------------------------------------------------

  async function defaultApiGet(path, queryParams = {}) {
    const resolvedUrl = API_BASE
      ? new URL(`${API_BASE}${path}`)
      : new URL(path, window.location.origin);

    Object.entries(queryParams || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      resolvedUrl.searchParams.set(key, String(value));
    });

    const response = await fetch(resolvedUrl.toString());
    return response.json();
  }

  async function defaultApiPost(path, payload = {}) {
    const resolvedUrl = API_BASE ? `${API_BASE}${path}` : path;
    const response = await fetch(resolvedUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    });
    return response.json();
  }

  const apiGet = typeof window.apiGet === "function" ? window.apiGet : defaultApiGet;
  const apiPost = typeof window.apiPost === "function" ? window.apiPost : defaultApiPost;

  if (typeof window.apiGet !== "function") window.apiGet = apiGet;
  if (typeof window.apiPost !== "function") window.apiPost = apiPost;

  // -------------------------------------------------------
  // Shared popup + inline banners
  // -------------------------------------------------------

  function showPopup(message, type = "info") {
    if (!message) return;

    if (window.NetologyToast?.showMessageToast) {
      window.NetologyToast.showMessageToast(String(message), type, 3200);
      return;
    }

    if (typeof window.showCelebrateToast === "function") {
      window.showCelebrateToast({
        title: "Info",
        message: String(message),
        type,
        mini: true,
        duration: 3200
      });
      return;
    }

    alert(String(message));
  }

  function createBannerIcon(type) {
    const normalizedType = String(type || "").toLowerCase();
    let iconClass = "bi-x-circle-fill";

    if (normalizedType === "success") iconClass = "bi-check-circle-fill";
    if (normalizedType === "warning") iconClass = "bi-exclamation-triangle-fill";

    const iconWrap = document.createElement("span");
    iconWrap.className = "net-banner-icon";
    iconWrap.setAttribute("aria-hidden", "true");

    const icon = document.createElement("i");
    icon.className = `bi ${iconClass}`;
    iconWrap.appendChild(icon);

    return iconWrap;
  }

  function renderInlineBanner(bannerElement, type, message) {
    if (!bannerElement) return;

    bannerElement.replaceChildren();
    bannerElement.append(createBannerIcon(type), document.createTextNode(String(message || "")));
  }

  function showInlineBanner(options) {
    const {
      bannerId,
      message,
      type = "error",
      timeoutMs = 4500,
      fallbackToPopupType = "error",
      timerKey
    } = options;

    const bannerElement = getElementById(bannerId);
    if (!bannerElement) {
      showPopup(message, fallbackToPopupType);
      return;
    }

    bannerElement.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
    bannerElement.classList.add("alert");

    if (type === "success") bannerElement.classList.add("alert-success");
    else if (type === "warning") bannerElement.classList.add("alert-warning");
    else bannerElement.classList.add("alert-danger");

    renderInlineBanner(bannerElement, type, message);

    if (timerKey) {
      const existingTimer = bannerTimers.get(timerKey);
      if (existingTimer) window.clearTimeout(existingTimer);

      const nextTimer = window.setTimeout(() => {
        bannerElement.classList.add("d-none");
        bannerTimers.delete(timerKey);
      }, timeoutMs);

      bannerTimers.set(timerKey, nextTimer);
    }
  }

  function hideInlineBanner(bannerId, timerKey) {
    const bannerElement = getElementById(bannerId);
    if (bannerElement) bannerElement.classList.add("d-none");

    if (timerKey && bannerTimers.has(timerKey)) {
      window.clearTimeout(bannerTimers.get(timerKey));
      bannerTimers.delete(timerKey);
    }
  }

  function showLoginBanner(message, type = "error") {
    showInlineBanner({
      bannerId: "loginBanner",
      message,
      type,
      timeoutMs: 4000,
      fallbackToPopupType: type === "success" ? "success" : "error",
      timerKey: "login"
    });
  }

  function showSignupBanner(message, type = "error") {
    showInlineBanner({
      bannerId: "signupBanner",
      message,
      type,
      timeoutMs: 4500,
      fallbackToPopupType: type === "success" ? "success" : "error",
      timerKey: "signup"
    });
  }

  function hideSignupBanner() {
    hideInlineBanner("signupBanner", "signup");
  }

  function showForgotBanner(message, type = "error") {
    showInlineBanner({
      bannerId: "forgotBanner",
      message,
      type,
      timeoutMs: 4500,
      fallbackToPopupType: type === "success" ? "success" : "error",
      timerKey: "forgot"
    });
  }

  function hideForgotBanner() {
    hideInlineBanner("forgotBanner", "forgot");
  }

  const bannerTimers = new Map();
  window.showPopup = showPopup;

  // -------------------------------------------------------
  // Decorative network backgrounds
  // -------------------------------------------------------

  const TOPOLOGY_LIBRARY = [
    {
      name: "star",
      nodes: [
        { x: 400, y: 250, r: 16 },
        { x: 200, y: 100, r: 10 },
        { x: 600, y: 100, r: 10 },
        { x: 150, y: 300, r: 10 },
        { x: 650, y: 300, r: 10 },
        { x: 250, y: 420, r: 10 },
        { x: 550, y: 420, r: 10 }
      ],
      links: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]]
    },
    {
      name: "ring",
      nodes: [
        { x: 400, y: 80, r: 12 },
        { x: 580, y: 170, r: 12 },
        { x: 600, y: 340, r: 12 },
        { x: 400, y: 430, r: 12 },
        { x: 200, y: 340, r: 12 },
        { x: 220, y: 170, r: 12 }
      ],
      links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]]
    },
    {
      name: "mesh",
      nodes: [
        { x: 200, y: 120, r: 11 },
        { x: 400, y: 80, r: 11 },
        { x: 600, y: 120, r: 11 },
        { x: 650, y: 300, r: 11 },
        { x: 500, y: 420, r: 11 },
        { x: 300, y: 420, r: 11 },
        { x: 150, y: 300, r: 11 },
        { x: 400, y: 260, r: 13 }
      ],
      links: [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0],
        [0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]
      ]
    },
    {
      name: "bus",
      nodes: [
        { x: 100, y: 250, r: 10 },
        { x: 230, y: 250, r: 10 },
        { x: 360, y: 250, r: 10 },
        { x: 490, y: 250, r: 10 },
        { x: 620, y: 250, r: 10 },
        { x: 230, y: 140, r: 9 },
        { x: 360, y: 140, r: 9 },
        { x: 490, y: 140, r: 9 },
        { x: 230, y: 360, r: 9 },
        { x: 490, y: 360, r: 9 }
      ],
      links: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [2, 6], [3, 7], [1, 8], [3, 9]]
    },
    {
      name: "tree",
      nodes: [
        { x: 400, y: 70, r: 14 },
        { x: 250, y: 190, r: 12 },
        { x: 550, y: 190, r: 12 },
        { x: 160, y: 310, r: 10 },
        { x: 340, y: 310, r: 10 },
        { x: 460, y: 310, r: 10 },
        { x: 640, y: 310, r: 10 },
        { x: 160, y: 420, r: 9 },
        { x: 340, y: 420, r: 9 },
        { x: 460, y: 420, r: 9 },
        { x: 640, y: 420, r: 9 }
      ],
      links: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [3, 7], [4, 8], [5, 9], [6, 10]]
    },
    {
      name: "ireland",
      nodes: [
        { x: 420, y: 60, r: 10 },
        { x: 380, y: 120, r: 10 },
        { x: 350, y: 180, r: 11 },
        { x: 320, y: 240, r: 10 },
        { x: 340, y: 300, r: 12 },
        { x: 370, y: 360, r: 10 },
        { x: 400, y: 410, r: 10 },
        { x: 430, y: 450, r: 10 },
        { x: 450, y: 160, r: 10 },
        { x: 470, y: 220, r: 10 },
        { x: 460, y: 280, r: 11 },
        { x: 440, y: 340, r: 10 },
        { x: 390, y: 250, r: 13 }
      ],
      links: [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
        [0, 8], [8, 9], [9, 10], [10, 11], [11, 7],
        [2, 12], [3, 12], [4, 12], [9, 12], [10, 12]
      ]
    },
    {
      name: "enterprise",
      nodes: [
        { x: 400, y: 80, r: 14 },
        { x: 200, y: 200, r: 12 },
        { x: 600, y: 200, r: 12 },
        { x: 120, y: 340, r: 10 },
        { x: 280, y: 340, r: 10 },
        { x: 520, y: 340, r: 10 },
        { x: 680, y: 340, r: 10 },
        { x: 200, y: 440, r: 9 },
        { x: 600, y: 440, r: 9 }
      ],
      links: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [3, 7], [4, 7], [5, 8], [6, 8], [1, 2], [3, 4], [5, 6]]
    }
  ];

  function drawRandomTopology(svgElement) {
    if (!svgElement) return;

    const randomTopology = TOPOLOGY_LIBRARY[Math.floor(Math.random() * TOPOLOGY_LIBRARY.length)];

    const linksGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    linksGroup.setAttribute("class", "net-network-links");

    randomTopology.links.forEach((linkPair, linkIndex) => {
      const startNode = randomTopology.nodes[linkPair[0]];
      const endNode = randomTopology.nodes[linkPair[1]];

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", "net-network-link");
      line.setAttribute("x1", startNode.x);
      line.setAttribute("y1", startNode.y);
      line.setAttribute("x2", endNode.x);
      line.setAttribute("y2", endNode.y);
      line.style.animationDelay = `${linkIndex * 0.15}s`;
      linksGroup.appendChild(line);
    });

    const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodesGroup.setAttribute("class", "net-network-nodes");

    randomTopology.nodes.forEach((node, nodeIndex) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("class", "net-network-node");
      circle.setAttribute("cx", node.x);
      circle.setAttribute("cy", node.y);
      circle.setAttribute("r", node.r);
      circle.style.animationDelay = `${nodeIndex * 0.2}s`;
      nodesGroup.appendChild(circle);
    });

    svgElement.innerHTML = "";
    svgElement.append(linksGroup, nodesGroup);
  }

  function spawnFloatingParticles(containerElement, particleCount = 20) {
    if (!containerElement) return;

    for (let particleIndex = 0; particleIndex < particleCount; particleIndex += 1) {
      const particle = document.createElement("span");
      particle.className = "net-welcome-particle";
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 4}s`;
      particle.style.animationDuration = `${3 + Math.random() * 4}s`;
      containerElement.appendChild(particle);
    }
  }

  function initDecorativeBackgrounds() {
    drawRandomTopology(getElementById("welcomeTopologySvg"));
    drawRandomTopology(getElementById("loginTopologySvg"));
    spawnFloatingParticles(getElementById("welcomeParticles"), 25);
    spawnFloatingParticles(getElementById("loginParticles"), 25);
  }

  window.NET_TOPOLOGIES = TOPOLOGY_LIBRARY;

  // -------------------------------------------------------
  // Signup wizard + shared auth form UI
  // -------------------------------------------------------

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
        if (iconElement) {
          iconElement.className = isPasswordHidden ? "bi bi-eye-slash" : "bi bi-eye";
        }
      });
    });
  }

  function initSignupWizard(formElement) {
    const signupPages = Array.from(document.querySelectorAll(".net-step-page"));
    const stepLabelElement = getElementById("stepLabel");
    const stepTitleElement = getElementById("stepTitle");
    const stepProgressElement = getElementById("stepProgress");
    const backButton = getElementById("backBtn");
    const nextButton = getElementById("nextBtn");
    const submitButton = getElementById("submitBtn");

    const wizardStepTitles = {
      1: "Your details",
      2: "Your level",
      3: "Your reasons",
      4: "Review"
    };

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

    ["first_name", "last_name", "username", "dob", "email", "password", "confirm_password"].forEach((fieldId) => {
      const inputElement = getElementById(fieldId);
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
      stepTitleElement.textContent = wizardStepTitles[currentStep] || "";
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
      const firstNameInput = getElementById("first_name");
      const lastNameInput = getElementById("last_name");
      const usernameInput = getElementById("username");
      const dobInput = getElementById("dob");
      const emailInput = getElementById("email");
      const passwordInput = getElementById("password");
      const confirmPasswordInput = getElementById("confirm_password");

      [
        firstNameInput,
        lastNameInput,
        usernameInput,
        dobInput,
        emailInput,
        passwordInput,
        confirmPasswordInput
      ].forEach((inputElement) => setInvalidState(inputElement, false));

      if (!firstNameInput?.value.trim()) {
        setInvalidState(firstNameInput, true);
        showSignupBanner("Please enter your first name.", "warning");
        firstNameInput?.focus();
        return false;
      }

      if (!lastNameInput?.value.trim()) {
        setInvalidState(lastNameInput, true);
        showSignupBanner("Please enter your last name.", "warning");
        lastNameInput?.focus();
        return false;
      }

      if (!usernameInput?.value.trim()) {
        setInvalidState(usernameInput, true);
        showSignupBanner("Please choose a username.", "warning");
        usernameInput?.focus();
        return false;
      }

      if (!dobInput?.value) {
        setInvalidState(dobInput, true);
        showSignupBanner("Please select your date of birth.", "warning");
        dobInput?.focus();
        return false;
      }

      const emailValue = String(emailInput?.value || "").trim();
      if (!emailValue) {
        setInvalidState(emailInput, true);
        showSignupBanner("Please enter your email address.", "warning");
        emailInput?.focus();
        return false;
      }

      if (!isValidEmail(emailValue)) {
        setInvalidState(emailInput, true);
        showSignupBanner("That email format does not look right. Please check and try again.", "warning");
        emailInput?.focus();
        return false;
      }

      const passwordValue = String(passwordInput?.value || "").trim();
      const confirmPasswordValue = String(confirmPasswordInput?.value || "").trim();

      if (!passwordValue) {
        setInvalidState(passwordInput, true);
        showSignupBanner("Please enter a password.", "warning");
        passwordInput?.focus();
        return false;
      }

      if (passwordValue.length < 8) {
        setInvalidState(passwordInput, true);
        showSignupBanner("Password must be at least 8 characters.", "warning");
        passwordInput?.focus();
        return false;
      }

      if (!confirmPasswordValue) {
        setInvalidState(confirmPasswordInput, true);
        showSignupBanner("Please confirm your password.", "warning");
        confirmPasswordInput?.focus();
        return false;
      }

      if (passwordValue !== confirmPasswordValue) {
        setInvalidState(confirmPasswordInput, true);
        showSignupBanner("Passwords do not match. Please confirm again.", "warning");
        confirmPasswordInput?.focus();
        return false;
      }

      return true;
    }

    function validateStepTwo() {
      const selectedLevel = document.querySelector('input[name="level"]:checked');
      if (selectedLevel) return true;
      showSignupBanner("Please choose your starting level.", "warning");
      return false;
    }

    function validateStepThree() {
      const selectedReasons = document.querySelectorAll('input[name="reasons"]:checked');
      if (selectedReasons.length > 0) return true;
      showSignupBanner("Please select at least one reason to continue.", "warning");
      return false;
    }

    function setReviewText(elementId, value) {
      const element = getElementById(elementId);
      if (element) element.textContent = value;
    }

    function fillReviewValues() {
      setReviewText("reviewFirst", getElementById("first_name")?.value || "-");
      setReviewText("reviewLast", getElementById("last_name")?.value || "-");
      setReviewText("reviewUser", getElementById("username")?.value || "-");
      setReviewText("reviewEmail", getElementById("email")?.value || "-");
      setReviewText("reviewDob", getElementById("dob")?.value || "-");

      const selectedLevel = document.querySelector('input[name="level"]:checked');
      setReviewText("reviewLevel", selectedLevel ? selectedLevel.value : "-");

      const selectedReasons = Array.from(document.querySelectorAll('input[name="reasons"]:checked'))
        .map((inputElement) => inputElement.value);

      setReviewText("reviewReasons", selectedReasons.length ? selectedReasons.join(", ") : "None selected");
    }
  }

  // -------------------------------------------------------
  // Auth requests and session storage
  // -------------------------------------------------------

  function persistUserSession(userPayload) {
    if (!userPayload) return;
    localStorage.setItem("user", JSON.stringify(userPayload));
    localStorage.setItem("netology_user", JSON.stringify(userPayload));
    if (userPayload.email) {
      localStorage.setItem("netology_last_email", String(userPayload.email));
    }
  }

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

  function openOverlay(overlayId) {
    const overlay = getElementById(overlayId);
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

  async function tryAutoLoginAfterSignup(email, password, selectedTier) {
    const loginFormData = new FormData();
    loginFormData.append("email", email);
    loginFormData.append("password", password);

    const response = await fetch(`${API_BASE}/login`, {
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

    stageOnboardingForUser(normalizedEmail, ONBOARDING_STAGE_DEFAULT);
    setOnboardingSessionActive(true);

    recordLoginDay(normalizedEmail);
    return true;
  }

  function showLoginSuccessOverlay(firstName) {
    const overlayElement = openOverlay("loginSuccessOverlay");
    if (!overlayElement) return false;

    const nameElement = getElementById("loginSuccessName");
    if (nameElement) {
      const safeFirstName = String(firstName || "").trim();
      nameElement.textContent = safeFirstName || "there";
    }

    return true;
  }

  function wireSignupSubmit(formElement) {
    if (!formElement) return;

    formElement.addEventListener("submit", async (event) => {
      event.preventDefault();

      const firstName = getElementById("first_name")?.value.trim();
      const lastName = getElementById("last_name")?.value.trim();
      const username = getElementById("username")?.value.trim();
      const dateOfBirth = getElementById("dob")?.value;
      const email = getElementById("email")?.value.trim();
      const password = getElementById("password")?.value.trim();
      const confirmPassword = getElementById("confirm_password")?.value.trim();
      const selectedLevel = document.querySelector('input[name="level"]:checked');
      const selectedReasons = document.querySelectorAll('input[name="reasons"]:checked');

      if (!firstName || !lastName || !username || !dateOfBirth || !email || !password || !confirmPassword) {
        showSignupBanner("Please complete all required fields before creating your account.", "warning");
        return;
      }

      if (!isValidEmail(email)) {
        showSignupBanner("That email format does not look right. Please check and try again.", "warning");
        return;
      }

      if (password.length < 8) {
        showSignupBanner("Password must be at least 8 characters.", "warning");
        return;
      }

      if (password !== confirmPassword) {
        showSignupBanner("Your passwords do not match. Please confirm your password.", "warning");
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
        const response = await fetch(`${API_BASE}/register`, {
          method: "POST",
          body: new FormData(formElement)
        });

        const responseData = await response.json();

        if (!responseData?.success) {
          showPopup(responseData?.message || "Signup failed. Try again.", "error");
          return;
        }

        let autoLoginWorked = false;
        try {
          autoLoginWorked = await tryAutoLoginAfterSignup(email, password, selectedTier);
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

        showPopup(
          autoLoginWorked ? "Account created! Heading to your dashboard..." : "Account created! Please sign in.",
          "success"
        );

        setTimeout(() => {
          window.location.href = autoLoginWorked ? "dashboard.html" : "login.html";
        }, 1200);
      } catch {
        showPopup("Server error. Please try again.", "error");
      }
    });
  }

  function wireLoginSubmit(formElement) {
    if (!formElement) return;

    formElement.addEventListener("submit", async (event) => {
      event.preventDefault();

      const emailInput = getElementById("email");
      const passwordInput = getElementById("password");

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
        const response = await fetch(`${API_BASE}/login`, {
          method: "POST",
          body: new FormData(formElement)
        });

        const responseData = await response.json();
        if (!responseData?.success) {
          setInvalidState(emailInput, true);
          setInvalidState(passwordInput, true);
          showLoginBanner(responseData?.message || "Incorrect email or password. Please try again.", "error");
          return;
        }

        const pendingTier = normalizeTier(localStorage.getItem("unlock_tier_pending"), "");
        const existingUser = parseJsonSafely(localStorage.getItem("user"), {}) || {};
        const existingTier = normalizeTier(existingUser.unlock_tier || existingUser.unlock_level || existingUser.unlockTier, "");
        const serverTier = normalizeTier(responseData.start_level, "");

        const unlockTier = normalizeTier(serverTier || existingTier || pendingTier || "novice");
        const normalizedEmail = normalizeEmail(email);

        const loginPayload = buildLoginPayload(responseData, normalizedEmail, unlockTier);
        persistUserSession(loginPayload);

        const hasEmailCompletion =
          Boolean(responseData.onboarding_completed) ||
          localStorage.getItem(onboardingCompletedKey(normalizedEmail)) === "true" ||
          localStorage.getItem(onboardingSkippedKey(normalizedEmail)) === "true";

        const shouldStartOnboarding =
          !hasEmailCompletion &&
          Boolean(responseData.is_first_login);

        if (shouldStartOnboarding) {
          stageOnboardingForUser(normalizedEmail, ONBOARDING_STAGE_DEFAULT);
          setOnboardingSessionActive(true);
        }

        const loginLog = recordLoginDay(normalizedEmail);
        const streak = computeLoginStreak(loginLog);
        await awardLoginStreakBadges(normalizedEmail, streak);

        if (pendingTier) {
          localStorage.removeItem("unlock_tier_pending");
        }

        const overlayShown = showLoginSuccessOverlay(responseData.first_name || loginPayload.first_name);
        if (!overlayShown) {
          showLoginBanner(`Welcome back, ${responseData.first_name}! Redirecting...`, "success");
        }

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, overlayShown ? 2200 : 900);
      } catch {
        showLoginBanner("Cannot reach the server right now. Please check your connection and try again.", "error");
      }
    });
  }

  function initForgotPasswordForm() {
    const forgotFormElement = getElementById("forgotForm");
    if (!forgotFormElement) return;

    const emailInput = getElementById("fp_email");
    const passwordInput = getElementById("fp_password");
    const confirmPasswordInput = getElementById("fp_confirm");

    const formViewElement = getElementById("forgotFormView");
    const successViewElement = getElementById("forgotSuccessView");

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
        const response = await fetch(`${API_BASE}/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const responseData = await response.json();
        if (!responseData?.success) {
          showForgotBanner(responseData?.message || "Reset failed.", "error");
          return;
        }

        showPopup("Password updated successfully.", "success");
        formViewElement?.classList.add("d-none");
        successViewElement?.classList.remove("d-none");
      } catch {
        showForgotBanner("Server error. Please try again.", "error");
      }
    });
  }

  function initAuthForms() {
    const signupFormElement = getElementById("signupForm");
    if (signupFormElement) {
      initSignupWizard(signupFormElement);
      wireSignupSubmit(signupFormElement);
    }

    const loginFormElement = getElementById("loginForm");
    if (loginFormElement) {
      wireLoginSubmit(loginFormElement);
    }

    initForgotPasswordForm();
    initPasswordToggles();
  }

  // -------------------------------------------------------
  // Login streak and login badge system
  // -------------------------------------------------------

  function getDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getLoginLog(email) {
    try {
      return JSON.parse(localStorage.getItem(`netology_login_log:${email}`) || "[]");
    } catch {
      return [];
    }
  }

  function saveLoginLog(email, logDays) {
    localStorage.setItem(`netology_login_log:${email}`, JSON.stringify(logDays));
  }

  function recordLoginDay(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return [];

    const loginLog = getLoginLog(normalizedEmail);
    const todayKey = getDateKey();

    if (!loginLog.includes(todayKey)) {
      loginLog.push(todayKey);
      loginLog.sort();
      saveLoginLog(normalizedEmail, loginLog);
    }

    try {
      const recordLoginPath = ENDPOINTS.auth?.recordLogin || "/record-login";
      if (API_BASE) {
        fetch(`${API_BASE}${recordLoginPath}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail })
        }).then(async (response) => {
          const data = await response.json().catch(() => null);
          if (!data || !data.success) return;

          if (Array.isArray(data.log) && data.log.length) {
            saveLoginLog(normalizedEmail, data.log);
          }

          const unlocks = Array.isArray(data.newly_unlocked) ? data.newly_unlocked : [];
          if (unlocks.length && window.NetologyAchievements?.queueUnlocks) {
            window.NetologyAchievements.queueUnlocks(normalizedEmail, unlocks);
          }

          const achievementXp = Number(data.achievement_xp_added || 0);
          if (achievementXp > 0) {
            bumpStoredUserXp(normalizedEmail, achievementXp);
          }
        }).catch(() => {
          // Ignore network errors for background sync.
        });
      }
    } catch {
      // Ignore unexpected fetch errors.
    }

    return loginLog;
  }

  function computeLoginStreak(logDays) {
    if (!Array.isArray(logDays) || !logDays.length) return 0;

    const daySet = new Set(logDays);
    const cursorDate = new Date();
    let streakCount = 0;

    while (daySet.has(getDateKey(cursorDate))) {
      streakCount += 1;
      cursorDate.setDate(cursorDate.getDate() - 1);
    }

    return streakCount;
  }

  function applyXpToUser(userData, additionalXp) {
    if (XP?.applyXpToUser) return XP.applyXpToUser(userData, additionalXp);
    const nextTotalXp = Math.max(0, Number(userData?.xp || 0) + Number(additionalXp || 0));
    return { ...(userData || {}), xp: nextTotalXp };
  }

  function bumpStoredUserXp(email, deltaXp) {
    if (!deltaXp) return;

    ["user", "netology_user"].forEach((storageKey) => {
      const currentUser = parseJsonSafely(localStorage.getItem(storageKey), null);
      if (!currentUser || normalizeEmail(currentUser.email) !== normalizeEmail(email)) return;

      const updatedUser = applyXpToUser(currentUser, deltaXp);
      localStorage.setItem(storageKey, JSON.stringify(updatedUser));
    });
  }

  // Kept for compatibility with existing dashboard/login flow.
  // Achievements now unlock from backend event evaluation.
  async function awardLoginStreakBadges(email, streak) {
    void email;
    void streak;
  }

  window.recordLoginDay = recordLoginDay;
  window.awardLoginStreakBadges = awardLoginStreakBadges;

  // -------------------------------------------------------
  // Onboarding tour
  // -------------------------------------------------------

  class OnboardingTour {
    constructor(userEmail, options = {}) {
      this.userEmail = userEmail;
      this.options = options;
      this.steps = Array.isArray(options.steps) ? options.steps : [];
      this.allowApi = options.allowApi !== false;
      this.onComplete = options.onComplete;
      this.onSkip = options.onSkip;

      this.currentStepIndex = 0;
      this.currentTarget = null;
      this.stepToken = 0;
      this.isActive = false;
      this.isScreenLocked = false;

      this.backdropElement = null;
      this.spotlightElement = null;
      this.tooltipElement = null;
      this.lastSpotlitElement = null;

      this.scrollBlocker = null;
      this.keyBlocker = null;
      this.resizeHandler = null;
      this.escapeHandler = null;
    }

    async init() {
      try {
        if (!this.steps.length && this.allowApi) {
          const stepPath = getOnboardingPath("steps");
          const responseData = await apiGet(stepPath);
          this.steps = Array.isArray(responseData?.steps) ? responseData.steps : [];
        }

        if (!this.steps.length) {
          console.warn("Onboarding steps are missing. Tour was not started.");
          return;
        }

        if (this.allowApi) {
          const startPath = getOnboardingPath("start");
          await apiPost(startPath, { user_email: this.userEmail });
        }

        this.isActive = true;
        this.createBackdrop();
        this.createSpotlight();
        this.createTooltip();
        this.lockScreen();
        await this.showStep(0, 1);
      } catch (error) {
        console.error("Onboarding init failed:", error);
      }
    }

    createBackdrop() {
      this.backdropElement = document.createElement("div");
      this.backdropElement.className = "onboarding-backdrop";
      document.body.appendChild(this.backdropElement);
    }

    createSpotlight() {
      this.spotlightElement = document.createElement("div");
      this.spotlightElement.className = "onboarding-spotlight";
      document.body.appendChild(this.spotlightElement);
    }

    createTooltip() {
      this.tooltipElement = document.createElement("div");
      this.tooltipElement.className = "onboarding-tooltip";
      this.tooltipElement.setAttribute("role", "dialog");
      this.tooltipElement.setAttribute("aria-live", "polite");
      this.tooltipElement.setAttribute("aria-modal", "true");
      this.tooltipElement.setAttribute("tabindex", "0");
      document.body.appendChild(this.tooltipElement);
    }

    lockScreen() {
      if (this.isScreenLocked) return;

      this.isScreenLocked = true;
      document.documentElement.classList.add("net-onboarding-lock");
      document.body.classList.add("net-onboarding-lock");

      const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      this.attachScrollBlockers();
      this.attachResizeHandler();

      this.escapeHandler = (event) => {
        if (event.key === "Escape") {
          this.skipTour();
        }
      };
      window.addEventListener("keydown", this.escapeHandler);
    }

    unlockScreen() {
      if (!this.isScreenLocked) return;

      this.isScreenLocked = false;
      document.documentElement.classList.remove("net-onboarding-lock");
      document.body.classList.remove("net-onboarding-lock");
      document.body.style.paddingRight = "";

      this.detachScrollBlockers();
      this.detachResizeHandler();

      if (this.escapeHandler) {
        window.removeEventListener("keydown", this.escapeHandler);
        this.escapeHandler = null;
      }
    }

    attachScrollBlockers() {
      if (this.scrollBlocker || this.keyBlocker) return;

      this.scrollBlocker = (event) => {
        if (!this.isActive) return;
        event.preventDefault();
      };

      this.keyBlocker = (event) => {
        if (!this.isActive) return;
        const blockedKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", " "];
        if (blockedKeys.includes(event.key)) {
          event.preventDefault();
        }
      };

      window.addEventListener("wheel", this.scrollBlocker, { passive: false });
      window.addEventListener("touchmove", this.scrollBlocker, { passive: false });
      window.addEventListener("keydown", this.keyBlocker, { passive: false });
    }

    detachScrollBlockers() {
      if (this.scrollBlocker) {
        window.removeEventListener("wheel", this.scrollBlocker);
        window.removeEventListener("touchmove", this.scrollBlocker);
        this.scrollBlocker = null;
      }

      if (this.keyBlocker) {
        window.removeEventListener("keydown", this.keyBlocker);
        this.keyBlocker = null;
      }
    }

    attachResizeHandler() {
      if (this.resizeHandler) return;
      this.resizeHandler = () => this.refreshPositions();
      window.addEventListener("resize", this.resizeHandler);
    }

    detachResizeHandler() {
      if (!this.resizeHandler) return;
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }

    refreshPositions() {
      const step = this.steps[this.currentStepIndex];
      if (!step || !this.currentTarget) return;

      this.updateSpotlight(this.currentTarget);
      this.updateTooltip(step, this.currentTarget);
    }

    activateTab(tabName) {
      if (!tabName) return;

      const tabButton = document.querySelector(`[role="tab"][data-tab="${tabName}"]`);
      if (tabButton && typeof tabButton.click === "function") {
        tabButton.click();
      }
    }

    waitForFrames(count = 2) {
      return new Promise((resolve) => {
        let frameCount = 0;

        const tick = () => {
          frameCount += 1;
          if (frameCount >= count) {
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      });
    }

    waitForScrollToSettle(timeoutMs = 900) {
      return new Promise((resolve) => {
        let lastScrollY = window.scrollY;
        let stableFrames = 0;
        const startTime = performance.now();

        const tick = () => {
          const currentScrollY = window.scrollY;

          if (Math.abs(currentScrollY - lastScrollY) < 1) {
            stableFrames += 1;
          } else {
            stableFrames = 0;
            lastScrollY = currentScrollY;
          }

          if (stableFrames >= 2 || performance.now() - startTime > timeoutMs) {
            resolve();
            return;
          }

          requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      });
    }

    async focusTarget(targetElement) {
      if (!targetElement) return;

      this.detachScrollBlockers();
      await this.waitForFrames(1);

      const targetRect = targetElement.getBoundingClientRect();
      const centeredTop = Math.max(
        0,
        window.scrollY + targetRect.top - (window.innerHeight / 2 - targetRect.height / 2)
      );

      const distance = Math.abs(window.scrollY - centeredTop);
      if (distance >= 4) {
        window.scrollTo({ top: centeredTop, behavior: "smooth" });
        await this.waitForScrollToSettle();
      }

      this.attachScrollBlockers();
    }

    async showStep(stepIndex, direction = 1) {
      let cursor = stepIndex;
      const visitedIndexes = new Set();

      while (cursor >= 0 && cursor < this.steps.length) {
        if (visitedIndexes.has(cursor)) break;
        visitedIndexes.add(cursor);

        const step = this.steps[cursor];
        if (step?.tab) {
          this.activateTab(step.tab);
          await this.waitForFrames();
        }

        const targetElement = document.querySelector(`[data-tour="${step.target}"]`);
        if (!targetElement) {
          console.warn(`Tour target [data-tour="${step.target}"] not found. Skipping step.`);
          cursor += direction;
          continue;
        }

        this.currentStepIndex = cursor;
        this.currentTarget = targetElement;

        const token = ++this.stepToken;
        await this.focusTarget(targetElement);
        if (token !== this.stepToken) return;

        this.updateSpotlight(targetElement);
        this.updateTooltip(step, targetElement);
        return;
      }

      console.warn("No remaining onboarding targets found for this page.");

      if (typeof this.onComplete === "function") {
        await this.onComplete();
        this.closeTour();
        return;
      }

      await this.completeTour();
    }

    updateSpotlight(targetElement) {
      if (this.lastSpotlitElement && this.lastSpotlitElement !== targetElement) {
        this.lastSpotlitElement.classList.remove("onboarding-target-active");
      }

      targetElement.classList.add("onboarding-target-active");
      this.lastSpotlitElement = targetElement;

      const targetRect = targetElement.getBoundingClientRect();
      const padding = 10;

      let top = Math.max(8, targetRect.top - padding);
      let left = Math.max(8, targetRect.left - padding);
      let width = Math.max(24, targetRect.width + padding * 2);
      let height = Math.max(24, targetRect.height + padding * 2);

      width = Math.min(window.innerWidth - left - 8, width);
      height = Math.min(window.innerHeight - top - 8, height);

      this.spotlightElement.style.top = `${top}px`;
      this.spotlightElement.style.left = `${left}px`;
      this.spotlightElement.style.width = `${width}px`;
      this.spotlightElement.style.height = `${height}px`;
    }

    updateTooltip(step, targetElement) {
      const targetRect = targetElement.getBoundingClientRect();
      const totalSteps = this.steps.length;
      const currentStepNumber = this.currentStepIndex + 1;
      const isLastStep = this.currentStepIndex === totalSteps - 1;

      this.tooltipElement.classList.remove("is-intro");
      this.tooltipElement.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span style="font-size:11px; color:#06b6d4; font-weight:600; letter-spacing:0.04em; text-transform:uppercase;">
            Step ${currentStepNumber} of ${totalSteps}
          </span>
        </div>
        <h3>${escapeHtml(step.title)}</h3>
        <p>${escapeHtml(step.description)}</p>
        <div style="margin-top:16px; display:flex; gap:8px; align-items:center; justify-content:center; flex-wrap:wrap;">
          ${isLastStep
            ? '<button class="btn-tour" onclick="window.onboardingTour.completeTour()">Finish &#8250;</button>'
            : '<button class="btn-tour" onclick="window.onboardingTour.nextStep()">Continue &#8250;</button>'}
          <button class="btn-tour-secondary" onclick="window.onboardingTour.skipTour()">Skip</button>
          <button class="btn-tour-secondary" onclick="window.onboardingTour.prevStep()"
            ${this.currentStepIndex === 0 ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ""}>
            &#8249; Back
          </button>
        </div>
      `;

      this.tooltipElement.style.top = "0";
      this.tooltipElement.style.left = "0";
      this.tooltipElement.style.visibility = "hidden";

      const margin = 16;
      const gap = 18;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const tooltipWidth = this.tooltipElement.offsetWidth;
      const tooltipHeight = this.tooltipElement.offsetHeight;

      const centerX = targetRect.left + targetRect.width / 2;
      let left = Math.min(
        Math.max(centerX - tooltipWidth / 2, margin),
        viewportWidth - tooltipWidth - margin
      );

      const spaceBelow = viewportHeight - targetRect.bottom;
      const spaceAbove = targetRect.top;
      let top;

      if (spaceBelow >= tooltipHeight + gap) {
        top = targetRect.bottom + gap;
      } else if (spaceAbove >= tooltipHeight + gap) {
        top = targetRect.top - tooltipHeight - gap;
      } else {
        top = viewportHeight - tooltipHeight - margin;
      }

      top = Math.max(margin, Math.min(top, viewportHeight - tooltipHeight - margin));
      left = Math.max(margin, Math.min(left, viewportWidth - tooltipWidth - margin));

      this.tooltipElement.style.top = `${top}px`;
      this.tooltipElement.style.left = `${left}px`;
      this.tooltipElement.style.visibility = "";

      if (typeof this.tooltipElement.focus === "function") {
        this.tooltipElement.focus({ preventScroll: true });
      }
    }

    nextStep() {
      if (this.currentStepIndex >= this.steps.length - 1) return;
      this.showStep(this.currentStepIndex + 1, 1);
    }

    prevStep() {
      if (this.currentStepIndex <= 0) return;
      this.showStep(this.currentStepIndex - 1, -1);
    }

    async completeTour() {
      if (typeof this.onComplete === "function") {
        await this.onComplete();
        this.closeTour();
        return;
      }

      const completePath = getOnboardingPath("complete");
      await apiPost(completePath, { user_email: this.userEmail });

      this.closeTour();
      window.location.href = "/dashboard.html";
    }

    async skipTour() {
      if (typeof this.onSkip === "function") {
        await this.onSkip();
        this.closeTour();
        return;
      }

      try {
        const skipPath = getOnboardingPath("skip");
        await apiPost(skipPath, { user_email: this.userEmail });
      } catch {
        // Ignore skip request failure.
      }

      this.closeTour();
      window.location.href = "/dashboard.html";
    }

    closeTour() {
      this.isActive = false;
      this.currentTarget = null;

      if (this.lastSpotlitElement) {
        this.lastSpotlitElement.classList.remove("onboarding-target-active");
        this.lastSpotlitElement = null;
      }

      if (this.backdropElement) this.backdropElement.remove();
      if (this.spotlightElement) this.spotlightElement.remove();
      if (this.tooltipElement) this.tooltipElement.remove();

      this.backdropElement = null;
      this.spotlightElement = null;
      this.tooltipElement = null;

      this.unlockScreen();
    }
  }

  function getOnboardingFlow() {
    return window.ONBOARDING_FLOW || ["dashboard", "courses", "course", "sandbox", "progress", "account", "wrapup"];
  }

  function getOnboardingStageUrl(stage) {
    const stageUrls = window.ONBOARDING_STAGE_URLS || {};
    return stageUrls[stage] || `${stage}.html`;
  }

  function markOnboardingComplete() {
    clearOnboardingStage();

    const onboardingUser = normalizeEmail(localStorage.getItem(ONBOARDING_KEYS.user));
    if (onboardingUser) {
      localStorage.setItem(onboardingCompletedKey(onboardingUser), "true");
    }

    localStorage.removeItem(ONBOARDING_KEYS.user);
    setOnboardingSessionActive(false);

    ["user", "netology_user"].forEach((storageKey) => {
      const userData = parseJsonSafely(localStorage.getItem(storageKey), null);
      if (!userData) return;
      userData.onboarding_completed = true;
      localStorage.setItem(storageKey, JSON.stringify(userData));
    });
  }

  function markOnboardingSkipped() {
    clearOnboardingStage();

    const onboardingUser = normalizeEmail(localStorage.getItem(ONBOARDING_KEYS.user));
    if (onboardingUser) {
      localStorage.setItem(onboardingSkippedKey(onboardingUser), "true");
    }

    localStorage.removeItem(ONBOARDING_KEYS.user);
    setOnboardingSessionActive(false);
  }

  function startOnboardingTour(userEmail, options = {}) {
    window.onboardingTour = new OnboardingTour(userEmail, options);
    window.onboardingTour.init();
  }

  function isOnboardingBlockedForEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    const completed =
      localStorage.getItem(onboardingCompletedKey(normalizedEmail)) === "true";

    const skipped =
      localStorage.getItem(onboardingSkippedKey(normalizedEmail)) === "true";

    return completed || skipped;
  }

  function maybeStartOnboardingTour(stageKey, userEmail) {
    if (!stageKey || !userEmail) return false;

    const normalizedEmail = normalizeEmail(userEmail);
    const onboardingUser = normalizeEmail(localStorage.getItem(ONBOARDING_KEYS.user));

    if (!onboardingUser) return false;

    if (onboardingUser !== normalizedEmail) {
      clearOnboardingStage();
      return false;
    }

    let sessionAllowed = false;
    try {
      sessionAllowed = sessionStorage.getItem(ONBOARDING_KEYS.session) === "true";
    } catch {
      sessionAllowed = false;
    }

    if (!sessionAllowed) {
      clearOnboardingStage();
      return false;
    }

    if (isOnboardingBlockedForEmail(normalizedEmail)) {
      return false;
    }

    const flow = getOnboardingFlow();
    let currentStage = String(localStorage.getItem(ONBOARDING_KEYS.stage) || "").trim();

    if (currentStage && !flow.includes(currentStage)) {
      currentStage = flow.includes("sandbox") ? "sandbox" : flow[0] || "";
      if (currentStage) localStorage.setItem(ONBOARDING_KEYS.stage, currentStage);
      else clearOnboardingStage();
    }

    if (!currentStage || currentStage !== stageKey) return false;

    const stageSteps = window.ONBOARDING_STEPS?.[stageKey] || [];
    if (!stageSteps.length) return false;

    const stageIndex = flow.indexOf(stageKey);
    const nextStage = stageIndex >= 0 ? flow[stageIndex + 1] : null;

    const handleComplete = async () => {
      if (nextStage) {
        localStorage.setItem(ONBOARDING_KEYS.stage, nextStage);

        try {
          const stepPath = getOnboardingPath("stepComplete")
            .replace(":id", encodeURIComponent(stageKey));

          await apiPost(stepPath, {
            user_email: normalizedEmail,
            stage: stageKey
          });
        } catch {
          // Ignore step completion network failure.
        }

        window.location.href = getOnboardingStageUrl(nextStage);
        return;
      }

      try {
        const completePath = getOnboardingPath("complete");
        const completeData = await apiPost(completePath, { user_email: normalizedEmail });
        const unlocks = Array.isArray(completeData?.newly_unlocked) ? completeData.newly_unlocked : [];
        if (unlocks.length && window.NetologyAchievements?.queueUnlocks) {
          window.NetologyAchievements.queueUnlocks(normalizedEmail, unlocks);
        }
        const achievementXp = Number(completeData?.achievement_xp_added || 0);
        if (achievementXp > 0) {
          bumpStoredUserXp(normalizedEmail, achievementXp);
        }
      } catch {
        // Ignore completion network failure.
      }

      markOnboardingComplete();

      if (!window.location.pathname.endsWith("dashboard.html")) {
        window.location.href = getOnboardingStageUrl("dashboard");
      }
    };

    const handleSkip = async () => {
      try {
        const skipPath = getOnboardingPath("skip");
        await apiPost(skipPath, { user_email: normalizedEmail });
      } catch {
        // Ignore skip network failure.
      }

      markOnboardingSkipped();
      showPopup("Onboarding skipped. You can restart the tour from your dashboard anytime.", "info");
    };

    startOnboardingTour(normalizedEmail, {
      steps: stageSteps,
      stage: stageKey,
      onComplete: handleComplete,
      onSkip: handleSkip,
      allowApi: false
    });

    return true;
  }

  window.markOnboardingComplete = markOnboardingComplete;
  window.markOnboardingSkipped = markOnboardingSkipped;
  window.maybeStartOnboardingTour = maybeStartOnboardingTour;

  // -------------------------------------------------------
  // Page boot
  // -------------------------------------------------------

  runWhenDomReady(() => {
    initDecorativeBackgrounds();
    initAuthForms();
  });
})();
