/*
---------------------------------------------------------
Student: C22320301 - Jamie O’Neill
File: account.js
Purpose: Loads the account page profile, settings, stats, and activity heatmap.
Notes: Rewritten with simple functions, clearer names, and same page behavior.
---------------------------------------------------------
*/

(() => {
  "use strict";

  const ENDPOINTS = window.ENDPOINTS || {};
  const XP = window.NetologyXP || null;

  // Use shared API helper when available.
  const apiGet = typeof window.apiGet === "function"
    ? window.apiGet
    : async function apiGetFallback(path, params = {}) {
      const base = String(window.API_BASE || "").trim();
      const url = base
        ? new URL(base.replace(/\/$/, "") + path)
        : new URL(path, window.location.origin);

      Object.entries(params).forEach(([paramName, paramValue]) => {
        if (paramValue !== undefined && paramValue !== null && paramValue !== "") {
          url.searchParams.set(paramName, String(paramValue));
        }
      });

      const response = await fetch(url.toString());
      return response.json();
    };

  // Read arrays safely from variable API response shapes.
  const listFrom = window.API_HELPERS?.list || function listFromFallback(data, ...keys) {
    if (Array.isArray(data)) return data;
    for (const keyName of keys) {
      if (Array.isArray(data?.[keyName])) return data[keyName];
    }
    return [];
  };

  document.addEventListener("DOMContentLoaded", () => {
    initAccountPage();
  });

  // Main page startup.
  async function initAccountPage() {
    const currentUser = getCurrentUser();
    if (!currentUser?.email) {
      window.location.href = "login.html";
      return;
    }

    wirePageChrome(currentUser);
    wireTabNavigation();
    initAppearanceControls();
    wireRestartOnboarding(currentUser);

    await loadProfileData(currentUser);
    await loadLearningStats(currentUser);
    await loadActivityData(currentUser);

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    if (typeof window.maybeStartOnboardingTour === "function") {
      window.maybeStartOnboardingTour("account", currentUser.email);
    }
  }

  // Theme and accessibility controls.
  function initAppearanceControls() {
    const themeChoices = Array.from(document.querySelectorAll('input[name="themeMode"]'));
    const dyslexicToggle = document.getElementById("dyslexicToggle");
    const safeTheme = (value) => {
      const normalized = String(value || "").trim().toLowerCase();
      if (normalized === "dark" || normalized === "system") return normalized;
      return "light";
    };
    const readTheme = () => safeTheme(localStorage.getItem("netology_theme") || "light");
    const applyTheme = (themeMode) => {
      const selectedTheme = safeTheme(themeMode);

      if (window.NetologyTheme?.setTheme) {
        window.NetologyTheme.setTheme(selectedTheme);
      } else {
        localStorage.setItem("netology_theme", selectedTheme);
        const resolvedTheme = selectedTheme === "system"
          ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
          : selectedTheme;
        document.body?.setAttribute("data-theme", resolvedTheme);
      }

      themeChoices.forEach((input) => {
        input.checked = input.value === selectedTheme;
      });
    };

    if (themeChoices.length) {
      const savedTheme = readTheme();
      themeChoices.forEach((input) => {
        input.checked = input.value === savedTheme;
        input.addEventListener("change", () => {
          if (!input.checked) return;
          applyTheme(input.value);
        });
      });
    }

    if (dyslexicToggle) {
      const isDyslexic = localStorage.getItem("netology_dyslexic") === "true";
      dyslexicToggle.checked = isDyslexic;

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

  // Restart onboarding and send user back to dashboard.
  function wireRestartOnboarding(currentUser) {
    const button = document.getElementById("restartOnboardingBtn");
    if (!button || !currentUser?.email) return;

    button.addEventListener("click", () => {
      const email = String(currentUser.email || "").trim().toLowerCase();

      localStorage.removeItem(`netology_onboarding_completed_${email}`);
      localStorage.removeItem(`netology_onboarding_skipped_${email}`);

      localStorage.setItem("netology_onboarding_user", email);
      localStorage.setItem("netology_onboarding_stage", "dashboard");

      try {
        sessionStorage.setItem("netology_onboarding_session", "true");
        sessionStorage.removeItem("netology_welcome_shown");
      } catch {
        // Ignore session storage errors.
      }

      window.location.href = "dashboard.html";
    });
  }

  // Sidebar, dropdown, identity, and logout.
  function wirePageChrome(currentUser) {
    wireSidebar();
    wireUserDropdown();
    fillIdentity(currentUser);
    wireLogoutButtons();
  }

  function wireLogoutButtons() {
    const topLogoutButton = document.getElementById("topLogoutBtn");
    const sideLogoutButton = document.getElementById("sideLogoutBtn");

    const logout = () => {
      localStorage.removeItem("netology_user");
      localStorage.removeItem("user");
      localStorage.removeItem("netology_token");
      window.location.href = "index.html";
    };

    if (topLogoutButton) topLogoutButton.addEventListener("click", logout);
    if (sideLogoutButton) sideLogoutButton.addEventListener("click", logout);
  }

  function wireSidebar() {
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

    if (openButton) openButton.addEventListener("click", openSidebar);
    if (closeButton) closeButton.addEventListener("click", closeSidebar);
    if (backdrop) backdrop.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sidebar?.classList.contains("is-open")) {
        closeSidebar();
      }
    });
  }

  function wireUserDropdown() {
    const button = document.getElementById("userBtn");
    const dropdown = document.getElementById("userDropdown");
    if (!button || !dropdown) return;

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = dropdown.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (event) => {
      if (dropdown.contains(event.target) || button.contains(event.target)) return;
      dropdown.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    });
  }

  function fillIdentity(currentUser) {
    const fullName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ")
      || currentUser.username
      || "Student";
    const email = String(currentUser.email || "");
    const avatarInitial = (fullName.charAt(0) || "S").toUpperCase();
    const level = levelFromXP(Number(currentUser.xp || 0));
    const rank = rankForLevel(level);

    setElementValue("topAvatar", avatarInitial);
    setElementValue("ddAvatar", avatarInitial);
    setElementValue("ddName", fullName);
    setElementValue("ddEmail", email);
    setElementValue("ddLevel", `Level ${level}`);
    setElementValue("ddRank", rank);

    setElementValue("sideAvatar", avatarInitial);
    setElementValue("sideUserName", fullName);
    setElementValue("sideUserEmail", email);
    setElementValue("sideLevelBadge", `Lv ${level}`);

    setElementValue("profileAvatar", avatarInitial);
  }

  // Simple account tabs with URL hash support.
  function wireTabNavigation() {
    const tabButtons = document.querySelectorAll("[role='tab']");
    const tabPanels = document.querySelectorAll(".account-tab");
    const validTabs = ["profile", "preferences", "security", "activity"];

    const switchTo = (tabName) => {
      tabButtons.forEach((button) => {
        const isActive = button.dataset.tab === tabName;
        button.classList.toggle("btn-teal", isActive);
        button.classList.toggle("btn-outline-teal", !isActive);
        button.setAttribute("aria-selected", String(isActive));
      });

      tabPanels.forEach((panel) => {
        if (panel.dataset.tab === tabName) {
          panel.classList.remove("d-none");
          panel.style.animation = "none";
          panel.offsetHeight;
          panel.style.animation = "";
        } else {
          panel.classList.add("d-none");
        }
      });

      history.replaceState(null, "", `#${tabName}`);
    };

    tabButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        switchTo(button.dataset.tab);
      });
    });

    const initialHash = window.location.hash.replace("#", "");
    if (initialHash && validTabs.includes(initialHash)) {
      switchTo(initialHash);
    }

    window.addEventListener("hashchange", () => {
      const currentHash = window.location.hash.replace("#", "");
      if (currentHash && validTabs.includes(currentHash)) {
        switchTo(currentHash);
      }
    });
  }

  // Load profile and level section.
  async function loadProfileData(currentUser) {
    try {
      const userData = await apiGet(ENDPOINTS.auth?.userInfo || "/user-info", {
        email: currentUser.email
      });

      const totalXp = Number(userData?.xp || 0);
      const level = Number.isFinite(Number(userData?.numeric_level))
        ? Number(userData.numeric_level)
        : levelFromXP(totalXp);
      const rank = String(userData?.rank || rankForLevel(level));

      const currentLevelXp = Number.isFinite(Number(userData?.xp_into_level))
        ? Number(userData.xp_into_level)
        : Math.max(0, totalXp - totalXpForLevel(level));
      const nextLevelXp = Number.isFinite(Number(userData?.next_level_xp))
        ? Number(userData.next_level_xp)
        : xpForNextLevel(level);

      const progressPercent = Math.round((currentLevelXp / Math.max(nextLevelXp, 1)) * 100);

      const displayName = [userData?.first_name, userData?.last_name].filter(Boolean).join(" ") || "Student";
      const joinedDate = userData?.created_at
        ? new Date(userData.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        })
        : "Recently";

      setElementValue("profileName", displayName);
      setElementValue("profileEmail", currentUser.email);
      setElementValue("fullNameInput", displayName);
      setElementValue("emailInput", currentUser.email);
      setElementValue("currentLevelInput", level);
      setElementValue("currentRankInput", rank);
      setElementValue("rankBadge", rank);
      setElementValue("levelBadge", `Level ${level}`);
      setElementValue("joinedDate", joinedDate);
      setElementValue("profileSkillLine", `Level ${level} • ${rank}`);
      setElementValue("memberSinceInput", joinedDate);

      setElementValue("rankDisplayLarge", level);
      setElementValue("rankNameDisplay", rank);
      setElementValue("levelProgressBar", progressPercent);
      setElementValue("levelProgressText", `${currentLevelXp} / ${nextLevelXp} XP`);
      setElementValue("headerXpProgressBar", progressPercent);
      setElementValue("headerXpProgressText", `${currentLevelXp} / ${nextLevelXp} XP to next level`);

      setElementValue("totalXpDisplay", totalXp.toLocaleString());
      setElementValue("totalXpStat", totalXp.toLocaleString());
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }

  // Load sidebar/profile learning stats.
  async function loadLearningStats(currentUser) {
    try {
      const coursesData = await apiGet(ENDPOINTS.courses?.userCourses || "/user-courses", {
        email: currentUser.email
      });
      const userCourses = listFrom(coursesData, "courses");

      const completedCount = userCourses.filter((course) => {
        const status = String(course?.status || "").toLowerCase();
        const percent = Number.isFinite(Number(course?.progress_pct)) ? Number(course.progress_pct) : 0;
        return status === "completed" || percent >= 100;
      }).length;

      setElementValue("coursesCompletedDisplay", completedCount);
      setElementValue("coursesCompletedStat", completedCount);

      const achievementsData = await apiGet(ENDPOINTS.achievements?.list || "/api/user/achievements", {
        user_email: currentUser.email
      });
      const unlockedAchievements = listFrom(achievementsData, "unlocked");
      const unlockedCount = unlockedAchievements.length;

      setElementValue("achievementsDisplay", unlockedCount);
      setElementValue("achievementsStat", unlockedCount);

      const streakData = await apiGet(ENDPOINTS.progress?.userStreaks || "/api/user/streaks", {
        user_email: currentUser.email
      });
      const streakDays = Number(streakData?.current_streak || 0);
      setElementValue("streakDisplay", `${streakDays} days`);
      setElementValue("streakStat", streakDays);

      renderRecentBadges(unlockedAchievements);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  function renderRecentBadges(unlockedAchievements) {
    const container = document.getElementById("recentBadgesSmall");
    if (!container) return;

    if (!Array.isArray(unlockedAchievements) || unlockedAchievements.length === 0) {
      container.innerHTML = Array.from({ length: 4 }).map(() =>
        '<span class="net-badge-placeholder" aria-label="Locked badge"><i class="bi bi-lock-fill"></i></span>'
      ).join("");
      return;
    }

    const recentBadges = unlockedAchievements.slice(0, 4);
    const badgesHtml = recentBadges.map((badge) => {
      const title = escapeHtml(badge?.name || "Badge");
      const icon = badge?.icon || "⭐";
      return `<span class="net-earned-badge" title="${title}">${icon}</span>`;
    }).join("");

    container.innerHTML = badgesHtml
      || Array.from({ length: 4 }).map(() =>
        '<span class="net-badge-placeholder" aria-label="Locked badge"><i class="bi bi-lock-fill"></i></span>'
      ).join("");
  }

  // Load activity heatmap + last active date.
  async function loadActivityData(currentUser) {
    const email = String(currentUser?.email || "").trim().toLowerCase();
    if (!email) return;

    let serverActivity = [];
    try {
      const responseData = await apiGet(ENDPOINTS.progress?.userActivity || "/api/user/activity", {
        user_email: email,
        range: 90
      });
      serverActivity = listFrom(responseData, "activity");
    } catch (error) {
      console.error("Error loading activity:", error);
    }

    const mergedActivity = mergeActivityData(serverActivity, email);
    renderActivityHeatmap(mergedActivity);

    const lastItem = mergedActivity.length ? mergedActivity[mergedActivity.length - 1] : null;
    if (lastItem?.date) {
      setElementValue("lastActiveText", new Date(lastItem.date).toLocaleDateString());
    }
  }

  function mergeActivityData(serverActivity, email) {
    const dayMap = {};
    const addDayCount = (dateKey, increment) => {
      if (!dateKey) return;
      const safeIncrement = Math.max(0, Number(increment) || 0);
      dayMap[dateKey] = (dayMap[dateKey] || 0) + safeIncrement;
    };

    listFrom(serverActivity, "activity").forEach((entry) => {
      const dateKey = normalizeDateKey(entry?.date || entry?.activity_date);
      const lessonCount = Number(entry?.lessons ?? entry?.lessons_completed ?? 0);
      const quizCount = Number(entry?.quizzes ?? entry?.quizzes_completed ?? 0);
      const challengeCount = Number(entry?.challenges ?? entry?.challenges_completed ?? 0);
      const loginCount = Number(entry?.logins ?? entry?.login_count ?? 0);
      const explicitCount = Number(entry?.count ?? entry?.activity_count ?? 0);
      const xpCount = Number(entry?.xp ?? entry?.xp_earned ?? 0);

      const derivedCount = lessonCount + quizCount + challengeCount + loginCount + (xpCount > 0 ? Math.max(1, Math.round(xpCount / 25)) : 0);
      addDayCount(dateKey, explicitCount > 0 ? explicitCount : derivedCount);
    });

    const progressLog = parseJson(localStorage.getItem(`netology_progress_log:${email}`)) || [];
    if (Array.isArray(progressLog)) {
      progressLog.forEach((entry) => {
        const dateKey = normalizeDateKey(entry?.date || toDateFromTimestamp(entry?.ts));
        const xpPart = Number(entry?.xp || 0) > 0 ? 1 : 0;
        addDayCount(dateKey, 1 + xpPart);
      });
    }

    const loginLog = parseJson(localStorage.getItem(`netology_login_log:${email}`)) || [];
    if (Array.isArray(loginLog)) {
      loginLog.forEach((dateValue) => {
        addDayCount(normalizeDateKey(dateValue), 1);
      });
    }

    return Object.keys(dayMap)
      .sort()
      .map((dateKey) => ({ date: dateKey, count: dayMap[dateKey] }));
  }

  function normalizeDateKey(value) {
    if (!value) return "";
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsedDate = new Date(raw);
    if (Number.isNaN(parsedDate.getTime())) return "";
    return parsedDate.toISOString().slice(0, 10);
  }

  function toDateFromTimestamp(value) {
    const ts = Number(value);
    if (!Number.isFinite(ts)) return "";
    const parsedDate = new Date(ts);
    if (Number.isNaN(parsedDate.getTime())) return "";
    return parsedDate.toISOString().slice(0, 10);
  }

  function renderActivityHeatmap(activityList) {
    const container = document.getElementById("activityHeatmapContainer");
    if (!container) return;

    container.innerHTML = "";

    const countByDate = {};
    activityList.forEach((activityEntry) => {
      const date = activityEntry?.date || activityEntry?.activity_date;
      const count = Number(
        activityEntry?.count
        || activityEntry?.activity_count
        || activityEntry?.logins
        || activityEntry?.lessons
        || 0
      );
      if (!date) return;
      countByDate[date] = (countByDate[date] || 0) + Math.max(0, count || 0);
    });

    const today = new Date();

    for (let dayOffset = 89; dayOffset >= 0; dayOffset -= 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      const dateKey = date.toISOString().slice(0, 10);
      const total = Number(countByDate[dateKey] || 0);
      const level = total <= 0 ? 0
        : total <= 2 ? 1
          : total <= 4 ? 2
            : total <= 7 ? 3
              : 4;

      const cell = document.createElement("div");
      cell.className = `activity-cell level-${level}`;
      cell.title = `${dateKey}: ${total} activities`;
      container.appendChild(cell);
    }
  }

  // XP helper functions.
  function totalXpForLevel(level) {
    return XP?.totalXpForLevel ? XP.totalXpForLevel(level) : 0;
  }

  function levelFromXP(totalXp) {
    return XP?.levelFromTotalXp ? XP.levelFromTotalXp(totalXp) : 1;
  }

  function xpForNextLevel(level) {
    return XP?.xpForNextLevel ? XP.xpForNextLevel(level) : 100;
  }

  function rankForLevel(level) {
    return XP?.rankForLevel ? XP.rankForLevel(level) : "Novice";
  }

  function getCurrentUser() {
    return parseJson(localStorage.getItem("netology_user"))
      || parseJson(localStorage.getItem("user"))
      || null;
  }

  function parseJson(rawValue) {
    try {
      return rawValue ? JSON.parse(rawValue) : null;
    } catch {
      return null;
    }
  }

  // Escape text before inserting it into an HTML string.
  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value || "");
    return div.innerHTML;
  }

  // Update normal text, form fields, and progress bars safely.
  function setElementValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (element.classList.contains("progress-bar")) {
      const percent = Math.min(100, Math.max(0, Number(value) || 0));
      element.style.width = `${percent}%`;
      return;
    }

    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      element.value = value;
      return;
    }

    element.textContent = value;
  }
})();
