// quiz.js — Quiz page: loads questions, checks answers, awards XP, shows results.

(function () {
  "use strict";

  var COURSE_DATA = typeof COURSE_CONTENT !== "undefined" ? COURSE_CONTENT : {};
  var API_BASE = window.API_BASE || "";
  var ENDPOINTS = window.ENDPOINTS || {};

  // shared quiz state
  var quizState = {
    courseId: "",
    unitIndex: 0,
    lessonNumber: 0,
    userEmail: "",
    courseTitle: "",
    unitTitle: "",
    quizTitle: "",
    maximumExperiencePoints: 0,
    questions: [],
    currentQuestionIndex: 0,
    selectedOptionIndex: null,
    hasAnswered: false,
    answerResults: []
  };

  // read a JSON value from localStorage
  function readJsonFromStorage(storageKey) {
    try {
      return JSON.parse(localStorage.getItem(storageKey));
    } catch (error) {
      return null;
    }
  }

  // read the saved user from localStorage
  function readSavedUserFromLocalStorage() {
    var savedUser = readJsonFromStorage("netology_user") || readJsonFromStorage("user");
    return savedUser;
  }

  // set text content of an element by id
  function setTextById(elementId, textValue) {
    var element = document.getElementById(elementId);
    if (element) {
      element.textContent = textValue;
    }
  }

  // build the localStorage key for a quiz attempt
  function buildAttemptStorageKey() {
    return "netology_quiz_attempt:" + quizState.userEmail + ":" + quizState.courseId + ":" + quizState.lessonNumber;
  }

  // build the localStorage key for tracking xp awards
  function buildAwardStorageKey() {
    return "netology_quiz_awarded:" + quizState.userEmail + ":" + quizState.courseId + ":" + quizState.lessonNumber;
  }

  // normalise a raw quiz object into a clean shape
  function normaliseRawQuizData(rawQuiz) {
    var normalisedQuestions = [];
    for (var i = 0; i < rawQuiz.questions.length; i++) {
      var rawQuestion = rawQuiz.questions[i];
      normalisedQuestions.push({
        id: rawQuestion.id || ("q" + (i + 1)),
        question: rawQuestion.question || "",
        options: Array.isArray(rawQuestion.options) ? rawQuestion.options : [],
        correctAnswer: Number(rawQuestion.correctAnswer || 0),
        explanation: rawQuestion.explanation || ""
      });
    }
    return {
      title: rawQuiz.title || "Quiz",
      xp: Number(rawQuiz.xp || 40),
      questions: normalisedQuestions
    };
  }

  // fill the header card with quiz title, xp label, and breadcrumb
  function displayQuizHeader() {
    setTextById("quizTitle", quizState.quizTitle);
    setTextById("quizMeta", quizState.quizTitle + " - " + quizState.questions.length + " questions");
    setTextById("quizXpLabel", quizState.maximumExperiencePoints + " XP");
    setTextById("breadcrumbCourse", quizState.courseTitle || "Course");
    setTextById("breadcrumbModule", quizState.unitTitle || "Module");
    setTextById("breadcrumbQuiz", "Quiz");
    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");
  }

  // set the href on both back-to-course links
  function setBackToCourseLinks(backUrl) {
    var topLink = document.getElementById("backToCourseTop");
    var bottomLink = document.getElementById("backToCourseBtn");
    if (topLink) {
      topLink.href = backUrl;
    }
    if (bottomLink) {
      bottomLink.href = backUrl;
    }
  }

  // attach click listeners to the submit, next, and retry buttons
  function attachButtonListeners() {
    var submitButton = document.getElementById("submitBtn");
    var nextButton = document.getElementById("nextBtn");
    var retryButton = document.getElementById("retryBtn");

    if (submitButton) {
      submitButton.addEventListener("click", function () {
        handleSubmitAnswer();
      });
    }
    if (nextButton) {
      nextButton.addEventListener("click", function () {
        handleNextQuestion();
      });
    }
    if (retryButton) {
      retryButton.addEventListener("click", function () {
        localStorage.removeItem(buildAttemptStorageKey());
        window.location.reload();
      });
    }
  }

  // render the current question on screen
  function renderCurrentQuestion() {
    var currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    if (!currentQuestion) {
      return;
    }

    quizState.selectedOptionIndex = null;
    quizState.hasAnswered = false;

    var totalQuestions = quizState.questions.length;
    var progressPercent = Math.round((quizState.currentQuestionIndex / totalQuestions) * 100);

    setTextById("quizStepText", "Question " + (quizState.currentQuestionIndex + 1) + " of " + totalQuestions);
    setTextById("quizPctText", progressPercent + "%");
    setTextById("questionCountChip", (quizState.currentQuestionIndex + 1) + "/" + totalQuestions);
    setTextById("questionText", currentQuestion.question || "Question");
    setTextById("questionTag", "Question");

    var progressBar = document.getElementById("quizProgressBar");
    if (progressBar) {
      progressBar.style.width = progressPercent + "%";
    }

    // build the answer option buttons
    var optionsContainer = document.getElementById("optionsBox");
    if (optionsContainer) {
      optionsContainer.innerHTML = "";

      for (var i = 0; i < currentQuestion.options.length; i++) {
        var optionButton = buildOptionButton(currentQuestion.options[i], i, optionsContainer);
        optionsContainer.appendChild(optionButton);
      }
    }

    // reset the feedback box
    var feedbackBox = document.getElementById("feedbackBox");
    if (feedbackBox) {
      feedbackBox.classList.add("d-none");
      feedbackBox.classList.remove("is-show", "is-correct", "is-wrong");
    }

    // show submit, hide next
    var submitButton = document.getElementById("submitBtn");
    var nextButton = document.getElementById("nextBtn");
    if (submitButton) {
      submitButton.classList.remove("d-none");
      submitButton.disabled = true;
    }
    if (nextButton) {
      nextButton.classList.add("d-none");
    }

    updateMiniProgressBar();
    triggerSlideInAnimation("quizCard");

    var progressCard = document.getElementById("progressCard");
    if (progressCard) {
      progressCard.classList.remove("d-none");
    }
  }

  // build a single answer option button
  function buildOptionButton(optionText, optionIndex, optionsContainer) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "net-quiz-option";
    button.setAttribute("aria-label", "Select answer: " + optionText);

    var letterSpan = document.createElement("span");
    letterSpan.className = "net-quiz-option-letter";
    letterSpan.textContent = String.fromCharCode(65 + optionIndex);

    var labelSpan = document.createElement("span");
    labelSpan.className = "net-quiz-option-text";
    labelSpan.textContent = String(optionText || "");

    var statusSpan = document.createElement("span");
    statusSpan.className = "net-quiz-option-status";

    button.appendChild(letterSpan);
    button.appendChild(labelSpan);
    button.appendChild(statusSpan);

    button.addEventListener("click", function () {
      if (quizState.hasAnswered) {
        return;
      }
      quizState.selectedOptionIndex = optionIndex;

      var allButtons = optionsContainer.querySelectorAll("button");
      for (var b = 0; b < allButtons.length; b++) {
        allButtons[b].classList.remove("is-selected");
      }
      button.classList.add("is-selected");

      var submitButton = document.getElementById("submitBtn");
      if (submitButton) {
        submitButton.disabled = false;
      }
    });

    return button;
  }

  // lock the options, show correct/wrong feedback, reveal the next button
  function handleSubmitAnswer() {
    if (quizState.selectedOptionIndex === null) {
      return;
    }

    var currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    var isCorrect = quizState.selectedOptionIndex === currentQuestion.correctAnswer;

    quizState.hasAnswered = true;
    quizState.answerResults[quizState.currentQuestionIndex] = isCorrect;

    // colour the option buttons green or red
    var optionsContainer = document.getElementById("optionsBox");
    if (optionsContainer) {
      var allButtons = optionsContainer.querySelectorAll("button");
      for (var i = 0; i < allButtons.length; i++) {
        allButtons[i].disabled = true;
        allButtons[i].classList.remove("is-correct", "is-wrong");

        var isTheCorrectOption = i === currentQuestion.correctAnswer;
        var isTheWrongPick = i === quizState.selectedOptionIndex && !isCorrect;

        if (isTheCorrectOption) {
          allButtons[i].classList.add("is-correct");
        }
        if (isTheWrongPick) {
          allButtons[i].classList.add("is-wrong");
        }

        // add a tick or cross icon
        var statusSpan = allButtons[i].querySelector(".net-quiz-option-status");
        if (statusSpan) {
          statusSpan.innerHTML = "";
          if (isTheCorrectOption || isTheWrongPick) {
            var statusIcon = document.createElement("i");
            statusIcon.className = isTheCorrectOption ? "bi bi-check-lg" : "bi bi-x-lg";
            statusIcon.setAttribute("aria-hidden", "true");
            statusSpan.appendChild(statusIcon);
          }
        }
      }
    }

    // xp is split equally across questions, only awarded for correct answers
    var experiencePointsEarned = 0;
    if (isCorrect) {
      experiencePointsEarned = Math.max(1, Math.round(quizState.maximumExperiencePoints / Math.max(quizState.questions.length, 1)));
    }

    // show the feedback box
    var feedbackBox = document.getElementById("feedbackBox");
    var feedbackIcon = document.getElementById("feedbackIcon");
    if (feedbackBox && feedbackIcon) {
      feedbackBox.classList.remove("d-none", "is-correct", "is-wrong", "is-show");
      feedbackIcon.innerHTML = "";

      var icon = document.createElement("i");
      icon.setAttribute("aria-hidden", "true");

      if (isCorrect) {
        feedbackBox.classList.add("is-correct");
        icon.className = "bi bi-check-lg";
        setTextById("feedbackTitle", "Correct");
      } else {
        feedbackBox.classList.add("is-wrong");
        icon.className = "bi bi-x-lg";
        setTextById("feedbackTitle", "Incorrect");
      }

      feedbackIcon.appendChild(icon);
      setTextById("feedbackText", currentQuestion.explanation || "Explanation not available.");
      feedbackBox.classList.add("is-show");

      var xpEarnedRow = document.getElementById("xpEarnedRow");
      var xpEarnedText = document.getElementById("xpEarnedText");
      if (xpEarnedRow && xpEarnedText) {
        if (isCorrect) {
          xpEarnedRow.classList.remove("d-none");
          xpEarnedText.textContent = "+" + experiencePointsEarned + " XP";
        } else {
          xpEarnedRow.classList.add("d-none");
        }
      }
    }

    updateMiniProgressBar();

    // swap the submit button for the next button
    var submitButton = document.getElementById("submitBtn");
    var nextButton = document.getElementById("nextBtn");
    if (submitButton) {
      submitButton.classList.add("d-none");
    }
    if (nextButton) {
      nextButton.classList.remove("d-none");
      var isLastQuestion = quizState.currentQuestionIndex === quizState.questions.length - 1;
      nextButton.textContent = isLastQuestion ? "View Results \u2192" : "Next \u2192";
    }
  }

  // move to the next question, or finish if this was the last one
  function handleNextQuestion() {
    var isLastQuestion = quizState.currentQuestionIndex === quizState.questions.length - 1;
    if (isLastQuestion) {
      finishQuiz();
      return;
    }
    quizState.currentQuestionIndex = quizState.currentQuestionIndex + 1;
    renderCurrentQuestion();
  }

  // tally the score, post to the server, save locally, and show results
  async function finishQuiz() {
    var totalQuestions = quizState.questions.length;

    var correctCount = 0;
    for (var i = 0; i < quizState.answerResults.length; i++) {
      if (quizState.answerResults[i] === true) {
        correctCount = correctCount + 1;
      }
    }

    var scorePercentage = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;
    var localExperiencePoints = Math.round((scorePercentage / 100) * quizState.maximumExperiencePoints);

    var result = {
      completed: true,
      correctCount: correctCount,
      total: totalQuestions,
      percentage: scorePercentage,
      earnedXP: localExperiencePoints,
      answers: quizState.answerResults
    };

    var serverAward = await sendQuizCompletionToServer(localExperiencePoints);
    result.earnedXP = Number(serverAward.xpAwarded || localExperiencePoints) + Number(serverAward.achievementXp || 0);

    if (serverAward.alreadyCompleted) {
      result.alreadyCompleted = true;
    }

    localStorage.setItem(buildAttemptStorageKey(), JSON.stringify(result));
    saveQuizCompletionToLocalStorage(result);
    displayResultsScreen(result);
    showCompletionToastMessage(result);
  }

  // post the quiz completion to the backend and return the xp award
  async function sendQuizCompletionToServer(earnedExperiencePoints) {
    var alreadyAwarded = localStorage.getItem(buildAwardStorageKey()) === "1";
    if (alreadyAwarded) {
      return { xpAwarded: 0, achievementXp: 0, alreadyCompleted: true };
    }

    if (!API_BASE) {
      localStorage.setItem(buildAwardStorageKey(), "1");
      return { xpAwarded: earnedExperiencePoints, achievementXp: 0, alreadyCompleted: false };
    }

    try {
      var endpointPath = (ENDPOINTS.courses && ENDPOINTS.courses.completeQuiz) || "/complete-quiz";
      var requestUrl = API_BASE + endpointPath;

      var response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: quizState.userEmail,
          course_id: quizState.courseId,
          lesson_number: quizState.lessonNumber,
          earned_xp: earnedExperiencePoints
        })
      });

      var responseData = null;
      try {
        responseData = await response.json();
      } catch (parseError) {
        responseData = {};
      }

      if (responseData && responseData.success) {
        localStorage.setItem(buildAwardStorageKey(), "1");

        var unlockedAchievements = Array.isArray(responseData.newly_unlocked) ? responseData.newly_unlocked : [];
        if (unlockedAchievements.length > 0 && window.NetologyAchievements && window.NetologyAchievements.queueUnlocks) {
          window.NetologyAchievements.queueUnlocks(quizState.userEmail, unlockedAchievements);
        }

        return {
          xpAwarded: Number(responseData.xp_added || 0),
          achievementXp: Number(responseData.achievement_xp_added || 0),
          alreadyCompleted: Boolean(responseData.already_completed)
        };
      }
    } catch (networkError) {
      console.warn("could not save quiz completion to server:", networkError);
    }

    return { xpAwarded: earnedExperiencePoints, achievementXp: 0, alreadyCompleted: false };
  }

  // save the quiz completion and xp to localStorage
  function saveQuizCompletionToLocalStorage(result) {
    // mark the quiz as completed in the completions record
    var completionsKey = "netology_completions:" + quizState.userEmail + ":" + quizState.courseId;
    var completionsData = readJsonFromStorage(completionsKey) || { lesson: [], quiz: [], challenge: [] };
    var quizNumber = Number(quizState.lessonNumber);

    var alreadySaved = false;
    for (var i = 0; i < completionsData.quiz.length; i++) {
      if (completionsData.quiz[i] === quizNumber) {
        alreadySaved = true;
        break;
      }
    }
    if (!alreadySaved) {
      completionsData.quiz.push(quizNumber);
      localStorage.setItem(completionsKey, JSON.stringify(completionsData));
    }

    // bump the user's xp in localStorage
    var userStorageKeys = ["netology_user", "user"];
    for (var k = 0; k < userStorageKeys.length; k++) {
      var storedUser = readJsonFromStorage(userStorageKeys[k]);
      if (!storedUser || storedUser.email !== quizState.userEmail) {
        continue;
      }

      var xpSystem = window.NetologyXP;
      var updatedUser = null;
      if (xpSystem && xpSystem.applyXpToUser) {
        updatedUser = xpSystem.applyXpToUser(storedUser, result.earnedXP);
      } else {
        var currentXp = Math.max(0, Number(storedUser.xp || 0));
        var newXp = currentXp + Number(result.earnedXP || 0);
        storedUser.xp = newXp;
        updatedUser = storedUser;
      }
      localStorage.setItem(userStorageKeys[k], JSON.stringify(updatedUser));
    }

    // update the started courses record
    var startedCoursesKey = "netology_started_courses:" + quizState.userEmail;
    var startedCourses = readJsonFromStorage(startedCoursesKey) || [];
    var existingCourseEntry = null;

    for (var s = 0; s < startedCourses.length; s++) {
      if (String(startedCourses[s].id) === String(quizState.courseId)) {
        existingCourseEntry = startedCourses[s];
        break;
      }
    }

    if (existingCourseEntry) {
      existingCourseEntry.lastViewed = Date.now();
      existingCourseEntry.lastLesson = quizState.lessonNumber;
    } else {
      startedCourses.push({
        id: String(quizState.courseId),
        lastViewed: Date.now(),
        lastLesson: quizState.lessonNumber
      });
    }
    localStorage.setItem(startedCoursesKey, JSON.stringify(startedCourses));

    // add an entry to the progress log
    var progressLogKey = "netology_progress_log:" + quizState.userEmail;
    var progressLog = readJsonFromStorage(progressLogKey) || [];
    progressLog.push({
      type: "quiz",
      course_id: quizState.courseId,
      lesson_number: quizState.lessonNumber,
      xp: Number(result.earnedXP || 0),
      ts: Date.now(),
      date: new Date().toISOString().slice(0, 10)
    });
    localStorage.setItem(progressLogKey, JSON.stringify(progressLog));
  }

  // hide the question card and show the results screen
  function displayResultsScreen(result) {
    var quizCard = document.getElementById("quizCard");
    var resultsCard = document.getElementById("resultsCard");
    var progressCard = document.getElementById("progressCard");

    if (quizCard) {
      quizCard.classList.add("d-none");
    }
    if (resultsCard) {
      resultsCard.classList.remove("d-none");
    }
    if (progressCard) {
      progressCard.classList.add("d-none");
    }

    setTextById("quizStepText", "Completed");
    setTextById("quizPctText", "100%");

    var progressBar = document.getElementById("quizProgressBar");
    if (progressBar) {
      progressBar.style.width = "100%";
    }

    setTextById("statCorrect", result.correctCount + "/" + result.total);
    setTextById("statPct", result.percentage + "%");
    setTextById("statXp", String(result.earnedXP));

    var isPerfectScore = result.percentage === 100;
    var hasPassed = result.percentage >= 40;

    // set the results badge icon
    var resultsBadge = document.getElementById("resultsBadge");
    if (resultsBadge) {
      resultsBadge.innerHTML = "";
      var badgeIcon = document.createElement("i");
      badgeIcon.setAttribute("aria-hidden", "true");
      if (isPerfectScore) {
        badgeIcon.className = "bi bi-trophy-fill";
      } else if (hasPassed) {
        badgeIcon.className = "bi bi-check2-circle";
      } else {
        badgeIcon.className = "bi bi-lightbulb";
      }
      resultsBadge.appendChild(badgeIcon);
    }

    // set the results title and subtitle
    if (isPerfectScore) {
      setTextById("resultsTitle", "Perfect Score!");
      setTextById("resultsSubtitle", "Outstanding work - you got everything correct.");
    } else if (hasPassed) {
      setTextById("resultsTitle", "Quiz Passed!");
      setTextById("resultsSubtitle", "Nice job - keep going to the next lesson.");
    } else {
      setTextById("resultsTitle", "Keep Practicing!");
      setTextById("resultsSubtitle", "Review the lesson and retry - you'll get it.");
    }

    triggerSlideInAnimation("resultsCard");
  }

  // redraw the mini progress bar segments
  function updateMiniProgressBar() {
    var miniProgressContainer = document.getElementById("miniProgress");
    if (!miniProgressContainer) {
      return;
    }

    var totalQuestions = quizState.questions.length;

    var correctCount = 0;
    var answeredCount = 0;
    for (var i = 0; i < quizState.answerResults.length; i++) {
      if (typeof quizState.answerResults[i] === "boolean") {
        answeredCount = answeredCount + 1;
        if (quizState.answerResults[i] === true) {
          correctCount = correctCount + 1;
        }
      }
    }

    var remainingCount = Math.max(0, totalQuestions - answeredCount);

    setTextById("progressCorrectCount", String(correctCount));
    setTextById("progressRemaining", String(remainingCount));

    miniProgressContainer.innerHTML = "";
    for (var s = 0; s < totalQuestions; s++) {
      var segment = document.createElement("span");
      segment.className = "net-quiz-progress-bar";

      var answerAtIndex = quizState.answerResults[s];
      if (typeof answerAtIndex === "boolean") {
        segment.classList.add(answerAtIndex ? "is-correct" : "is-wrong");
      } else if (s === quizState.currentQuestionIndex) {
        segment.classList.add("is-current");
      }

      miniProgressContainer.appendChild(segment);
    }
  }

  // show a celebration toast when the quiz finishes
  function showCompletionToastMessage(result) {
    if (result.alreadyCompleted) {
      return;
    }
    if (typeof window.showCelebrateToast !== "function") {
      return;
    }

    var hasPassed = result.percentage >= 40;
    var isPerfectScore = result.percentage === 100;

    var toastTitle = "Quiz attempt saved";
    var toastMessage = "Review the lesson and try again.";
    var toastType = "info";

    if (isPerfectScore) {
      toastTitle = "Perfect quiz score";
      toastMessage = "Outstanding accuracy.";
      toastType = "success";
    } else if (hasPassed) {
      toastTitle = "Quiz completed";
      toastMessage = "Nice work - keep going.";
      toastType = "success";
    }

    window.showCelebrateToast({
      title: toastTitle,
      message: toastMessage,
      sub: "Score " + result.correctCount + "/" + result.total,
      xp: result.earnedXP || 0,
      mini: true,
      type: toastType,
      duration: 20000
    });
  }

  // trigger the slide-in animation on a card
  function triggerSlideInAnimation(elementId) {
    var card = document.getElementById(elementId);
    if (!card) {
      return;
    }
    card.classList.remove("net-quiz-enter");
    void card.offsetWidth;
    card.classList.add("net-quiz-enter");
  }

  // main entry point for the quiz page
  async function initialiseQuizPage() {
    var urlParams = new URLSearchParams(window.location.search);
    var courseId = urlParams.get("course") || urlParams.get("course_id");
    var unitIndex = Math.max(0, Number(urlParams.get("unit") || 0));

    var savedUser = readSavedUserFromLocalStorage();
    if (!savedUser || !savedUser.email || !courseId) {
      window.location.href = "login.html";
      return;
    }

    var courseData = COURSE_DATA[String(courseId)] || null;
    var backUrl = "course.html?id=" + courseId;

    if (!courseData) {
      alert("Course content not found.");
      window.location.href = backUrl;
      return;
    }

    // the quiz lives directly on the unit
    var units = courseData.units || [];
    var targetUnit = units[unitIndex] || null;
    var rawQuiz = (targetUnit && targetUnit.quiz) ? targetUnit.quiz : null;

    if (!rawQuiz || !rawQuiz.questions || rawQuiz.questions.length === 0) {
      alert("No quiz found for this unit.");
      window.location.href = backUrl;
      return;
    }

    var normalisedQuiz = normaliseRawQuizData(rawQuiz);
    var unitTitle = (targetUnit && targetUnit.title) ? targetUnit.title : "Module";
    var lessonNumber = unitIndex + 1;

    // populate the quiz state
    quizState.courseId = courseId;
    quizState.unitIndex = unitIndex;
    quizState.lessonNumber = lessonNumber;
    quizState.userEmail = savedUser.email;
    quizState.courseTitle = courseData.title || "";
    quizState.unitTitle = unitTitle;
    quizState.quizTitle = normalisedQuiz.title;
    quizState.maximumExperiencePoints = normalisedQuiz.xp;
    quizState.questions = normalisedQuiz.questions;
    quizState.currentQuestionIndex = 0;
    quizState.selectedOptionIndex = null;
    quizState.hasAnswered = false;
    quizState.answerResults = [];

    // if the quiz was already completed, skip straight to results
    var savedAttempt = readJsonFromStorage(buildAttemptStorageKey());
    if (savedAttempt && savedAttempt.completed) {
      displayQuizHeader();
      setBackToCourseLinks(backUrl);
      displayResultsScreen(savedAttempt);
      return;
    }

    displayQuizHeader();
    setBackToCourseLinks(backUrl);
    attachButtonListeners();
    renderCurrentQuestion();
  }

  // wait for the DOM to be ready, then start
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initialiseQuizPage().catch(function (error) {
        console.error("quiz crashed on load:", error);
      });
    }, { once: true });
  } else {
    initialiseQuizPage().catch(function (error) {
      console.error("quiz crashed on load:", error);
    });
  }

})();
