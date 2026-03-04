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
