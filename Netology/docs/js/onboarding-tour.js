// onboarding-tour.js – onboarding tour overlay, stage progression, and completion tracking

(() => {
  "use strict";

  // app.js is always loaded first so these globals are guaranteed
  const API_BASE = window.API_BASE;
  const ENDPOINTS = window.ENDPOINTS;

  // storage keys
  const STAGE_KEY = "netology_onboarding_stage";
  const USER_KEY = "netology_onboarding_user";
  const SESSION_KEY = "netology_onboarding_session";
  const COMPLETED_PREFIX = "netology_onboarding_completed_";
  const SKIPPED_PREFIX = "netology_onboarding_skipped_";

  // tour stage order
  const FLOW = ["dashboard", "courses", "course", "sandbox", "account", "wrapup"];

  // page url for each stage
  const STAGE_URLS = {
    dashboard: "dashboard.html",
    courses: "courses.html",
    course: "course.html?id=1",
    sandbox: "sandbox.html?mode=practice",
    account: "account.html",
    wrapup: "dashboard.html"
  };

  // tooltip steps shown on each page
  const STEPS = {
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

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  // post json to the api (app.js only exposes apiGet, not apiPost)
  async function apiPost(path, payload = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return response.json();
  }

  // update stored user xp after onboarding awards bonus xp
  function bumpStoredUserXp(email, deltaXp) {
    if (!deltaXp) return;
    const xpSystem = window.NetologyXP;

    ["user", "netology_user"].forEach((storageKey) => {
      let userData;
      try { userData = JSON.parse(localStorage.getItem(storageKey)); } catch { return; }
      if (!userData || normalizeEmail(userData.email) !== normalizeEmail(email)) return;

      const updated = xpSystem?.applyXpToUser
        ? xpSystem.applyXpToUser(userData, deltaXp)
        : { ...userData, xp: Math.max(0, Number(userData.xp || 0) + Number(deltaXp)) };
      localStorage.setItem(storageKey, JSON.stringify(updated));
    });
  }

  // stage user for onboarding (called from login/signup via window.NetologyOnboarding)
  function stageUserForOnboarding(email, stage = "dashboard") {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return;
    localStorage.setItem(STAGE_KEY, stage || "dashboard");
    localStorage.setItem(USER_KEY, normalizedEmail);
  }

  // toggle session flag that keeps the tour alive across page navigations
  function setOnboardingSessionActive(isActive) {
    try {
      if (isActive) sessionStorage.setItem(SESSION_KEY, "true");
      else sessionStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  }

  // mark onboarding as fully completed and clean up storage
  function markOnboardingComplete() {
    localStorage.removeItem(STAGE_KEY);

    const onboardingUser = normalizeEmail(localStorage.getItem(USER_KEY));
    if (onboardingUser) localStorage.setItem(COMPLETED_PREFIX + onboardingUser, "true");

    localStorage.removeItem(USER_KEY);
    setOnboardingSessionActive(false);

    ["user", "netology_user"].forEach((storageKey) => {
      let userData;
      try { userData = JSON.parse(localStorage.getItem(storageKey)); } catch { return; }
      if (!userData) return;
      userData.onboarding_completed = true;
      localStorage.setItem(storageKey, JSON.stringify(userData));
    });
  }

  // mark onboarding as skipped and clean up storage
  function markOnboardingSkipped() {
    localStorage.removeItem(STAGE_KEY);

    const onboardingUser = normalizeEmail(localStorage.getItem(USER_KEY));
    if (onboardingUser) localStorage.setItem(SKIPPED_PREFIX + onboardingUser, "true");

    localStorage.removeItem(USER_KEY);
    setOnboardingSessionActive(false);
  }

  // check if a user already completed or skipped onboarding
  function isOnboardingDone(email) {
    const normalizedEmail = normalizeEmail(email);
    return localStorage.getItem(COMPLETED_PREFIX + normalizedEmail) === "true"
      || localStorage.getItem(SKIPPED_PREFIX + normalizedEmail) === "true";
  }

  // tour overlay class

  class OnboardingTour {
    constructor(userEmail, options = {}) {
      this.userEmail = userEmail;
      this.steps = Array.isArray(options.steps) ? options.steps : [];
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

    // start the tour
    async init() {
      try {
        if (!this.steps.length) {
          console.warn("Onboarding: no steps provided.");
          return;
        }

        this.isActive = true;
        this.backdropElement = this.createOverlayElement("onboarding-backdrop");
        this.spotlightElement = this.createOverlayElement("onboarding-spotlight");

        this.tooltipElement = this.createOverlayElement("onboarding-tooltip");
        this.tooltipElement.setAttribute("role", "dialog");
        this.tooltipElement.setAttribute("aria-live", "polite");
        this.tooltipElement.setAttribute("aria-modal", "true");
        this.tooltipElement.setAttribute("tabindex", "0");

        this.lockScreen();
        await this.showStep(0, 1);
      } catch (error) {
        console.error("Onboarding init failed:", error);
      }
    }

    // create and append a div with the given class name
    createOverlayElement(className) {
      const element = document.createElement("div");
      element.className = className;
      document.body.appendChild(element);
      return element;
    }

    // prevent scrolling and attach keyboard/resize handlers
    lockScreen() {
      if (this.isScreenLocked) return;
      this.isScreenLocked = true;

      document.documentElement.classList.add("net-onboarding-lock");
      document.body.classList.add("net-onboarding-lock");

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

      this.scrollBlocker = (event) => { if (this.isActive) event.preventDefault(); };
      this.keyBlocker = (event) => {
        if (!this.isActive) return;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
          event.preventDefault();
        }
      };
      this.escapeHandler = (event) => { if (event.key === "Escape") this.skipTour(); };

      window.addEventListener("wheel", this.scrollBlocker, { passive: false });
      window.addEventListener("touchmove", this.scrollBlocker, { passive: false });
      window.addEventListener("keydown", this.keyBlocker, { passive: false });
      window.addEventListener("keydown", this.escapeHandler);

      this.resizeHandler = () => this.refreshPositions();
      window.addEventListener("resize", this.resizeHandler);
    }

    // restore normal scrolling and remove all handlers
    unlockScreen() {
      if (!this.isScreenLocked) return;
      this.isScreenLocked = false;

      document.documentElement.classList.remove("net-onboarding-lock");
      document.body.classList.remove("net-onboarding-lock");
      document.body.style.paddingRight = "";

      if (this.scrollBlocker) {
        window.removeEventListener("wheel", this.scrollBlocker);
        window.removeEventListener("touchmove", this.scrollBlocker);
      }
      if (this.keyBlocker) window.removeEventListener("keydown", this.keyBlocker);
      if (this.escapeHandler) window.removeEventListener("keydown", this.escapeHandler);
      if (this.resizeHandler) window.removeEventListener("resize", this.resizeHandler);

      this.scrollBlocker = this.keyBlocker = this.escapeHandler = this.resizeHandler = null;
    }

    // recalculate spotlight and tooltip positions
    refreshPositions() {
      const step = this.steps[this.currentStepIndex];
      if (!step || !this.currentTarget) return;
      this.updateSpotlight(this.currentTarget);
      this.updateTooltip(step, this.currentTarget);
    }

    // wait for animation frames
    waitForFrames(count = 2) {
      return new Promise((resolve) => {
        let framesCompleted = 0;
        const onFrame = () => { if (++framesCompleted >= count) resolve(); else requestAnimationFrame(onFrame); };
        requestAnimationFrame(onFrame);
      });
    }

    // wait until smooth scroll finishes
    waitForScrollToSettle(timeoutMs = 900) {
      return new Promise((resolve) => {
        let lastScrollY = window.scrollY;
        let stableFrameCount = 0;
        const startTime = performance.now();

        const onFrame = () => {
          const currentScrollY = window.scrollY;
          if (Math.abs(currentScrollY - lastScrollY) < 1) stableFrameCount++; else { stableFrameCount = 0; lastScrollY = currentScrollY; }
          if (stableFrameCount >= 2 || performance.now() - startTime > timeoutMs) resolve();
          else requestAnimationFrame(onFrame);
        };
        requestAnimationFrame(onFrame);
      });
    }

    // scroll the target element into view
    async focusTarget(targetElement) {
      if (!targetElement) return;

      // temporarily allow scrolling so we can scroll to the target
      if (this.scrollBlocker) {
        window.removeEventListener("wheel", this.scrollBlocker);
        window.removeEventListener("touchmove", this.scrollBlocker);
      }
      await this.waitForFrames(1);

      const targetRect = targetElement.getBoundingClientRect();
      const centeredTop = Math.max(0, window.scrollY + targetRect.top - (window.innerHeight / 2 - targetRect.height / 2));
      if (Math.abs(window.scrollY - centeredTop) >= 4) {
        window.scrollTo({ top: centeredTop, behavior: "smooth" });
        await this.waitForScrollToSettle();
      }

      // re-attach scroll blockers
      if (this.scrollBlocker) {
        window.addEventListener("wheel", this.scrollBlocker, { passive: false });
        window.addEventListener("touchmove", this.scrollBlocker, { passive: false });
      }
    }

    // show a step, skipping any targets missing from the page
    async showStep(stepIndex, direction = 1) {
      let stepCursor = stepIndex;
      const visited = new Set();

      while (stepCursor >= 0 && stepCursor < this.steps.length) {
        if (visited.has(stepCursor)) break;
        visited.add(stepCursor);

        const step = this.steps[stepCursor];

        // switch tab if this step requires it
        if (step?.tab) {
          const tabButton = document.querySelector(`[role="tab"][data-tab="${step.tab}"]`);
          if (tabButton) tabButton.click();
          await this.waitForFrames();
        }

        const targetElement = document.querySelector(`[data-tour="${step.target}"]`);
        if (!targetElement) { stepCursor += direction; continue; }

        this.currentStepIndex = stepCursor;
        this.currentTarget = targetElement;

        const scrollToken = ++this.stepToken;
        await this.focusTarget(targetElement);
        if (scrollToken !== this.stepToken) return;

        this.updateSpotlight(targetElement);
        this.updateTooltip(step, targetElement);
        return;
      }

      // no valid targets left on this page
      if (typeof this.onComplete === "function") { await this.onComplete(); this.closeTour(); return; }
      await this.completeTour();
    }

    // position the spotlight around the target
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

      Object.assign(this.spotlightElement.style, {
        top: `${top}px`, left: `${left}px`, width: `${width}px`, height: `${height}px`
      });
    }

    // render and position the tooltip
    updateTooltip(step, targetElement) {
      const targetRect = targetElement.getBoundingClientRect();
      const totalSteps = this.steps.length;
      const currentStepNumber = this.currentStepIndex + 1;
      const isLastStep = this.currentStepIndex === totalSteps - 1;

      this.tooltipElement.classList.remove("is-intro");
      this.tooltipElement.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:11px;color:#06b6d4;font-weight:600;letter-spacing:.04em;text-transform:uppercase">
            Step ${currentStepNumber} of ${totalSteps}
          </span>
        </div>
        <h3>${step.title}</h3>
        <p>${step.description}</p>
        <div style="margin-top:16px;display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap">
          ${isLastStep
            ? '<button class="btn-tour" onclick="window.onboardingTour.completeTour()">Finish &#8250;</button>'
            : '<button class="btn-tour" onclick="window.onboardingTour.nextStep()">Continue &#8250;</button>'}
          <button class="btn-tour-secondary" onclick="window.onboardingTour.skipTour()">Skip</button>
          <button class="btn-tour-secondary" onclick="window.onboardingTour.prevStep()"
            ${this.currentStepIndex === 0 ? 'disabled style="opacity:.4;cursor:not-allowed"' : ""}>&#8249; Back</button>
        </div>
      `;

      // measure off-screen then position
      this.tooltipElement.style.cssText = "top:0;left:0;visibility:hidden";
      const edgeMargin = 16;
      const tooltipGap = 18;
      const viewWidth = window.innerWidth;
      const viewHeight = window.innerHeight;
      const tooltipWidth = this.tooltipElement.offsetWidth;
      const tooltipHeight = this.tooltipElement.offsetHeight;

      const targetCenterX = targetRect.left + targetRect.width / 2;
      let left = Math.min(Math.max(targetCenterX - tooltipWidth / 2, edgeMargin), viewWidth - tooltipWidth - edgeMargin);

      const spaceBelow = viewHeight - targetRect.bottom;
      const spaceAbove = targetRect.top;
      let top;
      if (spaceBelow >= tooltipHeight + tooltipGap) top = targetRect.bottom + tooltipGap;
      else if (spaceAbove >= tooltipHeight + tooltipGap) top = targetRect.top - tooltipHeight - tooltipGap;
      else top = viewHeight - tooltipHeight - edgeMargin;

      top = Math.max(edgeMargin, Math.min(top, viewHeight - tooltipHeight - edgeMargin));
      left = Math.max(edgeMargin, Math.min(left, viewWidth - tooltipWidth - edgeMargin));

      this.tooltipElement.style.cssText = `top:${top}px;left:${left}px`;
      this.tooltipElement.focus?.({ preventScroll: true });
    }

    nextStep() {
      if (this.currentStepIndex < this.steps.length - 1) this.showStep(this.currentStepIndex + 1, 1);
    }

    prevStep() {
      if (this.currentStepIndex > 0) this.showStep(this.currentStepIndex - 1, -1);
    }

    async completeTour() {
      if (typeof this.onComplete === "function") { await this.onComplete(); this.closeTour(); return; }
      await apiPost(ENDPOINTS.onboarding.complete, { user_email: this.userEmail });
      this.closeTour();
      window.location.href = "/dashboard.html";
    }

    async skipTour() {
      if (typeof this.onSkip === "function") { await this.onSkip(); this.closeTour(); return; }
      try { await apiPost(ENDPOINTS.onboarding.skip, { user_email: this.userEmail }); } catch { /* ignore */ }
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
      [this.backdropElement, this.spotlightElement, this.tooltipElement].forEach(element => element?.remove());
      this.backdropElement = this.spotlightElement = this.tooltipElement = null;
      this.unlockScreen();
    }
  }

  // entry point – called by each page to check if the tour should start on this stage
  function maybeStartOnboardingTour(stageKey, userEmail) {
    if (!stageKey || !userEmail) return false;

    const normalizedEmail = normalizeEmail(userEmail);
    const onboardingUser = normalizeEmail(localStorage.getItem(USER_KEY));
    if (!onboardingUser || onboardingUser !== normalizedEmail) {
      if (onboardingUser) localStorage.removeItem(STAGE_KEY);
      return false;
    }

    // check session flag
    let sessionActive = false;
    try { sessionActive = sessionStorage.getItem(SESSION_KEY) === "true"; } catch { /* ignore */ }
    if (!sessionActive) { localStorage.removeItem(STAGE_KEY); return false; }

    // already done?
    if (isOnboardingDone(normalizedEmail)) return false;

    // check stage matches
    let currentStage = (localStorage.getItem(STAGE_KEY) || "").trim();
    if (currentStage && !FLOW.includes(currentStage)) {
      currentStage = FLOW.includes("sandbox") ? "sandbox" : FLOW[0] || "";
      if (currentStage) localStorage.setItem(STAGE_KEY, currentStage);
      else { localStorage.removeItem(STAGE_KEY); return false; }
    }
    if (!currentStage || currentStage !== stageKey) return false;

    const stageSteps = (STEPS[stageKey] || []);
    if (!stageSteps.length) return false;

    const stageIndex = FLOW.indexOf(stageKey);
    const nextStage = stageIndex >= 0 ? FLOW[stageIndex + 1] : null;

    // called when the user finishes all steps on this page
    const handleComplete = async () => {
      if (nextStage) {
        localStorage.setItem(STAGE_KEY, nextStage);
        try {
          await apiPost(ENDPOINTS.onboarding.stepComplete.replace(":id", encodeURIComponent(stageKey)), {
            user_email: normalizedEmail, stage: stageKey
          });
        } catch { /* ignore */ }
        window.location.href = STAGE_URLS[nextStage] || `${nextStage}.html`;
        return;
      }

      // final stage – complete onboarding and award achievements
      try {
        const result = await apiPost(ENDPOINTS.onboarding.complete, { user_email: normalizedEmail });
        const unlocks = Array.isArray(result?.newly_unlocked) ? result.newly_unlocked : [];
        if (unlocks.length && window.NetologyAchievements?.queueUnlocks) {
          window.NetologyAchievements.queueUnlocks(normalizedEmail, unlocks);
        }
        const achievementXp = Number(result?.achievement_xp_added || 0);
        if (achievementXp > 0) bumpStoredUserXp(normalizedEmail, achievementXp);
      } catch { /* ignore */ }

      markOnboardingComplete();
      if (!window.location.pathname.endsWith("dashboard.html")) {
        window.location.href = STAGE_URLS.dashboard || "dashboard.html";
      }
    };

    // called when the user clicks skip
    const handleSkip = async () => {
      try { await apiPost(ENDPOINTS.onboarding.skip, { user_email: normalizedEmail }); } catch { /* ignore */ }
      markOnboardingSkipped();
      if (window.NetologyToast?.showMessageToast) {
        window.NetologyToast.showMessageToast("Onboarding skipped. You can restart the tour from your dashboard anytime.", "info", 3200);
      }
    };

    // create and start the tour
    window.onboardingTour = new OnboardingTour(normalizedEmail, {
      steps: stageSteps,
      onComplete: handleComplete,
      onSkip: handleSkip
    });
    window.onboardingTour.init();
    return true;
  }

  // expose public api
  window.markOnboardingComplete = markOnboardingComplete;
  window.markOnboardingSkipped = markOnboardingSkipped;
  window.maybeStartOnboardingTour = maybeStartOnboardingTour;

  window.NetologyOnboarding = {
    stageUser: stageUserForOnboarding,
    setSessionActive: setOnboardingSessionActive,
    isUserDone: isOnboardingDone
  };
})();
