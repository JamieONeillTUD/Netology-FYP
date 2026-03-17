// App: Unified config, endpoints, XP system, achievements, and login tracking

// Set up API base URL (backend server address)
// Use pre-configured value if available, otherwise use production
(() => {
  const preconfiguredBase = String(window.API_BASE || "").trim();
  if (preconfiguredBase) {
    window.API_BASE = preconfiguredBase.replace(/\/$/, "");
    return;
  }
  window.API_BASE = "https://netology-fyp.onrender.com";
})();

// Central location for all backend API routes used across the app
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

// XP system: calculates user levels, progress, and ranks from XP points
(() => {
  "use strict";

  if (window.NetologyXP) return;

  // Convert value to integer safely
  function toInt(rawValue, fallbackValue = 0) {
    const parsedNumber = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsedNumber) ? parsedNumber : fallbackValue;
  }

  // Ensure level is at least 1
  function safeLevel(levelValue) {
    return Math.max(1, toInt(levelValue, 1));
  }

  // Get total XP required to reach a specific level
  function totalXpForLevel(level) {
    const normalizedLevel = safeLevel(level);
    return (100 * (normalizedLevel - 1) * normalizedLevel) / 2;
  }

  // Convert total XP to level number
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

  // Get XP points required for next level
  function xpForNextLevel(level) {
    return 100 * safeLevel(level);
  }

  // Convert level number to rank name (Novice, Intermediate, Advanced)
  function rankForLevel(level) {
    const normalizedLevel = safeLevel(level);
    if (normalizedLevel >= 5) return "Advanced";
    if (normalizedLevel >= 3) return "Intermediate";
    return "Novice";
  }

  // Calculate detailed XP progress information
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

  // Add XP to user and return updated user object
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

  // Calculate and validate user progress (handles server/client sync)
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

  // Export XP system functions
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

// Achievement system: manages popups and tracks pending achievements
(() => {
  "use strict";

  if (window.NetologyAchievements) return;

  // Normalize email to lowercase and trim
  function normalizeEmail(emailValue) {
    return String(emailValue || "").trim().toLowerCase();
  }

  // Get localStorage key for pending achievements
  function pendingKey(emailAddress) {
    return `netology_achievement_pending:${normalizeEmail(emailAddress)}`;
  }

  // Get localStorage key for seen achievements
  function seenKey(emailAddress) {
    return `netology_achievement_seen:${normalizeEmail(emailAddress)}`;
  }

  // Read array from localStorage safely
  function readArrayFromStorage(storageKey) {
    try {
      const parsedValue = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
      return [];
    }
  }

  // Validate and normalize achievement data
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

  // Get list of achievement IDs already shown to user
  function getSeenIds(emailAddress) {
    const normalizedEmail = normalizeEmail(emailAddress);
    if (!normalizedEmail) return [];
    return readArrayFromStorage(seenKey(normalizedEmail)).map((achievementId) => String(achievementId));
  }

  // Mark achievements as seen
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

  // Remove specific achievements from pending queue
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

  // Show achievement popups with staggered timing
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

    // Show each popup with 220ms delay between them
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

  // Add new achievements to pending queue and show them
  function queueUnlocks(emailAddress, unlockList) {
    const normalizedEmail = normalizeEmail(emailAddress);
    if (!normalizedEmail || !Array.isArray(unlockList) || !unlockList.length) return [];

    const storageKey = pendingKey(normalizedEmail);
    const currentPendingUnlocks = readArrayFromStorage(storageKey);
    const unlocksById = new Map();
    const incomingUnlocks = [];

    // Merge current pending with new unlocks
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

  // Get current user email from localStorage
  function currentUserEmail() {
    try {
      const rawUserData = localStorage.getItem("netology_user") || localStorage.getItem("user") || "null";
      const parsedUserData = JSON.parse(rawUserData);
      return normalizeEmail(parsedUserData?.email || "");
    } catch {
      return "";
    }
  }

  // Show any pending achievements for current user when page loads
  function showPendingForCurrentUser() {
    const emailAddress = currentUserEmail();
    if (!emailAddress) return [];

    const pendingUnlocks = readArrayFromStorage(pendingKey(emailAddress));
    if (!pendingUnlocks.length) return [];

    return showUnlockPopups(emailAddress, pendingUnlocks);
  }

  // Export public API
  window.NetologyAchievements = {
    queueUnlocks
  };

  // Auto-show pending achievements when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showPendingForCurrentUser, { once: true });
  } else {
    showPendingForCurrentUser();
  }
})();

// Login day tracking and XP management
(() => {
  "use strict";

  const API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  const ENDPOINTS = window.ENDPOINTS || {};
  const XP = window.NetologyXP || null;

  // Local storage keys
  const STORAGE_KEYS = {
    user: "user",
    netologyUser: "netology_user"
  };

  // Safely parse JSON
  function parseJson(value, fallbackValue = null) {
    try {
      const parsedValue = JSON.parse(value);
      return parsedValue === null ? fallbackValue : parsedValue;
    } catch {
      return fallbackValue;
    }
  }

  // Build full API URL
  function apiUrl(path) {
    return API_BASE ? `${API_BASE}${path}` : path;
  }

  // Normalize email
  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  // Prefix for login log storage
  const LOGIN_LOG_KEY_PREFIX = "netology_login_log:";

  // Convert date to YYYY-MM-DD
  function dateToKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Get login log storage key
  function getLoginLogKey(email) {
    return `${LOGIN_LOG_KEY_PREFIX}${email}`;
  }

  // Read login log
  function readLoginLog(email) {
    try {
      return JSON.parse(localStorage.getItem(getLoginLogKey(email)) || "[]");
    } catch {
      return [];
    }
  }

  // Write login log
  function writeLoginLog(email, logDays) {
    localStorage.setItem(getLoginLogKey(email), JSON.stringify(logDays));
  }

  // Apply XP to user
  function applyXpToUser(userData, additionalXp) {
    if (XP?.applyXpToUser) return XP.applyXpToUser(userData, additionalXp);
    const nextTotalXp = Math.max(0, Number(userData?.xp || 0) + Number(additionalXp || 0));
    return { ...(userData || {}), xp: nextTotalXp };
  }

  // Add XP to stored users
  function addXpToStoredUser(email, deltaXp) {
    if (!deltaXp) return;

    [STORAGE_KEYS.user, STORAGE_KEYS.netologyUser].forEach((storageKey) => {
      const currentUser = parseJson(localStorage.getItem(storageKey), null);
      if (!currentUser || normalizeEmail(currentUser.email) !== normalizeEmail(email)) return;

      const updatedUser = applyXpToUser(currentUser, deltaXp);
      localStorage.setItem(storageKey, JSON.stringify(updatedUser));
    });
  }

  // Sync login day to server
  function syncLoginDayToServer(normalizedEmail) {
    if (!API_BASE) return;

    const recordLoginPath = ENDPOINTS.auth?.recordLogin || "/record-login";
    fetch(apiUrl(recordLoginPath), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail })
    }).then(async (response) => {
      const data = await response.json().catch(() => null);
      if (!data || !data.success) return;

      if (Array.isArray(data.log) && data.log.length) {
        writeLoginLog(normalizedEmail, data.log);
      }

      const unlocks = Array.isArray(data.newly_unlocked) ? data.newly_unlocked : [];
      if (unlocks.length && window.NetologyAchievements?.queueUnlocks) {
        window.NetologyAchievements.queueUnlocks(normalizedEmail, unlocks);
      }

      const achievementXp = Number(data.achievement_xp_added || 0);
      if (achievementXp > 0) {
        addXpToStoredUser(normalizedEmail, achievementXp);
      }
    }).catch(() => {
      // Network errors ignored - local tracking already updated
    });
  }

  // Record login day
  function recordLoginDay(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return [];

    const loginLog = readLoginLog(normalizedEmail);
    const todayKey = dateToKey();

    if (!loginLog.includes(todayKey)) {
      loginLog.push(todayKey);
      loginLog.sort();
      writeLoginLog(normalizedEmail, loginLog);
    }

    syncLoginDayToServer(normalizedEmail);
    return loginLog;
  }

  // Expose globally
  window.recordLoginDay = recordLoginDay;
  window.getLoginLog = function(email) {
    const normalizedEmail = normalizeEmail(email);
    return normalizedEmail ? readLoginLog(normalizedEmail) : [];
  };
})();
