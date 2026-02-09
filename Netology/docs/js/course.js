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
      `${API()}/completions?email=${encodeURIComponent(email)}&course_id=${encodeURIComponent(courseId)}`,

    completeLesson: `${API()}/complete-lesson`,
    completeQuiz: `${API()}/complete-quiz`,
    completeChallenge: `${API()}/complete-challenge`,
  };

  // localStorage fallback key
  const LS_KEY = (email, courseId) => `netology_completions:${email}:${courseId}`;
  const STARTED_KEY = (email) => `netology_started_courses:${email}`;
  const LOG_KEY = (email) => `netology_progress_log:${email}`;

  /* =========================================================
     HELPERS
  ========================================================= */

  const el = (id) => document.getElementById(id);

  function setText(id, text) {
    const n = el(id);
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

  function computeXPFromTotal(totalXP) {
    const level = levelFromXP(totalXP);
    const levelStart = totalXpForLevel(level);
    const currentLevelXP = Math.max(0, totalXP - levelStart);
    const xpNext = xpForNextLevel(level);
    const xpProgressPct = Math.max(0, Math.min(100, (currentLevelXP / Math.max(xpNext, 1)) * 100));
    const toNext = Math.max(0, xpNext - currentLevelXP);
    return { level, currentLevelXP, xpNext, xpProgressPct, toNext };
  }

  function safeJson(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cssEscape(str) {
    // minimal escape for attribute selectors
    return String(str ?? "").replace(/"/g, '\\"');
  }

  function cap(s) {
    const t = String(s || "");
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
  }

  function showAria(text) {
    const aria = el("ariaStatus");
    if (aria) aria.textContent = String(text || "");
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
    const list = safeJson(raw) || [];
    list.push(entry);
    localStorage.setItem(LOG_KEY(email), JSON.stringify(list));
  }

  function trackCourseStart(email, courseId, lessonNumber) {
    if (!email || !courseId) return;
    const raw = localStorage.getItem(STARTED_KEY(email));
    const list = safeJson(raw) || [];
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
  }

  function bumpUserXP(email, addXP) {
    if (!email || !addXP) return;
    const raw = localStorage.getItem("netology_user") || localStorage.getItem("user");
    const user = safeJson(raw) || {};
    if (!user || user.email !== email) return;
    const nextXP = Math.max(0, Number(user.xp || 0) + Number(addXP || 0));
    user.xp = nextXP;
    if (localStorage.getItem("netology_user")) {
      localStorage.setItem("netology_user", JSON.stringify(user));
    }
    if (localStorage.getItem("user")) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  }

  // Accept both keys (older + newer)
  function getCurrentUser() {
    return (
      safeJson(localStorage.getItem("netology_user")) ||
      safeJson(localStorage.getItem("user")) ||
      null
    );
  }

  function isLoggedIn(user) {
    return !!(user && (user.email || user.username));
  }

  /* =========================================================
     STATE
  ========================================================= */

  const state = {
    user: null,
    courseId: null,

    // normalized course model
    course: {
      id: null,
      title: "",
      description: "",
      difficulty: "novice",  // novice/intermediate/advanced
      required_level: 1,
      estimatedTime: "—",
      totalXP: 0,
      modules: [],           // [{ id, title, description, items:[...] }]
    },

    // completion sets
    completed: {
      lesson: new Set(),     // lesson_number
      quiz: new Set(),       // lesson_number
      challenge: new Set(),  // lesson_number
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
    },

    courseLocked: false,
    courseCompleted: false,
  };

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

    // course id from URL (?id=)
    const courseId = new URLSearchParams(window.location.search).get("id");
    state.courseId = courseId || "1";
    state.course.id = state.courseId;

    const lessonParam = new URLSearchParams(window.location.search).get("lesson");
    if (state.user?.email) {
      trackCourseStart(state.user.email, state.courseId, lessonParam);
    }

    // load course structure (from COURSE_CONTENT)
    hydrateCourseFromContent(state.courseId);

    // expand first module by default
    if (state.course.modules[0]) state.expandedModules.add(state.course.modules[0].id);

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

    // derived
    buildLearnFlatList();

    // render
    renderAll();

    // wire after render
    wireCourseActions();

    // if returning from quiz/sandbox completion, support toast via URL params
    maybeShowReturnToast();
  });

  /* =========================================================
     CHROME (sidebar + dropdown)  (matches dashboard behaviour)
  ========================================================= */

  function wireBrandRouting() {
    const brand = el("brandHome");
    const sideBrand = el("sideBrandHome");
    const back = el("backLink");

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
    const bar = el("sideXPBar");
    if (bar) bar.style.width = "0%";

    // hide logout buttons
    const topLogout = el("topLogoutBtn");
    const sideLogout = el("sideLogoutBtn");
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
    const topLogout = el("topLogoutBtn");
    const sideLogout = el("sideLogoutBtn");
    if (topLogout) topLogout.addEventListener("click", logout);
    if (sideLogout) sideLogout.addEventListener("click", logout);
  }

  function wireSidebar() {
    const openBtn = el("openSidebarBtn");
    const closeBtn = el("closeSidebarBtn");
    const sidebar = el("slideSidebar");
    const backdrop = el("sideBackdrop");

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
    const userBtn = el("userBtn");
    const dd = el("userDropdown");
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
    const dd = el("userDropdown");
    const userBtn = el("userBtn");
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

      const xp = Number(data.xp || data.total_xp || 0) || 0;
      const { level, currentLevelXP, xpNext, xpProgressPct } = computeXPFromTotal(xp);
      const rank = String(data.rank || data.level_name || data.level || "Novice");

      state.stats.level = level;
      state.stats.xp = xp;
      state.stats.rank = rank;

      state.stats.currentLevelXP = currentLevelXP;
      state.stats.xpProgressPct = xpProgressPct;
      state.stats.xpNext = xpNext;

      // Sidebar stats
      setText("sideLevelBadge", `Lv ${level}`);
      setText("sideXPText", `${currentLevelXP}/${xpNext}`);
      const sideXPBar = el("sideXPBar");
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

      setText("sideLevelBadge", `Lv ${state.stats.level}`);
      setText("sideXPText", `${state.stats.currentLevelXP}/${state.stats.xpNext}`);
      const sideXPBar = el("sideXPBar");
      if (sideXPBar) sideXPBar.style.width = `${clamp(state.stats.xpProgressPct, 0, 100)}%`;
    }
  }

  async function loadCompletions(email, courseId) {
    // 1) Try backend
    try {
      if (API()) {
        const res = await fetch(ENDPOINTS.getCompletions(email, courseId));
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.success !== false && data.completions) {
            applyCompletionsPayload(data.completions);
            cacheCompletionsToLS(email, courseId);
            return;
          }
        }
      }
    } catch (_) {
      // ignore
    }

    // 2) Fallback localStorage
    const cached = safeJson(localStorage.getItem(LS_KEY(email, courseId)));
    if (cached) applyCompletionsPayload(cached);
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

  /* =========================================================
     COURSE CONTENT NORMALIZATION
  ========================================================= */

  function difficultyRequiredLevel(diff) {
    if (diff === "novice") return 1;
    if (diff === "intermediate") return 3;
    if (diff === "advanced") return 5;
    return 1;
  }

  function hydrateCourseFromContent(courseId) {
    const raw = (typeof window.COURSE_CONTENT !== "undefined")
      ? window.COURSE_CONTENT[String(courseId)]
      : null;

    if (!raw) {
      state.course = {
        id: courseId,
        title: "Course",
        description: "No content found for this course yet.",
        difficulty: "novice",
        required_level: 1,
        estimatedTime: "—",
        totalXP: 0,
        modules: [],
      };
      return;
    }

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
  }

  function normalizeUnitItems(unit, startingLessonNumber) {
    const items = [];
    let lessonCounter = startingLessonNumber;

    const pushItem = (type, data) => {
      items.push({
        type, // learn|quiz|sandbox|challenge
        title: data.title || data.name || cap(type),
        content: data.content || data.learn || data.text || "",
        duration: data.duration || data.time || "—",
        xp: Number(data.xp || data.xpReward || data.xp_reward || 0),
        lesson_number: Number(data.lesson_number || data.lessonNumber || 0),
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

    // Assign lesson_number
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
    if (sectionType.includes("quiz")) return "quiz";
    if (sectionType.includes("challenge")) return "challenge";
    if (sectionType.includes("practice") || sectionType.includes("sandbox") || sectionType.includes("hands-on")) return "sandbox";

    const t = String(item.type || "").toLowerCase();
    if (t === "quiz") return "quiz";
    if (t === "challenge") return "challenge";
    if (t === "sandbox" || t === "practice") return "sandbox";
    return "learn";
  }

  /* =========================================================
     LOCK / COMPLETION / PROGRESS
  ========================================================= */

  function computeLockState() {
    const userLevel = state.user ? Number(state.stats.level || 1) : 0;
    state.courseLocked = userLevel < Number(state.course.required_level || 1);
  }

  function getRequiredItems() {
    const required = [];
    state.course.modules.forEach((m) => {
      m.items.forEach((it) => {
        if (it.type === "learn" || it.type === "quiz" || it.type === "challenge") required.push(it);
      });
    });
    return required;
  }

  function isItemCompleted(it) {
    const n = Number(it.lesson_number || 0);
    if (!n) return false;

    if (it.type === "learn") return state.completed.lesson.has(n);
    if (it.type === "quiz") return state.completed.quiz.has(n);
    if (it.type === "challenge") return state.completed.challenge.has(n);
    return false; // sandbox optional
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
    const required = module.items.filter((it) => it.type === "learn" || it.type === "quiz" || it.type === "challenge");
    const done = required.filter(isItemCompleted).length;
    const total = required.length || 0;
    return { done, total, completed: total > 0 && done === total };
  }

  function buildLearnFlatList() {
    const list = [];
    state.course.modules.forEach((m) => m.items.forEach((it) => { if (it.type === "learn") list.push(it); }));
    state.learnItemsFlat = list;

    const idx = list.findIndex((it) => !isItemCompleted(it));
    state.activeLearnIndex = idx >= 0 ? idx : (list.length ? 0 : -1);
    state.activeLearn = state.activeLearnIndex >= 0 ? list[state.activeLearnIndex] : null;
  }

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

    setText("metaModules", `${state.course.modules.length} modules`);
    setText("metaTime", state.course.estimatedTime || "—");
    setText("metaXP", `${state.course.totalXP} XP Total`);

    // difficulty pill class
    const pill = el("difficultyPill");
    if (pill) {
      pill.textContent = cap(state.course.difficulty);
      pill.classList.remove("net-diff-novice", "net-diff-intermediate", "net-diff-advanced");
      pill.classList.add(`net-diff-${state.course.difficulty}`);
    }

    // locked?
    const lockedPill = el("courseLockedPill");
    const lockedExplainer = el("lockedExplainer");
    const lockedText = el("lockedText");

    if (state.courseLocked) {
      lockedPill?.classList.remove("d-none");
      lockedExplainer?.classList.remove("d-none");
      if (lockedText) lockedText.textContent = `Locked — requires Level ${state.course.required_level}.`;

      // disable primary actions
      const continueBtn = el("continueBtn");
      const openSandboxBtn = el("openSandboxBtn");
      continueBtn && (continueBtn.disabled = true);
      openSandboxBtn && (openSandboxBtn.disabled = true);
    } else {
      lockedPill?.classList.add("d-none");
      lockedExplainer?.classList.add("d-none");

      const continueBtn = el("continueBtn");
      const openSandboxBtn = el("openSandboxBtn");
      continueBtn && (continueBtn.disabled = false);
      openSandboxBtn && (openSandboxBtn.disabled = false);
    }

    // completed?
    const completedPill = el("courseCompletedPill");
    const reviewBtn = el("reviewBtn");
    const continueBtn = el("continueBtn");

    if (state.courseCompleted) {
      completedPill?.classList.remove("d-none");
      reviewBtn?.classList.remove("d-none");
      if (continueBtn) continueBtn.textContent = "Review";
    } else {
      completedPill?.classList.add("d-none");
      reviewBtn?.classList.add("d-none");
      if (continueBtn) {
        continueBtn.innerHTML = `Continue <i class="bi bi-chevron-right ms-1" aria-hidden="true"></i>`;
      }
    }

    // progress ring + bar
    const prog = computeProgress();

    setText("progressPct", `${prog.pct}%`);
    setText("progressText", `${prog.pct}%`);
    setText("progressCount", `${prog.done}/${prog.total}`);

    const ring = el("progressRing");
    if (ring) {
      const CIRC = 2 * Math.PI * 58; // r=58 (matches HTML)
      const offset = CIRC * (1 - prog.pct / 100);
      ring.style.strokeDasharray = `${CIRC.toFixed(2)}`;
      ring.style.strokeDashoffset = `${offset.toFixed(2)}`;
    }

    const bar = el("progressBar");
    if (bar) bar.style.width = `${clamp(prog.pct, 0, 100)}%`;

    // sandbox buttons carry course context
    const q = `course_id=${encodeURIComponent(state.courseId)}`;
    const topSandbox = el("topSandboxLink");
    const sidebarSandboxBtn = el("sidebarSandboxBtn");
    const openSandboxBtn = el("openSandboxBtn");

    if (topSandbox) topSandbox.setAttribute("href", `sandbox.html?${q}`);
    if (sidebarSandboxBtn) sidebarSandboxBtn.onclick = () => { window.location.href = `sandbox.html?${q}`; };
    if (openSandboxBtn) openSandboxBtn.onclick = () => { window.location.href = `sandbox.html?${q}`; };
  }

  function renderModules() {
    const wrap = el("modulesWrap");
    const empty = el("modulesEmpty");
    if (!wrap) return;

    if (!state.course.modules.length) {
      wrap.innerHTML = "";
      empty?.classList.remove("d-none");
      return;
    }
    empty?.classList.add("d-none");

    wrap.innerHTML = "";

    state.course.modules.forEach((m, idx) => {
      const modProg = computeModuleCompletion(m);
      const expanded = state.expandedModules.has(m.id);

      const iconHtml = moduleIcon(modProg, state.courseLocked);
      const headerBadge = modProg.completed
        ? `<span class="badge bg-success"><i class="bi bi-check2-circle me-1"></i>Completed</span>`
        : `<span class="badge text-bg-light border">${modProg.done}/${modProg.total} items</span>`;

      const chevronClass = expanded ? "bi-chevron-up" : "bi-chevron-down";
      const bodyStyle = expanded ? "" : "style='display:none'";

      wrap.insertAdjacentHTML("beforeend", `
        <article class="net-course-card net-module-card" data-module-id="${escapeHtml(m.id)}">
          <div class="p-0">
            <button class="net-module-btn p-4 d-flex align-items-start justify-content-between gap-3"
                    type="button"
                    data-action="toggle-module"
                    data-module="${escapeHtml(m.id)}"
                    aria-expanded="${expanded ? "true" : "false"}">

              <div class="d-flex align-items-start gap-3">
                <div class="net-module-ico">${iconHtml}</div>

                <div class="flex-grow-1">
                  <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                    <span class="small text-teal fw-semibold text-uppercase" style="letter-spacing:.04em;">Module ${idx + 1}</span>
                    ${headerBadge}
                  </div>
                  <div class="fw-semibold fs-5">${escapeHtml(m.title)}</div>
                  ${m.description ? `<div class="text-muted small mt-1">${escapeHtml(m.description)}</div>` : ""}
                </div>
              </div>

              <div class="d-flex align-items-center gap-3">
                <div class="text-end small text-muted d-none d-sm-block">
                  <div class="fw-semibold text-dark">${modProg.done}/${modProg.total}</div>
                  <div>required</div>
                </div>
                <i class="bi ${chevronClass} text-muted" aria-hidden="true"></i>
              </div>
            </button>

            <div class="border-top" ${bodyStyle} data-module-body="${escapeHtml(m.id)}">
              <div class="p-2 p-sm-3 net-module-body-bg">
                ${renderModuleItems(m)}
              </div>
            </div>
          </div>
        </article>
      `);
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
    let html = `<div class="d-grid gap-2">`;

    keys.forEach((lessonNum) => {
      const items = groups.get(lessonNum) || [];
      items.forEach((it) => {
        const completed = isItemCompleted(it);
        const locked = state.courseLocked;

        const icon = lessonIcon(it, completed, locked);
        const right = completed
          ? `<span class="badge bg-success"><i class="bi bi-check2-circle me-1"></i>Done</span>`
          : `<i class="bi bi-play-fill text-teal" aria-hidden="true"></i>`;

        const hint =
          it.type === "quiz" ? "Quiz" :
          it.type === "challenge" ? "Challenge" :
          (it.type === "sandbox" || it.type === "practice") ? "Sandbox" :
          "Lesson";

        const lockedClass = locked ? "is-locked" : "";
        const completedClass = completed ? "is-complete" : "";

        html += `
          <button class="net-lesson-row px-3 py-3 rounded-3 border d-flex align-items-center justify-content-between gap-3 ${lockedClass} ${completedClass}"
                  type="button"
                  data-action="open-item"
                  data-type="${escapeHtml(it.type)}"
                  data-lesson="${Number(it.lesson_number)}"
                  data-title="${escapeHtml(it.title)}"
                  ${locked ? "disabled aria-disabled='true'" : ""}>
            <div class="d-flex align-items-center gap-3">
              <div class="net-lesson-ico">${icon}</div>
              <div>
                <div class="fw-semibold text-dark">${escapeHtml(it.title)}</div>
                <div class="small text-muted d-flex flex-wrap gap-2 align-items-center mt-1">
                  <span class="d-inline-flex align-items-center gap-1">
                    <i class="bi bi-clock" aria-hidden="true"></i> ${escapeHtml(it.duration)}
                  </span>
                  <span class="text-muted">•</span>
                  <span class="d-inline-flex align-items-center gap-1 net-xp-accent fw-semibold">
                    <i class="bi bi-lightning-charge-fill" aria-hidden="true"></i> ${Number(it.xp)} XP
                  </span>
                  <span class="text-muted">•</span>
                  <span class="badge text-bg-light border">${hint}</span>
                </div>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              ${right}
            </div>
          </button>
        `;
      });
    });

    html += `</div>`;
    return html;
  }

  function renderSidebarCards() {
    const prog = computeProgress();
    setText("sidePct", `${prog.pct}%`);

    let modulesDone = 0;
    state.course.modules.forEach((m) => { if (computeModuleCompletion(m).completed) modulesDone++; });
    setText("sideModules", `${modulesDone}/${state.course.modules.length}`);

    let xpEarned = 0;
    getRequiredItems().forEach((it) => { if (isItemCompleted(it)) xpEarned += Number(it.xp || 0); });
    setText("sideXPEarned", xpEarned);

    const next = getRequiredItems().find((it) => !isItemCompleted(it));
    setText("nextStepText", next ? `${cap(next.type)}: ${next.title}` : "All done 🎉");

    const nextBtn = el("nextStepBtn");
    const jumpBtn = el("jumpToFirstIncompleteBtn");

    if (nextBtn) nextBtn.disabled = !next || state.courseLocked;
    if (jumpBtn) jumpBtn.disabled = !next || state.courseLocked;
  }

  /* =========================================================
     ACTIONS / EVENTS
  ========================================================= */

  function wireCourseActions() {
    // expand / collapse
    const expandAllBtn = el("expandAllBtn");
    const collapseAllBtn = el("collapseAllBtn");

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
    const continueBtn = el("continueBtn");
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
    const reviewBtn = el("reviewBtn");
    reviewBtn?.addEventListener("click", () => {
      if (state.learnItemsFlat[0]) openLearnModalByLessonNumber(state.learnItemsFlat[0].lesson_number);
    });

    // next step buttons
    const nextStepBtn = el("nextStepBtn");
    const jumpBtn = el("jumpToFirstIncompleteBtn");
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

        const body = document.querySelector(`[data-module-body="${cssEscape(id)}"]`);
        if (body) body.style.display = state.expandedModules.has(id) ? "" : "none";

        const icon = btn.querySelector("i.bi");
        if (icon) {
          icon.classList.toggle("bi-chevron-up", state.expandedModules.has(id));
          icon.classList.toggle("bi-chevron-down", !state.expandedModules.has(id));
        }

        btn.setAttribute("aria-expanded", state.expandedModules.has(id) ? "true" : "false");
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
  }

  function openItem(type, lessonNumber) {
    const t = String(type).toLowerCase();
    if (state.user?.email) {
      trackCourseStart(state.user.email, state.courseId, lessonNumber);
    }

    if (t === "learn") {
      openLearnModalByLessonNumber(lessonNumber);
      return;
    }

    if (t === "quiz") {
      window.location.href =
        `quiz.html?course_id=${encodeURIComponent(state.courseId)}&lesson=${encodeURIComponent(lessonNumber)}`;
      return;
    }

    if (t === "sandbox" || t === "practice") {
      window.location.href =
        `sandbox.html?course_id=${encodeURIComponent(state.courseId)}&lesson=${encodeURIComponent(lessonNumber)}&mode=practice`;
      return;
    }

    if (t === "challenge") {
      window.location.href =
        `sandbox.html?course_id=${encodeURIComponent(state.courseId)}&lesson=${encodeURIComponent(lessonNumber)}&mode=challenge`;
      return;
    }
  }

  /* =========================================================
     LESSON MODAL
  ========================================================= */

  function wireLessonModalControls() {
    const prevBtn = el("lessonPrevBtn");
    const nextBtn = el("lessonNextBtn");
    const completeBtn = el("lessonCompleteBtn");

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

    const modalEl = el("lessonModal");
    if (!modalEl) return;

    // Bootstrap 5 Modal
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  function fillLessonModal(item) {
    setText("lessonModalLabel", item.title);
    setText("lessonMetaTime", item.duration || "—");
    setText("lessonMetaXP", Number(item.xp || 0));

    const body = el("lessonModalBody");
    if (body) {
      const c = item.content;
      if (Array.isArray(c)) {
        body.innerHTML = c.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
      } else if (typeof c === "string" && c.trim()) {
        body.innerHTML = escapeHtml(c).replace(/\n/g, "<br>");
      } else {
        body.innerHTML = `
          <p class="text-muted mb-2">Lesson content not added yet.</p>
          <p class="text-muted small mb-0">We can plug your in-depth content here from COURSE_CONTENT next.</p>
        `;
      }
    }

    updateLessonModalButtons();
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
    const prevBtn = el("lessonPrevBtn");
    const nextBtn = el("lessonNextBtn");
    const completeBtn = el("lessonCompleteBtn");

    if (prevBtn) prevBtn.disabled = state.activeLearnIndex <= 0;
    if (nextBtn) nextBtn.disabled = state.activeLearnIndex >= state.learnItemsFlat.length - 1;

    if (completeBtn && state.activeLearn) {
      const done = state.completed.lesson.has(Number(state.activeLearn.lesson_number));
      completeBtn.disabled = done || state.courseLocked;
      completeBtn.innerHTML = done
        ? `<i class="bi bi-check2-circle me-1" aria-hidden="true"></i> Completed`
        : `<i class="bi bi-check2-circle me-1" aria-hidden="true"></i> Mark Complete`;
    }
  }

  /* =========================================================
     COMPLETION WRITES (backend best-effort + local fallback)
  ========================================================= */

  async function completeItem(type, lessonNumber, xp) {
    const t = String(type).toLowerCase();
    const n = Number(lessonNumber);
    const already =
      (t === "learn" && state.completed.lesson.has(n)) ||
      (t === "quiz" && state.completed.quiz.has(n)) ||
      (t === "challenge" && state.completed.challenge.has(n));

    if (already) {
      showAria(`${cap(t)} already completed.`);
      return;
    }

    // Optimistic update
    if (t === "learn") state.completed.lesson.add(n);
    if (t === "quiz") state.completed.quiz.add(n);
    if (t === "challenge") state.completed.challenge.add(n);

    cacheCompletionsToLS(state.user.email, state.courseId);
    logProgressEvent(state.user.email, {
      type: t,
      course_id: state.courseId,
      lesson_number: n,
      xp: Number(xp || 0)
    });
    bumpUserXP(state.user.email, Number(xp || 0));

    showAria(`${cap(t)} completed. +${Number(xp || 0)} XP`);

    // Update local stats so UI reflects progress immediately
    state.stats.xp = Number(state.stats.xp || 0) + Number(xp || 0);
    const updated = computeXPFromTotal(state.stats.xp);
    state.stats.level = updated.level;
    state.stats.currentLevelXP = updated.currentLevelXP;
    state.stats.xpProgressPct = updated.xpProgressPct;
    state.stats.xpNext = updated.xpNext;

    setText("sideLevelBadge", `Lv ${state.stats.level}`);
    setText("sideXPText", `${state.stats.currentLevelXP}/${state.stats.xpNext}`);
    const sideXPBar = el("sideXPBar");
    if (sideXPBar) sideXPBar.style.width = `${clamp(state.stats.xpProgressPct, 0, 100)}%`;

    computeLockState();

    await tryBackendComplete(t, n).catch(() => {});

    const prog = computeProgress();
    if (prog.pct === 100) showAria("Course completed! 🎉");
  }

  async function tryBackendComplete(type, lessonNumber) {
    if (!API()) return false;

    const payload = {
      email: state.user.email,
      course_id: Number(state.courseId),
      lesson_number: Number(lessonNumber),
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

    if (!res.ok) return false;

    const data = await res.json().catch(() => ({}));
    if (data && data.success === false) return false;

    return true;
  }

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

  /* =========================================================
     ICON HELPERS (Bootstrap Icons)
  ========================================================= */

  function moduleIcon(modProg, locked) {
    if (locked) return `<i class="bi bi-lock-fill text-muted" aria-hidden="true"></i>`;
    if (modProg.completed) return `<i class="bi bi-check2-circle text-white" aria-hidden="true"></i>`;
    return `<i class="bi bi-book text-white" aria-hidden="true"></i>`;
  }

  function lessonIcon(it, completed, locked) {
    if (locked) {
      return `<div class="net-ico-pill bg-light border"><i class="bi bi-lock-fill text-muted" aria-hidden="true"></i></div>`;
    }
    if (completed) {
      return `<div class="net-ico-pill net-ico-success">
                <i class="bi bi-check2-circle" aria-hidden="true"></i>
              </div>`;
    }

    if (it.type === "learn") {
      return `<div class="net-ico-pill net-ico-learn">
                <i class="bi bi-file-text" aria-hidden="true"></i>
              </div>`;
    }
    if (it.type === "quiz") {
      return `<div class="net-ico-pill net-ico-quiz">
                <i class="bi bi-patch-question" aria-hidden="true"></i>
              </div>`;
    }
    if (it.type === "sandbox" || it.type === "practice") {
      return `<div class="net-ico-pill net-ico-sandbox">
                <i class="bi bi-diagram-3" aria-hidden="true"></i>
              </div>`;
    }
    if (it.type === "challenge") {
      return `<div class="net-ico-pill net-ico-challenge">
                <i class="bi bi-flag" aria-hidden="true"></i>
              </div>`;
    }

    return `<div class="net-ico-pill bg-light border"><i class="bi bi-circle text-muted" aria-hidden="true"></i></div>`;
  }

})();
