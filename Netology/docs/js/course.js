/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 09/02/2026

course.js – Netology Course Detail (Figma-inspired behaviour)

What this file does:
- Uses dashboard chrome (slide sidebar + user dropdown + brand routing)
- Reads courseId from URL (?id=)
- Loads course structure from COURSE_CONTENT[courseId]
- Loads completion state (best-effort):
    1) tries backend endpoints (if they exist)
    2) falls back to localStorage cache so page still works offline
- Renders:
    - hero (title/desc/difficulty/meta)
    - modules accordion (Khan style)
    - lesson modal for "Learn" items
    - progress ring + progress bar + sidebar stats
- Click actions:
    - Learn -> opens modal
    - Quiz -> go to quiz.html with course/lesson info
    - Sandbox / Challenge -> go to sandbox.html with context
- Completion logic:
    Course completes ONLY when all required items are complete:
      Learn + Quiz + Challenge
    (Sandbox Practice is optional; Sandbox Challenge counts as Challenge.)
*/

(function () {
  "use strict";

  /* AI Prompt: Explain the CONFIG / FALLBACKS section in clear, simple terms. */
  /* =========================================================
     CONFIG / FALLBACKS
  ========================================================= */

  const API = () => (window.API_BASE || "").replace(/\/$/, "");
  const BASE_XP = 100;

  // If your backend endpoints differ, update ONLY these paths.
  const ENDPOINTS = {
    userInfo: (email) => `${API()}/user-info?email=${encodeURIComponent(email)}`,

    // Best-guess completion endpoints (optional)
    getCompletions: (email, courseId) =>
      `${API()}/user-course-status?email=${encodeURIComponent(email)}&course_id=${encodeURIComponent(courseId)}`,

    completeLesson: `${API()}/complete-lesson`,
    completeQuiz: `${API()}/complete-quiz`,
    completeChallenge: `${API()}/complete-challenge`,
  };

  // localStorage fallback key
  const LS_KEY = (email, courseId) => `netology_completions:${email}:${courseId}`;
  const STARTED_KEY = (email) => `netology_started_courses:${email}`;
  const LOG_KEY = (email) => `netology_progress_log:${email}`;

  /* AI Prompt: Explain the HELPERS section in clear, simple terms. */
  /* =========================================================
     HELPERS
  ========================================================= */

  const getById = (id) => document.getElementById(id);
  const clearChildren = (node) => { if (node) node.replaceChildren(); };
  const makeEl = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text !== "undefined") el.textContent = text;
    return el;
  };
  const makeIcon = (className) => {
    const icon = document.createElement("i");
    icon.className = className;
    return icon;
  };

  function appendTextWithBreaks(node, text) {
    if (!node) return;
    const parts = String(text || "").split(/\n/);
    parts.forEach((part, idx) => {
      node.appendChild(document.createTextNode(part));
      if (idx < parts.length - 1) node.appendChild(document.createElement("br"));
    });
  }

  function setButtonIconText(btn, iconClass, label) {
    if (!btn) return;
    btn.replaceChildren();
    const icon = makeIcon(iconClass);
    icon.setAttribute("aria-hidden", "true");
    btn.append(icon, document.createTextNode(` ${label}`));
  }

  function setText(id, text) {
    const n = getById(id);
    if (n) n.textContent = String(text ?? "");
  }

  function clamp(n, min, max) {
    const x = Number(n);
    if (Number.isNaN(x)) return min;
    return Math.min(max, Math.max(min, x));
  }

  function totalXpForLevel(level) {
    const lvl = Math.max(1, Number(level) || 1);
    return BASE_XP * (lvl - 1) * lvl / 2;
  }

  function levelFromXP(totalXP) {
    const xp = Math.max(0, Number(totalXP) || 0);
    const t = xp / BASE_XP;
    const lvl = Math.floor((1 + Math.sqrt(1 + 8 * t)) / 2);
    return Math.max(1, lvl);
  }

  function xpForNextLevel(level) {
    const lvl = Math.max(1, Number(level) || 1);
    return BASE_XP * lvl;
  }

  function unlockLevelFromTier(tier) {
    const t = String(tier || "").toLowerCase();
    if (t.includes("advanced")) return 5;
    if (t.includes("intermediate")) return 3;
    return 1;
  }

  function computeXPFromTotal(totalXP) {
    // Convert total XP into level + progress within the current level.
    const level = levelFromXP(totalXP);
    const levelStart = totalXpForLevel(level);
    const currentLevelXP = Math.max(0, totalXP - levelStart);
    const xpNext = xpForNextLevel(level);
    const xpProgressPct = Math.max(0, Math.min(100, (currentLevelXP / Math.max(xpNext, 1)) * 100));
    const toNext = Math.max(0, xpNext - currentLevelXP);
    return { level, currentLevelXP, xpNext, xpProgressPct, toNext };
  }

  function rankForLevel(level) {
    if (Number(level) >= 5) return "Advanced";
    if (Number(level) >= 3) return "Intermediate";
    return "Novice";
  }

  function applyXpToUser(user, addXP) {
    const nextTotal = Math.max(0, Number(user?.xp || 0) + Number(addXP || 0));
    const progress = computeXPFromTotal(nextTotal);
    return {
      ...user,
      xp: nextTotal,
      numeric_level: progress.level,
      level: rankForLevel(progress.level),
      rank: rankForLevel(progress.level),
      xp_into_level: progress.currentLevelXP,
      next_level_xp: progress.xpNext
    };
  }

  function parseJsonSafe(str) {
    // Avoid crashing if localStorage contains invalid JSON.
    try { return JSON.parse(str); } catch { return null; }
  }

  function getQuizScore(email, courseId, lessonNumber) {
    if (!email || !courseId || !lessonNumber) return null;
    const key = `netology_quiz_attempt:${email}:${courseId}:${lessonNumber}`;
    const data = parseJsonSafe(localStorage.getItem(key));
    if (!data) return null;
    const correct = Number(data.correctCount);
    const total = Number(data.total);
    if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return null;
    return { correct, total };
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cssEscapeAttr(str) {
    // minimal escape for attribute selectors
    return String(str ?? "").replace(/"/g, '\\"');
  }

  function capitalize(s) {
    const t = String(s || "");
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
  }

  function showAria(text) {
    const aria = getById("ariaStatus");
    if (aria) aria.textContent = String(text || "");
  }

  async function fetchCourseMeta(courseId) {
    const base = API();
    if (!base || !courseId) return null;
    try {
      const res = await fetch(`${base}/course?id=${encodeURIComponent(courseId)}`);
      const data = await res.json();
      if (!data || !data.success) return null;
      return data;
    } catch {
      return null;
    }
  }

  function logProgressEvent(email, payload) {
    if (!email) return;
    const entry = {
      type: payload.type,
      course_id: payload.course_id,
      lesson_number: payload.lesson_number,
      xp: Number(payload.xp || 0),
      ts: Date.now(),
      date: new Date().toISOString().slice(0, 10)
    };
    const raw = localStorage.getItem(LOG_KEY(email));
    const list = parseJsonSafe(raw) || [];
    list.push(entry);
    localStorage.setItem(LOG_KEY(email), JSON.stringify(list));
  }

  function getProgressLog(email) {
    if (!email) return [];
    return parseJsonSafe(localStorage.getItem(LOG_KEY(email))) || [];
  }

  function computeStreak(log) {
    if (!Array.isArray(log) || !log.length) return 0;
    const days = new Set(log.map((e) => e?.date).filter(Boolean));
    let streak = 0;
    const d = new Date();
    for (; ;) {
      const key = d.toISOString().slice(0, 10);
      if (!days.has(key)) break;
      streak += 1;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function trackCourseStart(email, courseId, lessonNumber) {
    if (!email || !courseId) return;
    const raw = localStorage.getItem(STARTED_KEY(email));
    const list = parseJsonSafe(raw) || [];
    const existing = list.find((c) => String(c.id) === String(courseId));
    const payload = {
      id: String(courseId),
      lastViewed: Date.now(),
      lastLesson: Number(lessonNumber || 0) || undefined
    };

    if (existing) {
      existing.lastViewed = payload.lastViewed;
      if (payload.lastLesson) existing.lastLesson = payload.lastLesson;
    } else {
      list.push(payload);
    }
    localStorage.setItem(STARTED_KEY(email), JSON.stringify(list));
    startCourseBackend(email, courseId);
  }

  function getStartedLessonNumber(email, courseId) {
    if (!email || !courseId) return null;
    const list = parseJsonSafe(localStorage.getItem(STARTED_KEY(email))) || [];
    const entry = list.find((c) => String(c.id) === String(courseId));
    return entry ? Number(entry.lastLesson || 0) : null;
  }

  async function startCourseBackend(email, courseId) {
    if (!email || !courseId) return;
    try {
      await fetch(`${API()}/start-course`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, course_id: Number(courseId) })
      });
    } catch {
      // best effort
    }
  }

  function bumpUserXP(email, addXP) {
    if (!email || !addXP) return;
    const raw = localStorage.getItem("netology_user") || localStorage.getItem("user");
    const user = parseJsonSafe(raw) || {};
    if (!user || user.email !== email) return;
    const updated = applyXpToUser(user, addXP);
    if (localStorage.getItem("netology_user")) {
      localStorage.setItem("netology_user", JSON.stringify(updated));
    }
    if (localStorage.getItem("user")) {
      localStorage.setItem("user", JSON.stringify(updated));
    }
  }

  // Accept both keys (older + newer)
  function getCurrentUser() {
    return (
      parseJsonSafe(localStorage.getItem("netology_user")) ||
      parseJsonSafe(localStorage.getItem("user")) ||
      null
    );
  }

  function isLoggedIn(user) {
    return !!(user && (user.email || user.username));
  }

  /* AI Prompt: Explain the STATE section in clear, simple terms. */
  /* =========================================================
     STATE
  ========================================================= */

  const state = {
    user: null,
    courseId: null,
    courseContentId: null,

    // normalized course model
    course: {
      id: null,
      title: "",
      description: "",
      difficulty: "novice",  // novice/intermediate/advanced
      required_level: 1,
      estimatedTime: "—",
      totalXP: 0,
      total_lessons: 0,
      modules: [],           // [{ id, title, description, items:[...] }]
    },

    // completion sets
    completed: {
      lesson: new Set(),     // lesson_number
      quiz: new Set(),       // lesson_number
      challenge: new Set(),  // lesson_number
      tutorial: new Set(),   // lesson_number (sandbox tutorial)
    },

    expandedModules: new Set(),

    learnItemsFlat: [],
    activeLearnIndex: -1,
    activeLearn: null,

    stats: {
      level: 1,
      rank: "Novice",
      xp: 0,
      currentLevelXP: 0,
      xpProgressPct: 0,
      accessLevel: 1,
    },

    courseLocked: false,
    courseCompleted: false,
  };

  /* AI Prompt: Explain the BOOT section in clear, simple terms. */
  /* =========================================================
     BOOT
  ========================================================= */

  document.addEventListener("DOMContentLoaded", async () => {
    // user (can be null -> guest)
    const u = getCurrentUser();
    state.user = isLoggedIn(u) ? u : null;

    // Brand routing (dashboard if logged in else index)
    wireBrandRouting();

    // Chrome
    if (!state.user) wireChromeGuest();
    else wireChrome(state.user);

    // course id from URL (?id=) with fallbacks
    const params = new URLSearchParams(window.location.search);
    let courseId = params.get("id") || params.get("course_id") || params.get("course") || "1";
    const contentIdParam = params.get("content_id") || params.get("content");

    // Resolve by title if a non-numeric id was provided
    if (typeof window.COURSE_CONTENT !== "undefined") {
      const content = window.COURSE_CONTENT || {};
      if (!content[String(courseId)]) {
        const list = Object.values(content);
        const byId = list.find((c) => String(c?.id || "") === String(courseId));
        const target = String(courseId || "").trim().toLowerCase();
        const byTitle = target
          ? list.find((c) => String(c?.title || "").trim().toLowerCase() === target)
          : null;
        const resolved = byId || byTitle;
        if (resolved?.id) courseId = String(resolved.id);
      }
    }

    // Normalize URL to use ?id=
    if (params.get("id") !== courseId) {
      params.set("id", courseId);
      params.delete("course_id");
      params.delete("course");
      history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    }

    state.courseId = courseId || "1";
    state.courseContentId = contentIdParam ? String(contentIdParam) : null;
    state.course.id = state.courseId;

    const lessonParam = new URLSearchParams(window.location.search).get("lesson");
    if (state.user?.email) {
      trackCourseStart(state.user.email, state.courseId, lessonParam);
    }

    // load course meta (from DB) + structure (from COURSE_CONTENT)
    const apiMeta = await fetchCourseMeta(state.courseId);
    hydrateCourseFromContent(state.courseId, apiMeta, state.courseContentId);

    if (state.courseContentId && params.get("content_id") !== state.courseContentId) {
      params.set("content_id", state.courseContentId);
      history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    }

    // load user stats + completions (if logged in)
    if (state.user?.email) {
      await loadUserStats(state.user.email);
      await loadCompletions(state.user.email, state.courseId);
    } else {
      // Guest defaults
      state.stats.level = 1;
      state.stats.xp = 0;
      state.stats.currentLevelXP = 0;
      state.stats.xpProgressPct = 0;
      state.stats.xpNext = xpForNextLevel(1);
    }

    // lock logic
    computeLockState();
    refreshTutorialCompletions();

    // derived
    buildLearnFlatList();
    restoreLastModule();

    // render
    renderAll();
    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    // Seed toast flags so existing completions don't spam on first load
    seedCompletionToastFlags();

    // wire after render
    wireCourseActions();

    // if returning from quiz/sandbox completion, support toast via URL params
    maybeShowReturnToast();
  });

  async function refreshCourseState(options = {}) {
    const before = computeProgress();
    if (!state.courseId) return;
    if (state.user?.email) {
      await loadUserStats(state.user.email);
      await loadCompletions(state.user.email, state.courseId);
    }
    refreshTutorialCompletions();
    computeLockState();
    renderAll();
    const after = computeProgress();
    if (options.showToast && (after.pct !== before.pct || after.done !== before.done)) {
      showCourseProgressToast(after);
    }

    if (state.user?.email) {
      state.course.modules.forEach((m) => {
        if (computeModuleCompletion(m).completed) {
          const key = moduleToastKey(m);
          if (localStorage.getItem(key) !== "1") {
            showCompletionToast({
              title: "Module completed",
              message: m.title || "Module finished"
            });
            localStorage.setItem(key, "1");
          }
        }
      });

      if (after.pct === 100) {
        const key = courseToastKey();
        if (localStorage.getItem(key) !== "1") {
          showCompletionToast({
            title: "Course completed",
            message: state.course?.title || "Course finished",
            mini: false,
            duration: 20000
          });
          localStorage.setItem(key, "1");
        }
      }
    }
  }

  // Ensure back/forward navigation refreshes progress (bfcache-safe)
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      refreshCourseState({ showToast: true }).catch(() => { });
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshCourseState({ showToast: true }).catch(() => { });
    }
  });

  /* AI Prompt: Explain the CHROME (sidebar + dropdown)  (matches dashboard behaviour) section in clear, simple terms. */
  /* =========================================================
     CHROME (sidebar + dropdown)  (matches dashboard behaviour)
  ========================================================= */

  function wireBrandRouting() {
    const brand = getById("brandHome");
    const sideBrand = getById("sideBrandHome");
    const back = getById("backLink");

    const loggedIn = !!(state.user && state.user.email);
    const href = loggedIn ? "dashboard.html" : "index.html";

    if (brand) brand.setAttribute("href", href);
    if (sideBrand) sideBrand.setAttribute("href", href);
    if (back) back.setAttribute("href", href);
  }

  function wireChromeGuest() {
    // identity
    setText("topUserName", "Guest");
    setText("ddName", "Guest");
    setText("ddEmail", "Sign in to track progress");
    setText("topAvatar", "G");

    setText("sideAvatar", "G");
    setText("sideUserName", "Guest");
    setText("sideUserEmail", "Sign in to save progress");
    setText("sideLevelBadge", "Lv —");
    setText("sideXPText", "—");
    const bar = getById("sideXPBar");
    if (bar) bar.style.width = "0%";

    // hide logout buttons
    const topLogout = getById("topLogoutBtn");
    const sideLogout = getById("sideLogoutBtn");
    if (topLogout) topLogout.style.display = "none";
    if (sideLogout) sideLogout.style.display = "none";

    wireSidebar();
    wireUserDropdown();
  }

  function wireChrome(user) {
    wireSidebar();
    wireUserDropdown();
    fillIdentity(user);

    // logout
    const topLogout = getById("topLogoutBtn");
    const sideLogout = getById("sideLogoutBtn");
    if (topLogout) topLogout.addEventListener("click", logout);
    if (sideLogout) sideLogout.addEventListener("click", logout);
  }

  function wireSidebar() {
    const openBtn = getById("openSidebarBtn");
    const closeBtn = getById("closeSidebarBtn");
    const sidebar = getById("slideSidebar");
    const backdrop = getById("sideBackdrop");

    const open = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
      sidebar.setAttribute("aria-hidden", "false");
      backdrop.setAttribute("aria-hidden", "false");
    };

    const close = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
      sidebar.setAttribute("aria-hidden", "true");
      backdrop.setAttribute("aria-hidden", "true");
    };

    openBtn?.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    backdrop?.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        close();
        toggleDropdown(false);
      }
    });
  }

  function wireUserDropdown() {
    const userBtn = getById("userBtn");
    const dd = getById("userDropdown");
    if (!userBtn || !dd) return;

    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    dd.addEventListener("click", (e) => e.stopPropagation());

    document.addEventListener("click", (e) => {
      const t = e.target;
      if (dd.contains(t) || userBtn.contains(t)) return;
      toggleDropdown(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") toggleDropdown(false);
    });
  }

  function toggleDropdown(force) {
    const dd = getById("userDropdown");
    const userBtn = getById("userBtn");
    if (!dd) return;

    const open = typeof force === "boolean" ? force : !dd.classList.contains("is-open");
    dd.classList.toggle("is-open", open);
    if (userBtn) userBtn.setAttribute("aria-expanded", String(open));
  }

  function fillIdentity(user) {
    const fullName =
      user?.name ||
      `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
      user?.username ||
      "Student";

    const initial = (fullName || "S").trim().charAt(0).toUpperCase();

    setText("topAvatar", initial);
    setText("topUserName", fullName);
    setText("ddName", fullName);
    setText("ddEmail", user?.email || "");

    setText("sideAvatar", initial);
    setText("sideUserName", fullName);
    setText("sideUserEmail", user?.email || "");
  }

  function logout() {
    localStorage.removeItem("netology_user");
    localStorage.removeItem("netology_token");
    localStorage.removeItem("user"); // backwards-compat
    window.location.href = "index.html";
  }

  /* AI Prompt: Explain the LOADERS (user stats + completions) section in clear, simple terms. */
  /* =========================================================
     LOADERS (user stats + completions)
  ========================================================= */

  async function loadUserStats(email) {
    try {
      // If no API base, just fallback
      if (!API()) throw new Error("no api");

      const res = await fetch(ENDPOINTS.userInfo(email));
      const data = await res.json().catch(() => null);
      if (!data || data.success === false) throw new Error("user-info failed");

      const serverXP = Number(data.xp ?? data.total_xp);
      const xp = Number.isFinite(serverXP) ? serverXP : Number(state.user?.xp || 0);
      const serverLevel = Number(data.numeric_level);
      const xpInto = Number(data.xp_into_level);
      const nextXp = Number(data.next_level_xp);
      const { level, currentLevelXP, xpNext, xpProgressPct } = computeXPFromTotal(xp);
      const rank = String(data.rank || data.level_name || data.level || "Novice");
      const unlockTier = String(data.start_level || state.user?.unlock_tier || "novice").toLowerCase();

      state.stats.level = level;
      state.stats.xp = xp;
      state.stats.rank = rank;
      state.stats.accessLevel = Math.max(level, unlockLevelFromTier(unlockTier));

      state.stats.currentLevelXP = Number.isFinite(xpInto) ? xpInto : currentLevelXP;
      state.stats.xpProgressPct = Number.isFinite(xpInto) && Number.isFinite(nextXp) && nextXp > 0
        ? clamp((xpInto / nextXp) * 100, 0, 100)
        : xpProgressPct;
      state.stats.xpNext = Number.isFinite(nextXp) && nextXp > 0 ? nextXp : xpNext;

      if (state.user) {
        state.user.unlock_tier = ["novice", "intermediate", "advanced"].includes(unlockTier) ? unlockTier : "novice";
        state.user.xp = xp;
        if (Number.isFinite(serverLevel) && serverLevel > 0) state.user.numeric_level = serverLevel;
        if (Number.isFinite(xpInto)) state.user.xp_into_level = xpInto;
        if (Number.isFinite(nextXp) && nextXp > 0) state.user.next_level_xp = nextXp;
        if (data.rank || data.level) {
          state.user.rank = data.rank || data.level;
          state.user.level = data.level || data.rank;
        }
        localStorage.setItem("user", JSON.stringify(state.user));
        localStorage.setItem("netology_user", JSON.stringify(state.user));
      }

      // Sidebar stats
      setText("sideLevelBadge", `Lv ${level}`);
      setText("sideXPText", `${currentLevelXP}/${xpNext}`);
      const sideXPBar = getById("sideXPBar");
      if (sideXPBar) sideXPBar.style.width = `${clamp(xpProgressPct, 0, 100)}%`;

    } catch (_) {
      // Safe fallback; do not break UI
      const localXP = Number(state.user?.xp || 0) || 0;
      const fallback = computeXPFromTotal(localXP);
      state.stats.level = fallback.level;
      state.stats.rank = "Novice";
      state.stats.xp = localXP;
      state.stats.currentLevelXP = fallback.currentLevelXP;
      state.stats.xpProgressPct = fallback.xpProgressPct;
      state.stats.xpNext = fallback.xpNext;
      state.stats.accessLevel = Math.max(state.stats.level, unlockLevelFromTier(state.user?.unlock_tier));

      setText("sideLevelBadge", `Lv ${state.stats.level}`);
      setText("sideXPText", `${state.stats.currentLevelXP}/${state.stats.xpNext}`);
      const sideXPBar = getById("sideXPBar");
      if (sideXPBar) sideXPBar.style.width = `${clamp(state.stats.xpProgressPct, 0, 100)}%`;
    }
  }

  async function loadCompletions(email, courseId) {
    // 1) Try backend (source of truth if available).
    try {
      if (API()) {
        const res = await fetch(ENDPOINTS.getCompletions(email, courseId));
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.success !== false) {
            if (data.completions) {
              applyCompletionsPayload(data.completions);
              mergeLocalCompletions(email, courseId);
              cacheCompletionsToLS(email, courseId);
              refreshTutorialCompletions();
              return;
            }
            if (data.lessons || data.quizzes || data.challenges) {
              applyCompletionsPayload({
                lessons: data.lessons || [],
                quizzes: data.quizzes || [],
                challenges: data.challenges || []
              });
              mergeLocalCompletions(email, courseId);
              cacheCompletionsToLS(email, courseId);
              refreshTutorialCompletions();
              return;
            }
          }
        }
      }
    } catch (_) {
      // ignore
    }

    // 2) Fallback to localStorage for offline mode.
    const cached = parseJsonSafe(localStorage.getItem(LS_KEY(email, courseId)));
    if (cached) applyCompletionsPayload(cached);
    mergeLocalCompletions(email, courseId);
    refreshTutorialCompletions();
  }

  function applyCompletionsPayload(payload) {
    const lessonArr = payload.lesson || payload.lessons || payload.learn || [];
    const quizArr = payload.quiz || payload.quizzes || [];
    const chArr = payload.challenge || payload.challenges || [];

    state.completed.lesson = new Set((lessonArr || []).map(Number));
    state.completed.quiz = new Set((quizArr || []).map(Number));
    state.completed.challenge = new Set((chArr || []).map(Number));
  }

  function cacheCompletionsToLS(email, courseId) {
    const payload = {
      lesson: Array.from(state.completed.lesson),
      quiz: Array.from(state.completed.quiz),
      challenge: Array.from(state.completed.challenge),
    };
    localStorage.setItem(LS_KEY(email, courseId), JSON.stringify(payload));
  }

  function mergeLocalCompletions(email, courseId) {
    const local = parseJsonSafe(localStorage.getItem(LS_KEY(email, courseId))) || {};
    const lessonArr = local.lesson || local.lessons || local.learn || [];
    const quizArr = local.quiz || local.quizzes || [];
    const chArr = local.challenge || local.challenges || [];

    lessonArr.forEach((n) => state.completed.lesson.add(Number(n)));
    quizArr.forEach((n) => state.completed.quiz.add(Number(n)));
    chArr.forEach((n) => state.completed.challenge.add(Number(n)));
  }

  /* AI Prompt: Explain the COURSE CONTENT NORMALIZATION section in clear, simple terms. */
  /* =========================================================
     COURSE CONTENT NORMALIZATION
  ========================================================= */

  function difficultyRequiredLevel(diff) {
    if (diff === "novice") return 1;
    if (diff === "intermediate") return 3;
    if (diff === "advanced") return 5;
    return 1;
  }

  function hydrateCourseFromContent(courseId, apiMeta, contentId) {
    const contentKey = contentId ? String(contentId) : String(courseId);
    let raw = (typeof window.COURSE_CONTENT !== "undefined")
      ? window.COURSE_CONTENT[contentKey]
      : null;

    if (!raw && apiMeta?.title && typeof window.COURSE_CONTENT !== "undefined") {
      const target = String(apiMeta.title || "").trim().toLowerCase();
      const list = Object.values(window.COURSE_CONTENT || {});
      raw = list.find((c) => String(c?.title || "").trim().toLowerCase() === target) || null;
    }

    if (!apiMeta) {
      state.course = {
        id: courseId,
        title: "Course unavailable",
        description: "We couldn’t load this course from the database. Please try again.",
        difficulty: "novice",
        required_level: 1,
        estimatedTime: "—",
        totalXP: 0,
        total_lessons: 0,
        modules: [],
      };
      return;
    }

    const applyApiMeta = (meta) => {
      if (!meta) return;
      if (meta.title) state.course.title = meta.title;
      if (meta.description) state.course.description = meta.description;
      if (meta.difficulty) state.course.difficulty = String(meta.difficulty).toLowerCase();
      if (meta.estimated_time || meta.estimatedTime) {
        state.course.estimatedTime = meta.estimated_time || meta.estimatedTime;
      }
      state.course.required_level = Number(meta.required_level || state.course.required_level || 0)
        || difficultyRequiredLevel(state.course.difficulty);
      if (typeof meta.total_lessons !== "undefined") {
        state.course.total_lessons = Number(meta.total_lessons || 0);
      }
      const apiXP = Number(meta.xp_reward ?? meta.totalXP ?? meta.xpReward);
      if (!Number.isNaN(apiXP) && apiXP > 0) state.course.totalXP = apiXP;
    };

    if (!raw) {
      state.course = {
        id: courseId,
        title: apiMeta?.title || "Course",
        description: apiMeta?.description || "No content found for this course yet.",
        difficulty: String(apiMeta?.difficulty || "novice").toLowerCase(),
        required_level: Number(apiMeta?.required_level || difficultyRequiredLevel(String(apiMeta?.difficulty || "novice").toLowerCase())) || 1,
        estimatedTime: "—",
        totalXP: Number(apiMeta?.xp_reward || 0),
        total_lessons: Number(apiMeta?.total_lessons || 0),
        modules: [],
      };
      return;
    }

    state.courseContentId = String(raw.id || contentKey || courseId);

    state.course.title = raw.title || raw.name || "Course";
    state.course.description = raw.description || raw.about || "No description yet.";
    state.course.difficulty = String(raw.difficulty || "novice").toLowerCase();
    state.course.required_level = Number(raw.required_level || difficultyRequiredLevel(state.course.difficulty)) || 1;
    state.course.estimatedTime = raw.estimatedTime || raw.estimated_time || "—";

    const units = raw.units || raw.modules || [];
    const modules = [];

    let lessonCounter = 1;
    let totalXP = 0;

    units.forEach((u, i) => {
      const moduleId = u.id || `module-${i + 1}`;
      const module = {
        id: moduleId,
        index: i,
        title: u.title || `Module ${i + 1}`,
        description: u.about || u.description || "",
        items: [],
      };

      const normalized = normalizeUnitItems(u, lessonCounter);
      module.items = normalized.items;
      lessonCounter = normalized.nextLessonCounter;

      module.items.forEach((it) => { totalXP += Number(it.xp || 0); });

      modules.push(module);
    });

    state.course.modules = modules;
    state.course.totalXP = totalXP;
    state.course.total_lessons = Number(state.course.total_lessons || 0) || modules.length;

    // DB meta wins for title/desc/difficulty/xp if provided
    applyApiMeta(apiMeta);
  }

  function normalizeUnitItems(unit, startingLessonNumber) {
    // Accept multiple content shapes (sections array, sections object, or lessons array).
    const items = [];
    let lessonCounter = startingLessonNumber;

    const pushItem = (type, data) => {
      items.push({
        type, // learn|quiz|sandbox|challenge
        title: data.title || data.name || capitalize(type),
        content: data.content || data.learn || data.text || "",
        duration: data.duration || data.time || "—",
        xp: Number(data.xp || data.xpReward || data.xp_reward || 0),
        lesson_number: Number(data.lesson_number || data.lessonNumber || 0),
        unit_title: unit.title || "",
        unit_about: unit.about || "",
        challenge: data.challenge || data.rules || null,
        steps: data.steps || [],
        tips: data.tips || "",
        assigned: false,
      });
    };

    // Shape A: array sections
    if (Array.isArray(unit.sections)) {
      unit.sections.forEach((sec) => {
        const t = String(sec.type || sec.kind || sec.title || "").toLowerCase();
        const secItems = sec.items || sec.lessons || [];
        if (!Array.isArray(secItems)) return;

        secItems.forEach((li) => {
          const type = mapSectionTypeToItemType(t, li);
          pushItem(type, li);
        });
      });
    }

    // Shape B: object sections
    if (!items.length && unit.sections && typeof unit.sections === "object" && !Array.isArray(unit.sections)) {
      const obj = unit.sections;
      (obj.learn || obj.lesson || obj.lessons || []).forEach((li) => pushItem("learn", li));
      (obj.quiz || obj.quizzes || []).forEach((li) => pushItem("quiz", li));
      (obj.practice || obj.sandbox || []).forEach((li) => pushItem("sandbox", li));
      (obj.challenge || obj.challenges || []).forEach((li) => pushItem("challenge", li));
    }

    // Shape C: unit.lessons
    if (!items.length && Array.isArray(unit.lessons)) {
      unit.lessons.forEach((li) => {
        const t = String(li.type || "learn").toLowerCase();
        pushItem(
          t === "quiz" ? "quiz" :
            t === "sandbox" || t === "practice" ? "sandbox" :
              t === "challenge" ? "challenge" :
                "learn",
          li
        );
      });
    }

    // Assign lesson_number if missing:
    // - learn items increment the lesson counter
    // - quiz/practice/challenge attach to the most recent learn item
    let lastLearn = lessonCounter - 1;

    items.forEach((it) => {
      if (it.type === "learn") {
        if (!it.lesson_number) {
          it.lesson_number = lessonCounter++;
          it.assigned = true;
        } else {
          lessonCounter = Math.max(lessonCounter, it.lesson_number + 1);
        }
        lastLearn = it.lesson_number;
      } else {
        if (!it.lesson_number) {
          it.lesson_number = Math.max(1, lastLearn || 1);
          it.assigned = true;
        }
      }

      // Defaults
      if (!it.xp) {
        it.xp =
          it.type === "quiz" ? 60 :
            it.type === "challenge" ? 80 :
              it.type === "sandbox" ? 30 :
                40;
      }
      if (!it.duration || it.duration === "—") {
        it.duration =
          it.type === "quiz" ? "5–10 min" :
            it.type === "challenge" ? "10–15 min" :
              it.type === "sandbox" ? "10 min" :
                "8–12 min";
      }
    });

    // Sort in learning flow, grouped by lesson_number
    items.sort((a, b) => {
      if (a.lesson_number !== b.lesson_number) return a.lesson_number - b.lesson_number;
      const order = { learn: 1, quiz: 2, sandbox: 3, challenge: 4 };
      return (order[a.type] || 9) - (order[b.type] || 9);
    });

    return { items, nextLessonCounter: lessonCounter };
  }

  function mapSectionTypeToItemType(sectionType, item) {
    const t = String(item.type || "").toLowerCase();
    if (t === "quiz") return "quiz";
    if (t === "challenge") return "challenge";
    if (t === "sandbox" || t === "practice") return "sandbox";
    if (t === "learn") return "learn";

    if (sectionType.includes("quiz")) return "quiz";
    if (sectionType.includes("challenge")) return "challenge";
    if (sectionType.includes("practice") || sectionType.includes("sandbox") || sectionType.includes("hands-on")) return "sandbox";
    return "learn";
  }

  /* AI Prompt: Explain the LOCK / COMPLETION / PROGRESS section in clear, simple terms. */
  /* =========================================================
     LOCK / COMPLETION / PROGRESS
  ========================================================= */

  function computeLockState() {
    const userLevel = state.user ? Number(state.stats.accessLevel || state.stats.level || 1) : 0;
    state.courseLocked = userLevel < Number(state.course.required_level || 1);
  }

  function getRequiredItems() {
    const required = [];
    state.course.modules.forEach((m) => {
      m.items.forEach((it) => {
        if (it.type === "learn" || it.type === "quiz" || it.type === "challenge" || it.type === "sandbox") {
          required.push(it);
        }
      });
    });
    return required;
  }

  function tutorialProgressKey(email, courseId, lessonNumber) {
    if (!courseId || !lessonNumber) return null;
    const who = email || "guest";
    return `netology_tutorial_progress:${who}:${courseId}:${lessonNumber}`;
  }

  function isTutorialCompleted(it) {
    const lessonNum = Number(it.lesson_number || 0);
    if (!lessonNum) return false;
    const steps = Array.isArray(it.steps) ? it.steps : [];
    if (!steps.length) return false;
    const key = tutorialProgressKey(state.user?.email, state.courseId, lessonNum);
    if (!key) return false;
    const stored = parseJsonSafe(localStorage.getItem(key), null) || {};
    const checked = Array.isArray(stored.checked) ? stored.checked : [];
    for (let i = 0; i < steps.length; i += 1) {
      if (!checked[i]) return false;
    }
    return true;
  }

  function refreshTutorialCompletions() {
    state.completed.tutorial = new Set();
    state.course.modules.forEach((m) => {
      m.items.forEach((it) => {
        if (it.type !== "sandbox") return;
        const lessonNum = Number(it.lesson_number || 0);
        if (!lessonNum) return;
        if (isTutorialCompleted(it)) state.completed.tutorial.add(lessonNum);
      });
    });
  }

  function isItemCompleted(it) {
    const n = Number(it.lesson_number || 0);
    if (!n) return false;

    if (it.type === "learn") return state.completed.lesson.has(n);
    if (it.type === "quiz") return state.completed.quiz.has(n);
    if (it.type === "challenge") return state.completed.challenge.has(n);
    if (it.type === "sandbox" || it.type === "practice") return state.completed.tutorial.has(n);
    return false;
  }

  function computeProgress() {
    const required = getRequiredItems();
    const total = required.length || 1;
    const done = required.filter(isItemCompleted).length;
    const pct = Math.round((done / total) * 100);

    state.courseCompleted = (required.length > 0 && done === required.length);
    return { done, total: required.length, pct };
  }

  function computeModuleCompletion(module) {
    const required = module.items.filter((it) =>
      it.type === "learn" || it.type === "quiz" || it.type === "challenge" || it.type === "sandbox"
    );
    const done = required.filter(isItemCompleted).length;
    const total = required.length || 0;
    return { done, total, completed: total > 0 && done === total };
  }

  function getModuleTutorialStatus(module) {
    const tutorials = module.items.filter((it) => it.type === "sandbox");
    const total = tutorials.length;
    const done = tutorials.filter(isItemCompleted).length;
    return { total, done, completed: total > 0 && done === total };
  }

  function findModuleForLesson(lessonNumber) {
    const target = Number(lessonNumber || 0);
    if (!target) return null;
    for (const mod of state.course.modules) {
      if (mod.items.some((it) => Number(it.lesson_number) === target)) return mod;
    }
    return null;
  }

  function moduleToastKey(module) {
    const email = state.user?.email || "guest";
    return `netology_module_done:${email}:${state.courseId}:${module.id}`;
  }

  function courseToastKey() {
    const email = state.user?.email || "guest";
    return `netology_course_done:${email}:${state.courseId}`;
  }

  function lastModuleKey() {
    const email = state.user?.email || "guest";
    return `netology_course_last_module:${email}:${state.courseId}`;
  }

  function restoreLastModule() {
    const last = localStorage.getItem(lastModuleKey());
    if (last) {
      state.expandedModules.clear();
      state.expandedModules.add(last);
    }
  }

  function persistLastModule(id) {
    if (!id) return;
    localStorage.setItem(lastModuleKey(), id);
  }

  function showCompletionToast({ title, message, mini = true, duration = 4200 }) {
    if (typeof window.showCelebrateToast !== "function") return;
    window.showCelebrateToast({
      title,
      message,
      sub: "Great work staying consistent.",
      mini,
      confetti: !mini,
      duration
    });
  }

  function seedCompletionToastFlags() {
    if (!state.user?.email) return;
    state.course.modules.forEach((m) => {
      if (computeModuleCompletion(m).completed) {
        localStorage.setItem(moduleToastKey(m), "1");
      }
    });
    if (computeProgress().pct === 100) {
      localStorage.setItem(courseToastKey(), "1");
    }
  }

  function buildLearnFlatList() {
    const list = [];
    state.course.modules.forEach((m) => m.items.forEach((it) => { if (it.type === "learn") list.push(it); }));
    state.learnItemsFlat = list;

    const idx = list.findIndex((it) => !isItemCompleted(it));
    state.activeLearnIndex = idx >= 0 ? idx : (list.length ? 0 : -1);
    state.activeLearn = state.activeLearnIndex >= 0 ? list[state.activeLearnIndex] : null;
  }

  /* AI Prompt: Explain the RENDER section in clear, simple terms. */
  /* =========================================================
     RENDER
  ========================================================= */

  function renderAll() {
    renderHero();
    renderModules();
    renderSidebarCards();
  }

  function renderHero() {
    setText("courseTitle", state.course.title);
    setText("courseDescription", state.course.description);
    setText("breadcrumbCourse", state.course.title || "Course");

    const moduleCount = state.course.modules.length || state.course.total_lessons || 0;
    setText("metaModules", `${moduleCount} lessons`);
    setText("metaTime", state.course.estimatedTime || "—");
    setText("metaXP", `${state.course.totalXP} XP Total`);

    const streakBadge = getById("courseStreakBadge");
    if (streakBadge) {
      const streak = computeStreak(getProgressLog(state.user?.email || ""));
      streakBadge.replaceChildren(
        makeIcon("bi bi-fire"),
        document.createTextNode(` Streak: ${streak} day${streak === 1 ? "" : "s"}`)
      );
    }

    const xpHint = getById("courseXpHint");
    if (xpHint) {
      const toNext = Math.max(0, Number(state.stats.xpNext || 0));
      xpHint.replaceChildren(
        makeIcon("bi bi-lightning-charge-fill"),
        document.createTextNode(` ${toNext} XP to next level`)
      );
    }

    // difficulty pill class
    const pill = getById("difficultyPill");
    if (pill) {
      pill.textContent = capitalize(state.course.difficulty);
      pill.classList.remove("net-diff-novice", "net-diff-intermediate", "net-diff-advanced");
      pill.classList.add(`net-diff-${state.course.difficulty}`);
    }

    // locked?
    const lockedPill = getById("courseLockedPill");
    const lockedExplainer = getById("lockedExplainer");
    const lockedText = getById("lockedText");

    if (state.courseLocked) {
      lockedPill?.classList.remove("d-none");
      lockedExplainer?.classList.remove("d-none");
      if (lockedText) lockedText.textContent = `Locked — requires Level ${state.course.required_level}.`;

      // disable primary actions
      const continueBtn = getById("continueBtn");
      continueBtn && (continueBtn.disabled = true);
    } else {
      lockedPill?.classList.add("d-none");
      lockedExplainer?.classList.add("d-none");

      const continueBtn = getById("continueBtn");
      continueBtn && (continueBtn.disabled = false);
    }

    // completed?
    const completedPill = getById("courseCompletedPill");
    const activePill = getById("courseActivePill");
    const reviewBtn = getById("reviewBtn");
    const continueBtn = getById("continueBtn");

    if (state.courseCompleted) {
      completedPill?.classList.remove("d-none");
      activePill?.classList.add("d-none");
      reviewBtn?.classList.remove("d-none");
      if (continueBtn) continueBtn.textContent = "Review";
    } else {
      completedPill?.classList.add("d-none");
      reviewBtn?.classList.add("d-none");
      if (activePill) {
        const prog = computeProgress();
        activePill.classList.toggle("d-none", !(prog.done > 0));
      }
      if (continueBtn) {
        const prog = computeProgress();
        const label = prog.done > 0 ? "Resume" : "Start";
        setButtonIconText(continueBtn, "bi bi-chevron-right ms-1", label);
      }
    }

    // progress ring + bar
    const prog = computeProgress();

    setText("progressPct", `${prog.pct}%`);
    setText("progressText", `${prog.pct}%`);
    setText("progressCount", `${prog.done}/${prog.total}`);

    const ring = getById("progressRing");
    if (ring) {
      const CIRC = 2 * Math.PI * 58; // r=58 (matches HTML)
      const offset = CIRC * (1 - prog.pct / 100);
      ring.style.strokeDasharray = `${CIRC.toFixed(2)}`;
      ring.style.strokeDashoffset = `${offset.toFixed(2)}`;
    }

    const bar = getById("progressBar");
    if (bar) bar.style.width = `${clamp(prog.pct, 0, 100)}%`;

    // preview drawer ring
    const previewRing = getById("previewRing");
    const previewPct = getById("previewRingPct");
    if (previewPct) previewPct.textContent = `${prog.pct}%`;
    if (previewRing) {
      const CIRC = 2 * Math.PI * 26; // r=26 (matches HTML)
      const offset = CIRC * (1 - prog.pct / 100);
      previewRing.style.strokeDasharray = `${CIRC.toFixed(2)}`;
      previewRing.style.strokeDashoffset = `${offset.toFixed(2)}`;
    }

    // sandbox buttons carry course context
    const contentId = state.courseContentId || state.courseId;
    const q = `course_id=${encodeURIComponent(state.courseId)}&content_id=${encodeURIComponent(contentId)}`;
    const topSandbox = getById("topSandboxLink");
    const sidebarSandboxBtn = getById("sidebarSandboxBtn");

    if (topSandbox) {
      topSandbox.setAttribute("href", `sandbox.html?${q}`);
      topSandbox.setAttribute("title", "Open the sandbox to build and test a network simulation");
    }
    if (sidebarSandboxBtn) {
      sidebarSandboxBtn.setAttribute("title", "Open the sandbox to build and test a network simulation");
      sidebarSandboxBtn.onclick = () => { window.location.href = `sandbox.html?${q}`; };
    }
  }

  function renderModules() {
    const wrap = getById("modulesWrap");
    const empty = getById("modulesEmpty");
    if (!wrap) return;

    if (!state.course.modules.length) {
      clearChildren(wrap);
      empty?.classList.remove("d-none");
      return;
    }
    empty?.classList.add("d-none");

    clearChildren(wrap);

    state.course.modules.forEach((m, idx) => {
      const modProg = computeModuleCompletion(m);
      const expanded = state.expandedModules.has(m.id);

      const article = document.createElement("article");
      article.className = "net-course-card net-module-card";
      article.dataset.moduleId = String(m.id);

      const shell = document.createElement("div");
      shell.className = "p-0";

      const headerBtn = document.createElement("button");
      headerBtn.className = "net-module-btn p-4 d-flex align-items-start justify-content-between gap-3";
      headerBtn.type = "button";
      headerBtn.dataset.action = "toggle-module";
      headerBtn.dataset.module = String(m.id);
      headerBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
      headerBtn.title = "Open this module to view its lessons and activities";

      const left = document.createElement("div");
      left.className = "d-flex align-items-start gap-3";

      const iconWrap = makeEl("div", "net-module-ico");
      iconWrap.appendChild(moduleIcon(modProg, state.courseLocked));

      const info = document.createElement("div");
      info.className = "flex-grow-1";

      const infoRow = document.createElement("div");
      infoRow.className = "d-flex flex-wrap align-items-center gap-2 mb-1";

      const modLabel = makeEl("span", "small text-teal fw-semibold text-uppercase", `Module ${idx + 1}`);
      modLabel.style.letterSpacing = ".04em";
      infoRow.appendChild(modLabel);

      const tutorialStatus = getModuleTutorialStatus(m);

      const headerBadge = document.createElement("span");
      if (modProg.completed) {
        headerBadge.className = "net-status-chip net-status-chip--completed";
        headerBadge.append(makeIcon("bi bi-check2-circle"), document.createTextNode(" Completed"));
      } else if (modProg.done > 0) {
        headerBadge.className = "net-status-chip net-status-chip--progress";
        headerBadge.append(makeIcon("bi bi-arrow-repeat"), document.createTextNode(" In progress"));
      } else {
        headerBadge.className = "net-status-chip net-status-chip--active";
        headerBadge.append(makeIcon("bi bi-grid-1x2"), document.createTextNode(` ${modProg.done}/${modProg.total} items`));
      }
      infoRow.appendChild(headerBadge);
      if (tutorialStatus.completed) {
        const tutorialBadge = document.createElement("span");
        tutorialBadge.className = "net-status-chip net-status-chip--completed net-status-chip--mini";
        tutorialBadge.append(makeIcon("bi bi-diagram-3"), document.createTextNode(" Tutorial completed"));
        infoRow.appendChild(tutorialBadge);
      }

      const title = makeEl("div", "fw-semibold fs-5", m.title || "");
      info.append(infoRow, title);

      if (m.description) {
        info.appendChild(makeEl("div", "text-muted small mt-1", m.description));
      }

      left.append(iconWrap, info);

      const right = document.createElement("div");
      right.className = "d-flex align-items-center gap-3";

      const counts = document.createElement("div");
      counts.className = "text-end small text-muted d-none d-sm-block";
      counts.append(
        makeEl("div", "fw-semibold text-dark", `${modProg.done}/${modProg.total}`),
        makeEl("div", "", "required")
      );
      right.appendChild(counts);

      const chev = makeIcon(`bi ${expanded ? "bi-chevron-up" : "bi-chevron-down"} text-muted`);
      chev.setAttribute("aria-hidden", "true");
      right.appendChild(chev);

      headerBtn.append(left, right);

      const body = document.createElement("div");
      body.className = "border-top";
      body.dataset.moduleBody = String(m.id);
      if (!expanded) body.style.display = "none";

      const bodyInner = makeEl("div", "p-2 p-sm-3 net-module-body-bg");
      bodyInner.appendChild(renderModuleItems(m));
      body.appendChild(bodyInner);

      shell.append(headerBtn, body);
      article.appendChild(shell);
      wrap.appendChild(article);
    });
  }

  function renderModuleItems(module) {
    // group by lesson_number
    const groups = new Map();
    module.items.forEach((it) => {
      const k = Number(it.lesson_number || 0) || 0;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(it);
    });

    const keys = Array.from(groups.keys()).sort((a, b) => a - b);
    const grid = makeEl("div", "d-grid gap-2");

    keys.forEach((lessonNum) => {
      const items = groups.get(lessonNum) || [];
      items.forEach((it) => {
        const completed = isItemCompleted(it);
        const locked = state.courseLocked;

        const hint =
          it.type === "quiz" ? "Quiz" :
            it.type === "challenge" ? "Sandbox challenge" :
              (it.type === "sandbox" || it.type === "practice") ? "Sandbox tutorial" :
                "Lesson";

        const row = document.createElement("button");
        row.className = `net-lesson-row px-3 py-3 rounded-3 border d-flex align-items-center justify-content-between gap-3 ${locked ? "is-locked" : ""} ${completed ? "is-complete" : ""}`.trim();
        row.type = "button";
        row.dataset.action = "open-item";
        row.dataset.type = it.type;
        row.dataset.lesson = String(Number(it.lesson_number));
        row.dataset.title = String(it.title || "");
        if (locked) {
          row.disabled = true;
          row.setAttribute("aria-disabled", "true");
        }

        const left = makeEl("div", "d-flex align-items-center gap-3");
        const iconWrap = makeEl("div", "net-lesson-ico");
        iconWrap.appendChild(lessonIcon(it, completed, locked));

        const textWrap = document.createElement("div");
        const title = makeEl("div", "fw-semibold text-dark", it.title || "");

        const meta = makeEl("div", "small text-muted d-flex flex-wrap gap-2 align-items-center mt-1");
        const time = makeEl("span", "d-inline-flex align-items-center gap-1");
        time.append(makeIcon("bi bi-clock"), document.createTextNode(` ${it.duration || "—"}`));

        const sep1 = makeEl("span", "text-muted", "•");

        const xp = makeEl("span", "d-inline-flex align-items-center gap-1 net-xp-accent fw-semibold");
        xp.append(makeIcon("bi bi-lightning-charge-fill"), document.createTextNode(` ${Number(it.xp)} XP`));

        const sep2 = makeEl("span", "text-muted", "•");
        const hintBadge = makeEl("span", "badge text-bg-light border", hint);

        meta.append(time, sep1, xp, sep2, hintBadge);

        if (it.type === "quiz" && state.user?.email) {
          const score = getQuizScore(state.user.email, state.courseId, it.lesson_number);
          if (score) {
            const sep3 = makeEl("span", "text-muted", "•");
            const scoreBadge = makeEl("span", "badge text-bg-light border net-quiz-score");
            scoreBadge.append(
              makeIcon("bi bi-clipboard-check me-1"),
              document.createTextNode(`Score ${score.correct}/${score.total}`)
            );
            meta.append(sep3, scoreBadge);
          }
        }
        textWrap.append(title, meta);
        left.append(iconWrap, textWrap);

        const right = makeEl("div", "d-flex align-items-center gap-2");

        if (it.type === "learn") {
          const preview = makeEl("span", "net-preview-btn");
          preview.setAttribute("role", "button");
          preview.setAttribute("tabindex", "0");
          preview.dataset.action = "preview-lesson";
          preview.dataset.lesson = String(Number(it.lesson_number));
          preview.title = "Quick preview";
          preview.appendChild(makeIcon("bi bi-eye"));
          right.appendChild(preview);
        }

        if (completed) {
          const done = makeEl("span", "badge bg-success");
          done.append(makeIcon("bi bi-check2-circle me-1"), document.createTextNode("Done"));
          right.appendChild(done);
        } else {
          const play = makeIcon("bi bi-play-fill text-teal");
          play.setAttribute("aria-hidden", "true");
          right.appendChild(play);
        }

        row.append(left, right);
        grid.appendChild(row);
      });
    });

    return grid;
  }

  function renderSidebarCards() {
    const prog = computeProgress();
    setText("sidePct", `${prog.pct}%`);

    let modulesDone = 0;
    state.course.modules.forEach((m) => { if (computeModuleCompletion(m).completed) modulesDone++; });
    const totalModules = state.course.modules.length || state.course.total_lessons || 0;
    setText("sideModules", `${modulesDone}/${totalModules}`);

    let xpEarned = 0;
    getRequiredItems().forEach((it) => { if (isItemCompleted(it)) xpEarned += Number(it.xp || 0); });
    setText("sideXPEarned", xpEarned);

    const next = getRequiredItems().find((it) => !isItemCompleted(it));
    const nextStepEl = getById("nextStepText");
    if (nextStepEl) {
      if (next) {
        nextStepEl.textContent = `${capitalize(next.type)}: ${next.title}`;
      } else {
        clearChildren(nextStepEl);
        const icon = makeIcon("bi bi-check2-circle me-1");
        icon.setAttribute("aria-hidden", "true");
        nextStepEl.append(icon, document.createTextNode("All done"));
      }
    }

    const nextBtn = getById("nextStepBtn");
    const jumpBtn = getById("jumpToFirstIncompleteBtn");

    if (nextBtn) nextBtn.disabled = !next || state.courseLocked;
    if (jumpBtn) jumpBtn.disabled = !next || state.courseLocked;
  }

  /* AI Prompt: Explain the ACTIONS / EVENTS section in clear, simple terms. */
  /* =========================================================
     ACTIONS / EVENTS
  ========================================================= */

  function wireCourseActions() {
    // expand / collapse
    const expandAllBtn = getById("expandAllBtn");
    const collapseAllBtn = getById("collapseAllBtn");

    expandAllBtn?.addEventListener("click", () => {
      state.course.modules.forEach((m) => state.expandedModules.add(m.id));
      renderModules();
      wireDynamicHandlers();
    });

    collapseAllBtn?.addEventListener("click", () => {
      state.expandedModules.clear();
      renderModules();
      wireDynamicHandlers();
    });

    // continue button
    const continueBtn = getById("continueBtn");
    continueBtn?.addEventListener("click", () => {
      if (state.courseLocked) return;

      const next = getRequiredItems().find((it) => !isItemCompleted(it));
      if (!next) {
        // review: open first learn
        if (state.learnItemsFlat[0]) openLearnModalByLessonNumber(state.learnItemsFlat[0].lesson_number);
        return;
      }
      openItem(next.type, next.lesson_number);
    });

    // review button
    const reviewBtn = getById("reviewBtn");
    reviewBtn?.addEventListener("click", () => {
      if (state.learnItemsFlat[0]) openLearnModalByLessonNumber(state.learnItemsFlat[0].lesson_number);
    });

    // next step buttons
    const nextStepBtn = getById("nextStepBtn");
    const jumpBtn = getById("jumpToFirstIncompleteBtn");
    const clickNext = () => {
      if (state.courseLocked) return;
      const next = getRequiredItems().find((it) => !isItemCompleted(it));
      if (next) openItem(next.type, next.lesson_number);
    };
    nextStepBtn?.addEventListener("click", clickNext);
    jumpBtn?.addEventListener("click", clickNext);

    // dynamic handlers (module toggles + item open)
    wireDynamicHandlers();

    // lesson modal controls
    wireLessonModalControls();
  }

  function wireDynamicHandlers() {
    document.querySelectorAll('[data-action="toggle-module"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-module");
        if (!id) return;

        if (state.expandedModules.has(id)) state.expandedModules.delete(id);
        else state.expandedModules.add(id);

        const body = document.querySelector(`[data-module-body="${cssEscapeAttr(id)}"]`);
        if (body) body.style.display = state.expandedModules.has(id) ? "" : "none";

        const icon = btn.querySelector("i.bi");
        if (icon) {
          icon.classList.toggle("bi-chevron-up", state.expandedModules.has(id));
          icon.classList.toggle("bi-chevron-down", !state.expandedModules.has(id));
        }

        btn.setAttribute("aria-expanded", state.expandedModules.has(id) ? "true" : "false");

        if (state.expandedModules.has(id)) {
          persistLastModule(id);
        } else if (state.expandedModules.size) {
          persistLastModule(Array.from(state.expandedModules)[0]);
        } else {
          localStorage.removeItem(lastModuleKey());
        }
      });
    });

    document.querySelectorAll('[data-action="open-item"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.courseLocked) return;

        const type = btn.getAttribute("data-type");
        const lesson = Number(btn.getAttribute("data-lesson") || "0");
        if (!type || !lesson) return;
        openItem(type, lesson);
      });
    });

    document.querySelectorAll('[data-action="preview-lesson"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (state.courseLocked) return;
        const lesson = Number(btn.getAttribute("data-lesson") || "0");
        if (!lesson) return;
        openLearnModalByLessonNumber(lesson);
      });
      btn.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        if (state.courseLocked) return;
        const lesson = Number(btn.getAttribute("data-lesson") || "0");
        if (!lesson) return;
        openLearnModalByLessonNumber(lesson);
      });
      btn.addEventListener("mouseenter", () => schedulePreviewTooltip(btn));
      btn.addEventListener("mouseleave", () => hidePreviewTooltip(btn));
      btn.addEventListener("focus", () => schedulePreviewTooltip(btn));
      btn.addEventListener("blur", () => hidePreviewTooltip(btn));
    });
  }

  function openItem(type, lessonNumber) {
    const t = String(type).toLowerCase();
    if (state.user?.email) {
      trackCourseStart(state.user.email, state.courseId, lessonNumber);
    }

    const contentId = state.courseContentId || state.courseId;
    const contentQuery = `&content_id=${encodeURIComponent(contentId)}`;

    if (t === "learn") {
      window.location.href =
        `lesson.html?course_id=${encodeURIComponent(state.courseId)}${contentQuery}&lesson=${encodeURIComponent(lessonNumber)}`;
      return;
    }

    if (t === "quiz") {
      window.location.href =
        `quiz.html?course=${encodeURIComponent(state.courseId)}${contentQuery}&lesson=${encodeURIComponent(lessonNumber)}`;
      return;
    }

    if (t === "sandbox" || t === "practice") {
      const item = findItem("sandbox", lessonNumber) || findItem("practice", lessonNumber);
      if (item) {
        const payload = {
          courseId: state.courseId,
          courseTitle: state.course.title,
          unitTitle: item.unit_title || "",
          lesson: lessonNumber,
          lessonTitle: item.title || "",
          tutorial: {
            steps: item.steps || (item.tutorial && item.tutorial.steps) || [],
            tips: item.tips || (item.tutorial && item.tutorial.tips) || "",
            xp: Number(item.xp || 0)
          }
        };
        localStorage.setItem("netology_active_tutorial", JSON.stringify(payload));
      }
      window.location.href =
        `sandbox.html?course_id=${encodeURIComponent(state.courseId)}${contentQuery}&lesson=${encodeURIComponent(lessonNumber)}&mode=practice`;
      return;
    }

    if (t === "challenge") {
      const item = findItem(t, lessonNumber);
      if (item) {
        const payload = {
          courseId: state.courseId,
          courseTitle: state.course.title,
          unitTitle: item.unit_title || "",
          lesson: lessonNumber,
          lessonTitle: item.title || "",
          challenge: {
            rules: (item.challenge && item.challenge.rules) || item.rules || item.challenge || null,
            steps: (item.challenge && item.challenge.steps) || item.steps || [],
            tips: (item.challenge && item.challenge.tips) || item.tips || "",
            xp: Number(item.xp || 0)
          }
        };
        localStorage.setItem("netology_active_challenge", JSON.stringify(payload));
      }
      window.location.href =
        `sandbox.html?course_id=${encodeURIComponent(state.courseId)}${contentQuery}&lesson=${encodeURIComponent(lessonNumber)}&mode=challenge&challenge=1`;
      return;
    }
  }

  function findItem(type, lessonNumber) {
    const t = String(type).toLowerCase();
    for (const m of (state.course.modules || [])) {
      for (const it of (m.items || [])) {
        if (String(it.type) === t && Number(it.lesson_number) === Number(lessonNumber)) {
          return it;
        }
      }
    }
    return null;
  }

  /* AI Prompt: Explain the LESSON MODAL section in clear, simple terms. */
  /* =========================================================
     LESSON MODAL
  ========================================================= */

  function wireLessonModalControls() {
    const prevBtn = getById("lessonPrevBtn");
    const nextBtn = getById("lessonNextBtn");
    const completeBtn = getById("lessonCompleteBtn");

    prevBtn?.addEventListener("click", () => moveLearn(-1));
    nextBtn?.addEventListener("click", () => moveLearn(1));

    completeBtn?.addEventListener("click", async () => {
      if (!state.user?.email) {
        showAria("Sign in to save progress.");
        return;
      }
      if (!state.activeLearn) return;

      await completeItem("learn", state.activeLearn.lesson_number, state.activeLearn.xp);
      renderAll();
      wireDynamicHandlers();
      updateLessonModalButtons();
    });
  }

  function openLearnModalByLessonNumber(lessonNumber) {
    const idx = state.learnItemsFlat.findIndex((it) => Number(it.lesson_number) === Number(lessonNumber));
    if (idx < 0) return;

    state.activeLearnIndex = idx;
    state.activeLearn = state.learnItemsFlat[idx];

    fillLessonModal(state.activeLearn);

    const drawerEl = getById("lessonPreviewDrawer");
    if (!drawerEl) return;

    // Bootstrap 5 Offcanvas
    const drawer = bootstrap.Offcanvas.getOrCreateInstance(drawerEl);
    drawer.show();
    animatePreviewRing();
  }

  function fillLessonModal(item) {
    setText("lessonPreviewLabel", item.title);
    setText("lessonMetaTime", item.duration || "—");
    setText("lessonMetaXP", Number(item.xp || 0));

    const body = getById("lessonPreviewBody");
    if (body) {
      const c = item.content;
      clearChildren(body);
      if (Array.isArray(c)) {
        const preview = c.slice(0, 2);
        preview.forEach((p) => {
          const para = document.createElement("p");
          para.textContent = String(p ?? "");
          body.appendChild(para);
        });
        if (c.length > 2) {
          body.appendChild(makeEl("p", "text-muted small mb-0", "Open the full lesson to continue."));
        }
      } else if (typeof c === "string" && c.trim()) {
        const trimmed = c.split("\n").slice(0, 3).join("\n");
        appendTextWithBreaks(body, trimmed);
      } else {
        body.append(
          makeEl("p", "text-muted mb-2", "Lesson content not added yet."),
          makeEl("p", "text-muted small mb-0", "We can plug your in-depth content here from COURSE_CONTENT next.")
        );
      }
    }

    const resEl = getById("lessonPreviewResources");
    if (resEl) {
      const resources = Array.isArray(item.resources) && item.resources.length
        ? item.resources
        : buildDefaultResources(item.title || "", state.course.title || "");
      const previewRes = resources.slice(0, 2);
      clearChildren(resEl);
      previewRes.forEach((r) => {
        const link = document.createElement("a");
        link.className = "net-resource-item";
        link.href = r.url || "#";
        link.target = "_blank";
        link.rel = "noopener";

        const icoWrap = document.createElement("span");
        icoWrap.className = "net-resource-ico";
        icoWrap.appendChild(makeIcon("bi bi-book"));

        const label = document.createElement("span");
        label.textContent = String(r.label || "");

        const ext = makeIcon("bi bi-box-arrow-up-right ms-auto text-muted");

        link.append(icoWrap, label, ext);
        resEl.appendChild(link);
      });
    }

    const openBtn = getById("lessonOpenBtn");
    if (openBtn) {
      openBtn.setAttribute(
        "href",
        `lesson.html?course_id=${encodeURIComponent(state.courseId)}&content_id=${encodeURIComponent(state.courseContentId || state.courseId)}&lesson=${encodeURIComponent(item.lesson_number)}`
      );
      const started = getStartedLessonNumber(state.user?.email, state.courseId);
      const done = state.completed.lesson.has(Number(item.lesson_number));
      if (started && Number(started) === Number(item.lesson_number) && !done) {
        openBtn.textContent = "Continue lesson";
        openBtn.classList.remove("btn-outline-secondary");
        openBtn.classList.add("btn-teal");
      } else {
        openBtn.textContent = "Open lesson";
        openBtn.classList.remove("btn-teal");
        openBtn.classList.add("btn-outline-secondary");
      }
    }

    updateLessonModalButtons();
  }

  function buildDefaultResources(title, courseTitle) {
    const t = `${title || ""} ${courseTitle || ""}`.toLowerCase();
    const list = [];
    const add = (label, url) => {
      if (!list.find((r) => r.url === url)) list.push({ label, url });
    };

    if (t.includes("network")) add("Computer network overview", "https://en.wikipedia.org/wiki/Computer_network");
    if (t.includes("lan")) add("Local area network", "https://en.wikipedia.org/wiki/Local_area_network");
    if (t.includes("wan")) add("Wide area network", "https://en.wikipedia.org/wiki/Wide_area_network");
    if (t.includes("ethernet")) add("Ethernet basics", "https://en.wikipedia.org/wiki/Ethernet");
    if (t.includes("mac")) add("MAC address", "https://en.wikipedia.org/wiki/MAC_address");
    if (t.includes("ip")) add("IP address", "https://en.wikipedia.org/wiki/IP_address");
    if (t.includes("subnet")) add("Subnetting", "https://en.wikipedia.org/wiki/Subnetting");
    if (t.includes("gateway")) add("Default gateway", "https://en.wikipedia.org/wiki/Default_gateway");
    if (t.includes("vlan")) add("Virtual LAN", "https://en.wikipedia.org/wiki/Virtual_LAN");
    if (t.includes("trunk")) add("IEEE 802.1Q", "https://en.wikipedia.org/wiki/IEEE_802.1Q");
    if (t.includes("routing") || t.includes("ospf")) add("Routing (overview)", "https://en.wikipedia.org/wiki/Routing");
    if (t.includes("firewall")) add("Firewall", "https://en.wikipedia.org/wiki/Firewall_(computing)");
    if (t.includes("acl")) add("Access control list", "https://en.wikipedia.org/wiki/Access_control_list");
    if (t.includes("siem") || t.includes("logging")) add("SIEM", "https://en.wikipedia.org/wiki/Security_information_and_event_management");
    if (t.includes("bgp")) add("BGP", "https://en.wikipedia.org/wiki/Border_Gateway_Protocol");
    if (t.includes("automation")) add("Network automation", "https://en.wikipedia.org/wiki/Network_automation");
    if (t.includes("snmp")) add("SNMP", "https://en.wikipedia.org/wiki/Simple_Network_Management_Protocol");

    if (list.length < 3) {
      add("Internet protocol suite", "https://en.wikipedia.org/wiki/Internet_protocol_suite");
      add("OSI model", "https://en.wikipedia.org/wiki/OSI_model");
      add("Computer network topologies", "https://en.wikipedia.org/wiki/Network_topology");
    }

    return list.slice(0, 4);
  }

  function animatePreviewRing() {
    const ring = getById("previewRing");
    if (!ring) return;
    const prog = computeProgress();
    const CIRC = 2 * Math.PI * 26;
    ring.style.transition = "none";
    ring.style.strokeDasharray = `${CIRC.toFixed(2)}`;
    ring.style.strokeDashoffset = `${CIRC.toFixed(2)}`;
    requestAnimationFrame(() => {
      ring.style.transition = "stroke-dashoffset .6s ease";
      ring.style.strokeDashoffset = `${(CIRC * (1 - prog.pct / 100)).toFixed(2)}`;
    });
  }

  /* AI Prompt: Explain the Preview tooltip (1s delay) section in clear, simple terms. */
  /* =========================================================
     Preview tooltip (1s delay)
  ========================================================= */

  let __previewTooltip = null;

  function ensurePreviewTooltip() {
    if (__previewTooltip) return __previewTooltip;
    const tip = document.createElement("div");
    tip.className = "net-tooltip";
    tip.textContent = "Preview";
    document.body.appendChild(tip);
    __previewTooltip = tip;
    return tip;
  }

  function schedulePreviewTooltip(target) {
    if (!target) return;
    clearPreviewTooltipTimer(target);
    const t = setTimeout(() => showPreviewTooltip(target), 1000);
    target.dataset.previewTipTimer = String(t);
  }

  function clearPreviewTooltipTimer(target) {
    const handle = Number(target?.dataset?.previewTipTimer || 0);
    if (handle) clearTimeout(handle);
    if (target?.dataset) delete target.dataset.previewTipTimer;
  }

  function showPreviewTooltip(target) {
    const tip = ensurePreviewTooltip();
    const lesson = target?.getAttribute("data-lesson");
    const base = target?.getAttribute("title") || "Preview";
    tip.textContent = lesson ? `${base} lesson ${lesson}` : base;
    tip.classList.add("is-open");

    const rect = target.getBoundingClientRect();
    const pad = 8;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    let left = rect.left + rect.width / 2 - w / 2;
    let top = rect.top - h - 10;
    left = Math.max(pad, Math.min(left, window.innerWidth - w - pad));
    if (top < pad) top = rect.bottom + 10;

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function hidePreviewTooltip(target) {
    clearPreviewTooltipTimer(target);
    if (__previewTooltip) __previewTooltip.classList.remove("is-open");
  }

  function moveLearn(dir) {
    if (!state.learnItemsFlat.length) return;

    let next = state.activeLearnIndex + dir;
    next = clamp(next, 0, state.learnItemsFlat.length - 1);

    state.activeLearnIndex = next;
    state.activeLearn = state.learnItemsFlat[next];

    fillLessonModal(state.activeLearn);
  }

  function updateLessonModalButtons() {
    const prevBtn = getById("lessonPrevBtn");
    const nextBtn = getById("lessonNextBtn");
    const completeBtn = getById("lessonCompleteBtn");

    if (prevBtn) prevBtn.disabled = state.activeLearnIndex <= 0;
    if (nextBtn) nextBtn.disabled = state.activeLearnIndex >= state.learnItemsFlat.length - 1;

    if (completeBtn && state.activeLearn) {
      const done = state.completed.lesson.has(Number(state.activeLearn.lesson_number));
      completeBtn.disabled = done || state.courseLocked;
      setButtonIconText(completeBtn, "bi bi-check2-circle me-1", done ? "Completed" : "Mark Complete");
    }
  }

  /* AI Prompt: Explain the COMPLETION WRITES (backend best-effort + local fallback) section in clear, simple terms. */
  /* =========================================================
     COMPLETION WRITES (backend best-effort + local fallback)
  ========================================================= */

  async function completeItem(type, lessonNumber, xp) {
    const t = String(type).toLowerCase();
    const n = Number(lessonNumber);
    const moduleForLesson = findModuleForLesson(n);
    const moduleWasDone = moduleForLesson ? computeModuleCompletion(moduleForLesson).completed : false;
    const courseWasDone = computeProgress().pct === 100;
    const already =
      (t === "learn" && state.completed.lesson.has(n)) ||
      (t === "quiz" && state.completed.quiz.has(n)) ||
      (t === "challenge" && state.completed.challenge.has(n));

    if (already) {
      showAria(`${capitalize(t)} already completed.`);
      return;
    }

    const xpValue = Number(xp || 0);

    // Optimistic update so the UI updates immediately.
    if (t === "learn") state.completed.lesson.add(n);
    if (t === "quiz") state.completed.quiz.add(n);
    if (t === "challenge") state.completed.challenge.add(n);

    cacheCompletionsToLS(state.user.email, state.courseId);
    const backend = await tryBackendComplete(t, n, xpValue).catch(() => null);
    const xpAwarded = backend && backend.success ? Number(backend.xp_added || 0) : xpValue;

    logProgressEvent(state.user.email, {
      type: t,
      course_id: state.courseId,
      lesson_number: n,
      xp: xpAwarded
    });
    if (xpAwarded > 0) {
      bumpUserXP(state.user.email, xpAwarded);
    }

    if (backend?.already_completed) {
      showAria(`${capitalize(t)} completed (already recorded).`);
    } else {
      showAria(`${capitalize(t)} completed. +${xpAwarded} XP`);
    }

    if (xpAwarded > 0) {
      // Update local stats so UI reflects progress immediately
      state.stats.xp = Number(state.stats.xp || 0) + xpAwarded;
      const updated = computeXPFromTotal(state.stats.xp);
      state.stats.level = updated.level;
      state.stats.currentLevelXP = updated.currentLevelXP;
      state.stats.xpProgressPct = updated.xpProgressPct;
      state.stats.xpNext = updated.xpNext;

      setText("sideLevelBadge", `Lv ${state.stats.level}`);
      setText("sideXPText", `${state.stats.currentLevelXP}/${state.stats.xpNext}`);
      const sideXPBar = getById("sideXPBar");
      if (sideXPBar) sideXPBar.style.width = `${clamp(state.stats.xpProgressPct, 0, 100)}%`;

      computeLockState();
    }

    if (backend && backend.success) {
      await loadUserStats(state.user.email);
    }

    const prog = computeProgress();
    if (prog.pct === 100) showAria("Course completed!");

    if (moduleForLesson && !moduleWasDone) {
      const now = computeModuleCompletion(moduleForLesson);
      if (now.completed) {
        const key = moduleToastKey(moduleForLesson);
        if (localStorage.getItem(key) !== "1") {
          showCompletionToast({
            title: "Module completed",
            message: moduleForLesson.title || "Module finished",
            icon: "bi-check2-circle"
          });
          localStorage.setItem(key, "1");
        }
      }
    }

    if (!courseWasDone && prog.pct === 100) {
      const key = courseToastKey();
      if (localStorage.getItem(key) !== "1") {
        showCompletionToast({
          title: "Course completed",
          message: state.course?.title || "Course finished",
          icon: "bi-trophy",
          mini: false
        });
        localStorage.setItem(key, "1");
      }
    }
  }

  async function tryBackendComplete(type, lessonNumber, xp) {
    if (!API()) return false;

    const payload = {
      email: state.user.email,
      course_id: Number(state.courseId),
      lesson_number: Number(lessonNumber),
      earned_xp: Number(xp || 0),
    };

    let url = "";
    if (type === "learn") url = ENDPOINTS.completeLesson;
    if (type === "quiz") url = ENDPOINTS.completeQuiz;
    if (type === "challenge") url = ENDPOINTS.completeChallenge;
    if (!url) return false;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => ({}));
    if (data && data.success === false) return { success: false };

    return { success: true, ...data };
  }

  /* AI Prompt: Explain the RETURN TOAST section in clear, simple terms. */
  /* =========================================================
     RETURN TOAST
  ========================================================= */

  function maybeShowReturnToast() {
    const params = new URLSearchParams(window.location.search);
    const msg = params.get("toast");
    if (!msg) return;

    const decoded = decodeURIComponent(msg);
    if (typeof window.showPopup === "function") window.showPopup(decoded, "success");
    else showAria(decoded);
  }

  function showCourseProgressToast(progress) {
    const existing = document.getElementById("courseProgressToast");
    if (existing) existing.remove();

    const stack = (() => {
      let existingStack = document.getElementById("netToastStack");
      if (!existingStack) {
        existingStack = document.createElement("div");
        existingStack.id = "netToastStack";
        existingStack.className = "net-toast-stack";
        document.body.appendChild(existingStack);
      }
      return existingStack;
    })();

    const popup = document.createElement("div");
    popup.id = "courseProgressToast";
    popup.className = "net-toast net-toast-enter in-stack";
    popup.setAttribute("role", "status");
    popup.setAttribute("aria-live", "polite");
    popup.dataset.type = "success";

    const pct = Number(progress?.pct || 0);
    const done = Number(progress?.done || 0);
    const total = Number(progress?.total || 0);
    const sub = total
      ? `You're now ${pct}% complete · ${done}/${total} required items done.`
      : "Your course progress just refreshed.";
    const xpHint =
      state.user && state.stats && Number.isFinite(Number(state.stats.toNext))
        ? `Next level in ${Math.max(0, Number(state.stats.toNext))} XP.`
        : "";

    const inner = makeEl("div", "net-toast-inner");
    const icon = makeEl("div", "net-toast-icon");
    icon.setAttribute("aria-hidden", "true");
    const iconEl = makeIcon("bi bi-check2-circle");
    iconEl.setAttribute("aria-hidden", "true");
    icon.appendChild(iconEl);

    const body = makeEl("div", "net-toast-body");
    const title = makeEl("div", "net-toast-title");
    title.textContent = "Course progress updated";
    const subEl = makeEl("div", "net-toast-sub", sub);

    body.append(title, subEl);
    if (xpHint) {
      const xpRow = makeEl("div", "net-toast-sub mt-1");
      const bolt = makeIcon("bi bi-lightning-charge-fill me-1");
      bolt.setAttribute("aria-hidden", "true");
      xpRow.append(bolt, document.createTextNode(xpHint));
      body.append(xpRow);
    }

    const closeBtn = makeEl("button", "net-toast-close");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Dismiss");
    const closeSpan = makeEl("span");
    closeSpan.setAttribute("aria-hidden", "true");
    closeSpan.textContent = "×";
    closeBtn.appendChild(closeSpan);

    inner.append(icon, body, closeBtn);
    popup.appendChild(inner);

    stack.appendChild(popup);

    const removeToast = () => {
      popup.classList.remove("net-toast-enter");
      popup.classList.add("net-toast-exit");
      setTimeout(() => popup.remove(), 220);
    };

    closeBtn.addEventListener("click", removeToast);

    setTimeout(removeToast, 2800);
  }

  /* AI Prompt: Explain the ICON HELPERS (Bootstrap Icons) section in clear, simple terms. */
  /* =========================================================
     ICON HELPERS (Bootstrap Icons)
  ========================================================= */

  function moduleIcon(modProg, locked) {
    let cls = "bi bi-book text-white";
    if (locked) cls = "bi bi-lock-fill text-muted";
    else if (modProg.completed) cls = "bi bi-check2-circle text-white";
    const icon = makeIcon(cls);
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  function lessonIcon(it, completed, locked) {
    const wrap = document.createElement("div");

    if (locked) {
      wrap.className = "net-ico-pill bg-light border";
      const icon = makeIcon("bi bi-lock-fill text-muted");
      icon.setAttribute("aria-hidden", "true");
      wrap.appendChild(icon);
      return wrap;
    }
    if (completed) {
      wrap.className = "net-ico-pill net-ico-success";
      const icon = makeIcon("bi bi-check2-circle");
      icon.setAttribute("aria-hidden", "true");
      wrap.appendChild(icon);
      return wrap;
    }

    if (it.type === "quiz") {
      wrap.className = "net-ico-pill net-ico-quiz";
      wrap.appendChild(makeIcon("bi bi-patch-question"));
      return wrap;
    }
    if (it.type === "sandbox" || it.type === "practice") {
      wrap.className = "net-ico-pill net-ico-sandbox";
      wrap.appendChild(makeIcon("bi bi-diagram-3"));
      return wrap;
    }
    if (it.type === "challenge") {
      wrap.className = "net-ico-pill net-ico-challenge";
      wrap.appendChild(makeIcon("bi bi-flag"));
      return wrap;
    }

    wrap.className = "net-ico-pill net-ico-learn";
    wrap.appendChild(makeIcon("bi bi-file-text"));
    return wrap;
  }

})();
