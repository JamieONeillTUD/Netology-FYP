/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

app.js - Shared Globals
---
This file is loaded on every page in the app. It sets up things that
all other page scripts depend on.

It does four things:
  1. Sets the API base URL and all endpoint paths so other files can
     reference them without hardcoding strings.
  2. Provides the XP and levelling system (NetologyXP) — all level
     calculations happen here and are exposed globally.
  3. Manages the achievement notification queue — when a page unlocks
     achievements, they are stored and shown as toast popups.
  4. Wires up shared nav behaviour — the slide sidebar, user dropdown,
     logout buttons, and the user info display in the nav bar.

It also tracks login days and syncs them with the backend to support
streak counting and daily challenge logic.
*/

(function () {
  "use strict";

  // ── API Base URL and Endpoint Paths ──────────────────────────────────────────

  // Use whatever API_BASE is set in the HTML, otherwise fall back to the
  // hosted backend on Render.
  var rawBase = String(window.API_BASE || "").trim();
  window.API_BASE = rawBase ? rawBase.replace(/\/$/, "") : "https://netology-fyp.onrender.com";

  // Every API path used across the app lives here so they are never hardcoded
  // in individual page scripts.
  window.ENDPOINTS = {
    auth: {
      register:        "/register",
      login:           "/login",
      userInfo:        "/user-info",
      recordLogin:     "/record-login",
      forgotPassword:  "/forgot-password",
      deleteAccount:   "/delete-account"
    },
    onboarding: {
      start:        "/api/onboarding/start",
      complete:     "/api/onboarding/complete",
      skip:         "/api/onboarding/skip",
      steps:        "/api/onboarding/steps",
      stepComplete: "/api/onboarding/step/:id"
    },
    courses: {
      list:                "/courses",
      courseDetails:       "/course",
      userCourses:         "/user-courses",
      userCourseStatus:    "/user-course-status",
      userProgressSummary: "/user-progress-summary",
      completeLesson:      "/complete-lesson",
      completeQuiz:        "/complete-quiz",
      completeChallenge:   "/complete-challenge"
    },
    progress: {
      userActivity: "/api/user/activity",
      userStreaks:  "/api/user/streaks"
    },
    challenges:   { list: "/api/user/challenges" },
    achievements: { list: "/api/user/achievements" },
    sandbox: {
      lessonSessionSave: "/lesson-session/save",
      lessonSessionLoad: "/lesson-session/load",
      saveTopology:      "/save-topology",
      loadTopologies:    "/load-topologies",
      loadTopology:      "/load-topology/:topologyId",
      deleteTopology:    "/delete-topology/:topologyId"
    }
  };

  // ── XP and Levelling System ──────────────────────────────────────────────────

  // Parse a value as an integer safely, returning a fallback if it is invalid.
  function parseIntSafe(value, fallback) {
    var number = parseInt(value, 10);
    return Number.isFinite(number) ? number : (fallback || 0);
  }

  // Ensure a level value is always at least 1.
  function ensureValidLevel(level) {
    return Math.max(1, parseIntSafe(level, 1));
  }

  // Calculate the total cumulative XP needed to reach a given level.
  // Uses a triangular number formula so each level costs 100 more XP than the last.
  function totalXpForLevel(level) {
    var validLevel = ensureValidLevel(level);
    return (100 * (validLevel - 1) * validLevel) / 2;
  }

  // Work out what level a user is at from their total XP.
  // Walks up level by level until the remaining XP runs out.
  function levelFromTotalXp(xp) {
    var remaining = Math.max(0, parseIntSafe(xp, 0));
    var level = 1;
    var needed = 100;
    while (remaining >= needed) {
      remaining -= needed;
      level = level + 1;
      needed = needed + 100;
    }
    return level;
  }

  // How much XP is needed to go from the current level to the next.
  function xpForNextLevel(level) {
    return 100 * ensureValidLevel(level);
  }

  // Return the rank label for a given level: Novice, Intermediate, or Advanced.
  function rankForLevel(level) {
    var validLevel = ensureValidLevel(level);
    if (validLevel >= 5) { return "Advanced"; }
    if (validLevel >= 3) { return "Intermediate"; }
    return "Novice";
  }

  // Build a full progress breakdown object from a total XP value.
  // This is the main function other pages call to display level info.
  function getLevelProgress(xp) {
    var totalXp   = Math.max(0, parseIntSafe(xp, 0));
    var level     = levelFromTotalXp(totalXp);
    var xpIntoLevel  = Math.max(0, totalXp - totalXpForLevel(level));
    var nextLevelXp  = xpForNextLevel(level);
    return {
      level:           level,
      totalXp:         totalXp,
      xpIntoLevel:     xpIntoLevel,
      nextLevelXp:     nextLevelXp,
      toNextXp:        Math.max(0, nextLevelXp - xpIntoLevel),
      progressPercent: Math.max(0, Math.min(100, Math.round((xpIntoLevel / Math.max(nextLevelXp, 1)) * 100)))
    };
  }

  // Add XP to a user object and return an updated copy with recalculated fields.
  function applyXpToUser(user, xpToAdd) {
    var userData   = (user && typeof user === "object") ? user : {};
    var currentXp  = Math.max(0, parseIntSafe(userData.xp, 0));
    var addedXp    = Math.max(0, parseIntSafe(xpToAdd, 0));
    var progress   = getLevelProgress(currentXp + addedXp);
    return Object.assign({}, userData, {
      xp:            progress.totalXp,
      numeric_level: progress.level,
      xp_into_level: progress.xpIntoLevel,
      next_level_xp: progress.nextLevelXp,
      level:         rankForLevel(progress.level),
      rank:          rankForLevel(progress.level)
    });
  }

  // Reconcile a user object's progress fields — prefer server values if they
  // are consistent with the XP total, otherwise recompute them locally.
  function resolveUserProgress(user) {
    var userData  = (user && typeof user === "object") ? user : {};
    var totalXp   = Math.max(0, parseIntSafe(userData.xp, 0));
    var computed  = getLevelProgress(totalXp);

    var serverLevel   = ensureValidLevel(parseIntSafe(userData.numeric_level, computed.level));
    var serverXpInto  = Math.max(0, parseIntSafe(userData.xp_into_level, computed.xpIntoLevel));
    var serverXpNeeded = Math.max(0, parseIntSafe(userData.next_level_xp, computed.nextLevelXp));

    // The server values are valid if they add up correctly — allow a rounding
    // difference of 1 XP either way.
    var serverIsValid = serverXpNeeded > 0
      && Math.abs(totalXpForLevel(serverLevel) + serverXpInto - totalXp) <= 1;

    if (serverIsValid) {
      return {
        level:           serverLevel,
        totalXp:         totalXp,
        xpIntoLevel:     serverXpInto,
        nextLevelXp:     serverXpNeeded,
        toNextXp:        Math.max(0, serverXpNeeded - serverXpInto),
        progressPercent: Math.max(0, Math.min(100, Math.round((serverXpInto / serverXpNeeded) * 100))),
        rank:            rankForLevel(serverLevel)
      };
    }
    return Object.assign({}, computed, { rank: rankForLevel(computed.level) });
  }

  // Expose XP functions globally so any page script can use them.
  window.NetologyXP = {
    totalXpForLevel:    totalXpForLevel,
    levelFromTotalXp:   levelFromTotalXp,
    xpForNextLevel:     xpForNextLevel,
    rankForLevel:       rankForLevel,
    getLevelProgress:   getLevelProgress,
    applyXpToUser:      applyXpToUser,
    resolveUserProgress: resolveUserProgress
  };

  // ── Achievement Notification Queue ──────────────────────────────────────────

  // Normalise an email to a lowercase trimmed string for consistent storage keys.
  function normaliseEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  // localStorage key for achievements waiting to be shown.
  function pendingStorageKey(email) {
    return "netology_achievement_pending:" + normaliseEmail(email);
  }

  // localStorage key for achievements that have already been shown.
  function seenStorageKey(email) {
    return "netology_achievement_seen:" + normaliseEmail(email);
  }

  // Read a JSON array from localStorage, returning an empty array on failure.
  function readListFromStorage(storageKey) {
    try {
      var value = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (e) {
      return [];
    }
  }

  // Check whether a value exists in an array.
  function arrayContains(list, value) {
    for (var i = 0; i < list.length; i++) {
      if (list[i] === value) { return true; }
    }
    return false;
  }

  // Check whether a key exists in a plain object used as a lookup set.
  function objectHasKey(obj, key) {
    return obj.hasOwnProperty(key);
  }

  // Return all values from a plain object as an array.
  function objectValues(obj) {
    return Object.keys(obj).map(function (key) { return obj[key]; });
  }

  // Validate and normalise a raw achievement from the API into a clean shape.
  // Returns null if the object is missing a required id field.
  function cleanAchievement(raw) {
    if (!raw || typeof raw !== "object") { return null; }
    var id = String(raw.id || "").trim();
    if (!id) { return null; }
    return {
      id:          id,
      name:        String(raw.name || "Achievement"),
      description: String(raw.description || ""),
      icon:        String(raw.icon || "bi-award-fill"),
      rarity:      String(raw.rarity || "common"),
      xp_added:    Number(raw.xp_added || raw.xp_awarded || 0),
      earned_at:   raw.earned_at || new Date().toISOString()
    };
  }

  // Return the list of achievement IDs the user has already seen toasts for.
  function getSeenAchievementIds(email) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail) { return []; }
    return readListFromStorage(seenStorageKey(cleanEmail)).map(function (id) {
      return String(id);
    });
  }

  // Mark a list of achievement IDs as seen so their toasts do not appear again.
  function markAchievementsSeen(email, achievementIds) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail) { return; }

    // Build a lookup of already-seen IDs then add the new ones.
    var seenLookup = {};
    getSeenAchievementIds(cleanEmail).forEach(function (id) {
      seenLookup[id] = true;
    });
    achievementIds.forEach(function (id) {
      var trimmed = String(id || "").trim();
      if (trimmed) { seenLookup[trimmed] = true; }
    });

    localStorage.setItem(seenStorageKey(cleanEmail), JSON.stringify(Object.keys(seenLookup)));
  }

  // Remove specific achievement IDs from the pending notification queue.
  function removePendingAchievements(email, achievementIds) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail || !achievementIds || !achievementIds.length) { return; }

    // Build a set of IDs to remove.
    var toRemove = {};
    achievementIds.forEach(function (id) {
      var trimmed = String(id || "").trim();
      if (trimmed) { toRemove[trimmed] = true; }
    });

    if (!Object.keys(toRemove).length) { return; }

    var key = pendingStorageKey(cleanEmail);
    var remaining = readListFromStorage(key).filter(function (a) {
      return a && a.id && !objectHasKey(toRemove, String(a.id).trim());
    });

    if (remaining.length) {
      localStorage.setItem(key, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(key);
    }
  }

  // Show toast popups for a list of achievements the user has not yet seen.
  // Staggers each toast by 220ms so they do not all appear at once.
  function showAchievementPopups(email, achievements) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail || !achievements || !achievements.length || !document.body) { return []; }

    // Build a lookup of already-seen IDs to skip duplicates.
    var alreadySeen = {};
    getSeenAchievementIds(cleanEmail).forEach(function (id) {
      alreadySeen[id] = true;
    });

    // Collect the achievements we actually need to show.
    var queued = {};
    var toShow = [];
    for (var i = 0; i < achievements.length; i++) {
      var a = cleanAchievement(achievements[i]);
      if (!a || objectHasKey(alreadySeen, a.id) || objectHasKey(queued, a.id)) { continue; }
      queued[a.id] = true;
      toShow.push(a);
    }
    if (!toShow.length) { return []; }

    // Show each toast with a staggered delay.
    for (var t = 0; t < toShow.length; t++) {
      (function (achievement, delay) {
        setTimeout(function () {
          if (window.NetologyToast && window.NetologyToast.showAchievementToast) {
            window.NetologyToast.showAchievementToast(achievement);
          } else if (window.NetologyToast && window.NetologyToast.showMessageToast) {
            window.NetologyToast.showMessageToast(achievement.name + " unlocked", "success", 3200);
          } else {
            alert(achievement.name + " unlocked");
          }
        }, delay * 220);
      })(toShow[t], t);
    }

    // Mark as seen so they do not show again on the next page load.
    var shownIds = toShow.map(function (a) { return a.id; });
    markAchievementsSeen(cleanEmail, shownIds);
    removePendingAchievements(cleanEmail, shownIds);
    return toShow;
  }

  // Queue newly unlocked achievements and immediately show their toasts.
  // Merges with any that are already waiting in localStorage.
  function queueAchievementUnlocks(email, newUnlocks) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail || !newUnlocks || !newUnlocks.length) { return []; }

    var key = pendingStorageKey(cleanEmail);
    var byId = {};

    // Load existing pending achievements.
    readListFromStorage(key).forEach(function (raw) {
      var a = cleanAchievement(raw);
      if (a) { byId[a.id] = a; }
    });

    // Merge in the new unlocks.
    var fresh = [];
    newUnlocks.forEach(function (raw) {
      var a = cleanAchievement(raw);
      if (!a) { return; }
      byId[a.id] = a;
      fresh.push(a);
    });

    localStorage.setItem(key, JSON.stringify(objectValues(byId)));
    if (fresh.length) { showAchievementPopups(cleanEmail, fresh); }
    return objectValues(byId);
  }

  // On page load, show any achievements that are still waiting in the queue.
  // This handles the case where a toast was queued on a different page.
  function showPendingAchievements() {
    try {
      var raw  = localStorage.getItem("netology_user") || localStorage.getItem("user") || "null";
      var user = JSON.parse(raw);
      var email = normaliseEmail((user && user.email) || "");
      if (!email) { return; }
      var pending = readListFromStorage(pendingStorageKey(email));
      if (pending.length) { showAchievementPopups(email, pending); }
    } catch (e) {
      // Ignore storage errors — achievements are non-critical.
    }
  }

  // Expose the achievement queue so page scripts can push new unlocks into it.
  window.NetologyAchievements = { queueUnlocks: queueAchievementUnlocks };

  // ── Shared Nav: Sidebar, Dropdown, Logout, User Display ─────────────────────

  // Wire up the slide-in sidebar that appears on smaller screens.
  // The backdrop click and Escape key both close it.
  function setupSlideSidebar() {
    var openBtn  = document.getElementById("openSidebarBtn");
    var closeBtn = document.getElementById("closeSidebarBtn");
    var sidebar  = document.getElementById("slideSidebar");
    var backdrop = document.getElementById("sideBackdrop");
    if (!sidebar) { return; }

    function openSidebar() {
      sidebar.classList.add("is-open");
      sidebar.setAttribute("aria-hidden", "false");
      sidebar.removeAttribute("inert");
      if (backdrop) {
        backdrop.classList.add("is-open");
        backdrop.setAttribute("aria-hidden", "false");
      }
      document.body.classList.add("net-noscroll");
    }

    function closeSidebar() {
      sidebar.classList.remove("is-open");
      sidebar.setAttribute("aria-hidden", "true");
      sidebar.setAttribute("inert", "");
      if (backdrop) {
        backdrop.classList.remove("is-open");
        backdrop.setAttribute("aria-hidden", "true");
      }
      document.body.classList.remove("net-noscroll");
    }

    if (openBtn)  { openBtn.addEventListener("click", openSidebar); }
    if (closeBtn) { closeBtn.addEventListener("click", closeSidebar); }
    if (backdrop) { backdrop.addEventListener("click", closeSidebar); }

    // Close with the Escape key as well for accessibility.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sidebar.classList.contains("is-open")) {
        closeSidebar();
      }
    });
  }

  // Wire up the user dropdown menu in the top nav bar.
  // Clicking outside it or pressing Escape will close it.
  function setupUserDropdownMenu() {
    var btn  = document.getElementById("userBtn");
    var menu = document.getElementById("userDropdown");
    if (!btn || !menu) { return; }

    function setOpen(isOpen) {
      menu.classList.toggle("is-open", isOpen);
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      menu.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!menu.classList.contains("is-open"));
    });

    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { setOpen(false); }
    });

    setOpen(false);
  }

  // Wire up logout buttons. Clears local storage and sends the user to the
  // landing page. Both the top nav button and the sidebar button call this.
  function setupLogoutButtons() {
    function doLogout() {
      localStorage.removeItem("netology_user");
      localStorage.removeItem("user");
      localStorage.removeItem("netology_token");
      window.location.href = "index.html";
    }

    var top  = document.getElementById("topLogoutBtn");
    var side = document.getElementById("sideLogoutBtn");
    if (top)  { top.addEventListener("click",  doLogout); }
    if (side) { side.addEventListener("click", doLogout); }
  }

  // Populate every nav element that shows the current user's name, avatar
  // initial, level, rank, and XP progress. Called once on load and again
  // after a fresh user fetch from the server.
  function displayNavUser(userData) {
    if (!userData) {
      try {
        var raw = localStorage.getItem("netology_user") || localStorage.getItem("user");
        userData = raw ? JSON.parse(raw) : null;
      } catch (e) { return; }
    }
    if (!userData) { return; }

    var name    = userData.first_name
      ? (userData.first_name + " " + (userData.last_name || "")).trim()
      : (userData.username || userData.name || "Student");
    var initial = (name.charAt(0) || "S").toUpperCase();

    // Use the shared XP module to resolve progress fields.
    var XP       = window.NetologyXP || null;
    var resolved = (XP && XP.resolveUserProgress) ? XP.resolveUserProgress(userData) : null;

    var level  = resolved ? Number(resolved.level || 1)              : Number(userData.numeric_level || 1);
    var rank   = resolved ? String(resolved.rank || "Novice")        : String(userData.rank || userData.level || "Novice");
    var xpIn   = resolved ? Number(resolved.xpIntoLevel || 0)        : Number(userData.xp_into_level || 0);
    var xpMax  = resolved ? Number(resolved.nextLevelXp || 100)      : Number(userData.next_level_xp || 100);
    var pct    = xpMax > 0 ? Math.min(100, Math.round(xpIn / xpMax * 100)) : 0;

    // Helper to set text or width on an element by ID without null checks everywhere.
    function setText(id, val)  { var el = document.getElementById(id); if (el) { el.textContent = val; } }
    function setWidth(id, val) { var el = document.getElementById(id); if (el) { el.style.width  = val; } }

    setText("topAvatar",     initial);
    setText("ddAvatar",      initial);
    setText("ddName",        name);
    setText("ddEmail",       userData.email || "");
    setText("ddLevel",       "Level " + level);
    setText("ddRank",        rank);
    setText("sideAvatar",    initial);
    setText("sideUserName",  name);
    setText("sideUserEmail", userData.email || "");
    setText("sideLevelBadge", "Lv " + level);
    setWidth("sideXpBar",    pct + "%");
    setText("sideXpText",    xpIn + "/" + xpMax + " XP");
    setText("sideXpHint",    Math.max(0, xpMax - xpIn) + " XP to next level");
    setText("profileAvatar", initial);
  }

  // Expose nav helpers so page scripts can re-run displayNavUser after
  // fetching fresh user data from the server.
  window.NetologyNav         = { displayNavUser: displayNavUser };
  window.setupSlideSidebar   = setupSlideSidebar;
  window.setupUserDropdownMenu = setupUserDropdownMenu;
  window.setupLogoutButtons  = setupLogoutButtons;

  // Run all shared setup once the DOM is ready.
  function onDomReady() {
    showPendingAchievements();
    setupSlideSidebar();
    setupUserDropdownMenu();
    setupLogoutButtons();
    displayNavUser(null);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onDomReady, { once: true });
  } else {
    onDomReady();
  }

  // ── Login Day Tracking ───────────────────────────────────────────────────────

  // These local references are intentionally separate from the top of the
  // IIFE — they alias the globals so the login tracking functions below do
  // not need to reach up to window every time.
  var API_BASE  = String(window.API_BASE || "").replace(/\/$/, "");
  var ENDPOINTS = window.ENDPOINTS || {};
  var XP        = window.NetologyXP || null;

  // localStorage key that stores the list of login dates for a user.
  function loginLogStorageKey(email) {
    return "netology_login_log:" + email;
  }

  // Build a full API URL from a relative path.
  function buildFullUrl(path) {
    return API_BASE ? API_BASE + path : path;
  }

  // Read the login date log for a user from localStorage.
  function readLoginLog(email) {
    try {
      return JSON.parse(localStorage.getItem(loginLogStorageKey(email)) || "[]");
    } catch (e) {
      return [];
    }
  }

  // Save the login date log back to localStorage.
  function saveLoginLog(email, log) {
    localStorage.setItem(loginLogStorageKey(email), JSON.stringify(log));
  }

  // Safely parse a JSON string, returning a fallback value on failure.
  function parseJsonSafe(jsonString, fallback) {
    try {
      var value = JSON.parse(jsonString);
      return value === null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  // Return today's date as a YYYY-MM-DD string.
  function getTodayString() {
    return new Date().toISOString().slice(0, 10);
  }

  // Update the user's XP in localStorage after earning achievement bonus XP.
  function updateLocalXp(email, amount) {
    if (!amount) { return; }
    ["user", "netology_user"].forEach(function (key) {
      var user = parseJsonSafe(localStorage.getItem(key), null);
      if (!user || normaliseEmail(user.email) !== normaliseEmail(email)) { return; }
      var updated = (XP && XP.applyXpToUser)
        ? XP.applyXpToUser(user, amount)
        : Object.assign({}, user, { xp: Math.max(0, Number(user.xp || 0) + amount) });
      localStorage.setItem(key, JSON.stringify(updated));
    });
  }

  // POST today's login to the backend. If the server responds with newly
  // unlocked achievements or bonus XP, process them locally.
  function syncLoginWithServer(email) {
    if (!API_BASE) { return; }
    var path = (ENDPOINTS.auth && ENDPOINTS.auth.recordLogin) || "/record-login";
    fetch(buildFullUrl(path), {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: email })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data || !data.success) { return; }

      // Replace the local login log with the server's version if provided.
      if (Array.isArray(data.log) && data.log.length) {
        saveLoginLog(email, data.log);
      }

      // Queue any achievements the server unlocked as a result of this login.
      var unlocks = Array.isArray(data.newly_unlocked) ? data.newly_unlocked : [];
      if (unlocks.length && window.NetologyAchievements) {
        window.NetologyAchievements.queueUnlocks(email, unlocks);
      }

      // Apply any XP awarded alongside the achievements.
      var bonusXp = Number(data.achievement_xp_added || 0);
      if (bonusXp > 0) { updateLocalXp(email, bonusXp); }
    })
    .catch(function () {});
  }

  // Record today's login date locally and sync with the server.
  // Called by login.js when a user signs in successfully.
  function recordLoginDay(email) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail) { return []; }

    var log   = readLoginLog(cleanEmail);
    var today = getTodayString();

    // Only add today if it is not already in the log.
    if (!arrayContains(log, today)) {
      log.push(today);
      log.sort();
      saveLoginLog(cleanEmail, log);
    }

    syncLoginWithServer(cleanEmail);
    return log;
  }

  // Expose login tracking globally.
  window.recordLoginDay = recordLoginDay;

  // Return the full login date history for a user.
  window.getLoginLog = function (email) {
    var cleanEmail = normaliseEmail(email);
    return cleanEmail ? readLoginLog(cleanEmail) : [];
  };

  // ── Generic API Helper ───────────────────────────────────────────────────────

  // Make a GET request to the API and return the parsed JSON response.
  // Accepts an optional params object that is appended as query string values.
  window.apiGet = async function apiGet(path, params) {
    var base = String(window.API_BASE || "").replace(/\/$/, "");
    var url  = base
      ? new URL(base + path)
      : new URL(path, window.location.origin);

    if (params && typeof params === "object") {
      Object.keys(params).forEach(function (k) {
        var v = params[k];
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      });
    }

    var response = await fetch(url.toString());
    return response.json();
  };

}());
