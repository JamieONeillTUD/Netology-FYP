/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: sandbox-render.js
Purpose: Renders the sandbox canvas, side panels,
console area, inspector, and save preview UI.
---------------------------------------------------------
*/

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
  deviceLayer.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  deviceLayer.style.transformOrigin = "0 0";
  connectionLayer.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  connectionLayer.style.transformOrigin = "0 0";
  if (state.showGrid) {
    stage.style.backgroundSize = `${GRID_SIZE * state.zoom}px ${GRID_SIZE * state.zoom}px`;
    stage.style.backgroundPosition = `${state.panX}px ${state.panY}px`;
  }
}

function updateGrid() {
  stage.classList.toggle("is-grid", state.showGrid);
  if (state.showGrid) {
    stage.style.backgroundSize = `${GRID_SIZE * state.zoom}px ${GRID_SIZE * state.zoom}px`;
    stage.style.backgroundPosition = `${state.panX}px ${state.panY}px`;
  } else {
    stage.style.backgroundPosition = "";
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

    // Device status indicator dot
    const statusDot = document.createElement("div");
    statusDot.className = "sbx-device-status " + (device.config?.ipAddress ? "is-configured" : "is-unconfigured");
    el.appendChild(statusDot);

    // Action buttons (settings, copy, delete)
    const actions = document.createElement("div");
    actions.className = "sbx-device-actions";

    const btnCfg = document.createElement("button");
    btnCfg.className = "sbx-device-action sbx-device-action--config";
    btnCfg.innerHTML = '<i class="bi bi-gear-fill"></i>';
    btnCfg.title = "Configure device";
    btnCfg.dataset.action = "config";
    btnCfg.dataset.deviceId = device.id;
    actions.appendChild(btnCfg);

    const btnCopy = document.createElement("button");
    btnCopy.className = "sbx-device-action sbx-device-action--copy";
    btnCopy.innerHTML = '<i class="bi bi-copy"></i>';
    btnCopy.title = "Duplicate device (Ctrl+C)";
    btnCopy.dataset.action = "copy";
    btnCopy.dataset.deviceId = device.id;
    actions.appendChild(btnCopy);

    const btnDel = document.createElement("button");
    btnDel.className = "sbx-device-action sbx-device-action--delete";
    btnDel.innerHTML = '<i class="bi bi-trash3-fill"></i>';
    btnDel.title = "Delete device (Del)";
    btnDel.dataset.action = "delete";
    btnDel.dataset.deviceId = device.id;
    actions.appendChild(btnDel);

    el.appendChild(actions);

    deviceLayer.appendChild(el);
  });
}

function resizeConnections() {
  connectionLayer.setAttribute("width", String(CANVAS_WIDTH));
  connectionLayer.setAttribute("height", String(CANVAS_HEIGHT));
  connectionLayer.setAttribute("viewBox", `0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`);
}

// Lightweight: update only existing SVG path positions (used during drag)
function updateConnectionPaths() {
  const paths = connectionLayer.querySelectorAll("path");
  state.connections.forEach((conn, i) => {
    const from = findDevice(conn.from);
    const to = findDevice(conn.to);
    if (!from || !to || !paths[i]) return;
    const x1 = from.x + DEVICE_RADIUS, y1 = from.y + DEVICE_RADIUS;
    const x2 = to.x + DEVICE_RADIUS, y2 = to.y + DEVICE_RADIUS;
    paths[i].setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
  });
}

function renderConnections() {
  resizeConnections();
  clearChildren(connectionLayer);
  const isDragging = !!state.dragging;

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

    // Skip delete controls while dragging — keeps the visual clean
    if (isDragging) return;

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    // Delete group — invisible hit-area circle prevents hover flicker
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("sbx-conn-delete-group");
    g.dataset.connId = conn.id;
    // Tooltip: "Delete connection between X and X"
    const tip = document.createElementNS("http://www.w3.org/2000/svg", "title");
    tip.textContent = `Delete connection between ${from.name || "device"} and ${to.name || "device"}`;
    g.appendChild(tip);
    // Invisible larger hit area (no flicker)
    const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    hitArea.setAttribute("cx", midX);
    hitArea.setAttribute("cy", midY);
    hitArea.setAttribute("r", 18);
    hitArea.setAttribute("fill", "transparent");
    hitArea.setAttribute("stroke", "none");
    g.appendChild(hitArea);
    // Visible delete circle
    const del = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    del.classList.add("sbx-conn-delete");
    del.setAttribute("cx", midX);
    del.setAttribute("cy", midY);
    del.setAttribute("r", 10);
    g.appendChild(del);
    // "x" label
    const delLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    delLabel.setAttribute("x", midX);
    delLabel.setAttribute("y", midY + 4);
    delLabel.setAttribute("text-anchor", "middle");
    delLabel.setAttribute("font-size", "12");
    delLabel.setAttribute("font-weight", "700");
    delLabel.setAttribute("fill", "rgba(239,68,68,.8)");
    delLabel.setAttribute("pointer-events", "none");
    delLabel.textContent = "\u00d7";
    g.appendChild(delLabel);
    connectionLayer.appendChild(g);
  });
}

function renderInspectActions() {
  const actionsEl = getById("sbxInspectActions");
  if (!actionsEl) return;
  const dev = getSelectedDevice();
  actionsEl.style.display = dev ? "" : "none";
}

function renderInspector() {
  renderInspectActions();
  if (!inspectorBody) return;
  if (!state.pingInspector) {
    clearChildren(inspectorBody);
    const guide = makeEl("div", "sbx-inspector-guide");
    guide.append(
      makeEl("div", "sbx-inspector-guide-title", "How ping testing works"),
      makeEl("div", "sbx-inspector-guide-line", "1. Select one source device on the canvas."),
      makeEl("div", "sbx-inspector-guide-line", "2. Click Ping in Quick Actions and choose a destination."),
      makeEl("div", "sbx-inspector-guide-line", "3. You can also use terminal commands with device names or IPs."),
      makeEl("div", "sbx-inspector-guide-line", "Examples: ping pc router  |  ping 192.168.1.10")
    );
    inspectorBody.appendChild(guide);
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
  // Update tutorial carousel visibility (free mode) and objectives banner
  renderTutorialCarousel();
  updateObjectivesBanner();
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

      // Only render a button for manual steps — auto-detected steps advance automatically
      if (evaluation.manual) {
        const actionRow = makeEl("div", "sbx-tutorial-actions");
        const primaryBtn = makeEl("button", "btn btn-teal btn-sm", "Mark step complete");
        primaryBtn.addEventListener("click", () => {
          completeTutorialStep(meta, steps, currentIndex);
          updateTutorialGuidance();
        });
        actionRow.appendChild(primaryBtn);
        currentCard.appendChild(actionRow);
      }
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

function renderObjects() {
  const body = getById("sbxObjectsBody");
  if (!body) return;
  clearChildren(body);

  if (!state.devices.length) {
    body.textContent = "No devices on canvas yet.";
    return;
  }

  const list = makeEl("div", "sbx-objects-list");

  state.devices.forEach((device) => {
    const meta = DEVICE_TYPES[device.type] || DEVICE_TYPES.pc;
    const isSelected = state.selectedIds.includes(device.id);

    const row = makeEl("div", "sbx-object-row" + (isSelected ? " is-selected" : ""));
    row.dataset.deviceId = device.id;

    const icon = makeEl("i", `bi ${meta.icon} sbx-object-icon`);
    const info = makeEl("div", "sbx-object-info");
    const nameEl = makeEl("div", "sbx-object-name", device.name || meta.label);
    const sub = makeEl("div", "sbx-object-sub", device.config?.ipAddress || "No IP assigned");
    info.append(nameEl, sub);

    const gearBtn = makeEl("button", "sbx-object-gear");
    gearBtn.innerHTML = '<i class="bi bi-gear-fill"></i>';
    gearBtn.title = "Configure device";
    gearBtn.dataset.deviceId = device.id;

    row.append(icon, info, gearBtn);
    list.appendChild(row);
  });

  body.appendChild(list);

  // Click row to select device on canvas
  list.addEventListener("click", (e) => {
    const gearBtn = e.target.closest(".sbx-object-gear");
    const row = e.target.closest(".sbx-object-row");
    if (!row) return;
    const deviceId = row.dataset.deviceId;

    if (gearBtn) {
      // Gear clicked — select device and open Config tab
      state.selectedIds = [deviceId];
      showConfigTab();
      renderAll();
      return;
    }

    // Row clicked — just select the device
    state.selectedIds = [deviceId];
    renderDevices();
    renderObjects();
    renderProps();
    updatePingVisibility();
  });
}

function showConfigTab() {
  const configTabBtn = getById("sbxConfigTabBtn");
  if (configTabBtn) configTabBtn.style.display = "";
  setRightTab("config");
  showRightPanel();
}

function hideConfigTab() {
  const configTabBtn = getById("sbxConfigTabBtn");
  if (configTabBtn) configTabBtn.style.display = "none";
  setRightTab("objectives");
  renderObjects();
}

function renderProps() {
  if (!propsEl) return;
  const device = getSelectedDevice();
  if (!device) {
    propsEl.textContent = "Select a device to view properties.";
    // Hide Config tab and switch to Objects if currently on Config
    const configTabBtn = getById("sbxConfigTabBtn");
    if (configTabBtn) configTabBtn.style.display = "none";
    if (state.rightTab === "config") setRightTab("objectives");
    return;
  }

  // Update config header with device name
  const headerName = getById("sbxConfigDeviceName");
  if (headerName) {
    const meta = DEVICE_TYPES[device.type] || DEVICE_TYPES.pc;
    headerName.textContent = device.name || meta.label;
  }

  const config = device.config || {};

  // Show only relevant subtabs for this device type
  const subtabVisibility = {
    general: true,
    interfaces: !!config.interfaces?.length,
    routing: !!config.routingTable,
    dhcp: !!config.dhcpServer,
    dns: !!config.dnsServer,
    mac: !!config.macTable,
  };
  qsa(".sbx-subtab", getById("sbxConfigTabs")).forEach((btn) => {
    const st = btn.getAttribute("data-subtab");
    btn.style.display = subtabVisibility[st] ? "" : "none";
  });

  // If current tab is hidden, fall back to general
  let tab = state.configTab;
  if (!subtabVisibility[tab]) {
    tab = "general";
    state.configTab = "general";
    qsa(".sbx-subtab", getById("sbxConfigTabs")).forEach((b) => b.classList.remove("is-active"));
    const genTab = qs('.sbx-subtab[data-subtab="general"]', getById("sbxConfigTabs"));
    if (genTab) genTab.classList.add("is-active");
  }

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

    // Action buttons row
    const actionsRow = makeEl("div", "sbx-config-actions");

    const updateBtn = makeEl("button", "btn btn-teal btn-sm", "Update");
    updateBtn.id = "updateDeviceBtn";

    const deleteBtn = makeEl("button", "btn btn-outline-danger btn-sm", "Delete");
    deleteBtn.id = "deleteDeviceBtn";

    actionsRow.append(updateBtn, deleteBtn);

    propsEl.append(nameGroup, ipGroup, maskGroup, gwGroup, dhcpWrap, macText, actionsRow);

    getById("updateDeviceBtn")?.addEventListener("click", () => {
      const nameInput = getById("prop_name");
      const ipInput = getById("prop_ip");
      const maskInput = getById("prop_mask");
      const gwInput = getById("prop_gw");
      const dhcpToggle = getById("prop_dhcp");
      const requestedIp = ipInput ? String(ipInput.value || "").trim() : "";
      const requestedMask = maskInput ? String(maskInput.value || "").trim() : "";
      const requestedGateway = gwInput ? String(gwInput.value || "").trim() : "";

      if (nameInput) {
        device.name = nameInput.value;
        addActionLog(`Renamed ${device.name}`);
      }
      if (ipInput) {
        device.config.ipAddress = requestedIp;
      }
      if (maskInput) {
        device.config.subnetMask = requestedMask;
      }
      if (gwInput) {
        device.config.defaultGateway = requestedGateway;
      }
      if (dhcpToggle) {
        device.config.dhcpEnabled = dhcpToggle.checked;
        if (device.config.dhcpEnabled) requestDHCP(device.id);
      }

      applyAutoNetworkDefaults();
      updateWarnings(device);
      pushHistory();
      notifyTutorialProgress();
      markDirtyAndSaveSoon();
      renderAll();

      // Update header name
      const headerName2 = getById("sbxConfigDeviceName");
      if (headerName2) headerName2.textContent = device.name || "";

      const correctedIp = String(device.config.ipAddress || "").trim();
      const correctedMask = String(device.config.subnetMask || "").trim();
      const correctedGateway = String(device.config.defaultGateway || "").trim();
      const wasAutoCorrected =
        requestedIp !== correctedIp ||
        requestedMask !== correctedMask ||
        requestedGateway !== correctedGateway;

      const toastMessage = wasAutoCorrected
        ? `${device.name} updated. Invalid or empty network values were auto-corrected.`
        : `${device.name} configuration applied.`;

      showToast({
        title: "Device updated",
        message: toastMessage,
        variant: "success",
        timeout: 2200,
      });
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
        makeEl("strong", null, iface.name || `Interface ${idx}`),
        makeEl("span", "badge text-bg-light border", iface.status || "down")
      );
      card.appendChild(header);

      const details = makeEl("div", "mt-1");
      details.appendChild(makeEl("div", "small text-muted", `Speed: ${iface.speed || "Auto"}`));
      if (iface.connectedTo) {
        const name = findDevice(iface.connectedTo)?.name || iface.connectedTo;
        details.appendChild(makeEl("div", "small text-muted", `Connected to: ${name}`));
      } else {
        details.appendChild(makeEl("div", "small text-muted", "Not connected"));
      }
      card.appendChild(details);

      if (device.type === "router") {
        const ipField = makeEl("div", "sbx-prop-field mt-2");
        ipField.appendChild(makeEl("label", null, "Interface IP"));
        const ifaceInput = document.createElement("input");
        ifaceInput.className = "form-control form-control-sm";
        ifaceInput.setAttribute("data-iface-ip", String(idx));
        ifaceInput.value = iface.ipAddress || "";
        ifaceInput.placeholder = "e.g. 192.168.1.1";
        ipField.appendChild(ifaceInput);
        card.appendChild(ipField);
      }

      propsEl.appendChild(card);
    });

    if (device.type === "router") {
      const actionsRow = makeEl("div", "sbx-config-actions");
      const updateBtn = makeEl("button", "btn btn-teal btn-sm", "Update Interfaces");
      updateBtn.addEventListener("click", () => {
        qsa("[data-iface-ip]", propsEl).forEach((input) => {
          const idx = Number(input.getAttribute("data-iface-ip"));
          if (config.interfaces[idx]) {
            config.interfaces[idx].ipAddress = input.value;
          }
        });
        pushHistory();
        markDirtyAndSaveSoon();
        showToast({ title: "Interfaces updated", message: `${device.name} interfaces saved.`, variant: "success", timeout: 2200 });
      });
      actionsRow.appendChild(updateBtn);
      propsEl.appendChild(actionsRow);
    }
    return;
  }

  if (tab === "routing") {
    if (!config.routingTable) {
      propsEl.textContent = "Routing is not available for this device type.";
      return;
    }

    if (config.routingTable.length) {
      config.routingTable.forEach((route, idx) => {
        const card = makeEl("div", "sbx-prop-card");
        const header = makeEl("div", "d-flex justify-content-between align-items-center");
        header.append(
          makeEl("strong", null, `${route.network}/${route.mask}`),
          makeEl("span", "badge text-bg-light border", `Metric ${route.metric || 1}`)
        );
        card.appendChild(header);
        card.appendChild(makeEl("div", "small text-muted", `Gateway: ${route.gateway}`));
        card.appendChild(makeEl("div", "small text-muted", `Interface: ${route.interface}`));

        const removeBtn = makeEl("button", "btn btn-outline-danger btn-sm mt-1");
        removeBtn.textContent = "Remove";
        removeBtn.style.fontSize = ".68rem";
        removeBtn.addEventListener("click", () => {
          config.routingTable.splice(idx, 1);
          pushHistory();
          markDirtyAndSaveSoon();
          renderProps();
        });
        card.appendChild(removeBtn);

        propsEl.appendChild(card);
      });
    } else {
      propsEl.appendChild(makeEl("div", "small text-muted", "No static routes configured."));
    }

    const addBtn = makeEl("button", "btn btn-outline-secondary btn-sm mt-2", "+ Add Route");
    addBtn.id = "addRouteBtn";
    propsEl.appendChild(addBtn);

    getById("addRouteBtn")?.addEventListener("click", () => {
      const network = prompt("Network (e.g., 10.0.0.0)");
      const mask = prompt("Mask (e.g., 255.255.255.0)");
      const gateway = prompt("Gateway (e.g., 10.0.0.1)");
      const iface = prompt("Interface (e.g., GigabitEthernet0/0)");
      if (!network || !mask || !gateway || !iface) return;
      config.routingTable.push({ network, mask, gateway, interface: iface, metric: 1 });
      pushHistory();
      markDirtyAndSaveSoon();
      renderProps();
      showToast({ title: "Route added", message: `Route to ${network} added.`, variant: "success", timeout: 2200 });
    });
    return;
  }

  if (tab === "dhcp") {
    if (!config.dhcpServer) {
      propsEl.textContent = "DHCP is not available for this device type.";
      return;
    }

    const toggleWrap = makeEl("div", "form-check form-switch mb-3");
    const enabledInput = document.createElement("input");
    enabledInput.className = "form-check-input";
    enabledInput.type = "checkbox";
    enabledInput.id = "dhcpServerEnabled";
    enabledInput.checked = !!config.dhcpServer.enabled;
    const enabledLabel = makeEl("label", "form-check-label small", "Enable DHCP Server");
    enabledLabel.setAttribute("for", "dhcpServerEnabled");
    toggleWrap.append(enabledInput, enabledLabel);
    propsEl.appendChild(toggleWrap);

    const fieldNetwork = makeEl("div", "sbx-prop-field");
    fieldNetwork.append(makeEl("label", null, "Pool Network"));
    const inNetwork = document.createElement("input");
    inNetwork.className = "form-control form-control-sm"; inNetwork.id = "dhcpNetwork";
    inNetwork.value = config.dhcpServer.network || ""; inNetwork.placeholder = "e.g. 192.168.1.0";
    fieldNetwork.appendChild(inNetwork);

    const fieldMask = makeEl("div", "sbx-prop-field");
    fieldMask.append(makeEl("label", null, "Subnet Mask"));
    const inMask = document.createElement("input");
    inMask.className = "form-control form-control-sm"; inMask.id = "dhcpMask";
    inMask.value = config.dhcpServer.mask || ""; inMask.placeholder = "e.g. 255.255.255.0";
    fieldMask.appendChild(inMask);

    const fieldGw = makeEl("div", "sbx-prop-field");
    fieldGw.append(makeEl("label", null, "Default Gateway"));
    const inGw = document.createElement("input");
    inGw.className = "form-control form-control-sm"; inGw.id = "dhcpGateway";
    inGw.value = config.dhcpServer.gateway || ""; inGw.placeholder = "e.g. 192.168.1.1";
    fieldGw.appendChild(inGw);

    const rangeGrid = makeEl("div", "sbx-prop-grid");
    const fieldStart = makeEl("div", "sbx-prop-field");
    fieldStart.append(makeEl("label", null, "Range Start"));
    const inStart = document.createElement("input");
    inStart.className = "form-control form-control-sm"; inStart.id = "dhcpStart";
    inStart.value = config.dhcpServer.rangeStart || ""; inStart.placeholder = "e.g. 192.168.1.100";
    fieldStart.appendChild(inStart);

    const fieldEnd = makeEl("div", "sbx-prop-field");
    fieldEnd.append(makeEl("label", null, "Range End"));
    const inEnd = document.createElement("input");
    inEnd.className = "form-control form-control-sm"; inEnd.id = "dhcpEnd";
    inEnd.value = config.dhcpServer.rangeEnd || ""; inEnd.placeholder = "e.g. 192.168.1.200";
    fieldEnd.appendChild(inEnd);
    rangeGrid.append(fieldStart, fieldEnd);

    const leases = makeEl("div", "small text-muted mt-2", `Active leases: ${config.dhcpServer.leases?.length || 0}`);

    propsEl.append(fieldNetwork, fieldMask, fieldGw, rangeGrid, leases);

    const actionsRow = makeEl("div", "sbx-config-actions");
    const updateBtn = makeEl("button", "btn btn-teal btn-sm", "Update DHCP");
    updateBtn.addEventListener("click", () => {
      config.dhcpServer.enabled = getById("dhcpServerEnabled")?.checked ?? config.dhcpServer.enabled;
      config.dhcpServer.network = getById("dhcpNetwork")?.value || "";
      config.dhcpServer.mask = getById("dhcpMask")?.value || "";
      config.dhcpServer.gateway = getById("dhcpGateway")?.value || "";
      config.dhcpServer.rangeStart = getById("dhcpStart")?.value || "";
      config.dhcpServer.rangeEnd = getById("dhcpEnd")?.value || "";
      pushHistory();
      markDirtyAndSaveSoon();
      showToast({ title: "DHCP updated", message: `${device.name} DHCP pool saved.`, variant: "success", timeout: 2200 });
    });
    actionsRow.appendChild(updateBtn);
    propsEl.appendChild(actionsRow);
    return;
  }

  if (tab === "dns") {
    if (!config.dnsServer) {
      propsEl.textContent = "DNS is not available for this device type.";
      return;
    }

    const toggleWrap = makeEl("div", "form-check form-switch mb-3");
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
      const heading = makeEl("div", "small fw-semibold mb-1", "DNS Records");
      propsEl.appendChild(heading);
      config.dnsServer.records.forEach((r, idx) => {
        const card = makeEl("div", "sbx-prop-card d-flex justify-content-between align-items-center");
        const info = makeEl("div");
        info.append(
          makeEl("strong", null, r.hostname || ""),
          makeEl("div", "small text-muted", `→ ${r.ip || ""}`)
        );
        const removeBtn = makeEl("button", "btn btn-outline-danger btn-sm");
        removeBtn.textContent = "Remove";
        removeBtn.style.fontSize = ".68rem";
        removeBtn.addEventListener("click", () => {
          config.dnsServer.records.splice(idx, 1);
          pushHistory();
          markDirtyAndSaveSoon();
          renderProps();
        });
        card.append(info, removeBtn);
        propsEl.appendChild(card);
      });
    } else {
      propsEl.appendChild(makeEl("div", "small text-muted mb-2", "No DNS records yet."));
    }

    const actionsRow = makeEl("div", "sbx-config-actions");
    const addBtn = makeEl("button", "btn btn-outline-secondary btn-sm", "+ Add Record");
    addBtn.addEventListener("click", () => {
      const hostname = prompt("Hostname (e.g., server.local)");
      const ip = prompt("IP address (e.g., 192.168.1.10)");
      if (!hostname || !ip) return;
      config.dnsServer.records.push({ hostname, ip });
      config.dnsServer.enabled = getById("dnsServerEnabled")?.checked ?? config.dnsServer.enabled;
      pushHistory();
      markDirtyAndSaveSoon();
      renderProps();
      showToast({ title: "DNS record added", message: `${hostname} → ${ip}`, variant: "success", timeout: 2200 });
    });
    const saveToggleBtn = makeEl("button", "btn btn-teal btn-sm", "Update DNS");
    saveToggleBtn.addEventListener("click", () => {
      config.dnsServer.enabled = getById("dnsServerEnabled")?.checked ?? config.dnsServer.enabled;
      pushHistory();
      markDirtyAndSaveSoon();
      showToast({ title: "DNS updated", message: `${device.name} DNS settings saved.`, variant: "success", timeout: 2200 });
    });
    actionsRow.append(addBtn, saveToggleBtn);
    propsEl.appendChild(actionsRow);
    return;
  }

  if (tab === "mac") {
    if (!config.macTable) {
      propsEl.textContent = "MAC table is not available for this device type.";
      return;
    }

    if (config.macTable.length) {
      const heading = makeEl("div", "small fw-semibold mb-1", "Learned MAC Addresses");
      propsEl.appendChild(heading);
      config.macTable.forEach((m) => {
        const card = makeEl("div", "sbx-prop-card");
        const header = makeEl("div", "d-flex justify-content-between align-items-center");
        header.append(
          makeEl("strong", null, m.macAddress || ""),
          makeEl("span", "badge text-bg-light border", m.port || "")
        );
        card.appendChild(header);
        if (m.vlan) {
          card.appendChild(makeEl("div", "small text-muted", `VLAN: ${m.vlan}`));
        }
        propsEl.appendChild(card);
      });
    } else {
      propsEl.appendChild(makeEl("div", "small text-muted", "MAC address table is empty. Connect devices and send traffic to populate."));
    }
    return;
  }
}

function updateWarnings(device) {
  const ipWarn = getById("ip_warning");
  const maskWarn = getById("mask_warning");
  const gwWarn = getById("gw_warning");
  const ipValue = String(device.config.ipAddress || "").trim();
  const maskValue = String(device.config.subnetMask || "").trim();
  const gatewayValue = String(device.config.defaultGateway || "").trim();

  if (ipWarn) ipWarn.textContent = ipValue && !isValidIP(ipValue) ? "Invalid IP" : "";
  if (maskWarn) maskWarn.textContent = maskValue && !isValidSubnet(maskValue) ? "Invalid subnet" : "";
  if (gwWarn) {
    gwWarn.textContent = gatewayValue && !isValidIP(gatewayValue) ? "Invalid gateway" : "";
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
  renderObjects();
  renderProps();
  renderInspector();
  renderObjectives();
  renderLogs();
  renderPackets();
  renderConsole();
  updatePingVisibility();
  updateSaveModalLive();
  // Enhanced features
  if (typeof updateDeviceCountBadges === "function") updateDeviceCountBadges();
  if (typeof updateStatsBar === "function") updateStatsBar();
  if (typeof updateMinimap === "function") updateMinimap();
  if (typeof renderConnectionLabels === "function") renderConnectionLabels();
  requestAnimationFrame(() => {
    if (typeof updateDeviceStatusIndicators === "function") updateDeviceStatusIndicators();
  });
}
