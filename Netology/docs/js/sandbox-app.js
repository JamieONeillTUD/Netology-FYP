/*
  Student: C22320301 - Jamie O'Neill
  File: sandbox-app.js
  Purpose: Main entry point for the Netology network sandbox.
           Handles initialisation, tutorials, objectives, templates,
           connection suggestions, idle hints, and auto-save.
*/

// Wait for the DOM to be ready before setting everything up
document.addEventListener("DOMContentLoaded", function () {

  // Setup everything
  applyCanvasWorldSize();
  updateGrid();
  updateZoomLabel();
  pushHistory();
  initTerminalWindowControls();
  loadConsoleHistory();
  registerConsoleApi();
  renderAll();

  // Bind all the different UI pieces
  bindTooltips();
  bindLibraryDrag();
  bindToolbar();
  bindPanels();
  bindStage();
  bindKeyboardShortcuts();
  bindMouseWheelZoom();
  bindContextMenu();
  bindDeviceContextMenu();
  patchMultiSelect();
  bindDeviceFilter();
  bindDeviceGroupCollapse();
  bindTemplateButtons();
  bindTutorialCarousel();
  bindTutorialsToggle();

  // Remove loading skeleton and reveal the sandbox
  document.body.classList.remove("net-loading");

  // Show the console welcome message
  if (window.sandboxConsole && window.sandboxConsole.showWelcome) {
    window.sandboxConsole.showWelcome();
  }

  // Load the sandbox data from the lesson if we came from a course page
  loadSandboxFromUrl();

  // Start the idle timer
  setupIdleHints();

  // Start auto-save
  setupAutoSave();

  // Start the connection suggestions system
  setupConnectionSuggestions();

  // Start onboarding tour if active for this stage
  if (typeof window.maybeStartOnboardingTour === "function") {
    var sbxUser = null;
    try { sbxUser = JSON.parse(localStorage.getItem("user") || localStorage.getItem("netology_user")); } catch (e) {}
    if (sbxUser && sbxUser.email) {
      window.maybeStartOnboardingTour("sandbox", sbxUser.email);
    }
  }
});


// Load sandbox lesson/tutorial/challenge data from the URL params
function loadSandboxFromUrl() {
  var params    = new URLSearchParams(window.location.search);
  var courseId  = params.get("course");
  var unitIndex = Number(params.get("unit") || -1);
  var mode      = params.get("mode") || "free";
  var topologyId = params.get("topology");

  if (topologyId) {
    loadTopologyById(topologyId);
    return;
  }

  if (!courseId || unitIndex < 0 || mode === "free") return;

  // Try to load from localStorage first (set by course.js)
  var savedTutorial = null;
  var savedChallenge = null;

  try {
    var tutorialData = localStorage.getItem("netology_active_tutorial");
    if (tutorialData) {
      savedTutorial = JSON.parse(tutorialData);
    }

    var challengeData = localStorage.getItem("netology_active_challenge");
    if (challengeData) {
      savedChallenge = JSON.parse(challengeData);
    }
  } catch (e) {
    // ignore parse errors
  }

  // Load from localStorage if available, otherwise from COURSE_CONTENT
  var content = window.COURSE_CONTENT && window.COURSE_CONTENT[String(courseId)];
  if (!content) return;
  var units = content.units || content.modules || [];
  var unit  = units[unitIndex];
  if (!unit) return;

  if (mode === "practice") {
    var tutorialContent = savedTutorial || unit.sandbox;
    if (tutorialContent) {
      loadSandboxContent({ tutorial: tutorialContent });
    }
  } else if (mode === "challenge") {
    var challengeContent = savedChallenge || unit.challenge;
    if (challengeContent) {
      loadSandboxContent({ challenge: challengeContent });
    }
  }
}

function clonePlainObject(source) {
  var output = {};
  var keys = Object.keys(source || {});
  for (var i = 0; i < keys.length; i++) {
    output[keys[i]] = source[keys[i]];
  }
  return output;
}

function buildRuleChecksForChallenge(rules) {
  var safeRules = rules && typeof rules === "object" ? rules : {};
  var checks = { deviceChecks: [], connectionChecks: [] };

  var requiredTypes = safeRules.requiredTypes || {};
  var requiredKeys = Object.keys(requiredTypes);
  for (var index = 0; index < requiredKeys.length; index++) {
    var deviceType = requiredKeys[index];
    var deviceCount = Number(requiredTypes[deviceType]);
    if (!deviceType || !Number.isFinite(deviceCount) || deviceCount <= 0) continue;
    checks.deviceChecks.push({
      type: "device",
      deviceType: deviceType,
      count: deviceCount
    });
  }

  var minDevices = Number(safeRules.minDevices || 0);
  if (Number.isFinite(minDevices) && minDevices > 0) {
    checks.deviceChecks.push({
      type: "min_devices",
      count: minDevices
    });
  }

  var minConnections = Number(safeRules.minConnections || 0);
  if (Number.isFinite(minConnections) && minConnections > 0) {
    checks.connectionChecks.push({
      type: "min_connections",
      count: minConnections
    });
  }

  return checks;
}

function normaliseLessonSteps(rawData, mode) {
  var data = clonePlainObject(rawData || {});
  var rawSteps = Array.isArray(data.steps) ? data.steps : [];
  var normalisedSteps = [];
  var hasStepChecks = false;

  for (var stepIndex = 0; stepIndex < rawSteps.length; stepIndex++) {
    var rawStep = rawSteps[stepIndex];
    if (rawStep && typeof rawStep === "object" && !Array.isArray(rawStep)) {
      var copiedStep = clonePlainObject(rawStep);
      if (!copiedStep.text) {
        copiedStep.text = copiedStep.title || ("Step " + (stepIndex + 1));
      }
      if (Array.isArray(copiedStep.checks) && copiedStep.checks.length > 0) {
        hasStepChecks = true;
      }
      normalisedSteps.push(copiedStep);
    } else {
      normalisedSteps.push({
        text: String(rawStep || ("Step " + (stepIndex + 1))),
        checks: []
      });
    }
  }

  if (mode === "challenge" && !hasStepChecks) {
    var checks = buildRuleChecksForChallenge(data.rules || {});
    var hasRuleChecks = checks.deviceChecks.length > 0 || checks.connectionChecks.length > 0;

    if (hasRuleChecks) {
      if (!normalisedSteps.length) {
        normalisedSteps.push({ text: "Meet the challenge requirements.", checks: [] });
      }

      if (checks.deviceChecks.length > 0) {
        normalisedSteps[0].checks = checks.deviceChecks.slice();
      }

      if (checks.connectionChecks.length > 0) {
        if (normalisedSteps.length > 1) {
          normalisedSteps[1].checks = checks.connectionChecks.slice();
        } else {
          var existingChecks = Array.isArray(normalisedSteps[0].checks) ? normalisedSteps[0].checks : [];
          normalisedSteps[0].checks = existingChecks.concat(checks.connectionChecks);
        }
      }
    }
  }

  data.steps = normalisedSteps;
  return data;
}

// Load sandbox content (tutorial and/or challenge) into the sandbox
function loadSandboxContent(sandboxData) {
  if (!sandboxData) {
    return;
  }

  // Load tutorial if present
  if (sandboxData.tutorial) {
    var tutorialData = normaliseLessonSteps(sandboxData.tutorial, "tutorial");
    state.tutorialMeta = tutorialData;
    state.mode = "tutorial";
    renderLessonUI(tutorialData, "tutorial");
  }

  // Load challenge if present
  if (sandboxData.challenge) {
    var challengeData = normaliseLessonSteps(sandboxData.challenge, "challenge");
    state.challengeMeta = challengeData;
    state.mode = "challenge";
    renderLessonUI(challengeData, "challenge");
  }

  // Load preset devices if the sandbox content provides them
  if (sandboxData.presetDevices && sandboxData.presetDevices.length > 0) {
    for (var i = 0; i < sandboxData.presetDevices.length; i++) {
      state.devices.push(normalizeDevice(sandboxData.presetDevices[i]));
    }
  }
  if (sandboxData.presetConnections && sandboxData.presetConnections.length > 0) {
    for (var j = 0; j < sandboxData.presetConnections.length; j++) {
      state.connections.push(normalizeConnection(sandboxData.presetConnections[j]));
    }
  }

  pushHistory();
  renderAll();
}


// Build the premium lesson UI for a tutorial or challenge
function renderLessonUI(data, type) {
  if (!data) {
    return;
  }

  // Hide the free mode banner
  var modeBanner = getById("sbxModeBanner");
  if (modeBanner) {
    modeBanner.style.display = "none";
  }

  // Show the lesson header
  var header = getById("sbxLessonHeader");
  var lessonIcon = getById("sbxLessonIcon");
  var lessonType = getById("sbxLessonType");
  var lessonTitle = getById("sbxLessonTitle");
  var lessonXp = getById("sbxLessonXp");
  var lessonXpAmount = getById("sbxLessonXpAmount");

  if (header) {
    header.style.display = "";
    if (type === "challenge") {
      header.classList.add("is-challenge");
    }
  }
  if (lessonIcon) {
    if (type === "challenge") {
      lessonIcon.innerHTML = '<i class="bi bi-trophy-fill"></i>';
    } else {
      lessonIcon.innerHTML = '<i class="bi bi-mortarboard-fill"></i>';
    }
  }
  if (lessonType) {
    lessonType.textContent = type === "challenge" ? "Challenge" : "Tutorial";
  }
  if (lessonTitle) {
    lessonTitle.textContent = data.title || "Untitled";
  }
  if (data.xp && data.xp > 0 && lessonXp && lessonXpAmount) {
    lessonXp.style.display = "";
    lessonXpAmount.textContent = data.xp;
  }

  // Build the steps list
  if (data.steps && data.steps.length > 0) {
    // Show the progress bar
    var progressWrap = getById("sbxProgressWrap");
    if (progressWrap) {
      progressWrap.style.display = "";
    }
    updateProgressBar(0, data.steps.length);

    // Show the current step spotlight
    showCurrentStep(data.steps, 0);

    // Build all steps
    var stepsWrap = getById("sbxStepsWrap");
    var stepsList = getById("sbxStepsList");
    if (stepsWrap && stepsList) {
      stepsWrap.style.display = "";
      stepsList.innerHTML = "";

      for (var i = 0; i < data.steps.length; i++) {
        var step = data.steps[i];
        var stepItem = document.createElement("li");
        stepItem.className = "sbx-step";
        stepItem.setAttribute("data-step-index", i);

        // Step number is handled by CSS counter

        var stepText = document.createElement("span");
        stepText.className = "sbx-step-text";
        stepText.textContent = step.text || "Step " + (i + 1);
        stepItem.appendChild(stepText);

        var statusIcon = document.createElement("i");
        statusIcon.className = "bi bi-circle sbx-step-status";
        statusIcon.setAttribute("data-step-index", i);
        stepItem.appendChild(statusIcon);

        // Hint button for each step
        if (step.hint) {
          var hintBtn = document.createElement("button");
          hintBtn.className = "sbx-step-hint-btn";
          hintBtn.setAttribute("data-hint", step.hint);
          hintBtn.innerHTML = '<i class="bi bi-lightbulb"></i>';
          hintBtn.title = "Show hint";
          hintBtn.addEventListener("click", function (event) {
            event.stopPropagation();
            var hintText = this.getAttribute("data-hint");
            showSandboxToast({ title: "Hint", message: hintText, variant: "info", timeout: 6000 });
          });
          stepItem.appendChild(hintBtn);
        }

        stepsList.appendChild(stepItem);
      }
    }

    // Wire the steps toggle (expand/collapse)
    var stepsToggle = getById("sbxStepsToggle");
    if (stepsToggle && stepsList) {
      stepsToggle.addEventListener("click", function () {
        stepsList.classList.toggle("is-collapsed");
        var chevron = stepsToggle.querySelector(".sbx-steps-chevron");
        if (chevron) {
          chevron.classList.toggle("is-flipped");
        }
      });
    }
  }

  // Show tips if available
  if (data.tips) {
    var tipsBox = getById("sbxTipsBox");
    var tipsText = getById("sbxTipsText");
    if (tipsBox && tipsText) {
      tipsBox.style.display = "";
      tipsText.textContent = data.tips;
    }
  }
}


// Update the progress bar
function updateProgressBar(completed, total) {
  var fill = getById("sbxProgressFill");
  var text = getById("sbxProgressText");

  if (total <= 0) {
    return;
  }

  var percent = Math.round((completed / total) * 100);
  if (fill) {
    fill.style.width = percent + "%";
  }
  if (text) {
    text.textContent = completed + " of " + total + " complete";
  }
}


// Show the current active step in the spotlight area
function showCurrentStep(steps, currentIndex) {
  var currentStepBox = getById("sbxCurrentStep");
  var currentStepText = getById("sbxCurrentStepText");
  var currentStepHint = getById("sbxCurrentStepHint");

  if (!currentStepBox || !currentStepText) {
    return;
  }

  if (currentIndex >= steps.length) {
    // All done — hide the current step
    currentStepBox.style.display = "none";
    return;
  }

  var step = steps[currentIndex];
  currentStepBox.style.display = "";
  currentStepText.textContent = "Step " + (currentIndex + 1) + ": " + (step.text || "");

  // Show hint button if available
  if (step.hint && currentStepHint) {
    currentStepHint.style.display = "";
    // Remove old listeners by replacing
    var newHintBtn = currentStepHint.cloneNode(true);
    currentStepHint.parentNode.replaceChild(newHintBtn, currentStepHint);
    newHintBtn.addEventListener("click", function () {
      showSandboxToast({ title: "Hint", message: step.hint, variant: "info", timeout: 6000 });
    });
  } else if (currentStepHint) {
    currentStepHint.style.display = "none";
  }
}


// Render the objectives (called from renderAll)
function renderObjectives() {
  var data = state.tutorialMeta || state.challengeMeta;
  if (!data || !data.steps) {
    return;
  }

  var completedCount = 0;
  var firstIncomplete = -1;

  for (var i = 0; i < data.steps.length; i++) {
    var step = data.steps[i];
    var passed = evaluateStepRequirements(step, i);
    var wasAlreadyDone = state.objectiveStatus[i] === true;
    state.objectiveStatus[i] = passed;

    if (passed) {
      completedCount++;
    } else if (firstIncomplete === -1) {
      firstIncomplete = i;
    }

    // Update the step in the list
    var stepsList = getById("sbxStepsList");
    if (stepsList) {
      var icon = stepsList.querySelector('.sbx-step-status[data-step-index="' + i + '"]');
      var stepElement = stepsList.querySelector('.sbx-step[data-step-index="' + i + '"]');

      if (icon) {
        if (passed) {
          icon.className = "bi bi-check-circle-fill text-success sbx-step-status";
        } else {
          icon.className = "bi bi-circle sbx-step-status";
        }
        icon.setAttribute("data-step-index", i);
      }
      if (stepElement) {
        if (passed) {
          stepElement.classList.add("is-done");
          // Highlight the step that just completed
          if (!wasAlreadyDone) {
            stepElement.classList.add("is-just-done");
            setTimeout(function (el) {
              return function () { el.classList.remove("is-just-done"); };
            }(stepElement), 1500);
          }
        } else {
          stepElement.classList.remove("is-done");
        }

        // Mark current active step
        if (i === firstIncomplete) {
          stepElement.classList.add("is-current");
        } else {
          stepElement.classList.remove("is-current");
        }
      }
    }
  }

  // Update progress bar
  updateProgressBar(completedCount, data.steps.length);

  // Update current step spotlight
  if (firstIncomplete >= 0) {
    showCurrentStep(data.steps, firstIncomplete);
  } else {
    showCurrentStep(data.steps, data.steps.length);
  }

  // Check if all steps are complete
  if (completedCount === data.steps.length && data.steps.length > 0) {
    handleAllObjectivesComplete();
  }
}

// Notify tutorial progress (called after topology changes)
function notifyTutorialProgress() {
  renderObjectives();
}


function arePreviousStepsCompleted(stepIndex) {
  for (var i = 0; i < stepIndex; i++) {
    if (state.objectiveStatus[i] !== true) {
      return false;
    }
  }
  return true;
}

// Evaluate whether a step's requirements are met
function evaluateStepRequirements(step, stepIndex) {
  if (!step) {
    return false;
  }

  if (!Array.isArray(step.checks) || step.checks.length === 0) {
    return arePreviousStepsCompleted(Number(stepIndex || 0));
  }

  // Every check in the step must pass
  for (var i = 0; i < step.checks.length; i++) {
    var check = step.checks[i];
    var passed = evaluateSingleRequirement(check);
    if (!passed) {
      return false;
    }
  }
  return true;
}

// Evaluate one individual requirement check
function evaluateSingleRequirement(check) {
  if (!check || !check.type) {
    return false;
  }

  if (check.type === "device") {
    // Count devices of the specified type
    var deviceCount = 0;
    for (var i = 0; i < state.devices.length; i++) {
      if (state.devices[i].type === check.deviceType) {
        deviceCount++;
      }
    }
    return deviceCount >= (check.count || 1);
  }

  if (check.type === "min_devices") {
    var requiredDevices = Number(check.count || 1);
    if (!Number.isFinite(requiredDevices) || requiredDevices <= 0) {
      requiredDevices = 1;
    }
    return state.devices.length >= requiredDevices;
  }

  if (check.type === "min_connections") {
    var requiredConnections = Number(check.count || 1);
    if (!Number.isFinite(requiredConnections) || requiredConnections <= 0) {
      requiredConnections = 1;
    }
    return state.connections.length >= requiredConnections;
  }

  if (check.type === "connection") {
    // Count connections between the specified device types
    var connectionCount = 0;
    for (var j = 0; j < state.connections.length; j++) {
      var conn = state.connections[j];
      var fromDevice = findDevice(conn.from);
      var toDevice = findDevice(conn.to);
      if (!fromDevice || !toDevice) {
        continue;
      }
      // Check both directions since connections can be either way
      var matchForward = (fromDevice.type === check.from && toDevice.type === check.to);
      var matchReverse = (fromDevice.type === check.to && toDevice.type === check.from);
      if (matchForward || matchReverse) {
        connectionCount++;
      }
    }
    return connectionCount >= (check.count || 1);
  }

  if (check.type === "ip") {
    // Count devices of the specified type that have IP addresses set
    var ipCount = 0;
    for (var k = 0; k < state.devices.length; k++) {
      var device = state.devices[k];
      if (device.type === check.deviceType && device.config && device.config.ipAddress) {
        ipCount++;
      }
    }
    return ipCount >= (check.count || 1);
  }

  if (check.type === "gateway") {
    // Count devices of the specified type that have gateways set
    var gatewayCount = 0;
    for (var g = 0; g < state.devices.length; g++) {
      var gwDevice = state.devices[g];
      if (gwDevice.type === check.deviceType && gwDevice.config && gwDevice.config.defaultGateway) {
        gatewayCount++;
      }
    }
    return gatewayCount >= (check.count || 1);
  }

  if (check.type === "name_contains") {
    // Count devices whose name contains the specified text
    var nameCount = 0;
    var searchText = (check.contains || "").toLowerCase();
    for (var n = 0; n < state.devices.length; n++) {
      var namedDevice = state.devices[n];
      if (check.deviceType && namedDevice.type !== check.deviceType) {
        continue;
      }
      if (namedDevice.name.toLowerCase().indexOf(searchText) !== -1) {
        nameCount++;
      }
    }
    return nameCount >= (check.count || 1);
  }

  if (check.type === "ping_success") {
    // Check if the last ping was successful
    if (state.pingInspector && state.pingInspector.success) {
      return true;
    }
    return false;
  }

  // Unknown check type
  return false;
}


// Handle all objectives being complete
function handleAllObjectivesComplete() {
  var data = state.tutorialMeta || state.challengeMeta;
  if (!data) {
    return;
  }

  // Only fire once
  if (data.completed) {
    return;
  }
  data.completed = true;

  var xpAmount = data.xp || 0;
  var isChallengeMode = !!state.challengeMeta;
  var message = isChallengeMode ? "Challenge complete!" : "Tutorial complete!";

  if (isChallengeMode) {
    recordChallengeCompletionToServer(xpAmount);
  } else {
    markTutorialCompletionInLocalStorage(data);
  }

  // Show the inline done panel in objectives
  var donePanel = getById("sbxLessonDone");
  if (donePanel) {
    donePanel.style.display = "";
  }

  // Hide the current step spotlight since everything is done
  var currentStepBox = getById("sbxCurrentStep");
  if (currentStepBox) {
    currentStepBox.style.display = "none";
  }

  // Show toast notification
  showSandboxToast({
    title: message,
    message: (xpAmount > 0 ? "You earned " + xpAmount + " XP!" : "Well done!"),
    variant: "success",
    timeout: 5000
  });

  // Award XP to the user
  if (xpAmount > 0) {
    awardSandboxXp(xpAmount);
  }

  // Also show the full-screen celebration overlay for challenges
  if (isChallengeMode) {
    showCompletionOverlay(data, xpAmount);
  }

  addActionLog(message + (xpAmount > 0 ? " +" + xpAmount + " XP" : ""));

  // Wire up the done panel buttons
  var continueBtn = getById("sbxLessonDoneContinue");
  if (continueBtn) {
    continueBtn.addEventListener("click", function () {
      var donePanel = getById("sbxLessonDone");
      if (donePanel) {
        donePanel.style.display = "none";
      }
    });
  }
  var returnBtn = getById("sbxLessonDoneReturn");
  if (returnBtn) {
    var params = new URLSearchParams(window.location.search);
    var courseId = params.get("course");
    if (courseId) {
      returnBtn.href = "course.html?id=" + courseId;
    } else {
      returnBtn.href = "courses.html";
    }
  }
}

function getSandboxRouteContext() {
  var params = new URLSearchParams(window.location.search);
  var courseId = params.get("course");
  var unitIndex = Number(params.get("unit"));
  if (!courseId || !Number.isFinite(unitIndex) || unitIndex < 0) {
    return null;
  }
  return {
    courseId: String(courseId),
    unitIndex: unitIndex,
    unitNumber: unitIndex + 1
  };
}

function markTutorialCompletionInLocalStorage(data) {
  var user = getStoredUser();
  var ctx = getSandboxRouteContext();
  if (!user || !user.email || !ctx) {
    return;
  }

  var key = "netology_tutorial_progress:" + user.email + ":" + ctx.courseId + ":" + ctx.unitNumber;
  var steps = Array.isArray(data && data.steps) ? data.steps : [];
  var checked = [];
  for (var stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    checked.push(state.objectiveStatus[stepIndex] === true);
  }
  if (!checked.length) {
    checked = [true];
  }

  var payload = {
    checked: checked,
    completed: true,
    updated_at: Date.now()
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

function recordChallengeCompletionToServer(xpAmount) {
  var user = getStoredUser();
  var ctx = getSandboxRouteContext();
  if (!user || !user.email || !ctx) {
    return;
  }

  var apiBase = String(window.API_BASE || "").replace(/\/$/, "");
  if (!apiBase) return;

  var endpoint = (window.ENDPOINTS && window.ENDPOINTS.courses && window.ENDPOINTS.courses.completeChallenge) || "/complete-challenge";
  var url = apiBase + endpoint;

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      course_id: String(ctx.courseId),
      lesson_number: ctx.unitNumber,
      earned_xp: Number(xpAmount || 0)
    })
  }).catch(function (error) {
    console.warn("Could not record challenge completion:", error);
  });
}

// Show the full-screen challenge completion overlay
function showCompletionOverlay(data, xpAmount) {
  var overlay = getById("sbxCompleteOverlay");
  var titleEl = getById("sbxCompleteTitle");
  var xpWrap = getById("sbxCompleteXp");
  var xpAmountEl = getById("sbxCompleteXpAmount");
  var closeBtn = getById("sbxCompleteClose");

  if (!overlay) {
    return;
  }

  overlay.classList.remove("d-none");

  if (titleEl) {
    titleEl.textContent = (data.title || "Challenge") + " Complete!";
  }
  if (xpAmount > 0 && xpWrap && xpAmountEl) {
    xpWrap.style.display = "";
    xpAmountEl.textContent = "+" + xpAmount;
  }

  // Spawn confetti
  spawnConfetti();

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      overlay.classList.add("d-none");
    });
  }
}

// Spawn confetti particles into the overlay
function spawnConfetti() {
  var container = getById("sbxCompleteConfetti");
  if (!container) {
    return;
  }
  container.innerHTML = "";

  var colors = ["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4"];
  for (var i = 0; i < 40; i++) {
    var particle = document.createElement("span");
    var size = 6 + Math.random() * 8;
    var color = colors[Math.floor(Math.random() * colors.length)];
    particle.style.cssText =
      "width:" + size + "px;height:" + size + "px;" +
      "background:" + color + ";" +
      "left:" + Math.random() * 100 + "%;" +
      "animation-duration:" + (1.5 + Math.random() * 2) + "s;" +
      "animation-delay:" + (Math.random() * 0.5) + "s;";
    container.appendChild(particle);
  }
}

// Award XP to the logged-in user
function awardSandboxXp(amount) {
  if (!amount || amount <= 0) {
    return;
  }

  var user = getStoredUser();
  if (!user) {
    return;
  }

  // Use the NetologyXP system exposed by app.js
  var xpSystem = window.NetologyXP || null;
  var updatedUser = user;
  if (xpSystem && typeof xpSystem.applyXpToUser === "function") {
    updatedUser = xpSystem.applyXpToUser(user, amount);
    localStorage.setItem("netology_user", JSON.stringify(updatedUser));
    localStorage.setItem("user", JSON.stringify(updatedUser));
  } else {
    localStorage.setItem("netology_user", JSON.stringify(user));
    localStorage.setItem("user", JSON.stringify(user));
  }

  if (window.NetologyNav && typeof window.NetologyNav.displayNavUser === "function") {
    window.NetologyNav.displayNavUser(updatedUser);
  }
}


// Template buttons in the toolbar
function bindTemplateButtons() {
  var templateDropdown = getById("templateMenu");
  if (!templateDropdown) {
    return;
  }

  var templateItems = templateDropdown.querySelectorAll("[data-template]");
  for (var i = 0; i < templateItems.length; i++) {
    templateItems[i].addEventListener("click", function () {
      var templateId = this.getAttribute("data-template");
      if (!templateId || !TOPOLOGY_TEMPLATES[templateId]) {
        return;
      }

      var confirmed = confirm("Load the " + TOPOLOGY_TEMPLATES[templateId].label + " template? This will replace your current topology.");
      if (!confirmed) {
        return;
      }

      // Close the dropdown (remove is-open from the parent .sbx-conn-dropdown)
      var parentDropdown = templateDropdown.closest(".sbx-conn-dropdown");
      if (parentDropdown) { parentDropdown.classList.remove("is-open"); }
      templateDropdown.classList.remove("is-open");

      var template = TOPOLOGY_TEMPLATES[templateId];
      var result = template.build();

      state.devices = result.devices;
      state.connections = result.connections;
      state.selectedIds = [];
      applyAutoNetworkDefaults();
      pushHistory();
      renderAll();
      addActionLog("Loaded template: " + template.label);
      showSandboxToast({ title: "Template loaded", message: template.label + " topology created", variant: "success", timeout: 3000 });
    });
  }
}


// Tutorial carousel (the cards at the top of the canvas)
function buildTutorialCards() {
  if (!topCarouselScroll) {
    return;
  }

  var cards = [
    { icon: "bi-diagram-3", title: "Add Devices", text: "Click or drag devices from the left panel onto the canvas." },
    { icon: "bi-bezier2", title: "Connect Devices", text: "Switch to the Connect tool (C) and click two devices." },
    { icon: "bi-gear", title: "Configure IPs", text: "Select a device and edit its IP address in the Config panel." },
    { icon: "bi-broadcast-pin", title: "Test with Ping", text: "Use the Ping button or type 'ping' in the console." },
    { icon: "bi-terminal", title: "Use the Console", text: "Type 'help' in the console to see all commands." },
    { icon: "bi-floppy2", title: "Save Your Work", text: "Press Ctrl+S or click Save to keep your topology." }
  ];

  topCarouselScroll.innerHTML = "";
  tutorialCarouselState.count = cards.length;

  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var cardElement = document.createElement("div");
    cardElement.className = "sbx-tut-card";
    cardElement.innerHTML =
      '<div class="sbx-tut-icon"><i class="bi ' + card.icon + '"></i></div>' +
      '<div class="sbx-tut-title">' + escapeHtml(card.title) + '</div>' +
      '<div class="sbx-tut-text">' + escapeHtml(card.text) + '</div>';
    topCarouselScroll.appendChild(cardElement);
  }

  // Build dots
  if (topCarouselDots) {
    topCarouselDots.innerHTML = "";
    for (var d = 0; d < cards.length; d++) {
      var dot = document.createElement("button");
      dot.className = "sbx-carousel-dot" + (d === 0 ? " is-active" : "");
      dot.setAttribute("data-dot-index", d);
      topCarouselDots.appendChild(dot);
    }
  }
}

function bindTutorialCarousel() {
  buildTutorialCards();

  // Check if user previously hid the carousel
  var savedHidden = localStorage.getItem(TUTORIAL_CAROUSEL_HIDDEN_KEY);
  if (savedHidden === "1") {
    tutorialCarouselState.hidden = true;
    if (topCarouselWrap) {
      topCarouselWrap.style.display = "none";
    }
    updateTutorialsToggleLabel();
  }

  if (topCarouselPrevButton) {
    topCarouselPrevButton.addEventListener("click", function () {
      scrollTutorialCarousel(-1);
    });
  }
  if (topCarouselNextButton) {
    topCarouselNextButton.addEventListener("click", function () {
      scrollTutorialCarousel(1);
    });
  }

  // Dot click
  if (topCarouselDots) {
    topCarouselDots.addEventListener("click", function (event) {
      var dot = event.target.closest("[data-dot-index]");
      if (!dot) {
        return;
      }
      var index = Number(dot.getAttribute("data-dot-index"));
      scrollTutorialCarouselTo(index);
    });
  }
}

function scrollTutorialCarousel(direction) {
  var newIndex = tutorialCarouselState.index + direction;
  if (newIndex < 0) {
    newIndex = tutorialCarouselState.count - 1;
  }
  if (newIndex >= tutorialCarouselState.count) {
    newIndex = 0;
  }
  scrollTutorialCarouselTo(newIndex);
}

function scrollTutorialCarouselTo(index) {
  tutorialCarouselState.index = index;
  if (!topCarouselScroll) {
    return;
  }

  var cards = topCarouselScroll.querySelectorAll(".sbx-tut-card");
  if (cards.length === 0) {
    return;
  }

  var card = cards[index];
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  // Update dots
  if (topCarouselDots) {
    var dots = topCarouselDots.querySelectorAll(".sbx-carousel-dot");
    for (var i = 0; i < dots.length; i++) {
      if (i === index) {
        dots[i].classList.add("is-active");
      } else {
        dots[i].classList.remove("is-active");
      }
    }
  }
}

function bindTutorialsToggle() {
  if (!tutorialsToggleButton) {
    return;
  }
  tutorialsToggleButton.addEventListener("click", function () {
    tutorialCarouselState.hidden = !tutorialCarouselState.hidden;
    if (topCarouselWrap) {
      if (tutorialCarouselState.hidden) {
        topCarouselWrap.style.display = "none";
      } else {
        topCarouselWrap.style.display = "";
      }
    }
    localStorage.setItem(TUTORIAL_CAROUSEL_HIDDEN_KEY, tutorialCarouselState.hidden ? "1" : "0");
    updateTutorialsToggleLabel();
  });
}

function updateTutorialsToggleLabel() {
  if (tutorialsToggleLabel) {
    tutorialsToggleLabel.textContent = tutorialCarouselState.hidden ? "Show tutorials" : "Hide tutorials";
  }
  if (tutorialsToggleButton) {
    var icon = tutorialsToggleButton.querySelector("i");
    if (icon) {
      icon.className = tutorialCarouselState.hidden ? "bi bi-eye" : "bi bi-eye-slash";
    }
    tutorialsToggleButton.setAttribute("aria-pressed", tutorialCarouselState.hidden ? "false" : "true");
  }
}


// Connection suggestions - suggest what to connect next after adding a device
function setupConnectionSuggestions() {
  // The connection suggestion box is already in the HTML
}

function showConnectionSuggestions(device) {
  if (!device || state.mode !== "free") {
    return;
  }

  var suggestBody = getById("sbxConnSuggestBody");
  var suggestBox = getById("sbxConnSuggest");
  if (!suggestBody || !suggestBox) {
    return;
  }

  var compatibility = DEVICE_COMPATIBILITY[device.type];
  if (!compatibility) {
    return;
  }

  // Find devices on the canvas that this device can connect to
  var suggestions = [];
  for (var c = 0; c < compatibility.length; c++) {
    var rule = compatibility[c];
    for (var t = 0; t < rule.targets.length; t++) {
      var targetType = rule.targets[t];
      for (var d = 0; d < state.devices.length; d++) {
        var candidate = state.devices[d];
        if (candidate.id === device.id || candidate.type !== targetType) {
          continue;
        }
        // Check if already connected
        var alreadyConnected = false;
        for (var e = 0; e < state.connections.length; e++) {
          var conn = state.connections[e];
          if ((conn.from === device.id && conn.to === candidate.id) || (conn.to === device.id && conn.from === candidate.id)) {
            alreadyConnected = true;
            break;
          }
        }
        if (!alreadyConnected) {
          suggestions.push({
            device: candidate,
            connectionType: rule.conn
          });
        }
      }
    }
  }

  if (suggestions.length === 0) {
    suggestBox.classList.remove("is-show");
    return;
  }

  suggestBody.innerHTML = "";
  // Show up to 3 suggestions
  var maxSuggestions = Math.min(suggestions.length, 3);
  for (var s = 0; s < maxSuggestions; s++) {
    var suggestion = suggestions[s];
    var button = document.createElement("button");
    button.className = "sbx-conn-suggest-btn";
    button.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Connect to ' + escapeHtml(suggestion.device.name) + ' (' + suggestion.connectionType + ')';
    (function (fromId, toId) {
      button.addEventListener("click", function () {
        createConnection(fromId, toId);
        suggestBox.classList.remove("is-show");
      });
    })(device.id, suggestion.device.id);
    suggestBody.appendChild(button);
  }

  suggestBox.classList.add("is-show");

  // Close button - replace node to avoid duplicate listeners
  var closeButton = getById("sbxConnSuggestClose");
  if (closeButton) {
    var freshClose = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(freshClose, closeButton);
    freshClose.addEventListener("click", function () {
      suggestBox.classList.remove("is-show");
    });
  }

  // Auto-hide after 8 seconds
  clearTimeout(suggestionsHideTimer);
  suggestionsHideTimer = setTimeout(function () {
    if (suggestBox) {
      suggestBox.classList.remove("is-show");
    }
  }, 8000);
}


// Idle hints - show tips when the user hasn't done anything for a while
var idleTimer = null;
var IDLE_TIMEOUT = 30000;

var IDLE_HINTS = [
  "Try adding a router and a switch to get started!",
  "Use the Connect tool (C) to wire devices together.",
  "Configure IP addresses in the Properties panel.",
  "Try running 'ping' in the console to test connectivity.",
  "Use Ctrl+Z to undo any mistakes.",
  "Right-click a device for more options like rename or duplicate.",
  "Load a template from the toolbar to see a sample topology.",
  "Enable DHCP on a server to auto-assign IPs to clients.",
  "Use the 'explain' command in the console to see a topology summary.",
  "Try the 'traceroute' command to see the path between two devices.",
  "Set VLANs on devices to organize them into groups.",
  "Check the ARP table with the 'arp' command in the console."
];

function setupIdleHints() {
  resetIdleTimer();
  document.addEventListener("click", resetIdleTimer);
  document.addEventListener("keydown", resetIdleTimer);
  document.addEventListener("pointermove", debounce(resetIdleTimer, 2000));
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(showIdleHint, IDLE_TIMEOUT);
}

function showIdleHint() {
  // Don't show random hints if the user is doing a tutorial or challenge
  if (state.mode === "tutorial" || state.mode === "challenge") {
    return;
  }
  var randomIndex = Math.floor(Math.random() * IDLE_HINTS.length);
  var hint = IDLE_HINTS[randomIndex];
  setTip(hint);
}


// Auto-save to localStorage every 30 seconds if there are changes
var autoSaveTimer = null;
var lastSavedSnapshot = "";
var AUTO_SAVE_KEY = "sbx_autosave";
var AUTO_SAVE_INTERVAL = 30000;

function setupAutoSave() {
  // Try to restore from auto-save (only in free mode, not during tutorials/challenges)
  var urlParams = new URLSearchParams(window.location.search);
  var isFromCourse = urlParams.get("course") || urlParams.get("lesson");
  var savedData = parseJsonSafe(localStorage.getItem(AUTO_SAVE_KEY));
  if (savedData && savedData.devices && savedData.devices.length > 0 && state.devices.length === 0 && !isFromCourse) {
    var shouldRestore = confirm("Found an auto-saved topology. Would you like to restore it?");
    if (shouldRestore) {
      replaceTopology(savedData.devices, savedData.connections || []);
      applyAutoNetworkDefaults();
      pushHistory();
      renderAll();
      showSandboxToast({ title: "Restored", message: "Auto-saved topology restored.", variant: "info", timeout: 3000 });
    }
  }

  lastSavedSnapshot = snapshotState();

  // Start the auto-save timer
  autoSaveTimer = setInterval(function () {
    var currentSnapshot = snapshotState();
    if (currentSnapshot !== lastSavedSnapshot && state.devices.length > 0) {
      localStorage.setItem(AUTO_SAVE_KEY, currentSnapshot);
      lastSavedSnapshot = currentSnapshot;
    }
  }, AUTO_SAVE_INTERVAL);
}

// Mark the state as dirty and schedule an auto-save
function markDirtyAndSaveSoon() {
  // The interval timer will pick it up
}
