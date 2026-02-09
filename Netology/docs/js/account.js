/*
Account page logic
- Shows localStorage user details
- Loads XP/Level from backend
- Login streak + achievements
- Logout
*/

const BASE_XP = 100;

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

function safeJson(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function getCurrentUser() {
  return (
    safeJson(localStorage.getItem("netology_user"), null) ||
    safeJson(localStorage.getItem("user"), null) ||
    {}
  );
}

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getLoginLog(email) {
  return safeJson(localStorage.getItem(`netology_login_log:${email}`), []) || [];
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

function getBadges(email) {
  return safeJson(localStorage.getItem(`netology_badges:${email}`), []) || [];
}

function saveBadges(email, badges) {
  localStorage.setItem(`netology_badges:${email}`, JSON.stringify(badges));
}

function bumpUserXP(email, delta) {
  if (!delta) return;
  const rawUser = safeJson(localStorage.getItem("user"), null);
  if (rawUser && rawUser.email === email) {
    rawUser.xp = Math.max(0, Number(rawUser.xp || 0) + delta);
    localStorage.setItem("user", JSON.stringify(rawUser));
  }
  const rawNet = safeJson(localStorage.getItem("netology_user"), null);
  if (rawNet && rawNet.email === email) {
    rawNet.xp = Math.max(0, Number(rawNet.xp || 0) + delta);
    localStorage.setItem("netology_user", JSON.stringify(rawNet));
  }
}

function loginBadgeDefs() {
  return [
    { id: "login-streak-3", name: "3-Day Streak", description: "Log in 3 days in a row", target: 3, xp: 50, icon: "bi-fire" },
    { id: "login-streak-5", name: "5-Day Streak", description: "Log in 5 days in a row", target: 5, xp: 75, icon: "bi-fire" },
    { id: "login-streak-7", name: "7-Day Streak", description: "Log in 7 days in a row", target: 7, xp: 100, icon: "bi-fire" },
    { id: "login-streak-10", name: "10-Day Streak", description: "Log in 10 days in a row", target: 10, xp: 150, icon: "bi-fire" }
  ];
}

function awardLoginStreakBadges(email, streak) {
  if (!email) return;
  const defs = loginBadgeDefs();
  const badges = getBadges(email);
  const earned = new Set(badges.map((b) => b.id));
  let changed = false;

  defs.forEach((def) => {
    if (streak >= def.target && !earned.has(def.id)) {
      badges.push({ id: def.id, name: def.name, description: def.description, xp: def.xp, earnedAt: dateKey() });
      earned.add(def.id);
      bumpUserXP(email, def.xp);
      changed = true;
    }
  });

  if (changed) saveBadges(email, badges);
}

function getCourseCompletions(email, courseId) {
  if (!email || !courseId) return { lesson: new Set(), quiz: new Set(), challenge: new Set() };
  const raw = localStorage.getItem(`netology_completions:${email}:${courseId}`);
  const payload = safeJson(raw, {}) || {};
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

function getProgressCounts(email) {
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

function rankFromUser(user, numericLevel) {
  const raw = String(user?.unlock_tier || user?.rank || user?.level_name || user?.level || "").toLowerCase();
  if (raw.includes("advanced")) return "Advanced";
  if (raw.includes("intermediate")) return "Intermediate";
  if (raw.includes("novice")) return "Novice";
  if (numericLevel >= 5) return "Advanced";
  if (numericLevel >= 3) return "Intermediate";
  return "Novice";
}

function setRankBadge(rank) {
  const badge = document.getElementById("rankBadge");
  if (!badge) return;
  badge.textContent = rank;
  badge.className = "badge";
  const r = String(rank || "").toLowerCase();
  if (r === "advanced") badge.classList.add("bg-danger");
  else if (r === "intermediate") badge.classList.add("bg-info", "text-dark");
  else badge.classList.add("text-bg-light", "border");
}

function renderLoginActivity(email, loginStreak) {
  const grid = document.getElementById("loginActivity");
  if (!grid) return;

  const log = getLoginLog(email);
  const set = new Set(log);
  const cells = [];
  const days = 30;
  const today = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateKey(d);
    const active = set.has(key);
    const withinStreak = loginStreak > 0 && i < loginStreak; // most recent streak days
    const cls = active ? (withinStreak ? "net-activity-cell is-streak" : "net-activity-cell is-active") : "net-activity-cell";
    cells.push(`<span class="${cls}" title="${key}"></span>`);
  }

  grid.innerHTML = cells.join("");
}

function renderAchievements(email, loginStreak) {
  const earnedWrap = document.getElementById("earnedBadges");
  const lockedWrap = document.getElementById("lockedBadges");
  const countEl = document.getElementById("badgeCount");
  if (!earnedWrap || !lockedWrap) return;

  const progress = getProgressCounts(email);
  const earnedBadges = getBadges(email);
  const earnedIds = new Set(earnedBadges.map((b) => b.id));

  const achievements = [
    ...loginBadgeDefs(),
    { id: "lesson-5", name: "Fast Learner", description: "Complete 5 lessons", target: 5, type: "lessons", icon: "bi-lightning-charge-fill" },
    { id: "lesson-15", name: "Lesson Grinder", description: "Complete 15 lessons", target: 15, type: "lessons", icon: "bi-journal-text" },
    { id: "quiz-3", name: "Quiz Master", description: "Pass 3 quizzes", target: 3, type: "quizzes", icon: "bi-patch-check" },
    { id: "quiz-10", name: "Quiz Champion", description: "Pass 10 quizzes", target: 10, type: "quizzes", icon: "bi-award" },
    { id: "sandbox-2", name: "Sandbox Builder", description: "Build 2 topologies", target: 2, type: "challenges", icon: "bi-diagram-3" },
    { id: "sandbox-6", name: "Sandbox Architect", description: "Build 6 topologies", target: 6, type: "challenges", icon: "bi-diagram-3" },
    { id: "course-1", name: "Course Finisher", description: "Complete 1 course", target: 1, type: "courses", icon: "bi-flag" },
    { id: "course-3", name: "Course Crusher", description: "Complete 3 courses", target: 3, type: "courses", icon: "bi-trophy" },
    { id: "streak-30", name: "Perfect Month", description: "Log in 30 days in a row", target: 30, type: "login", icon: "bi-star" }
  ];

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
    const isLogin = a.type === "login";
    const current = isLogin ? loginStreak : (counts[a.type] || 0);
    const achieved = isLogin
      ? earnedIds.has(a.id) || current >= a.target
      : current >= a.target;

    const card = `
      <div class="net-badge-card ${achieved ? "is-earned" : "is-locked"}">
        <div class="net-badge-ico"><i class="bi ${a.icon}"></i></div>
        <div>
          <div class="fw-semibold">${a.name}</div>
          <div class="small text-muted">${a.description}</div>
          <div class="small text-muted">${Math.min(current, a.target)}/${a.target}</div>
        </div>
      </div>
    `;

    if (achieved) earned.push(card);
    else locked.push(card);
  });

  earnedWrap.innerHTML = earned.length ? earned.join("") : `<div class="small text-muted">No badges earned yet.</div>`;
  lockedWrap.innerHTML = locked.length ? locked.join("") : `<div class="small text-muted">All badges unlocked.</div>`;

  if (countEl) countEl.textContent = `${earned.length} earned`;
}

async function loadStats(email, user) {
  try {
    const res = await fetch(`${window.API_BASE}/user-info?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!data.success) throw new Error("no data");

    const serverXP = Number(data.xp || data.total_xp || 0);
    const localXP = Number(user?.xp || 0);
    const totalXP = Math.max(serverXP, localXP);
    const stats = computeXPFromTotal(totalXP);
    const rank = rankFromUser({ ...user, rank: data.rank }, stats.level);

    setRankBadge(rank);

    document.getElementById("levelText").textContent = stats.level;
    document.getElementById("xpText").textContent = stats.totalXP;
    document.getElementById("nextText").textContent = `${stats.currentLevelXP} / ${stats.xpNext}`;
    document.getElementById("xpBar").style.width = `${stats.pct}%`;

    return stats;
  } catch (e) {
    const totalXP = Number(user?.xp || 0);
    const stats = computeXPFromTotal(totalXP);
    const rank = rankFromUser(user, stats.level);

    setRankBadge(rank);

    document.getElementById("levelText").textContent = stats.level;
    document.getElementById("xpText").textContent = stats.totalXP;
    document.getElementById("nextText").textContent = `${stats.currentLevelXP} / ${stats.xpNext}`;
    document.getElementById("xpBar").style.width = `${stats.pct}%`;

    return stats;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = getCurrentUser();
  if (!user.email) {
    window.location.href = "login.html";
    return;
  }

  document.getElementById("nameText").textContent = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Student";
  document.getElementById("userText").textContent = user.username || "-";
  document.getElementById("emailText").textContent = user.email || "-";

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("user");
      localStorage.removeItem("netology_user");
      window.location.href = "login.html";
    });
  }

  const log = recordLoginDay(user.email);
  const loginStreak = computeLoginStreak(log);
  awardLoginStreakBadges(user.email, loginStreak);

  await loadStats(user.email, user);

  const streakEl = document.getElementById("streakCount");
  if (streakEl) streakEl.textContent = String(loginStreak);

  const streakHint = document.getElementById("streakHint");
  if (streakHint) {
    streakHint.textContent = loginStreak > 0
      ? "Log in tomorrow to keep your streak going."
      : "Log in today to start a streak.";
  }

  renderLoginActivity(user.email, loginStreak);
  renderAchievements(user.email, loginStreak);
});
