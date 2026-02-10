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
  // -----------------------------
  // Helpers
  // -----------------------------
  const getById = (id) => document.getElementById(id);
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
    const level = levelFromXP(totalXP);
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
    const arc = 0.78; // ~280deg arc
    const dash = CIRC * arc;
    const gap = CIRC - dash;
    const offset = dash * (1 - (progressPct / 100));

    const dashArray = `${dash.toFixed(2)} ${gap.toFixed(2)}`;
    ring.style.strokeDasharray = dashArray;
    ring.style.strokeDashoffset = `${offset.toFixed(2)}`;

    if (track) {
      track.style.strokeDasharray = dashArray;
      track.style.strokeDashoffset = "0";
    }
  }

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

  function renderRecentActivity() {
    const list = getById("recentActivityList");
    if (!list) return;
    const user = getCurrentUser();
    const email = user?.email;
    if (!email) {
      list.innerHTML = `<div class="small text-muted">Sign in to see your streak.</div>`;
      return;
    }

    const log = getLoginLog(email);
    const streak = computeLoginStreak(log);
    const days = [];
    const cursor = new Date();
    for (let i = 0; i < 7; i += 1) {
      const key = dateKey(cursor);
      days.push({
        key,
        label: cursor.toLocaleDateString(undefined, { weekday: "short" }),
        active: log.includes(key)
      });
      cursor.setDate(cursor.getDate() - 1);
    }

    list.innerHTML = `
      <div class="dash-activity-item">
        <div>
          <div class="fw-semibold">Current streak</div>
          <small>${streak} day${streak === 1 ? "" : "s"} in a row</small>
        </div>
        <div class="dash-activity-xp">${streak ? "Active" : "Start today"}</div>
      </div>
      <div class="dash-streak-row">
        ${days.map((d) => `
          <span class="dash-streak-day ${d.active ? "is-active" : ""}" title="${d.key}">
            ${d.label}
          </span>
        `).join("")}
      </div>
    `;
  }

  // -----------------------------
  // Render course cards
  // -----------------------------
  function buildCourseCard(course, accessLevel) {
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

    const lockedOverlay = locked
      ? `<div class="net-course-lock" aria-hidden="true">
           <div class="net-course-lock-inner"><i class="bi bi-lock-fill me-1"></i> Level ${course.required_level}+ to unlock</div>
         </div>`
      : "";

    const card = document.createElement("div");
    card.className = "net-coursecard net-coursecard--library";
    if (locked) card.classList.add("is-locked");
    card.setAttribute("data-diff", diff);
    card.setAttribute("data-title", (course.title || "").toLowerCase());
    card.setAttribute("data-category", (course.category || "").toLowerCase());
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", locked ? `${course.title} locked` : `${course.title} open course`);

    const descHtml = course.description
      ? `<div class="text-muted small mb-3">${course.description}</div>`
      : "";

    card.innerHTML = `
      ${lockedOverlay}
      <div class="net-coursebar ${gradClass}"></div>
      <div class="p-4">
        <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
          <div>
            <div class="d-flex align-items-center gap-2 mb-2">
              ${course.category ? `<span class="net-cat-chip">${course.category}</span>` : ``}
              ${locked ? `<span class="net-lock-badge"><i class="bi bi-lock-fill"></i>Locked</span>` : ``}
            </div>
            <div class="fw-semibold fs-5">${course.title}</div>
          </div>
          <span class="net-diffbadge ${badgeClass}">
            <i class="bi ${diffIcon}"></i>
            ${prettyDiff(diff)}
          </span>
        </div>

        ${descHtml}

        <div class="net-course-meta d-flex flex-wrap gap-3 small text-muted mb-3 course-meta">
          <span class="d-inline-flex align-items-center gap-1">
            <i class="bi bi-collection" aria-hidden="true"></i> ${course.total_lessons || course.items || 0} lessons
          </span>
          <span class="d-inline-flex align-items-center gap-1">
            <i class="bi bi-clock" aria-hidden="true"></i> ${course.estimated_time || "—"}
          </span>
          <span class="d-inline-flex align-items-center gap-1 net-xp-accent fw-semibold">
            <i class="bi bi-lightning-charge-fill" aria-hidden="true"></i> ${course.xpReward}
          </span>
        </div>

        ${locked ? `<div class="net-lockline mb-3"><i class="bi bi-lock me-2"></i>Level ${course.required_level}+ to unlock</div>` : ""}

        <div class="d-flex gap-2 flex-wrap course-cta">
          <button class="btn ${locked ? "btn-outline-secondary" : "btn-teal"} btn-sm" ${locked ? "disabled" : ""}>
            ${locked ? `Level ${course.required_level} required` : "Open"}
          </button>
          <a class="btn btn-soft btn-sm net-btn-icon" href="sandbox.html?course_id=${encodeURIComponent(course.key)}">
            <i class="bi bi-diagram-3 me-1"></i>Sandbox
          </a>
        </div>
      </div>
    `;

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
      empty.innerHTML = `
        <i class="bi bi-search"></i>
        <div class="fw-bold">No courses found</div>
        <div class="small text-muted">Try a different search or filter.</div>
      `;
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
      box.innerHTML = `<div class="text-muted small">Sign in to track your learning progress.</div>`;
      return;
    }

    const content = getCourseIndex();
    const apiCourses = await fetchContinueCourses(email);
    if (Array.isArray(apiCourses) && apiCourses.length) {
      box.className = "dash-continue-list";
      box.innerHTML = apiCourses.map((entry) => {
        const course = content[String(entry.id)] || {};
        const title = entry.title || course.title || "Course";
        const diff = String(entry.difficulty || course.difficulty || "novice");
        const category = entry.category || course.category || "Core";
        const xpReward = Number(entry.xp_reward || course.xpReward || course.totalXP || 0);

        const required = Number(entry.total_lessons || course.total_lessons || course.items || 0);
        const pct = Math.max(0, Math.min(100, Number(entry.progress_pct || 0)));
        const done = required ? Math.round((pct / 100) * required) : 0;

        return `
          <div class="dash-continue-item" data-course-id="${entry.id}">
            <div class="flex-grow-1">
              <div class="fw-semibold">${title}</div>
              <div class="dash-continue-meta">${category} • ${prettyDiff(diff)}</div>
              <div class="net-meter mt-2" aria-label="Course progress">
                <div class="net-meter-fill" style="width:${pct}%"></div>
              </div>
              <div class="small text-muted mt-1">${done}/${required || 0} items</div>
            </div>
            <div class="text-end">
              <div class="small text-muted">Suggested</div>
              <div class="fw-semibold net-xp-accent">
                <i class="bi bi-lightning-charge-fill me-1"></i>${xpReward || 0}
              </div>
              <button class="btn btn-teal btn-sm mt-2" type="button">Continue</button>
            </div>
          </div>
        `;
      }).join("");

      box.querySelectorAll("[data-course-id]").forEach((item) => {
        item.addEventListener("click", () => {
          const id = item.getAttribute("data-course-id");
          if (!id) return;
          window.location.href = `course.html?id=${encodeURIComponent(id)}`;
        });
      });
      return;
    }
    box.className = "dash-continue-list";
    box.innerHTML = `<div class="text-muted small">No started courses yet. Pick a course to begin.</div>`;
  }

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
      grid.innerHTML = `
        <div class="net-empty">
          <i class="bi bi-journal-x"></i>
          <div class="fw-bold">No courses available</div>
          <div class="small text-muted">Please check back later.</div>
        </div>
      `;
      const lockNote = getById("lockNote");
      if (lockNote) lockNote.style.display = "none";
      if (banner) banner.classList.remove("d-none");
      return;
    }

    if (banner) banner.classList.add("d-none");
    grid.innerHTML = "";
    let anyLocked = false;

    courses.forEach((c) => {
      const { card, locked } = buildCourseCard(c, accessLevel);
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

    const summary = window.__dashProgressSummary;
    if (summary && summary.email === email) {
      lessonsDone = summary.lessonsDone || 0;
      quizzesDone = summary.quizzesDone || 0;
      challengesDone = summary.challengesDone || 0;
      inProgress = summary.inProgress || 0;
      completed = summary.coursesDone || 0;
    }

    if (getById("statInProgress")) getById("statInProgress").textContent = String(inProgress);
    if (getById("statCompleted")) getById("statCompleted").textContent = String(completed);
    if (getById("statLessons")) getById("statLessons").textContent = String(lessonsDone);
    if (getById("statQuizzes")) getById("statQuizzes").textContent = String(quizzesDone);

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
      taskWrap.innerHTML = shuffled.map((t) => `
        <div class="dash-task" data-tip="${escapeHtml(`${t.tip} (+${t.xp} XP)`) }">
          <div>
            <div class="fw-semibold">${escapeHtml(t.title)}</div>
            <div class="small text-muted">${t.progress}/${t.target} ${escapeHtml(t.unit)}</div>
          </div>
          <div class="dash-task-xp">+${t.xp} XP</div>
        </div>
      `).join("");
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
      if (!pending.length) {
        list.innerHTML = `<div class="small text-muted">All achievements completed. Great work.</div>`;
      } else {
        list.innerHTML = pending.map((a) => {
          const current = a.type === "login" ? Math.min(loginStreak, a.target) : (counts[a.type] || 0);
          return `
            <div class="dash-badge">
              <span class="dash-badge-ico"><i class="bi ${a.icon}"></i></span>
              <div>
                <div class="fw-semibold">${a.title}</div>
                <div class="small text-muted">${a.desc} (${current}/${a.target})</div>
              </div>
            </div>
          `;
        }).join("");
      }
    }

    const scroller = getById("achieveScroller");
    if (scroller) {
      if (!pending.length) {
        scroller.innerHTML = `<div class="small text-muted">All achievements completed. Great work.</div>`;
      } else {
        scroller.innerHTML = pending.map((a) => {
          const current = a.type === "login" ? Math.min(loginStreak, a.target) : (counts[a.type] || 0);
          return `
            <div class="dash-achieve-card">
              <div class="dash-achieve-ico"><i class="bi ${a.icon}"></i></div>
              <div>
                <div class="fw-semibold">${a.title}</div>
                <div class="small text-muted">${a.desc}</div>
                <div class="small text-muted">${current}/${a.target}</div>
              </div>
            </div>
          `;
        }).join("");
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

      const merged = {
        ...(user || {}),
        email,
        first_name: data.first_name || user?.first_name,
        last_name: data.last_name || user?.last_name,
        username: data.username || user?.username,
        xp: Number(data.xp || user?.xp || 0),
        unlock_tier: ["novice", "intermediate", "advanced"].includes(unlockTier) ? unlockTier : "novice"
      };

      localStorage.setItem("user", JSON.stringify(merged));
      localStorage.setItem("netology_user", JSON.stringify(merged));
      return merged;
    } catch {
      return user;
    }
  }

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
  }

  onReady(init);
})();
