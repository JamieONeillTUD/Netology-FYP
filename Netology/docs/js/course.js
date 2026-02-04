/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript
---------------------------------------
course.js – Handles all course pages.

Loading course details and lessons
Showing user progress
Completing lessons and updating XP
Universal and reusable for all course pages.

UPDATES ADDED (kept simple + same style as your code):
- Current Lesson section: Learn + Quiz + Sandbox Challenge
- Prev/Next lesson buttons
- Quiz stores answer in localStorage and shows correct/wrong feedback
- Challenge stores rules in localStorage and opens sandbox with ?challenge=1

UPDATED (Part 2):
- Completing a lesson sends lesson_number to backend (tracks real lesson completion + prevents duplicate XP)
- Correct quiz awards XP once via /complete-quiz (prevents duplicate XP)
- Course content now comes from course_content.js (Units + Lessons like Khan Academy)

UPDATED (Part 2 - Status Badges):
- Loads lesson/quiz/challenge completion from /user-course-status
- Sidebar shows badges per lesson: Done / Quiz / Chal (like Khan Academy)
- Badges update instantly when user completes a lesson or quiz

UPDATED (Unit Page View - Khan Style):
- Clicking a Unit title shows a Unit page (About this unit + sections)
- Unit page items (Learn / Practice / Quiz / Challenge) open the lesson view
- Unit view and Lesson view toggle using #unitView and #lessonView in course.html
*/

// ---------------------------
// Page load
// ---------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Redirect if not logged in or missing course ID
  if (!user.email || !courseId) {
    window.location.href = "login.html";
    return;
  }

  // NEW (Part 3): allow returning to a specific lesson (from sandbox "Return to lesson")
  // If URL has &lesson=, use it. Otherwise use netology_return_lesson if it matches this course.
  const lessonParam = Number(params.get("lesson") || 0);

  // Load course info and user progress
  await loadCourse(courseId, user.email);

  // NEW (Part 3): if the URL requested a specific lesson, jump to it after loadCourse builds flatLessons
  if (lessonParam && !isNaN(lessonParam)) {
    __courseState.activeLesson = Math.min(Math.max(lessonParam, 1), __courseState.totalLessons || 1);

    // ADDITION ONLY: keep activeUnit in sync for dropdown open state
    try {
      const f = getFlatLessonByIndex(__courseState.activeLesson);
      if (f) __courseState.activeUnit = Number(f.unitIndex || 0);
    } catch (e) {}

    __courseState.view = "lesson";
    renderCurrentLesson();
  } else {
    // NEW (Part 3): if returning from sandbox, jump back to last stored lesson (only if same course)
    try {
      const rawReturn = localStorage.getItem("netology_return_lesson");
      if (rawReturn) {
        const ret = JSON.parse(rawReturn);
        if (String(ret.course_id) === String(courseId) && ret.lesson_number) {
          __courseState.activeLesson = Math.min(
            Math.max(Number(ret.lesson_number) || 1, 1),
            __courseState.totalLessons || 1
          );

          // ADDITION ONLY: keep activeUnit in sync for dropdown open state
          const f = getFlatLessonByIndex(__courseState.activeLesson);
          if (f) __courseState.activeUnit = Number(f.unitIndex || 0);

          __courseState.view = "lesson";
          renderCurrentLesson();
        }
      }
    } catch (e) {
      console.error("return_lesson parse error:", e);
    }
  }

  // NEW (Part 3): read challenge completion flag written by sandbox.js and update UI instantly
  // (still safe because backend /user-course-status is the source of truth)
  try {
    const raw = localStorage.getItem("netology_challenge_completed");
    if (raw) {
      const done = JSON.parse(raw);
      if (String(done.courseId) === String(courseId) && Number(done.lesson)) {
        __courseState.completed.challenges.add(Number(done.lesson));
        renderLessons(__courseState.totalLessons, __courseState.progressPct);

        // Clear after applying so it doesn't keep re-triggering
        localStorage.removeItem("netology_challenge_completed");
      }
    }
  } catch (e) {
    console.error("challenge_completed parse error:", e);
  }

  // Complete lesson button (existing)
  const completeBtn = document.getElementById("completeLessonBtn");
  if (completeBtn) {
    completeBtn.addEventListener("click", async () => {
      await completeLesson(courseId, user.email);
    });
  }

  // NEW: lesson navigation buttons (only works if you added them in course.html)
  const prevBtn = document.getElementById("prevLessonBtn");
  const nextBtn = document.getElementById("nextLessonBtn");
  if (prevBtn) prevBtn.addEventListener("click", () => changeLesson(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => changeLesson(1));

  // NEW: challenge buttons
  const startChallengeBtn = document.getElementById("startChallengeBtn");
  const validateChallengeBtn = document.getElementById("validateChallengeBtn");
  if (startChallengeBtn) startChallengeBtn.addEventListener("click", () => openChallengeInSandbox());
  if (validateChallengeBtn) validateChallengeBtn.addEventListener("click", () => openChallengeInSandbox(true));

  // =========================================================
  // ADDITION ONLY (Course tidy): top "Start Challenge" button support
  // This was added in your updated course.html as id="startChallengeBtnTop"
  // =========================================================
  const startChallengeBtnTop = document.getElementById("startChallengeBtnTop");
  if (startChallengeBtnTop) {
    startChallengeBtnTop.addEventListener("click", () => {
      // Make sure we are in lesson view, then open challenge for current lesson
      __courseState.view = "lesson";
      renderCurrentLesson();
      openChallengeInSandbox();
    });
  }

  // =========================================================
  // ADDITION ONLY (Full Quiz Page):
  // - Opens quiz.html for the current course + active lesson
  // - URL: quiz.html?course=${courseId}&lesson=${activeLesson}
  // =========================================================
  function openFullQuizPage() {
    const c = __courseState.courseId || courseId;
    const l = __courseState.activeLesson || 1;

    // Store return target (nice UX: quiz can send them back)
    localStorage.setItem("netology_return_lesson", JSON.stringify({
      course_id: c,
      lesson_number: l
    }));

    window.location.href = `quiz.html?course=${encodeURIComponent(c)}&lesson=${encodeURIComponent(l)}`;
  }

  const openFullQuizBtn = document.getElementById("openFullQuizBtn");
  if (openFullQuizBtn) openFullQuizBtn.addEventListener("click", openFullQuizPage);

  // Optional button inside the quiz card
  const openFullQuizBtn2 = document.getElementById("openFullQuizBtn2");
  if (openFullQuizBtn2) openFullQuizBtn2.addEventListener("click", openFullQuizPage);
});

// ---------------------------
// Simple state (same style)
// ---------------------------
let __courseState = {
  courseId: null,
  email: null,
  courseTitle: "",
  totalLessons: 0,
  progressPct: 0,
  activeLesson: 1,

  // NEW: unit/lesson map for Khan layout
  flatLessons: [], // [{ index, unitIndex, lessonIndex, unitTitle, lesson }]

  // NEW: completion status sets (for sidebar badges)
  completed: {
    lessons: new Set(),
    quizzes: new Set(),
    challenges: new Set()
  },

  // NEW: Unit page view state
  activeUnit: 0,
  view: "unit" // "unit" or "lesson"
};

// ---------------------------
// Course content helpers (Khan-style)
// ---------------------------
/*
AI PROMPTED CODE BELOW
"Can you write helper functions to flatten units/lessons so I can navigate lessons by a single index
but still display Unit and Lesson titles like Khan Academy?"
*/

function getCourseContent(courseId, fallbackTitle) {
  // COURSE_CONTENT is loaded from course_content.js
  if (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT[courseId]) {
    return COURSE_CONTENT[courseId];
  }

  // Fallback to simple template content if courseId not found
  return {
    title: fallbackTitle || "Course",
    units: [
      {
        title: "Unit 1",
        lessons: [
          {
            title: "Lesson 1",
            learn: "No content found for this course yet. Add it in course_content.js.",
            quiz: null,
            challenge: null
          }
        ]
      }
    ]
  };
}

function flattenLessons(courseContent) {
  const flat = [];
  let idx = 1;

  (courseContent.units || []).forEach((unit, uIndex) => {
    (unit.lessons || []).forEach((lesson, lIndex) => {
      flat.push({
        index: idx,
        unitIndex: uIndex,
        lessonIndex: lIndex,
        unitTitle: unit.title || `Unit ${uIndex + 1}`,
        lesson: lesson
      });
      idx += 1;
    });
  });

  return flat;
}

function getFlatLessonByIndex(index) {
  const n = Number(index) || 1;
  return (__courseState.flatLessons || []).find(x => x.index === n) || __courseState.flatLessons[0];
}

function totalFlatLessons() {
  return (__courseState.flatLessons || []).length || 1;
}

// ---------------------------
// NEW: Unit view helpers (Khan-style unit page)
// ---------------------------
/*
AI PROMPTED CODE BELOW
"Can you write simple functions that show a unit page like Khan Academy:
- About this unit
- Sections with Learn/Practice/Quiz/Challenge items
- Clicking an item opens the lesson view?"
*/

function getUnits() {
  const content = getCourseContent(__courseState.courseId, __courseState.courseTitle);
  return content.units || [];
}

function getUnitByIndex(uIndex) {
  const units = getUnits();
  return units[uIndex] || units[0];
}

function showUnitView(uIndex) {
  __courseState.activeUnit = Number(uIndex) || 0;
  __courseState.view = "unit";

  const unitView = document.getElementById("unitView");
  const lessonView = document.getElementById("lessonView");
  if (unitView) unitView.style.display = "block";
  if (lessonView) lessonView.style.display = "none";

  const unit = getUnitByIndex(__courseState.activeUnit);

  const unitTitleEl = document.getElementById("unitTitle");
  const unitAboutEl = document.getElementById("unitAbout");
  const unitSectionsEl = document.getElementById("unitSections");

  if (unitTitleEl) unitTitleEl.textContent = unit.title || "Unit";
  if (unitAboutEl) unitAboutEl.textContent = unit.about || "No unit description yet.";

  if (!unitSectionsEl) return;

  let html = "";

  (unit.sections || []).forEach(sec => {
    html += `
      <div class="net-card p-4 mb-3">
        <div class="fw-semibold mb-2">${escapeHtml(sec.title || "Section")}</div>
        <div class="d-grid gap-2">
    `;

    (sec.items || []).forEach(item => {
      const type = item.type || "Learn";
      const label = item.label || "Item";
      const q = item.questions ? `<span class="small text-muted">${item.questions} questions</span>` : "";

      const badge =
        type === "Learn" ? `<span class="badge text-bg-light border">Learn</span>` :
        type === "Practice" ? `<span class="badge bg-info text-dark">Practice</span>` :
        type === "Quiz" ? `<span class="badge bg-success">Quiz</span>` :
        `<span class="badge bg-teal text-white">Challenge</span>`;

      html += `
        <button class="btn btn-outline-secondary text-start d-flex justify-content-between align-items-center"
                type="button"
                onclick="openUnitItem(${Number(item.lesson_index || 1)})"
                aria-label="Open ${escapeHtml(type)}: ${escapeHtml(label)}">
          <span class="d-flex gap-2 align-items-center">
            ${badge}
            <span>${escapeHtml(label)}</span>
          </span>
          ${q}
        </button>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  unitSectionsEl.innerHTML = html;

  // ADDITION ONLY: keep sidebar dropdown open on this unit
  renderLessons(__courseState.totalLessons, __courseState.progressPct);
}

// When user clicks an item in the unit list, open the lesson view
function openUnitItem(lessonIndex) {
  __courseState.activeLesson = Number(lessonIndex) || 1;

  // ADDITION ONLY: keep activeUnit in sync for dropdown open state
  try {
    const f = getFlatLessonByIndex(__courseState.activeLesson);
    if (f) __courseState.activeUnit = Number(f.unitIndex || 0);
  } catch (e) {}

  __courseState.view = "lesson";
  renderCurrentLesson();
}

// ---------------------------
// NEW: Load completion status for sidebar badges
// ---------------------------
/*
AI PROMPTED CODE BELOW
"Can you write a small function that loads a user's completed lessons/quizzes/challenges
from /user-course-status so I can show badges beside each lesson in the sidebar?"
*/
async function loadCompletionStatus() {
  try {
    const res = await fetch(
      `${window.API_BASE}/user-course-status?email=${encodeURIComponent(__courseState.email)}&course_id=${__courseState.courseId}`
    );
    const data = await res.json();

    if (!data.success) return;

    __courseState.completed.lessons = new Set((data.lessons || []).map(Number));
    __courseState.completed.quizzes = new Set((data.quizzes || []).map(Number));
    __courseState.completed.challenges = new Set((data.challenges || []).map(Number));
  } catch (e) {
    console.error("loadCompletionStatus error:", e);
  }
}

// ---------------------------
// Load course details and user progress,
// Shows course title, description, lessons and user progress
// ---------------------------
async function loadCourse(courseId, email) {
  try {
    __courseState.courseId = courseId;
    __courseState.email = email;

    // Get course info from backend (still used for desc + total_lessons)
    const res = await fetch(`${window.API_BASE}/course?id=${courseId}`);
    const data = await res.json();

    if (!data.success) {
      showPopup("Course not found.", "error");
      return;
    }

    // Load structured content from course_content.js (Khan style)
    const content = getCourseContent(courseId, data.title);
    __courseState.courseTitle = content.title || data.title;

    // Flatten units/lessons to a single list of lesson numbers (lesson_number = flat index)
    __courseState.flatLessons = flattenLessons(content);

    // IMPORTANT: total lessons should be based on content if available
    __courseState.totalLessons = totalFlatLessons();

    // Display course title and description
    const titleEl = document.getElementById("courseTitle");
    if (titleEl) titleEl.textContent = __courseState.courseTitle;

    document.getElementById("courseDesc").textContent = data.description;

    // Get user's progress for this course
    const progressRes = await fetch(`${window.API_BASE}/user-courses?email=${encodeURIComponent(email)}`);
    const progressData = await progressRes.json();

    const course = (progressData.courses || []).find(c => c.id == courseId);
    const progressPct = course ? course.progress_pct : 0;

    __courseState.progressPct = progressPct;

    // NEW: Load completion status (lesson/quiz/challenge badges)
    await loadCompletionStatus();

    // Render lessons visually (NOW: Units + Lessons clickable + badges)
    renderLessons(__courseState.totalLessons, progressPct);

    // Update progress bar
    updateProgress(progressPct);

    // Decide which lesson to show in "Current Lesson" (next lesson after completed)
    const completedLessons = Math.floor((progressPct / 100) * __courseState.totalLessons);
    __courseState.activeLesson = Math.min(completedLessons + 1, __courseState.totalLessons);

    // ADDITION ONLY: keep activeUnit in sync (so dropdown opens correctly)
    try {
      const f = getFlatLessonByIndex(__courseState.activeLesson);
      if (f) __courseState.activeUnit = Number(f.unitIndex || 0);
    } catch (e) {}

    // NEW: Show Unit 1 page by default (Khan style landing)
    showUnitView(0);

    // NOTE: renderCurrentLesson is still available when user clicks lessons/items
    // Render Current Lesson (Learn + Quiz + Challenge)
    // renderCurrentLesson();

  } catch (err) {
    console.error("loadCourse error:", err);
    showPopup("Error loading course details.", "error");
  }
}

// ---------------------------
// AI Prompted Code Below:
// "Can you please write me a JavaScript function that shows all of the lessons completed in a course
// shows the list of lessons with completion status"
// UPDATED: now renders Units + Lessons like Khan (clickable)
// UPDATED (Badges): shows Done / Quiz / Chal based on backend status
// UPDATED (Unit Click): Unit headers are clickable and open Unit page
// ---------------------------
function renderLessons(totalLessons, progressPct) {
  const lessonsContainer = document.getElementById("lessonsList");

  if (!lessonsContainer) return;

  if (!totalLessons || totalLessons <= 0) {
    lessonsContainer.innerHTML = `<p class="text-muted small">No lessons available.</p>`;
    return;
  }

  // Build Unit/Lesson sidebar
  let html = "";
  let currentUnitTitle = null;

  (__courseState.flatLessons || []).forEach((item) => {
    const unitTitle = item.unitTitle || "Unit";

    // Unit header (UPDATED: clickable)
    if (unitTitle !== currentUnitTitle) {
      currentUnitTitle = unitTitle;
      html += `
        <button type="button"
          class="btn btn-sm w-100 text-start mb-1"
          style="border:1px solid var(--net-border); border-radius:12px;"
          onclick="showUnitView(${item.unitIndex})"
          aria-label="Open ${escapeHtml(unitTitle)}">
          <span class="small text-muted fw-semibold" style="letter-spacing:.2px;">
            ${escapeHtml(unitTitle)}
          </span>
        </button>
      `;
    }

    // Badges from backend completion status
    const doneBadge = __courseState.completed.lessons.has(item.index)
      ? `<span class="badge bg-teal text-white">Done</span>`
      : "";

    const quizBadge = __courseState.completed.quizzes.has(item.index)
      ? `<span class="badge bg-success">Quiz</span>`
      : "";

    const challengeBadge = __courseState.completed.challenges.has(item.index)
      ? `<span class="badge bg-info text-dark">Chal</span>`
      : "";

    const activeClass = item.index === __courseState.activeLesson ? "border border-teal" : "";

    html += `
      <button
        type="button"
        class="list-group-item list-group-item-action d-flex justify-content-between align-items-center ${activeClass}"
        style="border-radius:12px;margin-bottom:8px;"
        onclick="jumpToLesson(${item.index})"
        aria-label="Open lesson ${item.index}"
      >
        <span class="small">Lesson ${item.index}: ${escapeHtml(item.lesson.title || "Lesson")}</span>
        <span class="d-flex gap-1 align-items-center">
          ${doneBadge}
          ${quizBadge}
          ${challengeBadge}
        </span>
      </button>
    `;
  });

  lessonsContainer.innerHTML = `<div class="list-group">${html}</div>`;
}

// Called from sidebar buttons
function jumpToLesson(index) {
  __courseState.activeLesson = Number(index) || 1;

  // ADDITION ONLY: keep activeUnit in sync for dropdown open state
  try {
    const f = getFlatLessonByIndex(__courseState.activeLesson);
    if (f) __courseState.activeUnit = Number(f.unitIndex || 0);
  } catch (e) {}

  __courseState.view = "lesson";
  renderCurrentLesson();
}

// ---------------------------
// Completing a lesson and updating user progress and XP
// ---------------------------
async function completeLesson(courseId, email) {
  try {
    const res = await fetch(`${window.API_BASE}/complete-lesson`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },

      // Sends lesson_number so backend can prevent duplicate XP
      body: JSON.stringify({
        email,
        course_id: courseId,
        lesson_number: __courseState.activeLesson
      }),
    });

    const result = await res.json();

    if (result.success) {
      if (result.already_completed) {
        showPopup("Lesson already completed.", "info");
      } else {
        showPopup(`+${result.xp_added} XP earned!`, "success");

        // NEW: update local Done badge instantly
        __courseState.completed.lessons.add(__courseState.activeLesson);
      }

      __courseState.progressPct = result.progress_pct;
      updateProgress(result.progress_pct);

      // Re-render sidebar list with updated completion
      renderLessons(__courseState.totalLessons, result.progress_pct);

      // Move to next lesson after completion
      const completedLessons = Math.floor((result.progress_pct / 100) * __courseState.totalLessons);
      __courseState.activeLesson = Math.min(completedLessons + 1, __courseState.totalLessons);

      // ADDITION ONLY: keep activeUnit in sync for dropdown open state
      try {
        const f = getFlatLessonByIndex(__courseState.activeLesson);
        if (f) __courseState.activeUnit = Number(f.unitIndex || 0);
      } catch (e) {}

      renderCurrentLesson();
    } else {
      showPopup(result.message || "Could not complete lesson.", "error");
    }
  } catch (err) {
    console.error("completeLesson error:", err);
    showPopup("Server error completing lesson.", "error");
  }
}

// ---------------------------
// Update progress bar
// ---------------------------
function updateProgress(percent) {
  const bar = document.getElementById("progressBar");
  const txt = document.getElementById("progressText");

  if (bar) bar.style.width = `${percent}%`;
  if (txt) txt.textContent = `${percent}%`;
}

// ---------------------------
// Current Lesson (Learn + Quiz + Challenge) using real content
// ---------------------------
function changeLesson(delta) {
  let next = (__courseState.activeLesson || 1) + delta;
  if (next < 1) next = 1;
  if (next > (__courseState.totalLessons || 1)) next = __courseState.totalLessons;
  __courseState.activeLesson = next;

  // ADDITION ONLY: keep activeUnit in sync for dropdown open state
  try {
    const f = getFlatLessonByIndex(__courseState.activeLesson);
    if (f) __courseState.activeUnit = Number(f.unitIndex || 0);
  } catch (e) {}

  __courseState.view = "lesson";
  renderCurrentLesson();
}

function renderCurrentLesson() {
  // NEW: Toggle views (Unit view hidden, Lesson view shown)
  const unitView = document.getElementById("unitView");
  const lessonView = document.getElementById("lessonView");
  if (unitView) unitView.style.display = "none";
  if (lessonView) lessonView.style.display = "block";

  // Only render if the HTML exists
  const titleEl = document.getElementById("lessonTitle");
  const contentEl = document.getElementById("lessonContent");
  const indicatorEl = document.getElementById("lessonIndicator");
  if (!titleEl || !contentEl) return;

  const total = __courseState.totalLessons || 1;
  const lessonNum = __courseState.activeLesson || 1;

  // Update nav buttons
  const prevBtn = document.getElementById("prevLessonBtn");
  const nextBtn = document.getElementById("nextLessonBtn");
  if (prevBtn) prevBtn.disabled = lessonNum <= 1;
  if (nextBtn) nextBtn.disabled = lessonNum >= total;

  const flat = getFlatLessonByIndex(lessonNum);
  if (!flat) return;

  // ADDITION ONLY: keep activeUnit in sync for dropdown open state
  __courseState.activeUnit = Number(flat.unitIndex || 0);

  // Lesson title + indicator (Unit + Lesson like Khan)
  const unitTitle = flat.unitTitle || `Unit ${flat.unitIndex + 1}`;
  const lessonTitle = flat.lesson.title || `Lesson ${lessonNum}`;

  titleEl.textContent = `Lesson ${lessonNum}: ${lessonTitle}`;
  if (indicatorEl) indicatorEl.textContent = `${unitTitle} • Lesson ${lessonNum} of ${total}`;

  // Learn
  contentEl.textContent = flat.lesson.learn || "No lesson text.";

  // Quiz + challenge
  renderQuiz(flat.lesson.quiz);
  renderChallenge(flat.lesson.challenge);

  // Keep sidebar highlight (and badges)
  renderLessons(__courseState.totalLessons, __courseState.progressPct);
}

// ---------------------------
// Quiz (simple, 1 question) + XP award once
// ---------------------------
function quizKey() {
  const u = __courseState.email || "anon";
  const c = __courseState.courseId || "0";
  const l = __courseState.activeLesson || 1;
  return `netology_quiz:${u}:${c}:${l}`;
}

/*
AI PROMPTED CODE BELOW:
"Can you write a small JavaScript function that calls my backend route /complete-quiz
when the user answers a quiz correctly, and make sure it cannot award XP multiple times?"
*/
let __quizXpAwardedCache = {};

async function awardQuizXpOnce() {
  const key = quizKey();
  if (__quizXpAwardedCache[key]) return;
  __quizXpAwardedCache[key] = true;

  try {
    const res = await fetch(`${window.API_BASE}/complete-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: __courseState.email,
        course_id: __courseState.courseId,
        lesson_number: __courseState.activeLesson
      })
    });

    const data = await res.json();

    if (data.success && data.xp_added > 0) {
      showPopup(`+${data.xp_added} XP (Quiz)`, "success");

      // NEW: update local Quiz badge instantly
      __courseState.completed.quizzes.add(__courseState.activeLesson);
      renderLessons(__courseState.totalLessons, __courseState.progressPct);
    }
  } catch (e) {
    console.error("awardQuizXpOnce error:", e);
  }
}

function renderQuiz(quiz) {
  const quizBox = document.getElementById("quizBox");
  const quizFeedback = document.getElementById("quizFeedback");
  const quizScore = document.getElementById("quizScore");

  if (!quizBox || !quizFeedback || !quizScore) return;

  if (!quiz) {
    quizBox.innerHTML = `<div class="text-muted small">No quiz for this lesson.</div>`;
    quizFeedback.textContent = "";
    quizScore.textContent = "0/0";
    return;
  }

  const saved = JSON.parse(localStorage.getItem(quizKey()) || "{}");
  const chosen = saved.chosen;

  quizScore.textContent = chosen === undefined ? "0/1" : (chosen === quiz.answer ? "1/1" : "0/1");

  quizBox.innerHTML = "";
  quiz.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-outline-secondary text-start";
    btn.textContent = opt;

    if (chosen !== undefined) {
      if (idx === quiz.answer) btn.className = "btn btn-outline-success text-start";
      if (idx === chosen && chosen !== quiz.answer) btn.className = "btn btn-outline-danger text-start";
    }

    btn.addEventListener("click", () => {
      localStorage.setItem(quizKey(), JSON.stringify({ chosen: idx }));
      renderQuiz(quiz);
    });

    quizBox.appendChild(btn);
  });

  if (chosen === undefined) {
    quizFeedback.className = "small mt-2 text-muted";
    quizFeedback.textContent = quiz.question;
  } else if (chosen === quiz.answer) {
    quizFeedback.className = "small mt-2 text-success fw-semibold";
    quizFeedback.textContent = `Correct ✅ ${quiz.explain}`;

    // Award XP once when correct
    awardQuizXpOnce();
  } else {
    quizFeedback.className = "small mt-2 text-danger fw-semibold";
    quizFeedback.textContent = `Wrong ❌ ${quiz.explain}`;
  }
}

// ---------------------------
// Challenge (stores rules for sandbox validator)
// ---------------------------
function renderChallenge(challenge) {
  const challengeBox = document.getElementById("challengeBox");
  if (!challengeBox) return;

  if (!challenge) {
    challengeBox.innerHTML = `<div class="text-muted small">No challenge for this lesson.</div>`;
    return;
  }

  const list = (challenge.objectives || []).map(o => `<li>${escapeHtml(o)}</li>`).join("");
  challengeBox.innerHTML = `
    <div class="small">
      <div class="fw-semibold mb-1">${escapeHtml(challenge.title || "Challenge")}</div>
      <ul class="mb-0">${list}</ul>
    </div>
  `;
}

function openChallengeInSandbox(validateOnly) {
  const flat = getFlatLessonByIndex(__courseState.activeLesson);
  if (!flat || !flat.lesson || !flat.lesson.challenge) {
    showPopup("No challenge in this lesson.", "error");
    return;
  }

  // Store active challenge so sandbox can read it and validate
  localStorage.setItem("netology_active_challenge", JSON.stringify({
    courseId: __courseState.courseId,
    courseTitle: __courseState.courseTitle,
    lesson: __courseState.activeLesson,     // IMPORTANT: this is the backend lesson_number
    unitTitle: flat.unitTitle,
    lessonTitle: flat.lesson.title,
    challenge: flat.lesson.challenge
  }));

  // NEW (Part 3): also store a return target so sandbox can "Return to lesson"
  localStorage.setItem("netology_return_lesson", JSON.stringify({
    course_id: __courseState.courseId,
    lesson_number: __courseState.activeLesson
  }));

  // Sandbox checks ?challenge=1
  // NOTE: validateOnly is kept for future use (Part 3+), but routing stays the same right now.
  window.location.href = "sandbox.html?challenge=1";
}

// Small helper (prevents HTML injection)
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// ---------------------------
// Popup alerts (existing)
// ---------------------------
function showPopup(message, type = "info") {
  const old = document.getElementById("alertBox");
  if (old) old.remove();

  const popup = document.createElement("div");
  popup.id = "alertBox";
  popup.className =
    "alert text-center fw-semibold position-fixed top-0 start-50 translate-middle-x mt-4 shadow";
  popup.style.zIndex = "9999";
  popup.style.minWidth = "260px";
  popup.style.borderRadius = "6px";

  if (type === "success") popup.classList.add("alert-success");
  else if (type === "error") popup.classList.add("alert-danger");
  else popup.classList.add("alert-info");

  popup.textContent = message;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 2500);
}

/* =========================================================
   ADDITIONS ONLY (Accessibility + Readability):
   - Render sidebar as Unit dropdowns (<details>) so it’s less confusing
   - Keeps ALL existing renderLessons logic above untouched
   - Overrides renderLessons safely (same style you used elsewhere)
   ========================================================= */

/*
AI PROMPTED CODE BELOW:
"Can you make the sidebar less confusing by grouping lessons under each unit in a dropdown,
without deleting the existing function? Make it keyboard accessible and keep it simple."
*/
function __groupFlatLessonsByUnit() {
  const groups = [];
  const byUnit = {};
  (__courseState.flatLessons || []).forEach((x) => {
    const u = Number(x.unitIndex || 0);
    if (!byUnit[u]) {
      byUnit[u] = {
        unitIndex: u,
        unitTitle: x.unitTitle || `Unit ${u + 1}`,
        lessons: []
      };
      groups.push(byUnit[u]);
    }
    byUnit[u].lessons.push(x);
  });
  return groups;
}

function renderLessonsDropdown(totalLessons, progressPct) {
  const lessonsContainer = document.getElementById("lessonsList");
  if (!lessonsContainer) return;

  if (!totalLessons || totalLessons <= 0) {
    lessonsContainer.innerHTML = `<p class="text-muted small">No lessons available.</p>`;
    return;
  }

  // ADDITION ONLY: open dropdown based on current active lesson/unit
  let activeUnitFromLesson = 0;
  try {
    const f = getFlatLessonByIndex(__courseState.activeLesson);
    if (f) activeUnitFromLesson = Number(f.unitIndex || 0);
  } catch (e) {}

  const groups = __groupFlatLessonsByUnit();

  let html = "";
  groups.forEach((g) => {
    const isActiveUnit =
      Number(__courseState.activeUnit || 0) === Number(g.unitIndex || 0) ||
      Number(activeUnitFromLesson || 0) === Number(g.unitIndex || 0);

    html += `
      <details class="mb-2" ${isActiveUnit ? "open" : ""} style="border:1px solid var(--net-border); border-radius:14px; background:#fff;">
        <summary
          class="px-3 py-2"
          style="list-style:none; cursor:pointer; user-select:none; border-radius:14px;"
          aria-label="Toggle ${escapeHtml(g.unitTitle)} lessons"
        >
          <div class="d-flex justify-content-between align-items-center">
            <span class="fw-semibold small text-teal">${escapeHtml(g.unitTitle)}</span>
            <span class="small text-muted">▼</span>
          </div>
          <div class="small text-muted mt-1">
            ${g.lessons.length} lesson${g.lessons.length === 1 ? "" : "s"}
          </div>
        </summary>

        <div class="px-3 pb-3">
          <div class="d-grid gap-2 mt-2">
            <button type="button"
              class="btn btn-outline-secondary btn-sm text-start"
              onclick="showUnitView(${Number(g.unitIndex)})"
              aria-label="Open ${escapeHtml(g.unitTitle)} overview">
              Open unit overview →
            </button>
          </div>

          <div class="list-group mt-2" role="list">
    `;

    g.lessons.forEach((item) => {
      const doneBadge = __courseState.completed.lessons.has(item.index)
        ? `<span class="badge bg-teal text-white">Done</span>`
        : "";

      const quizBadge = __courseState.completed.quizzes.has(item.index)
        ? `<span class="badge bg-success">Quiz</span>`
        : "";

      const challengeBadge = __courseState.completed.challenges.has(item.index)
        ? `<span class="badge bg-info text-dark">Chal</span>`
        : "";

      const isActive = item.index === __courseState.activeLesson;
      const activeClass = isActive ? "border border-teal" : "";

      html += `
        <button
          type="button"
          class="list-group-item list-group-item-action d-flex justify-content-between align-items-center ${activeClass}"
          style="border-radius:12px;margin-bottom:8px;"
          onclick="jumpToLesson(${item.index})"
          aria-label="Open lesson ${item.index}: ${escapeHtml(item.lesson.title || "Lesson")}"
        >
          <span class="small">
            Lesson ${item.index}: ${escapeHtml(item.lesson.title || "Lesson")}
          </span>
          <span class="d-flex gap-1 align-items-center">
            ${doneBadge}
            ${quizBadge}
            ${challengeBadge}
          </span>
        </button>
      `;
    });

    html += `
          </div>
        </div>
      </details>
    `;
  });

  lessonsContainer.innerHTML = html;
}

/*
UPDATED (Override safely):
- Keep original renderLessons above 100% intact
- Replace its output with the dropdown version for readability
*/
renderLessons = function(totalLessons, progressPct) {
  return renderLessonsDropdown(totalLessons, progressPct);
};
