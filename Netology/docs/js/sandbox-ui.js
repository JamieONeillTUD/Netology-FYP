/*
  Student: C22320301 - Jamie O'Neill
  File: sandbox-ui.js
  Purpose: All the rendering, event binding, and UI logic
           for the Netology network sandbox.
*/

// Get the color associated with a device type
function getTypeColor(deviceType) {
  var info = DEVICE_TYPES[deviceType];
  if (info) {
    return info.color;
  }
  return "#64748b";
}

// Build a short text summary of the current topology
function getTopologySummary() {
  var deviceCount = state.devices.length;
  var connectionCount = state.connections.length;
  return deviceCount + " device" + (deviceCount === 1 ? "" : "s") + ", " + connectionCount + " connection" + (connectionCount === 1 ? "" : "s");
}

// Render a summary of the topology into a container element
function renderSummary(container) {
  if (!container) {
    return;
  }
  container.textContent = getTopologySummary();
}

// Render a small SVG preview of the topology (used in the save modal)
function renderTopologyPreview(container) {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  var svgElement = makeSvgElement("svg");
  svgElement.setAttribute("viewBox", "0 0 320 200");
  svgElement.style.width = "100%";
  svgElement.style.height = "100%";

  var scaleX = 320 / CANVAS_WIDTH;
  var scaleY = 200 / CANVAS_HEIGHT;
  var scale = Math.min(scaleX, scaleY);

  // Draw connections
  for (var i = 0; i < state.connections.length; i++) {
    var connection = state.connections[i];
    var fromDevice = findDevice(connection.from);
    var toDevice = findDevice(connection.to);
    if (fromDevice && toDevice) {
      var line = makeSvgElement("line");
      line.setAttribute("x1", (fromDevice.x + DEVICE_RADIUS) * scale);
      line.setAttribute("y1", (fromDevice.y + DEVICE_RADIUS) * scale);
      line.setAttribute("x2", (toDevice.x + DEVICE_RADIUS) * scale);
      line.setAttribute("y2", (toDevice.y + DEVICE_RADIUS) * scale);
      line.setAttribute("stroke", "#94a3b8");
      line.setAttribute("stroke-width", "1.5");
      svgElement.appendChild(line);
    }
  }

  // Draw devices
  for (var j = 0; j < state.devices.length; j++) {
    var device = state.devices[j];
    var cx = (device.x + DEVICE_RADIUS) * scale;
    var cy = (device.y + DEVICE_RADIUS) * scale;
    var circle = makeSvgElement("circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", "5");
    circle.setAttribute("fill", getTypeColor(device.type));
    svgElement.appendChild(circle);
  }

  container.appendChild(svgElement);
}

// Update the ping overview section in the ping modal
function updatePingOverview() {
  var sourceDevice = getSelectedDevice();
  setText("pingOverviewSource", sourceDevice ? sourceDevice.name : "—");
  setText("pingOverviewSourceIp", sourceDevice && sourceDevice.config ? sourceDevice.config.ipAddress || "No IP" : "—");

  // Fill the target dropdown
  var selectElement = getById("pingTargetSelect");
  if (selectElement) {
    clearChildren(selectElement);
    var defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Select target --";
    selectElement.appendChild(defaultOption);

    for (var i = 0; i < state.devices.length; i++) {
      var device = state.devices[i];
      if (sourceDevice && device.id === sourceDevice.id) {
        continue;
      }
      var option = document.createElement("option");
      option.value = device.id;
      var label = device.name;
      if (device.config && device.config.ipAddress) {
        label += " (" + device.config.ipAddress + ")";
      }
      option.textContent = label;
      selectElement.appendChild(option);
    }
  }
}

// Show or hide the empty state based on whether there are devices
function updateEmptyState() {
  if (!emptyState) {
    return;
  }
  if (state.devices.length === 0) {
    emptyState.style.display = "";
  } else {
    emptyState.style.display = "none";
  }
}

// Show or hide ping-related buttons based on whether a device is selected
function updatePingVisibility() {
  var pingButton = getById("pingBtn");
  if (pingButton) {
    if (state.selectedIds.length === 1) {
      pingButton.style.display = "";
    } else {
      pingButton.style.display = "none";
    }
  }
}

// Update the zoom label text in the toolbar
function updateZoomLabel() {
  var label = getById("sbxZoomLabel");
  if (label) {
    label.textContent = Math.round(state.zoom * 100) + "%";
  }
}

// Update the grid background on the canvas
function updateGrid() {
  if (!stage) {
    return;
  }
  if (state.showGrid) {
    stage.style.backgroundSize = GRID_SIZE + "px " + GRID_SIZE + "px";
    stage.style.backgroundImage = "radial-gradient(circle, rgba(100,116,139,0.15) 1px, transparent 1px)";
  } else {
    stage.style.backgroundImage = "none";
  }
}

// Show or hide the connection type dropdown based on the current tool
function updateConnectionTypeGroupVisibility() {
  var group = getById("connTypeGroup");
  if (group) {
    if (state.tool === TOOL.CONNECT) {
      group.style.display = "";
    } else {
      group.style.display = "none";
    }
  }
}


// Render all device elements onto the canvas
function renderDevices() {
  if (!deviceLayer) {
    return;
  }
  clearChildren(deviceLayer);

  for (var i = 0; i < state.devices.length; i++) {
    var device = state.devices[i];
    var typeInfo = DEVICE_TYPES[device.type] || DEVICE_TYPES.pc;
    var isSelected = state.selectedIds.indexOf(device.id) !== -1;

    var deviceElement = document.createElement("div");
    deviceElement.className = "sbx-device" + (isSelected ? " is-selected" : "");
    deviceElement.setAttribute("data-id", device.id);
    deviceElement.style.left = device.x + "px";
    deviceElement.style.top = device.y + "px";

    // VLAN color ring
    if (device.vlan > 0 && VLAN_COLORS[device.vlan]) {
      deviceElement.style.boxShadow = "0 0 0 3px " + VLAN_COLORS[device.vlan];
    }

    // Device icon
    var iconWrap = document.createElement("div");
    iconWrap.className = "sbx-device-icon";
    iconWrap.style.color = typeInfo.color;
    var iconElement = document.createElement("i");
    iconElement.className = "bi " + typeInfo.icon;
    iconWrap.appendChild(iconElement);
    deviceElement.appendChild(iconWrap);

    // Device name badge
    var nameBadge = document.createElement("div");
    nameBadge.className = "sbx-device-label-badge";
    nameBadge.textContent = device.name;
    deviceElement.appendChild(nameBadge);

    // IP address label
    if (device.config && device.config.ipAddress) {
      var ipLabel = document.createElement("div");
      ipLabel.className = "sbx-device-ip";
      ipLabel.textContent = device.config.ipAddress;
      deviceElement.appendChild(ipLabel);
    }

    // Status dot
    var statusDot = document.createElement("div");
    var hasIp = device.config && device.config.ipAddress;
    statusDot.className = "sbx-device-status " + (hasIp ? "is-configured" : "is-unconfigured");
    deviceElement.appendChild(statusDot);

    // Action buttons (config, copy, delete)
    var actionsWrap = document.createElement("div");
    actionsWrap.className = "sbx-device-actions";

    var configButton = document.createElement("button");
    configButton.className = "sbx-device-action";
    configButton.setAttribute("data-action", "config");
    configButton.setAttribute("data-device-id", device.id);
    configButton.setAttribute("data-tooltip", "Configure");
    configButton.innerHTML = '<i class="bi bi-gear"></i>';
    actionsWrap.appendChild(configButton);

    var copyButton = document.createElement("button");
    copyButton.className = "sbx-device-action";
    copyButton.setAttribute("data-action", "copy");
    copyButton.setAttribute("data-device-id", device.id);
    copyButton.setAttribute("data-tooltip", "Duplicate");
    copyButton.innerHTML = '<i class="bi bi-copy"></i>';
    actionsWrap.appendChild(copyButton);

    var deleteButton = document.createElement("button");
    deleteButton.className = "sbx-device-action";
    deleteButton.setAttribute("data-action", "delete");
    deleteButton.setAttribute("data-device-id", device.id);
    deleteButton.setAttribute("data-tooltip", "Delete");
    deleteButton.innerHTML = '<i class="bi bi-trash3"></i>';
    actionsWrap.appendChild(deleteButton);

    deviceElement.appendChild(actionsWrap);
    deviceLayer.appendChild(deviceElement);
  }
}


// Update SVG connection paths (called during drag to avoid full re-render)
function updateConnectionPaths() {
  var allPaths = connectionLayer ? connectionLayer.querySelectorAll(".sbx-conn-path") : [];
  for (var i = 0; i < allPaths.length; i++) {
    var pathElement = allPaths[i];
    var connId = pathElement.getAttribute("data-conn-id");
    if (!connId) {
      continue;
    }
    // Find this connection
    var connection = null;
    for (var j = 0; j < state.connections.length; j++) {
      if (state.connections[j].id === connId) {
        connection = state.connections[j];
        break;
      }
    }
    if (!connection) {
      continue;
    }
    var fromDevice = findDevice(connection.from);
    var toDevice = findDevice(connection.to);
    if (!fromDevice || !toDevice) {
      continue;
    }
    var x1 = fromDevice.x + DEVICE_RADIUS;
    var y1 = fromDevice.y + DEVICE_RADIUS;
    var x2 = toDevice.x + DEVICE_RADIUS;
    var y2 = toDevice.y + DEVICE_RADIUS;
    pathElement.setAttribute("d", "M" + x1 + "," + y1 + " L" + x2 + "," + y2);
  }

  // Also update any delete buttons at midpoints
  var deleteGroups = connectionLayer ? connectionLayer.querySelectorAll(".sbx-conn-delete-group") : [];
  for (var k = 0; k < deleteGroups.length; k++) {
    var group = deleteGroups[k];
    var groupConnId = group.getAttribute("data-conn-id");
    if (!groupConnId) {
      continue;
    }
    var conn = null;
    for (var m = 0; m < state.connections.length; m++) {
      if (state.connections[m].id === groupConnId) {
        conn = state.connections[m];
        break;
      }
    }
    if (!conn) {
      continue;
    }
    var fDev = findDevice(conn.from);
    var tDev = findDevice(conn.to);
    if (fDev && tDev) {
      var midX = (fDev.x + tDev.x) / 2 + DEVICE_RADIUS;
      var midY = (fDev.y + tDev.y) / 2 + DEVICE_RADIUS;
      group.setAttribute("transform", "translate(" + midX + "," + midY + ")");
    }
  }
}


// Render all SVG connections and delete buttons
function renderConnections() {
  if (!connectionLayer) {
    return;
  }
  clearChildren(connectionLayer);

  for (var i = 0; i < state.connections.length; i++) {
    var connection = state.connections[i];
    var fromDevice = findDevice(connection.from);
    var toDevice = findDevice(connection.to);
    if (!fromDevice || !toDevice) {
      continue;
    }

    var x1 = fromDevice.x + DEVICE_RADIUS;
    var y1 = fromDevice.y + DEVICE_RADIUS;
    var x2 = toDevice.x + DEVICE_RADIUS;
    var y2 = toDevice.y + DEVICE_RADIUS;

    var typeInfo = CONNECTION_TYPES[connection.type] || CONNECTION_TYPES.ethernet;
    var lineColor = typeInfo.color;

    // Grey out disabled connections
    if (!connection.isUp) {
      lineColor = "#6b7280";
    }

    // Draw the line
    var pathElement = makeSvgElement("path");
    pathElement.setAttribute("class", "sbx-conn-path");
    pathElement.setAttribute("data-conn-id", connection.id);
    pathElement.setAttribute("d", "M" + x1 + "," + y1 + " L" + x2 + "," + y2);
    pathElement.setAttribute("stroke", lineColor);
    pathElement.setAttribute("stroke-width", "2.5");
    pathElement.setAttribute("fill", "none");
    if (typeInfo.dash) {
      pathElement.setAttribute("stroke-dasharray", typeInfo.dash);
    }
    if (!connection.isUp) {
      pathElement.setAttribute("opacity", "0.4");
    }
    connectionLayer.appendChild(pathElement);

    // Delete button at the midpoint
    var midX = (x1 + x2) / 2;
    var midY = (y1 + y2) / 2;

    var deleteGroup = makeSvgElement("g");
    deleteGroup.setAttribute("class", "sbx-conn-delete-group");
    deleteGroup.setAttribute("data-conn-id", connection.id);
    deleteGroup.setAttribute("transform", "translate(" + midX + "," + midY + ")");
    deleteGroup.style.cursor = "pointer";

    var deleteCircle = makeSvgElement("circle");
    deleteCircle.setAttribute("r", "10");
    deleteCircle.setAttribute("fill", "#ef4444");
    deleteCircle.setAttribute("opacity", "0");
    deleteGroup.appendChild(deleteCircle);

    var deleteText = makeSvgElement("text");
    deleteText.setAttribute("text-anchor", "middle");
    deleteText.setAttribute("dominant-baseline", "central");
    deleteText.setAttribute("fill", "white");
    deleteText.setAttribute("font-size", "12");
    deleteText.setAttribute("opacity", "0");
    deleteText.textContent = "×";
    deleteGroup.appendChild(deleteText);

    // Show on hover
    deleteGroup.addEventListener("mouseenter", function () {
      var circles = this.querySelectorAll("circle");
      var texts = this.querySelectorAll("text");
      for (var c = 0; c < circles.length; c++) { circles[c].setAttribute("opacity", "1"); }
      for (var t = 0; t < texts.length; t++) { texts[t].setAttribute("opacity", "1"); }
    });
    deleteGroup.addEventListener("mouseleave", function () {
      var circles = this.querySelectorAll("circle");
      var texts = this.querySelectorAll("text");
      for (var c = 0; c < circles.length; c++) { circles[c].setAttribute("opacity", "0"); }
      for (var t = 0; t < texts.length; t++) { texts[t].setAttribute("opacity", "0"); }
    });

    connectionLayer.appendChild(deleteGroup);
  }
}


// Render connection type labels as positioned divs over the canvas
function renderConnectionLabels() {
  // Remove existing labels first
  var existingLabels = stage ? stage.querySelectorAll(".sbx-conn-label") : [];
  for (var r = 0; r < existingLabels.length; r++) {
    existingLabels[r].remove();
  }

  if (!stage) {
    return;
  }

  for (var i = 0; i < state.connections.length; i++) {
    var connection = state.connections[i];
    var fromDevice = findDevice(connection.from);
    var toDevice = findDevice(connection.to);
    if (!fromDevice || !toDevice) {
      continue;
    }

    var midX = (fromDevice.x + toDevice.x) / 2 + DEVICE_RADIUS;
    var midY = (fromDevice.y + toDevice.y) / 2 + DEVICE_RADIUS;

    var typeInfo = CONNECTION_TYPES[connection.type] || CONNECTION_TYPES.ethernet;
    var label = document.createElement("div");
    label.className = "sbx-conn-label";
    label.textContent = typeInfo.label;
    if (!connection.isUp) {
      label.textContent += " (down)";
      label.classList.add("is-down");
    }

    // Show interface names if available
    if (connection.fromInterface || connection.toInterface) {
      var interfaceText = "";
      if (connection.fromInterface) {
        interfaceText += connection.fromInterface;
      }
      if (connection.fromInterface && connection.toInterface) {
        interfaceText += " ↔ ";
      }
      if (connection.toInterface) {
        interfaceText += connection.toInterface;
      }
      label.setAttribute("data-tooltip", interfaceText);
    }

    label.style.left = midX + "px";
    label.style.top = (midY - 20) + "px";
    stage.appendChild(label);
  }
}


// Render the inspect quick actions (shown when a device is selected in Objects tab)
function renderInspectActions() {
  var actionsElement = getById("sbxInspectActions");
  if (!actionsElement) {
    return;
  }
  var selectedDevice = getSelectedDevice();
  if (selectedDevice) {
    actionsElement.style.display = "";
  } else {
    actionsElement.style.display = "none";
  }
}

// Display a ping result in the ping modal
function setPingResult(result) {
  var resultElement = getById("pingResult");
  if (!resultElement) {
    return;
  }
  if (!result) {
    resultElement.innerHTML = "";
    return;
  }

  var statusChip = getById("pingOverviewStatus");
  var latencyEl = getById("pingOverviewLatency");
  var hopsEl = getById("pingOverviewHops");
  var routeEl = getById("pingOverviewRoute");

  if (result.success) {
    resultElement.innerHTML = '<div class="sbx-ping-success"><i class="bi bi-check-circle-fill me-2"></i>' + escapeHtml(result.message) + '</div>';
    if (statusChip) {
      statusChip.textContent = "Success";
      statusChip.className = "sbx-ping-chip is-success";
    }
    if (latencyEl) {
      latencyEl.textContent = "Latency: " + result.latency + "ms";
    }
    if (hopsEl) {
      hopsEl.textContent = "Hops: " + result.hops.length;
    }
    if (routeEl) {
      var routeHtml = "";
      for (var i = 0; i < result.hops.length; i++) {
        routeHtml += '<span class="sbx-ping-route-hop">' + escapeHtml(result.hops[i]) + '</span>';
        if (i < result.hops.length - 1) {
          routeHtml += ' <i class="bi bi-arrow-right"></i> ';
        }
      }
      routeEl.innerHTML = routeHtml;
    }
  } else {
    resultElement.innerHTML = '<div class="sbx-ping-fail"><i class="bi bi-x-circle-fill me-2"></i>' + escapeHtml(result.message) + '</div>';
    if (statusChip) {
      statusChip.textContent = "Failed";
      statusChip.className = "sbx-ping-chip is-fail";
    }
    if (latencyEl) {
      latencyEl.textContent = "Latency: —";
    }
    if (hopsEl) {
      hopsEl.textContent = "Hops: —";
    }
    if (routeEl) {
      routeEl.textContent = "No route found.";
    }
  }
}

// Add a packet log entry to the packets tab
function addPacketLog(text) {
  state.packets.push({ time: new Date().toLocaleTimeString(), text: text });
  renderPackets();
}

// Animate a packet moving along a connection path (for visual feedback)
function animatePacket(path) {
  if (!path || path.length < 2 || !connectionLayer) {
    return;
  }

  for (var step = 0; step < path.length - 1; step++) {
    var fromDevice = findDevice(path[step]);
    var toDevice = findDevice(path[step + 1]);
    if (!fromDevice || !toDevice) {
      continue;
    }

    var packetDot = makeSvgElement("circle");
    packetDot.setAttribute("r", "5");
    packetDot.setAttribute("fill", "#22d3ee");
    packetDot.setAttribute("opacity", "0.9");

    var x1 = fromDevice.x + DEVICE_RADIUS;
    var y1 = fromDevice.y + DEVICE_RADIUS;
    var x2 = toDevice.x + DEVICE_RADIUS;
    var y2 = toDevice.y + DEVICE_RADIUS;

    packetDot.setAttribute("cx", x1);
    packetDot.setAttribute("cy", y1);
    connectionLayer.appendChild(packetDot);

    // Animate from start to end using requestAnimationFrame
    (function (dot, startX, startY, endX, endY, delayMs) {
      setTimeout(function () {
        var startTime = null;
        var duration = 600;

        function animate(timestamp) {
          if (!startTime) {
            startTime = timestamp;
          }
          var progress = (timestamp - startTime) / duration;
          if (progress > 1) {
            progress = 1;
          }

          var currentX = startX + (endX - startX) * progress;
          var currentY = startY + (endY - startY) * progress;
          dot.setAttribute("cx", currentX);
          dot.setAttribute("cy", currentY);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            // Fade out and remove
            dot.setAttribute("opacity", "0");
            setTimeout(function () {
              if (dot.parentNode) {
                dot.parentNode.removeChild(dot);
              }
            }, 300);
          }
        }

        requestAnimationFrame(animate);
      }, delayMs);
    })(packetDot, x1, y1, x2, y2, step * 650);
  }
}


// Render the list of objects (devices) in the right panel Objects tab
function renderObjects() {
  var objectsBody = getById("sbxObjectsBody");
  if (!objectsBody) {
    return;
  }
  clearChildren(objectsBody);

  if (state.devices.length === 0) {
    objectsBody.textContent = "No devices on canvas yet.";
    return;
  }

  for (var i = 0; i < state.devices.length; i++) {
    var device = state.devices[i];
    var typeInfo = DEVICE_TYPES[device.type] || DEVICE_TYPES.pc;
    var isSelected = state.selectedIds.indexOf(device.id) !== -1;

    var row = document.createElement("div");
    row.className = "sbx-object-row" + (isSelected ? " is-selected" : "");
    row.setAttribute("data-device-id", device.id);

    var icon = document.createElement("i");
    icon.className = "bi " + typeInfo.icon + " me-2";
    icon.style.color = typeInfo.color;
    row.appendChild(icon);

    var nameSpan = document.createElement("span");
    nameSpan.className = "sbx-object-name";
    nameSpan.textContent = device.name;
    row.appendChild(nameSpan);

    if (device.config && device.config.ipAddress) {
      var ipSpan = document.createElement("span");
      ipSpan.className = "sbx-object-ip small text-muted ms-2";
      ipSpan.textContent = device.config.ipAddress;
      row.appendChild(ipSpan);
    }

    var gearButton = document.createElement("button");
    gearButton.className = "sbx-object-gear";
    gearButton.innerHTML = '<i class="bi bi-gear"></i>';
    gearButton.setAttribute("data-device-id", device.id);
    row.appendChild(gearButton);

    // Click to select, gear to configure
    (function (deviceId) {
      row.addEventListener("click", function () {
        state.selectedIds = [deviceId];
        renderAll();
      });
      gearButton.addEventListener("click", function (event) {
        event.stopPropagation();
        state.selectedIds = [deviceId];
        showConfigTab();
        renderAll();
      });
    })(device.id);

    objectsBody.appendChild(row);
  }
}


// Show the config tab in the right panel
function showConfigTab() {
  var configTabButton = getById("sbxConfigTabBtn");
  if (configTabButton) {
    configTabButton.style.display = "";
  }
  setRightTab("config");
}

// Hide the config tab
function hideConfigTab() {
  var configTabButton = getById("sbxConfigTabBtn");
  if (configTabButton) {
    configTabButton.style.display = "none";
  }
  if (state.rightTab === "config") {
    setRightTab("objects");
  }
}


// Render subnet conflict warnings at the top of the canvas
function updateWarnings() {
  // Remove existing warnings
  var existingWarnings = stage ? stage.querySelectorAll(".sbx-subnet-warning") : [];
  for (var r = 0; r < existingWarnings.length; r++) {
    existingWarnings[r].remove();
  }

  var conflicts = findSubnetConflicts();
  if (conflicts.length === 0 || !stage) {
    return;
  }

  var warningBar = document.createElement("div");
  warningBar.className = "sbx-subnet-warning";
  warningBar.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i>';

  for (var i = 0; i < conflicts.length; i++) {
    var warningText = document.createElement("span");
    warningText.className = "sbx-warning-text";
    warningText.textContent = conflicts[i].message;
    warningBar.appendChild(warningText);
    if (i < conflicts.length - 1) {
      warningBar.appendChild(document.createTextNode(" | "));
    }
  }

  stage.insertBefore(warningBar, stage.firstChild);
}


// Render the properties panel based on the selected device and active config tab
function renderProps() {
  if (!propsElement) {
    return;
  }
  var selectedDevice = getSelectedDevice();

  if (!selectedDevice) {
    propsElement.innerHTML = "Select a device to view properties.";
    hideConfigTab();
    return;
  }

  // Update config header
  var configHeaderName = getById("sbxConfigDeviceName");
  if (configHeaderName) {
    configHeaderName.textContent = selectedDevice.name;
  }

  if (state.configTab === "general") {
    renderGeneralConfig(selectedDevice);
  } else if (state.configTab === "interfaces") {
    renderInterfacesConfig(selectedDevice);
  } else if (state.configTab === "routing") {
    renderRoutingConfig(selectedDevice);
  } else if (state.configTab === "dhcp") {
    renderDhcpConfig(selectedDevice);
  } else if (state.configTab === "dns") {
    renderDnsConfig(selectedDevice);
  } else if (state.configTab === "mac") {
    renderMacConfig(selectedDevice);
  }
}

// Render the general configuration tab for a device
function renderGeneralConfig(device) {
  propsElement.innerHTML = "";

  var form = document.createElement("div");
  form.className = "sbx-config-form";

  // Device name
  var nameLabel = document.createElement("label");
  nameLabel.className = "form-label";
  nameLabel.textContent = "Device Name";
  var nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "form-control";
  nameInput.value = device.name;
  form.appendChild(nameLabel);
  form.appendChild(nameInput);

  // IP Address
  var ipLabel = document.createElement("label");
  ipLabel.className = "form-label mt-2";
  ipLabel.textContent = "IP Address";
  var ipInput = document.createElement("input");
  ipInput.type = "text";
  ipInput.className = "form-control";
  ipInput.value = device.config.ipAddress || "";
  ipInput.placeholder = "e.g. 192.168.1.10";
  form.appendChild(ipLabel);
  form.appendChild(ipInput);

  // Subnet Mask
  var maskLabel = document.createElement("label");
  maskLabel.className = "form-label mt-2";
  maskLabel.textContent = "Subnet Mask";
  var maskInput = document.createElement("input");
  maskInput.type = "text";
  maskInput.className = "form-control";
  maskInput.value = device.config.subnetMask || "255.255.255.0";
  form.appendChild(maskLabel);
  form.appendChild(maskInput);

  // Default Gateway
  var gwLabel = document.createElement("label");
  gwLabel.className = "form-label mt-2";
  gwLabel.textContent = "Default Gateway";
  var gwInput = document.createElement("input");
  gwInput.type = "text";
  gwInput.className = "form-control";
  gwInput.value = device.config.defaultGateway || "";
  gwInput.placeholder = "e.g. 192.168.1.1";
  form.appendChild(gwLabel);
  form.appendChild(gwInput);

  // VLAN assignment
  var vlanLabel = document.createElement("label");
  vlanLabel.className = "form-label mt-2";
  vlanLabel.textContent = "VLAN ID (0 = none)";
  var vlanInput = document.createElement("input");
  vlanInput.type = "number";
  vlanInput.className = "form-control";
  vlanInput.value = device.vlan || 0;
  vlanInput.min = "0";
  vlanInput.max = "8";
  form.appendChild(vlanLabel);
  form.appendChild(vlanInput);

  // DHCP toggle
  var dhcpCheck = document.createElement("div");
  dhcpCheck.className = "form-check mt-3";
  var dhcpInput = document.createElement("input");
  dhcpInput.type = "checkbox";
  dhcpInput.className = "form-check-input";
  dhcpInput.checked = device.config.dhcpEnabled || false;
  dhcpInput.id = "dhcpToggle";
  var dhcpLabel = document.createElement("label");
  dhcpLabel.className = "form-check-label";
  dhcpLabel.htmlFor = "dhcpToggle";
  dhcpLabel.textContent = "Use DHCP";
  dhcpCheck.appendChild(dhcpInput);
  dhcpCheck.appendChild(dhcpLabel);
  form.appendChild(dhcpCheck);

  // MAC address (read only)
  var macLabel = document.createElement("label");
  macLabel.className = "form-label mt-2";
  macLabel.textContent = "MAC Address";
  var macInput = document.createElement("input");
  macInput.type = "text";
  macInput.className = "form-control";
  macInput.value = device.config.macAddress || "";
  macInput.readOnly = true;
  form.appendChild(macLabel);
  form.appendChild(macInput);

  // Update button
  var updateButton = document.createElement("button");
  updateButton.className = "btn btn-teal mt-3 me-2";
  updateButton.textContent = "Update";
  updateButton.addEventListener("click", function () {
    device.name = nameInput.value.trim() || device.name;
    device.config.ipAddress = ipInput.value.trim();
    device.config.subnetMask = maskInput.value.trim() || "255.255.255.0";
    device.config.defaultGateway = gwInput.value.trim();
    device.config.dhcpEnabled = dhcpInput.checked;
    device.vlan = Number(vlanInput.value) || 0;
    updateDeviceStatus(device);
    finishTopologyChange({ refreshTutorial: true });
    showSandboxToast({ title: "Updated", message: device.name + " settings saved.", variant: "success", timeout: 2500 });
  });
  form.appendChild(updateButton);

  // Delete button
  var deleteButton = document.createElement("button");
  deleteButton.className = "btn btn-outline-danger mt-3";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", function () {
    deleteDevices([device.id]);
  });
  form.appendChild(deleteButton);

  propsElement.appendChild(form);
}

// Render the interfaces config tab
function renderInterfacesConfig(device) {
  propsElement.innerHTML = "";

  var interfaces = device.config.interfaces || [];
  if (interfaces.length === 0) {
    propsElement.textContent = "No interfaces available for this device.";
    return;
  }

  for (var i = 0; i < interfaces.length; i++) {
    var iface = interfaces[i];
    var row = document.createElement("div");
    row.className = "sbx-interface-row mb-3 p-2 border rounded";

    var header = document.createElement("div");
    header.className = "fw-semibold mb-1";
    header.textContent = iface.name;
    row.appendChild(header);

    var statusBadge = document.createElement("span");
    statusBadge.className = "badge " + (iface.status === "up" ? "bg-success" : "bg-secondary") + " me-2";
    statusBadge.textContent = iface.status;
    row.appendChild(statusBadge);

    if (iface.mac) {
      var macText = document.createElement("span");
      macText.className = "small text-muted";
      macText.textContent = "MAC: " + iface.mac;
      row.appendChild(macText);
    }

    if (iface.linked) {
      var linkedText = document.createElement("div");
      linkedText.className = "small text-muted mt-1";
      linkedText.textContent = "Linked to: " + iface.linked;
      row.appendChild(linkedText);
    }

    propsElement.appendChild(row);
  }
}

// Render the routing table config tab
function renderRoutingConfig(device) {
  propsElement.innerHTML = "";

  var routes = device.config.routingTable || [];

  var addButton = document.createElement("button");
  addButton.className = "btn btn-sm btn-outline-primary mb-2";
  addButton.textContent = "+ Add Route";
  addButton.addEventListener("click", function () {
    var network = prompt("Destination network (e.g. 10.0.0.0):");
    var mask = prompt("Subnet mask (e.g. 255.255.255.0):");
    var nextHop = prompt("Next hop (e.g. 192.168.1.1):");
    if (network && mask && nextHop) {
      device.config.routingTable.push({ network: network, mask: mask, nextHop: nextHop });
      pushHistory();
      renderProps();
    }
  });
  propsElement.appendChild(addButton);

  if (routes.length === 0) {
    var emptyText = document.createElement("div");
    emptyText.className = "text-muted";
    emptyText.textContent = "No static routes configured.";
    propsElement.appendChild(emptyText);
    return;
  }

  var table = document.createElement("table");
  table.className = "table table-sm";
  table.innerHTML = "<thead><tr><th>Network</th><th>Mask</th><th>Next Hop</th><th></th></tr></thead>";
  var tbody = document.createElement("tbody");

  for (var i = 0; i < routes.length; i++) {
    var route = routes[i];
    var tr = document.createElement("tr");
    tr.innerHTML = "<td>" + escapeHtml(route.network) + "</td><td>" + escapeHtml(route.mask) + "</td><td>" + escapeHtml(route.nextHop) + "</td>";

    var deleteCell = document.createElement("td");
    var deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-sm btn-outline-danger";
    deleteBtn.textContent = "×";
    (function (index) {
      deleteBtn.addEventListener("click", function () {
        device.config.routingTable.splice(index, 1);
        pushHistory();
        renderProps();
      });
    })(i);
    deleteCell.appendChild(deleteBtn);
    tr.appendChild(deleteCell);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  propsElement.appendChild(table);
}

// Render the DHCP server config tab
function renderDhcpConfig(device) {
  propsElement.innerHTML = "";

  var dhcp = device.config.dhcpServer || {};
  var form = document.createElement("div");
  form.className = "sbx-config-form";

  var enableCheck = document.createElement("div");
  enableCheck.className = "form-check mb-2";
  var enableInput = document.createElement("input");
  enableInput.type = "checkbox";
  enableInput.className = "form-check-input";
  enableInput.checked = dhcp.enabled || false;
  enableInput.id = "dhcpServerToggle";
  var enableLabel = document.createElement("label");
  enableLabel.className = "form-check-label";
  enableLabel.htmlFor = "dhcpServerToggle";
  enableLabel.textContent = "Enable DHCP Server";
  enableCheck.appendChild(enableInput);
  enableCheck.appendChild(enableLabel);
  form.appendChild(enableCheck);

  var startLabel = document.createElement("label");
  startLabel.className = "form-label";
  startLabel.textContent = "Pool Start";
  var startInput = document.createElement("input");
  startInput.type = "text";
  startInput.className = "form-control";
  startInput.value = dhcp.poolStart || "";
  startInput.placeholder = "e.g. 192.168.1.100";
  form.appendChild(startLabel);
  form.appendChild(startInput);

  var endLabel = document.createElement("label");
  endLabel.className = "form-label mt-2";
  endLabel.textContent = "Pool End";
  var endInput = document.createElement("input");
  endInput.type = "text";
  endInput.className = "form-control";
  endInput.value = dhcp.poolEnd || "";
  endInput.placeholder = "e.g. 192.168.1.200";
  form.appendChild(endLabel);
  form.appendChild(endInput);

  var dnsLabel = document.createElement("label");
  dnsLabel.className = "form-label mt-2";
  dnsLabel.textContent = "DNS Server";
  var dnsInput = document.createElement("input");
  dnsInput.type = "text";
  dnsInput.className = "form-control";
  dnsInput.value = dhcp.dns || "";
  dnsInput.placeholder = "e.g. 8.8.8.8";
  form.appendChild(dnsLabel);
  form.appendChild(dnsInput);

  var saveButton = document.createElement("button");
  saveButton.className = "btn btn-teal mt-3";
  saveButton.textContent = "Save DHCP Settings";
  saveButton.addEventListener("click", function () {
    device.config.dhcpServer = {
      enabled: enableInput.checked,
      poolStart: startInput.value.trim(),
      poolEnd: endInput.value.trim(),
      dns: dnsInput.value.trim()
    };
    pushHistory();
    showSandboxToast({ title: "DHCP Saved", message: "DHCP server settings updated.", variant: "success", timeout: 2500 });
  });
  form.appendChild(saveButton);

  propsElement.appendChild(form);
}

// Render the DNS config tab
function renderDnsConfig(device) {
  propsElement.innerHTML = "";

  var dns = device.config.dnsServer || {};
  var records = dns.records || [];

  var enableCheck = document.createElement("div");
  enableCheck.className = "form-check mb-2";
  var enableInput = document.createElement("input");
  enableInput.type = "checkbox";
  enableInput.className = "form-check-input";
  enableInput.checked = dns.enabled || false;
  enableInput.id = "dnsServerToggle";
  var enableLabel = document.createElement("label");
  enableLabel.className = "form-check-label";
  enableLabel.htmlFor = "dnsServerToggle";
  enableLabel.textContent = "Enable DNS Server";
  enableCheck.appendChild(enableInput);
  enableCheck.appendChild(enableLabel);

  enableInput.addEventListener("change", function () {
    device.config.dnsServer.enabled = enableInput.checked;
    pushHistory();
  });
  propsElement.appendChild(enableCheck);

  var addButton = document.createElement("button");
  addButton.className = "btn btn-sm btn-outline-primary mb-2";
  addButton.textContent = "+ Add Record";
  addButton.addEventListener("click", function () {
    var hostname = prompt("Hostname (e.g. server.local):");
    var ip = prompt("IP Address:");
    if (hostname && ip) {
      if (!device.config.dnsServer.records) {
        device.config.dnsServer.records = [];
      }
      device.config.dnsServer.records.push({ hostname: hostname, ip: ip });
      pushHistory();
      renderProps();
    }
  });
  propsElement.appendChild(addButton);

  if (records.length === 0) {
    var emptyText = document.createElement("div");
    emptyText.className = "text-muted";
    emptyText.textContent = "No DNS records.";
    propsElement.appendChild(emptyText);
    return;
  }

  var table = document.createElement("table");
  table.className = "table table-sm";
  table.innerHTML = "<thead><tr><th>Hostname</th><th>IP</th><th></th></tr></thead>";
  var tbody = document.createElement("tbody");

  for (var i = 0; i < records.length; i++) {
    var record = records[i];
    var tr = document.createElement("tr");
    tr.innerHTML = "<td>" + escapeHtml(record.hostname) + "</td><td>" + escapeHtml(record.ip) + "</td>";
    var deleteCell = document.createElement("td");
    var deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-sm btn-outline-danger";
    deleteBtn.textContent = "×";
    (function (index) {
      deleteBtn.addEventListener("click", function () {
        device.config.dnsServer.records.splice(index, 1);
        pushHistory();
        renderProps();
      });
    })(i);
    deleteCell.appendChild(deleteBtn);
    tr.appendChild(deleteCell);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  propsElement.appendChild(table);
}

// Render the MAC address table config tab
function renderMacConfig(device) {
  propsElement.innerHTML = "";

  var macTable = device.config.macTable || [];
  if (macTable.length === 0) {
    propsElement.textContent = "No MAC table entries. Rebuild tables to populate.";
    var rebuildButton = document.createElement("button");
    rebuildButton.className = "btn btn-sm btn-outline-primary mt-2";
    rebuildButton.textContent = "Rebuild MAC Tables";
    rebuildButton.addEventListener("click", function () {
      rebuildMacTables();
      renderProps();
    });
    propsElement.appendChild(document.createElement("br"));
    propsElement.appendChild(rebuildButton);
    return;
  }

  var table = document.createElement("table");
  table.className = "table table-sm";
  table.innerHTML = "<thead><tr><th>MAC</th><th>Interface</th><th>Type</th></tr></thead>";
  var tbody = document.createElement("tbody");

  for (var i = 0; i < macTable.length; i++) {
    var entry = macTable[i];
    var tr = document.createElement("tr");
    tr.innerHTML = "<td>" + escapeHtml(entry.mac) + "</td><td>" + escapeHtml(entry.interface) + "</td><td>" + escapeHtml(entry.type) + "</td>";
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  propsElement.appendChild(table);
}


// Render the action logs in the Logs tab
function renderLogs() {
  if (!actionLogsElement) {
    return;
  }
  if (state.actionLogs.length === 0) {
    actionLogsElement.textContent = "No actions logged yet.";
    return;
  }
  var html = "";
  for (var i = state.actionLogs.length - 1; i >= 0; i--) {
    var log = state.actionLogs[i];
    html += '<div class="sbx-log-entry"><span class="sbx-log-time">' + escapeHtml(log.time) + '</span> ' + escapeHtml(log.text) + '</div>';
  }
  actionLogsElement.innerHTML = html;
}

// Render the packet logs in the Packets tab
function renderPackets() {
  if (!packetLogsElement) {
    return;
  }
  if (state.packets.length === 0) {
    packetLogsElement.textContent = "No packet activity yet.";
    return;
  }
  var html = "";
  for (var i = state.packets.length - 1; i >= 0; i--) {
    var packet = state.packets[i];
    html += '<div class="sbx-log-entry"><span class="sbx-log-time">' + escapeHtml(packet.time) + '</span> ' + escapeHtml(packet.text) + '</div>';
  }
  packetLogsElement.innerHTML = html;
}

// Render the console output
function renderConsole() {
  if (!consoleOutputElement) {
    return;
  }
  var html = "";
  for (var i = 0; i < state.consoleOutput.length; i++) {
    var entry = state.consoleOutput[i];
    html += '<div class="sbx-console-line ' + (entry.type || "") + '">' + entry.html + '</div>';
  }
  consoleOutputElement.innerHTML = html;
  consoleOutputElement.scrollTop = consoleOutputElement.scrollHeight;
}


// Master render function - calls all the individual render functions
function renderAll() {
  renderDevices();
  renderConnections();
  renderConnectionLabels();
  updateEmptyState();
  renderObjects();
  renderInspectActions();
  renderProps();
  updatePingVisibility();
  updateDeviceCountBadges();
  updateStatsBar();
  updateDeviceStatusIndicators();
  updateWarnings();
  updateMinimap();
  if (typeof renderObjectives === "function") {
    renderObjectives();
  }
}


// Take a snapshot of the current state for undo/redo history
function snapshotState() {
  return JSON.stringify({
    devices: state.devices,
    connections: state.connections
  });
}

// Push the current state onto the history stack
function pushHistory() {
  var snapshot = snapshotState();
  // Remove any future history if we went back
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(snapshot);
  state.historyIndex = state.history.length - 1;
  updateHistoryButtons();
}

// Replace the current topology with new devices and connections
function replaceTopology(newDevices, newConnections) {
  state.devices = [];
  for (var i = 0; i < newDevices.length; i++) {
    state.devices.push(normalizeDevice(newDevices[i]));
  }
  state.connections = [];
  for (var j = 0; j < newConnections.length; j++) {
    state.connections.push(normalizeConnection(newConnections[j]));
  }
  state.selectedIds = [];
}

// Finish a topology change - push history and optionally check tutorials
function finishTopologyChange(options) {
  pushHistory();
  renderAll();
  if (options && options.refreshTutorial && typeof notifyTutorialProgress === "function") {
    notifyTutorialProgress();
  }
  if (typeof markDirtyAndSaveSoon === "function") {
    markDirtyAndSaveSoon();
  }
}

// Restore the state from a history snapshot
function restoreHistory(index) {
  if (index < 0 || index >= state.history.length) {
    return;
  }
  var snapshot = parseJsonSafe(state.history[index]);
  if (!snapshot) {
    return;
  }
  state.devices = [];
  for (var i = 0; i < snapshot.devices.length; i++) {
    state.devices.push(normalizeDevice(snapshot.devices[i]));
  }
  state.connections = [];
  for (var j = 0; j < snapshot.connections.length; j++) {
    state.connections.push(normalizeConnection(snapshot.connections[j]));
  }
  state.selectedIds = [];
  state.historyIndex = index;
  updateHistoryButtons();
  renderAll();
}

// Enable or disable undo/redo buttons based on history position
function updateHistoryButtons() {
  var undoButton = getById("undoBtn");
  var redoButton = getById("redoBtn");
  if (undoButton) {
    undoButton.disabled = state.historyIndex <= 0;
  }
  if (redoButton) {
    redoButton.disabled = state.historyIndex >= state.history.length - 1;
  }
}


// Add a new device to the canvas
function addDevice(deviceType) {
  var position = getNextDevicePosition();
  var newDevice = normalizeDevice({
    type: deviceType,
    x: position.x,
    y: position.y
  });

  // Auto assign network settings
  var autoIp = pickAvailableAutoLanIp();
  if (autoIp && newDevice.type !== "cloud") {
    newDevice.config.ipAddress = autoIp;
    newDevice.config.subnetMask = AUTO_NETWORK.mask;
    var category = DEVICE_TYPES[newDevice.type] ? DEVICE_TYPES[newDevice.type].category : "";
    if (category === "End Devices") {
      newDevice.config.defaultGateway = AUTO_NETWORK.gateway;
    }
  }
  updateDeviceStatus(newDevice);
  state.devices.push(newDevice);
  state.selectedIds = [newDevice.id];
  finishTopologyChange({ refreshTutorial: true });
  addActionLog("Added " + newDevice.name);

  // Show connection suggestions in free mode
  if (typeof showConnectionSuggestions === "function") {
    showConnectionSuggestions(newDevice);
  }

  // Reset idle timer
  if (typeof resetIdleTimer === "function") {
    resetIdleTimer();
  }

  return newDevice;
}

// Delete one or more devices and their connections
function deleteDevices(deviceIds) {
  if (!deviceIds || deviceIds.length === 0) {
    return;
  }

  for (var i = 0; i < deviceIds.length; i++) {
    var deviceId = deviceIds[i];

    // Remove connections to this device
    var remainingConnections = [];
    for (var j = 0; j < state.connections.length; j++) {
      var connection = state.connections[j];
      if (connection.from !== deviceId && connection.to !== deviceId) {
        remainingConnections.push(connection);
      }
    }
    state.connections = remainingConnections;

    // Remove the device
    var remainingDevices = [];
    for (var k = 0; k < state.devices.length; k++) {
      if (state.devices[k].id !== deviceId) {
        remainingDevices.push(state.devices[k]);
      }
    }
    state.devices = remainingDevices;
  }

  // Clear selection if deleted device was selected
  var newSelected = [];
  for (var s = 0; s < state.selectedIds.length; s++) {
    if (deviceIds.indexOf(state.selectedIds[s]) === -1) {
      newSelected.push(state.selectedIds[s]);
    }
  }
  state.selectedIds = newSelected;

  finishTopologyChange({ refreshTutorial: true });
  addActionLog("Deleted " + deviceIds.length + " device(s)");
}

// Create a connection between two devices
function createConnection(fromId, toId) {
  // Check if a connection already exists between these two devices
  for (var i = 0; i < state.connections.length; i++) {
    var existing = state.connections[i];
    if ((existing.from === fromId && existing.to === toId) || (existing.from === toId && existing.to === fromId)) {
      showSandboxToast({ title: "Already connected", message: "These devices are already connected.", variant: "warning", timeout: 2500 });
      return;
    }
  }

  // Pick interfaces for the connection
  var fromDevice = findDevice(fromId);
  var toDevice = findDevice(toId);
  var fromInterface = pickInterface(fromDevice);
  var toInterface = pickInterface(toDevice);

  var newConnection = normalizeConnection({
    from: fromId,
    to: toId,
    fromInterface: fromInterface,
    toInterface: toInterface
  });

  state.connections.push(newConnection);

  // Link the interfaces
  if (fromDevice && fromInterface) {
    clearInterfaceLink(fromDevice, fromInterface, toDevice ? toDevice.name : "");
  }
  if (toDevice && toInterface) {
    clearInterfaceLink(toDevice, toInterface, fromDevice ? fromDevice.name : "");
  }

  rebuildMacTables();
  finishTopologyChange({ refreshTutorial: true });
  addActionLog("Connected " + (fromDevice ? fromDevice.name : "?") + " to " + (toDevice ? toDevice.name : "?"));
}

// Delete a connection by its id
function deleteConnection(connectionId) {
  var remainingConnections = [];
  for (var i = 0; i < state.connections.length; i++) {
    if (state.connections[i].id !== connectionId) {
      remainingConnections.push(state.connections[i]);
    }
  }
  state.connections = remainingConnections;
  rebuildMacTables();
  finishTopologyChange({ refreshTutorial: true });
  addActionLog("Deleted a connection");
}

// Pick the first available (unlinked) interface on a device
function pickInterface(device) {
  if (!device || !device.config || !device.config.interfaces) {
    return null;
  }
  for (var i = 0; i < device.config.interfaces.length; i++) {
    var iface = device.config.interfaces[i];
    if (!iface.linked && iface.status === "up") {
      return iface.name;
    }
  }
  // If all are linked, just return the first one
  if (device.config.interfaces.length > 0) {
    return device.config.interfaces[0].name;
  }
  return null;
}

// Set the linked field on an interface
function clearInterfaceLink(device, interfaceName, linkedDeviceName) {
  if (!device || !device.config || !device.config.interfaces) {
    return;
  }
  for (var i = 0; i < device.config.interfaces.length; i++) {
    if (device.config.interfaces[i].name === interfaceName) {
      device.config.interfaces[i].linked = linkedDeviceName || null;
      break;
    }
  }
}

// Duplicate the currently selected devices
function duplicateSelected() {
  if (state.selectedIds.length === 0) {
    return;
  }

  var newIds = [];
  for (var i = 0; i < state.selectedIds.length; i++) {
    var originalDevice = findDevice(state.selectedIds[i]);
    if (!originalDevice) {
      continue;
    }

    var newDevice = normalizeDevice({
      type: originalDevice.type,
      x: originalDevice.x + 80,
      y: originalDevice.y + 80,
      name: originalDevice.name + " Copy"
    });

    // Copy IP settings
    if (originalDevice.config) {
      newDevice.config.subnetMask = originalDevice.config.subnetMask;
      newDevice.config.defaultGateway = originalDevice.config.defaultGateway;
      newDevice.config.dhcpEnabled = originalDevice.config.dhcpEnabled;
      newDevice.vlan = originalDevice.vlan || 0;
      // Give it a new auto IP so there is no conflict
      var newIp = pickAvailableAutoLanIp();
      if (newIp) {
        newDevice.config.ipAddress = newIp;
      }
    }

    updateDeviceStatus(newDevice);
    state.devices.push(newDevice);
    newIds.push(newDevice.id);
  }

  state.selectedIds = newIds;
  finishTopologyChange({ refreshTutorial: true });
  addActionLog("Duplicated " + newIds.length + " device(s)");
}

// Toggle a connection up or down
function toggleConnectionUpDown(connectionId) {
  for (var i = 0; i < state.connections.length; i++) {
    if (state.connections[i].id === connectionId) {
      state.connections[i].isUp = !state.connections[i].isUp;
      var status = state.connections[i].isUp ? "up" : "down";
      addActionLog("Connection set to " + status);
      finishTopologyChange({ refreshTutorial: false });
      return;
    }
  }
}


// Save topology to the server
function handleSaveTopology() {
  var modal = getById("saveTopologyModal");
  if (modal) {
    openSaveModal();
  }
}

// Open the save modal and fill in the preview
function openSaveModal() {
  renderSummary(getById("saveTopologySummary"));
  renderTopologyPreview(getById("saveTopologyPreview"));
  var modal = new bootstrap.Modal(getById("saveTopologyModal"));
  modal.show();
}

// Confirm saving the topology
function confirmSaveTopology() {
  var nameInput = getById("saveTopologyName");
  var name = nameInput ? nameInput.value.trim() : "";
  if (!name) {
    showSandboxToast({ title: "Name required", message: "Please enter a topology name.", variant: "warning", timeout: 2500 });
    return;
  }

  var user = getStoredUser();
  if (!user || !user.email) {
    showSandboxToast({ title: "Not logged in", message: "Please log in to save topologies.", variant: "danger", timeout: 3000 });
    return;
  }

  var payload = {
    email: user.email,
    name: name,
    devices: state.devices,
    connections: state.connections
  };

  var apiBase = String(window.API_BASE || "").replace(/\/$/, "");
  var endpoint = (window.ENDPOINTS && window.ENDPOINTS.sandbox && window.ENDPOINTS.sandbox.saveTopology) || "/save-topology";

  fetch(apiBase + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (data && data.success) {
        showSandboxToast({ title: "Saved!", message: "Topology '" + name + "' saved.", variant: "success", timeout: 3000 });
        var modalEl = getById("saveTopologyModal");
        var modalInstance = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
        if (modalInstance) { modalInstance.hide(); }
      } else {
        showSandboxToast({ title: "Save failed", message: (data && data.message) || "Unknown error.", variant: "danger", timeout: 3000 });
      }
    })
    .catch(function (error) {
      showSandboxToast({ title: "Save failed", message: error.message || "Network error.", variant: "danger", timeout: 3000 });
    });
}

// Confirm clearing the workspace
function confirmClearTopology() {
  var confirmed = confirm("Clear the workspace? This will remove all devices and connections.");
  if (!confirmed) {
    return;
  }
  state.devices = [];
  state.connections = [];
  state.selectedIds = [];
  pushHistory();
  renderAll();
  addActionLog("Workspace cleared");
  showSandboxToast({ title: "Cleared", message: "Workspace cleared.", variant: "info", timeout: 2500 });
}

// Refresh the list of saved topologies in the load modal
function refreshTopologyList() {
  var listElement = getById("topologyList");
  if (!listElement) {
    return;
  }

  var user = getStoredUser();
  if (!user || !user.email) {
    listElement.innerHTML = "<tr><td colspan='3'>Log in to view saved topologies.</td></tr>";
    return;
  }

  listElement.innerHTML = "<tr><td colspan='3'>Loading...</td></tr>";

  var apiBase = String(window.API_BASE || "").replace(/\/$/, "");
  var endpoint = (window.ENDPOINTS && window.ENDPOINTS.sandbox && window.ENDPOINTS.sandbox.loadTopologies) || "/load-topologies";

  fetch(apiBase + endpoint + "?email=" + encodeURIComponent(user.email))
    .then(function (response) { return response.json(); })
    .then(function (data) {
      var list = (data && data.topologies) || data || [];
      if (!Array.isArray(list)) { list = []; }
      if (list.length === 0) {
        listElement.innerHTML = "<tr><td colspan='3'>No saved topologies yet.</td></tr>";
        return;
      }

      listElement.innerHTML = "";
      for (var i = 0; i < list.length; i++) {
        var topology = list[i];
        var tr = document.createElement("tr");

        var nameCell = document.createElement("td");
        nameCell.textContent = topology.name || "Unnamed";
        tr.appendChild(nameCell);

        var dateCell = document.createElement("td");
        dateCell.textContent = topology.created_at ? new Date(topology.created_at).toLocaleDateString() : "—";
        tr.appendChild(dateCell);

        var actionsCell = document.createElement("td");
        actionsCell.className = "text-end";

        var loadButton = document.createElement("button");
        loadButton.className = "btn btn-sm btn-teal me-1";
        loadButton.textContent = "Load";

        var deleteButton = document.createElement("button");
        deleteButton.className = "btn btn-sm btn-outline-danger";
        deleteButton.textContent = "Delete";

        (function (topoId) {
          loadButton.addEventListener("click", function () {
            loadTopologyById(topoId);
          });
          deleteButton.addEventListener("click", function () {
            deleteTopology(topoId);
          });
        })(topology.id);

        actionsCell.appendChild(loadButton);
        actionsCell.appendChild(deleteButton);
        tr.appendChild(actionsCell);
        listElement.appendChild(tr);
      }
    })
    .catch(function () {
      listElement.innerHTML = "<tr><td colspan='3'>Failed to load topologies.</td></tr>";
    });
}

// Load a saved topology by its id
function loadTopologyById(topologyId) {
  var user = getStoredUser();
  if (!user || !user.email) {
    return;
  }

  var apiBase = String(window.API_BASE || "").replace(/\/$/, "");
  var endpointTemplate = (window.ENDPOINTS && window.ENDPOINTS.sandbox && window.ENDPOINTS.sandbox.loadTopology) || "/load-topology/:topologyId";
  var endpoint = endpointTemplate.replace(":topologyId", encodeURIComponent(topologyId));

  fetch(apiBase + endpoint + "?email=" + encodeURIComponent(user.email))
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (data && data.success && data.devices) {
        replaceTopology(data.devices, data.connections || []);
        applyAutoNetworkDefaults();
        pushHistory();
        renderAll();
        addActionLog("Loaded topology: " + (data.name || "unnamed"));
        showSandboxToast({ title: "Loaded", message: "Topology loaded successfully.", variant: "success", timeout: 3000 });
        var topoModalEl = getById("topologyModal");
        var topoModalInst = topoModalEl ? bootstrap.Modal.getInstance(topoModalEl) : null;
        if (topoModalInst) { topoModalInst.hide(); }
      }
    })
    .catch(function () {
      showSandboxToast({ title: "Load failed", message: "Could not load topology.", variant: "danger", timeout: 3000 });
    });
}

// Delete a saved topology
function deleteTopology(topologyId) {
  var confirmed = confirm("Delete this saved topology?");
  if (!confirmed) {
    return;
  }

  var user = getStoredUser();
  if (!user || !user.email) {
    return;
  }

  var apiBase = String(window.API_BASE || "").replace(/\/$/, "");
  var endpointTemplate = (window.ENDPOINTS && window.ENDPOINTS.sandbox && window.ENDPOINTS.sandbox.deleteTopology) || "/delete-topology/:topologyId";
  var endpoint = endpointTemplate.replace(":topologyId", encodeURIComponent(topologyId));

  fetch(apiBase + endpoint, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email })
  })
    .then(function () {
      refreshTopologyList();
      showSandboxToast({ title: "Deleted", message: "Topology deleted.", variant: "info", timeout: 2500 });
    })
    .catch(function () {
      showSandboxToast({ title: "Delete failed", message: "Could not delete topology.", variant: "danger", timeout: 3000 });
    });
}


// Console command history stored in localStorage
function loadConsoleHistory() {
  var saved = parseJsonSafe(localStorage.getItem("sbx_console_history"));
  if (saved && Array.isArray(saved)) {
    state.commandHistory = saved;
  }
}

function saveConsoleHistory() {
  localStorage.setItem("sbx_console_history", JSON.stringify(state.commandHistory.slice(-50)));
}

function addCommandToHistory(command) {
  state.commandHistory.push(command);
  state.commandHistoryIndex = state.commandHistory.length;
  saveConsoleHistory();
}

function stepCommandHistory(direction) {
  var newIndex = state.commandHistoryIndex + direction;
  if (newIndex < 0) {
    newIndex = 0;
  }
  if (newIndex >= state.commandHistory.length) {
    state.commandHistoryIndex = state.commandHistory.length;
    return "";
  }
  state.commandHistoryIndex = newIndex;
  return state.commandHistory[newIndex] || "";
}

// Add text output to the console
function addConsoleOutput(html, type) {
  state.consoleOutput.push({ html: html, type: type || "" });
  renderConsole();
}

// Add an action log entry
function addActionLog(text) {
  state.actionLogs.push({ time: new Date().toLocaleTimeString(), text: text });
  renderLogs();
}

// Clear the console output
function clearConsoleOutput() {
  state.consoleOutput = [];
  renderConsole();
}

// Resolve a console command endpoint - find the device by name or IP
function resolveCommandEndpoints(source, destination) {
  var sourceDevice = null;
  var destinationDevice = null;

  if (source) {
    sourceDevice = findDeviceByIdentifier(source);
  } else if (state.selectedIds.length === 1) {
    sourceDevice = findDevice(state.selectedIds[0]);
  }

  if (destination) {
    destinationDevice = findDeviceByIdentifier(destination);
  }

  return { source: sourceDevice, destination: destinationDevice };
}

// Known console commands for tab completion
var CONSOLE_COMMANDS = ["help", "devices", "connections", "status", "ping", "traceroute", "ipconfig", "configure", "dhcp", "clear", "save", "reset", "show", "arp", "explain"];

// Execute a console command
function executeCommand(commandText) {
  if (!commandText || !commandText.trim()) {
    return;
  }

  var trimmed = commandText.trim();
  addConsoleOutput('<span class="text-info">$ ' + escapeHtml(trimmed) + '</span>', "sbx-console-cmd");
  addCommandToHistory(trimmed);

  var parts = trimmed.split(/\s+/);
  var command = parts[0].toLowerCase();
  var args = parts.slice(1);

  if (command === "help") {
    addConsoleOutput("Available commands: " + CONSOLE_COMMANDS.join(", "), "");
    addConsoleOutput("  ping &lt;source&gt; &lt;destination&gt; - Test connectivity", "");
    addConsoleOutput("  traceroute &lt;source&gt; &lt;destination&gt; - Show route", "");
    addConsoleOutput("  ipconfig &lt;device&gt; - Show IP configuration", "");
    addConsoleOutput("  configure &lt;device&gt; ip &lt;address&gt; - Set IP address", "");
    addConsoleOutput("  dhcp &lt;device&gt; - Request DHCP address", "");
    addConsoleOutput("  arp &lt;device&gt; - Show ARP table", "");
    addConsoleOutput("  explain - Explain the current topology", "");
    addConsoleOutput("  devices - List all devices", "");
    addConsoleOutput("  connections - List all connections", "");
    addConsoleOutput("  status - Show network status", "");
    addConsoleOutput("  show mac|routes|dhcp|dns &lt;device&gt; - Show table info", "");
    addConsoleOutput("  clear - Clear console", "");
    addConsoleOutput("  save - Save topology", "");
    addConsoleOutput("  reset - Clear workspace", "");
    return;
  }

  if (command === "clear") {
    clearConsoleOutput();
    return;
  }

  if (command === "devices") {
    if (state.devices.length === 0) {
      addConsoleOutput("No devices on canvas.", "");
      return;
    }
    for (var i = 0; i < state.devices.length; i++) {
      var device = state.devices[i];
      var ip = (device.config && device.config.ipAddress) ? device.config.ipAddress : "no IP";
      addConsoleOutput("  " + device.name + " (" + device.type + ") - " + ip, "");
    }
    return;
  }

  if (command === "connections") {
    if (state.connections.length === 0) {
      addConsoleOutput("No connections.", "");
      return;
    }
    for (var j = 0; j < state.connections.length; j++) {
      var conn = state.connections[j];
      var fromDev = findDevice(conn.from);
      var toDev = findDevice(conn.to);
      var fromName = fromDev ? fromDev.name : "?";
      var toName = toDev ? toDev.name : "?";
      var connType = CONNECTION_TYPES[conn.type] ? CONNECTION_TYPES[conn.type].label : conn.type;
      var upDown = conn.isUp ? "up" : "DOWN";
      var interfaceInfo = "";
      if (conn.fromInterface || conn.toInterface) {
        interfaceInfo = " [" + (conn.fromInterface || "?") + " ↔ " + (conn.toInterface || "?") + "]";
      }
      addConsoleOutput("  " + fromName + " ↔ " + toName + " (" + connType + ", " + upDown + ")" + interfaceInfo, "");
    }
    return;
  }

  if (command === "status") {
    addConsoleOutput("Devices: " + state.devices.length + " | Connections: " + state.connections.length, "");
    var configuredCount = 0;
    for (var s = 0; s < state.devices.length; s++) {
      if (state.devices[s].config && state.devices[s].config.ipAddress) {
        configuredCount++;
      }
    }
    addConsoleOutput("Configured: " + configuredCount + "/" + state.devices.length, "");
    var conflicts = findSubnetConflicts();
    if (conflicts.length > 0) {
      addConsoleOutput('<span class="text-warning">Warnings: ' + conflicts.length + ' conflict(s) detected</span>', "");
    } else {
      addConsoleOutput('<span class="text-success">No conflicts detected.</span>', "");
    }
    return;
  }

  if (command === "ping") {
    var endpoints = resolveCommandEndpoints(args[0], args[1] || args[0]);
    if (args.length === 1) {
      endpoints = resolveCommandEndpoints(null, args[0]);
    }
    if (!endpoints.source) {
      addConsoleOutput('<span class="text-danger">Source device not found. Select a device or specify: ping &lt;source&gt; &lt;dest&gt;</span>', "");
      return;
    }
    if (!endpoints.destination) {
      addConsoleOutput('<span class="text-danger">Destination device not found.</span>', "");
      return;
    }
    var pingResult = executePing(endpoints.source, endpoints.destination);
    state.pingInspector = pingResult;
    if (pingResult.success) {
      addConsoleOutput('<span class="text-success">' + escapeHtml(pingResult.message) + '</span>', "");
      addPacketLog("PING " + endpoints.source.name + " → " + endpoints.destination.name + ": " + pingResult.latency + "ms");
      animatePacket(pingResult.path);
    } else {
      addConsoleOutput('<span class="text-danger">' + escapeHtml(pingResult.message) + '</span>', "");
    }
    if (typeof notifyTutorialProgress === "function") {
      notifyTutorialProgress();
    }
    return;
  }

  if (command === "traceroute") {
    var traceEndpoints = resolveCommandEndpoints(args[0], args[1] || args[0]);
    if (args.length === 1) {
      traceEndpoints = resolveCommandEndpoints(null, args[0]);
    }
    if (!traceEndpoints.source || !traceEndpoints.destination) {
      addConsoleOutput('<span class="text-danger">Specify source and destination.</span>', "");
      return;
    }
    var path = findPath(traceEndpoints.source.id, traceEndpoints.destination.id);
    if (!path) {
      addConsoleOutput('<span class="text-danger">No route found.</span>', "");
      return;
    }
    addConsoleOutput("Tracing route to " + traceEndpoints.destination.name + ":", "");
    for (var h = 0; h < path.length; h++) {
      var hopDevice = findDevice(path[h]);
      var hopIp = (hopDevice && hopDevice.config) ? hopDevice.config.ipAddress || "no IP" : "?";
      addConsoleOutput("  " + (h + 1) + ". " + (hopDevice ? hopDevice.name : "?") + " (" + hopIp + ")", "");
    }
    animatePacket(path);
    return;
  }

  if (command === "ipconfig") {
    var targetDevice = findDeviceByIdentifier(args[0]);
    if (!targetDevice && state.selectedIds.length === 1) {
      targetDevice = findDevice(state.selectedIds[0]);
    }
    if (!targetDevice) {
      addConsoleOutput('<span class="text-danger">Device not found.</span>', "");
      return;
    }
    addConsoleOutput("Device: " + targetDevice.name + " (" + targetDevice.type + ")", "");
    addConsoleOutput("  IP Address: " + (targetDevice.config.ipAddress || "not set"), "");
    addConsoleOutput("  Subnet Mask: " + (targetDevice.config.subnetMask || "not set"), "");
    addConsoleOutput("  Gateway: " + (targetDevice.config.defaultGateway || "not set"), "");
    addConsoleOutput("  MAC: " + (targetDevice.config.macAddress || "not set"), "");
    addConsoleOutput("  DHCP: " + (targetDevice.config.dhcpEnabled ? "enabled" : "disabled"), "");
    if (targetDevice.vlan > 0) {
      addConsoleOutput("  VLAN: " + targetDevice.vlan, "");
    }
    return;
  }

  if (command === "configure") {
    var configDevice = findDeviceByIdentifier(args[0]);
    if (!configDevice) {
      addConsoleOutput('<span class="text-danger">Device not found.</span>', "");
      return;
    }
    if (args[1] === "ip" && args[2]) {
      if (!isValidIpAddress(args[2])) {
        addConsoleOutput('<span class="text-danger">Invalid IP address.</span>', "");
        return;
      }
      configDevice.config.ipAddress = args[2];
      updateDeviceStatus(configDevice);
      finishTopologyChange({ refreshTutorial: true });
      addConsoleOutput('<span class="text-success">Set IP of ' + configDevice.name + ' to ' + args[2] + '</span>', "");
    } else if (args[1] === "gateway" && args[2]) {
      configDevice.config.defaultGateway = args[2];
      finishTopologyChange({ refreshTutorial: true });
      addConsoleOutput('<span class="text-success">Set gateway of ' + configDevice.name + ' to ' + args[2] + '</span>', "");
    } else if (args[1] === "mask" && args[2]) {
      configDevice.config.subnetMask = args[2];
      finishTopologyChange({ refreshTutorial: true });
      addConsoleOutput('<span class="text-success">Set mask of ' + configDevice.name + ' to ' + args[2] + '</span>', "");
    } else if (args[1] === "name" && args[2]) {
      configDevice.name = args.slice(2).join(" ");
      finishTopologyChange({ refreshTutorial: true });
      addConsoleOutput('<span class="text-success">Renamed device to ' + configDevice.name + '</span>', "");
    } else if (args[1] === "vlan" && args[2]) {
      configDevice.vlan = Number(args[2]) || 0;
      finishTopologyChange({ refreshTutorial: true });
      addConsoleOutput('<span class="text-success">Set VLAN of ' + configDevice.name + ' to ' + configDevice.vlan + '</span>', "");
    } else {
      addConsoleOutput("Usage: configure &lt;device&gt; ip|gateway|mask|name|vlan &lt;value&gt;", "");
    }
    return;
  }

  if (command === "dhcp") {
    var dhcpDevice = findDeviceByIdentifier(args[0]);
    if (!dhcpDevice && state.selectedIds.length === 1) {
      dhcpDevice = findDevice(state.selectedIds[0]);
    }
    if (!dhcpDevice) {
      addConsoleOutput('<span class="text-danger">Device not found.</span>', "");
      return;
    }
    var dhcpResult = requestDhcp(dhcpDevice);
    if (dhcpResult.success) {
      addConsoleOutput('<span class="text-success">' + escapeHtml(dhcpResult.message) + '</span>', "");
      finishTopologyChange({ refreshTutorial: true });
    } else {
      addConsoleOutput('<span class="text-danger">' + escapeHtml(dhcpResult.message) + '</span>', "");
    }
    return;
  }

  if (command === "arp") {
    var arpDevice = findDeviceByIdentifier(args[0]);
    if (!arpDevice && state.selectedIds.length === 1) {
      arpDevice = findDevice(state.selectedIds[0]);
    }
    if (!arpDevice) {
      addConsoleOutput('<span class="text-danger">Device not found. Usage: arp &lt;device&gt;</span>', "");
      return;
    }
    var arpTable = buildArpTable(arpDevice);
    if (arpTable.length === 0) {
      addConsoleOutput("ARP table for " + arpDevice.name + " is empty (no reachable neighbours with IPs).", "");
      return;
    }
    addConsoleOutput("ARP table for " + arpDevice.name + ":", "");
    addConsoleOutput("  IP Address         MAC Address         Interface   Type", "");
    for (var a = 0; a < arpTable.length; a++) {
      var entry = arpTable[a];
      addConsoleOutput("  " + entry.ip.padEnd(20) + entry.mac.padEnd(20) + entry.interface.padEnd(12) + entry.type, "");
    }
    return;
  }

  if (command === "explain") {
    var explanation = generateTopologySummary();
    var lines = explanation.split("\n");
    for (var e = 0; e < lines.length; e++) {
      addConsoleOutput(escapeHtml(lines[e]), "");
    }
    return;
  }

  if (command === "save") {
    handleSaveTopology();
    addConsoleOutput("Opening save dialog...", "");
    return;
  }

  if (command === "reset") {
    confirmClearTopology();
    return;
  }

  if (command === "show") {
    var subcommand = args[0] ? args[0].toLowerCase() : "";
    var showDevice = findDeviceByIdentifier(args[1]);
    if (!showDevice && state.selectedIds.length === 1) {
      showDevice = findDevice(state.selectedIds[0]);
    }
    if (!showDevice) {
      addConsoleOutput('<span class="text-danger">Device not found.</span>', "");
      return;
    }

    if (subcommand === "mac") {
      rebuildMacTables();
      var mac = showDevice.config.macTable || [];
      if (mac.length === 0) {
        addConsoleOutput("MAC table for " + showDevice.name + " is empty.", "");
      } else {
        addConsoleOutput("MAC table for " + showDevice.name + ":", "");
        for (var mi = 0; mi < mac.length; mi++) {
          addConsoleOutput("  " + mac[mi].mac + " on " + mac[mi].interface + " (" + mac[mi].type + ")", "");
        }
      }
    } else if (subcommand === "routes") {
      var routes = showDevice.config.routingTable || [];
      if (routes.length === 0) {
        addConsoleOutput("No routes for " + showDevice.name + ".", "");
      } else {
        addConsoleOutput("Routing table for " + showDevice.name + ":", "");
        for (var ri = 0; ri < routes.length; ri++) {
          addConsoleOutput("  " + routes[ri].network + "/" + routes[ri].mask + " via " + routes[ri].nextHop, "");
        }
      }
    } else if (subcommand === "dhcp") {
      var dhcpInfo = showDevice.config.dhcpServer || {};
      addConsoleOutput("DHCP Server on " + showDevice.name + ": " + (dhcpInfo.enabled ? "enabled" : "disabled"), "");
      if (dhcpInfo.enabled) {
        addConsoleOutput("  Pool: " + (dhcpInfo.poolStart || "?") + " - " + (dhcpInfo.poolEnd || "?"), "");
        addConsoleOutput("  DNS: " + (dhcpInfo.dns || "none"), "");
      }
    } else if (subcommand === "dns") {
      var dnsInfo = showDevice.config.dnsServer || {};
      addConsoleOutput("DNS Server on " + showDevice.name + ": " + (dnsInfo.enabled ? "enabled" : "disabled"), "");
      var dnsRecords = dnsInfo.records || [];
      for (var di = 0; di < dnsRecords.length; di++) {
        addConsoleOutput("  " + dnsRecords[di].hostname + " → " + dnsRecords[di].ip, "");
      }
    } else {
      addConsoleOutput("Usage: show mac|routes|dhcp|dns &lt;device&gt;", "");
    }
    return;
  }

  // Unknown command
  addConsoleOutput('<span class="text-warning">Unknown command: ' + escapeHtml(command) + '. Type "help" for available commands.</span>', "");
}

// Register the console API on the window for external access
function registerConsoleApi() {
  window.sandboxConsole = {
    exec: executeCommand,
    output: addConsoleOutput,
    clear: clearConsoleOutput,
    showWelcome: function () {
      addConsoleOutput('<span class="text-muted">Welcome to the Netology Sandbox Console.</span>', "");
      addConsoleOutput('<span class="text-muted">Type <strong>help</strong> for a list of commands.</span>', "");
    }
  };
}


// Bind tooltips on hover for elements with data-tooltip attribute
var activeTooltip = null;
var tooltipTimer = null;

function bindTooltips() {
  // Create a floating tooltip element
  var tip = document.createElement("div");
  tip.className = "sbx-tooltip";
  tip.style.cssText = "position:fixed;z-index:9999;padding:5px 10px;border-radius:7px;" +
    "font-size:.72rem;font-weight:600;color:#fff;pointer-events:none;" +
    "background:rgba(15,23,42,.88);backdrop-filter:blur(6px);" +
    "box-shadow:0 4px 12px rgba(0,0,0,.18);white-space:nowrap;" +
    "opacity:0;transition:opacity .15s ease;max-width:260px;";
  document.body.appendChild(tip);
  activeTooltip = tip;

  document.addEventListener("mouseover", function (event) {
    var target = event.target.closest("[data-tooltip]");
    if (!target) {
      return;
    }
    // Remove any native title so it doesn't double up
    target.removeAttribute("title");
    var text = target.getAttribute("data-tooltip");
    if (!text) {
      return;
    }
    clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(function () {
      tip.textContent = text;
      tip.style.opacity = "1";
      // Position near the element
      var rect = target.getBoundingClientRect();
      var tipX = rect.left + rect.width / 2;
      var tipY = rect.bottom + 8;
      // Keep it on screen
      tip.style.left = Math.min(tipX, window.innerWidth - 180) + "px";
      tip.style.top = tipY + "px";
      tip.style.transform = "translateX(-50%)";
      // If it would go below the viewport, show above
      if (tipY + 40 > window.innerHeight) {
        tip.style.top = (rect.top - 32) + "px";
      }
    }, 350);
  });

  document.addEventListener("mouseout", function (event) {
    var target = event.target.closest("[data-tooltip]");
    if (target) {
      clearTimeout(tooltipTimer);
      tip.style.opacity = "0";
    }
  });
}

// Bind drag events on the device library cards
function bindLibraryDrag() {
  var deviceCards = querySelectorAll(".sbx-device-card");
  for (var i = 0; i < deviceCards.length; i++) {
    var card = deviceCards[i];

    // Click to add device
    card.addEventListener("click", function (event) {
      var deviceType = this.getAttribute("data-device");
      if (deviceType) {
        addDevice(deviceType);
      }
    });

    // Drag to add device
    card.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) {
        return;
      }
      var deviceType = this.getAttribute("data-device");
      if (!deviceType) {
        return;
      }

      var ghost = createDragGhost(deviceType);
      positionDragGhost(ghost, event.clientX, event.clientY);

      function onMove(moveEvent) {
        positionDragGhost(ghost, moveEvent.clientX, moveEvent.clientY);
      }

      function onUp(upEvent) {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        if (ghost.parentNode) {
          ghost.parentNode.removeChild(ghost);
        }

        // Check if dropped on the canvas
        if (stageElement) {
          var rect = stageElement.getBoundingClientRect();
          if (upEvent.clientX >= rect.left && upEvent.clientX <= rect.right && upEvent.clientY >= rect.top && upEvent.clientY <= rect.bottom) {
            var worldPoint = toWorldPoint(upEvent.clientX, upEvent.clientY);
            var newDevice = normalizeDevice({
              type: deviceType,
              x: state.snap ? Math.round(worldPoint.x / GRID_SIZE) * GRID_SIZE : worldPoint.x,
              y: state.snap ? Math.round(worldPoint.y / GRID_SIZE) * GRID_SIZE : worldPoint.y
            });

            var autoIp = pickAvailableAutoLanIp();
            if (autoIp && newDevice.type !== "cloud") {
              newDevice.config.ipAddress = autoIp;
              newDevice.config.subnetMask = AUTO_NETWORK.mask;
              var category = DEVICE_TYPES[newDevice.type] ? DEVICE_TYPES[newDevice.type].category : "";
              if (category === "End Devices") {
                newDevice.config.defaultGateway = AUTO_NETWORK.gateway;
              }
            }
            updateDeviceStatus(newDevice);
            state.devices.push(newDevice);
            state.selectedIds = [newDevice.id];
            finishTopologyChange({ refreshTutorial: true });
            addActionLog("Added " + newDevice.name + " (dragged)");
          }
        }
      }

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    });
  }
}


// Bind all toolbar button events
function bindToolbar() {
  // Select tool button
  var selectButton = getById("toolSelectBtn");
  if (selectButton) {
    selectButton.addEventListener("click", function () {
      state.tool = TOOL.SELECT;
      state.connectFrom = null;
      var allToolButtons = querySelectorAll("[data-tool]");
      for (var i = 0; i < allToolButtons.length; i++) {
        allToolButtons[i].classList.remove("is-active");
      }
      selectButton.classList.add("is-active");
      setTip("Select and drag devices.");
      updateConnectionTypeGroupVisibility();
    });
  }

  // Connect tool button
  var connectButton = getById("toolConnectBtn");
  if (connectButton) {
    connectButton.addEventListener("click", function () {
      state.tool = TOOL.CONNECT;
      state.connectFrom = null;
      var allToolButtons = querySelectorAll("[data-tool]");
      for (var i = 0; i < allToolButtons.length; i++) {
        allToolButtons[i].classList.remove("is-active");
      }
      connectButton.classList.add("is-active");
      setTip("Select a device to start a connection.");
      updateConnectionTypeGroupVisibility();
    });
  }

  // Connection type dropdown
  var connTypeDropButton = getById("connTypeDropBtn");
  var connTypeMenu = getById("connTypeMenu");
  if (connTypeDropButton && connTypeMenu) {
    connTypeDropButton.addEventListener("click", function () {
      connTypeMenu.classList.toggle("is-open");
    });

    var connTypeItems = connTypeMenu.querySelectorAll("[data-conn-type]");
    for (var c = 0; c < connTypeItems.length; c++) {
      connTypeItems[c].addEventListener("click", function () {
        state.connectType = this.getAttribute("data-conn-type");
        for (var j = 0; j < connTypeItems.length; j++) {
          connTypeItems[j].classList.remove("is-active");
        }
        this.classList.add("is-active");
        connTypeMenu.classList.remove("is-open");
      });
    }
  }

  // Template dropdown toggle
  var templateDropButton = getById("templateDropBtn");
  var templateMenu = getById("templateMenu");
  if (templateDropButton && templateMenu) {
    templateDropButton.addEventListener("click", function () {
      templateMenu.classList.toggle("is-open");
    });
  }

  // Zoom buttons
  var zoomInButton = getById("zoomInBtn");
  var zoomOutButton = getById("zoomOutBtn");
  if (zoomInButton) {
    zoomInButton.addEventListener("click", function () { setZoom(state.zoom + 0.1); });
  }
  if (zoomOutButton) {
    zoomOutButton.addEventListener("click", function () { setZoom(state.zoom - 0.1); });
  }

  // Undo and Redo
  var undoButton = getById("undoBtn");
  var redoButton = getById("redoBtn");
  if (undoButton) {
    undoButton.addEventListener("click", function () {
      if (state.historyIndex > 0) {
        state.historyIndex--;
        restoreHistory(state.historyIndex);
      }
    });
  }
  if (redoButton) {
    redoButton.addEventListener("click", function () {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        restoreHistory(state.historyIndex);
      }
    });
  }

  // Save, Load, Clear
  var saveButton = getById("saveBtn");
  var loadButton = getById("loadBtn");
  var clearButton = getById("clearBtn");
  if (saveButton) {
    saveButton.addEventListener("click", handleSaveTopology);
  }
  if (loadButton) {
    loadButton.addEventListener("click", function () {
      refreshTopologyList();
      var modal = new bootstrap.Modal(getById("topologyModal"));
      modal.show();
    });
  }
  if (clearButton) {
    clearButton.addEventListener("click", confirmClearTopology);
  }

  // Save topology confirm button
  var saveConfirmButton = getById("saveTopologyConfirm");
  if (saveConfirmButton) {
    saveConfirmButton.addEventListener("click", confirmSaveTopology);
  }

  // Ping button and modal
  var pingButton = getById("pingBtn");
  var runPingButton = getById("runPingBtn");
  if (pingButton) {
    pingButton.addEventListener("click", function () {
      updatePingOverview();
      var modal = new bootstrap.Modal(getById("pingModal"));
      modal.show();
    });
  }
  if (runPingButton) {
    runPingButton.addEventListener("click", function () {
      var sourceDevice = getSelectedDevice();
      var targetSelect = getById("pingTargetSelect");
      var targetId = targetSelect ? targetSelect.value : "";
      var targetDevice = findDevice(targetId);
      if (!sourceDevice || !targetDevice) {
        setPingResult({ success: false, message: "Select a source and target device." });
        return;
      }
      var result = executePing(sourceDevice, targetDevice);
      state.pingInspector = result;
      setPingResult(result);
      if (result.success) {
        animatePacket(result.path);
        addPacketLog("PING " + sourceDevice.name + " → " + targetDevice.name + ": " + result.latency + "ms");
      }
      if (typeof notifyTutorialProgress === "function") {
        notifyTutorialProgress();
      }
    });
  }

  // Auto layout button
  var autoLayoutButton = getById("autoLayoutBtn");
  if (autoLayoutButton) {
    autoLayoutButton.addEventListener("click", autoLayout);
  }

  // Minimap toggle
  var minimapButton = getById("minimapToggleBtn");
  if (minimapButton) {
    minimapButton.addEventListener("click", toggleMinimap);
  }

  // Inspect action buttons
  var inspPingButton = getById("inspActPing");
  if (inspPingButton) {
    inspPingButton.addEventListener("click", function () {
      var pingBtn = getById("pingBtn");
      if (pingBtn) { pingBtn.click(); }
    });
  }

  var inspShowIpButton = getById("inspActShowIp");
  if (inspShowIpButton) {
    inspShowIpButton.addEventListener("click", function () {
      var device = getSelectedDevice();
      if (device && device.config) {
        showSandboxToast({ title: device.name, message: "IP: " + (device.config.ipAddress || "not set") + " | MAC: " + (device.config.macAddress || "—"), variant: "info", timeout: 4000 });
      }
    });
  }

  var inspRestartButton = getById("inspActRestart");
  if (inspRestartButton) {
    inspRestartButton.addEventListener("click", function () {
      var device = getSelectedDevice();
      if (device) {
        showSandboxToast({ title: "Restarted", message: device.name + " has been restarted.", variant: "info", timeout: 2500 });
        addActionLog("Restarted " + device.name);
      }
    });
  }

  var inspConfigButton = getById("inspActConfigure");
  if (inspConfigButton) {
    inspConfigButton.addEventListener("click", function () {
      showConfigTab();
      renderAll();
    });
  }
}


// Bind panel toggle and tab events
function bindPanels() {
  // Left panel toggle
  if (leftToggle) {
    leftToggle.addEventListener("click", function () {
      if (leftPanel) {
        leftPanel.style.display = "none";
        workspace.classList.add("left-hidden");
      }
      if (leftOpenButton) {
        leftOpenButton.style.display = "flex";
      }
    });
  }
  if (leftOpenButton) {
    leftOpenButton.style.display = "none";
    leftOpenButton.addEventListener("click", function () {
      if (leftPanel) {
        leftPanel.style.display = "";
        workspace.classList.remove("left-hidden");
      }
      leftOpenButton.style.display = "none";
    });
  }

  // Right panel toggle
  if (rightToggle) {
    rightToggle.addEventListener("click", function () {
      if (rightPanel) {
        rightPanel.style.display = "none";
        workspace.classList.add("right-hidden");
      }
      if (rightOpenButton) {
        rightOpenButton.style.display = "flex";
      }
    });
  }
  if (rightOpenButton) {
    rightOpenButton.style.display = "none";
    rightOpenButton.addEventListener("click", function () {
      showRightPanel();
    });
  }

  // Right panel tab switching
  var rightTabs = getById("sbxRightTabs");
  if (rightTabs) {
    var tabs = rightTabs.querySelectorAll(".sbx-tab");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function () {
        var tabId = this.getAttribute("data-tab");
        if (tabId) {
          setRightTab(tabId);
        }
      });
    }
  }

  // Config back button
  var configBackButton = getById("sbxConfigBackBtn");
  if (configBackButton) {
    configBackButton.addEventListener("click", function () {
      hideConfigTab();
      renderAll();
    });
  }

  // Config subtab switching
  var configTabs = getById("sbxConfigTabs");
  if (configTabs) {
    var subtabs = configTabs.querySelectorAll(".sbx-subtab");
    for (var s = 0; s < subtabs.length; s++) {
      subtabs[s].addEventListener("click", function () {
        var subtabId = this.getAttribute("data-subtab");
        if (subtabId) {
          state.configTab = subtabId;
          var allSubtabs = configTabs.querySelectorAll(".sbx-subtab");
          for (var t = 0; t < allSubtabs.length; t++) {
            allSubtabs[t].classList.remove("is-active");
          }
          this.classList.add("is-active");
          renderProps();
        }
      });
    }
  }

  // Bottom panel toggle
  if (bottomToggle) {
    bottomToggle.addEventListener("click", function () {
      var isCollapsed = bottomPanel.classList.contains("is-collapsed");
      setBottomCollapsed(!isCollapsed);
    });
  }

  // Bottom panel head click to expand
  var bottomHead = getById("sbxBottomHead");
  if (bottomHead) {
    bottomHead.addEventListener("click", function (event) {
      if (event.target.closest(".sbx-iconbtn") || event.target.closest(".sbx-tab")) {
        return;
      }
      var isCollapsed = bottomPanel.classList.contains("is-collapsed");
      if (isCollapsed) {
        setBottomCollapsed(false);
      }
    });
  }

  // Bottom tab switching
  var bottomTabs = getById("sbxBottomTabs");
  if (bottomTabs) {
    var btabs = bottomTabs.querySelectorAll(".sbx-tab");
    for (var b = 0; b < btabs.length; b++) {
      btabs[b].addEventListener("click", function () {
        var tabId = this.getAttribute("data-bottom-tab");
        if (!tabId) {
          return;
        }
        state.bottomTab = tabId;
        var allBTabs = bottomTabs.querySelectorAll(".sbx-tab");
        for (var t = 0; t < allBTabs.length; t++) {
          allBTabs[t].classList.remove("is-active");
        }
        this.classList.add("is-active");

        var allPanels = querySelectorAll(".sbx-bottom-panel", bottomPanel);
        for (var p = 0; p < allPanels.length; p++) {
          allPanels[p].classList.remove("is-active");
        }
        getById("sbx" + tabId.charAt(0).toUpperCase() + tabId.slice(1) + "Panel")?.classList.add("is-active");
      });
    }
  }

  // Terminal clear button
  var terminalClearButton = getById("terminalClearBtn");
  if (terminalClearButton) {
    terminalClearButton.addEventListener("click", clearConsoleOutput);
  }

  // Console input
  function submitConsoleCommand() {
    if (!consoleInputElement) {
      return;
    }
    var command = consoleInputElement.value.trim();
    if (!command) {
      return;
    }
    consoleInputElement.value = "";
    executeCommand(command);
  }

  if (consoleSendButton) {
    consoleSendButton.addEventListener("click", submitConsoleCommand);
  }

  if (consoleInputElement) {
    consoleInputElement.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        submitConsoleCommand();
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        consoleInputElement.value = stepCommandHistory(-1);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        consoleInputElement.value = stepCommandHistory(1);
        return;
      }
      // Tab completion
      if (event.key === "Tab") {
        event.preventDefault();
        var currentText = consoleInputElement.value.trim().toLowerCase();
        if (!currentText) {
          return;
        }
        var matches = [];
        for (var i = 0; i < CONSOLE_COMMANDS.length; i++) {
          if (CONSOLE_COMMANDS[i].indexOf(currentText) === 0) {
            matches.push(CONSOLE_COMMANDS[i]);
          }
        }
        if (matches.length === 1) {
          consoleInputElement.value = matches[0] + " ";
        } else if (matches.length > 1) {
          addConsoleOutput('<span class="text-muted">Suggestions: ' + matches.join(", ") + '</span>', "");
        }
      }
    });
  }
}


// Bind bottom panel collapse/expand buttons
function updateBottomPanelButtons() {
  if (!bottomPanel) {
    return;
  }
  var isCollapsed = bottomPanel.classList.contains("is-collapsed");
  if (bottomToggle) {
    var icon = querySelector("i", bottomToggle);
    if (icon) {
      icon.className = isCollapsed ? "bi bi-chevron-up" : "bi bi-chevron-down";
    }
    bottomToggle.setAttribute("aria-label", isCollapsed ? "Expand terminal" : "Collapse terminal");
    bottomToggle.setAttribute("data-tooltip", isCollapsed ? "Expand terminal" : "Collapse terminal");
  }
}

function setBottomCollapsed(collapsed) {
  if (!bottomPanel) {
    return;
  }
  bottomPanel.classList.toggle("is-collapsed", collapsed);
  terminalLayout.collapsed = collapsed;
  updateBottomPanelButtons();
  persistTerminalCollapsed();
}

function initTerminalWindowControls() {
  if (!bottomPanel) {
    return;
  }
  loadTerminalLayout();
  setBottomCollapsed(terminalLayout.collapsed);
  updateBottomPanelButtons();
}


// Bind canvas stage events (clicking, dragging, connecting)
function bindStage() {
  // Quick add buttons in empty state
  var quickAddButtons = querySelectorAll("[data-quick-add]");
  for (var q = 0; q < quickAddButtons.length; q++) {
    quickAddButtons[q].addEventListener("click", function () {
      var deviceType = this.getAttribute("data-quick-add");
      if (deviceType) {
        addDevice(deviceType);
      }
    });
  }

  // Device action buttons (config, copy, delete)
  if (deviceLayer) {
    deviceLayer.addEventListener("click", function (event) {
      var button = event.target.closest(".sbx-device-action");
      if (!button) {
        return;
      }
      event.stopPropagation();
      var action = button.getAttribute("data-action");
      var deviceId = button.getAttribute("data-device-id");
      if (!action || !deviceId) {
        return;
      }

      if (action === "config") {
        state.selectedIds = [deviceId];
        showConfigTab();
        renderAll();
      } else if (action === "copy") {
        state.selectedIds = [deviceId];
        duplicateSelected();
      } else if (action === "delete") {
        deleteDevices([deviceId]);
      }
    });
  }

  // Click on canvas to deselect or delete connections
  if (stage) {
    stage.addEventListener("click", function (event) {
      // Check if clicking a connection delete button
      var deleteGroup = event.target.closest(".sbx-conn-delete-group");
      if (deleteGroup && deleteGroup.dataset.connId) {
        deleteConnection(deleteGroup.dataset.connId);
        return;
      }

      // Click on empty canvas to deselect
      if (event.target === stage || event.target === deviceLayer || event.target === connectionLayer) {
        if (state.tool === TOOL.SELECT) {
          state.selectedIds = [];
          renderAll();
        }
      }
    });
  }

  // Device pointer down (selecting, connecting, dragging)
  if (deviceLayer) {
    deviceLayer.addEventListener("pointerdown", function (event) {
      if (event.target.closest(".sbx-device-action") || event.button !== 0) {
        return;
      }
      var deviceElement = event.target.closest(".sbx-device");
      if (!deviceElement || !deviceElement.dataset.id) {
        return;
      }

      var deviceId = deviceElement.dataset.id;
      var device = findDevice(deviceId);
      if (!device) {
        return;
      }

      // Connect tool mode
      if (state.tool === TOOL.CONNECT) {
        if (!state.connectFrom) {
          state.connectFrom = deviceId;
          state.selectedIds = [deviceId];
          renderDevices();
          setTip("Select another device to complete the connection.");
        } else if (state.connectFrom !== deviceId) {
          createConnection(state.connectFrom, deviceId);
          state.connectFrom = null;
          setTip("Devices connected.");
        }
        return;
      }

      // Select tool mode - start dragging
      if (state.tool === TOOL.SELECT) {
        state.selectedIds = [deviceId];
        renderDevices();
        renderProps();
        updatePingVisibility();

        var freshElement = deviceLayer.querySelector('[data-id="' + deviceId + '"]');
        if (!freshElement) {
          return;
        }

        var worldPoint = toWorldPoint(event.clientX, event.clientY);
        state.dragging = {
          id: deviceId,
          offsetX: worldPoint.x - device.x,
          offsetY: worldPoint.y - device.y,
          el: freshElement
        };

        freshElement.setPointerCapture(event.pointerId);
        freshElement.classList.add("is-dragging");

        // Remove connection delete buttons during drag
        var deleteGroups = connectionLayer.querySelectorAll(".sbx-conn-delete-group");
        for (var d = 0; d < deleteGroups.length; d++) {
          deleteGroups[d].remove();
        }
      }
    });
  }

  // Pointer move for dragging
  window.addEventListener("pointermove", function (event) {
    if (!state.dragging) {
      return;
    }
    var worldPoint = toWorldPoint(event.clientX, event.clientY);
    var device = findDevice(state.dragging.id);
    if (!device) {
      return;
    }
    device.x = clamp(worldPoint.x - state.dragging.offsetX, 0, CANVAS_WIDTH - DEVICE_SIZE);
    device.y = clamp(worldPoint.y - state.dragging.offsetY, 0, CANVAS_HEIGHT - DEVICE_SIZE);
    state.dragging.el.style.left = device.x + "px";
    state.dragging.el.style.top = device.y + "px";
    updateConnectionPaths();
  });

  // End drag
  function endDrag() {
    if (!state.dragging) {
      return;
    }
    state.dragging.el.classList.remove("is-dragging");
    var device = findDevice(state.dragging.id);
    if (device && state.snap) {
      device.x = Math.round(device.x / GRID_SIZE) * GRID_SIZE;
      device.y = Math.round(device.y / GRID_SIZE) * GRID_SIZE;
    }
    state.dragging = null;
    finishTopologyChange({ refreshTutorial: false });
  }

  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  // Handle window resize
  window.addEventListener("resize", function () {
    updateZoomLabel();
    renderConnections();
    renderConnectionLabels();
  });
}


// Bind keyboard shortcuts
function bindKeyboardShortcuts() {
  document.addEventListener("keydown", function (event) {
    var tag = event.target.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") {
      return;
    }

    // Delete key
    if ((event.key === "Delete" || event.key === "Backspace") && state.selectedIds.length > 0) {
      event.preventDefault();
      deleteDevices(state.selectedIds.slice());
      return;
    }

    // Ctrl+Z undo
    if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey) {
      event.preventDefault();
      if (state.historyIndex > 0) {
        state.historyIndex--;
        restoreHistory(state.historyIndex);
      }
      return;
    }

    // Ctrl+Y or Ctrl+Shift+Z redo
    if ((event.ctrlKey || event.metaKey) && (event.key === "y" || (event.key === "z" && event.shiftKey))) {
      event.preventDefault();
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        restoreHistory(state.historyIndex);
      }
      return;
    }

    // Ctrl+S save
    if ((event.ctrlKey || event.metaKey) && event.key === "s") {
      event.preventDefault();
      handleSaveTopology();
      return;
    }

    // Ctrl+D duplicate
    if ((event.ctrlKey || event.metaKey) && (event.key === "d" || event.key === "c") && state.selectedIds.length > 0) {
      event.preventDefault();
      duplicateSelected();
      return;
    }

    // V for select tool
    if (event.key === "v" || event.key === "V") {
      state.tool = TOOL.SELECT;
      var allToolButtons = querySelectorAll("[data-tool]");
      for (var i = 0; i < allToolButtons.length; i++) {
        allToolButtons[i].classList.remove("is-active");
      }
      getById("toolSelectBtn")?.classList.add("is-active");
      state.connectFrom = null;
      setTip("Select and drag devices.");
      updateConnectionTypeGroupVisibility();
      return;
    }

    // C for connect tool
    if (event.key === "c" || event.key === "C") {
      state.tool = TOOL.CONNECT;
      var allToolBtns = querySelectorAll("[data-tool]");
      for (var j = 0; j < allToolBtns.length; j++) {
        allToolBtns[j].classList.remove("is-active");
      }
      getById("toolConnectBtn")?.classList.add("is-active");
      setTip("Select a device to start a connection.");
      updateConnectionTypeGroupVisibility();
      return;
    }

    // Escape to deselect
    if (event.key === "Escape") {
      state.selectedIds = [];
      state.connectFrom = null;
      renderAll();
    }
  });
}


// Bind mouse wheel for zooming and panning
function bindMouseWheelZoom() {
  if (!stageElement) {
    return;
  }
  // Only intercept Ctrl+wheel for zoom — regular scroll/trackpad is native scrolling
  stageElement.addEventListener("wheel", function (event) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      var zoomDelta = event.deltaY > 0 ? -0.1 : 0.1;
      setZoom(state.zoom + zoomDelta, event.clientX, event.clientY);
    }
    // Otherwise let the browser handle scroll natively
  }, { passive: false });
}


// Context menu for right-clicking on devices
var contextMenuElement = null;

function ensureContextMenu() {
  if (contextMenuElement) {
    return contextMenuElement;
  }

  contextMenuElement = document.createElement("div");
  contextMenuElement.className = "sbx-context-menu";
  contextMenuElement.innerHTML =
    '<button class="sbx-context-item" data-action="rename"><i class="bi bi-pencil"></i> Rename<span class="sbx-context-shortcut">F2</span></button>' +
    '<button class="sbx-context-item" data-action="duplicate"><i class="bi bi-copy"></i> Duplicate<span class="sbx-context-shortcut">Ctrl+D</span></button>' +
    '<button class="sbx-context-item" data-action="ping"><i class="bi bi-broadcast-pin"></i> Ping from here</button>' +
    '<button class="sbx-context-item" data-action="interfaces"><i class="bi bi-ethernet"></i> Show interfaces</button>' +
    '<button class="sbx-context-item" data-action="toggleconn"><i class="bi bi-toggle-on"></i> Toggle connection up/down</button>' +
    '<div class="sbx-context-sep"></div>' +
    '<button class="sbx-context-item is-danger" data-action="delete"><i class="bi bi-trash3"></i> Delete<span class="sbx-context-shortcut">Del</span></button>';

  document.body.appendChild(contextMenuElement);

  contextMenuElement.addEventListener("click", function (event) {
    var item = event.target.closest("[data-action]");
    if (!item) {
      return;
    }
    var action = item.getAttribute("data-action");
    var deviceId = contextMenuElement.dataset.deviceId;
    hideContextMenu();
    if (!deviceId) {
      return;
    }

    if (action === "rename") {
      var device = findDevice(deviceId);
      if (!device) {
        return;
      }
      var newName = prompt("Rename device:", device.name);
      if (newName && newName.trim()) {
        device.name = newName.trim();
        pushHistory();
        renderAll();
        addActionLog("Renamed to " + device.name);
      }
    } else if (action === "duplicate") {
      state.selectedIds = [deviceId];
      duplicateSelected();
    } else if (action === "ping") {
      state.selectedIds = [deviceId];
      getById("pingBtn")?.click();
    } else if (action === "interfaces") {
      state.selectedIds = [deviceId];
      state.configTab = "interfaces";
      showConfigTab();
      renderAll();
      var allSubtabs = querySelectorAll(".sbx-subtab", getById("sbxConfigTabs"));
      for (var i = 0; i < allSubtabs.length; i++) {
        allSubtabs[i].classList.remove("is-active");
      }
      querySelector('.sbx-subtab[data-subtab="interfaces"]', getById("sbxConfigTabs"))?.classList.add("is-active");
    } else if (action === "toggleconn") {
      // Toggle the first connection involving this device
      for (var j = 0; j < state.connections.length; j++) {
        if (state.connections[j].from === deviceId || state.connections[j].to === deviceId) {
          toggleConnectionUpDown(state.connections[j].id);
          break;
        }
      }
    } else if (action === "delete") {
      deleteDevices([deviceId]);
    }
  });

  return contextMenuElement;
}

function showContextMenu(x, y, deviceId) {
  var menu = ensureContextMenu();
  menu.dataset.deviceId = deviceId;
  menu.classList.add("is-visible");
  menu.style.left = Math.min(x, window.innerWidth - 200) + "px";
  menu.style.top = Math.min(y, window.innerHeight - 280) + "px";
}

function hideContextMenu() {
  if (contextMenuElement) {
    contextMenuElement.classList.remove("is-visible");
  }
}

function bindContextMenu() {
  document.addEventListener("click", function (event) {
    if (contextMenuElement && !contextMenuElement.contains(event.target)) {
      hideContextMenu();
    }
  });
  document.addEventListener("contextmenu", function () {
    if (contextMenuElement) {
      hideContextMenu();
    }
  });
}

function bindDeviceContextMenu() {
  if (!deviceLayer) {
    return;
  }
  deviceLayer.addEventListener("contextmenu", function (event) {
    var deviceElement = event.target.closest(".sbx-device");
    if (!deviceElement) {
      return;
    }
    event.preventDefault();
    var deviceId = deviceElement.getAttribute("data-id");
    if (!deviceId) {
      return;
    }
    state.selectedIds = [deviceId];
    renderAll();
    showContextMenu(event.clientX, event.clientY, deviceId);
  });
}


// Multi-select with Shift+Click
function patchMultiSelect() {
  if (!deviceLayer) {
    return;
  }
  deviceLayer.addEventListener("pointerdown", function (event) {
    if (event.target.closest(".sbx-device-action")) {
      return;
    }
    var deviceElement = event.target.closest(".sbx-device");
    if (!deviceElement || !event.shiftKey) {
      return;
    }
    event.stopPropagation();

    var deviceId = deviceElement.getAttribute("data-id");
    if (!deviceId) {
      return;
    }

    // Toggle selection
    var index = state.selectedIds.indexOf(deviceId);
    if (index !== -1) {
      state.selectedIds.splice(index, 1);
    } else {
      state.selectedIds.push(deviceId);
    }
    renderAll();
  }, true);
}


// Filter devices in the library by search text
function bindDeviceFilter() {
  var filterInput = getById("sbxDeviceFilter");
  if (!filterInput) {
    return;
  }
  filterInput.addEventListener("input", function () {
    var query = filterInput.value.toLowerCase().trim();
    var cards = querySelectorAll(".sbx-device-card");
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var labelElement = card.querySelector(".sbx-device-label");
      var labelText = labelElement ? labelElement.textContent.toLowerCase() : "";
      var deviceType = card.getAttribute("data-device") || "";
      if (!query || labelText.indexOf(query) !== -1 || deviceType.indexOf(query) !== -1) {
        card.style.display = "";
      } else {
        card.style.display = "none";
      }
    }
  });
}


// Collapse/expand device groups in the library
function bindDeviceGroupCollapse() {
  var groupTitles = querySelectorAll(".sbx-device-group-title");
  for (var i = 0; i < groupTitles.length; i++) {
    groupTitles[i].addEventListener("click", function () {
      var group = this.closest(".sbx-device-group");
      if (group) {
        group.classList.toggle("is-collapsed");
      }
    });
  }
}


// Auto-layout: arrange devices in a grid
function autoLayout() {
  if (state.devices.length === 0) {
    return;
  }

  var padding = 60;
  var columns = Math.ceil(Math.sqrt(state.devices.length));
  var cellWidth = Math.floor((CANVAS_WIDTH - padding * 2) / columns);
  var cellHeight = Math.floor(cellWidth * 0.9);

  for (var i = 0; i < state.devices.length; i++) {
    var device = state.devices[i];
    var column = i % columns;
    var row = Math.floor(i / columns);
    device.x = padding + column * cellWidth + (cellWidth - DEVICE_SIZE) / 2;
    device.y = padding + 40 + row * cellHeight + (cellHeight - DEVICE_SIZE) / 2;

    if (state.snap) {
      device.x = Math.round(device.x / GRID_SIZE) * GRID_SIZE;
      device.y = Math.round(device.y / GRID_SIZE) * GRID_SIZE;
    }
  }

  pushHistory();
  renderAll();
  addActionLog("Auto-layout applied");
  showSandboxToast({ title: "Auto-layout", message: "Devices arranged in a grid", variant: "success", timeout: 3500 });
}


// Minimap
var minimapVisible = false;

function toggleMinimap() {
  minimapVisible = !minimapVisible;
  var minimapElement = getById("sbxMinimap");
  var minimapButton = getById("minimapToggleBtn");
  if (minimapElement) {
    if (minimapVisible) {
      minimapElement.classList.add("is-visible");
    } else {
      minimapElement.classList.remove("is-visible");
    }
  }
  if (minimapButton) {
    if (minimapVisible) {
      minimapButton.classList.add("is-active");
    } else {
      minimapButton.classList.remove("is-active");
    }
  }
  if (minimapVisible) {
    updateMinimap();
  }
}

function updateMinimap() {
  if (!minimapVisible) {
    return;
  }
  var svgElement = getById("sbxMinimapSvg");
  if (!svgElement) {
    return;
  }

  var scaleX = 160 / CANVAS_WIDTH;
  var scaleY = 100 / CANVAS_HEIGHT;
  var scale = Math.min(scaleX, scaleY);

  var html = "";

  // Draw connections
  for (var i = 0; i < state.connections.length; i++) {
    var connection = state.connections[i];
    var fromDevice = findDevice(connection.from);
    var toDevice = findDevice(connection.to);
    if (fromDevice && toDevice) {
      var x1 = (fromDevice.x + DEVICE_RADIUS) * scale;
      var y1 = (fromDevice.y + DEVICE_RADIUS) * scale;
      var x2 = (toDevice.x + DEVICE_RADIUS) * scale;
      var y2 = (toDevice.y + DEVICE_RADIUS) * scale;
      html += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#94a3b8" stroke-width="1"/>';
    }
  }

  // Draw devices
  for (var j = 0; j < state.devices.length; j++) {
    var device = state.devices[j];
    var cx = (device.x + DEVICE_RADIUS) * scale;
    var cy = (device.y + DEVICE_RADIUS) * scale;
    var color = state.selectedIds.indexOf(device.id) !== -1 ? "#0d9488" : "#64748b";
    html += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="' + color + '"/>';
  }

  svgElement.innerHTML = html;
}


// Update device count badges in the library
function updateDeviceCountBadges() {
  var counts = {};
  for (var i = 0; i < state.devices.length; i++) {
    var deviceType = state.devices[i].type;
    if (!counts[deviceType]) {
      counts[deviceType] = 0;
    }
    counts[deviceType] = counts[deviceType] + 1;
  }

  var badges = querySelectorAll("[data-count-for]");
  for (var j = 0; j < badges.length; j++) {
    var badge = badges[j];
    var countFor = badge.getAttribute("data-count-for");
    var count = counts[countFor] || 0;
    badge.textContent = count;
    if (count > 0) {
      badge.classList.add("is-visible");
    } else {
      badge.classList.remove("is-visible");
    }
  }
}

// Update the stats bar showing device and connection counts
function updateStatsBar() {
  setText("sbxStatDevices", state.devices.length);
  setText("sbxStatConns", state.connections.length);

  var selectedDevice = getSelectedDevice();
  var selectedElement = getById("sbxStatSelected");
  var selectedNameElement = getById("sbxStatSelectedName");
  if (selectedElement && selectedNameElement) {
    if (selectedDevice) {
      selectedElement.style.display = "";
      selectedNameElement.textContent = selectedDevice.name;
    } else {
      selectedElement.style.display = "none";
    }
  }
}

// Update device status indicator dots
function updateDeviceStatusIndicators() {
  var statusDots = querySelectorAll(".sbx-device-status");
  for (var i = 0; i < statusDots.length; i++) {
    var dot = statusDots[i];
    var deviceElement = dot.closest(".sbx-device");
    if (!deviceElement) {
      continue;
    }
    var device = findDevice(deviceElement.getAttribute("data-id"));
    if (device) {
      var hasIp = device.config && device.config.ipAddress;
      dot.className = "sbx-device-status " + (hasIp ? "is-configured" : "is-unconfigured");
    }
  }
}


// Show the right panel
function showRightPanel() {
  if (!rightPanel) {
    return;
  }
  rightPanel.style.display = "";
  if (workspace) {
    workspace.classList.remove("right-hidden");
  }
  if (rightToggle) {
    var icon = rightToggle.querySelector("i");
    if (icon) {
      icon.className = "bi bi-chevron-right";
    }
  }
  if (rightOpenButton) {
    rightOpenButton.style.display = "none";
  }
}

// Set the active right panel tab
function setRightTab(tabId) {
  var tabsWrap = getById("sbxRightTabs");
  if (!tabsWrap || !rightPanel) {
    return;
  }
  var targetTab = querySelector('.sbx-tab[data-tab="' + tabId + '"]', tabsWrap);
  if (!targetTab) {
    return;
  }
  state.rightTab = tabId;

  var allTabs = tabsWrap.querySelectorAll(".sbx-tab");
  for (var i = 0; i < allTabs.length; i++) {
    allTabs[i].classList.remove("is-active");
  }
  targetTab.classList.add("is-active");

  var allPanels = rightPanel.querySelectorAll(".sbx-tabpanel");
  for (var j = 0; j < allPanels.length; j++) {
    allPanels[j].classList.remove("is-active");
  }
  var panelId = "panel" + tabId.charAt(0).toUpperCase() + tabId.slice(1);
  var panel = getById(panelId);
  if (panel) {
    panel.classList.add("is-active");
  }
}
