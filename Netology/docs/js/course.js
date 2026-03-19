// course.js — shows a single course's modules and lessons

(() => {
  "use strict";

  const API_BASE = (window.API_BASE || "").replace(/\/$/, "");
  const XP_SYSTEM = window.NetologyXP || null;
  const ENDPOINTS = window.ENDPOINTS || {};
  const apiGet = window.apiGet;

  // makes a new element with optional class and text
  function newEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text !== "undefined") el.textContent = text;
    return el;
  }

  // makes a Bootstrap icon element
  function icon(className) {
    const el = document.createElement("i");
    el.className = className;
    return el;
  }

  // sets text on an element by id
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(text ?? "");
  }

  // all the page state in one place
  const state = {
    user: null,
    courseId: null,
    course: {
      id: null,
      title: "",
      description: "",
      difficulty: "novice",
      requiredLevel: 1,
      estimatedTime: "—",
      totalXP: 0,
      modules: []
    },
    completed: {
      lesson: new Set(),
      quiz: new Set(),
      challenge: new Set()
    },
    stats: {
      level: 1,
      rank: "Novice",
      xp: 0,
      currentLevelXP: 0,
      xpPercent: 0,
      accessLevel: 1
    }
  };

  // gets the logged-in user from localStorage
  function getUser() {
    try {
      const raw = localStorage.getItem("netology_user") || localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // returns val as a number if it's finite, otherwise fallback
  function safeNum(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  // fetches fresh user data from the server and saves it
  async function refreshUser() {
    const cached = getUser();
    const email = cached?.email || localStorage.getItem("netology_last_email") || "";
    if (!email) return cached;

    try {
      const path = ENDPOINTS.auth?.userInfo || "/user-info";
      const data = await apiGet(path, { email });
      if (!data?.success) return cached;

      const merged = {
        ...(cached || {}),
        email,
        first_name: data.first_name || cached?.first_name,
        last_name: data.last_name || cached?.last_name,
        username: data.username || cached?.username,
        xp: safeNum(data.xp ?? data.total_xp, cached?.xp),
        numeric_level: safeNum(data.numeric_level, cached?.numeric_level),
        rank: data.rank || data.level || cached?.rank,
        level: data.level || data.rank || cached?.level,
        isFirstLogin: data.is_first_login !== undefined ? Boolean(data.is_first_login) : cached?.isFirstLogin
      };

      localStorage.setItem("user", JSON.stringify(merged));
      localStorage.setItem("netology_user", JSON.stringify(merged));
      return merged;
    } catch (err) {
      console.warn("Could not refresh user data:", err);
      return cached;
    }
  }

  // looks up raw course data by id from COURSE_CONTENT
  // DB course IDs are 1-9, matching the COURSE_CONTENT keys directly
  function findRawCourse(courseId) {
    return window.COURSE_CONTENT?.[String(courseId)] || null;
  }

  // turns raw COURSE_CONTENT data into a clean course object
  function loadCourseContent(courseId) {
    const raw = findRawCourse(courseId);
    if (!raw) return null;

    const modules = (raw.units || []).map((unit, unitIdx) => ({
      id: `unit-${unitIdx}`,
      title: unit.title || "Module",
      description: unit.about || "",
      items: buildItems(unit, unitIdx)
    }));

    return {
      id: String(courseId),
      title: raw.title || "Untitled Course",
      description: raw.description || "",
      difficulty: String(raw.difficulty || "novice").toLowerCase(),
      requiredLevel: Number(raw.required_level || 1),
      estimatedTime: raw.estimatedTime || "—",
      totalXP: Number(raw.xpReward || 0),
      modules
    };
  }

  // builds the item list for one unit from the new flat structure:
  // unit.lessons[], unit.quiz, unit.sandbox, unit.challenge
  function buildItems(unit, unitIdx) {
    const items = [];

    (unit.lessons || []).forEach((lesson, lessonIdx) => {
      items.push({
        type: "learn",
        title: lesson.title || `Lesson ${lessonIdx + 1}`,
        xpReward: Number(lesson.xp || 0),
        unitIdx,
        lessonIdx,
        unitTitle: unit.title || ""
      });
    });

    if (unit.quiz) {
      items.push({
        type: "quiz",
        title: unit.quiz.title || "Quiz",
        xpReward: Number(unit.quiz.xp || 0),
        unitIdx,
        lessonIdx: null,
        unitTitle: unit.title || ""
      });
    }

    if (unit.sandbox) {
      items.push({
        type: "sandbox",
        title: unit.sandbox.title || "Practice",
        xpReward: Number(unit.sandbox.xp || 0),
        unitIdx,
        lessonIdx: null,
        unitTitle: unit.title || "",
        steps: unit.sandbox.steps || [],
        tips: unit.sandbox.tips || ""
      });
    }

    if (unit.challenge) {
      items.push({
        type: "challenge",
        title: unit.challenge.title || "Challenge",
        xpReward: Number(unit.challenge.xp || 0),
        unitIdx,
        lessonIdx: null,
        unitTitle: unit.title || "",
        challengeRules: unit.challenge
      });
    }

    return items;
  }

  // hooks up the logo/brand links
  function setupBranding() {
    const user = getUser();
    const page = (user?.email || user?.username) ? "dashboard.html" : "index.html";

    const top = document.getElementById("brandHome");
    const side = document.getElementById("sideBrandHome");
    const back = document.getElementById("backLink");

    if (top) top.setAttribute("href", page);
    if (side) side.setAttribute("href", page);
    if (back) back.setAttribute("href", page);
  }

  // hooks up the sidebar open/close buttons
  function setupSidebar() {
    const openBtn = document.getElementById("openSidebarBtn");
    const closeBtn = document.getElementById("closeSidebarBtn");
    const sidebar = document.getElementById("slideSidebar");
    const backdrop = document.getElementById("sideBackdrop");

    const open = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
    };

    const close = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
    };

    if (openBtn) openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sidebar?.classList.contains("is-open")) close();
    });
  }

  // hooks up the user dropdown menu
  function setupDropdown() {
    const btn = document.getElementById("userBtn");
    const menu = document.getElementById("userDropdown");
    if (!btn || !menu) return;

    const close = () => {
      menu.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    };

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !btn.contains(e.target)) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  // hooks up the logout buttons
  function setupLogout() {
    const logout = () => {
      localStorage.removeItem("netology_user");
      localStorage.removeItem("user");
      localStorage.removeItem("netology_token");
      window.location.href = "index.html";
    };

    const top = document.getElementById("topLogoutBtn");
    const side = document.getElementById("sideLogoutBtn");
    if (top) top.addEventListener("click", logout);
    if (side) side.addEventListener("click", logout);
  }

  // shows the user's name and avatar in the navbar and sidebar
  function showUserInfo(user) {
    const name =
      user?.name ||
      `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
      user?.username ||
      "Student";

    const initial = (name || "S").trim().charAt(0).toUpperCase();

    setText("topAvatar", initial);
    setText("topUserName", name);
    setText("ddName", name);
    setText("ddEmail", user?.email || "");
    setText("sideAvatar", initial);
    setText("sideUserName", name);
    setText("sideUserEmail", user?.email || "");
  }

  // calculates and stores the user's level/xp stats
  function loadUserStats(user) {
    const level = user?.numeric_level || user?.level || 1;
    const xp = Number(user?.xp || 0);

    if (XP_SYSTEM) {
      const info = XP_SYSTEM.getLevelInfo?.(level) || {};
      const levelXP = info.xpToLevel || 0;
      const nextXP = info.xpToNext || 1000;
      const progress = xp - levelXP;
      const percent = Math.round((progress / nextXP) * 100);

      state.stats = {
        level,
        rank: info.rank || "Novice",
        xp,
        currentLevelXP: progress,
        xpPercent: Math.min(100, Math.max(0, percent)),
        accessLevel: info.level || 1
      };
    }
  }

  // collects all items from every module into one flat list
  function getAllItems() {
    const items = [];
    for (const mod of state.course.modules) items.push(...mod.items);
    return items;
  }

  // checks if a single item is completed
  // DB stores completions keyed by unitIdx+1 (unit 0 → lesson_number 1)
  function isDone(item) {
    const key = item.unitIdx + 1;
    return (
      state.completed.lesson.has(key) ||
      state.completed.quiz.has(key) ||
      state.completed.challenge.has(key)
    );
  }

  // counts how many items in a module are done
  function countDone(mod) {
    return mod.items.filter(item => isDone(item)).length;
  }

  // calculates overall course progress
  function getProgress() {
    const all = getAllItems();
    if (!all.length) return { percent: 0, completed: 0, total: 0, earnedXP: 0 };

    let completed = 0;
    let earnedXP = 0;
    for (const item of all) {
      if (isDone(item)) {
        completed++;
        earnedXP += Number(item.xpReward || 0);
      }
    }

    const percent = Math.round((completed / all.length) * 100);
    return { percent, completed, total: all.length, earnedXP };
  }

  // loads which lessons/quizzes/challenges the user has finished
  async function loadCompletion() {
    const user = state.user;
    if (!user?.email || !state.courseId) return;

    try {
      const path = ENDPOINTS.courses?.userCourseStatus || "/user-course-status";
      const url = `${API_BASE}${path}?email=${encodeURIComponent(user.email)}&course_id=${state.courseId}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data?.success) {
        state.completed.lesson = new Set((data.lessons || []).map(Number));
        state.completed.quiz = new Set((data.quizzes || []).map(Number));
        state.completed.challenge = new Set((data.challenges || []).map(Number));
      }
    } catch (err) {
      console.warn("Could not load completion status:", err);
    }
  }

  // renders the course title, difficulty, stats, and progress ring
  function renderHeader() {
    const course = state.course;

    setText("courseTitle", course.title || "Course");
    setText("courseDescription", course.description || "");
    setText("breadcrumbCourse", course.title || "Course");

    // difficulty pill
    const pill = document.getElementById("difficultyPill");
    if (pill) {
      const label = (course.difficulty || "novice");
      pill.textContent = label.charAt(0).toUpperCase() + label.slice(1);
      pill.className = `crs-pill crs-${label}`;
    }

    // stats strip
    const modCount = course.modules.length;
    const plural = modCount !== 1 ? "s" : "";
    setText("metaModules", `${modCount} module${plural}`);
    setText("metaTime", course.estimatedTime || "—");
    setText("metaXP", `${course.totalXP} XP`);
    setText("moduleCountLabel", `${modCount} module${plural}`);

    const progress = getProgress();
    renderProgress(progress);
    renderUpNext(progress);
  }

  // shortcut to toggle d-none on an element by id
  function toggle(id, hide) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("d-none", hide);
  }

  // fills in the progress ring, bar, and locked/active/completed pills
  function renderProgress(progress) {
    const pct = progress.percent;

    const ring = document.getElementById("progressRing");
    if (ring) ring.style.strokeDashoffset = String(314.16 - (pct / 100) * 314.16);

    setText("progressPct", `${pct}%`);
    setText("progressText", `${pct}%`);
    setText("progressCount", `${progress.completed}/${progress.total}`);

    const bar = document.getElementById("progressBar");
    if (bar) bar.style.width = `${pct}%`;

    const userLevel = state.stats.accessLevel || state.user?.numeric_level || 1;
    const required = state.course.requiredLevel || 1;
    const locked = Number(userLevel) < Number(required);

    toggle("courseLockedPill", !locked);
    toggle("courseActivePill", locked || pct === 0 || pct === 100);
    toggle("courseCompletedPill", pct < 100);
    toggle("lockedExplainer", !locked);
    if (locked) setText("lockedText", `Requires Level ${required} to unlock.`);
  }

  // shows what lesson is up next and wires continue/review buttons
  function renderUpNext(progress) {
    const all = getAllItems();
    const next = all.find(item => !isDone(item));
    const done = progress.percent === 100;

    setText("nextStepText", next ? next.title : "All done!");
    setText("sidePct", `${progress.percent}%`);
    setText("sideModules", `${state.course.modules.length}/${state.course.modules.length}`);
    setText("sideXPEarned", String(progress.earnedXP));

    const continueBtn = document.getElementById("continueBtn");
    if (continueBtn) continueBtn.onclick = () => { if (next || all[0]) openLesson(next || all[0]); };

    const reviewBtn = document.getElementById("reviewBtn");
    if (reviewBtn) {
      toggle("reviewBtn", !done);
      if (done) reviewBtn.onclick = () => openLesson(all[0]);
    }
  }

  // renders the module tabs and the first module's panel
  function renderModules() {
    const tabs = document.getElementById("moduleTabs");
    const panel = document.getElementById("modulePanel");
    if (!tabs || !panel) return;

    tabs.replaceChildren();
    panel.replaceChildren();

    const modules = state.course.modules;
    if (!modules.length) {
      toggle("modulesEmpty", false);
      return;
    }

    // default to the first incomplete module
    const incomplete = modules.findIndex(m => countDone(m) < m.items.length);
    const activeIndex = incomplete >= 0 ? incomplete : 0;

    // build tab buttons
    modules.forEach((mod, i) => {
      const done = countDone(mod);
      const total = mod.items.length;
      const allDone = done === total;

      const btn = newEl("button", "crs-mod-tab");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
      btn.dataset.index = String(i);
      if (i === activeIndex) btn.classList.add("is-active");

      btn.appendChild(newEl("span", "crs-mod-tab-label", `Module ${i + 1}`));
      btn.appendChild(newEl("span", `crs-mod-tab-count${allDone ? " is-done" : ""}`, `${done}/${total}`));
      btn.addEventListener("click", () => selectModule(i));
      tabs.appendChild(btn);
    });

    showModulePanel(activeIndex);
  }

  // highlights the clicked tab and shows its panel
  function selectModule(index) {
    const tabs = document.getElementById("moduleTabs");
    if (tabs) {
      tabs.querySelectorAll(".crs-mod-tab").forEach((btn, i) => {
        const active = i === index;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", String(active));
      });
    }
    showModulePanel(index);
  }

  // renders one module's header and lesson list into the panel
  function showModulePanel(index) {
    const panel = document.getElementById("modulePanel");
    if (!panel) return;

    const mod = state.course.modules[index];
    if (!mod) return;

    panel.replaceChildren();

    const done = countDone(mod);
    const total = mod.items.length;

    // header
    const header = newEl("div", "crs-module-header");
    const titleRow = newEl("div", "crs-module-title-row");
    titleRow.appendChild(newEl("h3", "crs-module-title", mod.title));
    titleRow.appendChild(newEl("span", `crs-module-prog${done === total ? " is-done" : ""}`, `${done}/${total} done`));
    header.appendChild(titleRow);
    if (mod.description) header.appendChild(newEl("p", "crs-module-desc", mod.description));
    panel.appendChild(header);

    // lesson rows
    const list = newEl("div", "crs-module-items");
    for (const item of mod.items) list.appendChild(renderLesson(item));
    panel.appendChild(list);
  }

  // tooltip text for each item type badge
  const TYPE_TIPS = {
    learn: "Lesson — read and learn the theory",
    quiz: "Quiz — test your knowledge with questions",
    sandbox: "Sandbox — hands-on network simulation",
    challenge: "Challenge — solve a real networking problem"
  };

  // type labels for the badge
  const TYPE_LABELS = { learn: "Lesson", quiz: "Quiz", sandbox: "Sandbox", challenge: "Challenge" };

  // renders one lesson/quiz/sandbox/challenge row
  function renderLesson(item) {
    const done = isDone(item);
    const url = buildUrl(item);

    const row = newEl("div", `crs-lesson${done ? " is-completed" : ""}`);
    row.appendChild(lessonIcon(item, done));

    // title and meta
    const body = newEl("div", "crs-lesson-body");
    body.appendChild(newEl("div", "crs-lesson-title", item.title));
    body.appendChild(newEl("div", "crs-lesson-meta", `${item.xpReward ? item.xpReward + " XP" : ""}`));
    row.appendChild(body);

    // type badge
    const badge = newEl("span", `crs-lesson-type crs-type--${item.type || "learn"}`, TYPE_LABELS[item.type] || "Lesson");
    badge.title = TYPE_TIPS[item.type] || "Read through this lesson";
    row.appendChild(badge);

    if (done) row.appendChild(icon("bi bi-check2-circle crs-done-tick"));

    // open button (visible on hover)
    const openBtn = newEl("a", "crs-open-btn");
    openBtn.href = url;
    openBtn.title = "Open lesson";
    openBtn.setAttribute("aria-label", `Open ${item.title}`);
    openBtn.appendChild(icon("bi bi-arrow-right"));
    openBtn.addEventListener("click", (e) => e.stopPropagation());
    row.appendChild(openBtn);

    row.addEventListener("click", () => { window.location.href = url; });
    return row;
  }

  // icon class for each item type
  const TYPE_ICONS = { learn: "bi-book-half", quiz: "bi-patch-question-fill", sandbox: "bi-diagram-3", challenge: "bi-flag-fill" };

  // returns the right icon element for a lesson row
  function lessonIcon(item, done) {
    if (done) {
      const wrap = newEl("div", "crs-ico crs-ico--done");
      wrap.appendChild(icon("bi bi-check2-circle"));
      return wrap;
    }
    const wrap = newEl("div", `crs-ico crs-ico--${item.type || "learn"}`);
    wrap.appendChild(icon(`bi ${TYPE_ICONS[item.type] || TYPE_ICONS.learn}`));
    return wrap;
  }

  // saves sandbox/challenge data to localStorage and returns the URL
  function sandboxUrl(courseId, unitIdx, mode, storageKey, extra) {
    const base = {
      courseId,
      unit: unitIdx,
      courseTitle: state.course.title || ""
    };
    try { localStorage.setItem(storageKey, JSON.stringify({ ...base, ...extra })); } catch {}
    const q = new URLSearchParams({ course: courseId, unit: String(unitIdx), mode });
    return `sandbox.html?${q}`;
  }

  // builds the right URL for any item type
  function buildUrl(item) {
    const courseId = String(state.courseId);
    const unitIdx  = item.unitIdx;

    if (item.type === "learn") {
      return `lesson.html?${new URLSearchParams({ course: courseId, unit: String(unitIdx), lesson: String(item.lessonIdx) })}`;
    }

    if (item.type === "quiz") {
      return `quiz.html?${new URLSearchParams({ course: courseId, unit: String(unitIdx) })}`;
    }

    if (item.type === "sandbox") {
      return sandboxUrl(courseId, unitIdx, "practice", "netology_active_tutorial", {
        steps: item.steps || [],
        tips: item.tips || "",
        xp: item.xpReward || 0
      });
    }

    if (item.type === "challenge") {
      return sandboxUrl(courseId, unitIdx, "challenge", "netology_active_challenge", {
        challenge: item.challengeRules || {},
        challengeXp: item.xpReward || 0
      });
    }

    return "courses.html";
  }

  // navigates to a lesson/quiz/sandbox/challenge
  function openLesson(item) {
    window.location.href = buildUrl(item);
  }

  // runs when the page loads
  async function init() {
    const params = new URLSearchParams(window.location.search);
    state.courseId = params.get("id") || params.get("course") || params.get("course_id") || "1";

    const cached = getUser();
    state.user = cached;

    setupBranding();
    setupSidebar();
    setupDropdown();
    setupLogout();

    if (cached?.email || cached?.username) {
      showUserInfo(cached);
      loadUserStats(cached);
    }

    // load course content by id (DB ids 1-9 match COURSE_CONTENT keys)
    const course = loadCourseContent(state.courseId);

    if (course) {
      state.course = course;
    } else {
      console.warn("Could not load course data for id:", state.courseId);
    }

    // get fresh user data from server
    const fresh = await refreshUser();
    state.user = fresh;
    if (fresh) {
      showUserInfo(fresh);
      loadUserStats(fresh);
    }

    await loadCompletion();

    renderHeader();
    renderModules();

    document.body.classList.remove("net-loading");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
