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

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.email) {
    window.location.href = "login.html";
    return;
  }

  wireChrome(user);

  const stats = await loadUserStats(user.email);
  await loadAllCourses(user.email, stats.level);
});

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
  if (topSearch) {
    topSearch.addEventListener("input", (e) => {
      window.__coursesSearch = String(e.target.value || "");
      // Re-render if we already loaded
      if (window.__coursesCache) {
        renderCourses(window.__coursesCache, window.__coursesUserLevel || 1);
      }
    });
  }
}

async function loadUserStats(email) {
  try {
    const res = await fetch(`${window.API_BASE}/user-info?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!data.success) return { level: 1, rank: "Novice" };

    const level = Number(data.numeric_level || 1);
    const rank = String(data.rank || "Novice");

    const levelEl = document.getElementById("levelText");
    const rankEl = document.getElementById("rankText");
    if (levelEl) levelEl.textContent = level;
    if (rankEl) rankEl.textContent = rank;

    return { level, rank };
  } catch (e) {
    console.error("loadUserStats error:", e);
    return { level: 1, rank: "Novice" };
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
    if (!data.success) return;

    const courses = data.courses || [];

    noviceRow.innerHTML = "";
    intermediateRow.innerHTML = "";
    advancedRow.innerHTML = "";

    // Cache for search
    window.__coursesCache = courses;
    window.__coursesUserLevel = userLevel;
    renderCourses(courses, userLevel);

  } catch (e) {
    console.error("loadAllCourses error:", e);
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
  });
}

function courseCardHtml(course, lock) {
  const lockedText = lock.locked ? `Locked — unlocks at Level ${lock.required}` : "";

  const diff = String(lock.difficulty || "Novice").toLowerCase();
  const topBarClass =
    diff === "advanced" ? "is-advanced" :
    diff === "intermediate" ? "is-intermediate" :
    "is-novice";

  const diffBadge =
    diff === "advanced"
      ? `<span class="badge bg-danger">Advanced</span>`
      : diff === "intermediate"
        ? `<span class="badge bg-info text-dark">Intermediate</span>`
        : `<span class="badge text-bg-light border">Novice</span>`;

  const btnLabel = lock.locked ? `Level ${lock.required} required` : "Open";
  const btnClass = lock.locked ? "btn btn-outline-secondary" : "btn btn-teal";
  const btnAttr = lock.locked ? "disabled" : `onclick="window.location.href='course.html?id=${encodeURIComponent(course.id)}'"`;

  const lockedOverlay = lock.locked
    ? `<div class="net-course-lock" aria-hidden="true">
         <div class="net-course-lock-inner"><i class="bi bi-lock-fill me-1"></i> Level ${lock.required}+ to unlock</div>
       </div>`
    : "";

  return `
    <article class="net-course-card ${topBarClass} ${lock.locked ? "is-locked" : ""}" tabindex="0" role="button" aria-label="Open course ${escapeHtml(course.title)}">
      ${lockedOverlay}
      <div class="p-4">
        <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
          <div>
            <div class="small text-muted">${escapeHtml(course.category || "General")}</div>
            <div class="fw-semibold">${escapeHtml(course.title)}</div>
          </div>
          ${diffBadge}
        </div>

        <div class="text-muted small mb-3">${escapeHtml(course.description || "")}</div>

        ${lock.locked ? `<div class="net-lockline mb-3"><i class="bi bi-lock me-2"></i>${escapeHtml(lockedText)}</div>` : ""}

        <div class="d-flex gap-2 flex-wrap">
          <button class="${btnClass} btn-sm" type="button" ${btnAttr}>${escapeHtml(btnLabel)}</button>
          <a class="btn btn-outline-secondary btn-sm" href="sandbox.html"><i class="bi bi-diagram-3 me-1"></i>Sandbox</a>
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
