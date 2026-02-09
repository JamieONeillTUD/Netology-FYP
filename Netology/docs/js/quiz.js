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

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("course");
  const lessonNumber = Number(params.get("lesson") || 0);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.email || !courseId || !lessonNumber) {
    window.location.href = "login.html";
    return;
  }

  // Wire back links
  const backUrl = `course.html?id=${encodeURIComponent(courseId)}&lesson=${encodeURIComponent(lessonNumber)}`;
  const backTop = document.getElementById("backToCourseTop");
  const backBtn = document.getElementById("backToCourseBtn");
  if (backTop) backTop.href = backUrl;
  if (backBtn) backBtn.href = backUrl;

  // Load quiz model from course_content.js
  const quizModel = getQuizModel(courseId, lessonNumber);

  if (!quizModel || !quizModel.questions || quizModel.questions.length === 0) {
    // No quiz found - send user back
    alert("No quiz found for this lesson yet.");
    window.location.href = backUrl;
    return;
  }

  // Init state
  const state = {
    courseId,
    lessonNumber,
    email: user.email,
    title: quizModel.title,
    maxXp: quizModel.xp,
    questions: quizModel.questions,
    currentIndex: 0,
    selected: null,
    showFeedback: false,
    answers: [], // boolean per question
  };

  // Load existing attempt (if any)
  const saved = readAttempt(state);
  if (saved && saved.completed) {
    // If they already completed, show results immediately
    renderResultsFromSaved(state, saved, backUrl);
    return;
  }

  // Render header
  setText("quizTitle", state.title);
  setText("quizMeta", `Lesson ${state.lessonNumber} • ${state.questions.length} questions`);
  setText("quizXpLabel", `${state.maxXp} XP`);

  // Buttons
  const submitBtn = document.getElementById("submitBtn");
  const nextBtn = document.getElementById("nextBtn");
  const retryBtn = document.getElementById("retryBtn");

  if (submitBtn) submitBtn.addEventListener("click", () => submitAnswer(state));
  if (nextBtn) nextBtn.addEventListener("click", () => nextQuestion(state));
  if (retryBtn) retryBtn.addEventListener("click", () => retryQuiz(state));

  // First render
  renderQuestion(state);
});

const QUIZ_PASS_PCT = 60;

function safeJson(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function bumpUserXP(email, addXP) {
  if (!email || !addXP) return;
  const raw = localStorage.getItem("netology_user") || localStorage.getItem("user");
  const user = safeJson(raw) || {};
  if (!user || user.email !== email) return;
  user.xp = Math.max(0, Number(user.xp || 0) + Number(addXP || 0));
  if (localStorage.getItem("netology_user")) localStorage.setItem("netology_user", JSON.stringify(user));
  if (localStorage.getItem("user")) localStorage.setItem("user", JSON.stringify(user));
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
  const list = safeJson(localStorage.getItem(key)) || [];
  list.push(entry);
  localStorage.setItem(key, JSON.stringify(list));
}

function trackCourseStart(email, courseId, lessonNumber) {
  if (!email || !courseId) return;
  const key = `netology_started_courses:${email}`;
  const list = safeJson(localStorage.getItem(key)) || [];
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
  const passed = Number(payload.percentage || 0) >= QUIZ_PASS_PCT;
  if (!passed) return;

  const key = `netology_completions:${state.email}:${state.courseId}`;
  const data = safeJson(localStorage.getItem(key)) || { lesson: [], quiz: [], challenge: [] };
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

/* ----------------------------
   Quiz Model Helpers
---------------------------- */

/*
Supports BOTH shapes:
A) lesson.quiz = { title, xp, questions: [...] }
B) lesson.quiz = { question, options, answer, explain } (single question legacy)
*/
function getQuizModel(courseId, lessonNumber) {
  if (typeof COURSE_CONTENT === "undefined") return null;
  const course = COURSE_CONTENT[String(courseId)];
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

  const entry = flat.find(x => Number(x.index) === Number(lessonNumber));
  if (!entry || !entry.lesson) return null;

  const lesson = entry.lesson;
  const q = lesson.quiz;

  // Default title and XP if not set
  const baseTitle = `Lesson ${lessonNumber} Quiz`;
  const baseXp = 40; // default max XP per quiz if you don’t specify yet

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
  optionsBox.innerHTML = "";

  (q.options || []).forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "net-quiz-option";
    btn.setAttribute("aria-label", `Select answer: ${opt}`);
    btn.textContent = opt;

    btn.addEventListener("click", () => selectAnswer(state, idx, btn));
    optionsBox.appendChild(btn);
  });

  // Hide feedback + toggle buttons
  hideFeedback();
  setSubmitEnabled(false);
  showNext(false);

  // Add a tiny entrance animation class (CSS handles it)
  const card = document.getElementById("quizCard");
  if (card) {
    card.classList.remove("net-quiz-enter");
    // force reflow
    void card.offsetWidth;
    card.classList.add("net-quiz-enter");
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
    });
  }

  // Show feedback panel
  showFeedback(correct, q.explanation || "", xpPerQuestion(state, correct));

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

  // Keep URL params, just reload
  window.location.reload();
}

function finishQuiz(state) {
  const total = state.questions.length;
  const correctCount = state.answers.filter(Boolean).length;
  const percentage = total ? (correctCount / total) * 100 : 0;

  const earnedXP = Math.round((percentage / 100) * state.maxXp);

  // Save attempt
  const payload = {
    completed: true,
    correctCount,
    total,
    percentage: Math.round(percentage),
    earnedXP,
    answers: state.answers
  };
  writeAttempt(state, payload);
  markQuizCompletion(state, payload);

  // Best-effort backend award (once)
  awardQuizXpOnce(state, earnedXP).finally(() => {
    renderResults(state, payload);
  });
}

function renderResultsFromSaved(state, saved, backUrl) {
  // Render header
  setText("quizTitle", state.title);
  setText("quizMeta", `Lesson ${state.lessonNumber} • ${state.questions.length} questions`);
  setText("quizXpLabel", `${state.maxXp} XP`);

  renderResults(state, saved);

  // Ensure back links correct
  const backTop = document.getElementById("backToCourseTop");
  const backBtn = document.getElementById("backToCourseBtn");
  if (backTop) backTop.href = backUrl;
  if (backBtn) backBtn.href = backUrl;
}

function renderResults(state, result) {
  // Hide question card, show results
  const quizCard = document.getElementById("quizCard");
  const resultsCard = document.getElementById("resultsCard");
  if (quizCard) quizCard.classList.add("d-none");
  if (resultsCard) resultsCard.classList.remove("d-none");

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
  const passed = result.percentage >= 70;
  const perfect = result.percentage === 100;

  const badge = document.getElementById("resultsBadge");
  const title = document.getElementById("resultsTitle");
  const sub = document.getElementById("resultsSubtitle");

  if (perfect) {
    if (badge) badge.textContent = "🏆";
    if (title) title.textContent = "Perfect Score! 🎉";
    if (sub) sub.textContent = "Outstanding work — you got everything correct.";
  } else if (passed) {
    if (badge) badge.textContent = "✅";
    if (title) title.textContent = "Quiz Passed!";
    if (sub) sub.textContent = "Nice job — keep going to the next lesson.";
  } else {
    if (badge) badge.textContent = "🧠";
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
  box.classList.remove("is-correct", "is-wrong");

  if (correct) {
    box.classList.add("is-correct");
    icon.textContent = "✓";
    title.textContent = "Correct ✅";
  } else {
    box.classList.add("is-wrong");
    icon.textContent = "✕";
    title.textContent = "Incorrect";
  }

  text.textContent = explanation || "Explanation not available.";

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
  if (box) box.classList.add("d-none");
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
  if (localStorage.getItem(awardKey(state)) === "1") return;

  try {
    const res = await fetch(`${window.API_BASE}/complete-quiz`, {
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
    }
  } catch (e) {
    console.error("awardQuizXpOnce error:", e);
  }
}

/* ----------------------------
   Tiny DOM helpers
---------------------------- */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
