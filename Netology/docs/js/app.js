/*
  app.js — Shared config loaded on every page.

  This file exists because the frontend (GitHub Pages) and backend (Render)
  live on different domains. Every page needs the API base URL, the list of
  backend routes, the XP maths, achievement popups, login-day tracking, and
  a shared GET helper. Instead of duplicating all of that in every page
  script, this single file sets it up once on window and every other script
  just reads the globals it needs.

  Globals created:
    window.API_BASE              – backend URL string
    window.ENDPOINTS             – every backend route path
    window.NetologyXP            – XP / level / rank maths
    window.NetologyAchievements  – achievement popup queue
    window.recordLoginDay        – logs today's login + syncs to server
    window.getLoginLog           – reads the saved login dates
    window.apiGet                – shared fetch-GET helper
*/


// ── API base URL ──────────────────────────────────────────────────────
// Set window.API_BASE before this script runs to override the default.

(function () {
  "use strict";
  var raw = String(window.API_BASE || "").trim();
  window.API_BASE = raw ? raw.replace(/\/$/, "") : "https://netology-fyp.onrender.com";
}());


// ── Backend routes ────────────────────────────────────────────────────
// Every other file reads window.ENDPOINTS.section.name so routes are
// defined in one place and never hard-coded elsewhere.

window.ENDPOINTS = {
  auth: {
    register:       "/register",
    login:          "/login",
    userInfo:       "/user-info",
    awardXp:        "/award-xp",
    recordLogin:    "/record-login",
    forgotPassword: "/forgot-password"
  },
  onboarding: {
    start:        "/api/onboarding/start",
    complete:     "/api/onboarding/complete",
    skip:         "/api/onboarding/skip",
    steps:        "/api/onboarding/steps",
    step:         "/api/onboarding/step/:stageId",
    stepComplete: "/api/onboarding/step/:id"
  },
  courses: {
    list:                "/courses",
    courseDetails:        "/course",
    userCourses:         "/user-courses",
    userCourseStatus:    "/user-course-status",
    userProgressSummary: "/user-progress-summary",
    completeLesson:      "/complete-lesson",
    completeQuiz:        "/complete-quiz",
    completeChallenge:   "/complete-challenge"
  },
  progress: {
    userActivity: "/api/user/activity",
    userStreaks:   "/api/user/streaks"
  },
  challenges: {
    list: "/api/user/challenges"
  },
  achievements: {
    list: "/api/user/achievements"
  },
  sandbox: {
    lessonSessionSave: "/lesson-session/save",
    lessonSessionLoad: "/lesson-session/load",
    saveTopology:      "/save-topology",
    loadTopologies:    "/load-topologies",
    loadTopology:      "/load-topology/:topologyId",
    deleteTopology:    "/delete-topology/:topologyId"
  },
  health: {
    check: "/healthz"
  }
};


// ── XP and level maths ───────────────────────────────────────────────
// Exposed as window.NetologyXP so dashboard, progress, account, courses,
// lesson, quiz, sandbox and onboarding can all calculate levels and ranks
// without duplicating the formulas.

(function () {
  "use strict";
  if (window.NetologyXP) return;

  // Safe integer parse — returns fallback when the value is not a number.
  function safeInt(value, fallback) {
    var n = parseInt(value, 10);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  // Makes sure a level is at least 1.
  function safeLevel(level) {
    return Math.max(1, safeInt(level, 1));
  }

  // Total XP needed to reach a given level (level 1 = 0, level 2 = 100, level 3 = 300 …).
  function totalXpForLevel(level) {
    var l = safeLevel(level);
    return (100 * (l - 1) * l) / 2;
  }

  // Works out what level you are from your total XP.
  function levelFromTotalXp(xp) {
    var remaining = Math.max(0, safeInt(xp, 0));
    var level  = 1;
    var needed = 100;
    while (remaining >= needed) {
      remaining -= needed;
      level++;
      needed += 100;
    }
    return level;
  }

  // How much XP is required to go from this level to the next one.
  function xpForNextLevel(level) {
    return 100 * safeLevel(level);
  }

  // Returns the rank name for a level number.
  function rankForLevel(level) {
    var l = safeLevel(level);
    if (l >= 5) return "Advanced";
    if (l >= 3) return "Intermediate";
    return "Novice";
  }

  // Full progress breakdown from a total XP number.
  function getLevelProgress(xp) {
    var total    = Math.max(0, safeInt(xp, 0));
    var level    = levelFromTotalXp(total);
    var xpInto   = Math.max(0, total - totalXpForLevel(level));
    var xpNeeded = xpForNextLevel(level);
    return {
      level:           level,
      totalXp:         total,
      xpIntoLevel:     xpInto,
      nextLevelXp:     xpNeeded,
      toNextXp:        Math.max(0, xpNeeded - xpInto),
      progressPercent: Math.max(0, Math.min(100, Math.round((xpInto / Math.max(xpNeeded, 1)) * 100)))
    };
  }

  // Adds XP to a user object and returns a new copy with updated fields.
  function applyXpToUser(user, delta) {
    var base = (user && typeof user === "object") ? user : {};
    var p = getLevelProgress(Math.max(0, safeInt(base.xp, 0)) + Math.max(0, safeInt(delta, 0)));
    return Object.assign({}, base, {
      xp:            p.totalXp,
      numeric_level: p.level,
      xp_into_level: p.xpIntoLevel,
      next_level_xp: p.nextLevelXp,
      level:         rankForLevel(p.level),
      rank:          rankForLevel(p.level)
    });
  }

  // Trusts the server's level values when they match the XP total, otherwise
  // recalculates everything locally so the UI never shows stale numbers.
  function resolveUserProgress(user) {
    var base     = (user && typeof user === "object") ? user : {};
    var total    = Math.max(0, safeInt(base.xp, 0));
    var computed = getLevelProgress(total);

    var serverLevel  = safeLevel(safeInt(base.numeric_level, computed.level));
    var serverInto   = Math.max(0, safeInt(base.xp_into_level, computed.xpIntoLevel));
    var serverNeeded = Math.max(0, safeInt(base.next_level_xp, computed.nextLevelXp));

    // Check if the server numbers are consistent with the XP total.
    var serverOk = serverNeeded > 0
      && Math.abs(totalXpForLevel(serverLevel) + serverInto - total) <= 1;

    if (serverOk) {
      return {
        level:           serverLevel,
        totalXp:         total,
        xpIntoLevel:     serverInto,
        nextLevelXp:     serverNeeded,
        toNextXp:        Math.max(0, serverNeeded - serverInto),
        progressPercent: Math.max(0, Math.min(100, Math.round((serverInto / serverNeeded) * 100))),
        rank:            rankForLevel(serverLevel)
      };
    }

    return Object.assign({}, computed, { rank: rankForLevel(computed.level) });
  }

  window.NetologyXP = {
    totalXpForLevel:     totalXpForLevel,
    levelFromTotalXp:    levelFromTotalXp,
    xpForNextLevel:      xpForNextLevel,
    rankForLevel:        rankForLevel,
    getLevelProgress:     getLevelProgress,
    applyXpToUser:       applyXpToUser,
    resolveUserProgress: resolveUserProgress
  };
}());


// ── Achievement popups ───────────────────────────────────────────────
// Exposed as window.NetologyAchievements.
// When the backend says a user unlocked something, queueUnlocks() saves it
// to localStorage and shows a toast. If the page reloads before the toast
// fires, showPending() picks it up on the next page load.

(function () {
  "use strict";
  if (window.NetologyAchievements) return;

  function normalise(email) {
    return String(email || "").trim().toLowerCase();
  }

  function pendingKey(email) { return "netology_achievement_pending:" + normalise(email); }
  function seenKey(email)    { return "netology_achievement_seen:" + normalise(email); }

  // Reads a JSON array from localStorage, returns [] on failure.
  function readList(key) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  // Normalises a raw achievement object into a consistent shape.
  function clean(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    if (!id) return null;
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

  function getSeenIds(email) {
    var e = normalise(email);
    return e ? readList(seenKey(e)).map(String) : [];
  }

  function markSeen(email, ids) {
    var e = normalise(email);
    if (!e) return;
    var seen = new Set(getSeenIds(e));
    ids.forEach(function (id) {
      var s = String(id || "").trim();
      if (s) seen.add(s);
    });
    localStorage.setItem(seenKey(e), JSON.stringify([].concat(Array.from(seen))));
  }

  function removePending(email, ids) {
    var e = normalise(email);
    if (!e || !ids || !ids.length) return;
    var drop = new Set(ids.map(function (id) { return String(id || "").trim(); }).filter(Boolean));
    if (!drop.size) return;
    var key  = pendingKey(e);
    var kept = readList(key).filter(function (a) {
      return a && a.id && !drop.has(String(a.id).trim());
    });
    if (kept.length) localStorage.setItem(key, JSON.stringify(kept));
    else localStorage.removeItem(key);
  }

  // Shows toast popups for achievements the user hasn't seen yet.
  function showPopups(email, achievements) {
    var e = normalise(email);
    if (!e || !achievements || !achievements.length || !document.body) return [];

    var seen   = new Set(getSeenIds(e));
    var queued = new Set();
    var batch  = [];

    achievements.forEach(function (raw) {
      var a = clean(raw);
      if (!a || seen.has(a.id) || queued.has(a.id)) return;
      queued.add(a.id);
      batch.push(a);
    });

    if (!batch.length) return [];

    batch.forEach(function (a, i) {
      setTimeout(function () {
        if (window.NetologyToast && window.NetologyToast.showAchievementToast) {
          window.NetologyToast.showAchievementToast(a);
        } else if (window.NetologyToast && window.NetologyToast.showMessageToast) {
          window.NetologyToast.showMessageToast(a.name + " unlocked", "success", 3200);
        } else {
          alert(a.name + " unlocked");
        }
      }, i * 220);
    });

    var shownIds = batch.map(function (a) { return a.id; });
    markSeen(e, shownIds);
    removePending(e, shownIds);
    return batch;
  }

  // Saves new unlocks to localStorage and shows their popups immediately.
  function queueUnlocks(email, newUnlocks) {
    var e = normalise(email);
    if (!e || !newUnlocks || !newUnlocks.length) return [];

    var key     = pendingKey(e);
    var byId    = new Map();
    var incoming = [];

    readList(key).forEach(function (raw) {
      var a = clean(raw);
      if (a) byId.set(a.id, a);
    });

    newUnlocks.forEach(function (raw) {
      var a = clean(raw);
      if (!a) return;
      byId.set(a.id, a);
      incoming.push(a);
    });

    localStorage.setItem(key, JSON.stringify(Array.from(byId.values())));
    if (incoming.length) showPopups(e, incoming);
    return Array.from(byId.values());
  }

  // On page load, show any popups that were queued but not yet displayed.
  function showPending() {
    try {
      var raw  = localStorage.getItem("netology_user") || localStorage.getItem("user") || "null";
      var user = JSON.parse(raw);
      var email = normalise(user && user.email || "");
      if (!email) return;
      var pending = readList(pendingKey(email));
      if (pending.length) showPopups(email, pending);
    } catch (e) { /* ignore */ }
  }

  window.NetologyAchievements = { queueUnlocks: queueUnlocks };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showPending, { once: true });
  } else {
    showPending();
  }
}());


// ── Login-day tracking ───────────────────────────────────────────────
// Exposed as window.recordLoginDay and window.getLoginLog.
// Records today's date locally and syncs to the server, which can award
// streak XP and unlock achievements like "7-day streak".

(function () {
  "use strict";

  var API_BASE  = String(window.API_BASE || "").replace(/\/$/, "");
  var ENDPOINTS = window.ENDPOINTS || {};
  var XP        = window.NetologyXP || null;

  function normalise(email) {
    return String(email || "").trim().toLowerCase();
  }

  function logKey(email)  { return "netology_login_log:" + email; }
  function fullUrl(path)  { return API_BASE ? API_BASE + path : path; }

  function readLog(email) {
    try { return JSON.parse(localStorage.getItem(logKey(email)) || "[]"); }
    catch (e) { return []; }
  }

  function saveLog(email, log) {
    localStorage.setItem(logKey(email), JSON.stringify(log));
  }

  function safeJson(str, fallback) {
    try { var v = JSON.parse(str); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  }

  function todayString() {
    var d = new Date();
    return d.getFullYear()
      + "-" + String(d.getMonth() + 1).padStart(2, "0")
      + "-" + String(d.getDate()).padStart(2, "0");
  }

  // Updates the XP stored in localStorage after the server awards bonus XP.
  function bumpLocalXp(email, amount) {
    if (!amount) return;
    ["user", "netology_user"].forEach(function (key) {
      var user = safeJson(localStorage.getItem(key), null);
      if (!user || normalise(user.email) !== normalise(email)) return;
      var updated = (XP && XP.applyXpToUser)
        ? XP.applyXpToUser(user, amount)
        : Object.assign({}, user, { xp: Math.max(0, Number(user.xp || 0) + amount) });
      localStorage.setItem(key, JSON.stringify(updated));
    });
  }

  // Posts today's login to the server and handles the response.
  function syncWithServer(email) {
    if (!API_BASE) return;
    var path = (ENDPOINTS.auth && ENDPOINTS.auth.recordLogin) || "/record-login";

    fetch(fullUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data || !data.success) return;
      if (Array.isArray(data.log) && data.log.length) saveLog(email, data.log);
      var unlocks = Array.isArray(data.newly_unlocked) ? data.newly_unlocked : [];
      if (unlocks.length && window.NetologyAchievements) {
        window.NetologyAchievements.queueUnlocks(email, unlocks);
      }
      var bonusXp = Number(data.achievement_xp_added || 0);
      if (bonusXp > 0) bumpLocalXp(email, bonusXp);
    })
    .catch(function () { /* server unreachable — local record is enough */ });
  }

  // Records today's date and syncs to the server.
  function recordLoginDay(email) {
    var e = normalise(email);
    if (!e) return [];
    var log   = readLog(e);
    var today = todayString();
    if (!log.includes(today)) {
      log.push(today);
      log.sort();
      saveLog(e, log);
    }
    syncWithServer(e);
    return log;
  }

  window.recordLoginDay = recordLoginDay;

  window.getLoginLog = function (email) {
    var e = normalise(email);
    return e ? readLog(e) : [];
  };
}());


// ── Shared GET helper ────────────────────────────────────────────────
// Used by dashboard, courses, course, progress, sandbox-core, onboarding.
// Builds a full URL from API_BASE + path, appends query params, and
// returns the parsed JSON response.

window.apiGet = async function apiGet(path, params) {
  var base = String(window.API_BASE || "").replace(/\/$/, "");
  var url  = base
    ? new URL(base + path)
    : new URL(path, window.location.origin);

  if (params && typeof params === "object") {
    Object.entries(params).forEach(function (pair) {
      var key = pair[0];
      var val = pair[1];
      if (val !== undefined && val !== null && val !== "") {
        url.searchParams.set(key, String(val));
      }
    });
  }

  var res = await fetch(url.toString());
  return res.json();
};
