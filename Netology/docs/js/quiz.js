// quiz.js – runs the quiz page: loads questions, checks answers, awards xp, shows results

(function () {
  "use strict";

  // course content is loaded by course_content.js before this file runs
  const CONTENT   = typeof COURSE_CONTENT !== "undefined" ? COURSE_CONTENT : {};
  const API_BASE  = window.API_BASE || "";
  const ENDPOINTS = window.ENDPOINTS || {};

  // read a json value out of localStorage, returns null if missing or broken
  const readJson = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => console.error("quiz crashed on load:", err));
  });

  // start up — read url params, find the quiz, render it
  async function init() {
    const params    = new URLSearchParams(window.location.search);
    const courseId  = params.get("course") || params.get("course_id") || params.get("id");
    const contentId = params.get("content_id") || params.get("content");
    const lessonNum = Number(params.get("lesson") || 0);

    const user = readJson("netology_user") || readJson("user");

    if (!user?.email || !courseId || !lessonNum) {
      window.location.href = "login.html";
      return;
    }

    // try content key first, then fall back to matching by id
    let course = CONTENT[contentId] || CONTENT[courseId] || null;
    if (!course) {
      course = Object.values(CONTENT).find((c) => String(c.id) === String(courseId)) || null;
    }

    // back-to-course url used by the back buttons
    const resolvedId = course?.id ? String(course.id) : (contentId || courseId);
    const backUrl = `course.html?id=${courseId}${resolvedId !== courseId ? "&content_id=" + resolvedId : ""}`;

    if (!course) {
      alert("Course content not found.");
      window.location.href = backUrl;
      return;
    }

    // find the quiz for this lesson number
    const quiz = findQuiz(course, lessonNum);

    if (!quiz || !quiz.questions?.length) {
      alert("No quiz found for this lesson yet.");
      window.location.href = backUrl;
      return;
    }

    // get the module name for the breadcrumb
    const unitTitle = findUnitTitle(course, lessonNum);

    const state = {
      courseId,
      contentId: resolvedId,
      lessonNum,
      email: user.email,
      courseTitle: course.title || "",
      unitTitle,
      title: quiz.title,
      maxXp: quiz.xp,
      questions: quiz.questions,
      index: 0,    // which question we're on
      selected: null, // which option the user clicked
      answered: false,
      answers: []    // true = correct, false = wrong, per question
    };

    // already done — skip straight to results
    const saved = readJson(attemptKey(state));
    if (saved?.completed) {
      fillHeader(state);
      wireBackLinks(backUrl);
      showResults(state, saved);
      return;
    }

    fillHeader(state);
    wireBackLinks(backUrl);
    wireButtons(state);
    renderQuestion(state);
  }

  // find the quiz for this lesson — learn items count up, quizzes share the number of the learn item before them
  function findQuiz(course, lessonNum) {
    if (!course?.units) return null;
    let learnCount = 0;
    let lastLearn  = 0;
    for (const unit of course.units) {
      // section-based structure
      for (const section of (unit.sections || [])) {
        for (const item of (section.items || [])) {
          const type = String(item.type || "").toLowerCase();
          if (type === "learn" || type === "lesson" || type === "text") { learnCount++; lastLearn = learnCount; }
          if ((type === "quiz" || type === "test") && lastLearn === lessonNum) {
            if (item.quiz?.questions) return normaliseQuiz(item.quiz);
          }
        }
      }
      // lesson-based structure
      for (const lesson of (unit.lessons || [])) {
        const type = String(lesson.type || "learn").toLowerCase();
        if (type === "learn" || type === "lesson" || type === "text") { learnCount++; lastLearn = learnCount; }
        if (lesson.quiz?.questions && lastLearn === lessonNum) return normaliseQuiz(lesson.quiz);
      }
    }
    return null;
  }

  // normalise a raw quiz object into a consistent shape
  function normaliseQuiz(raw) {
    return {
      title: raw.title || "Quiz",
      xp: Number(raw.xp || 40),
      questions: raw.questions.map((q, i) => ({
        id: q.id || `q${i + 1}`,
        question: q.question || "",
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: Number(q.correctAnswer ?? 0),
        explanation: q.explanation || ""
      }))
    };
  }

  // get the unit title for the breadcrumb
  function findUnitTitle(course, lessonNum) {
    if (!course?.units) return "";
    let count = 0;
    for (const unit of course.units) {
      for (const lesson of (unit.lessons || [])) {
        count++;
        if (count === lessonNum) return unit.title || "Module";
      }
      for (const section of (unit.sections || [])) {
        for (const item of (section.items || [])) {
          const type = String(item.type || "").toLowerCase();
          if (type === "learn" || type === "lesson" || type === "text") {
            count++;
            if (count === lessonNum) return unit.title || "Module";
          }
        }
      }
    }
    return "";
  }

  // fill the header card with quiz title, xp, breadcrumb
  function fillHeader(state) {
    const set = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };
    set("quizTitle", state.title);
    set("quizMeta", `${state.title} • ${state.questions.length} questions`);
    set("quizXpLabel", `${state.maxXp} XP`);
    set("breadcrumbCourse", state.courseTitle || "Course");
    set("breadcrumbModule", state.unitTitle || "Module");
    set("breadcrumbQuiz", "Quiz");
    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");
  }

  // set both back-to-course links
  function wireBackLinks(backUrl) {
    const top = document.getElementById("backToCourseTop");
    const btn = document.getElementById("backToCourseBtn");
    if (top) top.href = backUrl;
    if (btn) btn.href = backUrl;
  }

  // wire up the submit, next and retry buttons
  function wireButtons(state) {
    const on = (id, fn) => { const b = document.getElementById(id); if (b) b.addEventListener("click", fn); };
    on("submitBtn", () => submitAnswer(state));
    on("nextBtn",   () => nextQuestion(state));
    on("retryBtn",  () => { localStorage.removeItem(attemptKey(state)); window.location.reload(); });
  }

  // draw the current question on screen
  function renderQuestion(state) {
    const q = state.questions[state.index];
    if (!q) return;

    state.selected = null;
    state.answered = false;

    const set = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };
    const el  = (id) => document.getElementById(id);

    const total = state.questions.length;
    const pct   = Math.round((state.index / total) * 100);

    set("quizStepText", `Question ${state.index + 1} of ${total}`);
    set("quizPctText", `${pct}%`);
    set("questionCountChip", `${state.index + 1}/${total}`);
    set("questionText", q.question || "Question");
    set("questionTag", "Question");

    const bar = el("quizProgressBar");
    if (bar) bar.style.width = `${pct}%`;

    // build the option buttons
    const box = el("optionsBox");
    if (box) {
      box.replaceChildren();
      q.options.forEach((text, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "net-quiz-option";
        btn.setAttribute("aria-label", `Select answer: ${text}`);

        const letter = document.createElement("span");
        letter.className = "net-quiz-option-letter";
        letter.textContent = String.fromCharCode(65 + i); // A, B, C …

        const label = document.createElement("span");
        label.className = "net-quiz-option-text";
        label.textContent = String(text ?? "");

        const status = document.createElement("span");
        status.className = "net-quiz-option-status";

        btn.append(letter, label, status);
        btn.addEventListener("click", () => {
          if (state.answered) return;
          state.selected = i;
          box.querySelectorAll("button").forEach((b) => b.classList.remove("is-selected"));
          btn.classList.add("is-selected");
          const sub = document.getElementById("submitBtn");
          if (sub) sub.disabled = false;
        });
        box.appendChild(btn);
      });
    }

    const fb = el("feedbackBox");
    if (fb) { fb.classList.add("d-none"); fb.classList.remove("is-show", "is-correct", "is-wrong"); }
    const sub  = el("submitBtn");
    const next = el("nextBtn");
    if (sub)  { sub.classList.remove("d-none"); sub.disabled = true; }
    if (next) next.classList.add("d-none");
    updateMiniProgress(state);
    animateIn("quizCard");
    const progressCard = el("progressCard");
    if (progressCard) progressCard.classList.remove("d-none");
  }

  // lock options, show right/wrong feedback, reveal next button
  function submitAnswer(state) {
    if (state.selected === null) return;

    const q         = state.questions[state.index];
    const isCorrect = state.selected === q.correctAnswer;

    state.answered = true;
    state.answers[state.index] = isCorrect;

    const set = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };
    const el  = (id) => document.getElementById(id);

    // colour options green/red
    const box = el("optionsBox");
    if (box) {
      box.querySelectorAll("button").forEach((btn, i) => {
        btn.disabled = true;
        btn.classList.remove("is-correct", "is-wrong");

        const isRight = i === q.correctAnswer;
        const isBad = i === state.selected && !isCorrect;
        if (isRight) btn.classList.add("is-correct");
        if (isBad)   btn.classList.add("is-wrong");

        // add tick or cross icon
        const statusSpan = btn.querySelector(".net-quiz-option-status");
        if (statusSpan) {
          statusSpan.replaceChildren();
          if (isRight || isBad) {
            const icon = document.createElement("i");
            icon.className = isRight ? "bi bi-check-lg" : "bi bi-x-lg";
            icon.setAttribute("aria-hidden", "true");
            statusSpan.appendChild(icon);
          }
        }
      });
    }

    // xp split equally across questions, only for correct answers
    const xpEarned = isCorrect
      ? Math.max(1, Math.round(state.maxXp / Math.max(state.questions.length, 1)))
      : 0;

    const fb    = el("feedbackBox");
    const fbIcon = el("feedbackIcon");
    if (fb && fbIcon) {
      fb.classList.remove("d-none", "is-correct", "is-wrong", "is-show");
      fbIcon.replaceChildren();
      const icon = document.createElement("i");
      icon.setAttribute("aria-hidden", "true");
      if (isCorrect) {
        fb.classList.add("is-correct");
        icon.className = "bi bi-check-lg";
        set("feedbackTitle", "Correct");
      } else {
        fb.classList.add("is-wrong");
        icon.className = "bi bi-x-lg";
        set("feedbackTitle", "Incorrect");
      }
      fbIcon.appendChild(icon);
      set("feedbackText", q.explanation || "Explanation not available.");
      fb.classList.add("is-show");

      const xpRow  = el("xpEarnedRow");
      const xpText = el("xpEarnedText");
      if (xpRow && xpText) {
        if (isCorrect) {
          xpRow.classList.remove("d-none");
          xpText.textContent = `+${xpEarned} XP`;
        } else {
          xpRow.classList.add("d-none");
        }
      }
    }

    updateMiniProgress(state);

    // swap submit for next
    const sub  = el("submitBtn");
    const next = el("nextBtn");
    if (sub)  sub.classList.add("d-none");
    if (next) {
      next.classList.remove("d-none");
      next.textContent = state.index === state.questions.length - 1 ? "View Results →" : "Next →";
    }
  }

  // move to the next question, or finish if this was the last one
  function nextQuestion(state) {
    if (state.index === state.questions.length - 1) {
      finish(state);
      return;
    }
    state.index++;
    renderQuestion(state);
  }

  // all done — tally score, post to server, save and show results
  async function finish(state) {
    const total = state.questions.length;
    const correct = state.answers.filter((a) => a === true).length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const localXp = Math.round((pct / 100) * state.maxXp);
    const result  = { completed: true, correctCount: correct, total, percentage: pct, earnedXP: localXp, answers: state.answers };
    const award   = await submitToServer(state, localXp);
    result.earnedXP = Number(award.xpAwarded ?? localXp) + Number(award.achievementXp || 0);
    if (award.alreadyCompleted) result.alreadyCompleted = true;
    localStorage.setItem(attemptKey(state), JSON.stringify(result));
    saveCompletion(state, result);
    showResults(state, result);
    showToast(result);
  }

  // post to the backend and return how much xp was awarded
  async function submitToServer(state, earnedXp) {
    if (localStorage.getItem(awardKey(state)) === "1") return { xpAwarded: 0, achievementXp: 0, alreadyCompleted: true };
    if (!API_BASE) {
      localStorage.setItem(awardKey(state), "1");
      return { xpAwarded: earnedXp, achievementXp: 0, alreadyCompleted: false };
    }

    try {
      const url = `${API_BASE}${ENDPOINTS.courses?.completeQuiz || "/complete-quiz"}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email,
          course_id: state.courseId,
          lesson_number: state.lessonNum,
          earned_xp: earnedXp
        })
      });

      const data = await res.json().catch(() => ({}));

      if (data?.success) {
        localStorage.setItem(awardKey(state), "1");

        const unlocked = Array.isArray(data.newly_unlocked) ? data.newly_unlocked : [];
        if (unlocked.length && window.NetologyAchievements?.queueUnlocks) {
          window.NetologyAchievements.queueUnlocks(state.email, unlocked);
        }

        return {
          xpAwarded: Number(data.xp_added || 0),
          achievementXp: Number(data.achievement_xp_added || 0),
          alreadyCompleted: Boolean(data.already_completed)
        };
      }
    } catch (err) {
      console.warn("could not save quiz completion to server:", err);
    }

    return { xpAwarded: earnedXp, achievementXp: 0, alreadyCompleted: false };
  }

  // save quiz completion to localStorage
  function saveCompletion(state, result) {
    const compKey  = `netology_completions:${state.email}:${state.courseId}`;
    const compData = readJson(compKey) || { lesson: [], quiz: [], challenge: [] };
    if (!compData.quiz.includes(Number(state.lessonNum))) {
      compData.quiz.push(Number(state.lessonNum));
      localStorage.setItem(compKey, JSON.stringify(compData));
    }

    // bump the user's xp in localStorage
    for (const key of ["netology_user", "user"]) {
      const stored = readJson(key);
      if (!stored || stored.email !== state.email) continue;
      const xpSystem = window.NetologyXP;
      const updated  = xpSystem?.applyXpToUser
        ? xpSystem.applyXpToUser(stored, result.earnedXP)
        : { ...stored, xp: Math.max(0, Number(stored.xp || 0) + Number(result.earnedXP || 0)) };
      localStorage.setItem(key, JSON.stringify(updated));
    }

    // keep the started-courses record up to date
    const startKey = `netology_started_courses:${state.email}`;
    const started  = readJson(startKey) || [];
    const existing = started.find((c) => String(c.id) === String(state.courseId));
    if (existing) {
      existing.lastViewed = Date.now();
      existing.lastLesson = state.lessonNum;
    } else {
      started.push({ id: String(state.courseId), lastViewed: Date.now(), lastLesson: state.lessonNum });
    }
    localStorage.setItem(startKey, JSON.stringify(started));

    // add to the progress log
    const logKey = `netology_progress_log:${state.email}`;
    const log    = readJson(logKey) || [];
    log.push({
      type: "quiz",
      course_id: state.courseId,
      lesson_number: state.lessonNum,
      xp: Number(result.earnedXP || 0),
      ts: Date.now(),
      date: new Date().toISOString().slice(0, 10)
    });
    localStorage.setItem(logKey, JSON.stringify(log));
  }

  // hide the question card and show results
  function showResults(state, result) {
    const set = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };
    const el  = (id) => document.getElementById(id);
    el("quizCard")?.classList.add("d-none");
    el("resultsCard")?.classList.remove("d-none");
    el("progressCard")?.classList.add("d-none");
    set("quizStepText", "Completed");
    set("quizPctText", "100%");
    const bar = el("quizProgressBar");
    if (bar) bar.style.width = "100%";
    set("statCorrect", `${result.correctCount}/${result.total}`);
    set("statPct",     `${result.percentage}%`);
    set("statXp",      String(result.earnedXP));
    const perfect = result.percentage === 100;
    const passed = result.percentage >= 40;
    const badge = el("resultsBadge");
    if (badge) {
      badge.replaceChildren();
      const icon = document.createElement("i");
      icon.setAttribute("aria-hidden", "true");
      icon.className = perfect ? "bi bi-trophy-fill" : passed ? "bi bi-check2-circle" : "bi bi-lightbulb";
      badge.appendChild(icon);
    }

    set("resultsTitle", perfect ? "Perfect Score!" : passed ? "Quiz Passed!" : "Keep Practicing!");
    set("resultsSubtitle",
      perfect ? "Outstanding work — you got everything correct."
      : passed ? "Nice job — keep going to the next lesson."
      : "Review the lesson and retry — you'll get it.");

    animateIn("resultsCard");
  }

  // redraw the mini progress bar segments
  function updateMiniProgress(state) {
    const box = document.getElementById("miniProgress");
    if (!box) return;

    const total = state.questions.length;
    const correct = state.answers.filter((a) => a === true).length;
    const remaining = Math.max(0, total - state.answers.filter((a) => typeof a === "boolean").length);

    const set = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };
    set("progressCorrectCount", correct);
    set("progressRemaining",    remaining);

    box.replaceChildren();
    for (let i = 0; i < total; i++) {
      const seg = document.createElement("span");
      seg.className = "net-quiz-progress-bar";
      const a = state.answers[i];
      if (typeof a === "boolean") seg.classList.add(a ? "is-correct" : "is-wrong");
      else if (i === state.index) seg.classList.add("is-current");
      box.appendChild(seg);
    }
  }

  // show a celebration toast when the quiz ends
  function showToast(result) {
    if (result.alreadyCompleted) return;
    if (typeof window.showCelebrateToast !== "function") return;
    const passed = result.percentage >= 40;
    const perfect = result.percentage === 100;

    window.showCelebrateToast({
      title: perfect ? "Perfect quiz score" : passed ? "Quiz completed" : "Quiz attempt saved",
      message: perfect ? "Outstanding accuracy." : passed ? "Nice work — keep going." : "Review the lesson and try again.",
      sub: `Score ${result.correctCount}/${result.total}`,
      xp: result.earnedXP || 0,
      mini: true,
      type: passed ? "success" : "info",
      duration: 20000
    });
  }

  // slide-in animation
  function animateIn(id) {
    const card = document.getElementById(id);
    if (!card) return;
    card.classList.remove("net-quiz-enter");
    void card.offsetWidth;
    card.classList.add("net-quiz-enter");
  }

  function attemptKey(state) {
    return `netology_quiz_attempt:${state.email}:${state.courseId}:${state.lessonNum}`;
  }
  function awardKey(state) {
    return `netology_quiz_awarded:${state.email}:${state.courseId}:${state.lessonNum}`;
  }

})();
