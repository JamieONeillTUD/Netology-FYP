// app.js — shared config, endpoints, XP system, achievements, login tracking, and API helper

// production API base — set window.API_BASE before this script to override
(function () {
  "use strict";
  const base = String(window.API_BASE || "").trim();
  window.API_BASE = base ? base.replace(/\/$/, "") : "https://netology-fyp.onrender.com";
}());

// all backend routes in one place — other files read window.ENDPOINTS.section.name
window.ENDPOINTS = {
  auth: {
    register: "/register",
    login: "/login",
    userInfo: "/user-info",
    awardXp: "/award-xp",
    recordLogin: "/record-login",
    forgotPassword: "/forgot-password"
  },
  onboarding: {
    start: "/api/onboarding/start",
    complete: "/api/onboarding/complete",
    skip: "/api/onboarding/skip",
    steps: "/api/onboarding/steps",
    step: "/api/onboarding/step/:stageId"
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
  challenges: {
    list: "/api/user/challenges"
  },
  achievements: {
    list: "/api/user/achievements"
  },
  sandbox: {
    lessonSessionSave: "/lesson-session/save",
    lessonSessionLoad: "/lesson-session/load",
    saveTopology: "/save-topology",
    loadTopologies: "/load-topologies",
    loadTopology: "/load-topology/:topologyId",
    deleteTopology: "/delete-topology/:topologyId"
  },
  health: {
    check: "/healthz"
  }
};

// XP and level calculations — exposed as window.NetologyXP
(function () {
  "use strict";

  if (window.NetologyXP) return;

  function toInt(v, fallback) {
    if (fallback === undefined) fallback = 0;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function clampLevel(level) {
    return Math.max(1, toInt(level, 1));
  }

  // cumulative XP to reach a level (1=0, 2=100, 3=300 ...)
  function totalXpForLevel(level) {
    const l = clampLevel(level);
    return (100 * (l - 1) * l) / 2;
  }

  function levelFromTotalXp(xp) {
    let rem = Math.max(0, toInt(xp, 0));
    let level = 1;
    let needed = 100;
    while (rem >= needed) { rem -= needed; level++; needed += 100; }
    return level;
  }

  function xpForNextLevel(level) {
    return 100 * clampLevel(level);
  }

  function rankForLevel(level) {
    const l = clampLevel(level);
    if (l >= 5) return "Advanced";
    if (l >= 3) return "Intermediate";
    return "Novice";
  }

  function getLevelProgress(xp) {
    const total = Math.max(0, toInt(xp, 0));
    const level = levelFromTotalXp(total);
    const xpInto = Math.max(0, total - totalXpForLevel(level));
    const xpNeeded = xpForNextLevel(level);
    return {
      level,
      totalXp: total,
      xpIntoLevel: xpInto,
      nextLevelXp: xpNeeded,
      toNextXp: Math.max(0, xpNeeded - xpInto),
      progressPercent: Math.max(0, Math.min(100, Math.round((xpInto / Math.max(xpNeeded, 1)) * 100)))
    };
  }

  function applyXpToUser(user, delta) {
    const base = (user && typeof user === "object") ? user : {};
    const p = getLevelProgress(Math.max(0, toInt(base.xp, 0)) + Math.max(0, toInt(delta, 0)));
    return Object.assign({}, base, {
      xp: p.totalXp,
      numeric_level: p.level,
      xp_into_level: p.xpIntoLevel,
      next_level_xp: p.nextLevelXp,
      level: rankForLevel(p.level),
      rank: rankForLevel(p.level)
    });
  }

  // use server values if they match the XP total, otherwise recalculate locally
  function resolveUserProgress(user) {
    const base = (user && typeof user === "object") ? user : {};
    const total = Math.max(0, toInt(base.xp, 0));
    const computed = getLevelProgress(total);
    const sLevel = clampLevel(toInt(base.numeric_level, computed.level));
    const sInto = Math.max(0, toInt(base.xp_into_level, computed.xpIntoLevel));
    const sNeeded = Math.max(0, toInt(base.next_level_xp, computed.nextLevelXp));
    const serverOk = sNeeded > 0 && Math.abs(totalXpForLevel(sLevel) + sInto - total) <= 1;
    if (serverOk) {
      return {
        level: sLevel,
        totalXp: total,
        xpIntoLevel: sInto,
        nextLevelXp: sNeeded,
        toNextXp: Math.max(0, sNeeded - sInto),
        progressPercent: Math.max(0, Math.min(100, Math.round((sInto / sNeeded) * 100))),
        rank: rankForLevel(sLevel)
      };
    }
    return Object.assign({}, computed, { rank: rankForLevel(computed.level) });
  }

  window.NetologyXP = {
    totalXpForLevel,
    levelFromTotalXp,
    xpForNextLevel,
    rankForLevel,
    getLevelProgress,
    applyXpToUser,
    resolveUserProgress
  };
}());

// achievement popup system — exposed as window.NetologyAchievements
// queues unlocks in localStorage and shows toast popups, even across page navigations
(function () {
  "use strict";

  if (window.NetologyAchievements) return;

  function normaliseEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function pendingKey(email) {
    return "netology_achievement_pending:" + normaliseEmail(email);
  }

  function seenKey(email) {
    return "netology_achievement_seen:" + normaliseEmail(email);
  }

  function readList(key) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(v) ? v : [];
    } catch { return []; }
  }

  function cleanAchievement(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = String(raw.id || "").trim();
    if (!id) return null;
    return {
      id,
      name: String(raw.name || "Achievement"),
      description: String(raw.description || ""),
      icon: String(raw.icon || "bi-award-fill"),
      rarity: String(raw.rarity || "common"),
      xp_added: Number(raw.xp_added || raw.xp_awarded || 0),
      earned_at: raw.earned_at || new Date().toISOString()
    };
  }

  function getSeenIds(email) {
    const e = normaliseEmail(email);
    return e ? readList(seenKey(e)).map(String) : [];
  }

  function markSeen(email, ids) {
    const e = normaliseEmail(email);
    if (!e) return;
    const seen = new Set(getSeenIds(e));
    ids.forEach(function (id) { const s = String(id || "").trim(); if (s) seen.add(s); });
    localStorage.setItem(seenKey(e), JSON.stringify([...seen]));
  }

  function removePending(email, ids) {
    const e = normaliseEmail(email);
    if (!e || !ids || !ids.length) return;
    const drop = new Set(ids.map(function (id) { return String(id || "").trim(); }).filter(Boolean));
    if (!drop.size) return;
    const key = pendingKey(e);
    const kept = readList(key).filter(function (a) {
      const i = String(a && a.id || "").trim();
      return i && !drop.has(i);
    });
    if (kept.length) localStorage.setItem(key, JSON.stringify(kept));
    else localStorage.removeItem(key);
  }

  function showPopups(email, achievements) {
    const e = normaliseEmail(email);
    if (!e || !achievements || !achievements.length || !document.body) return [];
    const seen = new Set(getSeenIds(e));
    const queued = new Set();
    const toShow = [];
    achievements.forEach(function (raw) {
      const a = cleanAchievement(raw);
      if (!a || seen.has(a.id) || queued.has(a.id)) return;
      queued.add(a.id);
      toShow.push(a);
    });
    if (!toShow.length) return [];
    toShow.forEach(function (a, i) {
      window.setTimeout(function () {
        if (window.NetologyToast && window.NetologyToast.showAchievementToast) window.NetologyToast.showAchievementToast(a);
        else if (window.NetologyToast && window.NetologyToast.showMessageToast) window.NetologyToast.showMessageToast(a.name + " unlocked", "success", 3200);
        else alert(a.name + " unlocked");
      }, i * 220);
    });
    const shown = toShow.map(function (a) { return a.id; });
    markSeen(e, shown);
    removePending(e, shown);
    return toShow;
  }

  function queueUnlocks(email, newUnlocks) {
    const e = normaliseEmail(email);
    if (!e || !newUnlocks || !newUnlocks.length) return [];
    const key = pendingKey(e);
    const byId = new Map();
    const incoming = [];
    readList(key).forEach(function (raw) { const a = cleanAchievement(raw); if (a) byId.set(a.id, a); });
    newUnlocks.forEach(function (raw) {
      const a = cleanAchievement(raw);
      if (!a) return;
      byId.set(a.id, a);
      incoming.push(a);
    });
    localStorage.setItem(key, JSON.stringify([...byId.values()]));
    if (incoming.length) showPopups(e, incoming);
    return [...byId.values()];
  }

  function getCurrentUserEmail() {
    try {
      const raw = localStorage.getItem("netology_user") || localStorage.getItem("user") || "null";
      const user = JSON.parse(raw);
      return normaliseEmail(user && user.email || "");
    } catch { return ""; }
  }

  function showPending() {
    const email = getCurrentUserEmail();
    if (!email) return;
    const pending = readList(pendingKey(email));
    if (pending.length) showPopups(email, pending);
  }

  window.NetologyAchievements = { queueUnlocks: queueUnlocks };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showPending, { once: true });
  } else {
    showPending();
  }
}());

// login day tracking — exposed as window.recordLoginDay and window.getLoginLog
// records locally and syncs to server, which can award XP and unlock achievements
(function () {
  "use strict";

  const API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  const ENDPOINTS = window.ENDPOINTS || {};
  const XP = window.NetologyXP || null;

  function normaliseEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function buildUrl(path) {
    return API_BASE ? API_BASE + path : path;
  }

  function logKey(email) {
    return "netology_login_log:" + email;
  }

  function readLog(email) {
    try { return JSON.parse(localStorage.getItem(logKey(email)) || "[]"); }
    catch { return []; }
  }

  function saveLog(email, log) {
    localStorage.setItem(logKey(email), JSON.stringify(log));
  }

  function parseJson(str, fallback) {
    try { const v = JSON.parse(str); return v === null ? fallback : v; }
    catch { return fallback; }
  }

  function toDateString(date) {
    if (!date) date = new Date();
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function bumpStoredXp(email, xpAmount) {
    if (!xpAmount) return;
    ["user", "netology_user"].forEach(function (key) {
      const user = parseJson(localStorage.getItem(key), null);
      if (!user || normaliseEmail(user.email) !== normaliseEmail(email)) return;
      const updated = XP && XP.applyXpToUser
        ? XP.applyXpToUser(user, xpAmount)
        : Object.assign({}, user, { xp: Math.max(0, Number(user.xp || 0) + xpAmount) });
      localStorage.setItem(key, JSON.stringify(updated));
    });
  }

  function syncWithServer(email) {
    if (!API_BASE) return;
    const path = ENDPOINTS.auth && ENDPOINTS.auth.recordLogin || "/record-login";
    fetch(buildUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data || !data.success) return;
      if (Array.isArray(data.log) && data.log.length) saveLog(email, data.log);
      const unlocks = Array.isArray(data.newly_unlocked) ? data.newly_unlocked : [];
      if (unlocks.length && window.NetologyAchievements) window.NetologyAchievements.queueUnlocks(email, unlocks);
      const bonusXp = Number(data.achievement_xp_added || 0);
      if (bonusXp > 0) bumpStoredXp(email, bonusXp);
    })
    .catch(function () {});
  }

  function recordLoginDay(email) {
    const e = normaliseEmail(email);
    if (!e) return [];
    const log = readLog(e);
    const today = toDateString(new Date());
    if (!log.includes(today)) { log.push(today); log.sort(); saveLog(e, log); }
    syncWithServer(e);
    return log;
  }

  window.recordLoginDay = recordLoginDay;
  window.getLoginLog = function (email) { const e = normaliseEmail(email); return e ? readLog(e) : []; };
}());

// GET helper used by dashboard.js, courses.js, course.js etc.
window.apiGet = async function apiGet(path, params) {
  const base = String(window.API_BASE || "").replace(/\/$/, "");
  const url = base ? new URL(base + path) : new URL(path, window.location.origin);
  if (params && typeof params === "object") {
    Object.entries(params).forEach(function (entry) {
      const k = entry[0], v = entry[1];
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString());
  return res.json();
};
