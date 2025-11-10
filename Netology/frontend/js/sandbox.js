/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript – Netology Learning Platform
---------------------------------------
sandbox.js – Simple, tidy network sandbox.
Features:
  • Place devices (Router / Switch / PC)
  • Select & drag devices
  • Connect devices (draw links)
  • Edit name & IP, delete device
  • Clear canvas & Export PNG
Notes:
  - Kept intentionally simple and readable
  - No external deps, just Canvas 2D
*/

(function () {
  // ---------- DOM & STATE ----------
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const tipsEl = document.getElementById("tips");
  const propsEl = document.getElementById("props");

  const TOOL = { SELECT: "select", CONNECT: "connect", ROUTER: "router", SWITCH: "switch", PC: "pc" };
  const NODE_RADIUS = 24;
  const HIT_RADIUS = 24;

  let currentTool = TOOL.SELECT;
  let nodes = [];        // Array<{ id, type, x, y, label, ip }>
  let links = [];        // Array<[idA, idB]>
  let selectedId = null; // id | null
  let connectingFrom = null;

  let dragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  // ---------- UI: Toolbar Buttons ----------
  document.querySelectorAll("[data-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentTool = btn.getAttribute("data-tool");
      setTip(
        currentTool === TOOL.CONNECT
          ? "Tip: Click two devices to connect them."
          : currentTool === TOOL.SELECT
          ? "Tip: Click a device to select and drag it."
          : `Tip: Click on the canvas to place a ${currentTool}.`
      );
    });
  });

  // ---------- UI: Clear & Export ----------
  document.getElementById("clearBtn").addEventListener("click", () => {
    if (confirm("Clear the canvas?")) {
      nodes = [];
      links = [];
      selectedId = null;
      connectingFrom = null;
      renderProps(null);
      draw();
      setTip("Canvas cleared.");
    }
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    const a = document.createElement("a");
    a.download = "netology-sandbox.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  });

  // ---------- Canvas Events ----------
  canvas.addEventListener("click", (e) => {
    const { x, y } = getCanvasPos(e);

    // Place devices
    if (currentTool === TOOL.ROUTER || currentTool === TOOL.SWITCH || currentTool === TOOL.PC) {
      placeNode(currentTool, x, y);
      draw();
      return;
    }

    // Hit test for existing nodes
    const hit = hitTest(x, y);

    // Select mode
    if (currentTool === TOOL.SELECT) {
      selectedId = hit ? hit.id : null;
      renderProps(selectedId);
      draw();
      return;
    }

    // Connect mode
    if (currentTool === TOOL.CONNECT && hit) {
      if (!connectingFrom) {
        connectingFrom = hit.id;
        setTip("Select another device to complete the link.");
      } else if (connectingFrom !== hit.id) {
        addLink(connectingFrom, hit.id);
        connectingFrom = null;
        setTip("Connected! Switch to Select to move or edit.");
        draw();
      }
    }
  });

  canvas.addEventListener("mousedown", (e) => {
    if (currentTool !== TOOL.SELECT) return;
    const { x, y } = getCanvasPos(e);
    const hit = hitTest(x, y);
    if (!hit) return;

    selectedId = hit.id;
    dragging = true;
    dragOffsetX = x - hit.x;
    dragOffsetY = y - hit.y;
    renderProps(selectedId);
    draw();
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const { x, y } = getCanvasPos(e);
    const n = getNode(selectedId);
    if (!n) return;

    n.x = clamp(x - dragOffsetX, NODE_RADIUS, canvas.width - NODE_RADIUS);
    n.y = clamp(y - dragOffsetY, NODE_RADIUS, canvas.height - NODE_RADIUS);
    draw();
  });

  window.addEventListener("mouseup", () => (dragging = false));

  // ---------- Core Helpers ----------
  function placeNode(type, x, y) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const countOfType = nodes.filter((n) => n.type === type).length + 1;
    const label = `${capitalize(type)} ${countOfType}`;
    nodes.push({ id, type, x, y, label, ip: "" });
  }

  function addLink(a, b) {
    // prevent duplicates & self-links
    if (a === b) return;
    const exists = links.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    if (!exists) links.push([a, b]);
  }

  function hitTest(x, y) {
    // Top-most node wins
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (distance(n.x, n.y, x, y) <= HIT_RADIUS) return n;
    }
    return null;
  }

  function getNode(id) {
    return nodes.find((n) => n.id === id) || null;
  }

  function removeNode(id) {
    nodes = nodes.filter((n) => n.id !== id);
    links = links.filter(([a, b]) => a !== id && b !== id);
    if (selectedId === id) selectedId = null;
  }

  // ---------- Render ----------
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLinks();
    drawNodes();
  }

  function drawLinks() {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#90A4AE";
    links.forEach(([aId, bId]) => {
      const A = getNode(aId);
      const B = getNode(bId);
      if (!A || !B) return;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawNodes() {
    nodes.forEach((n) => {
      // body
      ctx.beginPath();
      ctx.arc(n.x, n.y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#E0F7FA";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#00838F";
      ctx.stroke();

      // icon
      ctx.fillStyle = "#000";
      ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(getIcon(n.type), n.x, n.y);

      // label
      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(n.label, n.x, n.y + NODE_RADIUS + 16);

      // selection halo
      if (n.id === selectedId) {
        ctx.save();
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = "#FF9800";
        ctx.strokeRect(n.x - (NODE_RADIUS + 4), n.y - (NODE_RADIUS + 4), (NODE_RADIUS + 4) * 2, (NODE_RADIUS + 4) * 2);
        ctx.restore();
      }
    });
  }

  // ---------- Properties Panel ----------
  function renderProps(id) {
    const n = getNode(id);
    if (!n) {
      propsEl.innerHTML = "No selection";
      return;
    }

    propsEl.innerHTML = `
      <div class="mb-2"><strong>Type:</strong> ${capitalize(n.type)}</div>

      <div class="mb-2">
        <label class="form-label small">Name</label>
        <input class="form-control form-control-sm" id="prop_name" value="${escapeHtml(n.label)}">
      </div>

      <div class="mb-2">
        <label class="form-label small">IP</label>
        <input class="form-control form-control-sm" id="prop_ip" value="${escapeHtml(n.ip)}" placeholder="192.168.1.10">
      </div>

      <div class="d-grid gap-2 mt-2">
        <button class="btn btn-sm btn-outline-danger" id="prop_delete">Delete</button>
      </div>
    `;

    document.getElementById("prop_name").oninput = (e) => {
      n.label = e.target.value;
      draw();
    };
    document.getElementById("prop_ip").oninput = (e) => {
      n.ip = e.target.value;
    };
    document.getElementById("prop_delete").onclick = () => {
      if (confirm("Delete this device?")) {
        removeNode(n.id);
        renderProps(null);
        draw();
      }
    };
  }

  // ---------- Small Utils ----------
  function setTip(text) {
    if (tipsEl) tipsEl.textContent = text;
  }

  function getCanvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function distance(x1, y1, x2, y2) {
    const dx = x1 - x2, dy = y1 - y2;
    return Math.hypot(dx, dy);
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
    }

  function getIcon(type) {
    if (type === TOOL.ROUTER) return "🛜";
    if (type === TOOL.SWITCH) return "🔀";
    return "💻";
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------- Boot ----------
  setTip("Tip: Choose a tool, then click the canvas.");
  renderProps(null);
  draw();
})();
