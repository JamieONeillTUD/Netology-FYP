/* app.js - shared globals loaded on every page */

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
      forgotPassword: "/forgot-password"
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
      level++;
      needed += 100;
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
    if (validLevel >= 5) return "Advanced";
    if (validLevel >= 3) return "Intermediate";
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

  // local storage keys for achievement tracking
  function pendingStorageKey(email) {
    return "netology_achievement_pending:" + normaliseEmail(email);
  }

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

  // clean and validate a raw achievement object
  function cleanAchievement(rawAchievement) {
    if (!rawAchievement || typeof rawAchievement !== "object") return null;
    var achievementId = String(rawAchievement.id || "").trim();
    if (!achievementId) return null;
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
    return cleanEmail ? readListFromStorage(seenStorageKey(cleanEmail)).map(String) : [];
  }

  // mark achievement ids as seen so they wont show again
  function markAchievementsSeen(email, achievementIds) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail) return;
    var seenSet = new Set(getSeenAchievementIds(cleanEmail));
    achievementIds.forEach(function (id) {
      var trimmedId = String(id || "").trim();
      if (trimmedId) seenSet.add(trimmedId);
    });
    localStorage.setItem(seenStorageKey(cleanEmail), JSON.stringify([].concat(Array.from(seenSet))));
  }

  // remove specific achievements from the pending queue
  function removePendingAchievements(email, achievementIds) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail || !achievementIds || !achievementIds.length) return;
    var idsToRemove = new Set(
      achievementIds.map(function (id) { return String(id || "").trim(); }).filter(Boolean)
    );
    if (!idsToRemove.size) return;
    var key = pendingStorageKey(cleanEmail);
    var remaining = readListFromStorage(key).filter(function (achievement) {
      return achievement && achievement.id && !idsToRemove.has(String(achievement.id).trim());
    });
    if (remaining.length) localStorage.setItem(key, JSON.stringify(remaining));
    else localStorage.removeItem(key);
  }

  // show toast popups for newly earned achievements
  function showAchievementPopups(email, achievements) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail || !achievements || !achievements.length || !document.body) return [];
    var alreadySeen = new Set(getSeenAchievementIds(cleanEmail));
    var queued = new Set();
    var toShow = [];
    achievements.forEach(function (rawAchievement) {
      var achievement = cleanAchievement(rawAchievement);
      if (!achievement || alreadySeen.has(achievement.id) || queued.has(achievement.id)) return;
      queued.add(achievement.id);
      toShow.push(achievement);
    });
    if (!toShow.length) return [];

    // show each achievement with a slight delay between them
    toShow.forEach(function (achievement, index) {
      setTimeout(function () {
        if (window.NetologyToast && window.NetologyToast.showAchievementToast) {
          window.NetologyToast.showAchievementToast(achievement);
        } else if (window.NetologyToast && window.NetologyToast.showMessageToast) {
          window.NetologyToast.showMessageToast(achievement.name + " unlocked", "success", 3200);
        } else {
          alert(achievement.name + " unlocked");
        }
      }, index * 220);
    });

    // mark these as seen and remove from pending
    var shownIds = toShow.map(function (achievement) { return achievement.id; });
    markAchievementsSeen(cleanEmail, shownIds);
    removePendingAchievements(cleanEmail, shownIds);
    return toShow;
  }

  // queue new achievement unlocks and show popups for them
  function queueAchievementUnlocks(email, newUnlocks) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail || !newUnlocks || !newUnlocks.length) return [];
    var key = pendingStorageKey(cleanEmail);
    var achievementsById = new Map();
    var newAchievements = [];

    // load existing pending achievements
    readListFromStorage(key).forEach(function (rawAchievement) {
      var achievement = cleanAchievement(rawAchievement);
      if (achievement) achievementsById.set(achievement.id, achievement);
    });

    // merge in new unlocks
    newUnlocks.forEach(function (rawAchievement) {
      var achievement = cleanAchievement(rawAchievement);
      if (!achievement) return;
      achievementsById.set(achievement.id, achievement);
      newAchievements.push(achievement);
    });

    // save merged list and show popups for new ones
    localStorage.setItem(key, JSON.stringify(Array.from(achievementsById.values())));
    if (newAchievements.length) showAchievementPopups(cleanEmail, newAchievements);
    return Array.from(achievementsById.values());
  }

  // show any pending achievement popups on page load
  function showPendingAchievements() {
    try {
      var rawUser = localStorage.getItem("netology_user") || localStorage.getItem("user") || "null";
      var user = JSON.parse(rawUser);
      var email = normaliseEmail(user && user.email || "");
      if (!email) return;
      var pending = readListFromStorage(pendingStorageKey(email));
      if (pending.length) showAchievementPopups(email, pending);
    } catch (error) {
      // ignore errors reading from storage
    }
  }

  // expose achievement functions globally
  window.NetologyAchievements = { queueUnlocks: queueAchievementUnlocks };

  // show pending achievements once dom is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showPendingAchievements, { once: true });
  } else {
    showPendingAchievements();
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
    return today.getFullYear()
      + "-" + String(today.getMonth() + 1).padStart(2, "0")
      + "-" + String(today.getDate()).padStart(2, "0");
  }

  // update the users xp in local storage
  function updateLocalXp(email, amount) {
    if (!amount) return;
    ["user", "netology_user"].forEach(function (storageKey) {
      var user = parseJsonSafe(localStorage.getItem(storageKey), null);
      if (!user || normaliseEmail(user.email) !== normaliseEmail(email)) return;
      var updated = (XP && XP.applyXpToUser)
        ? XP.applyXpToUser(user, amount)
        : Object.assign({}, user, { xp: Math.max(0, Number(user.xp || 0) + amount) });
      localStorage.setItem(storageKey, JSON.stringify(updated));
    });
  }

  // send login record to the server and handle response
  function syncLoginWithServer(email) {
    if (!API_BASE) return;
    var path = (ENDPOINTS.auth && ENDPOINTS.auth.recordLogin) || "/record-login";
    fetch(buildFullUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email })
    })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (!data || !data.success) return;

      // update local login log if server has data
      if (Array.isArray(data.log) && data.log.length) saveLoginLog(email, data.log);

      // queue any newly unlocked achievements
      var unlocks = Array.isArray(data.newly_unlocked) ? data.newly_unlocked : [];
      if (unlocks.length && window.NetologyAchievements) {
        window.NetologyAchievements.queueUnlocks(email, unlocks);
      }

      // add any bonus xp from achievements
      var bonusXp = Number(data.achievement_xp_added || 0);
      if (bonusXp > 0) updateLocalXp(email, bonusXp);
    })
    .catch(function () {});
  }

  // record todays login and sync with server
  function recordLoginDay(email) {
    var cleanEmail = normaliseEmail(email);
    if (!cleanEmail) return [];
    var log = readLoginLog(cleanEmail);
    var today = getTodayString();
    if (!log.includes(today)) {
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
      Object.entries(params).forEach(function (pair) {
        if (pair[1] !== undefined && pair[1] !== null && pair[1] !== "") {
          url.searchParams.set(pair[0], String(pair[1]));
        }
      });
    }
    var response = await fetch(url.toString());
    return response.json();
  };

}());
