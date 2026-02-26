/*
---------------------------------------------------------
Student: C22320301 - Jamie O’Neill
File: quiz.js
Purpose: Runs the quiz page from loading questions to saving results and awarding XP.
Notes: Rewritten with simpler structure, clearer names, and short student-friendly comments.
---------------------------------------------------------
*/

const RESULTS_PASS_PERCENT = 70;
const DEFAULT_QUIZ_XP = 40;
const ENDPOINTS = window.ENDPOINTS || {};

// Use shared API helper when available.
const apiGet = typeof window.apiGet === "function"
  ? window.apiGet
  : async function apiGetFallback(path, params = {}) {
    const base = String(window.API_BASE || "").trim();
    const url = base
      ? new URL(base.replace(/\/$/, "") + path)
      : new URL(path, window.location.origin);

    Object.entries(params).forEach(([paramName, paramValue]) => {
      if (paramValue !== undefined && paramValue !== null && paramValue !== "") {
        url.searchParams.set(paramName, String(paramValue));
      }
    });

    const response = await fetch(url.toString());
    return response.json();
  };

document.addEventListener("DOMContentLoaded", () => {
  initQuizPage().catch((error) => {
    console.error("Quiz init failed:", error);
  });
});

// Main page startup.
async function initQuizPage() {
  const quizParams = readQuizParams();
  const currentUser = readUserFromStorage();

  if (!currentUser.email || !quizParams.courseId || !quizParams.lessonNumber) {
    redirectToLogin();
    return;
  }

  let resolvedCourse = resolveCourseContent(quizParams.courseId, quizParams.contentId);
  if (!resolvedCourse.course || resolvedCourse.fallback) {
    const titleHint = await fetchCourseTitle(quizParams.courseId);
    if (titleHint) {
      resolvedCourse = resolveCourseContent(quizParams.courseId, quizParams.contentId, titleHint);
    }
  }

  const resolvedContentId = resolvedCourse.id || quizParams.contentId || quizParams.courseId;
  syncContentIdInUrl(resolvedContentId, quizParams.contentId);

  const backUrl = buildCourseUrl(quizParams.courseId, quizParams.lessonNumber, resolvedContentId);
  wireBackLinks(backUrl);

  const quizModel = resolvedCourse.course
    ? getQuizModelFromCourse(resolvedCourse.course, quizParams.lessonNumber)
    : null;

  if (!quizModel || !Array.isArray(quizModel.questions) || quizModel.questions.length === 0) {
    alert("No quiz found for this lesson yet.");
    window.location.href = backUrl;
    return;
  }

  const moduleTitle = resolvedCourse.course
    ? resolveUnitTitle(resolvedCourse.course, quizParams.lessonNumber)
    : "";

  const state = createQuizState({
    courseId: quizParams.courseId,
    lessonNumber: quizParams.lessonNumber,
    email: currentUser.email,
    model: quizModel,
    courseTitle: resolvedCourse.course?.title || "",
    moduleTitle
  });

  const savedAttempt = readAttempt(state);
  if (savedAttempt?.completed) {
    renderResultsFromSaved(state, savedAttempt, backUrl);
    return;
  }

  renderHeader(state);
  wireActionButtons(state);
  renderQuestion(state);
}

// Read course/lesson/content from query string.
function readQuizParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    courseId: params.get("course") || params.get("course_id") || params.get("id"),
    contentId: params.get("content_id") || params.get("content"),
    lessonNumber: Number(params.get("lesson") || 0)
  };
}

// Read current user from local storage.
function readUserFromStorage() {
  return (
    parseJsonSafe(localStorage.getItem("netology_user"))
    || parseJsonSafe(localStorage.getItem("user"))
    || {}
  );
}

// Keep content_id in the URL so links stay stable.
function syncContentIdInUrl(resolvedContentId, currentContentId) {
  if (!resolvedContentId) return;
  if (String(resolvedContentId) === String(currentContentId || "")) return;

  const url = new URL(window.location.href);
  url.searchParams.set("content_id", String(resolvedContentId));
  url.searchParams.delete("content");
  history.replaceState(null, "", url.toString());
}

function redirectToLogin() {
  window.location.href = "login.html";
}

// Build return link to course page.
function buildCourseUrl(courseId, lessonNumber, contentId) {
  const params = new URLSearchParams();
  params.set("id", courseId);
  if (contentId) params.set("content_id", contentId);
  if (lessonNumber) params.set("lesson", String(lessonNumber));
  return `course.html?${params.toString()}`;
}

// Try to read course title from API as a fallback resolver hint.
async function fetchCourseTitle(courseId) {
  if (!courseId) return "";

  try {
    const data = await apiGet(ENDPOINTS.courses?.courseDetails || "/course", { id: courseId });
    if (data?.success && data?.title) return data.title;
  } catch {
    // Ignore API fallback errors.
  }

  return "";
}

// Resolve a course object from COURSE_CONTENT by id, content id, or title.
function resolveCourseContent(courseId, contentId, titleHint) {
  if (typeof COURSE_CONTENT === "undefined") {
    return { course: null, id: null, fallback: false };
  }

  const content = COURSE_CONTENT || {};
  const lookupKeys = [contentId, courseId].filter(Boolean).map(String);

  for (const lookupKey of lookupKeys) {
    if (content[lookupKey]) {
      return {
        course: content[lookupKey],
        id: String(content[lookupKey]?.id || lookupKey),
        fallback: false
      };
    }
  }

  const allCourses = Object.values(content);
  const byId = allCourses.find((courseEntry) => {
    return String(courseEntry?.id || "") === String(contentId || courseId);
  });
  if (byId) {
    return {
      course: byId,
      id: String(byId.id || contentId || courseId),
      fallback: false
    };
  }

  const normalizedTitle = String(titleHint || "").trim().toLowerCase();
  if (normalizedTitle) {
    const byTitle = allCourses.find((courseEntry) => {
      return String(courseEntry?.title || "").trim().toLowerCase() === normalizedTitle;
    });

    if (byTitle) {
      return {
        course: byTitle,
        id: String(byTitle.id || contentId || courseId),
        fallback: false
      };
    }
  }

  const firstContentKey = Object.keys(content)[0];
  if (firstContentKey) {
    return {
      course: content[firstContentKey],
      id: String(content[firstContentKey]?.id || firstContentKey),
      fallback: true
    };
  }

  return { course: null, id: null, fallback: false };
}

// Find module title for breadcrumb by lesson number.
function resolveUnitTitle(course, lessonNumber) {
  if (!course || !Array.isArray(course.units)) return "";

  let lessonCounter = 1;

  for (let unitIndex = 0; unitIndex < course.units.length; unitIndex += 1) {
    const unitEntry = course.units[unitIndex];
    const unitTitle = unitEntry.title || unitEntry.name || `Module ${unitIndex + 1}`;

    if (Array.isArray(unitEntry.lessons) && unitEntry.lessons.length) {
      for (let lessonIndex = 0; lessonIndex < unitEntry.lessons.length; lessonIndex += 1) {
        if (lessonCounter === lessonNumber) return unitTitle;
        lessonCounter += 1;
      }
      continue;
    }

    if (Array.isArray(unitEntry.sections)) {
      for (const section of unitEntry.sections) {
        const sectionItems = Array.isArray(section.items) ? section.items : [];
        for (const sectionItem of sectionItems) {
          if (String(sectionItem?.type || "").toLowerCase() !== "learn") continue;
          if (lessonCounter === lessonNumber) return unitTitle;
          lessonCounter += 1;
        }
      }
    }
  }

  return "";
}

function wireBackLinks(backUrl) {
  const topLink = document.getElementById("backToCourseTop");
  const bottomLink = document.getElementById("backToCourseBtn");
  if (topLink) topLink.href = backUrl;
  if (bottomLink) bottomLink.href = backUrl;
}

function renderHeader(state) {
  setText("quizTitle", state.title);
  setText("quizMeta", `Lesson ${state.lessonNumber} • ${state.questions.length} questions`);
  setText("quizXpLabel", `${state.maxXp} XP`);
  setText("breadcrumbCourse", state.courseTitle || "Course");
  setText("breadcrumbModule", state.moduleTitle || "Module");
  setText("breadcrumbQuiz", `Lesson ${state.lessonNumber}`);

  document.body.classList.remove("net-loading");
  document.body.classList.add("net-loaded");
}

function wireActionButtons(state) {
  const submitButton = document.getElementById("submitBtn");
  const nextButton = document.getElementById("nextBtn");
  const retryButton = document.getElementById("retryBtn");

  if (submitButton) submitButton.addEventListener("click", () => submitAnswer(state));
  if (nextButton) nextButton.addEventListener("click", () => nextQuestion(state));
  if (retryButton) retryButton.addEventListener("click", () => retryQuiz(state));
}

function createQuizState({ courseId, lessonNumber, email, model, courseTitle, moduleTitle }) {
  return {
    courseId,
    lessonNumber,
    email,
    courseTitle,
    moduleTitle,
    title: model.title,
    maxXp: model.xp,
    questions: model.questions,
    currentIndex: 0,
    selected: null,
    showFeedback: false,
    answers: []
  };
}

function parseJsonSafe(rawValue) {
  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

// Refresh user data from server after backend XP updates.
async function refreshUserFromServer(email) {
  try {
    if (!email) return;

    const data = await apiGet(ENDPOINTS.auth?.userInfo || "/user-info", { email });
    if (!data?.success) return;

    const localUser = readUserFromStorage();
    const unlockTier = String(
      data.start_level
      || localUser?.unlock_tier
      || localUser?.unlock_level
      || localUser?.unlockTier
      || "novice"
    ).trim().toLowerCase();

    const mergedUser = {
      ...(localUser || {}),
      email,
      first_name: data.first_name || localUser?.first_name,
      last_name: data.last_name || localUser?.last_name,
      username: data.username || localUser?.username,
      xp: Number(data.xp || data.total_xp || localUser?.xp || 0),
      unlock_tier: ["novice", "intermediate", "advanced"].includes(unlockTier) ? unlockTier : "novice"
    };

    localStorage.setItem("user", JSON.stringify(mergedUser));
    localStorage.setItem("netology_user", JSON.stringify(mergedUser));
  } catch {
    // Ignore refresh errors.
  }
}

// XP math helpers.
function totalXpForLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return (safeLevel - 1) * safeLevel * 50;
}

function levelFromTotalXp(totalXp) {
  let level = 1;
  let remainingXp = Math.max(0, Number(totalXp) || 0);
  let levelStepXp = 100;

  while (remainingXp >= levelStepXp) {
    remainingXp -= levelStepXp;
    level += 1;
    levelStepXp += 100;
  }

  return level;
}

function rankForLevel(level) {
  if (Number(level) >= 5) return "Advanced";
  if (Number(level) >= 3) return "Intermediate";
  return "Novice";
}

function applyXpToUser(user, xpToAdd) {
  const nextTotalXp = Math.max(0, Number(user?.xp || 0) + Number(xpToAdd || 0));
  const nextLevel = levelFromTotalXp(nextTotalXp);
  const levelStartXp = totalXpForLevel(nextLevel);

  return {
    ...user,
    xp: nextTotalXp,
    numeric_level: nextLevel,
    level: rankForLevel(nextLevel),
    rank: rankForLevel(nextLevel),
    xp_into_level: Math.max(0, nextTotalXp - levelStartXp),
    next_level_xp: nextLevel * 100
  };
}

function bumpUserXP(email, xpToAdd) {
  if (!email || !xpToAdd) return;

  const rawUser = localStorage.getItem("netology_user") || localStorage.getItem("user");
  const localUser = parseJsonSafe(rawUser) || {};
  if (localUser.email !== email) return;

  const updatedUser = applyXpToUser(localUser, xpToAdd);

  if (localStorage.getItem("netology_user")) {
    localStorage.setItem("netology_user", JSON.stringify(updatedUser));
  }
  if (localStorage.getItem("user")) {
    localStorage.setItem("user", JSON.stringify(updatedUser));
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
  const startedList = parseJsonSafe(localStorage.getItem(key)) || [];
  const existingCourse = startedList.find((courseEntry) => String(courseEntry.id) === String(courseId));

  const nextData = {
    id: String(courseId),
    lastViewed: Date.now(),
    lastLesson: Number(lessonNumber || 0) || undefined
  };

  if (existingCourse) {
    existingCourse.lastViewed = nextData.lastViewed;
    if (nextData.lastLesson) existingCourse.lastLesson = nextData.lastLesson;
  } else {
    startedList.push(nextData);
  }

  localStorage.setItem(key, JSON.stringify(startedList));
}

// Mark this quiz as completed in local records.
function markQuizCompletion(state, result) {
  const key = `netology_completions:${state.email}:${state.courseId}`;
  const data = parseJsonSafe(localStorage.getItem(key)) || { lesson: [], quiz: [], challenge: [] };
  const quizList = data.quiz || data.quizzes || [];

  if (quizList.includes(Number(state.lessonNumber))) return;

  quizList.push(Number(state.lessonNumber));
  data.quiz = quizList;
  localStorage.setItem(key, JSON.stringify(data));

  trackCourseStart(state.email, state.courseId, state.lessonNumber);
  logProgressEvent(state.email, {
    type: "quiz",
    course_id: state.courseId,
    lesson_number: state.lessonNumber,
    xp: Number(result.earnedXP || 0)
  });
  bumpUserXP(state.email, Number(result.earnedXP || 0));
}

// Read quiz data from lesson content.
function getQuizModelFromCourse(course, lessonNumber) {
  if (!course || !Array.isArray(course.units)) return null;

  const lessonEntries = [];
  let lessonCounter = 1;

  course.units.forEach((unitEntry) => {
    const lessons = Array.isArray(unitEntry?.lessons) ? unitEntry.lessons : [];
    lessons.forEach((lessonEntry) => {
      lessonEntries.push({ index: lessonCounter, lesson: lessonEntry });
      lessonCounter += 1;
    });
  });

  const matchedEntry = lessonEntries.find((entry) => Number(entry.index) === Number(lessonNumber));
  if (!matchedEntry?.lesson) return null;

  const lessonQuiz = matchedEntry.lesson.quiz;
  const defaultTitle = `Lesson ${lessonNumber} Quiz`;

  if (lessonQuiz && Array.isArray(lessonQuiz.questions)) {
    return {
      title: lessonQuiz.title || defaultTitle,
      xp: Number(lessonQuiz.xp || DEFAULT_QUIZ_XP),
      questions: lessonQuiz.questions.map((questionEntry, questionIndex) => ({
        id: questionEntry.id || `q${questionIndex + 1}`,
        question: questionEntry.question || "",
        options: Array.isArray(questionEntry.options) ? questionEntry.options : [],
        correctAnswer: Number(questionEntry.correctAnswer || 0),
        explanation: questionEntry.explanation || ""
      }))
    };
  }

  if (lessonQuiz && lessonQuiz.question && Array.isArray(lessonQuiz.options)) {
    return {
      title: defaultTitle,
      xp: Number(lessonQuiz.xp || DEFAULT_QUIZ_XP),
      questions: [
        {
          id: "q1",
          question: lessonQuiz.question,
          options: lessonQuiz.options,
          correctAnswer: Number(lessonQuiz.answer || 0),
          explanation: lessonQuiz.explain || ""
        }
      ]
    };
  }

  return null;
}

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

// Render current question and answers.
function renderQuestion(state) {
  const currentQuestion = state.questions[state.currentIndex];
  if (!currentQuestion) return;

  state.selected = null;
  state.showFeedback = false;

  const totalQuestions = state.questions.length;
  const progressPercent = Math.round((state.currentIndex / totalQuestions) * 100);

  setText("quizStepText", `Question ${state.currentIndex + 1} of ${totalQuestions}`);
  setText("quizPctText", `${progressPercent}%`);
  setText("questionCountChip", `${state.currentIndex + 1}/${totalQuestions}`);
  setText("questionText", currentQuestion.question || "Question");
  setText("questionTag", "Question");

  const progressBar = document.getElementById("quizProgressBar");
  if (progressBar) progressBar.style.width = `${progressPercent}%`;

  const optionsBox = document.getElementById("optionsBox");
  if (!optionsBox) return;

  optionsBox.replaceChildren();
  currentQuestion.options.forEach((optionText, optionIndex) => {
    const optionButton = buildOptionButton(state, optionText, optionIndex);
    optionsBox.appendChild(optionButton);
  });

  hideFeedback();
  setSubmitEnabled(false);
  showNext(false);
  renderMiniProgress(state);

  animateCard("quizCard");

  const progressCard = document.getElementById("progressCard");
  if (progressCard) progressCard.classList.remove("d-none");
}

function buildOptionButton(state, optionText, optionIndex) {
  const optionButton = document.createElement("button");
  optionButton.type = "button";
  optionButton.className = "net-quiz-option";
  optionButton.setAttribute("aria-label", `Select answer: ${optionText}`);

  const optionLetter = String.fromCharCode(65 + optionIndex);

  const letterElement = document.createElement("span");
  letterElement.className = "net-quiz-option-letter";
  letterElement.setAttribute("aria-hidden", "true");
  letterElement.textContent = optionLetter;

  const textElement = document.createElement("span");
  textElement.className = "net-quiz-option-text";
  textElement.textContent = String(optionText ?? "");

  const statusElement = document.createElement("span");
  statusElement.className = "net-quiz-option-status";
  statusElement.setAttribute("aria-hidden", "true");

  optionButton.append(letterElement, textElement, statusElement);
  optionButton.addEventListener("click", () => {
    selectAnswer(state, optionIndex, optionButton);
  });

  return optionButton;
}

function renderMiniProgress(state) {
  const miniProgress = document.getElementById("miniProgress");
  if (!miniProgress) return;

  const totalQuestions = state.questions.length;
  const answeredCount = state.answers.filter((answerValue) => typeof answerValue === "boolean").length;
  const correctCount = state.answers.filter((answerValue) => answerValue === true).length;
  const remainingCount = Math.max(0, totalQuestions - answeredCount);

  setText("progressCorrectCount", correctCount);
  setText("progressRemaining", remainingCount);

  miniProgress.replaceChildren();

  for (let questionIndex = 0; questionIndex < totalQuestions; questionIndex += 1) {
    const segment = document.createElement("span");
    segment.className = "net-quiz-progress-bar";

    const answerState = state.answers[questionIndex];
    if (typeof answerState === "boolean") {
      segment.classList.add(answerState ? "is-correct" : "is-wrong");
    } else if (questionIndex === state.currentIndex) {
      segment.classList.add("is-current");
    }

    miniProgress.appendChild(segment);
  }
}

function selectAnswer(state, optionIndex, clickedButton) {
  if (state.showFeedback) return;

  state.selected = optionIndex;

  const optionsBox = document.getElementById("optionsBox");
  if (optionsBox) {
    Array.from(optionsBox.querySelectorAll("button")).forEach((buttonElement) => {
      buttonElement.classList.remove("is-selected");
    });
  }

  if (clickedButton) clickedButton.classList.add("is-selected");
  setSubmitEnabled(true);
}

function submitAnswer(state) {
  if (state.selected === null || state.selected === undefined) return;

  const currentQuestion = state.questions[state.currentIndex];
  const isCorrect = Number(state.selected) === Number(currentQuestion.correctAnswer);

  state.answers[state.currentIndex] = isCorrect;
  state.showFeedback = true;

  applyOptionResultStyles(currentQuestion, state.selected, isCorrect);

  const xpEarned = xpPerQuestion(state, isCorrect);
  showFeedback(isCorrect, currentQuestion.explanation || "", xpEarned);
  renderMiniProgress(state);

  setSubmitEnabled(false);
  showNext(true);

  const nextButton = document.getElementById("nextBtn");
  const isLastQuestion = state.currentIndex === state.questions.length - 1;
  if (nextButton) {
    nextButton.textContent = isLastQuestion ? "View Results →" : "Next →";
  }
}

function applyOptionResultStyles(currentQuestion, selectedIndex, isCorrect) {
  const optionsBox = document.getElementById("optionsBox");
  if (!optionsBox) return;

  const buttons = Array.from(optionsBox.querySelectorAll("button"));

  buttons.forEach((buttonElement, buttonIndex) => {
    buttonElement.disabled = true;
    buttonElement.classList.remove("is-correct", "is-wrong");

    const isCorrectOption = buttonIndex === Number(currentQuestion.correctAnswer);
    const isWrongSelection = buttonIndex === Number(selectedIndex) && !isCorrect;

    if (isCorrectOption) buttonElement.classList.add("is-correct");
    if (isWrongSelection) buttonElement.classList.add("is-wrong");

    const statusElement = buttonElement.querySelector(".net-quiz-option-status");
    updateOptionStatusIcon(statusElement, isCorrectOption, isWrongSelection);
  });
}

function updateOptionStatusIcon(statusElement, isCorrectOption, isWrongSelection) {
  if (!statusElement) return;

  statusElement.replaceChildren();

  if (isCorrectOption) {
    const iconElement = document.createElement("i");
    iconElement.className = "bi bi-check-lg";
    iconElement.setAttribute("aria-hidden", "true");
    statusElement.appendChild(iconElement);
    return;
  }

  if (isWrongSelection) {
    const iconElement = document.createElement("i");
    iconElement.className = "bi bi-x-lg";
    iconElement.setAttribute("aria-hidden", "true");
    statusElement.appendChild(iconElement);
  }
}

function nextQuestion(state) {
  const isLastQuestion = state.currentIndex === state.questions.length - 1;
  if (isLastQuestion) {
    finishQuiz(state);
    return;
  }

  state.currentIndex += 1;
  renderQuestion(state);
}

// Clear saved attempt and restart.
function retryQuiz(state) {
  localStorage.removeItem(attemptKey(state));
  window.location.reload();
}

// Finish quiz, save attempt, update progress, and show results.
async function finishQuiz(state) {
  const totalQuestions = state.questions.length;
  const correctCount = state.answers.filter((answerValue) => answerValue === true).length;
  const rawPercent = totalQuestions ? (correctCount / totalQuestions) * 100 : 0;
  const localEarnedXp = Math.round((rawPercent / 100) * state.maxXp);

  const result = {
    completed: true,
    correctCount,
    total: totalQuestions,
    percentage: Math.round(rawPercent),
    earnedXP: localEarnedXp,
    answers: state.answers
  };

  const awardResponse = await awardQuizXpOnce(state, localEarnedXp);
  const finalEarnedXp = Number(awardResponse?.xpAwarded ?? localEarnedXp);

  result.earnedXP = finalEarnedXp;
  if (awardResponse?.alreadyCompleted) {
    result.alreadyCompleted = true;
  }

  writeAttempt(state, result);
  markQuizCompletion(state, result);

  if (awardResponse?.usedBackend) {
    await refreshUserFromServer(state.email);
  }

  renderResults(state, result);
  maybeShowResultToast(result);
}

function maybeShowResultToast(result) {
  if (result.alreadyCompleted) return;
  if (typeof window.showCelebrateToast !== "function") return;

  const passed = result.percentage >= RESULTS_PASS_PERCENT;
  const perfect = result.percentage === 100;

  const title = perfect
    ? "Perfect quiz score"
    : (passed ? "Quiz completed" : "Quiz attempt saved");

  const message = perfect
    ? "Outstanding accuracy."
    : (passed ? "Nice work — keep going." : "Review the lesson and try again.");

  window.showCelebrateToast({
    title,
    message,
    sub: `Score ${result.correctCount}/${result.total}`,
    xp: result.earnedXP || 0,
    mini: true,
    type: passed ? "success" : "info",
    duration: 20000
  });
}

function renderResultsFromSaved(state, savedAttempt, backUrl) {
  markQuizCompletion(state, savedAttempt || {});
  renderHeader(state);
  renderResults(state, savedAttempt);
  wireBackLinks(backUrl);
}

function renderResults(state, result) {
  const quizCard = document.getElementById("quizCard");
  const resultsCard = document.getElementById("resultsCard");
  const progressCard = document.getElementById("progressCard");

  if (quizCard) quizCard.classList.add("d-none");
  if (resultsCard) resultsCard.classList.remove("d-none");
  if (progressCard) progressCard.classList.add("d-none");

  setText("quizStepText", "Completed");
  setText("quizPctText", "100%");

  const progressBar = document.getElementById("quizProgressBar");
  if (progressBar) progressBar.style.width = "100%";

  setText("statCorrect", `${result.correctCount}/${result.total}`);
  setText("statPct", `${result.percentage}%`);
  setText("statXp", `${result.earnedXP}`);

  const passed = result.percentage >= RESULTS_PASS_PERCENT;
  const perfect = result.percentage === 100;

  renderResultsBadge(perfect, passed);

  if (perfect) {
    setText("resultsTitle", "Perfect Score!");
    setText("resultsSubtitle", "Outstanding work — you got everything correct.");
  } else if (passed) {
    setText("resultsTitle", "Quiz Passed!");
    setText("resultsSubtitle", "Nice job — keep going to the next lesson.");
  } else {
    setText("resultsTitle", "Keep Practicing!");
    setText("resultsSubtitle", "Review the lesson and retry — you’ll get it.");
  }

  animateCard("resultsCard");
}

function renderResultsBadge(perfect, passed) {
  const badge = document.getElementById("resultsBadge");
  if (!badge) return;

  badge.replaceChildren();

  const iconElement = document.createElement("i");
  iconElement.setAttribute("aria-hidden", "true");

  if (perfect) {
    iconElement.className = "bi bi-trophy-fill";
  } else if (passed) {
    iconElement.className = "bi bi-check2-circle";
  } else {
    iconElement.className = "bi bi-lightbulb";
  }

  badge.appendChild(iconElement);
}

// Show right/wrong feedback under the question.
function showFeedback(isCorrect, explanation, xpEarned) {
  const box = document.getElementById("feedbackBox");
  const icon = document.getElementById("feedbackIcon");
  const title = document.getElementById("feedbackTitle");
  const text = document.getElementById("feedbackText");

  if (!box || !icon || !title || !text) return;

  box.classList.remove("d-none", "is-correct", "is-wrong", "is-show");
  icon.replaceChildren();

  const iconElement = document.createElement("i");
  iconElement.setAttribute("aria-hidden", "true");

  if (isCorrect) {
    box.classList.add("is-correct");
    iconElement.className = "bi bi-check-lg";
    title.textContent = "Correct";
  } else {
    box.classList.add("is-wrong");
    iconElement.className = "bi bi-x-lg";
    title.textContent = "Incorrect";
  }

  icon.appendChild(iconElement);
  text.textContent = explanation || "Explanation not available.";
  box.classList.add("is-show");

  const xpRow = document.getElementById("xpEarnedRow");
  const xpText = document.getElementById("xpEarnedText");
  if (xpRow && xpText) {
    if (isCorrect) {
      xpRow.classList.remove("d-none");
      xpText.textContent = `+${xpEarned} XP`;
    } else {
      xpRow.classList.add("d-none");
    }
  }
}

function hideFeedback() {
  const box = document.getElementById("feedbackBox");
  if (!box) return;

  box.classList.add("d-none");
  box.classList.remove("is-show", "is-correct", "is-wrong");
}

function setSubmitEnabled(enabled) {
  const submitButton = document.getElementById("submitBtn");
  if (submitButton) submitButton.disabled = !enabled;
}

function showNext(show) {
  const nextButton = document.getElementById("nextBtn");
  const submitButton = document.getElementById("submitBtn");
  if (!nextButton || !submitButton) return;

  if (show) {
    nextButton.classList.remove("d-none");
    submitButton.classList.add("d-none");
  } else {
    nextButton.classList.add("d-none");
    submitButton.classList.remove("d-none");
  }
}

function xpPerQuestion(state, isCorrect) {
  if (!isCorrect) return 0;
  const xpPerQuestionValue = Math.round(state.maxXp / Math.max(state.questions.length, 1));
  return Math.max(xpPerQuestionValue, 1);
}

function animateCard(elementId) {
  const card = document.getElementById(elementId);
  if (!card) return;

  card.classList.remove("net-quiz-enter");
  void card.offsetWidth;
  card.classList.add("net-quiz-enter");
}

function awardKey(state) {
  return `netology_quiz_awarded:${state.email}:${state.courseId}:${state.lessonNumber}`;
}

// Award XP once using backend route when available.
async function awardQuizXpOnce(state, earnedXp) {
  if (localStorage.getItem(awardKey(state)) === "1") {
    return { xpAwarded: 0, alreadyCompleted: true, usedBackend: false };
  }

  const apiBase = window.API_BASE;
  if (!apiBase) {
    localStorage.setItem(awardKey(state), "1");
    return { xpAwarded: Number(earnedXp || 0), alreadyCompleted: false, usedBackend: false };
  }

  try {
    const endpoint = ENDPOINTS.courses?.completeQuiz || "/complete-quiz";
    const response = await fetch(`${apiBase}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: state.email,
        course_id: state.courseId,
        lesson_number: state.lessonNumber,
        earned_xp: earnedXp
      })
    });

    const data = await response.json().catch(() => ({}));

    if (data?.success) {
      localStorage.setItem(awardKey(state), "1");
      return {
        xpAwarded: Number(data.xp_added || 0),
        alreadyCompleted: Boolean(data.already_completed),
        usedBackend: true
      };
    }

    return { xpAwarded: Number(earnedXp || 0), alreadyCompleted: false, usedBackend: false };
  } catch (error) {
    console.error("awardQuizXpOnce error:", error);
    return { xpAwarded: Number(earnedXp || 0), alreadyCompleted: false, usedBackend: false };
  }
}

function setText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = text;
}
