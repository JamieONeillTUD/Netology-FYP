/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: sandbox-extras.js
Purpose: Keeps optional sandbox UI features such as
custom tooltips, minimap, auto-layout, and other
quality-of-life extras that sit on top of the core sandbox.
---------------------------------------------------------
*/

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

// ----------------------------------------
// NEW FEATURES
// ----------------------------------------

// --- Keyboard Shortcuts ---
function bindKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    const tag = e.target.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;

    // Delete selected devices
    if ((e.key === "Delete" || e.key === "Backspace") && state.selectedIds.length) {
      e.preventDefault();
      deleteDevices([...state.selectedIds]);
      return;
    }
    // Ctrl+Z - Undo
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      if (state.historyIndex > 0) { state.historyIndex--; restoreHistory(state.historyIndex); }
      return;
    }
    // Ctrl+Y or Ctrl+Shift+Z - Redo
    if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      if (state.historyIndex < state.history.length - 1) { state.historyIndex++; restoreHistory(state.historyIndex); }
      return;
    }
    // Ctrl+S - Save
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSaveTopology();
      return;
    }
    // Ctrl+D or Ctrl+C - Duplicate/copy selected device
    if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "c") && state.selectedIds.length) {
      e.preventDefault();
      duplicateSelected();
      return;
    }
    // V - Select tool
    if (e.key === "v" || e.key === "V") {
      state.tool = TOOL.SELECT;
      qsa("[data-tool]").forEach((b) => b.classList.remove("is-active"));
      getById("toolSelectBtn")?.classList.add("is-active");
      state.connectFrom = null;
      setTip("Select and drag devices.");
      updateConnGroupVisibility();
      return;
    }
    // C - Connect tool
    if (e.key === "c" || e.key === "C") {
      state.tool = TOOL.CONNECT;
      qsa("[data-tool]").forEach((b) => b.classList.remove("is-active"));
      getById("toolConnectBtn")?.classList.add("is-active");
      setTip("Select a device to start a connection.");
      updateConnGroupVisibility();
      return;
    }
    // Escape - Deselect
    if (e.key === "Escape") {
      state.selectedIds = [];
      state.connectFrom = null;
      renderAll();
      return;
    }
  });

}

// --- Duplicate Selected Device ---
function duplicateSelected() {
  if (!state.selectedIds.length) return;
  const device = findDevice(state.selectedIds[0]);
  if (!device) return;
  const offset = 40;
  addDevice(device.type, { x: device.x + offset, y: device.y + offset });
  addActionLog(`Duplicated ${device.name}`);
}

// --- Device Count Badges ---
function updateDeviceCountBadges() {
  const counts = {};
  state.devices.forEach((d) => { counts[d.type] = (counts[d.type] || 0) + 1; });
  qsa("[data-count-for]").forEach((badge) => {
    const type = badge.getAttribute("data-count-for");
    const count = counts[type] || 0;
    badge.textContent = count;
    badge.classList.toggle("is-visible", count > 0);
  });
}

// --- Quick Stats Bar ---
function updateStatsBar() {
  const devEl = getById("sbxStatDevices");
  const connEl = getById("sbxStatConns");
  const selEl = getById("sbxStatSelected");
  const selNameEl = getById("sbxStatSelectedName");
  if (devEl) devEl.textContent = state.devices.length;
  if (connEl) connEl.textContent = state.connections.length;
  if (selEl && selNameEl) {
    const sel = getSelectedDevice();
    if (sel) {
      selEl.style.display = "";
      selNameEl.textContent = sel.name;
    } else {
      selEl.style.display = "none";
    }
  }
}

// --- Device Status Indicators ---
function updateDeviceStatusIndicators() {
  qsa(".sbx-device-status").forEach((dot) => {
    const deviceEl = dot.closest(".sbx-device");
    if (!deviceEl) return;
    const deviceId = deviceEl.getAttribute("data-id");
    const device = findDevice(deviceId);
    if (!device) return;
    const hasIp = device.config && device.config.ipAddress;
    dot.className = "sbx-device-status " + (hasIp ? "is-configured" : "is-unconfigured");
  });
}

// --- Mouse Wheel Zoom ---
function bindMouseWheelZoom() {
  stageEl.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(state.zoom + delta, e.clientX, e.clientY);
      return;
    }
    state.panX -= e.deltaX;
    state.panY -= e.deltaY;
    clampPanToBounds();
    updateZoomLabel();
    renderConnectionLabels();
  }, { passive: false });
}

// --- Right-Click Context Menu ---
let contextMenuEl = null;
function ensureContextMenu() {
  if (contextMenuEl) return contextMenuEl;
  contextMenuEl = document.createElement("div");
  contextMenuEl.className = "sbx-context-menu";
  contextMenuEl.innerHTML = `
    <button class="sbx-context-item" data-action="rename"><i class="bi bi-pencil"></i> Rename<span class="sbx-context-shortcut">F2</span></button>
    <button class="sbx-context-item" data-action="duplicate"><i class="bi bi-copy"></i> Duplicate<span class="sbx-context-shortcut">Ctrl+D</span></button>
    <button class="sbx-context-item" data-action="ping"><i class="bi bi-broadcast-pin"></i> Ping from here</button>
    <button class="sbx-context-item" data-action="interfaces"><i class="bi bi-ethernet"></i> Show interfaces</button>
    <div class="sbx-context-sep"></div>
    <button class="sbx-context-item is-danger" data-action="delete"><i class="bi bi-trash3"></i> Delete<span class="sbx-context-shortcut">Del</span></button>
  `;
  document.body.appendChild(contextMenuEl);
  contextMenuEl.addEventListener("click", (e) => {
    const item = e.target.closest("[data-action]");
    if (!item) return;
    const action = item.getAttribute("data-action");
    const deviceId = contextMenuEl.dataset.deviceId;
    hideContextMenu();
    if (!deviceId) return;
    switch (action) {
      case "rename": {
        const dev = findDevice(deviceId);
        if (!dev) return;
        const newName = prompt("Rename device:", dev.name);
        if (newName && newName.trim()) {
          dev.name = newName.trim();
          pushHistory(); renderAll();
          addActionLog(`Renamed to ${dev.name}`);
        }
        break;
      }
      case "duplicate": {
        state.selectedIds = [deviceId];
        duplicateSelected();
        break;
      }
      case "ping": {
        state.selectedIds = [deviceId];
        getById("pingBtn")?.click();
        break;
      }
      case "interfaces": {
        state.selectedIds = [deviceId];
        state.configTab = "interfaces";
        showConfigTab();
        renderAll();
        qsa(".sbx-subtab", getById("sbxConfigTabs")).forEach((s) => s.classList.remove("is-active"));
        const intTab = qs('.sbx-subtab[data-subtab="interfaces"]', getById("sbxConfigTabs"));
        if (intTab) intTab.classList.add("is-active");
        break;
      }
      case "delete": {
        deleteDevices([deviceId]);
        break;
      }
    }
  });
  return contextMenuEl;
}

function showContextMenu(x, y, deviceId) {
  const menu = ensureContextMenu();
  menu.dataset.deviceId = deviceId;
  menu.classList.add("is-visible");
  menu.style.left = `${Math.min(x, window.innerWidth - 200)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - 240)}px`;
}

function hideContextMenu() {
  if (contextMenuEl) contextMenuEl.classList.remove("is-visible");
}

function bindContextMenu() {
  document.addEventListener("click", (e) => {
    if (contextMenuEl && !contextMenuEl.contains(e.target)) hideContextMenu();
  });
  document.addEventListener("contextmenu", (e) => {
    if (contextMenuEl) hideContextMenu();
  });
}

// --- Auto-Layout ---
function autoLayout() {
  if (!state.devices.length) return;
  const padding = 60;
  const cols = Math.ceil(Math.sqrt(state.devices.length));
  const cellW = Math.floor((CANVAS_WIDTH - padding * 2) / cols);
  const cellH = Math.floor(cellW * 0.9);

  state.devices.forEach((d, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    d.x = padding + col * cellW + (cellW - DEVICE_SIZE) / 2;
    d.y = padding + 40 + row * cellH + (cellH - DEVICE_SIZE) / 2;
    if (state.snap) {
      d.x = Math.round(d.x / GRID_SIZE) * GRID_SIZE;
      d.y = Math.round(d.y / GRID_SIZE) * GRID_SIZE;
    }
  });

  pushHistory();
  renderAll();
  addActionLog("Auto-layout applied");
  showToast({ title: "Auto-layout", message: "Devices arranged in a grid", variant: "success", timeout: 3500 });
}

// --- Minimap ---
let minimapVisible = false;
function toggleMinimap() {
  minimapVisible = !minimapVisible;
  const el = getById("sbxMinimap");
  if (el) el.classList.toggle("is-visible", minimapVisible);
  getById("minimapToggleBtn")?.classList.toggle("is-active", minimapVisible);
  if (minimapVisible) updateMinimap();
}

function updateMinimap() {
  if (!minimapVisible) return;
  const svg = getById("sbxMinimapSvg");
  if (!svg) return;
  const scaleX = 160 / CANVAS_WIDTH;
  const scaleY = 100 / CANVAS_HEIGHT;
  const scale = Math.min(scaleX, scaleY);

  let html = "";
  state.connections.forEach((c) => {
    const from = findDevice(c.from);
    const to = findDevice(c.to);
    if (from && to) {
      const x1 = (from.x + DEVICE_RADIUS) * scale;
      const y1 = (from.y + DEVICE_RADIUS) * scale;
      const x2 = (to.x + DEVICE_RADIUS) * scale;
      const y2 = (to.y + DEVICE_RADIUS) * scale;
      html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1"/>`;
    }
  });
  state.devices.forEach((d) => {
    const cx = (d.x + DEVICE_RADIUS) * scale;
    const cy = (d.y + DEVICE_RADIUS) * scale;
    const selected = state.selectedIds.includes(d.id);
    html += `<circle cx="${cx}" cy="${cy}" r="3" fill="${selected ? '#0d9488' : '#64748b'}"/>`;
  });
  svg.innerHTML = html;
}

// --- Multi-Select (Shift+Click) ---
// This is handled in the existing stage click handler. We patch it after bindStage.
function patchMultiSelect() {
  // The existing pointerdown on .sbx-device in bindStage sets selectedIds = [id].
  // We override by adding a capturing listener that detects shift.
  deviceLayer.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".sbx-device-action")) return;
    const deviceEl = e.target.closest(".sbx-device");
    if (!deviceEl || !e.shiftKey) return;
    e.stopPropagation();
    const id = deviceEl.getAttribute("data-id");
    if (!id) return;
    if (state.selectedIds.includes(id)) {
      state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
    } else {
      state.selectedIds.push(id);
    }
    renderAll();
  }, true); // capturing phase
}

// --- Device Search/Filter ---
function bindDeviceFilter() {
  const input = getById("sbxDeviceFilter");
  if (!input) return;
  input.addEventListener("input", () => {
    const query = input.value.toLowerCase().trim();
    qsa(".sbx-device-card").forEach((card) => {
      const label = card.querySelector(".sbx-device-label")?.textContent.toLowerCase() || "";
      const type = card.getAttribute("data-device") || "";
      const match = !query || label.includes(query) || type.includes(query);
      card.style.display = match ? "" : "none";
    });
  });
}

// --- Traceroute Console Command ---
// Added inside executeCommand switch

// --- Connection Bandwidth Indicator ---
const BANDWIDTH_MAP = {
  ethernet: "100 Mbps",
  fiber: "1 Gbps",
  serial: "1.5 Mbps",
  wireless: "54 Mbps",
  console: "9600 bps",
};

// --- Connection Labels on Canvas ---
function renderConnectionLabels() {
  // Remove old labels
  qsa(".sbx-conn-label", stageEl).forEach((el) => el.remove());
  const rect = stage.getBoundingClientRect();
  state.connections.forEach((c) => {
    const from = findDevice(c.from);
    const to = findDevice(c.to);
    if (!from || !to) return;
    const mx = ((from.x + DEVICE_RADIUS) + (to.x + DEVICE_RADIUS)) / 2;
    const my = ((from.y + DEVICE_RADIUS) + (to.y + DEVICE_RADIUS)) / 2;
    const point = toScreenPoint(mx, my - 12);
    if (point.x < -60 || point.y < -40 || point.x > rect.width + 60 || point.y > rect.height + 60) return;
    const label = document.createElement("div");
    label.className = "sbx-conn-label";
    label.textContent = (c.type || "ethernet").toUpperCase().slice(0, 3);
    label.title = `${CONNECTION_TYPES[c.type]?.label || c.type} – ${BANDWIDTH_MAP[c.type] || ""}`;
    label.style.left = `${point.x}px`;
    label.style.top = `${point.y}px`;
    stageEl.appendChild(label);
  });
}

// renderAllEnhanced simply calls renderAll (enhanced features are already integrated)
function renderAllEnhanced() {
  renderAll();
}

// --- Patch right-click on devices in stage ---
function bindDeviceContextMenu() {
  deviceLayer.addEventListener("contextmenu", (e) => {
    const deviceEl = e.target.closest(".sbx-device");
    if (!deviceEl) return;
    e.preventDefault();
    const id = deviceEl.getAttribute("data-id");
    if (!id) return;
    state.selectedIds = [id];
    renderAll();
    showContextMenu(e.clientX, e.clientY, id);
  });
}

// --- Auto-layout and Minimap toolbar binding ---
function bindNewToolbarButtons() {
  getById("autoLayoutBtn")?.addEventListener("click", autoLayout);
  getById("minimapToggleBtn")?.addEventListener("click", toggleMinimap);
}
