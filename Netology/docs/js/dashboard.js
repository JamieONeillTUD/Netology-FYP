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
  const $ = (id) => document.getElementById(id);

  function safeJSONParse(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  function getCurrentUser() {
    return safeJSONParse(localStorage.getItem("netology_user"), null);
  }

  function isLoggedIn() {
    const u = getCurrentUser();
    return !!(u && (u.email || u.username || u.name));
  }

  function userNumericLevel(user) {
    const n = Number(user?.numeric_level);
    if (Number.isFinite(n) && n > 0) return n;

    const lvl = (user?.level || "").toLowerCase();
    if (lvl.includes("advanced")) return 5;
    if (lvl.includes("intermediate")) return 3;
    if (lvl.includes("novice")) return 1;
    return 1;
  }

  function computeXP(user) {
    const totalXP = Number(user?.xp) || 0;
    const currentLevelXP = ((totalXP % 250) + 250) % 250; // safe mod
    const progressPct = Math.max(0, Math.min(100, (currentLevelXP / 250) * 100));
    const toNext = 250 - currentLevelXP;
    return { totalXP, currentLevelXP, progressPct, toNext };
  }

  function difficultyRequiredLevel(diff) {
    if (diff === "novice") return 1;
    if (diff === "intermediate") return 3;
    if (diff === "advanced") return 5;
    return 1;
  }

  function prettyDiff(diff) {
    if (!diff) return "Novice";
    return diff.charAt(0).toUpperCase() + diff.slice(1);
  }

  // Welcome ring
  // Your HTML uses the course-style ring (r=58, dasharray ~364.42)
  function setWelcomeRing(progressPct) {
    const ring = $("welcomeRing");
    if (!ring) return;

    const r = 58;
    const CIRC = 2 * Math.PI * r; // ~364.42
    const offset = CIRC * (1 - (progressPct / 100));

    ring.style.strokeDasharray = `${CIRC.toFixed(2)}`;
    ring.style.strokeDashoffset = `${offset.toFixed(2)}`;
  }

  // -----------------------------
  // Brand routing (dashboard vs index)
  // -----------------------------
  function wireBrandRouting() {
    const topBrand = $("topBrand");
    const sideBrand = $("sideBrand");
    const target = isLoggedIn() ? "dashboard.html" : "index.html";

    if (topBrand) topBrand.setAttribute("href", target);
    if (sideBrand) sideBrand.setAttribute("href", target);
  }

  // -----------------------------
  // Sidebar
  // -----------------------------
  function setupSidebar() {
    const openBtn = $("openSidebarBtn");
    const closeBtn = $("closeSidebarBtn");
    const sidebar = $("slideSidebar");
    const backdrop = $("sideBackdrop");

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
    const btn = $("userBtn");
    const dd = $("userDropdown");

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
    const topLogout = $("topLogoutBtn");
    const sideLogout = $("sideLogoutBtn");

    function doLogout() {
      localStorage.removeItem("netology_user");
      localStorage.removeItem("netology_token");
      window.location.href = "index.html";
    }

    topLogout?.addEventListener("click", doLogout);
    sideLogout?.addEventListener("click", doLogout);
  }

  // -----------------------------
  // Courses data (from course_content.js)
  // -----------------------------
  function getCoursesFromContent() {
    const cc = window.COURSE_CONTENT || {};
    const list = [];

    for (const key of Object.keys(cc)) {
      const c = cc[key] || {};
      const id = c.id || key;
      const title = c.title || "Untitled Course";
      const description = c.description || c.about || "Learn networking skills.";
      const difficulty = (c.difficulty || "novice").toLowerCase();
      const required_level = Number(c.required_level) || difficultyRequiredLevel(difficulty);

      // Estimate items count from units/sections
      let items = 0;
      if (Array.isArray(c.units)) {
        for (const u of c.units) {
          if (Array.isArray(u?.sections)) items += u.sections.length;
        }
      }

      const xpReward = Number(c.xpReward || c.xp_reward || 500) || 500;
      const category = c.category || "Core";
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

  // -----------------------------
  // Render course cards
  // -----------------------------
  function buildCourseCard(course, userLevel) {
    const locked = userLevel < course.required_level;
    const diff = course.difficulty;

    const gradClass =
      diff === "advanced" ? "net-grad-adv"
      : diff === "intermediate" ? "net-grad-int"
      : "net-grad-nov";

    const badgeClass =
      diff === "advanced" ? "net-badge-adv"
      : diff === "intermediate" ? "net-badge-int"
      : "net-badge-nov";

    const card = document.createElement("div");
    card.className = "net-coursecard";
    card.setAttribute("data-diff", diff);
    card.setAttribute("data-title", (course.title || "").toLowerCase());
    card.setAttribute("data-category", (course.category || "").toLowerCase());
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", locked ? `${course.title} locked` : `${course.title} open course`);

    card.innerHTML = `
      <div class="net-coursebar ${gradClass}"></div>
      <div class="p-4">
        <div class="d-flex align-items-start justify-content-between gap-2">
          <div class="flex-grow-1">
            <div class="net-eyebrow">${course.category}</div>
            <div class="fw-bold fs-6 mt-1 d-flex align-items-center gap-2">
              ${course.title}
              ${locked ? `<span class="badge bg-light text-dark border" title="Locked"><i class="bi bi-lock-fill me-1"></i>Locked</span>` : ``}
            </div>
          </div>
          <span class="net-diffbadge ${badgeClass}">${prettyDiff(diff)}</span>
        </div>

        <div class="text-muted small mt-2" style="min-height:44px;">
          ${course.description}
        </div>

        <div class="d-flex align-items-center justify-content-between mt-3 small">
          <div class="text-muted">
            ${course.items ? `${course.items} items` : `Course`} • ${course.estimatedTime}
          </div>
          <div class="fw-bold" style="color:#0f766e;">
            <i class="bi bi-lightning-charge-fill me-1"></i>${course.xpReward}
          </div>
        </div>

        <div class="mt-3">
          <button class="btn ${locked ? "btn-outline-secondary" : "btn-teal"} btn-sm w-100" ${locked ? "disabled" : ""}>
            ${locked ? `Unlock at Level ${course.required_level}` : "Open Course"}
          </button>
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

    const grid = $("coursesGrid");
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
    const existing = $(emptyId);
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
    const desktop = $("courseSearch");
    const mobile = $("mobileSearch");
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

  // -----------------------------
  // Continue learning
  // -----------------------------
  function renderContinueLearning() {
    const box = $("continueBox");
    if (!box) return;

    const user = getCurrentUser();
    const uLevel = userNumericLevel(user);

    const courses = getCoursesFromContent();
    const unlocked = courses.filter(c => uLevel >= c.required_level);

    if (unlocked.length === 0) {
      box.className = "";
      box.innerHTML = `<div class="text-muted small">No unlocked courses yet. Earn XP to unlock content.</div>`;
      return;
    }

    // simple “best” pick: first unlocked (sorted novice->adv, title)
    const pick = unlocked[0];

    box.className = "net-continue-card";
    box.innerHTML = `
      <div class="d-flex align-items-center justify-content-between">
        <div>
          <div class="fw-bold">${pick.title}</div>
          <div class="text-muted small">${pick.category} • ${prettyDiff(pick.difficulty)}</div>
        </div>
        <div class="text-end">
          <div class="small text-muted">Suggested</div>
          <div class="fw-bold" style="color:#0f766e;">
            <i class="bi bi-lightning-charge-fill me-1"></i>${pick.xpReward}
          </div>
        </div>
      </div>
      <div class="mt-3">
        <button class="btn btn-teal btn-sm w-100" type="button">Continue</button>
      </div>
    `;

    box.addEventListener("click", () => {
      window.location.href = `course.html?id=${encodeURIComponent(pick.key)}`;
    });
  }

  // -----------------------------
  // Render courses
  // -----------------------------
  function renderCourses() {
    const grid = $("coursesGrid");
    if (!grid) return;

    const user = getCurrentUser();
    const uLevel = userNumericLevel(user);

    const courses = getCoursesFromContent();

    grid.innerHTML = "";
    let anyLocked = false;

    courses.forEach((c) => {
      const { card, locked } = buildCourseCard(c, uLevel);
      if (locked) anyLocked = true;
      grid.appendChild(card);
    });

    applyCourseFilters();

    const lockNote = $("lockNote");
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
  // User UI fill
  // -----------------------------
  function fillUserUI() {
    const user = getCurrentUser();

    const name = user?.first_name
      ? `${user.first_name} ${user.last_name || ""}`.trim()
      : (user?.name || user?.username || "Student");

    const email = user?.email || "Not logged in";

    // avatar = first letter of name/username
    const initial = (name || "S").trim().charAt(0).toUpperCase();

    const lvl = userNumericLevel(user);
    const { totalXP, currentLevelXP, progressPct, toNext } = computeXP(user);

    // Welcome
    if ($("welcomeName")) $("welcomeName").textContent = name;

    // Top user
    if ($("topUserName")) $("topUserName").textContent = name;
    if ($("topAvatar")) $("topAvatar").textContent = initial;

    // Dropdown
    if ($("ddName")) $("ddName").textContent = name;
    if ($("ddEmail")) $("ddEmail").textContent = email;

    // Sidebar user
    if ($("sideUserName")) $("sideUserName").textContent = name;
    if ($("sideUserEmail")) $("sideUserEmail").textContent = email;
    if ($("sideAvatar")) $("sideAvatar").textContent = initial;

    if ($("sideLevelBadge")) $("sideLevelBadge").textContent = `Lv ${lvl}`;
    if ($("sideXpText")) $("sideXpText").textContent = `${currentLevelXP}/250`;
    if ($("sideXpBar")) $("sideXpBar").style.width = `${progressPct}%`;
    if ($("sideXpHint")) $("sideXpHint").textContent = `${toNext} XP to next level`;

    // Stats tiles
    if ($("statLevel")) $("statLevel").textContent = String(lvl);
    if ($("statXp")) $("statXp").textContent = String(totalXP);
    if ($("statLevelHint")) $("statLevelHint").textContent = `${toNext} XP to next level`;

    // Welcome ring block
    if ($("welcomeLevel")) $("welcomeLevel").textContent = String(lvl);
    if ($("welcomeXpText")) $("welcomeXpText").textContent = `${currentLevelXP}/250 XP`;
    if ($("welcomeLevelHint")) $("welcomeLevelHint").textContent = `${toNext} XP to next level`;

    setWelcomeRing(progressPct);
  }

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    wireBrandRouting();
    setupSidebar();
    setupUserDropdown();
    setupLogout();
    fillUserUI();
    setupCourseSearchAndChips();
    renderCourses();
    renderContinueLearning();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
