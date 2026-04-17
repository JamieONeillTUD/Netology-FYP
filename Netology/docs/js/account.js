/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

account.js - Account Page Script
---
This file handles the main behaviour for the Account page.
It loads the user's profile details, learning stats, recent
badges, appearance settings, security actions, and activity heatmap.

It is used by Account.html and fills the page with data from
the backend and local storage.
*/

(function () {
  "use strict";

  var API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  var ENDPOINTS = window.ENDPOINTS || {};
  var XP = window.NetologyXP || {};
  var TAB_NAMES = ["profile", "preferences", "security", "activity"];
  var HEATMAP_DAYS = 90;

  // Set text on an element by id.
  function setTextById(elementId, textValue) {
    var element = document.getElementById(elementId);
    if (element) {
      element.textContent = String(textValue === null || textValue === undefined ? "" : textValue);
    }
  }

  // Set the value of an input by id.
  function setInputValueById(elementId, inputValue) {
    var element = document.getElementById(elementId);
    if (element) {
      element.value = String(inputValue === null || inputValue === undefined ? "" : inputValue);
    }
  }

  // Set a progress bar width and keep it between 0 and 100.
  function setProgressBarWidth(elementId, percent) {
    var element = document.getElementById(elementId);
    if (element) {
      var clamped = Math.max(0, Math.min(100, Number(percent) || 0));
      element.style.width = clamped + "%";
    }
  }

  // Clean an email address so it is safe to reuse.
  function normaliseEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  // Read JSON from localStorage and fall back if it fails.
  function readStoredJson(key, fallbackValue) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallbackValue;
    } catch (error) {
      return fallbackValue;
    }
  }

  // Build a full API URL from a path.
  function buildApiUrl(path) {
    return API_BASE ? (API_BASE + path) : path;
  }

  // Read the saved user from localStorage.
  function readSavedUserFromLocalStorage() {
    return readStoredJson("netology_user", null);
  }

  // Fetch JSON from the API.
  async function fetchFromApi(path, params) {
    var url = new URL(buildApiUrl(path), window.location.origin);

    var paramKeys = Object.keys(params || {});
    for (var i = 0; i < paramKeys.length; i++) {
      url.searchParams.set(paramKeys[i], String(params[paramKeys[i]]));
    }

    var response = await fetch(url.toString());
    return response.json();
  }

  // Convert a date-like value into YYYY-MM-DD.
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

  // Build a display name from the saved user details.
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

  // Show one tab and update the URL hash.
  function showTab(tabName, updateHash) {
    if (TAB_NAMES.indexOf(tabName) === -1) {
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

  // Set up the tab buttons and hash navigation.
  function setupAccountTabs() {
    var tabButtons = document.querySelectorAll("[role='tab']");
    for (var i = 0; i < tabButtons.length; i++) {
      tabButtons[i].addEventListener("click", function (event) {
        event.preventDefault();
        showTab(this.dataset.tab || "profile", true);
      });
    }

    var initialHash = window.location.hash.replace("#", "");
    showTab(TAB_NAMES.indexOf(initialHash) !== -1 ? initialHash : "profile", false);

    window.addEventListener("hashchange", function () {
      var hash = window.location.hash.replace("#", "");
      if (TAB_NAMES.indexOf(hash) !== -1) {
        showTab(hash, false);
      }
    });
  }

  // Apply the selected theme.
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

  // Set up the appearance settings.
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

        if (window.NetologyTheme && window.NetologyTheme.setLargeText) {
          window.NetologyTheme.setLargeText(enabled);
          return;
        }

        localStorage.setItem("netology_large_text", enabled ? "true" : "false");
        if (enabled) {
          document.body.classList.add("net-large-text");
        } else {
          document.body.classList.remove("net-large-text");
        }
      });
    }
  }

  // Set up the restart onboarding button.
  function setupRestartOnboardingButton(user) {
    var button = document.getElementById("restartOnboardingBtn");
    var email = normaliseEmail(user && user.email);
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

  // Set up the delete account button.
  function setupDeleteAccountButton(user) {
    var button = document.getElementById("deleteAccountBtn");
    var email = normaliseEmail(user && user.email);
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

      var deleteEndpoint = (ENDPOINTS.auth && ENDPOINTS.auth.deleteAccount) || "/delete-account";
      var apiUrl = buildApiUrl(deleteEndpoint);

      var formData = new FormData();
      formData.append("email", email);

      fetch(apiUrl, { method: "POST", body: formData })
        .then(function (response) { return response.json(); })
        .then(function (data) {
          if (data && data.success) {
            localStorage.clear();
            sessionStorage.clear();

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

  // Load the user's profile data and fill the page.
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

      setTextById("profileName", displayName);
      setTextById("profileAvatar", displayName.charAt(0).toUpperCase());
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

  // Build the HTML for one achievement card.
  function achievementBadgeHtml(achievement, isUnlocked) {
    var icon = String((achievement && achievement.icon) || "bi-trophy").replace(/^bi:/, "bi-");
    var xp = Number((achievement && (achievement.xp_reward || achievement.xp_added)) || 0);
    var className = isUnlocked ? "prg-ach-item unlocked" : "prg-ach-item locked";
    var lockHtml = isUnlocked ? "" : '<div class="prg-ach-lock"><i class="bi bi-lock-fill"></i></div>';

    return '<div class="' + className + '" title="' + ((achievement && achievement.description) || "") + '">' +
      '<div class="prg-ach-icon"><i class="bi ' + icon + '"></i>' + lockHtml + "</div>" +
      '<div class="prg-ach-name">' + ((achievement && achievement.name) || "Achievement") + "</div>" +
      (xp ? '<div class="prg-ach-xp">+' + xp + " XP</div>" : "") +
      "</div>";
  }

  // Show the account page achievements in the same style as the Progress page.
  function renderAccountAchievements(unlockedAchievements, lockedAchievements) {
    var container = document.getElementById("recentBadgesSmall");
    if (!container) {
      return;
    }

    var unlocked = Array.isArray(unlockedAchievements) ? unlockedAchievements : [];
    var locked = Array.isArray(lockedAchievements) ? lockedAchievements : [];
    container.className = "prg-ach-grid";

    if (!unlocked.length && !locked.length) {
      container.innerHTML = '<div class="small text-muted">Complete lessons to earn your first achievement.</div>';
      return;
    }

    var html = "";
    for (var i = 0; i < unlocked.length; i++) {
      html += achievementBadgeHtml(unlocked[i], true);
    }
    for (var j = 0; j < locked.length; j++) {
      html += achievementBadgeHtml(locked[j], false);
    }
    container.innerHTML = html;
  }

  // Load the user's course, achievement, and streak stats.
  async function loadUserStatistics(user) {
    var email = normaliseEmail(user && user.email);
    if (!email) {
      return;
    }

    var coursesPath = (ENDPOINTS.courses && ENDPOINTS.courses.userCourses) || "/user-courses";
    var achievementsPath = (ENDPOINTS.achievements && ENDPOINTS.achievements.list) || "/api/user/achievements";
    var streaksPath = (ENDPOINTS.progress && ENDPOINTS.progress.userStreaks) || "/api/user/streaks";

    var results = await Promise.all([
      fetchFromApi(coursesPath, { email: email }).catch(function () { return null; }),
      fetchFromApi(achievementsPath, { user_email: email }).catch(function () { return null; }),
      fetchFromApi(streaksPath, { user_email: email }).catch(function () { return null; })
    ]);
    var coursesData = results[0];
    var achievementsData = results[1];
    var streakData = results[2];

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

    var unlockedAchievements = [];
    if (achievementsData && Array.isArray(achievementsData.unlocked)) {
      unlockedAchievements = achievementsData.unlocked;
    } else if (Array.isArray(achievementsData)) {
      unlockedAchievements = achievementsData;
    }
    var lockedAchievements = [];
    if (achievementsData && Array.isArray(achievementsData.locked)) {
      lockedAchievements = achievementsData.locked;
    }

    var streakDays = Number((streakData && streakData.current_streak) || 0);

    setTextById("coursesCompletedDisplay", completedCount);
    setTextById("coursesCompletedStat", completedCount);
    setTextById("achievementsDisplay", unlockedAchievements.length);
    setTextById("achievementsStat", unlockedAchievements.length);
    setTextById("streakDisplay", streakDays + " days");
    setTextById("streakStat", streakDays);

    renderAccountAchievements(unlockedAchievements, lockedAchievements);
  }

  // Add activity to one date in the totals object.
  function addActivityToDate(totalsByDate, dateKey, count) {
    if (!dateKey) {
      return;
    }
    totalsByDate[dateKey] = (totalsByDate[dateKey] || 0) + Math.max(0, Number(count) || 0);
  }

  // Work out the heatmap colour level from the activity count.
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

  // Load the activity heatmap data and draw the grid.
  async function loadActivityHeatmap(user) {
    var email = normaliseEmail(user && user.email);
    if (!email) {
      return;
    }

    var totalsByDate = {};

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

    var progressLog = readStoredJson("netology_progress_log:" + email, []);
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

    var loginLog = readStoredJson("netology_login_log:" + email, []);
    if (Array.isArray(loginLog)) {
      for (var l = 0; l < loginLog.length; l++) {
        addActivityToDate(totalsByDate, convertToDateKey(loginLog[l]), 1);
      }
    }

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

    var sortedDates = Object.keys(totalsByDate).sort();
    var lastDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
    if (lastDate) {
      setTextById("lastActiveText", new Date(lastDate).toLocaleDateString());
    }
  }

  // Main entry point for the account page.
  async function initialiseAccountPage() {
    var user = readSavedUserFromLocalStorage();
    if (!user) {
      user = readStoredJson("user", null);
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

  // Wait for the DOM, then start the page.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initialiseAccountPage();
    }, { once: true });
  } else {
    initialiseAccountPage();
  }
})();
