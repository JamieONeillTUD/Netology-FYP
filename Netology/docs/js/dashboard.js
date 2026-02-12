/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 09/02/2026

dashboard.js – Dashboard interactions (UPDATED for your latest dashboard.html)

Works with:
- NO topbar search (topSearch removed)
- Course search stays in the Courses section:
    #courseSearch (desktop) + #mobileSearch (mobile)
  These are fully synced.
- Slide sidebar open/close (backdrop + ESC)
- User dropdown toggle + click outside + ESC
- Brand routing: dashboard if logged in, index if not
- Course lock gating by numeric_level:
    novice unlocked at level >= 1
    intermediate unlocked at level >= 3
    advanced unlocked at level >= 5
- Welcome/Sidebar UI fill:
    sets name, email, avatar initial, level, XP bar, and updates the ring (#welcomeRing)
- Continue Learning:
    picks first unlocked course (simple but always works)
- Courses grid:
    shows unlocked courses as normal, locked courses show "Unlock at Level X" and are not clickable
*/

(function () {
  // AI Prompt: Explain the Helpers section in clear, simple terms.
  // -----------------------------
  // Helpers
  // -----------------------------
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
  const BASE_XP = 100;
  const COURSE_CACHE_TTL = 5 * 60 * 1000;
  const COURSE_CACHE_VERSION = "db-only-v1";

  function parseJsonSafe(str, fallback) {
    // LocalStorage can contain invalid JSON; fail gracefully.
    try { return JSON.parse(str); } catch { return fallback; }
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;");
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  const __dashErrors = [];
  function reportError(label, err) {
    __dashErrors.push({ label, err });
    console.error(`[dashboard] ${label}`, err);
  }

  function safeStep(label, fn) {
    try { return fn(); }
    catch (e) { reportError(label, e); return null; }
  }

  async function safeStepAsync(label, fn) {
    try { return await fn(); }
    catch (e) { reportError(label, e); return null; }
  }

  async function fetchJson(url) {
    // Simple JSON fetch helper with no-store to avoid stale results.
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function getCachedCourseIndex() {
    // Small, time-boxed cache to speed up dashboard first paint.
    try {
      const ver = localStorage.getItem("netology_courses_cache_v");
      if (ver !== COURSE_CACHE_VERSION) return { index: null, fresh: false };
      const raw = localStorage.getItem("netology_courses_cache");
      const ts = Number(localStorage.getItem("netology_courses_cache_ts") || 0);
      const index = raw ? JSON.parse(raw) : null;
      if (!index || typeof index !== "object") return { index: null, fresh: false };
      const fresh = ts && (Date.now() - ts < COURSE_CACHE_TTL);
      return { index, fresh };
    } catch {
      return { index: null, fresh: false };
    }
  }

  function setCachedCourseIndex(index) {
    try {
      localStorage.setItem("netology_courses_cache", JSON.stringify(index));
      localStorage.setItem("netology_courses_cache_ts", String(Date.now()));
      localStorage.setItem("netology_courses_cache_v", COURSE_CACHE_VERSION);
    } catch {}
  }

  function getCurrentUser() {
    return (
      parseJsonSafe(localStorage.getItem("netology_user"), null) ||
      parseJsonSafe(localStorage.getItem("user"), null) ||
      null
    );
  }

  function isLoggedIn() {
    const u = getCurrentUser();
    return !!(u && (u.email || u.username || u.name));
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

  function userNumericLevel(user) {
    const serverLevel = Number(user?.numeric_level);
    if (Number.isFinite(serverLevel) && serverLevel > 0) return serverLevel;
    const totalXP = Number(user?.xp) || 0;
    return levelFromXP(totalXP);
  }

  function getUserRank(user) {
    const raw = String(user?.unlock_tier || user?.rank || user?.level_name || user?.level || "novice").toLowerCase();
    if (raw.includes("advanced")) return "Advanced";
    if (raw.includes("intermediate")) return "Intermediate";
    return "Novice";
  }

  function computeXP(user) {
    // Converts total XP into level + progress for UI display.
    const totalXP = Number(user?.xp) || 0;
    const serverLevel = Number(user?.numeric_level);
    const xpInto = Number(user?.xp_into_level);
    const nextXp = Number(user?.next_level_xp);
    const fallbackLevel = levelFromXP(totalXP);
    const level = Number.isFinite(serverLevel) && serverLevel > 0 ? serverLevel : fallbackLevel;
    if (Number.isFinite(xpInto) && Number.isFinite(nextXp) && nextXp > 0) {
      const progressPct = Math.max(0, Math.min(100, (xpInto / nextXp) * 100));
      const toNext = Math.max(0, nextXp - xpInto);
      return { totalXP, currentLevelXP: xpInto, xpNext: nextXp, progressPct, toNext, level };
    }
    const levelStart = totalXpForLevel(level);
    const currentLevelXP = Math.max(0, totalXP - levelStart);
    const xpNext = xpForNextLevel(level);
    const progressPct = Math.max(0, Math.min(100, (currentLevelXP / Math.max(xpNext, 1)) * 100));
    const toNext = Math.max(0, xpNext - currentLevelXP);
    return { totalXP, currentLevelXP, xpNext, progressPct, toNext, level };
  }

  function difficultyRequiredLevel(diff) {
    if (diff === "novice") return 1;
    if (diff === "intermediate") return 3;
    if (diff === "advanced") return 5;
    return 1;
  }

  function unlockLevelFromTier(tier) {
    const t = String(tier || "").toLowerCase();
    if (t.includes("advanced")) return 5;
    if (t.includes("intermediate")) return 3;
    return 1;
  }

  function prettyDiff(diff) {
    if (!diff) return "Novice";
    return diff.charAt(0).toUpperCase() + diff.slice(1);
  }

  // AI Prompt: Explain the Login streak + badges section in clear, simple terms.
  // -----------------------------
  // Login streak + badges
  // -----------------------------
  function dateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function getLoginLog(email) {
    const raw = localStorage.getItem(`netology_login_log:${email}`);
    return parseJsonSafe(raw, []);
  }

  function saveLoginLog(email, log) {
    localStorage.setItem(`netology_login_log:${email}`, JSON.stringify(log));
  }

  function recordLoginDay(email) {
    if (!email) return { log: [], isNew: false };
    const log = getLoginLog(email);
    const today = dateKey();
    let isNew = false;
    if (!log.includes(today)) {
      log.push(today);
      log.sort();
      saveLoginLog(email, log);
      isNew = true;
    }
    return { log, isNew };
  }

  async function syncLoginLog(email) {
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (!email || !base) return null;
    try {
      const res = await fetch(`${base}/record-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!data || !data.success || !Array.isArray(data.log)) return null;
      saveLoginLog(email, data.log);
      return { log: data.log, isNew: !!data.is_new };
    } catch {
      return null;
    }
  }

  function computeLoginStreak(log) {
    if (!Array.isArray(log) || !log.length) return 0;
    const set = new Set(log);
    let streak = 0;
    const cursor = new Date();
    while (set.has(dateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function getBadges(email) {
    if (Array.isArray(window.__dashAchievements)) return window.__dashAchievements;
    const raw = parseJsonSafe(localStorage.getItem(`netology_badges:${email}`), []);
    return Array.isArray(raw) ? raw : [];
  }

  function setBadgesCache(list) {
    window.__dashAchievements = Array.isArray(list) ? list : [];
  }

  async function fetchAchievements(email) {
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (!email || !base) return [];
    try {
      const data = await fetchJson(`${base}/user-achievements?email=${encodeURIComponent(email)}`);
      if (!data || !data.success) return getBadges(email);
      setBadgesCache(data.achievements || []);
      return getBadges(email);
    } catch {
      return getBadges(email);
    }
  }

  async function awardAchievementRemote(email, def) {
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (!email || !base) return { awarded: false };
    try {
      const res = await fetch(`${base}/award-achievement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          achievement_id: def.id,
          name: def.title,
          description: def.desc,
          tier: def.tier || "bronze",
          xp: def.xp || 0
        })
      });
      const data = await res.json();
      if (data && data.success && data.awarded) {
        const updated = getBadges(email).slice();
        updated.push({
          id: def.id,
          name: def.title,
          description: def.desc,
          tier: def.tier || "bronze",
          xp: def.xp || 0,
          earned_at: new Date().toISOString()
        });
        setBadgesCache(updated);
      }
      return data || { awarded: false };
    } catch {
      return { awarded: false };
    }
  }

  function bumpUserXP(email, delta) {
    if (!delta) return;
    const rawUser = parseJsonSafe(localStorage.getItem("user"), null);
    if (rawUser && rawUser.email === email) {
      rawUser.xp = Math.max(0, Number(rawUser.xp || 0) + delta);
      localStorage.setItem("user", JSON.stringify(rawUser));
    }
    const rawNet = parseJsonSafe(localStorage.getItem("netology_user"), null);
    if (rawNet && rawNet.email === email) {
      rawNet.xp = Math.max(0, Number(rawNet.xp || 0) + delta);
      localStorage.setItem("netology_user", JSON.stringify(rawNet));
    }
  }

  function loginBadgeDefs() {
    return [
      { id: "login-streak-3", title: "3-Day Streak", desc: "Log in 3 days in a row", icon: "bi-fire", type: "login", target: 3, xp: 50, tier: "bronze" },
      { id: "login-streak-5", title: "5-Day Streak", desc: "Log in 5 days in a row", icon: "bi-fire", type: "login", target: 5, xp: 75, tier: "silver" },
      { id: "login-streak-7", title: "7-Day Streak", desc: "Log in 7 days in a row", icon: "bi-fire", type: "login", target: 7, xp: 100, tier: "gold" },
      { id: "login-streak-10", title: "10-Day Streak", desc: "Log in 10 days in a row", icon: "bi-fire", type: "login", target: 10, xp: 150, tier: "gold" }
    ];
  }

  async function awardLoginStreakBadges(email, streak) {
    if (!email) return;
    const defs = loginBadgeDefs();
    const badges = getBadges(email);
    const earned = new Set(badges.map((b) => b.id));

    for (const def of defs) {
      if (streak >= def.target && !earned.has(def.id)) {
        const result = await awardAchievementRemote(email, {
          id: def.id,
          title: def.title,
          desc: def.desc,
          tier: def.tier || "bronze",
          xp: def.xp
        });
        if (result?.awarded) {
          earned.add(def.id);
          bumpUserXP(email, def.xp);
        }
      }
    }
  }

  // Welcome ring
  // Your HTML uses the course-style ring (r=58, dasharray ~364.42)
  function setWelcomeRing(progressPct) {
    const ring = getById("welcomeRing");
    if (!ring) return;
    const track = ring.parentElement?.querySelector(".net-ring-track");

    const r = 58;
    const CIRC = 2 * Math.PI * r; // ~364.42
    const arc = 0.5; // 180deg arc (clear rainbow-style arch)
    const dash = CIRC * arc;
    const gap = CIRC - dash;
    const pct = Math.max(0, Math.min(100, Number(progressPct) || 0));
    const offset = dash * (1 - (pct / 100));

    const dashArray = `${dash.toFixed(2)} ${gap.toFixed(2)}`;
    ring.style.strokeDasharray = dashArray;
    ring.style.strokeDashoffset = `${offset.toFixed(2)}`;

    if (track) {
      track.style.strokeDasharray = dashArray;
      track.style.strokeDashoffset = "0";
    }
  }

  // AI Prompt: Explain the Brand routing (dashboard vs index) section in clear, simple terms.
  // -----------------------------
  // Brand routing (dashboard vs index)
  // -----------------------------
  function wireBrandRouting() {
    const topBrand = getById("topBrand");
    const sideBrand = getById("sideBrand");
    const target = isLoggedIn() ? "dashboard.html" : "index.html";

    if (topBrand) topBrand.setAttribute("href", target);
    if (sideBrand) sideBrand.setAttribute("href", target);
  }

  // AI Prompt: Explain the Sidebar section in clear, simple terms.
  // -----------------------------
  // Sidebar
  // -----------------------------
  function setupSidebar() {
    // Slide-in sidebar (backdrop + ESC to close).
    const openBtn = getById("openSidebarBtn");
    const closeBtn = getById("closeSidebarBtn");
    const sidebar = getById("slideSidebar");
    const backdrop = getById("sideBackdrop");

    function open() {
      if (!sidebar || !backdrop) return;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
      sidebar.setAttribute("aria-hidden", "false");
      backdrop.setAttribute("aria-hidden", "false");
    }

    function close() {
      if (!sidebar || !backdrop) return;
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
      sidebar.setAttribute("aria-hidden", "true");
      backdrop.setAttribute("aria-hidden", "true");
    }

    openBtn?.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    backdrop?.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    return { open, close };
  }

  // AI Prompt: Explain the User dropdown section in clear, simple terms.
  // -----------------------------
  // User dropdown
  // -----------------------------
  function setupUserDropdown() {
    // User dropdown toggle with outside-click + ESC close.
    const btn = getById("userBtn");
    const dd = getById("userDropdown");

    function open() {
      if (!btn || !dd) return;
      dd.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
    }

    function close() {
      if (!btn || !dd) return;
      dd.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }

    btn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!dd) return;
      dd.classList.contains("is-open") ? close() : open();
    });

    document.addEventListener("click", () => close());
    dd?.addEventListener("click", (e) => e.stopPropagation());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    return { open, close };
  }

  // AI Prompt: Explain the Logout section in clear, simple terms.
  // -----------------------------
  // Logout
  // -----------------------------
  function setupLogout() {
    const topLogout = getById("topLogoutBtn");
    const sideLogout = getById("sideLogoutBtn");

    function doLogout() {
      localStorage.removeItem("netology_user");
      localStorage.removeItem("user");
      localStorage.removeItem("netology_token");
      window.location.href = "index.html";
    }

    topLogout?.addEventListener("click", doLogout);
    sideLogout?.addEventListener("click", doLogout);
  }

  // AI Prompt: Explain the Courses data (from API / cache) section in clear, simple terms.
  // -----------------------------
  // Courses data (from API / cache)
  // -----------------------------
  function getCourseIndex() {
    if (window.__dashCourseIndex && Object.keys(window.__dashCourseIndex).length) {
      return window.__dashCourseIndex;
    }
    const cached = getCachedCourseIndex();
    if (cached.index) return cached.index;
    return {};
  }

  function mergeCourseWithContent(apiCourse) {
    const id = String(apiCourse.id || "");
    const difficulty = (apiCourse.difficulty || "novice").toLowerCase();
    const required_level = Number(apiCourse.required_level || 0) || difficultyRequiredLevel(difficulty);

    return {
      key: id,
      id,
      title: apiCourse.title || "Course",
      description: apiCourse.description || "",
      difficulty,
      required_level,
      xpReward: Number(apiCourse.xpReward || apiCourse.xp_reward || 0) || 0,
      items: Number(apiCourse.total_lessons || apiCourse.totalLessons || 0) || 0,
      category: apiCourse.category || "Core",
      estimated_time: apiCourse.estimatedTime || apiCourse.estimated_time || "—",
      total_lessons: Number(apiCourse.total_lessons || apiCourse.totalLessons || 0) || 0
    };
  }

  async function fetchCoursesFromApi() {
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (!base) return [];

    try {
      const data = await fetchJson(`${base}/courses`);
      if (!data || !data.success || !Array.isArray(data.courses)) return [];

      const index = {};
      data.courses.forEach((c) => {
        const id = String(c.id || "");
        if (!id) return;
        index[id] = {
          id,
          title: c.title || "",
          description: c.description || "",
          difficulty: (c.difficulty || "novice").toLowerCase(),
          category: c.category || "",
          xpReward: Number(c.xp_reward || c.xpReward || 0) || 0,
          total_lessons: Number(c.total_lessons || c.totalLessons || 0) || 0,
          required_level: Number(c.required_level || 0) || 0,
          estimated_time: c.estimated_time || c.estimatedTime || "—"
        };
      });

      window.__dashCourseIndex = index;
      setCachedCourseIndex(index);
      return Object.keys(index).map((k) => index[k]);
    } catch {
      return [];
    }
  }

  async function fetchContinueCourses(email) {
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (!base || !email) return null;
    try {
      const data = await fetchJson(`${base}/user-courses?email=${encodeURIComponent(email)}`);
      if (!data || !data.success || !Array.isArray(data.courses)) return null;
      return data.courses.filter((c) => c.status === "in-progress");
    } catch {
      return null;
    }
  }

  async function fetchProgressSummary(email) {
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (!base || !email) return null;
    try {
      const data = await fetchJson(`${base}/user-progress-summary?email=${encodeURIComponent(email)}`);
      if (!data || !data.success) return null;
      const summary = {
        email,
        lessonsDone: Number(data.lessons_done || 0),
        quizzesDone: Number(data.quizzes_done || 0),
        challengesDone: Number(data.challenges_done || 0),
        coursesDone: Number(data.courses_done || 0),
        inProgress: Number(data.in_progress || 0),
        totalCourses: Number(data.total_courses || 0)
      };
      window.__dashProgressSummary = summary;
      return summary;
    } catch {
      return null;
    }
  }

  function getCoursesFromContent() {
    const cc = getCourseIndex();
    const list = [];

    for (const key of Object.keys(cc)) {
      const c = cc[key] || {};
      const id = c.id || key;
      const title = c.title || "Course";
      const description = c.description || c.about || "";
      const difficulty = (c.difficulty || "novice").toLowerCase();
      const required_level = Number(c.required_level) || difficultyRequiredLevel(difficulty);

      const items = countRequiredItems(c);

      const xpReward = Number(c.xpReward || c.xp_reward || c.totalXP || 0) || 0;
      const category = c.category || "";
      const estimatedTime = c.estimatedTime || "—";

      list.push({
        key,
        id,
        title,
        description,
        difficulty,
        required_level,
        xpReward,
        items,
        category,
        estimatedTime,
      });
    }

    const rank = { novice: 1, intermediate: 2, advanced: 3 };
    list.sort((a, b) => (rank[a.difficulty] - rank[b.difficulty]) || a.title.localeCompare(b.title));
    return list;
  }

  /* AI Prompt: Explain the Progress + Completions (local) section in clear, simple terms. */
  /* -----------------------------
     Progress + Completions (local)
  ----------------------------- */
  function mapItemType(sectionType, item) {
    const st = String(sectionType || "").toLowerCase();
    if (st.includes("quiz")) return "quiz";
    if (st.includes("challenge")) return "challenge";
    if (st.includes("practice") || st.includes("sandbox") || st.includes("hands-on")) return "sandbox";

    const t = String(item?.type || "").toLowerCase();
    if (t === "quiz") return "quiz";
    if (t === "challenge") return "challenge";
    if (t === "sandbox" || t === "practice") return "sandbox";
    return "learn";
  }

  function countRequiredItems(course) {
    if (!course) return 0;
    const total = Number(course.total_lessons || course.totalLessons || course.items || 0) || 0;
    if (total > 0) return total;
    const units = course.units || course.modules || [];
    let required = 0;

    units.forEach((u) => {
      if (Array.isArray(u?.sections)) {
        u.sections.forEach((s) => {
          const st = String(s?.type || s?.kind || s?.title || "").toLowerCase();
          const items = s?.items || s?.lessons || [];
          if (!Array.isArray(items)) return;
          items.forEach((it) => {
            const t = mapItemType(st, it);
            if (t === "learn" || t === "quiz" || t === "challenge") required += 1;
          });
        });
      } else if (u?.sections && typeof u.sections === "object") {
        const obj = u.sections;
        const learnArr = obj.learn || obj.lesson || obj.lessons || [];
        const quizArr = obj.quiz || obj.quizzes || [];
        const challengeArr = obj.challenge || obj.challenges || [];
        required += (learnArr.length || 0);
        required += (quizArr.length || 0);
        required += (challengeArr.length || 0);
      } else if (Array.isArray(u?.lessons)) {
        u.lessons.forEach((it) => {
          const t = mapItemType("", it);
          if (t === "learn" || t === "quiz" || t === "challenge") required += 1;
        });
      }
    });

    return required;
  }

  function getCourseContentById(courseId) {
    if (typeof COURSE_CONTENT === "undefined") return null;
    return COURSE_CONTENT[String(courseId)] || null;
  }

  function getCourseCompletionsLocal(email, courseId) {
    if (!email || !courseId) {
      return { lesson: new Set(), quiz: new Set(), challenge: new Set() };
    }
    const raw = localStorage.getItem(`netology_completions:${email}:${courseId}`);
    const payload = parseJsonSafe(raw, {}) || {};
    const lessonArr = payload.lesson || payload.lessons || payload.learn || [];
    const quizArr = payload.quiz || payload.quizzes || [];
    const chArr = payload.challenge || payload.challenges || [];

    const base = {
      lesson: new Set((lessonArr || []).map(Number)),
      quiz: new Set((quizArr || []).map(Number)),
      challenge: new Set((chArr || []).map(Number))
    };

    // Fallback: merge from progress log if completion sets are empty
    const log = getProgressLog(email);
    if (Array.isArray(log) && log.length) {
      log.forEach((e) => {
        if (String(e?.course_id) !== String(courseId)) return;
        const t = String(e?.type || "").toLowerCase();
        const n = Number(e?.lesson_number);
        if (!Number.isFinite(n)) return;
        if (t === "learn" || t === "lesson") base.lesson.add(n);
        else if (t === "quiz") base.quiz.add(n);
        else if (t === "challenge") base.challenge.add(n);
      });
    }

    return base;
  }

  function computeCourseProgress(course, email) {
    if (!course || !email) return { done: 0, total: 0, pct: 0 };
    const id = course.id || course.key;
    const content = getCourseContentById(id);
    const completions = getCourseCompletions(email, id);

    let total = 0;
    let done = 0;

    if (content) {
      total = countRequiredItems(content);
      done = completions.lesson.size + completions.quiz.size + completions.challenge.size;
    } else {
      total = Number(course.total_lessons || course.items || 0) || 0;
      done = completions.lesson.size;
    }

    if (!total) return { done, total, pct: 0 };
    done = Math.min(done, total);
    const pct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
    return { done, total, pct };
  }

  function renderCourseProgress(progress) {
    const pct = Number(progress?.pct || 0);
    const wrap = document.createElement("div");
    wrap.className = "net-course-progress";

    const row = document.createElement("div");
    row.className = "d-flex align-items-center justify-content-between small text-muted mb-2";

    const label = document.createElement("span");
    label.textContent = "Course progress";
    const pctEl = document.createElement("span");
    pctEl.className = "fw-semibold";
    pctEl.textContent = `${pct}%`;

    row.append(label, pctEl);

    const meter = document.createElement("div");
    meter.className = "net-meter";
    meter.setAttribute("role", "progressbar");
    meter.setAttribute("aria-valuenow", String(pct));
    meter.setAttribute("aria-valuemin", "0");
    meter.setAttribute("aria-valuemax", "100");

    const fill = document.createElement("div");
    fill.className = "net-meter-fill";
    fill.style.width = `${pct}%`;
    meter.appendChild(fill);

    wrap.append(row, meter);
    return wrap;
  }

  function getLocalProgressSummary(email) {
    const content = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) ? COURSE_CONTENT : {};
    const courseIds = Object.keys(content);
    const started = getStartedCourses(email);
    const startedIds = new Set((started || []).map((c) => String(c.id)));

    let lessonsDone = 0;
    let quizzesDone = 0;
    let challengesDone = 0;
    let coursesDone = 0;
    let inProgress = 0;

    courseIds.forEach((id) => {
      const course = content[id] || {};
      const comps = getCourseCompletionsLocal(email, id);
      const done = comps.lesson.size + comps.quiz.size + comps.challenge.size;
      const required = countRequiredItems(course);

      lessonsDone += comps.lesson.size;
      quizzesDone += comps.quiz.size;
      challengesDone += comps.challenge.size;

      if (required > 0 && done >= required) {
        coursesDone += 1;
      } else if (startedIds.has(String(id)) || done > 0) {
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

  function getCourseCompletions(email, courseId) {
    if (!email || !courseId) {
      return { lesson: new Set(), quiz: new Set(), challenge: new Set() };
    }
    const raw = localStorage.getItem(`netology_completions:${email}:${courseId}`);
    const payload = parseJsonSafe(raw, {}) || {};
    const lessonArr = payload.lesson || payload.lessons || payload.learn || [];
    const quizArr = payload.quiz || payload.quizzes || [];
    const chArr = payload.challenge || payload.challenges || [];

    const base = {
      lesson: new Set((lessonArr || []).map(Number)),
      quiz: new Set((quizArr || []).map(Number)),
      challenge: new Set((chArr || []).map(Number))
    };

    // Fallback: merge from progress log if completion sets are empty
    const log = getProgressLog(email);
    if (Array.isArray(log) && log.length) {
      log.forEach((e) => {
        if (String(e?.course_id) !== String(courseId)) return;
        const t = String(e?.type || "").toLowerCase();
        const n = Number(e?.lesson_number);
        if (!Number.isFinite(n)) return;
        if (t === "learn" || t === "lesson") base.lesson.add(n);
        else if (t === "quiz") base.quiz.add(n);
        else if (t === "challenge") base.challenge.add(n);
      });
    }

    return base;
  }

  function getProgressLog(email) {
    if (!email) return [];
    return parseJsonSafe(localStorage.getItem(`netology_progress_log:${email}`), []) || [];
  }

  function getStartedCourses(email) {
    if (!email) return [];
    const raw = localStorage.getItem(`netology_started_courses:${email}`);
    const list = parseJsonSafe(raw, []) || [];
    return Array.isArray(list) ? list : [];
  }

  function computeStreak(log) {
    if (!log.length) return 0;
    const days = new Set(log.map(e => e.date).filter(Boolean));
    let streak = 0;
    const d = new Date();
    for (;;) {
      const key = d.toISOString().slice(0, 10);
      if (!days.has(key)) break;
      streak += 1;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function countInLastDays(log, days, type) {
    if (!log.length) return 0;
    const now = Date.now();
    const windowMs = days * 24 * 60 * 60 * 1000;
    return log.filter(e => e?.type === type && (now - Number(e.ts || 0)) <= windowMs).length;
  }

  function formatRelative(ts) {
    const diff = Date.now() - Number(ts || 0);
    if (!Number.isFinite(diff) || diff < 0) return "";
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min} min ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  async function fetchRecentActivity(email) {
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (!email || !base) return null;
    try {
      const data = await fetchJson(`${base}/recent-activity?email=${encodeURIComponent(email)}&limit=8`);
      if (!data || !data.success) return null;
      return Array.isArray(data.activity) ? data.activity : [];
    } catch {
      return null;
    }
  }

  function getCourseTitleById(courseId) {
    const fromIndex = getCourseIndex();
    const fromContent = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) ? COURSE_CONTENT : {};
    const match = fromIndex[String(courseId)] || fromContent[String(courseId)] || {};
    return match.title || "Course";
  }

  async function renderRecentActivity() {
    const list = getById("recentActivityList");
    if (!list) return;
    const user = getCurrentUser();
    const email = user?.email;
    if (!email) {
      clearChildren(list);
      list.appendChild(makeEl("div", "small text-muted", "Sign in to see your recent activity."));
      return;
    }

    const log = getLoginLog(email);
    const streak = computeLoginStreak(log);
    const days = [];
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - 6);
    for (let i = 0; i < 7; i += 1) {
      const key = dateKey(cursor);
      days.push({
        key,
        label: cursor.toLocaleDateString(undefined, { weekday: "short" }),
        active: log.includes(key)
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const apiRecent = await fetchRecentActivity(email);
    const activityItems = [];

    if (Array.isArray(apiRecent) && apiRecent.length) {
      apiRecent.forEach((e) => {
        const type = String(e?.type || "").toLowerCase();
        const label =
          type === "quiz" ? "Quiz passed" :
          type === "challenge" ? "Challenge completed" :
          "Lesson completed";
        const time = e.completed_at ? formatRelative(new Date(e.completed_at).getTime()) : "";
        activityItems.push({
          label,
          courseTitle: e.course_title || "Course",
          lessonNumber: e.lesson_number,
          time,
          xp: Number(e.xp || 0)
        });
      });
    } else {
      const progressLog = getProgressLog(email);
      const now = Date.now();
      const windowMs = 7 * 24 * 60 * 60 * 1000;
      const recent = progressLog
        .filter((e) => (now - Number(e.ts || 0)) <= windowMs)
        .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0))
        .slice(0, 8);

      if (!recent.length) {
        activityItems.push({
          label: "No recent activity yet.",
          courseTitle: "",
          lessonNumber: null,
          time: "",
          xp: null,
          isEmpty: true
        });
      } else {
        recent.forEach((e) => {
          const type = String(e?.type || "").toLowerCase();
          const label =
            type === "quiz" ? "Quiz passed" :
            type === "challenge" ? "Challenge completed" :
            type === "sandbox" ? "Sandbox build" :
            "Lesson completed";
          activityItems.push({
            label,
            courseTitle: getCourseTitleById(e.course_id),
            lessonNumber: e.lesson_number,
            time: formatRelative(e.ts),
            xp: Number(e.xp || 0)
          });
        });
      }
    }

    clearChildren(list);

    const streakItem = makeEl("div", "dash-activity-item");
    const streakLeft = document.createElement("div");
    const streakTitle = makeEl("div", "fw-semibold", "Current streak");
    const streakSub = document.createElement("small");
    streakSub.textContent = `${streak} day${streak === 1 ? "" : "s"} in a row`;
    streakLeft.append(streakTitle, streakSub);
    const streakRight = makeEl("div", "dash-activity-xp", streak ? "Active" : "Start today");
    streakItem.append(streakLeft, streakRight);

    const streakRow = makeEl("div", "dash-streak-row");
    days.forEach((d) => {
      const day = makeEl("span", `dash-streak-day ${d.active ? "is-active" : ""}`.trim(), d.label);
      day.title = d.key;
      streakRow.appendChild(day);
    });

    const tasksTitle = makeEl("div", "fw-semibold net-green-text mt-2", "Tasks done");

    list.append(streakItem, streakRow, tasksTitle);

    activityItems.forEach((item) => {
      if (item.isEmpty) {
        list.appendChild(makeEl("div", "small text-muted", item.label));
        return;
      }

      const row = makeEl("div", "dash-activity-item");
      const left = document.createElement("div");
      const label = makeEl("div", "fw-semibold", item.label);
      const meta = document.createElement("small");
      const lessonPart = item.lessonNumber ? ` • Lesson ${item.lessonNumber}` : "";
      const timePart = item.time ? ` • ${item.time}` : "";
      meta.textContent = `${item.courseTitle || ""}${lessonPart}${timePart}`;
      left.append(label, meta);

      const right = makeEl("div", "dash-activity-xp", item.xp ? `+${item.xp} XP` : "");
      row.append(left, right);
      list.appendChild(row);
    });
  }

  // AI Prompt: Explain the Render course cards section in clear, simple terms.
  // -----------------------------
  // Render course cards
  // -----------------------------
  function buildCourseCard(course, accessLevel, email) {
    const locked = accessLevel < course.required_level;
    const diff = course.difficulty;

    const gradClass =
      diff === "advanced" ? "net-grad-adv"
      : diff === "intermediate" ? "net-grad-int"
      : "net-grad-nov";

    const badgeClass =
      diff === "advanced" ? "net-badge-adv"
      : diff === "intermediate" ? "net-badge-int"
      : "net-badge-nov";

    const diffIcon =
      diff === "advanced" ? "bi-shield-lock-fill"
      : diff === "intermediate" ? "bi-lightning-charge-fill"
      : "bi-leaf-fill";

    const card = document.createElement("div");
    card.className = "net-coursecard net-coursecard--library";
    if (locked) card.classList.add("is-locked");
    card.setAttribute("data-diff", diff);
    card.setAttribute("data-title", (course.title || "").toLowerCase());
    card.setAttribute("data-category", (course.category || "").toLowerCase());
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", locked ? `${course.title} locked` : `${course.title} open course`);

    const progress = computeCourseProgress(course, email);
    if (locked) {
      const overlay = document.createElement("div");
      overlay.className = "net-course-lock";
      overlay.setAttribute("aria-hidden", "true");
      const overlayInner = document.createElement("div");
      overlayInner.className = "net-course-lock-inner";
      const lockIcon = makeIcon("bi bi-lock-fill me-1");
      overlayInner.append(lockIcon, document.createTextNode(` Level ${course.required_level}+ to unlock`));
      overlay.appendChild(overlayInner);
      card.appendChild(overlay);
    }

    const bar = document.createElement("div");
    bar.className = `net-coursebar ${gradClass}`;
    card.appendChild(bar);

    const body = document.createElement("div");
    body.className = "p-4";

    const header = document.createElement("div");
    header.className = "d-flex align-items-start justify-content-between gap-2 mb-2";

    const left = document.createElement("div");
    const chipRow = document.createElement("div");
    chipRow.className = "d-flex align-items-center gap-2 mb-2";
    if (course.category) {
      const cat = makeEl("span", "net-cat-chip", course.category);
      chipRow.appendChild(cat);
    }
    if (locked) {
      const lockBadge = makeEl("span", "net-lock-badge");
      lockBadge.append(makeIcon("bi bi-lock-fill"), document.createTextNode("Locked"));
      chipRow.appendChild(lockBadge);
    }
    if (chipRow.childNodes.length) left.appendChild(chipRow);

    const title = makeEl("div", "fw-semibold fs-5", course.title || "Course");
    left.appendChild(title);

    const badge = makeEl("span", `net-diffbadge ${badgeClass}`);
    badge.append(makeIcon(`bi ${diffIcon}`), document.createTextNode(` ${prettyDiff(diff)}`));

    header.append(left, badge);
    body.appendChild(header);

    if (course.description) {
      const desc = makeEl("div", "text-muted small mb-3", course.description);
      body.appendChild(desc);
    }

    body.appendChild(renderCourseProgress(progress));

    const meta = makeEl("div", "net-course-meta d-flex flex-wrap gap-3 small text-muted mb-3 course-meta");

    const lessonsMeta = makeEl("span", "d-inline-flex align-items-center gap-1");
    const lessonsIcon = makeIcon("bi bi-collection");
    lessonsIcon.setAttribute("aria-hidden", "true");
    lessonsMeta.append(lessonsIcon, document.createTextNode(` ${course.total_lessons || course.items || 0} lessons`));

    const timeMeta = makeEl("span", "d-inline-flex align-items-center gap-1");
    const timeIcon = makeIcon("bi bi-clock");
    timeIcon.setAttribute("aria-hidden", "true");
    timeMeta.append(timeIcon, document.createTextNode(` ${course.estimated_time || "—"}`));

    const xpMeta = makeEl("span", "d-inline-flex align-items-center gap-1 net-xp-accent fw-semibold");
    const xpIcon = makeIcon("bi bi-lightning-charge-fill");
    xpIcon.setAttribute("aria-hidden", "true");
    xpMeta.append(xpIcon, document.createTextNode(` ${course.xpReward}`));

    meta.append(lessonsMeta, timeMeta, xpMeta);
    body.appendChild(meta);

    if (locked) {
      const lockLine = makeEl("div", "net-lockline mb-3");
      lockLine.append(makeIcon("bi bi-lock me-2"), document.createTextNode(`Level ${course.required_level}+ to unlock`));
      body.appendChild(lockLine);
    }

    const cta = makeEl("div", "d-flex gap-2 flex-wrap course-cta");
    const openBtn = makeEl("button", `btn ${locked ? "btn-outline-secondary" : "btn-teal"} btn-sm`, locked ? `Level ${course.required_level} required` : "Open");
    openBtn.type = "button";
    openBtn.title = "Open this course to view modules and lessons";
    if (locked) openBtn.disabled = true;
    cta.appendChild(openBtn);

    const sandboxBtn = document.createElement("a");
    sandboxBtn.className = "btn btn-soft btn-sm net-btn-icon";
    sandboxBtn.href = `sandbox.html?course_id=${encodeURIComponent(course.key)}`;
    sandboxBtn.title = "Open the sandbox for a network simulation challenge";
    sandboxBtn.append(makeIcon("bi bi-diagram-3 me-1"), document.createTextNode("Sandbox"));
    cta.appendChild(sandboxBtn);

    body.appendChild(cta);
    card.appendChild(body);

    function goCourse() {
      if (locked) return;
      window.location.href = `course.html?id=${encodeURIComponent(course.key)}`;
    }

    card.addEventListener("click", goCourse);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goCourse();
      }
    });

    return { card, locked };
  }

  // AI Prompt: Explain the Search + filter section in clear, simple terms.
  // -----------------------------
  // Search + filter
  // -----------------------------
  function applyCourseFilters() {
    const q = (window.__dashQuery || "").trim().toLowerCase();
    const diff = window.__dashDiff || "all";

    const grid = getById("coursesGrid");
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll(".net-coursecard"));
    let shown = 0;

    cards.forEach((el) => {
      const title = el.getAttribute("data-title") || "";
      const cat = el.getAttribute("data-category") || "";
      const cdiff = el.getAttribute("data-diff") || "novice";

      const matchQuery = !q || title.includes(q) || cat.includes(q);
      const matchDiff = diff === "all" || cdiff === diff;

      const show = matchQuery && matchDiff;
      el.style.display = show ? "" : "none";
      if (show) shown++;
    });

    // If nothing matches, show empty-state (but DON'T permanently destroy the grid content)
    const emptyId = "dashEmptyState";
    const existing = getById(emptyId);
    if (existing) existing.remove();

    if (shown === 0) {
      const empty = document.createElement("div");
      empty.id = emptyId;
      empty.className = "net-empty";
      empty.append(
        makeIcon("bi bi-search"),
        makeEl("div", "fw-bold", "No courses found"),
        makeEl("div", "small text-muted", "Try a different search or filter.")
      );
      grid.appendChild(empty);
    }
  }

  function setupCourseSearchAndChips() {
    const desktop = getById("courseSearch");
    const mobile = getById("mobileSearch");
    const chips = Array.from(document.querySelectorAll(".net-chip[data-diff]"));

    window.__dashQuery = "";
    window.__dashDiff = "all";

    function onSearchInput(from) {
      const val = from?.value || "";
      window.__dashQuery = val;

      // sync the other input
      if (from === desktop && mobile) mobile.value = val;
      if (from === mobile && desktop) desktop.value = val;

      applyCourseFilters();
    }

    desktop?.addEventListener("input", () => onSearchInput(desktop));
    mobile?.addEventListener("input", () => onSearchInput(mobile));

    chips.forEach((btn) => {
      btn.addEventListener("click", () => {
        chips.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        window.__dashDiff = btn.getAttribute("data-diff") || "all";
        applyCourseFilters();
      });
    });
  }

  function setupGoalToggle() {
    const btns = Array.from(document.querySelectorAll(".dash-toggle-btn[data-panel]"));
    if (!btns.length) return;

    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        btns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        const panelId = btn.getAttribute("data-panel");
        btns.forEach((b) => {
          const id = b.getAttribute("data-panel");
          if (!id) return;
          const panel = document.getElementById(id);
          if (!panel) return;

          if (id === panelId) {
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

  // AI Prompt: Explain the Continue learning section in clear, simple terms.
  // -----------------------------
  // Continue learning
  // -----------------------------
  async function renderContinueLearning() {
    const box = getById("continueBox");
    if (!box) return;

    const user = getCurrentUser();
    const email = user?.email;

    if (!email) {
      box.className = "dash-continue-list";
      clearChildren(box);
      box.appendChild(makeEl("div", "text-muted small", "Sign in to track your learning progress."));
      return;
    }

    const content = getCourseIndex();
    const apiCourses = await fetchContinueCourses(email);
    if (Array.isArray(apiCourses) && apiCourses.length) {
      box.className = "dash-continue-list";
      clearChildren(box);
      apiCourses.forEach((entry) => {
        const course = content[String(entry.id)] || {};
        const title = entry.title || course.title || "Course";
        const diff = String(entry.difficulty || course.difficulty || "novice");
        const category = entry.category || course.category || "Core";
        const xpReward = Number(entry.xp_reward || course.xpReward || course.totalXP || 0);

        const requiredApi = Number(entry.total_lessons || course.total_lessons || course.items || 0);
        const pctApi = Math.max(0, Math.min(100, Number(entry.progress_pct || 0)));
        const doneApi = requiredApi ? Math.round((pctApi / 100) * requiredApi) : 0;

        const comps = getCourseCompletionsLocal(email, entry.id);
        const requiredLocal = countRequiredItems(course);
        const doneLocal = comps.lesson.size + comps.quiz.size + comps.challenge.size;

        const required = requiredApi || requiredLocal;
        const done = Math.max(doneApi, doneLocal);
        const pct = required ? Math.round((done / required) * 100) : Math.max(pctApi, 0);

        const item = buildContinueItem({
          id: entry.id,
          title,
          category,
          diff,
          pct,
          done,
          required,
          xpReward
        });
        box.appendChild(item);
      });
      return;
    }

    // Fallback: use local started courses
    const started = getStartedCourses(email)
      .filter((c) => c && c.id)
      .sort((a, b) => Number(b.lastViewed || 0) - Number(a.lastViewed || 0))
      .slice(0, 3);

    if (started.length) {
      box.className = "dash-continue-list";
      clearChildren(box);
      started.forEach((entry) => {
        const course = content[String(entry.id)] || (COURSE_CONTENT?.[String(entry.id)] || {});
        const title = course.title || "Course";
        const diff = String(course.difficulty || "novice");
        const category = course.category || "Core";
        const xpReward = Number(course.xpReward || course.totalXP || course.xp_reward || 0);

        const comps = getCourseCompletionsLocal(email, entry.id);
        const done = comps.lesson.size + comps.quiz.size + comps.challenge.size;
        const required = countRequiredItems(course);
        const pct = required ? Math.round((done / required) * 100) : 0;

        const item = buildContinueItem({
          id: entry.id,
          title,
          category,
          diff,
          pct,
          done,
          required,
          xpReward
        });
        box.appendChild(item);
      });
      return;
    }

    box.className = "dash-continue-list";
    clearChildren(box);
    box.appendChild(makeEl("div", "text-muted small", "No started courses yet. Pick a course to begin."));
  }

  function buildContinueItem({ id, title, category, diff, pct, done, required, xpReward }) {
    const item = document.createElement("div");
    item.className = "dash-continue-item";
    item.setAttribute("data-course-id", String(id));

    const left = document.createElement("div");
    left.className = "flex-grow-1";

    const titleEl = makeEl("div", "fw-semibold", title);
    const meta = makeEl("div", "dash-continue-meta", `${category} • ${prettyDiff(diff)}`);

    const meter = document.createElement("div");
    meter.className = "net-meter mt-2";
    meter.setAttribute("aria-label", "Course progress");
    const meterFill = document.createElement("div");
    meterFill.className = "net-meter-fill";
    meterFill.style.width = `${pct}%`;
    meter.appendChild(meterFill);

    const count = makeEl("div", "small text-muted mt-1", `${done}/${required || 0} items`);
    left.append(titleEl, meta, meter, count);

    const right = document.createElement("div");
    right.className = "text-end";
    right.append(
      makeEl("div", "small text-muted", "Suggested")
    );

    const xpWrap = makeEl("div", "fw-semibold net-xp-accent");
    xpWrap.append(makeIcon("bi bi-lightning-charge-fill me-1"), document.createTextNode(String(xpReward || 0)));
    right.appendChild(xpWrap);

    const btn = makeEl("button", "btn btn-teal btn-sm mt-2", "Continue");
    btn.type = "button";
    right.appendChild(btn);

    item.append(left, right);
    item.addEventListener("click", () => {
      window.location.href = `course.html?id=${encodeURIComponent(id)}`;
    });
    return item;
  }

  // AI Prompt: Explain the Render courses section in clear, simple terms.
  // -----------------------------
  // Render courses
  // -----------------------------
  async function renderCourses() {
    const grid = getById("coursesGrid");
    if (!grid) return;
    const banner = getById("courseErrorBanner");

    const user = getCurrentUser();
    const uLevel = userNumericLevel(user);
    const unlockLevel = unlockLevelFromTier(user?.unlock_tier);
    const accessLevel = Math.max(uLevel, unlockLevel);
    const email = user?.email || "";

    let courses = [];

    // Prefer fresh cache, then API, then stale cache.
    const cached = getCachedCourseIndex();
    if (cached.index && cached.fresh) {
      courses = Object.keys(cached.index).map((k) => mergeCourseWithContent(cached.index[k]));
      window.__dashCourseIndex = cached.index;
    } else {
      const apiCourses = await fetchCoursesFromApi();
      if (apiCourses.length) {
        courses = apiCourses.map((c) => mergeCourseWithContent(c));

        const index = {};
        courses.forEach((c) => {
          index[String(c.id)] = { ...c };
        });
        window.__dashCourseIndex = index;
        setCachedCourseIndex(index);
      } else if (cached.index) {
        courses = Object.keys(cached.index).map((k) => mergeCourseWithContent(cached.index[k]));
        window.__dashCourseIndex = cached.index;
      } else {
        courses = [];
      }
    }
    if (!courses.length) {
      clearChildren(grid);
      const empty = makeEl("div", "net-empty");
      empty.append(
        makeIcon("bi bi-journal-x"),
        makeEl("div", "fw-bold", "No courses available"),
        makeEl("div", "small text-muted", "Please check back later.")
      );
      grid.appendChild(empty);
      const lockNote = getById("lockNote");
      if (lockNote) lockNote.style.display = "none";
      if (banner) banner.classList.remove("d-none");
      return;
    }

    if (banner) banner.classList.add("d-none");
    clearChildren(grid);
    let anyLocked = false;

    courses.forEach((c) => {
      const { card, locked } = buildCourseCard(c, accessLevel, email);
      if (locked) anyLocked = true;
      grid.appendChild(card);
    });

    applyCourseFilters();

    const lockNote = getById("lockNote");
    if (lockNote) {
      if (anyLocked) {
        lockNote.style.display = "";
        lockNote.textContent = "Some courses are locked until you level up (Intermediate unlocks at Level 3, Advanced at Level 5).";
      } else {
        lockNote.style.display = "none";
      }
    }
  }

  // AI Prompt: Explain the Progress widgets (streak, goals, achievements) section in clear, simple terms.
  // -----------------------------
  // Progress widgets (streak, goals, achievements)
  // -----------------------------
  function renderProgressWidgets() {
    const user = getCurrentUser();
    const email = user?.email || "";

    let lessonsDone = 0;
    let quizzesDone = 0;
    let challengesDone = 0;
    let inProgress = 0;
    let completed = 0;

    const localSummary = email ? getLocalProgressSummary(email) : null;
    const apiSummary = (window.__dashProgressSummary && window.__dashProgressSummary.email === email)
      ? window.__dashProgressSummary
      : null;

    if (apiSummary || localSummary) {
      lessonsDone = Math.max(apiSummary?.lessonsDone || 0, localSummary?.lessonsDone || 0);
      quizzesDone = Math.max(apiSummary?.quizzesDone || 0, localSummary?.quizzesDone || 0);
      challengesDone = Math.max(apiSummary?.challengesDone || 0, localSummary?.challengesDone || 0);
      inProgress = Math.max(apiSummary?.inProgress || 0, localSummary?.inProgress || 0);
      completed = Math.max(apiSummary?.coursesDone || 0, localSummary?.coursesDone || 0);
    }

    if (getById("statInProgress")) getById("statInProgress").textContent = String(inProgress);
    if (getById("statCompleted")) getById("statCompleted").textContent = String(completed);
    if (getById("statLessons")) getById("statLessons").textContent = String(lessonsDone);
    if (getById("statQuizzes")) getById("statQuizzes").textContent = String(quizzesDone);
    if (getById("statChallenges")) getById("statChallenges").textContent = String(challengesDone);

    // Login streak + streak badge progress
    const loginLog = email ? getLoginLog(email) : [];
    const loginStreak = computeLoginStreak(loginLog);
    const topStreak = getById("topStreakDays");
    const topStreakPill = getById("topStreakPill");
    if (topStreak) {
      topStreak.textContent = loginStreak > 0
        ? `${loginStreak} day${loginStreak === 1 ? "" : "s"}`
        : "";
    }
    if (topStreakPill) {
      topStreakPill.style.display = loginStreak > 0 ? "" : "none";
    }

    const earnedBadgeIds = new Set(getBadges(email).map((b) => b.id));
    const streakDefs = loginBadgeDefs();

    // Weekly tasks list (personalized)
    const taskPool = [];
    taskPool.push({
      id: "login-streak",
      title: "Keep your streak alive",
      progress: Math.min(loginStreak, 7),
      target: 7,
      unit: "days",
      xp: 40,
      tip: "Log in daily to build streak badges."
    });

    taskPool.push({
      id: "lesson-focus",
      title: lessonsDone < 5 ? "Complete 2 lessons" : "Complete 1 lesson",
      progress: lessonsDone % 5,
      target: lessonsDone < 5 ? 2 : 1,
      unit: "lessons",
      xp: lessonsDone < 5 ? 50 : 25,
      tip: "Lessons unlock quizzes and sandbox challenges."
    });

    if (quizzesDone < 3) {
      taskPool.push({
        id: "quiz-focus",
        title: "Pass a quiz",
        progress: quizzesDone % 3,
        target: 1,
        unit: "quiz",
        xp: 40,
        tip: "Quizzes reinforce key concepts."
      });
    }

    if (challengesDone < 2) {
      taskPool.push({
        id: "sandbox-focus",
        title: "Build 1 topology",
        progress: challengesDone % 2,
        target: 1,
        unit: "topology",
        xp: 60,
        tip: "Sandbox practice accelerates mastery."
      });
    }

    if (inProgress > 0) {
      taskPool.push({
        id: "finish-module",
        title: "Continue an in‑progress course",
        progress: inProgress,
        target: Math.max(1, Math.min(3, inProgress)),
        unit: "courses",
        xp: 35,
        tip: "Pick up where you left off."
      });
    }

    // deterministic daily shuffle
    const seed = Array.from(`${email}:${dateKey()}`).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
    let t = seed || 1;
    const rng = () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
    const shuffled = taskPool.sort(() => rng() - 0.5).slice(0, 3);

    const taskWrap = getById("weeklyTasks");
    if (taskWrap) {
      clearChildren(taskWrap);
      shuffled.forEach((t) => {
        const item = makeEl("div", "dash-task");
        item.setAttribute("data-tip", `${t.tip} (+${t.xp} XP)`);

        const left = document.createElement("div");
        const title = makeEl("div", "fw-semibold", t.title);
        const meta = makeEl("div", "small text-muted", `${t.progress}/${t.target} ${t.unit}`);
        left.append(title, meta);

        const xp = makeEl("div", "dash-task-xp", `+${t.xp} XP`);
        item.append(left, xp);
        taskWrap.appendChild(item);
      });
    }

    const nextLoginBadge = streakDefs.find((d) => !earnedBadgeIds.has(d.id));
    if (getById("weeklyGoalText")) {
      if (!nextLoginBadge) {
        getById("weeklyGoalText").textContent = "All streak badges earned";
      } else {
        const remaining = Math.max(0, nextLoginBadge.target - loginStreak);
        getById("weeklyGoalText").textContent = remaining === 0
          ? `Earned ${nextLoginBadge.target}-day badge`
          : `${remaining} days to ${nextLoginBadge.target}-day badge`;
      }
    }

    // Achievements (show only incomplete)
    const achievements = [
      ...streakDefs,
      { id: "fast-learner", title: "Fast Learner", desc: "Complete 5 lessons", icon: "bi-lightning-charge-fill", type: "lessons", target: 5, xp: 50 },
      { id: "sandbox-builder", title: "Sandbox Builder", desc: "Build 2 topologies", icon: "bi-diagram-3", type: "challenges", target: 2, xp: 60 },
      { id: "quiz-master", title: "Quiz Master", desc: "Pass 3 quizzes", icon: "bi-patch-check", type: "quizzes", target: 3, xp: 60 }
    ];

    const counts = { lessons: lessonsDone, quizzes: quizzesDone, challenges: challengesDone, login: loginStreak };
    const pending = achievements.filter((a) => {
      if (a.type === "login") return !earnedBadgeIds.has(a.id);
      return (counts[a.type] || 0) < a.target;
    });

    if (getById("nextBadgeText")) {
      if (pending.length) {
        const next = pending[0];
        const current = next.type === "login" ? loginStreak : (counts[next.type] || 0);
        const remaining = Math.max(0, next.target - current);
        const label =
          next.type === "login" ? "login days" :
          next.type === "quizzes" ? "quizzes" :
          next.type === "challenges" ? "topologies" :
          "lessons";
        getById("nextBadgeText").textContent = remaining === 0
          ? `Badge ready: ${next.title}`
          : `Complete ${remaining} ${label}`;
      } else {
        getById("nextBadgeText").textContent = "All badges earned";
      }
    }

    const list = getById("achievementsList");
    if (list) {
      clearChildren(list);
      if (!pending.length) {
        list.appendChild(makeEl("div", "small text-muted", "All achievements completed. Great work."));
      } else {
        pending.forEach((a) => {
          const current = a.type === "login" ? Math.min(loginStreak, a.target) : (counts[a.type] || 0);
          const badge = makeEl("div", "dash-badge");
          const iconWrap = makeEl("span", "dash-badge-ico");
          iconWrap.appendChild(makeIcon(`bi ${a.icon}`));
          const body = document.createElement("div");
          body.append(
            makeEl("div", "fw-semibold", a.title),
            makeEl("div", "small text-muted", `${a.desc} (${current}/${a.target})`)
          );
          badge.append(iconWrap, body);
          list.appendChild(badge);
        });
      }
    }

    const scroller = getById("achieveScroller");
    if (scroller) {
      clearChildren(scroller);
      if (!pending.length) {
        scroller.appendChild(makeEl("div", "small text-muted", "All achievements completed. Great work."));
      } else {
        pending.forEach((a) => {
          const current = a.type === "login" ? Math.min(loginStreak, a.target) : (counts[a.type] || 0);
          const card = makeEl("div", "dash-achieve-card");
          const ico = makeEl("div", "dash-achieve-ico");
          ico.appendChild(makeIcon(`bi ${a.icon}`));
          const body = document.createElement("div");
          body.append(
            makeEl("div", "fw-semibold", a.title),
            makeEl("div", "small text-muted", a.desc),
            makeEl("div", "small text-muted", `${current}/${a.target}`)
          );
          card.append(ico, body);
          scroller.appendChild(card);
        });
      }
    }

    if (getById("focusText")) {
      getById("focusText").textContent = loginStreak > 0
        ? "Log in tomorrow to keep your streak"
        : "Log in today to start a streak";
    }
    if (getById("focusXp")) {
      getById("focusXp").textContent = nextLoginBadge ? `+${nextLoginBadge.xp} XP` : "XP varies";
    }

    renderRecentActivity();
  }

  // AI Prompt: Explain the User UI fill section in clear, simple terms.
  // -----------------------------
  // User UI fill
  // -----------------------------
  function fillUserUI() {
    const user = getCurrentUser();

    const name = user?.first_name
      ? `${user.first_name} ${user.last_name || ""}`.trim()
      : (user?.name || user?.username || "Student");

    const email = user?.email || "Not logged in";
    const rank = getUserRank(user);

    // avatar = first letter of name/username
    const initial = (name || "S").trim().charAt(0).toUpperCase();
    const streakPill = getById("topStreakPill");
    if (streakPill) streakPill.style.display = user?.email ? "" : "none";

    const lvl = userNumericLevel(user);
    const { totalXP, currentLevelXP, xpNext, progressPct, toNext } = computeXP(user);

    // Welcome
    if (getById("welcomeName")) getById("welcomeName").textContent = name;

    // Top user
    if (getById("topUserName")) getById("topUserName").textContent = name;
    if (getById("topAvatar")) getById("topAvatar").textContent = initial;

    // Dropdown
    if (getById("ddName")) getById("ddName").textContent = name;
    if (getById("ddEmail")) getById("ddEmail").textContent = email;
    if (getById("ddAvatar")) getById("ddAvatar").textContent = initial;
    if (getById("ddLevel")) getById("ddLevel").textContent = `Level ${lvl}`;
    if (getById("ddRank")) getById("ddRank").textContent = rank;

    // Sidebar user
    if (getById("sideUserName")) getById("sideUserName").textContent = name;
    if (getById("sideUserEmail")) getById("sideUserEmail").textContent = email;
    if (getById("sideAvatar")) getById("sideAvatar").textContent = initial;

    if (getById("sideLevelBadge")) getById("sideLevelBadge").textContent = `Lv ${lvl}`;
    if (getById("sideXpText")) getById("sideXpText").textContent = `${currentLevelXP}/${xpNext}`;
    if (getById("sideXpBar")) getById("sideXpBar").style.width = `${progressPct}%`;
    if (getById("sideXpHint")) getById("sideXpHint").textContent = `${toNext} XP to next level`;

    // Welcome ring block
    if (getById("welcomeLevel")) getById("welcomeLevel").textContent = String(lvl);
    if (getById("welcomeRank")) getById("welcomeRank").textContent = rank;
    if (getById("welcomeXpText")) getById("welcomeXpText").textContent = `${currentLevelXP}/${xpNext} XP`;
    if (getById("welcomeLevelHint")) getById("welcomeLevelHint").textContent = `${toNext} XP to next level`;
    if (getById("welcomeXpBar")) getById("welcomeXpBar").style.width = `${progressPct}%`;

    setWelcomeRing(progressPct);
  }

  async function refreshUserFromApi() {
    const user = getCurrentUser();
    const email = user?.email || localStorage.getItem("netology_last_email") || "";
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (!email || !base) return user;

    try {
      const data = await fetchJson(`${base}/user-info?email=${encodeURIComponent(email)}`);
      if (!data || !data.success) return user;

      const unlockTier = String(data.start_level || user?.unlock_tier || user?.unlock_level || user?.unlockTier || "novice")
        .trim()
        .toLowerCase();

      const serverXP = Number(data.xp ?? data.total_xp);
      const xp = Number.isFinite(serverXP) ? serverXP : Number(user?.xp || 0);

      const merged = {
        ...(user || {}),
        email,
        first_name: data.first_name || user?.first_name,
        last_name: data.last_name || user?.last_name,
        username: data.username || user?.username,
        xp,
        numeric_level: Number.isFinite(Number(data.numeric_level)) ? Number(data.numeric_level) : user?.numeric_level,
        xp_into_level: Number.isFinite(Number(data.xp_into_level)) ? Number(data.xp_into_level) : user?.xp_into_level,
        next_level_xp: Number.isFinite(Number(data.next_level_xp)) ? Number(data.next_level_xp) : user?.next_level_xp,
        rank: data.rank || data.level || user?.rank,
        level: data.level || data.rank || user?.level,
        unlock_tier: ["novice", "intermediate", "advanced"].includes(unlockTier) ? unlockTier : "novice"
      };

      localStorage.setItem("user", JSON.stringify(merged));
      localStorage.setItem("netology_user", JSON.stringify(merged));
      return merged;
    } catch {
      return user;
    }
  }

  // AI Prompt: Explain the Lightweight refresh (focus/visibility/storage) section in clear, simple terms.
  // -----------------------------
  // Lightweight refresh (focus/visibility/storage)
  // -----------------------------
  let __dashRefreshTimer = null;

  function scheduleDashboardRefresh() {
    if (document.hidden) return;
    if (__dashRefreshTimer) clearTimeout(__dashRefreshTimer);
    __dashRefreshTimer = window.setTimeout(() => {
      refreshDashboard();
    }, 150);
  }

  async function refreshDashboard() {
    const user = getCurrentUser();

    safeStep("fillUserUI", fillUserUI);
    await safeStepAsync("renderCourses", renderCourses);
    await safeStepAsync("renderContinueLearning", renderContinueLearning);

    if (user?.email) {
      await safeStepAsync("fetchProgressSummary", () => fetchProgressSummary(user.email));
    }

    safeStep("renderProgressWidgets", renderProgressWidgets);
  }

  // AI Prompt: Explain the Init section in clear, simple terms.
  // -----------------------------
  // Init
  // -----------------------------
  async function init() {
    safeStep("wireBrandRouting", wireBrandRouting);
    safeStep("setupSidebar", setupSidebar);
    safeStep("setupUserDropdown", setupUserDropdown);
    safeStep("setupLogout", setupLogout);
    safeStep("setupGoalToggle", setupGoalToggle);

    // Fast first paint using cached user data
    const cachedUser = getCurrentUser();
    safeStep("fillUserUI", fillUserUI);
    safeStep("setupCourseSearchAndChips", setupCourseSearchAndChips);
    await safeStepAsync("renderCourses", renderCourses);
    await safeStepAsync("renderContinueLearning", renderContinueLearning);
    safeStep("renderProgressWidgets", renderProgressWidgets);

    const user = await safeStepAsync("refreshUserFromApi", refreshUserFromApi) || cachedUser;
    if (user?.email) {
      await safeStepAsync("fetchAchievements", () => fetchAchievements(user.email));
      let loginInfo = safeStep("recordLoginDay", () => recordLoginDay(user.email)) || { log: [] };
      const remoteLogin = await safeStepAsync("syncLoginLog", () => syncLoginLog(user.email));
      if (remoteLogin && Array.isArray(remoteLogin.log)) loginInfo = remoteLogin;
      const streak = safeStep("computeLoginStreak", () => computeLoginStreak(loginInfo.log)) || 0;
      await safeStepAsync("awardLoginStreakBadges", () => awardLoginStreakBadges(user.email, streak));

      if (loginInfo.isNew) {
        const pill = getById("topStreakPill");
        if (pill) {
          pill.classList.remove("is-animate");
          requestAnimationFrame(() => {
            pill.classList.add("is-animate");
            window.setTimeout(() => pill.classList.remove("is-animate"), 1200);
          });
        }
      }
    }

    safeStep("fillUserUI", fillUserUI);
    await safeStepAsync("renderCourses", renderCourses);
    await safeStepAsync("renderContinueLearning", renderContinueLearning);
    if (user?.email) {
      await safeStepAsync("fetchProgressSummary", () => fetchProgressSummary(user.email));
    }
    safeStep("renderProgressWidgets", renderProgressWidgets);

    // Auto-refresh when the tab regains focus or storage changes.
    window.addEventListener("focus", scheduleDashboardRefresh);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) scheduleDashboardRefresh();
    });
    window.addEventListener("storage", (e) => {
      if (!e.key) return;
      if (e.key === "user" || e.key.startsWith("netology_")) scheduleDashboardRefresh();
    });
  }

  onReady(init);
})();
