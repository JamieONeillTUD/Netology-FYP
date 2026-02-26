/*
---------------------------------------------------------
Student: C22320301 - Jamie O’Neill
File: dashboard.js
Purpose: Runs the dashboard page widgets, progress cards, achievements, and onboarding welcome flow.
Notes: Rebuilt with simpler structure, removed old/unused sections, and kept dashboard functionality.
---------------------------------------------------------
*/

(() => {
  "use strict";

  const BASE_XP = 100;
  const ENDPOINTS = window.ENDPOINTS || {};
  const CHALLENGE_CACHE_MS = 60000;
  const REFRESH_DEBOUNCE_MS = 180;

  const DAILY_TIPS = [
    "CompTIA Network+ covers the physical, data link, network, transport, and application layers.",
    "A MAC address is 48 bits long and is burned into the network card.",
    "OSPF is a link-state routing protocol using Dijkstra's algorithm.",
    "TCP is connection-oriented, while UDP is connectionless.",
    "DNS translates human-readable domain names into IP addresses.",
    "DHCP automatically assigns IP addresses to devices on a network.",
    "VLANs segment a network to improve security and performance.",
    "A subnet mask defines the network and host portions of an IP address.",
    "ARP maps IP addresses to MAC addresses.",
    "A firewall filters traffic based on security rules."
  ];

  const ACHIEVEMENT_ICON_BY_ID = {
    first_lesson: "bi-journal-check",
    five_day_streak: "bi-fire",
    novice_master: "bi-mortarboard-fill",
    sandbox_builder: "bi-diagram-3-fill",
    speed_learner: "bi-lightning-charge-fill"
  };

  const dashboardState = {
    refreshTimer: null,
    dailyTipTimer: null,
    statsCarouselTimer: null,
    progressSummary: null,
    achievementCatalog: { all: [], unlocked: [], locked: [] },
    achievementsFetchedAt: 0,
    challenges: { daily: [], weekly: [] },
    challengesFetchedAt: 0,
    autoRefreshBound: false
  };

  // Use shared API helper if it exists.
  const apiGet = typeof window.apiGet === "function"
    ? window.apiGet
    : async function apiGetFallback(path, params = {}) {
      const base = String(window.API_BASE || "").trim();
      const url = base
        ? new URL(base.replace(/\/$/, "") + path)
        : new URL(path, window.location.origin);

      Object.entries(params).forEach(([paramName, paramValue]) => {
        if (paramValue !== undefined && paramValue !== null && paramValue !== "") {
          url.searchParams.set(paramName, String(paramValue));
        }
      });

      const response = await fetch(url.toString(), { cache: "no-store" });
      return response.json();
    };

  // Read array values safely from API responses.
  const listFrom = window.API_HELPERS?.list || function listFromFallback(data, ...keys) {
    if (Array.isArray(data)) return data;
    for (const keyName of keys) {
      if (Array.isArray(data?.[keyName])) return data[keyName];
    }
    return [];
  };

  function getById(elementId) {
    return document.getElementById(elementId);
  }

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
      return;
    }
    callback();
  }

  function parseJson(rawValue, fallback = null) {
    try {
      return rawValue ? JSON.parse(rawValue) : fallback;
    } catch {
      return fallback;
    }
  }

  function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
  }

  function clearChildren(element) {
    if (element) element.replaceChildren();
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function animateCount(element, targetValue) {
    if (!element) return;

    const target = Number(targetValue || 0);
    const startValue = Number(element.dataset.count || element.textContent || 0);

    if (!Number.isFinite(target) || !Number.isFinite(startValue) || target === startValue) {
      element.textContent = String(target);
      element.dataset.count = String(target);
      return;
    }

    const startTime = performance.now();
    const durationMs = 450;

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const nextValue = Math.round(startValue + (target - startValue) * progress);
      element.textContent = String(nextValue);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        element.dataset.count = String(target);
      }
    };

    requestAnimationFrame(tick);
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  // -----------------------------
  // User + XP
  // -----------------------------

  function getCurrentUser() {
    return (
      parseJson(localStorage.getItem("netology_user"), null)
      || parseJson(localStorage.getItem("user"), null)
      || null
    );
  }

  function saveCurrentUser(user) {
    if (!user) return;
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("netology_user", JSON.stringify(user));
  }

  function totalXpForLevel(level) {
    const safeLevel = Math.max(1, Number(level) || 1);
    return BASE_XP * (safeLevel - 1) * safeLevel / 2;
  }

  function levelFromXP(totalXp) {
    const xp = Math.max(0, Number(totalXp) || 0);
    const factor = xp / BASE_XP;
    const computedLevel = Math.floor((1 + Math.sqrt(1 + 8 * factor)) / 2);
    return Math.max(1, computedLevel);
  }

  function xpForNextLevel(level) {
    const safeLevel = Math.max(1, Number(level) || 1);
    return BASE_XP * safeLevel;
  }

  function rankForLevel(level) {
    if (Number(level) >= 5) return "Advanced";
    if (Number(level) >= 3) return "Intermediate";
    return "Novice";
  }

  function readUserLevel(user) {
    const numericLevel = Number(user?.numeric_level);
    if (Number.isFinite(numericLevel) && numericLevel > 0) return numericLevel;
    return levelFromXP(Number(user?.xp || 0));
  }

  function readUserRank(user, fallbackLevel) {
    const rawRank = String(user?.rank || user?.level || user?.level_name || "").trim();
    if (rawRank) {
      const lowerRank = rawRank.toLowerCase();
      if (lowerRank.includes("advanced")) return "Advanced";
      if (lowerRank.includes("intermediate")) return "Intermediate";
      if (lowerRank.includes("novice")) return "Novice";
    }
    return rankForLevel(fallbackLevel);
  }

  function computeXpDisplay(user) {
    const totalXp = Math.max(0, Number(user?.xp || 0));
    const level = readUserLevel(user);

    const serverXpInto = Number(user?.xp_into_level);
    const serverNextXp = Number(user?.next_level_xp);

    if (Number.isFinite(serverXpInto) && Number.isFinite(serverNextXp) && serverNextXp > 0) {
      const expectedTotal = totalXpForLevel(level) + serverXpInto;
      if (Math.abs(expectedTotal - totalXp) <= 1) {
        const progressPercent = Math.max(0, Math.min(100, (serverXpInto / serverNextXp) * 100));
        return {
          totalXp,
          level,
          rank: readUserRank(user, level),
          xpIntoLevel: serverXpInto,
          xpNext: serverNextXp,
          progressPercent,
          toNext: Math.max(0, serverNextXp - serverXpInto)
        };
      }
    }

    const levelStartXp = totalXpForLevel(level);
    const xpIntoLevel = Math.max(0, totalXp - levelStartXp);
    const xpNext = xpForNextLevel(level);
    const progressPercent = Math.max(0, Math.min(100, (xpIntoLevel / Math.max(xpNext, 1)) * 100));

    return {
      totalXp,
      level,
      rank: readUserRank(user, level),
      xpIntoLevel,
      xpNext,
      progressPercent,
      toNext: Math.max(0, xpNext - xpIntoLevel)
    };
  }

  function fillUserChrome(user) {
    const displayName = user?.first_name
      ? `${user.first_name} ${user.last_name || ""}`.trim()
      : (user?.name || user?.username || "Student");

    const email = user?.email || "Not logged in";
    const avatarInitial = (displayName || "S").trim().charAt(0).toUpperCase() || "S";
    const xp = computeXpDisplay(user || {});

    if (getById("welcomeName")) getById("welcomeName").textContent = displayName;

    if (getById("topAvatar")) getById("topAvatar").textContent = avatarInitial;

    if (getById("ddAvatar")) getById("ddAvatar").textContent = avatarInitial;
    if (getById("ddName")) getById("ddName").textContent = displayName;
    if (getById("ddEmail")) getById("ddEmail").textContent = email;
    if (getById("ddLevel")) getById("ddLevel").textContent = `Level ${xp.level}`;
    if (getById("ddRank")) getById("ddRank").textContent = xp.rank;

    if (getById("sideAvatar")) getById("sideAvatar").textContent = avatarInitial;
    if (getById("sideUserName")) getById("sideUserName").textContent = displayName;
    if (getById("sideUserEmail")) getById("sideUserEmail").textContent = email;
    if (getById("sideLevelBadge")) getById("sideLevelBadge").textContent = `Lv ${xp.level}`;
    if (getById("sideXpText")) getById("sideXpText").textContent = `${xp.xpIntoLevel}/${xp.xpNext}`;
    if (getById("sideXpBar")) getById("sideXpBar").style.width = `${xp.progressPercent}%`;
    if (getById("sideXpHint")) getById("sideXpHint").textContent = `${xp.toNext} XP to next level`;

    if (getById("heroRank")) getById("heroRank").textContent = xp.rank;
    if (getById("heroLevel")) getById("heroLevel").textContent = `Level ${xp.level}`;

    const heroXpElement = getById("heroXP");
    if (heroXpElement) heroXpElement.textContent = xp.totalXp.toLocaleString();

    renderHeroXpGauge(xp.level, xp.progressPercent);
  }

  function renderHeroXpGauge(level, progressPercent) {
    const heroXpElement = getById("heroXP");
    if (!heroXpElement || !heroXpElement.parentElement) return;

    let arcContainer = heroXpElement.parentElement.querySelector(".net-xp-arc");
    if (!arcContainer) {
      arcContainer = document.createElement("div");
      arcContainer.className = "net-xp-arc position-relative mt-2 d-flex justify-content-center";
      heroXpElement.parentElement.appendChild(arcContainer);
    }

    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const arcLength = circumference / 2;
    const arcOffset = arcLength - (Math.max(0, Math.min(100, Number(progressPercent) || 0)) / 100) * arcLength;

    arcContainer.innerHTML = `
      <svg width="170" height="95" viewBox="0 0 110 65" style="display:block; margin:0 auto; overflow:visible;">
        <defs>
          <linearGradient id="xpGradHero" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#0d9488" />
            <stop offset="100%" stop-color="#06b6d4" />
          </linearGradient>
        </defs>
        <path d="M 10,55 A 45,45 0 0 1 100,55" fill="none" stroke="#f1f5f9" stroke-width="12" stroke-linecap="round" />
        <path d="M 10,55 A 45,45 0 0 1 100,55" fill="none" stroke="url(#xpGradHero)" stroke-width="12" stroke-linecap="round"
          stroke-dasharray="${arcLength}" stroke-dashoffset="${arcOffset}"
          style="transition: stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1);" />
      </svg>
      <div class="net-xp-gauge-lbl">
        <div class="net-xp-level-big">Lvl ${level}</div>
        <div class="net-xp-percent-sm">${Math.round(progressPercent)}%</div>
      </div>
    `;
  }

  // -----------------------------
  // Sidebar + Dropdown + Logout
  // -----------------------------

  function wireBrandRouting() {
    const target = getCurrentUser()?.email ? "dashboard.html" : "index.html";
    const topBrand = getById("topBrand");
    const sideBrand = getById("sideBrand");

    if (topBrand) topBrand.setAttribute("href", target);
    if (sideBrand) sideBrand.setAttribute("href", target);
  }

  function wireSidebar() {
    const openButton = getById("openSidebarBtn");
    const closeButton = getById("closeSidebarBtn");
    const sidebar = getById("slideSidebar");
    const backdrop = getById("sideBackdrop");

    const openSidebar = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
      sidebar.setAttribute("aria-hidden", "false");
      backdrop.setAttribute("aria-hidden", "false");
    };

    const closeSidebar = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
      sidebar.setAttribute("aria-hidden", "true");
      backdrop.setAttribute("aria-hidden", "true");
    };

    if (openButton) openButton.addEventListener("click", openSidebar);
    if (closeButton) closeButton.addEventListener("click", closeSidebar);
    if (backdrop) backdrop.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sidebar?.classList.contains("is-open")) {
        closeSidebar();
      }
    });
  }

  function wireUserDropdown() {
    const button = getById("userBtn");
    const dropdown = getById("userDropdown");
    if (!button || !dropdown) return;

    const closeDropdown = () => {
      dropdown.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    };

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = dropdown.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (event) => {
      if (dropdown.contains(event.target) || button.contains(event.target)) return;
      closeDropdown();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDropdown();
    });
  }

  function wireLogoutButtons() {
    const topLogoutButton = getById("topLogoutBtn");
    const sideLogoutButton = getById("sideLogoutBtn");

    const logout = () => {
      localStorage.removeItem("netology_user");
      localStorage.removeItem("user");
      localStorage.removeItem("netology_token");
      window.location.href = "index.html";
    };

    if (topLogoutButton) topLogoutButton.addEventListener("click", logout);
    if (sideLogoutButton) sideLogoutButton.addEventListener("click", logout);
  }

  // -----------------------------
  // Course + progress helpers
  // -----------------------------

  function getCourseContentObject() {
    if (window.COURSE_CONTENT && typeof window.COURSE_CONTENT === "object") return window.COURSE_CONTENT;
    if (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) return COURSE_CONTENT;
    return {};
  }

  function getCourseIndex() {
    const content = getCourseContentObject();
    const index = {};

    Object.keys(content).forEach((courseId) => {
      const course = content[courseId] || {};
      index[courseId] = {
        id: String(course.id || courseId),
        ...course
      };
    });

    return index;
  }

  function mapItemType(sectionType, item) {
    const sectionText = String(sectionType || "").toLowerCase();
    if (sectionText.includes("quiz")) return "quiz";
    if (sectionText.includes("challenge")) return "challenge";
    if (sectionText.includes("practice") || sectionText.includes("sandbox") || sectionText.includes("hands-on")) return "sandbox";

    const itemType = String(item?.type || "").toLowerCase();
    if (itemType === "quiz") return "quiz";
    if (itemType === "challenge") return "challenge";
    if (itemType === "sandbox" || itemType === "practice") return "sandbox";

    return "learn";
  }

  function countRequiredItems(course) {
    if (!course) return 0;

    const directTotal = Number(course.total_lessons || course.totalLessons || course.items || 0);
    if (Number.isFinite(directTotal) && directTotal > 0) return directTotal;

    const units = toArray(course.units || course.modules);
    let requiredCount = 0;

    units.forEach((unit) => {
      if (Array.isArray(unit?.sections)) {
        unit.sections.forEach((section) => {
          const sectionType = String(section?.type || section?.kind || section?.title || "").toLowerCase();
          const sectionItems = toArray(section?.items || section?.lessons);

          sectionItems.forEach((item) => {
            const itemType = mapItemType(sectionType, item);
            if (itemType === "learn" || itemType === "quiz" || itemType === "challenge") {
              requiredCount += 1;
            }
          });
        });
        return;
      }

      if (unit?.sections && typeof unit.sections === "object") {
        const sectionGroups = unit.sections;
        requiredCount += toArray(sectionGroups.learn || sectionGroups.lesson || sectionGroups.lessons).length;
        requiredCount += toArray(sectionGroups.quiz || sectionGroups.quizzes).length;
        requiredCount += toArray(sectionGroups.challenge || sectionGroups.challenges).length;
        return;
      }

      const lessonItems = toArray(unit?.lessons);
      lessonItems.forEach((item) => {
        const itemType = mapItemType("", item);
        if (itemType === "learn" || itemType === "quiz" || itemType === "challenge") {
          requiredCount += 1;
        }
      });
    });

    return requiredCount;
  }

  function getStartedCourses(email) {
    if (!email) return [];
    const key = `netology_started_courses:${email}`;
    const started = parseJson(localStorage.getItem(key), []);
    return Array.isArray(started) ? started : [];
  }

  function getProgressLog(email) {
    if (!email) return [];
    const key = `netology_progress_log:${email}`;
    const log = parseJson(localStorage.getItem(key), []);
    return Array.isArray(log) ? log : [];
  }

  function mergeSoftLessonCompletions(lessonSet, email, courseId) {
    if (!lessonSet || !courseId) return;

    const userKey = email || "guest";
    const keyPrefix = `netology_lesson_progress:${userKey}:${courseId}:`;

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(keyPrefix)) continue;

      const record = parseJson(localStorage.getItem(key), {}) || {};
      const totalSteps = Math.max(1, Number(record.total_steps || 0));
      const completedSteps = Math.max(0, Number(record.completed_steps || 0));
      const percentFromSteps = Math.round((completedSteps / totalSteps) * 100);
      const percent = Math.max(percentFromSteps, Number(record.progress_pct || 0));

      if (percent < 40) continue;

      const keyParts = key.split(":");
      const lessonNumber = Number(keyParts[keyParts.length - 1] || 0);
      if (lessonNumber) lessonSet.add(lessonNumber);
    }
  }

  function getCourseCompletionsLocal(email, courseId) {
    if (!email || !courseId) {
      return {
        lesson: new Set(),
        quiz: new Set(),
        challenge: new Set()
      };
    }

    const key = `netology_completions:${email}:${courseId}`;
    const payload = parseJson(localStorage.getItem(key), {}) || {};

    const lessonSet = new Set(toArray(payload.lesson || payload.lessons || payload.learn).map(Number));
    const quizSet = new Set(toArray(payload.quiz || payload.quizzes).map(Number));
    const challengeSet = new Set(toArray(payload.challenge || payload.challenges).map(Number));

    const progressLog = getProgressLog(email);
    progressLog.forEach((entry) => {
      if (String(entry?.course_id) !== String(courseId)) return;

      const type = String(entry?.type || "").toLowerCase();
      const lessonNumber = Number(entry?.lesson_number);
      if (!Number.isFinite(lessonNumber)) return;

      if (type === "learn" || type === "lesson") lessonSet.add(lessonNumber);
      if (type === "quiz") quizSet.add(lessonNumber);
      if (type === "challenge") challengeSet.add(lessonNumber);
    });

    mergeSoftLessonCompletions(lessonSet, email, courseId);

    return {
      lesson: lessonSet,
      quiz: quizSet,
      challenge: challengeSet
    };
  }

  function getLocalProgressSummary(email) {
    const content = getCourseContentObject();
    const courseIds = Object.keys(content);
    const startedIds = new Set(getStartedCourses(email).map((entry) => String(entry.id)));

    let lessonsDone = 0;
    let quizzesDone = 0;
    let challengesDone = 0;
    let coursesDone = 0;
    let inProgress = 0;

    courseIds.forEach((courseId) => {
      const course = content[courseId] || {};
      const completions = getCourseCompletionsLocal(email, courseId);
      const doneCount = completions.lesson.size + completions.quiz.size + completions.challenge.size;
      const requiredCount = countRequiredItems(course);

      lessonsDone += completions.lesson.size;
      quizzesDone += completions.quiz.size;
      challengesDone += completions.challenge.size;

      if (requiredCount > 0 && doneCount >= requiredCount) {
        coursesDone += 1;
      } else if (startedIds.has(String(courseId)) || doneCount > 0) {
        inProgress += 1;
      }
    });

    return {
      lessonsDone,
      quizzesDone,
      challengesDone,
      coursesDone,
      inProgress,
      totalCourses: courseIds.length
    };
  }

  async function fetchProgressSummary(email) {
    if (!email) {
      dashboardState.progressSummary = null;
      return null;
    }

    try {
      const endpoint = ENDPOINTS.courses?.userProgressSummary || "/user-progress-summary";
      const data = await apiGet(endpoint, { email });

      if (!data?.success) {
        dashboardState.progressSummary = null;
        return null;
      }

      const summary = {
        email,
        lessonsDone: Number(data.lessons_done || 0),
        quizzesDone: Number(data.quizzes_done || 0),
        challengesDone: Number(data.challenges_done || 0),
        coursesDone: Number(data.courses_done || 0),
        inProgress: Number(data.in_progress || 0),
        totalCourses: Number(data.total_courses || 0)
      };

      dashboardState.progressSummary = summary;
      return summary;
    } catch {
      dashboardState.progressSummary = null;
      return null;
    }
  }

  async function fetchContinueCourses(email) {
    if (!email) return [];

    try {
      const data = await apiGet(ENDPOINTS.courses?.userCourses || "/user-courses", { email });
      const userCourses = listFrom(data, "courses");
      return userCourses.filter((course) => String(course?.status || "").toLowerCase() === "in-progress");
    } catch {
      return [];
    }
  }

  // -----------------------------
  // Daily tip
  // -----------------------------

  function getDayOfYearIndex() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diffMs = now - start;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  function buildCourseTips() {
    const courseIndex = getCourseIndex();
    return Object.keys(courseIndex).map((courseId) => {
      const course = courseIndex[courseId] || {};
      return {
        title: course.title || "Course",
        description: String(course.description || "").split("\n")[0] || "Open a course to continue learning."
      };
    });
  }

  function updateTooltip(element, text) {
    if (!element) return;

    try {
      element.setAttribute("title", text);
      if (window.bootstrap?.Tooltip) {
        const existing = window.bootstrap.Tooltip.getInstance(element);
        if (existing) existing.dispose();
        new window.bootstrap.Tooltip(element);
      }
    } catch {
      // Ignore tooltip setup errors.
    }
  }

  function initDailyTipRotation() {
    const tipElement = getById("dailyTip");
    const controlsElement = getById("dailyTipControls");
    if (!tipElement) return;

    if (dashboardState.dailyTipTimer) {
      clearInterval(dashboardState.dailyTipTimer);
      dashboardState.dailyTipTimer = null;
    }

    const courseTips = buildCourseTips();

    if (courseTips.length === 0) {
      const fallbackTip = DAILY_TIPS[getDayOfYearIndex() % DAILY_TIPS.length];
      tipElement.textContent = fallbackTip;
      updateTooltip(tipElement, fallbackTip);
      if (controlsElement) {
        controlsElement.innerHTML = "";
        controlsElement.setAttribute("aria-hidden", "true");
      }
      return;
    }

    let tipIndex = getDayOfYearIndex() % courseTips.length;

    const showTip = (index) => {
      const tip = courseTips[index];
      if (!tip) return;

      tipElement.classList.add("is-hidden");
      window.setTimeout(() => {
        tipElement.textContent = tip.description;
        updateTooltip(tipElement, tip.description);
        tipElement.classList.remove("is-hidden");
      }, 760);

      if (controlsElement) {
        const dots = controlsElement.querySelectorAll(".daily-indicator");
        dots.forEach((dot, dotIndex) => {
          dot.classList.toggle("active", dotIndex === index);
        });
      }
    };

    if (controlsElement) {
      controlsElement.innerHTML = "";
      controlsElement.setAttribute("aria-hidden", "false");

      courseTips.forEach((tip, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = `daily-indicator${index === tipIndex ? " active" : ""}`;
        dot.dataset.index = String(index);
        dot.setAttribute("aria-label", `Show ${tip.title}`);

        dot.addEventListener("click", (event) => {
          event.stopPropagation();
          tipIndex = Number(dot.dataset.index || 0);
          showTip(tipIndex);

          if (dashboardState.dailyTipTimer) {
            clearInterval(dashboardState.dailyTipTimer);
          }
          dashboardState.dailyTipTimer = setInterval(() => {
            tipIndex = (tipIndex + 1) % courseTips.length;
            showTip(tipIndex);
          }, 8000);
        });

        controlsElement.appendChild(dot);
      });
    }

    showTip(tipIndex);

    dashboardState.dailyTipTimer = setInterval(() => {
      tipIndex = (tipIndex + 1) % courseTips.length;
      showTip(tipIndex);
    }, 8000);
  }

  // -----------------------------
  // Continue learning
  // -----------------------------

  async function renderContinueLearning(user) {
    const container = getById("continueBox");
    const subtitle = getById("continueSubtitle");
    if (!container) return;

    container.classList.remove("net-continue-skel");

    const setSubtitle = (text) => {
      if (subtitle) subtitle.textContent = text;
    };

    const email = user?.email || "";
    if (!email) {
      clearChildren(container);
      container.className = "dash-continue-list";
      setSubtitle("Sign in to track your course progress.");
      container.appendChild(createElement("div", "text-muted small", "Sign in and start a course to see your progress here."));
      return;
    }

    const courseIndex = getCourseIndex();
    const apiCourses = await fetchContinueCourses(email);

    if (apiCourses.length > 0) {
      clearChildren(container);
      container.className = "dash-continue-list";
      setSubtitle("Pick up where you left off.");

      apiCourses.forEach((entry) => {
        const course = courseIndex[String(entry.id)] || {};

        const title = entry.title || course.title || "Course";
        const description = entry.description || course.description || "";
        const difficulty = String(entry.difficulty || course.difficulty || "novice").toLowerCase();
        const category = entry.category || course.category || "Core";
        const xpReward = Number(entry.xp_reward || course.xpReward || course.totalXP || 0);
        const estimatedTime = entry.estimatedTime || course.estimatedTime || "";

        const requiredFromApi = Number(entry.total_lessons || course.total_lessons || 0);
        const percentFromApi = Math.max(0, Math.min(100, Number(entry.progress_pct || 0)));
        const doneFromApi = requiredFromApi > 0 ? Math.round((percentFromApi / 100) * requiredFromApi) : 0;

        const localCompletions = getCourseCompletionsLocal(email, entry.id);
        const requiredFromLocal = countRequiredItems(course);
        const doneFromLocal = localCompletions.lesson.size + localCompletions.quiz.size + localCompletions.challenge.size;

        const requiredCount = requiredFromApi || requiredFromLocal;
        const doneCount = Math.max(doneFromApi, doneFromLocal);
        const percent = requiredCount > 0
          ? Math.round((doneCount / requiredCount) * 100)
          : percentFromApi;

        container.appendChild(
          buildContinueCard({
            id: entry.id,
            title,
            description,
            difficulty,
            category,
            percent,
            doneCount,
            requiredCount,
            xpReward,
            estimatedTime
          })
        );
      });

      return;
    }

    const startedCourses = getStartedCourses(email)
      .filter((entry) => entry && entry.id && Number(entry.lastViewed || 0) > 0)
      .sort((first, second) => Number(second.lastViewed || 0) - Number(first.lastViewed || 0))
      .slice(0, 3);

    if (startedCourses.length > 0) {
      clearChildren(container);
      container.className = "dash-continue-list";
      setSubtitle("Pick up where you left off.");

      startedCourses.forEach((entry) => {
        const course = courseIndex[String(entry.id)] || {};

        const title = course.title || "Course";
        const description = course.description || "";
        const difficulty = String(course.difficulty || "novice").toLowerCase();
        const category = course.category || "Core";
        const xpReward = Number(course.xpReward || course.totalXP || course.xp_reward || 0);
        const estimatedTime = course.estimatedTime || "";

        const localCompletions = getCourseCompletionsLocal(email, entry.id);
        const doneCount = localCompletions.lesson.size + localCompletions.quiz.size + localCompletions.challenge.size;
        const requiredCount = countRequiredItems(course);
        const percent = requiredCount > 0 ? Math.round((doneCount / requiredCount) * 100) : 0;

        container.appendChild(
          buildContinueCard({
            id: entry.id,
            title,
            description,
            difficulty,
            category,
            percent,
            doneCount,
            requiredCount,
            xpReward,
            estimatedTime
          })
        );
      });

      return;
    }

    clearChildren(container);
    container.className = "dash-continue-list";
    setSubtitle("Start a course to track your progress here.");
    container.appendChild(createElement("div", "text-muted small", "No started courses yet. Head to the Courses page to begin."));
  }

  function prettyDifficulty(difficulty) {
    if (!difficulty) return "Novice";
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }

  function buildContinueCard({
    id,
    title,
    description,
    difficulty,
    category,
    percent,
    doneCount,
    requiredCount,
    xpReward,
    estimatedTime
  }) {
    const card = document.createElement("div");
    card.className = "net-coursecard-enhanced net-card net-pop position-relative overflow-hidden p-0";
    card.setAttribute("data-course-id", String(id));
    card.setAttribute("role", "button");
    card.tabIndex = 0;

    const cardBody = createElement("div", "p-4 position-relative z-1 h-100 d-flex flex-column");
    card.appendChild(cardBody);

    const topRow = createElement("div", "d-flex align-items-center justify-content-between mb-3");

    const badgeGroup = createElement("div", "d-flex align-items-center gap-2");
    const difficultyClass = difficulty === "intermediate"
      ? "net-diff-intermediate"
      : difficulty === "advanced"
        ? "net-diff-advanced"
        : "net-diff-novice";

    const difficultyBadge = createElement("span", `badge net-pill-badge border ${difficultyClass}`);
    difficultyBadge.textContent = prettyDifficulty(difficulty);

    const categoryBadge = createElement("span", "text-muted small fw-bold text-uppercase ls-1", category || "Course");
    badgeGroup.append(difficultyBadge, categoryBadge);

    const xpBadge = createElement("span", "badge bg-light text-dark border net-pill-badge");
    xpBadge.innerHTML = `<i class="bi bi-lightning-charge-fill text-warning me-1"></i>${Number(xpReward || 0)} XP`;

    topRow.append(badgeGroup, xpBadge);
    cardBody.appendChild(topRow);

    cardBody.appendChild(createElement("h3", "h5 fw-bold mb-2", title));

    if (description) {
      const shortDescription = description.length > 85 ? `${description.slice(0, 82)}…` : description;
      cardBody.appendChild(createElement("p", "text-muted small mb-4 flex-grow-1", shortDescription));
    } else {
      cardBody.appendChild(createElement("div", "flex-grow-1"));
    }

    if (estimatedTime) {
      const estimated = createElement("div", "small text-muted mb-2");
      estimated.innerHTML = `<i class="bi bi-clock me-1"></i>${escapeHtml(estimatedTime)}`;
      cardBody.appendChild(estimated);
    }

    const footer = createElement("div", "mt-auto");

    const progressMeta = createElement("div", "d-flex justify-content-between small mb-1 fw-bold");
    progressMeta.append(
      createElement("span", "text-teal", `${percent}% Complete`),
      createElement("span", "text-muted", `${doneCount}/${requiredCount || 0} items`)
    );

    const progressTrack = createElement("div", "progress");
    progressTrack.style.height = "6px";

    const progressBar = createElement("div", "progress-bar net-progress-fill");
    progressBar.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;

    progressTrack.appendChild(progressBar);
    footer.append(progressMeta, progressTrack);
    cardBody.appendChild(footer);

    const decoration = createElement("div", "position-absolute top-0 end-0 p-5 pe-0 pt-0");
    decoration.style.zIndex = "0";
    decoration.style.opacity = "0.03";
    decoration.style.transform = "translate(20%, -20%) scale(1.5)";
    decoration.style.pointerEvents = "none";
    decoration.innerHTML = "<svg width=\"200\" height=\"200\" viewBox=\"0 0 200 200\" fill=\"currentColor\"><circle cx=\"100\" cy=\"100\" r=\"80\"/></svg>";
    card.appendChild(decoration);

    const navigate = () => {
      window.location.href = `course.html?id=${encodeURIComponent(String(id || ""))}`;
    };

    card.addEventListener("click", navigate);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        navigate();
      }
    });

    return card;
  }

  // -----------------------------
  // Streak + stats widgets
  // -----------------------------

  function dateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function readLoginLog(email) {
    if (!email) return [];

    if (typeof window.getLoginLog === "function") {
      const sharedLog = window.getLoginLog(email);
      return Array.isArray(sharedLog) ? sharedLog : [];
    }

    return parseJson(localStorage.getItem(`netology_login_log:${email}`), []) || [];
  }

  function computeLoginStreak(log) {
    if (typeof window.computeLoginStreak === "function") {
      return Number(window.computeLoginStreak(log) || 0);
    }

    if (!Array.isArray(log) || !log.length) return 0;

    const daySet = new Set(log);
    let streak = 0;
    const cursor = new Date();

    while (daySet.has(dateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }

  function renderStreakCalendar(log) {
    const calendar = getById("streakCalendar");
    if (!calendar) return;

    clearChildren(calendar);

    const currentDate = new Date();
    const currentWeekday = currentDate.getDay();
    const mondayOffset = currentWeekday === 0 ? -6 : 1 - currentWeekday;

    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() + mondayOffset);

    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    const activeDays = new Set(Array.isArray(log) ? log : []);

    labels.forEach((label, index) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + index);

      const key = dateKey(dayDate);
      const isActive = activeDays.has(key);
      const isToday = key === dateKey(new Date());

      const dayColumn = createElement("div", `net-cal-day${isActive ? " is-active" : ""}`);
      if (isToday) dayColumn.classList.add("fw-bold");

      const dayPill = createElement("div", "net-cal-pill");
      const dayLabel = createElement("div", "net-cal-label", label);

      dayColumn.append(dayPill, dayLabel);
      dayColumn.title = dayDate.toLocaleDateString();
      calendar.appendChild(dayColumn);
    });
  }

  function renderProgressWidgets(user) {
    const email = user?.email || "";

    const apiSummary = dashboardState.progressSummary && dashboardState.progressSummary.email === email
      ? dashboardState.progressSummary
      : null;

    const localSummary = email ? getLocalProgressSummary(email) : null;

    const inProgress = Math.max(apiSummary?.inProgress || 0, localSummary?.inProgress || 0);
    const lessonsDone = Math.max(apiSummary?.lessonsDone || 0, localSummary?.lessonsDone || 0);
    const quizzesDone = Math.max(apiSummary?.quizzesDone || 0, localSummary?.quizzesDone || 0);
    const challengesDone = Math.max(apiSummary?.challengesDone || 0, localSummary?.challengesDone || 0);

    animateCount(getById("heroActive"), inProgress);
    animateCount(getById("statLessons"), lessonsDone);
    animateCount(getById("statQuizzes"), quizzesDone);
    animateCount(getById("statChallenges"), challengesDone);

    const loginLog = email ? readLoginLog(email) : [];
    const streak = computeLoginStreak(loginLog);

    animateCount(getById("heroStreak"), streak);
    renderStreakCalendar(loginLog);
  }

  function initStatsCarousel() {
    const card = getById("statsCarouselCard");
    const track = getById("statsTrack");
    const indicators = getById("statsIndicators");
    if (!track || !indicators) return;

    const slides = Array.from(track.querySelectorAll(".net-carousel-slide"));
    const dots = Array.from(indicators.querySelectorAll(".net-indicator"));

    if (!slides.length || dots.length !== slides.length) return;

    if (card) {
      card.style.cursor = "pointer";
      card.addEventListener("click", (event) => {
        if (event.target.closest(".net-indicator")) return;
        window.location.href = "progress.html";
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          window.location.href = "progress.html";
        }
      });
    }

    let slideIndex = 0;

    const setSlide = (nextIndex) => {
      slideIndex = (nextIndex + slides.length) % slides.length;
      slides.forEach((slide, index) => {
        slide.classList.toggle("is-active", index === slideIndex);
      });
      dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === slideIndex);
      });
    };

    dots.forEach((dot, index) => {
      dot.addEventListener("click", (event) => {
        event.stopPropagation();
        setSlide(index);
        restartStatsTimer();
      });
    });

    const restartStatsTimer = () => {
      if (dashboardState.statsCarouselTimer) {
        clearInterval(dashboardState.statsCarouselTimer);
      }
      dashboardState.statsCarouselTimer = setInterval(() => {
        setSlide(slideIndex + 1);
      }, 8000);
    };

    setSlide(0);
    restartStatsTimer();
  }

  // -----------------------------
  // Achievements
  // -----------------------------

  function getAchievementIconClass(achievement) {
    const rawIcon = String(achievement?.icon || "").replace(/<[^>]*>/g, "").trim();
    if (rawIcon.startsWith("bi-")) return rawIcon;
    return ACHIEVEMENT_ICON_BY_ID[achievement?.id] || "bi-star-fill";
  }

  async function fetchAchievementCatalog(email, { force = false } = {}) {
    if (!email) {
      dashboardState.achievementCatalog = { all: [], unlocked: [], locked: [] };
      dashboardState.achievementsFetchedAt = 0;
      return dashboardState.achievementCatalog;
    }

    if (!force && dashboardState.achievementCatalog.all.length > 0) {
      const ageMs = Date.now() - Number(dashboardState.achievementsFetchedAt || 0);
      if (ageMs < 60000) return dashboardState.achievementCatalog;
    }

    try {
      const endpoint = ENDPOINTS.achievements?.list || "/api/user/achievements";
      const data = await apiGet(endpoint, { user_email: email });

      if (!data?.success) {
        dashboardState.achievementCatalog = { all: [], unlocked: [], locked: [] };
        return dashboardState.achievementCatalog;
      }

      const unlocked = listFrom(data, "unlocked").map((achievement) => ({ ...achievement, unlocked: true }));
      const locked = listFrom(data, "locked").map((achievement) => ({ ...achievement, unlocked: false }));

      dashboardState.achievementCatalog = {
        all: [...unlocked, ...locked],
        unlocked,
        locked
      };
      dashboardState.achievementsFetchedAt = Date.now();

      return dashboardState.achievementCatalog;
    } catch {
      dashboardState.achievementCatalog = { all: [], unlocked: [], locked: [] };
      dashboardState.achievementsFetchedAt = 0;
      return dashboardState.achievementCatalog;
    }
  }

  function renderAchievements() {
    const scroller = getById("achieveScroller");
    if (!scroller) return;

    clearChildren(scroller);

    const achievements = Array.isArray(dashboardState.achievementCatalog?.all)
      ? dashboardState.achievementCatalog.all
      : [];

    if (!achievements.length) {
      scroller.innerHTML = '<div class="small text-muted">Complete goals to earn badges!</div>';
      return;
    }

    achievements.forEach((achievement) => {
      const item = createElement("div", `net-achieve-item${achievement.unlocked ? " is-earned" : ""}`);

      const iconBox = createElement("div", "net-achieve-icon-box");
      iconBox.innerHTML = `<i class="bi ${getAchievementIconClass(achievement)}"></i>`;

      const name = createElement("div", "net-achieve-name", achievement.name || "Achievement");

      item.append(iconBox, name);
      item.setAttribute("data-bs-toggle", "tooltip");
      item.setAttribute("data-bs-placement", "top");
      item.title = `${achievement.description || achievement.name || "Achievement"}${achievement.unlocked ? " (Unlocked!)" : " (Locked)"}`;

      scroller.appendChild(item);
    });

    initBootstrapTooltips(scroller);
  }

  // -----------------------------
  // Challenges
  // -----------------------------

  function setupChallengeToggle() {
    const buttons = Array.from(document.querySelectorAll(".dash-toggle-btn[data-panel]"));
    if (!buttons.length) return;

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((otherButton) => otherButton.classList.remove("is-active"));
        button.classList.add("is-active");

        const activePanelId = button.getAttribute("data-panel");

        buttons.forEach((panelButton) => {
          const panelId = panelButton.getAttribute("data-panel");
          if (!panelId) return;

          const panel = getById(panelId);
          if (!panel) return;

          if (panelId === activePanelId) {
            panel.hidden = false;
            requestAnimationFrame(() => panel.classList.add("is-active"));
          } else {
            panel.classList.remove("is-active");
            window.setTimeout(() => {
              panel.hidden = true;
            }, 200);
          }
        });
      });
    });
  }

  function renderChallengeList(container, challenges, type) {
    if (!container) return;

    clearChildren(container);

    if (!Array.isArray(challenges) || challenges.length === 0) {
      container.innerHTML = `<div class="small text-muted">No ${type} challenges available.</div>`;
      return;
    }

    challenges.forEach((challenge) => {
      const isDone = Number(challenge.progress || 0) >= 100;

      const item = createElement("div", `dash-task${isDone ? " is-done" : ""}`);
      item.dataset.challengeId = String(challenge.id || "");
      item.dataset.challengeType = type;
      item.dataset.xp = String(challenge.xp || 0);
      if (challenge.description) item.dataset.tip = challenge.description;

      const textColumn = createElement("div", "flex-grow-1");
      textColumn.append(
        createElement("div", "fw-semibold small", challenge.title || "Challenge"),
        createElement("div", "text-muted small", challenge.description || "")
      );

      if (!isDone) {
        const hint = createElement("div", "small text-muted mt-1", "Complete the linked task to earn this reward.");
        hint.style.fontSize = "0.72rem";
        textColumn.appendChild(hint);
      }

      const xpBadge = createElement("div", `dash-task-xp${isDone ? " is-done" : ""}`);
      if (isDone) {
        xpBadge.innerHTML = '<i class="bi bi-check2-circle"></i>';
      } else {
        xpBadge.textContent = `+${challenge.xp || 0} XP`;
      }

      item.append(textColumn, xpBadge);
      container.appendChild(item);
    });
  }

  function setChallengesRetryVisible(show) {
    const retryButton = getById("challengesRetryBtn");
    if (!retryButton) return;
    retryButton.classList.toggle("d-none", !show);
  }

  function challengeFallbackHtml() {
    const timeLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `
      <div class="small text-muted">Challenges are temporarily unavailable.</div>
      <div class="small text-muted">Try again later • ${timeLabel}</div>
    `;
  }

  function showChallengesToastOnce() {
    try {
      if (sessionStorage.getItem("netology_challenges_toast") === "1") return;
      sessionStorage.setItem("netology_challenges_toast", "1");
    } catch {
      // Ignore storage errors.
    }

    if (typeof window.showPopup === "function") {
      window.showPopup("Challenges are temporarily unavailable. We’ll keep trying in the background.", "warning");
      return;
    }

    if (window.NetologyToast?.showMessageToast) {
      window.NetologyToast.showMessageToast(
        "Challenges are temporarily unavailable. We’ll keep trying in the background.",
        "warning",
        4200
      );
    }
  }

  function clearChallengesToastFlag() {
    try {
      sessionStorage.removeItem("netology_challenges_toast");
    } catch {
      // Ignore storage errors.
    }
  }

  async function fetchChallengesByType(email, type) {
    const base = String(window.API_BASE || "").trim();
    const endpoint = ENDPOINTS.challenges?.list || "/api/user/challenges";

    const url = base
      ? new URL(base.replace(/\/$/, "") + endpoint)
      : new URL(endpoint, window.location.origin);

    url.searchParams.set("type", type);
    url.searchParams.set("user_email", email);

    try {
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = String(response.headers.get("content-type") || "");
      if (!contentType.includes("application/json")) throw new Error("Non-JSON response");

      const data = await response.json();
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async function loadChallenges(email, { force = false } = {}) {
    if (!email) {
      renderChallengeList(getById("dailyTasks"), [], "daily");
      renderChallengeList(getById("weeklyTasks"), [], "weekly");
      setChallengesRetryVisible(false);
      return;
    }

    if (!force && dashboardState.challengesFetchedAt > 0) {
      const ageMs = Date.now() - dashboardState.challengesFetchedAt;
      if (ageMs < CHALLENGE_CACHE_MS) {
        renderChallengeList(getById("dailyTasks"), dashboardState.challenges.daily, "daily");
        renderChallengeList(getById("weeklyTasks"), dashboardState.challenges.weekly, "weekly");
        setChallengesRetryVisible(false);
        return;
      }
    }

    const dailyTarget = getById("dailyTasks");
    const weeklyTarget = getById("weeklyTasks");

    if (dailyTarget) dailyTarget.innerHTML = '<div class="small text-muted">Loading daily focus…</div>';
    if (weeklyTarget) weeklyTarget.innerHTML = '<div class="small text-muted">Loading weekly challenges…</div>';

    const [dailyResult, weeklyResult] = await Promise.all([
      fetchChallengesByType(email, "daily"),
      fetchChallengesByType(email, "weekly")
    ]);

    const hasError = !dailyResult.ok || !weeklyResult.ok;

    if (dailyResult.ok) {
      const dailyChallenges = listFrom(dailyResult.data, "challenges");
      dashboardState.challenges.daily = dailyChallenges;
      renderChallengeList(dailyTarget, dailyChallenges, "daily");
    } else {
      console.warn("Daily challenges unavailable:", dailyResult.error);
      if (dailyTarget) dailyTarget.innerHTML = challengeFallbackHtml();
    }

    if (weeklyResult.ok) {
      const weeklyChallenges = listFrom(weeklyResult.data, "challenges");
      dashboardState.challenges.weekly = weeklyChallenges;
      renderChallengeList(weeklyTarget, weeklyChallenges, "weekly");
    } else {
      console.warn("Weekly challenges unavailable:", weeklyResult.error);
      if (weeklyTarget) weeklyTarget.innerHTML = challengeFallbackHtml();
    }

    if (!hasError) {
      dashboardState.challengesFetchedAt = Date.now();
      setChallengesRetryVisible(false);
      clearChallengesToastFlag();
    } else {
      setChallengesRetryVisible(true);
      showChallengesToastOnce();
    }
  }

  function wireChallengesRetry() {
    const retryButton = getById("challengesRetryBtn");
    if (!retryButton || retryButton.dataset.bound === "true") return;

    retryButton.dataset.bound = "true";
    const originalHtml = retryButton.innerHTML;

    retryButton.addEventListener("click", async () => {
      const user = getCurrentUser();
      if (!user?.email) return;

      retryButton.disabled = true;
      retryButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Retrying';

      await loadChallenges(user.email, { force: true });

      retryButton.disabled = false;
      retryButton.innerHTML = originalHtml;
    });
  }

  // -----------------------------
  // Onboarding + welcome overlay
  // -----------------------------

  function prepareOnboardingSessionForFirstLogin(user) {
    if (!user?.email || !user?.is_first_login) return;

    const email = String(user.email || "").trim().toLowerCase();
    const existingUser = String(localStorage.getItem("netology_onboarding_user") || "").trim().toLowerCase();

    const alreadyOnboarded = Boolean(user.onboarding_completed)
      || localStorage.getItem("netology_onboarding_completed") === "true"
      || localStorage.getItem(`netology_onboarding_completed_${email}`) === "true"
      || localStorage.getItem("netology_onboarding_skipped") === "true";

    if (alreadyOnboarded) return;

    if (!existingUser || existingUser !== email) {
      localStorage.setItem("netology_onboarding_user", email);
      localStorage.setItem("netology_onboarding_stage", "dashboard");
    } else if (!localStorage.getItem("netology_onboarding_stage")) {
      localStorage.setItem("netology_onboarding_stage", "dashboard");
    }

    try {
      sessionStorage.setItem("netology_onboarding_session", "true");
    } catch {
      // Ignore storage errors.
    }
  }

  function maybeShowDashboardWelcome(user) {
    const overlay = getById("dashboardWelcomeOverlay");
    if (!overlay || !user?.email) return false;

    const normalizedEmail = String(user.email || "").trim().toLowerCase();
    const onboardingUser = String(localStorage.getItem("netology_onboarding_user") || "").trim().toLowerCase();
    const stage = String(localStorage.getItem("netology_onboarding_stage") || "").trim().toLowerCase();

    let sessionAllowed = false;
    let alreadyShown = false;

    try {
      sessionAllowed = sessionStorage.getItem("netology_onboarding_session") === "true";
      alreadyShown = sessionStorage.getItem("netology_welcome_shown") === "true";
    } catch {
      // Ignore storage errors.
    }

    if (!sessionAllowed || alreadyShown || onboardingUser !== normalizedEmail || stage !== "dashboard") {
      return false;
    }

    const nameElement = getById("dashboardWelcomeName");
    if (nameElement) nameElement.textContent = user.first_name || "there";

    overlay.classList.remove("d-none");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const startButton = getById("dashboardWelcomeStart");
    const skipButton = getById("dashboardWelcomeSkip");

    let isClosing = false;

    const dismiss = (startTour) => {
      if (isClosing) return;
      isClosing = true;

      if (startButton) startButton.disabled = true;
      if (skipButton) skipButton.disabled = true;

      try {
        sessionStorage.setItem("netology_welcome_shown", "true");
      } catch {
        // Ignore storage errors.
      }

      overlay.classList.add("is-exiting");

      window.setTimeout(() => {
        overlay.classList.add("d-none");
        overlay.classList.remove("is-exiting");
        overlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";

        if (startTour && typeof window.maybeStartOnboardingTour === "function") {
          const started = window.maybeStartOnboardingTour("dashboard", user.email);
          if (!started) window.maybeStartOnboardingTour("wrapup", user.email);
        } else if (typeof window.markOnboardingSkipped === "function") {
          window.markOnboardingSkipped();
        }
      }, 420);
    };

    if (startButton && startButton.dataset.bound !== "true") {
      startButton.dataset.bound = "true";
      startButton.addEventListener("click", () => dismiss(true));
    }

    if (skipButton && skipButton.dataset.bound !== "true") {
      skipButton.dataset.bound = "true";
      skipButton.addEventListener("click", () => dismiss(false));
    }

    if (startButton && typeof startButton.focus === "function") {
      startButton.focus({ preventScroll: true });
    }

    return true;
  }

  function maybeStartDashboardTour(user) {
    if (!user?.email || typeof window.maybeStartOnboardingTour !== "function") return;

    const shownWelcome = maybeShowDashboardWelcome(user);
    if (shownWelcome) return;

    const started = window.maybeStartOnboardingTour("dashboard", user.email);
    if (!started) {
      window.maybeStartOnboardingTour("wrapup", user.email);
    }
  }

  // -----------------------------
  // Shared UI helpers
  // -----------------------------

  function initBootstrapTooltips(scope = document) {
    if (!window.bootstrap?.Tooltip) return;

    const triggerElements = scope.querySelectorAll('[data-bs-toggle="tooltip"]');
    triggerElements.forEach((element) => {
      const existing = window.bootstrap.Tooltip.getInstance(element);
      if (existing) existing.dispose();
      new window.bootstrap.Tooltip(element);
    });
  }

  async function refreshUserFromApi() {
    const localUser = getCurrentUser();
    const email = localUser?.email || localStorage.getItem("netology_last_email") || "";
    if (!email) return localUser;

    try {
      const endpoint = ENDPOINTS.auth?.userInfo || "/user-info";
      const data = await apiGet(endpoint, { email });
      if (!data?.success) return localUser;

      const unlockTier = String(
        data.start_level
        || localUser?.unlock_tier
        || localUser?.unlock_level
        || localUser?.unlockTier
        || "novice"
      ).trim().toLowerCase();

      const mergedUser = {
        ...(localUser || {}),
        email,
        first_name: data.first_name || localUser?.first_name,
        last_name: data.last_name || localUser?.last_name,
        username: data.username || localUser?.username,
        xp: Number.isFinite(Number(data.xp ?? data.total_xp)) ? Number(data.xp ?? data.total_xp) : Number(localUser?.xp || 0),
        numeric_level: Number.isFinite(Number(data.numeric_level)) ? Number(data.numeric_level) : localUser?.numeric_level,
        xp_into_level: Number.isFinite(Number(data.xp_into_level)) ? Number(data.xp_into_level) : localUser?.xp_into_level,
        next_level_xp: Number.isFinite(Number(data.next_level_xp)) ? Number(data.next_level_xp) : localUser?.next_level_xp,
        rank: data.rank || data.level || localUser?.rank,
        level: data.level || data.rank || localUser?.level,
        unlock_tier: ["novice", "intermediate", "advanced"].includes(unlockTier) ? unlockTier : "novice",
        is_first_login: typeof data.is_first_login !== "undefined" ? Boolean(data.is_first_login) : localUser?.is_first_login,
        onboarding_completed: typeof data.onboarding_completed !== "undefined"
          ? Boolean(data.onboarding_completed)
          : localUser?.onboarding_completed
      };

      saveCurrentUser(mergedUser);
      return mergedUser;
    } catch {
      return localUser;
    }
  }

  async function handleLoginStreakAndBadges(user) {
    if (!user?.email) return;

    const email = user.email;
    let loginLog = [];

    if (typeof window.recordLoginDay === "function") {
      const sharedResult = window.recordLoginDay(email);
      if (Array.isArray(sharedResult)) {
        loginLog = sharedResult;
      } else if (sharedResult && Array.isArray(sharedResult.log)) {
        loginLog = sharedResult.log;
      }
    }

    if (!loginLog.length) {
      loginLog = readLoginLog(email);
    }

    const streak = computeLoginStreak(loginLog);

    if (typeof window.awardLoginStreakBadges === "function") {
      await window.awardLoginStreakBadges(email, streak);
    }
  }

  function scheduleDashboardRefresh() {
    if (document.hidden) return;

    if (dashboardState.refreshTimer) {
      clearTimeout(dashboardState.refreshTimer);
    }

    dashboardState.refreshTimer = window.setTimeout(() => {
      refreshDashboard();
    }, REFRESH_DEBOUNCE_MS);
  }

  async function refreshDashboard() {
    const user = await refreshUserFromApi();

    fillUserChrome(user);

    if (user?.email) {
      await Promise.all([
        fetchProgressSummary(user.email),
        fetchAchievementCatalog(user.email),
        loadChallenges(user.email)
      ]);
    } else {
      dashboardState.progressSummary = null;
      dashboardState.achievementCatalog = { all: [], unlocked: [], locked: [] };
      dashboardState.challenges = { daily: [], weekly: [] };
    }

    await renderContinueLearning(user);
    renderProgressWidgets(user);
    renderAchievements();
  }

  function wireAutoRefreshEvents() {
    if (dashboardState.autoRefreshBound) return;
    dashboardState.autoRefreshBound = true;

    window.addEventListener("focus", scheduleDashboardRefresh);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) scheduleDashboardRefresh();
    });

    window.addEventListener("storage", (event) => {
      if (!event.key) return;
      if (event.key === "user" || event.key.startsWith("netology_")) {
        scheduleDashboardRefresh();
      }
    });
  }

  // -----------------------------
  // Main init
  // -----------------------------

  async function initDashboard() {
    wireBrandRouting();
    wireSidebar();
    wireUserDropdown();
    wireLogoutButtons();

    setupChallengeToggle();
    initStatsCarousel();
    wireChallengesRetry();

    initBootstrapTooltips();
    initDailyTipRotation();

    const cachedUser = getCurrentUser();
    fillUserChrome(cachedUser);
    renderProgressWidgets(cachedUser);
    await renderContinueLearning(cachedUser);

    const user = await refreshUserFromApi();
    fillUserChrome(user);

    if (user?.email) {
      await handleLoginStreakAndBadges(user);

      await Promise.all([
        fetchProgressSummary(user.email),
        fetchAchievementCatalog(user.email, { force: true }),
        loadChallenges(user.email, { force: true })
      ]);
    } else {
      dashboardState.progressSummary = null;
      dashboardState.achievementCatalog = { all: [], unlocked: [], locked: [] };
      dashboardState.achievementsFetchedAt = 0;
      dashboardState.challenges = { daily: [], weekly: [] };
      setChallengesRetryVisible(false);
    }

    await renderContinueLearning(user);
    renderProgressWidgets(user);
    renderAchievements();

    if (user?.email) {
      prepareOnboardingSessionForFirstLogin(user);
      window.setTimeout(() => {
        maybeStartDashboardTour(user);
      }, 600);
    }

    wireAutoRefreshEvents();
  }

  onReady(initDashboard);
})();
