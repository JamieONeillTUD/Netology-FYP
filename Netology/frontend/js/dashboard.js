/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript
---------------------------------------
dashboard.js – Modern dashboard landing page.

- Loads user info (xp/level)
- Shows course cards with progress
- "Continue learning" takes user back into a course
- Hamburger menu + logout

UPDATES ADDED (simple, same style):
- Reads COURSE_CONTENT for difficulty + required_level
- Locks courses until user reaches required level
- Shows Novice / Intermediate / Advanced badges on cards
- Continue Learning only picks an unlocked course
*/

let __dashState = {
  email: "",
  level: 1
};

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!user.email) {
    window.location.href = "login.html";
    return;
  }

  __dashState.email = user.email;

  wireMenu();
  const name = user.first_name || user.username || "Student";
  const welcome = document.getElementById("welcomeName");
  if (welcome) welcome.textContent = name;

  await loadUserStats(user.email);
  await loadUserCourses(user.email);
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
    // You likely already have a /user-info route. If yours is different, tell me.
    const res = await fetch(`/user-info?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (!data.success) return;

    const xp = Number(data.xp || 0);
    const level = Number(data.level || 1);
    const next = Number(data.next_level_xp || 100);
    const pct = Math.max(0, Math.min(100, Math.round((xp / Math.max(next, 1)) * 100)));

    __dashState.level = level;

    const levelText = document.getElementById("levelText");
    const xpText = document.getElementById("xpText");
    const xpBar = document.getElementById("xpBar");
    const xpNextText = document.getElementById("xpNextText");

    if (levelText) levelText.textContent = level;
    if (xpText) xpText.textContent = xp;
    if (xpBar) xpBar.style.width = `${pct}%`;
    if (xpNextText) xpNextText.textContent = `${xp} / ${next}`;
  } catch (e) {
    console.error("loadUserStats error:", e);
  }
}

/*
AI PROMPTED CODE BELOW:
"Can you write helper functions that read COURSE_CONTENT so I can show difficulty badges
and lock courses until the user level is high enough?"
*/
function getCourseMeta(courseId) {
  if (typeof COURSE_CONTENT === "undefined") return null;
  return COURSE_CONTENT[String(courseId)] || null;
}

function difficultyBadge(difficulty) {
  const d = String(difficulty || "").toLowerCase();
  if (d === "novice") return `<span class="badge text-bg-light border">Novice</span>`;
  if (d === "intermediate") return `<span class="badge bg-info text-dark">Intermediate</span>`;
  if (d === "advanced") return `<span class="badge bg-danger">Advanced</span>`;
  return `<span class="badge text-bg-light border">Course</span>`;
}

function isLocked(courseId, userLevel) {
  const meta = getCourseMeta(courseId);
  if (!meta) return { locked: false, required: 1 };
  const required = Number(meta.required_level || 1);
  return { locked: userLevel < required, required };
}

async function loadUserCourses(email) {
  const grid = document.getElementById("coursesGrid");
  const continueBox = document.getElementById("continueBox");
  if (!grid || !continueBox) return;

  try {
    const res = await fetch(`/user-courses?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (!data.success) {
      continueBox.textContent = "Could not load courses.";
      return;
    }

    const courses = data.courses || [];
    const level = Number(__dashState.level || 1);

    // Continue: pick first in-progress that is unlocked, else first unlocked, else first course
    let candidate = courses.find(c => c.status === "in-progress" && !isLocked(c.id, level).locked);
    if (!candidate) candidate = courses.find(c => !isLocked(c.id, level).locked) || courses[0];

    if (candidate) {
      const lockInfo = isLocked(candidate.id, level);
      const meta = getCourseMeta(candidate.id);
      const diff = meta ? meta.difficulty : "";

      if (lockInfo.locked) {
        continueBox.innerHTML = `
          <div class="net-continue-card">
            <div class="fw-semibold">${escapeHtml(candidate.title)}</div>
            <div class="small text-muted mb-2">${escapeHtml(candidate.description || "")}</div>
            <div class="small text-muted mb-2">
              Locked — unlocks at <span class="fw-semibold">Level ${lockInfo.required}</span>
            </div>
            <div class="d-flex gap-2 flex-wrap">
              ${difficultyBadge(diff)}
              <a class="btn btn-outline-secondary btn-sm" href="courses.html">Browse unlocked courses</a>
            </div>
          </div>
        `;
      } else {
        continueBox.innerHTML = `
          <div class="net-continue-card">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div class="fw-semibold">${escapeHtml(candidate.title)}</div>
              ${difficultyBadge(diff)}
            </div>
            <div class="small text-muted mb-2">${escapeHtml(candidate.description || "")}</div>
            <div class="small text-muted mb-2">
              Progress: <span class="fw-semibold">${candidate.progress_pct || 0}%</span>
            </div>
            <a class="btn btn-teal btn-sm" href="course.html?id=${candidate.id}">Continue</a>
          </div>
        `;
      }
    } else {
      continueBox.textContent = "No courses available yet.";
    }

    // Render cards
    grid.innerHTML = "";
    courses.forEach(c => {
      const pct = Number(c.progress_pct || 0);

      const statusBadge = c.status === "completed"
        ? `<span class="badge bg-success">Completed</span>`
        : (c.status === "in-progress"
          ? `<span class="badge bg-info text-dark">In progress</span>`
          : `<span class="badge text-bg-light border">Not started</span>`);

      const meta = getCourseMeta(c.id);
      const diff = meta ? meta.difficulty : "";
      const lockInfo = isLocked(c.id, level);

      const btnText = c.status === "completed" ? "Review" : "Launch course";
      const disabledAttr = lockInfo.locked ? "disabled aria-disabled='true'" : "";
      const lockLine = lockInfo.locked
        ? `<div class="small text-danger mt-2">Locked — unlocks at Level ${lockInfo.required}</div>`
        : "";

      // IMPORTANT: disable button when locked (prevents sending user into a course they can’t access yet)
      const launchBtn = lockInfo.locked
        ? `<button class="btn btn-secondary btn-sm" ${disabledAttr}>Locked</button>`
        : `<a class="btn btn-teal btn-sm" href="course.html?id=${c.id}">${btnText}</a>`;

      grid.insertAdjacentHTML("beforeend", `
        <div class="col-md-6">
          <div class="net-card p-4 h-100">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
              <div>
                <div class="fw-semibold">${escapeHtml(c.title)}</div>
                <div class="d-flex gap-2 flex-wrap mt-2">
                  ${difficultyBadge(diff)}
                  ${statusBadge}
                </div>
              </div>
            </div>

            <div class="text-muted small mb-3">${escapeHtml(c.description || "")}</div>

            <div class="small text-muted d-flex justify-content-between">
              <span>Progress</span>
              <span class="fw-semibold">${pct}%</span>
            </div>
            <div class="progress mb-2" style="height:10px;">
              <div class="progress-bar bg-teal" style="width:${pct}%"></div>
            </div>

            ${lockLine}

            <div class="d-flex gap-2 flex-wrap mt-3">
              ${launchBtn}
              <a class="btn btn-outline-secondary btn-sm" href="sandbox.html">Sandbox</a>
            </div>
          </div>
        </div>
      `);
    });

  } catch (e) {
    console.error("loadUserCourses error:", e);
    continueBox.textContent = "Server error loading courses.";
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
