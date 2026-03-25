// app.js — Shared globals loaded on every page.

(function () {
  "use strict";

  // set the api base url, fallback to render hosted backend
  var rawBase = String(window.API_BASE || "").trim();
  window.API_BASE = rawBase ? rawBase.replace(/\/$/, "") : "https://netology-fyp.onrender.com";

  // all api endpoint paths used across the app
  window.ENDPOINTS = {
    auth: {
      register: "/register",
      login: "/login",
      userInfo: "/user-info",
      recordLogin: "/record-login",
      forgotPassword: "/forgot-password",
      deleteAccount: "/delete-account"
    },
    onboarding: {
      start: "/api/onboarding/start",
      complete: "/api/onboarding/complete",
      skip: "/api/onboarding/skip",
      steps: "/api/onboarding/steps",
      stepComplete: "/api/onboarding/step/:id"
    },
    courses: {
      list: "/courses",
      courseDetails: "/course",
      userCourses: "/user-courses",
      userCourseStatus: "/user-course-status",
      userProgressSummary: "/user-progress-summary",
      completeLesson: "/complete-lesson",
      completeQuiz: "/complete-quiz",
      completeChallenge: "/complete-challenge"
    },
    progress: {
      userActivity: "/api/user/activity",
      userStreaks: "/api/user/streaks"
    },
    challenges: { list: "/api/user/challenges" },
    achievements: { list: "/api/user/achievements" },
    sandbox: {
      lessonSessionSave: "/lesson-session/save",
      lessonSessionLoad: "/lesson-session/load",
      saveTopology: "/save-topology",
      loadTopologies: "/load-topologies",
      loadTopology: "/load-topology/:topologyId",
      deleteTopology: "/delete-topology/:topologyId"
    }
  };

  // parse a value as an integer, return fallback if invalid
  function parseIntSafe(value, fallback) {
    var number = parseInt(value, 10);
    return Number.isFinite(number) ? number : (fallback || 0);
  }

  // ensure a level is at least 1
  function ensureValidLevel(level) {
    return Math.max(1, parseIntSafe(level, 1));
  }

  // calculate cumulative xp needed to reach a given level
  function totalXpForLevel(level) {
    var validLevel = ensureValidLevel(level);
    return (100 * (validLevel - 1) * validLevel) / 2;
  }

  // figure out what level a user is based on their total xp
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

  // how much xp is needed to go from this level to the next
  function xpForNextLevel(level) {
    return 100 * ensureValidLevel(level);
  }

  // get the rank name based on a users level
  function rankForLevel(level) {
    var validLevel = ensureValidLevel(level);
    if (validLevel >= 5) {
      return "Advanced";
    }
    if (validLevel >= 3) {
      return "Intermediate";
    }
    return "Novice";
  }

  // get full level progress breakdown from total xp
  function getLevelProgress(xp) {
    var totalXp = Math.max(0, parseIntSafe(xp, 0));
    var level = levelFromTotalXp(totalXp);
    var xpIntoCurrentLevel = Math.max(0, totalXp - totalXpForLevel(level));
    var xpNeededForNext = xpForNextLevel(level);
    return {
      level: level,
      totalXp: totalXp,
      xpIntoLevel: xpIntoCurrentLevel,
      nextLevelXp: xpNeededForNext,
      toNextXp: Math.max(0, xpNeededForNext - xpIntoCurrentLevel),
      progressPercent: Math.max(0, Math.min(100, Math.round((xpIntoCurrentLevel / Math.max(xpNeededForNext, 1)) * 100)))
    };
  }

  // add xp to a user object and return updated copy
  function applyXpToUser(user, xpToAdd) {
    var userData = (user && typeof user === "object") ? user : {};
    var currentXp = Math.max(0, parseIntSafe(userData.xp, 0));
    var addedXp = Math.max(0, parseIntSafe(xpToAdd, 0));
    var progress = getLevelProgress(currentXp + addedXp);
    return Object.assign({}, userData, {
      xp: progress.totalXp,
      numeric_level: progress.level,
      xp_into_level: progress.xpIntoLevel,
      next_level_xp: progress.nextLevelXp,
      level: rankForLevel(progress.level),
      rank: rankForLevel(progress.level)
    });
  }

  // resolve user progress, preferring server values if they are valid
  function resolveUserProgress(user) {
    var userData = (user && typeof user === "object") ? user : {};
    var totalXp = Math.max(0, parseIntSafe(userData.xp, 0));
    var computed = getLevelProgress(totalXp);

    // check if server-provided values are consistent
    var serverLevel = ensureValidLevel(parseIntSafe(userData.numeric_level, computed.level));
    var serverXpInto = Math.max(0, parseIntSafe(userData.xp_into_level, computed.xpIntoLevel));
    var serverXpNeeded = Math.max(0, parseIntSafe(userData.next_level_xp, computed.nextLevelXp));
    var serverIsValid = serverXpNeeded > 0
      && Math.abs(totalXpForLevel(serverLevel) + serverXpInto - totalXp) <= 1;

    // use server values if they check out, otherwise use computed
    if (serverIsValid) {
      return {
        level: serverLevel,
        totalXp: totalXp,
        xpIntoLevel: serverXpInto,
        nextLevelXp: serverXpNeeded,
        toNextXp: Math.max(0, serverXpNeeded - serverXpInto),
        progressPercent: Math.max(0, Math.min(100, Math.round((serverXpInto / serverXpNeeded) * 100))),
        rank: rankForLevel(serverLevel)
      };
    }
    return Object.assign({}, computed, { rank: rankForLevel(computed.level) });
  }

  // expose xp functions globally
  window.NetologyXP = {
    totalXpForLevel: totalXpForLevel,
    levelFromTotalXp: levelFromTotalXp,
    xpForNextLevel: xpForNextLevel,
    rankForLevel: rankForLevel,
    getLevelProgress: getLevelProgress,
    applyXpToUser: applyXpToUser,
    resolveUserProgress: resolveUserProgress
  };

  // normalise an email to lowercase trimmed string
  function normaliseEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  // build the localStorage key for pending achievements
  function pendingStorageKey(email) {
    return "netology_achievement_pending:" + normaliseEmail(email);
  }

  // build the localStorage key for seen achievements
  function seenStorageKey(email) {
    return "netology_achievement_seen:" + normaliseEmail(email);
  }

  // read a json array from local storage safely
  function readListFromStorage(storageKey) {
    try {
      var value = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  // check if a string exists in an array
  function arrayContains(list, value) {
    for (var i = 0; i < list.length; i++) {
      if (list[i] === value) {
        return true;
      }
    }
    return false;
  }

  // check if a key exists in a plain object used as a set
  function objectHasKey(obj, key) {
    return obj.hasOwnProperty(key);
  }

  // get all values from a plain object used as a map
  function objectValues(obj) {
    var result = [];
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      result.push(obj[keys[i]]);
    }
    return result;
  }

  // clean and validate a raw achievement object
  function cleanAchievement(rawAchievement) {
    if (!rawAchievement || typeof rawAchievement !== "object") {
      return null;
    }
    var achievementId = String(rawAchievement.id || "").trim();
    if (!achievementId) {
      return null;
    }
    return {
      id: achievementId,
      name: String(rawAchievement.name || "Achievement"),
      description: String(rawAchievement.description || ""),
      icon: String(rawAchievement.icon || "bi-award-fill"),
      rarity: String(rawAchievement.rarity || "common"),
      xp_added: Number(rawAchievement.xp_added || rawAchievement.xp_awarded || 0),
      earned_at: rawAchievement.earned_at || new Date().toISOString()
    };
  }

  // get list of achievement ids the user has already seen
  function getSeenAchievementIds(email) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail) {
      return [];
    }
    var rawList = readListFromStorage(seenStorageKey(cleanEmail));
    var result = [];
    for (var i = 0; i < rawList.length; i++) {
      result.push(String(rawList[i]));
    }
    return result;
  }

  // mark achievement ids as seen so they wont show again
  function markAchievementsSeen(email, achievementIds) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail) {
      return;
    }
    var existingSeen = getSeenAchievementIds(cleanEmail);
    var seenLookup = {};
    for (var i = 0; i < existingSeen.length; i++) {
      seenLookup[existingSeen[i]] = true;
    }
    for (var j = 0; j < achievementIds.length; j++) {
      var trimmedId = String(achievementIds[j] || "").trim();
      if (trimmedId) {
        seenLookup[trimmedId] = true;
      }
    }
    localStorage.setItem(seenStorageKey(cleanEmail), JSON.stringify(Object.keys(seenLookup)));
  }

  // remove specific achievements from the pending queue
  function removePendingAchievements(email, achievementIds) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail || !achievementIds || !achievementIds.length) {
      return;
    }
    var idsToRemove = {};
    for (var i = 0; i < achievementIds.length; i++) {
      var trimmedId = String(achievementIds[i] || "").trim();
      if (trimmedId) {
        idsToRemove[trimmedId] = true;
      }
    }
    if (Object.keys(idsToRemove).length === 0) {
      return;
    }
    var key = pendingStorageKey(cleanEmail);
    var currentPending = readListFromStorage(key);
    var remaining = [];
    for (var r = 0; r < currentPending.length; r++) {
      var achievement = currentPending[r];
      if (achievement && achievement.id && !objectHasKey(idsToRemove, String(achievement.id).trim())) {
        remaining.push(achievement);
      }
    }
    if (remaining.length) {
      localStorage.setItem(key, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(key);
    }
  }

  // show toast popups for newly earned achievements
  function showAchievementPopups(email, achievements) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail || !achievements || !achievements.length || !document.body) {
      return [];
    }
    var seenIds = getSeenAchievementIds(cleanEmail);
    var alreadySeen = {};
    for (var s = 0; s < seenIds.length; s++) {
      alreadySeen[seenIds[s]] = true;
    }
    var queued = {};
    var toShow = [];
    for (var i = 0; i < achievements.length; i++) {
      var achievement = cleanAchievement(achievements[i]);
      if (!achievement || objectHasKey(alreadySeen, achievement.id) || objectHasKey(queued, achievement.id)) {
        continue;
      }
      queued[achievement.id] = true;
      toShow.push(achievement);
    }
    if (!toShow.length) {
      return [];
    }

    // show each achievement with a slight delay between them
    for (var t = 0; t < toShow.length; t++) {
      (function (achievementToShow, delayIndex) {
        setTimeout(function () {
          if (window.NetologyToast && window.NetologyToast.showAchievementToast) {
            window.NetologyToast.showAchievementToast(achievementToShow);
          } else if (window.NetologyToast && window.NetologyToast.showMessageToast) {
            window.NetologyToast.showMessageToast(achievementToShow.name + " unlocked", "success", 3200);
          } else {
            alert(achievementToShow.name + " unlocked");
          }
        }, delayIndex * 220);
      })(toShow[t], t);
    }

    // mark these as seen and remove from pending
    var shownIds = [];
    for (var m = 0; m < toShow.length; m++) {
      shownIds.push(toShow[m].id);
    }
    markAchievementsSeen(cleanEmail, shownIds);
    removePendingAchievements(cleanEmail, shownIds);
    return toShow;
  }

  // queue new achievement unlocks and show popups for them
  function queueAchievementUnlocks(email, newUnlocks) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail || !newUnlocks || !newUnlocks.length) {
      return [];
    }
    var key = pendingStorageKey(cleanEmail);
    var achievementsById = {};
    var newAchievements = [];

    // load existing pending achievements
    var existingPending = readListFromStorage(key);
    for (var e = 0; e < existingPending.length; e++) {
      var existing = cleanAchievement(existingPending[e]);
      if (existing) {
        achievementsById[existing.id] = existing;
      }
    }

    // merge in new unlocks
    for (var n = 0; n < newUnlocks.length; n++) {
      var newAchievement = cleanAchievement(newUnlocks[n]);
      if (!newAchievement) {
        continue;
      }
      achievementsById[newAchievement.id] = newAchievement;
      newAchievements.push(newAchievement);
    }

    // save merged list and show popups for new ones
    localStorage.setItem(key, JSON.stringify(objectValues(achievementsById)));
    if (newAchievements.length) {
      showAchievementPopups(cleanEmail, newAchievements);
    }
    return objectValues(achievementsById);
  }

  // show any pending achievement popups on page load
  function showPendingAchievements() {
    try {
      var rawUser = localStorage.getItem("netology_user") || localStorage.getItem("user") || "null";
      var user = JSON.parse(rawUser);
      var email = normaliseEmail((user && user.email) || "");
      if (!email) {
        return;
      }
      var pending = readListFromStorage(pendingStorageKey(email));
      if (pending.length) {
        showAchievementPopups(email, pending);
      }
    } catch (error) {
      // ignore errors reading from storage
    }
  }

  // expose achievement functions globally
  window.NetologyAchievements = { queueUnlocks: queueAchievementUnlocks };

  // ── shared nav: sidebar, dropdown, logout, user display ──────────────────

  function setupSlideSidebar() {
    var openBtn  = document.getElementById("openSidebarBtn");
    var closeBtn = document.getElementById("closeSidebarBtn");
    var sidebar  = document.getElementById("slideSidebar");
    var backdrop = document.getElementById("sideBackdrop");
    if (!sidebar) return;
    function open()  { sidebar.classList.add("is-open"); sidebar.setAttribute("aria-hidden","false"); if (backdrop) { backdrop.classList.add("is-open"); backdrop.setAttribute("aria-hidden","false"); } document.body.classList.add("net-noscroll"); }
    function close() { sidebar.classList.remove("is-open"); sidebar.setAttribute("aria-hidden","true"); if (backdrop) { backdrop.classList.remove("is-open"); backdrop.setAttribute("aria-hidden","true"); } document.body.classList.remove("net-noscroll"); }
    if (openBtn)  openBtn.addEventListener("click",  open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sidebar.classList.contains("is-open")) close(); });
  }

  function setupUserDropdownMenu() {
    var btn  = document.getElementById("userBtn");
    var menu = document.getElementById("userDropdown");
    if (!btn || !menu) return;

    function setOpenState(isOpen) {
      if (isOpen) {
        menu.classList.add("is-open");
      } else {
        menu.classList.remove("is-open");
      }
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      menu.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }

    function close() {
      setOpenState(false);
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = menu.classList.contains("is-open");
      setOpenState(!isOpen);
    });

    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        close();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        close();
      }
    });

    setOpenState(false);
  }

  function setupLogoutButtons() {
    function doLogout() { localStorage.removeItem("netology_user"); localStorage.removeItem("user"); localStorage.removeItem("netology_token"); window.location.href = "index.html"; }
    var top  = document.getElementById("topLogoutBtn");
    var side = document.getElementById("sideLogoutBtn");
    if (top)  top.addEventListener("click",  doLogout);
    if (side) side.addEventListener("click", doLogout);
  }

  function displayNavUser(userData) {
    if (!userData) {
      try { var raw = localStorage.getItem("netology_user") || localStorage.getItem("user"); userData = raw ? JSON.parse(raw) : null; } catch (e) { return; }
    }
    if (!userData) return;
    var name = userData.first_name ? (userData.first_name + " " + (userData.last_name || "")).trim() : (userData.username || userData.name || "Student");
    var initial = (name.charAt(0) || "S").toUpperCase();
    var XP = window.NetologyXP || null;
    var resolved = null;
    if (XP && typeof XP.resolveUserProgress === "function") {
      resolved = XP.resolveUserProgress(userData);
    }

    var level = resolved ? Number(resolved.level || 1) : Number(userData.numeric_level || 1);
    var rank = resolved
      ? String(resolved.rank || userData.rank || userData.level || "Novice")
      : String(userData.rank || userData.level || "Novice");
    var xpIn = resolved ? Number(resolved.xpIntoLevel || 0) : Number(userData.xp_into_level || 0);
    var xpMax = resolved ? Number(resolved.nextLevelXp || 100) : Number(userData.next_level_xp || 100);
    var pct   = xpMax > 0 ? Math.min(100, Math.round(xpIn / xpMax * 100)) : 0;
    function set(id, val)  { var el = document.getElementById(id); if (el) el.textContent = val; }
    function setW(id, val) { var el = document.getElementById(id); if (el) el.style.width  = val; }
    set("topAvatar", initial); set("ddAvatar", initial); set("ddName", name); set("ddEmail", userData.email || "");
    set("ddLevel", "Level " + level); set("ddRank", rank);
    set("sideAvatar", initial); set("sideUserName", name); set("sideUserEmail", userData.email || "");
    set("sideLevelBadge", "Lv " + level); setW("sideXpBar", pct + "%");
    set("sideXpText", xpIn + "/" + xpMax + " XP"); set("sideXpHint", Math.max(0, xpMax - xpIn) + " XP to next level");
    set("profileAvatar", initial);
  }

  // expose nav helpers globally so page scripts can refresh after server fetch
  window.NetologyNav = { displayNavUser: displayNavUser };
  window.setupSlideSidebar     = setupSlideSidebar;
  window.setupUserDropdownMenu = setupUserDropdownMenu;
  window.setupLogoutButtons    = setupLogoutButtons;

  // show pending achievements and wire up nav once dom is ready
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

  // local references for login tracking section
  var API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  var ENDPOINTS = window.ENDPOINTS || {};
  var XP = window.NetologyXP || null;

  // storage key for the users login history
  function loginLogStorageKey(email) {
    return "netology_login_log:" + email;
  }

  // build a full api url from a path
  function buildFullUrl(path) {
    return API_BASE ? API_BASE + path : path;
  }

  // read the login history from local storage
  function readLoginLog(email) {
    try {
      return JSON.parse(localStorage.getItem(loginLogStorageKey(email)) || "[]");
    } catch (error) {
      return [];
    }
  }

  // save login history to local storage
  function saveLoginLog(email, log) {
    localStorage.setItem(loginLogStorageKey(email), JSON.stringify(log));
  }

  // safely parse json with a fallback value
  function parseJsonSafe(jsonString, fallback) {
    try {
      var value = JSON.parse(jsonString);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  // get todays date as a yyyy-mm-dd string
  function getTodayString() {
    var today = new Date();
    var month = String(today.getMonth() + 1);
    var day = String(today.getDate());
    if (month.length < 2) {
      month = "0" + month;
    }
    if (day.length < 2) {
      day = "0" + day;
    }
    return today.getFullYear() + "-" + month + "-" + day;
  }

  // update the users xp in local storage
  function updateLocalXp(email, amount) {
    if (!amount) {
      return;
    }
    var storageKeys = ["user", "netology_user"];
    for (var i = 0; i < storageKeys.length; i++) {
      var user = parseJsonSafe(localStorage.getItem(storageKeys[i]), null);
      if (!user || normaliseEmail(user.email) !== normaliseEmail(email)) {
        continue;
      }
      var updated = (XP && XP.applyXpToUser)
        ? XP.applyXpToUser(user, amount)
        : Object.assign({}, user, { xp: Math.max(0, Number(user.xp || 0) + amount) });
      localStorage.setItem(storageKeys[i], JSON.stringify(updated));
    }
  }

  // send login record to the server and handle response
  function syncLoginWithServer(email) {
    if (!API_BASE) {
      return;
    }
    var path = (ENDPOINTS.auth && ENDPOINTS.auth.recordLogin) || "/record-login";
    fetch(buildFullUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email })
    })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (!data || !data.success) {
        return;
      }

      // update local login log if server has data
      if (Array.isArray(data.log) && data.log.length) {
        saveLoginLog(email, data.log);
      }

      // queue any newly unlocked achievements
      var unlocks = Array.isArray(data.newly_unlocked) ? data.newly_unlocked : [];
      if (unlocks.length && window.NetologyAchievements) {
        window.NetologyAchievements.queueUnlocks(email, unlocks);
      }

      // add any bonus xp from achievements
      var bonusXp = Number(data.achievement_xp_added || 0);
      if (bonusXp > 0) {
        updateLocalXp(email, bonusXp);
      }
    })
    .catch(function () {});
  }

  // record todays login and sync with server
  function recordLoginDay(email) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail) {
      return [];
    }
    var log = readLoginLog(cleanEmail);
    var today = getTodayString();
    if (!arrayContains(log, today)) {
      log.push(today);
      log.sort();
      saveLoginLog(cleanEmail, log);
    }
    syncLoginWithServer(cleanEmail);
    return log;
  }

  // expose login tracking globally
  window.recordLoginDay = recordLoginDay;

  // get login history for a user
  window.getLoginLog = function (email) {
    var cleanEmail = normaliseEmail(email);
    return cleanEmail ? readLoginLog(cleanEmail) : [];
  };

  // generic get request helper with query params
  window.apiGet = async function apiGet(path, params) {
    var base = String(window.API_BASE || "").replace(/\/$/, "");
    var url = base
      ? new URL(base + path)
      : new URL(path, window.location.origin);
    if (params && typeof params === "object") {
      var paramKeys = Object.keys(params);
      for (var i = 0; i < paramKeys.length; i++) {
        var paramValue = params[paramKeys[i]];
        if (paramValue !== undefined && paramValue !== null && paramValue !== "") {
          url.searchParams.set(paramKeys[i], String(paramValue));
        }
      }
    }
    var response = await fetch(url.toString());
    return response.json();
  };

}());
