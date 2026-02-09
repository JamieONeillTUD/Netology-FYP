/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript
---------------------------------------
AI PROMPTED CODE BELOW:
"Please write me a JavaScript file for an interactive network sandbox tool. This tool should allow users to 
create a simple network topology on an empty space (canvas). The user interface should include a toolbar with options to add different network devices
(routers, switches, PCs), connect them with lines (representing network cables), and a properties panel to edit device details (name, IP address).
The canvas should support drag and drop functionality for moving devices around. Users should be able to update select and delete the devices they want
and also see the Protype verison"

sandbox.js – Interactive network sandbox.

Place devices like routers, switches, and PCs on a canvas
Connect them with lines
Drag devices around
Edit device names and IP addresses
Delete devices
Clear the entire canvas
*/

(function () {
  //Settining up the sandbox environment
  // Canvas used for drawing the network
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d"); // 2D drawing context

  // UI elements
  const tipsEl = document.getElementById("tips");   // Text info under canvas
  const propsEl = document.getElementById("props"); // Right-side properties panel

  // Tool modes user can select
  const TOOL = {
    SELECT: "select",
    CONNECT: "connect",
    ROUTER: "router",
    SWITCH: "switch",
    PC: "pc",
  };

  // Current selected tool (default is SELECT)
  let currentTool = TOOL.SELECT;

  // Data structures for sandbox
  let devices = [];     // All device objects on the canvas
  let connections = []; // All links between devices

  // Selection and dragging state
  let selectedDeviceId = null; // id of the selected device (or null)
  let connectStartId = null;   // id of first device when connecting

  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  const DEVICE_RADIUS = 24; // Radius of each device circle


  // ---------------------------
  // NEW (UI Fix): Ping button visibility helper
  // ---------------------------
  // The page layout was revamped and Ping moved into the header.
  // We keep the same IDs, but now we must update its visibility whenever selection changes.
  const pingContainer = document.getElementById("pingContainer");
  function updatePingVisibility() {
    if (!pingContainer) return;
    pingContainer.style.display = selectedDeviceId ? "block" : "none";
  }

  // ---------------------------
  // Progress logging (local)
  // ---------------------------
  function safeJson(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

  function bumpUserXP(email, addXP) {
    if (!email || !addXP) return;
    const raw = localStorage.getItem("netology_user") || localStorage.getItem("user");
    const user = safeJson(raw) || {};
    if (!user || user.email !== email) return;
    user.xp = Math.max(0, Number(user.xp || 0) + Number(addXP || 0));
    if (localStorage.getItem("netology_user")) localStorage.setItem("netology_user", JSON.stringify(user));
    if (localStorage.getItem("user")) localStorage.setItem("user", JSON.stringify(user));
  }

  function logProgressEvent(email, payload) {
    if (!email) return;
    const entry = {
      type: payload.type,
      course_id: payload.course_id,
      lesson_number: payload.lesson_number,
      xp: Number(payload.xp || 0),
      ts: Date.now(),
      date: new Date().toISOString().slice(0, 10)
    };
    const key = `netology_progress_log:${email}`;
    const list = safeJson(localStorage.getItem(key)) || [];
    list.push(entry);
    localStorage.setItem(key, JSON.stringify(list));
  }

  function trackCourseStart(email, courseId, lessonNumber) {
    if (!email || !courseId) return;
    const key = `netology_started_courses:${email}`;
    const list = safeJson(localStorage.getItem(key)) || [];
    const existing = list.find((c) => String(c.id) === String(courseId));
    const payload = {
      id: String(courseId),
      lastViewed: Date.now(),
      lastLesson: Number(lessonNumber || 0) || undefined
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
    const data = safeJson(localStorage.getItem(key)) || { lesson: [], quiz: [], challenge: [] };
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


  // ---------------------------
  // NEW (Part 3): Lesson session state (DB save/load per lesson)
  // ---------------------------
  /*
  AI PROMPTED CODE BELOW:
  "Can you add a simple DB save/load system so sandbox state is stored per (user, course, lesson_number)
  using /lesson-session/save and /lesson-session/load, and make it work with the existing challenge flow?"
  */

  let __lessonSession = {
    enabled: false,       // true when challenge=1 and active challenge exists
    email: "",
    course_id: null,
    lesson_number: null,
    saving: false,
    lastSaveAt: 0,
    dirty: false
  };

  function getLoggedInUser() {
    return JSON.parse(localStorage.getItem("user") || "{}");
  }

  function getActiveChallengeMeta() {
    const raw = localStorage.getItem("netology_active_challenge");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function lessonSessionReady() {
    return (
      __lessonSession.enabled &&
      __lessonSession.email &&
      __lessonSession.course_id !== null &&
      __lessonSession.lesson_number !== null
    );
  }

  // Debounce helper for autosave
  function debounce(fn, delay) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  async function saveLessonSessionToDb() {
    if (!lessonSessionReady()) return;
    if (__lessonSession.saving) return;

    // Avoid spamming DB saves
    const now = Date.now();
    if (!__lessonSession.dirty && now - __lessonSession.lastSaveAt < 800) return;

    __lessonSession.saving = true;
    try {
      await fetch(`${window.API_BASE}/lesson-session/save`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          email: __lessonSession.email,
          course_id: __lessonSession.course_id,
          lesson_number: __lessonSession.lesson_number,
          devices: devices,
          connections: connections
        })
      });
      __lessonSession.lastSaveAt = Date.now();
      __lessonSession.dirty = false;
    } catch (e) {
      console.error("saveLessonSessionToDb error:", e);
    } finally {
      __lessonSession.saving = false;
    }
  }

  const scheduleAutoSave = debounce(async () => {
    await saveLessonSessionToDb();
  }, 550);

  function markDirtyAndSaveSoon() {
    if (!lessonSessionReady()) return;
    __lessonSession.dirty = true;
    scheduleAutoSave();
  }

  async function loadLessonSessionFromDb() {
    if (!lessonSessionReady()) return;

    try {
      const url =
        `${window.API_BASE}/lesson-session/load?email=${encodeURIComponent(__lessonSession.email)}&course_id=${encodeURIComponent(__lessonSession.course_id)}&lesson_number=${encodeURIComponent(__lessonSession.lesson_number)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.success) return;

      // If nothing found, keep current canvas
      if (!data.found) return;

      devices = data.devices || [];
      connections = data.connections || [];

      // Ensure any older saved devices get the new networking fields
      devices.forEach((d) => {
        if (typeof d.subnetMask === "undefined") d.subnetMask = "";
        if (typeof d.gateway === "undefined") d.gateway = "";
        if (typeof d.configVersion !== "number") d.configVersion = 1;
        if (typeof d.gatewayTouched === "undefined") d.gatewayTouched = false;
      });

      selectedDeviceId = null;
      connectStartId = null;

      // NEW (UI Fix): selection changed, update Ping visibility
      updatePingVisibility();

      draw();
      renderProps(null);
      setTip("Loaded your saved lesson session from the database.");
    } catch (e) {
      console.error("loadLessonSessionFromDb error:", e);
    }
  }


  //ToolBAR Buttons
  // When a toolbar button (Router, Switch, PC, Connect, Select) is clicked
  // update the current tool and show a helpful tip.
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      currentTool = button.getAttribute("data-tool");
      showTipForTool();
    });
  });

  function showTipForTool() {
    if (currentTool === TOOL.SELECT) {
      setTip("Click a device to select it. Drag to move it.");
    } else if (currentTool === TOOL.CONNECT) {
      setTip("Click one device, then another device to draw a connection.");
    } else {
      // For router, switch, pc placement
      setTip(`Click on the canvas to place a ${currentTool}.`);
    }
  }

  //Clear Canvas Button
  // When user clicks "Clear Canvas", remove all devices & connections.
  document.getElementById("clearBtn").addEventListener("click", () => {
    devices = [];
    connections = [];
    selectedDeviceId = null;
    connectStartId = null;

    // NEW (UI Fix): selection cleared, update Ping visibility
    updatePingVisibility();

    renderProps(null);
    draw();
    setTip("Canvas cleared.");

    // NEW (Part 3): autosave cleared state to DB for this lesson
    markDirtyAndSaveSoon();
  });

  //Mouse click events
  // Canvas click:
  // If placing tool - place a device
  // If select tool - select a device
  // If connect tool - pick 2 devices and connect them
  canvas.addEventListener("click", (e) => {
    const pos = getMousePosition(e);

    // Placing devices (router , switch , pc)
    if (isPlacingTool()) {
      placeDevice(currentTool, pos.x, pos.y);
      draw();

      // NEW (Part 3): autosave after edit
      markDirtyAndSaveSoon();
      return;
    }

    // Select or Connect on existing device
    const hitDevice = findDeviceAt(pos.x, pos.y);

    // Select mode highlights device and show its properties
    if (currentTool === TOOL.SELECT) {
      selectedDeviceId = hitDevice ? hitDevice.id : null;

      // NEW (UI Fix): selection changed, update Ping visibility
      updatePingVisibility();

      renderProps(selectedDeviceId);
      draw();
      return;
    }

    // Connect mode lets users clicks first device and  then second device
    if (currentTool === TOOL.CONNECT && hitDevice) {
      if (!connectStartId) {
        // First click
        connectStartId = hitDevice.id;
        setTip("Now click another device to finish the connection.");
      } else if (connectStartId !== hitDevice.id) {
        // Second click
        createConnection(connectStartId, hitDevice.id);
        connectStartId = null;
        draw();
        setTip("Devices connected. Switch to Select to move or edit.");

        // NEW (Part 3): autosave after edit
        markDirtyAndSaveSoon();
      }
    }
  });

  // Mouse down: start dragging a device (only in SELECT mode)
  canvas.addEventListener("mousedown", (e) => {
    if (currentTool !== TOOL.SELECT) return;

    const pos = getMousePosition(e);
    const hitDevice = findDeviceAt(pos.x, pos.y);
    if (!hitDevice) return;

    // Mark as selected
    selectedDeviceId = hitDevice.id;

    // NEW (UI Fix): selection changed, update Ping visibility
    updatePingVisibility();

    renderProps(selectedDeviceId);

    // Start dragging
    isDragging = true;
    dragOffsetX = pos.x - hitDevice.x;
    dragOffsetY = pos.y - hitDevice.y;

    draw();
  });

  // Mouse move: drag selected device around the canvas
  canvas.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const pos = getMousePosition(e);
    const d = getDevice(selectedDeviceId);
    if (!d) return;

    // Update device position based on mouse movement
    d.x = pos.x - dragOffsetX;
    d.y = pos.y - dragOffsetY;

    draw();
  });

  // Mouse up: stop dragging
  window.addEventListener("mouseup", () => {
    if (isDragging) {
      // NEW (Part 3): autosave after drag move ends
      markDirtyAndSaveSoon();
    }
    isDragging = false;
  });

  //Device placement , connection creation and selection
  // Create a new device and add it to the array
  function placeDevice(type, x, y) {
    // Simple unique id
    const id = Date.now() + "-" + Math.random().toString(16).slice(2);

    // Count how many devices of this type already exist to give "Router 1", "Router 2", etc.
    const count = devices.filter((d) => d.type === type).length + 1;

    devices.push({
      id,
      type,
      x,
      y,
      name: `${capitalize(type)} ${count}`,
      ip: "",
      // NEW networking fields for configuration
      subnetMask: "",
      gateway: "",
      // Version counter for configuration changes
      configVersion: 1,
      // Track if user manually touched gateway
      gatewayTouched: false,
    });
  }

  // Create a connection between two devices (by id)
  function createConnection(aId, bId) {
    if (aId === bId) return; // no self-connections

    // Avoid duplicate connections (A-B same as B-A)
    const exists = connections.some(
      (c) =>
        (c.a === aId && c.b === bId) ||
        (c.a === bId && c.b === aId)
    );

    if (!exists) {
      connections.push({ a: aId, b: bId });
    }
  }

  // Find a device object by its id
  function getDevice(id) {
    return devices.find((d) => d.id === id) || null;
  }

  // Find the topmost device under a given (x, y) on the canvas
  function findDeviceAt(x, y) {
    // We loop from the end so the last drawn (top-most) device is found first
    for (let i = devices.length - 1; i >= 0; i--) {
      const d = devices[i];
      if (distance(x, y, d.x, d.y) <= DEVICE_RADIUS) {
        return d;
      }
    }
    return null;
  }

  //Show all devices and connections on the canvas
  // Redraw everything
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
    drawConnections();
    drawDevices();
  }

  // Draw all connection lines between devices
  function drawConnections() {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#90A4AE";

    connections.forEach((con) => {
      const A = getDevice(con.a);
      const B = getDevice(con.b);
      if (!A || !B) return;

      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
    });
  }

  // Draw all devices as circles with icons and labels
  function drawDevices() {
    devices.forEach((d) => {
      //Circle body
      ctx.beginPath();
      ctx.arc(d.x, d.y, DEVICE_RADIUS, 0, Math.PI * 2);
      // Auto-colour device based on config validity
      let isValid =
          isValidIp(d.ip) &&
          isValidMask(d.subnetMask) &&
          isValidIp(d.gateway) &&
          sameSubnet(d.ip, d.gateway, d.subnetMask);

      ctx.fillStyle = isValid ? "#C8E6C9" : "#FFCDD2"; // green if valid, red if not
      ctx.fill();
      ctx.strokeStyle = "#00838F";
      ctx.lineWidth = 2;
      ctx.stroke();

      //icon inside circle
      ctx.fillStyle = "#000";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(getIcon(d.type), d.x, d.y);

      //Device name below circle
      ctx.font = "12px Arial";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(d.name, d.x, d.y + DEVICE_RADIUS + 14);

      // Highlight box if this device is selected
      if (d.id === selectedDeviceId) {
        ctx.strokeStyle = "#FF9800";
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(
          d.x - DEVICE_RADIUS - 4,
          d.y - DEVICE_RADIUS - 4,
          (DEVICE_RADIUS + 4) * 2,
          (DEVICE_RADIUS + 4) * 2
        );
        ctx.setLineDash([]);
      }
    });
  }

  //Properties panel to edit device details
  // Show/Update device information (type, name, IP, delete button)
  function renderProps(id) {
    const d = getDevice(id);

    // No device selected
    if (!d) {
      propsEl.innerHTML = "No selection";
      return;
    }

    // Make sure newer networking fields exist (for older loaded topologies)
    if (typeof d.subnetMask === "undefined") d.subnetMask = "";
    if (typeof d.gateway === "undefined") d.gateway = "";
    if (typeof d.configVersion !== "number") d.configVersion = 1;
    if (typeof d.gatewayTouched === "undefined") d.gatewayTouched = false;

    // Build small form for editing name and IP
    propsEl.innerHTML = `
      <div><strong>Type:</strong> ${capitalize(d.type)}</div>

      <hr class="mt-2 mb-2">

      <div class="small fw-bold">Networking Settings</div>

      <label class="form-label small mt-2">IP Address</label>
      <input
        id="prop_ip"
        class="form-control form-control-sm"
        placeholder="192.168.1.10"
        value="${escapeHtml(d.ip)}"
      >
      <div id="ip_warning" class="small mt-1"></div>

      <label class="form-label small mt-2">Subnet Mask</label>
      <input
        id="prop_mask"
        class="form-control form-control-sm"
        placeholder="255.255.255.0"
        value="${escapeHtml(d.subnetMask)}"
      >
      <div id="mask_warning" class="small mt-1"></div>

      <label class="form-label small mt-2">Default Gateway</label>
      <input
        id="prop_gw"
        class="form-control form-control-sm"
        placeholder="192.168.1.1"
        value="${escapeHtml(d.gateway)}"
      >
      <div id="gw_warning" class="small mt-1"></div>

      <label class="form-label small mt-3">Device Name</label>
      <input
        id="prop_name"
        class="form-control form-control-sm"
        value="${escapeHtml(d.name)}"
      >

      <button class="btn btn-sm btn-outline-danger mt-3" id="deleteBtn">
        Delete Device
      </button>
    `;

    // Get references to inputs + warning areas
    const nameInput = document.getElementById("prop_name");
    const ipInput   = document.getElementById("prop_ip");
    const maskInput = document.getElementById("prop_mask");
    const gwInput   = document.getElementById("prop_gw");

    // When user types into "Device Name", update device and redraw
    nameInput.oninput = (e) => {
      d.name = e.target.value;
      bumpConfig(d);
      draw();
      updateWarnings(d);

      // NEW (Part 3): autosave after edit
      markDirtyAndSaveSoon();
    };

    // When user types into "IP Address", update stored IP value
    ipInput.oninput = (e) => {
      d.ip = e.target.value;
      bumpConfig(d);
      // Try to suggest a gateway if IP + mask are valid and user hasn't changed gateway
      suggestGateway(d);
      updateWarnings(d);

      // NEW (Part 3): autosave after edit
      markDirtyAndSaveSoon();
    };

    // When user types into "Subnet Mask", update stored mask value
    maskInput.oninput = (e) => {
      d.subnetMask = e.target.value;
      bumpConfig(d);
      suggestGateway(d);
      updateWarnings(d);

      // NEW (Part 3): autosave after edit
      markDirtyAndSaveSoon();
    };

    // When user types into "Default Gateway", update stored gateway value
    gwInput.oninput = (e) => {
      d.gateway = e.target.value;
      d.gatewayTouched = true; // user manually edited
      bumpConfig(d);
      updateWarnings(d);

      // NEW (Part 3): autosave after edit
      markDirtyAndSaveSoon();
    };

    // When "Delete Device" is clicked, remove device and any connections
    document.getElementById("deleteBtn").onclick = () => {
      if (confirm("Delete this device?")) {
        devices = devices.filter((x) => x.id !== id);
        connections = connections.filter(
          (c) => c.a !== id && c.b !== id
        );
        selectedDeviceId = null;

        // NEW (UI Fix): selection cleared, update Ping visibility
        updatePingVisibility();

        renderProps(null);
        draw();

        // NEW (Part 3): autosave after edit
        markDirtyAndSaveSoon();
      }
    };

    // Initial warnings render
    updateWarnings(d);
  }

  // Helpful Functions
  function isPlacingTool() {
    return (
      currentTool === TOOL.ROUTER ||
      currentTool === TOOL.SWITCH ||
      currentTool === TOOL.PC
    );
  }

  function setTip(msg) {
    if (tipsEl) {
      tipsEl.textContent = msg;
    }
  }

  function getMousePosition(e) {
    const rect = canvas.getBoundingClientRect();

    // NEW (UI Fix): If canvas is responsive (CSS scales it), mouse coords must be scaled too.
    // This fixes selecting devices and connecting lines when canvas is displayed at a different size.
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function getIcon(type) {
    if (type === TOOL.ROUTER) return "Router";
    if (type === TOOL.SWITCH) return "Switch";
    return "PC";
  }

  // escapeHtml() prevents user-typed text from breaking the HTML.
  // It replaces special characters (< > & " ') with safe versions.
  // This protects the page when showing device names and IP addresses.
  function escapeHtml(str) {
    return String(str)
      // Convert & to &amp (must be done first)
      .replaceAll("&", "&amp;")
      // Convert <  to &lt to stop HTML tags from appearing
      .replaceAll("<", "&lt;")
      // Convert > to &gt
      .replaceAll(">", "&gt;")
      // Convert " to &quot to avoid breaking HTML attributes
      .replaceAll('"', "&quot;")
      // Convert ' to &#39;
      .replaceAll("'", "&#39;");
  }

  // --------- NEW: IP / Subnet / Gateway helpers + validation ----------

  // Convert dotted-decimal IP to 32-bit integer
  function ipToInt(ip) {
    if (!isValidIp(ip)) return null;
    const parts = ip.trim().split(".").map(Number);
    return (
      (parts[0] << 24) |
      (parts[1] << 16) |
      (parts[2] << 8) |
      parts[3]
    ) >>> 0; // ensure unsigned
  }

  // Convert 32-bit integer back to dotted-decimal IP
  function intToIp(num) {
    return [
      (num >>> 24) & 255,
      (num >>> 16) & 255,
      (num >>> 8) & 255,
      num & 255,
    ].join(".");
  }

  // Basic IP validation
  function isValidIp(ip) {
    if (!ip) return false;
    const parts = ip.trim().split(".");
    if (parts.length !== 4) return false;
    for (let p of parts) {
      if (p === "" || isNaN(p)) return false;
      const n = Number(p);
      if (n < 0 || n > 255) return false;
    }
    return true;
  }

  // Check if mask is a valid contiguous subnet mask (e.g. 255.255.255.0)
  function isValidMask(mask) {
    const mInt = ipToInt(mask);
    if (mInt === null) return false;
    // must not be all 0s or all 1s
    if (mInt === 0 || mInt === 0xffffffff) return false;
    // contiguous ones check: pattern like 111...000...
    return (mInt & (mInt + 1)) === 0;
  }

  // Same subnet check (ip and gateway under given mask)
  function sameSubnet(ip, gw, mask) {
    const ipInt = ipToInt(ip);
    const gwInt = ipToInt(gw);
    const mInt = ipToInt(mask);
    if (ipInt === null || gwInt === null || mInt === null) return false;
    return (ipInt & mInt) === (gwInt & mInt);
  }

  // Increment device configuration version when user changes settings
  function bumpConfig(d) {
    if (typeof d.configVersion !== "number") {
      d.configVersion = 1;
    } else {
      d.configVersion += 1;
    }
  }

  // Suggest a default gateway: first host in the subnet (network + 1)
  function suggestGateway(d) {
    if (d.gatewayTouched) return;
    if (!isValidIp(d.ip) || !isValidMask(d.subnetMask)) return;

    const ipInt = ipToInt(d.ip);
    const maskInt = ipToInt(d.subnetMask);
    if (ipInt === null || maskInt === null) return;

    const networkInt = ipInt & maskInt;
    const gwInt = networkInt + 1;
    const gwIp = intToIp(gwInt);

    d.gateway = gwIp;
    const gwInput = document.getElementById("prop_gw");
    if (gwInput) {
      gwInput.value = gwIp;
    }
  }

  // Update colour-coded warnings for IP / mask / gateway
  function updateWarnings(d) {
    const ipWarn   = document.getElementById("ip_warning");
    const maskWarn = document.getElementById("mask_warning");
    const gwWarn   = document.getElementById("gw_warning");

    if (!ipWarn || !maskWarn || !gwWarn) return;

    // Reset
    ipWarn.textContent = "";
    maskWarn.textContent = "";
    gwWarn.textContent = "";

    ipWarn.className = "small mt-1";
    maskWarn.className = "small mt-1";
    gwWarn.className = "small mt-1";

    // IP warnings
    if (d.ip && d.ip.trim() !== "") {
      if (!isValidIp(d.ip)) {
        ipWarn.textContent = "Invalid IP address.";
        ipWarn.className += " text-danger";
      } else {
        ipWarn.textContent = "IP address looks valid.";
        ipWarn.className += " text-success";
      }
    }

    // Mask warnings
    if (d.subnetMask && d.subnetMask.trim() !== "") {
      if (!isValidMask(d.subnetMask)) {
        maskWarn.textContent = "Invalid subnet mask.";
        maskWarn.className += " text-danger";
      } else {
        maskWarn.textContent = "Subnet mask looks valid.";
        maskWarn.className += " text-success";
      }
    }

    // Gateway warnings
    if (d.gateway && d.gateway.trim() !== "") {
      if (!isValidIp(d.gateway)) {
        gwWarn.textContent = "Invalid gateway IP address.";
        gwWarn.className += " text-danger";
      } else if (isValidIp(d.ip) && isValidMask(d.subnetMask)) {
        if (!sameSubnet(d.ip, d.gateway, d.subnetMask)) {
          gwWarn.textContent = "Gateway is outside this IP subnet.";
          gwWarn.className += " text-warning";
        } else {
          gwWarn.textContent = "Gateway is in the same subnet.";
          gwWarn.className += " text-success";
        }
      }
    }
  }

  //Startup for the sandbox
  setTip("Choose a tool, then click on the canvas to build your network.");
  renderProps(null);
  draw();

  // NEW (UI Fix): initial ping visibility
  updatePingVisibility();

  // ---------------------------------------------------
  // SAVE NETWORK (kept 100% unchanged)
  // ---------------------------------------------------
  document.getElementById("saveBtn").onclick = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return alert("You must be logged in.");

      const name = prompt("Name your topology:");
      if (!name) return;

      const res = await fetch(`${window.API_BASE}/save-topology`, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
              email: user.email,
              name,
              devices,
              connections
          })
      });

      const data = await res.json();
      alert(data.message);
  };

  // ---------------------------------------------------
  // NEW LOAD BUTTON USING MODAL UI
  // ---------------------------------------------------
  document.getElementById("loadBtn").onclick = async () => {
      await refreshTopologyList();
      const modal = new bootstrap.Modal(document.getElementById("topologyModal"));
      modal.show();
  };

  // ---------------------------------------------------
  // NEW: Refresh list inside modal
  // ---------------------------------------------------
  window.refreshTopologyList = async function () {
      const user = JSON.parse(localStorage.getItem("user"));
      const res = await fetch(`${window.API_BASE}/load-topologies?email=${user.email}`);
      const data = await res.json();

      const list = document.getElementById("topologyList");
      list.innerHTML = "";

      data.topologies.forEach(t => {
          const row = document.createElement("tr");

          row.innerHTML = `
              <td>${t.name}</td>
              <td>${new Date(t.created_at).toLocaleString()}</td>
              <td class="text-end">
                  <button class="btn btn-sm btn-primary me-2" onclick="loadTopologyById(${t.id})">
                      Load
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="deleteTopology(${t.id})">
                      Delete
                  </button>
              </td>
          `;

          list.appendChild(row);
      });
  }

  // ---------------------------------------------------
  // NEW: Delete topology
  // ---------------------------------------------------
  window.deleteTopology = async function (id) {
      if (!confirm("Delete this topology?")) return;

      const res = await fetch(`${window.API_BASE}/delete-topology/${id}`, {
          method: "DELETE"
      });

      const data = await res.json();
      alert(data.message);

      refreshTopologyList();
  }

  // ---------------------------------------------------
  // UPDATED loadTopologyById to close modal afterward
  // ---------------------------------------------------
  window.loadTopologyById = async function (id) {
      const res = await fetch(`${window.API_BASE}/load-topology/${id}`);
      const data = await res.json();

      if (!data.success) {
          alert("Failed to load topology.");
          return;
      }

      devices = data.devices;
      connections = data.connections;

      // Ensure any older saved devices get the new networking fields
      devices.forEach((d) => {
        if (typeof d.subnetMask === "undefined") d.subnetMask = "";
        if (typeof d.gateway === "undefined") d.gateway = "";
        if (typeof d.configVersion !== "number") d.configVersion = 1;
        if (typeof d.gatewayTouched === "undefined") d.gatewayTouched = false;
      });

      selectedDeviceId = null;
      connectStartId = null;

      // NEW (UI Fix): selection cleared, update Ping visibility
      updatePingVisibility();

      draw();

      // NEW (Part 3): if lesson session is active, autosave loaded state to DB
      markDirtyAndSaveSoon();

      // Close modal after loading
      const modal = bootstrap.Modal.getInstance(document.getElementById("topologyModal"));
      if (modal) modal.hide();
  }

  // ---------------------------------------------------
  // NEW: Ping System — open modal
  // ---------------------------------------------------
  document.getElementById("pingBtn").onclick = () => {
      if (!selectedDeviceId) return;

      const source = getDevice(selectedDeviceId);
      document.getElementById("pingSourceName").textContent = source.name;

      // Populate dropdown with connected devices only
      const connected = connections
          .filter(c => c.a === source.id || c.b === source.id)
          .map(c => c.a === source.id ? getDevice(c.b) : getDevice(c.a));

      const select = document.getElementById("pingTargetSelect");
      select.innerHTML = "";

      connected.forEach(dev => {
          const opt = document.createElement("option");
          opt.value = dev.id;
          opt.textContent = dev.name;
          select.appendChild(opt);
      });

      const modal = new bootstrap.Modal(document.getElementById("pingModal"));
      modal.show();
  };

  // ---------------------------------------------------
  // NEW: Run Ping Test
  // ---------------------------------------------------
  document.getElementById("runPingBtn").onclick = () => {
      const resultBox = document.getElementById("pingResult");
      resultBox.innerHTML = "";

      const source = getDevice(selectedDeviceId);
      const targetId = document.getElementById("pingTargetSelect").value;
      const target = getDevice(targetId);

      // Validation
      if (!isValidIp(source.ip)) {
          resultBox.innerHTML = "❌ Source IP invalid.";
          resultBox.className = "text-danger";
          return;
      }

      if (!isValidIp(target.ip)) {
          resultBox.innerHTML = "❌ Target IP invalid.";
          resultBox.className = "text-danger";
          return;
      }

      if (!isValidMask(source.subnetMask)) {
          resultBox.innerHTML = "❌ Source subnet mask invalid.";
          resultBox.className = "text-danger";
          return;
      }

      if (!sameSubnet(source.ip, target.ip, source.subnetMask)) {
          resultBox.innerHTML = "❌ Devices are in different subnets.";
          resultBox.className = "text-danger";
          return;
      }

      // Success
      resultBox.innerHTML =
          `<span class='text-success fw-bold'>✔ Ping successful!</span><br>
          ${source.name} can reach ${target.name}.`;
      resultBox.className = "text-success";
  };

  // ---------------- Netology Challenge Validator ----------------
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("challenge") !== "1") return;

  const user = getLoggedInUser();
  if (!user || !user.email) return;

  const raw = localStorage.getItem("netology_active_challenge");
  if (!raw) return;

  const data = JSON.parse(raw);

  // NEW (Part 3): activate DB lesson session state
  __lessonSession.enabled = true;
  __lessonSession.email = user.email;
  __lessonSession.course_id = Number(data.courseId);
  __lessonSession.lesson_number = Number(data.lesson);

  // NEW (Part 3): show challenge banner if present
  const banner = document.getElementById("challengeBanner");
  const bannerText = document.getElementById("challengeBannerText");
  if (banner && bannerText) {
    banner.style.display = "block";
    bannerText.textContent = `${data.courseTitle || "Course"} • ${data.unitTitle || ""} • Lesson ${data.lesson}: ${data.lessonTitle || ""}`;
  }

  // NEW (Part 3): load saved lesson session from DB before validating
  await loadLessonSessionFromDb();

  const rules = data.challenge.rules;

  const panel = document.createElement("div");
  panel.className = "card shadow-sm";
  panel.style.position = "fixed";
  panel.style.right = "16px";
  panel.style.bottom = "16px";
  panel.style.width = "320px";
  panel.style.zIndex = "9999";

  panel.innerHTML = `
    <div class="p-3">
      <strong>Challenge</strong>

      <div class="small text-muted mt-1">
        Course: ${escapeHtml(data.courseTitle || "")}<br>
        Lesson: ${escapeHtml(String(data.lesson || ""))} — ${escapeHtml(data.lessonTitle || "")}
      </div>

      <button id="validateBtn" class="btn btn-teal btn-sm w-100 mt-2">Validate</button>
      <button id="saveLessonBtn" class="btn btn-outline-secondary btn-sm w-100 mt-2">Save lesson</button>

      <div id="resultBox" class="small mt-2"></div>
      <div id="returnBox" class="mt-2"></div>
    </div>`;

  document.body.appendChild(panel);

  // NEW (Part 3): manual save button (DB)
  document.getElementById("saveLessonBtn").onclick = async () => {
    markDirtyAndSaveSoon();
    setTimeout(() => {
      const box = document.getElementById("resultBox");
      if (box) {
        box.className = "small mt-2 text-muted";
        box.textContent = "Saved to database.";
      }
    }, 300);
  };

  document.getElementById("validateBtn").onclick = async () => {
    const res = validate(rules);
    const box = document.getElementById("resultBox");
    const returnBox = document.getElementById("returnBox");

    if (!box) return;

    if (res.ok) {
      box.className = "small mt-2 text-success fw-semibold";
      box.textContent = "✅ Passed! Saving + awarding XP…";

      // NEW (Part 3): Save session (DB) then award XP (DB)
      try {
        await saveLessonSessionToDb();

        const xpRes = await fetch(`${window.API_BASE}/complete-challenge`, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            email: user.email,
            course_id: __lessonSession.course_id,
            lesson_number: __lessonSession.lesson_number
          })
        });

        const xpData = await xpRes.json();

        if (xpData.success) {
          if (xpData.already_completed) {
            box.textContent = "✅ Passed! Challenge already completed (no extra XP).";
          } else {
            box.textContent = `✅ Passed! +${xpData.xp_added} XP earned.`;
          }

          markChallengeCompletion(
            user.email,
            __lessonSession.course_id,
            __lessonSession.lesson_number,
            xpData.xp_added || 0
          );
        } else {
          box.className = "small mt-2 text-warning fw-semibold";
          box.textContent = "✅ Passed, but XP award failed.";
        }

        // NEW (Part 3): return-to-lesson button
        if (returnBox) {
          const courseId = __lessonSession.course_id;
          const lessonNum = __lessonSession.lesson_number;

          // Fallback for course page: store last lesson so we can jump later if needed
          // (course.js can read this later if you want)
          localStorage.setItem("netology_return_lesson", JSON.stringify({
            course_id: courseId,
            lesson_number: lessonNum
          }));

          returnBox.innerHTML = `
            <a class="btn btn-outline-secondary btn-sm w-100"
               href="course.html?id=${courseId}&lesson=${lessonNum}">
               Return to lesson
            </a>
          `;
        }
      } catch (e) {
        console.error("validate pass flow error:", e);
        box.className = "small mt-2 text-warning fw-semibold";
        box.textContent = "✅ Passed, but could not save/award XP.";
      }

      return;
    }

    box.className = "small mt-2 text-danger fw-semibold";
    box.textContent = "❌ " + res.reason;
  };

  function validate(r) {
    if (r.requiredTypes) {
      for (const t in r.requiredTypes) {
        const count = devices.filter(d => d.type === t).length;
        if (count < r.requiredTypes[t])
          return { ok: false, reason: `Need ${r.requiredTypes[t]} ${t}(s)` };
      }
    }
    if (r.requireConnections && connections.length === 0)
      return { ok: false, reason: "No connections" };

    // NEW (Part 3): optional rule checks (safe additions only)
    // If you add these rules later in course_content.js, they will work automatically.
    if (r.minDevices) {
      if (devices.length < Number(r.minDevices)) {
        return { ok: false, reason: `Need at least ${r.minDevices} device(s)` };
      }
    }
    if (r.minConnections) {
      if (connections.length < Number(r.minConnections)) {
        return { ok: false, reason: `Need at least ${r.minConnections} connection(s)` };
      }
    }

    return { ok: true };
  }

  // NEW (Part 3): autosave on unload so DB is always updated
  window.addEventListener("beforeunload", () => {
    // fire-and-forget
    saveLessonSessionToDb();
  });
});


})();
