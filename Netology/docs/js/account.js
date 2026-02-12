/*
Account page logic
- Shows localStorage user details
- Loads XP/Level from backend
- Login streak + achievements
- Logout
*/

const BASE_XP = 100;

const getById = (id) => document.getElementById(id);

function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

function parseJsonSafe(raw, fallback = null) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

/* AI Prompt: Explain the XP helpers section in clear, simple terms. */
/* =========================================================
   XP helpers
========================================================= */

function totalXpForLevel(level) {
  const lvl = Math.max(1, Number(level) || 1);
  return BASE_XP * (lvl - 1) * lvl / 2;
}

function levelFromXP(totalXP) {
  const xp = Math.max(0, Number(totalXP) || 0);
  const t = xp / BASE_XP;
  const lvl = Math.floor((1 + Math.sqrt(1 + 8 * t)) / 2);
  return Math.max(1, lvl);
}

function xpForNextLevel(level) {
  const lvl = Math.max(1, Number(level) || 1);
  return BASE_XP * lvl;
}

function computeXPFromTotal(totalXP) {
  const level = levelFromXP(totalXP);
  const levelStart = totalXpForLevel(level);
  const currentLevelXP = Math.max(0, totalXP - levelStart);
  const xpNext = xpForNextLevel(level);
  const pct = Math.max(0, Math.min(100, Math.round((currentLevelXP / Math.max(xpNext, 1)) * 100)));
  const toNext = Math.max(0, xpNext - currentLevelXP);
  return { level, currentLevelXP, xpNext, pct, toNext, totalXP };
}

/* AI Prompt: Explain the Core helpers section in clear, simple terms. */
/* =========================================================
   Core helpers
========================================================= */

function setText(id, text) {
  const el = getById(id);
  if (el) el.textContent = String(text ?? "");
}

function clearChildren(node) {
  if (node) node.replaceChildren();
}

function makeEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (typeof text !== "undefined") el.textContent = text;
  return el;
}

function makeIcon(className) {
  const icon = document.createElement("i");
  icon.className = className;
  return icon;
}

function getCurrentUser() {
  return (
    parseJsonSafe(localStorage.getItem("netology_user"), null) ||
    parseJsonSafe(localStorage.getItem("user"), null) ||
    {}
  );
}

function getCourseIndex() {
  return (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) ? COURSE_CONTENT : {};
}

function getProgressLog(email) {
  if (!email) return [];
  return parseJsonSafe(localStorage.getItem(`netology_progress_log:${email}`), []) || [];
}

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatRelative(ts) {
  const diff = Date.now() - Number(ts || 0);
  if (!Number.isFinite(diff) || diff < 0) return "";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/* AI Prompt: Explain the Login streaks section in clear, simple terms. */
/* =========================================================
   Login streaks
========================================================= */

function getLoginLog(email) {
  return parseJsonSafe(localStorage.getItem(`netology_login_log:${email}`), []) || [];
}

function saveLoginLog(email, log) {
  localStorage.setItem(`netology_login_log:${email}`, JSON.stringify(log));
}

function recordLoginDay(email) {
  if (!email) return [];
  const log = getLoginLog(email);
  const today = dateKey();
  if (!log.includes(today)) {
    log.push(today);
    log.sort();
    saveLoginLog(email, log);
  }
  return log;
}

async function syncLoginLog(email) {
  const base = String(window.API_BASE || "").replace(/\/$/, "");
  if (!email || !base) return null;
  try {
    const res = await fetch(`${base}/record-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!data || !data.success || !Array.isArray(data.log)) return null;
    saveLoginLog(email, data.log);
    return data.log;
  } catch {
    return null;
  }
}

function computeLoginStreak(log) {
  if (!Array.isArray(log) || !log.length) return 0;
  const set = new Set(log);
  let streak = 0;
  const cursor = new Date();
  while (set.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* AI Prompt: Explain the Achievements + XP section in clear, simple terms. */
/* =========================================================
   Achievements + XP
========================================================= */

function getBadgeCache() {
  return Array.isArray(window.__netBadges) ? window.__netBadges : [];
}

function setBadgeCache(list) {
  window.__netBadges = Array.isArray(list) ? list : [];
}

async function fetchBadges(email) {
  const base = String(window.API_BASE || "").replace(/\/$/, "");
  if (!email || !base) return [];
  try {
    const res = await fetch(`${base}/user-achievements?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!data.success) return getBadgeCache();
    setBadgeCache(data.achievements || []);
    return getBadgeCache();
  } catch {
    return getBadgeCache();
  }
}

async function awardAchievementRemote(email, def) {
  const base = String(window.API_BASE || "").replace(/\/$/, "");
  if (!email || !base) return { awarded: false };
  try {
    const res = await fetch(`${base}/award-achievement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        achievement_id: def.id,
        name: def.name,
        description: def.description,
        tier: def.tier,
        xp: def.xp || 0
      })
    });
    const data = await res.json();
    if (data && data.success && data.awarded) {
      const updated = getBadgeCache().slice();
      updated.push({
        id: def.id,
        name: def.name,
        description: def.description,
        xp: def.xp || 0,
        tier: def.tier,
        earned_at: new Date().toISOString()
      });
      setBadgeCache(updated);
    }
    return data || { awarded: false };
  } catch {
    return { awarded: false };
  }
}

function bumpUserXP(email, delta) {
  if (!delta) return;
  const rawUser = parseJsonSafe(localStorage.getItem("user"), null);
  if (rawUser && rawUser.email === email) {
    rawUser.xp = Math.max(0, Number(rawUser.xp || 0) + delta);
    localStorage.setItem("user", JSON.stringify(rawUser));
  }
  const rawNet = parseJsonSafe(localStorage.getItem("netology_user"), null);
  if (rawNet && rawNet.email === email) {
    rawNet.xp = Math.max(0, Number(rawNet.xp || 0) + delta);
    localStorage.setItem("netology_user", JSON.stringify(rawNet));
  }
}

function loginBadgeDefs() {
  return [
    { id: "login-streak-3", name: "3-Day Streak", description: "Log in 3 days in a row", target: 3, xp: 50, icon: "bi-fire", tier: "bronze" },
    { id: "login-streak-5", name: "5-Day Streak", description: "Log in 5 days in a row", target: 5, xp: 75, icon: "bi-fire", tier: "silver" },
    { id: "login-streak-7", name: "7-Day Streak", description: "Log in 7 days in a row", target: 7, xp: 100, icon: "bi-fire", tier: "gold" },
    { id: "login-streak-10", name: "10-Day Streak", description: "Log in 10 days in a row", target: 10, xp: 150, icon: "bi-fire", tier: "gold" }
  ];
}

function achievementDefs() {
  return [
    ...loginBadgeDefs(),
    { id: "lesson-1", name: "First Lesson", description: "Complete your first lesson", target: 1, type: "lessons", icon: "bi-check2-circle", tier: "bronze", xp: 15 },
    { id: "lesson-5", name: "Fast Learner", description: "Complete 5 lessons", target: 5, type: "lessons", icon: "bi-lightning-charge-fill", tier: "bronze", xp: 40 },
    { id: "lesson-15", name: "Lesson Grinder", description: "Complete 15 lessons", target: 15, type: "lessons", icon: "bi-journal-text", tier: "silver", xp: 80 },
    { id: "lesson-30", name: "Lesson Legend", description: "Complete 30 lessons", target: 30, type: "lessons", icon: "bi-star", tier: "gold", xp: 140 },
    { id: "lesson-50", name: "Lesson Master", description: "Complete 50 lessons", target: 50, type: "lessons", icon: "bi-stars", tier: "gold", xp: 200 },
    { id: "quiz-1", name: "First Quiz", description: "Pass your first quiz", target: 1, type: "quizzes", icon: "bi-patch-check", tier: "bronze", xp: 20 },
    { id: "quiz-3", name: "Quiz Master", description: "Pass 3 quizzes", target: 3, type: "quizzes", icon: "bi-patch-check-fill", tier: "bronze", xp: 40 },
    { id: "quiz-10", name: "Quiz Champion", description: "Pass 10 quizzes", target: 10, type: "quizzes", icon: "bi-award", tier: "silver", xp: 90 },
    { id: "quiz-20", name: "Quiz Elite", description: "Pass 20 quizzes", target: 20, type: "quizzes", icon: "bi-award-fill", tier: "gold", xp: 150 },
    { id: "sandbox-1", name: "Sandbox Starter", description: "Build your first topology", target: 1, type: "challenges", icon: "bi-diagram-3", tier: "bronze", xp: 25 },
    { id: "sandbox-2", name: "Sandbox Builder", description: "Build 2 topologies", target: 2, type: "challenges", icon: "bi-diagram-3", tier: "bronze", xp: 50 },
    { id: "sandbox-6", name: "Sandbox Architect", description: "Build 6 topologies", target: 6, type: "challenges", icon: "bi-diagram-3", tier: "silver", xp: 90 },
    { id: "sandbox-12", name: "Sandbox Master", description: "Build 12 topologies", target: 12, type: "challenges", icon: "bi-diagram-3-fill", tier: "gold", xp: 150 },
    { id: "course-1", name: "Course Finisher", description: "Complete 1 course", target: 1, type: "courses", icon: "bi-flag", tier: "bronze", xp: 60 },
    { id: "course-3", name: "Course Crusher", description: "Complete 3 courses", target: 3, type: "courses", icon: "bi-trophy", tier: "silver", xp: 120 },
    { id: "course-6", name: "Course Conqueror", description: "Complete 6 courses", target: 6, type: "courses", icon: "bi-trophy-fill", tier: "gold", xp: 200 },
    { id: "course-10", name: "Course Marathon", description: "Complete 10 courses", target: 10, type: "courses", icon: "bi-gem", tier: "gold", xp: 260 },
    { id: "streak-30", name: "Perfect Month", description: "Log in 30 days in a row", target: 30, type: "login", icon: "bi-star", tier: "gold", xp: 200 }
  ];
}

async function awardAchievementBadges(email, loginStreak) {
  if (!email) return;
  const badges = getBadgeCache();
  const earned = new Set(badges.map((b) => b.id));
  const progress = getProgressCounts(email);
  const counts = {
    lessons: progress.lessonsDone,
    quizzes: progress.quizzesDone,
    challenges: progress.challengesDone,
    courses: progress.coursesDone,
    login: loginStreak
  };

  for (const def of achievementDefs()) {
    const current = def.type === "login" ? loginStreak : (counts[def.type] || 0);
    if (current >= def.target && !earned.has(def.id)) {
      const result = await awardAchievementRemote(email, def);
      if (result?.awarded) {
        earned.add(def.id);
        bumpUserXP(email, def.xp);
      }
    }
  }
}

/* AI Prompt: Explain the Preferences section in clear, simple terms. */
/* =========================================================
   Preferences
========================================================= */

function preferenceKey(email) {
  return `netology_prefs:${email}`;
}

function loadPrefs(email) {
  const raw = parseJsonSafe(localStorage.getItem(preferenceKey(email)), null);
  if (raw && typeof raw === "object") return raw;
  return { weekly: true, streak: true, newCourses: false };
}

function savePrefs(email, prefs) {
  localStorage.setItem(preferenceKey(email), JSON.stringify(prefs));
}

async function fetchPrefs(email) {
  const base = String(window.API_BASE || "").replace(/\/$/, "");
  if (!email || !base) return null;
  try {
    const res = await fetch(`${base}/user-preferences?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!data.success) return null;
    return {
      weekly: !!data.weekly,
      streak: !!data.streak,
      newCourses: !!data.new_courses
    };
  } catch {
    return null;
  }
}

async function savePrefsRemote(email, prefs) {
  const base = String(window.API_BASE || "").replace(/\/$/, "");
  if (!email || !base) return false;
  try {
    const res = await fetch(`${base}/user-preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ...prefs })
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

function wirePrefs(email, initialPrefs) {
  const weekly = getById("prefWeekly");
  const streak = getById("prefStreak");
  const newCourses = getById("prefNewCourses");
  const saved = getById("prefSaved");
  if (!weekly || !streak || !newCourses) return;

  const prefs = initialPrefs || loadPrefs(email);
  weekly.checked = !!prefs.weekly;
  streak.checked = !!prefs.streak;
  newCourses.checked = !!prefs.newCourses;

  const persist = async () => {
    const next = {
      weekly: weekly.checked,
      streak: streak.checked,
      newCourses: newCourses.checked
    };
    savePrefs(email, next);
    await savePrefsRemote(email, next);
    if (saved) {
      saved.textContent = "Saved";
      window.setTimeout(() => {
        saved.textContent = "Changes save automatically.";
      }, 1200);
    }
  };

  weekly.addEventListener("change", persist);
  streak.addEventListener("change", persist);
  newCourses.addEventListener("change", persist);
}

/* AI Prompt: Explain the Progress counts section in clear, simple terms. */
/* =========================================================
   Progress counts
========================================================= */

async function loadProgressSummary(email) {
  const base = String(window.API_BASE || "").replace(/\/$/, "");
  if (!email || !base) return null;

  try {
    const res = await fetch(`${base}/user-progress-summary?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!data.success) return null;

    const summary = {
      email,
      lessonsDone: Number(data.lessons_done || 0),
      quizzesDone: Number(data.quizzes_done || 0),
      challengesDone: Number(data.challenges_done || 0),
      coursesDone: Number(data.courses_done || 0),
      inProgress: Number(data.in_progress || 0),
      totalCourses: Number(data.total_courses || 0)
    };

    window.__netProgressSummary = summary;
    return summary;
  } catch {
    return null;
  }
}

function getCourseCompletions(email, courseId) {
  if (!email || !courseId) return { lesson: new Set(), quiz: new Set(), challenge: new Set() };
  const raw = localStorage.getItem(`netology_completions:${email}:${courseId}`);
  const payload = parseJsonSafe(raw, {}) || {};
  const lessonArr = payload.lesson || payload.lessons || payload.learn || [];
  const quizArr = payload.quiz || payload.quizzes || [];
  const chArr = payload.challenge || payload.challenges || [];
  return {
    lesson: new Set((lessonArr || []).map(Number)),
    quiz: new Set((quizArr || []).map(Number)),
    challenge: new Set((chArr || []).map(Number))
  };
}

function countRequiredItems(course) {
  if (!course) return 0;
  let required = 0;
  const units = course.units || course.modules || [];
  units.forEach((u) => {
    const sections = u.sections || u.lessons || [];
    sections.forEach((s) => {
      const items = s.items || s.steps || [];
      items.forEach((item) => {
        const t = String(item?.type || item?.kind || s.type || "").toLowerCase();
        if (t === "learn" || t === "lesson" || t === "quiz" || t === "challenge" || t === "practice" || t === "sandbox") {
          required += 1;
        }
      });
    });
  });
  return required;
}

function calcProgressFromLocal(email) {
  const content = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) ? COURSE_CONTENT : {};
  const courseIds = Object.keys(content);
  let lessonsDone = 0;
  let quizzesDone = 0;
  let challengesDone = 0;
  let coursesDone = 0;

  courseIds.forEach((id) => {
    const completions = getCourseCompletions(email, id);
    lessonsDone += completions.lesson.size;
    quizzesDone += completions.quiz.size;
    challengesDone += completions.challenge.size;

    const required = countRequiredItems(content[id]);
    const done = completions.lesson.size + completions.quiz.size + completions.challenge.size;
    if (required > 0 && done >= required) coursesDone += 1;
  });

  return { lessonsDone, quizzesDone, challengesDone, coursesDone, totalCourses: courseIds.length };
}

function getProgressCounts(email) {
  const cached = window.__netProgressSummary;
  if (cached && cached.email === email) return cached;
  return calcProgressFromLocal(email);
}

/* AI Prompt: Explain the Activity + history section in clear, simple terms. */
/* =========================================================
   Activity + history
========================================================= */

async function fetchRecentActivity(email) {
  const base = String(window.API_BASE || "").replace(/\/$/, "");
  if (!email || !base) return null;
  try {
    const res = await fetch(`${base}/recent-activity?email=${encodeURIComponent(email)}&limit=8`);
    const data = await res.json();
    if (!data.success) return null;
    return Array.isArray(data.activity) ? data.activity : [];
  } catch {
    return null;
  }
}

async function renderRecentActivity(email) {
  const wrap = getById("recentActivityList");
  if (!wrap) return;

  const apiRecent = await fetchRecentActivity(email);
  if (Array.isArray(apiRecent) && apiRecent.length) {
    clearChildren(wrap);
    apiRecent.forEach((e) => {
      const type = String(e?.type || "").toLowerCase();
      const label =
        type === "quiz" ? "Quiz passed" :
          type === "challenge" ? "Challenge completed" :
            "Lesson completed";
      const lessonPart = e.lesson_number ? `Lesson ${e.lesson_number}` : "";
      const time = e.completed_at ? formatRelative(new Date(e.completed_at).getTime()) : "";
      const xp = Number(e.xp || 0);
      const courseTitle = e.course_title || "Course";

      const item = makeEl("div", "net-activity-item");
      const left = makeEl("div");
      left.append(
        makeEl("div", "fw-semibold", label),
        makeEl("div", "small text-muted", [courseTitle, lessonPart, time].filter(Boolean).join(" • "))
      );
      const right = makeEl("div", "net-activity-xp", xp ? `+${xp} XP` : "");
      item.append(left, right);
      wrap.appendChild(item);
    });
    return;
  }

  const log = getProgressLog(email);
  const now = Date.now();
  const windowMs = 7 * 24 * 60 * 60 * 1000;
  const recent = log
    .filter((e) => (now - Number(e.ts || 0)) <= windowMs)
    .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0))
    .slice(0, 6);

  if (!recent.length) {
    clearChildren(wrap);
    wrap.appendChild(makeEl("div", "small text-muted", "No activity yet."));
    return;
  }

  const content = getCourseIndex();
  clearChildren(wrap);
  recent.forEach((e) => {
    const type = String(e?.type || "").toLowerCase();
    const label =
      type === "quiz" ? "Quiz passed" :
        type === "challenge" ? "Challenge completed" :
          type === "sandbox" ? "Sandbox build" :
            "Lesson completed";
    const course = content[String(e.course_id)] || {};
    const courseTitle = course.title || "Course";
    const lessonPart = e.lesson_number ? `Lesson ${e.lesson_number}` : "";
    const time = formatRelative(e.ts);
    const xp = Number(e.xp || 0);

    const item = makeEl("div", "net-activity-item");
    const left = makeEl("div");
    left.append(
      makeEl("div", "fw-semibold", label),
      makeEl("div", "small text-muted", [courseTitle, lessonPart, time].filter(Boolean).join(" • "))
    );
    const right = makeEl("div", "net-activity-xp", xp ? `+${xp} XP` : "");
    item.append(left, right);
    wrap.appendChild(item);
  });
}

async function renderTopologies(email) {
  const wrap = getById("topologyList");
  if (!wrap) return;
  const base = String(window.API_BASE || "").replace(/\/$/, "");
  if (!base || !email) {
    clearChildren(wrap);
    wrap.appendChild(makeEl("div", "small text-muted", "No saved topologies yet."));
    return;
  }

  try {
    const res = await fetch(`${base}/load-topologies?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.topologies) || !data.topologies.length) {
      clearChildren(wrap);
      wrap.appendChild(makeEl("div", "small text-muted", "No saved topologies yet."));
      return;
    }

    clearChildren(wrap);
    data.topologies.slice(0, 6).forEach((t) => {
      const devices = Array.isArray(t.devices) ? t.devices.length : 0;
      const links = Array.isArray(t.connections) ? t.connections.length : 0;
      const when = t.created_at ? new Date(t.created_at).toLocaleDateString() : "";
      const card = makeEl("div", "net-topology-card");
      card.append(
        makeEl("div", "fw-semibold", t.name || "Unnamed topology"),
        makeEl(
          "div",
          "small text-muted",
          [ `${devices} devices`, `${links} links`, when ].filter(Boolean).join(" • ")
        )
      );
      wrap.appendChild(card);
    });
  } catch {
    clearChildren(wrap);
    wrap.appendChild(makeEl("div", "small text-muted", "No saved topologies yet."));
  }
}

async function fetchQuizHistory(email) {
  const base = String(window.API_BASE || "").replace(/\/$/, "");
  if (!email || !base) return null;
  try {
    const res = await fetch(`${base}/quiz-history?email=${encodeURIComponent(email)}&limit=8`);
    const data = await res.json();
    if (!data.success) return null;
    return Array.isArray(data.history) ? data.history : [];
  } catch {
    return null;
  }
}

async function renderQuizHistory(email) {
  const wrap = getById("quizHistoryList");
  if (!wrap) return;

  const apiHistory = await fetchQuizHistory(email);
  if (Array.isArray(apiHistory) && apiHistory.length) {
    clearChildren(wrap);
    apiHistory.forEach((e) => {
      const courseTitle = e.course_title || "Course";
      const lessonPart = e.lesson_number ? `Lesson ${e.lesson_number}` : "Quiz";
      const time = e.completed_at ? formatRelative(new Date(e.completed_at).getTime()) : "";
      const item = makeEl("div", "net-quiz-item");
      const left = makeEl("div");
      left.append(
        makeEl("div", "fw-semibold", courseTitle),
        makeEl("div", "small text-muted", [lessonPart, time].filter(Boolean).join(" • "))
      );
      item.appendChild(left);
      wrap.appendChild(item);
    });
    return;
  }

  const log = getProgressLog(email);
  const quizzes = log
    .filter((e) => String(e?.type || "").toLowerCase() === "quiz")
    .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0))
    .slice(0, 8);

  if (!quizzes.length) {
    clearChildren(wrap);
    wrap.appendChild(makeEl("div", "small text-muted", "No quizzes completed yet."));
    return;
  }

  const content = getCourseIndex();
  clearChildren(wrap);
  quizzes.forEach((e) => {
    const course = content[String(e.course_id)] || {};
    const courseTitle = course.title || "Course";
    const lessonPart = e.lesson_number ? `Lesson ${e.lesson_number}` : "Quiz";
    const time = formatRelative(e.ts);
    const xp = Number(e.xp || 0);
    const item = makeEl("div", "net-quiz-item");
    const left = makeEl("div");
    left.append(
      makeEl("div", "fw-semibold", courseTitle),
      makeEl("div", "small text-muted", [lessonPart, time].filter(Boolean).join(" • "))
    );
    const right = makeEl("div", "net-activity-xp", xp ? `+${xp} XP` : "");
    item.append(left, right);
    wrap.appendChild(item);
  });
}

/* AI Prompt: Explain the Rank + rings section in clear, simple terms. */
/* =========================================================
   Rank + rings
========================================================= */

function rankFromUser(user, numericLevel) {
  const raw = String(user?.unlock_tier || user?.rank || user?.level_name || user?.level || "").toLowerCase();
  if (raw.includes("advanced")) return "Advanced";
  if (raw.includes("intermediate")) return "Intermediate";
  if (raw.includes("novice")) return "Novice";
  if (numericLevel >= 5) return "Advanced";
  if (numericLevel >= 3) return "Intermediate";
  return "Novice";
}

function setRankDisplay(rank) {
  const r = String(rank || "").toLowerCase();
  const pretty = rank || "Novice";

  const rankText = getById("rankText");
  if (rankText) rankText.textContent = pretty;

  const rankBadge = getById("rankBadge");
  if (rankBadge) {
    rankBadge.textContent = pretty;
    rankBadge.className = "badge net-rank-pill";
    if (r === "advanced") rankBadge.classList.add("net-rank-adv");
    else if (r === "intermediate") rankBadge.classList.add("net-rank-int");
    else rankBadge.classList.add("net-rank-nov");
  }

  const ddRank = getById("ddRank");
  if (ddRank) {
    ddRank.textContent = pretty;
    ddRank.className = "badge";
    if (r === "advanced") ddRank.classList.add("bg-danger");
    else if (r === "intermediate") ddRank.classList.add("bg-info", "text-dark");
    else ddRank.classList.add("text-bg-light", "border");
  }
}

function setAccountRing(progressPct) {
  const ring = getById("accountRing");
  if (!ring) return;
  const track = ring.parentElement?.querySelector(".net-ring-track");

  const r = 58;
  const CIRC = 2 * Math.PI * r;
  const arc = 0.5;
  const dash = CIRC * arc;
  const gap = CIRC - dash;
  const offset = dash * (1 - (Number(progressPct || 0) / 100));
  const dashArray = `${dash.toFixed(2)} ${gap.toFixed(2)}`;

  ring.style.strokeDasharray = dashArray;
  ring.style.strokeDashoffset = `${offset.toFixed(2)}`;
  if (track) {
    track.style.strokeDasharray = dashArray;
    track.style.strokeDashoffset = "0";
  }
}

/* AI Prompt: Explain the Chrome section in clear, simple terms. */
/* =========================================================
   Chrome
========================================================= */

function wireChrome(user) {
  const openBtn = getById("openSidebarBtn");
  const closeBtn = getById("closeSidebarBtn");
  const sidebar = getById("slideSidebar");
  const backdrop = getById("sideBackdrop");

  const userBtn = getById("userBtn");
  const dd = getById("userDropdown");
  const topLogout = getById("topLogoutBtn");
  const sideLogout = getById("sideLogoutBtn");
  const logoutBtn = getById("logoutBtn");

  const initial = (user.first_name || user.name || user.username || "S").trim().charAt(0).toUpperCase();
  const fullName = user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "Student";

  setText("topAvatar", initial);
  setText("ddAvatar", initial);
  setText("ddName", fullName);
  setText("ddEmail", user.email || "");

  setText("sideAvatar", initial);
  setText("sideUserName", fullName);
  setText("sideUserEmail", user.email || "");

  function openSidebar() {
    if (!sidebar || !backdrop) return;
    sidebar.classList.add("is-open");
    backdrop.classList.add("is-open");
    document.body.classList.add("net-noscroll");
    sidebar.setAttribute("aria-hidden", "false");
  }

  function closeSidebar() {
    if (!sidebar || !backdrop) return;
    sidebar.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    document.body.classList.remove("net-noscroll");
    sidebar.setAttribute("aria-hidden", "true");
  }

  function toggleDropdown(force) {
    if (!dd) return;
    const open = typeof force === "boolean" ? force : !dd.classList.contains("is-open");
    dd.classList.toggle("is-open", open);
    if (userBtn) userBtn.setAttribute("aria-expanded", String(open));
  }

  function doLogout() {
    localStorage.removeItem("user");
    localStorage.removeItem("netology_user");
    localStorage.removeItem("netology_token");
    window.location.href = "login.html";
  }

  openBtn?.addEventListener("click", openSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  backdrop?.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSidebar();
      toggleDropdown(false);
    }
  });

  if (userBtn) {
    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });
  }

  document.addEventListener("click", (e) => {
    if (!dd) return;
    const t = e.target;
    if (t && dd.contains(t)) return;
    if (userBtn && userBtn.contains(t)) return;
    toggleDropdown(false);
  });

  topLogout?.addEventListener("click", doLogout);
  sideLogout?.addEventListener("click", doLogout);
  logoutBtn?.addEventListener("click", doLogout);
}

/* AI Prompt: Explain the Activity widgets section in clear, simple terms. */
/* =========================================================
   Activity widgets
========================================================= */

function renderLoginActivity(email, loginStreak) {
  const grid = getById("loginActivity");
  if (!grid) return;

  const log = getLoginLog(email);
  const set = new Set(log);
  clearChildren(grid);
  const days = 30;
  const today = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateKey(d);
    const active = set.has(key);
    const withinStreak = loginStreak > 0 && i < loginStreak; // most recent streak days
    const cls = active ? (withinStreak ? "net-activity-cell is-streak" : "net-activity-cell is-active") : "net-activity-cell";
    const cell = makeEl("span", cls);
    cell.title = key;
    grid.appendChild(cell);
  }
}

function renderAchievements(email, loginStreak) {
  const earnedWrap = getById("earnedBadges");
  const lockedWrap = getById("lockedBadges");
  const countEl = getById("badgeCount");
  if (!earnedWrap || !lockedWrap) return;

  const progress = getProgressCounts(email);
  const earnedBadges = getBadgeCache();
  const earnedIds = new Set(earnedBadges.map((b) => b.id));

  const achievements = achievementDefs();

  const counts = {
    lessons: progress.lessonsDone,
    quizzes: progress.quizzesDone,
    challenges: progress.challengesDone,
    courses: progress.coursesDone,
    login: loginStreak
  };

  const earned = [];
  const locked = [];

  achievements.forEach((a) => {
    const current = a.type === "login" ? loginStreak : (counts[a.type] || 0);
    const achieved = earnedIds.has(a.id);

    const existing = earnedBadges.find((b) => b.id === a.id);
    const tier = existing?.tier || a.tier || "bronze";

    const card = makeEl("div", `net-badge-card ${achieved ? `is-earned tier-${tier}` : "is-locked"}`);
    const ico = makeEl("div", "net-badge-ico");
    ico.appendChild(makeIcon(`bi ${a.icon}`));
    const body = makeEl("div");
    body.append(
      makeEl("div", "fw-semibold", a.name),
      makeEl("div", "small text-muted", a.description),
      makeEl("div", "small text-muted", `${Math.min(current, a.target)}/${a.target}`)
    );
    if (a.xp) body.appendChild(makeEl("div", "small text-muted", `+${a.xp} XP`));
    card.append(ico, body);

    if (achieved) earned.push(card);
    else locked.push(card);
  });

  clearChildren(earnedWrap);
  if (earned.length) {
    earned.forEach((card) => earnedWrap.appendChild(card));
  } else {
    earnedWrap.appendChild(makeEl("div", "small text-muted", "No badges earned yet."));
  }

  clearChildren(lockedWrap);
  if (locked.length) {
    locked.forEach((card) => lockedWrap.appendChild(card));
  } else {
    lockedWrap.appendChild(makeEl("div", "small text-muted", "All badges unlocked."));
  }

  if (countEl) countEl.textContent = `${earned.length} earned`;
  const badgePill = getById("badgePill");
  if (badgePill) badgePill.textContent = `${earned.length} badges`;
}

/* AI Prompt: Explain the Stats load section in clear, simple terms. */
/* =========================================================
   Stats load
========================================================= */

async function loadStats(email, user) {
  try {
    const res = await fetch(`${window.API_BASE}/user-info?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!data.success) throw new Error("no data");

    const serverXP = Number(data.xp || data.total_xp || 0);
    const localXP = Number(user?.xp || 0);
    const totalXP = Math.max(serverXP, localXP);
    const stats = computeXPFromTotal(totalXP);
    const unlockTier = String(data.start_level || user?.unlock_tier || user?.unlock_level || user?.unlockTier || "novice")
      .trim()
      .toLowerCase();
    const rank = rankFromUser({ ...user, rank: data.rank, unlock_tier: unlockTier }, stats.level);

    const mergedUser = {
      ...(user || {}),
      email,
      first_name: data.first_name || user?.first_name,
      last_name: data.last_name || user?.last_name,
      username: data.username || user?.username,
      xp: totalXP,
      unlock_tier: ["novice", "intermediate", "advanced"].includes(unlockTier) ? unlockTier : "novice"
    };
    localStorage.setItem("user", JSON.stringify(mergedUser));
    localStorage.setItem("netology_user", JSON.stringify(mergedUser));

    const fullName = `${mergedUser.first_name || ""} ${mergedUser.last_name || ""}`.trim() || "Student";
    if (fullName) {
      setText("profileName", fullName);
      setText("ddName", fullName);
      setText("topUserName", fullName);
      setText("sideUserName", fullName);
      setText("topAvatar", fullName.charAt(0).toUpperCase());
      setText("sideAvatar", fullName.charAt(0).toUpperCase());
      setText("profileAvatar", fullName.charAt(0).toUpperCase());
    }
    if (mergedUser.username) setText("profileUser", mergedUser.username);
    if (mergedUser.email) {
      setText("profileEmail", mergedUser.email);
      setText("ddEmail", mergedUser.email);
      setText("sideUserEmail", mergedUser.email);
    }

    setRankDisplay(rank);

    getById("levelText").textContent = stats.level;
    getById("xpText").textContent = stats.totalXP;
    getById("nextText").textContent = `${stats.currentLevelXP} / ${stats.xpNext}`;
    getById("xpBar").style.width = `${stats.pct}%`;

    return stats;
  } catch {
    const totalXP = Number(user?.xp || 0);
    const stats = computeXPFromTotal(totalXP);
    const rank = rankFromUser(user, stats.level);

    setRankDisplay(rank);

    getById("levelText").textContent = stats.level;
    getById("xpText").textContent = stats.totalXP;
    getById("nextText").textContent = `${stats.currentLevelXP} / ${stats.xpNext}`;
    getById("xpBar").style.width = `${stats.pct}%`;

    return stats;
  }
}

/* AI Prompt: Explain the Init section in clear, simple terms. */
/* =========================================================
   Init
========================================================= */

onReady(async () => {
  let user = getCurrentUser();
  if (!user.email) {
    window.location.href = "login.html";
    return;
  }

  wireChrome(user);

  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Student";
  const initial = (fullName || "S").trim().charAt(0).toUpperCase();
  setText("profileName", fullName);
  setText("profileEmail", user.email || "-");
  setText("profileUser", user.username || "-");
  setText("profileAvatar", initial);

  let log = recordLoginDay(user.email);
  const remoteLog = await syncLoginLog(user.email);
  if (remoteLog) log = remoteLog;
  const loginStreak = computeLoginStreak(log);
  await loadProgressSummary(user.email);
  await fetchBadges(user.email);
  await awardAchievementBadges(user.email, loginStreak);

  user = getCurrentUser();
  const stats = await loadStats(user.email, user);

  const remotePrefs = await fetchPrefs(user.email);
  wirePrefs(user.email, remotePrefs);

  const streakEl = getById("streakCount");
  if (streakEl) streakEl.textContent = String(loginStreak);

  const streakHint = getById("streakHint");
  if (streakHint) {
    streakHint.textContent = loginStreak > 0
      ? "Log in tomorrow to keep your streak going."
      : "Log in today to start a streak.";
  }

  setText("ddLevel", `Level ${stats.level}`);
  setText("sideLevelBadge", `Lv ${stats.level}`);
  setText("accountLevel", stats.level);
  setText("accountXpText", `${stats.currentLevelXP}/${stats.xpNext} XP`);
  setText("accountLevelHint", `${stats.toNext} XP to next level`);
  setAccountRing(stats.pct);

  const progress = getProgressCounts(user.email);
  setText("statLessons", progress.lessonsDone);
  setText("statQuizzes", progress.quizzesDone);
  setText("statChallenges", progress.challengesDone);
  setText("statCourses", progress.coursesDone);

  const lastLogin = log.length ? log[log.length - 1] : null;
  setText("lastLoginText", lastLogin ? new Date(lastLogin).toLocaleDateString() : "—");

  renderLoginActivity(user.email, loginStreak);
  renderAchievements(user.email, loginStreak);
  await renderRecentActivity(user.email);
  await renderQuizHistory(user.email);
  renderTopologies(user.email);
});
