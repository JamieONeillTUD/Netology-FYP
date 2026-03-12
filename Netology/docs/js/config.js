/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: config.js
Purpose: Stores API config and shared helpers used across the site.
Notes: Theme application is handled in ui-theme.js.
---------------------------------------------------------
*/

// API base resolution:
// 1) Keep an existing value if one was injected before this script.
// 2) Otherwise use the production backend.
(() => {
  const preconfiguredBase = String(window.API_BASE || "").trim();
  if (preconfiguredBase) {
    window.API_BASE = preconfiguredBase.replace(/\/$/, "");
    return;
  }

  window.API_BASE = "https://netology-fyp.onrender.com";
})();

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

// Shared XP math.
(() => {
  "use strict";

  if (window.NetologyXP) return;

  function toInt(rawValue, fallbackValue = 0) {
    const parsedNumber = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsedNumber) ? parsedNumber : fallbackValue;
  }

  function safeLevel(levelValue) {
    return Math.max(1, toInt(levelValue, 1));
  }

  function totalXpForLevel(level) {
    const normalizedLevel = safeLevel(level);
    return (100 * (normalizedLevel - 1) * normalizedLevel) / 2;
  }

  function levelFromTotalXp(totalXp) {
    let remainingXp = Math.max(0, toInt(totalXp, 0));
    let level = 1;
    let xpRequiredForNextLevel = 100;

    while (remainingXp >= xpRequiredForNextLevel) {
      remainingXp -= xpRequiredForNextLevel;
      level += 1;
      xpRequiredForNextLevel += 100;
    }

    return level;
  }

  function xpForNextLevel(level) {
    return 100 * safeLevel(level);
  }

  function rankForLevel(level) {
    const normalizedLevel = safeLevel(level);
    if (normalizedLevel >= 5) return "Advanced";
    if (normalizedLevel >= 3) return "Intermediate";
    return "Novice";
  }

  function getLevelProgress(totalXp) {
    const totalXpValue = Math.max(0, toInt(totalXp, 0));
    const level = levelFromTotalXp(totalXpValue);
    const levelStartXp = totalXpForLevel(level);
    const xpIntoLevel = Math.max(0, totalXpValue - levelStartXp);
    const nextLevelXp = xpForNextLevel(level);
    const progressPercent = Math.max(
      0,
      Math.min(100, Math.round((xpIntoLevel / Math.max(nextLevelXp, 1)) * 100))
    );

    return {
      level,
      totalXp: totalXpValue,
      xpIntoLevel,
      nextLevelXp,
      toNextXp: Math.max(0, nextLevelXp - xpIntoLevel),
      progressPercent
    };
  }

  function applyXpToUser(userData, xpDelta) {
    const baseUser = userData && typeof userData === "object" ? userData : {};
    const xpToAdd = Math.max(0, toInt(xpDelta, 0));
    const nextTotalXp = Math.max(0, toInt(baseUser.xp, 0)) + xpToAdd;
    const nextProgress = getLevelProgress(nextTotalXp);

    return {
      ...baseUser,
      xp: nextProgress.totalXp,
      numeric_level: nextProgress.level,
      xp_into_level: nextProgress.xpIntoLevel,
      next_level_xp: nextProgress.nextLevelXp,
      level: rankForLevel(nextProgress.level),
      rank: rankForLevel(nextProgress.level)
    };
  }

  function resolveUserProgress(userData) {
    const baseUser = userData && typeof userData === "object" ? userData : {};
    const totalXpValue = Math.max(0, toInt(baseUser.xp, 0));
    const computedProgress = getLevelProgress(totalXpValue);

    const serverLevel = safeLevel(toInt(baseUser.numeric_level, computedProgress.level));
    const serverXpIntoLevel = Math.max(0, toInt(baseUser.xp_into_level, computedProgress.xpIntoLevel));
    const serverNextLevelXp = Math.max(0, toInt(baseUser.next_level_xp, computedProgress.nextLevelXp));

    const expectedTotalXp = totalXpForLevel(serverLevel) + serverXpIntoLevel;
    const serverProgressLooksConsistent = serverNextLevelXp > 0 && Math.abs(expectedTotalXp - totalXpValue) <= 1;

    if (serverProgressLooksConsistent) {
      return {
        level: serverLevel,
        totalXp: totalXpValue,
        xpIntoLevel: serverXpIntoLevel,
        nextLevelXp: serverNextLevelXp,
        toNextXp: Math.max(0, serverNextLevelXp - serverXpIntoLevel),
        progressPercent: Math.max(0, Math.min(100, Math.round((serverXpIntoLevel / serverNextLevelXp) * 100))),
        rank: rankForLevel(serverLevel)
      };
    }

    return {
      ...computedProgress,
      rank: rankForLevel(computedProgress.level)
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

// Shared achievement queue + popup handling.
(() => {
  "use strict";

  if (window.NetologyAchievements) return;

  function normalizeEmail(emailValue) {
    return String(emailValue || "").trim().toLowerCase();
  }

  function pendingKey(emailAddress) {
    return `netology_achievement_pending:${normalizeEmail(emailAddress)}`;
  }

  function seenKey(emailAddress) {
    return `netology_achievement_seen:${normalizeEmail(emailAddress)}`;
  }

  function readArrayFromStorage(storageKey) {
    try {
      const parsedValue = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
      return [];
    }
  }

  function normalizeUnlock(unlockValue) {
    if (!unlockValue || typeof unlockValue !== "object") return null;

    const unlockId = String(unlockValue.id || "").trim();
    if (!unlockId) return null;

    return {
      id: unlockId,
      name: String(unlockValue.name || "Achievement"),
      description: String(unlockValue.description || ""),
      icon: String(unlockValue.icon || "bi-award-fill"),
      rarity: String(unlockValue.rarity || "common"),
      xp_added: Number(unlockValue.xp_added || unlockValue.xp_awarded || 0),
      earned_at: unlockValue.earned_at || new Date().toISOString()
    };
  }

  function getSeenIds(emailAddress) {
    const normalizedEmail = normalizeEmail(emailAddress);
    if (!normalizedEmail) return [];

    return readArrayFromStorage(seenKey(normalizedEmail)).map((achievementId) => String(achievementId));
  }

  function setSeenIds(emailAddress, achievementIds) {
    const normalizedEmail = normalizeEmail(emailAddress);
    if (!normalizedEmail) return [];

    const mergedSeenIds = new Set(getSeenIds(normalizedEmail));

    achievementIds.forEach((achievementId) => {
      const safeAchievementId = String(achievementId || "").trim();
      if (safeAchievementId) mergedSeenIds.add(safeAchievementId);
    });

    const seenIdsList = Array.from(mergedSeenIds.values());
    localStorage.setItem(seenKey(normalizedEmail), JSON.stringify(seenIdsList));
    return seenIdsList;
  }

  function removePendingByIds(emailAddress, achievementIds) {
    const normalizedEmail = normalizeEmail(emailAddress);
    if (!normalizedEmail || !Array.isArray(achievementIds) || !achievementIds.length) return;

    const idsToRemove = new Set(
      achievementIds
        .map((achievementId) => String(achievementId || "").trim())
        .filter(Boolean)
    );

    if (!idsToRemove.size) return;

    const storageKey = pendingKey(normalizedEmail);
    const pendingUnlocks = readArrayFromStorage(storageKey);
    if (!pendingUnlocks.length) return;

    const filteredUnlocks = pendingUnlocks.filter((unlockEntry) => {
      const unlockId = String(unlockEntry?.id || "").trim();
      return unlockId && !idsToRemove.has(unlockId);
    });

    if (filteredUnlocks.length) localStorage.setItem(storageKey, JSON.stringify(filteredUnlocks));
    else localStorage.removeItem(storageKey);
  }

  function showUnlockPopups(emailAddress, unlockList) {
    const normalizedEmail = normalizeEmail(emailAddress);
    if (!normalizedEmail || !Array.isArray(unlockList) || !unlockList.length || !document.body) return [];

    const seenAchievementIds = new Set(getSeenIds(normalizedEmail));
    const unlockIdsAlreadyQueued = new Set();
    const unlocksToDisplay = [];

    unlockList.forEach((unlockEntry) => {
      const normalizedUnlock = normalizeUnlock(unlockEntry);
      if (!normalizedUnlock) return;
      if (seenAchievementIds.has(normalizedUnlock.id)) return;
      if (unlockIdsAlreadyQueued.has(normalizedUnlock.id)) return;

      unlockIdsAlreadyQueued.add(normalizedUnlock.id);
      unlocksToDisplay.push(normalizedUnlock);
    });

    if (!unlocksToDisplay.length) return [];

    unlocksToDisplay.forEach((unlockEntry, unlockIndex) => {
      window.setTimeout(() => {
        if (window.NetologyToast?.showAchievementToast) {
          window.NetologyToast.showAchievementToast(unlockEntry);
          return;
        }

        if (window.NetologyToast?.showMessageToast) {
          window.NetologyToast.showMessageToast(`${unlockEntry.name || "Achievement"} unlocked`, "success", 3200);
          return;
        }

        alert(`${unlockEntry.name || "Achievement"} unlocked`);
      }, unlockIndex * 220);
    });

    const displayedUnlockIds = unlocksToDisplay.map((unlockEntry) => unlockEntry.id);
    setSeenIds(normalizedEmail, displayedUnlockIds);
    removePendingByIds(normalizedEmail, displayedUnlockIds);

    return unlocksToDisplay;
  }

  function queueUnlocks(emailAddress, unlockList) {
    const normalizedEmail = normalizeEmail(emailAddress);
    if (!normalizedEmail || !Array.isArray(unlockList) || !unlockList.length) return [];

    const storageKey = pendingKey(normalizedEmail);
    const currentPendingUnlocks = readArrayFromStorage(storageKey);
    const unlocksById = new Map();
    const incomingUnlocks = [];

    currentPendingUnlocks.forEach((unlockEntry) => {
      const normalizedUnlock = normalizeUnlock(unlockEntry);
      if (normalizedUnlock) unlocksById.set(normalizedUnlock.id, normalizedUnlock);
    });

    unlockList.forEach((unlockEntry) => {
      const normalizedUnlock = normalizeUnlock(unlockEntry);
      if (!normalizedUnlock) return;
      unlocksById.set(normalizedUnlock.id, normalizedUnlock);
      incomingUnlocks.push(normalizedUnlock);
    });

    const mergedPendingUnlocks = Array.from(unlocksById.values());
    localStorage.setItem(storageKey, JSON.stringify(mergedPendingUnlocks));

    if (incomingUnlocks.length) {
      showUnlockPopups(normalizedEmail, incomingUnlocks);
    }

    return mergedPendingUnlocks;
  }

  function currentUserEmail() {
    try {
      const rawUserData = localStorage.getItem("netology_user") || localStorage.getItem("user") || "null";
      const parsedUserData = JSON.parse(rawUserData);
      return normalizeEmail(parsedUserData?.email || "");
    } catch {
      return "";
    }
  }

  function showPendingForCurrentUser() {
    const emailAddress = currentUserEmail();
    if (!emailAddress) return [];

    const pendingUnlocks = readArrayFromStorage(pendingKey(emailAddress));
    if (!pendingUnlocks.length) return [];

    return showUnlockPopups(emailAddress, pendingUnlocks);
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
