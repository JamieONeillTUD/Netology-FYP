// dashboard.js — Main user dashboard with progress, achievements, and challenges.

(() => {
  "use strict";

  const ENDPOINTS = window.ENDPOINTS || {};
  const apiGet = window.apiGet;

  // All mutable dashboard data lives here.
  const state = {
    refreshTimer: null,
    carouselTimer: null,
    progress: null,
    achievements: { all: [], unlocked: [], locked: [] },
    challenges: { daily: [], weekly: [] },
    courses: [],
    listenersAttached: false
  };

  const TIPS = [
    "CompTIA Network+ covers the physical, data link, network, transport, and application layers.",
    "A MAC address is 48 bits long and is burned into the network card.",
    "OSPF is a link-state routing protocol using Dijkstra's algorithm.",
    "TCP is connection-oriented, while UDP is connectionless.",
    "DNS translates human-readable domain names into IP addresses.",
    "DHCP automatically assigns IP addresses to devices on a network.",
    "VLANs segment a network to improve security and performance.",
    "A subnet mask defines the network and host portions of an IP address.",
    "ARP maps IP addresses to MAC addresses.",
    "A firewall filters traffic based on security rules."
  ];

  // Reads the saved user from localStorage.
  function getSavedUser() {
    try {
      const raw = localStorage.getItem("netology_user") || localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // Saves user data to localStorage.
  function saveUser(user) {
    if (!user) return;
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("netology_user", JSON.stringify(user));
  }

  // Sets text content on an element by id.
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // Fetches fresh user data from server and merges with saved data.
  async function fetchUser() {
    const saved = getSavedUser();
    const email = saved?.email || localStorage.getItem("netology_last_email") || "";
    if (!email) return saved;

    try {
      const endpoint = ENDPOINTS.auth?.userInfo || "/user-info";
      const data = await apiGet(endpoint, { email });
      if (!data?.success) return saved;

      const updated = {
        ...(saved || {}),
        email,
        first_name: data.first_name || saved?.first_name,
        last_name: data.last_name || saved?.last_name,
        username: data.username || saved?.username,
        xp: Number.isFinite(Number(data.xp ?? data.total_xp))
          ? Number(data.xp ?? data.total_xp)
          : Number(saved?.xp || 0),
        numeric_level: Number.isFinite(Number(data.numeric_level))
          ? Number(data.numeric_level)
          : (saved?.numeric_level || 1),
        rank: data.rank || data.level || saved?.rank,
        level: data.level || data.rank || saved?.level,
        is_first_login: typeof data.is_first_login !== "undefined"
          ? Boolean(data.is_first_login)
          : saved?.is_first_login,
        onboarding_completed: typeof data.onboarding_completed !== "undefined"
          ? Boolean(data.onboarding_completed)
          : saved?.onboarding_completed
      };

      saveUser(updated);
      return updated;
    } catch (err) {
      console.warn("Could not fetch user from server:", err);
      return saved;
    }
  }

  // Fetches the user's progress summary (lessons, quizzes, XP, streak).
  async function fetchProgress(email) {
    if (!email) { state.progress = null; return null; }

    try {
      const endpoint = ENDPOINTS.courses?.userProgressSummary || "/user-progress-summary";
      const data = await apiGet(endpoint, { email });

      if (data && (data.lessons_done !== undefined || data.quizzes_done !== undefined || data.total_xp !== undefined)) {
        state.progress = {
          email,
          lessons: Number(data.lessons_done || 0),
          quizzes: Number(data.quizzes_done || 0),
          challenges: Number(data.challenges_done || 0),
          coursesDone: Number(data.courses_done || 0),
          coursesActive: Number(data.in_progress || 0),
          coursesTotal: Number(data.total_courses || 0),
          totalXp: Number(data.total_xp || 0),
          level: Number(data.level || 1),
          streak: Number(data.login_streak || data.streak || 0)
        };
        return state.progress;
      }

      state.progress = null;
      return null;
    } catch (err) {
      console.warn("Could not fetch progress:", err);
      state.progress = null;
      return null;
    }
  }

  // Fetches the user's achievements (unlocked and locked).
  async function fetchAchievements(email) {
    const empty = { all: [], unlocked: [], locked: [] };
    if (!email) { state.achievements = empty; return empty; }

    try {
      const endpoint = ENDPOINTS.achievements?.list || "/api/user/achievements";
      const data = await apiGet(endpoint, { user_email: email });

      if (data && (data.unlocked || data.locked || data.achievements)) {
        const unlocked = (data.unlocked || []).map(a => ({ ...a, unlocked: true }));
        const locked = (data.locked || []).map(a => ({ ...a, unlocked: false }));
        state.achievements = { all: [...unlocked, ...locked], unlocked, locked };
      } else {
        state.achievements = empty;
      }
      return state.achievements;
    } catch (err) {
      console.warn("Could not fetch achievements:", err);
      state.achievements = empty;
      return empty;
    }
  }

  // Fetches challenges of a given type (daily or weekly).
  async function fetchChallengesByType(email, type) {
    const endpoint = ENDPOINTS.challenges?.list || "/api/user/challenges";
    try {
      const data = await apiGet(endpoint, { type, user_email: email });
      return Array.isArray(data) ? data : (data.challenges || []);
    } catch (err) {
      console.warn(`Could not fetch ${type} challenges:`, err);
      return [];
    }
  }

  // Fetches daily and weekly challenges, stores them, and renders both lists.
  async function fetchChallenges(email) {
    if (!email) {
      renderChallengeList(document.getElementById("dailyTasks"), []);
      renderChallengeList(document.getElementById("weeklyTasks"), []);
      return;
    }

    try {
      const [daily, weekly] = await Promise.all([
        fetchChallengesByType(email, "daily"),
        fetchChallengesByType(email, "weekly")
      ]);
      state.challenges.daily = daily;
      state.challenges.weekly = weekly;
      renderChallengeList(document.getElementById("dailyTasks"), daily);
      renderChallengeList(document.getElementById("weeklyTasks"), weekly);
    } catch (err) {
      console.warn("Error loading challenges:", err);
    }
  }

  // Fetches the courses this user has started.
  // COURSE_CONTENT is the source of truth for all static data (title, XP, lesson counts).
  // The API is only used to overlay progress_pct and status per course.
  async function fetchCourses(email) {
    if (!email) { state.courses = []; return []; }

    // Build the base list entirely from COURSE_CONTENT — always accurate.
    const allCourses = Object.entries(window.COURSE_CONTENT || {}).map(([id, c]) => ({
      id: String(id),
      title: c.title || "Course",
      difficulty: c.difficulty || "novice",
      category: c.category || "Core",
      xp_reward: c.xpReward || 0,
      total_lessons: (c.units || []).reduce((s, u) => s + (u.lessons?.length || 0), 0),
      progress_pct: 0,
      status: "not-started"
    }));

    // Overlay progress_pct and status from the API — nothing else.
    try {
      const endpoint = ENDPOINTS.courses?.userCourses || "/user-courses";
      const data = await apiGet(endpoint, { email });
      const list = Array.isArray(data) ? data : (Array.isArray(data.courses) ? data.courses : []);
      const progressMap = new Map(list.map(c => [String(c.id || c.course_id || ""), c]));
      allCourses.forEach(c => {
        const p = progressMap.get(c.id);
        if (p) {
          c.progress_pct = Math.min(100, Math.max(0, Number(p.progress_pct || 0)));
          c.status = p.status || "not-started";
        }
      });
    } catch (err) {
      console.warn("Could not fetch course progress:", err);
    }

    // Also check localStorage for courses the user has visited,
    // so cards still show when the API is cold-starting or returns nothing.
    const startedKey = `netology_started_courses:${email}`;
    let localStarted = new Set();
    try {
      const raw = localStorage.getItem(startedKey);
      const list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) list.forEach(e => e?.id && localStarted.add(String(e.id)));
    } catch {}

    // Dashboard only shows courses the user has actually started.
    state.courses = allCourses.filter(c => c.progress_pct > 0 || localStarted.has(c.id));
    return state.courses;
  }

  // Records today's login for streak tracking.
  function recordLogin(email) {
    if (typeof window.recordLoginDay === "function") window.recordLoginDay(email);
  }

  // Points logo links to dashboard (logged in) or home page (not).
  function setupLogos() {
    const page = getSavedUser()?.email ? "dashboard.html" : "index.html";
    const top = document.getElementById("topBrand");
    const side = document.getElementById("sideBrand");
    if (top) top.setAttribute("href", page);
    if (side) side.setAttribute("href", page);
  }

  // Wires up the sidebar open, close, and backdrop buttons.
  function setupSidebar() {
    const openBtn = document.getElementById("openSidebarBtn");
    const closeBtn = document.getElementById("closeSidebarBtn");
    const sidebar = document.getElementById("slideSidebar");
    const backdrop = document.getElementById("sideBackdrop");
    if (!sidebar) return;

    const open = () => {
      if (!backdrop) return;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
    };

    const close = () => {
      if (!backdrop) return;
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
    };

    if (openBtn) openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sidebar.classList.contains("is-open")) close();
    });
  }

  // Wires up the user dropdown toggle.
  function setupDropdown() {
    const btn = document.getElementById("userBtn");
    const menu = document.getElementById("userDropdown");
    if (!btn || !menu) return;

    const closeMenu = () => {
      menu.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    };

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !btn.contains(e.target)) closeMenu();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  // Wires up both logout buttons.
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

  // Wires up the daily/weekly challenge toggle buttons.
  function setupChallengeToggle() {
    const buttons = Array.from(document.querySelectorAll(".dash-toggle-btn[data-panel]"));
    if (!buttons.length) return;

    buttons.forEach((clicked) => {
      clicked.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("is-active"));
        clicked.classList.add("is-active");

        const target = clicked.getAttribute("data-panel");

        buttons.forEach((b) => {
          const panelId = b.getAttribute("data-panel");
          if (!panelId) return;
          const panel = document.getElementById(panelId);
          if (!panel) return;

          if (panelId === target) {
            panel.hidden = false;
            requestAnimationFrame(() => panel.classList.add("is-active"));
          } else {
            panel.classList.remove("is-active");
            setTimeout(() => { panel.hidden = true; }, 200);
          }
        });
      });
    });
  }

  // Sets up the stats carousel that auto-advances every 8 seconds.
  function setupCarousel() {
    const track = document.getElementById("statsTrack");
    const indicators = document.getElementById("statsIndicators");
    if (!track || !indicators) return;

    const slides = Array.from(track.querySelectorAll(".net-carousel-slide"));
    const dots = Array.from(indicators.querySelectorAll(".net-indicator"));
    if (!slides.length || dots.length !== slides.length) return;

    let current = 0;

    const goTo = (i) => {
      current = (i + slides.length) % slides.length;
      slides.forEach((s, j) => s.classList.toggle("is-active", j === current));
      dots.forEach((d, j) => d.classList.toggle("active", j === current));
    };

    const restartAuto = () => {
      if (state.carouselTimer) clearInterval(state.carouselTimer);
      state.carouselTimer = setInterval(() => goTo(current + 1), 8000);
    };

    dots.forEach((dot, i) => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        goTo(i);
        restartAuto();
      });
    });

    goTo(0);
    restartAuto();
  }

  // Rotates networking tips in the tip box every 10 seconds.
  function startTips() {
    const box = document.getElementById("dailyTip");
    if (!box) return;

    let i = 0;
    box.textContent = TIPS[0];
    i = 1;

    setInterval(() => {
      box.style.transition = "opacity 0.6s ease";
      box.style.opacity = "0";
      setTimeout(() => {
        box.textContent = TIPS[i % TIPS.length];
        i++;
        box.style.opacity = "1";
      }, 600);
    }, 10000);
  }

  // Activates Bootstrap tooltips on the page.
  function setupTooltips(scope) {
    if (!window.bootstrap?.Tooltip) return;
    (scope || document).querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
      const existing = window.bootstrap.Tooltip.getInstance(el);
      if (existing) existing.dispose();
      new window.bootstrap.Tooltip(el);
    });
  }

  // Sets up onboarding for first-time users.
  function setupOnboarding(user) {
    if (!user?.email || !user?.is_first_login) return;

    const email = String(user.email).trim().toLowerCase();
    const prev = String(localStorage.getItem("netology_onboarding_user") || "").trim().toLowerCase();

    const done = Boolean(user.onboarding_completed)
      || localStorage.getItem(`netology_onboarding_completed_${email}`) === "true"
      || localStorage.getItem(`netology_onboarding_skipped_${email}`) === "true";
    if (done) return;

    if (!prev || prev !== email) {
      localStorage.setItem("netology_onboarding_user", email);
      localStorage.setItem("netology_onboarding_stage", "dashboard");
    }

    try { sessionStorage.setItem("netology_onboarding_session", "true"); } catch {}
  }

  // Starts the onboarding tour if available.
  function startTour(user) {
    if (!user?.email) return;
    if (typeof window.maybeStartOnboardingTour === "function") {
      window.maybeStartOnboardingTour("dashboard", user.email);
    }
  }

  // Listens for tab focus, visibility, and storage changes to auto-refresh.
  function setupRefreshListeners() {
    if (state.listenersAttached) return;
    state.listenersAttached = true;

    const schedule = () => {
      if (document.hidden) return;
      if (state.refreshTimer) clearTimeout(state.refreshTimer);
      state.refreshTimer = setTimeout(() => refreshAll(), 180);
    };

    window.addEventListener("focus", schedule);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
    window.addEventListener("storage", (e) => {
      if (e.key === "user" || (e.key && e.key.startsWith("netology_"))) schedule();
    });
  }

  // Fills in the user's name, email, rank, and level in sidebar and dropdown.
  function renderUserInfo(user) {
    if (!user) return;
    const name = user.first_name
      ? `${user.first_name} ${user.last_name || ""}`.trim()
      : (user.username || "");
    const level = Number(user.numeric_level || user.level || 1);

    setText("sideUserName", name);
    setText("ddName", name);
    setText("sideUserEmail", user.email || "");
    setText("ddEmail", user.email || "");
    setText("ddRank", user.rank || "");
    setText("sideLevelBadge", `Lv ${level}`);
    setText("ddLevel", level);
  }

  // Updates the stat numbers in the carousel slides.
  function renderStats() {
    const p = state.progress;
    if (!p) return;
    setText("heroActive", p.coursesActive || 0);
    setText("statLessons", p.lessons || 0);
    setText("statQuizzes", p.quizzes || 0);
    setText("statChallenges", p.challenges || 0);
  }

  // Updates the rank card, level label, and redraws the XP gauge.
  function renderRank() {
    const user = getSavedUser();
    if (!user) return;

    const level = Number(user.numeric_level || user.level || 1);
    const tier = level >= 5 ? "Advanced" : level >= 3 ? "Intermediate" : "Novice";

    setText("heroRank", level);
    setText("heroRankDifficulty", tier);
    renderXpGauge(user, level);
  }

  // Draws the semicircle XP progress gauge.
  function renderXpGauge(user, level) {
    const container = document.getElementById("heroXP");
    if (!container) return;

    const rawXp = Number(user.xp || 0);
    const nextXp = Number(user.next_level_xp || user.xp_for_next_level || 100);
    const xpInto = Number(user.xp_into_level || 0);
    const startXp = window.NetologyXP?.totalXpForLevel
      ? window.NetologyXP.totalXpForLevel(level)
      : (100 * (level - 1) * level) / 2;
    const currentXp = xpInto > 0 ? xpInto : Math.max(0, rawXp - startXp);
    const pct = Math.min(100, Math.max(0, nextXp > 0 ? (currentXp / nextXp) * 100 : 0));

    const r = 54, cx = 100, cy = 90;
    const arc = Math.PI * r;
    const offset = arc * (1 - pct / 100);

    // Helper to create an SVG element with attributes.
    const svgEl = (tag, attrs) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      return el;
    };

    const svg = svgEl("svg", { viewBox: "0 0 200 100", width: "200", height: "100" });
    svg.style.cssText = "max-width: 200px; display: block;";

    // Background arc.
    svg.appendChild(svgEl("circle", {
      cx, cy, r, fill: "none", stroke: "#e9ecef", "stroke-width": "10",
      "stroke-dasharray": `${arc} ${arc}`, "stroke-dashoffset": "0",
      "stroke-linecap": "round", transform: `rotate(180 ${cx} ${cy})`
    }));

    // Progress arc.
    svg.appendChild(svgEl("circle", {
      cx, cy, r, fill: "none", stroke: "#0d9488", "stroke-width": "10",
      "stroke-dasharray": `${arc} ${arc}`, "stroke-dashoffset": offset,
      "stroke-linecap": "round", transform: `rotate(180 ${cx} ${cy})`
    }));

    // Level number.
    const lvl = svgEl("text", {
      x: cx, y: "72", "text-anchor": "middle", "font-size": "30", "font-weight": "700", fill: "#212529"
    });
    lvl.textContent = level;
    svg.appendChild(lvl);

    // XP label.
    const label = svgEl("text", {
      x: cx, y: "90", "text-anchor": "middle", "font-size": "10", fill: "#6c757d"
    });
    label.textContent = `${currentXp} / ${nextXp} XP`;
    svg.appendChild(label);

    container.innerHTML = "";
    container.classList.remove("visually-hidden");
    container.appendChild(svg);
  }

  // Formats a date as YYYY-MM-DD for login log lookups.
  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Counts consecutive login days going backwards from today.
  function countStreak(email) {
    if (!email || typeof window.getLoginLog !== "function") return 0;
    try {
      const log = window.getLoginLog(email);
      if (!log?.length) return 0;

      let count = 0;
      let day = new Date();
      day.setHours(0, 0, 0, 0);

      while (log.includes(dateKey(day))) {
        count++;
        day.setDate(day.getDate() - 1);
      }
      return count;
    } catch (err) {
      console.warn("Could not count login streak:", err);
      return state.progress?.streak || 0;
    }
  }

  // Draws the 7-day login streak calendar.
  function renderStreak() {
    const user = getSavedUser();
    if (!user) return;

    const calendar = document.getElementById("streakCalendar");
    if (!calendar) return;

    const labels = ["S", "M", "T", "W", "T", "F", "S"];
    const today = new Date();
    calendar.innerHTML = "";

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const el = document.createElement("div");
      el.className = "streak-day";
      el.title = date.toLocaleDateString();
      el.textContent = labels[date.getDay()];
      calendar.appendChild(el);
    }

    setText("heroStreak", countStreak(user.email));
  }

  // Renders the "continue learning" course cards.
  function renderCourses() {
    const box = document.getElementById("continueBox");
    if (!box) return;

    const courses = (state.courses || []).filter(c => {
      const s = (c.status || "").toLowerCase();
      return s !== "completed" && (s === "in-progress" || Number(c.progress_pct || 0) > 0);
    });

    if (!courses.length) {
      box.className = "small text-muted text-center p-3";
      box.textContent = "No courses in progress. Start a new course!";
      return;
    }

    box.className = "continue-learning-list";
    box.innerHTML = "";

    const diffIcon = (d) => {
      const l = (d || "").toLowerCase();
      if (l === "advanced") return '<i class="bi bi-diamond-fill"></i>';
      if (l === "intermediate") return '<i class="bi bi-hexagon-fill"></i>';
      return '<i class="bi bi-circle-fill"></i>';
    };

    const normDiff = (d) => {
      const l = (d || "novice").toLowerCase();
      return ["novice", "intermediate", "advanced"].includes(l) ? l : "novice";
    };

    courses.forEach(course => {
      const pct = Math.min(100, Math.max(0, Number(course.progress_pct || 0)));
      const id = String(course.id || course.course_id || "");
      const href = id ? `course.html?id=${encodeURIComponent(id)}` : "courses.html";
      const diff = normDiff(course.difficulty);
      const title = course.title || course.name || "Course";
      const cat = course.category || "";

      // always read lesson count and XP from COURSE_CONTENT (source of truth)
      const staticCourse = window.COURSE_CONTENT?.[id] || {};
      const lessons = (staticCourse.units || []).reduce((s, u) => s + (u.lessons?.length || 0), 0)
        || course.total_lessons || 0;
      const xp = staticCourse.xpReward || course.xp_reward || 0;

      const card = document.createElement("div");
      card.className = "net-course-card net-course-card--sm";
      card.dataset.difficulty = diff;
      card.style.cursor = "pointer";
      card.innerHTML = `
        <div class="net-course-header">
          <div class="net-course-icon">${diffIcon(diff)}</div>
          <div class="net-course-meta">
            ${cat ? `<div class="net-course-category">${cat}</div>` : ""}
            <div class="net-course-title">${title}</div>
          </div>
        </div>
        <div class="net-course-stats-row">
          ${lessons ? `<span class="net-course-stat-pill"><i class="bi bi-file-text"></i>${lessons} lessons</span>` : ""}
          ${xp ? `<span class="net-course-stat-pill"><i class="bi bi-lightning-charge-fill"></i>${xp} XP</span>` : ""}
        </div>
        <div class="net-course-footer">
          <div class="net-course-progress-block">
            <div class="net-course-progress-meta">
              <span class="net-course-progress-label">${pct}% Complete</span>
            </div>
            <div class="net-course-bar net-course-bar--wide">
              <div class="net-course-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
          <button class="net-course-cta btn-continue"><i class="bi bi-play-fill"></i> Continue</button>
        </div>`;

      card.addEventListener("click", () => { window.location.href = href; });
      card.querySelector(".net-course-cta").addEventListener("click", (e) => {
        e.stopPropagation();
        window.location.href = href;
      });
      box.appendChild(card);
    });
  }

  // Renders the achievement badges.
  function renderAchievements() {
    const container = document.getElementById("achieveScroller");
    if (!container) return;

    const list = state.achievements;
    if (!list?.all?.length) {
      container.textContent = "No achievements yet";
      container.classList.add("text-muted", "small");
      return;
    }

    container.innerHTML = "";
    container.classList.remove("text-muted", "small");

    [...(list.unlocked || []), ...(list.locked || [])].forEach(ach => {
      const badge = document.createElement("div");
      badge.className = `achievement-badge ${ach.unlocked ? "unlocked" : "locked"}`;
      badge.setAttribute("data-bs-toggle", "tooltip");
      badge.setAttribute("data-bs-placement", "top");
      badge.title = `${ach.name}: ${ach.description}${ach.xp_reward ? ` (+${ach.xp_reward} XP)` : ""}`;

      const icon = document.createElement("div");
      icon.className = "badge-icon";
      icon.innerHTML = `<i class="bi ${ach.icon || "bi-star"}"></i>`;
      badge.appendChild(icon);

      const name = document.createElement("div");
      name.className = "badge-name";
      name.textContent = ach.name;
      badge.appendChild(name);

      container.appendChild(badge);
    });

    container.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
      new bootstrap.Tooltip(el);
    });
  }

  // Renders a list of challenges into a container.
  function renderChallengeList(container, challenges) {
    if (!container) return;
    if (!challenges?.length) {
      container.className = "dash-tasklist small text-muted text-center p-2";
      container.textContent = "No challenges available";
      return;
    }

    container.className = "dash-tasklist";
    container.innerHTML = "";

    challenges.forEach(ch => {
      const done = ch.completed === true || ch.status === "completed";
      const xp = ch.xp_reward || 0;

      const row = document.createElement("div");
      row.className = "dash-challenge" + (done ? " is-done" : "");

      const top = document.createElement("div");
      top.className = "dash-challenge-top";
      top.innerHTML = `
        <span class="dash-challenge-name">${ch.title || ch.name || "Challenge"}</span>
        <span class="dash-challenge-xp">${done ? "✓ Done" : (xp ? `+${xp} XP` : "")}</span>`;
      row.appendChild(top);

      if (ch.description) {
        const desc = document.createElement("div");
        desc.className = "dash-challenge-desc";
        desc.textContent = ch.description;
        row.appendChild(desc);
      }

      container.appendChild(row);
    });
  }

  // Fetches all data and redraws everything.
  async function refreshAll() {
    const user = await fetchUser();

    if (user?.email) {
      try {
        await Promise.all([
          fetchProgress(user.email),
          fetchAchievements(user.email),
          fetchChallenges(user.email),
          fetchCourses(user.email)
        ]);
      } catch (err) {
        console.warn("Error during refresh:", err);
      }
    }

    renderUserInfo(user);
    renderStats();
    renderRank();
    renderStreak();
    renderAchievements();
    renderCourses();
  }

  // Main entry point — sets up the page then fetches data.
  async function init() {
    setupLogos();
    setupSidebar();
    setupDropdown();
    setupLogout();
    setupChallengeToggle();
    setupCarousel();
    setupTooltips();
    startTips();

    // Show cached data immediately so page isn't blank while we fetch.
    const cached = getSavedUser();
    if (cached) {
      renderUserInfo(cached);
      renderStats();
      renderRank();
      renderStreak();
      renderCourses();
    }

    const user = await fetchUser();

    if (user?.email) {
      recordLogin(user.email);
      try {
        await Promise.all([
          fetchProgress(user.email),
          fetchAchievements(user.email),
          fetchChallenges(user.email),
          fetchCourses(user.email)
        ]);
      } catch (err) {
        console.warn("Error during data fetch:", err);
      }
    } else {
      state.progress = null;
      state.achievements = { all: [], unlocked: [], locked: [] };
      state.challenges = { daily: [], weekly: [] };
      state.courses = [];
    }

    renderUserInfo(user);
    renderStats();
    renderRank();
    renderStreak();
    renderCourses();
    renderAchievements();

    if (user?.email) {
      setupOnboarding(user);
      setTimeout(() => startTour(user), 600);
    }

    setupRefreshListeners();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
