// onboarding-tour.js — Onboarding tour overlay, stage progression, and completion tracking.

(function () {
  "use strict";

  // app.js is always loaded first so these globals are guaranteed
  var API_BASE = window.API_BASE;
  var ENDPOINTS = window.ENDPOINTS;

  // storage keys
  var STAGE_KEY = "netology_onboarding_stage";
  var USER_KEY = "netology_onboarding_user";
  var SESSION_KEY = "netology_onboarding_session";
  var COMPLETED_PREFIX = "netology_onboarding_completed_";
  var SKIPPED_PREFIX = "netology_onboarding_skipped_";

  // tour stage order
  var FLOW = ["dashboard", "courses", "course", "sandbox", "account", "wrapup"];

  // page url for each stage
  var STAGE_URLS = {
    dashboard: "dashboard.html",
    courses: "courses.html",
    course: "course.html?id=1",
    sandbox: "sandbox.html?mode=practice",
    account: "account.html",
    wrapup: "dashboard.html"
  };

  // keys that should block scrolling during the tour
  var BLOCKED_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", " "];

  // tooltip steps shown on each page
  var STEPS = {
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

  // check if a value exists in an array
  function arrayContains(list, value) {
    for (var i = 0; i < list.length; i++) {
      if (list[i] === value) {
        return true;
      }
    }
    return false;
  }

  // normalise an email to lowercase trimmed string
  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  // post json to the api
  async function apiPost(path, payload) {
    var response = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    });
    return response.json();
  }

  // update stored user xp after onboarding awards bonus xp
  function bumpStoredUserXp(email, deltaXp) {
    if (!deltaXp) {
      return;
    }
    var xpSystem = window.NetologyXP;
    var storageKeys = ["user", "netology_user"];

    for (var i = 0; i < storageKeys.length; i++) {
      var userData = null;
      try {
        userData = JSON.parse(localStorage.getItem(storageKeys[i]));
      } catch (parseError) {
        continue;
      }
      if (!userData || normalizeEmail(userData.email) !== normalizeEmail(email)) {
        continue;
      }
      var updated;
      if (xpSystem && xpSystem.applyXpToUser) {
        updated = xpSystem.applyXpToUser(userData, deltaXp);
      } else {
        updated = Object.assign({}, userData, {
          xp: Math.max(0, Number(userData.xp || 0) + Number(deltaXp))
        });
      }
      localStorage.setItem(storageKeys[i], JSON.stringify(updated));
    }
  }

  // stage user for onboarding
  function stageUserForOnboarding(email, stage) {
    var normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return;
    }
    localStorage.setItem(STAGE_KEY, stage || "dashboard");
    localStorage.setItem(USER_KEY, normalizedEmail);
  }

  // toggle session flag that keeps the tour alive across page navigations
  function setOnboardingSessionActive(isActive) {
    try {
      if (isActive) {
        sessionStorage.setItem(SESSION_KEY, "true");
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch (storageError) {
      // ignore
    }
  }

  // mark onboarding as fully completed and clean up storage
  function markOnboardingComplete() {
    localStorage.removeItem(STAGE_KEY);

    var onboardingUser = normalizeEmail(localStorage.getItem(USER_KEY));
    if (onboardingUser) {
      localStorage.setItem(COMPLETED_PREFIX + onboardingUser, "true");
    }

    localStorage.removeItem(USER_KEY);
    setOnboardingSessionActive(false);

    var storageKeys = ["user", "netology_user"];
    for (var i = 0; i < storageKeys.length; i++) {
      var userData = null;
      try {
        userData = JSON.parse(localStorage.getItem(storageKeys[i]));
      } catch (parseError) {
        continue;
      }
      if (!userData) {
        continue;
      }
      userData.onboarding_completed = true;
      localStorage.setItem(storageKeys[i], JSON.stringify(userData));
    }
  }

  // mark onboarding as skipped and clean up storage
  function markOnboardingSkipped() {
    localStorage.removeItem(STAGE_KEY);

    var onboardingUser = normalizeEmail(localStorage.getItem(USER_KEY));
    if (onboardingUser) {
      localStorage.setItem(SKIPPED_PREFIX + onboardingUser, "true");
    }

    localStorage.removeItem(USER_KEY);
    setOnboardingSessionActive(false);
  }

  // check if a user already completed or skipped onboarding
  function isOnboardingDone(email) {
    var normalizedEmail = normalizeEmail(email);
    return localStorage.getItem(COMPLETED_PREFIX + normalizedEmail) === "true"
      || localStorage.getItem(SKIPPED_PREFIX + normalizedEmail) === "true";
  }

  // tour overlay constructor
  function OnboardingTour(userEmail, options) {
    var tourOptions = options || {};
    this.userEmail = userEmail;
    this.steps = Array.isArray(tourOptions.steps) ? tourOptions.steps : [];
    this.onComplete = tourOptions.onComplete;
    this.onSkip = tourOptions.onSkip;

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
  OnboardingTour.prototype.init = async function init() {
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
  };

  // create and append a div with the given class name
  OnboardingTour.prototype.createOverlayElement = function createOverlayElement(className) {
    var element = document.createElement("div");
    element.className = className;
    document.body.appendChild(element);
    return element;
  };

  // prevent scrolling and attach keyboard/resize handlers
  OnboardingTour.prototype.lockScreen = function lockScreen() {
    if (this.isScreenLocked) {
      return;
    }
    this.isScreenLocked = true;

    document.documentElement.classList.add("net-onboarding-lock");
    document.body.classList.add("net-onboarding-lock");

    var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = scrollbarWidth + "px";
    }

    var self = this;

    this.scrollBlocker = function (event) {
      if (self.isActive) {
        event.preventDefault();
      }
    };

    this.keyBlocker = function (event) {
      if (!self.isActive) {
        return;
      }
      if (arrayContains(BLOCKED_KEYS, event.key)) {
        event.preventDefault();
      }
    };

    this.escapeHandler = function (event) {
      if (event.key === "Escape") {
        self.skipTour();
      }
    };

    window.addEventListener("wheel", this.scrollBlocker, { passive: false });
    window.addEventListener("touchmove", this.scrollBlocker, { passive: false });
    window.addEventListener("keydown", this.keyBlocker, { passive: false });
    window.addEventListener("keydown", this.escapeHandler);

    this.resizeHandler = function () {
      self.refreshPositions();
    };
    window.addEventListener("resize", this.resizeHandler);
  };

  // restore normal scrolling and remove all handlers
  OnboardingTour.prototype.unlockScreen = function unlockScreen() {
    if (!this.isScreenLocked) {
      return;
    }
    this.isScreenLocked = false;

    document.documentElement.classList.remove("net-onboarding-lock");
    document.body.classList.remove("net-onboarding-lock");
    document.body.style.paddingRight = "";

    if (this.scrollBlocker) {
      window.removeEventListener("wheel", this.scrollBlocker);
      window.removeEventListener("touchmove", this.scrollBlocker);
    }
    if (this.keyBlocker) {
      window.removeEventListener("keydown", this.keyBlocker);
    }
    if (this.escapeHandler) {
      window.removeEventListener("keydown", this.escapeHandler);
    }
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
    }

    this.scrollBlocker = null;
    this.keyBlocker = null;
    this.escapeHandler = null;
    this.resizeHandler = null;
  };

  // recalculate spotlight and tooltip positions
  OnboardingTour.prototype.refreshPositions = function refreshPositions() {
    var step = this.steps[this.currentStepIndex];
    if (!step || !this.currentTarget) {
      return;
    }
    this.updateSpotlight(this.currentTarget);
    this.updateTooltip(step, this.currentTarget);
  };

  // wait for a number of animation frames
  OnboardingTour.prototype.waitForFrames = function waitForFrames(count) {
    var frameCount = count || 2;
    return new Promise(function (resolve) {
      var framesCompleted = 0;
      function onFrame() {
        framesCompleted = framesCompleted + 1;
        if (framesCompleted >= frameCount) {
          resolve();
        } else {
          requestAnimationFrame(onFrame);
        }
      }
      requestAnimationFrame(onFrame);
    });
  };

  // wait until smooth scroll finishes
  OnboardingTour.prototype.waitForScrollToSettle = function waitForScrollToSettle(timeoutMs) {
    var timeout = timeoutMs || 900;
    return new Promise(function (resolve) {
      var lastScrollY = window.scrollY;
      var stableFrameCount = 0;
      var startTime = performance.now();

      function onFrame() {
        var currentScrollY = window.scrollY;
        if (Math.abs(currentScrollY - lastScrollY) < 1) {
          stableFrameCount = stableFrameCount + 1;
        } else {
          stableFrameCount = 0;
          lastScrollY = currentScrollY;
        }
        if (stableFrameCount >= 2 || performance.now() - startTime > timeout) {
          resolve();
        } else {
          requestAnimationFrame(onFrame);
        }
      }
      requestAnimationFrame(onFrame);
    });
  };

  // scroll the target element into view
  OnboardingTour.prototype.focusTarget = async function focusTarget(targetElement) {
    if (!targetElement) {
      return;
    }

    // temporarily allow scrolling so we can scroll to the target
    if (this.scrollBlocker) {
      window.removeEventListener("wheel", this.scrollBlocker);
      window.removeEventListener("touchmove", this.scrollBlocker);
    }
    await this.waitForFrames(1);

    var targetRect = targetElement.getBoundingClientRect();
    var centeredTop = Math.max(0, window.scrollY + targetRect.top - (window.innerHeight / 2 - targetRect.height / 2));
    if (Math.abs(window.scrollY - centeredTop) >= 4) {
      window.scrollTo({ top: centeredTop, behavior: "smooth" });
      await this.waitForScrollToSettle();
    }

    // re-attach scroll blockers
    if (this.scrollBlocker) {
      window.addEventListener("wheel", this.scrollBlocker, { passive: false });
      window.addEventListener("touchmove", this.scrollBlocker, { passive: false });
    }
  };

  // show a step, skipping any targets missing from the page
  OnboardingTour.prototype.showStep = async function showStep(stepIndex, direction) {
    var stepDirection = direction || 1;
    var stepCursor = stepIndex;
    var visitedSteps = {};

    while (stepCursor >= 0 && stepCursor < this.steps.length) {
      if (visitedSteps[stepCursor]) {
        break;
      }
      visitedSteps[stepCursor] = true;

      var step = this.steps[stepCursor];

      // switch tab if this step requires it
      if (step && step.tab) {
        var tabButton = document.querySelector('[role="tab"][data-tab="' + step.tab + '"]');
        if (tabButton) {
          tabButton.click();
        }
        await this.waitForFrames();
      }

      var targetElement = document.querySelector('[data-tour="' + step.target + '"]');
      if (!targetElement) {
        stepCursor = stepCursor + stepDirection;
        continue;
      }

      this.currentStepIndex = stepCursor;
      this.currentTarget = targetElement;

      this.stepToken = this.stepToken + 1;
      var scrollToken = this.stepToken;
      await this.focusTarget(targetElement);
      if (scrollToken !== this.stepToken) {
        return;
      }

      this.updateSpotlight(targetElement);
      this.updateTooltip(step, targetElement);
      return;
    }

    // no valid targets left on this page
    if (typeof this.onComplete === "function") {
      await this.onComplete();
      this.closeTour();
      return;
    }
    await this.completeTour();
  };

  // position the spotlight around the target
  OnboardingTour.prototype.updateSpotlight = function updateSpotlight(targetElement) {
    if (this.lastHighlightedElement && this.lastHighlightedElement !== targetElement) {
      this.lastHighlightedElement.classList.remove("onboarding-target-active");
    }
    targetElement.classList.add("onboarding-target-active");
    this.lastHighlightedElement = targetElement;

    var targetRect = targetElement.getBoundingClientRect();
    var padding = 10;
    var top = Math.max(8, targetRect.top - padding);
    var left = Math.max(8, targetRect.left - padding);
    var width = Math.max(24, targetRect.width + padding * 2);
    var height = Math.max(24, targetRect.height + padding * 2);
    width = Math.min(window.innerWidth - left - 8, width);
    height = Math.min(window.innerHeight - top - 8, height);

    this.spotlightElement.style.top = top + "px";
    this.spotlightElement.style.left = left + "px";
    this.spotlightElement.style.width = width + "px";
    this.spotlightElement.style.height = height + "px";
  };

  // render and position the tooltip
  OnboardingTour.prototype.updateTooltip = function updateTooltip(step, targetElement) {
    var targetRect = targetElement.getBoundingClientRect();
    var totalSteps = this.steps.length;
    var currentStepNumber = this.currentStepIndex + 1;
    var isLastStep = this.currentStepIndex === totalSteps - 1;

    this.tooltipElement.classList.remove("is-intro");

    // build the action button
    var actionButton = "";
    if (isLastStep) {
      actionButton = '<button class="btn-tour" onclick="window.onboardingTour.completeTour()">Finish &#8250;</button>';
    } else {
      actionButton = '<button class="btn-tour" onclick="window.onboardingTour.nextStep()">Continue &#8250;</button>';
    }

    // build the back button
    var backButton = '<button class="btn-tour-secondary" onclick="window.onboardingTour.prevStep()"';
    if (this.currentStepIndex === 0) {
      backButton = backButton + ' disabled style="opacity:.4;cursor:not-allowed"';
    }
    backButton = backButton + ">&#8249; Back</button>";

    this.tooltipElement.innerHTML = ""
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
      + '<span style="font-size:11px;color:#06b6d4;font-weight:600;letter-spacing:.04em;text-transform:uppercase">'
      + "Step " + currentStepNumber + " of " + totalSteps
      + "</span>"
      + "</div>"
      + "<h3>" + step.title + "</h3>"
      + "<p>" + step.description + "</p>"
      + '<div style="margin-top:16px;display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap">'
      + actionButton
      + '<button class="btn-tour-secondary" onclick="window.onboardingTour.skipTour()">Skip</button>'
      + backButton
      + "</div>";

    // measure off-screen then position
    this.tooltipElement.style.cssText = "top:0;left:0;visibility:hidden";
    var edgeMargin = 16;
    var tooltipGap = 18;
    var viewWidth = window.innerWidth;
    var viewHeight = window.innerHeight;
    var tooltipWidth = this.tooltipElement.offsetWidth;
    var tooltipHeight = this.tooltipElement.offsetHeight;

    var targetCenterX = targetRect.left + targetRect.width / 2;
    var left = Math.min(Math.max(targetCenterX - tooltipWidth / 2, edgeMargin), viewWidth - tooltipWidth - edgeMargin);

    var spaceBelow = viewHeight - targetRect.bottom;
    var spaceAbove = targetRect.top;
    var top;
    if (spaceBelow >= tooltipHeight + tooltipGap) {
      top = targetRect.bottom + tooltipGap;
    } else if (spaceAbove >= tooltipHeight + tooltipGap) {
      top = targetRect.top - tooltipHeight - tooltipGap;
    } else {
      top = viewHeight - tooltipHeight - edgeMargin;
    }

    top = Math.max(edgeMargin, Math.min(top, viewHeight - tooltipHeight - edgeMargin));
    left = Math.max(edgeMargin, Math.min(left, viewWidth - tooltipWidth - edgeMargin));

    this.tooltipElement.style.cssText = "top:" + top + "px;left:" + left + "px";
    if (this.tooltipElement.focus) {
      this.tooltipElement.focus({ preventScroll: true });
    }
  };

  // go to the next step
  OnboardingTour.prototype.nextStep = function nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.showStep(this.currentStepIndex + 1, 1);
    }
  };

  // go to the previous step
  OnboardingTour.prototype.prevStep = function prevStep() {
    if (this.currentStepIndex > 0) {
      this.showStep(this.currentStepIndex - 1, -1);
    }
  };

  // complete the tour
  OnboardingTour.prototype.completeTour = async function completeTour() {
    if (typeof this.onComplete === "function") {
      await this.onComplete();
      this.closeTour();
      return;
    }
    await apiPost(ENDPOINTS.onboarding.complete, { user_email: this.userEmail });
    this.closeTour();
    window.location.href = "/dashboard.html";
  };

  // skip the tour
  OnboardingTour.prototype.skipTour = async function skipTour() {
    if (typeof this.onSkip === "function") {
      await this.onSkip();
      this.closeTour();
      return;
    }
    try {
      await apiPost(ENDPOINTS.onboarding.skip, { user_email: this.userEmail });
    } catch (skipError) {
      // ignore
    }
    this.closeTour();
    window.location.href = "/dashboard.html";
  };

  // close the tour and clean up all overlay elements
  OnboardingTour.prototype.closeTour = function closeTour() {
    this.isActive = false;
    this.currentTarget = null;
    if (this.lastHighlightedElement) {
      this.lastHighlightedElement.classList.remove("onboarding-target-active");
      this.lastHighlightedElement = null;
    }
    if (this.backdropElement) {
      this.backdropElement.remove();
    }
    if (this.spotlightElement) {
      this.spotlightElement.remove();
    }
    if (this.tooltipElement) {
      this.tooltipElement.remove();
    }
    this.backdropElement = null;
    this.spotlightElement = null;
    this.tooltipElement = null;
    this.unlockScreen();
  };

  // check if the tour should start on this page
  function maybeStartOnboardingTour(stageKey, userEmail) {
    if (!stageKey || !userEmail) {
      return false;
    }

    var normalizedEmail = normalizeEmail(userEmail);
    var onboardingUser = normalizeEmail(localStorage.getItem(USER_KEY));
    if (!onboardingUser || onboardingUser !== normalizedEmail) {
      if (onboardingUser) {
        localStorage.removeItem(STAGE_KEY);
      }
      return false;
    }

    // check session flag
    var sessionActive = false;
    try {
      sessionActive = sessionStorage.getItem(SESSION_KEY) === "true";
    } catch (sessionError) {
      // ignore
    }
    if (!sessionActive) {
      localStorage.removeItem(STAGE_KEY);
      return false;
    }

    // already done?
    if (isOnboardingDone(normalizedEmail)) {
      return false;
    }

    // check stage matches
    var currentStage = (localStorage.getItem(STAGE_KEY) || "").trim();
    if (currentStage && !arrayContains(FLOW, currentStage)) {
      currentStage = arrayContains(FLOW, "sandbox") ? "sandbox" : (FLOW[0] || "");
      if (currentStage) {
        localStorage.setItem(STAGE_KEY, currentStage);
      } else {
        localStorage.removeItem(STAGE_KEY);
        return false;
      }
    }
    if (!currentStage || currentStage !== stageKey) {
      return false;
    }

    var stageSteps = STEPS[stageKey] || [];
    if (!stageSteps.length) {
      return false;
    }

    var stageIndex = -1;
    for (var f = 0; f < FLOW.length; f++) {
      if (FLOW[f] === stageKey) {
        stageIndex = f;
        break;
      }
    }
    var nextStage = stageIndex >= 0 ? (FLOW[stageIndex + 1] || null) : null;

    // called when the user finishes all steps on this page
    var handleComplete = async function () {
      if (nextStage) {
        localStorage.setItem(STAGE_KEY, nextStage);
        try {
          await apiPost(ENDPOINTS.onboarding.stepComplete.replace(":id", encodeURIComponent(stageKey)), {
            user_email: normalizedEmail, stage: stageKey
          });
        } catch (stepError) {
          // ignore
        }
        window.location.href = STAGE_URLS[nextStage] || (nextStage + ".html");
        return;
      }

      // final stage — complete onboarding and award achievements
      try {
        var result = await apiPost(ENDPOINTS.onboarding.complete, { user_email: normalizedEmail });
        var unlocks = (result && Array.isArray(result.newly_unlocked)) ? result.newly_unlocked : [];
        if (unlocks.length && window.NetologyAchievements && window.NetologyAchievements.queueUnlocks) {
          window.NetologyAchievements.queueUnlocks(normalizedEmail, unlocks);
        }
        var achievementXp = Number((result && result.achievement_xp_added) || 0);
        if (achievementXp > 0) {
          bumpStoredUserXp(normalizedEmail, achievementXp);
        }
      } catch (completeError) {
        // ignore
      }

      markOnboardingComplete();
      if (window.location.pathname.indexOf("dashboard.html") === -1) {
        window.location.href = STAGE_URLS.dashboard || "dashboard.html";
      }
    };

    // called when the user clicks skip
    var handleSkip = async function () {
      try {
        await apiPost(ENDPOINTS.onboarding.skip, { user_email: normalizedEmail });
      } catch (skipError) {
        // ignore
      }
      markOnboardingSkipped();
      if (window.NetologyToast && window.NetologyToast.showMessageToast) {
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
