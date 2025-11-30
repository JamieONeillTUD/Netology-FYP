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

    renderProps(null);
    draw();
    setTip("Canvas cleared.");
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
      return;
    }

    // Select or Connect on existing device
    const hitDevice = findDeviceAt(pos.x, pos.y);

    // Select mode highlights device and show its properties
    if (currentTool === TOOL.SELECT) {
      selectedDeviceId = hitDevice ? hitDevice.id : null;
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
      ctx.fillStyle = "#E0F7FA";
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

    // Build small form for editing name and IP
    propsEl.innerHTML = `
      <div><strong>Type:</strong> ${capitalize(d.type)}</div>

      <label class="form-label small mt-2">Name</label>
      <input
        id="prop_name"
        class="form-control form-control-sm"
        value="${escapeHtml(d.name)}"
      >

      <label class="form-label small mt-2">IP Address</label>
      <input
        id="prop_ip"
        class="form-control form-control-sm"
        placeholder="192.168.1.10"
        value="${escapeHtml(d.ip)}"
      >

      <button class="btn btn-sm btn-outline-danger mt-3" id="deleteBtn">
        Delete Device
      </button>
    `;

    // When user types into "Name", update device and redraw
    document.getElementById("prop_name").oninput = (e) => {
      d.name = e.target.value;
      draw();
    };

    // When user types into "IP Address", update stored IP value
    document.getElementById("prop_ip").oninput = (e) => {
      d.ip = e.target.value;
    };

    // When "Delete Device" is clicked, remove device and any connections
    document.getElementById("deleteBtn").onclick = () => {
      if (confirm("Delete this device?")) {
        devices = devices.filter((x) => x.id !== id);
        connections = connections.filter(
          (c) => c.a !== id && c.b !== id
        );
        selectedDeviceId = null;
        renderProps(null);
        draw();
      }
    };
  }

  //helpful functions for various tasks
  // Returns true if currentTool is one of the placing tools
  function isPlacingTool() {
    return (
      currentTool === TOOL.ROUTER ||
      currentTool === TOOL.SWITCH ||
      currentTool === TOOL.PC
    );
  }

  // Update the tip text under the canvas
  function setTip(msg) {
    if (tipsEl) {
      tipsEl.textContent = msg;
    }
  }

  // Get mouse position relative to the canvas, not the whole page
  function getMousePosition(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  // Distance between two points (x1, y1) and (x2, y2)
  function distance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  // Capitalise first letter of a string
  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  //Shows device icon based on type
  function getIcon(type) {
    if (type === TOOL.ROUTER) return "Router";
    if (type === TOOL.SWITCH) return "Switch";
    return "PC"; // default for PC or anything else
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


  //Startup for the sandbox
  // Initial message + empty props + initial draw
  setTip("Choose a tool, then click on the canvas to build your network.");
  renderProps(null);
  draw();
})();
