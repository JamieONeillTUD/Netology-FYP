/*
  Student: C22320301 - Jamie O'Neill
  File: sandbox-core.js
  Purpose: Core data, constants, state, and utility functions
           for the Netology network sandbox.
*/

// Get an element by its id
function getById(id) {
  return document.getElementById(id);
}

// Query a single element inside a parent (or whole document)
function querySelector(selector, parent) {
  if (parent) {
    return parent.querySelector(selector);
  }
  return document.querySelector(selector);
}

// Query all matching elements inside a parent (or whole document)
function querySelectorAll(selector, parent) {
  if (parent) {
    return parent.querySelectorAll(selector);
  }
  return document.querySelectorAll(selector);
}


// DOM references - all the important elements we use throughout
var stage = getById("sandboxStage");
var stageElement = document.querySelector(".sbx-stage-wrap");
var deviceLayer = getById("sbxDevices");
var connectionLayer = getById("sbxConnections");
var emptyState = getById("sbxEmptyState");
var tipsElement = getById("tips");
var propsElement = getById("props");
var consoleOutputElement = getById("sbxConsoleOutput");
var consoleInputElement = getById("sbxConsoleInput");
var consoleSendButton = getById("sbxConsoleSend");
var actionLogsElement = getById("sbxActionLogs");
var packetLogsElement = getById("sbxPacketLogs");
var leftPanel = getById("sbxLeftPanel");
var rightPanel = getById("sbxRightPanel");
var bottomPanel = getById("sbxBottomPanel");
var workspace = document.querySelector(".sbx-workspace");
var leftToggle = getById("leftPanelToggle");
var leftOpenButton = getById("leftPanelOpenBtn");
var rightToggle = getById("rightPanelToggle");
var rightOpenButton = getById("rightPanelOpenBtn");
var bottomToggle = getById("bottomPanelToggle");
var topCarouselWrap = getById("sbxTopCarousel");
var topCarouselScroll = getById("sbxTopCarouselScroll");
var topCarouselDots = getById("sbxTopCarouselDots");
var topCarouselPrevButton = getById("sbxTopCarouselPrev");
var topCarouselNextButton = getById("sbxTopCarouselNext");
var tutorialsToggleButton = getById("sbxTutorialsToggle");
var tutorialsToggleLabel = getById("sbxTutorialsToggleLabel");
var guideUI = null;
var suggestionsHideTimer = null;

// Tutorial carousel state
var tutorialCarouselState = { hidden: false, index: 0, count: 0 };
var TUTORIAL_CAROUSEL_HIDDEN_KEY = "sbx_carousel_hidden";

// Terminal layout state
var terminalLayout = { collapsed: true };


// Grid and canvas size constants
var GRID_SIZE = 20;
var DEVICE_SIZE = 72;
var DEVICE_RADIUS = 36;
var CANVAS_WIDTH = 3200;
var CANVAS_HEIGHT = 2200;

// Auto network default settings
var AUTO_NETWORK = {
  subnet: "192.168.1.0",
  mask: "255.255.255.0",
  gateway: "192.168.1.1",
  startHost: 10
};

// The two tools the user can switch between
var TOOL = { SELECT: "select", CONNECT: "connect" };

// All the device types available in the sandbox
var DEVICE_TYPES = {
  pc:          { label: "PC",          icon: "bi-pc-display",    color: "#3b82f6", category: "End Devices" },
  laptop:      { label: "Laptop",      icon: "bi-laptop",        color: "#6366f1", category: "End Devices" },
  smartphone:  { label: "Smartphone",  icon: "bi-phone",         color: "#a855f7", category: "End Devices" },
  printer:     { label: "Printer",     icon: "bi-printer",       color: "#ec4899", category: "End Devices" },
  router:      { label: "Router",      icon: "bi-diagram-3",     color: "#14b8a6", category: "Network Devices" },
  switch:      { label: "Switch",      icon: "bi-hdd-network",   color: "#f59e0b", category: "Network Devices" },
  "wireless-ap": { label: "Wireless AP", icon: "bi-wifi",        color: "#22d3ee", category: "Network Devices" },
  firewall:    { label: "Firewall",    icon: "bi-shield-lock",   color: "#ef4444", category: "Network Devices" },
  server:      { label: "Server",      icon: "bi-server",        color: "#10b981", category: "Servers" },
  cloud:       { label: "Internet",    icon: "bi-cloud",         color: "#94a3b8", category: "Servers" }
};

// Connection types with labels, colors and dash patterns
var CONNECTION_TYPES = {
  ethernet: { label: "Ethernet",  color: "#3b82f6", dash: "" },
  fiber:    { label: "Fiber",     color: "#f59e0b", dash: "8 4" },
  serial:   { label: "Serial",    color: "#a855f7", dash: "4 4" },
  wireless: { label: "Wireless",  color: "#22d3ee", dash: "2 6" },
  console:  { label: "Console",   color: "#94a3b8", dash: "6 3" }
};

// Bandwidth for each connection type (used in latency calculations)
var BANDWIDTH_MAP = {
  ethernet: 1000,
  fiber: 10000,
  serial: 2,
  wireless: 300,
  console: 0
};

// Which devices can connect to which other devices, and with what cable
var DEVICE_COMPATIBILITY = {
  pc:          [{ targets: ["switch", "router", "wireless-ap", "firewall"], conn: "ethernet" }],
  laptop:      [{ targets: ["switch", "router", "wireless-ap"], conn: "ethernet" }, { targets: ["wireless-ap"], conn: "wireless" }],
  smartphone:  [{ targets: ["wireless-ap"], conn: "wireless" }],
  printer:     [{ targets: ["switch", "router"], conn: "ethernet" }],
  router:      [{ targets: ["switch", "firewall", "cloud", "router"], conn: "ethernet" }, { targets: ["router"], conn: "serial" }],
  switch:      [{ targets: ["switch", "router", "server", "firewall", "wireless-ap"], conn: "ethernet" }, { targets: ["switch"], conn: "fiber" }],
  "wireless-ap": [{ targets: ["switch", "router"], conn: "ethernet" }],
  firewall:    [{ targets: ["router", "switch", "server"], conn: "ethernet" }],
  server:      [{ targets: ["switch", "router", "firewall"], conn: "ethernet" }],
  cloud:       [{ targets: ["router", "firewall"], conn: "ethernet" }]
};

// VLAN color list for color-coding VLANs on the canvas
var VLAN_COLORS = [
  "transparent",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#22d3ee",
  "#f97316"
];


// The main state object that holds everything about the current sandbox
var state = {
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
  consoleOutput: [],
  actionLogs: [],
  packets: [],
  pingInspector: null,
  objectiveStatus: {},
  challengeMeta: null,
  tutorialMeta: null,
  mode: "free",
  deviceAnimations: {},
  commandHistory: [],
  commandHistoryIndex: -1
};


// Try to parse a JSON string safely - returns null if it fails
function parseJsonSafe(text) {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

// Get the stored user from localStorage
function getStoredUser() {
  var userJson = localStorage.getItem("netology_user") || localStorage.getItem("user");
  return parseJsonSafe(userJson);
}

// Escape special HTML characters to prevent injection
function escapeHtml(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Remove all children from an element
function clearChildren(element) {
  if (!element) {
    return;
  }
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

// Keep a number between a minimum and maximum value
function clamp(value, minimum, maximum) {
  if (value < minimum) {
    return minimum;
  }
  if (value > maximum) {
    return maximum;
  }
  return value;
}

// Create a debounced version of a function that waits before calling it
function debounce(callback, delay) {
  var timer = null;
  return function () {
    clearTimeout(timer);
    timer = setTimeout(callback, delay);
  };
}

// Create a regular HTML element with optional class name and text
function makeElement(tag, className, textContent) {
  var element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (textContent !== undefined && textContent !== null) {
    element.textContent = textContent;
  }
  return element;
}

// Create a Bootstrap icon element
function makeIcon(iconClass) {
  var icon = document.createElement("i");
  icon.className = iconClass;
  return icon;
}

// Create an SVG element (needs the SVG namespace)
function makeSvgElement(tag) {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

// Set text on the status box / tip shown at the top of the canvas
function setTip(text) {
  if (tipsElement) {
    tipsElement.textContent = text || "";
  }
}

// Set the text content of an element found by id
function setText(id, text) {
  var element = getById(id);
  if (element) {
    element.textContent = text;
  }
}

// Show a toast notification using the global showToast from toasts.js
function showSandboxToast(options) {
  if (typeof showToast === "function") {
    showToast(options);
  }
}


// Save terminal collapsed state to localStorage
function persistTerminalCollapsed() {
  localStorage.setItem("sbx_terminal_collapsed", terminalLayout.collapsed ? "1" : "0");
}

// Load terminal layout from localStorage
function loadTerminalLayout() {
  var saved = localStorage.getItem("sbx_terminal_collapsed");
  if (saved !== null) {
    terminalLayout.collapsed = saved === "1";
  }
}


// Calculate the limits for how far you can pan the canvas
function getPanBounds() {
  if (!stageElement) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  var stageRect = stageElement.getBoundingClientRect();
  var scaledWidth = CANVAS_WIDTH * state.zoom;
  var scaledHeight = CANVAS_HEIGHT * state.zoom;
  var minimumX = -(scaledWidth - stageRect.width * 0.5);
  var maximumX = stageRect.width * 0.5;
  var minimumY = -(scaledHeight - stageRect.height * 0.5);
  var maximumY = stageRect.height * 0.5;
  return { minX: minimumX, maxX: maximumX, minY: minimumY, maxY: maximumY };
}

// Clamp the current pan position within the allowed bounds
function clampPanToBounds() {
  var bounds = getPanBounds();
  state.panX = clamp(state.panX, bounds.minX, bounds.maxX);
  state.panY = clamp(state.panY, bounds.minY, bounds.maxY);
  if (stage) {
    stage.style.transform = "translate(" + state.panX + "px, " + state.panY + "px) scale(" + state.zoom + ")";
  }
}

// Convert a screen position (mouse coordinates) to world position (canvas coordinates)
function toWorldPoint(screenX, screenY) {
  if (!stageElement) {
    return { x: screenX, y: screenY };
  }
  var rect = stageElement.getBoundingClientRect();
  var worldX = (screenX - rect.left - state.panX) / state.zoom;
  var worldY = (screenY - rect.top - state.panY) / state.zoom;
  return { x: worldX, y: worldY };
}

// Convert a world position to screen position
function toScreenPoint(worldX, worldY) {
  if (!stageElement) {
    return { x: worldX, y: worldY };
  }
  var rect = stageElement.getBoundingClientRect();
  var screenX = worldX * state.zoom + state.panX + rect.left;
  var screenY = worldY * state.zoom + state.panY + rect.top;
  return { x: screenX, y: screenY };
}

// Apply the canvas world size to the stage element
function applyCanvasWorldSize() {
  if (stage) {
    stage.style.width = CANVAS_WIDTH + "px";
    stage.style.height = CANVAS_HEIGHT + "px";
  }
}

// Reset the viewport to default zoom and centered position
function resetViewport() {
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  clampPanToBounds();
}

// Set the zoom level, optionally zooming towards the mouse position
function setZoom(newZoom, mouseX, mouseY) {
  var clamped = clamp(newZoom, 0.25, 2);
  if (mouseX !== undefined && mouseY !== undefined && stageElement) {
    var rect = stageElement.getBoundingClientRect();
    var offsetX = mouseX - rect.left;
    var offsetY = mouseY - rect.top;
    state.panX = offsetX - (offsetX - state.panX) * (clamped / state.zoom);
    state.panY = offsetY - (offsetY - state.panY) * (clamped / state.zoom);
  }
  state.zoom = clamped;
  clampPanToBounds();
  if (typeof updateZoomLabel === "function") {
    updateZoomLabel();
  }
  if (typeof renderConnectionLabels === "function") {
    renderConnectionLabels();
  }
}


// Check if a string is a valid IP address (like 192.168.1.1)
function isValidIpAddress(ip) {
  if (!ip || typeof ip !== "string") {
    return false;
  }
  var parts = ip.split(".");
  if (parts.length !== 4) {
    return false;
  }
  for (var i = 0; i < parts.length; i++) {
    var number = Number(parts[i]);
    if (isNaN(number) || number < 0 || number > 255 || parts[i] !== String(number)) {
      return false;
    }
  }
  return true;
}

// Valid subnet masks
var VALID_MASKS = [
  "255.255.255.0", "255.255.0.0", "255.0.0.0",
  "255.255.255.128", "255.255.255.192", "255.255.255.224",
  "255.255.255.240", "255.255.255.248", "255.255.255.252"
];

// Check if a subnet mask is valid
function isValidSubnet(mask) {
  return VALID_MASKS.indexOf(mask) !== -1;
}

// Convert an IP address string to a 32-bit integer
function ipToInt(ip) {
  var parts = ip.split(".");
  var result = 0;
  for (var i = 0; i < 4; i++) {
    result = result * 256 + Number(parts[i]);
  }
  return result;
}

// Check if two IP addresses are in the same subnet
function isSameSubnet(ipA, ipB, mask) {
  var maskInt = ipToInt(mask);
  var networkA = ipToInt(ipA) & maskInt;
  var networkB = ipToInt(ipB) & maskInt;
  return networkA === networkB;
}

// Build a LAN IP address like 192.168.1.X using the auto network settings
function buildAutoLanIp(hostNumber) {
  var parts = AUTO_NETWORK.subnet.split(".");
  parts[3] = String(hostNumber);
  return parts.join(".");
}

// Find a free IP address that no device is already using
function pickAvailableAutoLanIp() {
  var usedAddresses = [];
  for (var i = 0; i < state.devices.length; i++) {
    var device = state.devices[i];
    if (device.config && device.config.ipAddress) {
      usedAddresses.push(device.config.ipAddress);
    }
  }
  for (var host = AUTO_NETWORK.startHost; host < 255; host++) {
    var candidateIp = buildAutoLanIp(host);
    if (usedAddresses.indexOf(candidateIp) === -1) {
      return candidateIp;
    }
  }
  return null;
}

// Check for IP conflicts - two devices with the same IP address
function findSubnetConflicts() {
  var conflicts = [];
  for (var i = 0; i < state.devices.length; i++) {
    var deviceA = state.devices[i];
    if (!deviceA.config || !deviceA.config.ipAddress) {
      continue;
    }
    for (var j = i + 1; j < state.devices.length; j++) {
      var deviceB = state.devices[j];
      if (!deviceB.config || !deviceB.config.ipAddress) {
        continue;
      }
      // Check for duplicate IPs
      if (deviceA.config.ipAddress === deviceB.config.ipAddress) {
        conflicts.push({
          type: "duplicate_ip",
          message: deviceA.name + " and " + deviceB.name + " have the same IP: " + deviceA.config.ipAddress,
          devices: [deviceA.id, deviceB.id]
        });
      }
    }
  }

  // Check for devices connected directly but on different subnets
  for (var k = 0; k < state.connections.length; k++) {
    var connection = state.connections[k];
    var fromDevice = findDevice(connection.from);
    var toDevice = findDevice(connection.to);
    if (!fromDevice || !toDevice) {
      continue;
    }
    if (!fromDevice.config || !fromDevice.config.ipAddress || !toDevice.config || !toDevice.config.ipAddress) {
      continue;
    }
    // Skip routers since they bridge subnets
    if (fromDevice.type === "router" || toDevice.type === "router" || fromDevice.type === "cloud" || toDevice.type === "cloud") {
      continue;
    }
    var mask = fromDevice.config.subnetMask || "255.255.255.0";
    if (!isSameSubnet(fromDevice.config.ipAddress, toDevice.config.ipAddress, mask)) {
      conflicts.push({
        type: "subnet_mismatch",
        message: fromDevice.name + " (" + fromDevice.config.ipAddress + ") and " + toDevice.name + " (" + toDevice.config.ipAddress + ") are connected but on different subnets",
        devices: [fromDevice.id, toDevice.id]
      });
    }
  }

  return conflicts;
}


// Generate a random MAC address (like AA:BB:CC:DD:EE:FF)
function generateMacAddress() {
  var hexParts = [];
  for (var i = 0; i < 6; i++) {
    var randomByte = Math.floor(Math.random() * 256);
    var hexString = randomByte.toString(16).padStart(2, "0");
    hexParts.push(hexString.toUpperCase());
  }
  return hexParts.join(":");
}

// Generate network interfaces for a device based on its type
function generateInterfaces(deviceType) {
  var interfaces = [];
  if (deviceType === "router") {
    interfaces.push({ name: "GigabitEthernet0/0", ip: "", mask: "255.255.255.0", mac: generateMacAddress(), status: "up", linked: null });
    interfaces.push({ name: "GigabitEthernet0/1", ip: "", mask: "255.255.255.0", mac: generateMacAddress(), status: "up", linked: null });
    interfaces.push({ name: "Serial0/0/0", ip: "", mask: "255.255.255.252", mac: "", status: "down", linked: null });
  } else if (deviceType === "switch") {
    for (var portNum = 1; portNum <= 4; portNum++) {
      interfaces.push({ name: "FastEthernet0/" + portNum, ip: "", mask: "", mac: generateMacAddress(), status: "up", linked: null });
    }
  } else if (deviceType === "firewall") {
    interfaces.push({ name: "Ethernet0/0 (outside)", ip: "", mask: "255.255.255.0", mac: generateMacAddress(), status: "up", linked: null });
    interfaces.push({ name: "Ethernet0/1 (inside)", ip: "", mask: "255.255.255.0", mac: generateMacAddress(), status: "up", linked: null });
  } else if (deviceType === "wireless-ap") {
    interfaces.push({ name: "Ethernet0", ip: "", mask: "255.255.255.0", mac: generateMacAddress(), status: "up", linked: null });
    interfaces.push({ name: "Wireless0", ip: "", mask: "", mac: generateMacAddress(), status: "up", linked: null });
  } else if (deviceType === "server") {
    interfaces.push({ name: "Ethernet0", ip: "", mask: "255.255.255.0", mac: generateMacAddress(), status: "up", linked: null });
  } else {
    // End devices like PC, laptop, smartphone, printer
    interfaces.push({ name: "Ethernet0", ip: "", mask: "255.255.255.0", mac: generateMacAddress(), status: "up", linked: null });
  }
  return interfaces;
}

// Create a full device object with all default values
function normalizeDevice(partial) {
  var deviceId = partial.id || ("dev-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8));
  var deviceType = partial.type || "pc";
  var typeInfo = DEVICE_TYPES[deviceType] || DEVICE_TYPES.pc;
  var existingConfig = partial.config || {};

  var device = {
    id: deviceId,
    type: deviceType,
    name: partial.name || (typeInfo.label + "-" + deviceId.substring(deviceId.length - 4)),
    x: partial.x || 100,
    y: partial.y || 100,
    vlan: partial.vlan || 0,
    config: {
      ipAddress: existingConfig.ipAddress || "",
      subnetMask: existingConfig.subnetMask || "255.255.255.0",
      defaultGateway: existingConfig.defaultGateway || "",
      macAddress: existingConfig.macAddress || generateMacAddress(),
      dhcpEnabled: existingConfig.dhcpEnabled || false,
      interfaces: existingConfig.interfaces || generateInterfaces(deviceType),
      routingTable: existingConfig.routingTable || [],
      macTable: existingConfig.macTable || [],
      dhcpServer: existingConfig.dhcpServer || { enabled: false, poolStart: "", poolEnd: "", dns: "" },
      dnsServer: existingConfig.dnsServer || { enabled: false, records: [] }
    }
  };
  return device;
}

// Create a full connection object with default values
function normalizeConnection(partial) {
  var connection = {
    id: partial.id || ("conn-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8)),
    from: partial.from,
    to: partial.to,
    type: partial.type || state.connectType || "ethernet",
    fromInterface: partial.fromInterface || null,
    toInterface: partial.toInterface || null,
    isUp: partial.isUp !== undefined ? partial.isUp : true
  };
  return connection;
}


// Find a device in the devices list by its id
function findDevice(deviceId) {
  for (var i = 0; i < state.devices.length; i++) {
    if (state.devices[i].id === deviceId) {
      return state.devices[i];
    }
  }
  return null;
}

// Get the currently selected device (only if exactly one is selected)
function getSelectedDevice() {
  if (state.selectedIds.length !== 1) {
    return null;
  }
  return findDevice(state.selectedIds[0]);
}

// Find a device by its name (case insensitive)
function findDeviceByName(name) {
  if (!name) {
    return null;
  }
  var lowerName = name.toLowerCase();
  for (var i = 0; i < state.devices.length; i++) {
    if (state.devices[i].name.toLowerCase() === lowerName) {
      return state.devices[i];
    }
  }
  return null;
}

// Find a device by its IP address
function findDeviceByIp(ip) {
  if (!ip) {
    return null;
  }
  for (var i = 0; i < state.devices.length; i++) {
    if (state.devices[i].config && state.devices[i].config.ipAddress === ip) {
      return state.devices[i];
    }
  }
  return null;
}

// Find a device by name or IP address (useful for console commands)
function findDeviceByIdentifier(identifier) {
  if (!identifier) {
    return null;
  }
  var found = findDeviceByName(identifier);
  if (found) {
    return found;
  }
  return findDeviceByIp(identifier);
}


// Update a device's status based on whether it has an IP
function updateDeviceStatus(device) {
  if (!device || !device.config) {
    return;
  }
  device.status = device.config.ipAddress ? "configured" : "unconfigured";
}

// Automatically assign IP addresses and gateways to all devices
function applyAutoNetworkDefaults() {
  // First pass: give IP addresses to devices that dont have one
  for (var i = 0; i < state.devices.length; i++) {
    var device = state.devices[i];
    if (!device.config) {
      continue;
    }
    if (!device.config.ipAddress && device.type !== "cloud") {
      var newIp = pickAvailableAutoLanIp();
      if (newIp) {
        device.config.ipAddress = newIp;
        device.config.subnetMask = AUTO_NETWORK.mask;
      }
    }
    updateDeviceStatus(device);
  }

  // Second pass: set gateways for end devices
  for (var j = 0; j < state.devices.length; j++) {
    var endDevice = state.devices[j];
    if (!endDevice.config || endDevice.config.defaultGateway) {
      continue;
    }
    var category = DEVICE_TYPES[endDevice.type] ? DEVICE_TYPES[endDevice.type].category : "";
    if (category === "End Devices" && endDevice.config.ipAddress) {
      endDevice.config.defaultGateway = AUTO_NETWORK.gateway;
    }
  }
}


// Find a path between two devices using breadth-first search
function findPath(startId, endId) {
  if (startId === endId) {
    return [startId];
  }

  var visited = {};
  var queue = [[startId]];
  visited[startId] = true;

  while (queue.length > 0) {
    var currentPath = queue.shift();
    var currentNode = currentPath[currentPath.length - 1];

    // Look at all connections from the current device
    for (var i = 0; i < state.connections.length; i++) {
      var connection = state.connections[i];

      // Skip connections that are down
      if (!connection.isUp) {
        continue;
      }

      var nextNode = null;
      if (connection.from === currentNode) {
        nextNode = connection.to;
      } else if (connection.to === currentNode) {
        nextNode = connection.from;
      }

      if (nextNode && !visited[nextNode]) {
        var newPath = currentPath.slice();
        newPath.push(nextNode);
        if (nextNode === endId) {
          return newPath;
        }
        visited[nextNode] = true;
        queue.push(newPath);
      }
    }
  }

  return null;
}


// Rebuild MAC address tables for all switches
function rebuildMacTables() {
  for (var i = 0; i < state.devices.length; i++) {
    var device = state.devices[i];
    if (device.type !== "switch") {
      continue;
    }
    device.config.macTable = [];

    // Look at all connections to this switch
    for (var j = 0; j < state.connections.length; j++) {
      var connection = state.connections[j];
      var connectedDeviceId = null;
      var interfaceName = null;

      if (connection.from === device.id) {
        connectedDeviceId = connection.to;
        interfaceName = connection.fromInterface;
      } else if (connection.to === device.id) {
        connectedDeviceId = connection.from;
        interfaceName = connection.toInterface;
      }

      if (!connectedDeviceId) {
        continue;
      }

      var connectedDevice = findDevice(connectedDeviceId);
      if (connectedDevice && connectedDevice.config && connectedDevice.config.macAddress) {
        device.config.macTable.push({
          mac: connectedDevice.config.macAddress,
          interface: interfaceName || "unknown",
          type: "dynamic"
        });
      }
    }
  }
}


// Execute a ping between two devices and return the result
function executePing(sourceDevice, destinationDevice) {
  var result = {
    success: false,
    message: "",
    hops: [],
    latency: 0,
    path: []
  };

  // Check that both devices have IP addresses
  if (!sourceDevice.config || !sourceDevice.config.ipAddress) {
    result.message = "Source device " + sourceDevice.name + " has no IP address.";
    return result;
  }
  if (!destinationDevice.config || !destinationDevice.config.ipAddress) {
    result.message = "Destination device " + destinationDevice.name + " has no IP address.";
    return result;
  }

  var sourceIp = sourceDevice.config.ipAddress;
  var destinationIp = destinationDevice.config.ipAddress;
  var sourceMask = sourceDevice.config.subnetMask || "255.255.255.0";

  // Check if they are on the same subnet
  var sameSubnet = isSameSubnet(sourceIp, destinationIp, sourceMask);

  // If not on same subnet, check if source has a gateway
  if (!sameSubnet) {
    if (!sourceDevice.config.defaultGateway) {
      result.message = "Ping failed: " + sourceDevice.name + " has no default gateway set for off-subnet traffic.";
      return result;
    }
    var gatewayDevice = findDeviceByIp(sourceDevice.config.defaultGateway);
    if (!gatewayDevice) {
      result.message = "Ping failed: Default gateway " + sourceDevice.config.defaultGateway + " is not reachable.";
      return result;
    }
  }

  // Try to find a path between the devices
  var path = findPath(sourceDevice.id, destinationDevice.id);
  if (!path) {
    result.message = "Ping failed: No route from " + sourceDevice.name + " to " + destinationDevice.name + ".";
    return result;
  }

  // Calculate latency based on the connections in the path
  var totalLatency = 0;
  var hopNames = [];
  for (var i = 0; i < path.length; i++) {
    var device = findDevice(path[i]);
    if (device) {
      hopNames.push(device.name);
    }
    if (i < path.length - 1) {
      // Find the connection between this hop and the next
      for (var j = 0; j < state.connections.length; j++) {
        var conn = state.connections[j];
        var connects = (conn.from === path[i] && conn.to === path[i + 1]) ||
                       (conn.to === path[i] && conn.from === path[i + 1]);
        if (connects) {
          var bandwidth = BANDWIDTH_MAP[conn.type] || 100;
          totalLatency += Math.max(1, Math.round(1000 / bandwidth));
          break;
        }
      }
    }
  }

  result.success = true;
  result.message = "Reply from " + destinationIp + ": bytes=32 time=" + totalLatency + "ms TTL=" + (64 - path.length + 1);
  result.hops = hopNames;
  result.latency = totalLatency;
  result.path = path;
  return result;
}


// Handle a DHCP request for a device
function requestDhcp(device) {
  if (!device || !device.config) {
    return { success: false, message: "Invalid device." };
  }

  // Look for a DHCP server on the network
  var dhcpServer = null;
  for (var i = 0; i < state.devices.length; i++) {
    var otherDevice = state.devices[i];
    if (otherDevice.id !== device.id && otherDevice.config && otherDevice.config.dhcpServer && otherDevice.config.dhcpServer.enabled) {
      var pathToServer = findPath(device.id, otherDevice.id);
      if (pathToServer) {
        dhcpServer = otherDevice;
        break;
      }
    }
  }

  if (!dhcpServer) {
    // No DHCP server found, assign auto IP
    var autoIp = pickAvailableAutoLanIp();
    if (autoIp) {
      device.config.ipAddress = autoIp;
      device.config.subnetMask = AUTO_NETWORK.mask;
      device.config.defaultGateway = AUTO_NETWORK.gateway;
      device.config.dhcpEnabled = true;
      updateDeviceStatus(device);
      return { success: true, message: "DHCP: Auto-assigned " + autoIp + " (no server found, using default pool)." };
    }
    return { success: false, message: "DHCP failed: No DHCP server reachable and no auto IPs available." };
  }

  // Use the DHCP server pool
  var pool = dhcpServer.config.dhcpServer;
  var startParts = pool.poolStart ? pool.poolStart.split(".") : [];
  var endParts = pool.poolEnd ? pool.poolEnd.split(".") : [];
  if (startParts.length !== 4 || endParts.length !== 4) {
    return { success: false, message: "DHCP server pool is not configured properly." };
  }

  var startHost = Number(startParts[3]);
  var endHost = Number(endParts[3]);

  // Collect already used IPs
  var usedIps = [];
  for (var j = 0; j < state.devices.length; j++) {
    if (state.devices[j].config && state.devices[j].config.ipAddress) {
      usedIps.push(state.devices[j].config.ipAddress);
    }
  }

  // Find a free IP in the pool
  var prefix = startParts[0] + "." + startParts[1] + "." + startParts[2] + ".";
  for (var host = startHost; host <= endHost; host++) {
    var candidateIp = prefix + host;
    if (usedIps.indexOf(candidateIp) === -1) {
      device.config.ipAddress = candidateIp;
      device.config.subnetMask = AUTO_NETWORK.mask;
      device.config.defaultGateway = dhcpServer.config.ipAddress || AUTO_NETWORK.gateway;
      device.config.dhcpEnabled = true;
      if (pool.dns) {
        device.config.dnsServer = pool.dns;
      }
      updateDeviceStatus(device);
      return { success: true, message: "DHCP: Assigned " + candidateIp + " from server " + dhcpServer.name + "." };
    }
  }

  return { success: false, message: "DHCP pool exhausted on " + dhcpServer.name + "." };
}


// Find a good position for a new device on the canvas (spiral outward from center)
function getNextDevicePosition() {
  if (state.devices.length === 0) {
    return { x: CANVAS_WIDTH / 2 - DEVICE_RADIUS, y: CANVAS_HEIGHT / 2 - DEVICE_RADIUS };
  }

  var spacing = DEVICE_SIZE + 40;
  var centerX = CANVAS_WIDTH / 2;
  var centerY = CANVAS_HEIGHT / 2;
  var angle = 0;
  var radius = spacing;

  for (var attempt = 0; attempt < 200; attempt++) {
    var candidateX = centerX + Math.cos(angle) * radius - DEVICE_RADIUS;
    var candidateY = centerY + Math.sin(angle) * radius - DEVICE_RADIUS;

    if (state.snap) {
      candidateX = Math.round(candidateX / GRID_SIZE) * GRID_SIZE;
      candidateY = Math.round(candidateY / GRID_SIZE) * GRID_SIZE;
    }

    // Check if this position overlaps with any existing device
    var overlaps = false;
    for (var i = 0; i < state.devices.length; i++) {
      var existingDevice = state.devices[i];
      var distanceX = Math.abs(candidateX - existingDevice.x);
      var distanceY = Math.abs(candidateY - existingDevice.y);
      if (distanceX < DEVICE_SIZE && distanceY < DEVICE_SIZE) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps && candidateX > 0 && candidateY > 0 && candidateX < CANVAS_WIDTH - DEVICE_SIZE && candidateY < CANVAS_HEIGHT - DEVICE_SIZE) {
      return { x: candidateX, y: candidateY };
    }

    angle += 0.8;
    radius += spacing * 0.05;
  }

  // Fallback to a random position
  return {
    x: Math.round((Math.random() * (CANVAS_WIDTH - DEVICE_SIZE * 2) + DEVICE_SIZE) / GRID_SIZE) * GRID_SIZE,
    y: Math.round((Math.random() * (CANVAS_HEIGHT - DEVICE_SIZE * 2) + DEVICE_SIZE) / GRID_SIZE) * GRID_SIZE
  };
}


// Create a drag ghost element for when dragging devices from the library
function createDragGhost(deviceType) {
  var typeInfo = DEVICE_TYPES[deviceType] || DEVICE_TYPES.pc;
  var ghost = document.createElement("div");
  ghost.className = "sbx-drag-ghost";
  ghost.innerHTML = '<i class="bi ' + typeInfo.icon + '"></i>';
  ghost.style.position = "fixed";
  ghost.style.pointerEvents = "none";
  ghost.style.zIndex = "9999";
  ghost.style.opacity = "0.7";
  document.body.appendChild(ghost);
  return ghost;
}

// Update the position of the drag ghost to follow the mouse
function positionDragGhost(ghost, mouseX, mouseY) {
  if (!ghost) {
    return;
  }
  ghost.style.left = (mouseX - 24) + "px";
  ghost.style.top = (mouseY - 24) + "px";
}


// Topology templates - preset networks the user can load quickly
var TOPOLOGY_TEMPLATES = {
  star: {
    label: "Star",
    description: "One switch in the center with 4 PCs connected",
    build: function () {
      var centerX = CANVAS_WIDTH / 2;
      var centerY = CANVAS_HEIGHT / 2;
      var devices = [];
      var connections = [];

      // Add the central switch
      var switchDevice = normalizeDevice({ type: "switch", x: centerX - DEVICE_RADIUS, y: centerY - DEVICE_RADIUS, name: "Central-Switch" });
      devices.push(switchDevice);

      // Add 4 PCs around the switch
      var angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
      for (var i = 0; i < 4; i++) {
        var pcX = centerX + Math.cos(angles[i]) * 200 - DEVICE_RADIUS;
        var pcY = centerY + Math.sin(angles[i]) * 200 - DEVICE_RADIUS;
        var pc = normalizeDevice({ type: "pc", x: pcX, y: pcY, name: "PC-" + (i + 1) });
        devices.push(pc);
        connections.push(normalizeConnection({ from: pc.id, to: switchDevice.id, type: "ethernet" }));
      }

      return { devices: devices, connections: connections };
    }
  },
  bus: {
    label: "Bus",
    description: "Devices connected in a line through switches",
    build: function () {
      var startX = 400;
      var startY = CANVAS_HEIGHT / 2;
      var devices = [];
      var connections = [];

      for (var i = 0; i < 4; i++) {
        var pc = normalizeDevice({ type: "pc", x: startX + i * 250, y: startY - 150, name: "PC-" + (i + 1) });
        var sw = normalizeDevice({ type: "switch", x: startX + i * 250, y: startY, name: "Switch-" + (i + 1) });
        devices.push(pc);
        devices.push(sw);
        connections.push(normalizeConnection({ from: pc.id, to: sw.id, type: "ethernet" }));
        if (i > 0) {
          var previousSwitch = devices[(i * 2) - 1];
          connections.push(normalizeConnection({ from: previousSwitch.id, to: sw.id, type: "ethernet" }));
        }
      }

      return { devices: devices, connections: connections };
    }
  },
  ring: {
    label: "Ring",
    description: "Devices connected in a circular loop",
    build: function () {
      var centerX = CANVAS_WIDTH / 2;
      var centerY = CANVAS_HEIGHT / 2;
      var devices = [];
      var connections = [];
      var deviceCount = 6;

      for (var i = 0; i < deviceCount; i++) {
        var angle = (i / deviceCount) * Math.PI * 2 - Math.PI / 2;
        var deviceX = centerX + Math.cos(angle) * 250 - DEVICE_RADIUS;
        var deviceY = centerY + Math.sin(angle) * 250 - DEVICE_RADIUS;
        var deviceType = (i % 2 === 0) ? "switch" : "pc";
        var deviceName = deviceType.charAt(0).toUpperCase() + deviceType.slice(1) + "-" + (i + 1);
        var device = normalizeDevice({ type: deviceType, x: deviceX, y: deviceY, name: deviceName });
        devices.push(device);
      }

      // Connect in a ring
      for (var j = 0; j < devices.length; j++) {
        var nextIndex = (j + 1) % devices.length;
        connections.push(normalizeConnection({ from: devices[j].id, to: devices[nextIndex].id, type: "ethernet" }));
      }

      return { devices: devices, connections: connections };
    }
  },
  mesh: {
    label: "Full Mesh",
    description: "Every router connected to every other router",
    build: function () {
      var centerX = CANVAS_WIDTH / 2;
      var centerY = CANVAS_HEIGHT / 2;
      var devices = [];
      var connections = [];
      var routerCount = 4;

      for (var i = 0; i < routerCount; i++) {
        var angle = (i / routerCount) * Math.PI * 2 - Math.PI / 2;
        var routerX = centerX + Math.cos(angle) * 220 - DEVICE_RADIUS;
        var routerY = centerY + Math.sin(angle) * 220 - DEVICE_RADIUS;
        var router = normalizeDevice({ type: "router", x: routerX, y: routerY, name: "Router-" + (i + 1) });
        devices.push(router);
      }

      // Connect every router to every other router
      for (var a = 0; a < devices.length; a++) {
        for (var b = a + 1; b < devices.length; b++) {
          connections.push(normalizeConnection({ from: devices[a].id, to: devices[b].id, type: "ethernet" }));
        }
      }

      return { devices: devices, connections: connections };
    }
  }
};

// Generate a topology summary text for the "Explain This Topology" feature
function generateTopologySummary() {
  if (state.devices.length === 0) {
    return "The canvas is empty. Add some devices to get started!";
  }

  var summary = "This topology has " + state.devices.length + " device" + (state.devices.length === 1 ? "" : "s");
  summary += " and " + state.connections.length + " connection" + (state.connections.length === 1 ? "" : "s") + ".\n\n";

  // Count device types
  var typeCounts = {};
  for (var i = 0; i < state.devices.length; i++) {
    var deviceType = state.devices[i].type;
    if (!typeCounts[deviceType]) {
      typeCounts[deviceType] = 0;
    }
    typeCounts[deviceType] = typeCounts[deviceType] + 1;
  }

  summary += "Devices: ";
  var typeNames = Object.keys(typeCounts);
  for (var j = 0; j < typeNames.length; j++) {
    var typeName = typeNames[j];
    var typeLabel = DEVICE_TYPES[typeName] ? DEVICE_TYPES[typeName].label : typeName;
    summary += typeCounts[typeName] + " " + typeLabel;
    if (j < typeNames.length - 1) {
      summary += ", ";
    }
  }
  summary += "\n";

  // Count connection types
  var connCounts = {};
  for (var k = 0; k < state.connections.length; k++) {
    var connType = state.connections[k].type;
    if (!connCounts[connType]) {
      connCounts[connType] = 0;
    }
    connCounts[connType] = connCounts[connType] + 1;
  }

  if (state.connections.length > 0) {
    summary += "Connections: ";
    var connNames = Object.keys(connCounts);
    for (var m = 0; m < connNames.length; m++) {
      var connName = connNames[m];
      var connLabel = CONNECTION_TYPES[connName] ? CONNECTION_TYPES[connName].label : connName;
      summary += connCounts[connName] + " " + connLabel;
      if (m < connNames.length - 1) {
        summary += ", ";
      }
    }
    summary += "\n";
  }

  // Check for configured devices
  var configuredCount = 0;
  var unconfiguredCount = 0;
  for (var n = 0; n < state.devices.length; n++) {
    if (state.devices[n].config && state.devices[n].config.ipAddress) {
      configuredCount++;
    } else {
      unconfiguredCount++;
    }
  }
  summary += "\n" + configuredCount + " configured (have IP), " + unconfiguredCount + " unconfigured.\n";

  // Check for conflicts
  var conflicts = findSubnetConflicts();
  if (conflicts.length > 0) {
    summary += "\nWarnings:\n";
    for (var p = 0; p < conflicts.length; p++) {
      summary += "  - " + conflicts[p].message + "\n";
    }
  } else if (configuredCount > 0) {
    summary += "\nNo IP conflicts or subnet mismatches detected.";
  }

  return summary;
}

// Build an ARP table for a device showing MAC-to-IP mappings of reachable devices
function buildArpTable(device) {
  if (!device || !device.config || !device.config.ipAddress) {
    return [];
  }
  var arpEntries = [];
  var mask = device.config.subnetMask || "255.255.255.0";

  for (var i = 0; i < state.devices.length; i++) {
    var otherDevice = state.devices[i];
    if (otherDevice.id === device.id) {
      continue;
    }
    if (!otherDevice.config || !otherDevice.config.ipAddress || !otherDevice.config.macAddress) {
      continue;
    }
    // Only show devices on the same subnet or directly connected
    var sameNet = isSameSubnet(device.config.ipAddress, otherDevice.config.ipAddress, mask);
    var directlyConnected = false;
    for (var j = 0; j < state.connections.length; j++) {
      var conn = state.connections[j];
      if ((conn.from === device.id && conn.to === otherDevice.id) || (conn.to === device.id && conn.from === otherDevice.id)) {
        directlyConnected = true;
        break;
      }
    }
    if (sameNet || directlyConnected) {
      arpEntries.push({
        ip: otherDevice.config.ipAddress,
        mac: otherDevice.config.macAddress,
        interface: "Ethernet0",
        type: "dynamic"
      });
    }
  }

  return arpEntries;
}
