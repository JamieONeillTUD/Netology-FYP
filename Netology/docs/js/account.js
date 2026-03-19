// account.js — account page: profile, preferences, security, and activity heatmap

(() => {
  "use strict";

  const ENDPOINTS = window.ENDPOINTS || {};
  const XP = window.NetologyXP || {};
  const TABS = ["profile", "preferences", "security", "activity"];
  const HEATMAP_DAYS = 30;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPage, { once: true });
  } else {
    startPage();
  }

  // sets text content on an element by id (does nothing if the element doesn't exist)
  function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(text ?? "");
  }

  // sets the value attribute on an input/field by id
  function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = String(value ?? "");
  }

  // sets the css width on an element by id (used for progress bars)
  function setWidth(id, percent) {
    const element = document.getElementById(id);
    if (element) element.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
  }

  // reads user data from localStorage
  function getSavedUser() {
    try {
      return JSON.parse(localStorage.getItem("netology_user") || "null");
    } catch {
      return null;
    }
  }

  // fetches JSON from the API using the correct base URL
  async function apiFetch(path, params) {
    const base = String(window.API_BASE || "").trim().replace(/\/$/, "");
    const url = new URL(base ? `${base}${path}` : path, window.location.origin);
    for (const [key, value] of Object.entries(params || {})) {
      url.searchParams.set(key, String(value));
    }
    const response = await fetch(url.toString());
    return response.json();
  }

  // ── page setup ─────────────────────────────────────────────────────────────

  async function startPage() {
    let user = getSavedUser();
    if (!user) {
      try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch { user = null; }
    }

    if (!user?.email) {
      window.location.href = "login.html";
      return;
    }

    setupSidebar();
    setupUserDropdown();
    setupLogout();
    fillIdentity(user);
    setupTabs();
    setupAppearance();
    setupRestartOnboarding(user);

    await Promise.all([loadProfile(user), loadStats(user), loadActivity(user)]);

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    if (typeof window.maybeStartOnboardingTour === "function") {
      window.maybeStartOnboardingTour("account", user.email);
    }
  }

  // ── sidebar, dropdown, logout ──────────────────────────────────────────────

  function setupSidebar() {
    const openButton = document.getElementById("openSidebarBtn");
    const closeButton = document.getElementById("closeSidebarBtn");
    const sidebar = document.getElementById("slideSidebar");
    const backdrop = document.getElementById("sideBackdrop");

    const openSidebar = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
      sidebar.setAttribute("aria-hidden", "false");
      backdrop.setAttribute("aria-hidden", "false");
    };

    const closeSidebar = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
      sidebar.setAttribute("aria-hidden", "true");
      backdrop.setAttribute("aria-hidden", "true");
    };

    openButton?.addEventListener("click", openSidebar);
    closeButton?.addEventListener("click", closeSidebar);
    backdrop?.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sidebar?.classList.contains("is-open")) closeSidebar();
    });
  }

  function setupUserDropdown() {
    const button = document.getElementById("userBtn");
    const dropdown = document.getElementById("userDropdown");
    if (!button || !dropdown) return;

    const closeDropdown = () => {
      dropdown.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    };

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = dropdown.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (event) => {
      if (dropdown.contains(event.target) || button.contains(event.target)) return;
      closeDropdown();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDropdown();
    });
  }

  function setupLogout() {
    const logout = () => {
      localStorage.removeItem("netology_user");
      localStorage.removeItem("user");
      localStorage.removeItem("netology_token");
      window.location.href = "index.html";
    };

    document.getElementById("topLogoutBtn")?.addEventListener("click", logout);
    document.getElementById("sideLogoutBtn")?.addEventListener("click", logout);
  }

  // ── fill user identity into navbar, sidebar, and dropdown ──────────────────

  function fillIdentity(user) {
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "Student";
    const email = String(user?.email || "");
    const initial = (fullName.charAt(0) || "S").toUpperCase();

    const level = typeof XP.levelFromTotalXp === "function"
      ? XP.levelFromTotalXp(Number(user?.xp || 0))
      : 1;
    const rank = typeof XP.rankForLevel === "function"
      ? XP.rankForLevel(level)
      : "Novice";

    setText("topAvatar", initial);
    setText("ddAvatar", initial);
    setText("ddName", fullName);
    setText("ddEmail", email);
    setText("ddLevel", `Level ${level}`);
    setText("ddRank", rank);
    setText("sideAvatar", initial);
    setText("sideUserName", fullName);
    setText("sideUserEmail", email);
    setText("sideLevelBadge", `Lv ${level}`);
    setText("profileAvatar", initial);
  }

  // ── tabs ───────────────────────────────────────────────────────────────────

  function setupTabs() {
    const buttons = Array.from(document.querySelectorAll("[role='tab']"));
    const panels = Array.from(document.querySelectorAll(".account-tab"));

    const showTab = (tabName, updateHash = true) => {
      if (!TABS.includes(tabName)) return;

      buttons.forEach((button) => {
        const active = button.dataset.tab === tabName;
        button.classList.toggle("btn-teal", active);
        button.classList.toggle("btn-outline-teal", !active);
        button.setAttribute("aria-selected", String(active));
      });

      panels.forEach((panel) => {
        panel.classList.toggle("d-none", panel.dataset.tab !== tabName);
      });

      if (updateHash) history.replaceState(null, "", `#${tabName}`);
    };

    buttons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        showTab(button.dataset.tab || "profile");
      });
    });

    const initialHash = window.location.hash.replace("#", "");
    showTab(TABS.includes(initialHash) ? initialHash : "profile", false);

    window.addEventListener("hashchange", () => {
      const hash = window.location.hash.replace("#", "");
      if (TABS.includes(hash)) showTab(hash, false);
    });
  }

  // ── appearance (theme + dyslexic font) ────────────────────────────────────

  function setupAppearance() {
    const themeInputs = Array.from(document.querySelectorAll('input[name="themeMode"]'));
    const dyslexicToggle = document.getElementById("dyslexicToggle");

    const applyTheme = (themeValue) => {
      const raw = String(themeValue || "").trim().toLowerCase();
      const theme = raw === "dark" || raw === "system" ? raw : "light";

      if (window.NetologyTheme?.setTheme) {
        window.NetologyTheme.setTheme(theme);
      } else {
        localStorage.setItem("netology_theme", theme);
        const resolved = theme === "system"
          ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
          : theme;
        document.body?.setAttribute("data-theme", resolved);
      }

      themeInputs.forEach((input) => { input.checked = input.value === theme; });
    };

    applyTheme(localStorage.getItem("netology_theme") || "light");

    themeInputs.forEach((input) => {
      input.addEventListener("change", () => { if (input.checked) applyTheme(input.value); });
    });

    if (dyslexicToggle) {
      dyslexicToggle.checked = localStorage.getItem("netology_dyslexic") === "true";

      dyslexicToggle.addEventListener("change", (event) => {
        const enabled = Boolean(event.target.checked);

        if (window.NetologyTheme?.setDyslexic) {
          window.NetologyTheme.setDyslexic(enabled);
          return;
        }

        localStorage.setItem("netology_dyslexic", enabled ? "true" : "false");
        document.body?.classList.toggle("net-dyslexic", enabled);
      });
    }
  }

  // ── restart onboarding button ─────────────────────────────────────────────

  function setupRestartOnboarding(user) {
    const button = document.getElementById("restartOnboardingBtn");
    const email = String(user?.email || "").trim().toLowerCase();
    if (!button || !email) return;

    button.addEventListener("click", () => {
      localStorage.removeItem(`netology_onboarding_completed_${email}`);
      localStorage.removeItem(`netology_onboarding_skipped_${email}`);
      localStorage.setItem("netology_onboarding_user", email);
      localStorage.setItem("netology_onboarding_stage", "dashboard");

      try {
        sessionStorage.setItem("netology_onboarding_session", "true");
        sessionStorage.removeItem("netology_welcome_shown");
      } catch { /* ignore storage errors */ }

      window.location.href = "dashboard.html";
    });
  }

  // ── load profile data ─────────────────────────────────────────────────────

  async function loadProfile(user) {
    try {
      const path = ENDPOINTS.auth?.userInfo || "/user-info";
      const userData = await apiFetch(path, { email: user.email });

      const totalXp = Math.max(0, Number(userData?.xp || 0));
      let level = 1;
      let rank = "Novice";
      let xpIntoLevel = 0;
      let nextLevelXp = 100;
      let progressPercent = 0;

      if (typeof XP.resolveUserProgress === "function") {
        const resolved = XP.resolveUserProgress(userData || {});
        level = Number(resolved?.level || 1);
        rank = String(userData?.rank || resolved?.rank || "Novice");
        xpIntoLevel = Number(resolved?.xpIntoLevel || 0);
        nextLevelXp = Number(resolved?.nextLevelXp || 100);
        progressPercent = Math.max(0, Math.min(100, Number(resolved?.progressPercent || 0)));
      } else {
        level = Number.isFinite(Number(userData?.numeric_level))
          ? Number(userData.numeric_level)
          : (typeof XP.levelFromTotalXp === "function" ? XP.levelFromTotalXp(totalXp) : 1);

        rank = String(userData?.rank || (typeof XP.rankForLevel === "function" ? XP.rankForLevel(level) : "Novice"));

        xpIntoLevel = Number.isFinite(Number(userData?.xp_into_level))
          ? Number(userData.xp_into_level)
          : Math.max(0, totalXp - (typeof XP.totalXpForLevel === "function" ? XP.totalXpForLevel(level) : 0));

        nextLevelXp = Number.isFinite(Number(userData?.next_level_xp))
          ? Number(userData.next_level_xp)
          : (typeof XP.xpForNextLevel === "function" ? XP.xpForNextLevel(level) : 100);

        progressPercent = Math.round((xpIntoLevel / Math.max(nextLevelXp, 1)) * 100);
      }

      const displayName = [userData?.first_name, userData?.last_name].filter(Boolean).join(" ") || userData?.username || "Student";

      let joinedDate = "Recently";
      if (userData?.created_at) {
        const joined = new Date(userData.created_at);
        if (!Number.isNaN(joined.getTime())) {
          joinedDate = joined.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        }
      }

      // fill all the profile fields
      setText("profileName", displayName);
      setText("profileEmail", user.email);
      setText("profileSkillLine", `Level ${level} - ${rank}`);
      setText("currentRankInput", rank);
      setText("rankBadge", rank);
      setText("levelBadge", `Level ${level}`);
      setText("joinedDate", joinedDate);
      setText("rankDisplayLarge", level);
      setText("rankNameDisplay", rank);
      setText("levelProgressText", `${xpIntoLevel} / ${nextLevelXp} XP`);
      setText("headerXpProgressText", `${xpIntoLevel} / ${nextLevelXp} XP to next level`);
      setText("totalXpDisplay", totalXp.toLocaleString());
      setText("totalXpStat", totalXp.toLocaleString());

      setValue("fullNameInput", displayName);
      setValue("emailInput", user.email);
      setValue("currentLevelInput", level);
      setValue("memberSinceInput", joinedDate);

      setWidth("levelProgressBar", progressPercent);
      setWidth("headerXpProgressBar", progressPercent);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }

  // ── load stats (courses, achievements, streak) ────────────────────────────

  async function loadStats(user) {
    const email = user?.email;
    if (!email) return;

    // fetch all three stat sources at once
    const [coursesData, achievementsData, streakData] = await Promise.all([
      apiFetch(ENDPOINTS.courses?.userCourses || "/user-courses", { email }).catch(() => null),
      apiFetch(ENDPOINTS.achievements?.list || "/api/user/achievements", { user_email: email }).catch(() => null),
      apiFetch(ENDPOINTS.progress?.userStreaks || "/api/user/streaks", { user_email: email }).catch(() => null)
    ]);

    // count completed courses
    const courses = Array.isArray(coursesData?.courses) ? coursesData.courses
      : Array.isArray(coursesData) ? coursesData : [];

    const completedCount = courses.filter((course) => {
      const status = String(course?.status || "").toLowerCase();
      const progress = Number(course?.progress_pct || 0);
      return status === "completed" || progress >= 100;
    }).length;

    // count unlocked achievements
    const unlocked = Array.isArray(achievementsData?.unlocked) ? achievementsData.unlocked
      : Array.isArray(achievementsData) ? achievementsData : [];

    // read streak days
    const streakDays = Number(streakData?.current_streak || 0);

    // fill the stat numbers
    setText("coursesCompletedDisplay", completedCount);
    setText("coursesCompletedStat", completedCount);
    setText("achievementsDisplay", unlocked.length);
    setText("achievementsStat", unlocked.length);
    setText("streakDisplay", `${streakDays} days`);
    setText("streakStat", streakDays);

    // render recent badge icons
    renderRecentBadges(unlocked);
  }

  // shows up to 4 earned badges (or lock placeholders if none)
  function renderRecentBadges(unlocked) {
    const container = document.getElementById("recentBadgesSmall");
    if (!container) return;

    container.innerHTML = "";

    const recent = Array.isArray(unlocked) ? unlocked.slice(0, 4) : [];

    if (!recent.length) {
      for (let i = 0; i < 4; i++) {
        const placeholder = document.createElement("span");
        placeholder.className = "net-badge-placeholder";
        placeholder.setAttribute("aria-label", "Locked badge");

        const lockIcon = document.createElement("i");
        lockIcon.className = "bi bi-lock-fill";
        placeholder.appendChild(lockIcon);

        container.appendChild(placeholder);
      }
      return;
    }

    recent.forEach((badge) => {
      const badgeElement = document.createElement("span");
      badgeElement.className = "net-earned-badge";
      badgeElement.dataset.badgeId = String(badge?.id || "");
      badgeElement.title = String(badge?.name || "Badge");

      const rawIcon = String(badge?.icon || "").trim();
      const iconElement = document.createElement("i");

      if (rawIcon.startsWith("bi-")) {
        iconElement.className = `bi ${rawIcon}`;
      } else if (rawIcon) {
        badgeElement.textContent = rawIcon;
        container.appendChild(badgeElement);
        return;
      } else {
        iconElement.className = "bi bi-patch-check-fill";
      }

      iconElement.setAttribute("aria-hidden", "true");
      badgeElement.appendChild(iconElement);
      container.appendChild(badgeElement);
    });
  }

  // ── load activity heatmap ─────────────────────────────────────────────────

  async function loadActivity(user) {
    const email = String(user?.email || "").trim().toLowerCase();
    if (!email) return;

    const totalsByDate = {};

    // adds a count to a given date key
    const addToDate = (dateKey, count) => {
      if (!dateKey) return;
      totalsByDate[dateKey] = (totalsByDate[dateKey] || 0) + Math.max(0, Number(count) || 0);
    };

    // turns any date-like value into a YYYY-MM-DD string
    const toDateKey = (raw) => {
      const text = String(raw || "").trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
      const parsed = new Date(text);
      return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
    };

    // 1. server activity data
    try {
      const path = ENDPOINTS.progress?.userActivity || "/api/user/activity";
      const data = await apiFetch(path, { user_email: email, range: HEATMAP_DAYS });

      const serverActivity = Array.isArray(data?.activity) ? data.activity
        : Array.isArray(data) ? data : [];

      serverActivity.forEach((entry) => {
        const dateKey = toDateKey(entry?.date || entry?.activity_date);
        const explicitCount = Number(entry?.count ?? entry?.activity_count ?? 0);

        if (explicitCount > 0) {
          addToDate(dateKey, explicitCount);
          return;
        }

        const lessons = Number(entry?.lessons ?? entry?.lessons_completed ?? 0);
        const quizzes = Number(entry?.quizzes ?? entry?.quizzes_completed ?? 0);
        const challenges = Number(entry?.challenges ?? entry?.challenges_completed ?? 0);
        const logins = Number(entry?.logins ?? entry?.login_count ?? 0);
        const xp = Number(entry?.xp ?? entry?.xp_earned ?? 0);
        const xpPoints = xp > 0 ? Math.max(1, Math.round(xp / 25)) : 0;

        addToDate(dateKey, lessons + quizzes + challenges + logins + xpPoints);
      });
    } catch (error) {
      console.error("Error loading activity:", error);
    }

    // 2. local progress log (lesson/quiz completions stored offline)
    try {
      const progressLog = JSON.parse(localStorage.getItem(`netology_progress_log:${email}`) || "[]");
      if (Array.isArray(progressLog)) {
        progressLog.forEach((entry) => {
          let dateKey = toDateKey(entry?.date);
          if (!dateKey && Number.isFinite(Number(entry?.ts))) {
            dateKey = toDateKey(new Date(Number(entry.ts)).toISOString());
          }
          const xpBonus = Number(entry?.xp || 0) > 0 ? 1 : 0;
          addToDate(dateKey, 1 + xpBonus);
        });
      }
    } catch { /* ignore parse errors */ }

    // 3. local login log
    try {
      const loginLog = JSON.parse(localStorage.getItem(`netology_login_log:${email}`) || "[]");
      if (Array.isArray(loginLog)) {
        loginLog.forEach((value) => addToDate(toDateKey(value), 1));
      }
    } catch { /* ignore parse errors */ }

    // draw the heatmap grid
    const heatmapContainer = document.getElementById("activityHeatmapContainer");
    if (heatmapContainer) {
      heatmapContainer.innerHTML = "";
      const today = new Date();

      for (let offset = HEATMAP_DAYS - 1; offset >= 0; offset--) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        const dateKey = date.toISOString().slice(0, 10);
        const total = Number(totalsByDate[dateKey] || 0);

        const intensity = total <= 0 ? 0 : total <= 2 ? 1 : total <= 4 ? 2 : total <= 7 ? 3 : 4;

        const cell = document.createElement("div");
        cell.className = `activity-cell level-${intensity}`;
        cell.title = `${dateKey}: ${total} activities`;
        heatmapContainer.appendChild(cell);
      }
    }

    // show last active date
    const sortedDates = Object.keys(totalsByDate).sort();
    const lastDate = sortedDates[sortedDates.length - 1];
    if (lastDate) {
      setText("lastActiveText", new Date(lastDate).toLocaleDateString());
    }
  }
})();
