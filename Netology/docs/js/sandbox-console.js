/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: sandbox-console.js
Purpose: Runs the sandbox terminal, command history,
and console command handlers.
---------------------------------------------------------
*/

// ----------------------------------------
// Console + logs
// ----------------------------------------
function loadConsoleHistory() {
  const savedHistory = parseJsonSafe(localStorage.getItem(CONSOLE_HISTORY_KEY), []);
  if (!Array.isArray(savedHistory)) return;

  state.commandHistory = savedHistory
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .slice(-CONSOLE_HISTORY_LIMIT);
  state.commandHistoryIndex = state.commandHistory.length;
}

function saveConsoleHistory() {
  const trimmedHistory = state.commandHistory.slice(-CONSOLE_HISTORY_LIMIT);
  localStorage.setItem(CONSOLE_HISTORY_KEY, JSON.stringify(trimmedHistory));
}

function addCommandToHistory(command) {
  const normalizedCommand = String(command || "").trim();
  if (!normalizedCommand) return;
  state.commandHistory.push(normalizedCommand);
  state.commandHistory = state.commandHistory.slice(-CONSOLE_HISTORY_LIMIT);
  state.commandHistoryIndex = state.commandHistory.length;
  saveConsoleHistory();
}

function stepCommandHistory(direction) {
  if (!state.commandHistory.length) return "";

  const nextIndex = state.commandHistoryIndex + direction;
  if (nextIndex < 0) return state.commandHistory[0] || "";

  if (nextIndex >= state.commandHistory.length) {
    state.commandHistoryIndex = state.commandHistory.length;
    return "";
  }

  state.commandHistoryIndex = nextIndex;
  return state.commandHistory[state.commandHistoryIndex] || "";
}

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

function clearConsoleOutput() {
  state.consoleOutput = [];
  renderConsole();
}

function findDeviceByName(deviceName) {
  const normalizedName = String(deviceName || "").trim().toLowerCase();
  if (!normalizedName) return null;
  return state.devices.find((device) => String(device.name || "").trim().toLowerCase() === normalizedName) || null;
}

function findDeviceByIp(ipAddress) {
  const normalizedIp = String(ipAddress || "").trim();
  if (!isValidIP(normalizedIp)) return null;
  return state.devices.find((device) => String(device.config?.ipAddress || "").trim() === normalizedIp) || null;
}

function findDeviceByIdentifier(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  return findDeviceByName(raw) || findDeviceByIp(raw);
}

function showPingUsage(commandName = "ping") {
  addConsoleOutput(`Usage: ${commandName} <source> <destination>`);
  addConsoleOutput(`   or: ${commandName} <destination>  (with one source device selected)`);
  addConsoleOutput("Input accepts device name or IP address (no ? needed).");
  addConsoleOutput(`Examples: ${commandName} pc router | ${commandName} 192.168.1.10`);
}

function showHelpCommand() {
  addConsoleOutput("Commands:");
  addConsoleOutput("  help");
  addConsoleOutput("  show devices | show connections | show stats");
  addConsoleOutput("  devices | connections | status");
  addConsoleOutput("  ping <source> <destination>  (device name or IP)");
  addConsoleOutput("  traceroute <source> <destination>  (device name or IP)");
  addConsoleOutput("  ipconfig [device|ip]");
  addConsoleOutput("  configure <device> <ip|mask|gateway|name|dhcp> <value>");
  addConsoleOutput("  dhcp request  (selected device)");
  addConsoleOutput("  reset");
  addConsoleOutput("  clear");
  addConsoleOutput("  save");
  addConsoleOutput("Tip: ping/traceroute can use one argument if a source device is selected.");
  addConsoleOutput("Tip: New devices are auto-assigned valid IP/mask/gateway values.");
}

function showDevicesCommand() {
  if (!state.devices.length) {
    addConsoleOutput("No devices in topology.");
    return;
  }

  addConsoleOutput(`Total devices: ${state.devices.length}`);
  state.devices.forEach((device) => {
    addConsoleOutput(`${device.name} (${device.type}) - ${device.config.ipAddress || "No IP"}`);
  });
}

function showConnectionsCommand() {
  if (!state.connections.length) {
    addConsoleOutput("No connections in topology.");
    return;
  }

  addConsoleOutput(`Total connections: ${state.connections.length}`);
  state.connections.forEach((connection, index) => {
    const fromDevice = findDevice(connection.from);
    const toDevice = findDevice(connection.to);
    const statusLabel = connection.status === "active" ? "Active" : "Down";
    addConsoleOutput(`${index + 1}. ${fromDevice?.name || "?"} ↔ ${toDevice?.name || "?"} (${connection.type}, ${statusLabel})`);
  });
}

function showStatusCommand() {
  const activeConnections = state.connections.filter((connection) => connection.status === "active").length;
  addConsoleOutput(`Devices: ${state.devices.length}`);
  addConsoleOutput(`Connections: ${state.connections.length} (${activeConnections} active)`);
  addConsoleOutput(`Selected: ${state.selectedIds.length || 0}`);
}

function resolveCommandEndpoints(args, usageText) {
  if (args.length >= 2) {
    const sourceDevice = findDeviceByIdentifier(args[0]);
    const destinationDevice = findDeviceByIdentifier(args[1]);
    if (!sourceDevice) {
      addConsoleOutput(`Source "${args[0]}" not found.`);
      addConsoleOutput("Use an exact device name or assigned IP.");
      return null;
    }
    if (!destinationDevice) {
      addConsoleOutput(`Destination "${args[1]}" not found.`);
      addConsoleOutput("Use an exact device name or assigned IP.");
      return null;
    }
    return { sourceDevice, destinationDevice };
  }

  if (args.length === 1) {
    const selectedDevice = getSelectedDevice();
    if (!selectedDevice) {
      addConsoleOutput(`${usageText} or select one source device first.`);
      return null;
    }
    const destinationDevice = findDeviceByIdentifier(args[0]);
    if (!destinationDevice) {
      addConsoleOutput(`Destination "${args[0]}" not found.`);
      addConsoleOutput("Use an exact device name or assigned IP.");
      return null;
    }
    return { sourceDevice: selectedDevice, destinationDevice };
  }

  addConsoleOutput(usageText);
  return null;
}

function runPingCommand(args) {
  if (!args.length || ["?", "help", "-h"].includes(String(args[0] || "").trim())) {
    showPingUsage("ping");
    return;
  }

  const endpoints = resolveCommandEndpoints(args, "Usage: ping <source> <destination>");
  if (!endpoints) return;

  const { sourceDevice, destinationDevice } = endpoints;
  addConsoleOutput(`Pinging ${destinationDevice.name} from ${sourceDevice.name}...`);
  executePing(sourceDevice.id, destinationDevice.id);

  if (!state.pingInspector) return;
  if (state.pingInspector.success) {
    addConsoleOutput(`Reply from ${destinationDevice.config?.ipAddress || destinationDevice.name}: time=${state.pingInspector.latency || 1}ms`);
    return;
  }
  addConsoleOutput(`Request failed: ${state.pingInspector.message || "No route"}`);
}

function runTracerouteCommand(args) {
  if (!args.length || ["?", "help", "-h"].includes(String(args[0] || "").trim())) {
    showPingUsage("traceroute");
    return;
  }

  const endpoints = resolveCommandEndpoints(args, "Usage: traceroute <source> <destination>");
  if (!endpoints) return;

  const { sourceDevice, destinationDevice } = endpoints;
  addConsoleOutput(`Traceroute from ${sourceDevice.name} to ${destinationDevice.name}...`);
  const path = findPath(sourceDevice.id, destinationDevice.id);

  if (!path.length) {
    addConsoleOutput("No route found.");
    return;
  }

  path.forEach((hopId, index) => {
    const hopDevice = findDevice(hopId);
    const latencyMs = ((index + 1) * (Math.random() * 2 + 0.5)).toFixed(1);
    addConsoleOutput(`  ${index + 1}  ${hopDevice?.name || "?"} (${hopDevice?.config?.ipAddress || "no ip"})  ${latencyMs}ms`);
  });
  addConsoleOutput(`Trace complete. ${path.length} hop(s).`);
}

function runIpConfigCommand(args) {
  if (args.length >= 1) {
    const targetDevice = findDeviceByIdentifier(args[0]);
    if (!targetDevice) {
      addConsoleOutput(`Device "${args[0]}" not found.`);
      addConsoleOutput("Use an exact device name or assigned IP.");
      return;
    }
    addConsoleOutput(`${targetDevice.name} IP: ${targetDevice.config.ipAddress || "Not set"}`);
    addConsoleOutput(`${targetDevice.name} Mask: ${targetDevice.config.subnetMask || "Not set"}`);
    addConsoleOutput(`${targetDevice.name} Gateway: ${targetDevice.config.defaultGateway || "Not set"}`);
    return;
  }

  const selectedDevice = getSelectedDevice();
  if (selectedDevice) {
    addConsoleOutput(`IP: ${selectedDevice.config.ipAddress || "Not set"}`);
    addConsoleOutput(`Mask: ${selectedDevice.config.subnetMask || "Not set"}`);
    addConsoleOutput(`Gateway: ${selectedDevice.config.defaultGateway || "Not set"}`);
    return;
  }

  if (!state.devices.length) {
    addConsoleOutput("No devices in topology.");
    return;
  }

  state.devices.forEach((device) => {
    addConsoleOutput(`${device.name}: ${device.config.ipAddress || "Not set"} / ${device.config.subnetMask || "Not set"}`);
  });
}

function runConfigureCommand(args) {
  if (args.length < 3) {
    addConsoleOutput("Usage: configure <device> <property> <value>");
    return;
  }

  const [targetName, propertyName, ...valueParts] = args;
  const targetDevice = findDeviceByIdentifier(targetName);
  if (!targetDevice) {
    addConsoleOutput(`Device "${targetName}" not found.`);
    return;
  }

  const rawValue = valueParts.join(" ").trim();
  const normalizedProperty = String(propertyName || "").toLowerCase();
  const requestedIp = normalizedProperty === "ip" ? rawValue : String(targetDevice.config.ipAddress || "").trim();
  const requestedMask = (normalizedProperty === "mask" || normalizedProperty === "subnet" || normalizedProperty === "subnetmask")
    ? rawValue
    : String(targetDevice.config.subnetMask || "").trim();
  const requestedGateway = (normalizedProperty === "gateway" || normalizedProperty === "gw")
    ? rawValue
    : String(targetDevice.config.defaultGateway || "").trim();

  if (normalizedProperty === "ip") {
    targetDevice.config.ipAddress = rawValue;
  } else if (normalizedProperty === "mask" || normalizedProperty === "subnet" || normalizedProperty === "subnetmask") {
    targetDevice.config.subnetMask = rawValue;
  } else if (normalizedProperty === "gateway" || normalizedProperty === "gw") {
    targetDevice.config.defaultGateway = rawValue;
  } else if (normalizedProperty === "name" || normalizedProperty === "hostname") {
    targetDevice.name = rawValue || targetDevice.name;
  } else if (normalizedProperty === "dhcp") {
    const enabled = ["true", "1", "yes", "on", "enabled"].includes(rawValue.toLowerCase());
    targetDevice.config.dhcpEnabled = enabled;
    if (enabled) requestDHCP(targetDevice.id);
  } else {
    targetDevice.config[normalizedProperty] = rawValue;
  }

  applyAutoNetworkDefaults();
  addActionLog(`Configured ${targetDevice.name}: ${normalizedProperty} = ${rawValue}`);
  pushHistory();
  renderAll();
  notifyTutorialProgress();
  markDirtyAndSaveSoon();
  addConsoleOutput(`Configured ${targetDevice.name}: ${normalizedProperty} = ${rawValue}`);

  const correctedIp = String(targetDevice.config.ipAddress || "").trim();
  const correctedMask = String(targetDevice.config.subnetMask || "").trim();
  const correctedGateway = String(targetDevice.config.defaultGateway || "").trim();
  const wasAutoCorrected =
    requestedIp !== correctedIp ||
    requestedMask !== correctedMask ||
    requestedGateway !== correctedGateway;

  if (wasAutoCorrected) {
    addConsoleOutput(`Auto-corrected network: IP=${correctedIp || "unset"}, Mask=${correctedMask || "unset"}, GW=${correctedGateway || "unset"}`);
  }
}

function runResetCommand() {
  const clearButton = getById("clearBtn");
  if (clearButton) {
    clearButton.click();
    addConsoleOutput("Reset requested. Confirm in the clear workspace dialog.");
    return;
  }
  addConsoleOutput("Use the Clear button in the toolbar to reset the workspace.");
}

function executeCommand(rawCommand) {
  const command = String(rawCommand || "").trim();
  if (!command) return;

  addConsoleOutput(`> ${command}`);
  const parts = command.toLowerCase().split(/\s+/);
  const commandName = parts[0];
  const args = parts.slice(1);

  if (commandName === "help") {
    showHelpCommand();
    return;
  }

  if (commandName === "show") {
    if (args[0] === "devices") {
      showDevicesCommand();
      return;
    }
    if (args[0] === "connections") {
      showConnectionsCommand();
      return;
    }
    if (args[0] === "stats" || args[0] === "status") {
      showStatusCommand();
      return;
    }
    addConsoleOutput("Usage: show devices | show connections | show stats");
    return;
  }

  if (commandName === "devices") {
    showDevicesCommand();
    return;
  }

  if (commandName === "connections") {
    showConnectionsCommand();
    return;
  }

  if (commandName === "status") {
    showStatusCommand();
    return;
  }

  if (commandName === "ping") {
    runPingCommand(args);
    return;
  }

  if (commandName === "traceroute") {
    runTracerouteCommand(args);
    return;
  }

  if (commandName === "ipconfig") {
    runIpConfigCommand(args);
    return;
  }

  if (commandName === "configure") {
    runConfigureCommand(args);
    return;
  }

  if (commandName === "dhcp") {
    if (!args.length || ["?", "help", "-h"].includes(String(args[0] || "").trim())) {
      addConsoleOutput("Usage: dhcp request");
      addConsoleOutput("Select one device, then run: dhcp request");
      return;
    }
    if (args[0] === "request") {
      const selectedDevice = getSelectedDevice();
      if (selectedDevice) requestDHCP(selectedDevice.id);
      else addConsoleOutput("No device selected. Select one device first.");
      return;
    }
    addConsoleOutput("Usage: dhcp request");
    return;
  }

  if (commandName === "clear") {
    clearConsoleOutput();
    return;
  }

  if (commandName === "save") {
    handleSaveTopology();
    return;
  }

  if (commandName === "reset") {
    runResetCommand();
    return;
  }

  addConsoleOutput("Unknown command. Type help.");
}

function showConsoleWelcome() {
  if (!state.consoleOutput.length) {
    state.consoleOutput.push("Network Sandbox Pro v2.0");
    state.consoleOutput.push("Ready.");
  }
  addConsoleOutput('Type "help" for available commands.');
}

function registerConsoleApi() {
  const consoleApi = {
    runCommand: (command) => {
      const value = String(command || "").trim();
      if (!value) return;
      addCommandToHistory(value);
      executeCommand(value);
    },
    addLine: (text, type = "default") => {
      const line = String(text || "");
      if (!line) return;
      if (type === "cmd") {
        addConsoleOutput(`> ${line}`);
        return;
      }
      addConsoleOutput(line);
    },
    clear: () => {
      clearConsoleOutput();
    },
    focusInput: () => {
      consoleInputEl?.focus();
    },
    showWelcome: () => {
      showConsoleWelcome();
    },
    getHistory: () => [...state.commandHistory],
  };

  window.sandboxConsole = consoleApi;
}
