/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript
---------------------------------------
courses.js – All courses page grouped by difficulty.

- Loads user stats (level/rank)
- Loads all courses
- Groups into Novice / Intermediate / Advanced
- Locks courses until required_level is met
- Keeps same menu/drawer behaviour as dashboard
*/

const BASE_XP = 100;
const COURSE_CACHE_TTL = 5 * 60 * 1000;
const COURSE_CACHE_VERSION = "db-only-v1";

const getById = (id) => document.getElementById(id);

function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

function parseJsonSafe(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

onReady(async () => {
  const user = getCurrentUser();
  if (!user.email) {
    window.location.href = "login.html";
    return;
  }

  wireChrome(user);

  const stats = await loadUserStats(user.email);
  const accessLevel = stats.accessLevel || stats.level || 1;
  await loadAllCourses(user.email, accessLevel);
});

/* =========================================================
   XP helpers
========================================================= */

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

/* =========================================================
   Data normalization + cache
========================================================= */

function normalizeApiCourse(apiCourse) {
  const difficulty = String(apiCourse.difficulty || "novice").toLowerCase();
  return {
    id: String(apiCourse.id || ""),
    title: apiCourse.title || "Course",
    description: apiCourse.description || "",
    category: apiCourse.category || "Core",
    difficulty,
    required_level: Number(apiCourse.required_level || 0) || unlockLevelFromTier(difficulty),
    total_lessons: Number(apiCourse.total_lessons || 0),
    module_count: Number(apiCourse.module_count || 0),
    estimated_time: apiCourse.estimated_time || apiCourse.estimatedTime || "",
    totalXP: Number(apiCourse.xp_reward || apiCourse.xpReward || 0) || 0
  };
}

function getCurrentUser() {
  return (
    parseJsonSafe(localStorage.getItem("netology_user"), null) ||
    parseJsonSafe(localStorage.getItem("user"), null) ||
    {}
  );
}

function getCachedCourseIndex() {
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

/* =========================================================
   Progress helpers (local)
========================================================= */

function getCourseContentById(courseId) {
  if (typeof COURSE_CONTENT === "undefined") return null;
  return COURSE_CONTENT[String(courseId)] || null;
}

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

function getProgressLog(email) {
  if (!email) return [];
  return parseJsonSafe(localStorage.getItem(`netology_progress_log:${email}`), []) || [];
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
  const content = getCourseContentById(course.id);
  const completions = getCourseCompletions(email, course.id);

  let total = 0;
  let done = 0;

  if (content) {
    total = countRequiredItems(content);
    done = completions.lesson.size + completions.quiz.size + completions.challenge.size;
  } else {
    total = Number(course.total_lessons || 0) || 0;
    done = completions.lesson.size;
  }

  if (!total) return { done, total, pct: 0 };
  done = Math.min(done, total);
  const pct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
  return { done, total, pct };
}

function renderCourseProgress(progress) {
  const pct = Number(progress?.pct || 0);
  return `
    <div class="net-course-progress">
      <div class="d-flex align-items-center justify-content-between small text-muted mb-2">
        <span>Course progress</span>
        <span class="fw-semibold">${pct}%</span>
      </div>
      <div class="net-meter" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="net-meter-fill" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}

function setCachedCourseIndex(index) {
  try {
    localStorage.setItem("netology_courses_cache", JSON.stringify(index));
    localStorage.setItem("netology_courses_cache_ts", String(Date.now()));
    localStorage.setItem("netology_courses_cache_v", COURSE_CACHE_VERSION);
  } catch {}
}

/* =========================================================
   Chrome (sidebar + dropdown + search)
========================================================= */

function wireChrome(user) {
  // Slide sidebar (same as dashboard)
  const openBtn = getById("openSidebarBtn");
  const closeBtn = getById("closeSidebarBtn");
  const sidebar = getById("slideSidebar");
  const backdrop = getById("sideBackdrop");

  // User dropdown
  const userBtn = getById("userBtn");
  const dd = getById("userDropdown");

  // Search
  const topSearch = getById("topSearch");
  const courseSearch = getById("courseSearch");
  const mobileSearch = getById("mobileSearch");

  // Logout buttons
  const topLogout = getById("topLogoutBtn");
  const sideLogout = getById("sideLogoutBtn");

  // Fill user identity
  const initial = (user.first_name || user.name || user.username || "S").trim().charAt(0).toUpperCase();
  const fullName = user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "Student";

  setText("topAvatar", initial);
  setText("topUserName", fullName);
  setText("ddName", fullName);
  setText("ddEmail", user.email || "");
  setText("sideAvatar", initial);
  setText("sideUserName", fullName);
  setText("sideUserEmail", user.email || "");

  function openSidebar() {
    if (!sidebar || !backdrop) return;
    sidebar.classList.add("is-open");
    backdrop.classList.add("is-open");
    document.body.classList.add("net-noscroll");
    sidebar.setAttribute("aria-hidden", "false");
  }

  function closeSidebar() {
    if (!sidebar || !backdrop) return;
    sidebar.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    document.body.classList.remove("net-noscroll");
    sidebar.setAttribute("aria-hidden", "true");
  }

  function toggleDropdown(force) {
    if (!dd) return;
    const open = typeof force === "boolean" ? force : !dd.classList.contains("is-open");
    dd.classList.toggle("is-open", open);
    if (userBtn) userBtn.setAttribute("aria-expanded", String(open));
  }

  function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("netology_user");
    localStorage.removeItem("netology_token");
    window.location.href = "login.html";
  }

  openBtn?.addEventListener("click", openSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  backdrop?.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSidebar();
      toggleDropdown(false);
    }
  });

  if (userBtn) {
    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });
  }

  document.addEventListener("click", (e) => {
    if (!dd) return;
    const t = e.target;
    if (t && dd.contains(t)) return;
    if (userBtn && userBtn.contains(t)) return;
    toggleDropdown(false);
  });

  topLogout?.addEventListener("click", logout);
  sideLogout?.addEventListener("click", logout);

  // Search filters live (client-side)
  const searchInputs = [topSearch, courseSearch, mobileSearch].filter(Boolean);
  const handleSearch = (e) => {
    window.__coursesSearch = String(e.target.value || "");
    if (window.__coursesCache) {
      renderCourses(window.__coursesCache, window.__coursesUserLevel || 1);
    }
  };
  searchInputs.forEach((input) => input.addEventListener("input", handleSearch));
}

function setText(id, text) {
  const el = getById(id);
  if (el) el.textContent = text;
}

/* =========================================================
   User stats
========================================================= */

async function loadUserStats(email) {
  try {
    const res = await fetch(`${window.API_BASE}/user-info?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!data.success) return { level: 1, rank: "Novice" };

    const totalXP = Number(data.xp || data.total_xp || 0);
    const level = levelFromXP(totalXP);
    const fallbackUser = getCurrentUser();
    const fallbackRank = String(fallbackUser?.unlock_tier || fallbackUser?.rank || fallbackUser?.level || "Novice");
    const rankRaw = String(data.start_level || fallbackRank || data.rank || "Novice");
    const rank = rankRaw.charAt(0).toUpperCase() + rankRaw.slice(1);
    const unlockTier = String(data.start_level || fallbackUser?.unlock_tier || fallbackUser?.unlock_level || "novice").toLowerCase();
    const accessLevel = Math.max(level, unlockLevelFromTier(unlockTier));

    const mergedUser = {
      ...(fallbackUser || {}),
      email,
      first_name: data.first_name || fallbackUser?.first_name,
      last_name: data.last_name || fallbackUser?.last_name,
      username: data.username || fallbackUser?.username,
      xp: totalXP,
      unlock_tier: ["novice", "intermediate", "advanced"].includes(unlockTier) ? unlockTier : "novice"
    };
    localStorage.setItem("user", JSON.stringify(mergedUser));
    localStorage.setItem("netology_user", JSON.stringify(mergedUser));

    const levelEl = getById("levelText");
    const rankEl = getById("rankText");
    if (levelEl) levelEl.textContent = level;
    if (rankEl) rankEl.textContent = rank;

    return { level, rank, accessLevel };
  } catch (e) {
    console.error("loadUserStats error:", e);
    const fallbackUser = getCurrentUser();
    const totalXP = Number(fallbackUser?.xp || 0);
    const level = levelFromXP(totalXP);
    const rankRaw = String(fallbackUser?.unlock_tier || fallbackUser?.rank || fallbackUser?.level || "Novice");
    const rank = rankRaw.charAt(0).toUpperCase() + rankRaw.slice(1);
    const accessLevel = Math.max(level, unlockLevelFromTier(fallbackUser?.unlock_tier));
    return { level, rank, accessLevel };
  }
}

/* =========================================================
   Courses loading + rendering
========================================================= */

function isLocked(course, userLevel) {
  if (!course) return { locked: false, required: 1, difficulty: "Novice" };
  const difficulty = String(course.difficulty || "novice");
  const required = Number(course.required_level || 0) || unlockLevelFromTier(difficulty);
  return { locked: userLevel < required, required, difficulty };
}

async function loadAllCourses(email, userLevel) {
  window.__coursesUserEmail = email;
  const noviceRow = getById("noviceRow");
  const intermediateRow = getById("intermediateRow");
  const advancedRow = getById("advancedRow");
  if (!noviceRow || !intermediateRow || !advancedRow) return;

  const cached = getCachedCourseIndex();
  if (cached.index && cached.fresh) {
    const list = Object.keys(cached.index).map((k) => cached.index[k]).filter(Boolean);
    window.__coursesCache = list;
    window.__coursesUserLevel = userLevel;
    renderCourses(list, userLevel);
    return;
  }

  try {
    const res = await fetch(`${window.API_BASE}/courses`);
    const data = await res.json();
    const courses = data.success ? (data.courses || []) : [];
    if (courses.length) {
      const merged = courses.map((c) => normalizeApiCourse(c));
      const index = {};
      merged.forEach((c) => { index[String(c.id)] = c; });
      setCachedCourseIndex(index);
      window.__coursesCache = merged;
      window.__coursesUserLevel = userLevel;
      renderCourses(merged, userLevel);
      return;
    }
    window.__coursesCache = [];
    window.__coursesUserLevel = userLevel;
    renderCourses([], userLevel);
  } catch (e) {
    console.error("loadAllCourses error:", e);
    if (cached.index) {
      const list = Object.keys(cached.index).map((k) => cached.index[k]).filter(Boolean);
      window.__coursesCache = list;
      window.__coursesUserLevel = userLevel;
      renderCourses(list, userLevel);
    } else {
      window.__coursesCache = [];
      window.__coursesUserLevel = userLevel;
      renderCourses([], userLevel);
    }
  }
}

function renderCourses(courses, userLevel) {
  const noviceRow = getById("noviceRow");
  const intermediateRow = getById("intermediateRow");
  const advancedRow = getById("advancedRow");
  if (!noviceRow || !intermediateRow || !advancedRow) return;

  const q = String(window.__coursesSearch || "").trim().toLowerCase();
  const email = String(window.__coursesUserEmail || "");

  noviceRow.innerHTML = "";
  intermediateRow.innerHTML = "";
  advancedRow.innerHTML = "";

  const counts = { novice: 0, intermediate: 0, advanced: 0 };

  (courses || []).forEach((c) => {
    const lock = isLocked(c, userLevel);
    const diff = String(lock.difficulty || c.difficulty || "Novice").toLowerCase();

    // Search filter
    if (q) {
      const hay = `${c.title || ""} ${c.category || ""} ${c.description || ""}`.toLowerCase();
      if (!hay.includes(q)) return;
    }

    const row =
      diff === "advanced" ? advancedRow :
        diff === "intermediate" ? intermediateRow :
          noviceRow;

    const progress = computeCourseProgress(c, email);
    row.insertAdjacentHTML("beforeend", courseCardHtml(c, lock, progress));
    if (diff === "advanced" || diff === "intermediate" || diff === "novice") {
      counts[diff] += 1;
    } else {
      counts.novice += 1;
    }
  });

  renderTrackEmpty(noviceRow, counts.novice, "No novice courses match this search yet.");
  renderTrackEmpty(intermediateRow, counts.intermediate, "No intermediate courses match this search yet.");
  renderTrackEmpty(advancedRow, counts.advanced, "No advanced courses match this search yet.");
}

function courseCardHtml(course, lock, progress) {
  const lockedText = lock.locked ? `Locked — unlocks at Level ${lock.required}` : "";

  const diff = String(lock.difficulty || "Novice").toLowerCase();
  const gradClass =
    diff === "advanced" ? "net-grad-adv" :
      diff === "intermediate" ? "net-grad-int" :
        "net-grad-nov";

  const diffBadgeClass =
    diff === "advanced" ? "net-badge-adv" :
      diff === "intermediate" ? "net-badge-int" :
        "net-badge-nov";

  const diffLabel = diff === "advanced" ? "Advanced" : diff === "intermediate" ? "Intermediate" : "Novice";

  const lessons = Number(course.total_lessons || course.totalLessons || 0);
  const time = course.estimated_time || course.estimatedTime || "—";
  const totalXP = Number(course.totalXP || course.total_xp || course.xpReward || course.xp_reward || 0);

  const btnLabel = lock.locked ? `Level ${lock.required} required` : "Open";
  const btnClass = lock.locked ? "btn btn-outline-secondary" : "btn btn-teal";
  const btnAttr = lock.locked ? "disabled" : `onclick="window.location.href='course.html?id=${encodeURIComponent(course.id)}'"`;

  const lockedOverlay = lock.locked
    ? `<div class="net-course-lock" aria-hidden="true">
         <div class="net-course-lock-inner"><i class="bi bi-lock-fill me-1"></i> Level ${lock.required}+ to unlock</div>
       </div>`
    : "";

  const cardAction = lock.locked ? "" : `onclick="window.location.href='course.html?id=${encodeURIComponent(course.id)}'"`;
  const sandboxLink = `sandbox.html?course_id=${encodeURIComponent(course.id)}`;
  const diffIcon =
    diffLabel.toLowerCase() === "advanced" ? "bi-shield-lock-fill"
      : diffLabel.toLowerCase() === "intermediate" ? "bi-lightning-charge-fill"
        : "bi-leaf-fill";

  const progressHtml = renderCourseProgress(progress);

  return `
    <article class="net-coursecard net-coursecard--library ${lock.locked ? "is-locked" : ""}" tabindex="0" role="button" aria-label="Open course ${escapeHtml(course.title)}" ${cardAction}>
      ${lockedOverlay}
      <div class="net-coursebar ${gradClass}"></div>
      <div class="p-4">
        <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
          <div>
            <div class="d-flex align-items-center gap-2 mb-2">
              ${course.category ? `<span class="net-cat-chip">${escapeHtml(course.category)}</span>` : ``}
              ${lock.locked ? `<span class="net-lock-badge"><i class="bi bi-lock-fill"></i>Locked</span>` : ``}
            </div>
            <div class="fw-semibold fs-5">${escapeHtml(course.title)}</div>
          </div>
          <span class="net-diffbadge ${diffBadgeClass}">
            <i class="bi ${diffIcon}"></i>
            ${diffLabel}
          </span>
        </div>

        ${course.description ? `<div class="text-muted small mb-3">${escapeHtml(course.description)}</div>` : ""}

        ${progressHtml}

        <div class="net-course-meta d-flex flex-wrap gap-3 small text-muted mb-3 course-meta">
          <span class="d-inline-flex align-items-center gap-1">
            <i class="bi bi-collection" aria-hidden="true"></i> ${lessons || 0} lessons
          </span>
          <span class="d-inline-flex align-items-center gap-1">
            <i class="bi bi-clock" aria-hidden="true"></i> ${escapeHtml(time || "—")}
          </span>
          <span class="d-inline-flex align-items-center gap-1 net-xp-accent fw-semibold">
            <i class="bi bi-lightning-charge-fill" aria-hidden="true"></i> ${totalXP || 0} XP
          </span>
        </div>

        ${lock.locked ? `<div class="net-lockline mb-3"><i class="bi bi-lock me-2"></i>${escapeHtml(lockedText)}</div>` : ""}

        <div class="d-flex gap-2 flex-wrap course-cta">
          <button class="${btnClass} btn-sm" type="button" ${btnAttr} title="Open this course to view modules and lessons">${escapeHtml(btnLabel)}</button>
          <a class="btn btn-soft btn-sm net-btn-icon" href="${sandboxLink}" title="Open the sandbox for a network simulation challenge">
            <i class="bi bi-diagram-3 me-1"></i>Sandbox
          </a>
        </div>
      </div>
    </article>
  `;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderTrackEmpty(row, count, message) {
  if (!row) return;
  if (count > 0) return;

  row.innerHTML = `
    <div class="net-empty net-empty--tiny">
      <i class="bi bi-search"></i>
      <div class="fw-semibold">Nothing to show</div>
      <div class="small text-muted">${escapeHtml(message)}</div>
    </div>
  `;
}
