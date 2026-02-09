/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 09/02/2026

JavaScript
---------------------------------------
dashboard.js – Modern Netology Dashboard (Figma/React-inspired, Vanilla JS)

Implements:
- Slide sidebar (backdrop + ESC + click outside)
- User avatar dropdown (click outside + ESC)
- Live course search + difficulty chip filters
- Course access gating by numeric level (Level 1=Novice, 3=Intermediate, 5=Advanced)
- Continue Learning section (top 2 in-progress courses)

Backend endpoints used:
- GET /user-info?email=
- GET /user-courses?email=
*/

(function () {
  "use strict";

  // -----------------------------
  // Helpers
  // -----------------------------
  function $(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clamp(n, min, max) {
    n = Number(n);
    if (Number.isNaN(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function tierMinLevel(tier) {
    const t = String(tier || "").toLowerCase();
    if (t === "advanced") return 5;
    if (t === "intermediate") return 3;
    return 1; // novice/default
  }

  function rankFromLevel(level) {
    if (level >= 5) return "Advanced";
    if (level >= 3) return "Intermediate";
    return "Novice";
  }

  function getCourseMeta(courseId) {
    if (typeof window.COURSE_CONTENT === "undefined") return null;
    return window.COURSE_CONTENT[String(courseId)] || null;
  }

  function requiredLevelFromDifficulty(diff) {
    const d = String(diff || "").toLowerCase();
    if (d === "advanced") return 5;
    if (d === "intermediate") return 3;
    return 1;
  }

  function normalizeDifficulty(diff) {
    const d = String(diff || "novice").toLowerCase();
    if (d === "advanced") return "advanced";
    if (d === "intermediate") return "intermediate";
    return "novice";
  }

  function difficultyLabel(diff) {
    const d = normalizeDifficulty(diff);
    return d.charAt(0).toUpperCase() + d.slice(1);
  }

  // -----------------------------
  // UI: sidebar + dropdown
  // -----------------------------
  function wireSidebar() {
    const sidebar = $("slideSidebar");
    const backdrop = $("sideBackdrop");
    const openBtn = $("openSidebarBtn");
    const closeBtn = $("closeSidebarBtn");

    if (!sidebar || !backdrop) return;

    function open() {
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      sidebar.setAttribute("aria-hidden", "false");
      backdrop.setAttribute("aria-hidden", "false");
      document.body.classList.add("net-noscroll");
    }

    function close() {
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      sidebar.setAttribute("aria-hidden", "true");
      backdrop.setAttribute("aria-hidden", "true");
      document.body.classList.remove("net-noscroll");
    }

    openBtn && openBtn.addEventListener("click", open);
    closeBtn && closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    return { open, close };
  }

  function wireUserDropdown() {
    const btn = $("userBtn");
    const dd = $("userDropdown");

    if (!btn || !dd) return;

    function open() {
      dd.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
    }
    function close() {
      dd.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }
    function toggle() {
      if (dd.classList.contains("is-open")) close();
      else open();
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });

    // click outside
    document.addEventListener("click", (e) => {
      if (!dd.classList.contains("is-open")) return;
      const target = e.target;
      if (target instanceof Node && !dd.contains(target) && !btn.contains(target)) close();
    });

    // ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    return { open, close };
  }

  function wireLogout() {
    const sideLogout = $("sideLogoutBtn");
    const topLogout = $("topLogoutBtn");

    function doLogout() {
      localStorage.removeItem("user");
      window.location.href = "login.html";
    }

    sideLogout && sideLogout.addEventListener("click", doLogout);
    topLogout && topLogout.addEventListener("click", doLogout);
  }

  // -----------------------------
  // Data loaders
  // -----------------------------
  async function loadUserStats(email) {
    try {
      const res = await fetch(`${window.API_BASE}/user-info?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!data || !data.success) {
        return { level: 1, xp: 0, rank: "Novice" };
      }
      const level = Number(data.numeric_level || 1);
      const xp = Number(data.xp || 0);
      const rank = String(data.rank || rankFromLevel(level));
      return { level, xp, rank };
    } catch (err) {
      console.error("loadUserStats failed:", err);
      return { level: 1, xp: 0, rank: "Novice" };
    }
  }

  async function loadUserCourses(email) {
    try {
      const res = await fetch(`${window.API_BASE}/user-courses?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!data || !data.success) return [];
      return Array.isArray(data.courses) ? data.courses : [];
    } catch (err) {
      console.error("loadUserCourses failed:", err);
      return [];
    }
  }

  // -----------------------------
  // Rendering
  // -----------------------------
  function renderUser(user, stats) {
    const name = user.first_name || user.name || "Student";
    const email = user.email || "";

    const letter = String(name).trim().charAt(0).toUpperCase() || "S";

    // Welcome
    const welcomeName = $("welcomeName");
    if (welcomeName) welcomeName.textContent = name;

    // Top bar
    const topAvatar = $("topAvatar");
    const topUserName = $("topUserName");
    if (topAvatar) topAvatar.textContent = letter;
    if (topUserName) topUserName.textContent = name;

    // Dropdown
    const ddName = $("ddName");
    const ddEmail = $("ddEmail");
    if (ddName) ddName.textContent = name;
    if (ddEmail) ddEmail.textContent = email;

    // Sidebar
    const sideAvatar = $("sideAvatar");
    const sideUserName = $("sideUserName");
    const sideUserEmail = $("sideUserEmail");
    const sideLevelBadge = $("sideLevelBadge");

    if (sideAvatar) sideAvatar.textContent = letter;
    if (sideUserName) sideUserName.textContent = name;
    if (sideUserEmail) sideUserEmail.textContent = email;
    if (sideLevelBadge) sideLevelBadge.textContent = `Lv ${stats.level}`;

    // Stats cards
    const statLevel = $("statLevel");
    const statXp = $("statXp");
    if (statLevel) statLevel.textContent = String(stats.level);
    if (statXp) statXp.textContent = String(stats.xp);

    // XP progress (per-level is 250)
    const perLevel = 250;
    const currentLevelXP = ((stats.xp % perLevel) + perLevel) % perLevel;
    const xpProgress = clamp((currentLevelXP / perLevel) * 100, 0, 100);
    const toNext = perLevel - currentLevelXP;

    const sideXpText = $("sideXpText");
    const sideXpBar = $("sideXpBar");
    const sideXpHint = $("sideXpHint");

    if (sideXpText) sideXpText.textContent = `${currentLevelXP}/${perLevel}`;
    if (sideXpHint) sideXpHint.textContent = `${toNext} XP to next level`;

    // animate XP bar
    if (sideXpBar) {
      sideXpBar.style.width = "0%";
      requestAnimationFrame(() => {
        sideXpBar.style.width = `${xpProgress}%`;
      });
    }

    const statLevelHint = $("statLevelHint");
    if (statLevelHint) statLevelHint.textContent = `${toNext} XP to next level`;
  }

  function buildCourseViewModel(courseRow) {
    const meta = getCourseMeta(courseRow.id) || {};

    const difficulty = normalizeDifficulty(meta.difficulty || meta.difficulty_label || meta.level || "novice");
    const requiredLevel = Number(meta.required_level || requiredLevelFromDifficulty(difficulty));

    const totalLessons = Number(courseRow.total_lessons || meta.total_lessons || meta.totalLessons || 0);
    const xpReward = Number(courseRow.xp_reward || meta.xp_reward || meta.xpReward || 0);
    const progress = clamp(courseRow.progress_pct || 0, 0, 100);

    const completedLessons = totalLessons > 0 ? Math.floor((progress / 100) * totalLessons) : 0;

    return {
      id: courseRow.id,
      title: courseRow.title || meta.title || "Course",
      description: courseRow.description || meta.description || "",
      difficulty,
      requiredLevel,
      totalLessons,
      xpReward,
      progress,
      status: courseRow.status || (progress === 100 ? "completed" : progress > 0 ? "in-progress" : "not-started"),
      completedLessons,
      estimatedTime: meta.estimatedTime || meta.estimated_time || "",
      category: meta.category || "",
    };
  }

  function difficultyGradientClass(diff) {
    const d = normalizeDifficulty(diff);
    if (d === "advanced") return "net-grad-adv";
    if (d === "intermediate") return "net-grad-int";
    return "net-grad-nov";
  }

  function difficultyBadgeClass(diff) {
    const d = normalizeDifficulty(diff);
    if (d === "advanced") return "net-badge-adv";
    if (d === "intermediate") return "net-badge-int";
    return "net-badge-nov";
  }

  function courseButtonLabel(course) {
    if (course.progress === 100) return "Review";
    if (course.progress > 0) return "Continue";
    return "Start";
  }

  function courseCardHtml(course) {
    const diff = normalizeDifficulty(course.difficulty);

    const metaLine = [
      course.totalLessons ? `${course.totalLessons} lessons` : "",
      course.estimatedTime ? course.estimatedTime : "",
    ].filter(Boolean).join(" • ");

    const progressBar = course.progress > 0
      ? `
        <div class="mt-3">
          <div class="d-flex justify-content-between small text-muted mb-1">
            <span>${course.progress}%</span>
            <span>${course.completedLessons}${course.totalLessons ? `/${course.totalLessons}` : ""}</span>
          </div>
          <div class="net-meter">
            <div class="net-meter-fill ${difficultyGradientClass(diff)}" style="width:${course.progress}%"></div>
          </div>
        </div>
      `
      : "";

    return `
      <article class="net-coursecard net-pop" data-diff="${diff}" data-title="${escapeHtml(course.title).toLowerCase()}" data-cat="${escapeHtml(course.category).toLowerCase()}">
        <div class="net-coursebar ${difficultyGradientClass(diff)}" aria-hidden="true"></div>

        <div class="p-4">
          <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
            <div class="flex-grow-1">
              ${course.category ? `<div class="net-eyebrow">${escapeHtml(course.category)}</div>` : ""}
              <h3 class="h6 fw-semibold mb-0">${escapeHtml(course.title)}</h3>
            </div>
            <span class="net-diffbadge ${difficultyBadgeClass(diff)}">${difficultyLabel(diff)}</span>
          </div>

          <p class="text-muted small mb-2">${escapeHtml(course.description)}</p>

          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div class="small text-muted">${escapeHtml(metaLine)}</div>
            <div class="small fw-semibold text-teal d-inline-flex align-items-center gap-1">
              <i class="bi bi-lightning-charge-fill"></i>
              ${course.xpReward}
            </div>
          </div>

          ${progressBar}

          <div class="mt-3 d-grid">
            <a class="btn btn-sm ${course.progress === 100 ? "btn-outline-success" : course.progress > 0 ? "btn-outline-teal" : "btn-teal"}"
               href="course.html?id=${encodeURIComponent(course.id)}">
              ${courseButtonLabel(course)}
            </a>
          </div>
        </div>
      </article>
    `;
  }

  function continueCardHtml(course) {
    const diff = normalizeDifficulty(course.difficulty);
    return `
      <div class="net-continue-card net-pop" role="button" tabindex="0" data-course="${encodeURIComponent(course.id)}">
        <div class="d-flex align-items-start justify-content-between gap-3">
          <div class="flex-grow-1">
            <span class="net-diffbadge ${difficultyBadgeClass(diff)}">${difficultyLabel(diff)}</span>
            <div class="fw-semibold mt-2">${escapeHtml(course.title)}</div>
            <div class="text-muted small mt-1">${course.progress}% complete</div>
          </div>
          <i class="bi bi-arrow-right-circle text-teal fs-4" aria-hidden="true"></i>
        </div>
        <div class="mt-3 net-meter">
          <div class="net-meter-fill ${difficultyGradientClass(diff)}" style="width:${course.progress}%"></div>
        </div>
      </div>
    `;
  }

  function attachContinueHandlers() {
    const box = $("continueBox");
    if (!box) return;

    box.querySelectorAll(".net-continue-card").forEach((el) => {
      const id = el.getAttribute("data-course");
      const go = () => {
        if (!id) return;
        window.location.href = `course.html?id=${id}`;
      };
      el.addEventListener("click", go);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    });
  }

  function renderDashboardCourses(allCourses, effectiveLevel) {
    const grid = $("coursesGrid");
    const title = $("coursesTitle");

    if (!grid) return;

    // Only show accessible courses per requirement
    const accessible = allCourses.filter((c) => c.requiredLevel <= effectiveLevel);

    // Stats
    const inProgress = allCourses.filter((c) => c.progress > 0 && c.progress < 100);
    const completed = allCourses.filter((c) => c.progress === 100);

    const statInProgress = $("statInProgress");
    const statCompleted = $("statCompleted");
    if (statInProgress) statInProgress.textContent = String(inProgress.length);
    if (statCompleted) statCompleted.textContent = String(completed.length);

    // Continue learning (top 2 by progress desc)
    const continueBox = $("continueBox");
    if (continueBox) {
      const cont = inProgress
        .slice()
        .sort((a, b) => (b.progress - a.progress))
        .slice(0, 2);

      if (cont.length === 0) {
        continueBox.innerHTML = `
          <div class="text-muted small">
            You haven't started a course yet. Pick one below to begin.
          </div>
        `;
      } else {
        continueBox.innerHTML = cont.map(continueCardHtml).join("");
        attachContinueHandlers();
      }
    }

    // Render initial (all accessible)
    grid.innerHTML = accessible.map(courseCardHtml).join("");

    if (title) title.textContent = "All Courses";

    // Store for filtering
    grid.__allAccessible = accessible;
  }

  function applyCourseFilters() {
    const grid = $("coursesGrid");
    if (!grid || !grid.__allAccessible) return;

    const q = String(grid.__searchQuery || "").trim().toLowerCase();
    const diff = String(grid.__diffFilter || "all").toLowerCase();

    const filtered = grid.__allAccessible.filter((c) => {
      const inDiff = diff === "all" ? true : normalizeDifficulty(c.difficulty) === diff;
      if (!inDiff) return false;
      if (!q) return true;
      return (
        String(c.title || "").toLowerCase().includes(q) ||
        String(c.description || "").toLowerCase().includes(q) ||
        String(c.category || "").toLowerCase().includes(q)
      );
    });

    const title = $("coursesTitle");
    if (title) title.textContent = q ? "Search Results" : "All Courses";

    // small animation: fade
    grid.classList.add("net-fadeout");
    window.setTimeout(() => {
      grid.innerHTML = filtered.length
        ? filtered.map(courseCardHtml).join("")
        : `
          <div class="net-empty">
            <i class="bi bi-search" aria-hidden="true"></i>
            <div class="fw-semibold">No courses found</div>
            <div class="small text-muted">Try a different search or filter.</div>
          </div>
        `;
      grid.classList.remove("net-fadeout");
    }, 120);
  }

  function wireSearchAndFilters() {
    const topSearch = $("topSearch");
    const mobileSearch = $("mobileSearch");
    const chips = Array.from(document.querySelectorAll(".net-chip[data-diff]"));
    const grid = $("coursesGrid");

    if (!grid) return;

    function setQuery(val) {
      grid.__searchQuery = val || "";
      // sync both inputs
      if (topSearch && topSearch.value !== val) topSearch.value = val;
      if (mobileSearch && mobileSearch.value !== val) mobileSearch.value = val;
      applyCourseFilters();
    }

    function setDiff(val) {
      grid.__diffFilter = val || "all";
      chips.forEach((c) => {
        const isActive = c.getAttribute("data-diff") === grid.__diffFilter;
        c.classList.toggle("is-active", isActive);
      });
      applyCourseFilters();
    }

    if (topSearch) topSearch.addEventListener("input", (e) => setQuery(e.target.value));
    if (mobileSearch) mobileSearch.addEventListener("input", (e) => setQuery(e.target.value));

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        setDiff(chip.getAttribute("data-diff") || "all");
      });
    });

    // defaults
    grid.__searchQuery = "";
    grid.__diffFilter = "all";
  }

  // -----------------------------
  // Boot
  // -----------------------------
  document.addEventListener("DOMContentLoaded", async () => {
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    if (!stored || !stored.email) {
      window.location.href = "login.html";
      return;
    }

    // Basic wiring first (so UI feels alive immediately)
    wireSidebar();
    wireUserDropdown();
    wireLogout();
    wireSearchAndFilters();

    // Load stats + courses
    const stats = await loadUserStats(stored.email);

    // If the user selected a starting tier, ensure their effective level respects it.
    // (Backend may already set numeric_level, but this keeps front-end logic consistent.)
    const chosenTier = stored.unlock_tier || stored.tier || stored.start_tier;
    const effectiveLevel = Math.max(stats.level, tierMinLevel(chosenTier));

    renderUser(stored, { ...stats, level: effectiveLevel, rank: rankFromLevel(effectiveLevel) });

    const rawCourses = await loadUserCourses(stored.email);
    const viewModels = rawCourses.map(buildCourseViewModel);

    renderDashboardCourses(viewModels, effectiveLevel);

    // Apply initial filters (to render empty state if needed)
    applyCourseFilters();
  });
})();
