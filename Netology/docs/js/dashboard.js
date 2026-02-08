/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript
---------------------------------------
dashboard.js – Netology Dashboard (Sidebar Layout)

Updates:
- Top nav brand click logic:
  - signed in => dashboard.html
  - signed out => index.html
- Top right user dropdown:
  - shows name/email
  - logout button works
*/

// Safe: ensure API base is never undefined
const API_BASE = (window.API_BASE || "").replace(/\/$/, "");

let __dashState = {
  email: "",
  numericLevel: 1,
  rank: "Novice",
  xp: 0,
  courses: [],
  filter: { q: "", diff: "all" }
};

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Dashboard should still protect itself
  if (!user.email) {
    window.location.href = "login.html";
    return;
  }

  __dashState.email = user.email;

  // Wire UI
  wireTopNav(user);
  wireFilters();
  wireLogout();

  // Names
  const displayName = user.first_name || user.username || "Student";
  setText("welcomeName", displayName);
  setText("sideName", displayName);
  setText("sideEmail", user.email);
  setText("sideName_m", displayName);
  setText("sideEmail_m", user.email);

  // Load data
  await loadUserStats(user.email);
  await loadUserCourses(user.email);

  renderLockNote();
});

/* =========================================================
   TOP NAV (brand click + user dropdown)
========================================================= */
function wireTopNav(user) {
  const homeTop = document.getElementById("netTopHome");
  const homeSide = document.getElementById("netSideHome");

  const goHomeSmart = (e) => {
    e?.preventDefault?.();

    const u = JSON.parse(localStorage.getItem("user") || "{}");
    if (u && u.email) {
      // signed in => reload dashboard
      window.location.href = "dashboard.html";
    } else {
      // signed out => back to landing
      window.location.href = "index.html";
    }
  };

  homeTop?.addEventListener("click", goHomeSmart);
  homeSide?.addEventListener("click", goHomeSmart);

  // Populate dropdown user info
  const displayName = user.first_name || user.username || "Student";
  setText("topUserName", displayName);
  setText("topUserNameMenu", displayName);
  setText("topUserEmail", user.email);

  // Avatar letter
  const avatar = document.getElementById("topAvatar");
  if (avatar) {
    const ch = String(displayName || "S").trim().charAt(0).toUpperCase() || "S";
    avatar.textContent = ch;
  }

  // Top logout button
  const logoutTop = document.getElementById("logoutBtnTop");
  logoutTop?.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "login.html";
  });
}

/* =========================================================
   LOGOUT (desktop sidebar + mobile sidebar)
========================================================= */
function wireLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  const logoutBtnM = document.getElementById("logoutBtn_m");

  const doLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "login.html";
  };

  logoutBtn?.addEventListener("click", doLogout);
  logoutBtnM?.addEventListener("click", doLogout);
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

    // Rank: prefer backend if valid, else compute
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

    // Sidebar + stats
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

    // Stats tiles
    setText("statLevel", String(numericLevel));
    setText("statXp", String(totalXp));
    setText("statRank", `${rank} rank`);

    // “Next tier unlocks in X levels”
    const nextTier = nextTierText(numericLevel);
    setText("unlockText", nextTier);
    setText("unlockText_m", nextTier);

  } catch (e) {
    console.error("loadUserStats error:", e);
  }
}

function nextTierText(level) {
  const lvl = Number(level || 1);

  // L1-2 = Novice
  // L3-4 = Intermediate
  // L5+  = Advanced
  if (lvl < 3) {
    const left = 3 - lvl;
    return `Next tier unlocks in ${left} level${left === 1 ? "" : "s"} (Intermediate).`;
  }
  if (lvl < 5) {
    const left = 5 - lvl;
    return `Next tier unlocks in ${left} level${left === 1 ? "" : "s"} (Advanced).`;
  }
  return "All tiers unlocked. Keep going for more XP.";
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
    const inProg = __dashState.courses.filter(c => String(c.status).toLowerCase() === "in-progress").length;
    const comp = __dashState.courses.filter(c => String(c.status).toLowerCase() === "completed").length;

    setText("statInProgress", String(inProg));
    setText("statCompleted", String(comp));

    renderContinue();
    renderCourses();

  } catch (e) {
    console.error("loadUserCourses error:", e);
    continueBox.textContent = "Server error loading courses.";
  }
}

/* =========================================================
   CONTINUE LEARNING (FIXED)
========================================================= */
function renderContinue() {
  const continueBox = document.getElementById("continueBox");
  if (!continueBox) return;

  const courses = __dashState.courses || [];
  if (!courses.length) {
    continueBox.innerHTML = `
      <div class="net-empty">
        <div class="fw-semibold mb-1">No courses yet</div>
        <div class="small text-muted mb-3">Browse courses to begin your learning path.</div>
        <a class="btn btn-teal btn-sm" href="courses.html" aria-label="Browse courses">
          Browse courses <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>
        </a>
      </div>
    `;
    return;
  }

  const lvl = Number(__dashState.numericLevel || 1);
  const lastId = localStorage.getItem("last_course_id");

  const byId = (id) => courses.find(c => String(c.id) === String(id));
  const unlocked = (c) => !isLockedByLevel(c.id, lvl).locked;

  let candidate =
    (lastId && byId(lastId) && unlocked(byId(lastId)) ? byId(lastId) : null) ||
    courses.find(c => String(c.status).toLowerCase() === "in-progress" && unlocked(c)) ||
    courses.find(c => unlocked(c)) ||
    courses[0];

  const lockInfo = isLockedByLevel(candidate.id, lvl);
  const meta = getCourseMeta(candidate.id);
  const diff = String(meta?.difficulty || "").toLowerCase();
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
          Locked — unlocks at <strong>Level ${lockInfo.required}</strong>.
        </div>

        <div class="d-flex gap-2 flex-wrap mt-3">
          <a class="btn btn-outline-secondary btn-sm" href="courses.html" aria-label="Browse courses">
            Browse courses
          </a>
        </div>
      </div>
    `;
    return;
  }

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
        <span class="fw-semibold">${clamp(pct, 0, 100)}%</span>
      </div>

      <div class="progress mt-1" style="height:10px;">
        <div class="progress-bar net-progress" style="width:${clamp(pct, 0, 100)}%"></div>
      </div>

      <div class="d-flex gap-2 flex-wrap mt-3">
        <a class="btn btn-teal btn-sm"
           href="course.html?id=${encodeURIComponent(candidate.id)}"
           aria-label="Continue course"
           data-course-open="1"
           data-course-id="${escapeAttr(String(candidate.id))}">
          Continue <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>
        </a>
      </div>
    </div>
  `;

  const link = continueBox.querySelector('[data-course-open="1"]');
  link?.addEventListener("click", () => {
    const id = link.getAttribute("data-course-id");
    if (id) localStorage.setItem("last_course_id", id);
  });
}

function renderCourses() {
  const grid = document.getElementById("coursesGrid");
  if (!grid) return;

  const q = __dashState.filter.q;
  const diffFilter = __dashState.filter.diff;
  const lvl = Number(__dashState.numericLevel || 1);

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

    const lockInfo = isLockedByLevel(c.id, lvl);
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
           ${String(c.status).toLowerCase() === "completed" ? "Review" : (pct > 0 ? "Continue" : "Start")}
           <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>
         </a>`;

    const lockOverlay = locked ? `
      <div class="net-course-lock" aria-hidden="true">
        <div class="net-course-lock-inner">
          <i class="bi bi-lock-fill me-2"></i>
          Unlocks at <strong>Level ${lockInfo.required}</strong>
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

  const links = Array.from(grid.querySelectorAll('[data-course-open="1"]'));
  links.forEach((a) => {
    a.addEventListener("click", () => {
      const id = a.getAttribute("data-course-id");
      if (id) localStorage.setItem("last_course_id", id);
    });
  });
}

function renderLockNote() {
  const lockNote = document.getElementById("lockNote");
  if (!lockNote) return;
  lockNote.textContent = "Locked courses appear grey until you reach the required level.";
}

/* =========================================================
   COURSE META + LOCKING
========================================================= */
function getCourseMeta(courseId) {
  if (typeof COURSE_CONTENT === "undefined") return null;
  return COURSE_CONTENT[String(courseId)] || null;
}

function isLockedByLevel(courseId, userLevel) {
  const meta = getCourseMeta(courseId);
  if (!meta) return { locked: false, required: 1 };

  const required = Number(meta.required_level || 1);
  return { locked: Number(userLevel) < required, required };
}

/* =========================================================
   BADGES (Bootstrap Icons only)
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
