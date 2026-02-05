/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript
---------------------------------------
dashboard.js – Netology Dashboard (Modern)

Purpose:
- Loads user info and renders a modern dashboard UI
- Shows:
  - Welcome name
  - Level + rank + XP progress
  - Continue learning card
  - Course grid with locks + progress bars
  - Filters (search + difficulty chips)
- Hamburger drawer navigation + logout

Backend routes used:
- GET /user-info?email=
- GET /user-courses?email=

Notes:
- Uses COURSE_CONTENT for difficulty + required_level
- Uses localStorage.user.unlock_tier to unlock courses by tier:
  novice | intermediate | advanced
  (If missing, defaults to "novice")
- Uses Bootstrap Icons only (no emojis)
*/

// Safe: ensure API base is never undefined
const API_BASE = (window.API_BASE || "").replace(/\/$/, "");

let __dashState = {
  email: "",
  numericLevel: 1,
  rank: "Novice",
  xp: 0,

  // unlock tier chosen at signup (does NOT change numeric level)
  unlockTier: "novice",

  // courses cached for filtering
  courses: [],
  filter: {
    q: "",
    diff: "all"
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!user.email) {
    window.location.href = "login.html";
    return;
  }

  __dashState.email = user.email;

  // Unlock tier stored on user object (we keep it flexible)
  // Supports: user.unlock_tier OR user.unlock_level OR user.unlockTier
  __dashState.unlockTier = String(user.unlock_tier || user.unlock_level || user.unlockTier || "novice")
    .trim()
    .toLowerCase();

  if (!["novice", "intermediate", "advanced"].includes(__dashState.unlockTier)) {
    __dashState.unlockTier = "novice";
  }

  wireMenu();
  wireFilters();

  const name = user.first_name || user.username || "Student";
  setText("welcomeName", name);

  await loadUserStats(user.email);
  await loadUserCourses(user.email);

  renderLockNote();
});

/* =========================================================
   HAMBURGER MENU
========================================================= */
function wireMenu() {
  const menuBtn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("closeMenuBtn");
  const drawer = document.getElementById("drawer");
  const backdrop = document.getElementById("drawerBackdrop");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!drawer || !backdrop) return;

  function openMenu() {
    drawer.classList.add("open");
    backdrop.classList.remove("d-none");
    drawer.setAttribute("aria-hidden", "false");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    drawer.classList.remove("open");
    backdrop.classList.add("d-none");
    drawer.setAttribute("aria-hidden", "true");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  }

  menuBtn?.addEventListener("click", openMenu);
  closeBtn?.addEventListener("click", closeMenu);
  backdrop?.addEventListener("click", closeMenu);

  // ESC closes menu (accessibility)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "login.html";
  });
}

/* =========================================================
   FILTERS (search + difficulty chips)
========================================================= */
function wireFilters() {
  const search = document.getElementById("courseSearch");
  const chips = Array.from(document.querySelectorAll(".net-chip"));

  search?.addEventListener("input", (e) => {
    __dashState.filter.q = String(e.target.value || "").trim().toLowerCase();
    renderCourses();
  });

  chips.forEach((btn) => {
    btn.addEventListener("click", () => {
      chips.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      __dashState.filter.diff = String(btn.getAttribute("data-diff") || "all");
      renderCourses();
    });
  });
}

function renderLockNote() {
  const lockNote = document.getElementById("lockNote");
  if (!lockNote) return;

  const t = __dashState.unlockTier;
  if (t === "advanced") {
    lockNote.textContent = "You have unlocked Novice, Intermediate and Advanced content.";
  } else if (t === "intermediate") {
    lockNote.textContent = "You have unlocked Novice and Intermediate content. Advanced remains locked.";
  } else {
    lockNote.textContent = "You have unlocked Novice content. Intermediate and Advanced remain locked.";
  }

  setText("unlockText", `Unlock tier: ${cap(t)}`);
}

/* =========================================================
   USER STATS (level + XP)
========================================================= */
async function loadUserStats(email) {
  try {
    const res = await fetch(`${API_BASE}/user-info?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!data.success) return;

    const totalXp = Number(data.xp || 0);

    // Prefer backend numeric_level if present, else fallback to XP bands
    let numericLevel = Number(data.numeric_level || 0);
    let xpInto = Number(data.xp_into_level || 0);
    let xpNext = Number(data.next_level_xp || 0);

    if (!numericLevel || !xpNext) {
      const calc = __calcLevelFromXp(totalXp);
      numericLevel = calc.numericLevel;
      xpInto = calc.xpInto;
      xpNext = calc.xpNext;
    }

    // Rank: prefer backend rank/level if it’s valid, else compute
    let rank = String(data.rank || data.level || "").trim();
    const computedRank = __rankFromNumericLevel(numericLevel);

    if (!rank) rank = computedRank;
    else {
      const low = rank.toLowerCase();
      if (low !== "novice" && low !== "intermediate" && low !== "advanced") {
        rank = computedRank;
      }
    }

    const pct = clamp(Math.round((xpInto / Math.max(xpNext, 1)) * 100), 0, 100);

    __dashState.numericLevel = numericLevel;
    __dashState.rank = rank;
    __dashState.xp = totalXp;

    setText("levelText", String(numericLevel));
    setText("xpText", String(totalXp));
    setText("xpNextText", `${xpInto} / ${xpNext}`);

    const xpBar = document.getElementById("xpBar");
    if (xpBar) xpBar.style.width = `${pct}%`;

    // Rank badge
    const rankBadge = document.getElementById("rankBadge");
    if (rankBadge) {
      rankBadge.textContent = rank;
      rankBadge.className = `badge ${rankBadgeClass(rank)} border`;
    }

    // Stats grid values
    setText("statLevel", String(numericLevel));
    setText("statXp", String(totalXp));
    setText("statRank", `${rank} rank`);

  } catch (e) {
    console.error("loadUserStats error:", e);
  }
}

/* =========================================================
   COURSES
========================================================= */
async function loadUserCourses(email) {
  const grid = document.getElementById("coursesGrid");
  const continueBox = document.getElementById("continueBox");
  if (!grid || !continueBox) return;

  try {
    const res = await fetch(`${API_BASE}/user-courses?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (!data.success) {
      continueBox.textContent = "Could not load courses.";
      return;
    }

    __dashState.courses = Array.isArray(data.courses) ? data.courses : [];

    // Update stats: in progress + completed
    const inProg = __dashState.courses.filter(c => c.status === "in-progress").length;
    const comp = __dashState.courses.filter(c => c.status === "completed").length;
    setText("statInProgress", String(inProg));
    setText("statCompleted", String(comp));

    renderContinue();
    renderCourses();

  } catch (e) {
    console.error("loadUserCourses error:", e);
    continueBox.textContent = "Server error loading courses.";
  }
}

function renderContinue() {
  const continueBox = document.getElementById("continueBox");
  if (!continueBox) return;

  const courses = __dashState.courses;
  if (!courses.length) {
    continueBox.innerHTML = `
      <div class="net-empty">
        <div class="fw-semibold mb-1">No courses yet</div>
        <div class="small text-muted mb-3">Browse courses to begin your learning path.</div>
        <a class="btn btn-teal btn-sm" href="courses.html" aria-label="Browse courses">Browse courses</a>
      </div>
    `;
    return;
  }

  // Prefer last selected course if still available
  const lastId = localStorage.getItem("last_course_id");
  let candidate =
    (lastId && courses.find(c => String(c.id) === String(lastId))) ||
    courses.find(c => c.status === "in-progress") ||
    courses[0];

  // If candidate is locked by tier, find the first unlocked
  if (candidate && isLockedByTier(candidate.id).locked) {
    const unlocked = courses.find(c => !isLockedByTier(c.id).locked);
    if (unlocked) candidate = unlocked;
  }

  if (!candidate) {
    continueBox.textContent = "No courses available yet.";
    return;
  }

  const meta = getCourseMeta(candidate.id);
  const diff = (meta?.difficulty || "").toLowerCase();
  const lockInfo = isLockedByTier(candidate.id);

  const pct = Number(candidate.progress_pct || 0);
  const statusPill = statusBadge(candidate.status);
  const diffPill = difficultyBadge(diff);

  if (lockInfo.locked) {
    continueBox.innerHTML = `
      <div class="net-continue-card">
        <div class="d-flex align-items-start justify-content-between gap-2">
          <div>
            <div class="fw-semibold">${escapeHtml(candidate.title)}</div>
            <div class="small text-muted mt-1">${escapeHtml(candidate.description || "")}</div>
          </div>
          <div class="d-flex gap-2 flex-wrap justify-content-end">
            ${diffPill}
            ${statusPill}
          </div>
        </div>

        <div class="net-lockline mt-3">
          <i class="bi bi-lock-fill me-2" aria-hidden="true"></i>
          Locked — unlock by selecting <strong>${cap(lockInfo.requiredTier)}</strong> in signup.
        </div>

        <div class="d-flex gap-2 flex-wrap mt-3">
          <a class="btn btn-outline-secondary btn-sm" href="courses.html" aria-label="Browse courses">Browse courses</a>
        </div>
      </div>
    `;
  } else {
    continueBox.innerHTML = `
      <div class="net-continue-card">
        <div class="d-flex align-items-start justify-content-between gap-2">
          <div>
            <div class="fw-semibold">${escapeHtml(candidate.title)}</div>
            <div class="small text-muted mt-1">${escapeHtml(candidate.description || "")}</div>
          </div>
          <div class="d-flex gap-2 flex-wrap justify-content-end">
            ${diffPill}
            ${statusPill}
          </div>
        </div>

        <div class="small text-muted mt-3 d-flex justify-content-between">
          <span>Progress</span>
          <span class="fw-semibold">${pct}%</span>
        </div>

        <div class="progress mt-1" style="height:10px;">
          <div class="progress-bar net-progress" style="width:${clamp(pct, 0, 100)}%"></div>
        </div>

        <div class="d-flex gap-2 flex-wrap mt-3">
          <a class="btn btn-teal btn-sm"
             href="course.html?id=${encodeURIComponent(candidate.id)}"
             aria-label="Continue course">
            Continue
            <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>
          </a>
        </div>
      </div>
    `;
  }
}

function renderCourses() {
  const grid = document.getElementById("coursesGrid");
  if (!grid) return;

  const q = __dashState.filter.q;
  const diffFilter = __dashState.filter.diff;

  const items = (__dashState.courses || []).filter((c) => {
    const meta = getCourseMeta(c.id);
    const diff = String(meta?.difficulty || "").toLowerCase();

    const text = `${c.title || ""} ${c.description || ""}`.toLowerCase();
    const matchQ = !q || text.includes(q);

    const matchDiff = (diffFilter === "all") || (diff === diffFilter);
    return matchQ && matchDiff;
  });

  grid.innerHTML = "";

  if (!items.length) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="net-empty">
          <div class="fw-semibold mb-1">No matching courses</div>
          <div class="small text-muted">Try a different search or difficulty filter.</div>
        </div>
      </div>
    `;
    return;
  }

  items.forEach((c) => {
    const meta = getCourseMeta(c.id);
    const diff = String(meta?.difficulty || "").toLowerCase();
    const pct = Number(c.progress_pct || 0);

    const lockInfo = isLockedByTier(c.id);
    const locked = lockInfo.locked;

    const statusPill = statusBadge(c.status);
    const diffPill = difficultyBadge(diff);

    const btn = locked
      ? `<button class="btn btn-sm btn-secondary" disabled aria-label="Locked course">
           <i class="bi bi-lock-fill me-1" aria-hidden="true"></i>
           Locked
         </button>`
      : `<a class="btn btn-sm btn-teal"
            href="course.html?id=${encodeURIComponent(c.id)}"
            data-course-open="1"
            data-course-id="${escapeAttr(String(c.id))}"
            aria-label="Open course">
           ${c.status === "completed" ? "Review" : (pct > 0 ? "Continue" : "Start")}
           <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>
         </a>`;

    const lockOverlay = locked ? `
      <div class="net-course-lock" aria-hidden="true">
        <div class="net-course-lock-inner">
          <i class="bi bi-lock-fill me-2"></i>
          Unlock tier: <strong>${cap(lockInfo.requiredTier)}</strong>
        </div>
      </div>
    ` : "";

    grid.insertAdjacentHTML("beforeend", `
      <div class="col-md-6">
        <div class="net-course-card h-100">
          ${lockOverlay}

          <div class="p-4">
            <div class="d-flex align-items-start justify-content-between gap-2">
              <div>
                <div class="fw-semibold">${escapeHtml(c.title)}</div>
                <div class="small text-muted mt-1">${escapeHtml(c.description || "")}</div>
              </div>
              <div class="d-flex flex-column align-items-end gap-2">
                ${diffPill}
                ${statusPill}
              </div>
            </div>

            <div class="small text-muted mt-3 d-flex justify-content-between">
              <span>Progress</span>
              <span class="fw-semibold">${clamp(pct, 0, 100)}%</span>
            </div>

            <div class="progress mt-1" style="height:10px;">
              <div class="progress-bar net-progress" style="width:${clamp(pct, 0, 100)}%"></div>
            </div>

            <div class="d-flex gap-2 flex-wrap mt-3">
              ${btn}
              <a class="btn btn-sm btn-outline-secondary"
                 href="sandbox.html"
                 aria-label="Open sandbox">
                <i class="bi bi-diagram-3 me-1" aria-hidden="true"></i>
                Sandbox
              </a>
            </div>
          </div>
        </div>
      </div>
    `);
  });

  // Save "last course opened"
  const links = Array.from(grid.querySelectorAll('[data-course-open="1"]'));
  links.forEach((a) => {
    a.addEventListener("click", () => {
      const id = a.getAttribute("data-course-id");
      if (id) localStorage.setItem("last_course_id", id);
    });
  });
}

/* =========================================================
   COURSE META + LOCKING (by unlock tier, NOT numeric level)
========================================================= */

/*
AI PROMPTED CODE BELOW:
"Can you read COURSE_CONTENT and use difficulty to lock courses,
but lock based on the user's chosen unlock tier instead of XP level?"
*/
function getCourseMeta(courseId) {
  if (typeof COURSE_CONTENT === "undefined") return null;
  return COURSE_CONTENT[String(courseId)] || null;
}

function tierRank(tier) {
  const t = String(tier || "").toLowerCase();
  if (t === "advanced") return 3;
  if (t === "intermediate") return 2;
  return 1; // novice/default
}

function isLockedByTier(courseId) {
  const meta = getCourseMeta(courseId);

  // If no metadata exists, treat as unlocked
  if (!meta) return { locked: false, requiredTier: "novice" };

  const diff = String(meta.difficulty || "novice").toLowerCase();
  const requiredTier = (diff === "advanced" ? "advanced" : (diff === "intermediate" ? "intermediate" : "novice"));

  const userTier = __dashState.unlockTier;
  const locked = tierRank(userTier) < tierRank(requiredTier);

  return { locked, requiredTier };
}

/* =========================================================
   BADGES / UI HELPERS (Bootstrap Icons, no emojis)
========================================================= */
function difficultyBadge(difficulty) {
  const d = String(difficulty || "").toLowerCase();

  if (d === "novice") {
    return `<span class="badge text-bg-light border net-pill-badge">
      <i class="bi bi-seedling me-1" aria-hidden="true"></i>Novice
    </span>`;
  }
  if (d === "intermediate") {
    return `<span class="badge text-bg-info net-pill-badge">
      <i class="bi bi-rocket-takeoff me-1" aria-hidden="true"></i>Intermediate
    </span>`;
  }
  if (d === "advanced") {
    return `<span class="badge text-bg-dark net-pill-badge">
      <i class="bi bi-lightning-charge-fill me-1" aria-hidden="true"></i>Advanced
    </span>`;
  }

  return `<span class="badge text-bg-light border net-pill-badge">
    <i class="bi bi-journal me-1" aria-hidden="true"></i>Course
  </span>`;
}

function statusBadge(status) {
  const s = String(status || "").toLowerCase();

  if (s === "completed") {
    return `<span class="badge bg-success net-pill-badge">
      <i class="bi bi-check2 me-1" aria-hidden="true"></i>Completed
    </span>`;
  }
  if (s === "in-progress") {
    return `<span class="badge text-bg-warning net-pill-badge">
      <i class="bi bi-play-circle me-1" aria-hidden="true"></i>In progress
    </span>`;
  }

  return `<span class="badge text-bg-light border net-pill-badge">
    <i class="bi bi-circle me-1" aria-hidden="true"></i>Not started
  </span>`;
}

function rankBadgeClass(rank) {
  const r = String(rank || "").toLowerCase();
  if (r === "advanced") return "text-bg-dark";
  if (r === "intermediate") return "text-bg-info";
  return "text-bg-light";
}

/* =========================================================
   XP FALLBACK HELPERS
========================================================= */
function __calcLevelFromXp(totalXp) {
  const xp = Math.max(0, Number(totalXp || 0));

  // Rule: Level thresholds are 100, 200, 300... total XP
  const numericLevel = Math.floor(xp / 100) + 1;
  const xpInto = xp % 100;
  const xpNext = 100;

  return { numericLevel, xpInto, xpNext };
}

function __rankFromNumericLevel(numericLevel) {
  const lvl = Number(numericLevel || 1);
  if (lvl >= 5) return "Advanced";
  if (lvl >= 3) return "Intermediate";
  return "Novice";
}

/* =========================================================
   SMALL UTILITIES
========================================================= */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(text ?? "");
}

function cap(str) {
  const s = String(str || "");
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function clamp(n, min, max) {
  const x = Number(n);
  return Math.max(min, Math.min(max, x));
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
