/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: lesson.js
Purpose: Interactive lesson player — shows content cards, MCQ checks,
         matching exercises, tracks XP and progress, saves to localStorage.
---------------------------------------------------------
*/

// ============================================================
// 1. HELPERS
// ============================================================

// API base from app.js
function getAPI() {
  return String(window.API_BASE || "").trim().replace(/\/$/, "");
}

// Course content map from course_content.js
function getContentMap() {
  return (typeof window !== "undefined" && window.COURSE_CONTENT) ? window.COURSE_CONTENT : {};
}

// Read current user from localStorage
function getCurrentUser() {
  try {
    const raw = localStorage.getItem("netology_user") || localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Normalise email to lowercase trimmed string
function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

// Safely parse JSON with a fallback value
function parseJsonSafe(raw, fallback = null) {
  try { return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

// Clamp a number between min and max
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Safely set innerHTML-escaped text content
function escHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Shuffle an array (Fisher-Yates) — used for matching columns only
function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// API endpoint map (from app.js)
const ENDPOINTS = window.ENDPOINTS || {};

// Lesson soft-complete threshold (% steps done counts as "started")
const SOFT_PCT = 40;

// ============================================================
// 2. XP HELPERS
// ============================================================

// Add XP to a stored user object
function applyXpToUser(user, amount) {
  if (window.NetologyXP?.applyXpToUser) return window.NetologyXP.applyXpToUser(user, amount);
  const base = user && typeof user === "object" ? user : {};
  return { ...base, xp: Math.max(0, Number(base.xp || 0) + Math.max(0, Number(amount) || 0)) };
}

// Bump XP in both localStorage user keys
function bumpUserXP(email, amount) {
  if (!amount) return;
  const key = normalizeEmail(email);
  ["user", "netology_user"].forEach(storageKey => {
    const stored = parseJsonSafe(localStorage.getItem(storageKey), null);
    if (!stored || normalizeEmail(stored.email) !== key) return;
    localStorage.setItem(storageKey, JSON.stringify(applyXpToUser(stored, amount)));
  });
}

// XP proportional to how far through the lesson the user is
function computeProgressXP(totalXP, pct) {
  return Math.min(Number(totalXP) || 0, Math.floor(((Number(totalXP) || 0) * clamp(pct, 0, 100)) / 100));
}

// POST XP award to backend
async function awardLessonXP(email, courseId, lessonNum, totalXP, deltaXP) {
  const base = getAPI();
  if (!email || !base || !deltaXP) return { success: false, xp_added: 0 };
  const path = ENDPOINTS.auth?.awardXp || "/award-xp";
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, action: `lesson-progress:${courseId}:${lessonNum}:${totalXP}`, xp: Number(deltaXP) })
    });
    const data = await res.json().catch(() => ({}));
    if (data && typeof data.success !== "undefined") return data;
  } catch {}
  return { success: false, xp_added: 0 };
}

// ============================================================
// 3. COURSE & LESSON LOOKUP
// ============================================================

// Find a course object from the content map by courseId or contentId
function resolveCourse(courseId, contentId) {
  const map = getContentMap();
  if (contentId && map[String(contentId)]) return map[String(contentId)];
  if (courseId  && map[String(courseId)])  return map[String(courseId)];
  return null;
}

// Walk all units to find the Nth lesson (1-based index)
function getLessonByNumber(course, lessonNumber) {
  if (!course?.units) return null;
  const target = Number(lessonNumber);
  if (!Number.isFinite(target) || target < 1) return null;
  let counter = 0;
  for (const unit of course.units) {
    for (const lesson of (unit.lessons || [])) {
      counter++;
      if (counter === target) return { ...lesson, unit_title: unit.title || "Module" };
    }
  }
  return null;
}

// Get the XP value from the matching "Learn" section item for this lesson
function getLessonXP(course, lessonNumber) {
  if (!course?.units) return null;
  let count = 0;
  for (const unit of course.units) {
    for (const section of (unit.sections || [])) {
      for (const item of (section.items || [])) {
        if (String(item.type || "").toLowerCase() === "learn") {
          count++;
          if (count === Number(lessonNumber)) return Number(item.xp) || null;
        }
      }
    }
  }
  return null;
}

// Count total lessons across all units (used for next-lesson navigation)
function getTotalLessons(course) {
  if (!course?.units) return 0;
  return course.units.reduce((total, unit) => total + (unit.lessons?.length || 0), 0);
}

// ============================================================
// 4. PROGRESS PERSISTENCE
// ============================================================

function progressKey(email, courseId, lessonNum) {
  if (!courseId || !lessonNum) return null;
  return `netology_lesson_progress:${email || "guest"}:${courseId}:${lessonNum}`;
}

function readProgress(email, courseId, lessonNum) {
  const key = progressKey(email, courseId, lessonNum);
  if (!key) return null;
  const data = parseJsonSafe(localStorage.getItem(key), null);
  return data && typeof data === "object" ? data : null;
}

function writeProgress(email, courseId, lessonNum, payload) {
  const key = progressKey(email, courseId, lessonNum);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(payload));
}

// ============================================================
// 5. STEP BUILDER — lesson data → step objects
// ============================================================

// Auto-bold key networking terms in a text string
function highlightTerms(text) {
  const terms = [
    "network", "router", "switch", "firewall", "DNS", "DHCP", "IP", "TCP", "UDP",
    "HTTP", "HTTPS", "LAN", "WAN", "VPN", "MAC", "Ethernet", "Wi-Fi", "bandwidth",
    "latency", "packet", "protocol", "subnet", "gateway", "OSI", "VLAN", "NAT",
    "encryption", "SSL", "TLS", "ACL", "topology", "OSPF", "BGP", "ARP", "ping",
    "byte", "bit", "port", "hub", "bridge", "NIC", "ISP", "cloud"
  ];
  let result = escHtml(text);
  const escaped = terms.map(t => t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
  result = result.replace(
    new RegExp(`\\b(${escaped.join("|")})\\b`, "gi"),
    m => `<strong class="les-key-term">${m}</strong>`
  );
  return result;
}

// Convert lesson blocks into an ordered list of step objects.
// Only three step types are used:
//   { type:"learn",    title, lines, style }
//   { type:"mcq",      question, options, correctIndex, explanation, xp }
//   { type:"matching", prompt, pairs, xp }
function buildSteps(lesson) {
  const steps = [];

  if (!Array.isArray(lesson.blocks)) return steps;

  for (const block of lesson.blocks) {

    // -- text block → one learn card per 3 lines --
    if (block.type === "text") {
      const lines = (Array.isArray(block.text) ? block.text : [block.text || ""]).filter(Boolean);
      for (let i = 0; i < lines.length; i += 3) {
        const chunk = lines.slice(i, i + 3);
        if (chunk.length) {
          steps.push({ type: "learn", title: block.title || lesson.title || "Learn", lines: chunk });
        }
      }
    }

    // -- explain block → callout-style learn card --
    if (block.type === "explain") {
      const lines = (Array.isArray(block.content) ? block.content : [block.content || ""]).filter(Boolean);
      steps.push({ type: "learn", title: block.title || "Key Concept", lines, style: "callout" });
    }

    // -- check block → MCQ --
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

    // -- activity block (select mode) → MCQ; activity (steps mode) → numbered learn card --
    if (block.type === "activity") {
      if (block.mode === "select") {
        steps.push({
          type: "mcq",
          question: block.prompt || block.title || "Choose the correct answer",
          options: block.options || [],
          correctIndex: block.correctIndex ?? 0,
          explanation: block.explanation || "",
          xp: 10
        });
      } else if (Array.isArray(block.steps)) {
        steps.push({ type: "learn", title: block.title || "Activity", lines: block.steps, style: "steps" });
      }
    }

    // -- matching block → matching pairs exercise --
    if (block.type === "matching") {
      steps.push({
        type: "matching",
        prompt: block.prompt || block.title || "Match each term to its description",
        pairs: block.pairs || [],
        xp: block.xp || 15
      });
    }
  }

  // Ensure at least one interactive step exists (fallback MCQ from lesson summary)
  if (!steps.some(s => s.type === "mcq" || s.type === "matching")) {
    steps.push({
      type: "mcq",
      question: `What is the main topic of "${lesson.title}"?`,
      options: [lesson.summary || "The core concept", "An unrelated idea", "None of the above"],
      correctIndex: 0,
      explanation: lesson.summary || "Review the lesson content.",
      xp: 10
    });
  }

  return steps;
}

// ============================================================
// 6. RENDERERS — each returns { el, type, check() }
// ============================================================

// --- Learn card (read-only) ---
// Supports three visual styles: default (fact rows), callout, steps
function renderLearnStep(step) {
  const el = document.createElement("div");
  el.className = "les-step les-step-learn";

  const iconCls   = step.style === "callout" ? "bi-lightbulb-fill" : "bi-book-fill";
  const iconColor = step.style === "callout" ? "les-step-icon--callout" : "les-step-icon--learn";
  const lines     = Array.isArray(step.lines) ? step.lines.filter(Boolean) : [step.lines || ""];

  el.innerHTML = `
    <div class="les-step-header">
      <div class="les-step-icon ${iconColor}"><i class="bi ${iconCls}"></i></div>
      <h2 class="les-step-title">${escHtml(step.title)}</h2>
    </div>`;

  if (step.style === "callout") {
    const card = document.createElement("div");
    card.className = "les-learn-callout-card";
    card.innerHTML = `
      <div class="les-callout-accent"><i class="bi bi-lightbulb-fill"></i> Key Concept</div>
      <div class="les-callout-body">${lines.map(l => `<p>${highlightTerms(l)}</p>`).join("")}</div>`;
    el.appendChild(card);

  } else if (step.style === "steps") {
    const list = document.createElement("div");
    list.className = "les-learn-steps-list";
    lines.forEach((line, i) => {
      const item = document.createElement("div");
      item.className = "les-learn-step-item";
      item.innerHTML = `<div class="les-learn-step-num">${i + 1}</div><div class="les-learn-step-text">${highlightTerms(line)}</div>`;
      list.appendChild(item);
    });
    el.appendChild(list);

  } else {
    const wrap = document.createElement("div");
    wrap.className = "les-learn-facts";
    lines.forEach(line => {
      const isExample = /^(example|real.?world|e\.g\.|for instance)/i.test(line.trim());
      const block = document.createElement("div");
      if (isExample) {
        block.className = "les-learn-example";
        block.innerHTML = `
          <span class="les-learn-example-label"><i class="bi bi-play-circle-fill"></i> Example</span>
          <span class="les-learn-example-text">${highlightTerms(line.replace(/^(example|real.?world example|e\.g\.|for instance)[:\s]*/i, ""))}</span>`;
      } else {
        block.className = "les-learn-fact";
        block.innerHTML = `
          <i class="bi bi-arrow-right-circle-fill les-learn-fact-icon"></i>
          <span class="les-learn-fact-text">${highlightTerms(line)}</span>`;
      }
      wrap.appendChild(block);
    });
    el.appendChild(wrap);
  }

  return { el, type: "learn" };
}

// --- Multiple Choice Question ---
// Options A/B/C/D; enables Check button on selection
function renderMCQ(step) {
  const el = document.createElement("div");
  el.className = "les-step les-step-mcq";
  let selectedIndex = -1;

  el.innerHTML = `
    <div class="les-step-header">
      <div class="les-step-icon les-step-icon--mcq"><i class="bi bi-patch-question"></i></div>
      <h2 class="les-step-prompt">${escHtml(step.question)}</h2>
    </div>
    <div class="les-mcq-options" role="radiogroup" aria-label="Answer options"></div>`;

  const optionsWrap = el.querySelector(".les-mcq-options");
  const letters = ["A", "B", "C", "D", "E"];

  step.options.forEach((option, i) => {
    const btn = document.createElement("button");
    btn.className = "les-mcq-option";
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", "false");
    btn.innerHTML = `
      <span class="les-mcq-letter">${letters[i] || i + 1}</span>
      <span class="les-mcq-text">${escHtml(option)}</span>
      <span class="les-mcq-check"><i class="bi bi-check-lg"></i></span>`;
    btn.addEventListener("click", () => {
      optionsWrap.querySelectorAll(".les-mcq-option").forEach(o => {
        o.classList.remove("is-selected");
        o.setAttribute("aria-checked", "false");
      });
      btn.classList.add("is-selected");
      btn.setAttribute("aria-checked", "true");
      selectedIndex = i;
      const checkBtn = document.getElementById("lesCheckBtn");
      if (checkBtn) checkBtn.disabled = false;
    });
    optionsWrap.appendChild(btn);
  });

  return {
    el, type: "mcq",
    check() {
      const correct = selectedIndex === step.correctIndex;
      optionsWrap.querySelectorAll(".les-mcq-option").forEach((opt, i) => {
        opt.classList.remove("is-selected");
        opt.style.pointerEvents = "none";
        if (i === step.correctIndex) opt.classList.add("is-correct");
        if (i === selectedIndex && !correct) opt.classList.add("is-wrong");
      });
      return { correct, explanation: step.explanation, xp: correct ? (step.xp || 10) : 0 };
    }
  };
}

// --- Matching Pairs ---
// Click a term, then click its match. Pairs lock in with colour coding.
function renderMatching(step) {
  const el = document.createElement("div");
  el.className = "les-step les-step-matching";

  const pairs = step.pairs || [];
  let selectedTerm  = null;
  let selectedMatch = null;
  const matched = new Set();
  const pairColors = ["#0d9488", "#06b6d4", "#f97316", "#8b5cf6", "#ec4899", "#22c55e"];

  el.innerHTML = `
    <div class="les-step-header">
      <div class="les-step-icon les-step-icon--matching"><i class="bi bi-link-45deg"></i></div>
      <h2 class="les-step-prompt">${escHtml(step.prompt || "Match each term to its description")}</h2>
    </div>
    <div class="les-matching-board">
      <div class="les-matching-col les-matching-terms"></div>
      <div class="les-matching-col les-matching-matches"></div>
    </div>
    <div class="les-matching-status"></div>`;

  const termsCol   = el.querySelector(".les-matching-terms");
  const matchesCol = el.querySelector(".les-matching-matches");
  const statusEl   = el.querySelector(".les-matching-status");

  const shuffledTerms   = shuffle(pairs.map(p => p.term));
  const shuffledMatches = shuffle(pairs.map(p => p.match));

  function tryPair() {
    if (!selectedTerm || !selectedMatch) return;
    const pair    = pairs.find(p => p.term === selectedTerm);
    const correct = pair && pair.match === selectedMatch;
    const termBtn  = termsCol.querySelector(`[data-term="${CSS.escape(selectedTerm)}"]`);
    const matchBtn = matchesCol.querySelector(`[data-match="${CSS.escape(selectedMatch)}"]`);

    if (correct) {
      const color = pairColors[matched.size % pairColors.length];
      matched.add(selectedTerm);
      [termBtn, matchBtn].forEach(btn => {
        btn.classList.add("is-matched");
        btn.style.borderColor = color;
        btn.style.backgroundColor = color + "18";
        btn.style.pointerEvents = "none";
      });
      statusEl.textContent = `${matched.size} of ${pairs.length} matched`;
      if (matched.size === pairs.length) {
        const checkBtn = document.getElementById("lesCheckBtn");
        if (checkBtn) checkBtn.disabled = false;
      }
    } else {
      [termBtn, matchBtn].forEach(btn => btn.classList.add("is-wrong-flash"));
      setTimeout(() => { [termBtn, matchBtn].forEach(btn => btn.classList.remove("is-wrong-flash", "is-selected")); }, 600);
    }

    selectedTerm  = null;
    selectedMatch = null;
    [termsCol, matchesCol].forEach(col =>
      col.querySelectorAll(".les-matching-btn:not(.is-matched)").forEach(b => b.classList.remove("is-selected"))
    );
  }

  shuffledTerms.forEach(term => {
    const btn = document.createElement("button");
    btn.className = "les-matching-btn";
    btn.textContent = term;
    btn.dataset.term = term;
    btn.addEventListener("click", () => {
      if (btn.classList.contains("is-matched")) return;
      termsCol.querySelectorAll(".les-matching-btn:not(.is-matched)").forEach(b => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      selectedTerm = term;
      tryPair();
    });
    termsCol.appendChild(btn);
  });

  shuffledMatches.forEach(match => {
    const btn = document.createElement("button");
    btn.className = "les-matching-btn";
    btn.textContent = match;
    btn.dataset.match = match;
    btn.addEventListener("click", () => {
      if (btn.classList.contains("is-matched")) return;
      matchesCol.querySelectorAll(".les-matching-btn:not(.is-matched)").forEach(b => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      selectedMatch = match;
      tryPair();
    });
    matchesCol.appendChild(btn);
  });

  statusEl.textContent = `0 of ${pairs.length} matched`;

  return {
    el, type: "matching",
    check() {
      const correct = matched.size === pairs.length;
      return {
        correct,
        explanation: correct ? "All pairs matched correctly!" : `You matched ${matched.size} of ${pairs.length}.`,
        xp: correct ? (step.xp || 15) : Math.floor((matched.size / Math.max(pairs.length, 1)) * (step.xp || 15))
      };
    }
  };
}

// ============================================================
// 7. LESSON ENGINE
// ============================================================

class LessonEngine {
  constructor() {
    // URL params
    this.courseId     = null;
    this.lessonNumber = null;
    this.contentId    = null;

    // Data
    this.course   = null;
    this.lesson   = null;
    this.steps    = [];
    this.lessonXP = 0;

    // Step state
    this.currentIndex    = -1;
    this.currentRenderer = null;
    this.isReviewMode    = false;

    // Progress
    this.totalSteps     = 0;
    this.completedSteps = 0;
    this.progressPct    = 0;
    this.progressXP     = 0;
    this.resumeIndex    = 0;
    this.hasSavedProgress = false;
    this.userEmail      = null;

    // Session stats
    this.xpEarned     = 0;
    this.streak       = 0;
    this.bestStreak   = 0;
    this.correctCount = 0;
    this.totalChecked = 0;
    this.startTime    = null;
    this.stepResults  = [];

    // DOM element cache
    this.els = {};
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // --- Startup ---

  init() {
    this.cacheEls();
    this.bindEvents();
    this.parseURL();
    this.loadLesson();
  }

  cacheEls() {
    [
      "lesLoadingScreen", "lesIntroScreen", "lesStepScreen", "lesCompleteScreen",
      "lesProgressFill", "lesStreakCount", "lesXpCount", "lesStreakPill", "lesXpPill",
      "lesIntroBadge", "lesIntroKicker", "lesIntroTitle", "lesIntroDesc",
      "lesIntroTime", "lesIntroXP", "lesIntroSteps", "lesIntroObjectives",
      "lesResumeHint", "lesStartBtn",
      "lesStepContainer", "lesStepFooter", "lesCheckBtn", "lesSkipBtn",

      "lesFeedbackOverlay", "lesFeedbackCard", "lesFeedbackIcon",
      "lesFeedbackTitle", "lesFeedbackText", "lesFeedbackXP", "lesFeedbackXPAmount",
      "lesFeedbackContinue",
      "lesCompleteSubtitle", "lesCompleteXP", "lesCompleteAccuracy",
      "lesCompleteStreak", "lesCompleteTime", "lesCompleteReview",
      "lesNextLessonBtn", "lesReviewBtn", "lesBackToCourseBtn",
      "lesXpPopup", "lesXpPopupText", "lesStreakPopup", "lesStreakPopupText",
      "lesCloseBtn", "lesConfetti"
    ].forEach(id => { this.els[id] = document.getElementById(id); });
  }

  bindEvents() {
    this.els.lesStartBtn?.addEventListener("click", () => this.startLesson());
    this.els.lesCheckBtn?.addEventListener("click", () => this.checkAnswer());
    this.els.lesSkipBtn?.addEventListener("click", () => this.skipStep());
    this.els.lesFeedbackContinue?.addEventListener("click", () => this.dismissFeedback());
    this.els.lesNextLessonBtn?.addEventListener("click", () => this.goToNextLesson());
    this.els.lesReviewBtn?.addEventListener("click", () => this.reviewMistakes());
    this.els.lesCloseBtn?.addEventListener("click", e => {
      e?.preventDefault();
      this.saveSnapshot("exit");
      window.location.href = this.els.lesCloseBtn?.href || "courses.html";
    });

    // Enter submits / dismisses; Escape closes feedback
    document.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        if (this.els.lesFeedbackOverlay?.style.display !== "none") this.dismissFeedback();
        else if (this.els.lesCheckBtn && !this.els.lesCheckBtn.disabled) this.checkAnswer();
      }
      if (e.key === "Escape" && this.els.lesFeedbackOverlay?.style.display !== "none") this.dismissFeedback();
    });

    // Save progress when the tab is hidden or the window closes
    document.addEventListener("visibilitychange", () => { if (document.hidden) this.saveSnapshot("visibility"); });
    window.addEventListener("beforeunload", () => this.saveSnapshot("unload"));
  }

  parseURL() {
    const params      = new URLSearchParams(window.location.search);
    this.courseId     = params.get("course_id") || params.get("course");
    const rawLesson   = Number(params.get("lesson") || 0);
    this.lessonNumber = Number.isFinite(rawLesson) && rawLesson > 0 ? rawLesson : 1;
    this.contentId    = params.get("content_id") || params.get("content");
    this.updateBackLinks();
  }

  updateBackLinks() {
    if (!this.courseId) return;
    const p = new URLSearchParams({ id: this.courseId });
    if (this.contentId) p.set("content_id", this.contentId);
    const url = `course.html?${p.toString()}`;
    if (this.els.lesCloseBtn)        this.els.lesCloseBtn.href = url;
    if (this.els.lesBackToCourseBtn) this.els.lesBackToCourseBtn.href = url;
  }

  // --- Loading ---

  showError(message) {
    this.showScreen("lesLoadingScreen");
    if (this.els.lesLoadingScreen) {
      this.els.lesLoadingScreen.innerHTML = `
        <div class="les-error">
          <i class="bi bi-exclamation-triangle"></i>
          <h3>Lesson unavailable</h3>
          <p>${escHtml(message || "We couldn't load this lesson. Please go back and try again.")}</p>
          <a href="courses.html" class="les-btn les-btn-primary">Browse Courses</a>
        </div>`;
    }
  }

  loadLesson() {
    const timeout = setTimeout(() => {
      document.body.classList.remove("net-loading");
      this.showError("Lesson took too long to load.");
    }, 5000);

    try {
      // Resolve course and lesson from content map
      this.course = resolveCourse(this.courseId, this.contentId);
      this.lesson = getLessonByNumber(this.course, this.lessonNumber);

      // Fallback: try lesson 1 if the lesson number is out of range
      if (this.course && !this.lesson) {
        this.lessonNumber = 1;
        this.lesson = getLessonByNumber(this.course, 1);
      }

      // Final fallback: use the first course in the map
      if (!this.course) {
        const map     = getContentMap();
        const firstId = Object.keys(map)[0];
        if (!firstId) { clearTimeout(timeout); this.showError("No course content found."); return; }
        this.courseId  = firstId;
        this.contentId = firstId;
        this.course    = map[firstId];
        this.lessonNumber = this.lessonNumber || 1;
        this.lesson    = getLessonByNumber(this.course, this.lessonNumber) || getLessonByNumber(this.course, 1);
        this.updateBackLinks();
      }

      if (!this.lesson) { clearTimeout(timeout); this.showError("We couldn't find this lesson."); return; }

      this.steps    = buildSteps(this.lesson);
      this.totalSteps = Math.max(1, this.steps.length);
      this.lessonXP = getLessonXP(this.course, this.lessonNumber) || Number(this.lesson.xp) || 50;
      this.restoreProgress();
      this.showIntro();
    } catch (err) {
      console.error("Lesson load failed:", err);
      this.showError("A loading error occurred. Please refresh and try again.");
    } finally {
      clearTimeout(timeout);
      document.body.classList.remove("net-loading");
    }
  }

  // --- Screens ---

  showScreen(id) {
    ["lesLoadingScreen", "lesIntroScreen", "lesStepScreen", "lesCompleteScreen"].forEach(screenId => {
      const el = this.els[screenId];
      if (el) el.style.display = screenId === id ? "" : "none";
    });
  }

  // --- Intro screen ---

  showIntro() {
    this.showScreen("lesIntroScreen");

    const diffIcons = { novice: "bi-shield", intermediate: "bi-shield-check", advanced: "bi-shield-fill-exclamation" };
    const diff = (this.course.difficulty || "novice").toLowerCase();
    if (this.els.lesIntroBadge) {
      this.els.lesIntroBadge.innerHTML = `<i class="bi ${diffIcons[diff] || "bi-book"}"></i>`;
      this.els.lesIntroBadge.dataset.difficulty = diff;
    }

    const setText = (id, val) => { if (this.els[id]) this.els[id].textContent = val; };
    setText("lesIntroKicker",  `LESSON ${this.lessonNumber}`);
    setText("lesIntroTitle",   this.lesson.title || "Lesson");
    setText("lesIntroDesc",    this.lesson.learn || this.lesson.summary || "");
    setText("lesIntroTime",    this.lesson.duration || this.course.estimatedTime || "10 min");
    setText("lesIntroXP",      `${this.lessonXP} XP`);
    setText("lesIntroSteps",   `${this.steps.length} steps`);

    if (this.els.lesIntroObjectives && Array.isArray(this.lesson.objectives)) {
      this.els.lesIntroObjectives.innerHTML = this.lesson.objectives.map(obj =>
        `<div class="les-intro-obj"><i class="bi bi-check-circle"></i><span>${escHtml(obj)}</span></div>`
      ).join("");
    }

    document.title = `Netology – ${this.lesson.title}`;
    if (this.els.lesStartBtn) this.els.lesStartBtn.textContent = this.hasSavedProgress ? "Continue Lesson" : "Start Lesson";
    if (this.els.lesResumeHint) {
      this.els.lesResumeHint.style.display = this.hasSavedProgress ? "" : "none";
      if (this.hasSavedProgress) this.els.lesResumeHint.textContent = `Resume at ${this.progressPct}% complete`;
    }
  }

  // --- Progress ---

  restoreProgress() {
    const user = getCurrentUser();
    this.userEmail = user?.email || null;
    const saved = readProgress(this.userEmail, this.courseId, this.lessonNumber);

    if (!saved) {
      this.completedSteps = 0; this.progressPct = 0;
      this.progressXP = 0;    this.xpEarned    = 0;
      this.resumeIndex = 0;   this.hasSavedProgress = false;
      return;
    }

    const completed  = clamp(Number(saved.completed_steps || 0), 0, this.totalSteps);
    const pct        = Math.max(Math.round((completed / this.totalSteps) * 100), clamp(Number(saved.progress_pct || 0), 0, 100));
    const targetXP   = computeProgressXP(this.lessonXP, pct);

    this.completedSteps   = completed;
    this.progressPct      = pct;
    this.progressXP       = Math.min(targetXP, clamp(Number(saved.xp_earned || targetXP), 0, this.lessonXP));
    this.xpEarned         = this.progressXP;
    this.hasSavedProgress = pct > 0 && pct < 100;
    this.resumeIndex      = pct >= 100 ? 0 : clamp(Number(saved.resume_step ?? completed), 0, Math.max(0, this.totalSteps - 1));

    if (this.els.lesXpCount) this.els.lesXpCount.textContent = String(this.xpEarned);
  }

  persistProgress(completedSteps, resumeIndex, reason = "progress") {
    if (!this.courseId || !this.lessonNumber) return;
    const safeCompleted = clamp(Number(completedSteps || 0), 0, this.totalSteps);
    const pct      = Math.round((safeCompleted / this.totalSteps) * 100);
    const targetXP = computeProgressXP(this.lessonXP, pct);
    const existing = readProgress(this.userEmail, this.courseId, this.lessonNumber);

    writeProgress(this.userEmail, this.courseId, this.lessonNumber, {
      course_id:       String(this.courseId),
      lesson_number:   Number(this.lessonNumber),
      total_steps:     this.totalSteps,
      completed_steps: Math.max(clamp(Number(existing?.completed_steps || 0), 0, this.totalSteps), safeCompleted),
      progress_pct:    Math.max(clamp(Number(existing?.progress_pct || 0), 0, 100), pct),
      xp_earned:       Math.max(clamp(Number(existing?.xp_earned || 0), 0, this.lessonXP), targetXP),
      soft_completed:  pct >= SOFT_PCT,
      resume_step:     Number.isFinite(resumeIndex) ? clamp(resumeIndex, 0, Math.max(0, this.totalSteps - 1)) : undefined,
      updated_at:      new Date().toISOString()
    });
  }

  saveSnapshot(reason = "snapshot") {
    if (!this.steps.length) return;
    const idx = this.currentIndex >= 0 ? this.currentIndex : this.completedSteps;
    this.persistProgress(idx, idx, reason);
  }

  advanceProgress(completedSteps) {
    if (this.isReviewMode) return 0;
    const safeCompleted = clamp(Number(completedSteps || 0), 0, this.totalSteps);
    const pct      = Math.round((safeCompleted / this.totalSteps) * 100);
    const targetXP = computeProgressXP(this.lessonXP, pct);
    const delta    = Math.max(0, targetXP - this.progressXP);

    this.completedSteps   = safeCompleted;
    this.progressPct      = pct;
    this.hasSavedProgress = pct > 0 && pct < 100;

    if (delta > 0) {
      this.addXP(delta);
      this.progressXP = targetXP;
    } else {
      this.progressXP = targetXP;
      this.xpEarned   = targetXP;
      this.updateStats();
    }

    this.persistProgress(safeCompleted, safeCompleted);
    return delta;
  }

  // --- Step flow ---

  startLesson() {
    this.startTime = Date.now();
    this.showScreen("lesStepScreen");
    this.loadStep(Number.isFinite(this.resumeIndex) ? this.resumeIndex : 0);
  }

  loadStep(index) {
    if (index >= this.steps.length) { this.showCompletion(); return; }

    this.currentIndex = index;
    const step      = this.steps[index];
    const container = this.els.lesStepContainer;
    const checkBtn  = this.els.lesCheckBtn;
    const skipBtn   = this.els.lesSkipBtn;

    if (container) container.innerHTML = "";
    if (checkBtn)  { checkBtn.disabled = true; checkBtn.textContent = "Check"; }
    if (this.els.lesProgressFill) {
      this.els.lesProgressFill.style.width = `${(index / this.steps.length) * 100}%`;
    }

    // Build the renderer for this step type
    let renderer;
    try {
      renderer = this.buildRenderer(step, checkBtn, skipBtn);
    } catch (err) {
      console.error("Render failed:", err, step);
      renderer = renderLearnStep({ type: "learn", title: "Error", lines: ["This step couldn't load. Keep going!"] });
      if (checkBtn) { checkBtn.textContent = "Continue"; checkBtn.disabled = false; }
      if (skipBtn) skipBtn.style.display = "none";
    }

    this.currentRenderer = renderer;

    if (container && renderer?.el) {
      container.appendChild(renderer.el);
      renderer.el.classList.add("les-step-enter");
      container.scrollTop = 0;
      try { window.scrollTo({ top: 0, behavior: this.reducedMotion ? "auto" : "smooth" }); }
      catch { window.scrollTo(0, 0); }
    }
  }

  buildRenderer(step, checkBtn, skipBtn) {
    const showSkip = show => { if (skipBtn) skipBtn.style.display = show ? "" : "none"; };

    switch (step.type) {
      case "learn":
        if (checkBtn) { checkBtn.textContent = "Continue"; checkBtn.disabled = false; }
        showSkip(false);
        return renderLearnStep(step);

      case "mcq":
        showSkip(true);
        return renderMCQ(step);

      case "matching":
        showSkip(true);
        return renderMatching(step);

      default:
        if (checkBtn) { checkBtn.textContent = "Continue"; checkBtn.disabled = false; }
        showSkip(false);
        return renderLearnStep({ type: "learn", title: "Step", lines: ["Continue to the next step."] });
    }
  }

  checkAnswer() {
    const renderer = this.currentRenderer;
    if (!renderer) return;

    // Learn card — just advance
    if (renderer.type === "learn") {
      this.stepResults.push({ type: "learn", correct: true, step: this.steps[this.currentIndex] });
      this.advanceProgress(this.currentIndex + 1);
      this.loadStep(this.currentIndex + 1);
      return;
    }

    // Interactive — check answer, update streak, show feedback
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
    this.stepResults.push({ type: renderer.type, correct: result.correct, step: this.steps[this.currentIndex] });
    const xpDelta = this.advanceProgress(this.currentIndex + 1);
    this.showFeedback(result.correct, result.explanation, xpDelta);
  }

  skipStep() {
    this.stepResults.push({ type: this.currentRenderer?.type || "unknown", correct: false, skipped: true, step: this.steps[this.currentIndex] });
    this.streak = 0;
    this.updateStats();
    this.advanceProgress(this.currentIndex + 1);
    this.loadStep(this.currentIndex + 1);
  }

  // --- Feedback overlay ---

  showFeedback(correct, explanation, xp) {
    if (!this.els.lesFeedbackOverlay) return;
    this.els.lesFeedbackOverlay.style.cssText = "display:flex;position:fixed;inset:0;z-index:9999;align-items:center;justify-content:center;";
    this.els.lesFeedbackCard.className = `les-feedback-card ${correct ? "is-correct" : "is-wrong"}`;
    this.els.lesFeedbackIcon.innerHTML = correct
      ? '<i class="bi bi-check-circle-fill"></i>'
      : '<i class="bi bi-x-circle-fill"></i>';
    this.els.lesFeedbackTitle.textContent = correct ? "Correct!" : "Incorrect";
    this.els.lesFeedbackText.textContent  = explanation || "";
    if (xp && xp > 0) {
      this.els.lesFeedbackXP.style.display = "";
      this.els.lesFeedbackXPAmount.textContent = `+${xp} XP`;
    } else {
      this.els.lesFeedbackXP.style.display = "none";
    }
    this.els.lesFeedbackContinue?.focus();
  }

  dismissFeedback() {
    if (this.els.lesFeedbackOverlay) this.els.lesFeedbackOverlay.style.display = "none";
    this.loadStep(this.currentIndex + 1);
  }

  // --- Stats and popups ---

  addXP(amount) {
    if (!amount) return;
    this.xpEarned += amount;
    this.showXPPopup(amount);
    this.updateStats();
  }

  updateStats() {
    if (this.els.lesStreakCount) this.els.lesStreakCount.textContent = String(this.streak);
    if (this.els.lesXpCount)    this.els.lesXpCount.textContent    = String(this.xpEarned);
    if (this.streak >= 2) this.els.lesStreakPill?.classList.add("is-active");
    else this.els.lesStreakPill?.classList.remove("is-active");
  }

  showXPPopup(amount) {
    const popup = this.els.lesXpPopup;
    const text  = this.els.lesXpPopupText;
    if (!popup || !text) return;
    text.textContent = `+${amount} XP`;
    popup.classList.remove("is-show");
    void popup.offsetWidth;
    popup.classList.add("is-show");
    popup.setAttribute("aria-hidden", "false");
    setTimeout(() => { popup.classList.remove("is-show"); popup.setAttribute("aria-hidden", "true"); }, 1500);
  }

  showStreakPopup() {
    if (this.streak < 2) return;
    const popup = this.els.lesStreakPopup;
    const text  = this.els.lesStreakPopupText;
    if (!popup || !text) return;
    const phrases = { 2: "Double!", 3: "Triple!", 4: "On fire!", 5: "Unstoppable!" };
    text.textContent = `${this.streak} in a row! ${phrases[this.streak] || "Amazing!"}`;
    popup.classList.remove("is-show");
    void popup.offsetWidth;
    popup.classList.add("is-show");
    popup.setAttribute("aria-hidden", "false");
    setTimeout(() => { popup.classList.remove("is-show"); popup.setAttribute("aria-hidden", "true"); }, 2000);
  }

  // --- Completion screen ---

  showCompletion() {
    this.showScreen("lesCompleteScreen");
    this.persistProgress(this.totalSteps, 0, "complete");
    if (this.els.lesProgressFill) this.els.lesProgressFill.style.width = "100%";

    const elapsed  = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    const mins     = Math.floor(elapsed / 60);
    const secs     = elapsed % 60;
    const accuracy = this.totalChecked > 0 ? Math.round((this.correctCount / this.totalChecked) * 100) : 100;

    if (this.els.lesCompleteXP)       this.els.lesCompleteXP.textContent       = String(this.xpEarned);
    if (this.els.lesCompleteAccuracy) this.els.lesCompleteAccuracy.textContent = `${accuracy}%`;
    if (this.els.lesCompleteStreak)   this.els.lesCompleteStreak.textContent   = String(this.bestStreak);
    if (this.els.lesCompleteTime)     this.els.lesCompleteTime.textContent     = `${mins}:${String(secs).padStart(2, "0")}`;

    const mastered = readProgress(this.userEmail, this.courseId, this.lessonNumber)?.progress_pct >= 100;
    if (this.els.lesCompleteSubtitle) {
      this.els.lesCompleteSubtitle.textContent = mastered
        ? `🏆 Lesson Mastered – "${this.lesson.title}"`
        : `You've completed "${this.lesson.title}"`;
    }

    // Per-step review (interactive steps only)
    if (this.els.lesCompleteReview) {
      const interactive = this.stepResults.filter(r => r.type !== "learn");
      this.els.lesCompleteReview.innerHTML = interactive.length
        ? interactive.map((r, i) => `
          <div class="les-review-item ${r.correct ? "is-correct" : r.skipped ? "is-skipped" : "is-wrong"}">
            <span class="les-review-icon">
              ${r.correct ? '<i class="bi bi-check-circle-fill"></i>' : r.skipped ? '<i class="bi bi-skip-forward-fill"></i>' : '<i class="bi bi-x-circle-fill"></i>'}
            </span>
            <span class="les-review-text">${escHtml(r.step?.question || r.step?.prompt || `Exercise ${i + 1}`)}</span>
          </div>`).join("")
        : '<p class="text-muted">All steps were reading content — well done!</p>';
    }

    this.fireConfetti();
    this.reportCompletion();
  }

  fireConfetti() {
    const container = this.els.lesConfetti;
    if (!container || this.reducedMotion) return;
    const colors = ["#0d9488", "#06b6d4", "#f97316", "#8b5cf6", "#ec4899", "#22c55e", "#f59e0b"];
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement("div");
      piece.className = "les-confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.backgroundColor = colors[i % colors.length];
      piece.style.animationDelay    = `${Math.random() * 0.5}s`;
      piece.style.animationDuration = `${1 + Math.random() * 2}s`;
      container.appendChild(piece);
    }
    setTimeout(() => { container.innerHTML = ""; }, 4000);
  }

  // --- Navigation ---

  goToNextLesson() {
    const total = getTotalLessons(this.course);
    const p = new URLSearchParams({ course_id: this.courseId });
    if (this.contentId) p.set("content_id", this.contentId);
    if (this.lessonNumber < total) {
      p.set("lesson", String(this.lessonNumber + 1));
      window.location.href = `lesson.html?${p.toString()}`;
    } else {
      window.location.href = `course.html?id=${this.courseId}${this.contentId ? `&content_id=${this.contentId}` : ""}`;
    }
  }

  reviewMistakes() {
    const mistakes = this.stepResults.filter(r => !r.correct && !r.skipped && r.type !== "learn");
    if (!mistakes.length) {
      if (this.els.lesReviewBtn) this.els.lesReviewBtn.textContent = "No mistakes!";
      return;
    }
    this.isReviewMode   = true;
    this.steps          = mistakes.map(m => m.step);
    this.currentIndex   = -1;
    this.correctCount   = 0;
    this.totalChecked   = 0;
    this.streak         = 0;
    this.stepResults    = [];
    this.showScreen("lesStepScreen");
    this.loadStep(0);
  }

  // --- API reporting ---

  async reportCompletion() {
    const user = getCurrentUser();
    if (!user?.email || !this.courseId || !this.lessonNumber) return;
    const api = getAPI();
    if (!api) return;

    const xpToReport = Math.max(0, Number(this.xpEarned || this.lessonXP || 0));
    const path = ENDPOINTS.courses?.completeLesson || "/complete-lesson";

    try {
      const res = await fetch(`${api}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeEmail(user.email),
          course_id: String(this.courseId),
          lesson_number: this.lessonNumber,
          earned_xp: xpToReport,
          progress_pct: 100,
          completed_stamp: true,
          mastered: true
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.message || `HTTP ${res.status}`);

      if (Number(data.xp_added) > 0)             bumpUserXP(user.email, data.xp_added);
      if (Number(data.achievement_xp_added) > 0) bumpUserXP(user.email, data.achievement_xp_added);

      const unlocked = Array.isArray(data.newly_unlocked) ? data.newly_unlocked : [];
      if (unlocked.length && window.NetologyAchievements?.queueUnlocks) {
        window.NetologyAchievements.queueUnlocks(normalizeEmail(user.email), unlocked);
      }
    } catch (e) {
      console.warn("Completion report failed:", e);
      // XP-only fallback
      if (xpToReport) {
        awardLessonXP(normalizeEmail(user.email), this.courseId, this.lessonNumber, xpToReport, xpToReport)
          .then(r => { if (r?.success && Number(r.xp_added) > 0) bumpUserXP(user.email, r.xp_added); })
          .catch(() => {});
      }
    }
  }
}

// ============================================================
// 8. PAGE CHROME — sidebar, user dropdown, identity fill
// ============================================================

function wireSidebar() {
  const openBtn  = document.getElementById("openSidebarBtn");
  const closeBtn = document.getElementById("closeSidebarBtn");
  const sidebar  = document.getElementById("slideSidebar");
  const backdrop = document.getElementById("sideBackdrop");

  const open  = () => { sidebar?.classList.add("is-open");    backdrop?.classList.add("is-open");    document.body.classList.add("net-noscroll");    sidebar?.setAttribute("aria-hidden", "false"); };
  const close = () => { sidebar?.classList.remove("is-open"); backdrop?.classList.remove("is-open"); document.body.classList.remove("net-noscroll"); sidebar?.setAttribute("aria-hidden", "true");  };

  openBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && sidebar?.classList.contains("is-open")) close(); });
}

function wireUserDropdown() {
  const btn = document.getElementById("userBtn");
  const dd  = document.getElementById("userDropdown");
  if (!btn || !dd) return;
  btn.addEventListener("click", e => {
    e.stopPropagation();
    btn.setAttribute("aria-expanded", String(dd.classList.toggle("is-open")));
  });
  document.addEventListener("click", e => {
    if (!dd.contains(e.target) && !btn.contains(e.target)) {
      dd.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

function fillIdentity(user) {
  const name    = user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user?.username || "Student");
  const initial = (name || "S").charAt(0).toUpperCase();
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set("topAvatar", initial);  set("ddName", name);       set("ddEmail", user?.email || "");
  set("sideAvatar", initial); set("sideUserName", name); set("sideUserEmail", user?.email || "");
}

function wireChrome(user) {
  wireSidebar();
  wireUserDropdown();
  fillIdentity(user);
  const logout = () => {
    ["netology_user", "user", "netology_token"].forEach(k => localStorage.removeItem(k));
    window.location.href = "index.html";
  };
  document.getElementById("topLogoutBtn")?.addEventListener("click", logout);
  document.getElementById("sideLogoutBtn")?.addEventListener("click", logout);
}

// ============================================================
// 9. BOOT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const user = getCurrentUser();
  if (user) wireChrome(user);
  const engine = new LessonEngine();
  engine.init();
  window.lessonEngine = engine;
});
