/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: account.js
Purpose: Account page UI + profile/stats/activity data.
Notes: Straightforward version with no utility helpers.
---------------------------------------------------------
*/

(() => {
  "use strict";

  const ENDPOINTS = window.ENDPOINTS || {};
  const XP = window.NetologyXP || {};
  const TABS = ["profile", "preferences", "security", "activity"];
  const HEATMAP_DAYS = 90;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPage, { once: true });
  } else {
    startPage();
  }

  async function startPage() {
    let user = null;

    try {
      user = JSON.parse(localStorage.getItem("netology_user") || "null");
    } catch {
      user = null;
    }

    if (!user) {
      try {
        user = JSON.parse(localStorage.getItem("user") || "null");
      } catch {
        user = null;
      }
    }

    if (!user?.email) {
      window.location.href = "login.html";
      return;
    }

    setupSidebar();
    setupUserDropdown();
    setupLogout();
    fillTopAndSideIdentity(user);
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
      if (event.key === "Escape" && sidebar?.classList.contains("is-open")) {
        closeSidebar();
      }
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

  function fillTopAndSideIdentity(user) {
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "Student";
    const email = String(user?.email || "");
    const avatarInitial = (name.charAt(0) || "S").toUpperCase();

    const level = typeof XP.levelFromTotalXp === "function" ? XP.levelFromTotalXp(Number(user?.xp || 0)) : 1;
    const rank = typeof XP.rankForLevel === "function" ? XP.rankForLevel(level) : "Novice";

    const topAvatar = document.getElementById("topAvatar");
    if (topAvatar) topAvatar.textContent = avatarInitial;

    const ddAvatar = document.getElementById("ddAvatar");
    if (ddAvatar) ddAvatar.textContent = avatarInitial;

    const ddName = document.getElementById("ddName");
    if (ddName) ddName.textContent = name;

    const ddEmail = document.getElementById("ddEmail");
    if (ddEmail) ddEmail.textContent = email;

    const ddLevel = document.getElementById("ddLevel");
    if (ddLevel) ddLevel.textContent = `Level ${level}`;

    const ddRank = document.getElementById("ddRank");
    if (ddRank) ddRank.textContent = rank;

    const sideAvatar = document.getElementById("sideAvatar");
    if (sideAvatar) sideAvatar.textContent = avatarInitial;

    const sideUserName = document.getElementById("sideUserName");
    if (sideUserName) sideUserName.textContent = name;

    const sideUserEmail = document.getElementById("sideUserEmail");
    if (sideUserEmail) sideUserEmail.textContent = email;

    const sideLevelBadge = document.getElementById("sideLevelBadge");
    if (sideLevelBadge) sideLevelBadge.textContent = `Lv ${level}`;

    const profileAvatar = document.getElementById("profileAvatar");
    if (profileAvatar) profileAvatar.textContent = avatarInitial;
  }

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

      if (updateHash) {
        history.replaceState(null, "", `#${tabName}`);
      }
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
        const resolved =
          theme === "system"
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            : theme;
        document.body?.setAttribute("data-theme", resolved);
      }

      themeInputs.forEach((input) => {
        input.checked = input.value === theme;
      });
    };

    applyTheme(localStorage.getItem("netology_theme") || "light");

    themeInputs.forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) applyTheme(input.value);
      });
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
      } catch {
        // Ignore storage errors.
      }

      window.location.href = "dashboard.html";
    });
  }

  async function loadProfile(user) {
    try {
      const base = String(window.API_BASE || "").trim().replace(/\/$/, "");
      const path = ENDPOINTS.auth?.userInfo || "/user-info";
      const url = new URL(base ? `${base}${path}` : path, window.location.origin);
      url.searchParams.set("email", String(user.email));

      const response = await fetch(url.toString());
      const userData = await response.json();

      const totalXp = Math.max(0, Number(userData?.xp || 0));
      let level = 1;
      let rank = "Novice";
      let xpIntoLevel = 0;
      let nextLevelXp = 100;
      let progressPercent = 0;

      if (typeof XP.resolveUserProgress === "function") {
        const resolved = XP.resolveUserProgress(userData || {});
        level = Number(resolved?.level || 1);
        rank = String(userData?.rank || resolved?.rank || (typeof XP.rankForLevel === "function" ? XP.rankForLevel(level) : "Novice"));
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

      const profileName = document.getElementById("profileName");
      if (profileName) profileName.textContent = displayName;

      const profileEmail = document.getElementById("profileEmail");
      if (profileEmail) profileEmail.textContent = user.email;

      const fullNameInput = document.getElementById("fullNameInput");
      if (fullNameInput) fullNameInput.value = displayName;

      const emailInput = document.getElementById("emailInput");
      if (emailInput) emailInput.value = user.email;

      const currentLevelInput = document.getElementById("currentLevelInput");
      if (currentLevelInput) currentLevelInput.value = level;

      const currentRankInput = document.getElementById("currentRankInput");
      if (currentRankInput) currentRankInput.textContent = rank;

      const rankBadge = document.getElementById("rankBadge");
      if (rankBadge) rankBadge.textContent = rank;

      const levelBadge = document.getElementById("levelBadge");
      if (levelBadge) levelBadge.textContent = `Level ${level}`;

      const joinedDateEl = document.getElementById("joinedDate");
      if (joinedDateEl) joinedDateEl.textContent = joinedDate;

      const profileSkillLine = document.getElementById("profileSkillLine");
      if (profileSkillLine) profileSkillLine.textContent = `Level ${level} - ${rank}`;

      const memberSinceInput = document.getElementById("memberSinceInput");
      if (memberSinceInput) memberSinceInput.value = joinedDate;

      const rankDisplayLarge = document.getElementById("rankDisplayLarge");
      if (rankDisplayLarge) rankDisplayLarge.textContent = level;

      const rankNameDisplay = document.getElementById("rankNameDisplay");
      if (rankNameDisplay) rankNameDisplay.textContent = rank;

      const levelProgressBar = document.getElementById("levelProgressBar");
      if (levelProgressBar) levelProgressBar.style.width = `${Math.max(0, Math.min(100, Number(progressPercent) || 0))}%`;

      const levelProgressText = document.getElementById("levelProgressText");
      if (levelProgressText) levelProgressText.textContent = `${xpIntoLevel} / ${nextLevelXp} XP`;

      const headerXpProgressBar = document.getElementById("headerXpProgressBar");
      if (headerXpProgressBar) headerXpProgressBar.style.width = `${Math.max(0, Math.min(100, Number(progressPercent) || 0))}%`;

      const headerXpProgressText = document.getElementById("headerXpProgressText");
      if (headerXpProgressText) headerXpProgressText.textContent = `${xpIntoLevel} / ${nextLevelXp} XP to next level`;

      const totalXpDisplay = document.getElementById("totalXpDisplay");
      if (totalXpDisplay) totalXpDisplay.textContent = totalXp.toLocaleString();

      const totalXpStat = document.getElementById("totalXpStat");
      if (totalXpStat) totalXpStat.textContent = totalXp.toLocaleString();
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }

  async function loadStats(user) {
    const email = user?.email;
    if (!email) return;

    const [coursesData, achievementsData, streakData] = await Promise.all([
      (async () => {
        try {
          const base = String(window.API_BASE || "").trim().replace(/\/$/, "");
          const path = ENDPOINTS.courses?.userCourses || "/user-courses";
          const url = new URL(base ? `${base}${path}` : path, window.location.origin);
          url.searchParams.set("email", String(email));
          const response = await fetch(url.toString());
          return response.json();
        } catch (error) {
          console.error("Error loading courses:", error);
          return null;
        }
      })(),
      (async () => {
        try {
          const base = String(window.API_BASE || "").trim().replace(/\/$/, "");
          const path = ENDPOINTS.achievements?.list || "/api/user/achievements";
          const url = new URL(base ? `${base}${path}` : path, window.location.origin);
          url.searchParams.set("user_email", String(email));
          const response = await fetch(url.toString());
          return response.json();
        } catch (error) {
          console.error("Error loading achievements:", error);
          return null;
        }
      })(),
      (async () => {
        try {
          const base = String(window.API_BASE || "").trim().replace(/\/$/, "");
          const path = ENDPOINTS.progress?.userStreaks || "/api/user/streaks";
          const url = new URL(base ? `${base}${path}` : path, window.location.origin);
          url.searchParams.set("user_email", String(email));
          const response = await fetch(url.toString());
          return response.json();
        } catch (error) {
          console.error("Error loading streak:", error);
          return null;
        }
      })()
    ]);

    let courses = [];
    if (Array.isArray(coursesData?.courses)) {
      courses = coursesData.courses;
    } else if (Array.isArray(coursesData)) {
      courses = coursesData;
    }

    const completedCount = courses.filter((course) => {
      const status = String(course?.status || "").toLowerCase();
      const progress = Number(course?.progress_pct || 0);
      return status === "completed" || progress >= 100;
    }).length;

    let unlocked = [];
    if (Array.isArray(achievementsData?.unlocked)) {
      unlocked = achievementsData.unlocked;
    } else if (Array.isArray(achievementsData)) {
      unlocked = achievementsData;
    }

    const streakDays = Number(streakData?.current_streak || 0);

    const coursesCompletedDisplay = document.getElementById("coursesCompletedDisplay");
    if (coursesCompletedDisplay) coursesCompletedDisplay.textContent = completedCount;

    const coursesCompletedStat = document.getElementById("coursesCompletedStat");
    if (coursesCompletedStat) coursesCompletedStat.textContent = completedCount;

    const achievementsDisplay = document.getElementById("achievementsDisplay");
    if (achievementsDisplay) achievementsDisplay.textContent = unlocked.length;

    const achievementsStat = document.getElementById("achievementsStat");
    if (achievementsStat) achievementsStat.textContent = unlocked.length;

    const streakDisplay = document.getElementById("streakDisplay");
    if (streakDisplay) streakDisplay.textContent = `${streakDays} days`;

    const streakStat = document.getElementById("streakStat");
    if (streakStat) streakStat.textContent = streakDays;

    const badgeContainer = document.getElementById("recentBadgesSmall");
    if (!badgeContainer) return;

    badgeContainer.innerHTML = "";

    const recent = Array.isArray(unlocked) ? unlocked.slice(0, 4) : [];
    if (!recent.length) {
      for (let i = 0; i < 4; i += 1) {
        const placeholder = document.createElement("span");
        placeholder.className = "net-badge-placeholder";
        placeholder.setAttribute("aria-label", "Locked badge");

        const icon = document.createElement("i");
        icon.className = "bi bi-lock-fill";
        placeholder.appendChild(icon);

        badgeContainer.appendChild(placeholder);
      }
      return;
    }

    recent.forEach((badge) => {
      const badgeElement = document.createElement("span");
      badgeElement.className = "net-earned-badge";
      badgeElement.dataset.badgeId = String(badge?.id || "");
      badgeElement.title = String(badge?.name || "Badge");

      const rawIcon = String(badge?.icon || "").trim();
      if (rawIcon.startsWith("bi-")) {
        const icon = document.createElement("i");
        icon.className = `bi ${rawIcon}`;
        icon.setAttribute("aria-hidden", "true");
        badgeElement.appendChild(icon);
      } else if (rawIcon) {
        badgeElement.textContent = rawIcon;
      } else {
        const icon = document.createElement("i");
        icon.className = "bi bi-patch-check-fill";
        icon.setAttribute("aria-hidden", "true");
        badgeElement.appendChild(icon);
      }

      badgeContainer.appendChild(badgeElement);
    });
  }

  async function loadActivity(user) {
    const email = String(user?.email || "").trim().toLowerCase();
    if (!email) return;

    const totalsByDate = {};

    const addCount = (dateKey, count) => {
      if (!dateKey) return;
      const safeCount = Math.max(0, Number(count) || 0);
      totalsByDate[dateKey] = (totalsByDate[dateKey] || 0) + safeCount;
    };

    try {
      const base = String(window.API_BASE || "").trim().replace(/\/$/, "");
      const path = ENDPOINTS.progress?.userActivity || "/api/user/activity";
      const url = new URL(base ? `${base}${path}` : path, window.location.origin);
      url.searchParams.set("user_email", email);
      url.searchParams.set("range", String(HEATMAP_DAYS));

      const response = await fetch(url.toString());
      const data = await response.json();

      let serverActivity = [];
      if (Array.isArray(data?.activity)) {
        serverActivity = data.activity;
      } else if (Array.isArray(data)) {
        serverActivity = data;
      }

      serverActivity.forEach((entry) => {
        let dateKey = "";
        const rawDate = String(entry?.date || entry?.activity_date || "").trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          dateKey = rawDate;
        } else {
          const parsed = new Date(rawDate);
          if (!Number.isNaN(parsed.getTime())) {
            dateKey = parsed.toISOString().slice(0, 10);
          }
        }

        const explicitCount = Number(entry?.count ?? entry?.activity_count ?? 0);
        if (explicitCount > 0) {
          addCount(dateKey, explicitCount);
          return;
        }

        const lessons = Number(entry?.lessons ?? entry?.lessons_completed ?? 0);
        const quizzes = Number(entry?.quizzes ?? entry?.quizzes_completed ?? 0);
        const challenges = Number(entry?.challenges ?? entry?.challenges_completed ?? 0);
        const logins = Number(entry?.logins ?? entry?.login_count ?? 0);
        const xp = Number(entry?.xp ?? entry?.xp_earned ?? 0);
        const xpPoints = xp > 0 ? Math.max(1, Math.round(xp / 25)) : 0;

        addCount(dateKey, lessons + quizzes + challenges + logins + xpPoints);
      });
    } catch (error) {
      console.error("Error loading activity:", error);
    }

    let progressLog = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(`netology_progress_log:${email}`) || "[]");
      if (Array.isArray(parsed)) progressLog = parsed;
    } catch {
      progressLog = [];
    }

    progressLog.forEach((entry) => {
      let dateKey = "";

      const rawDate = String(entry?.date || "").trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        dateKey = rawDate;
      } else {
        const ts = Number(entry?.ts);
        if (Number.isFinite(ts)) {
          const parsed = new Date(ts);
          if (!Number.isNaN(parsed.getTime())) {
            dateKey = parsed.toISOString().slice(0, 10);
          }
        } else {
          const parsed = new Date(rawDate);
          if (!Number.isNaN(parsed.getTime())) {
            dateKey = parsed.toISOString().slice(0, 10);
          }
        }
      }

      const extraXpPoint = Number(entry?.xp || 0) > 0 ? 1 : 0;
      addCount(dateKey, 1 + extraXpPoint);
    });

    let loginLog = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(`netology_login_log:${email}`) || "[]");
      if (Array.isArray(parsed)) loginLog = parsed;
    } catch {
      loginLog = [];
    }

    loginLog.forEach((value) => {
      let dateKey = "";
      const raw = String(value || "").trim();

      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        dateKey = raw;
      } else {
        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) {
          dateKey = parsed.toISOString().slice(0, 10);
        }
      }

      addCount(dateKey, 1);
    });

    const merged = Object.keys(totalsByDate)
      .sort()
      .map((date) => ({ date, count: totalsByDate[date] }));

    const heatmap = document.getElementById("activityHeatmapContainer");
    if (heatmap) {
      heatmap.innerHTML = "";

      const countByDate = {};
      merged.forEach((entry) => {
        const dateKey = String(entry?.date || "").trim();
        if (!dateKey) return;
        countByDate[dateKey] = (countByDate[dateKey] || 0) + Math.max(0, Number(entry?.count || 0));
      });

      const today = new Date();

      for (let offset = HEATMAP_DAYS - 1; offset >= 0; offset -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        const dateKey = date.toISOString().slice(0, 10);
        const total = Number(countByDate[dateKey] || 0);

        const level = total <= 0 ? 0 : total <= 2 ? 1 : total <= 4 ? 2 : total <= 7 ? 3 : 4;

        const cell = document.createElement("div");
        cell.className = `activity-cell level-${level}`;
        cell.title = `${dateKey}: ${total} activities`;
        heatmap.appendChild(cell);
      }
    }

    const lastItem = merged[merged.length - 1];
    if (lastItem?.date) {
      const lastActiveText = document.getElementById("lastActiveText");
      if (lastActiveText) lastActiveText.textContent = new Date(lastItem.date).toLocaleDateString();
    }
  }
})();
