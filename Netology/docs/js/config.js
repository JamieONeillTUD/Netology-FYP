/*
---------------------------------------------------------
Student: C22320301 - Jamie O’Neill
File: config.js
Purpose: Stores the core backend URL and API endpoint map used across the site.
Notes: Removed theme, toast, preview, and onboarding helpers from this file.
---------------------------------------------------------
*/

// Local development option:
// window.API_BASE = "http://localhost:5001";

// Production default:
window.API_BASE = window.API_BASE || "https://netology-fyp.onrender.com";

// Central API route map.
window.ENDPOINTS = {
  auth: {
    register: "/register",
    login: "/login",
    logout: "/logout",
    userInfo: "/user-info",
    userPreferences: "/user-preferences",
    userAchievements: "/user-achievements",
    awardAchievement: "/award-achievement",
    awardXp: "/award-xp",
    recordLogin: "/record-login",
    forgotPassword: "/forgot-password"
  },

  onboarding: {
    status: "/api/onboarding/status",
    steps: "/api/onboarding/steps",
    start: "/api/onboarding/start",
    stepComplete: "/api/onboarding/step/:id",
    complete: "/api/onboarding/complete",
    skip: "/api/onboarding/skip"
  },

  slides: {
    list: "/api/lessons/:lessonId/slides",
    content: "/api/lessons/:lessonId/slides/:slideId",
    complete: "/api/lessons/:lessonId/slides/:slideId/complete",
    progress: "/api/lessons/:lessonId/progress",
    bookmark: "/api/slides/:slideId/bookmark",
    bookmarks: "/api/user/bookmarks",
    notes: "/api/slides/:slideId/notes"
  },

  courses: {
    list: "/courses",
    courseDetails: "/course",
    userCourses: "/user-courses",
    userCourseStatus: "/user-course-status",
    userProgressSummary: "/user-progress-summary",
    start: "/start-course",
    completeLesson: "/complete-lesson",
    completeQuiz: "/complete-quiz",
    completeChallenge: "/complete-challenge",
    completeCourse: "/complete-course",
    recentActivity: "/recent-activity",
    quizHistory: "/quiz-history"
  },

  progress: {
    userProgress: "/api/user/progress",
    progressStats: "/api/user/progress/stats",
    userActivity: "/api/user/activity",
    userStreaks: "/api/user/streaks"
  },

  challenges: {
    list: "/api/user/challenges"
  },

  achievements: {
    list: "/api/user/achievements",
    award: "/award-achievement"
  },

  sandbox: {
    executeCommand: "/api/sandbox/execute-command",
    allowedCommands: "/api/sandbox/allowed-commands",
    lessonSessionSave: "/lesson-session/save",
    lessonSessionLoad: "/lesson-session/load",
    saveTopology: "/save-topology",
    loadTopologies: "/load-topologies",
    loadTopology: "/load-topology/:topologyId",
    deleteTopology: "/delete-topology/:topologyId"
  },

  preferences: {
    get: "/api/user/preferences",
    update: "/api/user/preferences"
  },

  health: {
    check: "/healthz"
  }
};

// Apply saved theme + dyslexic preference early on every page.
(() => {
  "use strict";

  function resolveTheme(themeName) {
    const savedTheme = String(themeName || "light").toLowerCase();
    if (savedTheme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return savedTheme || "light";
  }

  function applySavedUiPreferences() {
    const target = document.body || document.documentElement;
    if (!target) return;

    const storedTheme = localStorage.getItem("netology_theme") || "light";
    const resolvedTheme = resolveTheme(storedTheme);
    target.setAttribute("data-theme", resolvedTheme);

    const isDyslexic = localStorage.getItem("netology_dyslexic") === "true";
    target.classList.toggle("net-dyslexic", isDyslexic);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySavedUiPreferences, { once: true });
  } else {
    applySavedUiPreferences();
  }
})();

// Shared XP helper so all pages use one math definition.
(() => {
  "use strict";

  if (window.NetologyXP) return;

  function toInt(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toNonNegativeInt(value, fallback = 0) {
    return Math.max(0, toInt(value, fallback));
  }

  function normalizeLevel(level) {
    return Math.max(1, toInt(level, 1));
  }

  function totalXpForLevel(level) {
    const safeLevel = normalizeLevel(level);
    return (100 * (safeLevel - 1) * safeLevel) / 2;
  }

  function levelFromTotalXp(totalXp) {
    let level = 1;
    let xpRemaining = toNonNegativeInt(totalXp, 0);
    let xpNeeded = 100;

    while (xpRemaining >= xpNeeded) {
      xpRemaining -= xpNeeded;
      level += 1;
      xpNeeded += 100;
    }

    return level;
  }

  function xpForNextLevel(level) {
    return 100 * normalizeLevel(level);
  }

  function rankForLevel(level) {
    const numericLevel = normalizeLevel(level);
    if (numericLevel >= 5) return "Advanced";
    if (numericLevel >= 3) return "Intermediate";
    return "Novice";
  }

  function getLevelProgress(totalXp) {
    const safeTotalXp = toNonNegativeInt(totalXp, 0);
    const level = levelFromTotalXp(safeTotalXp);
    const levelStartXp = totalXpForLevel(level);
    const xpIntoLevel = Math.max(0, safeTotalXp - levelStartXp);
    const nextLevelXp = xpForNextLevel(level);
    const progressPercent = Math.max(
      0,
      Math.min(100, Math.round((xpIntoLevel / Math.max(nextLevelXp, 1)) * 100))
    );

    return {
      level,
      totalXp: safeTotalXp,
      xpIntoLevel,
      nextLevelXp,
      toNextXp: Math.max(0, nextLevelXp - xpIntoLevel),
      progressPercent
    };
  }

  function applyXpToUser(userData, xpDelta) {
    const baseUser = userData && typeof userData === "object" ? userData : {};
    const delta = toNonNegativeInt(xpDelta, 0);
    const nextTotalXp = toNonNegativeInt(baseUser.xp, 0) + delta;
    const progress = getLevelProgress(nextTotalXp);

    return {
      ...baseUser,
      xp: progress.totalXp,
      numeric_level: progress.level,
      xp_into_level: progress.xpIntoLevel,
      next_level_xp: progress.nextLevelXp,
      level: rankForLevel(progress.level),
      rank: rankForLevel(progress.level)
    };
  }

  function resolveUserProgress(userData) {
    const baseUser = userData && typeof userData === "object" ? userData : {};
    const totalXp = toNonNegativeInt(baseUser.xp, 0);
    const computed = getLevelProgress(totalXp);

    const serverLevel = toInt(baseUser.numeric_level, computed.level);
    const serverXpInto = toInt(baseUser.xp_into_level, computed.xpIntoLevel);
    const serverNextXp = toInt(baseUser.next_level_xp, computed.nextLevelXp);

    const normalizedServerLevel = normalizeLevel(serverLevel);
    const expectedTotal = totalXpForLevel(normalizedServerLevel) + Math.max(0, serverXpInto);
    const serverLooksConsistent =
      serverNextXp > 0 &&
      Math.abs(expectedTotal - totalXp) <= 1;

    if (serverLooksConsistent) {
      const xpIntoLevel = Math.max(0, serverXpInto);
      const nextLevelXp = Math.max(1, serverNextXp);
      return {
        level: normalizedServerLevel,
        totalXp,
        xpIntoLevel,
        nextLevelXp,
        toNextXp: Math.max(0, nextLevelXp - xpIntoLevel),
        progressPercent: Math.max(0, Math.min(100, Math.round((xpIntoLevel / nextLevelXp) * 100))),
        rank: rankForLevel(normalizedServerLevel)
      };
    }

    return {
      ...computed,
      rank: rankForLevel(computed.level)
    };
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
})();

// Shared achievement helpers: pending unlock queue + seen tracking.
(() => {
  "use strict";

  if (window.NetologyAchievements) return;

  function normEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function parseArray(rawValue) {
    try {
      const parsed = rawValue ? JSON.parse(rawValue) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function pendingKey(email) {
    return `netology_achievement_pending:${normEmail(email)}`;
  }

  function seenKey(email) {
    return `netology_achievement_seen:${normEmail(email)}`;
  }

  function normalizeUnlock(unlock) {
    if (!unlock || typeof unlock !== "object") return null;
    const id = String(unlock.id || "").trim();
    if (!id) return null;

    return {
      id,
      name: String(unlock.name || "Achievement"),
      description: String(unlock.description || ""),
      icon: String(unlock.icon || "bi-award-fill"),
      rarity: String(unlock.rarity || "common"),
      xp_added: Number(unlock.xp_added || unlock.xp_awarded || 0),
      earned_at: unlock.earned_at || new Date().toISOString()
    };
  }

  function queueUnlocks(email, unlocks) {
    const safeEmail = normEmail(email);
    if (!safeEmail || !Array.isArray(unlocks) || unlocks.length === 0) return [];

    const key = pendingKey(safeEmail);
    const current = parseArray(localStorage.getItem(key));
    const byId = new Map();
    const incoming = [];

    current.forEach((entry) => {
      const normalized = normalizeUnlock(entry);
      if (normalized) byId.set(normalized.id, normalized);
    });

    unlocks.forEach((entry) => {
      const normalized = normalizeUnlock(entry);
      if (!normalized) return;
      byId.set(normalized.id, normalized);
      incoming.push(normalized);
    });

    const merged = Array.from(byId.values());
    localStorage.setItem(key, JSON.stringify(merged));

    if (incoming.length) {
      showUnlockPopups(safeEmail, incoming);
    }

    return merged;
  }

  function getPendingUnlocks(email) {
    const safeEmail = normEmail(email);
    if (!safeEmail) return [];
    return parseArray(localStorage.getItem(pendingKey(safeEmail)));
  }

  function getSeenIds(email) {
    const safeEmail = normEmail(email);
    if (!safeEmail) return [];
    return parseArray(localStorage.getItem(seenKey(safeEmail))).map((id) => String(id));
  }

  function markSeen(email, achievementIds) {
    const safeEmail = normEmail(email);
    if (!safeEmail || !Array.isArray(achievementIds)) return [];

    const merged = new Set(getSeenIds(safeEmail));
    achievementIds.forEach((id) => {
      const safeId = String(id || "").trim();
      if (safeId) merged.add(safeId);
    });

    const ids = Array.from(merged.values());
    localStorage.setItem(seenKey(safeEmail), JSON.stringify(ids));
    return ids;
  }

  function currentUserEmail() {
    try {
      const primary = localStorage.getItem("netology_user") || localStorage.getItem("user");
      const parsed = primary ? JSON.parse(primary) : null;
      return normEmail(parsed?.email || "");
    } catch {
      return "";
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function iconHtml(unlock) {
    const raw = String(unlock?.icon || "").trim();
    if (raw.startsWith("bi-")) return `<i class="bi ${escapeHtml(raw)}"></i>`;
    return escapeHtml(raw || "⭐");
  }

  function ensureToastHost() {
    if (!document.body) return null;
    let host = document.getElementById("globalAchievementToastHost");
    if (host) return host;

    host = document.createElement("div");
    host.id = "globalAchievementToastHost";
    host.className = "net-achievement-toast-host";
    document.body.appendChild(host);
    return host;
  }

  function showAchievementToast(unlock) {
    const host = ensureToastHost();
    if (!host) return;

    const xpValue = Number(unlock?.xp_added || unlock?.xp_awarded || unlock?.xp_reward || 0);
    const toast = document.createElement("div");
    toast.className = "net-achievement-toast";
    toast.innerHTML = `
      <div class="net-achievement-toast-icon">${iconHtml(unlock)}</div>
      <div class="net-achievement-toast-copy">
        <div class="net-achievement-toast-title">Achievement unlocked</div>
        <div class="net-achievement-toast-name">${escapeHtml(unlock?.name || "Achievement")}</div>
      </div>
      <div class="net-achievement-toast-xp">${xpValue > 0 ? `+${xpValue} XP` : ""}</div>
    `;

    host.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  function removePendingIds(email, achievementIds) {
    const safeEmail = normEmail(email);
    if (!safeEmail || !Array.isArray(achievementIds) || !achievementIds.length) return;

    const removeSet = new Set(achievementIds.map((id) => String(id || "").trim()).filter(Boolean));
    if (!removeSet.size) return;

    const key = pendingKey(safeEmail);
    const pending = parseArray(localStorage.getItem(key));
    if (!pending.length) return;

    const filtered = pending.filter((entry) => {
      const id = String(entry?.id || "").trim();
      return id && !removeSet.has(id);
    });

    if (filtered.length) localStorage.setItem(key, JSON.stringify(filtered));
    else localStorage.removeItem(key);
  }

  function showUnlockPopups(email, unlocks) {
    const safeEmail = normEmail(email);
    if (!safeEmail || !Array.isArray(unlocks) || !unlocks.length || !document.body) return [];

    const seen = new Set(getSeenIds(safeEmail));
    const displayList = [];
    const displayIds = new Set();

    unlocks.forEach((entry) => {
      const normalized = normalizeUnlock(entry);
      if (!normalized) return;
      if (seen.has(normalized.id) || displayIds.has(normalized.id)) return;
      displayIds.add(normalized.id);
      displayList.push(normalized);
    });

    if (!displayList.length) return [];

    displayList.forEach((unlock, index) => {
      window.setTimeout(() => showAchievementToast(unlock), index * 220);
    });

    const ids = displayList.map((unlock) => unlock.id);
    markSeen(safeEmail, ids);
    removePendingIds(safeEmail, ids);
    return displayList;
  }

  function showPendingForCurrentUser() {
    const email = currentUserEmail();
    if (!email) return [];
    const pending = getPendingUnlocks(email);
    if (!pending.length) return [];
    return showUnlockPopups(email, pending);
  }

  window.NetologyAchievements = {
    queueUnlocks
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showPendingForCurrentUser, { once: true });
  } else {
    showPendingForCurrentUser();
  }
})();
