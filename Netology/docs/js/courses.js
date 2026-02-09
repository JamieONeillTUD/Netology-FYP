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

const XP_PER_LEVEL = 100;

document.addEventListener("DOMContentLoaded", async () => {
  const user = getCurrentUser();
  if (!user.email) {
    window.location.href = "login.html";
    return;
  }

  wireChrome(user);

  const stats = await loadUserStats(user.email);
  await loadAllCourses(user.email, stats.level);
});

function levelFromXP(totalXP) {
  const xp = Math.max(0, Number(totalXP) || 0);
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

function getCurrentUser() {
  try {
    return (
      JSON.parse(localStorage.getItem("netology_user") || "null") ||
      JSON.parse(localStorage.getItem("user") || "null") ||
      {}
    );
  } catch {
    return {};
  }
}

function wireChrome(user) {
  // Slide sidebar (same as dashboard)
  const openBtn = document.getElementById("openSidebarBtn");
  const closeBtn = document.getElementById("closeSidebarBtn");
  const sidebar = document.getElementById("slideSidebar");
  const backdrop = document.getElementById("sideBackdrop");

  // User dropdown
  const userBtn = document.getElementById("userBtn");
  const dd = document.getElementById("userDropdown");

  // Search
  const topSearch = document.getElementById("topSearch");
  const courseSearch = document.getElementById("courseSearch");
  const mobileSearch = document.getElementById("mobileSearch");

  // Logout buttons
  const topLogout = document.getElementById("topLogoutBtn");
  const sideLogout = document.getElementById("sideLogoutBtn");

  // Fill user identity
  const initial = (user.first_name || user.name || user.username || "S").trim().charAt(0).toUpperCase();
  const fullName = user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "Student";

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

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

  if (openBtn) openBtn.addEventListener("click", openSidebar);
  if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
  if (backdrop) backdrop.addEventListener("click", closeSidebar);

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

  if (topLogout) topLogout.addEventListener("click", logout);
  if (sideLogout) sideLogout.addEventListener("click", logout);

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

async function loadUserStats(email) {
  try {
    const res = await fetch(`${window.API_BASE}/user-info?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!data.success) return { level: 1, rank: "Novice" };

    const totalXP = Number(data.xp || data.total_xp || 0);
    const level = levelFromXP(totalXP);
    const fallbackUser = getCurrentUser();
    const fallbackRank = String(fallbackUser?.unlock_tier || fallbackUser?.rank || fallbackUser?.level || "Novice");
    const rankRaw = String(data.rank || fallbackRank || "Novice");
    const rank = rankRaw.charAt(0).toUpperCase() + rankRaw.slice(1);

    const levelEl = document.getElementById("levelText");
    const rankEl = document.getElementById("rankText");
    if (levelEl) levelEl.textContent = level;
    if (rankEl) rankEl.textContent = rank;

    return { level, rank };
  } catch (e) {
    console.error("loadUserStats error:", e);
    const fallbackUser = getCurrentUser();
    const totalXP = Number(fallbackUser?.xp || 0);
    const level = levelFromXP(totalXP);
    const rankRaw = String(fallbackUser?.unlock_tier || fallbackUser?.rank || fallbackUser?.level || "Novice");
    const rank = rankRaw.charAt(0).toUpperCase() + rankRaw.slice(1);
    return { level, rank };
  }
}

function getCourseMeta(courseId) {
  if (typeof COURSE_CONTENT === "undefined") return null;
  return COURSE_CONTENT[String(courseId)] || null;
}

function isLocked(courseId, userLevel) {
  const meta = getCourseMeta(courseId);
  if (!meta) return { locked: false, required: 1, difficulty: "Novice" };

  const required = Number(meta.required_level || 1);
  const difficulty = String(meta.difficulty || "Novice");
  return { locked: userLevel < required, required, difficulty };
}

async function loadAllCourses(email, userLevel) {
  const noviceRow = document.getElementById("noviceRow");
  const intermediateRow = document.getElementById("intermediateRow");
  const advancedRow = document.getElementById("advancedRow");
  if (!noviceRow || !intermediateRow || !advancedRow) return;

  try {
    const res = await fetch(`${window.API_BASE}/courses`);
    const data = await res.json();
    const courses = data.success ? (data.courses || []) : [];
    if (courses.length) {
      window.__coursesCache = courses;
      window.__coursesUserLevel = userLevel;
      renderCourses(courses, userLevel);
      return;
    }
    // fallback to local content if API empty
    const fallback = buildCoursesFromContent();
    window.__coursesCache = fallback;
    window.__coursesUserLevel = userLevel;
    renderCourses(fallback, userLevel);
  } catch (e) {
    console.error("loadAllCourses error:", e);
    const fallback = buildCoursesFromContent();
    window.__coursesCache = fallback;
    window.__coursesUserLevel = userLevel;
    renderCourses(fallback, userLevel);
  }
}

function renderCourses(courses, userLevel) {
  const noviceRow = document.getElementById("noviceRow");
  const intermediateRow = document.getElementById("intermediateRow");
  const advancedRow = document.getElementById("advancedRow");
  if (!noviceRow || !intermediateRow || !advancedRow) return;

  const q = String(window.__coursesSearch || "").trim().toLowerCase();

  noviceRow.innerHTML = "";
  intermediateRow.innerHTML = "";
  advancedRow.innerHTML = "";

  const counts = { novice: 0, intermediate: 0, advanced: 0 };

  (courses || []).forEach((c) => {
    const lock = isLocked(c.id, userLevel);
    const diff = String(lock.difficulty || "Novice").toLowerCase();

    // Search filter
    if (q) {
      const hay = `${c.title || ""} ${c.category || ""} ${c.description || ""}`.toLowerCase();
      if (!hay.includes(q)) return;
    }

    const row =
      diff === "advanced" ? advancedRow :
      diff === "intermediate" ? intermediateRow :
      noviceRow;

    row.insertAdjacentHTML("beforeend", courseCardHtml(c, lock));
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

function courseCardHtml(course, lock) {
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

  const modules =
    Number(course.moduleCount || course.modules_count || course.modules?.length || course.units?.length || 0);
  const time = course.estimatedTime || course.estimated_time || course.time || "—";
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

  return `
    <article class="net-coursecard net-coursecard--library ${lock.locked ? "is-locked" : ""}" tabindex="0" role="button" aria-label="Open course ${escapeHtml(course.title)}" ${cardAction}>
      ${lockedOverlay}
      <div class="net-coursebar ${gradClass}"></div>
      <div class="p-4">
        <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
          <div>
            <div class="net-eyebrow">${escapeHtml(course.category || "Core")}</div>
            <div class="fw-semibold fs-5">${escapeHtml(course.title)}</div>
          </div>
          <span class="net-diffbadge ${diffBadgeClass}">${diffLabel}</span>
        </div>

        <div class="text-muted small mb-3">${escapeHtml(course.description || "")}</div>

        <div class="net-course-meta d-flex flex-wrap gap-3 small text-muted mb-3">
          <span class="d-inline-flex align-items-center gap-1">
            <i class="bi bi-collection" aria-hidden="true"></i> ${modules || 0} modules
          </span>
          <span class="d-inline-flex align-items-center gap-1">
            <i class="bi bi-clock" aria-hidden="true"></i> ${escapeHtml(time)}
          </span>
          <span class="d-inline-flex align-items-center gap-1 net-xp-accent fw-semibold">
            <i class="bi bi-lightning-charge-fill" aria-hidden="true"></i> ${totalXP || 0} XP
          </span>
        </div>

        ${lock.locked ? `<div class="net-lockline mb-3"><i class="bi bi-lock me-2"></i>${escapeHtml(lockedText)}</div>` : ""}

        <div class="d-flex gap-2 flex-wrap">
          <button class="${btnClass} btn-sm" type="button" ${btnAttr}>${escapeHtml(btnLabel)}</button>
          <a class="btn btn-outline-secondary btn-sm" href="${sandboxLink}"><i class="bi bi-diagram-3 me-1"></i>Sandbox</a>
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

function buildCoursesFromContent() {
  if (typeof COURSE_CONTENT === "undefined") return [];
  return Object.values(COURSE_CONTENT).map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    category: course.category || "Core",
    difficulty: course.difficulty,
    required_level: course.required_level,
    estimatedTime: course.estimatedTime || course.estimated_time || "—",
    totalXP: calcCourseXP(course),
    moduleCount: Array.isArray(course.units) ? course.units.length : (course.modules?.length || 0),
  }));
}

function calcCourseXP(course) {
  let total = 0;
  const units = course.units || course.modules || [];
  units.forEach((unit) => {
    const sections = Array.isArray(unit.sections) ? unit.sections : [];
    sections.forEach((sec) => {
      (sec.items || sec.lessons || []).forEach((it) => {
        total += Number(it.xp || it.xpReward || 0);
      });
    });
  });
  if (!total) total = Number(course.xpReward || course.totalXP || 0);
  return total || 0;
}
