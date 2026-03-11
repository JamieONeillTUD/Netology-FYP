/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: sandbox-network.js
Purpose: Handles sandbox network rules, data normalisation,
ping logic, path finding, and DHCP behaviour.
---------------------------------------------------------
*/

function getNextDevicePosition() {
  const rect = stage.getBoundingClientRect();
  const viewportCenter = toWorldPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  const centerX = viewportCenter.x - DEVICE_RADIUS;
  const centerY = viewportCenter.y - DEVICE_RADIUS;
  const padding = 16;
  const index = state.devices.length;

  if (index === 0) {
    return {
      x: clamp(centerX, padding, CANVAS_WIDTH - DEVICE_SIZE - padding),
      y: clamp(centerY, padding, CANVAS_HEIGHT - DEVICE_SIZE - padding),
    };
  }

  const step = DEVICE_SIZE + 20;
  const ringIndex = index - 1;
  const ring = Math.floor(ringIndex / 8) + 1;
  const angle = ringIndex * 0.9;
  const radius = ring * step;
  let x = centerX + Math.cos(angle) * radius;
  let y = centerY + Math.sin(angle) * radius;
  x = clamp(x, padding, CANVAS_WIDTH - DEVICE_SIZE - padding);
  y = clamp(y, padding, CANVAS_HEIGHT - DEVICE_SIZE - padding);
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

function buildAutoLanIp(host) {
  return `${AUTO_NETWORK.prefix}${host}`;
}

function pickAvailableAutoLanIp(usedIps, preferredHost = null) {
  if (Number.isInteger(preferredHost)) {
    const preferredIp = buildAutoLanIp(preferredHost);
    if (!usedIps.has(preferredIp)) return preferredIp;
  }

  for (let host = AUTO_NETWORK.startHost; host <= AUTO_NETWORK.endHost; host += 1) {
    const candidate = buildAutoLanIp(host);
    if (!usedIps.has(candidate)) return candidate;
  }

  for (let host = 2; host <= 254; host += 1) {
    const candidate = buildAutoLanIp(host);
    if (!usedIps.has(candidate)) return candidate;
  }

  return "";
}

function applyAutoNetworkDefaults({ force = false } = {}) {
  if (!state.devices.length) return;

  const orderedDevices = [...state.devices].sort((a, b) => {
    const aRank = a.type === "router" ? 0 : 1;
    const bRank = b.type === "router" ? 0 : 1;
    return aRank - bRank;
  });

  const usedIps = new Set();
  let primaryRouterIp = "";

  orderedDevices.forEach((device) => {
    if (!device?.config) return;
    const isCloud = device.type === "cloud";

    if (force || !isValidSubnet(device.config.subnetMask)) {
      device.config.subnetMask = AUTO_NETWORK.mask;
    }
    if (isCloud) {
      updateDeviceStatus(device);
      return;
    }

    const currentIp = String(device.config.ipAddress || "").trim();
    const validCurrentIp = isValidIP(currentIp);
    const duplicateCurrentIp = validCurrentIp && usedIps.has(currentIp);

    if (force || !validCurrentIp || duplicateCurrentIp) {
      const preferredHost = device.type === "router" && !primaryRouterIp
        ? AUTO_NETWORK.routerHost
        : null;
      const nextIp = pickAvailableAutoLanIp(usedIps, preferredHost);
      if (nextIp) device.config.ipAddress = nextIp;
    }

    const finalIp = String(device.config.ipAddress || "").trim();
    if (isValidIP(finalIp)) {
      usedIps.add(finalIp);
      if (!primaryRouterIp && device.type === "router") primaryRouterIp = finalIp;
    }
  });

  state.devices.forEach((device) => {
    if (!device?.config) return;
    if (force || !isValidSubnet(device.config.subnetMask)) {
      device.config.subnetMask = AUTO_NETWORK.mask;
    }

    if (device.type === "router" || device.type === "cloud") {
      if (force || !isValidIP(String(device.config.defaultGateway || "").trim())) {
        device.config.defaultGateway = "";
      }
      updateDeviceStatus(device);
      return;
    }

    const gateway = String(device.config.defaultGateway || "").trim();
    const gatewayInTopology = gateway
      ? state.devices.some((d) => d.id !== device.id && String(d.config?.ipAddress || "").trim() === gateway)
      : false;
    const invalidOrMissingGateway = !gateway || !isValidIP(gateway) || gateway === device.config.ipAddress || !gatewayInTopology;

    if (force || invalidOrMissingGateway) {
      device.config.defaultGateway = primaryRouterIp || "";
    }

    updateDeviceStatus(device);
  });
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
  // Switch to Inspector tab so user sees the results
  setRightTab("inspector");
  showRightPanel();
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

// ----------------------------------------
// DHCP
// ----------------------------------------
function requestDHCP(deviceId) {
  const device = findDevice(deviceId);
  if (!device) return;

  const enabledServers = state.devices.filter((d) => d.config?.dhcpServer?.enabled && d.config?.dhcpServer);
  if (!enabledServers.length) {
    addConsoleOutput("DHCP: No enabled DHCP server found.");
    return;
  }

  const reachableServers = enabledServers.filter((server) => (
    server.id === device.id || findPath(device.id, server.id).length > 0
  ));
  if (!reachableServers.length) {
    addConsoleOutput("DHCP: DHCP server exists, but no route to server.");
    return;
  }

  const dhcpServer = reachableServers[0];
  const config = dhcpServer.config.dhcpServer;
  if (!Array.isArray(config.leases)) config.leases = [];

  if (!isValidIP(config.rangeStart) || !isValidIP(config.rangeEnd)) {
    addConsoleOutput(`DHCP: Invalid pool range on ${dhcpServer.name}.`);
    addConsoleOutput("Set valid Range Start and Range End in Config > DHCP.");
    return;
  }

  const startIP = ipToInt(config.rangeStart);
  const endIP = ipToInt(config.rangeEnd);
  if (startIP > endIP) {
    addConsoleOutput("DHCP: Range Start must be lower than or equal to Range End.");
    return;
  }

  const existingLease = config.leases.find((lease) => lease.mac === device.config.macAddress && isValidIP(lease.ip));
  if (existingLease) {
    device.config.ipAddress = existingLease.ip;
    device.config.subnetMask = config.mask || "255.255.255.0";
    device.config.defaultGateway = config.gateway || "";
    device.config.dhcpEnabled = true;
    updateDeviceStatus(device);
    addConsoleOutput(`DHCP: Reused ${existingLease.ip} for ${device.name}`);
    renderDevices();
    markDirtyAndSaveSoon();
    return;
  }

  const usedIPs = new Set(
    config.leases
      .filter((lease) => isValidIP(lease.ip))
      .map((lease) => ipToInt(lease.ip))
  );

  let assigned = null;
  for (let ip = startIP; ip <= endIP; ip += 1) {
    if (!usedIPs.has(ip)) {
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
  addConsoleOutput(`DHCP: Assigned ${ipString} to ${device.name} via ${dhcpServer.name}`);
  addActionLog(`DHCP assigned ${ipString} to ${device.name}`);
  renderDevices();
  markDirtyAndSaveSoon();
}
