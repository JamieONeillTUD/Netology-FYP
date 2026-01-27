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

  wireMenu();

  const stats = await loadUserStats(user.email);
  await loadAllCourses(user.email, stats.level);
});

function wireMenu() {
  const menuBtn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("closeMenuBtn");
  const drawer = document.getElementById("drawer");
  const backdrop = document.getElementById("drawerBackdrop");
  const logoutBtn = document.getElementById("logoutBtn");

  function openMenu() {
    drawer.classList.add("open");
    backdrop.classList.remove("d-none");
  }
  function closeMenu() {
    drawer.classList.remove("open");
    backdrop.classList.add("d-none");
  }

  if (menuBtn) menuBtn.addEventListener("click", openMenu);
  if (closeBtn) closeBtn.addEventListener("click", closeMenu);
  if (backdrop) backdrop.addEventListener("click", closeMenu);

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });
  }
}

async function loadUserStats(email) {
  try {
    const res = await fetch(`/user-info?email=${encodeURIComponent(email)}`);
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
    const res = await fetch(`/courses`);
    const data = await res.json();
    if (!data.success) return;

    const courses = data.courses || [];

    noviceRow.innerHTML = "";
    intermediateRow.innerHTML = "";
    advancedRow.innerHTML = "";

    courses.forEach((c) => {
      const lock = isLocked(c.id, userLevel);
      const diff = lock.difficulty.toLowerCase();

      const row =
        diff === "advanced" ? advancedRow :
        diff === "intermediate" ? intermediateRow :
        noviceRow;

      row.insertAdjacentHTML("beforeend", courseCardHtml(c, lock));
    });

  } catch (e) {
    console.error("loadAllCourses error:", e);
  }
}

function courseCardHtml(course, lock) {
  const pct = 0; // all courses page is browsing; progress shown on dashboard/course page
  const lockedText = lock.locked ? `Locked — unlocks at Level ${lock.required}` : "";
  const launchBtn = lock.locked
    ? `<button class="btn btn-secondary btn-sm" disabled>Locked</button>`
    : `<a class="btn btn-teal btn-sm" href="course.html?id=${course.id}">Launch course</a>`;

  const diffBadge =
    lock.difficulty.toLowerCase() === "advanced"
      ? `<span class="badge bg-danger">Advanced</span>`
      : lock.difficulty.toLowerCase() === "intermediate"
        ? `<span class="badge bg-info text-dark">Intermediate</span>`
        : `<span class="badge text-bg-light border">Novice</span>`;

  return `
    <div class="col-md-4">
      <div class="net-card p-4 h-100">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
          <div class="fw-semibold">${escapeHtml(course.title)}</div>
          ${diffBadge}
        </div>

        <div class="text-muted small mb-3">${escapeHtml(course.description || "")}</div>

        ${lock.locked ? `<div class="small text-danger mb-3">${escapeHtml(lockedText)}</div>` : ""}

        <div class="d-flex gap-2 flex-wrap">
          ${launchBtn}
          <a class="btn btn-outline-secondary btn-sm" href="sandbox.html">Sandbox</a>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
