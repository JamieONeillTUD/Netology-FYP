/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

sandbox.js – Network Sandbox Pro (Figma AI layout, vanilla JS)

Reworked to match the Figma AI version:
- Full UI rebuild (left device library, center canvas, right panels, bottom console)
- DOM/SVG rendering for devices + connections
- Expanded device types and connection types
- Properties + inspector + objectives tabs
- Console, logs, packets
- Keeps existing save/load/ping/challenge/DB session flows
*/

(() => {
  const getById = (id) => document.getElementById(id);
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const stage = getById("sandboxStage");
  if (!stage) return;

  const deviceLayer = getById("sbxDevices");
  const connectionLayer = getById("sbxConnections");
  const emptyState = getById("sbxEmptyState");
  const tipsEl = getById("tips");
  const propsEl = getById("props");
  const inspectorBody = getById("sbxInspectorBody");
  const objectivesBody = getById("sbxObjectivesBody");
  const consoleOutputEl = getById("sbxConsoleOutput");
  const consoleInputEl = getById("sbxConsoleInput");
  const consoleSendBtn = getById("sbxConsoleSend");
  const logsEl = getById("sbxActionLogs");
  const packetsEl = getById("sbxPacketLogs");
  const zoomLabel = getById("zoomLabel");
  const connTypeGroup = getById("connTypeGroup");
  const toastStack = getById("sbxToastStack");

  const saveModalEl = getById("saveTopologyModal");
  const saveNameInput = getById("saveTopologyName");
  const saveSummaryEl = getById("saveTopologySummary");
  const savePreviewEl = getById("saveTopologyPreview");
  const saveConfirmBtn = getById("saveTopologyConfirm");

  const clearModalEl = getById("clearTopologyModal");
  const clearSummaryEl = getById("clearTopologySummary");
  const clearPreviewEl = getById("clearTopologyPreview");
  const clearConfirmBtn = getById("clearTopologyConfirm");

  const workspace = qs(".sbx-workspace");
  const stageWrap = qs(".sbx-stage-wrap");
  const stageEl = getById("sandboxStage");
  const leftPanel = getById("sbxLeftPanel");
  const rightPanel = getById("sbxRightPanel");
  const bottomPanel = getById("sbxBottomPanel");
  const leftToggle = getById("leftPanelToggle");
  const rightToggle = getById("rightPanelToggle");
  const bottomToggle = getById("bottomPanelToggle");
  const leftOpenBtn = getById("leftPanelOpenBtn");
  const rightOpenBtn = getById("rightPanelOpenBtn");

  const GRID_SIZE = 20;
  const DEVICE_SIZE = 72;
  const DEVICE_RADIUS = DEVICE_SIZE / 2;

  const TOOL = {
    SELECT: "select",
    CONNECT: "connect",
  };

  const DEVICE_TYPES = {
    pc: { label: "PC", icon: "bi-pc-display", color: "linear-gradient(135deg,#3b82f6,#2563eb)", category: "End Devices" },
    laptop: { label: "Laptop", icon: "bi-laptop", color: "linear-gradient(135deg,#6366f1,#4338ca)", category: "End Devices" },
    smartphone: { label: "Smartphone", icon: "bi-phone", color: "linear-gradient(135deg,#a855f7,#7e22ce)", category: "End Devices" },
    printer: { label: "Printer", icon: "bi-printer", color: "linear-gradient(135deg,#6b7280,#4b5563)", category: "End Devices" },
    router: { label: "Router", icon: "bi-diagram-3", color: "linear-gradient(135deg,#f97316,#ea580c)", category: "Network Devices" },
    switch: { label: "Switch", icon: "bi-hdd-network", color: "linear-gradient(135deg,#8b5cf6,#6d28d9)", category: "Network Devices" },
    "wireless-ap": { label: "Wireless AP", icon: "bi-wifi", color: "linear-gradient(135deg,#06b6d4,#0891b2)", category: "Wireless" },
    firewall: { label: "Firewall", icon: "bi-shield-lock", color: "linear-gradient(135deg,#ef4444,#b91c1c)", category: "Security" },
    server: { label: "Server", icon: "bi-server", color: "linear-gradient(135deg,#10b981,#059669)", category: "Servers" },
    cloud: { label: "Internet", icon: "bi-cloud", color: "linear-gradient(135deg,#38bdf8,#0ea5e9)", category: "WAN" },
  };

  const CONNECTION_TYPES = {
    ethernet: { label: "Ethernet", color: "#3b82f6", width: 2 },
    fiber: { label: "Fiber", color: "#f97316", width: 3 },
    serial: { label: "Serial", color: "#ef4444", width: 2, dash: "6,4" },
    wireless: { label: "Wireless", color: "#06b6d4", width: 2, dash: "4,6" },
    console: { label: "Console", color: "#6366f1", width: 2, dash: "2,6" },
  };

  const state = {
    devices: [],
    connections: [],
    selectedIds: [],
    tool: TOOL.SELECT,
    connectFrom: null,
    connectType: "ethernet",
    zoom: 1,
    showGrid: true,
    snap: true,
    dragging: null,
    history: [],
    historyIndex: -1,
    rightTab: "config",
    configTab: "general",
    bottomTab: "console",
    consoleOutput: ["Network Sandbox Pro v2.0", "Ready."],
    actionLogs: [],
    packets: [],
    pingInspector: null,
    objectiveStatus: {},
    challengeMeta: null,
    tutorialMeta: null,
    mode: "free",
    deviceAnimations: new Set(),
    saveModalOpen: false,
  };

  let guideUI = null;

  const API_BASE = String(window.API_BASE || "").replace(/\/$/, "");

  // AI Prompt: Explain the Utilities section in clear, simple terms.
  // ----------------------------------------
  // Utilities
  // ----------------------------------------
  function parseJsonSafe(str, fallback = null) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function clearChildren(node) {
    if (node) node.replaceChildren();
  }

  function makeEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text !== "undefined") el.textContent = text;
    return el;
  }

  function makeIcon(className) {
    const icon = document.createElement("i");
    icon.className = className;
    return icon;
  }

  function setStatusBox(box, className, iconClass, text) {
    if (!box) return;
    box.className = className;
    clearChildren(box);
    const icon = makeIcon(`bi ${iconClass} me-1`);
    icon.setAttribute("aria-hidden", "true");
    box.append(icon, document.createTextNode(text));
  }

  function makeSvgEl(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function setTip(text) {
    if (tipsEl) tipsEl.textContent = text;
  }

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
      addGuided(qs('.sbx-tab[data-tab="config"]', getById("sbxRightTabs")));
      const configTab = qs('.sbx-subtab[data-subtab="general"]', getById("sbxConfigTabs"));
      addGuided(configTab);
    }

    if (focus.needsConfigAuto && state.rightTab !== "config") {
      setRightTab("config");
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
    showToast({
      title: "Step complete",
      message: steps[index]?.text || "Step completed.",
      variant: "success",
      timeout: 2200,
    });
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
      showToast({
        title: "Step complete",
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

  let __tooltip = null;

  function ensureTooltip() {
    if (__tooltip) return __tooltip;
    const tip = document.createElement("div");
    tip.className = "net-tooltip";
    tip.textContent = "";
    document.body.appendChild(tip);
    __tooltip = tip;
    return tip;
  }

  function showTooltip(target) {
    if (!target) return;
    const text = target.getAttribute("data-tooltip") || target.getAttribute("aria-label") || target.getAttribute("title");
    if (!text) return;
    const tip = ensureTooltip();
    tip.textContent = text;
    tip.classList.add("is-open");

    const rect = target.getBoundingClientRect();
    const pad = 8;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    let left = rect.left + rect.width / 2 - w / 2;
    let top = rect.top - h - 10;
    left = clamp(left, pad, window.innerWidth - w - pad);
    if (top < pad) top = rect.bottom + 10;

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function hideTooltip() {
    if (__tooltip) __tooltip.classList.remove("is-open");
  }

  function showToast({ title, message, variant = "info", timeout = 3200 }) {
    const stack = toastStack || document.body;
    const toast = document.createElement("div");
    toast.className = `sbx-toast ${variant}`;
    const iconWrap = makeEl("div", "sbx-toast-icon");
    const iconClass = variant === "success" ? "bi-check-lg" : variant === "error" ? "bi-x-lg" : "bi-info-lg";
    iconWrap.appendChild(makeIcon(`bi ${iconClass}`));

    const body = makeEl("div");
    body.append(
      makeEl("div", "sbx-toast-title", title || "Update"),
      makeEl("div", "sbx-toast-message", message || "")
    );

    const closeBtn = makeEl("button", "sbx-toast-close", "×");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");

    toast.append(iconWrap, body, closeBtn);
    stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-show"));

    const removeToast = () => {
      toast.classList.add("is-leaving");
      setTimeout(() => toast.remove(), 220);
    };

    closeBtn.addEventListener("click", removeToast);
    if (timeout) setTimeout(removeToast, timeout);
  }

  function getTypeColor(type) {
    const meta = DEVICE_TYPES[type];
    if (!meta?.color) return "#94a3b8";
    const match = meta.color.match(/#([0-9a-fA-F]{3,6})/);
    return match ? `#${match[1]}` : "#94a3b8";
  }

  function getTopologySummary() {
    const typeCounts = {};
    state.devices.forEach((d) => {
      typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
    });
    const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    return {
      deviceCount: state.devices.length,
      connectionCount: state.connections.length,
      types: topTypes,
    };
  }

  function renderSummary(container) {
    if (!container) return;
    if (!state.devices.length) {
      clearChildren(container);
      container.appendChild(makeEl("div", "sbx-preview-empty", "No devices added yet."));
      return;
    }

    const summary = getTopologySummary();
    clearChildren(container);

    const row = makeEl("div", "sbx-summary-row");
    const devicesSpan = makeEl("span");
    devicesSpan.append(makeEl("strong", "", String(summary.deviceCount)), document.createTextNode(" devices"));
    const linksSpan = makeEl("span");
    linksSpan.append(makeEl("strong", "", String(summary.connectionCount)), document.createTextNode(" links"));
    row.append(devicesSpan, linksSpan);

    const chipRow = makeEl("div", "sbx-chip-row");
    summary.types.slice(0, 6).forEach(([type, count]) => {
      const label = DEVICE_TYPES[type]?.label || type;
      chipRow.appendChild(makeEl("span", "sbx-chip", `${label} • ${count}`));
    });

    container.append(row, chipRow);
  }

  function renderTopologyPreview(container, width = 260, height = 160) {
    if (!container) return;
    clearChildren(container);

    if (!state.devices.length) {
      container.appendChild(makeEl("div", "sbx-preview-empty", "Preview updates after you add devices."));
      return;
    }

    const centers = state.devices.map((d) => ({
      id: d.id,
      x: d.x + DEVICE_RADIUS,
      y: d.y + DEVICE_RADIUS,
      type: d.type,
    }));

    const minX = Math.min(...centers.map((c) => c.x));
    const maxX = Math.max(...centers.map((c) => c.x));
    const minY = Math.min(...centers.map((c) => c.y));
    const maxY = Math.max(...centers.map((c) => c.y));
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const pad = 16;
    const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);

    const point = (c) => ({
      x: pad + (c.x - minX) * scale,
      y: pad + (c.y - minY) * scale,
    });

    const svg = makeSvgEl("svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Topology preview");

    const defs = makeSvgEl("defs");
    const grad = makeSvgEl("linearGradient");
    grad.setAttribute("id", "sbxPreviewBg");
    grad.setAttribute("x1", "0");
    grad.setAttribute("y1", "0");
    grad.setAttribute("x2", "0");
    grad.setAttribute("y2", "1");
    const stop1 = makeSvgEl("stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "#ffffff");
    const stop2 = makeSvgEl("stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", "#f8fafc");
    grad.append(stop1, stop2);
    defs.appendChild(grad);

    const rect = makeSvgEl("rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", width);
    rect.setAttribute("height", height);
    rect.setAttribute("rx", "16");
    rect.setAttribute("fill", "url(#sbxPreviewBg)");

    svg.append(defs, rect);

    state.connections.forEach((conn) => {
      const from = centers.find((c) => c.id === conn.from);
      const to = centers.find((c) => c.id === conn.to);
      if (!from || !to) return;
      const a = point(from);
      const b = point(to);
      const line = makeSvgEl("line");
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      line.setAttribute("stroke", "rgba(15,23,42,.3)");
      line.setAttribute("stroke-width", "2");
      svg.appendChild(line);
    });

    centers.forEach((c) => {
      const p = point(c);
      const color = getTypeColor(c.type);
      const circle = makeSvgEl("circle");
      circle.setAttribute("cx", p.x);
      circle.setAttribute("cy", p.y);
      circle.setAttribute("r", "8");
      circle.setAttribute("fill", color);
      circle.setAttribute("stroke", "rgba(255,255,255,.9)");
      circle.setAttribute("stroke-width", "2");
      svg.appendChild(circle);
    });

    container.appendChild(svg);
  }

  function updateSaveModalLive() {
    if (!state.saveModalOpen) return;
    renderSummary(saveSummaryEl);
    renderTopologyPreview(savePreviewEl);
  }

  function updatePingOverview(meta = {}, result = null) {
    const fromDevice = meta.fromDevice || null;
    const toDevice = meta.toDevice || null;
    const path = Array.isArray(meta.path) ? meta.path : [];

    setText("pingOverviewSource", fromDevice?.name || "—");
    setText("pingOverviewSourceIp", fromDevice?.config?.ipAddress || "No IP");
    setText("pingOverviewDest", toDevice?.name || "Select a device");
    setText("pingOverviewDestIp", toDevice?.config?.ipAddress || "—");

    const statusEl = getById("pingOverviewStatus");
    if (statusEl) {
      const label = result ? (result.success ? "Success" : "Failed") : "Ready";
      statusEl.textContent = label;
      statusEl.className = `sbx-ping-chip ${result ? (result.success ? "is-success" : "is-fail") : "is-neutral"}`;
    }

    const latencyEl = getById("pingOverviewLatency");
    if (latencyEl) latencyEl.textContent = result?.latency ? `Latency: ${result.latency}ms` : "Latency: —";

    const hopsEl = getById("pingOverviewHops");
    if (hopsEl) hopsEl.textContent = path.length ? `Hops: ${Math.max(path.length - 1, 0)}` : "Hops: —";

    const routeEl = getById("pingOverviewRoute");
    if (routeEl) {
      routeEl.classList.toggle("is-pulse", !!result?.success);
      clearChildren(routeEl);
      if (!path.length) {
        routeEl.textContent = "Select a destination to preview the route.";
      } else {
        path.forEach((id, idx) => {
          const dev = findDevice(id);
          const name = dev?.name || "Unknown";
          const node = makeEl("span", "sbx-ping-route-node", name);
          if (result?.success) node.style.animationDelay = `${idx * 0.12}s`;
          routeEl.appendChild(node);
          if (idx < path.length - 1) {
            routeEl.appendChild(makeEl("span", "sbx-ping-route-sep", "→"));
          }
        });
      }
    }
  }

  function getNextDevicePosition() {
    const rect = stage.getBoundingClientRect();
    const centerX = rect.width / 2 - DEVICE_RADIUS;
    const centerY = rect.height / 2 - DEVICE_RADIUS;
    const padding = 16;
    const index = state.devices.length;

    if (index === 0) {
      return {
        x: clamp(centerX, padding, rect.width - DEVICE_SIZE - padding),
        y: clamp(centerY, padding, rect.height - DEVICE_SIZE - padding),
      };
    }

    const step = DEVICE_SIZE + 20;
    const ringIndex = index - 1;
    const ring = Math.floor(ringIndex / 8) + 1;
    const angle = ringIndex * 0.9;
    const radius = ring * step;
    let x = centerX + Math.cos(angle) * radius;
    let y = centerY + Math.sin(angle) * radius;
    x = clamp(x, padding, rect.width - DEVICE_SIZE - padding);
    y = clamp(y, padding, rect.height - DEVICE_SIZE - padding);
    return { x, y };
  }

  function createDragGhost(type) {
    const meta = DEVICE_TYPES[type] || DEVICE_TYPES.pc;
    const ghost = document.createElement("div");
    ghost.className = "sbx-drag-ghost";
    const iconWrap = makeEl("div", "sbx-drag-icon");
    iconWrap.appendChild(makeIcon(`bi ${meta.icon}`));
    const label = makeEl("div", "sbx-drag-label", meta.label || "Device");
    iconWrap.style.background = meta.color || "";
    ghost.append(iconWrap, label);
    document.body.appendChild(ghost);
    return ghost;
  }

  function positionDragGhost(ghost, x, y) {
    if (!ghost) return;
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
  }

  function isValidIP(ip) {
    const parts = String(ip || "").trim().split(".");
    return parts.length === 4 && parts.every((p) => {
      const n = Number(p);
      return Number.isInteger(n) && n >= 0 && n <= 255;
    });
  }

  function isValidSubnet(mask) {
    const valid = new Set([
      "255.255.255.255", "255.255.255.254", "255.255.255.252", "255.255.255.248",
      "255.255.255.240", "255.255.255.224", "255.255.255.192", "255.255.255.128",
      "255.255.255.0", "255.255.254.0", "255.255.252.0", "255.255.248.0",
      "255.255.240.0", "255.255.224.0", "255.255.192.0", "255.255.128.0",
      "255.255.0.0", "255.254.0.0", "255.252.0.0", "255.248.0.0",
      "255.240.0.0", "255.224.0.0", "255.192.0.0", "255.128.0.0",
      "255.0.0.0", "254.0.0.0", "252.0.0.0", "248.0.0.0",
      "240.0.0.0", "224.0.0.0", "192.0.0.0", "128.0.0.0", "0.0.0.0",
    ]);
    return valid.has(String(mask || "").trim());
  }

  function ipToInt(ip) {
    return String(ip).split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  function isSameSubnet(ip1, ip2, mask) {
    if (!isValidIP(ip1) || !isValidIP(ip2) || !isValidSubnet(mask)) return false;
    const ip1Int = ipToInt(ip1);
    const ip2Int = ipToInt(ip2);
    const maskInt = ipToInt(mask);
    return (ip1Int & maskInt) === (ip2Int & maskInt);
  }

  function generateMacAddress() {
    return "XX:XX:XX:XX:XX:XX".replace(/X/g, () =>
      Math.floor(Math.random() * 16).toString(16).toUpperCase()
    );
  }

  function generateInterfaces(type, count = 2) {
    if (type === "router") {
      return Array.from({ length: count }, (_, i) => ({
        id: `gig0/${i}`,
        name: `GigabitEthernet0/${i}`,
        status: "admin-down",
        speed: "1000Mbps",
        connectedTo: "",
        ipAddress: "",
      }));
    }
    if (type === "switch") {
      return Array.from({ length: 24 }, (_, i) => ({
        id: `fa0/${i}`,
        name: `FastEthernet0/${i}`,
        status: "down",
        speed: "100Mbps",
        connectedTo: "",
      }));
    }
    return [];
  }

  function normalizeDevice(raw) {
    const base = raw || {};
    const config = base.config || {};
    const ipAddress = config.ipAddress ?? base.ipAddress ?? base.ip ?? "";
    const subnetMask = config.subnetMask ?? base.subnetMask ?? base.mask ?? "255.255.255.0";
    const defaultGateway = config.defaultGateway ?? base.defaultGateway ?? base.gateway ?? "";
    const macAddress = config.macAddress ?? base.macAddress ?? generateMacAddress();
    const dhcpEnabled = config.dhcpEnabled ?? base.dhcpEnabled ?? false;
    const interfaces = config.interfaces ?? base.interfaces ?? generateInterfaces(base.type);
    const routingTable = config.routingTable ?? base.routingTable ?? [];
    const macTable = config.macTable ?? base.macTable ?? [];
    const dhcpServer = config.dhcpServer ?? base.dhcpServer ?? ((base.type === "server" || base.type === "router") ? {
      enabled: false,
      network: "",
      mask: "255.255.255.0",
      gateway: "",
      rangeStart: "",
      rangeEnd: "",
      leases: [],
    } : null);
    const dnsServer = config.dnsServer ?? base.dnsServer ?? (base.type === "server" ? {
      enabled: false,
      records: [],
    } : null);

    return {
      id: base.id || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: base.type || "pc",
      x: Number(base.x ?? 200),
      y: Number(base.y ?? 200),
      name: base.name || `${DEVICE_TYPES[base.type]?.label || "Device"}`,
      status: base.status || "on",
      config: {
        ipAddress,
        subnetMask,
        defaultGateway,
        macAddress,
        dhcpEnabled,
        interfaces,
        routingTable,
        macTable,
        dhcpServer,
        dnsServer,
      },
    };
  }

  function normalizeConnection(raw) {
    if (!raw) return null;
    if (raw.from && raw.to) {
      return {
        id: raw.id || `conn-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        from: raw.from,
        to: raw.to,
        type: raw.type || "ethernet",
        status: raw.status || "active",
        fromInterface: raw.fromInterface || "",
        toInterface: raw.toInterface || "",
      };
    }
    if (raw.a && raw.b) {
      return {
        id: raw.id || `conn-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        from: raw.a,
        to: raw.b,
        type: raw.type || "ethernet",
        status: raw.status || "active",
        fromInterface: raw.fromInterface || "",
        toInterface: raw.toInterface || "",
      };
    }
    return null;
  }

  function findDevice(id) {
    return state.devices.find((d) => d.id === id) || null;
  }

  function getSelectedDevice() {
    if (state.selectedIds.length !== 1) return null;
    return findDevice(state.selectedIds[0]);
  }

  // AI Prompt: Explain the XP + progress logging (kept) section in clear, simple terms.
  // ----------------------------------------
  // XP + progress logging (kept)
  // ----------------------------------------
  function totalXpForLevel(level) {
    const lvl = Math.max(1, Number(level) || 1);
    return (lvl - 1) * lvl * 50;
  }

  function levelFromTotalXp(totalXp) {
    let level = 1;
    let remaining = Math.max(0, Number(totalXp) || 0);
    let step = 100;
    while (remaining >= step) {
      remaining -= step;
      level += 1;
      step += 100;
    }
    return level;
  }

  function rankForLevel(level) {
    if (Number(level) >= 5) return "Advanced";
    if (Number(level) >= 3) return "Intermediate";
    return "Novice";
  }

  function resolveXpProgress(user) {
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
    const nextTotal = Math.max(0, Number(user?.xp || 0) + Number(addXP || 0));
    const nextLevel = levelFromTotalXp(nextTotal);
    const nextStart = totalXpForLevel(nextLevel);
    const xpInto = Math.max(0, nextTotal - nextStart);
    return {
      ...user,
      xp: nextTotal,
      numeric_level: nextLevel,
      level: rankForLevel(nextLevel),
      rank: rankForLevel(nextLevel),
      xp_into_level: xpInto,
      next_level_xp: nextLevel * 100
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

  // AI Prompt: Explain the Lesson session DB save/load section in clear, simple terms.
  // ----------------------------------------
  // Lesson session DB save/load
  // ----------------------------------------
  const lessonSession = {
    enabled: false,
    email: "",
    course_id: null,
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
      await fetch(`${API_BASE}/lesson-session/save`, {
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
      const url = `${API_BASE}/lesson-session/load?email=${encodeURIComponent(lessonSession.email)}&course_id=${encodeURIComponent(lessonSession.course_id)}&lesson_number=${encodeURIComponent(lessonSession.lesson_number)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.success || !data.found) return;

      state.devices = (data.devices || []).map(normalizeDevice);
      state.connections = (data.connections || []).map(normalizeConnection).filter(Boolean);
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

  // AI Prompt: Explain the Chrome (top nav + sidebar) section in clear, simple terms.
  // ----------------------------------------
  // Chrome (top nav + sidebar)
  // ----------------------------------------
  function getLoggedInUser() {
    const raw = localStorage.getItem("user") || localStorage.getItem("netology_user") || "{}";
    return parseJsonSafe(raw) || {};
  }

  async function refreshUserFromServer(email) {
    if (!API_BASE || !email) return null;
    try {
      const res = await fetch(`${API_BASE}/user-info?email=${encodeURIComponent(email)}`);
      const data = await res.json();
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

  // AI Prompt: Explain the Rendering section in clear, simple terms.
  // ----------------------------------------
  // Rendering
  // ----------------------------------------
  function updateEmptyState() {
    if (!emptyState) return;
    emptyState.style.display = state.devices.length ? "none" : "grid";
  }

  function updatePingVisibility() {
    const pingContainer = getById("pingContainer");
    if (!pingContainer) return;
    pingContainer.style.display = state.selectedIds.length ? "block" : "none";
  }

  function updateZoomLabel() {
    if (zoomLabel) zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
    deviceLayer.style.transform = `scale(${state.zoom})`;
    deviceLayer.style.transformOrigin = "0 0";
    connectionLayer.style.transform = `scale(${state.zoom})`;
    connectionLayer.style.transformOrigin = "0 0";
    if (state.showGrid) {
      stage.style.backgroundSize = `${GRID_SIZE * state.zoom}px ${GRID_SIZE * state.zoom}px`;
    }
  }

  function updateGrid() {
    stage.classList.toggle("is-grid", state.showGrid);
    if (state.showGrid) {
      stage.style.backgroundSize = `${GRID_SIZE * state.zoom}px ${GRID_SIZE * state.zoom}px`;
    }
  }

  function updateConnGroupVisibility() {
    if (!connTypeGroup) return;
    connTypeGroup.style.display = state.tool === TOOL.CONNECT ? "inline-flex" : "none";
  }

  function renderDevices() {
    clearChildren(deviceLayer);

    state.devices.forEach((device) => {
      const typeMeta = DEVICE_TYPES[device.type] || DEVICE_TYPES.pc;
      const isSelected = state.selectedIds.includes(device.id);
      const isError = device.status === "error";

      const el = document.createElement("div");
      el.className = "sbx-device";
      if (isSelected) el.classList.add("is-selected");
      if (isError) el.classList.add("is-error");
      if (state.connectFrom === device.id) el.classList.add("is-selected");
      if (state.deviceAnimations.has(device.id)) {
        el.classList.add("is-animating");
        setTimeout(() => {
          state.deviceAnimations.delete(device.id);
          el.classList.remove("is-animating");
        }, 420);
      }

      el.dataset.id = device.id;
      el.dataset.type = device.type;
      el.style.left = `${device.x}px`;
      el.style.top = `${device.y}px`;
      el.style.background = typeMeta.color;

      const icon = document.createElement("i");
      icon.className = `bi ${typeMeta.icon}`;
      icon.style.fontSize = "24px";
      el.appendChild(icon);

      const name = document.createElement("div");
      name.className = "sbx-device-label-badge";
      name.textContent = device.name;
      el.appendChild(name);

      if (device.config?.ipAddress) {
        const ip = document.createElement("div");
        ip.className = "sbx-device-ip";
        ip.textContent = device.config.ipAddress;
        el.appendChild(ip);
      }

      deviceLayer.appendChild(el);
    });
  }

  function resizeConnections() {
    const rect = stage.getBoundingClientRect();
    connectionLayer.setAttribute("width", rect.width);
    connectionLayer.setAttribute("height", rect.height);
    connectionLayer.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  }

  function renderConnections() {
    resizeConnections();
    clearChildren(connectionLayer);

    state.connections.forEach((conn) => {
      const from = findDevice(conn.from);
      const to = findDevice(conn.to);
      if (!from || !to) return;

      const meta = CONNECTION_TYPES[conn.type] || CONNECTION_TYPES.ethernet;
      const x1 = from.x + DEVICE_RADIUS;
      const y1 = from.y + DEVICE_RADIUS;
      const x2 = to.x + DEVICE_RADIUS;
      const y2 = to.y + DEVICE_RADIUS;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
      path.setAttribute("stroke", meta.color);
      path.setAttribute("stroke-width", meta.width || 2);
      if (meta.dash) path.setAttribute("stroke-dasharray", meta.dash);
      connectionLayer.appendChild(path);

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const del = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      del.classList.add("sbx-conn-delete");
      del.setAttribute("cx", midX);
      del.setAttribute("cy", midY);
      del.setAttribute("r", 7);
      del.dataset.connId = conn.id;
      connectionLayer.appendChild(del);
    });
  }

  function renderInspector() {
    if (!inspectorBody) return;
    if (!state.pingInspector) {
      clearChildren(inspectorBody);
      inspectorBody.textContent = "Run a ping test to see detailed results.";
      return;
    }

    const result = state.pingInspector;
    const statusClass = result.success ? "text-success" : "text-danger";
    clearChildren(inspectorBody);
    const resultEl = makeEl("div", `sbx-inspector-result ${statusClass}`, result.message || "");
    inspectorBody.appendChild(resultEl);

    (result.steps || []).forEach((s) => {
      const stepEl = makeEl("div", `sbx-inspector-step ${s.success ? "ok" : "bad"}`);
      const strong = makeEl("strong", null, `${s.step}:`);
      stepEl.append(strong, document.createTextNode(` ${s.message || ""}`));
      inspectorBody.appendChild(stepEl);
    });

    inspectorBody.appendChild(
      makeEl("div", "small text-muted mt-2", `Latency: ${result.latency ?? "—"} ms`)
    );
  }

  function renderObjectives() {
    if (!objectivesBody) return;
    if (!state.tutorialMeta) {
      clearGuidedHighlights();
      hideGuide();
    }
    if (state.tutorialMeta) {
      const meta = state.tutorialMeta;
      const steps = normalizeTutorialSteps(meta.steps || []);
      const progress = normalizeTutorialProgress(meta, steps);
      const total = steps.length;
      const checked = progress.checked.filter(Boolean).length;
      const pct = total ? Math.round((checked / total) * 100) : 0;

      clearChildren(objectivesBody);
      const wrap = makeEl("div", "sbx-tutorial");

      const header = makeEl("div", "sbx-objectives-header");
      const title = makeEl("div", "fw-semibold", "Sandbox tutorial");
      const sub = makeEl("div", "small text-muted", total ? `Progress: ${checked}/${total} steps` : "No tutorial steps yet.");
      header.append(title, sub);
      wrap.appendChild(header);

      const bar = makeEl("div", "sbx-progress-bar");
      const fill = makeEl("div", "sbx-progress-fill");
      fill.style.width = `${pct}%`;
      bar.appendChild(fill);
      wrap.appendChild(bar);

      if (total) {
        const currentIndex = progress.current;
        const currentStep = steps[currentIndex];
        const evaluation = evaluateTutorialStep(currentStep);
        const isDone = progress.checked[currentIndex] || evaluation.ok;

        const currentCard = makeEl("div", "sbx-tutorial-current");
        const stepLabel = makeEl("div", "sbx-tutorial-step-label", `Step ${currentIndex + 1} of ${total}`);
        const stepText = makeEl("div", "sbx-tutorial-step-text", currentStep.text || "Follow the instruction.");
        const status = makeEl("div", `sbx-tutorial-status ${isDone ? "is-done" : "is-waiting"}`, isDone ? "Ready to continue" : "Waiting for action");
        currentCard.append(stepLabel, stepText, status);

        if (currentStep.hint) {
          currentCard.appendChild(makeEl("div", "sbx-tutorial-hint", currentStep.hint));
        }

        if (evaluation.details.length) {
          const reqList = makeEl("div", "sbx-tutorial-reqs");
          evaluation.details.forEach((req) => {
            const row = makeEl("div", `sbx-tutorial-req ${req.ok ? "is-ok" : ""}`);
            const icon = makeIcon(`bi ${req.ok ? "bi-check-circle-fill" : "bi-circle"}`);
            row.append(icon, makeEl("span", null, req.label));
            reqList.appendChild(row);
          });
          currentCard.appendChild(reqList);
        }

        const actionRow = makeEl("div", "sbx-tutorial-actions");
        const primaryBtn = makeEl("button", "btn btn-teal btn-sm", evaluation.manual ? "Mark step complete" : "Continue");
        primaryBtn.disabled = evaluation.manual ? false : !evaluation.ok;
        primaryBtn.addEventListener("click", () => {
          completeTutorialStep(meta, steps, currentIndex);
          updateTutorialGuidance();
        });
        actionRow.appendChild(primaryBtn);
        currentCard.appendChild(actionRow);
        wrap.appendChild(currentCard);

        const list = makeEl("div", "sbx-tutorial-step-list");
        steps.forEach((step, idx) => {
          const row = makeEl("div", `sbx-tutorial-step ${progress.checked[idx] ? "is-done" : ""} ${idx === currentIndex ? "is-current" : ""}`);
          const badge = makeEl("div", "sbx-tutorial-step-badge", String(idx + 1));
          const text = makeEl("div", "sbx-tutorial-step-copy", step.text || `Step ${idx + 1}`);
          row.append(badge, text);
          list.appendChild(row);
        });
        wrap.appendChild(list);
      } else {
        wrap.appendChild(makeEl("div", "small text-muted", "Tutorial steps will appear here once configured."));
      }

      if (meta.tips) {
        const tipsBlock = makeEl("div", "sbx-tutorial-tips");
        tipsBlock.appendChild(makeEl("em", null, meta.tips));
        wrap.appendChild(tipsBlock);
      }

      const returnWrap = makeEl("div", "mt-3");
      const backBtn = makeEl("a", "btn btn-outline-secondary btn-sm w-100", "Return to lesson");
      backBtn.href = `lesson.html?course_id=${meta.courseId}&lesson=${meta.lesson}`;
      returnWrap.appendChild(backBtn);
      wrap.appendChild(returnWrap);

      objectivesBody.appendChild(wrap);
      return;
    }

    if (!state.challengeMeta) {
      objectivesBody.textContent = "No active challenge.";
      return;
    }

    const { steps = [], tips = "", rules = {} } = state.challengeMeta;
    const progress = buildChallengeProgress(rules || {});

    clearChildren(objectivesBody);
    const wrap = makeEl("div", "sbx-objectives");

    const header = makeEl("div", "sbx-objectives-header");
    const title = makeEl("div", "fw-semibold", "Sandbox challenge");
    const sub = makeEl("div", "small text-muted", `Progress: ${progress.done}/${progress.total} requirements`);
    header.append(title, sub);
    wrap.appendChild(header);

    const bar = makeEl("div", "sbx-progress-bar");
    const fill = makeEl("div", "sbx-progress-fill");
    fill.style.width = `${progress.pct}%`;
    bar.appendChild(fill);
    wrap.appendChild(bar);

    if (progress.items.length) {
      const reqList = makeEl("div", "sbx-req-list");
      progress.items.forEach((item) => {
        const row = makeEl("div", `sbx-req ${item.ok ? "is-ok" : ""}`);
        const label = makeEl("span", "sbx-req-label", item.label);
        const count = makeEl("span", "sbx-req-count", `${item.current}/${item.target}`);
        row.append(label, count);
        reqList.appendChild(row);
      });
      wrap.appendChild(reqList);
    }

    if (steps.length) {
      const list = makeEl("ul");
      steps.forEach((s) => list.appendChild(makeEl("li", null, s)));
      wrap.appendChild(list);
    }
    if (tips) {
      const tipsEl = makeEl("div", "small text-muted");
      const em = makeEl("em", null, tips);
      tipsEl.appendChild(em);
      wrap.appendChild(tipsEl);
    }
    const validateBtnEl = makeEl("button", "btn btn-teal btn-sm mt-2", "Validate Challenge");
    validateBtnEl.id = "validateBtn";
    const resultEl = makeEl("div", "small mt-2");
    resultEl.id = "challengeResult";
    const returnEl = makeEl("div", "mt-2");
    returnEl.id = "challengeReturn";
    wrap.append(validateBtnEl, resultEl, returnEl);
    objectivesBody.appendChild(wrap);

    validateBtnEl.addEventListener("click", handleChallengeValidate);
  }

  function renderProps() {
    if (!propsEl) return;
    const device = getSelectedDevice();
    if (!device) {
      propsEl.textContent = "Select a device to view properties.";
      return;
    }

    const config = device.config || {};
    const tab = state.configTab;
    clearChildren(propsEl);

    if (tab === "general") {
      const nameGroup = makeEl("div", "sbx-prop-group");
      const nameLabel = makeEl("label", "form-label small", "Device Name");
      nameLabel.setAttribute("for", "prop_name");
      const nameInputEl = document.createElement("input");
      nameInputEl.className = "form-control form-control-sm";
      nameInputEl.id = "prop_name";
      nameInputEl.value = device.name || "";
      nameGroup.append(nameLabel, nameInputEl);

      const ipGroup = makeEl("div", "sbx-prop-group");
      const ipLabel = makeEl("label", "form-label small", "IP Address");
      ipLabel.setAttribute("for", "prop_ip");
      const ipInputEl = document.createElement("input");
      ipInputEl.className = "form-control form-control-sm";
      ipInputEl.id = "prop_ip";
      ipInputEl.value = config.ipAddress || "";
      ipInputEl.placeholder = "192.168.1.10";
      const ipWarn = makeEl("div", "small text-muted");
      ipWarn.id = "ip_warning";
      ipGroup.append(ipLabel, ipInputEl, ipWarn);

      const maskGroup = makeEl("div", "sbx-prop-group");
      const maskLabel = makeEl("label", "form-label small", "Subnet Mask");
      maskLabel.setAttribute("for", "prop_mask");
      const maskInputEl = document.createElement("input");
      maskInputEl.className = "form-control form-control-sm";
      maskInputEl.id = "prop_mask";
      maskInputEl.value = config.subnetMask || "";
      maskInputEl.placeholder = "255.255.255.0";
      const maskWarn = makeEl("div", "small text-muted");
      maskWarn.id = "mask_warning";
      maskGroup.append(maskLabel, maskInputEl, maskWarn);

      const gwGroup = makeEl("div", "sbx-prop-group");
      const gwLabel = makeEl("label", "form-label small", "Default Gateway");
      gwLabel.setAttribute("for", "prop_gw");
      const gwInputEl = document.createElement("input");
      gwInputEl.className = "form-control form-control-sm";
      gwInputEl.id = "prop_gw";
      gwInputEl.value = config.defaultGateway || "";
      gwInputEl.placeholder = "192.168.1.1";
      const gwWarn = makeEl("div", "small text-muted");
      gwWarn.id = "gw_warning";
      gwGroup.append(gwLabel, gwInputEl, gwWarn);

      const dhcpWrap = makeEl("div", "form-check form-switch mt-2");
      const dhcpInputEl = document.createElement("input");
      dhcpInputEl.className = "form-check-input";
      dhcpInputEl.type = "checkbox";
      dhcpInputEl.id = "prop_dhcp";
      dhcpInputEl.checked = !!config.dhcpEnabled;
      const dhcpLabel = makeEl("label", "form-check-label small", "DHCP enabled");
      dhcpLabel.setAttribute("for", "prop_dhcp");
      dhcpWrap.append(dhcpInputEl, dhcpLabel);

      const macText = makeEl("div", "small text-muted mt-2", `MAC: ${config.macAddress || ""}`);

      const deleteBtn = makeEl("button", "btn btn-outline-danger btn-sm mt-3", "Delete Device");
      deleteBtn.id = "deleteDeviceBtn";

      propsEl.append(nameGroup, ipGroup, maskGroup, gwGroup, dhcpWrap, macText, deleteBtn);

      const nameInput = getById("prop_name");
      const ipInput = getById("prop_ip");
      const maskInput = getById("prop_mask");
      const gwInput = getById("prop_gw");
      const dhcpToggle = getById("prop_dhcp");

      nameInput?.addEventListener("input", (e) => {
        device.name = e.target.value;
        addActionLog(`Renamed ${device.name}`);
        renderDevices();
        notifyTutorialProgress();
        markDirtyAndSaveSoon();
      });

      ipInput?.addEventListener("input", (e) => {
        device.config.ipAddress = e.target.value;
        updateDeviceStatus(device);
        renderDevices();
        updateWarnings(device);
        notifyTutorialProgress();
        markDirtyAndSaveSoon();
      });

      maskInput?.addEventListener("input", (e) => {
        device.config.subnetMask = e.target.value;
        updateDeviceStatus(device);
        updateWarnings(device);
        notifyTutorialProgress();
        markDirtyAndSaveSoon();
      });

      gwInput?.addEventListener("input", (e) => {
        device.config.defaultGateway = e.target.value;
        updateDeviceStatus(device);
        updateWarnings(device);
        notifyTutorialProgress();
        markDirtyAndSaveSoon();
      });

      dhcpToggle?.addEventListener("change", (e) => {
        device.config.dhcpEnabled = e.target.checked;
        if (device.config.dhcpEnabled) {
          requestDHCP(device.id);
        }
        notifyTutorialProgress();
        markDirtyAndSaveSoon();
      });

      getById("deleteDeviceBtn")?.addEventListener("click", () => {
        deleteDevices([device.id]);
      });

      updateWarnings(device);
      return;
    }

    if (tab === "interfaces") {
      if (!config.interfaces || !config.interfaces.length) {
        propsEl.textContent = "This device has no configurable interfaces.";
        return;
      }

      config.interfaces.forEach((iface, idx) => {
        const card = makeEl("div", "sbx-prop-card");
        const header = makeEl("div", "d-flex justify-content-between align-items-center");
        header.append(
          makeEl("strong", null, iface.name || ""),
          makeEl("span", "badge text-bg-light border", iface.status || "")
        );
        card.appendChild(header);
        card.appendChild(makeEl("div", "small text-muted", `Speed: ${iface.speed || ""}`));
        if (device.type === "router") {
          const ifaceInput = document.createElement("input");
          ifaceInput.className = "form-control form-control-sm mt-2";
          ifaceInput.setAttribute("data-iface-ip", String(idx));
          ifaceInput.value = iface.ipAddress || "";
          ifaceInput.placeholder = "IP Address";
          card.appendChild(ifaceInput);
        }
        if (iface.connectedTo) {
          const name = findDevice(iface.connectedTo)?.name || iface.connectedTo;
          card.appendChild(makeEl("div", "small text-muted mt-1", `↔ ${name}`));
        }
        propsEl.appendChild(card);
      });

      qsa("[data-iface-ip]", propsEl).forEach((input) => {
        input.addEventListener("input", (e) => {
          const idx = Number(e.target.getAttribute("data-iface-ip"));
          if (config.interfaces[idx]) {
            config.interfaces[idx].ipAddress = e.target.value;
            markDirtyAndSaveSoon();
          }
        });
      });
      return;
    }

    if (tab === "routing") {
      if (!config.routingTable) {
        propsEl.textContent = "Routing is not available for this device.";
        return;
      }

      if (config.routingTable.length) {
        config.routingTable.forEach((route) => {
          const card = makeEl("div", "sbx-prop-card");
          const title = makeEl("div");
          const strong = makeEl("strong", null, `${route.network}/${route.mask}`);
          title.appendChild(strong);
          card.appendChild(title);
          card.appendChild(
            makeEl("div", "small text-muted", `Via ${route.gateway} · ${route.interface}`)
          );
          propsEl.appendChild(card);
        });
      } else {
        propsEl.appendChild(makeEl("div", "small text-muted", "No static routes configured."));
      }

      const addBtn = makeEl("button", "btn btn-outline-secondary btn-sm mt-2", "Add Route");
      addBtn.id = "addRouteBtn";
      propsEl.appendChild(addBtn);

      getById("addRouteBtn")?.addEventListener("click", () => {
        const network = prompt("Network (e.g., 10.0.0.0)");
        const mask = prompt("Mask (e.g., 255.255.255.0)");
        const gateway = prompt("Gateway (e.g., 10.0.0.1)");
        const iface = prompt("Interface (e.g., GigabitEthernet0/0)");
        if (!network || !mask || !gateway || !iface) return;
        config.routingTable.push({ network, mask, gateway, interface: iface, metric: 1 });
        markDirtyAndSaveSoon();
        renderProps();
      });
      return;
    }

    if (tab === "dhcp") {
      if (!config.dhcpServer) {
        propsEl.textContent = "DHCP server configuration is not available for this device.";
        return;
      }

      const toggleWrap = makeEl("div", "form-check form-switch mb-2");
      const enabledInput = document.createElement("input");
      enabledInput.className = "form-check-input";
      enabledInput.type = "checkbox";
      enabledInput.id = "dhcpServerEnabled";
      enabledInput.checked = !!config.dhcpServer.enabled;
      const enabledLabel = makeEl("label", "form-check-label small", "Enable DHCP Server");
      enabledLabel.setAttribute("for", "dhcpServerEnabled");
      toggleWrap.append(enabledInput, enabledLabel);

      const grid = makeEl("div", "sbx-prop-grid");
      const dhcpNetwork = document.createElement("input");
      dhcpNetwork.className = "form-control form-control-sm";
      dhcpNetwork.id = "dhcpNetwork";
      dhcpNetwork.value = config.dhcpServer.network || "";
      dhcpNetwork.placeholder = "Network";
      const dhcpMask = document.createElement("input");
      dhcpMask.className = "form-control form-control-sm";
      dhcpMask.id = "dhcpMask";
      dhcpMask.value = config.dhcpServer.mask || "";
      dhcpMask.placeholder = "Mask";
      const dhcpGateway = document.createElement("input");
      dhcpGateway.className = "form-control form-control-sm";
      dhcpGateway.id = "dhcpGateway";
      dhcpGateway.value = config.dhcpServer.gateway || "";
      dhcpGateway.placeholder = "Gateway";
      const dhcpStart = document.createElement("input");
      dhcpStart.className = "form-control form-control-sm";
      dhcpStart.id = "dhcpStart";
      dhcpStart.value = config.dhcpServer.rangeStart || "";
      dhcpStart.placeholder = "Range start";
      const dhcpEnd = document.createElement("input");
      dhcpEnd.className = "form-control form-control-sm";
      dhcpEnd.id = "dhcpEnd";
      dhcpEnd.value = config.dhcpServer.rangeEnd || "";
      dhcpEnd.placeholder = "Range end";
      grid.append(dhcpNetwork, dhcpMask, dhcpGateway, dhcpStart, dhcpEnd);

      const leases = makeEl("div", "small text-muted mt-2", `Leases: ${config.dhcpServer.leases.length}`);
      propsEl.append(toggleWrap, grid, leases);

      getById("dhcpServerEnabled")?.addEventListener("change", (e) => {
        config.dhcpServer.enabled = e.target.checked;
        markDirtyAndSaveSoon();
      });
      getById("dhcpNetwork")?.addEventListener("input", (e) => {
        config.dhcpServer.network = e.target.value;
        markDirtyAndSaveSoon();
      });
      getById("dhcpMask")?.addEventListener("input", (e) => {
        config.dhcpServer.mask = e.target.value;
        markDirtyAndSaveSoon();
      });
      getById("dhcpGateway")?.addEventListener("input", (e) => {
        config.dhcpServer.gateway = e.target.value;
        markDirtyAndSaveSoon();
      });
      getById("dhcpStart")?.addEventListener("input", (e) => {
        config.dhcpServer.rangeStart = e.target.value;
        markDirtyAndSaveSoon();
      });
      getById("dhcpEnd")?.addEventListener("input", (e) => {
        config.dhcpServer.rangeEnd = e.target.value;
        markDirtyAndSaveSoon();
      });
      return;
    }

    if (tab === "dns") {
      if (!config.dnsServer) {
        propsEl.textContent = "DNS server configuration is not available for this device.";
        return;
      }

      const toggleWrap = makeEl("div", "form-check form-switch mb-2");
      const enabledInput = document.createElement("input");
      enabledInput.className = "form-check-input";
      enabledInput.type = "checkbox";
      enabledInput.id = "dnsServerEnabled";
      enabledInput.checked = !!config.dnsServer.enabled;
      const enabledLabel = makeEl("label", "form-check-label small", "Enable DNS Server");
      enabledLabel.setAttribute("for", "dnsServerEnabled");
      toggleWrap.append(enabledInput, enabledLabel);
      propsEl.appendChild(toggleWrap);

      if (config.dnsServer.records.length) {
        config.dnsServer.records.forEach((r) => {
          const card = makeEl("div", "sbx-prop-card");
          card.append(
            makeEl("strong", null, r.hostname || ""),
            makeEl("div", "small text-muted", r.ip || "")
          );
          propsEl.appendChild(card);
        });
      } else {
        propsEl.appendChild(makeEl("div", "small text-muted", "No DNS records yet."));
      }

      const addBtn = makeEl("button", "btn btn-outline-secondary btn-sm mt-2", "Add DNS Record");
      addBtn.id = "addDnsBtn";
      propsEl.appendChild(addBtn);

      getById("dnsServerEnabled")?.addEventListener("change", (e) => {
        config.dnsServer.enabled = e.target.checked;
        markDirtyAndSaveSoon();
      });
      getById("addDnsBtn")?.addEventListener("click", () => {
        const hostname = prompt("Hostname (e.g., router.local)");
        const ip = prompt("IP address");
        if (!hostname || !ip) return;
        config.dnsServer.records.push({ hostname, ip });
        markDirtyAndSaveSoon();
        renderProps();
      });
      return;
    }

    if (tab === "mac") {
      if (!config.macTable) {
        propsEl.textContent = "MAC table not available for this device.";
        return;
      }

      if (config.macTable.length) {
        config.macTable.forEach((m) => {
          const card = makeEl("div", "sbx-prop-card");
          card.append(
            makeEl("strong", null, m.macAddress || ""),
            makeEl("div", "small text-muted", `Port: ${m.port || ""}`)
          );
          propsEl.appendChild(card);
        });
      } else {
        propsEl.appendChild(makeEl("div", "small text-muted", "MAC table is empty."));
      }
      return;
    }
  }

  function updateWarnings(device) {
    const ipWarn = getById("ip_warning");
    const maskWarn = getById("mask_warning");
    const gwWarn = getById("gw_warning");

    if (ipWarn) ipWarn.textContent = isValidIP(device.config.ipAddress) ? "" : "Invalid IP";
    if (maskWarn) maskWarn.textContent = isValidSubnet(device.config.subnetMask) ? "" : "Invalid subnet";
    if (gwWarn) {
      gwWarn.textContent = device.config.defaultGateway && !isValidIP(device.config.defaultGateway) ? "Invalid gateway" : "";
    }
  }

  function updateDeviceStatus(device) {
    const ipOk = !device.config.ipAddress || isValidIP(device.config.ipAddress);
    const maskOk = !device.config.subnetMask || isValidSubnet(device.config.subnetMask);
    const gwOk = !device.config.defaultGateway || isValidIP(device.config.defaultGateway);
    device.status = ipOk && maskOk && gwOk ? "on" : "error";
  }

  function renderLogs() {
    if (!logsEl) return;
    clearChildren(logsEl);
    if (!state.actionLogs.length) {
      logsEl.textContent = "No actions logged yet.";
      return;
    }
    state.actionLogs.forEach((l) => {
      logsEl.appendChild(makeEl("div", null, l));
    });
  }

  function renderPackets() {
    if (!packetsEl) return;
    clearChildren(packetsEl);
    if (!state.packets.length) {
      packetsEl.textContent = "No packet activity yet.";
      return;
    }
    state.packets.forEach((p) => {
      packetsEl.appendChild(makeEl("div", null, p));
    });
  }

  function renderConsole() {
    if (!consoleOutputEl) return;
    clearChildren(consoleOutputEl);
    state.consoleOutput.forEach((l) => {
      consoleOutputEl.appendChild(makeEl("div", null, l));
    });
    consoleOutputEl.scrollTop = consoleOutputEl.scrollHeight;
  }

  function renderAll() {
    updateGrid();
    updateZoomLabel();
    updateEmptyState();
    renderDevices();
    renderConnections();
    renderProps();
    renderInspector();
    renderObjectives();
    renderLogs();
    renderPackets();
    renderConsole();
    updatePingVisibility();
    updateSaveModalLive();
  }

  // AI Prompt: Explain the History (Undo/Redo) section in clear, simple terms.
  // ----------------------------------------
  // History (Undo/Redo)
  // ----------------------------------------
  function snapshotState() {
    return {
      devices: JSON.parse(JSON.stringify(state.devices)),
      connections: JSON.parse(JSON.stringify(state.connections)),
    };
  }

  function pushHistory() {
    const snap = snapshotState();
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snap);
    state.historyIndex = state.history.length - 1;
    updateHistoryButtons();
  }

  function restoreHistory(index) {
    const snap = state.history[index];
    if (!snap) return;
    state.devices = snap.devices.map(normalizeDevice);
    state.connections = snap.connections.map(normalizeConnection).filter(Boolean);
    rebuildMacTables();
    renderAll();
    updateHistoryButtons();
    markDirtyAndSaveSoon();
  }

  function updateHistoryButtons() {
    const undoBtn = getById("undoBtn");
    const redoBtn = getById("redoBtn");
    if (undoBtn) undoBtn.disabled = state.historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = state.historyIndex >= state.history.length - 1;
  }

  // AI Prompt: Explain the Device and connection actions section in clear, simple terms.
  // ----------------------------------------
  // Device and connection actions
  // ----------------------------------------
  function addDevice(type, position = null) {
    const rect = stage.getBoundingClientRect();
    const pos = position && Number.isFinite(position.x) && Number.isFinite(position.y)
      ? { x: position.x, y: position.y }
      : getNextDevicePosition();
    const count = state.devices.filter((d) => d.type === type).length + 1;

    if (state.snap) {
      pos.x = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
      pos.y = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;
    }

    const device = normalizeDevice({
      id: `device-${Date.now()}`,
      type,
      x: clamp(pos.x, 10, rect.width - DEVICE_SIZE - 10),
      y: clamp(pos.y, 10, rect.height - DEVICE_SIZE - 10),
      name: `${DEVICE_TYPES[type]?.label || "Device"} ${count}`,
      status: "on",
    });

    updateDeviceStatus(device);
    state.devices.push(device);
    state.selectedIds = [device.id];
    state.deviceAnimations.add(device.id);
    addActionLog(`Added ${device.name}`);
    pushHistory();
    renderAll();
    notifyTutorialProgress();
    markDirtyAndSaveSoon();
  }

  function deleteDevices(ids) {
    if (!ids || !ids.length) return;
    const removed = state.devices.filter((d) => ids.includes(d.id));
    state.devices = state.devices.filter((d) => !ids.includes(d.id));
    state.connections = state.connections.filter((c) => !ids.includes(c.from) && !ids.includes(c.to));
    state.selectedIds = [];
    removed.forEach((d) => addActionLog(`Removed ${d.name}`));
    rebuildMacTables();
    pushHistory();
    renderAll();
    notifyTutorialProgress();
    markDirtyAndSaveSoon();
  }

  function createConnection(fromId, toId) {
    if (fromId === toId) return;
    const exists = state.connections.some(
      (c) => (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
    );
    if (exists) return;

    const fromDevice = findDevice(fromId);
    const toDevice = findDevice(toId);
    const fromInterface = pickInterface(fromDevice);
    const toInterface = pickInterface(toDevice);

    const conn = {
      id: `conn-${Date.now()}`,
      from: fromId,
      to: toId,
      type: state.connectType,
      status: "active",
      fromInterface: fromInterface?.id || "",
      toInterface: toInterface?.id || "",
    };

    if (fromInterface) fromInterface.connectedTo = toId;
    if (toInterface) toInterface.connectedTo = fromId;

    state.connections.push(conn);
    rebuildMacTables();
    addActionLog(`Connected ${fromDevice?.name || "device"} to ${toDevice?.name || "device"}`);
    pushHistory();
    renderAll();
    notifyTutorialProgress();
    markDirtyAndSaveSoon();
  }

  function deleteConnection(connId) {
    const conn = state.connections.find((c) => c.id === connId);
    if (!conn) return;

    clearInterfaceLink(conn.from, conn.fromInterface);
    clearInterfaceLink(conn.to, conn.toInterface);

    state.connections = state.connections.filter((c) => c.id !== connId);
    rebuildMacTables();
    addActionLog("Removed connection");
    pushHistory();
    renderAll();
    notifyTutorialProgress();
    markDirtyAndSaveSoon();
  }

  function pickInterface(device) {
    if (!device || !device.config?.interfaces) return null;
    const available = device.config.interfaces.find((i) => !i.connectedTo);
    if (available) {
      available.status = "up";
      return available;
    }
    return null;
  }

  function clearInterfaceLink(deviceId, ifaceId) {
    if (!deviceId || !ifaceId) return;
    const device = findDevice(deviceId);
    if (!device || !device.config?.interfaces) return;
    device.config.interfaces.forEach((iface) => {
      if (iface.id === ifaceId) {
        iface.connectedTo = "";
        iface.status = device.type === "router" ? "admin-down" : "down";
      }
    });
  }

  function rebuildMacTables() {
    state.devices.forEach((device) => {
      if (device.type !== "switch") return;
      const entries = [];
      const links = state.connections.filter((c) => c.from === device.id || c.to === device.id);
      links.forEach((conn, idx) => {
        const otherId = conn.from === device.id ? conn.to : conn.from;
        const other = findDevice(otherId);
        if (!other) return;
        const port = device.config.interfaces?.[idx]?.name || `Fa0/${idx}`;
        entries.push({ macAddress: other.config.macAddress, port, age: 0 });
      });
      device.config.macTable = entries;
    });
  }

  // AI Prompt: Explain the Ping & packets section in clear, simple terms.
  // ----------------------------------------
  // Ping & packets
  // ----------------------------------------
  function executePing(fromId, toId) {
    const fromDevice = findDevice(fromId);
    const toDevice = findDevice(toId);
    const steps = [];

    if (!fromDevice) return;
    if (!fromDevice.config.ipAddress) {
      steps.push({ step: "Source IP", success: false, message: "No IP configured" });
      setPingResult({ success: false, steps, message: "Source IP missing" }, { fromDevice, toDevice, path: [] });
      return;
    }

    steps.push({ step: "Source IP", success: true, message: fromDevice.config.ipAddress });

    if (!toDevice || !toDevice.config.ipAddress) {
      steps.push({ step: "Destination IP", success: false, message: "Destination missing" });
      setPingResult({ success: false, steps, message: "Destination not found" }, { fromDevice, toDevice, path: [] });
      return;
    }

    steps.push({ step: "Destination IP", success: true, message: toDevice.config.ipAddress });

    if (!isValidSubnet(fromDevice.config.subnetMask)) {
      steps.push({ step: "Subnet", success: false, message: "Invalid subnet mask" });
      setPingResult({ success: false, steps, message: "Invalid subnet mask" }, { fromDevice, toDevice, path: [] });
      return;
    }

    const path = findPath(fromId, toId);
    if (!path.length) {
      steps.push({ step: "Connectivity", success: false, message: "No path" });
      setPingResult({ success: false, steps, message: "No route" }, { fromDevice, toDevice, path });
      return;
    }

    const sameSubnet = isSameSubnet(
      fromDevice.config.ipAddress,
      toDevice.config.ipAddress,
      fromDevice.config.subnetMask
    );
    steps.push({ step: "Subnet", success: true, message: sameSubnet ? "Local" : "Remote" });

    if (!sameSubnet) {
      if (!fromDevice.config.defaultGateway) {
        steps.push({ step: "Gateway", success: false, message: "No default gateway" });
        setPingResult({ success: false, steps, message: "Missing gateway" }, { fromDevice, toDevice, path });
        return;
      }

      const gatewayDevice = state.devices.find((d) => d.config.ipAddress === fromDevice.config.defaultGateway);
      if (!gatewayDevice) {
        steps.push({ step: "Gateway", success: false, message: "Gateway not in topology" });
        setPingResult({ success: false, steps, message: "Gateway unreachable" }, { fromDevice, toDevice, path });
        return;
      }

      const pathViaGateway = path.includes(gatewayDevice.id);
      if (!pathViaGateway) {
        steps.push({ step: "Gateway", success: false, message: "No route through gateway" });
        setPingResult({ success: false, steps, message: "No route to destination" }, { fromDevice, toDevice, path });
        return;
      }

      steps.push({ step: "Gateway", success: true, message: `Gateway: ${gatewayDevice.name}` });
    }

    setPingResult({
      success: true,
      steps,
      message: `Reply from ${toDevice.config.ipAddress}`,
      latency: sameSubnet ? 1 : 2,
    }, { fromDevice, toDevice, path });

    addPacketLog(`${fromDevice.name} → ${toDevice.name} (${fromDevice.config.ipAddress} → ${toDevice.config.ipAddress})`);
    animatePacket(path);
  }

  function setPingResult(result, meta = {}) {
    state.pingInspector = result;
    renderInspector();
    const resultBox = getById("pingResult");
    if (resultBox) {
      const cls = `sbx-ping-result ${result.success ? "is-success" : "is-fail"}`;
      const icon = result.success ? "bi-check-circle" : "bi-x-circle";
      setStatusBox(resultBox, cls, icon, String(result.message || ""));
    }
    updatePingOverview(meta, result);
  }

  function addPacketLog(line) {
    state.packets.unshift(`[${new Date().toLocaleTimeString()}] ${line}`);
    state.packets = state.packets.slice(0, 40);
    renderPackets();
  }

  function animatePacket(path) {
    if (!path || path.length < 2) return;
    resizeConnections();

    const points = path
      .map((id) => findDevice(id))
      .filter(Boolean)
      .map((d) => ({ x: d.x + DEVICE_RADIUS, y: d.y + DEVICE_RADIUS }));

    if (points.length < 2) return;

    const segments = [];
    let total = 0;
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      segments.push({ a, b, len });
      total += len;
    }

    if (!total) return;

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", "6");
    circle.setAttribute("fill", "#10b981");
    circle.setAttribute("opacity", "0.95");
    connectionLayer.appendChild(circle);

    const duration = 1000 + segments.length * 200;
    const start = performance.now();

    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      let dist = t * total;
      for (const seg of segments) {
        if (dist <= seg.len) {
          const ratio = seg.len === 0 ? 0 : dist / seg.len;
          const x = seg.a.x + (seg.b.x - seg.a.x) * ratio;
          const y = seg.a.y + (seg.b.y - seg.a.y) * ratio;
          circle.setAttribute("cx", x);
          circle.setAttribute("cy", y);
          break;
        }
        dist -= seg.len;
      }

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        circle.remove();
      }
    }

    requestAnimationFrame(step);
  }

  function findPath(fromId, toId) {
    const visited = new Set();
    const queue = [{ id: fromId, path: [fromId] }];

    while (queue.length) {
      const { id, path } = queue.shift();
      if (id === toId) return path;
      if (visited.has(id)) continue;
      visited.add(id);

      const neighbors = state.connections
        .filter((c) => c.from === id || c.to === id)
        .map((c) => (c.from === id ? c.to : c.from));

      neighbors.forEach((next) => {
        if (!visited.has(next)) queue.push({ id: next, path: [...path, next] });
      });
    }

    return [];
  }

  // AI Prompt: Explain the DHCP section in clear, simple terms.
  // ----------------------------------------
  // DHCP
  // ----------------------------------------
  function requestDHCP(deviceId) {
    const device = findDevice(deviceId);
    if (!device) return;

    const dhcpServer = state.devices.find((d) => d.config.dhcpServer?.enabled);
    if (!dhcpServer || !dhcpServer.config.dhcpServer) {
      addConsoleOutput("DHCP: No DHCP server found");
      return;
    }

    const config = dhcpServer.config.dhcpServer;
    const startIP = ipToInt(config.rangeStart || "0.0.0.0");
    const endIP = ipToInt(config.rangeEnd || "0.0.0.0");
    const usedIPs = config.leases.map((l) => ipToInt(l.ip));

    let assigned = null;
    for (let ip = startIP; ip <= endIP; ip += 1) {
      if (!usedIPs.includes(ip)) {
        assigned = ip;
        break;
      }
    }

    if (assigned === null) {
      addConsoleOutput("DHCP: No available IPs in pool");
      return;
    }

    const ipString = [
      (assigned >>> 24) & 255,
      (assigned >>> 16) & 255,
      (assigned >>> 8) & 255,
      assigned & 255,
    ].join(".");

    const lease = {
      ip: ipString,
      mac: device.config.macAddress,
      hostname: device.name,
      expiry: new Date(Date.now() + 86400000).toISOString(),
    };

    config.leases.push(lease);
    device.config.ipAddress = ipString;
    device.config.subnetMask = config.mask || "255.255.255.0";
    device.config.defaultGateway = config.gateway || "";
    device.config.dhcpEnabled = true;

    updateDeviceStatus(device);
    addConsoleOutput(`DHCP: Assigned ${ipString} to ${device.name}`);
    addActionLog(`DHCP assigned ${ipString} to ${device.name}`);
    renderDevices();
    markDirtyAndSaveSoon();
  }

  // AI Prompt: Explain the Console + logs section in clear, simple terms.
  // ----------------------------------------
  // Console + logs
  // ----------------------------------------
  function addConsoleOutput(message) {
    state.consoleOutput.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    state.consoleOutput = state.consoleOutput.slice(-200);
    renderConsole();
  }

  function addActionLog(message) {
    state.actionLogs.unshift(`${new Date().toLocaleTimeString()} - ${message}`);
    state.actionLogs = state.actionLogs.slice(0, 200);
    renderLogs();
  }

  function executeCommand(command) {
    addConsoleOutput(`> ${command}`);
    const parts = command.toLowerCase().trim().split(/\s+/);
    const cmd = parts[0];

    switch (cmd) {
      case "help":
        addConsoleOutput("Commands: help, show devices, show connections, ping <src> <dst>, ipconfig, dhcp request, clear, save");
        break;
      case "show":
        if (parts[1] === "devices") {
          state.devices.forEach((d) => {
            addConsoleOutput(`${d.name} (${d.type}) - ${d.config.ipAddress || "No IP"}`);
          });
        } else if (parts[1] === "connections") {
          state.connections.forEach((c) => {
            const from = findDevice(c.from);
            const to = findDevice(c.to);
            addConsoleOutput(`${from?.name || "?"} ↔ ${to?.name || "?"} (${c.type})`);
          });
        }
        break;
      case "ping":
        if (parts.length >= 3) {
          const src = state.devices.find((d) => d.name.toLowerCase() === parts[1]);
          const dst = state.devices.find((d) => d.name.toLowerCase() === parts[2]);
          if (src && dst) executePing(src.id, dst.id);
          else addConsoleOutput("Device not found");
        } else {
          addConsoleOutput("Usage: ping <source> <destination>");
        }
        break;
      case "ipconfig":
        const selected = getSelectedDevice();
        if (selected) {
          addConsoleOutput(`IP: ${selected.config.ipAddress || "Not set"}`);
          addConsoleOutput(`Mask: ${selected.config.subnetMask || "Not set"}`);
          addConsoleOutput(`Gateway: ${selected.config.defaultGateway || "Not set"}`);
        } else {
          addConsoleOutput("No device selected");
        }
        break;
      case "dhcp":
        if (parts[1] === "request") {
          const selectedDevice = getSelectedDevice();
          if (selectedDevice) requestDHCP(selectedDevice.id);
          else addConsoleOutput("No device selected");
        }
        break;
      case "clear":
        state.consoleOutput = [];
        renderConsole();
        break;
      case "save":
        handleSaveTopology();
        break;
      default:
        addConsoleOutput("Unknown command. Type help.");
    }
  }

  // AI Prompt: Explain the Challenge validation section in clear, simple terms.
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

      const xpRes = await fetch(`${API_BASE}/complete-challenge`, {
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
        if (xpData.already_completed) {
          setStatusBox(resultBox, "small text-success fw-semibold", "bi-check2-circle", "Passed! Challenge already completed.");
        } else {
          setStatusBox(resultBox, "small text-success fw-semibold", "bi-check2-circle", `Passed! +${xpData.xp_added} XP earned.`);
        }
        markChallengeCompletion(
          user.email,
          lessonSession.course_id,
          lessonSession.lesson_number,
          Number(xpData.xp_added || 0)
        );
        await refreshUserFromServer(user.email);
      } else {
        setStatusBox(resultBox, "small text-warning fw-semibold", "bi-exclamation-triangle", "Passed, but XP award failed.");
      }

      if (returnBox) {
        clearChildren(returnBox);
        const link = makeEl("a", "btn btn-outline-secondary btn-sm w-100", "Return to lesson");
        link.href = `lesson.html?course_id=${lessonSession.course_id}&lesson=${lessonSession.lesson_number}`;
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

  // AI Prompt: Explain the Save / Load section in clear, simple terms.
  // ----------------------------------------
  // Save / Load
  // ----------------------------------------
  async function handleSaveTopology() {
    const user = getLoggedInUser();
    if (!user || !user.email) {
      showToast({
        variant: "error",
        title: "Sign in required",
        message: "Log in to save your topology.",
      });
      return;
    }

    openSaveModal();
  }

  function openSaveModal() {
    if (!saveModalEl) return;
    const user = getLoggedInUser();
    if (!user || !user.email) return;

    if (saveNameInput) {
      const stamp = new Date();
      const label = `Topology ${stamp.toLocaleDateString()} ${stamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      if (!saveNameInput.value.trim()) saveNameInput.value = label;
    }

    renderSummary(saveSummaryEl);
    renderTopologyPreview(savePreviewEl);

    const modal = new bootstrap.Modal(saveModalEl);
    modal.show();
  }

  async function confirmSaveTopology() {
    const user = getLoggedInUser();
    if (!user || !user.email) return;
    const name = saveNameInput?.value?.trim();
    if (!name) {
      showToast({ variant: "error", title: "Name required", message: "Please name your topology." });
      return;
    }

    if (saveConfirmBtn) {
      saveConfirmBtn.disabled = true;
      saveConfirmBtn.textContent = "Saving...";
    }

    try {
      const res = await fetch(`${API_BASE}/save-topology`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name,
          devices: state.devices,
          connections: state.connections,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Save failed.");

      showToast({
        variant: "success",
        title: "Topology saved",
        message: data.message || `Saved "${name}".`,
      });

      const modal = bootstrap.Modal.getInstance(saveModalEl);
      if (modal) modal.hide();
    } catch (e) {
      console.error("Save topology error:", e);
      showToast({
        variant: "error",
        title: "Save failed",
        message: "Could not save the topology. Try again.",
      });
    } finally {
      if (saveConfirmBtn) {
        saveConfirmBtn.disabled = false;
        saveConfirmBtn.textContent = "Save topology";
      }
    }
  }

  function openClearModal() {
    if (!clearModalEl) return;
    renderSummary(clearSummaryEl);
    renderTopologyPreview(clearPreviewEl);
    const modal = new bootstrap.Modal(clearModalEl);
    modal.show();
  }

  function confirmClearTopology() {
    const removedDevices = state.devices.length;
    const removedConnections = state.connections.length;

    state.devices = [];
    state.connections = [];
    state.selectedIds = [];
    state.connectFrom = null;
    pushHistory();
    renderAll();
    markDirtyAndSaveSoon();
    addActionLog("Cleared topology");

    const modal = bootstrap.Modal.getInstance(clearModalEl);
    if (modal) modal.hide();

    showToast({
      variant: "info",
      title: "Workspace cleared",
      message: `Removed ${removedDevices} devices and ${removedConnections} links.`,
    });
  }

  async function refreshTopologyList() {
    const user = getLoggedInUser();
    if (!user || !user.email) return;

    const res = await fetch(`${API_BASE}/load-topologies?email=${encodeURIComponent(user.email)}`);
    const data = await res.json();

    const list = getById("topologyList");
    if (!list) return;
    clearChildren(list);

    (data.topologies || []).forEach((t) => {
      const row = document.createElement("tr");
      const nameTd = makeEl("td", null, t.name || "");
      const dateTd = makeEl("td", null, new Date(t.created_at).toLocaleString());
      const actionTd = makeEl("td", "text-end");
      const loadButton = makeEl("button", "btn btn-sm btn-primary me-2", "Load");
      loadButton.setAttribute("data-load-id", t.id);
      loadButton.setAttribute("data-tooltip", "Load this topology");
      const deleteButton = makeEl("button", "btn btn-sm btn-danger", "Delete");
      deleteButton.setAttribute("data-delete-id", t.id);
      deleteButton.setAttribute("data-tooltip", "Delete this topology");
      actionTd.append(loadButton, deleteButton);
      row.append(nameTd, dateTd, actionTd);
      list.appendChild(row);

      const loadBtn = row.querySelector("[data-load-id]");
      if (loadBtn) loadBtn.dataset.loadName = t.name || "Topology";
    });

    list.querySelectorAll("[data-load-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-load-id");
        const name = btn.dataset.loadName || "";
        await loadTopologyById(id, name);
      });
    });

    list.querySelectorAll("[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-delete-id");
        await deleteTopology(id);
      });
    });
  }

  async function loadTopologyById(id, name = "") {
    const res = await fetch(`${API_BASE}/load-topology/${id}`);
    const data = await res.json();

    if (!data.success) {
      showToast({
        variant: "error",
        title: "Load failed",
        message: "Could not load this topology.",
      });
      return;
    }

    state.devices = (data.devices || []).map(normalizeDevice);
    state.connections = (data.connections || []).map(normalizeConnection).filter(Boolean);
    state.selectedIds = [];
    state.connectFrom = null;
    rebuildMacTables();
    pushHistory();
    renderAll();
    markDirtyAndSaveSoon();

    const modal = bootstrap.Modal.getInstance(getById("topologyModal"));
    if (modal) modal.hide();

    showToast({
      variant: "success",
      title: "Topology loaded",
      message: name ? `Loaded "${name}".` : "Topology loaded successfully.",
    });
  }

  async function deleteTopology(id) {
    if (!confirm("Delete this topology?")) return;
    const user = getLoggedInUser();
    await fetch(`${API_BASE}/delete-topology/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user?.email || "" }),
    });
    await refreshTopologyList();
    showToast({
      variant: "info",
      title: "Topology removed",
      message: "Deleted the saved topology.",
    });
  }

  // AI Prompt: Explain the Event binding section in clear, simple terms.
  // ----------------------------------------
  // Event binding
  // ----------------------------------------
  function bindTooltips() {
    const selector = "[data-tooltip],[aria-label],[title]";
    const handleOver = (e) => {
      const target = e.target?.closest?.(selector);
      if (!target) return;
      if (target.contains(e.relatedTarget)) return;
      showTooltip(target);
    };

    const handleOut = (e) => {
      const target = e.target?.closest?.(selector);
      if (!target) return;
      if (target.contains(e.relatedTarget)) return;
      hideTooltip();
    };

    document.addEventListener("mouseover", handleOver);
    document.addEventListener("mouseout", handleOut);
    document.addEventListener("focusin", (e) => {
      const target = e.target?.closest?.(selector);
      if (!target) return;
      showTooltip(target);
    });
    document.addEventListener("focusout", (e) => {
      const target = e.target?.closest?.(selector);
      if (!target) return;
      hideTooltip();
    });
    window.addEventListener("scroll", hideTooltip, true);
    window.addEventListener("resize", hideTooltip);
    document.addEventListener("mousedown", hideTooltip);
  }

  function bindLibraryDrag() {
    qsa("[data-device]").forEach((card) => {
      card.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        const type = card.getAttribute("data-device");
        if (!type) return;

        const startX = e.clientX;
        const startY = e.clientY;
        let dragging = false;
        let ghost = null;

        const handleMove = (ev) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (!dragging && Math.hypot(dx, dy) > 6) {
            dragging = true;
            ghost = createDragGhost(type);
            positionDragGhost(ghost, ev.clientX, ev.clientY);
            stage.classList.add("is-drop");
          }
          if (dragging) {
            positionDragGhost(ghost, ev.clientX, ev.clientY);
          }
        };

        const handleUp = (ev) => {
          window.removeEventListener("pointermove", handleMove);
          window.removeEventListener("pointerup", handleUp);
          window.removeEventListener("pointercancel", handleUp);
          stage.classList.remove("is-drop");
          if (ghost) ghost.remove();

          if (dragging) {
            const rect = stage.getBoundingClientRect();
            const within =
              ev.clientX >= rect.left &&
              ev.clientX <= rect.right &&
              ev.clientY >= rect.top &&
              ev.clientY <= rect.bottom;
            if (within) {
              const x = (ev.clientX - rect.left) / state.zoom - DEVICE_RADIUS;
              const y = (ev.clientY - rect.top) / state.zoom - DEVICE_RADIUS;
              addDevice(type, { x, y });
            }
          } else {
            addDevice(type);
          }
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp, { once: true });
        window.addEventListener("pointercancel", handleUp, { once: true });
      });
    });
  }

  function bindToolbar() {
    qsa("[data-tool]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.tool = btn.getAttribute("data-tool");
        qsa("[data-tool]").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        state.connectFrom = null;
        setTip(state.tool === TOOL.CONNECT ? "Select a device to start a connection." : "Select and drag devices.");
        updateConnGroupVisibility();
      });
    });

    qsa("[data-conn-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.connectType = btn.getAttribute("data-conn-type");
        qsa("[data-conn-type]").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
      });
    });

    getById("toggleGridBtn")?.addEventListener("click", () => {
      state.showGrid = !state.showGrid;
      getById("toggleGridBtn")?.classList.toggle("is-active", state.showGrid);
      updateGrid();
    });

    getById("toggleSnapBtn")?.addEventListener("click", () => {
      state.snap = !state.snap;
      getById("toggleSnapBtn")?.classList.toggle("is-active", state.snap);
    });

    getById("zoomInBtn")?.addEventListener("click", () => {
      state.zoom = clamp(state.zoom + 0.1, 0.5, 2);
      updateZoomLabel();
      renderConnections();
    });

    getById("zoomOutBtn")?.addEventListener("click", () => {
      state.zoom = clamp(state.zoom - 0.1, 0.5, 2);
      updateZoomLabel();
      renderConnections();
    });

    getById("undoBtn")?.addEventListener("click", () => {
      if (state.historyIndex > 0) {
        state.historyIndex -= 1;
        restoreHistory(state.historyIndex);
      }
    });

    getById("redoBtn")?.addEventListener("click", () => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
        restoreHistory(state.historyIndex);
      }
    });

    getById("saveBtn")?.addEventListener("click", handleSaveTopology);
    saveConfirmBtn?.addEventListener("click", confirmSaveTopology);
    getById("loadBtn")?.addEventListener("click", async () => {
      await refreshTopologyList();
      const modal = new bootstrap.Modal(getById("topologyModal"));
      modal.show();
    });
    getById("clearBtn")?.addEventListener("click", openClearModal);
    clearConfirmBtn?.addEventListener("click", confirmClearTopology);

    getById("pingBtn")?.addEventListener("click", () => {
      const selected = getSelectedDevice();
      if (!selected) return;

      const connected = state.connections
        .filter((c) => c.from === selected.id || c.to === selected.id)
        .map((c) => (c.from === selected.id ? findDevice(c.to) : findDevice(c.from)))
        .filter(Boolean);

      const select = getById("pingTargetSelect");
      if (!select) return;
      clearChildren(select);
      connected.forEach((dev) => {
        const opt = document.createElement("option");
        opt.value = dev.id;
        opt.textContent = dev.name;
        select.appendChild(opt);
      });
      const defaultTarget = connected[0] || null;
      updatePingOverview({ fromDevice: selected, toDevice: defaultTarget, path: defaultTarget ? findPath(selected.id, defaultTarget.id) : [] }, null);

      select.onchange = () => {
        const targetId = select.value;
        const target = targetId ? findDevice(targetId) : null;
        updatePingOverview({ fromDevice: selected, toDevice: target, path: target ? findPath(selected.id, target.id) : [] }, null);
      };

      const resultBox = getById("pingResult");
      if (resultBox) {
        resultBox.className = "sbx-ping-result";
        resultBox.textContent = "Ready to run a ping.";
      }

      const modal = new bootstrap.Modal(getById("pingModal"));
      modal.show();
    });

    getById("runPingBtn")?.addEventListener("click", () => {
      const selected = getSelectedDevice();
      if (!selected) return;
      const targetId = getById("pingTargetSelect")?.value;
      if (!targetId) return;
      executePing(selected.id, targetId);
    });

    updateConnGroupVisibility();
  }

  function bindPanels() {
    function updatePanelButtons() {
      const leftHidden = leftPanel.style.display === "none";
      const rightHidden = rightPanel.style.display === "none";
      if (leftOpenBtn) leftOpenBtn.style.display = leftHidden ? "flex" : "none";
      if (rightOpenBtn) rightOpenBtn.style.display = rightHidden ? "flex" : "none";
    }

    leftToggle?.addEventListener("click", () => {
      const hidden = leftPanel.style.display === "none";
      leftPanel.style.display = hidden ? "" : "none";
      workspace.classList.toggle("left-hidden", !hidden);
      leftToggle.querySelector("i").className = hidden ? "bi bi-chevron-left" : "bi bi-chevron-right";
      updatePanelButtons();
    });

    rightToggle?.addEventListener("click", () => {
      const hidden = rightPanel.style.display === "none";
      rightPanel.style.display = hidden ? "" : "none";
      workspace.classList.toggle("right-hidden", !hidden);
      rightToggle.querySelector("i").className = hidden ? "bi bi-chevron-right" : "bi bi-chevron-left";
      updatePanelButtons();
    });

    leftOpenBtn?.addEventListener("click", () => {
      leftPanel.style.display = "";
      workspace.classList.remove("left-hidden");
      leftToggle.querySelector("i").className = "bi bi-chevron-left";
      updatePanelButtons();
    });

    rightOpenBtn?.addEventListener("click", () => {
      rightPanel.style.display = "";
      workspace.classList.remove("right-hidden");
      rightToggle.querySelector("i").className = "bi bi-chevron-right";
      updatePanelButtons();
    });

    bottomToggle?.addEventListener("click", () => {
      bottomPanel.classList.toggle("is-collapsed");
      bottomToggle.querySelector("i").className = bottomPanel.classList.contains("is-collapsed") ? "bi bi-chevron-up" : "bi bi-chevron-down";
    });

    qsa(".sbx-tab", getById("sbxRightTabs")).forEach((tab) => {
      tab.addEventListener("click", () => {
        state.rightTab = tab.getAttribute("data-tab");
        qsa(".sbx-tab", getById("sbxRightTabs")).forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        qsa(".sbx-tabpanel", rightPanel).forEach((panel) => panel.classList.remove("is-active"));
        getById(`panel${state.rightTab.charAt(0).toUpperCase() + state.rightTab.slice(1)}`)?.classList.add("is-active");
      });
    });

    qsa(".sbx-subtab", getById("sbxConfigTabs")).forEach((tab) => {
      tab.addEventListener("click", () => {
        state.configTab = tab.getAttribute("data-subtab");
        qsa(".sbx-subtab", getById("sbxConfigTabs")).forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        renderProps();
      });
    });

    qsa(".sbx-tab", getById("sbxBottomTabs")).forEach((tab) => {
      tab.addEventListener("click", () => {
        state.bottomTab = tab.getAttribute("data-bottom-tab");
        qsa(".sbx-tab", getById("sbxBottomTabs")).forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        qsa(".sbx-bottom-panel", bottomPanel).forEach((panel) => panel.classList.remove("is-active"));
        getById(`sbx${state.bottomTab.charAt(0).toUpperCase() + state.bottomTab.slice(1)}Panel`)?.classList.add("is-active");
      });
    });

    consoleSendBtn?.addEventListener("click", () => {
      const value = consoleInputEl.value.trim();
      if (!value) return;
      executeCommand(value);
      consoleInputEl.value = "";
    });

    consoleInputEl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const value = consoleInputEl.value.trim();
        if (!value) return;
        executeCommand(value);
        consoleInputEl.value = "";
      }
    });

    updatePanelButtons();
  }

  function bindStage() {
    connectionLayer.style.pointerEvents = "all";
    connectionLayer.addEventListener("click", (e) => {
      const target = e.target;
      if (target && target.dataset && target.dataset.connId) {
        deleteConnection(target.dataset.connId);
      }
    });

    stage.addEventListener("click", (e) => {
      if (e.target === stage || e.target === deviceLayer || e.target === connectionLayer) {
        if (state.tool === TOOL.SELECT) {
          state.selectedIds = [];
          renderAll();
        }
      }
    });

    deviceLayer.addEventListener("pointerdown", (e) => {
      const deviceEl = e.target.closest(".sbx-device");
      if (!deviceEl) return;
      const id = deviceEl.dataset.id;
      if (!id) return;

      const device = findDevice(id);
      if (!device) return;

      if (state.tool === TOOL.CONNECT) {
        if (!state.connectFrom) {
          state.connectFrom = id;
          state.selectedIds = [id];
          renderDevices();
          setTip("Select another device to complete the connection.");
          return;
        }
        if (state.connectFrom && state.connectFrom !== id) {
          createConnection(state.connectFrom, id);
          state.connectFrom = null;
          setTip("Devices connected.");
          return;
        }
        return;
      }

      if (state.tool === TOOL.SELECT) {
        state.selectedIds = [id];
        renderDevices();
        renderProps();
        updatePingVisibility();

        const rect = stage.getBoundingClientRect();
        const pointerX = (e.clientX - rect.left) / state.zoom;
        const pointerY = (e.clientY - rect.top) / state.zoom;

        state.dragging = {
          id,
          offsetX: pointerX - device.x,
          offsetY: pointerY - device.y,
          el: deviceEl,
        };
        deviceEl.setPointerCapture(e.pointerId);
      }
    });

    window.addEventListener("pointermove", (e) => {
      if (!state.dragging) return;
      const rect = stage.getBoundingClientRect();
      const x = (e.clientX - rect.left) / state.zoom - state.dragging.offsetX;
      const y = (e.clientY - rect.top) / state.zoom - state.dragging.offsetY;
      const device = findDevice(state.dragging.id);
      if (!device) return;

      device.x = x;
      device.y = y;
      state.dragging.el.style.left = `${x}px`;
      state.dragging.el.style.top = `${y}px`;
      renderConnections();
    });

    window.addEventListener("pointerup", () => {
      if (!state.dragging) return;
      const device = findDevice(state.dragging.id);
      if (device && state.snap) {
        device.x = Math.round(device.x / GRID_SIZE) * GRID_SIZE;
        device.y = Math.round(device.y / GRID_SIZE) * GRID_SIZE;
      }
      state.dragging = null;
      pushHistory();
      renderAll();
      markDirtyAndSaveSoon();
    });

    window.addEventListener("resize", () => {
      renderConnections();
    });
  }

  // AI Prompt: Explain the Challenge initialization section in clear, simple terms.
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
      lessonSession.lesson_number = Number(data.lesson);
    }

    state.tutorialMeta = {
      courseId: Number(data.courseId),
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

  // AI Prompt: Explain the Init section in clear, simple terms.
  // ----------------------------------------
  // Init
  // ----------------------------------------
  async function init() {
    initChrome();
    bindTooltips();
    bindLibraryDrag();
    bindToolbar();
    bindPanels();
    bindStage();

    if (saveModalEl) {
      saveModalEl.addEventListener("shown.bs.modal", () => {
        state.saveModalOpen = true;
        updateSaveModalLive();
      });
      saveModalEl.addEventListener("hidden.bs.modal", () => {
        state.saveModalOpen = false;
      });
    }

    state.devices = [];
    state.connections = [];
    state.selectedIds = [];
    pushHistory();

    updateGrid();
    updateZoomLabel();
    setTip("Select a device to view and edit its settings.");
    renderAll();

    await initChallenge();
    await initTutorial();

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    window.addEventListener("beforeunload", () => {
      saveLessonSessionToDb();
    });
  }

  init();
})();
