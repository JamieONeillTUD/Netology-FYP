/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 10/11/2025

dashboard.js – Netology Dashboard logic (Vanilla JS)

Matches dashboard.html you provided:
- Slide sidebar open/close (backdrop click + ESC)
- User dropdown open/close (click outside + ESC)
- Loads user from localStorage OR API (token)
- Builds course list from COURSE_CONTENT if available (fallback included)
- Search + difficulty filtering (desktop + mobile synced)
- Enforces access control: locked courses cannot be opened
- Continue Learning auto-picks best in-progress unlocked course
*/

(function () {
  "use strict";

  // -----------------------------
  // Helpers
  // -----------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function safeText(el, value) {
    if (!el) return;
    el.textContent = value ?? "";
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function getInitials(name) {
    const s = (name || "").trim();
    if (!s) return "S";
    const parts = s.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "S";
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // API base: dashboard.html sets window.API_BASE in <head>
  const API_BASE = window.API_BASE || "http://127.0.0.1:5000";

  // -----------------------------
  // Toast popup (uses your CSS .net-toast)
  // -----------------------------
  function showPopup(message, type = "info") {
    const existing = document.querySelector(".net-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "net-toast net-toast-enter";
    toast.setAttribute("data-type", type);
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    toast.innerHTML = `
      <div class="net-toast-inner">
        <div class="net-toast-icon" aria-hidden="true"></div>
        <div class="net-toast-text">${escapeHtml(message)}</div>
        <button class="net-toast-close" aria-label="Close notification" type="button">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </div>
    `;

    document.body.appendChild(toast);

    const close = () => {
      toast.classList.remove("net-toast-enter");
      toast.classList.add("net-toast-exit");
      setTimeout(() => toast.remove(), 220);
    };

    toast.addEventListener("click", close);
    toast.querySelector(".net-toast-close")?.addEventListener("click", (e) => {
      e.stopPropagation();
      close();
    });

    setTimeout(close, 3200);
  }

  // -----------------------------
  // Auth + User load
  // -----------------------------
  function getToken() {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  }

  function getStoredUser() {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("net_user");
      if (!raw) return null;
      const u = JSON.parse(raw);
      return u && typeof u === "object" ? u : null;
    } catch {
      return null;
    }
  }

  async function fetchMe(token) {
    const candidates = [`${API_BASE}/auth/me`, `${API_BASE}/me`, `${API_BASE}/users/me`];

    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) continue;
        return await res.json();
      } catch {
        // try next
      }
    }
    return null;
  }

  function normalizeUser(raw) {
    const name =
      raw?.name ||
      raw?.full_name ||
      raw?.fullname ||
      raw?.username ||
      "Student";
    const email = raw?.email || raw?.user_email || "email@example.com";
    const level = Number(raw?.level ?? raw?.user_level ?? 1) || 1;
    const xp = Number(raw?.xp ?? raw?.user_xp ?? 0) || 0;

    return { name, email, level, xp };
  }

  function redirectToLogin() {
    window.location.href = "login.html";
  }

  // -----------------------------
  // Progress storage
  // -----------------------------
  // net_progress: { [courseId]: { progress: 0-100, completedModules, totalModules } }
  function loadProgressMap() {
    try {
      return JSON.parse(localStorage.getItem("net_progress") || "{}");
    } catch {
      return {};
    }
  }

  // -----------------------------
  // Course data (COURSE_CONTENT -> cards)
  // -----------------------------
  function inferDifficultyFromRequiredLevel(requiredLevel) {
    if (requiredLevel >= 10) return "advanced";
    if (requiredLevel >= 5) return "intermediate";
    return "novice";
  }

  function buildCoursesFromCourseContent() {
    const cc = window.COURSE_CONTENT;
    if (!cc || typeof cc !== "object") return null;

    const out = [];
    Object.keys(cc).forEach((key) => {
      const c = cc[key];
      const id = c?.id || String(key);

      const title = c?.title || `Course ${key}`;
      const difficulty =
        c?.difficulty || inferDifficultyFromRequiredLevel(c?.required_level ?? 1);
      const requiredLevel = Number(c?.required_level ?? 1) || 1;

      const units = Array.isArray(c?.units) ? c.units : [];
      let modules = 0;

      for (const u of units) {
        const sections = Array.isArray(u?.sections) ? u.sections : [];
        for (const s of sections) {
          const items = Array.isArray(s?.items) ? s.items : [];
          modules += Math.max(items.length, 0);
        }
      }
      if (!modules) modules = units.length || 10;

      const category =
        c?.category ||
        (difficulty === "advanced"
          ? "Advanced"
          : difficulty === "intermediate"
          ? "Core Skills"
          : "Fundamentals");

      const xpReward =
        c?.xpReward ||
        c?.xp_reward ||
        (difficulty === "advanced" ? 1200 : difficulty === "intermediate" ? 1000 : 800);

      const estimatedTime =
        c?.estimatedTime ||
        c?.estimated_time ||
        `${clamp(Math.round(modules / 3), 2, 14)} hours`;

      const description =
        c?.description ||
        (units[0]?.about
          ? units[0].about
          : "Learn networking concepts through short lessons and practice.");

      out.push({
        id: String(id),
        title,
        description,
        modules,
        xpReward,
        difficulty,
        requiredLevel,
        category,
        estimatedTime,
      });
    });

    out.sort((a, b) => a.requiredLevel - b.requiredLevel);
    return out;
  }

  // Fallback list (only used if COURSE_CONTENT is missing)
  // NOTE: IDs are numeric strings so they match common COURSE_CONTENT keys.
  function fallbackCourses() {
    return [
      {
        id: "1",
        title: "Introduction to Networking",
        description:
          "Master the fundamentals of computer networks and understand how data flows across the internet.",
        modules: 14,
        xpReward: 800,
        difficulty: "novice",
        requiredLevel: 1,
        category: "Fundamentals",
        estimatedTime: "6 hours",
      },
      {
        id: "2",
        title: "Subnetting Basics",
        description: "Learn IP subnetting, CIDR notation, and subnet masks through guided practice.",
        modules: 27,
        xpReward: 1200,
        difficulty: "novice",
        requiredLevel: 1,
        category: "IP Addressing",
        estimatedTime: "10 hours",
      },
      {
        id: "3",
        title: "Routing Protocols",
        description: "Understand how routers communicate using RIP, OSPF, EIGRP, and BGP.",
        modules: 29,
        xpReward: 1400,
        difficulty: "intermediate",
        requiredLevel: 5,
        category: "Routing",
        estimatedTime: "12 hours",
      },
      {
        id: "4",
        title: "Switching & VLANs",
        description: "Learn about switches, VLANs, trunking, and inter-VLAN routing.",
        modules: 25,
        xpReward: 1100,
        difficulty: "intermediate",
        requiredLevel: 5,
        category: "Switching",
        estimatedTime: "9 hours",
      },
      {
        id: "5",
        title: "Network Security",
        description: "Explore firewalls, ACLs, VPNs, and network security best practices.",
        modules: 18,
        xpReward: 900,
        difficulty: "intermediate",
        requiredLevel: 5,
        category: "Security",
        estimatedTime: "8 hours",
      },
      {
        id: "6",
        title: "Advanced Routing",
        description: "Deep dive into redistribution, policy routing, and advanced BGP.",
        modules: 22,
        xpReward: 1200,
        difficulty: "advanced",
        requiredLevel: 10,
        category: "Advanced",
        estimatedTime: "11 hours",
      },
    ];
  }

  function difficultyBadgeClass(diff) {
    if (diff === "novice") return "bg-light text-success border";
    if (diff === "intermediate") return "bg-light text-teal border";
    if (diff === "advanced") return "bg-light text-primary border";
    return "bg-light text-dark border";
  }

  function diffIcon(diff) {
    if (diff === "novice") return "bi-stars";
    if (diff === "intermediate") return "bi-lightning-charge";
    if (diff === "advanced") return "bi-trophy";
    return "bi-journal";
  }

  // -----------------------------
  // UI: Sidebar (matches IDs in dashboard.html)
  // -----------------------------
  const sidebar = {
    backdrop: $("#sideBackdrop"),
    panel: $("#slideSidebar"),
    openBtn: $("#openSidebarBtn"),
    closeBtn: $("#closeSidebarBtn"),
    isOpen: false,
    open() {
      this.isOpen = true;
      this.panel?.classList.add("is-open");
      this.backdrop?.classList.add("is-open");
      this.panel?.setAttribute("aria-hidden", "false");
      this.backdrop?.setAttribute("aria-hidden", "false");
      document.body.classList.add("net-noscroll");
    },
    close() {
      this.isOpen = false;
      this.panel?.classList.remove("is-open");
      this.backdrop?.classList.remove("is-open");
      this.panel?.setAttribute("aria-hidden", "true");
      this.backdrop?.setAttribute("aria-hidden", "true");
      document.body.classList.remove("net-noscroll");
    },
    init() {
      this.openBtn?.addEventListener("click", () => this.open());
      this.closeBtn?.addEventListener("click", () => this.close());
      this.backdrop?.addEventListener("click", () => this.close());
    },
  };

  // -----------------------------
  // UI: User Dropdown (matches .net-dd)
  // -----------------------------
  const dropdown = {
    btn: $("#userBtn"),
    menu: $("#userDropdown"),
    isOpen: false,
    open() {
      this.isOpen = true;
      this.menu?.classList.add("is-open");
      this.btn?.setAttribute("aria-expanded", "true");
    },
    close() {
      this.isOpen = false;
      this.menu?.classList.remove("is-open");
      this.btn?.setAttribute("aria-expanded", "false");
    },
    toggle() {
      this.isOpen ? this.close() : this.open();
    },
    init() {
      this.btn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggle();
      });

      document.addEventListener("click", (e) => {
        if (!this.isOpen) return;
        const t = e.target;
        if (this.menu && this.menu.contains(t)) return;
        if (this.btn && this.btn.contains(t)) return;
        this.close();
      });
    },
  };

  // -----------------------------
  // Logout
  // -----------------------------
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("net_user");
    showPopup("Logged out.", "info");
    setTimeout(() => redirectToLogin(), 250);
  }

  // -----------------------------
  // State
  // -----------------------------
  let state = {
    user: { name: "Student", email: "email@example.com", level: 1, xp: 0 },
    courses: [],
    query: "",
    filterDiff: "all",
    progressMap: {},
  };

  function computeXpProgress(xp) {
    const chunk = 250;
    const currentInChunk = ((xp % chunk) + chunk) % chunk;
    const pct = (currentInChunk / chunk) * 100;
    const remaining = chunk - currentInChunk;
    return { pct: clamp(pct, 0, 100), remaining };
  }

  function updateUserUI() {
    const u = state.user;
    const initials = getInitials(u.name);

    // Top
    safeText($("#topUserName"), u.name);
    safeText($("#topAvatar"), initials);
    safeText($("#ddName"), u.name);
    safeText($("#ddEmail"), u.email);

    // Sidebar
    safeText($("#sideUserName"), u.name);
    safeText($("#sideUserEmail"), u.email);
    safeText($("#sideAvatar"), initials);

    // Welcome
    safeText($("#welcomeName"), u.name);

    // Stats
    safeText($("#statLevel"), String(u.level));
    safeText($("#statXp"), String(u.xp));

    const xp = computeXpProgress(u.xp);
    safeText($("#statLevelHint"), `${xp.remaining} XP to next level`);
    safeText($("#sideLevelBadge"), `Lv ${u.level}`);
    safeText($("#sideXpText"), String(u.xp));
    safeText($("#sideXpHint"), `${xp.remaining} XP to next level`);

    const bar = $("#sideXpBar");
    if (bar) bar.style.width = `${xp.pct}%`;
  }

  function getCourseProgress(courseId, totalModules) {
    const p = state.progressMap[courseId];
    if (!p) return { progress: 0, completedModules: 0, totalModules: totalModules || 0 };

    const progress = clamp(Number(p.progress ?? 0) || 0, 0, 100);
    const completedModules = clamp(Number(p.completedModules ?? 0) || 0, 0, totalModules || 9999);
    const tm = Number(p.totalModules ?? totalModules ?? 0) || (totalModules || 0);

    return { progress, completedModules, totalModules: tm };
  }

  function userCanAccess(course) {
    return state.user.level >= (course.requiredLevel || 1);
  }

  function courseCardHtml(course) {
    const locked = !userCanAccess(course);
    const prog = getCourseProgress(course.id, course.modules);
    const hasProgress = prog.progress > 0;
    const isDone = prog.progress >= 100;

    let cta = "Start Course";
    if (locked) cta = `Unlock at Lv ${course.requiredLevel}`;
    else if (isDone) cta = "✓ Review";
    else if (hasProgress) cta = "Continue →";

    return `
      <article class="net-course-card ${locked ? "is-locked" : ""}" data-course-id="${escapeHtml(
        course.id
      )}" tabindex="0" role="button" aria-label="${escapeHtml(course.title)}">
        ${
          locked
            ? `
          <div class="net-course-lock" aria-hidden="true">
            <div class="net-course-lock-inner">
              <i class="bi bi-lock-fill me-1"></i> Lv ${escapeHtml(course.requiredLevel)}
            </div>
          </div>
        `
            : ""
        }

        <div class="p-4">
          <div class="d-flex align-items-start justify-content-between gap-2">
            <div class="flex-grow-1">
              <div class="small text-muted text-uppercase fw-semibold">${escapeHtml(course.category)}</div>
              <h3 class="h6 fw-bold mb-1 mt-1">${escapeHtml(course.title)}</h3>
              <p class="small text-muted mb-3" style="min-height: 2.9em;">
                ${escapeHtml(course.description)}
              </p>
            </div>

            <div class="net-course-ico">
              <i class="bi ${diffIcon(course.difficulty)}"></i>
            </div>
          </div>

          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <span class="badge border ${difficultyBadgeClass(course.difficulty)} net-badge-shine">${escapeHtml(
      course.difficulty
    )}</span>
            <span class="small text-muted">
              <i class="bi bi-clock me-1"></i>${escapeHtml(course.estimatedTime)}
            </span>
          </div>

          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <span class="small text-muted">
              <i class="bi bi-journal-text me-1"></i>${escapeHtml(course.modules)} modules
            </span>
            <span class="small fw-semibold text-success">
              <i class="bi bi-lightning-charge-fill me-1"></i>${escapeHtml(course.xpReward)} XP
            </span>
          </div>

          ${
            hasProgress
              ? `
            <div class="mb-3">
              <div class="d-flex justify-content-between small text-muted mb-1">
                <span>${escapeHtml(String(prog.progress))}%</span>
                <span>${escapeHtml(String(prog.completedModules))}/${escapeHtml(
                  String(prog.totalModules || course.modules)
                )}</span>
              </div>
              <div class="progress" style="height: 10px;">
                <div class="progress-bar net-progress net-progress-fill" style="width:${escapeHtml(
                  String(prog.progress)
                )}%"></div>
              </div>
            </div>
          `
              : `
            <div class="mb-3 small text-muted">
              ${locked ? "Reach the required level to unlock this course." : "Start now and track your progress here."}
            </div>
          `
          }

          <button class="btn ${locked ? "btn-light border text-muted" : "btn-teal"} w-100 fw-semibold" ${
      locked ? "disabled" : ""
    } type="button">
            ${escapeHtml(cta)}
          </button>
        </div>
      </article>
    `;
  }

  function getFilteredCourses() {
    const q = (state.query || "").trim().toLowerCase();
    const d = state.filterDiff;

    return state.courses.filter((c) => {
      const diffOk = d === "all" ? true : c.difficulty === d;
      if (!diffOk) return false;

      if (!q) return true;

      const hay = `${c.title} ${c.category} ${c.description}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function renderCourses() {
    const grid = $("#coursesGrid");
    if (!grid) return;

    const list = getFilteredCourses();

    safeText($("#coursesTitle"), state.query ? "Search Results" : "All Courses");

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="net-empty text-center p-4">
          <div class="fw-semibold mb-1">No courses found</div>
          <div class="small text-muted">Try a different search or filter.</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(courseCardHtml).join("");

    $$("#coursesGrid .net-course-card").forEach((card) => {
      const id = card.getAttribute("data-course-id");

      const openCourse = () => {
        const course = state.courses.find((c) => c.id === id);
        if (!course) return;

        if (!userCanAccess(course)) {
          showPopup(`Locked. Reach Level ${course.requiredLevel} to unlock "${course.title}".`, "error");
          return;
        }

        localStorage.setItem("selectedCourseId", course.id);
        window.location.href = `course.html?course=${encodeURIComponent(course.id)}`;
      };

      card.addEventListener("click", openCourse);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openCourse();
        }
      });
    });
  }

  function renderStats() {
    const inProgress = state.courses.filter((c) => {
      const p = getCourseProgress(c.id, c.modules);
      return p.progress > 0 && p.progress < 100;
    }).length;

    const completed = state.courses.filter((c) => {
      const p = getCourseProgress(c.id, c.modules);
      return p.progress >= 100;
    }).length;

    safeText($("#statInProgress"), String(inProgress));
    safeText($("#statCompleted"), String(completed));
  }

  function renderContinueLearning() {
    const box = $("#continueBox");
    if (!box) return;

    const inProg = state.courses
      .map((c) => ({ c, p: getCourseProgress(c.id, c.modules) }))
      .filter((x) => x.p.progress > 0 && x.p.progress < 100 && userCanAccess(x.c))
      .sort((a, b) => b.p.progress - a.p.progress);

    let pick = inProg[0]?.c || null;

    if (!pick) {
      pick =
        state.courses.find(
          (c) => userCanAccess(c) && getCourseProgress(c.id, c.modules).progress === 0
        ) || null;
    }

    if (!pick) {
      box.innerHTML = `
        <div class="net-empty">
          <div class="fw-semibold mb-1">No unlocked courses yet</div>
          <div class="small text-muted">Gain XP to unlock your first course.</div>
        </div>
      `;
      return;
    }

    const p = getCourseProgress(pick.id, pick.modules);
    const cta = p.progress > 0 ? "Continue →" : "Start Course";

    box.classList.remove("net-continue-skel");
    box.innerHTML = `
      <div class="net-continue-card">
        <div class="d-flex align-items-start justify-content-between gap-3">
          <div class="flex-grow-1">
            <div class="small text-muted text-uppercase fw-semibold">${escapeHtml(pick.category)}</div>
            <div class="h6 fw-bold mb-1">${escapeHtml(pick.title)}</div>
            <div class="small text-muted mb-3">${escapeHtml(pick.description)}</div>

            <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
              <span class="badge border ${difficultyBadgeClass(pick.difficulty)} net-badge-shine">${escapeHtml(
      pick.difficulty
    )}</span>
              <span class="small text-muted"><i class="bi bi-clock me-1"></i>${escapeHtml(pick.estimatedTime)}</span>
              <span class="small fw-semibold text-success"><i class="bi bi-lightning-charge-fill me-1"></i>${escapeHtml(
      pick.xpReward
    )} XP</span>
            </div>

            <div class="progress mb-3" style="height: 10px;">
              <div class="progress-bar net-progress net-progress-fill" style="width:${escapeHtml(
      String(p.progress)
    )}%"></div>
            </div>

            <button class="btn btn-teal btn-sm fw-semibold" id="continueBtn" type="button">
              ${escapeHtml(cta)}
            </button>
          </div>

          <div class="net-continue-ico d-none d-md-grid" aria-hidden="true">
            <i class="bi bi-play-fill"></i>
          </div>
        </div>
      </div>
    `;

    $("#continueBtn")?.addEventListener("click", () => {
      if (!userCanAccess(pick)) {
        showPopup(`Locked. Reach Level ${pick.requiredLevel} to unlock "${pick.title}".`, "error");
        return;
      }
      localStorage.setItem("selectedCourseId", pick.id);
      window.location.href = `course.html?course=${encodeURIComponent(pick.id)}`;
    });
  }

  // -----------------------------
  // Search + Filters
  // -----------------------------
  function setQuery(q) {
    state.query = q || "";
    renderCourses();
  }

  function syncSearchInputs(value) {
    const top = $("#topSearch");
    const mob = $("#mobileSearch");
    if (top && top.value !== value) top.value = value;
    if (mob && mob.value !== value) mob.value = value;
  }

  function initSearch() {
    const top = $("#topSearch");
    const mob = $("#mobileSearch");

    const handler = (e) => {
      const v = e.target.value || "";
      syncSearchInputs(v);
      setQuery(v);
    };

    top?.addEventListener("input", handler);
    mob?.addEventListener("input", handler);
  }

  function initFilters() {
    $$(".net-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".net-chip").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        state.filterDiff = btn.getAttribute("data-diff") || "all";
        renderCourses();
      });
    });
  }

  // -----------------------------
  // Global keyboard handlers
  // -----------------------------
  function initGlobalKeys() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (dropdown.isOpen) dropdown.close();
        if (sidebar.isOpen) sidebar.close();
      }
    });
  }

  // -----------------------------
  // Init
  // -----------------------------
  async function init() {
    sidebar.init();
    dropdown.init();
    initSearch();
    initFilters();
    initGlobalKeys();

    $("#sideLogoutBtn")?.addEventListener("click", logout);
    $("#topLogoutBtn")?.addEventListener("click", logout);

    $("#sideProgressLink")?.addEventListener("click", () => {
      sidebar.close();
    });

    // load progress
    state.progressMap = loadProgressMap();

    // load user
    const token = getToken();
    let rawUser = getStoredUser();

    // Protected dashboard
    if (!token && !rawUser) {
      redirectToLogin();
      return;
    }

    if (token) {
      const apiUser = await fetchMe(token);
      if (apiUser) rawUser = apiUser;
    }

    state.user = normalizeUser(rawUser || {});
    updateUserUI();

    // load courses
    state.courses = buildCoursesFromCourseContent() || fallbackCourses();

    // enforce requiredLevel defaults if missing
    state.courses = state.courses.map((c) => {
      const requiredLevel =
        Number(
          c.requiredLevel ??
            c.required_level ??
            (c.difficulty === "advanced" ? 10 : c.difficulty === "intermediate" ? 5 : 1)
        ) || 1;
      return { ...c, requiredLevel };
    });

    // render
    renderCourses();
    renderStats();
    renderContinueLearning();
  }

  init();
})();
