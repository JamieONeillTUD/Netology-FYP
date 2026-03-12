/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: sandbox-learning.js
Purpose: Handles tutorials, challenges, XP tracking,
lesson-session saves, and sandbox page account UI.
---------------------------------------------------------
*/

function ensureGuide() {
  if (guideUI || !stageWrap) return guideUI;
  const guide = document.createElement("div");
  guide.className = "sbx-guide sbx-guide--float";
  guide.setAttribute("role", "status");
  guide.setAttribute("aria-live", "polite");

  const head = makeEl("div", "sbx-guide-head");
  const badge = makeEl("div", "sbx-guide-badge");
  badge.appendChild(makeIcon("bi bi-compass"));
  const stepLabel = makeEl("div", "sbx-guide-step");
  const controls = makeEl("div", "sbx-guide-controls");
  const minimizeBtn = makeEl("button", "sbx-guide-btn", "");
  minimizeBtn.type = "button";
  minimizeBtn.setAttribute("aria-label", "Minimize guide");
  minimizeBtn.appendChild(makeIcon("bi bi-dash-lg"));
  head.append(badge, stepLabel, controls);
  controls.appendChild(minimizeBtn);

  const body = makeEl("div", "sbx-guide-body");
  const hint = makeEl("div", "sbx-guide-hint");

  const actions = makeEl("div", "sbx-guide-actions");
  const showBtn = makeEl("button", "btn btn-outline-secondary btn-sm", "Show me");
  const closeBtn = makeEl("button", "btn btn-teal btn-sm", "Got it");
  showBtn.type = "button";
  closeBtn.type = "button";
  actions.append(showBtn, closeBtn);

  guide.append(head, body, hint, actions);

  document.body.appendChild(guide);

  guideUI = {
    el: guide,
    stepEl: stepLabel,
    bodyEl: body,
    hintEl: hint,
    showBtn,
    closeBtn,
    minimizeBtn,
    lastKey: null,
    dismissed: false,
  };

  closeBtn.addEventListener("click", () => {
    guideUI.dismissed = true;
    guide.classList.remove("is-show");
  });

  minimizeBtn.addEventListener("click", () => {
    const isMin = guide.classList.toggle("is-min");
    localStorage.setItem("netology_sbx_guide_min", isMin ? "1" : "0");
    minimizeBtn.setAttribute("aria-label", isMin ? "Maximize guide" : "Minimize guide");
    minimizeBtn.replaceChildren();
    minimizeBtn.appendChild(makeIcon(`bi ${isMin ? "bi-plus-lg" : "bi-dash-lg"}`));
  });

  const initialMin = localStorage.getItem("netology_sbx_guide_min") === "1";
  if (initialMin) {
    guide.classList.add("is-min");
    minimizeBtn.setAttribute("aria-label", "Maximize guide");
    minimizeBtn.replaceChildren();
    minimizeBtn.appendChild(makeIcon("bi bi-plus-lg"));
  }

  return guideUI;
}

function hideGuide() {
  const guide = ensureGuide();
  if (!guide) return;
  guide.el.classList.remove("is-show", "is-anim");
}

function showGuide(step, stepIndex, totalSteps) {
  const guide = ensureGuide();
  if (!guide || !step) return;
  const stepKey = `${state.tutorialMeta?.courseId || "tutorial"}:${state.tutorialMeta?.lesson || 0}:${stepIndex}`;
  if (guide.lastKey !== stepKey) {
    guide.dismissed = false;
    guide.lastKey = stepKey;
  }
  if (guide.dismissed) return;

  guide.stepEl.textContent = `Step ${stepIndex + 1} of ${totalSteps}`;
  guide.bodyEl.textContent = step.text || "Follow the step on screen.";
  const hintText = step.hint || step.tip || "";
  if (hintText) {
    guide.hintEl.textContent = hintText;
    guide.hintEl.style.display = "";
  } else {
    guide.hintEl.textContent = "";
    guide.hintEl.style.display = "none";
  }

  guide.el.classList.add("is-show");
  guide.el.classList.remove("is-anim");
  requestAnimationFrame(() => guide.el.classList.add("is-anim"));

  guide.showBtn.onclick = () => {
    applyTutorialFocus(step);
  };
}

function tutorialProgressKey(meta) {
  if (!meta) return null;
  return `netology_tutorial_progress:${meta.email || "guest"}:${meta.courseId}:${meta.lesson}`;
}

function loadTutorialProgress(meta) {
  const key = tutorialProgressKey(meta);
  const fallback = { checked: [], current: 0 };
  if (!key) return fallback;
  const stored = parseJsonSafe(localStorage.getItem(key), fallback) || fallback;
  const checked = Array.isArray(stored.checked) ? stored.checked : [];
  const current = Number.isFinite(Number(stored.current)) ? Number(stored.current) : 0;
  return { checked, current };
}

function saveTutorialProgress(meta, progress) {
  const key = tutorialProgressKey(meta);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(progress || { checked: [], current: 0 }));
}

function normalizeTutorialSteps(steps) {
  return (steps || []).map((step) => {
    if (typeof step === "string") return { text: step };
    if (step && typeof step === "object") {
      return {
        ...step,
        text: step.text || step.title || step.label || "",
      };
    }
    return { text: "" };
  });
}

// ----------------------------------------
// Well-Done Toast (tutorial complete)
// ----------------------------------------
function showWellDoneToast(title, message) {
  if (window.NetologyToast?.showSandboxToast) {
    window.NetologyToast.showSandboxToast({
      title: title || "Well done!",
      message: message || "",
      type: "success",
      duration: 5000,
      wellDone: true
    });
    return;
  }

  if (window.NetologyToast?.showMessageToast) {
    window.NetologyToast.showMessageToast(message || title || "Well done!", "success", 5000);
  }
}

// ----------------------------------------
// Objectives Banner
// ----------------------------------------
function updateObjectivesBanner() {
  const banner = getById("sbxObjectivesBanner");
  if (!banner) return;

  if (state.mode === "tutorial" && state.tutorialMeta) {
    const steps = normalizeTutorialSteps(state.tutorialMeta.steps || []);
    const progress = normalizeTutorialProgress(state.tutorialMeta, steps);
    const step = steps[progress.current];
    if (!step || !steps.length) { banner.style.display = "none"; return; }
    const labelEl = getById("sbxObjectivesBannerLabel");
    const titleEl = getById("sbxObjectivesBannerTitle");
    const stepEl  = getById("sbxObjectivesBannerStep");
    const statusEl = getById("sbxObjectivesBannerStatus");
    if (labelEl)  labelEl.textContent  = state.tutorialMeta.title || "Tutorial";
    if (titleEl)  titleEl.textContent  = step.text || "Follow the instruction.";
    if (stepEl)   stepEl.textContent   = `Step ${progress.current + 1} of ${steps.length}`;
    if (statusEl) {
      const done = progress.checked.filter(Boolean).length;
      statusEl.textContent = `${done}/${steps.length} complete`;
    }
    banner.style.display = "";
  } else if (state.mode === "challenge" && state.challengeMeta) {
    const labelEl = getById("sbxObjectivesBannerLabel");
    const titleEl = getById("sbxObjectivesBannerTitle");
    const stepEl  = getById("sbxObjectivesBannerStep");
    const statusEl = getById("sbxObjectivesBannerStatus");
    if (labelEl)  labelEl.textContent  = "Challenge";
    if (titleEl)  titleEl.textContent  = state.challengeMeta.title || "Complete the challenge objectives";
    if (stepEl)   stepEl.textContent   = "";
    if (statusEl) statusEl.textContent = "";
    banner.style.display = "";
  } else {
    banner.style.display = "none";
  }
}

// ----------------------------------------
// Smart Device Connection Suggestions
// ----------------------------------------
function showConnectionSuggestions(device) {
  // Keep suggestions only in free mode.
  if (state.mode !== "free") return;
  const panel = getById("sbxConnSuggest");
  const body  = getById("sbxConnSuggestBody");
  if (!panel || !body) return;

  const compat = DEVICE_COMPAT[device.type] || [];
  const connectSuggestions = [];
  const addSuggestions = [];
  const seen = new Set();

  compat.forEach(({ targets, conn }) => {
    targets.forEach((targetType) => {
      const candidates = state.devices.filter(
        (d) => d.type === targetType && d.id !== device.id
      );
      candidates.forEach((candidate) => {
        const alreadyLinked = state.connections.some(
          (c) =>
            (c.from === device.id && c.to === candidate.id) ||
            (c.from === candidate.id && c.to === device.id)
        );
        const key = `${candidate.id}:${conn}`;
        if (!alreadyLinked && !seen.has(key)) {
          seen.add(key);
          connectSuggestions.push({ candidate, conn });
        }
      });
    });
  });

  const alreadyTypes = new Set(state.devices.map((d) => d.type));
  compat.forEach(({ targets, conn }) => {
    targets.forEach((targetType) => {
      const key = `add:${targetType}:${conn}`;
      if (!alreadyTypes.has(targetType) && !seen.has(key)) {
        const dt = DEVICE_TYPES[targetType];
        if (dt) {
          seen.add(key);
          addSuggestions.push({ addDevice: targetType, conn, label: dt.label });
        }
      }
    });
  });

  const suggestions = connectSuggestions.concat(addSuggestions).slice(0, 3);
  if (!suggestions.length) {
    dismissSuggestions();
    return;
  }

  clearChildren(body);
  suggestions.forEach((suggestion) => {
    if (suggestion.addDevice) {
      const { addDevice: devType, conn, label } = suggestion;
      const ct = CONNECTION_TYPES[conn];
      const dt = DEVICE_TYPES[devType];
      const btn = makeEl("button", "sbx-conn-suggest-item");
      btn.type = "button";
      btn.innerHTML = `
        <span class="sbx-conn-suggest-item-icon" style="color:${dt.color.includes("gradient") ? "#0891b2" : dt.color}">
          <i class="bi ${dt.icon}"></i>
        </span>
        <span class="sbx-conn-suggest-item-text">
          <span class="sbx-conn-suggest-item-kicker">Add</span>
          <strong>${label}</strong>
          <span class="sbx-conn-suggest-item-meta">Then link via ${ct.label}</span>
        </span>
        <span class="sbx-conn-suggest-item-arrow"><i class="bi bi-plus-lg"></i></span>`;
      btn.addEventListener("click", () => {
        dismissSuggestions();
        addDevice(devType);
      });
      body.appendChild(btn);
      return;
    }

    const { candidate, conn } = suggestion;
    const ct = CONNECTION_TYPES[conn];
    const btn = makeEl("button", "sbx-conn-suggest-item");
    btn.type = "button";
    btn.innerHTML = `
      <span class="sbx-conn-suggest-item-icon" style="color:${ct.color}">
        <i class="bi bi-plug"></i>
      </span>
      <span class="sbx-conn-suggest-item-text">
        <span class="sbx-conn-suggest-item-kicker">Connect</span>
        <strong>${candidate.name}</strong>
        <span class="sbx-conn-suggest-item-meta">Use ${ct.label}</span>
      </span>
      <span class="sbx-conn-suggest-item-arrow"><i class="bi bi-arrow-right-short"></i></span>`;
    btn.addEventListener("click", () => {
      dismissSuggestions();
      state.connectType = conn;
      qsa("[data-conn-type]", connTypeGroup).forEach((b) => b.classList.remove("is-active"));
      qs(`[data-conn-type="${conn}"]`, connTypeGroup)?.classList.add("is-active");
      state.tool = TOOL.CONNECT;
      qsa("[data-tool]").forEach((b) => b.classList.remove("is-active"));
      getById("toolConnectBtn")?.classList.add("is-active");
      updateConnGroupVisibility();
      state.connectFrom = device.id;
      state.selectedIds = [device.id];
      renderDevices();
      addGuided(qs(`.sbx-device[data-id="${candidate.id}"]`, deviceLayer));
      const ct2 = CONNECTION_TYPES[conn];
      setTip(`Click ${candidate.name} to complete the ${ct2.label} link.`);
    });
    body.appendChild(btn);
  });

  // Highlight only connect targets (not "add device" suggestions).
  connectSuggestions.slice(0, 3).forEach(({ candidate }) => {
    addGuided(qs(`.sbx-device[data-id="${candidate.id}"]`, deviceLayer));
  });

  if (suggestionsHideTimer) {
    clearTimeout(suggestionsHideTimer);
    suggestionsHideTimer = null;
  }
  panel.style.display = "";
  requestAnimationFrame(() => panel.classList.add("is-show"));
}

function dismissSuggestions() {
  const panel = getById("sbxConnSuggest");
  const body = getById("sbxConnSuggestBody");
  if (!panel) return;
  if (suggestionsHideTimer) clearTimeout(suggestionsHideTimer);
  panel.classList.remove("is-show");
  suggestionsHideTimer = setTimeout(() => {
    panel.style.display = "none";
    if (body) clearChildren(body);
  }, 130);
  clearGuidedHighlights();
}

// ----------------------------------------
// Available Sandbox Tutorials (free mode only)
// ----------------------------------------
function getAvailableTutorials() {
  const content = window.COURSE_CONTENT || {};
  const user = getStoredUser();
  const numericLevel = Number(user?.numeric_level);
  const accessLevel = Number.isFinite(numericLevel) && numericLevel > 0
    ? numericLevel
    : resolveXpProgress(user).level || 1;
  const tutorials = [];

  Object.values(content).forEach((course) => {
    if (!course || typeof course !== "object") return;
    const requiredLevel = Number(course.required_level || 1) || 1;
    if (requiredLevel > accessLevel) return;

    let lessonCounter = 1;
    (course.units || []).forEach((unit, unitIndex) => {
      const moduleId = String(unit?.id || `module-${unitIndex + 1}`);
      const unitItems = [];
      const pushUnitItem = (type, data) => {
        unitItems.push({
          type,
          title: data.title || data.name || "Tutorial",
          lessonNumber: Number(data.lesson_number || data.lessonNumber || 0),
          unitTitle: unit?.title || "",
          steps: Array.isArray(data.steps) ? data.steps : [],
          tips: data.tips || "",
          xp: Number(data.xp || data.xpReward || data.xp_reward || 0),
        });
      };

      if (Array.isArray(unit?.sections)) {
        unit.sections.forEach((section) => {
          const sectionType = String(section.type || section.kind || section.title || "").toLowerCase();
          const sectionItems = Array.isArray(section.items) ? section.items : [];
          sectionItems.forEach((item) => {
            const explicitType = String(item?.type || "").toLowerCase();
            const itemType =
              explicitType === "quiz" ? "quiz" :
              explicitType === "challenge" ? "challenge" :
              explicitType === "sandbox" || explicitType === "practice" ? "sandbox" :
              explicitType === "learn" ? "learn" :
              sectionType.includes("quiz") ? "quiz" :
              sectionType.includes("challenge") ? "challenge" :
              sectionType.includes("practice") || sectionType.includes("sandbox") || sectionType.includes("hands-on") ? "sandbox" :
              "learn";
            pushUnitItem(itemType, item);
          });
        });
      }

      if (!unitItems.length && Array.isArray(unit?.lessons)) {
        unit.lessons.forEach((item) => {
          const itemTypeRaw = String(item.type || "").toLowerCase();
          const itemType =
            itemTypeRaw === "quiz" ? "quiz" :
            itemTypeRaw === "challenge" ? "challenge" :
            itemTypeRaw === "sandbox" || itemTypeRaw === "practice" ? "sandbox" :
            "learn";
          pushUnitItem(itemType, item);
        });
      }

      let lastLearnLesson = lessonCounter - 1;
      unitItems.forEach((item) => {
        if (item.type === "learn") {
          if (!item.lessonNumber) item.lessonNumber = lessonCounter++;
          else lessonCounter = Math.max(lessonCounter, item.lessonNumber + 1);
          lastLearnLesson = item.lessonNumber;
          return;
        }

        if (!item.lessonNumber) {
          item.lessonNumber = Math.max(1, lastLearnLesson || 1);
        }
      });

      unitItems.forEach((item) => {
        if (item.type !== "sandbox") return;
        const rawDifficulty = String(course.difficulty || "").toLowerCase();
        const difficulty =
          rawDifficulty === "advanced" ? "Advanced" :
          rawDifficulty === "intermediate" ? "Intermediate" :
          "Beginner";
        tutorials.push({
          id: `${course.id || "course"}:${item.lessonNumber}:${item.title || "tutorial"}`,
          courseId: String(course.id || ""),
          contentId: String(course.id || ""),
          moduleId,
          courseTitle: course.title || "Course",
          unitTitle: item.unitTitle || "",
          lesson: Number(item.lessonNumber || 0),
          lessonTitle: item.title || "Tutorial",
          title: item.title || "Tutorial",
          desc: item.tips || item.unitTitle || course.description || "",
          difficulty,
          icon: "bi-mortarboard-fill",
          steps: item.steps || [],
          tips: item.tips || "",
          xp: Number(item.xp || 0),
        });
      });
    });
  });

  tutorials.sort((a, b) => {
    if (a.courseId !== b.courseId) return String(a.courseId).localeCompare(String(b.courseId), undefined, { numeric: true });
    return Number(a.lesson || 0) - Number(b.lesson || 0);
  });

  return tutorials;
}

function updateTutorialToggleButton(hasTutorials = true) {
  if (!tutorialsToggleBtn) return;
  const inFreeMode = state.mode === "free";
  const hidden = tutorialCarouselState.hidden;

  tutorialsToggleBtn.style.display = inFreeMode ? "" : "none";
  tutorialsToggleBtn.disabled = !inFreeMode || !hasTutorials;
  tutorialsToggleBtn.classList.toggle("is-off", hidden || !hasTutorials);
  tutorialsToggleBtn.setAttribute("aria-pressed", String(hasTutorials && !hidden));

  if (tutorialsToggleLabel) {
    if (!hasTutorials) tutorialsToggleLabel.textContent = "No tutorials";
    else tutorialsToggleLabel.textContent = hidden ? "Show tutorials" : "Hide tutorials";
  }

  const icon = qs("i", tutorialsToggleBtn);
  if (icon) icon.className = `bi ${hidden ? "bi-eye" : "bi-eye-slash"}`;
}

function setTutorialCarouselHidden(hidden, { persist = true } = {}) {
  tutorialCarouselState.hidden = Boolean(hidden);
  if (persist) {
    localStorage.setItem(TUTORIAL_CAROUSEL_HIDDEN_KEY, tutorialCarouselState.hidden ? "1" : "0");
  }
  renderTutorialCarousel();
}

function ensureTutorialCarouselControls() {
  if (topCarouselPrevBtn && !topCarouselPrevBtn.dataset.bound) {
    topCarouselPrevBtn.dataset.bound = "1";
    topCarouselPrevBtn.addEventListener("click", () => {
      setTutorialCarouselIndex(tutorialCarouselState.index - 1);
    });
  }

  if (topCarouselNextBtn && !topCarouselNextBtn.dataset.bound) {
    topCarouselNextBtn.dataset.bound = "1";
    topCarouselNextBtn.addEventListener("click", () => {
      setTutorialCarouselIndex(tutorialCarouselState.index + 1);
    });
  }

  if (tutorialsToggleBtn && !tutorialsToggleBtn.dataset.bound) {
    tutorialsToggleBtn.dataset.bound = "1";
    tutorialsToggleBtn.addEventListener("click", () => {
      setTutorialCarouselHidden(!tutorialCarouselState.hidden);
    });
  }
}

function setTutorialCarouselIndex(nextIndex) {
  const total = tutorialCarouselState.count;
  if (!topCarouselScroll || !total) return;

  const index = ((nextIndex % total) + total) % total;
  tutorialCarouselState.index = index;

  qsa(".sbx-top-tut-card", topCarouselScroll).forEach((card, cardIndex) => {
    card.classList.toggle("is-active", cardIndex === index);
  });

  if (topCarouselDots) {
    qsa(".sbx-top-carousel-dot", topCarouselDots).forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === index);
    });
  }

  if (topCarouselPrevBtn) topCarouselPrevBtn.disabled = total <= 1;
  if (topCarouselNextBtn) topCarouselNextBtn.disabled = total <= 1;
}

function renderTutorialCarousel() {
  if (!topCarouselWrap || !topCarouselScroll) return;
  ensureTutorialCarouselControls();

  if (state.mode !== "free") {
    tutorialCarouselState.count = 0;
    tutorialCarouselState.index = 0;
    clearChildren(topCarouselScroll);
    if (topCarouselDots) clearChildren(topCarouselDots);
    topCarouselWrap.style.display = "none";
    dismissSuggestions();
    updateTutorialToggleButton(false);
    return;
  }

  const tutorials = getAvailableTutorials();
  updateTutorialToggleButton(tutorials.length > 0);
  if (!tutorials.length) {
    tutorialCarouselState.count = 0;
    tutorialCarouselState.index = 0;
    clearChildren(topCarouselScroll);
    if (topCarouselDots) clearChildren(topCarouselDots);
    topCarouselWrap.style.display = "none";
    return;
  }

  if (tutorialCarouselState.hidden) {
    tutorialCarouselState.count = tutorials.length;
    clearChildren(topCarouselScroll);
    if (topCarouselDots) clearChildren(topCarouselDots);
    topCarouselWrap.style.display = "none";
    return;
  }

  tutorialCarouselState.count = tutorials.length;
  tutorialCarouselState.index = Math.min(tutorialCarouselState.index, tutorials.length - 1);
  clearChildren(topCarouselScroll);
  if (topCarouselDots) clearChildren(topCarouselDots);

  tutorials.forEach((tutorial, index) => {
    const card = makeEl("button", "sbx-top-tut-card");
    const difficultyClass = String(tutorial.difficulty || "").toLowerCase();
    card.type = "button";
    card.innerHTML = `
      <span class="sbx-top-tut-main">
        <span class="sbx-top-tut-icon-wrap"><i class="bi ${tutorial.icon} sbx-top-tut-icon"></i></span>
        <span class="sbx-top-tut-copy">
          <span class="sbx-top-tut-title">${tutorial.title}</span>
          <span class="sbx-top-tut-desc">${tutorial.desc || ""}</span>
        </span>
      </span>
      <span class="sbx-top-tut-diff sbx-tut-diff--${difficultyClass}">${tutorial.difficulty}</span>`;
    card.addEventListener("click", () => launchCourseTutorial(tutorial));
    topCarouselScroll.appendChild(card);

    if (topCarouselDots) {
      const dot = makeEl("button", "sbx-top-carousel-dot");
      dot.type = "button";
      dot.setAttribute("aria-label", `Show tutorial ${index + 1}`);
      dot.addEventListener("click", () => setTutorialCarouselIndex(index));
      topCarouselDots.appendChild(dot);
    }
  });

  if (topCarouselPrevBtn) topCarouselPrevBtn.style.display = tutorials.length > 1 ? "" : "none";
  if (topCarouselNextBtn) topCarouselNextBtn.style.display = tutorials.length > 1 ? "" : "none";
  if (topCarouselDots) topCarouselDots.style.display = tutorials.length > 1 ? "" : "none";

  topCarouselWrap.style.display = "";
  setTutorialCarouselIndex(tutorialCarouselState.index);
}

function launchCourseTutorial(tutorial) {
  if (!tutorial?.courseId || !tutorial?.lesson) return;

  const payload = {
    courseId: tutorial.courseId,
    contentId: tutorial.contentId || tutorial.courseId,
    moduleId: tutorial.moduleId || null,
    courseTitle: tutorial.courseTitle || "Course",
    unitTitle: tutorial.unitTitle || "",
    lesson: tutorial.lesson,
    lessonTitle: tutorial.lessonTitle || tutorial.title || "Tutorial",
    tutorial: {
      steps: tutorial.steps || [],
      tips: tutorial.tips || "",
      xp: Number(tutorial.xp || 0),
    }
  };

  localStorage.setItem("netology_active_tutorial", JSON.stringify(payload));
  window.location.href =
    `sandbox.html?course_id=${encodeURIComponent(tutorial.courseId)}&content_id=${encodeURIComponent(tutorial.contentId || tutorial.courseId)}&lesson=${encodeURIComponent(tutorial.lesson)}&mode=practice`;
}

// ----------------------------------------
// Idle Guidance (7 s timeout)
// ----------------------------------------
let idleTimer = null;
const IDLE_DELAY = 7000;

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(showIdleGuidance, IDLE_DELAY);
}

function showIdleGuidance() {
  if (state.mode !== "free") return;
  let msg, sub;
  if (!state.devices.length) {
    msg = "Start building your network!";
    sub = "Try dragging a Router or Switch from the device library onto the canvas.";
  } else if (!state.connections.length) {
    msg = "Now connect your devices.";
    sub = "Use the Connect tool (⚡) in the toolbar, or press C on your keyboard.";
  } else {
    msg = "Looking for a challenge?";
    sub = "Open the Objectives tab to browse the available sandbox tutorials.";
  }
  showIdleBanner(msg, sub);
}

function showIdleBanner(msg, sub) {
  let banner = getById("sbxIdleBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "sbxIdleBanner";
    banner.className = "sbx-idle-banner";
    const iconEl = makeEl("div", "sbx-idle-icon");
    iconEl.appendChild(makeIcon("bi bi-lightbulb-fill"));
    const textEl = makeEl("div", "sbx-idle-text");
    const titleEl = makeEl("div", "sbx-idle-title");
    titleEl.id = "sbxIdleTitle";
    const subEl = makeEl("div", "sbx-idle-sub");
    subEl.id = "sbxIdleSub";
    textEl.append(titleEl, subEl);
    const closeEl = makeEl("button", "sbx-idle-close");
    closeEl.type = "button";
    closeEl.id = "sbxIdleClose";
    closeEl.setAttribute("aria-label", "Dismiss");
    closeEl.appendChild(makeIcon("bi bi-x"));
    banner.append(iconEl, textEl, closeEl);
    // Append to the stage wrap so it floats inside the canvas area
    stageWrap?.appendChild(banner);
    closeEl.addEventListener("click", hideIdleBanner);
  }
  const titleEl = getById("sbxIdleTitle");
  const subEl   = getById("sbxIdleSub");
  if (titleEl) titleEl.textContent = msg;
  if (subEl)   subEl.textContent   = sub;
  banner.classList.add("is-show");
}

function hideIdleBanner() {
  getById("sbxIdleBanner")?.classList.remove("is-show");
  resetIdleTimer();
}

function showLeftPanel() {
  if (!leftPanel) return;
  leftPanel.style.display = "";
  workspace?.classList.remove("left-hidden");
  if (leftToggle) leftToggle.querySelector("i").className = "bi bi-chevron-left";
  if (leftOpenBtn) leftOpenBtn.style.display = "none";
}

function showRightPanel() {
  if (!rightPanel) return;
  rightPanel.style.display = "";
  workspace?.classList.remove("right-hidden");
  if (rightToggle) rightToggle.querySelector("i").className = "bi bi-chevron-right";
  if (rightOpenBtn) rightOpenBtn.style.display = "none";
}

function setRightTab(tabId) {
  const tabsWrap = getById("sbxRightTabs");
  if (!tabsWrap || !rightPanel) return;
  const target = qs(`.sbx-tab[data-tab="${tabId}"]`, tabsWrap);
  if (!target) return;
  state.rightTab = tabId;
  qsa(".sbx-tab", tabsWrap).forEach((t) => t.classList.remove("is-active"));
  target.classList.add("is-active");
  qsa(".sbx-tabpanel", rightPanel).forEach((panel) => panel.classList.remove("is-active"));
  getById(`panel${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`)?.classList.add("is-active");
}

const guidedEls = new Set();

function clearGuidedHighlights() {
  guidedEls.forEach((el) => el.classList.remove("sbx-guided"));
  guidedEls.clear();
}

function addGuided(el) {
  if (!el) return;
  el.classList.add("sbx-guided");
  guidedEls.add(el);
}

function deriveFocusFromChecks(checks) {
  const focus = {
    deviceTypes: new Set(),
    needsConnect: false,
    needsConfigAuto: false,
    needsConfigHint: false,
  };
  (checks || []).forEach((req) => {
    if (req.type === "device") focus.deviceTypes.add(req.deviceType);
    if (req.type === "connection") focus.needsConnect = true;
    if (req.type === "ip" || req.type === "gateway") focus.needsConfigAuto = true;
    if (req.type === "name_contains") focus.needsConfigHint = true;
  });
  return focus;
}

function applyTutorialFocus(step) {
  if (!step) return;
  clearGuidedHighlights();
  const rightHidden = rightPanel && rightPanel.style.display === "none";
  showRightPanel();
  if (rightHidden) setRightTab("objectives");

  const checks = Array.isArray(step.checks)
    ? step.checks
    : Array.isArray(step.requirements)
      ? step.requirements
      : step.require && typeof step.require === "object"
        ? [step.require]
        : [];
  const focus = deriveFocusFromChecks(checks);

  if (focus.deviceTypes.size) {
    showLeftPanel();
    focus.deviceTypes.forEach((type) => {
      const btn = qs(`.sbx-device-card[data-device="${type}"]`);
      addGuided(btn);
    });
  }

  if (focus.needsConnect) {
    addGuided(getById("toolConnectBtn"));
    addGuided(qs('[data-conn-type="ethernet"]', connTypeGroup));
  }

  if (focus.needsConfigAuto || focus.needsConfigHint) {
    const cfgBtn = getById("sbxConfigTabBtn");
    if (cfgBtn) cfgBtn.style.display = "";
    addGuided(cfgBtn);
    const configTab = qs('.sbx-subtab[data-subtab="general"]', getById("sbxConfigTabs"));
    addGuided(configTab);
  }

  if (focus.needsConfigAuto && state.rightTab !== "config") {
    showConfigTab();
  } else if (state.rightTab !== "objectives") {
    addGuided(qs('.sbx-tab[data-tab="objectives"]', getById("sbxRightTabs")));
  }
}

function normalizeTutorialProgress(meta, steps) {
  const progress = loadTutorialProgress(meta);
  progress.checked = Array.isArray(progress.checked) ? progress.checked : [];
  progress.current = Number.isFinite(Number(progress.current)) ? Number(progress.current) : 0;
  const total = steps.length || 0;
  if (!total) return progress;
  if (progress.current >= total) progress.current = total - 1;
  const firstIncomplete = steps.findIndex((_, idx) => !progress.checked[idx]);
  if (firstIncomplete >= 0 && progress.checked[progress.current]) {
    progress.current = firstIncomplete;
  }
  return progress;
}

function findNextIncomplete(checked, total, startIdx) {
  for (let i = startIdx + 1; i < total; i += 1) {
    if (!checked[i]) return i;
  }
  return total > 0 ? total - 1 : 0;
}

function countDevicesOfType(type) {
  return state.devices.filter((d) => d.type === type).length;
}

function countConnectionsBetween(fromType, toType) {
  let total = 0;
  state.connections.forEach((conn) => {
    const from = findDevice(conn.from);
    const to = findDevice(conn.to);
    if (!from || !to) return;
    const match =
      (from.type === fromType && to.type === toType) ||
      (from.type === toType && to.type === fromType);
    if (match) total += 1;
  });
  return total;
}

function countDevicesWithIp(type) {
  return state.devices.filter((d) => d.type === type && d.config?.ipAddress).length;
}

function countDevicesWithGateway(type) {
  return state.devices.filter((d) => d.type === type && d.config?.defaultGateway).length;
}

function countDevicesNameContains(type, contains) {
  const token = String(contains || "").toLowerCase();
  return state.devices.filter((d) => {
    if (type && d.type !== type) return false;
    return String(d.name || "").toLowerCase().includes(token);
  }).length;
}

function describeRequirement(req) {
  if (req.label) return req.label;
  if (req.type === "device") {
    return `Add ${req.count || 1} ${DEVICE_TYPES[req.deviceType]?.label || req.deviceType}`;
  }
  if (req.type === "connection") {
    const fromLabel = DEVICE_TYPES[req.from]?.label || req.from;
    const toLabel = DEVICE_TYPES[req.to]?.label || req.to;
    return `Connect ${req.count || 1} ${fromLabel} to ${toLabel}`;
  }
  if (req.type === "ip") {
    return `Set IP on ${req.count || 1} ${DEVICE_TYPES[req.deviceType]?.label || req.deviceType}`;
  }
  if (req.type === "gateway") {
    return `Set gateway on ${req.count || 1} ${DEVICE_TYPES[req.deviceType]?.label || req.deviceType}`;
  }
  if (req.type === "name_contains") {
    return `Rename ${DEVICE_TYPES[req.deviceType]?.label || req.deviceType} with “${req.contains}”`;
  }
  return "Complete the requirement";
}

function evaluateRequirement(req) {
  if (!req || !req.type) return { ok: false, label: "Complete the requirement" };
  const count = Number(req.count || 1);
  let ok = false;
  if (req.type === "device") ok = countDevicesOfType(req.deviceType) >= count;
  if (req.type === "connection") ok = countConnectionsBetween(req.from, req.to) >= count;
  if (req.type === "ip") ok = countDevicesWithIp(req.deviceType) >= count;
  if (req.type === "gateway") ok = countDevicesWithGateway(req.deviceType) >= count;
  if (req.type === "name_contains") ok = countDevicesNameContains(req.deviceType, req.contains) >= count;
  return { ok, label: describeRequirement(req) };
}

function evaluateTutorialStep(step) {
  const checks = Array.isArray(step.checks)
    ? step.checks
    : Array.isArray(step.requirements)
      ? step.requirements
      : step.require && typeof step.require === "object"
        ? [step.require]
        : [];

  if (!checks.length) {
    return { ok: false, manual: true, details: [] };
  }

  const details = checks.map((req) => evaluateRequirement(req));
  const ok = details.every((d) => d.ok);
  return { ok, manual: false, details };
}

function completeTutorialStep(meta, steps, index) {
  const progress = normalizeTutorialProgress(meta, steps);
  progress.checked[index] = true;
  progress.current = findNextIncomplete(progress.checked, steps.length, index);
  saveTutorialProgress(meta, progress);

  const allDone = steps.every((_, i) => progress.checked[i]);
  if (allDone) {
    showWellDoneToast(
      "Tutorial Complete!",
      "Amazing work! Returning you to the module now…"
    );
    // For lesson-linked tutorials, redirect back after 3 s.
    if (meta?.courseId && meta?.lesson != null && meta.courseId !== 0) {
      setTimeout(() => {
        window.location.href = buildReturnToModuleUrl(meta);
      }, 3000);
    }
  } else {
    showToast({
      title: "Step complete",
      message: steps[index]?.text || "Step completed.",
      variant: "success",
      timeout: 2200,
    });
  }
}

function updateTutorialGuidance() {
  if (!state.tutorialMeta) return;
  const meta = state.tutorialMeta;
  const steps = normalizeTutorialSteps(meta.steps || []);
  if (!steps.length) return;

  const progress = normalizeTutorialProgress(meta, steps);
  const currentIndex = progress.current;
  const currentStep = steps[currentIndex];
  if (!currentStep) return;

  const evaluation = evaluateTutorialStep(currentStep);
  let nextProgress = progress;
  if (evaluation.ok && !progress.checked[currentIndex]) {
    progress.checked[currentIndex] = true;
    progress.current = findNextIncomplete(progress.checked, steps.length, currentIndex);
    saveTutorialProgress(meta, progress);

    // Check if ALL steps are now complete
    const allDone = steps.every((_, i) => progress.checked[i]);
    if (allDone) {
      renderObjectives();
      updateObjectivesBanner();
      showWellDoneToast(
        "Tutorial Complete!",
        "Amazing work — every step is done! Returning you to the module…"
      );
      if (meta?.courseId && meta?.lesson != null && meta.courseId !== 0) {
        setTimeout(() => {
          window.location.href = buildReturnToModuleUrl(meta);
        }, 3000);
      }
      return;
    }

    showToast({
      title: "Step complete ✓",
      message: currentStep.text || "Step completed.",
      variant: "success",
      timeout: 2200,
    });
    if (state.rightTab === "config") setRightTab("objectives");
    nextProgress = normalizeTutorialProgress(meta, steps);
  } else if (progress.checked[currentIndex]) {
    const nextIndex = findNextIncomplete(progress.checked, steps.length, currentIndex);
    if (nextIndex !== progress.current) {
      progress.current = nextIndex;
      saveTutorialProgress(meta, progress);
      nextProgress = normalizeTutorialProgress(meta, steps);
    }
  }

  renderObjectives();
  updateObjectivesBanner();
  const activeStep = steps[nextProgress.current] || currentStep;
  const tipText = activeStep.tip || activeStep.hint || activeStep.text || meta.tips;
  if (tipText) setTip(tipText);

  applyTutorialFocus(activeStep);
  showGuide(activeStep, nextProgress.current, steps.length);
}

function notifyTutorialProgress() {
  if (state.mode === "tutorial") updateTutorialGuidance();
}

function buildChallengeProgress(rules = {}) {
  const items = [];
  const totalDevices = state.devices.length;
  const totalLinks = state.connections.length;

  if (rules.minDevices) {
    items.push({
      label: "Devices placed",
      current: totalDevices,
      target: Number(rules.minDevices),
      ok: totalDevices >= Number(rules.minDevices)
    });
  }

  if (rules.minConnections) {
    items.push({
      label: "Connections made",
      current: totalLinks,
      target: Number(rules.minConnections),
      ok: totalLinks >= Number(rules.minConnections)
    });
  }

  if (rules.requiredTypes) {
    Object.keys(rules.requiredTypes).forEach((t) => {
      const needed = Number(rules.requiredTypes[t]);
      const count = state.devices.filter((d) => d.type === t).length;
      items.push({
        label: `${DEVICE_TYPES[t]?.label || t} devices`,
        current: count,
        target: needed,
        ok: count >= needed
      });
    });
  }

  const done = items.filter((i) => i.ok).length;
  const total = items.length || 1;
  const pct = Math.round((done / total) * 100);

  return { items, done, total, pct };
}

// XP + progress logging (kept)
// ----------------------------------------
function totalXpForLevel(level) {
  return XP?.totalXpForLevel ? XP.totalXpForLevel(level) : 0;
}

function levelFromTotalXp(totalXp) {
  return XP?.levelFromTotalXp ? XP.levelFromTotalXp(totalXp) : 1;
}

function rankForLevel(level) {
  return XP?.rankForLevel ? XP.rankForLevel(level) : "Novice";
}

function resolveXpProgress(user) {
  if (XP?.resolveUserProgress) {
    const resolved = XP.resolveUserProgress(user);
    return {
      totalXp: resolved.totalXp,
      level: resolved.level,
      xpInto: resolved.xpIntoLevel,
      nextXp: resolved.nextLevelXp,
      pct: resolved.progressPercent
    };
  }

  const totalXp = Math.max(0, Number(user?.xp || 0));
  const numericLevel = Number(user?.numeric_level);
  const level = Number.isFinite(numericLevel) && numericLevel > 0 ? numericLevel : levelFromTotalXp(totalXp);
  const levelStart = totalXpForLevel(level);
  const xpInto = Number.isFinite(Number(user?.xp_into_level))
    ? Number(user?.xp_into_level)
    : Math.max(0, totalXp - levelStart);
  const nextXp = Number.isFinite(Number(user?.next_level_xp))
    ? Number(user?.next_level_xp)
    : level * 100;
  const pct = nextXp ? Math.round((xpInto / nextXp) * 100) : 0;
  return { totalXp, level, xpInto, nextXp, pct };
}

function applyXpToUser(user, addXP) {
  if (XP?.applyXpToUser) return XP.applyXpToUser(user, addXP);
  const nextTotal = Math.max(0, Number(user?.xp || 0) + Number(addXP || 0));
  return {
    ...user,
    xp: nextTotal
  };
}

function updateUserStorage(nextUser) {
  if (!nextUser || !nextUser.email) return;
  const keys = ["netology_user", "user"];
  keys.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const existing = parseJsonSafe(raw) || {};
    if (existing.email && existing.email !== nextUser.email) return;
    localStorage.setItem(key, JSON.stringify({ ...existing, ...nextUser }));
  });
}

function bumpUserXP(email, addXP) {
  if (!email || !addXP) return;
  const raw = localStorage.getItem("netology_user") || localStorage.getItem("user");
  const user = parseJsonSafe(raw) || {};
  if (!user || user.email !== email) return;
  const updated = applyXpToUser(user, addXP);
  if (localStorage.getItem("netology_user")) localStorage.setItem("netology_user", JSON.stringify(updated));
  if (localStorage.getItem("user")) localStorage.setItem("user", JSON.stringify(updated));
}

function logProgressEvent(email, payload) {
  if (!email) return;
  const entry = {
    type: payload.type,
    course_id: payload.course_id,
    lesson_number: payload.lesson_number,
    xp: Number(payload.xp || 0),
    ts: Date.now(),
    date: new Date().toISOString().slice(0, 10),
  };
  const key = `netology_progress_log:${email}`;
  const list = parseJsonSafe(localStorage.getItem(key)) || [];
  list.push(entry);
  localStorage.setItem(key, JSON.stringify(list));
}

function trackCourseStart(email, courseId, lessonNumber) {
  if (!email || !courseId) return;
  const key = `netology_started_courses:${email}`;
  const list = parseJsonSafe(localStorage.getItem(key)) || [];
  const existing = list.find((c) => String(c.id) === String(courseId));
  const payload = {
    id: String(courseId),
    lastViewed: Date.now(),
    lastLesson: Number(lessonNumber || 0) || undefined,
  };
  if (existing) {
    existing.lastViewed = payload.lastViewed;
    if (payload.lastLesson) existing.lastLesson = payload.lastLesson;
  } else {
    list.push(payload);
  }
  localStorage.setItem(key, JSON.stringify(list));
}

function markChallengeCompletion(email, courseId, lessonNumber, xpAdded) {
  if (!email || !courseId) return;
  const key = `netology_completions:${email}:${courseId}`;
  const data = parseJsonSafe(localStorage.getItem(key)) || { lesson: [], quiz: [], challenge: [] };
  const chArr = data.challenge || data.challenges || [];
  const isNew = !chArr.includes(Number(lessonNumber));
  if (isNew) {
    chArr.push(Number(lessonNumber));
    data.challenge = chArr;
    localStorage.setItem(key, JSON.stringify(data));
  }
  trackCourseStart(email, courseId, lessonNumber);
  if (isNew) {
    logProgressEvent(email, { type: "challenge", course_id: courseId, lesson_number: lessonNumber, xp: Number(xpAdded || 0) });
    bumpUserXP(email, Number(xpAdded || 0));
  }
}

// ----------------------------------------
// Lesson session DB save/load
// ----------------------------------------
const lessonSession = {
  enabled: false,
  email: "",
  course_id: null,
  content_id: null,
  module_id: null,
  lesson_number: null,
  saving: false,
  lastSaveAt: 0,
  dirty: false,
};

function lessonSessionReady() {
  return (
    lessonSession.enabled &&
    lessonSession.email &&
    lessonSession.course_id !== null &&
    lessonSession.lesson_number !== null
  );
}

function debounce(fn, delay) {
  let t = null;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), delay);
  };
}

async function saveLessonSessionToDb() {
  if (!lessonSessionReady()) return;
  if (lessonSession.saving) return;
  const now = Date.now();
  if (!lessonSession.dirty && now - lessonSession.lastSaveAt < 800) return;

  lessonSession.saving = true;
  try {
    const savePath = ENDPOINTS.sandbox?.lessonSessionSave || "/lesson-session/save";
    await fetch(`${API_BASE}${savePath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: lessonSession.email,
        course_id: lessonSession.course_id,
        lesson_number: lessonSession.lesson_number,
        devices: state.devices,
        connections: state.connections,
      }),
    });
    lessonSession.lastSaveAt = Date.now();
    lessonSession.dirty = false;
  } catch (e) {
    console.error("saveLessonSessionToDb error:", e);
  } finally {
    lessonSession.saving = false;
  }
}

const scheduleAutoSave = debounce(async () => {
  await saveLessonSessionToDb();
}, 1200);

function markDirtyAndSaveSoon() {
  if (!lessonSessionReady()) return;
  lessonSession.dirty = true;
  scheduleAutoSave();
}

async function loadLessonSessionFromDb() {
  if (!lessonSessionReady()) return;

  try {
    const loadPath = ENDPOINTS.sandbox?.lessonSessionLoad || "/lesson-session/load";
    const data = await apiGet(loadPath, {
      email: lessonSession.email,
      course_id: lessonSession.course_id,
      lesson_number: lessonSession.lesson_number
    });
    if (!data.success || !data.found) return;

    state.devices = (data.devices || []).map(normalizeDevice);
    state.connections = (data.connections || []).map(normalizeConnection).filter(Boolean);
    applyAutoNetworkDefaults();
    state.selectedIds = [];
    state.connectFrom = null;
    rebuildMacTables();
    renderAll();
    setTip("Loaded your saved lesson session from the database.");
    notifyTutorialProgress();
  } catch (e) {
    console.error("loadLessonSessionFromDb error:", e);
  }
}

// ----------------------------------------
// Chrome (top nav + sidebar)
// ----------------------------------------
function getLoggedInUser() {
  const raw = localStorage.getItem("user") || localStorage.getItem("netology_user") || "{}";
  return parseJsonSafe(raw) || {};
}

function buildReturnToModuleUrl(context = null) {
  const courseId = Number(context?.courseId || lessonSession?.course_id || 0);
  if (!courseId) return "courses.html";
  const contentId = context?.contentId || lessonSession?.content_id || courseId;
  const moduleId = context?.moduleId || lessonSession?.module_id || null;

  const query = new URLSearchParams();
  query.set("id", String(courseId));
  query.set("content_id", String(contentId));
  if (moduleId) query.set("module", String(moduleId));
  return `course.html?${query.toString()}`;
}

async function refreshUserFromServer(email) {
  if (!email) return null;
  try {
    const data = await apiGet(ENDPOINTS.auth?.userInfo || "/user-info", { email });
    if (!data || data.success === false) return null;
    updateUserStorage(data);
    fillIdentity(data);
    return data;
  } catch {
    return null;
  }
}

function setText(id, text) {
  const el = getById(id);
  if (el) el.textContent = String(text ?? "");
}

function initChrome() {
  const user = getLoggedInUser();
  if (user && user.email) {
    wireChrome(user);
  } else {
    wireChromeGuest();
  }
  wireBrandRouting(!!(user && user.email));
}

function wireBrandRouting(isAuthed) {
  const topBrand = getById("topBrand");
  const sideBrand = getById("sideBrand");
  const href = isAuthed ? "dashboard.html" : "index.html";
  if (topBrand) topBrand.setAttribute("href", href);
  if (sideBrand) sideBrand.setAttribute("href", href);
}

function wireChromeGuest() {
  setText("topAvatar", "G");
  setText("ddAvatar", "G");
  setText("ddName", "Guest");
  setText("ddEmail", "Sign in to track progress");
  setText("ddLevel", "Level —");
  setText("ddRank", "Guest");

  setText("sideAvatar", "G");
  setText("sideUserName", "Guest");
  setText("sideUserEmail", "Sign in to save progress");
  setText("sideLevelBadge", "Lv —");
  setText("sideXpText", "—");
  setText("sideXpHint", "Sign in to track XP");
  const bar = getById("sideXpBar");
  if (bar) bar.style.width = "0%";

  const topLogout = getById("topLogoutBtn");
  const sideLogout = getById("sideLogoutBtn");
  if (topLogout) topLogout.style.display = "none";
  if (sideLogout) sideLogout.style.display = "none";

  wireSidebar();
  wireUserDropdown();
}

function wireChrome(user) {
  wireSidebar();
  wireUserDropdown();
  fillIdentity(user);

  const topLogout = getById("topLogoutBtn");
  const sideLogout = getById("sideLogoutBtn");
  if (topLogout) topLogout.addEventListener("click", logout);
  if (sideLogout) sideLogout.addEventListener("click", logout);
}

function wireSidebar() {
  const openBtn = getById("openSidebarBtn");
  const closeBtn = getById("closeSidebarBtn");
  const sidebar = getById("slideSidebar");
  const backdrop = getById("sideBackdrop");

  const open = () => {
    if (!sidebar || !backdrop) return;
    sidebar.classList.add("is-open");
    backdrop.classList.add("is-open");
    document.body.classList.add("net-noscroll");
    sidebar.setAttribute("aria-hidden", "false");
    backdrop.setAttribute("aria-hidden", "false");
  };

  const close = () => {
    if (!sidebar || !backdrop) return;
    sidebar.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    document.body.classList.remove("net-noscroll");
    sidebar.setAttribute("aria-hidden", "true");
    backdrop.setAttribute("aria-hidden", "true");
  };

  openBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      close();
      toggleDropdown(false);
    }
  });
}

function wireUserDropdown() {
  const userBtn = getById("userBtn");
  const dd = getById("userDropdown");

  userBtn?.addEventListener("click", () => {
    const expanded = userBtn.getAttribute("aria-expanded") === "true";
    toggleDropdown(!expanded);
  });

  document.addEventListener("click", (e) => {
    if (!dd || !userBtn) return;
    if (dd.contains(e.target) || userBtn.contains(e.target)) return;
    toggleDropdown(false);
  });
}

function toggleDropdown(open) {
  const userBtn = getById("userBtn");
  const dd = getById("userDropdown");
  if (!userBtn || !dd) return;
  dd.classList.toggle("is-open", !!open);
  userBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

function fillIdentity(user) {
  const name = user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "Student";
  const email = user?.email || "";
  const initial = name.trim().charAt(0).toUpperCase();
  const progress = resolveXpProgress(user);

  setText("topAvatar", initial);
  setText("ddAvatar", initial);
  setText("ddName", name);
  setText("ddEmail", email || "email@example.com");
  setText("ddLevel", `Level ${progress.level}`);
  setText("ddRank", String(user?.level || user?.rank || user?.unlock_tier || "Novice").replace(/^\w/, (c) => c.toUpperCase()));

  setText("sideAvatar", initial);
  setText("sideUserName", name);
  setText("sideUserEmail", email || "email@example.com");
  setText("sideLevelBadge", `Lv ${progress.level}`);
  setText("sideXpText", `${progress.xpInto}/${progress.nextXp}`);
  setText("sideXpHint", `${Math.max(0, progress.nextXp - progress.xpInto)} XP to next level`);
  const bar = getById("sideXpBar");
  if (bar) bar.style.width = `${Math.min(100, progress.pct)}%`;
}

function logout() {
  localStorage.removeItem("netology_user");
  localStorage.removeItem("user");
  localStorage.removeItem("netology_token");
  window.location.href = "login.html";
}

// ----------------------------------------
// Challenge Completion Overlay
// ----------------------------------------
function showChallengeCompleteOverlay(xpGained, alreadyDone) {
  const overlay = getById("sbxCompleteOverlay");
  if (!overlay) return;

  // Set return-to-module link
  const returnBtn = getById("sbxCompleteReturn");
  if (returnBtn) {
    returnBtn.textContent = "Return to module";
    returnBtn.href = buildReturnToModuleUrl();
  }

  // Show XP badge
  const xpEl  = getById("sbxCompleteXp");
  const xpAmt = getById("sbxCompleteXpAmount");
  if (xpEl && xpAmt) {
    if (!alreadyDone && xpGained > 0) {
      xpAmt.textContent = `+${xpGained}`;
      xpEl.style.display = "";
    } else {
      xpEl.style.display = "none";
    }
  }

  // Spawn confetti
  const confettiEl = getById("sbxCompleteConfetti");
  if (confettiEl) {
    clearChildren(confettiEl);
    const colors = ["#06b6d4", "#14b8a6", "#f59e0b", "#22c55e", "#a78bfa", "#38bdf8"];
    for (let i = 0; i < 50; i++) {
      const p = document.createElement("span");
      const sz = 5 + Math.random() * 7;
      p.style.cssText = `left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};width:${sz}px;height:${sz}px;animation-delay:${Math.random() * 1.2}s;animation-duration:${2 + Math.random() * 2}s;`;
      confettiEl.appendChild(p);
    }
  }

  overlay.classList.remove("d-none");

  // Close button
  const closeBtn = getById("sbxCompleteClose");
  if (closeBtn) {
    closeBtn.onclick = () => overlay.classList.add("d-none");
  }
}

// ----------------------------------------
// Challenge validation
// ----------------------------------------
async function handleChallengeValidate() {
  if (!state.challengeMeta) return;
  const resultBox = getById("challengeResult");
  const returnBox = getById("challengeReturn");
  const user = getLoggedInUser();

  const validation = validateChallenge(state.challengeMeta.rules || {});
  if (!resultBox) return;

  if (!validation.ok) {
    setStatusBox(resultBox, "small text-danger fw-semibold", "bi-x-circle", String(validation.reason || "Validation failed."));
    return;
  }

  setStatusBox(resultBox, "small text-success fw-semibold", "bi-check2-circle", "Passed! Saving + awarding XP…");

  try {
    await saveLessonSessionToDb();
    const earnedXp = Number(state.challengeMeta?.xp || 0);

    const challengePath = ENDPOINTS.courses?.completeChallenge || "/complete-challenge";
    const xpRes = await fetch(`${API_BASE}${challengePath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        course_id: lessonSession.course_id,
        lesson_number: lessonSession.lesson_number,
        earned_xp: earnedXp,
      }),
    });

    const xpData = await xpRes.json();
    if (xpData.success) {
      const alreadyDone = xpData.already_completed;
      const xpGained = Number(xpData.xp_added || 0);
      const achievementXp = Number(xpData.achievement_xp_added || 0);
      const totalXpGained = xpGained + achievementXp;
      const newlyUnlocked = Array.isArray(xpData.newly_unlocked) ? xpData.newly_unlocked : [];
      if (newlyUnlocked.length && window.NetologyAchievements?.queueUnlocks) {
        window.NetologyAchievements.queueUnlocks(user.email, newlyUnlocked);
      }

      if (alreadyDone) {
        setStatusBox(resultBox, "small text-success fw-semibold", "bi-check2-circle", "Passed! Challenge already completed.");
      } else {
        setStatusBox(resultBox, "small text-success fw-semibold", "bi-check2-circle", `Passed! +${totalXpGained} XP earned.`);
      }
      markChallengeCompletion(
        user.email,
        lessonSession.course_id,
        lessonSession.lesson_number,
        totalXpGained
      );
      await refreshUserFromServer(user.email);
      // Show celebration overlay
      showChallengeCompleteOverlay(totalXpGained, alreadyDone);
    } else {
      setStatusBox(resultBox, "small text-warning fw-semibold", "bi-exclamation-triangle", "Passed, but XP award failed.");
    }

    if (returnBox) {
      clearChildren(returnBox);
      const link = makeEl("a", "btn btn-outline-secondary btn-sm w-100", "Return to module");
      link.href = buildReturnToModuleUrl();
      returnBox.appendChild(link);
    }
  } catch (e) {
    console.error("Challenge validate error", e);
    setStatusBox(resultBox, "small text-warning fw-semibold", "bi-exclamation-triangle", "Passed, but could not save/award XP.");
  }
}

function validateChallenge(rules) {
  if (rules.requiredTypes) {
    for (const t in rules.requiredTypes) {
      const count = state.devices.filter((d) => d.type === t).length;
      if (count < rules.requiredTypes[t]) return { ok: false, reason: `Need ${rules.requiredTypes[t]} ${t}(s)` };
    }
  }
  if (rules.requireConnections && state.connections.length === 0) return { ok: false, reason: "No connections" };
  if (rules.minDevices && state.devices.length < Number(rules.minDevices)) return { ok: false, reason: `Need at least ${rules.minDevices} devices` };
  if (rules.minConnections && state.connections.length < Number(rules.minConnections)) return { ok: false, reason: `Need at least ${rules.minConnections} connections` };
  return { ok: true };
}

// ----------------------------------------
// Challenge initialization
// ----------------------------------------
async function initChallenge() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("challenge") !== "1") return false;

  const user = getLoggedInUser();
  if (!user || !user.email) return false;

  const raw = localStorage.getItem("netology_active_challenge");
  if (!raw) return false;

  const data = parseJsonSafe(raw);
  if (!data) return false;

  lessonSession.enabled = true;
  lessonSession.email = user.email;
  lessonSession.course_id = Number(data.courseId);
  lessonSession.content_id = Number(data.contentId || data.courseId);
  lessonSession.module_id = data.moduleId || null;
  lessonSession.lesson_number = Number(data.lesson);

  state.challengeMeta = {
    rules: data.challenge?.rules || data.challenge || {},
    steps: data.challenge?.steps || [],
    tips: data.challenge?.tips || "",
    xp: Number(data.challenge?.xp || data.challengeXp || data.xp || 0),
  };
  state.mode = "challenge";

  const banner = getById("challengeBanner");
  const bannerText = getById("challengeBannerText");
  if (banner && bannerText) {
    banner.style.display = "block";
    banner.classList.remove("is-tutorial");
    const title = banner.querySelector(".sbx-challenge-title");
    if (title) title.textContent = "Sandbox challenge";
    bannerText.textContent = `${data.courseTitle || "Course"} • ${data.unitTitle || ""} • Lesson ${data.lesson}: ${data.lessonTitle || ""}`;
  }

  await loadLessonSessionFromDb();
  renderObjectives();
  showToast({
    title: "Challenge mode",
    message: "No guided hints. Complete the checklist to pass.",
    variant: "info",
    timeout: 2600,
  });
  return true;
}

async function initTutorial() {
  if (state.mode === "challenge") return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") !== "practice") return false;

  const user = getLoggedInUser();
  const raw = localStorage.getItem("netology_active_tutorial");
  if (!raw) return false;

  const data = parseJsonSafe(raw);
  if (!data) return false;

  if (user && user.email) {
    lessonSession.enabled = true;
    lessonSession.email = user.email;
    lessonSession.course_id = Number(data.courseId);
    lessonSession.content_id = Number(data.contentId || data.courseId);
    lessonSession.module_id = data.moduleId || null;
    lessonSession.lesson_number = Number(data.lesson);
  }

  state.tutorialMeta = {
    courseId: Number(data.courseId),
    contentId: Number(data.contentId || data.courseId),
    moduleId: data.moduleId || null,
    lesson: Number(data.lesson),
    email: user?.email || "guest",
    steps: data.tutorial?.steps || data.steps || [],
    tips: data.tutorial?.tips || data.tips || "",
    xp: Number(data.tutorial?.xp || data.xp || 0),
  };
  state.mode = "tutorial";

  const banner = getById("challengeBanner");
  const bannerText = getById("challengeBannerText");
  if (banner && bannerText) {
    banner.style.display = "block";
    banner.classList.add("is-tutorial");
    const title = banner.querySelector(".sbx-challenge-title");
    if (title) title.textContent = "Sandbox tutorial";
    bannerText.textContent = `${data.courseTitle || "Course"} • ${data.unitTitle || ""} • Lesson ${data.lesson}: ${data.lessonTitle || ""}`;
  }

  if (lessonSession.enabled) await loadLessonSessionFromDb();
  renderObjectives();
  notifyTutorialProgress();
  return true;
}
