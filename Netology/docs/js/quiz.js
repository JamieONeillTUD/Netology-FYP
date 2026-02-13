/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript
---------------------------------------
quiz.js – Dedicated quiz page (multi-question, animated feel).

- Reads course + lesson from URL: quiz.html?course=1&lesson=3
- Loads questions from course_content.js
- Shows per-question feedback (correct/wrong + explanation)
- Shows results screen (score + XP)
- Awards XP based on score
- Calls backend /complete-quiz ONCE (best effort) to prevent duplicate awards

NOTE:
- Backend route /complete-quiz currently exists in your project.
- This file sends "earned_xp" too; backend can ignore it safely if not used.
*/

const RESULTS_PASS_PCT = 70; // Used only for the results message/badge.
const DEFAULT_QUIZ_XP = 40;
const getApiBase = () => window.API_BASE || "";

document.addEventListener("DOMContentLoaded", () => {
  initQuizPage().catch((err) => {
    console.error("Quiz init failed:", err);
  });
});

async function initQuizPage() {
  const { courseId, contentId, lessonNumber } = readQuizParams();
  const user = readUserFromStorage();

  if (!user.email || !courseId || !lessonNumber) {
    redirectToLogin();
    return;
  }

  let resolved = resolveCourseContent(courseId, contentId);
  if (!resolved.course || resolved.fallback) {
    const titleHint = await fetchCourseTitle(courseId);
    if (titleHint) {
      resolved = resolveCourseContent(courseId, contentId, titleHint);
    }
  }

  const resolvedContentId = resolved.id || contentId || courseId;
  if (resolvedContentId && resolvedContentId !== String(contentId || "")) {
    const url = new URL(window.location.href);
    url.searchParams.set("content_id", String(resolvedContentId));
    url.searchParams.delete("content");
    history.replaceState(null, "", url.toString());
  }

  const backUrl = buildCourseUrl(courseId, lessonNumber, resolvedContentId);
  wireBackLinks(backUrl);

  const quizModel = resolved.course ? getQuizModelFromCourse(resolved.course, lessonNumber) : null;
  if (!quizModel || !quizModel.questions || quizModel.questions.length === 0) {
    alert("No quiz found for this lesson yet.");
    window.location.href = backUrl;
    return;
  }

  const state = createQuizState({
    courseId,
    lessonNumber,
    email: user.email,
    model: quizModel
  });

  const savedAttempt = readAttempt(state);
  if (savedAttempt && savedAttempt.completed) {
    renderResultsFromSaved(state, savedAttempt, backUrl);
    return;
  }

  renderHeader(state);
  wireActionButtons(state);
  renderQuestion(state);
}

function readQuizParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    courseId: params.get("course") || params.get("course_id") || params.get("id"),
    contentId: params.get("content_id") || params.get("content"),
    lessonNumber: Number(params.get("lesson") || 0)
  };
}

function readUserFromStorage() {
  return (
    parseJsonSafe(localStorage.getItem("netology_user")) ||
    parseJsonSafe(localStorage.getItem("user")) ||
    {}
  );
}

async function refreshUserFromServer(email) {
  const apiBase = getApiBase();
  if (!apiBase || !email) return;
  try {
    const res = await fetch(`${apiBase}/user-info?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!data || !data.success) return;

    const raw = readUserFromStorage();
    const unlockTier = String(data.start_level || raw?.unlock_tier || raw?.unlock_level || raw?.unlockTier || "novice")
      .trim()
      .toLowerCase();

    const merged = {
      ...(raw || {}),
      email,
      first_name: data.first_name || raw?.first_name,
      last_name: data.last_name || raw?.last_name,
      username: data.username || raw?.username,
      xp: Number(data.xp || data.total_xp || raw?.xp || 0),
      unlock_tier: ["novice", "intermediate", "advanced"].includes(unlockTier) ? unlockTier : "novice"
    };

    localStorage.setItem("user", JSON.stringify(merged));
    localStorage.setItem("netology_user", JSON.stringify(merged));
  } catch {
    // ignore
  }
}

function redirectToLogin() {
  window.location.href = "login.html";
}

function buildLessonUrl(courseId, lessonNumber, contentId) {
  const params = new URLSearchParams();
  params.set("course_id", courseId);
  if (contentId) params.set("content_id", contentId);
  if (lessonNumber) params.set("lesson", String(lessonNumber));
  return `lesson.html?${params.toString()}`;
}

function buildCourseUrl(courseId, lessonNumber, contentId) {
  const params = new URLSearchParams();
  params.set("id", courseId);
  if (contentId) params.set("content_id", contentId);
  if (lessonNumber) params.set("lesson", String(lessonNumber));
  return `course.html?${params.toString()}`;
}

async function fetchCourseTitle(courseId) {
  const api = getApiBase();
  if (!api || !courseId) return "";
  try {
    const res = await fetch(`${api}/course?id=${encodeURIComponent(courseId)}`);
    const data = await res.json();
    if (data && data.success && data.title) return data.title;
  } catch {
    // ignore
  }
  return "";
}

function resolveCourseContent(courseId, contentId, titleHint) {
  if (typeof COURSE_CONTENT === "undefined") {
    return { course: null, id: null, fallback: false };
  }

  const content = COURSE_CONTENT || {};
  const keys = [contentId, courseId].filter(Boolean).map(String);

  for (const key of keys) {
    if (content[key]) {
      return { course: content[key], id: String(content[key]?.id || key), fallback: false };
    }
  }

  const list = Object.values(content);
  const byId = list.find((c) => String(c?.id || "") === String(contentId || courseId));
  if (byId) return { course: byId, id: String(byId.id || contentId || courseId), fallback: false };

  const target = String(titleHint || "").trim().toLowerCase();
  if (target) {
    const byTitle = list.find((c) => String(c?.title || "").trim().toLowerCase() === target);
    if (byTitle) return { course: byTitle, id: String(byTitle.id || contentId || courseId), fallback: false };
  }

  const firstKey = Object.keys(content)[0];
  if (firstKey) {
    return { course: content[firstKey], id: String(content[firstKey]?.id || firstKey), fallback: true };
  }

  return { course: null, id: null, fallback: false };
}

function wireBackLinks(backUrl) {
  const backTop = document.getElementById("backToCourseTop");
  const backBtn = document.getElementById("backToCourseBtn");
  if (backTop) backTop.href = backUrl;
  if (backBtn) backBtn.href = backUrl;
}

function renderHeader(state) {
  setText("quizTitle", state.title);
  setText("quizMeta", `Lesson ${state.lessonNumber} • ${state.questions.length} questions`);
  setText("quizXpLabel", `${state.maxXp} XP`);
}

function wireActionButtons(state) {
  const submitBtn = document.getElementById("submitBtn");
  const nextBtn = document.getElementById("nextBtn");
  const retryBtn = document.getElementById("retryBtn");

  if (submitBtn) submitBtn.addEventListener("click", () => submitAnswer(state));
  if (nextBtn) nextBtn.addEventListener("click", () => nextQuestion(state));
  if (retryBtn) retryBtn.addEventListener("click", () => retryQuiz(state));
}

function createQuizState({ courseId, lessonNumber, email, model }) {
  return {
    courseId,
    lessonNumber,
    email,
    title: model.title,
    maxXp: model.xp,
    questions: model.questions,
    currentIndex: 0,
    selected: null,
    showFeedback: false,
    answers: [] // boolean per question
  };
}

function parseJsonSafe(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function totalXpForLevel(level) {
  const lvl = Math.max(1, Number(level) || 1);
  return (lvl - 1) * lvl * 50;
}

function levelFromTotalXp(totalXp) {
  let level = 1;
  let remaining = Math.max(0, Number(totalXp) || 0);
  let step = 100;
  while (remaining >= step) {
    remaining -= step;
    level += 1;
    step += 100;
  }
  return level;
}

function rankForLevel(level) {
  if (Number(level) >= 5) return "Advanced";
  if (Number(level) >= 3) return "Intermediate";
  return "Novice";
}

function applyXpToUser(user, addXP) {
  const nextTotal = Math.max(0, Number(user?.xp || 0) + Number(addXP || 0));
  const nextLevel = levelFromTotalXp(nextTotal);
  const nextStart = totalXpForLevel(nextLevel);
  const xpInto = Math.max(0, nextTotal - nextStart);
  return {
    ...user,
    xp: nextTotal,
    numeric_level: nextLevel,
    level: rankForLevel(nextLevel),
    rank: rankForLevel(nextLevel),
    xp_into_level: xpInto,
    next_level_xp: nextLevel * 100
  };
}

function bumpUserXP(email, addXP) {
  if (!email || !addXP) return;

  const raw = localStorage.getItem("netology_user") || localStorage.getItem("user");
  const user = parseJsonSafe(raw) || {};
  if (!user || user.email !== email) return;

  const updated = applyXpToUser(user, addXP);

  if (localStorage.getItem("netology_user")) {
    localStorage.setItem("netology_user", JSON.stringify(updated));
  }
  if (localStorage.getItem("user")) {
    localStorage.setItem("user", JSON.stringify(updated));
  }
}

function logProgressEvent(email, payload) {
  if (!email) return;

  const entry = {
    type: payload.type,
    course_id: payload.course_id,
    lesson_number: payload.lesson_number,
    xp: Number(payload.xp || 0),
    ts: Date.now(),
    date: new Date().toISOString().slice(0, 10)
  };

  const key = `netology_progress_log:${email}`;
  const list = parseJsonSafe(localStorage.getItem(key)) || [];
  list.push(entry);
  localStorage.setItem(key, JSON.stringify(list));
}

function trackCourseStart(email, courseId, lessonNumber) {
  if (!email || !courseId) return;

  const key = `netology_started_courses:${email}`;
  const list = parseJsonSafe(localStorage.getItem(key)) || [];
  const existing = list.find((c) => String(c.id) === String(courseId));

  const payload = {
    id: String(courseId),
    lastViewed: Date.now(),
    lastLesson: Number(lessonNumber || 0) || undefined
  };

  if (existing) {
    existing.lastViewed = payload.lastViewed;
    if (payload.lastLesson) existing.lastLesson = payload.lastLesson;
  } else {
    list.push(payload);
  }

  localStorage.setItem(key, JSON.stringify(list));
}

function markQuizCompletion(state, payload) {
  const key = `netology_completions:${state.email}:${state.courseId}`;
  const data = parseJsonSafe(localStorage.getItem(key)) || { lesson: [], quiz: [], challenge: [] };
  const quizArr = data.quiz || data.quizzes || [];

  if (quizArr.includes(Number(state.lessonNumber))) return;

  quizArr.push(Number(state.lessonNumber));
  data.quiz = quizArr;
  localStorage.setItem(key, JSON.stringify(data));

  trackCourseStart(state.email, state.courseId, state.lessonNumber);
  logProgressEvent(state.email, {
    type: "quiz",
    course_id: state.courseId,
    lesson_number: state.lessonNumber,
    xp: Number(payload.earnedXP || 0)
  });
  bumpUserXP(state.email, Number(payload.earnedXP || 0));
}

/* AI Prompt: Explain the Quiz Model Helpers section in clear, simple terms. */
/* ----------------------------
   Quiz Model Helpers
---------------------------- */

/*
Supports BOTH shapes:
A) lesson.quiz = { title, xp, questions: [...] }
B) lesson.quiz = { question, options, answer, explain } (single question legacy)
*/
function getQuizModelFromCourse(course, lessonNumber) {
  if (!course || !course.units) return null;

  // Flatten lessons exactly like course.js does (unit lessons order)
  const flat = [];
  let idx = 1;

  (course.units || []).forEach((unit) => {
    (unit.lessons || []).forEach((lesson) => {
      flat.push({ index: idx, lesson });
      idx += 1;
    });
  });

  const entry = flat.find((x) => Number(x.index) === Number(lessonNumber));
  if (!entry || !entry.lesson) return null;

  const lesson = entry.lesson;
  const q = lesson.quiz;

  // Default title and XP if not set
  const baseTitle = `Lesson ${lessonNumber} Quiz`;
  const baseXp = DEFAULT_QUIZ_XP; // default max XP per quiz if you don’t specify yet

  // New format (multi-question)
  if (q && Array.isArray(q.questions)) {
    return {
      title: q.title || baseTitle,
      xp: Number(q.xp || baseXp),
      questions: q.questions.map((qq, i) => ({
        id: qq.id || `q${i + 1}`,
        question: qq.question || "",
        options: qq.options || [],
        correctAnswer: Number(qq.correctAnswer || 0),
        explanation: qq.explanation || ""
      }))
    };
  }

  // Legacy single question format
  if (q && q.question && Array.isArray(q.options)) {
    return {
      title: baseTitle,
      xp: Number(q.xp || baseXp),
      questions: [
        {
          id: "q1",
          question: q.question,
          options: q.options,
          correctAnswer: Number(q.answer || 0),
          explanation: q.explain || ""
        }
      ]
    };
  }

  return null;
}

/* AI Prompt: Explain the Storage Keys section in clear, simple terms. */
/* ----------------------------
   Storage Keys
---------------------------- */
function attemptKey(state) {
  return `netology_quiz_attempt:${state.email}:${state.courseId}:${state.lessonNumber}`;
}

function readAttempt(state) {
  try {
    return JSON.parse(localStorage.getItem(attemptKey(state)) || "null");
  } catch {
    return null;
  }
}

function writeAttempt(state, payload) {
  localStorage.setItem(attemptKey(state), JSON.stringify(payload));
}

/* AI Prompt: Explain the Rendering section in clear, simple terms. */
/* ----------------------------
   Rendering
---------------------------- */
function renderQuestion(state) {
  const q = state.questions[state.currentIndex];
  if (!q) return;

  // Reset selection/feedback
  state.selected = null;
  state.showFeedback = false;

  // Header progress
  const total = state.questions.length;
  const stepText = `Question ${state.currentIndex + 1} of ${total}`;
  const pct = Math.round((state.currentIndex / total) * 100);

  setText("quizStepText", stepText);
  setText("quizPctText", `${pct}%`);
  setText("questionCountChip", `${state.currentIndex + 1}/${total}`);

  const bar = document.getElementById("quizProgressBar");
  if (bar) bar.style.width = `${pct}%`;

  // Question text
  setText("questionText", q.question || "Question");
  setText("questionTag", "Question");

  // Options
  const optionsBox = document.getElementById("optionsBox");
  if (!optionsBox) return;
  optionsBox.replaceChildren();

  (q.options || []).forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "net-quiz-option";
    btn.setAttribute("aria-label", `Select answer: ${opt}`);
    const letter = String.fromCharCode(65 + idx);
    const letterEl = document.createElement("span");
    letterEl.className = "net-quiz-option-letter";
    letterEl.setAttribute("aria-hidden", "true");
    letterEl.textContent = letter;

    const textEl = document.createElement("span");
    textEl.className = "net-quiz-option-text";
    textEl.textContent = String(opt ?? "");

    const statusEl = document.createElement("span");
    statusEl.className = "net-quiz-option-status";
    statusEl.setAttribute("aria-hidden", "true");

    btn.append(letterEl, textEl, statusEl);

    btn.addEventListener("click", () => selectAnswer(state, idx, btn));
    optionsBox.appendChild(btn);
  });

  // Hide feedback + toggle buttons
  hideFeedback();
  setSubmitEnabled(false);
  showNext(false);
  renderMiniProgress(state);

  // Add a tiny entrance animation class (CSS handles it)
  const card = document.getElementById("quizCard");
  if (card) {
    card.classList.remove("net-quiz-enter");
    // force reflow
    void card.offsetWidth;
    card.classList.add("net-quiz-enter");
  }

  const progressCard = document.getElementById("progressCard");
  if (progressCard) progressCard.classList.remove("d-none");
}

function renderMiniProgress(state) {
  const wrap = document.getElementById("miniProgress");
  if (!wrap) return;
  const total = state.questions.length;
  const answeredCount = state.answers.filter((v) => typeof v === "boolean").length;
  const correctCount = state.answers.filter((v) => v === true).length;
  const remaining = Math.max(0, total - answeredCount);

  setText("progressCorrectCount", correctCount);
  setText("progressRemaining", remaining);

  wrap.replaceChildren();
  for (let i = 0; i < total; i += 1) {
    const seg = document.createElement("span");
    seg.className = "net-quiz-progress-bar";
    const ans = state.answers[i];
    if (typeof ans === "boolean") {
      seg.classList.add(ans ? "is-correct" : "is-wrong");
    } else if (i === state.currentIndex) {
      seg.classList.add("is-current");
    }
    wrap.appendChild(seg);
  }
}

function selectAnswer(state, idx, clickedBtn) {
  if (state.showFeedback) return;

  state.selected = idx;

  // Visual: mark selected
  const optionsBox = document.getElementById("optionsBox");
  if (optionsBox) {
    Array.from(optionsBox.querySelectorAll("button")).forEach((b) => {
      b.classList.remove("is-selected");
    });
  }
  if (clickedBtn) clickedBtn.classList.add("is-selected");

  setSubmitEnabled(true);
}

function submitAnswer(state) {
  if (state.selected === null || state.selected === undefined) return;

  const q = state.questions[state.currentIndex];
  const correct = Number(state.selected) === Number(q.correctAnswer);

  state.answers[state.currentIndex] = correct;
  state.showFeedback = true;

  // Lock options + show correct/wrong
  const optionsBox = document.getElementById("optionsBox");
  if (optionsBox) {
    const buttons = Array.from(optionsBox.querySelectorAll("button"));
    buttons.forEach((b, idx) => {
      b.disabled = true;
      b.classList.remove("is-correct", "is-wrong");
      if (idx === Number(q.correctAnswer)) b.classList.add("is-correct");
      if (idx === Number(state.selected) && !correct) b.classList.add("is-wrong");
      const status = b.querySelector(".net-quiz-option-status");
      if (status) {
        status.replaceChildren();
        if (b.classList.contains("is-correct")) {
          const ico = document.createElement("i");
          ico.className = "bi bi-check-lg";
          ico.setAttribute("aria-hidden", "true");
          status.appendChild(ico);
        } else if (b.classList.contains("is-wrong")) {
          const ico = document.createElement("i");
          ico.className = "bi bi-x-lg";
          ico.setAttribute("aria-hidden", "true");
          status.appendChild(ico);
        }
      }
    });
  }

  // Show feedback panel
  showFeedback(correct, q.explanation || "", xpPerQuestion(state, correct));
  renderMiniProgress(state);

  // Toggle buttons
  setSubmitEnabled(false);
  showNext(true);

  // If last question, label button differently
  const nextBtn = document.getElementById("nextBtn");
  const isLast = state.currentIndex === state.questions.length - 1;
  if (nextBtn) nextBtn.textContent = isLast ? "View Results →" : "Next →";
}

function nextQuestion(state) {
  const isLast = state.currentIndex === state.questions.length - 1;
  if (isLast) {
    finishQuiz(state);
    return;
  }

  state.currentIndex += 1;
  renderQuestion(state);
}

function retryQuiz(state) {
  // Clear attempt + reload page fresh (simple + reliable)
  localStorage.removeItem(attemptKey(state));
  window.location.reload();
}

async function finishQuiz(state) {
  const total = state.questions.length;
  const correctCount = state.answers.filter(Boolean).length;
  const percentage = total ? (correctCount / total) * 100 : 0;
  const earnedXP = Math.round((percentage / 100) * state.maxXp);

  const payload = {
    completed: true,
    correctCount,
    total,
    percentage: Math.round(percentage),
    earnedXP,
    answers: state.answers
  };

  const award = await awardQuizXpOnce(state, earnedXP);
  const finalXP = Number(award?.xpAwarded ?? earnedXP);

  payload.earnedXP = finalXP;
  if (award?.alreadyCompleted) payload.alreadyCompleted = true;

  writeAttempt(state, payload);
  markQuizCompletion(state, payload);
  if (award?.usedBackend) {
    await refreshUserFromServer(state.email);
  }
  renderResults(state, payload);

  if (!payload.alreadyCompleted && typeof window.showCelebrateToast === "function") {
    const passed = payload.percentage >= RESULTS_PASS_PCT;
    const perfect = payload.percentage === 100;
    const title = perfect ? "Perfect quiz score" : (passed ? "Quiz completed" : "Quiz attempt saved");
    const message = perfect
      ? "Outstanding accuracy."
      : (passed ? "Nice work — keep going." : "Review the lesson and try again.");
    window.showCelebrateToast({
      title,
      message,
      sub: `Score ${payload.correctCount}/${payload.total}`,
      xp: payload.earnedXP || 0,
      mini: true,
      type: passed ? "success" : "info",
      duration: 20000
    });
  }
}

function renderResultsFromSaved(state, saved, backUrl) {
  markQuizCompletion(state, saved || {});
  renderHeader(state);
  renderResults(state, saved);
  wireBackLinks(backUrl);
}

function renderResults(state, result) {
  // Hide question card, show results
  const quizCard = document.getElementById("quizCard");
  const resultsCard = document.getElementById("resultsCard");
  const progressCard = document.getElementById("progressCard");
  if (quizCard) quizCard.classList.add("d-none");
  if (resultsCard) resultsCard.classList.remove("d-none");
  if (progressCard) progressCard.classList.add("d-none");

  // Progress bar to 100%
  setText("quizStepText", "Completed");
  setText("quizPctText", "100%");
  const bar = document.getElementById("quizProgressBar");
  if (bar) bar.style.width = "100%";

  // Stats
  setText("statCorrect", `${result.correctCount}/${result.total}`);
  setText("statPct", `${result.percentage}%`);
  setText("statXp", `${result.earnedXP}`);

  // Title/subtitle/badge based on result
  const passed = result.percentage >= RESULTS_PASS_PCT;
  const perfect = result.percentage === 100;

  const badge = document.getElementById("resultsBadge");
  const title = document.getElementById("resultsTitle");
  const sub = document.getElementById("resultsSubtitle");

  if (badge) {
    badge.replaceChildren();
    const ico = document.createElement("i");
    ico.setAttribute("aria-hidden", "true");
    if (perfect) ico.className = "bi bi-trophy-fill";
    else if (passed) ico.className = "bi bi-check2-circle";
    else ico.className = "bi bi-lightbulb";
    badge.appendChild(ico);
  }
  if (perfect) {
    if (title) title.textContent = "Perfect Score!";
    if (sub) sub.textContent = "Outstanding work — you got everything correct.";
  } else if (passed) {
    if (title) title.textContent = "Quiz Passed!";
    if (sub) sub.textContent = "Nice job — keep going to the next lesson.";
  } else {
    if (title) title.textContent = "Keep Practicing!";
    if (sub) sub.textContent = "Review the lesson and retry — you’ll get it.";
  }

  // Animate results card in (CSS class)
  if (resultsCard) {
    resultsCard.classList.remove("net-quiz-enter");
    void resultsCard.offsetWidth;
    resultsCard.classList.add("net-quiz-enter");
  }
}

/* AI Prompt: Explain the Feedback helpers section in clear, simple terms. */
/* ----------------------------
   Feedback helpers
---------------------------- */
function showFeedback(correct, explanation, xpEarned) {
  const box = document.getElementById("feedbackBox");
  const icon = document.getElementById("feedbackIcon");
  const title = document.getElementById("feedbackTitle");
  const text = document.getElementById("feedbackText");

  if (!box || !icon || !title || !text) return;

  box.classList.remove("d-none");
  box.classList.remove("is-correct", "is-wrong", "is-show");

  if (correct) {
    box.classList.add("is-correct");
    icon.replaceChildren();
    const ico = document.createElement("i");
    ico.className = "bi bi-check-lg";
    ico.setAttribute("aria-hidden", "true");
    icon.appendChild(ico);
    title.textContent = "Correct";
  } else {
    box.classList.add("is-wrong");
    icon.replaceChildren();
    const ico = document.createElement("i");
    ico.className = "bi bi-x-lg";
    ico.setAttribute("aria-hidden", "true");
    icon.appendChild(ico);
    title.textContent = "Incorrect";
  }

  text.textContent = explanation || "Explanation not available.";
  box.classList.add("is-show");

  // XP row
  const row = document.getElementById("xpEarnedRow");
  const xpText = document.getElementById("xpEarnedText");
  if (row && xpText) {
    if (correct) {
      row.classList.remove("d-none");
      xpText.textContent = `+${xpEarned} XP`;
    } else {
      row.classList.add("d-none");
    }
  }
}

function hideFeedback() {
  const box = document.getElementById("feedbackBox");
  if (box) {
    box.classList.add("d-none");
    box.classList.remove("is-show", "is-correct", "is-wrong");
  }
}

function setSubmitEnabled(on) {
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) submitBtn.disabled = !on;
}

function showNext(on) {
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");
  if (nextBtn && submitBtn) {
    if (on) {
      nextBtn.classList.remove("d-none");
      submitBtn.classList.add("d-none");
    } else {
      nextBtn.classList.add("d-none");
      submitBtn.classList.remove("d-none");
    }
  }
}

function xpPerQuestion(state, correct) {
  if (!correct) return 0;
  const per = Math.round(state.maxXp / Math.max(state.questions.length, 1));
  return Math.max(per, 1);
}

/* AI Prompt: Explain the Backend XP (best effort) section in clear, simple terms. */
/* ----------------------------
   Backend XP (best effort)
---------------------------- */
/*
Calls your existing backend route once.
- Prevents duplicates with a local cache flag per course+lesson+user.
- Sends earned_xp as an extra field (backend can ignore).
*/
function awardKey(state) {
  return `netology_quiz_awarded:${state.email}:${state.courseId}:${state.lessonNumber}`;
}

async function awardQuizXpOnce(state, earnedXP) {
  // If already awarded (front-end flag), do nothing
  if (localStorage.getItem(awardKey(state)) === "1") {
    return { xpAwarded: 0, alreadyCompleted: true, usedBackend: false };
  }

  const apiBase = window.API_BASE;
  if (!apiBase) {
    localStorage.setItem(awardKey(state), "1");
    return { xpAwarded: Number(earnedXP || 0), alreadyCompleted: false, usedBackend: false };
  }

  try {
    const res = await fetch(`${apiBase}/complete-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: state.email,
        course_id: state.courseId,
        lesson_number: state.lessonNumber,
        earned_xp: earnedXP
      })
    });

    // Even if backend awards fixed XP, we mark awarded so it won’t spam
    const data = await res.json().catch(() => ({}));

    if (data && data.success) {
      localStorage.setItem(awardKey(state), "1");
      return {
        xpAwarded: Number(data.xp_added || 0),
        alreadyCompleted: !!data.already_completed,
        usedBackend: true
      };
    }
    return { xpAwarded: Number(earnedXP || 0), alreadyCompleted: false, usedBackend: false };
  } catch (e) {
    console.error("awardQuizXpOnce error:", e);
    return { xpAwarded: Number(earnedXP || 0), alreadyCompleted: false, usedBackend: false };
  }
}

/* AI Prompt: Explain the Tiny DOM helpers section in clear, simple terms. */
/* ----------------------------
   Tiny DOM helpers
---------------------------- */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
