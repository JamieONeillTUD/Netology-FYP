/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: lesson.js
Purpose: Runs the interactive lesson flow, step checking, XP updates, and completion logic.
Notes: Kept full lesson behavior and cleaned comments for simpler readability.
---------------------------------------------------------
*/

// Helpers.
// Resolve API base lazily so it always picks up the value set by config.js
function getLessonAPI() {
  return (window.API_BASE || "").replace(/\/$/, "");
}

function getCourseContentMap() {
  if (typeof window !== "undefined" && window.COURSE_CONTENT) return window.COURSE_CONTENT;
  if (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) return COURSE_CONTENT;
  return {};
}
const XP = window.NetologyXP || null;

function getCurrentUser() {
  try {
    const storedUserJson = localStorage.getItem("netology_user") || localStorage.getItem("user");
    return storedUserJson ? JSON.parse(storedUserJson) : null;
  } catch { return null; }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function totalXpForLevel(level) {
  return XP?.totalXpForLevel ? XP.totalXpForLevel(level) : 0;
}

function levelFromTotalXp(totalXp) {
  return XP?.levelFromTotalXp ? XP.levelFromTotalXp(totalXp) : 1;
}

function rankForLevel(level) {
  return XP?.rankForLevel ? XP.rankForLevel(level) : "Novice";
}

function applyXpToUser(userData, additionalXp) {
  if (XP?.applyXpToUser) return XP.applyXpToUser(userData, additionalXp);
  const xpToAdd = Math.max(0, Number(additionalXp) || 0);
  const current = userData && typeof userData === "object" ? userData : {};
  return { ...current, xp: Math.max(0, Number(current.xp || 0) + xpToAdd) };
}

function bumpUserXP(email, additionalXp) {
  if (!additionalXp) return;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  ["user", "netology_user"].forEach((storageKey) => {
    const currentUser = safeParseJson(localStorage.getItem(storageKey), null);
    if (!currentUser) return;
    if (normalizeEmail(currentUser.email) !== normalizedEmail) return;

    const updatedUser = applyXpToUser(currentUser, additionalXp);
    localStorage.setItem(storageKey, JSON.stringify(updatedUser));
  });
}

function resolveCourseContent(courseId, contentId) {
  const contentMap = getCourseContentMap();
  if (contentId && contentMap[String(contentId)]) return contentMap[String(contentId)];
  if (courseId && contentMap[String(courseId)]) return contentMap[String(courseId)];
  return null;
}

function getLessonByNumber(course, lessonNumber) {
  if (!course?.units) return null;
  const targetLesson = Number(lessonNumber);
  if (!Number.isFinite(targetLesson) || targetLesson <= 0) return null;

  let lessonIndex = 0;
  for (const unit of course.units) {
    if (!Array.isArray(unit.lessons)) continue;
    for (const lesson of unit.lessons) {
      lessonIndex += 1;
      if (lessonIndex === targetLesson) return { ...lesson, unit_title: unit.title || "Module" };
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
  let totalLessons = 0;
  for (const unit of course.units) totalLessons += (unit.lessons?.length || 0);
  return totalLessons;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let currentIndex = shuffled.length - 1; currentIndex > 0; currentIndex -= 1) {
    const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
    [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
  }
  return shuffled;
}

function escHtml(text) {
  const tempElement = document.createElement("div");
  tempElement.textContent = text;
  return tempElement.innerHTML;
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

// Step builder: convert lesson blocks into interactive steps.

/**
 * Converts an objective like "Explain why protocols matter"
 * into a proper question like "Why do protocols matter?"
 */
function objectiveToQuestion(objective) {
  const clean = String(objective || "").trim().replace(/\.$/, "");

  function toWhyQuestion(phrase) {
    const p = String(phrase || "").trim().replace(/\?$/, "");
    let m = p.match(/^(.+?)\s+is\s+(.+)$/i);
    if (m) return `Why is ${m[1]} ${m[2]}?`;
    m = p.match(/^(.+?)\s+are\s+(.+)$/i);
    if (m) return `Why are ${m[1]} ${m[2]}?`;
    return `Why ${p}?`;
  }

  function toHowQuestion(phrase) {
    const p = String(phrase || "").trim().replace(/\?$/, "");
    let m = p.match(/^(.+?)\s+is\s+(.+)$/i);
    if (m) return `How is ${m[1]} ${m[2]}?`;
    m = p.match(/^(.+?)\s+are\s+(.+)$/i);
    if (m) return `How are ${m[1]} ${m[2]}?`;
    m = p.match(/^(.+?)\s+([a-z]+)s\s+(.+)$/i);
    if (m) return `How does ${m[1]} ${m[2]} ${m[3]}?`;
    return `How ${p}?`;
  }

  const match = clean.match(/^(\w+)\s+(.+)$/i);
  if (match) {
    const verb = match[1].toLowerCase();
    const rest = match[2].trim();

    if (verb === "define") {
      let m = rest.match(/^what\s+(.+?)\s+is$/i);
      if (m) return `What is ${m[1]}?`;
      m = rest.match(/^what\s+(.+)$/i);
      if (m) return `What is ${m[1]}?`;
      return `What is ${rest}?`;
    }

    if (verb === "explain") {
      if (/^why\s+/i.test(rest)) return toWhyQuestion(rest.replace(/^why\s+/i, ""));
      if (/^how\s+/i.test(rest)) return toHowQuestion(rest.replace(/^how\s+/i, ""));
      return `Why is ${rest} important?`;
    }

    if (verb === "identify") return `What are ${rest}?`;
    if (verb === "describe") {
      if (/^why\s+/i.test(rest)) return toWhyQuestion(rest.replace(/^why\s+/i, ""));
      if (/^how\s+/i.test(rest)) return toHowQuestion(rest.replace(/^how\s+/i, ""));
      return `How would you describe ${rest}?`;
    }
    if (verb === "distinguish") {
      const m = rest.match(/^(.+?)\s+from\s+(.+)$/i);
      if (m) return `How do ${m[1]} and ${m[2]} differ?`;
      return `How would you distinguish ${rest}?`;
    }
    if (verb === "list") return `What are ${rest}?`;
    if (verb === "compare") {
      if (/^how\s+/i.test(rest)) return `How do ${rest.replace(/^how\s+/i, "")} compare?`;
      return `How do ${rest} compare?`;
    }
    if (verb === "understand") return `What should you understand about ${rest}?`;
    if (verb === "demonstrate") return `How would you demonstrate ${rest}?`;
    if (verb === "apply") return `When would you apply ${rest}?`;
    if (verb === "recognise" || verb === "recognize") return `How would you recognize ${rest}?`;
    if (verb === "name") return `Can you name ${rest}?`;
    if (verb === "outline") return `What does ${rest} involve?`;
    if (verb === "summarise" || verb === "summarize") return `How would you summarize ${rest}?`;
  }
  return clean.endsWith("?") ? clean : `${clean}?`;
}

function normalizeWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function collectLessonKnowledgeLines(lesson) {
  const raw = [];
  if (Array.isArray(lesson.content)) raw.push(...lesson.content);

  if (Array.isArray(lesson.blocks)) {
    lesson.blocks.forEach((block) => {
      if (block.type === "text") {
        const lines = Array.isArray(block.text) ? block.text : [block.text || ""];
        raw.push(...lines);
      } else if (block.type === "explain") {
        const lines = Array.isArray(block.content) ? block.content : [block.content || ""];
        raw.push(...lines);
      }
    });
  }

  if (lesson.summary) raw.push(lesson.summary);

  const seen = new Set();
  return raw
    .map(normalizeWhitespace)
    .filter(Boolean)
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function extractObjectiveKeywords(objective) {
  const verbs = new Set([
    "define", "explain", "identify", "describe", "list", "compare",
    "understand", "demonstrate", "apply", "recognise", "recognize",
    "name", "outline", "summarise", "summarize"
  ]);
  const stop = new Set([
    "a", "an", "the", "and", "or", "to", "of", "in", "on", "for",
    "with", "by", "how", "why", "what", "when", "where", "is", "are",
    "be", "that", "this", "these", "those"
  ]);

  return normalizeWhitespace(objective)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !verbs.has(w) && !stop.has(w));
}

function findBestAnswerForObjective(objective, lessonLines, fallback) {
  const lines = Array.isArray(lessonLines) ? lessonLines : [];
  if (!lines.length) return fallback || normalizeWhitespace(objective);

  const keywords = extractObjectiveKeywords(objective);
  const objectiveLower = String(objective || "").toLowerCase();
  if (!keywords.length) return fallback || lines[0];

  function keywordVariants(kw) {
    const variants = new Set([kw]);
    if (kw.endsWith("ing") && kw.length > 5) variants.add(kw.slice(0, -3));
    if (kw.endsWith("ed") && kw.length > 4) variants.add(kw.slice(0, -2));
    if (kw.endsWith("es") && kw.length > 4) variants.add(kw.slice(0, -2));
    if (kw.endsWith("s") && kw.length > 3) variants.add(kw.slice(0, -1));
    return [...variants].filter(v => v.length >= 3);
  }

  function countMatches(line, words, objectiveText) {
    const lower = line.toLowerCase();
    let score = 0;

    words.forEach((word) => {
      const forms = keywordVariants(word);
      const startsWith = forms.some((f) => {
        const safe = f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`^${safe}\\b`, "i").test(lower);
      });
      const hasWord = forms.some((f) => {
        const safe = f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`\\b${safe}\\b`, "i").test(lower);
      });
      if (startsWith) score += 2;
      else if (hasWord) score += 1;
    });

    if (/^(identify|list)\b/.test(objectiveText) && /\b(include|includes|including|such as)\b/.test(lower)) {
      score += 1;
    }

    if (/^explain\b/.test(objectiveText) && keywords.some((word) => {
      const forms = keywordVariants(word);
      return forms.some((f) => {
        const safe = f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`^${safe}\\b`, "i").test(lower);
      });
    })) {
      score += 1;
    }

    if (/^(define|distinguish)\b/.test(objectiveText) && /\b(is|are|means|refers)\b/.test(lower)) {
      score += 1;
    }

    if (/\bexample\b/.test(lower) && !/\bexample\b/.test(objectiveText)) {
      score -= 1;
    }

    return Math.max(0, score);
  }

  let bestLine = "";
  let bestScore = 0;

  lines.forEach((line) => {
    const score = countMatches(line, keywords, objectiveLower);
    if (score > bestScore || (score === bestScore && score > 0 && !bestLine)) {
      bestLine = line;
      bestScore = score;
    }
  });

  return bestScore > 0 ? bestLine : (fallback || lines[0]);
}

function buildFlashcardStepFromLesson(lesson) {
  if (!lesson.summary || !Array.isArray(lesson.objectives) || lesson.objectives.length < 2) return null;

  const summary = normalizeWhitespace(lesson.summary);
  const lessonLines = collectLessonKnowledgeLines(lesson);
  const cards = [
    {
      front: "What is the main takeaway from this lesson?",
      back: summary
    }
  ];

  lesson.objectives.slice(0, 3).forEach((objective) => {
    cards.push({
      front: objectiveToQuestion(objective),
      back: findBestAnswerForObjective(objective, lessonLines, summary)
    });
  });

  return { type: "flashcard", cards };
}

function buildStepsFromLesson(lesson, course) {
  const steps = [];
  const flashcardStep = buildFlashcardStepFromLesson(lesson);

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
            type: "sentence_complete",
            prompt: "Finish the sentence:",
            sentence: blanked,
            answer: cleanWord,
            options: shuffleArray([cleanWord, ...distractors.slice(0, 3)]),
            xp: 10
          });
        }
      }
    }
  }

  // If no interactive steps were generated, ensure at least one MCQ.
  if (steps.filter((step) => step.type !== "learn" && step.type !== "flashcard").length === 0) {
    steps.push({
      type: "mcq",
      question: `What is the main topic of "${lesson.title}"?`,
      options: [lesson.summary || "The core concept", "An unrelated idea", "None of the above", "All options are wrong"],
      correctIndex: 0,
      explanation: lesson.summary || "Review the lesson content for more details.",
      xp: 10
    });
  }

  // 3. Flashcard recap as the final lesson step.
  if (flashcardStep) {
    steps.push(flashcardStep);
  }

  return steps;
}


// Exercise renderers.

/**
 * Auto-bold key networking terms within a text node
 */
function highlightKeyTerms(text) {
  const terms = [
    "network", "router", "switch", "firewall", "DNS", "DHCP", "IP", "TCP", "UDP",
    "HTTP", "HTTPS", "LAN", "WAN", "VPN", "MAC", "Ethernet", "Wi-Fi", "bandwidth",
    "latency", "packet", "protocol", "subnet", "gateway", "OSI", "VLAN", "NAT",
    "encryption", "SSL", "TLS", "ACL", "topology", "OSPF", "BGP", "ARP", "ping",
    "byte", "bit", "port", "hub", "bridge", "NIC", "ISP", "cloud"
  ];
  let result = escHtml(text);
  const escaped = terms.map(t => t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  result = result.replace(pattern, (m) => `<strong class="les-key-term">${m}</strong>`);
  return result;
}

/**
 * Renders a learning/content step – redesigned for visual engagement
 */
function renderLearnStep(step) {
  const el = document.createElement("div");
  el.className = "les-step les-step-learn";

  const iconCls = step.style === "callout" ? "bi-lightbulb-fill" : (step.icon || "bi-book-fill");
  const iconColor = step.style === "callout" ? "les-step-icon--callout" : "les-step-icon--learn";

  const header = document.createElement("div");
  header.className = "les-step-header";
  header.innerHTML = `
    <div class="les-step-icon ${iconColor}"><i class="bi ${iconCls}"></i></div>
    <h2 class="les-step-title">${escHtml(step.title)}</h2>
  `;
  el.appendChild(header);

  const lines = Array.isArray(step.content) ? step.content.filter(Boolean) : [step.content || ""];

  if (step.style === "callout") {
    // Highlighted "key concept" callout box
    const callout = document.createElement("div");
    callout.className = "les-learn-callout-card";
    callout.innerHTML = `
      <div class="les-callout-accent"><i class="bi bi-lightbulb-fill"></i> Key Concept</div>
      <div class="les-callout-body">
        ${lines.map(l => `<p>${highlightKeyTerms(l)}</p>`).join("")}
      </div>
    `;
    el.appendChild(callout);

  } else if (step.style === "steps") {
    // Numbered steps
    const stepsWrap = document.createElement("div");
    stepsWrap.className = "les-learn-steps-list";
    lines.forEach((line, i) => {
      const item = document.createElement("div");
      item.className = "les-learn-step-item";
      item.innerHTML = `
        <div class="les-learn-step-num">${i + 1}</div>
        <div class="les-learn-step-text">${highlightKeyTerms(line)}</div>
      `;
      stepsWrap.appendChild(item);
    });
    el.appendChild(stepsWrap);

  } else {
    // Standard content: split into fact blocks, with special rendering for examples
    const wrap = document.createElement("div");
    wrap.className = "les-learn-facts";

    lines.forEach(line => {
      const isExample = /^(example|real.?world|e\.g\.|for instance)/i.test(line.trim());
      const block = document.createElement("div");

      if (isExample) {
        block.className = "les-learn-example";
        block.innerHTML = `
          <span class="les-learn-example-label"><i class="bi bi-play-circle-fill"></i> Example</span>
          <span class="les-learn-example-text">${highlightKeyTerms(line.replace(/^(example|real.?world example|e\.g\.|for instance)[:\s]*/i, ""))}</span>
        `;
      } else {
        block.className = "les-learn-fact";
        block.innerHTML = `
          <i class="bi bi-arrow-right-circle-fill les-learn-fact-icon"></i>
          <span class="les-learn-fact-text">${highlightKeyTerms(line)}</span>
        `;
      }
      wrap.appendChild(block);
    });
    el.appendChild(wrap);
  }

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
 * Renders Flashcard step in a simplified review format.
 */
function renderFlashcard(step) {
  const el = document.createElement("div");
  el.className = "les-step les-step-flashcard";

  const cards = Array.isArray(step.cards) ? step.cards : [];
  let currentCard = 0;
  let answerVisible = false;
  const ratings = new Array(cards.length).fill(null); // null | "know" | "practice"

  el.innerHTML = `
    <div class="les-step-header">
      <div class="les-step-icon les-step-icon--flash"><i class="bi bi-layers-fill"></i></div>
      <h2 class="les-step-prompt">Flashcard Review</h2>
    </div>
    <div class="les-flash-counter-row">
      <span class="les-flash-counter-text">Card <span id="flashCurrent">1</span> of ${cards.length}</span>
      <span class="les-flash-rating-summary"><span id="flashReviewedCount">0</span> reviewed</span>
    </div>
    <p class="les-flash-hint">Show answer, then choose either "I know this" or "Practice again".</p>
    <div class="les-flash-card-wrap">
      <div class="les-flash-card" id="lesFlashCard">
        <div class="les-flash-front">
          <div class="les-flash-category">Question</div>
          <div class="les-flash-text" id="lesFlashFront"></div>
        </div>
        <div class="les-flash-back" id="lesFlashBackWrap" style="display:none">
          <div class="les-flash-category">Answer</div>
          <div class="les-flash-text" id="lesFlashBack"></div>
        </div>
      </div>
    </div>
    <div class="les-flash-reveal-row">
      <button class="les-btn les-btn-ghost les-btn-sm" id="flashRevealBtn">Show answer</button>
    </div>
    <div class="les-flash-rate-row" id="flashRateRow" style="display:none">
      <button class="les-flash-rate-btn les-flash-rate-got" id="flashRateKnow">I know this</button>
      <button class="les-flash-rate-btn les-flash-rate-learning" id="flashRatePractice">Practice again</button>
    </div>
    <div class="les-flash-nav">
      <button class="les-btn les-btn-ghost les-btn-sm" id="flashPrev" disabled>Back</button>
      <button class="les-btn les-btn-primary les-btn-sm" id="flashNext" disabled>Next</button>
    </div>
  `;

  const cardEl = el.querySelector("#lesFlashCard");
  const frontEl = el.querySelector("#lesFlashFront");
  const backEl = el.querySelector("#lesFlashBack");
  const backWrapEl = el.querySelector("#lesFlashBackWrap");
  const revealBtn = el.querySelector("#flashRevealBtn");
  const counterEl = el.querySelector("#flashCurrent");
  const reviewedCountEl = el.querySelector("#flashReviewedCount");
  const prevBtn = el.querySelector("#flashPrev");
  const nextBtn = el.querySelector("#flashNext");
  const rateRow = el.querySelector("#flashRateRow");
  const rateKnow = el.querySelector("#flashRateKnow");
  const ratePractice = el.querySelector("#flashRatePractice");

  function updateContinueState() {
    const reviewedCount = ratings.filter((rating) => rating !== null).length;
    const allReviewed = cards.length > 0 && reviewedCount === cards.length;
    if (reviewedCountEl) reviewedCountEl.textContent = String(reviewedCount);
    const checkBtn = document.getElementById("lesCheckBtn");
    if (!checkBtn) return;
    checkBtn.disabled = !allReviewed;
    if (allReviewed) checkBtn.textContent = "Continue";
  }

  function showCard(index) {
    if (!cards.length) return;

    currentCard = index;
    answerVisible = false;
    cardEl.classList.remove("is-rated-got", "is-rated-learning");
    frontEl.textContent = cards[index].front || "";
    backEl.textContent = cards[index].back || "";
    counterEl.textContent = String(index + 1);
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index >= cards.length - 1 || ratings[index] === null;
    nextBtn.textContent = index >= cards.length - 1 ? "Last card" : "Next";
    rateRow.style.display = "none";
    revealBtn.disabled = false;
    backWrapEl.style.display = "none";

    rateKnow.classList.toggle("is-selected", ratings[index] === "know");
    ratePractice.classList.toggle("is-selected", ratings[index] === "practice");

    if (ratings[index] === "know") cardEl.classList.add("is-rated-got");
    if (ratings[index] === "practice") cardEl.classList.add("is-rated-learning");
  }

  function revealAnswer() {
    if (answerVisible || !cards.length) return;
    answerVisible = true;
    backWrapEl.style.display = "";
    rateRow.style.display = "flex";
    revealBtn.disabled = true;
  }

  function rateCurrentCard(rating) {
    if (!cards.length) return;
    ratings[currentCard] = rating;
    cardEl.classList.remove("is-rated-got", "is-rated-learning");
    cardEl.classList.add(rating === "know" ? "is-rated-got" : "is-rated-learning");
    nextBtn.disabled = currentCard >= cards.length - 1;
    rateKnow.classList.toggle("is-selected", rating === "know");
    ratePractice.classList.toggle("is-selected", rating === "practice");
    updateContinueState();
  }

  revealBtn.addEventListener("click", revealAnswer);
  rateKnow.addEventListener("click", () => rateCurrentCard("know"));
  ratePractice.addEventListener("click", () => rateCurrentCard("practice"));
  prevBtn.addEventListener("click", () => {
    if (currentCard > 0) showCard(currentCard - 1);
  });
  nextBtn.addEventListener("click", () => {
    if (currentCard < cards.length - 1) showCard(currentCard + 1);
  });

  if (cards.length) {
    showCard(0);
    updateContinueState();
  } else {
    const checkBtn = document.getElementById("lesCheckBtn");
    if (checkBtn) {
      checkBtn.disabled = false;
      checkBtn.textContent = "Continue";
    }
  }

  return {
    el,
    type: "flashcard",
    check() {
      const known = ratings.filter((rating) => rating === "know").length;
      const reviewed = ratings.filter((rating) => rating !== null).length;
      const total = cards.length;
      const allReviewed = total > 0 && reviewed === total;
      return {
        correct: true,
        explanation: allReviewed
          ? `Reviewed ${total} cards. ${known} marked as "I know this".`
          : 'Review each card and choose either "I know this" or "Practice again".',
        xp: allReviewed ? Math.max(5, Math.round((known / Math.max(total, 1)) * (step.xp || 10))) : 0
      };
    }
  };
}

/**
 * Renders a Sentence Complete (finish-the-sentence) exercise.
 * Larger, more visually distinct chips vs fill_blank — better for mobile/beginners.
 */
function renderSentenceComplete(step) {
  const el = document.createElement("div");
  el.className = "les-step les-step-sentence-complete";

  const parts = (step.sentence || "___").split("___");
  let selectedWord = null;

  el.innerHTML = `
    <div class="les-step-header">
      <div class="les-step-icon les-step-icon--fill"><i class="bi bi-pencil-square"></i></div>
      <h2 class="les-step-prompt">${escHtml(step.prompt || "Finish the sentence:")}</h2>
    </div>
    <div class="les-sc-sentence">
      <span class="les-sc-before">${highlightKeyTerms(parts[0] || "")}</span><span class="les-sc-blank" id="lesScBlank" aria-label="blank to complete">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span class="les-sc-after">${highlightKeyTerms(parts[1] || "")}</span>
    </div>
    <div class="les-sc-wordbank" id="lesScWordbank" role="group" aria-label="Word choices"></div>
  `;

  const blank = el.querySelector("#lesScBlank");
  const wordbank = el.querySelector("#lesScWordbank");
  const checkBtn = document.getElementById("lesCheckBtn");
  if (checkBtn) checkBtn.disabled = true;

  function renderChips() {
    wordbank.innerHTML = "";
    (step.options || []).forEach(word => {
      const chip = document.createElement("button");
      chip.className = "les-sc-chip" + (word === selectedWord ? " is-selected" : "");
      chip.textContent = word;
      chip.setAttribute("aria-pressed", word === selectedWord ? "true" : "false");

      chip.addEventListener("click", () => {
        if (selectedWord === word) {
          selectedWord = null;
          blank.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
          blank.classList.remove("is-filled");
          if (checkBtn) checkBtn.disabled = true;
        } else {
          selectedWord = word;
          blank.textContent = word;
          blank.classList.add("is-filled");
          if (checkBtn) checkBtn.disabled = false;
        }
        renderChips();
      });

      wordbank.appendChild(chip);
    });
  }

  renderChips();

  return {
    el,
    type: "sentence_complete",
    check() {
      const correct = selectedWord && selectedWord.toLowerCase() === step.answer.toLowerCase();
      blank.classList.add(correct ? "is-correct" : "is-wrong");
      wordbank.querySelectorAll(".les-sc-chip").forEach(chip => {
        chip.disabled = true;
        if (chip.textContent.toLowerCase() === step.answer.toLowerCase()) {
          chip.classList.add("is-correct-chip");
        } else if (chip.classList.contains("is-selected")) {
          chip.classList.add("is-wrong-chip");
        }
      });
      return {
        correct,
        explanation: correct
          ? "Great job! You completed the sentence correctly."
          : `The correct word was "${step.answer}".`,
        xp: correct ? (step.xp || 10) : 0
      };
    }
  };
}

// Lesson engine controller.
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
    this.bindPrimaryButtons();
    this.bindKeyboardShortcuts();
    this.bindProgressLifecycleHandlers();
  }

  bindPrimaryButtons() {
    this.els.lesStartBtn?.addEventListener("click", () => this.startLesson());
    this.els.lesCheckBtn?.addEventListener("click", () => this.checkAnswer());
    this.els.lesSkipBtn?.addEventListener("click", () => this.skipStep());
    this.els.lesFeedbackContinue?.addEventListener("click", () => this.dismissFeedback());
    this.els.lesNextLessonBtn?.addEventListener("click", () => this.goToNextLesson());
    this.els.lesReviewBtn?.addEventListener("click", () => this.reviewMistakes());
    this.els.lesCloseBtn?.addEventListener("click", (event) => {
      if (event) event.preventDefault();
      this.saveProgressSnapshot({ reason: "exit" });
      const href = this.els.lesCloseBtn?.href || "courses.html";
      window.location.href = href;
    });
  }

  bindKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        if (this.els.lesFeedbackOverlay?.style.display !== "none") {
          this.dismissFeedback();
        } else if (this.els.lesCheckBtn && !this.els.lesCheckBtn.disabled) {
          this.checkAnswer();
        }
      }

      if (event.key === "Escape" && this.els.lesFeedbackOverlay?.style.display !== "none") {
        this.dismissFeedback();
      }
    });
  }

  bindProgressLifecycleHandlers() {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.saveProgressSnapshot({ reason: "visibility" });
    });

    window.addEventListener("beforeunload", () => {
      this.saveProgressSnapshot({ reason: "unload", silent: true });
    });
  }

  parseURL() {
    const queryParams = new URLSearchParams(window.location.search);
    this.courseId = queryParams.get("course_id") || queryParams.get("course");
    const rawLesson = Number(queryParams.get("lesson") || 0);
    this.lessonNumber = Number.isFinite(rawLesson) && rawLesson > 0 ? rawLesson : 1;
    this.contentId = queryParams.get("content_id") || queryParams.get("content");

    this.updateBackLinks();
  }

  updateBackLinks() {
    if (!this.courseId) return;

    const backParams = new URLSearchParams();
    backParams.set("id", this.courseId);
    if (this.contentId) backParams.set("content_id", this.contentId);

    const courseUrl = `course.html?${backParams.toString()}`;
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

  resolveCourseAndLesson(contentMap) {
    this.course = resolveCourseContent(this.courseId, this.contentId);
    this.lesson = getLessonByNumber(this.course, this.lessonNumber);

    // If lesson index is invalid, fall back to first lesson in this course.
    if (this.course && !this.lesson) {
      this.lessonNumber = 1;
      this.lesson = getLessonByNumber(this.course, this.lessonNumber);
    }

    // Fallback: if no course id was valid, try the first course in content map.
    if (this.course) return;

    const firstCourseId = Object.keys(contentMap || {})[0];
    if (!firstCourseId) return;

    this.courseId = this.courseId || firstCourseId;
    this.contentId = this.contentId || firstCourseId;
    this.course = contentMap[firstCourseId];
    this.lessonNumber = this.lessonNumber || 1;
    this.lesson = getLessonByNumber(this.course, this.lessonNumber) || getLessonByNumber(this.course, 1);
    this.updateBackLinks();
  }

  loadLesson() {
    // Safety timeout if the page stays loading too long.
    const loadTimeout = setTimeout(() => {
      if (document.body.classList.contains("net-loading")) {
        document.body.classList.remove("net-loading");
        this.showLoadError("Lesson took too long to load. Please go back and try again.");
      }
    }, 5000);

    try {
      ENDPOINTS = window.ENDPOINTS || {};
      const contentMap = getCourseContentMap();

      this.resolveCourseAndLesson(contentMap);

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

  setSkipButtonVisible(isVisible) {
    const skipButton = this.els.lesSkipBtn;
    if (skipButton) skipButton.style.display = isVisible ? "" : "none";
  }

  prepareStepUi(container, checkButton) {
    if (container) container.innerHTML = "";
    if (!checkButton) return;
    checkButton.disabled = true;
    checkButton.textContent = "Check";
  }

  updateStepProgressFill(index) {
    const percent = ((index) / this.steps.length) * 100;
    if (this.els.lesProgressFill) this.els.lesProgressFill.style.width = `${percent}%`;
  }

  buildRendererForStep(step, checkButton) {
    let renderer;

    switch (step.type) {
      case "learn":
        renderer = renderLearnStep(step);
        if (checkButton) {
          checkButton.textContent = "Continue";
          checkButton.disabled = false;
        }
        this.setSkipButtonVisible(false);
        return renderer;

      case "mcq":
        renderer = renderMCQ(step);
        this.setSkipButtonVisible(true);
        return renderer;

      case "fill_blank":
        renderer = renderFillBlank(step);
        this.setSkipButtonVisible(true);
        return renderer;

      case "matching":
        renderer = renderMatching(step);
        this.setSkipButtonVisible(true);
        return renderer;

      case "tap_word":
        renderer = renderTapWord(step);
        this.setSkipButtonVisible(true);
        return renderer;

      case "flashcard":
        renderer = renderFlashcard(step);
        if (checkButton) {
          checkButton.textContent = "Continue";
          // Keep disabled until flashcards are viewed.
          checkButton.disabled = true;
        }
        this.setSkipButtonVisible(true);
        return renderer;

      case "sentence_complete":
        renderer = renderSentenceComplete(step);
        this.setSkipButtonVisible(true);
        return renderer;

      default:
        renderer = renderLearnStep({
          type: "learn",
          title: "Step",
          content: ["Continue to the next step."],
          icon: "bi-arrow-right"
        });
        if (checkButton) {
          checkButton.textContent = "Continue";
          checkButton.disabled = false;
        }
        this.setSkipButtonVisible(false);
        return renderer;
    }
  }

  animateStepIn(rendererElement, container) {
    if (!rendererElement) return;

    // Fail-safe: make the step visible immediately, then animate if available.
    rendererElement.classList.add("les-step-enter");

    if (container) container.scrollTop = 0;
    try {
      window.scrollTo({ top: 0, behavior: this.prefersReducedMotion ? "auto" : "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  }

  loadStep(index) {
    if (index >= this.steps.length) {
      this.showCompletion();
      return;
    }

    this.currentStepIndex = index;
    const step = this.steps[index];
    const container = this.els.lesStepContainer;
    const checkButton = this.els.lesCheckBtn;

    this.prepareStepUi(container, checkButton);
    this.updateStepProgressFill(index);

    let renderer = null;
    try {
      renderer = this.buildRendererForStep(step, checkButton);
    } catch (error) {
      console.error("Step renderer failed:", error, step);
      renderer = renderLearnStep({
        type: "learn",
        title: step?.title || "Step",
        content: ["This step could not be rendered. Continue to move on."],
        icon: "bi-exclamation-circle"
      });
      if (checkButton) {
        checkButton.textContent = "Continue";
        checkButton.disabled = false;
      }
      this.setSkipButtonVisible(false);
    }

    this.currentRenderer = renderer;
    if (container && renderer?.el) container.appendChild(renderer.el);
    this.animateStepIn(renderer?.el, container);
  }

  handlePassiveStepCheck(renderer) {
    if (renderer.type !== "learn" && renderer.type !== "flashcard") return false;

    if (renderer.type === "flashcard" && renderer.check) {
      renderer.check();
    }

    this.stepResults.push({
      type: renderer.type,
      correct: true,
      step: this.steps[this.currentStepIndex]
    });
    this.applyProgressAndXP(this.currentStepIndex + 1);
    this.loadStep(this.currentStepIndex + 1);
    return true;
  }

  handleInteractiveStepCheck(renderer) {
    if (!renderer.check) return;

    const result = renderer.check();
    this.totalChecked += 1;

    if (result.correct) {
      this.correctCount += 1;
      this.streak += 1;
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

  checkAnswer() {
    const renderer = this.currentRenderer;
    if (!renderer) return;

    if (this.handlePassiveStepCheck(renderer)) return;
    this.handleInteractiveStepCheck(renderer);
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

    title.textContent = correct ? "Correct!" : "Incorrect";
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

    const api = getLessonAPI();
    if (!api) return;

    const completionPath = ENDPOINTS.courses?.completeLesson || "/complete-lesson";
    const completionXP = Math.max(0, Number(this.xpEarned || this.lessonXP || 0));

    try {
      const completionRes = await fetch(`${api}${completionPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeEmail(user.email),
          course_id: String(this.courseId),
          lesson_number: this.lessonNumber,
          earned_xp: completionXP,
          progress_pct: 100,
          completed_stamp: true,
          mastered: true
        })
      });

      const completionData = await completionRes.json().catch(() => ({}));
      if (!completionRes.ok || !completionData?.success) {
        throw new Error(completionData?.message || `HTTP ${completionRes.status}`);
      }

      const xpAdded = Number(completionData.xp_added || 0);
      if (xpAdded > 0) bumpUserXP(user.email, xpAdded);

      const achievementXp = Number(completionData.achievement_xp_added || 0);
      if (achievementXp > 0) bumpUserXP(user.email, achievementXp);

      const newlyUnlocked = Array.isArray(completionData.newly_unlocked)
        ? completionData.newly_unlocked
        : [];
      if (newlyUnlocked.length && window.NetologyAchievements?.queueUnlocks) {
        window.NetologyAchievements.queueUnlocks(normalizeEmail(user.email), newlyUnlocked);
      }
      return;
    } catch (e) {
      console.warn("Could not report lesson completion:", e);
    }

    if (!completionXP) return;
    try {
      const fallback = await awardLessonXP(
        normalizeEmail(user.email),
        this.courseId,
        this.lessonNumber,
        completionXP,
        completionXP
      );
      const xpAdded = Number(fallback?.xp_added || 0);
      if (fallback?.success && xpAdded > 0) bumpUserXP(user.email, xpAdded);
    } catch (e) {
      console.warn("Could not apply XP fallback:", e);
    }
  }

  /**
   * Soft-complete remains local-only, so no backend write here.
   */
  async reportSoftComplete() {
    // Soft completion is tracked locally only.
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


// Shared chrome: sidebar, dropdown, identity, logout.
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


// Init.
document.addEventListener("DOMContentLoaded", () => {
  const user = getCurrentUser();
  if (user) wireChrome(user);

  const engine = new LessonEngine();
  engine.init();

  window.lessonEngine = engine;
});
