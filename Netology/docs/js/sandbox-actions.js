/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: sandbox-actions.js
Purpose: Handles canvas actions, undo/redo, save/load,
and most sandbox event binding.
---------------------------------------------------------
*/

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

// Use one setup path whenever we replace the whole topology.
function replaceTopology(devices, connections) {
  state.devices = (devices || []).map(normalizeDevice);
  state.connections = (connections || []).map(normalizeConnection).filter(Boolean);
  applyAutoNetworkDefaults();
  state.selectedIds = [];
  state.connectFrom = null;
  rebuildMacTables();
}

function finishTopologyChange({ refreshTutorial = true } = {}) {
  rebuildMacTables();
  pushHistory();
  renderAll();
  if (refreshTutorial) notifyTutorialProgress();
  markDirtyAndSaveSoon();
}

function restoreHistory(index) {
  const snap = state.history[index];
  if (!snap) return;
  replaceTopology(snap.devices, snap.connections);
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

// ----------------------------------------
// Device and connection actions
// ----------------------------------------
function addDevice(type, position = null) {
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
    x: clamp(pos.x, 10, CANVAS_WIDTH - DEVICE_SIZE - 10),
    y: clamp(pos.y, 10, CANVAS_HEIGHT - DEVICE_SIZE - 10),
    name: `${DEVICE_TYPES[type]?.label || "Device"} ${count}`,
    status: "on",
  });

  state.devices.push(device);
  applyAutoNetworkDefaults();
  state.selectedIds = [device.id];
  state.deviceAnimations.add(device.id);
  addActionLog(`Added ${device.name}`);
  // Adding a device counts as activity and can trigger the next suggestions.
  hideIdleBanner();
  showConnectionSuggestions(device);
  finishTopologyChange();
}

function deleteDevices(ids) {
  if (!ids || !ids.length) return;
  const removed = state.devices.filter((d) => ids.includes(d.id));
  state.devices = state.devices.filter((d) => !ids.includes(d.id));
  state.connections = state.connections.filter((c) => !ids.includes(c.from) && !ids.includes(c.to));
  applyAutoNetworkDefaults();
  state.selectedIds = [];
  removed.forEach((d) => addActionLog(`Removed ${d.name}`));
  finishTopologyChange();
}

function createConnection(fromId, toId) {
  if (fromId === toId) return;
  const exists = state.connections.some(
    (c) => (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
  );
  if (exists) return;

  // Dismiss suggestions and idle banner when a connection is made
  dismissSuggestions();
  hideIdleBanner();

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
  addActionLog(`Connected ${fromDevice?.name || "device"} to ${toDevice?.name || "device"}`);
  finishTopologyChange();
}

function deleteConnection(connId) {
  const conn = state.connections.find((c) => c.id === connId);
  if (!conn) return;

  clearInterfaceLink(conn.from, conn.fromInterface);
  clearInterfaceLink(conn.to, conn.toInterface);

  state.connections = state.connections.filter((c) => c.id !== connId);
  addActionLog("Removed connection");
  finishTopologyChange();
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
    const saveTopoPath = ENDPOINTS.sandbox?.saveTopology || "/save-topology";
    const res = await fetch(`${API_BASE}${saveTopoPath}`, {
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
  addActionLog("Cleared topology");
  finishTopologyChange();

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

  const data = await apiGet(ENDPOINTS.sandbox?.loadTopologies || "/load-topologies", { email: user.email });

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
  const loadPathTemplate = ENDPOINTS.sandbox?.loadTopology || "/load-topology/:topologyId";
  const loadPath = loadPathTemplate.replace(":topologyId", encodeURIComponent(id));
  const data = await apiGet(loadPath);

  if (!data.success) {
    showToast({
      variant: "error",
      title: "Load failed",
      message: "Could not load this topology.",
    });
    return;
  }

  replaceTopology(data.devices || [], data.connections || []);
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
  const deletePathTemplate = ENDPOINTS.sandbox?.deleteTopology || "/delete-topology/:topologyId";
  const deletePath = deletePathTemplate.replace(":topologyId", encodeURIComponent(id));
  await fetch(`${API_BASE}${deletePath}`, {
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
            const worldPoint = toWorldPoint(ev.clientX, ev.clientY);
            const x = worldPoint.x - DEVICE_RADIUS;
            const y = worldPoint.y - DEVICE_RADIUS;
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
  const toolButtons = qsa("[data-tool]");
  const connTypeButtons = qsa("[data-conn-type]");
  const toggleGridBtn = getById("toggleGridBtn");
  const toggleSnapBtn = getById("toggleSnapBtn");
  const zoomInBtn = getById("zoomInBtn");
  const zoomOutBtn = getById("zoomOutBtn");
  const undoBtn = getById("undoBtn");
  const redoBtn = getById("redoBtn");
  const saveBtn = getById("saveBtn");
  const loadBtn = getById("loadBtn");
  const clearBtn = getById("clearBtn");
  const pingBtn = getById("pingBtn");
  const pingTargetSelect = getById("pingTargetSelect");
  const runPingBtn = getById("runPingBtn");

  function setActiveButtons(buttons, attrName, activeValue) {
    buttons.forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute(attrName) === activeValue);
    });
  }

  function setTool(tool) {
    state.tool = tool;
    state.connectFrom = null;
    setActiveButtons(toolButtons, "data-tool", tool);
    setTip(tool === TOOL.CONNECT ? "Select a device to start a connection." : "Select and drag devices.");
    updateConnGroupVisibility();
  }

  function setConnectionType(type) {
    state.connectType = type;
    setActiveButtons(connTypeButtons, "data-conn-type", type);
  }

  function zoomStage(delta) {
    const rect = stage.getBoundingClientRect();
    setZoom(state.zoom + delta, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function moveHistory(direction) {
    const nextIndex = state.historyIndex + direction;
    if (nextIndex < 0 || nextIndex >= state.history.length) return;
    state.historyIndex = nextIndex;
    restoreHistory(nextIndex);
  }

  function updatePingPreview(sourceDevice, targetDevice) {
    updatePingOverview({
      fromDevice: sourceDevice,
      toDevice: targetDevice,
      path: targetDevice ? findPath(sourceDevice.id, targetDevice.id) : [],
    }, null);
  }

  function fillPingTargets(sourceDevice) {
    if (!pingTargetSelect) return [];

    const targets = state.devices.filter((device) => device.id !== sourceDevice.id);
    clearChildren(pingTargetSelect);

    targets.forEach((device) => {
      const option = document.createElement("option");
      const ip = String(device.config?.ipAddress || "").trim();
      option.value = device.id;
      option.textContent = ip ? `${device.name} (${ip})` : `${device.name} (No IP)`;
      pingTargetSelect.appendChild(option);
    });

    if (runPingBtn) runPingBtn.disabled = !targets.length;
    return targets;
  }

  function updatePingResultBox(hasTargets) {
    const resultBox = getById("pingResult");
    if (!resultBox) return;

    if (hasTargets) {
      resultBox.className = "sbx-ping-result";
      resultBox.textContent = "Ready to run a ping.";
      return;
    }

    resultBox.className = "sbx-ping-result is-fail";
    resultBox.textContent = "No target device available. Add another device first.";
  }

  function openPingModal() {
    const selected = getSelectedDevice();
    if (!selected || !pingTargetSelect) return;

    const targets = fillPingTargets(selected);
    const defaultTarget = targets[0] || null;
    updatePingPreview(selected, defaultTarget);
    updatePingResultBox(targets.length > 0);

    pingTargetSelect.onchange = () => {
      const targetId = pingTargetSelect.value;
      const target = targetId ? findDevice(targetId) : null;
      updatePingPreview(selected, target);
    };

    const modal = new bootstrap.Modal(getById("pingModal"));
    modal.show();
  }

  toolButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setTool(button.getAttribute("data-tool"));
    });
  });

  connTypeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setConnectionType(button.getAttribute("data-conn-type"));
    });
  });

  toggleGridBtn?.addEventListener("click", () => {
    state.showGrid = !state.showGrid;
    toggleGridBtn.classList.toggle("is-active", state.showGrid);
    updateGrid();
  });

  toggleSnapBtn?.addEventListener("click", () => {
    state.snap = !state.snap;
    toggleSnapBtn.classList.toggle("is-active", state.snap);
  });

  zoomInBtn?.addEventListener("click", () => zoomStage(0.1));
  zoomOutBtn?.addEventListener("click", () => zoomStage(-0.1));
  undoBtn?.addEventListener("click", () => moveHistory(-1));
  redoBtn?.addEventListener("click", () => moveHistory(1));

  saveBtn?.addEventListener("click", handleSaveTopology);
  saveConfirmBtn?.addEventListener("click", confirmSaveTopology);
  loadBtn?.addEventListener("click", async () => {
    await refreshTopologyList();
    const modal = new bootstrap.Modal(getById("topologyModal"));
    modal.show();
  });
  clearBtn?.addEventListener("click", openClearModal);
  clearConfirmBtn?.addEventListener("click", confirmClearTopology);
  pingBtn?.addEventListener("click", openPingModal);
  runPingBtn?.addEventListener("click", () => {
    const selected = getSelectedDevice();
    if (!selected) return;
    const targetId = pingTargetSelect?.value;
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
    setBottomCollapsed(!bottomPanel.classList.contains("is-collapsed"));
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

  getById("sbxConfigBackBtn")?.addEventListener("click", () => {
    hideConfigTab();
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

  function submitConsoleCommand() {
    const value = consoleInputEl.value.trim();
    if (!value) return;
    addCommandToHistory(value);
    executeCommand(value);
    consoleInputEl.value = "";
  }

  consoleSendBtn?.addEventListener("click", submitConsoleCommand);

  consoleInputEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      submitConsoleCommand();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      consoleInputEl.value = stepCommandHistory(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      consoleInputEl.value = stepCommandHistory(1);
      return;
    }
  });

  updatePanelButtons();
}

function bindStage() {
  function handleDeviceAction(action, deviceId) {
    if (action === "config") {
      state.selectedIds = [deviceId];
      showConfigTab();
      renderAll();
      return;
    }

    if (action === "copy") {
      state.selectedIds = [deviceId];
      duplicateSelected();
      return;
    }

    if (action === "delete") {
      deleteDevices([deviceId]);
    }
  }

  function handleDeviceActionClick(e) {
    const actionBtn = e.target.closest(".sbx-device-action");
    if (!actionBtn) return;
    e.stopPropagation();

    const action = actionBtn.dataset.action;
    const deviceId = actionBtn.dataset.deviceId;
    if (!action || !deviceId) return;

    handleDeviceAction(action, deviceId);
  }

  function clearCanvasSelection() {
    if (state.tool !== TOOL.SELECT) return;
    state.selectedIds = [];
    renderAll();
  }

  function handleStageClick(e) {
    const deleteGroup = e.target.closest(".sbx-conn-delete-group");
    if (deleteGroup?.dataset?.connId) {
      deleteConnection(deleteGroup.dataset.connId);
      return;
    }

    if (e.target === stage || e.target === deviceLayer || e.target === connectionLayer) {
      clearCanvasSelection();
    }
  }

  function beginConnection(id) {
    state.connectFrom = id;
    state.selectedIds = [id];
    renderDevices();
    setTip("Select another device to complete the connection.");
  }

  function completeConnection(id) {
    createConnection(state.connectFrom, id);
    state.connectFrom = null;
    setTip("Devices connected.");
  }

  function startDeviceDrag(device, id, e) {
    state.selectedIds = [id];
    renderDevices();
    renderProps();
    updatePingVisibility();

    // renderDevices() rebuilt the device nodes, so fetch the new one.
    const freshEl = deviceLayer.querySelector(`[data-id="${id}"]`);
    if (!freshEl) return;

    const pointer = toWorldPoint(e.clientX, e.clientY);
    state.dragging = {
      id,
      offsetX: pointer.x - device.x,
      offsetY: pointer.y - device.y,
      el: freshEl,
    };

    freshEl.setPointerCapture(e.pointerId);
    freshEl.classList.add("is-dragging");
    connectionLayer.querySelectorAll(".sbx-conn-delete-group").forEach((group) => group.remove());
  }

  function handleDevicePointerDown(e) {
    if (e.target.closest(".sbx-device-action")) return;
    if (e.button !== 0) return;

    const deviceEl = e.target.closest(".sbx-device");
    if (!deviceEl?.dataset.id) return;

    const id = deviceEl.dataset.id;
    const device = findDevice(id);
    if (!device) return;

    if (state.tool === TOOL.CONNECT) {
      if (!state.connectFrom) {
        beginConnection(id);
        return;
      }

      if (state.connectFrom !== id) {
        completeConnection(id);
      }
      return;
    }

    if (state.tool === TOOL.SELECT) {
      startDeviceDrag(device, id, e);
    }
  }

  function moveDraggedDevice(e) {
    if (!state.dragging) return;

    const pointer = toWorldPoint(e.clientX, e.clientY);
    const device = findDevice(state.dragging.id);
    if (!device) return;

    device.x = clamp(pointer.x - state.dragging.offsetX, 0, CANVAS_WIDTH - DEVICE_SIZE);
    device.y = clamp(pointer.y - state.dragging.offsetY, 0, CANVAS_HEIGHT - DEVICE_SIZE);
    state.dragging.el.style.left = `${device.x}px`;
    state.dragging.el.style.top = `${device.y}px`;
    updateConnectionPaths();
  }

  function endPointerInteraction() {
    if (!state.dragging) return;

    state.dragging.el.classList.remove("is-dragging");
    const device = findDevice(state.dragging.id);
    if (device && state.snap) {
      device.x = Math.round(device.x / GRID_SIZE) * GRID_SIZE;
      device.y = Math.round(device.y / GRID_SIZE) * GRID_SIZE;
    }

    state.dragging = null;
    finishTopologyChange({ refreshTutorial: false });
  }

  deviceLayer.addEventListener("click", handleDeviceActionClick);
  stage.addEventListener("click", handleStageClick);
  deviceLayer.addEventListener("pointerdown", handleDevicePointerDown);
  window.addEventListener("pointermove", moveDraggedDevice);
  window.addEventListener("pointerup", endPointerInteraction);
  window.addEventListener("pointercancel", endPointerInteraction);
  window.addEventListener("resize", () => {
    clampPanToBounds();
    updateZoomLabel();
    renderConnections();
    renderConnectionLabels();
  });
}
