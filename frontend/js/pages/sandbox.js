import { requireSession } from "../state/session.js";
import { fetchSandboxTemplates } from "../api/client.js";
import { showToast } from "../ui/feedback.js";
import { initThemeToggle } from "../ui/theme.js";

const session = requireSession();
if (!session) {
  throw new Error("Session not found");
}

initThemeToggle("[data-theme-toggle]");

document.querySelector("[data-learner-name]").textContent = session.name;
document.querySelector("[data-learner-level]").textContent = session.level;

const canvas = document.querySelector("[data-canvas]");
const hint = document.querySelector("[data-canvas-hint]");
const propertiesList = document.querySelector("[data-node-properties]");
let nodes = [];

function renderNode(node) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "node";
  el.textContent = node.label;
  el.style.left = `${node.x}px`;
  el.style.top = `${node.y}px`;
  el.dataset.status = node.status;
  el.setAttribute("aria-label", `${node.label} node, status ${node.status}`);
  el.addEventListener("click", () => selectNode(node.id));
  return el;
}

function selectNode(id) {
  const node = nodes.find((entry) => entry.id === id);
  if (!node) return;
  propertiesList.innerHTML = `
    <article class="property-card">
      <h4>${node.label}</h4>
      <p class="property-card__meta">Status: ${node.status}</p>
      <p class="property-card__meta">Position: x${node.x}, y${node.y}</p>
    </article>
  `;
}

function drawCanvas() {
  if (!canvas) return;
  canvas.innerHTML = "";
  if (!nodes.length && hint) {
    hint.hidden = false;
  } else if (hint) {
    hint.hidden = true;
  }
  nodes.forEach((node) => {
    canvas.appendChild(renderNode(node));
  });
}

function placeNodes(template) {
  const originX = 80;
  const originY = 80;
  nodes = template.nodes.map((node, index) => ({
    id: `${template.id}-${index}`,
    label: node.label,
    status: node.status || "idle",
    x: originX + index * 140,
    y: originY + (index % 2) * 120,
  }));
  drawCanvas();
  propertiesList.innerHTML = `
    <p class="helper-text">Select a device on the canvas to inspect configuration tips.</p>
  `;
  showToast(`${template.name} topology loaded`, { tone: "success" });
}

function resetCanvas() {
  nodes = [];
  drawCanvas();
  propertiesList.innerHTML = `
    <div class="empty-state">
      <p>No devices yet. Start by choosing a template or dropping your own nodes.</p>
    </div>
  `;
}

async function hydrateTemplates() {
  const container = document.querySelector("[data-templates]");
  if (!container) return;
  container.innerHTML = "<p class=\"helper-text\">Loading templates...</p>";
  const { templates } = await fetchSandboxTemplates();
  container.innerHTML = "";
  templates.forEach((template) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "template-card";
    button.innerHTML = `
      <strong>${template.name}</strong>
      <span class="helper-text">${template.difficulty} pathway</span>
    `;
    button.addEventListener("click", () => placeNodes(template));
    container.appendChild(button);
  });
}

hydrateTemplates().catch((error) => {
  console.error(error);
  showToast("Unable to load templates", { tone: "error" });
});

resetCanvas();

document.querySelector("[data-action='reset']")?.addEventListener("click", resetCanvas);

document.querySelector("[data-action='simulate']")?.addEventListener("click", () => {
  if (!nodes.length) {
    showToast("Add devices to the canvas before running a simulation.", { tone: "warning" });
    return;
  }
  showToast("Simulation queued — you will receive results shortly.", { tone: "info" });
});

document.querySelector("[data-action='export']")?.addEventListener("click", () => {
  if (!nodes.length) {
    showToast("Nothing to export yet.", { tone: "warning" });
    return;
  }
  const exportPayload = JSON.stringify(nodes, null, 2);
  navigator.clipboard
    .writeText(exportPayload)
    .then(() => {
      showToast("Topology copied to clipboard.", { tone: "success" });
    })
    .catch((error) => {
      console.error(error);
      showToast("Copy failed. Check clipboard permissions.", { tone: "error" });
    });
});
