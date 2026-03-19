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
    contentId: null,
    course: {
      id: null,
      title: "",
      description: "",
      difficulty: "novice",
      requiredLevel: 1,
      estimatedTime: "—",
      totalXP: 0,
      totalLessons: 0,
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

  // finds the COURSE_CONTENT key that matches a title
  function findContentKey(title) {
    if (!window.COURSE_CONTENT || !title) return null;
    const lower = String(title).trim().toLowerCase();
    return Object.keys(window.COURSE_CONTENT).find(key => {
      return String(window.COURSE_CONTENT[key]?.title || "").trim().toLowerCase() === lower;
    }) || null;
  }

  // looks up raw course data by id or title from COURSE_CONTENT
  function findRawCourse(courseId, courseTitle) {
    if (!window.COURSE_CONTENT) return null;

    // try direct key match
    if (window.COURSE_CONTENT[String(courseId)]) {
      return window.COURSE_CONTENT[String(courseId)];
    }

    const all = Object.values(window.COURSE_CONTENT);

    // match by the id field inside the object
    const byId = all.find(c => String(c.id) === String(courseId));
    if (byId) return byId;

    // match by title (DB ids can differ from content keys)
    if (courseTitle) {
      const lower = String(courseTitle).trim().toLowerCase();
      const byTitle = all.find(c => String(c.title || "").trim().toLowerCase() === lower);
      if (byTitle) return byTitle;
    }

    return null;
  }

  // turns raw COURSE_CONTENT data into a clean course object
  function loadCourseContent(courseId, courseTitle) {
    const raw = findRawCourse(courseId, courseTitle);
    if (!raw) return null;

    const units = Array.isArray(raw.units) ? raw.units : [];
    const modules = [];
    let lessonNum = 1;

    for (const unit of units) {
      const items = buildItems(unit, lessonNum);
      const learnCount = items.filter(i => i.type === "learn").length;
      lessonNum += learnCount;
      modules.push({
        id: unit.id || `module-${modules.length}`,
        title: unit.title || "Module",
        description: unit.about || "",
        items
      });
    }

    return {
      id: String(courseId),
      title: raw.title || "Untitled Course",
      description: raw.description || "",
      difficulty: String(raw.difficulty || "novice").toLowerCase(),
      requiredLevel: Number(raw.required_level || 1),
      estimatedTime: raw.estimatedTime || raw.estimated_time || "—",
      totalXP: Number(raw.xpReward || raw.total_xp || 0),
      totalLessons: Number(raw.total_lessons || 0),
      modules
    };
  }

  // fetches course title from API, then matches by title in COURSE_CONTENT
  async function loadCourseFromApi(courseId) {
    try {
      const res = await fetch(`${API_BASE}/course?id=${courseId}`);
      const api = await res.json();
      if (!api?.title) return null;

      const course = loadCourseContent(courseId, api.title);
      if (!course) return null;

      course.totalXP = course.totalXP || Number(api.xp_reward || 0);
      course.estimatedTime = course.estimatedTime || api.estimated_time || "—";
      course.totalLessons = course.totalLessons || Number(api.total_lessons || 0);

      const realKey = findContentKey(api.title);
      if (realKey) state.contentId = realKey;

      return course;
    } catch (err) {
      console.warn("Could not fetch course from API:", err);
      return null;
    }
  }

  // turns a unit's sections into a flat list of lesson/quiz/sandbox/challenge items
  function buildItems(unit, startNum) {
    // flatten all sections into one list of entries
    const entries = (unit.sections || []).flatMap(s => s.items || []);

    const items = entries.map(entry => ({
      type: itemType(entry),
      title: entry.title,
      content: entry.content || "",
      duration: entry.duration || "—",
      xpReward: Number(entry.xp || 0),
      lessonNumber: 0,
      unitTitle: unit.title || "",
      unitDescription: unit.about || "",
      challengeRules: entry.challenge || null,
      steps: entry.steps || [],
      tips: entry.tips || "",
      isAutoAssigned: false
    }));

    // assign sequential lesson numbers
    let num = startNum;
    let lastLearn = startNum - 1;

    for (const item of items) {
      if (item.type === "learn") {
        item.lessonNumber = num++;
        item.isAutoAssigned = true;
        lastLearn = item.lessonNumber;
      } else {
        item.lessonNumber = Math.max(1, lastLearn);
        item.isAutoAssigned = true;
      }
    }

    return items;
  }

  // maps a course_content item type to our internal type
  function itemType(entry) {
    const t = String(entry?.type || "").toLowerCase().trim();
    if (t === "quiz") return "quiz";
    if (t === "practice" || t === "sandbox") return "sandbox";
    if (t === "challenge") return "challenge";
    return "learn";
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
  function isDone(item) {
    return (
      state.completed.lesson.has(item.lessonNumber) ||
      state.completed.quiz.has(item.lessonNumber) ||
      state.completed.challenge.has(item.lessonNumber)
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
    if (continueBtn) continueBtn.onclick = () => openLesson(next || all[0]);

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
    body.appendChild(newEl("div", "crs-lesson-meta", `${item.duration} · ${item.xpReward} XP`));
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

  // saves data to localStorage and returns a sandbox URL
  function sandboxUrl(params, storageKey, extra) {
    const base = { courseId: params.courseId, contentId: params.contentId, lesson: params.lesson,
      lessonTitle: params.item.title || "", unitTitle: params.item.unitTitle || "",
      courseTitle: state.course.title || "" };
    try { localStorage.setItem(storageKey, JSON.stringify({ ...base, ...extra })); } catch {}
    return `sandbox.html?${params.query}`;
  }

  // builds the right URL for any item type
  function buildUrl(item) {
    const courseId = String(state.courseId);
    const contentId = String(state.contentId || state.courseId);
    const lesson = String(item.lessonNumber);
    const base = { course_id: courseId, lesson, content_id: contentId };

    if (item.type === "quiz") return `quiz.html?${new URLSearchParams(base)}`;

    if (item.type === "sandbox") {
      return sandboxUrl(
        { courseId, contentId, lesson, item, query: new URLSearchParams({ ...base, mode: "practice" }) },
        "netology_active_tutorial",
        { steps: item.steps || [], tips: item.tips || "", xp: item.xpReward || 0 }
      );
    }

    if (item.type === "challenge") {
      return sandboxUrl(
        { courseId, contentId, lesson, item, query: new URLSearchParams({ ...base, challenge: "1" }) },
        "netology_active_challenge",
        { challenge: item.challengeRules || {}, challengeXp: item.xpReward || 0 }
      );
    }

    // default: lesson page
    const params = new URLSearchParams({ course_id: courseId, lesson });
    if (state.contentId) params.set("content_id", contentId);
    return `lesson.html?${params}`;
  }

  // navigates to a lesson/quiz/sandbox/challenge
  function openLesson(item) {
    window.location.href = buildUrl(item);
  }

  // runs when the page loads
  async function init() {
    const params = new URLSearchParams(window.location.search);
    state.courseId = params.get("id") || params.get("course_id") || "1";
    state.contentId = params.get("content_id") || state.courseId;

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

    // try loading from static content by id first
    let course = loadCourseContent(state.courseId);

    // DB ids can differ from COURSE_CONTENT keys, so fall back to title match
    if (!course) course = await loadCourseFromApi(state.courseId);

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
