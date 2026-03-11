/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: sandbox-core.js
Purpose: Defines shared sandbox DOM refs, constants, state,
and base helper functions used by the other sandbox files.
---------------------------------------------------------
*/
"use strict";

const getById = (id) => document.getElementById(id);
const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const stage = getById("sandboxStage");

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
const connTypeGroup = getById("connTypeGroup");
const topCarouselWrap = getById("sbxTopCarousel");
const topCarouselScroll = getById("sbxTopCarouselScroll");
const topCarouselDots = getById("sbxTopCarouselDots");
const topCarouselPrevBtn = getById("sbxTopCarouselPrev");
const topCarouselNextBtn = getById("sbxTopCarouselNext");
const tutorialsToggleBtn = getById("sbxTutorialsToggle");
const tutorialsToggleLabel = getById("sbxTutorialsToggleLabel");

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
const bottomHead = getById("sbxBottomHead");
const leftToggle = getById("leftPanelToggle");
const rightToggle = getById("rightPanelToggle");
const bottomToggle = getById("bottomPanelToggle");
const bottomSizeToggle = getById("bottomPanelSizeToggle");
const bottomResizeHandle = getById("sbxBottomResizeHandle");
const leftOpenBtn = getById("leftPanelOpenBtn");
const rightOpenBtn = getById("rightPanelOpenBtn");

const GRID_SIZE = 20;
const DEVICE_SIZE = 72;
const DEVICE_RADIUS = DEVICE_SIZE / 2;
const CANVAS_WIDTH = 3200;
const CANVAS_HEIGHT = 2200;
const AUTO_NETWORK = {
  prefix: "192.168.1.",
  routerHost: 1,
  startHost: 10,
  endHost: 240,
  mask: "255.255.255.0",
};
const CONSOLE_HISTORY_KEY = "sbx_command_history";
const CONSOLE_HISTORY_LIMIT = 50;
const TERMINAL_LAYOUT_KEY = "netology_sbx_terminal_layout";
const TUTORIAL_CAROUSEL_HIDDEN_KEY = "netology_sbx_tutorials_hidden";

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

// Device compatibility map – drives smart connection suggestions.
// Uses only existing CONNECTION_TYPES keys.
const DEVICE_COMPAT = {
  pc:            [{ targets: ["switch"],       conn: "ethernet" },
                 { targets: ["wireless-ap"],  conn: "wireless" },
                 { targets: ["router"],        conn: "ethernet" }],
  laptop:        [{ targets: ["switch"],       conn: "ethernet" },
                 { targets: ["wireless-ap"],  conn: "wireless" }],
  smartphone:    [{ targets: ["wireless-ap"],  conn: "wireless" },
                 { targets: ["switch"],       conn: "ethernet" }],
  printer:       [{ targets: ["switch"],       conn: "ethernet" },
                 { targets: ["router"],        conn: "ethernet" }],
  router:        [{ targets: ["switch"],       conn: "ethernet" },
                 { targets: ["router"],        conn: "fiber"    },
                 { targets: ["cloud"],         conn: "serial"   },
                 { targets: ["firewall"],      conn: "ethernet" }],
  switch:        [{ targets: ["router"],       conn: "ethernet" },
                 { targets: ["server"],        conn: "ethernet" },
                 { targets: ["pc", "laptop", "printer", "smartphone"], conn: "ethernet" },
                 { targets: ["wireless-ap"],  conn: "ethernet" }],
  "wireless-ap": [{ targets: ["switch"],       conn: "ethernet" },
                 { targets: ["router"],        conn: "ethernet" }],
  firewall:      [{ targets: ["router"],       conn: "ethernet" },
                 { targets: ["switch"],        conn: "ethernet" }],
  server:        [{ targets: ["switch"],       conn: "ethernet" },
                 { targets: ["router"],        conn: "ethernet" }],
  cloud:         [{ targets: ["router"],       conn: "serial"   },
                 { targets: ["firewall"],      conn: "fiber"    }],
};

const state = {
  devices: [],
  connections: [],
  selectedIds: [],
  tool: TOOL.SELECT,
  connectFrom: null,
  connectType: "ethernet",
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: true,
  snap: true,
  dragging: null,
  history: [],
  historyIndex: -1,
  rightTab: "objectives",
  configTab: "general",
  bottomTab: "console",
  consoleOutput: ["Network Sandbox", "Ready."],
  actionLogs: [],
  packets: [],
  pingInspector: null,
  objectiveStatus: {},
  challengeMeta: null,
  tutorialMeta: null,
  mode: "free",
  deviceAnimations: new Set(),
  saveModalOpen: false,
  commandHistory: [],
  commandHistoryIndex: -1,
};

let guideUI = null;
let suggestionsHideTimer = null;
let terminalLayout = {
  left: null,
  top: null,
  width: null,
  bodyHeight: 220,
  size: "small",
  collapsed: false,
};

const tutorialCarouselState = {
  hidden: localStorage.getItem(TUTORIAL_CAROUSEL_HIDDEN_KEY) === "1",
  index: 0,
  count: 0,
};

const API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
const ENDPOINTS = window.ENDPOINTS || {};
const XP = window.NetologyXP || null;
const apiGet = window.apiGet || (async (path, params = {}) => {
  const base = API_BASE.trim();
  const url = base ? new URL(base.replace(/\/$/, "") + path) : new URL(path, window.location.origin);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString());
  return res.json();
});

// ----------------------------------------
// Utilities
// ----------------------------------------
function parseJsonSafe(str, fallback = null) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function getStoredUser() {
  return parseJsonSafe(localStorage.getItem("netology_user") || localStorage.getItem("user"));
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

function getTerminalViewportLimits() {
  return {
    minX: 8,
    minY: 70,
    maxX: window.innerWidth - 8,
    maxY: window.innerHeight - 8,
  };
}

function getTerminalBodyHeight() {
  if (!bottomPanel) return 220;
  const raw = parseFloat(getComputedStyle(bottomPanel).getPropertyValue("--sbx-terminal-body-height"));
  if (Number.isFinite(raw) && raw > 0) return raw;
  return Number.isFinite(terminalLayout.bodyHeight) ? Number(terminalLayout.bodyHeight) : 220;
}

function setTerminalBodyHeight(nextHeight, { persist = true } = {}) {
  if (!bottomPanel) return;
  const maxAllowed = Math.max(170, window.innerHeight - 140);
  const clamped = clamp(Number(nextHeight) || 220, 160, maxAllowed);
  terminalLayout.bodyHeight = Math.round(clamped);
  bottomPanel.style.setProperty("--sbx-terminal-body-height", `${Math.round(clamped)}px`);
  if (persist) persistTerminalLayout();
}

function placeTerminalPanel(left, top) {
  if (!bottomPanel) return;
  const nextLeft = Math.round(left);
  const nextTop = Math.round(top);
  bottomPanel.style.left = `${nextLeft}px`;
  bottomPanel.style.top = `${nextTop}px`;
  bottomPanel.style.right = "auto";
  bottomPanel.style.bottom = "auto";
  terminalLayout.left = nextLeft;
  terminalLayout.top = nextTop;
}

function anchorTerminalPanel() {
  if (!bottomPanel) return;
  const rect = bottomPanel.getBoundingClientRect();
  if (!Number.isFinite(terminalLayout.width)) {
    terminalLayout.width = Math.round(rect.width);
  }
  bottomPanel.style.width = `${Math.round(rect.width)}px`;
  placeTerminalPanel(rect.left, rect.top);
}

function clampTerminalPanelToViewport() {
  if (!bottomPanel) return;
  if (window.innerWidth <= 767) return;
  const rect = bottomPanel.getBoundingClientRect();
  const limits = getTerminalViewportLimits();
  const maxLeft = Math.max(limits.minX, limits.maxX - rect.width);
  const maxTop = Math.max(limits.minY, limits.maxY - rect.height);
  placeTerminalPanel(
    clamp(rect.left, limits.minX, maxLeft),
    clamp(rect.top, limits.minY, maxTop),
  );
}

function persistTerminalLayout() {
  if (!bottomPanel) return;
  try {
    const payload = {
      left: Number.isFinite(terminalLayout.left) ? Math.round(terminalLayout.left) : null,
      top: Number.isFinite(terminalLayout.top) ? Math.round(terminalLayout.top) : null,
      width: Number.isFinite(terminalLayout.width) ? Math.round(terminalLayout.width) : null,
      bodyHeight: Math.round(getTerminalBodyHeight()),
      size: String(terminalLayout.size || "small"),
      collapsed: Boolean(terminalLayout.collapsed),
    };
    localStorage.setItem(TERMINAL_LAYOUT_KEY, JSON.stringify(payload));
  } catch {}
}

function loadTerminalLayout() {
  const saved = parseJsonSafe(localStorage.getItem(TERMINAL_LAYOUT_KEY), null);
  if (!saved || typeof saved !== "object") return;
  terminalLayout = {
    left: Number.isFinite(Number(saved.left)) ? Number(saved.left) : null,
    top: Number.isFinite(Number(saved.top)) ? Number(saved.top) : null,
    width: Number.isFinite(Number(saved.width)) ? Number(saved.width) : null,
    bodyHeight: Number.isFinite(Number(saved.bodyHeight)) ? Number(saved.bodyHeight) : 220,
    size: saved.size === "large" ? "large" : "small",
    collapsed: false,
  };
}

function setBottomSize(size, { persist = true } = {}) {
  if (!bottomPanel) return;
  const nextSize = size === "large" ? "large" : "small";
  const presets = nextSize === "large"
    ? { width: 660, bodyHeight: 270 }
    : { width: 500, bodyHeight: 210 };

  terminalLayout.size = nextSize;
  bottomPanel.classList.toggle("is-large", nextSize === "large");

  if (window.innerWidth > 767) {
    const maxWidth = Math.max(340, window.innerWidth - 22);
    const nextWidth = clamp(presets.width, 340, maxWidth);
    bottomPanel.style.width = `${Math.round(nextWidth)}px`;
    terminalLayout.width = Math.round(nextWidth);
    setTerminalBodyHeight(presets.bodyHeight, { persist: false });
    clampTerminalPanelToViewport();
  }

  updateBottomPanelButtons();
  if (persist) persistTerminalLayout();
}

function updateBottomPanelButtons() {
  if (!bottomPanel) return;
  const collapsed = bottomPanel.classList.contains("is-collapsed");
  const isLarge = bottomPanel.classList.contains("is-large");

  if (bottomToggle) {
    const icon = qs("i", bottomToggle);
    if (icon) icon.className = collapsed ? "bi bi-chevron-up" : "bi bi-chevron-down";
    bottomToggle.setAttribute("aria-label", collapsed ? "Expand terminal" : "Collapse terminal");
    bottomToggle.setAttribute("data-tooltip", collapsed ? "Expand terminal" : "Collapse terminal");
  }

  if (bottomSizeToggle) {
    const icon = qs("i", bottomSizeToggle);
    if (icon) icon.className = isLarge ? "bi bi-arrows-angle-contract" : "bi bi-arrows-angle-expand";
    bottomSizeToggle.setAttribute("aria-label", isLarge ? "Switch to smaller terminal" : "Switch to larger terminal");
    bottomSizeToggle.setAttribute("data-tooltip", isLarge ? "Use smaller terminal" : "Use larger terminal");
  }

  if (bottomResizeHandle) {
    const canResize = !collapsed && window.innerWidth > 767;
    bottomResizeHandle.style.display = canResize ? "" : "none";
  }
}

function setBottomCollapsed(collapsed, { persist = true } = {}) {
  if (!bottomPanel) return;
  const next = Boolean(collapsed);
  bottomPanel.classList.toggle("is-collapsed", next);
  terminalLayout.collapsed = next;
  updateBottomPanelButtons();
  if (persist) persistTerminalLayout();
}

function initTerminalWindowControls() {
  if (!bottomPanel || !bottomHead) return;
  loadTerminalLayout();

  if (window.innerWidth > 767) {
    setBottomSize(terminalLayout.size, { persist: false });
    if (Number.isFinite(terminalLayout.width) && terminalLayout.width >= 280) {
      bottomPanel.style.width = `${Math.round(terminalLayout.width)}px`;
      terminalLayout.width = Math.round(terminalLayout.width);
    }
    setTerminalBodyHeight(terminalLayout.bodyHeight, { persist: false });
  }

  if (Number.isFinite(terminalLayout.left) && Number.isFinite(terminalLayout.top) && window.innerWidth > 767) {
    placeTerminalPanel(terminalLayout.left, terminalLayout.top);
    clampTerminalPanelToViewport();
  }
  setBottomCollapsed(false, { persist: false });
  updateBottomPanelButtons();

  let dragState = null;
  bottomHead.addEventListener("pointerdown", (e) => {
    if (window.innerWidth <= 767) return;
    if (e.button !== 0) return;
    if (e.target.closest("button, input, textarea, select, a, label")) return;
    anchorTerminalPanel();
    const rect = bottomPanel.getBoundingClientRect();
    dragState = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    bottomPanel.classList.add("is-dragging");
    bottomHead.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  bottomHead.addEventListener("pointermove", (e) => {
    if (!dragState || dragState.pointerId !== e.pointerId) return;
    const rect = bottomPanel.getBoundingClientRect();
    const limits = getTerminalViewportLimits();
    const maxLeft = Math.max(limits.minX, limits.maxX - rect.width);
    const maxTop = Math.max(limits.minY, limits.maxY - rect.height);
    const nextLeft = clamp(e.clientX - dragState.offsetX, limits.minX, maxLeft);
    const nextTop = clamp(e.clientY - dragState.offsetY, limits.minY, maxTop);
    placeTerminalPanel(nextLeft, nextTop);
  });
  const finishDrag = (e) => {
    if (!dragState || dragState.pointerId !== e.pointerId) return;
    dragState = null;
    bottomPanel.classList.remove("is-dragging");
    const rect = bottomPanel.getBoundingClientRect();
    terminalLayout.width = Math.round(rect.width);
    persistTerminalLayout();
  };
  bottomHead.addEventListener("pointerup", finishDrag);
  bottomHead.addEventListener("pointercancel", finishDrag);
  bottomHead.addEventListener("lostpointercapture", finishDrag);

  let resizeState = null;
  bottomResizeHandle?.addEventListener("pointerdown", (e) => {
    if (window.innerWidth <= 767) return;
    if (e.button !== 0) return;
    anchorTerminalPanel();
    resizeState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: bottomPanel.getBoundingClientRect().width,
      startBodyHeight: getTerminalBodyHeight(),
    };
    bottomPanel.classList.add("is-resizing");
    bottomResizeHandle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  bottomResizeHandle?.addEventListener("pointermove", (e) => {
    if (!resizeState || resizeState.pointerId !== e.pointerId) return;
    const limits = getTerminalViewportLimits();
    const currentRect = bottomPanel.getBoundingClientRect();
    const maxWidth = Math.max(360, limits.maxX - currentRect.left);
    const minWidth = 360;
    const nextWidth = clamp(resizeState.startWidth + (e.clientX - resizeState.startX), minWidth, maxWidth);
    bottomPanel.style.width = `${Math.round(nextWidth)}px`;
    terminalLayout.width = Math.round(nextWidth);
    const nextBodyHeight = resizeState.startBodyHeight + (e.clientY - resizeState.startY);
    setTerminalBodyHeight(nextBodyHeight, { persist: false });
    clampTerminalPanelToViewport();
  });
  const finishResize = (e) => {
    if (!resizeState || resizeState.pointerId !== e.pointerId) return;
    resizeState = null;
    bottomPanel.classList.remove("is-resizing");
    persistTerminalLayout();
  };
  bottomResizeHandle?.addEventListener("pointerup", finishResize);
  bottomResizeHandle?.addEventListener("pointercancel", finishResize);
  bottomResizeHandle?.addEventListener("lostpointercapture", finishResize);

  bottomSizeToggle?.addEventListener("click", () => {
    setBottomSize(bottomPanel.classList.contains("is-large") ? "small" : "large");
  });

  window.addEventListener("resize", () => {
    if (!bottomPanel) return;
    if (window.innerWidth <= 767) {
      bottomPanel.style.left = "";
      bottomPanel.style.top = "";
      bottomPanel.style.right = "";
      bottomPanel.style.bottom = "";
    } else {
      clampTerminalPanelToViewport();
    }
    updateBottomPanelButtons();
    persistTerminalLayout();
  });
}

function getPanBounds(zoom = state.zoom) {
  const rect = stage.getBoundingClientRect();
  const scaledWidth = CANVAS_WIDTH * zoom;
  const scaledHeight = CANVAS_HEIGHT * zoom;

  let minX = rect.width - scaledWidth;
  let maxX = 0;
  let minY = rect.height - scaledHeight;
  let maxY = 0;

  if (scaledWidth <= rect.width) {
    const centeredX = (rect.width - scaledWidth) / 2;
    minX = centeredX;
    maxX = centeredX;
  }
  if (scaledHeight <= rect.height) {
    const centeredY = (rect.height - scaledHeight) / 2;
    minY = centeredY;
    maxY = centeredY;
  }

  return { minX, maxX, minY, maxY };
}

function clampPanToBounds() {
  const bounds = getPanBounds();
  state.panX = clamp(state.panX, bounds.minX, bounds.maxX);
  state.panY = clamp(state.panY, bounds.minY, bounds.maxY);
}

function toWorldPoint(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  return {
    x: (clientX - rect.left - state.panX) / state.zoom,
    y: (clientY - rect.top - state.panY) / state.zoom,
  };
}

function toScreenPoint(worldX, worldY) {
  return {
    x: state.panX + worldX * state.zoom,
    y: state.panY + worldY * state.zoom,
  };
}

function applyCanvasWorldSize() {
  const width = `${CANVAS_WIDTH}px`;
  const height = `${CANVAS_HEIGHT}px`;
  deviceLayer.style.width = width;
  deviceLayer.style.height = height;
  connectionLayer.style.width = width;
  connectionLayer.style.height = height;
  connectionLayer.setAttribute("width", String(CANVAS_WIDTH));
  connectionLayer.setAttribute("height", String(CANVAS_HEIGHT));
  connectionLayer.setAttribute("viewBox", `0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`);
}

function resetViewport() {
  const rect = stage.getBoundingClientRect();
  state.zoom = 1;
  state.panX = (rect.width - CANVAS_WIDTH) / 2;
  state.panY = (rect.height - CANVAS_HEIGHT) / 2;
  clampPanToBounds();
}

function setZoom(nextZoom, anchorClientX = null, anchorClientY = null) {
  const clampedZoom = clamp(nextZoom, 0.4, 2.5);
  if (clampedZoom === state.zoom) return;

  if (Number.isFinite(anchorClientX) && Number.isFinite(anchorClientY)) {
    const rect = stage.getBoundingClientRect();
    const localX = anchorClientX - rect.left;
    const localY = anchorClientY - rect.top;
    const worldX = (localX - state.panX) / state.zoom;
    const worldY = (localY - state.panY) / state.zoom;
    state.zoom = clampedZoom;
    state.panX = localX - worldX * state.zoom;
    state.panY = localY - worldY * state.zoom;
  } else {
    state.zoom = clampedZoom;
  }

  clampPanToBounds();
  updateZoomLabel();
  renderConnections();
  renderConnectionLabels();
}

function setTip(text) {
  if (tipsEl) tipsEl.textContent = text;
}

function showToast({ title, message, variant = "info", timeout = 3200 }) {
  if (window.NetologyToast?.showSandboxToast) {
    window.NetologyToast.showSandboxToast({
      title: title || "Update",
      message: message || "",
      variant,
      timeout
    });
    return;
  }

  if (window.NetologyToast?.showMessageToast) {
    window.NetologyToast.showMessageToast(message || title || "Update", variant || "info", timeout || 3200);
  }
}

function setText(id, text) {
  const el = getById(id);
  if (el) el.textContent = String(text ?? "");
}
