// lesson.js — runs the step-by-step lesson page

(function () {
  "use strict";

  var COURSE_DATA = (typeof COURSE_CONTENT !== "undefined") ? COURSE_CONTENT : {};
  var API_BASE = (window.API_BASE || "").replace(/\/$/, "");
  var ENDPOINTS = window.ENDPOINTS || {};

  // read a json value from local storage safely
  function readJsonFromStorage(storageKey) {
    try {
      return JSON.parse(localStorage.getItem(storageKey));
    } catch (error) {
      return null;
    }
  }

  // get the saved user object from local storage
  function readSavedUserFromLocalStorage() {
    return readJsonFromStorage("netology_user") || readJsonFromStorage("user");
  }

  // set text content on an element found by id
  function setTextById(elementId, text) {
    var element = document.getElementById(elementId);
    if (element) element.textContent = String(text !== null && text !== undefined ? text : "");
  }

  // look up how much xp a lesson is worth from the course data
  function getExperiencePointsForLesson(courseData, unitIndex, lessonIndex) {
    var units = courseData.units || [];
    var unit = units[unitIndex];
    if (!unit) return 0;
    var lessons = unit.lessons || [];
    var lesson = lessons[lessonIndex];
    if (!lesson) return 0;
    return Number(lesson.xp || 0);
  }

  // stable lesson completion key (separate from legacy unit-level keys)
  function buildLessonCompletionKey(unitIndex, lessonIndex) {
    return ((Number(unitIndex) + 1) * 1000) + (Number(lessonIndex) + 1);
  }

  // convert lesson blocks into a flat list of steps the user walks through
  function buildStepsFromLessonBlocks(lesson) {
    var blocks = lesson.blocks || [];
    var steps = [];

    for (var blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      var block = blocks[blockIndex];

      if (block.type === "text") {
        var textLines = Array.isArray(block.text) ? block.text : [block.text || ""];
        var filteredTextLines = [];
        for (var textLineIndex = 0; textLineIndex < textLines.length; textLineIndex++) {
          if (textLines[textLineIndex]) filteredTextLines.push(textLines[textLineIndex]);
        }
        // split text into chunks of 3 lines so each card is not too long
        for (var chunkStart = 0; chunkStart < filteredTextLines.length; chunkStart += 3) {
          var chunk = filteredTextLines.slice(chunkStart, chunkStart + 3);
          if (chunk.length) {
            steps.push({
              type: "learn",
              title: block.title || lesson.title || "Learn",
              lines: chunk
            });
          }
        }
      } else if (block.type === "explain") {
        var explainLines = Array.isArray(block.content) ? block.content : [block.content || ""];
        var filteredExplainLines = [];
        for (var explainLineIndex = 0; explainLineIndex < explainLines.length; explainLineIndex++) {
          if (explainLines[explainLineIndex]) filteredExplainLines.push(explainLines[explainLineIndex]);
        }
        steps.push({
          type: "explain",
          title: block.title || "Key Concept",
          lines: filteredExplainLines
        });
      } else if (block.type === "check") {
        steps.push({
          type: "mcq",
          question: block.question || "Quick check",
          options: block.options || [],
          correct: (block.correctIndex !== undefined && block.correctIndex !== null) ? block.correctIndex : 0,
          hint: block.explanation || ""
        });
      } else if (block.type === "activity" && block.mode === "select") {
        steps.push({
          type: "mcq",
          question: block.prompt || block.title || "Choose the correct answer",
          options: block.options || [],
          correct: (block.correctIndex !== undefined && block.correctIndex !== null) ? block.correctIndex : 0,
          hint: block.explanation || ""
        });
      } else if (block.type === "activity" && Array.isArray(block.steps)) {
        steps.push({
          type: "learn",
          title: block.title || "Activity",
          lines: block.steps
        });
      }
    }

    return steps;
  }

  // count how many mcq steps are in the list
  function countQuestionSteps(steps) {
    var count = 0;
    for (var stepIndex = 0; stepIndex < steps.length; stepIndex++) {
      if (steps[stepIndex].type === "mcq") count++;
    }
    return count;
  }

  // count how many results have been recorded so far
  function countCompletedResults(results) {
    var count = 0;
    for (var resultIndex = 0; resultIndex < results.length; resultIndex++) {
      if (results[resultIndex] !== undefined) count++;
    }
    return count;
  }

  // draw the current step on screen
  function renderCurrentStep(lessonState) {
    var currentStep = lessonState.steps[lessonState.currentStepIndex];
    if (!currentStep) return;

    // reset pick state for this step
    lessonState.pickedOptionIndex = null;
    lessonState.hasAnswered = false;

    // update the progress text and bar
    var totalSteps = lessonState.steps.length;
    var progressPercent = Math.round((lessonState.currentStepIndex / totalSteps) * 100);
    setTextById("lessonStepText", "Step " + (lessonState.currentStepIndex + 1) + " of " + totalSteps);
    setTextById("lessonPctText", progressPercent + "%");
    setTextById("stepCountChip", (lessonState.currentStepIndex + 1) + "/" + totalSteps);

    var progressBar = document.getElementById("lessonProgressBar");
    if (progressBar) progressBar.style.width = progressPercent + "%";

    var stepContentContainer = document.getElementById("stepContent");
    var optionsContainer = document.getElementById("optionsBox");

    if (currentStep.type === "learn" || currentStep.type === "explain") {
      renderReadingStep(currentStep, stepContentContainer, optionsContainer);
    } else if (currentStep.type === "mcq") {
      renderQuestionStep(currentStep, lessonState, stepContentContainer, optionsContainer);
    }

    // clear the feedback box from the previous step
    var feedbackBox = document.getElementById("feedbackBox");
    if (feedbackBox) {
      feedbackBox.classList.add("d-none");
      feedbackBox.classList.remove("is-show", "is-correct", "is-wrong");
    }

    updateMiniProgressBar(lessonState);
    triggerSlideInAnimation("stepCard");
  }

  // render a reading or explain step
  function renderReadingStep(step, stepContentContainer, optionsContainer) {
    if (stepContentContainer) {
      stepContentContainer.innerHTML = "";
      var wrapperElement = document.createElement("div");

      if (step.type === "explain") {
        wrapperElement.className = "alert alert-info border-0";
        var headerDiv = document.createElement("div");
        headerDiv.className = "d-flex align-items-center gap-2 mb-2";
        var lightbulbIcon = document.createElement("i");
        lightbulbIcon.className = "bi bi-lightbulb-fill text-warning";
        var strongLabel = document.createElement("strong");
        strongLabel.textContent = "Key Concept";
        headerDiv.appendChild(lightbulbIcon);
        headerDiv.appendChild(strongLabel);
        wrapperElement.appendChild(headerDiv);
      }

      var lines = step.lines || [];
      for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        var paragraph = document.createElement("p");
        paragraph.className = (step.type === "explain") ? "mb-2" : "mb-3";
        paragraph.textContent = lines[lineIndex];
        wrapperElement.appendChild(paragraph);
      }

      stepContentContainer.appendChild(wrapperElement);
    }

    setTextById("stepTag", (step.type === "explain") ? "Key Concept" : "Learn");
    setTextById("stepTitle", step.title);

    // hide the answer options, show the continue button
    if (optionsContainer) {
      optionsContainer.innerHTML = "";
      optionsContainer.classList.add("d-none");
    }

    var continueButton = document.getElementById("continueBtn");
    var submitButton = document.getElementById("submitBtn");
    if (continueButton) continueButton.classList.remove("d-none");
    if (submitButton) {
      submitButton.classList.add("d-none");
      submitButton.disabled = true;
    }
  }

  // render a multiple choice question step
  function renderQuestionStep(step, lessonState, stepContentContainer, optionsContainer) {
    if (stepContentContainer) stepContentContainer.innerHTML = "";

    setTextById("stepTag", "Check Your Knowledge");
    setTextById("stepTitle", step.question);

    if (optionsContainer) {
      optionsContainer.innerHTML = "";
      optionsContainer.classList.remove("d-none");

      var options = step.options || [];
      for (var optionIndex = 0; optionIndex < options.length; optionIndex++) {
        var optionButton = buildOptionButton(options[optionIndex], optionIndex, lessonState, optionsContainer);
        optionsContainer.appendChild(optionButton);
      }
    }

    // show the check answer button, hide continue until they answer
    var continueButton = document.getElementById("continueBtn");
    var submitButton = document.getElementById("submitBtn");
    if (continueButton) continueButton.classList.add("d-none");
    if (submitButton) {
      submitButton.classList.remove("d-none");
      submitButton.disabled = true;
    }
  }

  // build a single answer option button
  function buildOptionButton(optionText, optionIndex, lessonState, optionsContainer) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "net-quiz-option";
    button.setAttribute("aria-label", "Select answer: " + optionText);

    var letterSpan = document.createElement("span");
    letterSpan.className = "net-quiz-option-letter";
    letterSpan.textContent = String.fromCharCode(65 + optionIndex);

    var labelSpan = document.createElement("span");
    labelSpan.className = "net-quiz-option-text";
    labelSpan.textContent = optionText;

    var statusSpan = document.createElement("span");
    statusSpan.className = "net-quiz-option-status";

    button.appendChild(letterSpan);
    button.appendChild(labelSpan);
    button.appendChild(statusSpan);

    (function (capturedIndex) {
      button.addEventListener("click", function () {
        if (lessonState.hasAnswered) return;
        lessonState.pickedOptionIndex = capturedIndex;

        var allButtons = optionsContainer.querySelectorAll("button");
        for (var buttonIndex = 0; buttonIndex < allButtons.length; buttonIndex++) {
          allButtons[buttonIndex].classList.remove("is-selected");
        }
        button.classList.add("is-selected");

        var submitButton = document.getElementById("submitBtn");
        if (submitButton) submitButton.disabled = false;
      });
    })(optionIndex);

    return button;
  }

  // the user clicked check answer — lock the options and show feedback
  function handleSubmitAnswer(lessonState) {
    if (lessonState.pickedOptionIndex === null) return;

    var currentStep = lessonState.steps[lessonState.currentStepIndex];
    var isCorrect = lessonState.pickedOptionIndex === currentStep.correct;

    lessonState.hasAnswered = true;
    lessonState.stepResults[lessonState.currentStepIndex] = isCorrect;

    // highlight each option as correct or wrong
    var optionsContainer = document.getElementById("optionsBox");
    if (optionsContainer) {
      var allButtons = optionsContainer.querySelectorAll("button");
      for (var buttonIndex = 0; buttonIndex < allButtons.length; buttonIndex++) {
        allButtons[buttonIndex].disabled = true;
        allButtons[buttonIndex].classList.remove("is-correct", "is-wrong");

        if (buttonIndex === currentStep.correct) {
          allButtons[buttonIndex].classList.add("is-correct");
        }
        if (buttonIndex === lessonState.pickedOptionIndex && !isCorrect) {
          allButtons[buttonIndex].classList.add("is-wrong");
        }

        // add a tick or cross icon on the relevant buttons
        var statusSpan = allButtons[buttonIndex].querySelector(".net-quiz-option-status");
        if (statusSpan) {
          statusSpan.innerHTML = "";
          var statusIcon = document.createElement("i");
          if (buttonIndex === currentStep.correct) {
            statusIcon.className = "bi bi-check-lg";
            statusSpan.appendChild(statusIcon);
          } else if (buttonIndex === lessonState.pickedOptionIndex && !isCorrect) {
            statusIcon.className = "bi bi-x-lg";
            statusSpan.appendChild(statusIcon);
          }
        }
      }
    }

    // xp is split equally across all questions, only awarded for correct answers
    var totalQuestions = countQuestionSteps(lessonState.steps);
    var experiencePointsGained = isCorrect ? Math.round(lessonState.lessonExperiencePoints / Math.max(totalQuestions, 1)) : 0;
    if (experiencePointsGained) lessonState.earnedExperiencePoints += experiencePointsGained;

    // show the feedback box below the options
    showAnswerFeedback(isCorrect, currentStep.hint, experiencePointsGained);
    updateMiniProgressBar(lessonState);

    // replace the check answer button with the continue button
    var submitButton = document.getElementById("submitBtn");
    var continueButton = document.getElementById("continueBtn");
    if (submitButton) submitButton.classList.add("d-none");
    if (continueButton) {
      continueButton.classList.remove("d-none");
      var isLastStep = lessonState.currentStepIndex === lessonState.steps.length - 1;
      continueButton.textContent = isLastStep ? "View Results \u2192" : "Continue \u2192";
    }
  }

  // show the correct/incorrect feedback box
  function showAnswerFeedback(isCorrect, hintText, experiencePointsGained) {
    var feedbackBox = document.getElementById("feedbackBox");
    var feedbackIconContainer = document.getElementById("feedbackIcon");
    if (!feedbackBox || !feedbackIconContainer) return;

    feedbackBox.classList.remove("d-none", "is-correct", "is-wrong", "is-show");
    feedbackIconContainer.innerHTML = "";

    var feedbackIcon = document.createElement("i");
    if (isCorrect) {
      feedbackBox.classList.add("is-correct");
      feedbackIcon.className = "bi bi-check-lg";
      setTextById("feedbackTitle", "Correct");
    } else {
      feedbackBox.classList.add("is-wrong");
      feedbackIcon.className = "bi bi-x-lg";
      setTextById("feedbackTitle", "Incorrect");
    }
    feedbackIconContainer.appendChild(feedbackIcon);
    setTextById("feedbackText", hintText || "");
    feedbackBox.classList.add("is-show");

    // show the xp badge only when xp was actually earned
    var xpEarnedRow = document.getElementById("xpEarnedRow");
    var xpEarnedLabel = document.getElementById("xpEarnedText");
    if (xpEarnedRow && xpEarnedLabel) {
      if (isCorrect && experiencePointsGained) {
        xpEarnedRow.classList.remove("d-none");
        xpEarnedLabel.textContent = "+" + experiencePointsGained + " XP";
      } else {
        xpEarnedRow.classList.add("d-none");
      }
    }
  }

  // move to the next step, or finish if this was the last one
  function handleContinueToNextStep(lessonState) {
    // mark reading steps as done when the user clicks continue
    if (lessonState.stepResults[lessonState.currentStepIndex] === undefined) {
      lessonState.stepResults[lessonState.currentStepIndex] = "read";
    }

    if (lessonState.currentStepIndex === lessonState.steps.length - 1) {
      finishLesson(lessonState);
      return;
    }

    lessonState.currentStepIndex++;
    renderCurrentStep(lessonState);
  }

  // all steps done — calculate the score and save everything
  async function finishLesson(lessonState) {
    // only mcq steps count toward the score
    var totalQuestions = 0;
    var correctAnswers = 0;

    for (var stepIndex = 0; stepIndex < lessonState.steps.length; stepIndex++) {
      if (lessonState.steps[stepIndex].type === "mcq") {
        totalQuestions++;
        if (lessonState.stepResults[stepIndex] === true) correctAnswers++;
      }
    }

    var accuracyPercent = (totalQuestions > 0) ? Math.round((correctAnswers / totalQuestions) * 100) : 100;
    var experiencePointsEarned = (totalQuestions > 0)
      ? Math.round((correctAnswers / totalQuestions) * lessonState.lessonExperiencePoints)
      : lessonState.lessonExperiencePoints;

    lessonState.earnedExperiencePoints = experiencePointsEarned;

    // tell the backend the lesson is done
    var serverResponse = await sendLessonCompletionToServer(lessonState, experiencePointsEarned);
    var totalExperiencePointsAwarded = Number(serverResponse.experiencePointsAdded || 0)
      + Number(serverResponse.achievementExperiencePoints || 0);

    // update the user's xp in local storage
    if (totalExperiencePointsAwarded > 0) {
      updateLocalStorageExperiencePoints(lessonState.userEmail, totalExperiencePointsAwarded);
    }

    // save completion data to local storage
    saveLessonCompletionToLocalStorage(lessonState, experiencePointsEarned);

    displayResultsScreen(lessonState, correctAnswers, totalQuestions, accuracyPercent, experiencePointsEarned);
    showCompletionToastMessage(accuracyPercent, experiencePointsEarned);
  }

  // update user xp in both local storage keys
  function updateLocalStorageExperiencePoints(userEmail, experiencePointsToAdd) {
    var storageKeys = ["netology_user", "user"];
    var latestUser = null;

    for (var keyIndex = 0; keyIndex < storageKeys.length; keyIndex++) {
      var storedUser = readJsonFromStorage(storageKeys[keyIndex]);
      if (!storedUser) continue;
      var storedEmail = (storedUser.email || "").toLowerCase();
      if (storedEmail !== userEmail.toLowerCase()) continue;

      var xpSystem = window.NetologyXP;
      var updatedUser;

      if (xpSystem && xpSystem.applyXpToUser) {
        updatedUser = xpSystem.applyXpToUser(storedUser, experiencePointsToAdd);
      } else {
        updatedUser = {};
        var existingKeys = Object.keys(storedUser);
        for (var propIndex = 0; propIndex < existingKeys.length; propIndex++) {
          updatedUser[existingKeys[propIndex]] = storedUser[existingKeys[propIndex]];
        }
        updatedUser.xp = Math.max(0, Number(storedUser.xp || 0) + experiencePointsToAdd);
      }

      localStorage.setItem(storageKeys[keyIndex], JSON.stringify(updatedUser));
      latestUser = updatedUser;
    }

    if (latestUser && window.NetologyNav && typeof window.NetologyNav.displayNavUser === "function") {
      window.NetologyNav.displayNavUser(latestUser);
    }
  }

  // save lesson completion, started courses, and progress log to local storage
  function saveLessonCompletionToLocalStorage(lessonState, experiencePointsEarned) {
    var completionDatabaseKey = buildLessonCompletionKey(lessonState.unitIndex, lessonState.lessonIndex);

    // add this lesson to the completed lessons list
    var completionsStorageKey = "netology_completions:" + lessonState.userEmail + ":" + lessonState.courseId;
    var completionData = readJsonFromStorage(completionsStorageKey) || { lesson: [], quiz: [], challenge: [] };
    var alreadyRecorded = false;
    for (var lessonIndex = 0; lessonIndex < completionData.lesson.length; lessonIndex++) {
      if (completionData.lesson[lessonIndex] === completionDatabaseKey) {
        alreadyRecorded = true;
        break;
      }
    }
    if (!alreadyRecorded) {
      completionData.lesson.push(completionDatabaseKey);
      localStorage.setItem(completionsStorageKey, JSON.stringify(completionData));
    }

    // update the started courses record
    var startedCoursesKey = "netology_started_courses:" + lessonState.userEmail;
    var startedCourses = readJsonFromStorage(startedCoursesKey) || [];
    var existingCourseEntry = null;
    for (var courseIndex = 0; courseIndex < startedCourses.length; courseIndex++) {
      if (String(startedCourses[courseIndex].id) === String(lessonState.courseId)) {
        existingCourseEntry = startedCourses[courseIndex];
        break;
      }
    }
    if (existingCourseEntry) {
      existingCourseEntry.lastViewed = Date.now();
      existingCourseEntry.lastUnit = lessonState.unitIndex;
      existingCourseEntry.lastLesson = lessonState.lessonIndex;
    } else {
      startedCourses.push({
        id: String(lessonState.courseId),
        lastViewed: Date.now(),
        lastUnit: lessonState.unitIndex,
        lastLesson: lessonState.lessonIndex
      });
    }
    localStorage.setItem(startedCoursesKey, JSON.stringify(startedCourses));

    // append to the progress log
    var progressLogKey = "netology_progress_log:" + lessonState.userEmail;
    var progressLog = readJsonFromStorage(progressLogKey) || [];
    progressLog.push({
      type: "lesson",
      course_id: lessonState.courseId,
      lesson_number: completionDatabaseKey,
      xp: experiencePointsEarned,
      ts: Date.now(),
      date: new Date().toISOString().slice(0, 10)
    });
    localStorage.setItem(progressLogKey, JSON.stringify(progressLog));
  }

  // show the results screen with score, accuracy, and per-question review
  function displayResultsScreen(lessonState, correctAnswers, totalQuestions, accuracyPercent, experiencePointsEarned) {
    // hide the step card and progress bar, show the results card
    var stepCard = document.getElementById("stepCard");
    var resultsCard = document.getElementById("resultsCard");
    var progressCard = document.getElementById("progressCard");
    if (stepCard) stepCard.classList.add("d-none");
    if (resultsCard) resultsCard.classList.remove("d-none");
    if (progressCard) progressCard.classList.add("d-none");

    // fill the top progress bar to 100%
    setTextById("lessonStepText", "Completed");
    setTextById("lessonPctText", "100%");
    var topProgressBar = document.getElementById("lessonProgressBar");
    if (topProgressBar) topProgressBar.style.width = "100%";

    // fill the stat boxes
    setTextById("statCorrect", correctAnswers + "/" + totalQuestions);
    setTextById("statAccuracy", accuracyPercent + "%");
    setTextById("statXp", String(experiencePointsEarned));

    // pick a heading and message based on how well they did
    var isPerfect = accuracyPercent === 100;
    var hasPassed = accuracyPercent >= 70;

    if (isPerfect) {
      setTextById("resultsTitle", "Perfect Score!");
      setTextById("resultsSubtitle", "Outstanding \u2014 you got every question right.");
    } else if (hasPassed) {
      setTextById("resultsTitle", "Lesson Complete!");
      setTextById("resultsSubtitle", "Nice work \u2014 keep going to the next lesson.");
    } else {
      setTextById("resultsTitle", "Keep Practicing!");
      setTextById("resultsSubtitle", "Review the content and try again.");
    }

    // swap the badge icon to match
    var badgeContainer = document.getElementById("resultsBadge");
    if (badgeContainer) {
      badgeContainer.innerHTML = "";
      var badgeIcon = document.createElement("i");
      if (isPerfect) {
        badgeIcon.className = "bi bi-trophy-fill";
      } else if (hasPassed) {
        badgeIcon.className = "bi bi-check2-circle";
      } else {
        badgeIcon.className = "bi bi-lightbulb";
      }
      badgeContainer.appendChild(badgeIcon);
    }

    // build the per-question review section
    renderQuestionReviewList(lessonState);

    // hide the next lesson button if this was the last lesson in the unit
    var nextLessonButton = document.getElementById("nextLessonBtn");
    if (nextLessonButton) {
      nextLessonButton.style.display = lessonState.hasNextLessonInUnit ? "" : "none";
    }

    triggerSlideInAnimation("resultsCard");
  }

  // list each question with a tick or cross next to it
  function renderQuestionReviewList(lessonState) {
    var reviewContainer = document.getElementById("stepReview");
    if (!reviewContainer) return;

    // collect all mcq steps and their results
    var questionEntries = [];
    for (var stepIndex = 0; stepIndex < lessonState.steps.length; stepIndex++) {
      if (lessonState.steps[stepIndex].type === "mcq") {
        questionEntries.push({
          step: lessonState.steps[stepIndex],
          result: lessonState.stepResults[stepIndex],
          originalIndex: stepIndex
        });
      }
    }

    if (!questionEntries.length) {
      reviewContainer.innerHTML = '<p class="text-muted small">All steps were reading content \u2014 well done!</p>';
      return;
    }

    reviewContainer.innerHTML = "";
    for (var questionIndex = 0; questionIndex < questionEntries.length; questionIndex++) {
      var entry = questionEntries[questionIndex];
      var wasCorrect = entry.result === true;
      var iconClass = wasCorrect ? "bi-check-circle-fill text-success" : "bi-x-circle-fill text-danger";
      var questionText = entry.step.question || ("Question " + (entry.originalIndex + 1));

      var rowElement = document.createElement("div");
      rowElement.className = "d-flex align-items-center gap-2 mb-2";

      var iconElement = document.createElement("i");
      iconElement.className = "bi " + iconClass;

      var textSpan = document.createElement("span");
      textSpan.className = "small";
      textSpan.textContent = questionText;

      rowElement.appendChild(iconElement);
      rowElement.appendChild(textSpan);
      reviewContainer.appendChild(rowElement);
    }
  }

  // redraw the mini progress bar segments below the step card
  function updateMiniProgressBar(lessonState) {
    var miniProgressContainer = document.getElementById("miniProgress");
    if (!miniProgressContainer) return;

    var totalSteps = lessonState.steps.length;
    var completedCount = countCompletedResults(lessonState.stepResults);

    var completedLabel = document.getElementById("progressCompleted");
    var remainingLabel = document.getElementById("progressRemaining");
    if (completedLabel) completedLabel.textContent = String(completedCount);
    if (remainingLabel) remainingLabel.textContent = String(Math.max(0, totalSteps - completedCount));

    // one coloured segment per step
    miniProgressContainer.innerHTML = "";
    for (var segmentIndex = 0; segmentIndex < totalSteps; segmentIndex++) {
      var segment = document.createElement("span");
      segment.className = "net-quiz-progress-bar";
      var segmentResult = lessonState.stepResults[segmentIndex];

      if (segmentResult === true || segmentResult === "read") {
        segment.classList.add("is-correct");
      } else if (segmentResult === false) {
        segment.classList.add("is-wrong");
      } else if (segmentIndex === lessonState.currentStepIndex) {
        segment.classList.add("is-current");
      }

      miniProgressContainer.appendChild(segment);
    }
  }

  // send lesson completion to the server
  async function sendLessonCompletionToServer(lessonState, experiencePointsEarned) {
    var emptyResult = { experiencePointsAdded: 0, achievementExperiencePoints: 0 };
    if (!API_BASE || !lessonState.userEmail) return emptyResult;

    var completeLessonEndpoint = (ENDPOINTS.courses && ENDPOINTS.courses.completeLesson) || "/complete-lesson";
    var requestUrl = API_BASE + completeLessonEndpoint;

    try {
      var response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: lessonState.userEmail,
          course_id: String(lessonState.courseId),
          lesson_number: buildLessonCompletionKey(lessonState.unitIndex, lessonState.lessonIndex),
          earned_xp: experiencePointsEarned
        })
      });

      var serverData;
      try {
        serverData = await response.json();
      } catch (parseError) {
        serverData = {};
      }

      if (!serverData || !serverData.success) return emptyResult;

      // notify the achievement system if any badges were just unlocked
      var newlyUnlocked = Array.isArray(serverData.newly_unlocked) ? serverData.newly_unlocked : [];
      if (newlyUnlocked.length && window.NetologyAchievements && window.NetologyAchievements.queueUnlocks) {
        window.NetologyAchievements.queueUnlocks(lessonState.userEmail, newlyUnlocked);
      }

      return {
        experiencePointsAdded: Number(serverData.xp_added || 0),
        achievementExperiencePoints: Number(serverData.achievement_xp_added || 0)
      };
    } catch (networkError) {
      console.warn("Could not save lesson completion:", networkError);
      return emptyResult;
    }
  }

  // show a celebration toast popup when the lesson ends
  function showCompletionToastMessage(accuracyPercent, experiencePointsEarned) {
    if (typeof window.showCelebrateToast !== "function") return;

    var isPerfect = accuracyPercent === 100;
    var hasPassed = accuracyPercent >= 70;

    var toastTitle = "";
    var toastMessage = "";
    if (isPerfect) {
      toastTitle = "Perfect lesson!";
      toastMessage = "Outstanding accuracy.";
    } else if (hasPassed) {
      toastTitle = "Lesson complete";
      toastMessage = "Nice work \u2014 keep going.";
    } else {
      toastTitle = "Lesson attempt saved";
      toastMessage = "Review and try again.";
    }

    window.showCelebrateToast({
      title: toastTitle,
      message: toastMessage,
      sub: "Accuracy " + accuracyPercent + "%",
      xp: experiencePointsEarned || 0,
      mini: true,
      type: hasPassed ? "success" : "info",
      duration: 20000
    });
  }

  // trigger the slide-in animation on a card
  function triggerSlideInAnimation(elementId) {
    var card = document.getElementById(elementId);
    if (!card) return;
    card.classList.remove("net-quiz-enter");
    void card.offsetWidth;
    card.classList.add("net-quiz-enter");
  }

  // replace the whole page content with a friendly error message
  function showErrorMessage(errorText) {
    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");
    var contentWrapper = document.querySelector(".net-loading-hide");
    if (!contentWrapper) return;

    var safeTextElement = document.createElement("div");
    safeTextElement.textContent = errorText;

    var errorCard = document.createElement("div");
    errorCard.className = "net-card p-5 text-center";

    var warningIcon = document.createElement("i");
    warningIcon.className = "bi bi-exclamation-triangle display-4 text-warning mb-3";

    var heading = document.createElement("h3");
    heading.textContent = "Lesson Unavailable";

    var messageParagraph = document.createElement("p");
    messageParagraph.className = "text-muted";
    messageParagraph.textContent = errorText;

    var browseLink = document.createElement("a");
    browseLink.href = "courses.html";
    browseLink.className = "btn btn-teal mt-3";
    browseLink.textContent = "Browse Courses";

    errorCard.appendChild(warningIcon);
    errorCard.appendChild(heading);
    errorCard.appendChild(messageParagraph);
    errorCard.appendChild(browseLink);

    contentWrapper.innerHTML = "";
    contentWrapper.appendChild(errorCard);
  }

  // wire up a button by id to call a function on click
  function attachButtonListener(buttonId, clickHandler) {
    var button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener("click", function () {
        clickHandler();
      });
    }
  }

  // main entry point, runs when the page loads
  async function initialiseLessonPage() {
    // read the url parameters
    var urlParams = new URLSearchParams(window.location.search);
    var courseId = urlParams.get("course") || urlParams.get("course_id");
    var unitIndex = Math.max(0, Number(urlParams.get("unit") || 0));
    var lessonIndex = Math.max(0, Number(urlParams.get("lesson") || 0));

    // get the logged-in user from local storage
    var savedUser = readSavedUserFromLocalStorage();
    var userEmail = (savedUser && savedUser.email) ? savedUser.email : "";

    if (!userEmail || !courseId) {
      window.location.href = "login.html";
      return;
    }

    // look up the course directly from COURSE_CONTENT
    var courseData = COURSE_DATA[String(courseId)] || null;
    if (!courseData) {
      showErrorMessage("No course content found for this lesson.");
      return;
    }

    // look up the unit and lesson
    var units = courseData.units || [];
    var unit = units[unitIndex] || null;
    var lesson = (unit && unit.lessons) ? (unit.lessons[lessonIndex] || null) : null;
    var unitTitle = (unit && unit.title) ? unit.title : "Module";

    if (!lesson) {
      showErrorMessage("We couldn't find this lesson. Try going back to the course.");
      return;
    }

    // convert the lesson blocks into a flat list of steps
    var steps = buildStepsFromLessonBlocks(lesson);
    if (!steps.length) {
      showErrorMessage("This lesson has no content yet.");
      return;
    }

    // count total lessons in this unit for next-lesson navigation
    var totalLessonsInUnit = (unit && unit.lessons) ? unit.lessons.length : 0;
    var hasNextLessonInUnit = (lessonIndex + 1) < totalLessonsInUnit;

    // set both back-to-course links
    var backToCourseUrl = "course.html?id=" + courseId;
    var backTopLink = document.getElementById("backToCourseTop");
    var backBottomLink = document.getElementById("backToCourseBtn");
    if (backTopLink) backTopLink.href = backToCourseUrl;
    if (backBottomLink) backBottomLink.href = backToCourseUrl;

    // everything the lesson needs is stored in this one object
    var lessonState = {
      courseId: courseId,
      unitIndex: unitIndex,
      lessonIndex: lessonIndex,
      userEmail: userEmail,
      lesson: lesson,
      unitTitle: unitTitle,
      steps: steps,
      totalLessonsInUnit: totalLessonsInUnit,
      hasNextLessonInUnit: hasNextLessonInUnit,
      lessonExperiencePoints: getExperiencePointsForLesson(courseData, unitIndex, lessonIndex),
      currentStepIndex: 0,
      pickedOptionIndex: null,
      hasAnswered: false,
      stepResults: [],
      earnedExperiencePoints: 0
    };

    // fill the header with lesson info
    setTextById("lessonKicker", "Unit " + (unitIndex + 1) + " \u00B7 Lesson " + (lessonIndex + 1));
    setTextById("lessonTitle", lesson.title || "Lesson");
    setTextById("lessonMeta", unitTitle + " \u2022 " + steps.length + " steps");
    setTextById("lessonXpLabel", (lessonState.lessonExperiencePoints || "") + " XP");
    document.title = "Netology \u2013 " + (lesson.title || "Lesson");

    // show the page (hides the loading skeleton)
    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    // hook up the buttons
    attachButtonListener("submitBtn", function () {
      handleSubmitAnswer(lessonState);
    });

    attachButtonListener("continueBtn", function () {
      handleContinueToNextStep(lessonState);
    });

    attachButtonListener("retryBtn", function () {
      var retryParams = new URLSearchParams({
        course: lessonState.courseId,
        unit: String(lessonState.unitIndex),
        lesson: String(lessonState.lessonIndex)
      });
      window.location.href = "lesson.html?" + retryParams;
    });

    attachButtonListener("nextLessonBtn", function () {
      var nextParams = new URLSearchParams({
        course: lessonState.courseId,
        unit: String(lessonState.unitIndex),
        lesson: String(lessonState.lessonIndex + 1)
      });
      window.location.href = "lesson.html?" + nextParams;
    });

    renderCurrentStep(lessonState);
  }

  // start when the dom is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initialiseLessonPage();
    }, { once: true });
  } else {
    initialiseLessonPage();
  }
})();
