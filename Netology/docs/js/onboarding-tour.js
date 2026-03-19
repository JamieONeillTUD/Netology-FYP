// onboarding-tour.js – onboarding tour UI, stage progression, and completion tracking

(() => {
  "use strict";

  /*
   File map:
   1) Core settings + small helpers.
   2) API helpers used by onboarding requests.
   3) Local user XP sync helper used after onboarding completion.
   4) Onboarding tour class.
   5) Cross-page onboarding stage router.
  */

  // -------------------------------------------------------
  // 1) Core settings + small helpers
  // -------------------------------------------------------

  const API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  const ENDPOINTS = window.ENDPOINTS || {};
  const XP = window.NetologyXP || null;

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

  const ONBOARDING_FLOW_DEFAULT = ["dashboard", "courses", "course", "sandbox", "account", "wrapup"];

  const ONBOARDING_STAGE_URLS_DEFAULT = {
    dashboard: "dashboard.html",
    courses: "courses.html",
    course: "course.html?id=1",
    sandbox: "sandbox.html?mode=practice",
    account: "account.html",
    wrapup: "dashboard.html"
  };

  const ONBOARDING_STEPS_DEFAULT = {
    dashboard: [
      { target: "dashboard-header", title: "Welcome to Netology", description: "An interactive, gamified way to learn computer networking by doing." },
      { target: "dashboard-stats", title: "Quick Stats", description: "XP, streaks, challenges, and sandbox activity in one place." },
      { target: "progress-widget", title: "Streaks & Progress", description: "Keep your learning momentum visible every day." },
      { target: "courses-section", title: "Continue Learning", description: "Pick up your courses with clear, step-by-step modules." },
      { target: "achievements-section", title: "Achievements", description: "Earn badges as you master new skills." },
      { target: "challenges-section", title: "Daily & Weekly Focus", description: "Short challenges help you learn by doing." },
      { target: "sandbox-link", title: "Network Sandbox", description: "Build and test real network topologies in a safe lab." }
    ],
    courses: [
      { target: "courses-hero", title: "Course Library", description: "Explore every course and unlock new skills." },
      { target: "courses-filter-all", title: "All Tracks", description: "See everything in one view." },
      { target: "courses-filter-novice", title: "Novice Track", description: "Start with core networking fundamentals." },
      { target: "courses-filter-intermediate", title: "Intermediate Track", description: "Build practical networking skills." },
      { target: "courses-filter-advanced", title: "Advanced Track", description: "Tackle complex topologies and challenges." },
      { target: "courses-my-progress", title: "My Progress", description: "See what you started, finished, or paused." }
    ],
    course: [
      { target: "course-hero", title: "Course Overview", description: "Your course title, difficulty, and progress ring - everything at a glance." },
      { target: "course-continue", title: "Up Next", description: "See what is coming up and jump straight in. Your stats are here too." },
      { target: "course-modules", title: "Modules", description: "Expand any module to see learning items, quizzes, and challenges." }
    ],
    sandbox: [
      { target: "sandbox-toolbar", title: "Sandbox Tools", description: "Use select/connect, undo-redo, zoom, and save controls from one compact toolbar." },
      { target: "sandbox-tutorial-toggle", title: "Tutorial Toggle", description: "Turn quick tutorials on or off at any time from this switch." },
      { target: "sandbox-workspace", title: "Workspace Layout", description: "The library and inspector sit off the canvas for breathing room, and each panel can be collapsed for extra space." },
      { target: "sandbox-library", title: "Device Library", description: "Drag or click routers, switches, servers, and clients into the topology." },
      { target: "sandbox-canvas", title: "Topology Canvas", description: "Build, connect, and test network designs in the centered canvas area." },
      { target: "sandbox-stats", title: "Live Stats", description: "Track device and connection counts while you build." },
      { target: "sandbox-inspector", title: "Inspector", description: "Open objectives, objects, diagnostics, and config from this right panel." },
      { target: "sandbox-console", title: "Console", description: "Use the floating terminal dock for commands. You can switch between small/large size, drag it, and resize it." }
    ],
    account: [
      { target: "account-profile-hero", title: "Profile Snapshot", description: "Your stats, badges, and streaks live here." },
      { target: "account-tab-preferences", title: "Preferences", description: "Customize themes, accessibility, and privacy." },
      { target: "account-appearance", title: "Themes", description: "Choose a look that works for you.", tab: "preferences" },
      { target: "account-accessibility", title: "Dyslexic Font", description: "Accessibility options for better readability.", tab: "preferences" },
      { target: "account-tab-activity", title: "Activity", description: "See your learning activity over time." },
      { target: "account-activity-heatmap", title: "Activity Map", description: "A GitHub-style view of your learning streak.", tab: "activity" }
    ],
    wrapup: [
      { target: "dashboard-header", title: "You're Ready", description: "Netology makes networking simple, visual, and hands-on." },
      { target: "courses-section", title: "Start Learning", description: "Continue your next course anytime." }
    ]
  };

  // Keep existing window.ONBOARDING_* overrides if present.
  // Otherwise, register built-in defaults from this file.
  function ensureOnboardingConfig() {
    if (!Array.isArray(window.ONBOARDING_FLOW) || !window.ONBOARDING_FLOW.length) {
      window.ONBOARDING_FLOW = [...ONBOARDING_FLOW_DEFAULT];
    }

    if (!window.ONBOARDING_STAGE_URLS || typeof window.ONBOARDING_STAGE_URLS !== "object") {
      window.ONBOARDING_STAGE_URLS = { ...ONBOARDING_STAGE_URLS_DEFAULT };
    }

    if (!window.ONBOARDING_STEPS || typeof window.ONBOARDING_STEPS !== "object") {
      window.ONBOARDING_STEPS = ONBOARDING_STEPS_DEFAULT;
    }
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

  function resolveApiUrl(path) {
    return API_BASE ? `${API_BASE}${path}` : path;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function onboardingCompletedKey(email) {
    return `${ONBOARDING_USER_KEYS.completedPrefix}${normalizeEmail(email)}`;
  }

  function onboardingSkippedKey(email) {
    return `${ONBOARDING_USER_KEYS.skippedPrefix}${normalizeEmail(email)}`;
  }

  function clearOnboardingStage() {
    localStorage.removeItem(ONBOARDING_KEYS.stage);
  }

  function stageUserForOnboarding(email, stage = "dashboard") {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return;

    localStorage.setItem(ONBOARDING_KEYS.stage, String(stage || "dashboard"));
    localStorage.setItem(ONBOARDING_KEYS.user, normalizedEmail);
  }

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

  function getOnboardingPath(pathKey) {
    return ENDPOINTS.onboarding?.[pathKey] || ONBOARDING_PATHS[pathKey] || "";
  }

  function showInfoMessage(message, type = "info") {
    if (window.NetologyToast?.showMessageToast) {
      window.NetologyToast.showMessageToast(String(message || ""), type, 3200);
      return;
    }
    alert(String(message || ""));
  }

  ensureOnboardingConfig();

  // -------------------------------------------------------
  // 2) API helpers used by onboarding requests
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
    const resolvedUrl = resolveApiUrl(path);
    const response = await fetch(resolvedUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    });
    return response.json();
  }

  const apiGet = typeof window.apiGet === "function" ? window.apiGet : defaultApiGet;
  const apiPost = typeof window.apiPost === "function" ? window.apiPost : defaultApiPost;

  // -------------------------------------------------------
  // 3) Local XP sync helper after onboarding completion
  // -------------------------------------------------------

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

  // -------------------------------------------------------
  // 4) Onboarding tour class
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
      this.lastHighlightedElement = null;

      this.scrollBlocker = null;
      this.keyBlocker = null;
      this.resizeHandler = null;
      this.escapeHandler = null;
    }

    async init() {
      try {
        // Steps can come from per-page onboarding config or API fallback.
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
      if (this.lastHighlightedElement && this.lastHighlightedElement !== targetElement) {
        this.lastHighlightedElement.classList.remove("onboarding-target-active");
      }

      targetElement.classList.add("onboarding-target-active");
      this.lastHighlightedElement = targetElement;

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

      if (this.lastHighlightedElement) {
        this.lastHighlightedElement.classList.remove("onboarding-target-active");
        this.lastHighlightedElement = null;
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

  // -------------------------------------------------------
  // 5) Cross-page onboarding stage router
  // -------------------------------------------------------

  function getOnboardingFlow() {
    const configuredFlow = window.ONBOARDING_FLOW;
    if (Array.isArray(configuredFlow) && configuredFlow.length) return configuredFlow;
    return ONBOARDING_FLOW_DEFAULT;
  }

  function getOnboardingStageUrl(stage) {
    const stageUrls = window.ONBOARDING_STAGE_URLS || ONBOARDING_STAGE_URLS_DEFAULT;
    return stageUrls[stage] || `${stage}.html`;
  }

  function startOnboardingTour(userEmail, options = {}) {
    window.onboardingTour = new OnboardingTour(userEmail, options);
    window.onboardingTour.init();
  }

  function isOnboardingBlockedForEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    const completed = localStorage.getItem(onboardingCompletedKey(normalizedEmail)) === "true";
    const skipped = localStorage.getItem(onboardingSkippedKey(normalizedEmail)) === "true";
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

    if (isOnboardingBlockedForEmail(normalizedEmail)) return false;

    const flow = getOnboardingFlow();
    let currentStage = String(localStorage.getItem(ONBOARDING_KEYS.stage) || "").trim();

    if (currentStage && !flow.includes(currentStage)) {
      currentStage = flow.includes("sandbox") ? "sandbox" : flow[0] || "";
      if (currentStage) localStorage.setItem(ONBOARDING_KEYS.stage, currentStage);
      else clearOnboardingStage();
    }

    if (!currentStage || currentStage !== stageKey) return false;

    const configuredSteps = window.ONBOARDING_STEPS || ONBOARDING_STEPS_DEFAULT;
    const stageSteps = configuredSteps[stageKey] || [];
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
      showInfoMessage("Onboarding skipped. You can restart the tour from your dashboard anytime.", "info");
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

  // Small public API used by app.js for onboarding handoff on auth pages.
  window.NetologyOnboarding = {
    stageUser: stageUserForOnboarding,
    setSessionActive: setOnboardingSessionActive,
    isUserDone: isOnboardingBlockedForEmail
  };
})();
