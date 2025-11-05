import { requireSession, clearSession } from "../state/session.js";
import { showToast } from "../ui/feedback.js";
import { fetchChallengeRoadmap, fetchActivityFeed } from "../api/client.js";
import { initThemeToggle } from "../ui/theme.js";

const session = requireSession();
if (!session) {
  throw new Error("Session not found");
}

initThemeToggle("[data-theme-toggle]");

document.querySelector("[data-user-name]").textContent = session.name;
document.querySelector("[data-user-level]").textContent = session.level;

const heroMessage = document.querySelector("[data-hero-message]");
if (heroMessage && session.message) {
  heroMessage.textContent = session.message;
}

const logoutBtn = document.querySelector("[data-action='logout']");
logoutBtn?.addEventListener("click", () => {
  clearSession();
  showToast("You have signed out securely.", { tone: "info" });
  window.location.href = "login.html";
});

const challengeBtn = document.querySelector("[data-nav='challenge']");
challengeBtn?.addEventListener('click', () => {
  window.location.href = 'sandbox.html';
});

const sandboxBtn = document.querySelector("[data-nav='sandbox']");
sandboxBtn?.addEventListener('click', () => {
  window.location.href = 'sandbox.html';
});

const insightsBtn = document.querySelector("[data-nav='insights']");
insightsBtn?.addEventListener('click', () => {
  showToast('Progress insights are in development. Check back soon!', { tone: 'info' });
});

async function hydrateRoadmap() {
  const list = document.querySelector("[data-roadmap]");
  if (!list) return;
  list.innerHTML = "<p class=\"helper-text\">Loading roadmap...</p>";
  const { milestones } = await fetchChallengeRoadmap();
  list.innerHTML = "";
  milestones.forEach((item) => {
    const card = document.createElement("article");
    card.className = "challenge-card";
    card.innerHTML = `
      <h4 class="challenge-card__title">${item.title}</h4>
      <p>${item.description}</p>
      <div class="challenge-card__meta">
        <span class="stat-pill" data-tone="warning">${item.focus}</span>
        <span class="badge">Due ${item.due_in}</span>
      </div>
    `;
    list.appendChild(card);
  });
}

async function hydrateActivity() {
  const list = document.querySelector("[data-activity]");
  if (!list) return;
  list.innerHTML = "<p class=\"helper-text\">Loading activity...</p>";
  const { events } = await fetchActivityFeed(session.email);
  list.innerHTML = "";
  events.forEach((event) => {
    const item = document.createElement("article");
    item.className = "activity-item";
    item.innerHTML = `
      <p>${event.action}</p>
      <span class="activity-item__time">${event.timestamp}</span>
    `;
    list.appendChild(item);
  });
}

hydrateRoadmap().catch((error) => {
  console.error(error);
  showToast("Could not load roadmap data", { tone: "error" });
});

hydrateActivity().catch((error) => {
  console.error(error);
  showToast("Could not load activity feed", { tone: "error" });
});
