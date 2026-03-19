// lesson.js – runs the step-by-step lesson page

(function () {
  "use strict";

  // course content is loaded by course_content.js before this file runs
  const CONTENT = typeof COURSE_CONTENT !== "undefined" ? COURSE_CONTENT : {};
  const API_BASE = window.API_BASE || "";
  const ENDPOINTS = window.ENDPOINTS || {};

  // read a JSON value out of localStorage without crashing if it's missing or broken
  const readJson = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };

  // look up how much xp a lesson is worth from the section items in course_content
  // lesson numbers are sequential across all units (1, 2, 3 … n)
  function xpForLesson(course, lessonNum) {
    let count = 0;
    for (const unit of course.units) {
      for (const section of (unit.sections || [])) {
        for (const item of (section.items || [])) {
          if ((item.type || "").toLowerCase() === "learn") {
            count++;
            if (count === lessonNum) return item.xp;
          }
        }
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    start().catch((err) => console.error("lesson crashed on load:", err));
  });

  async function start() {
    // read the url parameters
    const params   = new URLSearchParams(window.location.search);
    const courseId = params.get("course_id") || params.get("course") || params.get("id");
    const contentId = params.get("content_id") || params.get("content");
    const lessonNum = Math.max(1, Number(params.get("lesson") || 1));

    // get the logged-in user from localStorage
    const user = readJson("netology_user") || readJson("user");

    if (!user?.email || !courseId) {
      window.location.href = "login.html";
      return;
    }

    // find the course — try the content key first, then fall back to matching by id field
    let course = CONTENT[contentId] || CONTENT[courseId] || null;
    if (!course) {
      course = Object.values(CONTENT).find((c) => String(c.id) === String(courseId)) || null;
    }

    if (!course) {
      showError("No course content found for this lesson.");
      return;
    }

    // walk through all units and count lessons until we reach the one we want
    let count = 0;
    let lesson = null;
    let unitTitle = "Module";
    for (const unit of (course.units || [])) {
      for (const l of (unit.lessons || [])) {
        count++;
        if (count === lessonNum) {
          lesson = l;
          unitTitle = unit.title || "Module";
          break;
        }
      }
      if (lesson) break;
    }

    if (!lesson) {
      showError("We couldn't find this lesson. Try going back to the course.");
      return;
    }

    // convert the lesson blocks into a flat list of steps the player can loop through
    const steps = [];
    for (const block of (lesson.blocks || [])) {
      if (block.type === "text") {
        // split text into chunks of 3 lines so each card isn't overwhelming
        const lines = (Array.isArray(block.text) ? block.text : [block.text || ""]).filter(Boolean);
        for (let i = 0; i < lines.length; i += 3) {
          const chunk = lines.slice(i, i + 3);
          if (chunk.length) steps.push({ type: "learn", title: block.title || lesson.title || "Learn", lines: chunk });
        }
      } else if (block.type === "explain") {
        const lines = (Array.isArray(block.content) ? block.content : [block.content || ""]).filter(Boolean);
        steps.push({ type: "explain", title: block.title || "Key Concept", lines });
      } else if (block.type === "check") {
        steps.push({
          type: "mcq",
          question: block.question || "Quick check",
          options: block.options || [],
          correct: block.correctIndex ?? 0,
          hint: block.explanation || ""
        });
      } else if (block.type === "activity" && block.mode === "select") {
        steps.push({
          type: "mcq",
          question: block.prompt || block.title || "Choose the correct answer",
          options: block.options || [],
          correct: block.correctIndex ?? 0,
          hint: block.explanation || ""
        });
      } else if (block.type === "activity" && Array.isArray(block.steps)) {
        steps.push({ type: "learn", title: block.title || "Activity", lines: block.steps });
      }
    }

    if (!steps.length) {
      showError("This lesson has no content yet.");
      return;
    }

    // count how many lessons are in the whole course (used to show/hide the next lesson button)
    const totalLessons = (course.units || []).reduce((n, u) => n + (u.lessons?.length || 0), 0);

    // set both back-to-course links to return the user to the exact course page they came from
    const backUrl = `course.html?id=${courseId}${contentId ? "&content_id=" + contentId : ""}`;
    const backTop = document.getElementById("backToCourseTop");
    const backBottom = document.getElementById("backToCourseBtn");
    if (backTop) backTop.href = backUrl;
    if (backBottom) backBottom.href = backUrl;

    // everything the lesson needs is stored in this one object and passed between functions
    const state = {
      courseId,
      contentId,
      lessonNum,
      email: user.email,
      lesson,
      unitTitle,
      steps,
      totalLessons,
      lessonXp: xpForLesson(course, lessonNum),  // xp from the section item in course_content
      index: 0,       // which step we're on
      picked: null,   // which option the user clicked on the current mcq
      answered: false,
      results: [],    // true = correct, false = wrong, "read" = reading step seen
      xpEarned: 0
    };

    // shortcuts for reading/writing dom elements in this scope
    const el  = (id) => document.getElementById(id);
    const set = (id, text) => { const e = el(id); if (e) e.textContent = text; };

    // fill the header with lesson info
    set("lessonKicker",  `Lesson ${lessonNum}`);
    set("lessonTitle",   lesson.title || "Lesson");
    set("lessonMeta",    `${unitTitle} • ${steps.length} steps`);
    set("lessonXpLabel", `${state.lessonXp} XP`);
    document.title = `Netology – ${lesson.title || "Lesson"}`;

    // show the page (hides the loading skeleton)
    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    // hook up the buttons
    const on = (id, fn) => { const b = el(id); if (b) b.addEventListener("click", fn); };
    on("submitBtn",   () => submitAnswer(state));
    on("continueBtn", () => nextStep(state));
    on("retryBtn", () => {
      // reload the same lesson from scratch
      const q = new URLSearchParams({ course_id: state.courseId });
      if (state.contentId) q.set("content_id", state.contentId);
      q.set("lesson", String(state.lessonNum));
      window.location.href = `lesson.html?${q}`;
    });
    on("nextLessonBtn", () => {
      // go to the next lesson in this course
      const q = new URLSearchParams({ course_id: state.courseId });
      if (state.contentId) q.set("content_id", state.contentId);
      q.set("lesson", String(state.lessonNum + 1));
      window.location.href = `lesson.html?${q}`;
    });

    renderStep(state);
  }

  // draw the current step on screen
  function renderStep(state) {
    const step = state.steps[state.index];
    if (!step) return;

    const el  = (id) => document.getElementById(id);
    const set = (id, text) => { const e = el(id); if (e) e.textContent = text; };

    // reset pick state for this step
    state.picked   = null;
    state.answered = false;

    // update the progress text and bar
    const total = state.steps.length;
    const pct   = Math.round((state.index / total) * 100);
    set("lessonStepText", `Step ${state.index + 1} of ${total}`);
    set("lessonPctText",  `${pct}%`);
    set("stepCountChip",  `${state.index + 1}/${total}`);
    const bar = el("lessonProgressBar");
    if (bar) bar.style.width = `${pct}%`;

    const content = el("stepContent");
    const options = el("optionsBox");

    if (step.type === "learn" || step.type === "explain") {
      // reading step — show text content and a continue button
      if (content) {
        content.innerHTML = "";
        const wrap = document.createElement("div");
        if (step.type === "explain") {
          // explain steps get a highlighted info box
          wrap.className = "alert alert-info border-0";
          wrap.innerHTML = `<div class="d-flex align-items-center gap-2 mb-2">
            <i class="bi bi-lightbulb-fill text-warning"></i>
            <strong>Key Concept</strong>
          </div>`;
        }
        step.lines.forEach((line) => {
          const p = document.createElement("p");
          p.className = step.type === "explain" ? "mb-2" : "mb-3";
          p.textContent = line;
          wrap.appendChild(p);
        });
        content.appendChild(wrap);
      }

      set("stepTag",   step.type === "explain" ? "Key Concept" : "Learn");
      set("stepTitle", step.title);

      // hide the answer options, show the continue button
      if (options) { options.replaceChildren(); options.classList.add("d-none"); }
      const cont = el("continueBtn");
      const sub  = el("submitBtn");
      if (cont) cont.classList.remove("d-none");
      if (sub)  { sub.classList.add("d-none"); sub.disabled = true; }

    } else if (step.type === "mcq") {
      // question step — show options and a check answer button
      if (content) content.innerHTML = "";
      set("stepTag",   "Check Your Knowledge");
      set("stepTitle", step.question);

      if (options) {
        options.replaceChildren();
        options.classList.remove("d-none");

        // build one button per answer option
        step.options.forEach((text, i) => {
          const btn = document.createElement("button");
          btn.type      = "button";
          btn.className = "net-quiz-option";
          btn.setAttribute("aria-label", `Select answer: ${text}`);

          const letter = document.createElement("span");
          letter.className   = "net-quiz-option-letter";
          letter.textContent = String.fromCharCode(65 + i); // A, B, C ...

          const label = document.createElement("span");
          label.className   = "net-quiz-option-text";
          label.textContent = text;

          const status = document.createElement("span");
          status.className = "net-quiz-option-status";

          btn.append(letter, label, status);
          btn.addEventListener("click", () => {
            if (state.answered) return; // too late to change after submitting
            state.picked = i;
            options.querySelectorAll("button").forEach((b) => b.classList.remove("is-selected"));
            btn.classList.add("is-selected");
            // enable the check answer button once something is selected
            const sub = document.getElementById("submitBtn");
            if (sub) sub.disabled = false;
          });
          options.appendChild(btn);
        });
      }

      // show the check answer button, hide continue until they answer
      const cont = el("continueBtn");
      const sub  = el("submitBtn");
      if (cont) cont.classList.add("d-none");
      if (sub)  { sub.classList.remove("d-none"); sub.disabled = true; }
    }

    // clear the feedback box left over from the previous step
    const fb = document.getElementById("feedbackBox");
    if (fb) { fb.classList.add("d-none"); fb.classList.remove("is-show", "is-correct", "is-wrong"); }

    updateProgress(state);
    animateIn("stepCard");
  }

  // the user clicked "Check Answer" — lock the options and show feedback
  function submitAnswer(state) {
    if (state.picked === null) return;

    const el  = (id) => document.getElementById(id);
    const set = (id, text) => { const e = el(id); if (e) e.textContent = text; };

    const step      = state.steps[state.index];
    const isCorrect = state.picked === step.correct;

    state.answered              = true;
    state.results[state.index]  = isCorrect;

    // highlight each option as correct (green) or wrong (red)
    const options = el("optionsBox");
    if (options) {
      options.querySelectorAll("button").forEach((btn, i) => {
        btn.disabled = true;
        btn.classList.remove("is-correct", "is-wrong");
        if (i === step.correct) btn.classList.add("is-correct");
        if (i === state.picked && !isCorrect) btn.classList.add("is-wrong");

        // add a tick or cross icon on the relevant buttons
        const statusSpan = btn.querySelector(".net-quiz-option-status");
        if (statusSpan) {
          statusSpan.replaceChildren();
          const icon = document.createElement("i");
          if (i === step.correct) {
            icon.className = "bi bi-check-lg";
            statusSpan.appendChild(icon);
          } else if (i === state.picked && !isCorrect) {
            icon.className = "bi bi-x-lg";
            statusSpan.appendChild(icon);
          }
        }
      });
    }

    // xp is split equally across all questions — only awarded for correct answers
    const questionCount = state.steps.filter((s) => s.type === "mcq").length;
    const xpGained = isCorrect ? Math.round(state.lessonXp / Math.max(questionCount, 1)) : 0;
    if (xpGained) state.xpEarned += xpGained;

    // show the feedback box below the options
    const feedbackBox  = el("feedbackBox");
    const feedbackIcon = el("feedbackIcon");
    if (feedbackBox && feedbackIcon) {
      feedbackBox.classList.remove("d-none", "is-correct", "is-wrong", "is-show");
      feedbackIcon.replaceChildren();
      const icon = document.createElement("i");
      if (isCorrect) {
        feedbackBox.classList.add("is-correct");
        icon.className = "bi bi-check-lg";
        set("feedbackTitle", "Correct");
      } else {
        feedbackBox.classList.add("is-wrong");
        icon.className = "bi bi-x-lg";
        set("feedbackTitle", "Incorrect");
      }
      feedbackIcon.appendChild(icon);
      set("feedbackText", step.hint || "");
      feedbackBox.classList.add("is-show");

      // show the xp badge only when xp was actually earned
      const xpRow   = el("xpEarnedRow");
      const xpLabel = el("xpEarnedText");
      if (xpRow && xpLabel) {
        if (isCorrect && xpGained) {
          xpRow.classList.remove("d-none");
          xpLabel.textContent = `+${xpGained} XP`;
        } else {
          xpRow.classList.add("d-none");
        }
      }
    }

    updateProgress(state);

    // replace the check answer button with the continue button
    const sub  = el("submitBtn");
    const cont = el("continueBtn");
    if (sub)  sub.classList.add("d-none");
    if (cont) {
      cont.classList.remove("d-none");
      cont.textContent = state.index === state.steps.length - 1 ? "View Results →" : "Continue →";
    }
  }

  // move to the next step, or finish if this was the last one
  function nextStep(state) {
    // mark reading steps as done when the user clicks continue
    if (state.results[state.index] === undefined) {
      state.results[state.index] = "read";
    }

    if (state.index === state.steps.length - 1) {
      finish(state);
      return;
    }

    state.index++;
    renderStep(state);
  }

  // all steps done — calculate the score and save everything
  async function finish(state) {
    // only mcq steps count toward the score
    const questions = state.steps
      .map((s, i) => ({ step: s, result: state.results[i] }))
      .filter((e) => e.step.type === "mcq");

    const total    = questions.length;
    const correct  = questions.filter((e) => e.result === true).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;
    const xpEarned = total > 0 ? Math.round((correct / total) * state.lessonXp) : state.lessonXp;

    state.xpEarned = xpEarned;

    // tell the backend the lesson is done and get back how much xp was awarded
    const serverResponse = await reportCompletion(state, xpEarned);
    const totalXp = Number(serverResponse.xpAdded || 0) + Number(serverResponse.achievementXp || 0);

    // update the user's xp in localStorage
    if (totalXp > 0) {
      for (const key of ["netology_user", "user"]) {
        const stored = readJson(key);
        if (!stored || stored.email?.toLowerCase() !== state.email.toLowerCase()) continue;
        const xpSystem = window.NetologyXP;
        const updated  = xpSystem?.applyXpToUser
          ? xpSystem.applyXpToUser(stored, totalXp)
          : { ...stored, xp: Math.max(0, Number(stored.xp || 0) + totalXp) };
        localStorage.setItem(key, JSON.stringify(updated));
      }
    }

    // add this lesson to the list of completed lessons
    const compKey  = `netology_completions:${state.email}:${state.courseId}`;
    const compData = readJson(compKey) || { lesson: [], quiz: [], challenge: [] };
    if (!compData.lesson.includes(state.lessonNum)) {
      compData.lesson.push(state.lessonNum);
      localStorage.setItem(compKey, JSON.stringify(compData));
    }

    // update the "started courses" record so the dashboard can show recent activity
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

    // append an entry to the progress log (used by the progress page graphs)
    const logKey = `netology_progress_log:${state.email}`;
    const log    = readJson(logKey) || [];
    log.push({
      type:          "lesson",
      course_id:     state.courseId,
      lesson_number: state.lessonNum,
      xp:            xpEarned,
      ts:            Date.now(),
      date:          new Date().toISOString().slice(0, 10)
    });
    localStorage.setItem(logKey, JSON.stringify(log));

    showResults(state, correct, total, accuracy, xpEarned);
    showCompletionToast(accuracy, xpEarned);
  }

  // swap the step card out and show the results screen
  function showResults(state, correct, total, accuracy, xpEarned) {
    const el  = (id) => document.getElementById(id);
    const set = (id, text) => { const e = el(id); if (e) e.textContent = text; };

    // hide the step card and progress bar, show the results card
    const stepCard     = el("stepCard");
    const resultsCard  = el("resultsCard");
    const progressCard = el("progressCard");
    if (stepCard)     stepCard.classList.add("d-none");
    if (resultsCard)  resultsCard.classList.remove("d-none");
    if (progressCard) progressCard.classList.add("d-none");

    // fill the top progress bar to 100%
    set("lessonStepText", "Completed");
    set("lessonPctText",  "100%");
    const bar = el("lessonProgressBar");
    if (bar) bar.style.width = "100%";

    // fill the stat boxes
    set("statCorrect",  `${correct}/${total}`);
    set("statAccuracy", `${accuracy}%`);
    set("statXp",       String(xpEarned));

    // pick a heading and message based on how well they did
    const perfect = accuracy === 100;
    const passed  = accuracy >= 70;
    set("resultsTitle",    perfect ? "Perfect Score!"     : passed ? "Lesson Complete!" : "Keep Practicing!");
    set("resultsSubtitle", perfect ? "Outstanding — you got every question right."
                         : passed  ? "Nice work — keep going to the next lesson."
                                   : "Review the content and try again.");

    // swap the badge icon to match
    const badge = el("resultsBadge");
    if (badge) {
      badge.replaceChildren();
      const icon = document.createElement("i");
      icon.className = perfect ? "bi bi-trophy-fill" : passed ? "bi bi-check2-circle" : "bi bi-lightbulb";
      badge.appendChild(icon);
    }

    // list each question with a tick or cross next to it
    const reviewBox = el("stepReview");
    if (reviewBox) {
      const mcqs = state.steps
        .map((s, i) => ({ step: s, result: state.results[i], i }))
        .filter((e) => e.step.type === "mcq");

      if (!mcqs.length) {
        reviewBox.innerHTML = '<p class="text-muted small">All steps were reading content — well done!</p>';
      } else {
        reviewBox.innerHTML = mcqs.map((e) => {
          const ok        = e.result === true;
          const iconClass = ok ? "bi-check-circle-fill text-success" : "bi-x-circle-fill text-danger";
          // use a temp element to safely escape the question text before putting it in html
          const tmp = document.createElement("div");
          tmp.textContent = e.step.question || `Question ${e.i + 1}`;
          return `<div class="d-flex align-items-center gap-2 mb-2">
            <i class="bi ${iconClass}"></i><span class="small">${tmp.innerHTML}</span>
          </div>`;
        }).join("");
      }
    }

    // hide the next lesson button if this was the last lesson in the course
    const nextBtn = el("nextLessonBtn");
    if (nextBtn) nextBtn.style.display = state.lessonNum < state.totalLessons ? "" : "none";

    animateIn("resultsCard");
  }

  // redraw the mini progress bar segments below the step card
  function updateProgress(state) {
    const box = document.getElementById("miniProgress");
    if (!box) return;

    const total = state.steps.length;
    const done  = state.results.filter((r) => r !== undefined).length;

    const comp = document.getElementById("progressCompleted");
    const rem  = document.getElementById("progressRemaining");
    if (comp) comp.textContent = String(done);
    if (rem)  rem.textContent  = String(Math.max(0, total - done));

    // one coloured segment per step
    box.replaceChildren();
    for (let i = 0; i < total; i++) {
      const seg = document.createElement("span");
      seg.className = "net-quiz-progress-bar";
      const r = state.results[i];
      if (r === true || r === "read") seg.classList.add("is-correct");
      else if (r === false)           seg.classList.add("is-wrong");
      else if (i === state.index)     seg.classList.add("is-current");
      box.appendChild(seg);
    }
  }

  // send lesson completion to the server and return how much xp was awarded
  async function reportCompletion(state, xpEarned) {
    if (!API_BASE || !state.email) return { xpAdded: 0, achievementXp: 0 };

    const url = `${API_BASE}${ENDPOINTS.courses?.completeLesson || "/complete-lesson"}`;
    try {
      const res  = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:         state.email,
          course_id:     String(state.courseId),
          lesson_number: state.lessonNum,
          earned_xp:     xpEarned
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!data?.success) return { xpAdded: 0, achievementXp: 0 };

      // notify the achievement system if any badges were just unlocked
      const unlocked = Array.isArray(data.newly_unlocked) ? data.newly_unlocked : [];
      if (unlocked.length && window.NetologyAchievements?.queueUnlocks) {
        window.NetologyAchievements.queueUnlocks(state.email, unlocked);
      }

      return {
        xpAdded:      Number(data.xp_added || 0),
        achievementXp: Number(data.achievement_xp_added || 0)
      };
    } catch (err) {
      console.warn("could not save lesson completion:", err);
      return { xpAdded: 0, achievementXp: 0 };
    }
  }

  // show a celebration toast popup when the lesson ends
  function showCompletionToast(accuracy, xpEarned) {
    if (typeof window.showCelebrateToast !== "function") return;
    const perfect = accuracy === 100;
    const passed  = accuracy >= 70;
    window.showCelebrateToast({
      title:    perfect ? "Perfect lesson!"     : passed ? "Lesson complete"       : "Lesson attempt saved",
      message:  perfect ? "Outstanding accuracy." : passed ? "Nice work — keep going." : "Review and try again.",
      sub:      `Accuracy ${accuracy}%`,
      xp:       xpEarned || 0,
      mini:     true,
      type:     passed ? "success" : "info",
      duration: 20000
    });
  }

  // trigger the slide-in animation on a card
  function animateIn(id) {
    const card = document.getElementById(id);
    if (!card) return;
    card.classList.remove("net-quiz-enter");
    void card.offsetWidth; // force the browser to reset the animation
    card.classList.add("net-quiz-enter");
  }

  // replace the whole page content with a friendly error message
  function showError(msg) {
    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");
    const wrap = document.querySelector(".net-loading-hide");
    if (!wrap) return;
    // use a temp element to safely escape the message before injecting it as html
    const tmp = document.createElement("div");
    tmp.textContent = msg;
    wrap.innerHTML = `
      <div class="net-card p-5 text-center">
        <i class="bi bi-exclamation-triangle display-4 text-warning mb-3"></i>
        <h3>Lesson Unavailable</h3>
        <p class="text-muted">${tmp.innerHTML}</p>
        <a href="courses.html" class="btn btn-teal mt-3">Browse Courses</a>
      </div>`;
  }

})();
