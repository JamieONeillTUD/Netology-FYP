// courses.js — shows the course catalog page

(() => {
  "use strict";

  const DIFFICULTIES = ["novice", "intermediate", "advanced"];
  const ENDPOINTS = window.ENDPOINTS || {};
  const XP_SYSTEM = window.NetologyXP || null;
  const apiGet = window.apiGet;

  // pulls an array out of an API response
  function getArray(data, ...keys) {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  }

  // sets text on an element by id
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(text ?? "");
  }

  // escapes text so it's safe to put in HTML
  function escapeHtml(text) {
    const el = document.createElement("div");
    el.textContent = String(text || "");
    return el.innerHTML;
  }

  // turns XP into a level number (defaults to 1)
  function levelFromXp(xp) {
    return XP_SYSTEM?.levelFromTotalXp ? XP_SYSTEM.levelFromTotalXp(xp) : 1;
  }

  // gets the logged-in user from localStorage
  function getUser() {
    try {
      const raw = localStorage.getItem("netology_user") || localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // cleans a difficulty string to novice/intermediate/advanced
  function parseDifficulty(raw) {
    const level = String(raw || "novice").toLowerCase();
    return DIFFICULTIES.includes(level) ? level : "novice";
  }

  // returns an icon for the difficulty level
  function difficultyIcon(difficulty) {
    const level = parseDifficulty(difficulty);
    if (level === "advanced") return '<i class="bi bi-diamond-fill"></i>';
    if (level === "intermediate") return '<i class="bi bi-hexagon-fill"></i>';
    return '<i class="bi bi-circle-fill"></i>';
  }

  // loads courses from API merged with static COURSE_CONTENT
  // COURSE_CONTENT is always the canonical source; API supplies progress fields
  async function fetchCourses() {
    if (!window.COURSE_CONTENT) return [];

    // build base list from static content (IDs 1-9)
    const staticList = Object.entries(window.COURSE_CONTENT).map(([id, data]) =>
      enrichCourse({ id, ...data })
    );

    try {
      const res = await apiGet(ENDPOINTS.courses?.list || "/courses");
      const apiList = getArray(res, "courses");
      if (apiList.length) {
        // merge API fields (e.g. total_lessons from DB) into static entries
        const apiMap = new Map(apiList.map(c => [String(c.id || c.course_id || ""), c]));
        return staticList.map(course => {
          const api = apiMap.get(String(course.id)) || {};
          return enrichCourse({ ...api, ...course });
        });
      }
    } catch (err) {
      console.warn("Could not fetch courses from API:", err);
    }

    return staticList;
  }

  // fills in missing course fields from static data
  function enrichCourse(course) {
    const id = String(course?.id || "");
    const fallback = getStaticCourse(id);
    const lessons = countLessons(course, fallback);
    const modules = countModules(course, fallback);
    const objectives = getObjectiveStats(fallback);

    return {
      ...course,
      id: id || String(fallback?.id || ""),
      title: course?.title || fallback?.title || "Course",
      description: course?.description || fallback?.description || "",
      difficulty: parseDifficulty(course?.difficulty || fallback?.difficulty),
      category: course?.category || fallback?.category || "Core",
      required_level: Number(course?.required_level || fallback?.required_level || 1),
      // always use xpReward from COURSE_CONTENT as source of truth
      xp_reward: Number(fallback?.xpReward || course?.xp_reward || 0),
      module_count: modules,
      objective_count: objectives.total,
      module_objective_counts: objectives.perModule,
      total_lessons: lessons,
      estimated_time: course?.estimated_time || fallback?.estimatedTime || ""
    };
  }

  // looks up a course in the static COURSE_CONTENT by id
  // DB course IDs are 1-9, matching the COURSE_CONTENT keys directly
  function getStaticCourse(id) {
    return window.COURSE_CONTENT?.[String(id)] || {};
  }

  // counts how many lessons a course has
  function countLessons(course, staticCourse) {
    const api = Number(course?.total_lessons);
    if (Number.isFinite(api) && api > 0) return api;

    let count = 0;
    const units = staticCourse?.units || [];
    for (const unit of units) {
      count += Array.isArray(unit?.lessons) ? unit.lessons.length : 0;
    }
    return count;
  }

  // counts how many modules a course has
  function countModules(course, staticCourse) {
    const api = Number(course?.module_count);
    if (Number.isFinite(api) && api > 0) return Math.round(api);

    const units = staticCourse?.units || [];
    return units.length || 1;
  }

  // counts objectives per module and the total
  function getObjectiveStats(staticCourse) {
    const units = staticCourse?.units || [];
    if (!units.length) return { total: 0, perModule: [] };

    const perModule = units.map(unit => countObjectives(unit));
    const total = perModule.reduce((sum, n) => sum + n, 0);
    return { total, perModule };
  }

  // counts objectives in one unit:
  // sum of lesson.objectives arrays + 1 each for quiz, sandbox, challenge
  function countObjectives(unit) {
    let count = 0;

    for (const lesson of (unit?.lessons || [])) {
      const explicit = lesson?.objectives?.length || 0;
      if (explicit > 0) {
        count += explicit;
      } else {
        // fall back to counting interactive blocks
        count += (lesson?.blocks || []).filter(b => {
          const t = String(b?.type || "").toLowerCase();
          return t === "check" || t === "activity";
        }).length;
      }
    }

    // each of quiz/sandbox/challenge counts as one objective
    if (unit?.quiz)      count += 1;
    if (unit?.sandbox)   count += 1;
    if (unit?.challenge) count += 1;

    return count;
  }

  // loads the user's progress for each course
  async function fetchProgress(email) {
    try {
      const res = await apiGet(ENDPOINTS.courses?.userCourses || "/user-courses", { email });
      const list = getArray(res, "courses");

      const map = new Map();
      for (const entry of list) {
        const id = String(entry.id || entry.course_id || "");
        if (id) map.set(id, entry);
      }
      return map;
    } catch (err) {
      console.warn("Could not fetch user progress:", err);
      return new Map();
    }
  }

  // splits courses into novice, intermediate, and advanced groups
  function groupByDifficulty(courses) {
    const grouped = { novice: [], intermediate: [], advanced: [] };
    for (const course of courses) {
      const difficulty = parseDifficulty(course.difficulty);
      grouped[difficulty].push(course);
    }
    return grouped;
  }

  // builds the small "M1: 3 obj." chips for each module
  function moduleChips(counts) {
    if (!counts?.length) return "";
    return counts.map((n, i) =>
      `<span class="net-module-chip">M${i + 1}: ${n} obj.</span>`
    ).join("");
  }

  // builds one course card
  function buildCard(course, progress, userLevel) {
    const card = document.createElement("div");
    card.className = "net-course-card";
    card.dataset.difficulty = parseDifficulty(course.difficulty);

    const id = String(course.id || "");
    const entry = progress.get(id) || {};
    const percent = Math.max(0, Math.min(100, Number(entry.progress_pct || 0)));
    const locked = Number(course.required_level || 1) > userLevel;
    const done = percent >= 100;
    const active = percent > 0 && percent < 100;

    if (locked) card.classList.add("locked");
    if (active) card.classList.add("in-progress");
    if (done) card.classList.add("completed");

    const chips = moduleChips(course.module_objective_counts);
    const xpHtml = course.xp_reward > 0 ? `
      <div class="net-course-xp">
        <i class="bi bi-lightning-charge-fill"></i>
        <span>${course.xp_reward} XP</span>
      </div>` : "";

    const timeHtml = course.estimated_time ? `
      <span class="net-course-stat-pill">
        <i class="bi bi-clock"></i>${escapeHtml(course.estimated_time)}
      </span>` : "";

    const plural = (n, word) => `${n} ${n === 1 ? word : word + "s"}`;

    card.innerHTML = `
      <div class="net-course-header">
        <div class="net-course-icon">${difficultyIcon(course.difficulty)}</div>
        <div class="net-course-meta">
          <div class="net-course-category">${escapeHtml(course.category || "Core")}</div>
          <div class="net-course-title">${escapeHtml(course.title || "Course")}</div>
        </div>
      </div>
      <div class="net-course-stats-row">
        <span class="net-course-stat-pill"><i class="bi bi-file-text"></i>${plural(course.total_lessons, "lesson")}</span>
        <span class="net-course-stat-pill"><i class="bi bi-diagram-3"></i>${plural(course.module_count, "module")}</span>
        <span class="net-course-stat-pill"><i class="bi bi-check2-square"></i>${plural(course.objective_count, "objective")}</span>
        ${timeHtml}
      </div>
      ${chips ? `<div class="net-course-module-breakdown">${chips}</div>` : ""}
      <div class="net-course-desc">${escapeHtml(course.description || "")}</div>
      ${xpHtml}
      <div class="net-course-footer">
        <div class="net-course-progress-block">
          <div class="net-course-progress-meta">
            <span class="net-course-progress-label">${percent}% Complete</span>
          </div>
          <div class="net-course-bar net-course-bar--wide">
            <div class="net-course-bar-fill" style="width:${percent}%"></div>
          </div>
        </div>
        <button class="net-course-cta ${active ? "btn-continue" : done ? "btn-review" : locked ? "btn-locked" : "btn-start"}"
                data-course-id="${escapeHtml(id)}" ${locked ? "disabled" : ""}>
          ${locked ? '<i class="bi bi-lock"></i> Locked'
            : done ? '<i class="bi bi-check-circle"></i> Review'
            : active ? '<i class="bi bi-play-fill"></i> Continue'
            : '<i class="bi bi-plus-circle"></i> Start'}
        </button>
      </div>
      ${locked ? '<div class="net-course-lock"><i class="bi bi-lock"></i></div>' : ""}`;

    if (!locked) {
      const url = `course.html?id=${encodeURIComponent(id)}`;
      const btn = card.querySelector(".net-course-cta");
      if (btn) btn.addEventListener("click", () => { window.location.href = url; });
      card.style.cursor = "pointer";
      card.addEventListener("click", (e) => {
        if (e.target.closest(".net-course-cta")) return;
        window.location.href = url;
      });
    }

    return card;
  }

  // loads everything and puts cards into the page
  async function loadCourses(user) {
    try {
      const courses = await fetchCourses();
      if (!courses.length) return;

      const progress = await fetchProgress(user.email);
      const level = Number(user?.numeric_level) || levelFromXp(Number(user?.xp || 0)) || 1;
      const grouped = groupByDifficulty(courses);

      for (const diff of DIFFICULTIES) {
        const grid = document.getElementById(`${diff}Grid`);
        if (!grid) continue;
        grid.innerHTML = "";
        for (const course of (grouped[diff] || [])) {
          grid.appendChild(buildCard(course, progress, level));
        }
      }
    } catch (err) {
      console.error("Error loading courses:", err);
    }
  }

  // hooks up the difficulty filter buttons
  function setupFilters() {
    const buttons = Array.from(document.querySelectorAll("[data-path]"));
    if (!buttons.length) return;

    const apply = (path) => {
      const active = (path === "all" || DIFFICULTIES.includes(path)) ? path : "all";

      buttons.forEach(btn => {
        const match = String(btn.dataset.path || "all").toLowerCase() === active;
        btn.classList.toggle("active", match);
        btn.classList.toggle("btn-teal", match);
        btn.classList.toggle("btn-outline-teal", !match);
        btn.setAttribute("aria-selected", String(match));
      });

      document.querySelectorAll(".net-course-section").forEach(section => {
        if (active === "all") {
          section.style.display = "block";
        } else {
          const difficulty = String(section.dataset.difficulty || "").toLowerCase();
          section.style.display = difficulty === active ? "block" : "none";
        }
      });
    };

    buttons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        apply(String(btn.dataset.path || "all").toLowerCase());
      });
    });

    apply("all");
    window.addEventListener("pageshow", () => apply("all"));
  }

  // hooks up the sidebar open/close buttons
  function setupSidebar() {
    const openBtn = document.getElementById("openSidebarBtn");
    const closeBtn = document.getElementById("closeSidebarBtn");
    const sidebar = document.getElementById("slideSidebar");
    const backdrop = document.getElementById("sideBackdrop");

    const open = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
    };

    const close = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
    };

    if (openBtn) openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sidebar?.classList.contains("is-open")) close();
    });
  }

  // hooks up the user dropdown menu
  function setupDropdown() {
    const btn = document.getElementById("userBtn");
    const menu = document.getElementById("userDropdown");
    if (!btn || !menu) return;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", (e) => {
      if (menu.contains(e.target) || btn.contains(e.target)) return;
      menu.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    });
  }

  // hooks up the logout buttons
  function setupLogout() {
    const logout = () => {
      localStorage.removeItem("netology_user");
      localStorage.removeItem("user");
      localStorage.removeItem("netology_token");
      window.location.href = "index.html";
    };

    const top = document.getElementById("topLogoutBtn");
    const side = document.getElementById("sideLogoutBtn");
    if (top) top.addEventListener("click", logout);
    if (side) side.addEventListener("click", logout);
  }

  // runs when the page loads
  async function init() {
    const user = getUser();
    if (!user?.email) { window.location.href = "login.html"; return; }

    // link logos to dashboard
    const topBrand = document.getElementById("topBrand");
    const sideBrand = document.getElementById("sideBrand");
    if (topBrand) topBrand.setAttribute("href", "dashboard.html");
    if (sideBrand) sideBrand.setAttribute("href", "dashboard.html");

    setupSidebar();
    setupDropdown();
    setupLogout();

    // show user info in sidebar and dropdown
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "Student";
    const initial = (name.charAt(0) || "S").toUpperCase();
    const level = levelFromXp(Number(user.xp || 0));

    setText("topAvatar", initial);
    setText("sideAvatar", initial);
    setText("ddName", name);
    setText("ddEmail", user.email);
    setText("sideUserName", name);
    setText("sideUserEmail", user.email);
    setText("sideLevelBadge", `Lv ${level}`);

    setupFilters();
    await loadCourses(user);

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    if (typeof window.maybeStartOnboardingTour === "function") {
      window.maybeStartOnboardingTour("courses", user.email);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
