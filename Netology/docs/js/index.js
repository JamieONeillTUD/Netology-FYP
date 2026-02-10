const getById = (id) => document.getElementById(id);

function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

function parseJsonSafe(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

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

function userNumericLevel(user) {
  const xp = Number(user?.xp) || 0;
  return levelFromXP(xp);
}

function computeXP(user) {
  const totalXP = Number(user?.xp) || 0;
  const level = levelFromXP(totalXP);
  const levelStart = totalXpForLevel(level);
  const currentLevelXP = Math.max(0, totalXP - levelStart);
  const xpNext = xpForNextLevel(level);
  const progressPct = Math.max(0, Math.min(100, (currentLevelXP / Math.max(xpNext, 1)) * 100));
  return { totalXP, currentLevelXP, xpNext, progressPct };
}

function getCurrentUser() {
  return (
    parseJsonSafe(localStorage.getItem("netology_user")) ||
    parseJsonSafe(localStorage.getItem("user")) ||
    null
  );
}

function mapItemType(sectionType, item) {
  const st = String(sectionType || "").toLowerCase();
  if (st.includes("quiz")) return "quiz";
  if (st.includes("challenge")) return "challenge";
  if (st.includes("practice") || st.includes("sandbox")) return "sandbox";

  const t = String(item?.type || "").toLowerCase();
  if (t === "quiz") return "quiz";
  if (t === "challenge") return "challenge";
  if (t === "sandbox" || t === "practice") return "sandbox";
  return "learn";
}

function getCourseTotals() {
  const content = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT)
    ? COURSE_CONTENT
    : null;
  if (!content) return { totalCourses: 0, totalChallenges: 0, courseIds: [], courseMeta: {} };

  const courseIds = Object.keys(content);
  let totalChallenges = 0;
  const courseMeta = {};

  courseIds.forEach((id) => {
    const c = content[id];
    const units = c?.units || [];
    let requiredCount = 0;
    let challengeCount = 0;

    units.forEach((u) => {
      if (Array.isArray(u?.sections)) {
        u.sections.forEach((s) => {
          const st = String(s?.type || s?.kind || s?.title || "").toLowerCase();
          const items = s?.items || s?.lessons || [];
          if (!Array.isArray(items)) return;

          items.forEach((it) => {
            const t = mapItemType(st, it);
            if (t === "learn" || t === "quiz" || t === "challenge") requiredCount += 1;
            if (t === "challenge") challengeCount += 1;
          });
        });
      } else if (u?.sections && typeof u.sections === "object") {
        const obj = u.sections;
        const learnArr = obj.learn || obj.lesson || obj.lessons || [];
        const quizArr = obj.quiz || obj.quizzes || [];
        const practiceArr = obj.practice || obj.sandbox || [];
        const challengeArr = obj.challenge || obj.challenges || [];

        requiredCount += (learnArr.length || 0);
        requiredCount += (quizArr.length || 0);
        requiredCount += (challengeArr.length || 0);
        challengeCount += (challengeArr.length || 0);

        // practice/sandbox not required for completion
        void practiceArr;
      } else if (Array.isArray(u?.lessons)) {
        u.lessons.forEach((it) => {
          const t = mapItemType("", it);
          if (t === "learn" || t === "quiz" || t === "challenge") requiredCount += 1;
          if (t === "challenge") challengeCount += 1;
        });
      }
    });

    courseMeta[id] = { requiredCount, challengeCount };
    totalChallenges += challengeCount;
  });

  return { totalCourses: courseIds.length, totalChallenges, courseIds, courseMeta };
}

function getCompletionStats(email, courseIds, courseMeta) {
  if (!email || !courseIds.length) return { coursesCompleted: 0, challengesDone: 0 };

  let coursesCompleted = 0;
  let challengesDone = 0;

  courseIds.forEach((id) => {
    const raw = localStorage.getItem(`netology_completions:${email}:${id}`);
    if (!raw) return;
    const payload = parseJsonSafe(raw);
    if (!payload) return;

    const lesson = payload.lesson || payload.lessons || [];
    const quiz = payload.quiz || payload.quizzes || [];
    const challenge = payload.challenge || payload.challenges || [];

    const lessonSet = new Set((lesson || []).map(Number));
    const quizSet = new Set((quiz || []).map(Number));
    const challengeSet = new Set((challenge || []).map(Number));

    const done = lessonSet.size + quizSet.size + challengeSet.size;
    const required = Number(courseMeta?.[id]?.requiredCount || 0);
    if (required > 0 && done >= required) coursesCompleted += 1;

    challengesDone += challengeSet.size;
  });

  return { coursesCompleted, challengesDone };
}

onReady(() => {
  const statusEl = getById("apiStatus");
  const dot = getById("apiDot");

  // New landing uses this wrapper. If it's missing, we safely do nothing.
  const visualWrap = document.querySelector(".net-hero-visual-modern");
  const heroCard = document.querySelector(".net-hero-card");

  // Respect accessibility preference
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Make status updates accessible
  if (statusEl) {
    statusEl.setAttribute("role", "status");
    statusEl.setAttribute("aria-live", "polite");
  }

  function setDotColor(hex) {
    if (!dot) return;
    dot.style.background = hex;
    dot.style.boxShadow = `0 0 0 4px ${hex}22`;
  }

  function setStatus(state, ms = null) {
    if (!statusEl) return;

    // Reset classes first
    statusEl.className = "fw-semibold";

    if (state === "online") {
      statusEl.textContent = ms != null ? `Online (${ms}ms)` : "Online";
      statusEl.classList.add("text-success");
      setDotColor("#198754");
      return;
    }

    if (state === "slow") {
      statusEl.textContent = ms != null ? `Slow (${ms}ms)` : "Slow";
      statusEl.classList.add("text-warning");
      setDotColor("#ffc107");
      return;
    }

    // offline
    statusEl.textContent = "Offline";
    statusEl.classList.add("text-danger");
    setDotColor("#dc3545");
  }

  // --- Health check with timeout + latency ---
  async function fetchWithTimeout(url, opts = {}, timeoutMs = 2500) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(t);
    }
  }

  async function checkBackend() {
    try {
      const baseRaw = String(window.API_BASE || "").trim();
      const base = baseRaw.replace(/\/$/, "");
      if (!base) {
        setStatus("offline");
        return;
      }

      // Try /healthz first, then fallback to "/" if it doesn't exist (more compatible)
      const endpoints = [`${base}/healthz`, `${base}/`];

      const start = performance.now();

      let ok = false;

      for (const url of endpoints) {
        try {
          const res = await fetchWithTimeout(url, { method: "GET" }, 2500);
          ok = res && res.ok;
          if (ok) break;
        } catch {
          // try next endpoint
        }
      }

      const ms = Math.round(performance.now() - start);

      if (!ok) {
        setStatus("offline");
        return;
      }

      // Decide online vs slow (tweak threshold if you want)
      if (ms >= 900) setStatus("slow", ms);
      else setStatus("online", ms);

    } catch {
      setStatus("offline");
    }
  }

  // Run once quickly, then refresh occasionally
  checkBackend();
  setInterval(checkBackend, 30000);

  // --- Hero progress card (logged-in data) ---
  function fillHeroProgress() {
    const user = getCurrentUser();
    if (!user) return;

    const greeting = getById("heroGreeting");
    const greetingName = getById("heroGreetingName");
    const heroLevel = getById("heroLevel");
    const heroXpText = getById("heroXpText");
    const heroXpBar = getById("heroXpBar");
    const heroTotalXp = getById("heroTotalXp");
    const heroCoursesCompleted = getById("heroCoursesCompleted");
    const heroCoursesTotal = getById("heroCoursesTotal");
    const heroCoursesCompletedValue = getById("heroCoursesCompletedValue");
    const heroChallengesDone = getById("heroChallengesDone");
    const heroChallengesTotal = getById("heroChallengesTotal");
    const heroChallengesDoneValue = getById("heroChallengesDoneValue");

    const fullName = user?.first_name
      ? `${user.first_name} ${user.last_name || ""}`.trim()
      : (user?.name || user?.username || "Student");
    const firstName = String(fullName || "Student").split(" ")[0];

    if (greeting && greetingName) {
      greeting.classList.remove("d-none");
      greetingName.textContent = firstName || "Student";
    }

    const lvl = userNumericLevel(user);
    const { totalXP, currentLevelXP, xpNext, progressPct } = computeXP(user);

    if (heroLevel) heroLevel.textContent = `Level ${lvl}`;
    if (heroXpText) heroXpText.textContent = `${currentLevelXP} / ${xpNext}`;
    if (heroXpBar) heroXpBar.style.width = `${progressPct}%`;
    if (heroTotalXp) heroTotalXp.textContent = String(totalXP);

    const { totalCourses, totalChallenges, courseIds, courseMeta } = getCourseTotals();
    const { coursesCompleted, challengesDone } = getCompletionStats(user?.email, courseIds, courseMeta);

    if (heroCoursesCompleted) heroCoursesCompleted.textContent = String(coursesCompleted);
    if (heroCoursesTotal) heroCoursesTotal.textContent = String(totalCourses);
    if (heroCoursesCompletedValue) heroCoursesCompletedValue.textContent = String(coursesCompleted);

    if (heroChallengesDone) heroChallengesDone.textContent = String(challengesDone);
    if (heroChallengesTotal) heroChallengesTotal.textContent = String(totalChallenges);
    if (heroChallengesDoneValue) heroChallengesDoneValue.textContent = String(challengesDone);
  }

  fillHeroProgress();

  // --- Modern tilt/parallax on hero card (only if motion allowed) ---
  if (!reduceMotion && visualWrap && heroCard) {
    // smooth transitions
    heroCard.style.transformStyle = "preserve-3d";
    heroCard.style.transition = "transform 120ms ease, box-shadow 200ms ease";

    function applyTilt(clientX, clientY) {
      const rect = visualWrap.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;  // 0..1
      const y = (clientY - rect.top) / rect.height;  // 0..1

      // tilt limits
      const maxTilt = 7;
      const rx = (y - 0.5) * -maxTilt;
      const ry = (x - 0.5) * maxTilt;

      heroCard.style.transform =
        `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;

      heroCard.style.boxShadow = "0 22px 70px rgba(0,0,0,.14)";
    }

    function resetTilt() {
      heroCard.style.transform = "";
      heroCard.style.boxShadow = "";
    }

    let raf = null;
    visualWrap.addEventListener("mousemove", (e) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => applyTilt(e.clientX, e.clientY));
    });

    visualWrap.addEventListener("mouseleave", resetTilt);
    visualWrap.addEventListener("blur", resetTilt, true);
  }
});
