// account.js — Account page: profile, preferences, security, and activity heatmap.

(function () {
  "use strict";

  var API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  var ENDPOINTS = window.ENDPOINTS || {};
  var XP = window.NetologyXP || {};
  var TAB_NAMES = ["profile", "preferences", "security", "activity"];
  var HEATMAP_DAYS = 30;

  // set text content on an element by id
  function setTextById(elementId, textValue) {
    var element = document.getElementById(elementId);
    if (element) {
      element.textContent = String(textValue === null || textValue === undefined ? "" : textValue);
    }
  }

  // set the value attribute on an input by id
  function setInputValueById(elementId, inputValue) {
    var element = document.getElementById(elementId);
    if (element) {
      element.value = String(inputValue === null || inputValue === undefined ? "" : inputValue);
    }
  }

  // set the css width on an element by id
  function setProgressBarWidth(elementId, percent) {
    var element = document.getElementById(elementId);
    if (element) {
      var clamped = Math.max(0, Math.min(100, Number(percent) || 0));
      element.style.width = clamped + "%";
    }
  }

  // read user data from localStorage
  function readSavedUserFromLocalStorage() {
    try {
      return JSON.parse(localStorage.getItem("netology_user") || "null");
    } catch (error) {
      return null;
    }
  }

  // fetch JSON from the API using the correct base URL
  async function fetchFromApi(path, params) {
    var base = String(window.API_BASE || "").trim().replace(/\/$/, "");
    var fullPath = base ? (base + path) : path;
    var url = new URL(fullPath, window.location.origin);

    var paramKeys = Object.keys(params || {});
    for (var i = 0; i < paramKeys.length; i++) {
      url.searchParams.set(paramKeys[i], String(params[paramKeys[i]]));
    }

    var response = await fetch(url.toString());
    return response.json();
  }

  // convert a date-like value into a YYYY-MM-DD string
  function convertToDateKey(rawValue) {
    var text = String(rawValue || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    var parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    return parsed.toISOString().slice(0, 10);
  }

  // build a full name string from user data
  function buildFullName(userData) {
    var parts = [];
    if (userData && userData.first_name) {
      parts.push(userData.first_name);
    }
    if (userData && userData.last_name) {
      parts.push(userData.last_name);
    }
    if (parts.length > 0) {
      return parts.join(" ");
    }
    if (userData && userData.username) {
      return userData.username;
    }
    return "Student";
  }

  // switch to a specific tab and update the URL hash
  function showTab(tabName, updateHash) {
    var isValidTab = false;
    for (var t = 0; t < TAB_NAMES.length; t++) {
      if (TAB_NAMES[t] === tabName) {
        isValidTab = true;
        break;
      }
    }
    if (!isValidTab) {
      return;
    }

    var tabButtons = document.querySelectorAll("[role='tab']");
    for (var b = 0; b < tabButtons.length; b++) {
      var isActive = tabButtons[b].dataset.tab === tabName;
      if (isActive) {
        tabButtons[b].classList.add("btn-teal");
        tabButtons[b].classList.remove("btn-outline-teal");
      } else {
        tabButtons[b].classList.remove("btn-teal");
        tabButtons[b].classList.add("btn-outline-teal");
      }
      tabButtons[b].setAttribute("aria-selected", String(isActive));
    }

    var tabPanels = document.querySelectorAll(".account-tab");
    for (var p = 0; p < tabPanels.length; p++) {
      if (tabPanels[p].dataset.tab === tabName) {
        tabPanels[p].classList.remove("d-none");
      } else {
        tabPanels[p].classList.add("d-none");
      }
    }

    if (updateHash !== false) {
      history.replaceState(null, "", "#" + tabName);
    }
  }

  // set up the tab buttons and hash navigation
  function setupAccountTabs() {
    var tabButtons = document.querySelectorAll("[role='tab']");
    for (var i = 0; i < tabButtons.length; i++) {
      tabButtons[i].addEventListener("click", function (event) {
        event.preventDefault();
        showTab(this.dataset.tab || "profile", true);
      });
    }

    var initialHash = window.location.hash.replace("#", "");
    var isValidHash = false;
    for (var h = 0; h < TAB_NAMES.length; h++) {
      if (TAB_NAMES[h] === initialHash) {
        isValidHash = true;
        break;
      }
    }
    showTab(isValidHash ? initialHash : "profile", false);

    window.addEventListener("hashchange", function () {
      var hash = window.location.hash.replace("#", "");
      for (var j = 0; j < TAB_NAMES.length; j++) {
        if (TAB_NAMES[j] === hash) {
          showTab(hash, false);
          return;
        }
      }
    });
  }

  // apply the selected theme to the page
  function applyThemeSetting(themeValue, themeInputs) {
    var raw = String(themeValue || "").trim().toLowerCase();
    var theme = "light";
    if (raw === "dark" || raw === "system") {
      theme = raw;
    }

    if (window.NetologyTheme && window.NetologyTheme.setTheme) {
      window.NetologyTheme.setTheme(theme);
    } else {
      localStorage.setItem("netology_theme", theme);
      var resolved = theme;
      if (theme === "system") {
        resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      document.body.setAttribute("data-theme", resolved);
    }

    for (var i = 0; i < themeInputs.length; i++) {
      themeInputs[i].checked = themeInputs[i].value === theme;
    }
  }

  // set up appearance settings (theme and dyslexic font toggle)
  function setupAppearanceSettings() {
    var themeRadios = document.querySelectorAll('input[name="themeMode"]');
    var themeInputs = [];
    for (var i = 0; i < themeRadios.length; i++) {
      themeInputs.push(themeRadios[i]);
    }

    var dyslexicToggle = document.getElementById("dyslexicToggle");
    var largeTextToggle = document.getElementById("largeTextToggle");

    applyThemeSetting(localStorage.getItem("netology_theme") || "light", themeInputs);

    for (var t = 0; t < themeInputs.length; t++) {
      themeInputs[t].addEventListener("change", function () {
        if (this.checked) {
          applyThemeSetting(this.value, themeInputs);
        }
      });
    }

    if (dyslexicToggle) {
      dyslexicToggle.checked = localStorage.getItem("netology_dyslexic") === "true";

      dyslexicToggle.addEventListener("change", function (event) {
        var enabled = Boolean(event.target.checked);

        if (window.NetologyTheme && window.NetologyTheme.setDyslexic) {
          window.NetologyTheme.setDyslexic(enabled);
          return;
        }

        localStorage.setItem("netology_dyslexic", enabled ? "true" : "false");
        if (enabled) {
          document.body.classList.add("net-dyslexic");
        } else {
          document.body.classList.remove("net-dyslexic");
        }
      });
    }

    if (largeTextToggle) {
      largeTextToggle.checked = localStorage.getItem("netology_large_text") === "true";

      largeTextToggle.addEventListener("change", function (event) {
        var enabled = Boolean(event.target.checked);

        localStorage.setItem("netology_large_text", enabled ? "true" : "false");
        if (enabled) {
          document.body.classList.add("net-large-text");
        } else {
          document.body.classList.remove("net-large-text");
        }
      });
    }
  }

  // set up the restart onboarding button
  function setupRestartOnboardingButton(user) {
    var button = document.getElementById("restartOnboardingBtn");
    var email = String((user && user.email) || "").trim().toLowerCase();
    if (!button || !email) {
      return;
    }

    button.addEventListener("click", function () {
      localStorage.removeItem("netology_onboarding_completed_" + email);
      localStorage.removeItem("netology_onboarding_skipped_" + email);
      localStorage.setItem("netology_onboarding_user", email);
      localStorage.setItem("netology_onboarding_stage", "dashboard");

      try {
        sessionStorage.setItem("netology_onboarding_session", "true");
        sessionStorage.removeItem("netology_welcome_shown");
      } catch (storageError) {
        // ignore storage errors
      }

      window.location.href = "dashboard.html";
    });
  }

  // set up the delete account button
  function setupDeleteAccountButton(user) {
    var button = document.getElementById("deleteAccountBtn");
    var email = String((user && user.email) || "").trim().toLowerCase();
    if (!button || !email) {
      return;
    }

    button.addEventListener("click", function () {
      var confirmed = window.confirm(
        "Are you absolutely sure you want to delete your account? This action cannot be undone.\n\nAll your progress, courses, challenges, and data will be permanently deleted."
      );
      if (!confirmed) {
        return;
      }

      var doubleConfirmed = window.prompt(
        "Type your email address to confirm deletion:\n" + email
      );
      if (!doubleConfirmed || doubleConfirmed.trim().toLowerCase() !== email) {
        alert("Account deletion cancelled. Email address did not match.");
        return;
      }

      // Call the API to delete the account
      var deleteEndpoint = (ENDPOINTS.auth && ENDPOINTS.auth.deleteAccount) || "/delete-account";
      var apiUrl = API_BASE ? (API_BASE + deleteEndpoint) : deleteEndpoint;

      var formData = new FormData();
      formData.append("email", email);

      fetch(apiUrl, { method: "POST", body: formData })
        .then(function (response) { return response.json(); })
        .then(function (data) {
          if (data && data.success) {
            // Clear all local storage
            localStorage.clear();
            sessionStorage.clear();

            // Redirect to home page
            alert("Your account has been permanently deleted.");
            window.location.href = "index.html";
          } else {
            alert("Error: " + (data.message || "Could not delete account. Please try again."));
          }
        })
        .catch(function (error) {
          console.error("Delete account error:", error);
          alert("Error: Could not connect to server. Please try again.");
        });
    });
  }

  // load the user profile data from the server and fill the page
  async function loadUserProfileData(user) {
    try {
      var profilePath = (ENDPOINTS.auth && ENDPOINTS.auth.userInfo) || "/user-info";
      var userData = await fetchFromApi(profilePath, { email: user.email });

      var totalXp = Math.max(0, Number((userData && userData.xp) || 0));
      var level = 1;
      var rank = "Novice";
      var xpIntoLevel = 0;
      var nextLevelXp = 100;
      var progressPercent = 0;

      if (typeof XP.resolveUserProgress === "function") {
        var resolved = XP.resolveUserProgress(userData || {});
        level = Number((resolved && resolved.level) || 1);
        rank = String((userData && userData.rank) || (resolved && resolved.rank) || "Novice");
        xpIntoLevel = Number((resolved && resolved.xpIntoLevel) || 0);
        nextLevelXp = Number((resolved && resolved.nextLevelXp) || 100);
        progressPercent = Math.max(0, Math.min(100, Number((resolved && resolved.progressPercent) || 0)));
      } else {
        var numericLevel = userData && userData.numeric_level;
        if (Number.isFinite(Number(numericLevel))) {
          level = Number(numericLevel);
        } else if (typeof XP.levelFromTotalXp === "function") {
          level = XP.levelFromTotalXp(totalXp);
        }

        rank = String((userData && userData.rank) || (typeof XP.rankForLevel === "function" ? XP.rankForLevel(level) : "Novice"));

        var serverXpIntoLevel = userData && userData.xp_into_level;
        if (Number.isFinite(Number(serverXpIntoLevel))) {
          xpIntoLevel = Number(serverXpIntoLevel);
        } else {
          var baseXp = typeof XP.totalXpForLevel === "function" ? XP.totalXpForLevel(level) : 0;
          xpIntoLevel = Math.max(0, totalXp - baseXp);
        }

        var serverNextLevelXp = userData && userData.next_level_xp;
        if (Number.isFinite(Number(serverNextLevelXp))) {
          nextLevelXp = Number(serverNextLevelXp);
        } else if (typeof XP.xpForNextLevel === "function") {
          nextLevelXp = XP.xpForNextLevel(level);
        }

        progressPercent = Math.round((xpIntoLevel / Math.max(nextLevelXp, 1)) * 100);
      }

      var displayName = buildFullName(userData);

      var joinedDate = "Recently";
      if (userData && userData.created_at) {
        var joinedParsed = new Date(userData.created_at);
        if (!Number.isNaN(joinedParsed.getTime())) {
          joinedDate = joinedParsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        }
      }

      // fill all the profile fields
      setTextById("profileName", displayName);
      setTextById("profileEmail", user.email);
      setTextById("profileSkillLine", "Level " + level + " - " + rank);
      setTextById("currentRankInput", rank);
      setTextById("rankBadge", rank);
      setTextById("levelBadge", "Level " + level);
      setTextById("joinedDate", joinedDate);
      setTextById("rankDisplayLarge", level);
      setTextById("rankNameDisplay", rank);
      setTextById("levelProgressText", xpIntoLevel + " / " + nextLevelXp + " XP");
      setTextById("headerXpProgressText", xpIntoLevel + " / " + nextLevelXp + " XP to next level");
      setTextById("totalXpDisplay", totalXp.toLocaleString());
      setTextById("totalXpStat", totalXp.toLocaleString());

      setInputValueById("fullNameInput", displayName);
      setInputValueById("emailInput", user.email);
      setInputValueById("currentLevelInput", level);
      setInputValueById("memberSinceInput", joinedDate);

      setProgressBarWidth("levelProgressBar", progressPercent);
      setProgressBarWidth("headerXpProgressBar", progressPercent);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }

  // show up to 4 earned badges or lock placeholders
  function renderRecentAchievementBadges(unlockedAchievements) {
    var container = document.getElementById("recentBadgesSmall");
    if (!container) {
      return;
    }

    container.innerHTML = "";

    var recentBadges = Array.isArray(unlockedAchievements) ? unlockedAchievements.slice(0, 4) : [];

    if (recentBadges.length === 0) {
      for (var i = 0; i < 4; i++) {
        var placeholder = document.createElement("span");
        placeholder.className = "net-badge-placeholder";
        placeholder.setAttribute("aria-label", "Locked badge");

        var lockIcon = document.createElement("i");
        lockIcon.className = "bi bi-lock-fill";
        placeholder.appendChild(lockIcon);

        container.appendChild(placeholder);
      }
      return;
    }

    for (var b = 0; b < recentBadges.length; b++) {
      var badge = recentBadges[b];
      var badgeElement = document.createElement("span");
      badgeElement.className = "net-earned-badge";
      badgeElement.dataset.badgeId = String((badge && badge.id) || "");
      badgeElement.title = String((badge && badge.name) || "Badge");

      var rawIcon = String((badge && badge.icon) || "").trim();
      var iconElement = document.createElement("i");

      if (rawIcon.indexOf("bi-") === 0) {
        iconElement.className = "bi " + rawIcon;
      } else if (rawIcon) {
        badgeElement.textContent = rawIcon;
        container.appendChild(badgeElement);
        continue;
      } else {
        iconElement.className = "bi bi-patch-check-fill";
      }

      iconElement.setAttribute("aria-hidden", "true");
      badgeElement.appendChild(iconElement);
      container.appendChild(badgeElement);
    }
  }

  // load stats: courses completed, achievements, and streak
  async function loadUserStatistics(user) {
    var email = (user && user.email) || "";
    if (!email) {
      return;
    }

    var coursesPath = (ENDPOINTS.courses && ENDPOINTS.courses.userCourses) || "/user-courses";
    var achievementsPath = (ENDPOINTS.achievements && ENDPOINTS.achievements.list) || "/api/user/achievements";
    var streaksPath = (ENDPOINTS.progress && ENDPOINTS.progress.userStreaks) || "/api/user/streaks";

    // fetch all three stat sources at once
    var coursesData = null;
    var achievementsData = null;
    var streakData = null;

    try {
      var results = await Promise.all([
        fetchFromApi(coursesPath, { email: email }).catch(function () { return null; }),
        fetchFromApi(achievementsPath, { user_email: email }).catch(function () { return null; }),
        fetchFromApi(streaksPath, { user_email: email }).catch(function () { return null; })
      ]);
      coursesData = results[0];
      achievementsData = results[1];
      streakData = results[2];
    } catch (fetchError) {
      // continue with nulls
    }

    // count completed courses
    var courses = [];
    if (coursesData && Array.isArray(coursesData.courses)) {
      courses = coursesData.courses;
    } else if (Array.isArray(coursesData)) {
      courses = coursesData;
    }

    var completedCount = 0;
    for (var c = 0; c < courses.length; c++) {
      var courseStatus = String((courses[c] && courses[c].status) || "").toLowerCase();
      var courseProgress = Number((courses[c] && courses[c].progress_pct) || 0);
      if (courseStatus === "completed" || courseProgress >= 100) {
        completedCount = completedCount + 1;
      }
    }

    // count unlocked achievements
    var unlockedAchievements = [];
    if (achievementsData && Array.isArray(achievementsData.unlocked)) {
      unlockedAchievements = achievementsData.unlocked;
    } else if (Array.isArray(achievementsData)) {
      unlockedAchievements = achievementsData;
    }

    // read streak days
    var streakDays = Number((streakData && streakData.current_streak) || 0);

    // fill the stat numbers
    setTextById("coursesCompletedDisplay", completedCount);
    setTextById("coursesCompletedStat", completedCount);
    setTextById("achievementsDisplay", unlockedAchievements.length);
    setTextById("achievementsStat", unlockedAchievements.length);
    setTextById("streakDisplay", streakDays + " days");
    setTextById("streakStat", streakDays);

    renderRecentAchievementBadges(unlockedAchievements);
  }

  // add an activity count to a date in the totals object
  function addActivityToDate(totalsByDate, dateKey, count) {
    if (!dateKey) {
      return;
    }
    totalsByDate[dateKey] = (totalsByDate[dateKey] || 0) + Math.max(0, Number(count) || 0);
  }

  // calculate the heatmap intensity level from an activity count
  function calculateHeatmapIntensity(totalCount) {
    if (totalCount <= 0) {
      return 0;
    }
    if (totalCount <= 2) {
      return 1;
    }
    if (totalCount <= 4) {
      return 2;
    }
    if (totalCount <= 7) {
      return 3;
    }
    return 4;
  }

  // load the activity heatmap data and render the grid
  async function loadActivityHeatmap(user) {
    var email = String((user && user.email) || "").trim().toLowerCase();
    if (!email) {
      return;
    }

    var totalsByDate = {};

    // 1. server activity data
    try {
      var activityPath = (ENDPOINTS.progress && ENDPOINTS.progress.userActivity) || "/api/user/activity";
      var data = await fetchFromApi(activityPath, { user_email: email, range: HEATMAP_DAYS });

      var serverActivity = [];
      if (data && Array.isArray(data.activity)) {
        serverActivity = data.activity;
      } else if (Array.isArray(data)) {
        serverActivity = data;
      }

      for (var s = 0; s < serverActivity.length; s++) {
        var entry = serverActivity[s];
        var dateKey = convertToDateKey((entry && entry.date) || (entry && entry.activity_date));
        var explicitCount = Number((entry && entry.count) || (entry && entry.activity_count) || 0);

        if (explicitCount > 0) {
          addActivityToDate(totalsByDate, dateKey, explicitCount);
          continue;
        }

        var lessons = Number((entry && entry.lessons) || (entry && entry.lessons_completed) || 0);
        var quizzes = Number((entry && entry.quizzes) || (entry && entry.quizzes_completed) || 0);
        var challenges = Number((entry && entry.challenges) || (entry && entry.challenges_completed) || 0);
        var logins = Number((entry && entry.logins) || (entry && entry.login_count) || 0);
        var xpEarned = Number((entry && entry.xp) || (entry && entry.xp_earned) || 0);
        var xpPoints = xpEarned > 0 ? Math.max(1, Math.round(xpEarned / 25)) : 0;

        addActivityToDate(totalsByDate, dateKey, lessons + quizzes + challenges + logins + xpPoints);
      }
    } catch (activityError) {
      console.error("Error loading activity:", activityError);
    }

    // 2. local progress log
    try {
      var progressLogRaw = localStorage.getItem("netology_progress_log:" + email) || "[]";
      var progressLog = JSON.parse(progressLogRaw);
      if (Array.isArray(progressLog)) {
        for (var p = 0; p < progressLog.length; p++) {
          var logEntry = progressLog[p];
          var logDateKey = convertToDateKey(logEntry && logEntry.date);
          if (!logDateKey && logEntry && Number.isFinite(Number(logEntry.ts))) {
            logDateKey = convertToDateKey(new Date(Number(logEntry.ts)).toISOString());
          }
          var xpBonus = Number((logEntry && logEntry.xp) || 0) > 0 ? 1 : 0;
          addActivityToDate(totalsByDate, logDateKey, 1 + xpBonus);
        }
      }
    } catch (progressError) {
      // ignore parse errors
    }

    // 3. local login log
    try {
      var loginLogRaw = localStorage.getItem("netology_login_log:" + email) || "[]";
      var loginLog = JSON.parse(loginLogRaw);
      if (Array.isArray(loginLog)) {
        for (var l = 0; l < loginLog.length; l++) {
          addActivityToDate(totalsByDate, convertToDateKey(loginLog[l]), 1);
        }
      }
    } catch (loginError) {
      // ignore parse errors
    }

    // draw the heatmap grid
    var heatmapContainer = document.getElementById("activityHeatmapContainer");
    if (heatmapContainer) {
      heatmapContainer.innerHTML = "";
      var today = new Date();

      for (var offset = HEATMAP_DAYS - 1; offset >= 0; offset--) {
        var cellDate = new Date(today);
        cellDate.setDate(today.getDate() - offset);
        var cellDateKey = cellDate.toISOString().slice(0, 10);
        var cellTotal = Number(totalsByDate[cellDateKey] || 0);
        var intensity = calculateHeatmapIntensity(cellTotal);

        var cell = document.createElement("div");
        cell.className = "activity-cell level-" + intensity;
        cell.title = cellDateKey + ": " + cellTotal + " activities";
        heatmapContainer.appendChild(cell);
      }
    }

    // show last active date
    var sortedDates = Object.keys(totalsByDate).sort();
    var lastDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
    if (lastDate) {
      setTextById("lastActiveText", new Date(lastDate).toLocaleDateString());
    }
  }

  // main entry point for the account page
  async function initialiseAccountPage() {
    var user = readSavedUserFromLocalStorage();
    if (!user) {
      try {
        user = JSON.parse(localStorage.getItem("user") || "null");
      } catch (parseError) {
        user = null;
      }
    }

    if (!user || !user.email) {
      window.location.href = "login.html";
      return;
    }

    window.NetologyNav.displayNavUser(user);
    setupAccountTabs();
    setupAppearanceSettings();
    setupRestartOnboardingButton(user);
    setupDeleteAccountButton(user);

    await Promise.all([
      loadUserProfileData(user),
      loadUserStatistics(user),
      loadActivityHeatmap(user)
    ]);

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    if (typeof window.maybeStartOnboardingTour === "function") {
      window.maybeStartOnboardingTour("account", user.email);
    }
  }

  // wait for the DOM to be ready, then start
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initialiseAccountPage();
    }, { once: true });
  } else {
    initialiseAccountPage();
  }
})();
