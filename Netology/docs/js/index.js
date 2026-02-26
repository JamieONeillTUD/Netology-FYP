/*
---------------------------------------------------------
Student: C22320301 - Jamie O’Neill
File: index.js
Purpose: Runs the landing page API status check, hero progress stats, and hero hover tilt.
Notes: Simplified structure and helper naming while keeping the same behavior.
---------------------------------------------------------
*/

const BASE_XP = 100;

// Simple DOM helper.
function getById(elementId) {
  return document.getElementById(elementId);
}

// Run code after the DOM is ready.
function onReady(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
    return;
  }
  callback();
}

// Parse JSON safely.
function parseJsonSafe(rawValue) {
  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

// XP helper math.
function totalXpForLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return (BASE_XP * (safeLevel - 1) * safeLevel) / 2;
}

function levelFromXP(totalXp) {
  const safeXp = Math.max(0, Number(totalXp) || 0);
  const ratio = safeXp / BASE_XP;
  const computedLevel = Math.floor((1 + Math.sqrt(1 + 8 * ratio)) / 2);
  return Math.max(1, computedLevel);
}

function xpForNextLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return BASE_XP * safeLevel;
}

// Read user from local storage.
function getCurrentUser() {
  return (
    parseJsonSafe(localStorage.getItem("netology_user"))
    || parseJsonSafe(localStorage.getItem("user"))
    || null
  );
}

// Convert user XP into display values.
function computeUserXP(user) {
  const totalXp = Number(user?.xp || 0);
  const level = levelFromXP(totalXp);
  const levelStartXp = totalXpForLevel(level);
  const currentLevelXp = Math.max(0, totalXp - levelStartXp);
  const nextLevelXp = xpForNextLevel(level);
  const progressPercent = Math.max(0, Math.min(100, (currentLevelXp / Math.max(nextLevelXp, 1)) * 100));

  return {
    level,
    totalXp,
    currentLevelXp,
    nextLevelXp,
    progressPercent
  };
}

// Convert raw section/item labels into one canonical type.
function mapItemType(sectionType, item) {
  const sectionText = String(sectionType || "").toLowerCase();
  if (sectionText.includes("quiz")) return "quiz";
  if (sectionText.includes("challenge")) return "challenge";
  if (sectionText.includes("practice") || sectionText.includes("sandbox")) return "sandbox";

  const itemText = String(item?.type || "").toLowerCase();
  if (itemText === "quiz") return "quiz";
  if (itemText === "challenge") return "challenge";
  if (itemText === "sandbox" || itemText === "practice") return "sandbox";

  return "learn";
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstArray(...candidates) {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

// Count required learn/quiz/challenge items for one unit.
function countUnitItems(unit) {
  const result = {
    requiredCount: 0,
    challengeCount: 0
  };

  if (Array.isArray(unit?.sections)) {
    unit.sections.forEach((section) => {
      const sectionType = String(section?.type || section?.kind || section?.title || "").toLowerCase();
      const items = firstArray(section?.items, section?.lessons);

      items.forEach((item) => {
        const itemType = mapItemType(sectionType, item);
        const isRequired = itemType === "learn" || itemType === "quiz" || itemType === "challenge";

        if (isRequired) result.requiredCount += 1;
        if (itemType === "challenge") result.challengeCount += 1;
      });
    });

    return result;
  }

  if (unit?.sections && typeof unit.sections === "object") {
    const sectionGroups = unit.sections;

    const learnItems = firstArray(sectionGroups.learn, sectionGroups.lesson, sectionGroups.lessons);
    const quizItems = firstArray(sectionGroups.quiz, sectionGroups.quizzes);
    const challengeItems = firstArray(sectionGroups.challenge, sectionGroups.challenges);

    result.requiredCount += learnItems.length;
    result.requiredCount += quizItems.length;
    result.requiredCount += challengeItems.length;
    result.challengeCount += challengeItems.length;

    return result;
  }

  const lessons = toArray(unit?.lessons);
  lessons.forEach((lessonItem) => {
    const itemType = mapItemType("", lessonItem);
    const isRequired = itemType === "learn" || itemType === "quiz" || itemType === "challenge";

    if (isRequired) result.requiredCount += 1;
    if (itemType === "challenge") result.challengeCount += 1;
  });

  return result;
}

// Build course totals from COURSE_CONTENT.
function getCourseTotals() {
  const content = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) ? COURSE_CONTENT : null;

  if (!content) {
    return {
      totalCourses: 0,
      totalChallenges: 0,
      courseIds: [],
      courseMeta: {}
    };
  }

  const courseIds = Object.keys(content);
  const courseMeta = {};
  let totalChallenges = 0;

  courseIds.forEach((courseId) => {
    const course = content[courseId] || {};
    const units = toArray(course.units);

    let requiredCount = 0;
    let challengeCount = 0;

    units.forEach((unit) => {
      const counts = countUnitItems(unit);
      requiredCount += counts.requiredCount;
      challengeCount += counts.challengeCount;
    });

    courseMeta[courseId] = { requiredCount, challengeCount };
    totalChallenges += challengeCount;
  });

  return {
    totalCourses: courseIds.length,
    totalChallenges,
    courseIds,
    courseMeta
  };
}

function getCompletionArray(payload, primaryKey, secondaryKey) {
  if (Array.isArray(payload?.[primaryKey])) return payload[primaryKey];
  if (Array.isArray(payload?.[secondaryKey])) return payload[secondaryKey];
  return [];
}

// Read completion totals from local storage.
function getCompletionStats(email, courseIds, courseMeta) {
  if (!email || !Array.isArray(courseIds) || courseIds.length === 0) {
    return {
      coursesCompleted: 0,
      challengesDone: 0
    };
  }

  let coursesCompleted = 0;
  let challengesDone = 0;

  courseIds.forEach((courseId) => {
    const key = `netology_completions:${email}:${courseId}`;
    const payload = parseJsonSafe(localStorage.getItem(key));
    if (!payload) return;

    const lessonList = getCompletionArray(payload, "lesson", "lessons");
    const quizList = getCompletionArray(payload, "quiz", "quizzes");
    const challengeList = getCompletionArray(payload, "challenge", "challenges");

    const lessonCount = new Set(lessonList.map(Number)).size;
    const quizCount = new Set(quizList.map(Number)).size;
    const challengeCount = new Set(challengeList.map(Number)).size;

    const totalDone = lessonCount + quizCount + challengeCount;
    const requiredTotal = Number(courseMeta?.[courseId]?.requiredCount || 0);

    if (requiredTotal > 0 && totalDone >= requiredTotal) {
      coursesCompleted += 1;
    }

    challengesDone += challengeCount;
  });

  return {
    coursesCompleted,
    challengesDone
  };
}

function setStatusDotColor(dotElement, colorHex) {
  if (!dotElement) return;
  dotElement.style.background = colorHex;
  dotElement.style.boxShadow = `0 0 0 4px ${colorHex}22`;
}

// Update API status text and color.
function setApiStatus(statusElement, dotElement, state, latencyMs = null) {
  if (!statusElement) return;

  statusElement.className = "fw-semibold";

  if (state === "online") {
    statusElement.textContent = latencyMs !== null ? `Online (${latencyMs}ms)` : "Online";
    statusElement.classList.add("text-success");
    setStatusDotColor(dotElement, "#198754");
    return;
  }

  if (state === "slow") {
    statusElement.textContent = latencyMs !== null ? `Slow (${latencyMs}ms)` : "Slow";
    statusElement.classList.add("text-warning");
    setStatusDotColor(dotElement, "#ffc107");
    return;
  }

  statusElement.textContent = "Offline";
  statusElement.classList.add("text-danger");
  setStatusDotColor(dotElement, "#dc3545");
}

// Fetch with timeout to avoid hanging health checks.
async function fetchWithTimeout(url, options = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutHandle);
  }
}

// Check backend health and show online/slow/offline.
async function checkBackendHealth(statusElement, dotElement) {
  try {
    const baseUrl = String(window.API_BASE || "").trim().replace(/\/$/, "");
    if (!baseUrl) {
      setApiStatus(statusElement, dotElement, "offline");
      return;
    }

    const healthUrls = [`${baseUrl}/healthz`, `${baseUrl}/`];
    const startTime = performance.now();
    let isHealthy = false;

    for (const healthUrl of healthUrls) {
      try {
        const response = await fetchWithTimeout(healthUrl, { method: "GET" }, 2500);
        if (response?.ok) {
          isHealthy = true;
          break;
        }
      } catch {
        // Try next URL.
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);

    if (!isHealthy) {
      setApiStatus(statusElement, dotElement, "offline");
      return;
    }

    if (latencyMs >= 900) {
      setApiStatus(statusElement, dotElement, "slow", latencyMs);
    } else {
      setApiStatus(statusElement, dotElement, "online", latencyMs);
    }
  } catch {
    setApiStatus(statusElement, dotElement, "offline");
  }
}

function getFirstName(user) {
  const fullName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : (user?.name || user?.username || "Student");

  return String(fullName || "Student").split(" ")[0] || "Student";
}

// Fill hero card stats from user and completion data.
function fillHeroProgress() {
  const user = getCurrentUser();
  if (!user) return;

  const greetingElement = getById("heroGreeting");
  const greetingNameElement = getById("heroGreetingName");
  const levelElement = getById("heroLevel");
  const xpTextElement = getById("heroXpText");
  const xpBarElement = getById("heroXpBar");
  const totalXpElement = getById("heroTotalXp");

  const coursesDoneElement = getById("heroCoursesCompleted");
  const coursesTotalElement = getById("heroCoursesTotal");
  const coursesDoneValueElement = getById("heroCoursesCompletedValue");

  const challengesDoneElement = getById("heroChallengesDone");
  const challengesTotalElement = getById("heroChallengesTotal");
  const challengesDoneValueElement = getById("heroChallengesDoneValue");

  if (greetingElement && greetingNameElement) {
    greetingElement.classList.remove("d-none");
    greetingNameElement.textContent = getFirstName(user);
  }

  const xpData = computeUserXP(user);

  if (levelElement) levelElement.textContent = `Level ${xpData.level}`;
  if (xpTextElement) xpTextElement.textContent = `${xpData.currentLevelXp} / ${xpData.nextLevelXp}`;
  if (xpBarElement) xpBarElement.style.width = `${xpData.progressPercent}%`;
  if (totalXpElement) totalXpElement.textContent = String(xpData.totalXp);

  const totals = getCourseTotals();
  const completionStats = getCompletionStats(user?.email, totals.courseIds, totals.courseMeta);

  if (coursesDoneElement) coursesDoneElement.textContent = String(completionStats.coursesCompleted);
  if (coursesTotalElement) coursesTotalElement.textContent = String(totals.totalCourses);
  if (coursesDoneValueElement) coursesDoneValueElement.textContent = String(completionStats.coursesCompleted);

  if (challengesDoneElement) challengesDoneElement.textContent = String(completionStats.challengesDone);
  if (challengesTotalElement) challengesTotalElement.textContent = String(totals.totalChallenges);
  if (challengesDoneValueElement) challengesDoneValueElement.textContent = String(completionStats.challengesDone);
}

function applyHeroTilt(visualWrap, heroCard, clientX, clientY) {
  const rect = visualWrap.getBoundingClientRect();
  const normalizedX = (clientX - rect.left) / rect.width;
  const normalizedY = (clientY - rect.top) / rect.height;

  const maxTilt = 7;
  const rotateX = (normalizedY - 0.5) * -maxTilt;
  const rotateY = (normalizedX - 0.5) * maxTilt;

  heroCard.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
  heroCard.style.boxShadow = "0 22px 70px rgba(0,0,0,.14)";
}

function resetHeroTilt(heroCard) {
  heroCard.style.transform = "";
  heroCard.style.boxShadow = "";
}

// Enable mouse tilt on the hero card.
function setupHeroTilt(visualWrap, heroCard, reduceMotion) {
  if (reduceMotion || !visualWrap || !heroCard) return;

  heroCard.style.transformStyle = "preserve-3d";
  heroCard.style.transition = "transform 120ms ease, box-shadow 200ms ease";

  let animationFrameId = null;

  visualWrap.addEventListener("mousemove", (event) => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    animationFrameId = requestAnimationFrame(() => {
      applyHeroTilt(visualWrap, heroCard, event.clientX, event.clientY);
    });
  });

  visualWrap.addEventListener("mouseleave", () => resetHeroTilt(heroCard));
  visualWrap.addEventListener("blur", () => resetHeroTilt(heroCard), true);
}

// Start all landing page logic.
function initializePage() {
  const statusElement = getById("apiStatus");
  const dotElement = getById("apiDot");

  const heroVisualWrap = document.querySelector(".net-hero-visual-modern");
  const heroCard = document.querySelector(".net-hero-card");

  const reduceMotion = Boolean(
    window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  if (statusElement) {
    statusElement.setAttribute("role", "status");
    statusElement.setAttribute("aria-live", "polite");
  }

  checkBackendHealth(statusElement, dotElement);
  setInterval(() => {
    checkBackendHealth(statusElement, dotElement);
  }, 30000);

  fillHeroProgress();
  setupHeroTilt(heroVisualWrap, heroCard, reduceMotion);
}

onReady(initializePage);
