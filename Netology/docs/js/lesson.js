/**
 * lesson.js – Netology Interactive Lesson Engine (Complete Rebuild)
 *
 * Student Number: C22320301 | Jamie O'Neill | TU857/4 | 18/02/2026
 *
 * A Duolingo-inspired step-based lesson system with:
 * - Multiple exercise types (MCQ, drag-drop, fill-blank, matching, tap-word, flashcard)
 * - Streak & XP system with animations
 * - Progress tracking & completion reporting
 * - Mobile-first touch support
 * - Keyboard navigation & accessibility
 */

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
// Resolve API base lazily so it always picks up the value set by config.js
function getLessonAPI() {
  return (window.API_BASE || "").replace(/\/$/, "");
}
// Keep backward compat for any internal usage of LESSON_API
const LESSON_API = "";  // deprecated – use getLessonAPI() instead

function getCourseContentMap() {
  if (typeof window !== "undefined" && window.COURSE_CONTENT) return window.COURSE_CONTENT;
  if (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) return COURSE_CONTENT;
  return {};
}

function getCurrentUser() {
  try {
    const s = localStorage.getItem("netology_user") || localStorage.getItem("user");
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function resolveCourseContent(courseId, contentId) {
  const c = getCourseContentMap();
  if (contentId && c[String(contentId)]) return c[String(contentId)];
  if (courseId && c[String(courseId)]) return c[String(courseId)];
  return null;
}

function getLessonByNumber(course, num) {
  if (!course?.units) return null;
  let idx = 0;
  for (const unit of course.units) {
    if (!Array.isArray(unit.lessons)) continue;
    for (const lesson of unit.lessons) {
      idx++;
      if (idx === Number(num)) return { ...lesson, unit_title: unit.title || "Module" };
    }
  }
  return null;
}

/**
 * Finds the XP value shown on the course page for the nth lesson.
 * Each "Learn" type item in sections corresponds to a lesson in order.
 */
function getLessonItemXP(course, lessonNumber) {
  if (!course?.units) return null;
  let idx = 0;
  for (const unit of course.units) {
    for (const section of (unit.sections || [])) {
      for (const item of (section.items || [])) {
        if (String(item.type || "").toLowerCase() === "learn") {
          idx++;
          if (idx === Number(lessonNumber)) return Number(item.xp) || null;
        }
      }
    }
  }
  return null;
}

function getTotalLessons(course) {
  if (!course?.units) return 0;
  let n = 0;
  for (const u of course.units) n += (u.lessons?.length || 0);
  return n;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

const PROGRESS_SOFT_PCT = 40;
/* NOTE: ENDPOINTS is declared globally by config.js via window.ENDPOINTS.
   We reference it directly to avoid duplicate-declaration errors. */
var ENDPOINTS = window.ENDPOINTS || {};

function lessonProgressKey(email, courseId, lessonNumber) {
  if (!courseId || !lessonNumber) return null;
  const who = email || "guest";
  return `netology_lesson_progress:${who}:${courseId}:${lessonNumber}`;
}

function safeParseJson(raw, fallback = null) {
  if (typeof parseJsonSafe === "function") return parseJsonSafe(raw, fallback);
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function readLessonProgress(email, courseId, lessonNumber) {
  const key = lessonProgressKey(email, courseId, lessonNumber);
  if (!key) return null;
  const data = safeParseJson(localStorage.getItem(key), null);
  return data && typeof data === "object" ? data : null;
}

function writeLessonProgress(email, courseId, lessonNumber, payload) {
  const key = lessonProgressKey(email, courseId, lessonNumber);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(payload));
}

function computeProgressXP(totalXP, pct) {
  const xp = Math.max(0, Number(totalXP) || 0);
  const p = clamp(Number(pct) || 0, 0, 100);
  return Math.min(xp, Math.floor((xp * p) / 100));
}

async function awardLessonXP(email, courseId, lessonNumber, targetXP, deltaXP) {
  const base = getLessonAPI();
  if (!email || !base || !deltaXP) return { success: false, xp_added: 0 };
  const path = ENDPOINTS.auth?.awardXp || "/award-xp";
  const action = `lesson-progress:${courseId}:${lessonNumber}:${targetXP}`;
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, action, xp: Number(deltaXP || 0) })
    });
    const data = await res.json().catch(() => ({}));
    if (data && typeof data.success !== "undefined") return data;
  } catch {}
  return { success: false, xp_added: 0 };
}

/* ═══════════════════════════════════════════════════════════
   STEP BUILDER – converts lesson blocks into exercise steps
   ═══════════════════════════════════════════════════════════ */

/**
 * Converts an objective like "Explain why protocols matter"
 * into a proper question like "Why do protocols matter?"
 */
function objectiveToQuestion(objective) {
  const clean = String(objective || "").trim().replace(/\.$/, "");
  const verbMap = {
    define:      (r) => `What is ${r}?`,
    explain:     (r) => `Why/how does ${r} work?`,
    identify:    (r) => `What are ${r}?`,
    describe:    (r) => `How would you describe ${r}?`,
    list:        (r) => `What are the ${r}?`,
    compare:     (r) => `How do ${r} compare?`,
    understand:  (r) => `What should you understand about ${r}?`,
    demonstrate: (r) => `How would you demonstrate ${r}?`,
    apply:       (r) => `When would you apply ${r}?`,
    recognise:   (r) => `How would you recognise ${r}?`,
    recognize:   (r) => `How would you recognize ${r}?`,
    name:        (r) => `Can you name ${r}?`,
    outline:     (r) => `What does ${r} involve?`,
    summarise:   (r) => `How would you summarise ${r}?`,
    summarize:   (r) => `How would you summarize ${r}?`,
  };
  const match = clean.match(/^(\w+)\s+(.+)$/i);
  if (match) {
    const verb = match[1].toLowerCase();
    const rest = match[2];
    if (verbMap[verb]) return verbMap[verb](rest);
  }
  return clean.endsWith("?") ? clean : `${clean}?`;
}

function buildStepsFromLesson(lesson, course) {
  const steps = [];

  // 1. Learn steps from text blocks
  if (Array.isArray(lesson.blocks)) {
    lesson.blocks.forEach((block) => {
      if (block.type === "text") {
        const lines = Array.isArray(block.text) ? block.text : [block.text || ""];
        // Group text into digestible chunks of 3-4 lines
        for (let i = 0; i < lines.length; i += 3) {
          const chunk = lines.slice(i, i + 3).filter(Boolean);
          if (chunk.length) {
            steps.push({
              type: "learn",
              title: block.title || lesson.title || "Learn",
              content: chunk,
              icon: "bi-book"
            });
          }
        }
      }

      if (block.type === "explain") {
        const lines = Array.isArray(block.content) ? block.content : [block.content || ""];
        steps.push({
          type: "learn",
          title: block.title || "Key Concept",
          content: lines.filter(Boolean),
          icon: "bi-lightbulb",
          style: "callout"
        });
      }

      if (block.type === "check") {
        steps.push({
          type: "mcq",
          question: block.question || "Quick check",
          options: block.options || [],
          correctIndex: block.correctIndex ?? 0,
          explanation: block.explanation || "",
          xp: 10
        });
      }

      if (block.type === "activity") {
        if (block.mode === "drag" && Array.isArray(block.targets) && Array.isArray(block.items)) {
          steps.push({
            type: "matching",
            title: block.title || "Match the pairs",
            prompt: block.prompt || "Match each item to the correct category.",
            pairs: block.items.map(item => ({
              term: item.label,
              match: (block.targets.find(t => t.id === item.targetId) || {}).label || item.targetId
            })),
            xp: 15
          });
        } else if (block.mode === "select") {
          steps.push({
            type: "mcq",
            question: block.prompt || block.title || "Choose the correct answer",
            options: block.options || [],
            correctIndex: block.correctIndex ?? 0,
            explanation: block.explanation || "",
            xp: 10
          });
        } else if (Array.isArray(block.steps)) {
          steps.push({
            type: "learn",
            title: block.title || "Activity",
            content: block.steps,
            icon: "bi-tools",
            style: "steps"
          });
        }
      }
    });
  }

  // 2. Generate additional exercises from lesson content for engagement
  if (Array.isArray(lesson.content) && lesson.content.length >= 4) {
    // Fill-in-the-blank from key sentences
    const candidates = lesson.content.filter(s => s.length > 30 && s.length < 120);
    if (candidates.length >= 1) {
      const sentence = candidates[Math.floor(Math.random() * candidates.length)];
      const words = sentence.split(/\s+/).filter(w => w.length > 4);
      if (words.length >= 1) {
        const blankWord = words[Math.floor(Math.random() * words.length)];
        const cleanWord = blankWord.replace(/[.,;:!?()]/g, "");
        const blanked = sentence.replace(blankWord, "___");
        // Generate distractors
        const allWords = lesson.content.join(" ").split(/\s+/).filter(w => w.length > 3);
        const unique = [...new Set(allWords.map(w => w.replace(/[.,;:!?()]/g, "")))].filter(w => w.toLowerCase() !== cleanWord.toLowerCase());
        const distractors = shuffleArray(unique).slice(0, 3);
        if (distractors.length >= 2) {
          steps.push({
            type: "fill_blank",
            sentence: blanked,
            answer: cleanWord,
            options: shuffleArray([cleanWord, ...distractors.slice(0, 3)]),
            xp: 10
          });
        }
      }
    }
  }

  // 3. Tap-the-word exercise from objectives
  if (Array.isArray(lesson.objectives) && lesson.objectives.length >= 2) {
    const obj = lesson.objectives[Math.floor(Math.random() * lesson.objectives.length)];
    const words = obj.split(/\s+/);
    if (words.length >= 3) {
      const keyWord = words.filter(w => w.length > 3)[0] || words[1];
      const cleanKey = keyWord.replace(/[.,;:!?()]/g, "");
      const allContent = (lesson.content || []).join(" ").split(/\s+/);
      const others = [...new Set(allContent.map(w => w.replace(/[.,;:!?()]/g, "")).filter(w => w.length > 3 && w.toLowerCase() !== cleanKey.toLowerCase()))];
      if (others.length >= 5) {
        steps.push({
          type: "tap_word",
          question: `Which word relates to: "${obj}"?`,
          words: shuffleArray([cleanKey, ...shuffleArray(others).slice(0, 7)]),
          correctWord: cleanKey,
          xp: 10
        });
      }
    }
  }

  // 4. Flashcard from lesson summary + objectives
  if (lesson.summary && Array.isArray(lesson.objectives) && lesson.objectives.length >= 2) {
    steps.push({
      type: "flashcard",
      cards: [
        { front: "What is the main takeaway?", back: lesson.summary },
        ...lesson.objectives.slice(0, 3).map((obj) => ({
          front: objectiveToQuestion(obj),
          back: obj
        }))
      ]
    });
  }

  // 5. Drag-and-drop word order if we have a summary
  if (lesson.summary && lesson.summary.split(/\s+/).length >= 4 && lesson.summary.split(/\s+/).length <= 14) {
    const words = lesson.summary.split(/\s+/);
    steps.push({
      type: "drag_order",
      instruction: "Arrange these words to form the correct statement:",
      words: words,
      correctOrder: words,
      xp: 15
    });
  }

  // If no interactive steps were generated, ensure at least a quiz from the lesson quiz
  if (steps.filter(s => s.type !== "learn" && s.type !== "flashcard").length === 0) {
    steps.push({
      type: "mcq",
      question: `What is the main topic of "${lesson.title}"?`,
      options: [lesson.summary || "The core concept", "An unrelated idea", "None of the above", "All options are wrong"],
      correctIndex: 0,
      explanation: lesson.summary || "Review the lesson content for more details.",
      xp: 10
    });
  }

  return steps;
}


/* ═══════════════════════════════════════════════════════════
   EXERCISE RENDERERS
   ═══════════════════════════════════════════════════════════ */

/**
 * Renders a learning/content step
 */
function renderLearnStep(step) {
  const el = document.createElement("div");
  el.className = "les-step les-step-learn";

  const header = document.createElement("div");
  header.className = "les-step-header";
  header.innerHTML = `
    <div class="les-step-icon les-step-icon--learn"><i class="bi ${step.icon || 'bi-book'}"></i></div>
    <h2 class="les-step-title">${escHtml(step.title)}</h2>
  `;
  el.appendChild(header);

  const body = document.createElement("div");
  body.className = step.style === "callout" ? "les-learn-body les-learn-callout" : step.style === "steps" ? "les-learn-body les-learn-steps" : "les-learn-body";

  if (step.style === "steps" && Array.isArray(step.content)) {
    const ol = document.createElement("ol");
    ol.className = "les-learn-ol";
    step.content.forEach(line => {
      const li = document.createElement("li");
      li.textContent = line;
      ol.appendChild(li);
    });
    body.appendChild(ol);
  } else {
    const lines = Array.isArray(step.content) ? step.content : [step.content || ""];
    lines.forEach(line => {
      const p = document.createElement("p");
      p.className = "les-learn-text";
      p.textContent = line;
      body.appendChild(p);
    });
  }

  el.appendChild(body);
  return { el, type: "learn" };
}

/**
 * Renders a Multiple Choice Question
 */
function renderMCQ(step) {
  const el = document.createElement("div");
  el.className = "les-step les-step-mcq";
  let selectedIndex = -1;

  el.innerHTML = `
    <div class="les-step-header">
      <div class="les-step-icon les-step-icon--mcq"><i class="bi bi-patch-question"></i></div>
      <h2 class="les-step-prompt">${escHtml(step.question)}</h2>
    </div>
    <div class="les-mcq-options" role="radiogroup" aria-label="Answer options"></div>
  `;

  const optionsContainer = el.querySelector(".les-mcq-options");
  const letters = ["A", "B", "C", "D", "E", "F"];

  step.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "les-mcq-option";
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", "false");
    btn.setAttribute("tabindex", "0");
    btn.innerHTML = `
      <span class="les-mcq-letter">${letters[i] || String(i + 1)}</span>
      <span class="les-mcq-text">${escHtml(opt)}</span>
      <span class="les-mcq-check"><i class="bi bi-check-lg"></i></span>
    `;

    btn.addEventListener("click", () => {
      optionsContainer.querySelectorAll(".les-mcq-option").forEach(o => {
        o.classList.remove("is-selected");
        o.setAttribute("aria-checked", "false");
      });
      btn.classList.add("is-selected");
      btn.setAttribute("aria-checked", "true");
      selectedIndex = i;
      document.getElementById("lesCheckBtn").disabled = false;
    });

    optionsContainer.appendChild(btn);
  });

  return {
    el,
    type: "mcq",
    check() {
      const correct = selectedIndex === step.correctIndex;
      const options = optionsContainer.querySelectorAll(".les-mcq-option");
      options.forEach((o, i) => {
        o.classList.remove("is-selected");
        if (i === step.correctIndex) o.classList.add("is-correct");
        if (i === selectedIndex && !correct) o.classList.add("is-wrong");
        o.style.pointerEvents = "none";
      });
      return {
        correct,
        explanation: step.explanation,
        xp: correct ? (step.xp || 10) : 0
      };
    }
  };
}

/**
 * Renders a Fill-in-the-Blank exercise
 */
function renderFillBlank(step) {
  const el = document.createElement("div");
  el.className = "les-step les-step-fill";
  let selectedWord = null;

  // Build sentence with blank
  const parts = step.sentence.split("___");
  el.innerHTML = `
    <div class="les-step-header">
      <div class="les-step-icon les-step-icon--fill"><i class="bi bi-pencil-square"></i></div>
      <h2 class="les-step-prompt">Complete the sentence</h2>
    </div>
    <div class="les-fill-sentence">
      <span class="les-fill-before">${escHtml(parts[0] || "")}</span>
      <span class="les-fill-blank" id="fillBlankSlot" aria-label="blank to fill">
        <span class="les-fill-placeholder">tap a word</span>
      </span>
      <span class="les-fill-after">${escHtml(parts[1] || "")}</span>
    </div>
    <div class="les-fill-options" role="listbox" aria-label="Word choices"></div>
  `;

  const blankSlot = el.querySelector("#fillBlankSlot");
  const optionsWrap = el.querySelector(".les-fill-options");

  step.options.forEach(word => {
    const chip = document.createElement("button");
    chip.className = "les-fill-chip";
    chip.textContent = word;
    chip.setAttribute("role", "option");

    chip.addEventListener("click", () => {
      // Deselect previous
      optionsWrap.querySelectorAll(".les-fill-chip").forEach(c => c.classList.remove("is-selected"));
      chip.classList.add("is-selected");
      selectedWord = word;
      blankSlot.innerHTML = `<span class="les-fill-chosen">${escHtml(word)}</span>`;
      blankSlot.classList.add("is-filled");
      document.getElementById("lesCheckBtn").disabled = false;
    });

    optionsWrap.appendChild(chip);
  });

  return {
    el,
    type: "fill_blank",
    check() {
      const correct = selectedWord && selectedWord.toLowerCase() === step.answer.toLowerCase();
      blankSlot.classList.add(correct ? "is-correct" : "is-wrong");
      optionsWrap.querySelectorAll(".les-fill-chip").forEach(c => {
        c.style.pointerEvents = "none";
        if (c.textContent.toLowerCase() === step.answer.toLowerCase()) c.classList.add("is-answer");
      });
      return {
        correct,
        explanation: correct ? "That's right!" : `The correct answer is: ${step.answer}`,
        xp: correct ? (step.xp || 10) : 0
      };
    }
  };
}

/**
 * Renders Matching Pairs exercise
 */
function renderMatching(step) {
  const el = document.createElement("div");
  el.className = "les-step les-step-matching";

  const pairs = step.pairs || [];
  let selectedTerm = null;
  let selectedMatch = null;
  const matched = new Set();
  let totalPairs = pairs.length;

  el.innerHTML = `
    <div class="les-step-header">
      <div class="les-step-icon les-step-icon--matching"><i class="bi bi-link-45deg"></i></div>
      <h2 class="les-step-prompt">${escHtml(step.prompt || step.title || "Match the pairs")}</h2>
    </div>
    <div class="les-matching-board">
      <div class="les-matching-col les-matching-terms"></div>
      <div class="les-matching-col les-matching-matches"></div>
    </div>
    <div class="les-matching-status"></div>
  `;

  const termsCol = el.querySelector(".les-matching-terms");
  const matchesCol = el.querySelector(".les-matching-matches");
  const statusEl = el.querySelector(".les-matching-status");

  const shuffledTerms = shuffleArray(pairs.map(p => p.term));
  const shuffledMatches = shuffleArray(pairs.map(p => p.match));

  const colors = ["#0d9488", "#06b6d4", "#f97316", "#8b5cf6", "#ec4899", "#22c55e"];

  function tryMatch() {
    if (!selectedTerm || !selectedMatch) return;
    const pair = pairs.find(p => p.term === selectedTerm);
    const correct = pair && pair.match === selectedMatch;

    const termBtn = termsCol.querySelector(`[data-term="${CSS.escape(selectedTerm)}"]`);
    const matchBtn = matchesCol.querySelector(`[data-match="${CSS.escape(selectedMatch)}"]`);

    if (correct) {
      const color = colors[matched.size % colors.length];
      matched.add(selectedTerm);
      termBtn.classList.add("is-matched");
      matchBtn.classList.add("is-matched");
      termBtn.style.borderColor = color;
      matchBtn.style.borderColor = color;
      termBtn.style.backgroundColor = color + "18";
      matchBtn.style.backgroundColor = color + "18";
      termBtn.style.pointerEvents = "none";
      matchBtn.style.pointerEvents = "none";

      statusEl.textContent = `${matched.size} of ${totalPairs} matched`;

      if (matched.size === totalPairs) {
        document.getElementById("lesCheckBtn").disabled = false;
      }
    } else {
      termBtn.classList.add("is-wrong-flash");
      matchBtn.classList.add("is-wrong-flash");
      setTimeout(() => {
        termBtn.classList.remove("is-wrong-flash", "is-selected");
        matchBtn.classList.remove("is-wrong-flash", "is-selected");
      }, 600);
    }

    selectedTerm = null;
    selectedMatch = null;
    termsCol.querySelectorAll(".les-matching-btn").forEach(b => {
      if (!b.classList.contains("is-matched")) b.classList.remove("is-selected");
    });
    matchesCol.querySelectorAll(".les-matching-btn").forEach(b => {
      if (!b.classList.contains("is-matched")) b.classList.remove("is-selected");
    });
  }

  shuffledTerms.forEach(term => {
    const btn = document.createElement("button");
    btn.className = "les-matching-btn les-matching-term-btn";
    btn.textContent = term;
    btn.dataset.term = term;
    btn.addEventListener("click", () => {
      if (btn.classList.contains("is-matched")) return;
      termsCol.querySelectorAll(".les-matching-btn").forEach(b => {
        if (!b.classList.contains("is-matched")) b.classList.remove("is-selected");
      });
      btn.classList.add("is-selected");
      selectedTerm = term;
      tryMatch();
    });
    termsCol.appendChild(btn);
  });

  shuffledMatches.forEach(match => {
    const btn = document.createElement("button");
    btn.className = "les-matching-btn les-matching-match-btn";
    btn.textContent = match;
    btn.dataset.match = match;
    btn.addEventListener("click", () => {
      if (btn.classList.contains("is-matched")) return;
      matchesCol.querySelectorAll(".les-matching-btn").forEach(b => {
        if (!b.classList.contains("is-matched")) b.classList.remove("is-selected");
      });
      btn.classList.add("is-selected");
      selectedMatch = match;
      tryMatch();
    });
    matchesCol.appendChild(btn);
  });

  statusEl.textContent = `0 of ${totalPairs} matched`;

  return {
    el,
    type: "matching",
    check() {
      const correct = matched.size === totalPairs;
      return {
        correct,
        explanation: correct ? "All pairs matched correctly!" : `You matched ${matched.size} of ${totalPairs}.`,
        xp: correct ? (step.xp || 15) : Math.floor((matched.size / totalPairs) * (step.xp || 15))
      };
    }
  };
}

/**
 * Renders Tap-the-Correct-Word exercise
 */
function renderTapWord(step) {
  const el = document.createElement("div");
  el.className = "les-step les-step-tap";
  let tappedWord = null;

  el.innerHTML = `
    <div class="les-step-header">
      <div class="les-step-icon les-step-icon--tap"><i class="bi bi-hand-index"></i></div>
      <h2 class="les-step-prompt">${escHtml(step.question)}</h2>
    </div>
    <div class="les-tap-words" role="listbox" aria-label="Word choices"></div>
  `;

  const wordsWrap = el.querySelector(".les-tap-words");

  step.words.forEach(word => {
    const chip = document.createElement("button");
    chip.className = "les-tap-chip";
    chip.textContent = word;
    chip.setAttribute("role", "option");

    chip.addEventListener("click", () => {
      wordsWrap.querySelectorAll(".les-tap-chip").forEach(c => c.classList.remove("is-selected"));
      chip.classList.add("is-selected");
      tappedWord = word;
      document.getElementById("lesCheckBtn").disabled = false;
    });

    wordsWrap.appendChild(chip);
  });

  return {
    el,
    type: "tap_word",
    check() {
      const correct = tappedWord && tappedWord.toLowerCase() === step.correctWord.toLowerCase();
      wordsWrap.querySelectorAll(".les-tap-chip").forEach(c => {
        c.style.pointerEvents = "none";
        if (c.textContent.toLowerCase() === step.correctWord.toLowerCase()) c.classList.add("is-correct");
        if (c.classList.contains("is-selected") && !correct) c.classList.add("is-wrong");
      });
      return {
        correct,
        explanation: correct ? "You picked the right word!" : `The correct word was: ${step.correctWord}`,
        xp: correct ? (step.xp || 10) : 0
      };
    }
  };
}

/**
 * Renders Flashcard step
 */
function renderFlashcard(step) {
  const el = document.createElement("div");
  el.className = "les-step les-step-flashcard";

  const cards = step.cards || [];
  let currentCard = 0;

  el.innerHTML = `
    <div class="les-step-header">
      <div class="les-step-icon les-step-icon--flash"><i class="bi bi-card-text"></i></div>
      <h2 class="les-step-prompt">Review these key concepts</h2>
      <div class="les-flash-counter"><span id="flashCurrent">1</span> / ${cards.length}</div>
    </div>
    <div class="les-flash-card-wrap">
      <div class="les-flash-card" id="lesFlashCard" tabindex="0" role="button" aria-label="Click to flip card">
        <div class="les-flash-front">
          <div class="les-flash-label">Question</div>
          <div class="les-flash-text" id="lesFlashFront"></div>
          <div class="les-flash-hint">Tap to reveal</div>
        </div>
        <div class="les-flash-back">
          <div class="les-flash-label">Answer</div>
          <div class="les-flash-text" id="lesFlashBack"></div>
        </div>
      </div>
    </div>
    <div class="les-flash-nav">
      <button class="les-btn les-btn-ghost les-btn-sm" id="flashPrev" disabled><i class="bi bi-chevron-left"></i> Prev</button>
      <button class="les-btn les-btn-primary les-btn-sm" id="flashNext">${cards.length > 1 ? "Next <i class='bi bi-chevron-right'></i>" : "Done <i class='bi bi-check-lg'></i>"}</button>
    </div>
  `;

  const cardEl = el.querySelector("#lesFlashCard");
  const frontEl = el.querySelector("#lesFlashFront");
  const backEl = el.querySelector("#lesFlashBack");
  const counterEl = el.querySelector("#flashCurrent");
  const prevBtn = el.querySelector("#flashPrev");
  const nextBtn = el.querySelector("#flashNext");

  function showCard(idx) {
    currentCard = idx;
    cardEl.classList.remove("is-flipped");
    frontEl.textContent = cards[idx].front;
    backEl.textContent = cards[idx].back;
    counterEl.textContent = String(idx + 1);
    prevBtn.disabled = idx === 0;
    if (idx === cards.length - 1) {
      nextBtn.innerHTML = "Done <i class='bi bi-check-lg'></i>";
    } else {
      nextBtn.innerHTML = "Next <i class='bi bi-chevron-right'></i>";
    }
  }

  cardEl.addEventListener("click", () => cardEl.classList.toggle("is-flipped"));
  cardEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cardEl.classList.toggle("is-flipped"); }
  });

  prevBtn.addEventListener("click", () => { if (currentCard > 0) showCard(currentCard - 1); });
  nextBtn.addEventListener("click", () => {
    if (currentCard < cards.length - 1) {
      showCard(currentCard + 1);
    } else {
      document.getElementById("lesCheckBtn").disabled = false;
      document.getElementById("lesCheckBtn").textContent = "Continue";
    }
  });

  if (cards.length) showCard(0);

  return {
    el,
    type: "flashcard",
    check() {
      return { correct: true, explanation: "Great review!", xp: 5 };
    }
  };
}

/**
 * Renders Drag-and-Drop Word Order exercise
 */
function renderDragOrder(step) {
  const el = document.createElement("div");
  el.className = "les-step les-step-dragorder";

  const shuffled = shuffleArray(step.words);
  const placed = [];

  el.innerHTML = `
    <div class="les-step-header">
      <div class="les-step-icon les-step-icon--drag"><i class="bi bi-arrows-move"></i></div>
      <h2 class="les-step-prompt">${escHtml(step.instruction)}</h2>
    </div>
    <div class="les-drag-dropzone" id="lesDragDropzone" aria-label="Drop words here in order"></div>
    <div class="les-drag-wordbank" id="lesDragWordbank"></div>
  `;

  const dropzone = el.querySelector("#lesDragDropzone");
  const wordbank = el.querySelector("#lesDragWordbank");

  function updateCheckBtn() {
    const allPlaced = wordbank.querySelectorAll(".les-drag-chip").length === 0;
    document.getElementById("lesCheckBtn").disabled = !allPlaced;
  }

  function createChip(word, inDropzone) {
    const chip = document.createElement("button");
    chip.className = "les-drag-chip";
    chip.textContent = word;
    chip.draggable = true;
    chip.dataset.word = word;

    // Click to move between zones
    chip.addEventListener("click", () => {
      if (inDropzone) {
        chip.remove();
        wordbank.appendChild(createChip(word, false));
      } else {
        chip.remove();
        dropzone.appendChild(createChip(word, true));
      }
      updateCheckBtn();
    });

    // Drag support
    chip.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", word);
      e.dataTransfer.effectAllowed = "move";
      chip.classList.add("is-dragging");
      setTimeout(() => chip.style.opacity = "0.4", 0);
    });

    chip.addEventListener("dragend", () => {
      chip.style.opacity = "";
      chip.classList.remove("is-dragging");
    });

    return chip;
  }

  // Drop zone handlers
  dropzone.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; dropzone.classList.add("is-dragover"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("is-dragover");
    const word = e.dataTransfer.getData("text/plain");
    // Remove from wordbank
    const existing = wordbank.querySelector(`[data-word="${CSS.escape(word)}"]`);
    if (existing) existing.remove();
    // Check if already in dropzone
    const alreadyThere = dropzone.querySelector(`[data-word="${CSS.escape(word)}"]`);
    if (!alreadyThere) dropzone.appendChild(createChip(word, true));
    updateCheckBtn();
  });

  wordbank.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; });
  wordbank.addEventListener("drop", (e) => {
    e.preventDefault();
    const word = e.dataTransfer.getData("text/plain");
    const existing = dropzone.querySelector(`[data-word="${CSS.escape(word)}"]`);
    if (existing) existing.remove();
    const alreadyThere = wordbank.querySelector(`[data-word="${CSS.escape(word)}"]`);
    if (!alreadyThere) wordbank.appendChild(createChip(word, false));
    updateCheckBtn();
  });

  // Populate word bank
  shuffled.forEach(word => wordbank.appendChild(createChip(word, false)));

  // Placeholder text
  const placeholder = document.createElement("div");
  placeholder.className = "les-drag-placeholder";
  placeholder.textContent = "Tap or drag words here in order";
  dropzone.appendChild(placeholder);

  // Remove placeholder when first word is added
  const observer = new MutationObserver(() => {
    const chips = dropzone.querySelectorAll(".les-drag-chip");
    if (chips.length > 0) {
      const ph = dropzone.querySelector(".les-drag-placeholder");
      if (ph) ph.remove();
    } else if (!dropzone.querySelector(".les-drag-placeholder")) {
      dropzone.appendChild(placeholder);
    }
  });
  observer.observe(dropzone, { childList: true });

  return {
    el,
    type: "drag_order",
    check() {
      const chips = dropzone.querySelectorAll(".les-drag-chip");
      const userOrder = Array.from(chips).map(c => c.dataset.word);
      const correctOrder = step.correctOrder;
      const correct = JSON.stringify(userOrder) === JSON.stringify(correctOrder);

      chips.forEach((c, i) => {
        if (i < correctOrder.length && c.dataset.word === correctOrder[i]) {
          c.classList.add("is-correct");
        } else {
          c.classList.add("is-wrong");
        }
        c.style.pointerEvents = "none";
      });

      return {
        correct,
        explanation: correct ? "Perfect order!" : `The correct order is: "${correctOrder.join(" ")}"`,
        xp: correct ? (step.xp || 15) : 0
      };
    }
  };
}


/* ═══════════════════════════════════════════════════════════
   LESSON ENGINE – Main controller
   ═══════════════════════════════════════════════════════════ */
class LessonEngine {
  constructor() {
    this.courseId = null;
    this.lessonNumber = null;
    this.contentId = null;
    this.course = null;
    this.lesson = null;
    this.steps = [];
    this.currentStepIndex = -1;
    this.currentRenderer = null;
    this.progressTotalSteps = 0;
    this.progressCompletedSteps = 0;
    this.progressPct = 0;
    this.progressXP = 0;
    this.lessonXP = 0;
    this.resumeStepIndex = 0;
    this.hasSavedProgress = false;
    this.isReviewMode = false;
    this.userEmail = null;

    // Stats
    this.xpEarned = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.correctCount = 0;
    this.totalChecked = 0;
    this.startTime = null;
    this.stepResults = [];

    // Elements
    this.els = {};
    this.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.parseURL();
    this.loadLesson();
  }

  cacheElements() {
    const ids = [
      "lesLoadingScreen", "lesIntroScreen", "lesStepScreen", "lesCompleteScreen",
      "lesProgressFill", "lesStreakCount", "lesXpCount", "lesStreakPill", "lesXpPill",
      "lesIntroBadge", "lesIntroKicker", "lesIntroTitle", "lesIntroDesc",
      "lesIntroTime", "lesIntroXP", "lesIntroSteps", "lesIntroObjectives",
      "lesResumeHint", "lesStartBtn", "lesStepContainer", "lesStepFooter",
      "lesCheckBtn", "lesSkipBtn", "lesStepHint", "lesHintText",
      "lesFeedbackOverlay", "lesFeedbackCard", "lesFeedbackIcon",
      "lesFeedbackTitle", "lesFeedbackText", "lesFeedbackXP", "lesFeedbackXPAmount",
      "lesFeedbackContinue",
      "lesCompleteSubtitle", "lesCompleteXP", "lesCompleteAccuracy",
      "lesCompleteStreak", "lesCompleteTime", "lesCompleteReview",
      "lesNextLessonBtn", "lesReviewBtn", "lesBackToCourseBtn",
      "lesXpPopup", "lesXpPopupText", "lesStreakPopup", "lesStreakPopupText",
      "lesCloseBtn", "lesConfetti"
    ];
    ids.forEach(id => { this.els[id] = document.getElementById(id); });
  }

  bindEvents() {
    this.els.lesStartBtn?.addEventListener("click", () => this.startLesson());
    this.els.lesCheckBtn?.addEventListener("click", () => this.checkAnswer());
    this.els.lesSkipBtn?.addEventListener("click", () => this.skipStep());
    this.els.lesFeedbackContinue?.addEventListener("click", () => this.dismissFeedback());
    this.els.lesNextLessonBtn?.addEventListener("click", () => this.goToNextLesson());
    this.els.lesReviewBtn?.addEventListener("click", () => this.reviewMistakes());
    this.els.lesCloseBtn?.addEventListener("click", (e) => {
      if (e) e.preventDefault();
      this.saveProgressSnapshot({ reason: "exit" });
      const href = this.els.lesCloseBtn?.href || "courses.html";
      window.location.href = href;
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        if (this.els.lesFeedbackOverlay?.style.display !== "none") {
          this.dismissFeedback();
        } else if (this.els.lesCheckBtn && !this.els.lesCheckBtn.disabled) {
          this.checkAnswer();
        }
      }
      if (e.key === "Escape") {
        if (this.els.lesFeedbackOverlay?.style.display !== "none") {
          this.dismissFeedback();
        }
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.saveProgressSnapshot({ reason: "visibility" });
    });
    window.addEventListener("beforeunload", () => {
      this.saveProgressSnapshot({ reason: "unload", silent: true });
    });
  }

  parseURL() {
    const p = new URLSearchParams(window.location.search);
    this.courseId = p.get("course_id") || p.get("course");
    const rawLesson = Number(p.get("lesson") || 0);
    this.lessonNumber = Number.isFinite(rawLesson) && rawLesson > 0 ? rawLesson : 1;
    this.contentId = p.get("content_id") || p.get("content");

    this.updateBackLinks();
  }

  updateBackLinks() {
    if (!this.courseId) return;
    const bp = new URLSearchParams();
    bp.set("id", this.courseId);
    if (this.contentId) bp.set("content_id", this.contentId);
    const courseUrl = `course.html?${bp.toString()}`;
    if (this.els.lesCloseBtn) this.els.lesCloseBtn.href = courseUrl;
    if (this.els.lesBackToCourseBtn) this.els.lesBackToCourseBtn.href = courseUrl;
  }

  showLoadError(message) {
    this.showScreen("lesLoadingScreen");
    const container = this.els.lesLoadingScreen;
    if (container) {
      container.innerHTML = `
        <div class="les-error">
          <i class="bi bi-exclamation-triangle"></i>
          <h3>Lesson unavailable</h3>
          <p>${escHtml(message || "We couldn't load this lesson. Please go back and try again.")}</p>
          <a href="courses.html" class="les-btn les-btn-primary">Browse Courses</a>
        </div>
      `;
    }
  }

  loadLesson() {
    // Safety timeout: if loading takes > 5 seconds, show an error
    const loadTimeout = setTimeout(() => {
      if (document.body.classList.contains("net-loading")) {
        document.body.classList.remove("net-loading");
        this.showLoadError("Lesson took too long to load. Please go back and try again.");
      }
    }, 5000);

    try {
      // Ensure ENDPOINTS is always fresh from window
      ENDPOINTS = window.ENDPOINTS || {};

      const contentMap = getCourseContentMap();

      // Debug: log what we received to help diagnose blank-lesson issues
      console.log("[lesson.js] loadLesson", {
        courseId: this.courseId,
        contentId: this.contentId,
        lessonNumber: this.lessonNumber,
        contentMapKeys: Object.keys(contentMap || {})
      });

      this.course = resolveCourseContent(this.courseId, this.contentId);
      this.lesson = getLessonByNumber(this.course, this.lessonNumber);

      if (this.course && !this.lesson) {
        this.lessonNumber = 1;
        this.lesson = getLessonByNumber(this.course, this.lessonNumber);
      }

      if (!this.course) {
        const firstId = Object.keys(contentMap || {})[0];
        if (firstId) {
          this.courseId = this.courseId || firstId;
          this.contentId = this.contentId || firstId;
          this.course = contentMap[firstId];
          this.lessonNumber = this.lessonNumber || 1;
          this.lesson = getLessonByNumber(this.course, this.lessonNumber) || getLessonByNumber(this.course, 1);
          this.updateBackLinks();
        }
      }

      if (!this.course || !this.lesson) {
        clearTimeout(loadTimeout);
        this.showLoadError("We couldn't find this lesson. Please go back and try again.");
        return;
      }

      this.steps = buildStepsFromLesson(this.lesson, this.course);
      this.progressTotalSteps = Math.max(1, this.steps.length || 1);
      this.lessonXP = getLessonItemXP(this.course, this.lessonNumber) || Number(this.lesson.xp) || 50;
      this.restoreProgress();
      this.showIntro();
    } catch (error) {
      console.error("Lesson load failed:", error);
      this.showLoadError("We hit a loading error. Please refresh the page and try again.");
    } finally {
      clearTimeout(loadTimeout);
      document.body.classList.remove("net-loading");
    }
  }

  showScreen(screenId) {
    ["lesLoadingScreen", "lesIntroScreen", "lesStepScreen", "lesCompleteScreen"].forEach(id => {
      const el = this.els[id];
      if (el) el.style.display = id === screenId ? "" : "none";
    });
  }

  showIntro() {
    this.showScreen("lesIntroScreen");

    // Difficulty icon
    const diffIcons = { novice: "bi-shield", intermediate: "bi-shield-check", advanced: "bi-shield-fill-exclamation" };
    const diff = (this.course.difficulty || "novice").toLowerCase();
    if (this.els.lesIntroBadge) {
      this.els.lesIntroBadge.innerHTML = `<i class="bi ${diffIcons[diff] || 'bi-book'}"></i>`;
      this.els.lesIntroBadge.dataset.difficulty = diff;
    }

    const setText = (id, val) => { if (this.els[id]) this.els[id].textContent = val; };
    setText("lesIntroKicker", `LESSON ${this.lessonNumber}`);
    setText("lesIntroTitle", this.lesson.title || "Lesson");
    setText("lesIntroDesc", this.lesson.learn || this.lesson.summary || "");
    setText("lesIntroTime", this.lesson.duration || this.lesson.estimatedTime || this.course.estimatedTime || "10 min");
    setText("lesIntroXP", `${this.lessonXP} XP`);
    setText("lesIntroSteps", `${this.steps.length} steps`);

    // Objectives
    if (this.els.lesIntroObjectives && Array.isArray(this.lesson.objectives)) {
      this.els.lesIntroObjectives.innerHTML = this.lesson.objectives.map(obj =>
        `<div class="les-intro-obj"><i class="bi bi-check-circle"></i><span>${escHtml(obj)}</span></div>`
      ).join("");
    }

    // Title for browser tab
    document.title = `Netology – ${this.lesson.title}`;

    if (this.els.lesStartBtn) {
      this.els.lesStartBtn.textContent = this.hasSavedProgress ? "Continue Lesson" : "Start Lesson";
    }
    if (this.els.lesResumeHint) {
      if (this.hasSavedProgress) {
        this.els.lesResumeHint.textContent = `Resume at ${this.progressPct}% complete`;
        this.els.lesResumeHint.style.display = "";
      } else {
        this.els.lesResumeHint.style.display = "none";
      }
    }
  }

  restoreProgress() {
    const user = getCurrentUser();
    this.userEmail = user?.email || null;
    const saved = readLessonProgress(this.userEmail, this.courseId, this.lessonNumber);

    if (!saved) {
      this.progressCompletedSteps = 0;
      this.progressPct = 0;
      this.progressXP = 0;
      this.xpEarned = 0;
      this.resumeStepIndex = 0;
      this.hasSavedProgress = false;
      return;
    }

    const total = this.progressTotalSteps || this.steps.length || 1;
    const completedSteps = clamp(Number(saved.completed_steps || 0), 0, total);
    const pctFromSteps = Math.round((completedSteps / total) * 100);
    const pctSaved = clamp(Number(saved.progress_pct || pctFromSteps), 0, 100);
    const pct = Math.max(pctFromSteps, pctSaved);
    const targetXP = computeProgressXP(this.lessonXP, pct);
    const savedXP = clamp(Number(saved.xp_earned || targetXP), 0, this.lessonXP);

    this.progressCompletedSteps = completedSteps;
    this.progressPct = pct;
    this.progressXP = Math.min(targetXP, savedXP);
    this.xpEarned = this.progressXP;
    this.hasSavedProgress = pct > 0 && pct < 100;

    const resume = Number(saved.resume_step ?? saved.current_step ?? completedSteps);
    this.resumeStepIndex = pct >= 100 ? 0 : clamp(resume, 0, Math.max(0, total - 1));

    if (this.els.lesXpCount) this.els.lesXpCount.textContent = String(this.xpEarned);
  }

  syncProgressRemote(payload, reason) {
    const base = getLessonAPI();
    if (!base || !this.userEmail) return;
    const template = ENDPOINTS.slides?.progress || ENDPOINTS.progress?.userProgress || "";
    if (!template) return;
    const lessonId =
      this.lesson?.id ||
      this.lesson?.lesson_id ||
      this.lesson?.lessonId ||
      this.lessonNumber ||
      `${payload.course_id}-${payload.lesson_number}`;
    const path = template.includes(":lessonId")
      ? template.replace(":lessonId", encodeURIComponent(lessonId))
      : template;
    const body = {
      ...payload,
      user_email: this.userEmail,
      lesson_id: lessonId,
      reason: reason || "progress"
    };
    fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).catch(() => {});
  }

  persistProgress({ completedSteps, resumeIndex, silent = false, reason = "progress" } = {}) {
    if (!this.courseId || !this.lessonNumber) return;
    const total = this.progressTotalSteps || this.steps.length || 1;
    const safeCompleted = clamp(Number(completedSteps || 0), 0, total);
    const pct = Math.round((safeCompleted / total) * 100);
    const targetXP = computeProgressXP(this.lessonXP, pct);
    const existing = readLessonProgress(this.userEmail, this.courseId, this.lessonNumber);

    const prevCompleted = clamp(Number(existing?.completed_steps || 0), 0, total);
    const prevPct = clamp(Number(existing?.progress_pct || 0), 0, 100);
    const prevXP = clamp(Number(existing?.xp_earned || 0), 0, this.lessonXP);

    const finalCompleted = Math.max(prevCompleted, safeCompleted);
    const finalPct = Math.max(prevPct, pct);
    const finalXP = Math.max(prevXP, targetXP);
    const finalResume = Number.isFinite(resumeIndex)
      ? clamp(resumeIndex, 0, Math.max(0, total - 1))
      : undefined;

    const payload = {
      course_id: String(this.courseId),
      lesson_number: Number(this.lessonNumber),
      total_steps: total,
      completed_steps: finalCompleted,
      progress_pct: finalPct,
      xp_earned: finalXP,
      soft_completed: finalPct >= PROGRESS_SOFT_PCT,
      resume_step: finalResume,
      updated_at: new Date().toISOString()
    };

    writeLessonProgress(this.userEmail, this.courseId, this.lessonNumber, payload);

    // Fire soft-complete report when crossing the 40% threshold for the first time
    const wasAlreadySoftDone = prevPct >= PROGRESS_SOFT_PCT;
    if (!wasAlreadySoftDone && finalPct >= PROGRESS_SOFT_PCT && finalPct < 100 && reason !== "complete") {
      this.reportSoftComplete?.();
    }

    if (!silent) this.syncProgressRemote(payload, reason);
  }

  saveProgressSnapshot({ reason = "snapshot", silent = false } = {}) {
    if (!this.steps.length) return;
    const completedSteps = this.currentStepIndex >= 0
      ? this.currentStepIndex
      : this.progressCompletedSteps;
    const resumeIndex = this.currentStepIndex >= 0
      ? this.currentStepIndex
      : this.resumeStepIndex;
    this.persistProgress({ completedSteps, resumeIndex, silent, reason });
  }

  applyProgressAndXP(completedSteps, options = {}) {
    if (this.isReviewMode) return 0;
    const total = this.progressTotalSteps || this.steps.length || 1;
    const safeCompleted = clamp(Number(completedSteps || 0), 0, total);
    const pct = Math.round((safeCompleted / total) * 100);
    const targetXP = computeProgressXP(this.lessonXP, pct);
    const delta = Math.max(0, targetXP - this.progressXP);
    const showPopup = options.showPopup !== false;

    this.progressCompletedSteps = safeCompleted;
    this.progressPct = pct;
    this.hasSavedProgress = pct > 0 && pct < 100;

    if (delta > 0) {
      this.addXP(delta, { showPopup });
      this.progressXP = targetXP;
      if (this.userEmail && typeof bumpUserXP === "function") {
        awardLessonXP(this.userEmail, this.courseId, this.lessonNumber, targetXP, delta)
          .then((result) => {
            const xpAdded = result?.success ? Number(result.xp_added || 0) : delta;
            if (xpAdded > 0) bumpUserXP(this.userEmail, xpAdded);
          })
          .catch(() => {
            bumpUserXP(this.userEmail, delta);
          });
      }
    } else {
      this.progressXP = targetXP;
      this.xpEarned = targetXP;
      this.updateStats();
    }

    this.persistProgress({ completedSteps: safeCompleted, resumeIndex: safeCompleted, reason: "step" });
    return delta;
  }

  startLesson() {
    this.startTime = Date.now();
    this.showScreen("lesStepScreen");
    const startIndex = Number.isFinite(this.resumeStepIndex) ? this.resumeStepIndex : 0;
    this.loadStep(startIndex);
  }

  loadStep(index) {
    if (index >= this.steps.length) {
      this.showCompletion();
      return;
    }

    this.currentStepIndex = index;
    const step = this.steps[index];
    const container = this.els.lesStepContainer;
    const checkBtn = this.els.lesCheckBtn;
    const skipBtn = this.els.lesSkipBtn;

    // Clear
    container.innerHTML = "";
    checkBtn.disabled = true;
    checkBtn.textContent = "Check";

    // Update progress
    const pct = ((index) / this.steps.length) * 100;
    if (this.els.lesProgressFill) this.els.lesProgressFill.style.width = `${pct}%`;

    // Render step
    let renderer;
    switch (step.type) {
      case "learn":
        renderer = renderLearnStep(step);
        checkBtn.textContent = "Continue";
        checkBtn.disabled = false;
        if (skipBtn) skipBtn.style.display = "none";
        break;
      case "mcq":
        renderer = renderMCQ(step);
        if (skipBtn) skipBtn.style.display = "";
        break;
      case "fill_blank":
        renderer = renderFillBlank(step);
        if (skipBtn) skipBtn.style.display = "";
        break;
      case "matching":
        renderer = renderMatching(step);
        if (skipBtn) skipBtn.style.display = "";
        break;
      case "tap_word":
        renderer = renderTapWord(step);
        if (skipBtn) skipBtn.style.display = "";
        break;
      case "flashcard":
        renderer = renderFlashcard(step);
        checkBtn.textContent = "Continue";
        checkBtn.disabled = true; // enabled after viewing all cards
        if (skipBtn) skipBtn.style.display = "";
        break;
      case "drag_order":
        renderer = renderDragOrder(step);
        if (skipBtn) skipBtn.style.display = "";
        break;
      default:
        renderer = renderLearnStep({ type: "learn", title: "Step", content: ["Continue to the next step."], icon: "bi-arrow-right" });
        checkBtn.textContent = "Continue";
        checkBtn.disabled = false;
        if (skipBtn) skipBtn.style.display = "none";
    }

    this.currentRenderer = renderer;
    container.appendChild(renderer.el);

    // Animate in
    requestAnimationFrame(() => {
      renderer.el.classList.add("les-step-enter");
    });

    // Scroll to top of step area
    container.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: this.prefersReducedMotion ? "auto" : "smooth" });
  }

  checkAnswer() {
    const renderer = this.currentRenderer;
    if (!renderer) return;

    // Learn steps just advance
    if (renderer.type === "learn" || renderer.type === "flashcard") {
      if (renderer.type === "flashcard" && renderer.check) {
        renderer.check();
      }
      this.stepResults.push({ type: renderer.type, correct: true, step: this.steps[this.currentStepIndex] });
      this.applyProgressAndXP(this.currentStepIndex + 1);
      this.loadStep(this.currentStepIndex + 1);
      return;
    }

    // Interactive steps
    if (renderer.check) {
      const result = renderer.check();
      this.totalChecked++;

      if (result.correct) {
        this.correctCount++;
        this.streak++;
        if (this.streak > this.bestStreak) this.bestStreak = this.streak;
        this.showStreakPopup();
      } else {
        this.streak = 0;
      }

      this.updateStats();
      this.stepResults.push({
        type: renderer.type,
        correct: result.correct,
        step: this.steps[this.currentStepIndex]
      });

      const xpDelta = this.applyProgressAndXP(this.currentStepIndex + 1, { showPopup: false });
      this.showFeedback(result.correct, result.explanation, xpDelta);
    }
  }

  skipStep() {
    this.stepResults.push({ type: this.currentRenderer?.type || "unknown", correct: false, skipped: true, step: this.steps[this.currentStepIndex] });
    this.streak = 0;
    this.updateStats();
    this.applyProgressAndXP(this.currentStepIndex + 1);
    this.loadStep(this.currentStepIndex + 1);
  }

  showFeedback(correct, explanation, xp) {
    const overlay = this.els.lesFeedbackOverlay;
    const card = this.els.lesFeedbackCard;
    const icon = this.els.lesFeedbackIcon;
    const title = this.els.lesFeedbackTitle;
    const text = this.els.lesFeedbackText;
    const xpEl = this.els.lesFeedbackXP;
    const xpAmount = this.els.lesFeedbackXPAmount;

    // Ensure overlay is a centered fixed modal (not inline)
    overlay.style.display = "";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "9999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    card.className = "les-feedback-card " + (correct ? "is-correct" : "is-wrong");

    icon.innerHTML = correct
      ? '<i class="bi bi-check-circle-fill"></i>'
      : '<i class="bi bi-x-circle-fill"></i>';

    title.textContent = correct ? this.getCorrectPhrase() : this.getWrongPhrase();
    text.textContent = explanation || "";

    if (xp && xp > 0) {
      xpEl.style.display = "";
      xpAmount.textContent = `+${xp} XP`;
    } else {
      xpEl.style.display = "none";
    }

    // Focus continue button
    this.els.lesFeedbackContinue?.focus();
  }

  dismissFeedback() {
    if (this.els.lesFeedbackOverlay) {
      this.els.lesFeedbackOverlay.style.display = "none";
    }
    this.loadStep(this.currentStepIndex + 1);
  }

  addXP(amount, options = {}) {
    if (!amount) return;
    this.xpEarned += amount;
    if (options.showPopup !== false) this.showXPPopup(amount);
    this.updateStats();
  }

  updateStats() {
    if (this.els.lesStreakCount) this.els.lesStreakCount.textContent = String(this.streak);
    if (this.els.lesXpCount) this.els.lesXpCount.textContent = String(this.xpEarned);

    // Animate streak pill
    if (this.streak >= 2 && this.els.lesStreakPill) {
      this.els.lesStreakPill.classList.add("is-active");
    }
  }

  showXPPopup(amount) {
    const popup = this.els.lesXpPopup;
    const text = this.els.lesXpPopupText;
    if (!popup || !text) return;

    text.textContent = `+${amount} XP`;
    popup.classList.remove("is-show");
    void popup.offsetWidth; // Force reflow
    popup.classList.add("is-show");
    popup.setAttribute("aria-hidden", "false");

    setTimeout(() => {
      popup.classList.remove("is-show");
      popup.setAttribute("aria-hidden", "true");
    }, 1500);
  }

  showStreakPopup() {
    if (this.streak < 2) return;
    const popup = this.els.lesStreakPopup;
    const text = this.els.lesStreakPopupText;
    if (!popup || !text) return;

    const phrases = {
      2: "Double!",
      3: "Triple!",
      4: "On fire!",
      5: "Unstoppable!"
    };
    text.textContent = `${this.streak} in a row! ${phrases[this.streak] || "Amazing!"}`;
    popup.classList.remove("is-show");
    void popup.offsetWidth;
    popup.classList.add("is-show");
    popup.setAttribute("aria-hidden", "false");

    setTimeout(() => {
      popup.classList.remove("is-show");
      popup.setAttribute("aria-hidden", "true");
    }, 2000);
  }

  getCorrectPhrase() {
    const phrases = ["Correct!", "Nice work!", "That's right!", "You got it!", "Excellent!", "Well done!", "Perfect!"];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  getWrongPhrase() {
    const phrases = ["Not quite!", "Almost!", "Try to remember this one.", "Good try!", "Keep going!"];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  showCompletion() {
    this.showScreen("lesCompleteScreen");
    this.persistProgress({
      completedSteps: this.progressTotalSteps,
      resumeIndex: 0,
      reason: "complete"
    });

    // Set progress bar to 100%
    if (this.els.lesProgressFill) this.els.lesProgressFill.style.width = "100%";

    // Stats
    const elapsed = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const accuracy = this.totalChecked > 0 ? Math.round((this.correctCount / this.totalChecked) * 100) : 100;

    if (this.els.lesCompleteXP) this.els.lesCompleteXP.textContent = String(this.xpEarned);
    if (this.els.lesCompleteAccuracy) this.els.lesCompleteAccuracy.textContent = `${accuracy}%`;
    if (this.els.lesCompleteStreak) this.els.lesCompleteStreak.textContent = String(this.bestStreak);
    if (this.els.lesCompleteTime) this.els.lesCompleteTime.textContent = `${mins}:${String(secs).padStart(2, "0")}`;

    // Show "Lesson Mastered" if fully completed, else show standard completion text
    const saved = readLessonProgress(this.userEmail, this.courseId, this.lessonNumber);
    const isMastered = saved?.progress_pct >= 100;
    if (this.els.lesCompleteSubtitle) {
      this.els.lesCompleteSubtitle.textContent = isMastered
        ? `🏆 Lesson Mastered – "${this.lesson.title}"`
        : `You've completed "${this.lesson.title}"`;
    }

    // Show mastered badge on title if applicable
    const titleEl = document.querySelector(".les-complete-title");
    if (titleEl && isMastered) {
      titleEl.textContent = "Lesson Mastered!";
    }

    // Review items
    if (this.els.lesCompleteReview) {
      const interactiveResults = this.stepResults.filter(r => r.type !== "learn" && r.type !== "flashcard");
      if (interactiveResults.length) {
        this.els.lesCompleteReview.innerHTML = interactiveResults.map((r, i) => `
          <div class="les-review-item ${r.correct ? 'is-correct' : r.skipped ? 'is-skipped' : 'is-wrong'}">
            <span class="les-review-icon">
              ${r.correct ? '<i class="bi bi-check-circle-fill"></i>' : r.skipped ? '<i class="bi bi-skip-forward-fill"></i>' : '<i class="bi bi-x-circle-fill"></i>'}
            </span>
            <span class="les-review-text">${escHtml(r.step?.question || r.step?.prompt || r.step?.instruction || r.step?.sentence || `Exercise ${i + 1}`)}</span>
          </div>
        `).join("");
      } else {
        this.els.lesCompleteReview.innerHTML = '<p class="text-muted">All steps were learning content. Well done!</p>';
      }
    }

    // Fire confetti
    this.fireConfetti();

    // Report completion to API
    this.reportCompletion();
  }

  fireConfetti() {
    const container = this.els.lesConfetti;
    if (!container || this.prefersReducedMotion) return;

    const colors = ["#0d9488", "#06b6d4", "#f97316", "#8b5cf6", "#ec4899", "#22c55e", "#f59e0b"];
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement("div");
      piece.className = "les-confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${Math.random() * 0.5}s`;
      piece.style.animationDuration = `${1 + Math.random() * 2}s`;
      container.appendChild(piece);
    }
    setTimeout(() => { container.innerHTML = ""; }, 4000);
  }

  async reportCompletion() {
    const user = getCurrentUser();
    if (!user?.email || !this.courseId || !this.lessonNumber) return;

    try {
      const api = getLessonAPI();
      if (!api) return;
      await fetch(`${api}/complete-lesson`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          course_id: String(this.courseId),
          lesson_number: this.lessonNumber,
          earned_xp: this.xpEarned || 0,
          progress_pct: 100,
          completed_stamp: true,
          mastered: true
        })
      });
    } catch (e) {
      console.warn("Could not report lesson completion:", e);
    }
  }

  /**
   * Report 40% soft-complete milestone to the backend.
   * Called automatically when progress crosses the PROGRESS_SOFT_PCT threshold.
   */
  async reportSoftComplete() {
    const user = getCurrentUser();
    if (!user?.email || !this.courseId || !this.lessonNumber) return;
    try {
      const api = getLessonAPI();
      if (!api) return;
      await fetch(`${api}/complete-lesson`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          course_id: String(this.courseId),
          lesson_number: this.lessonNumber,
          earned_xp: this.xpEarned || 0,
          progress_pct: this.progressPct,
          completed_stamp: true,
          mastered: false
        })
      });
    } catch (e) {
      console.warn("Could not report soft complete:", e);
    }
  }

  goToNextLesson() {
    const total = getTotalLessons(this.course);
    if (this.lessonNumber < total) {
      const p = new URLSearchParams();
      p.set("course_id", this.courseId);
      if (this.contentId) p.set("content_id", this.contentId);
      p.set("lesson", String(this.lessonNumber + 1));
      window.location.href = `lesson.html?${p.toString()}`;
    } else {
      // Last lesson – go back to course
      const p = new URLSearchParams();
      p.set("id", this.courseId);
      if (this.contentId) p.set("content_id", this.contentId);
      window.location.href = `course.html?${p.toString()}`;
    }
  }

  reviewMistakes() {
    const mistakes = this.stepResults
      .map((r, i) => ({ ...r, originalIndex: i }))
      .filter(r => !r.correct && !r.skipped && r.type !== "learn" && r.type !== "flashcard");

    if (mistakes.length === 0) {
      if (this.els.lesReviewBtn) this.els.lesReviewBtn.textContent = "No mistakes!";
      return;
    }

    this.isReviewMode = true;

    // Rebuild steps from mistakes only
    this.steps = mistakes.map(m => m.step);
    this.currentStepIndex = -1;
    this.correctCount = 0;
    this.totalChecked = 0;
    this.streak = 0;
    this.stepResults = [];
    this.showScreen("lesStepScreen");
    this.loadStep(0);
  }
}


/* ═══════════════════════════════════════════════════════════
   CHROME – sidebar, dropdown, identity, logout (reused)
   ═══════════════════════════════════════════════════════════ */
function wireChrome(user) {
  wireSidebar();
  wireUserDropdown();
  fillIdentity(user);

  const doLogout = () => {
    localStorage.removeItem("netology_user");
    localStorage.removeItem("user");
    localStorage.removeItem("netology_token");
    window.location.href = "index.html";
  };
  document.getElementById("topLogoutBtn")?.addEventListener("click", doLogout);
  document.getElementById("sideLogoutBtn")?.addEventListener("click", doLogout);
}

function wireSidebar() {
  const openBtn = document.getElementById("openSidebarBtn");
  const closeBtn = document.getElementById("closeSidebarBtn");
  const sidebar = document.getElementById("slideSidebar");
  const backdrop = document.getElementById("sideBackdrop");

  const open = () => {
    if (!sidebar || !backdrop) return;
    sidebar.classList.add("is-open");
    backdrop.classList.add("is-open");
    document.body.classList.add("net-noscroll");
    sidebar.setAttribute("aria-hidden", "false");
  };
  const close = () => {
    if (!sidebar || !backdrop) return;
    sidebar.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    document.body.classList.remove("net-noscroll");
    sidebar.setAttribute("aria-hidden", "true");
  };

  openBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar?.classList.contains("is-open")) close();
  });
}

function wireUserDropdown() {
  const btn = document.getElementById("userBtn");
  const dd = document.getElementById("userDropdown");
  if (!btn || !dd) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = dd.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (e) => {
    if (!dd.contains(e.target) && !btn.contains(e.target)) {
      dd.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

function fillIdentity(user) {
  const name = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : (user?.username || "Student");
  const initial = (name || "S").charAt(0).toUpperCase();

  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set("topAvatar", initial);
  set("ddName", name);
  set("ddEmail", user?.email || "");
  set("sideAvatar", initial);
  set("sideUserName", name);
  set("sideUserEmail", user?.email || "");
}


/* ═══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  const user = getCurrentUser();
  if (user) wireChrome(user);

  const engine = new LessonEngine();
  engine.init();

  window.lessonEngine = engine;
});
