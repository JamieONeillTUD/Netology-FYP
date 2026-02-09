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
  const BASE_XP = 100;

  function safeJSONParse(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;");
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function getCurrentUser() {
    return (
      safeJSONParse(localStorage.getItem("netology_user"), null) ||
      safeJSONParse(localStorage.getItem("user"), null) ||
      null
    );
  }

  function isLoggedIn() {
    const u = getCurrentUser();
    return !!(u && (u.email || u.username || u.name));
  }

  function totalXpForLevel(level) {
    const lvl = Math.max(1, Number(level) || 1);
    return BASE_XP * (lvl - 1) * lvl / 2;
  }

  function levelFromXP(totalXP) {
    const xp = Math.max(0, Number(totalXP) || 0);
    const t = xp / BASE_XP;
    const lvl = Math.floor((1 + Math.sqrt(1 + 8 * t)) / 2);
    return Math.max(1, lvl);
  }

  function xpForNextLevel(level) {
    const lvl = Math.max(1, Number(level) || 1);
    return BASE_XP * lvl;
  }

  function userNumericLevel(user) {
    const totalXP = Number(user?.xp) || 0;
    return levelFromXP(totalXP);
  }

  function getUserRank(user) {
    const raw = String(user?.unlock_tier || user?.rank || user?.level_name || user?.level || "novice").toLowerCase();
    if (raw.includes("advanced")) return "Advanced";
    if (raw.includes("intermediate")) return "Intermediate";
    return "Novice";
  }

  function computeXP(user) {
    const totalXP = Number(user?.xp) || 0;
    const level = levelFromXP(totalXP);
    const levelStart = totalXpForLevel(level);
    const currentLevelXP = Math.max(0, totalXP - levelStart);
    const xpNext = xpForNextLevel(level);
    const progressPct = Math.max(0, Math.min(100, (currentLevelXP / Math.max(xpNext, 1)) * 100));
    const toNext = Math.max(0, xpNext - currentLevelXP);
    return { totalXP, currentLevelXP, xpNext, progressPct, toNext, level };
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

  // -----------------------------
  // Login streak + badges
  // -----------------------------
  function dateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function getLoginLog(email) {
    const raw = localStorage.getItem(`netology_login_log:${email}`);
    return safeJSONParse(raw, []);
  }

  function saveLoginLog(email, log) {
    localStorage.setItem(`netology_login_log:${email}`, JSON.stringify(log));
  }

  function recordLoginDay(email) {
    if (!email) return { log: [], isNew: false };
    const log = getLoginLog(email);
    const today = dateKey();
    let isNew = false;
    if (!log.includes(today)) {
      log.push(today);
      log.sort();
      saveLoginLog(email, log);
      isNew = true;
    }
    return { log, isNew };
  }

  function computeLoginStreak(log) {
    if (!Array.isArray(log) || !log.length) return 0;
    const set = new Set(log);
    let streak = 0;
    const cursor = new Date();
    while (set.has(dateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function getBadges(email) {
    return safeJSONParse(localStorage.getItem(`netology_badges:${email}`), []);
  }

  function saveBadges(email, badges) {
    localStorage.setItem(`netology_badges:${email}`, JSON.stringify(badges));
  }

  function bumpUserXP(email, delta) {
    if (!delta) return;
    const rawUser = safeJSONParse(localStorage.getItem("user"), null);
    if (rawUser && rawUser.email === email) {
      rawUser.xp = Math.max(0, Number(rawUser.xp || 0) + delta);
      localStorage.setItem("user", JSON.stringify(rawUser));
    }
    const rawNet = safeJSONParse(localStorage.getItem("netology_user"), null);
    if (rawNet && rawNet.email === email) {
      rawNet.xp = Math.max(0, Number(rawNet.xp || 0) + delta);
      localStorage.setItem("netology_user", JSON.stringify(rawNet));
    }
  }

  function loginBadgeDefs() {
    return [
      { id: "login-streak-3", title: "3-Day Streak", desc: "Log in 3 days in a row", icon: "bi-fire", type: "login", target: 3, xp: 50 },
      { id: "login-streak-5", title: "5-Day Streak", desc: "Log in 5 days in a row", icon: "bi-fire", type: "login", target: 5, xp: 75 },
      { id: "login-streak-7", title: "7-Day Streak", desc: "Log in 7 days in a row", icon: "bi-fire", type: "login", target: 7, xp: 100 },
      { id: "login-streak-10", title: "10-Day Streak", desc: "Log in 10 days in a row", icon: "bi-fire", type: "login", target: 10, xp: 150 }
    ];
  }

  function awardLoginStreakBadges(email, streak) {
    if (!email) return;
    const defs = loginBadgeDefs();
    const badges = getBadges(email);
    const earned = new Set(badges.map((b) => b.id));
    let changed = false;

    defs.forEach((def) => {
      if (streak >= def.target && !earned.has(def.id)) {
        badges.push({ ...def, earnedAt: dateKey() });
        earned.add(def.id);
        bumpUserXP(email, def.xp);
        changed = true;
      }
    });

    if (changed) saveBadges(email, badges);
  }

  // Welcome ring
  // Your HTML uses the course-style ring (r=58, dasharray ~364.42)
  function setWelcomeRing(progressPct) {
    const ring = $("welcomeRing");
    if (!ring) return;
    const track = ring.parentElement?.querySelector(".net-ring-track");

    const r = 58;
    const CIRC = 2 * Math.PI * r; // ~364.42
    const arc = 0.78; // ~280deg arc
    const dash = CIRC * arc;
    const gap = CIRC - dash;
    const offset = dash * (1 - (progressPct / 100));

    const dashArray = `${dash.toFixed(2)} ${gap.toFixed(2)}`;
    ring.style.strokeDasharray = dashArray;
    ring.style.strokeDashoffset = `${offset.toFixed(2)}`;

    if (track) {
      track.style.strokeDasharray = dashArray;
      track.style.strokeDashoffset = "0";
    }
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
      localStorage.removeItem("user");
      localStorage.removeItem("netology_token");
      window.location.href = "index.html";
    }

    topLogout?.addEventListener("click", doLogout);
    sideLogout?.addEventListener("click", doLogout);
  }

  // -----------------------------
  // Courses data (from course_content.js)
  // -----------------------------
  function getCourseIndex() {
    const cc = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT)
      ? COURSE_CONTENT
      : (window.COURSE_CONTENT || {});
    if (cc && Object.keys(cc).length) return cc;
    return window.__dashCourseIndex || {};
  }

  async function fetchCoursesFromApi() {
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (!base) return [];

    try {
      const data = await fetchJson(`${base}/courses`);
      if (!data || !data.success || !Array.isArray(data.courses)) return [];

      const index = {};
      data.courses.forEach((c) => {
        const id = String(c.id || "");
        if (!id) return;
        index[id] = {
          id,
          title: c.title || "Untitled Course",
          description: c.description || "Learn networking skills.",
          difficulty: (c.difficulty || "novice").toLowerCase(),
          category: c.category || "Core",
          xpReward: Number(c.xp_reward || c.xpReward || 0) || 0,
          total_lessons: Number(c.total_lessons || c.totalLessons || 0) || 0,
          required_level: Number(c.required_level || 0) || 0,
          estimatedTime: c.estimated_time || c.estimatedTime || "—"
        };
      });

      window.__dashCourseIndex = index;
      return Object.keys(index).map((k) => index[k]);
    } catch {
      return [];
    }
  }

  function getCoursesFromContent() {
    const cc = getCourseIndex();
    const list = [];

    for (const key of Object.keys(cc)) {
      const c = cc[key] || {};
      const id = c.id || key;
      const title = c.title || "Untitled Course";
      const description = c.description || c.about || "Learn networking skills.";
      const difficulty = (c.difficulty || "novice").toLowerCase();
      const required_level = Number(c.required_level) || difficultyRequiredLevel(difficulty);

      const items = countRequiredItems(c);

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

  /* -----------------------------
     Progress + Completions (local)
  ----------------------------- */
  function mapItemType(sectionType, item) {
    const st = String(sectionType || "").toLowerCase();
    if (st.includes("quiz")) return "quiz";
    if (st.includes("challenge")) return "challenge";
    if (st.includes("practice") || st.includes("sandbox") || st.includes("hands-on")) return "sandbox";

    const t = String(item?.type || "").toLowerCase();
    if (t === "quiz") return "quiz";
    if (t === "challenge") return "challenge";
    if (t === "sandbox" || t === "practice") return "sandbox";
    return "learn";
  }

  function countRequiredItems(course) {
    if (!course) return 0;
    const total = Number(course.total_lessons || course.totalLessons || course.items || 0) || 0;
    if (total > 0) return total;
    const units = course.units || course.modules || [];
    let required = 0;

    units.forEach((u) => {
      if (Array.isArray(u?.sections)) {
        u.sections.forEach((s) => {
          const st = String(s?.type || s?.kind || s?.title || "").toLowerCase();
          const items = s?.items || s?.lessons || [];
          if (!Array.isArray(items)) return;
          items.forEach((it) => {
            const t = mapItemType(st, it);
            if (t === "learn" || t === "quiz" || t === "challenge") required += 1;
          });
        });
      } else if (u?.sections && typeof u.sections === "object") {
        const obj = u.sections;
        const learnArr = obj.learn || obj.lesson || obj.lessons || [];
        const quizArr = obj.quiz || obj.quizzes || [];
        const challengeArr = obj.challenge || obj.challenges || [];
        required += (learnArr.length || 0);
        required += (quizArr.length || 0);
        required += (challengeArr.length || 0);
      } else if (Array.isArray(u?.lessons)) {
        u.lessons.forEach((it) => {
          const t = mapItemType("", it);
          if (t === "learn" || t === "quiz" || t === "challenge") required += 1;
        });
      }
    });

    return required;
  }

  function getCourseCompletions(email, courseId) {
    if (!email || !courseId) {
      return { lesson: new Set(), quiz: new Set(), challenge: new Set() };
    }
    const raw = localStorage.getItem(`netology_completions:${email}:${courseId}`);
    const payload = safeJSONParse(raw, {}) || {};
    const lessonArr = payload.lesson || payload.lessons || payload.learn || [];
    const quizArr = payload.quiz || payload.quizzes || [];
    const chArr = payload.challenge || payload.challenges || [];

    return {
      lesson: new Set((lessonArr || []).map(Number)),
      quiz: new Set((quizArr || []).map(Number)),
      challenge: new Set((chArr || []).map(Number))
    };
  }

  function getProgressLog(email) {
    if (!email) return [];
    return safeJSONParse(localStorage.getItem(`netology_progress_log:${email}`), []) || [];
  }

  function getStartedCourses(email) {
    if (!email) return [];
    const raw = localStorage.getItem(`netology_started_courses:${email}`);
    const list = safeJSONParse(raw, []) || [];
    return Array.isArray(list) ? list : [];
  }

  function computeStreak(log) {
    if (!log.length) return 0;
    const days = new Set(log.map(e => e.date).filter(Boolean));
    let streak = 0;
    const d = new Date();
    for (;;) {
      const key = d.toISOString().slice(0, 10);
      if (!days.has(key)) break;
      streak += 1;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function countInLastDays(log, days, type) {
    if (!log.length) return 0;
    const now = Date.now();
    const windowMs = days * 24 * 60 * 60 * 1000;
    return log.filter(e => e?.type === type && (now - Number(e.ts || 0)) <= windowMs).length;
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

  function setupGoalToggle() {
    const btns = Array.from(document.querySelectorAll(".dash-toggle-btn[data-panel]"));
    if (!btns.length) return;

    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        btns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        const panelId = btn.getAttribute("data-panel");
        btns.forEach((b) => {
          const id = b.getAttribute("data-panel");
          if (!id) return;
          const panel = document.getElementById(id);
          if (!panel) return;

          if (id === panelId) {
            panel.hidden = false;
            requestAnimationFrame(() => panel.classList.add("is-active"));
          } else {
            panel.classList.remove("is-active");
            window.setTimeout(() => {
              panel.hidden = true;
            }, 200);
          }
        });
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
    const email = user?.email;

    if (!email) {
      box.className = "dash-continue-list";
      box.innerHTML = `<div class="text-muted small">Sign in to track your learning progress.</div>`;
      return;
    }

    const started = getStartedCourses(email)
      .sort((a, b) => Number(b.lastViewed || 0) - Number(a.lastViewed || 0));

    if (!started.length) {
      box.className = "dash-continue-list";
      box.innerHTML = `<div class="text-muted small">No started courses yet. Pick a course to begin.</div>`;
      return;
    }

    const content = getCourseIndex();

    box.className = "dash-continue-list";
    box.innerHTML = started.map((entry) => {
      const course = content[String(entry.id)] || {};
      const title = course.title || "Course";
      const diff = String(course.difficulty || "novice");
      const category = course.category || "Core";
      const xpReward = Number(course.xpReward || course.xp_reward || course.totalXP || 0);

      const required = countRequiredItems(course);
      const completions = getCourseCompletions(email, entry.id);
      const done = completions.lesson.size + completions.quiz.size + completions.challenge.size;
      const pct = required ? Math.round((done / required) * 100) : 0;

      return `
        <div class="dash-continue-item" data-course-id="${entry.id}">
          <div class="flex-grow-1">
            <div class="fw-semibold">${title}</div>
            <div class="dash-continue-meta">${category} • ${prettyDiff(diff)}</div>
            <div class="net-meter mt-2" aria-label="Course progress">
              <div class="net-meter-fill" style="width:${pct}%"></div>
            </div>
            <div class="small text-muted mt-1">${done}/${required || 0} items</div>
          </div>
          <div class="text-end">
            <div class="small text-muted">Suggested</div>
            <div class="fw-semibold net-xp-accent">
              <i class="bi bi-lightning-charge-fill me-1"></i>${xpReward || 0}
            </div>
            <button class="btn btn-teal btn-sm mt-2" type="button">Continue</button>
          </div>
        </div>
      `;
    }).join("");

    box.querySelectorAll("[data-course-id]").forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.getAttribute("data-course-id");
        if (!id) return;
        window.location.href = `course.html?id=${encodeURIComponent(id)}`;
      });
    });
  }

  // -----------------------------
  // Render courses
  // -----------------------------
  async function renderCourses() {
    const grid = $("coursesGrid");
    if (!grid) return;
    const banner = $("courseErrorBanner");

    const user = getCurrentUser();
    const uLevel = userNumericLevel(user);

    let courses = getCoursesFromContent();
    if (!courses.length) {
      const apiCourses = await fetchCoursesFromApi();
      if (apiCourses.length) {
        courses = apiCourses.map((c) => ({
          key: String(c.id),
          id: String(c.id),
          title: c.title,
          description: c.description,
          difficulty: (c.difficulty || "novice").toLowerCase(),
          required_level: Number(c.required_level) || difficultyRequiredLevel((c.difficulty || "novice").toLowerCase()),
          xpReward: Number(c.xpReward || 0) || 0,
          items: Number(c.total_lessons || 0) || countRequiredItems(c),
          category: c.category || "Core",
          estimatedTime: c.estimatedTime || "—"
        }));
      }
    }
    if (!courses.length) {
      grid.innerHTML = `
        <div class="net-empty">
          <i class="bi bi-journal-x"></i>
          <div class="fw-bold">No courses available</div>
          <div class="small text-muted">Please check back later.</div>
        </div>
      `;
      const lockNote = $("lockNote");
      if (lockNote) lockNote.style.display = "none";
      if (banner) banner.classList.remove("d-none");
      return;
    }

    if (banner) banner.classList.add("d-none");
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
  // Progress widgets (streak, goals, achievements)
  // -----------------------------
  function renderProgressWidgets() {
    const user = getCurrentUser();
    const email = user?.email || "";

    const content = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) ? COURSE_CONTENT : {};
    const courseIds = Object.keys(content);

    let lessonsDone = 0;
    let quizzesDone = 0;
    let challengesDone = 0;
    let inProgress = 0;
    let completed = 0;

    if (email) {
      courseIds.forEach((id) => {
        const completions = getCourseCompletions(email, id);
        lessonsDone += completions.lesson.size;
        quizzesDone += completions.quiz.size;
        challengesDone += completions.challenge.size;

        const required = countRequiredItems(content[id]);
        const done = completions.lesson.size + completions.quiz.size + completions.challenge.size;
        if (required > 0) {
          if (done >= required) completed += 1;
          else if (done > 0) inProgress += 1;
        }
      });
    }

    if ($("statInProgress")) $("statInProgress").textContent = String(inProgress);
    if ($("statCompleted")) $("statCompleted").textContent = String(completed);

    // Login streak + streak badge progress
    const loginLog = email ? getLoginLog(email) : [];
    const loginStreak = computeLoginStreak(loginLog);
    const topStreak = $("topStreakDays");
    if (topStreak) topStreak.textContent = `${loginStreak} day${loginStreak === 1 ? "" : "s"}`;

    const earnedBadgeIds = new Set(getBadges(email).map((b) => b.id));
    const streakDefs = loginBadgeDefs();

    // Weekly tasks list (personalized)
    const taskPool = [];
    taskPool.push({
      id: "login-streak",
      title: "Keep your streak alive",
      progress: Math.min(loginStreak, 7),
      target: 7,
      unit: "days",
      xp: 40,
      tip: "Log in daily to build streak badges."
    });

    taskPool.push({
      id: "lesson-focus",
      title: lessonsDone < 5 ? "Complete 2 lessons" : "Complete 1 lesson",
      progress: lessonsDone % 5,
      target: lessonsDone < 5 ? 2 : 1,
      unit: "lessons",
      xp: lessonsDone < 5 ? 50 : 25,
      tip: "Lessons unlock quizzes and sandbox challenges."
    });

    if (quizzesDone < 3) {
      taskPool.push({
        id: "quiz-focus",
        title: "Pass a quiz",
        progress: quizzesDone % 3,
        target: 1,
        unit: "quiz",
        xp: 40,
        tip: "Quizzes reinforce key concepts."
      });
    }

    if (challengesDone < 2) {
      taskPool.push({
        id: "sandbox-focus",
        title: "Build 1 topology",
        progress: challengesDone % 2,
        target: 1,
        unit: "topology",
        xp: 60,
        tip: "Sandbox practice accelerates mastery."
      });
    }

    if (inProgress > 0) {
      taskPool.push({
        id: "finish-module",
        title: "Continue an in‑progress course",
        progress: inProgress,
        target: Math.max(1, Math.min(3, inProgress)),
        unit: "courses",
        xp: 35,
        tip: "Pick up where you left off."
      });
    }

    // deterministic daily shuffle
    const seed = Array.from(`${email}:${dateKey()}`).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
    let t = seed || 1;
    const rng = () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
    const shuffled = taskPool.sort(() => rng() - 0.5).slice(0, 3);

    const taskWrap = $("weeklyTasks");
    if (taskWrap) {
      taskWrap.innerHTML = shuffled.map((t) => `
        <div class="dash-task" data-tip="${escapeHtml(`${t.tip} (+${t.xp} XP)`) }">
          <div>
            <div class="fw-semibold">${escapeHtml(t.title)}</div>
            <div class="small text-muted">${t.progress}/${t.target} ${escapeHtml(t.unit)}</div>
          </div>
          <div class="dash-task-xp">+${t.xp} XP</div>
        </div>
      `).join("");
    }

    const nextLoginBadge = streakDefs.find((d) => !earnedBadgeIds.has(d.id));
    if ($("weeklyGoalText")) {
      if (!nextLoginBadge) {
        $("weeklyGoalText").textContent = "All streak badges earned";
      } else {
        const remaining = Math.max(0, nextLoginBadge.target - loginStreak);
        $("weeklyGoalText").textContent = remaining === 0
          ? `Earned ${nextLoginBadge.target}-day badge`
          : `${remaining} days to ${nextLoginBadge.target}-day badge`;
      }
    }

    // Achievements (show only incomplete)
    const achievements = [
      ...streakDefs,
      { id: "fast-learner", title: "Fast Learner", desc: "Complete 5 lessons", icon: "bi-lightning-charge-fill", type: "lessons", target: 5, xp: 50 },
      { id: "sandbox-builder", title: "Sandbox Builder", desc: "Build 2 topologies", icon: "bi-diagram-3", type: "challenges", target: 2, xp: 60 },
      { id: "quiz-master", title: "Quiz Master", desc: "Pass 3 quizzes", icon: "bi-patch-check", type: "quizzes", target: 3, xp: 60 }
    ];

    const counts = { lessons: lessonsDone, quizzes: quizzesDone, challenges: challengesDone, login: loginStreak };
    const pending = achievements.filter((a) => {
      if (a.type === "login") return !earnedBadgeIds.has(a.id);
      return (counts[a.type] || 0) < a.target;
    });

    if ($("nextBadgeText")) {
      if (pending.length) {
        const next = pending[0];
        const current = next.type === "login" ? loginStreak : (counts[next.type] || 0);
        const remaining = Math.max(0, next.target - current);
        const label =
          next.type === "login" ? "login days" :
          next.type === "quizzes" ? "quizzes" :
          next.type === "challenges" ? "topologies" :
          "lessons";
        $("nextBadgeText").textContent = remaining === 0
          ? `Badge ready: ${next.title}`
          : `Complete ${remaining} ${label}`;
      } else {
        $("nextBadgeText").textContent = "All badges earned";
      }
    }

    const list = $("achievementsList");
    if (list) {
      if (!pending.length) {
        list.innerHTML = `<div class="small text-muted">All achievements completed. Great work.</div>`;
      } else {
        list.innerHTML = pending.map((a) => {
          const current = a.type === "login" ? Math.min(loginStreak, a.target) : (counts[a.type] || 0);
          return `
            <div class="dash-badge">
              <span class="dash-badge-ico"><i class="bi ${a.icon}"></i></span>
              <div>
                <div class="fw-semibold">${a.title}</div>
                <div class="small text-muted">${a.desc} (${current}/${a.target})</div>
              </div>
            </div>
          `;
        }).join("");
      }
    }

    if ($("focusText")) {
      $("focusText").textContent = loginStreak > 0
        ? "Log in tomorrow to keep your streak"
        : "Log in today to start a streak";
    }
    if ($("focusXp")) {
      $("focusXp").textContent = nextLoginBadge ? `+${nextLoginBadge.xp} XP` : "XP varies";
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
    const rank = getUserRank(user);

    // avatar = first letter of name/username
    const initial = (name || "S").trim().charAt(0).toUpperCase();
    const streakPill = $("topStreakPill");
    if (streakPill) streakPill.style.display = user?.email ? "" : "none";

    const lvl = userNumericLevel(user);
    const { totalXP, currentLevelXP, xpNext, progressPct, toNext } = computeXP(user);

    // Welcome
    if ($("welcomeName")) $("welcomeName").textContent = name;

    // Top user
    if ($("topUserName")) $("topUserName").textContent = name;
    if ($("topAvatar")) $("topAvatar").textContent = initial;

    // Dropdown
    if ($("ddName")) $("ddName").textContent = name;
    if ($("ddEmail")) $("ddEmail").textContent = email;
    if ($("ddAvatar")) $("ddAvatar").textContent = initial;
    if ($("ddLevel")) $("ddLevel").textContent = `Level ${lvl}`;
    if ($("ddRank")) $("ddRank").textContent = rank;

    // Sidebar user
    if ($("sideUserName")) $("sideUserName").textContent = name;
    if ($("sideUserEmail")) $("sideUserEmail").textContent = email;
    if ($("sideAvatar")) $("sideAvatar").textContent = initial;

    if ($("sideLevelBadge")) $("sideLevelBadge").textContent = `Lv ${lvl}`;
    if ($("sideXpText")) $("sideXpText").textContent = `${currentLevelXP}/${xpNext}`;
    if ($("sideXpBar")) $("sideXpBar").style.width = `${progressPct}%`;
    if ($("sideXpHint")) $("sideXpHint").textContent = `${toNext} XP to next level`;

    // Stats tiles
    if ($("statLevel")) $("statLevel").textContent = String(lvl);
    if ($("statXp")) $("statXp").textContent = String(totalXP);
    if ($("statLevelHint")) $("statLevelHint").textContent = `${toNext} XP to next level`;

    // Welcome ring block
    if ($("welcomeLevel")) $("welcomeLevel").textContent = String(lvl);
    if ($("welcomeRank")) $("welcomeRank").textContent = rank;
    if ($("welcomeXpText")) $("welcomeXpText").textContent = `${currentLevelXP}/${xpNext} XP`;
    if ($("welcomeLevelHint")) $("welcomeLevelHint").textContent = `${toNext} XP to next level`;

    setWelcomeRing(progressPct);
  }

  async function refreshUserFromApi() {
    const user = getCurrentUser();
    const email = user?.email || localStorage.getItem("netology_last_email") || "";
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (!email || !base) return user;

    try {
      const data = await fetchJson(`${base}/user-info?email=${encodeURIComponent(email)}`);
      if (!data || !data.success) return user;

      const unlockTier = String(data.start_level || user?.unlock_tier || user?.unlock_level || user?.unlockTier || "novice")
        .trim()
        .toLowerCase();

      const merged = {
        ...(user || {}),
        email,
        first_name: data.first_name || user?.first_name,
        username: data.username || user?.username,
        xp: Number(data.xp || user?.xp || 0),
        unlock_tier: ["novice", "intermediate", "advanced"].includes(unlockTier) ? unlockTier : "novice"
      };

      localStorage.setItem("user", JSON.stringify(merged));
      localStorage.setItem("netology_user", JSON.stringify(merged));
      return merged;
    } catch {
      return user;
    }
  }

  // -----------------------------
  // Init
  // -----------------------------
  async function init() {
    try {
      wireBrandRouting();
      setupSidebar();
      setupUserDropdown();
      setupLogout();
      setupGoalToggle();

      const user = await refreshUserFromApi();
      if (user?.email) {
        const loginInfo = recordLoginDay(user.email);
        const streak = computeLoginStreak(loginInfo.log);
        awardLoginStreakBadges(user.email, streak);

        if (loginInfo.isNew) {
          const pill = $("topStreakPill");
          if (pill) {
            pill.classList.remove("is-animate");
            requestAnimationFrame(() => {
              pill.classList.add("is-animate");
              window.setTimeout(() => pill.classList.remove("is-animate"), 1200);
            });
          }
        }
      }

      fillUserUI();
      setupCourseSearchAndChips();
      await renderCourses();
      renderContinueLearning();
      renderProgressWidgets();
    } catch (err) {
      const box = $("continueBox");
      if (box) {
        box.className = "dash-continue-list";
        box.innerHTML = `<div class="text-danger small">Dashboard failed to load. Please refresh and try again.</div>`;
      }
      const banner = $("courseErrorBanner");
      if (banner) banner.classList.remove("d-none");
      console.error("Dashboard init failed:", err);
    }
  }

  onReady(init);
})();
