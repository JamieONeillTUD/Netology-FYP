/* AI Prompt: Explain the API base configuration section in clear, simple terms. */
/* =========================================================
   API base configuration
========================================================= */
// docs/js/config.js
// Local dev:
// window.API_BASE = "http://localhost:5001";

// Production:
window.API_BASE = window.API_BASE || "https://netology-fyp.onrender.com";

/* AI Prompt: Explain the Preview mode seeding (demo user) section in clear, simple terms. */
/* =========================================================
   Preview mode seeding (demo user)
========================================================= */
// Preview mode (for Live Server + direct link testing)
// - Only activates on localhost — never on the live GitHub Pages site
// - Activate by adding ?preview=1 to the URL when running locally
(() => {
  try {
    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (!isLocalhost) return;  // safety: never run in production

    const params = new URLSearchParams(window.location.search);
    const wantsPreview = params.has("preview");

    if (wantsPreview) {
      const existing = localStorage.getItem("user") || localStorage.getItem("netology_user");
      if (!existing) {
        const demoUser = {
          email: "demo@netology.local",
          first_name: "Demo",
          last_name: "User",
          username: "demo_user",
          xp: 40,
          unlock_tier: "novice"
        };
        localStorage.setItem("user", JSON.stringify(demoUser));
        localStorage.setItem("netology_user", JSON.stringify(demoUser));
      }
    }
  } catch {}
})();

/* AI Prompt: Explain the Celebration toast helper section in clear, simple terms. */
/* =========================================================
   Celebration toast helper
========================================================= */
(() => {
  if (window.showCelebrateToast) return;

  const makeEl = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text !== "undefined") el.textContent = text;
    return el;
  };

  const ensureStack = () => {
    let stack = document.getElementById("netToastStack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "netToastStack";
      stack.className = "net-toast-stack";
      document.body.appendChild(stack);
    }
    return stack;
  };

  window.showCelebrateToast = (opts = {}) => {
    const {
      title = "Nice work!",
      message = "",
      sub = "",
      xp = null,
      type = "success",
      icon = "",
      mini = false,
      confetti = false,
      duration = 4200
    } = opts;

    if (!document.body) return;
    const stack = ensureStack();

    const toast = document.createElement("div");
    toast.className = `net-toast net-toast-enter net-toast--celebrate in-stack${mini ? " net-toast--mini" : ""}`;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.dataset.type = type;

    const iconMap = {
      success: "bi-check2-circle",
      error: "bi-x-circle",
      info: "bi-info-circle"
    };
    const resolvedIcon = iconMap[type] || icon || "bi-info-circle";

    const inner = makeEl("div", "net-toast-inner");
    const iconWrap = makeEl("div", "net-toast-icon");
    const iconEl = document.createElement("i");
    iconEl.className = `bi ${resolvedIcon}`;
    iconEl.setAttribute("aria-hidden", "true");
    iconWrap.appendChild(iconEl);

    const body = makeEl("div", "net-toast-body");
    const titleEl = makeEl("div", "net-toast-title", title);
    body.appendChild(titleEl);

    if (message) body.appendChild(makeEl("div", "net-toast-sub", message));
    if (sub) body.appendChild(makeEl("div", "net-toast-sub", sub));
    if (xp !== null && !Number.isNaN(Number(xp))) {
      const xpRow = makeEl("div", "net-toast-sub net-toast-xp-row");
      const xpIcon = document.createElement("i");
      xpIcon.className = "bi bi-lightning-charge-fill";
      xpIcon.setAttribute("aria-hidden", "true");
      const xpText = document.createElement("span");
      xpText.textContent = `+${Number(xp)} XP`;
      xpRow.append(xpIcon, xpText);
      body.appendChild(xpRow);
    }

    const closeBtn = makeEl("button", "net-toast-close");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Dismiss message");
    closeBtn.appendChild(makeEl("span", "", "×"));

    inner.append(iconWrap, body, closeBtn);
    toast.appendChild(inner);

    if (confetti && !mini) {
      const confettiWrap = makeEl("div", "net-toast-confetti");
      const colors = ["teal", "cyan", "amber", "violet"];
      for (let i = 0; i < 14; i += 1) {
        const piece = makeEl("span", `net-toast-confetti-piece is-${colors[i % colors.length]}`);
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.animationDelay = `${Math.random() * 0.3}s`;
        confettiWrap.appendChild(piece);
      }
      toast.appendChild(confettiWrap);
    }
    stack.appendChild(toast);

    const dismiss = () => {
      toast.classList.remove("net-toast-enter");
      toast.classList.add("net-toast-exit");
      setTimeout(() => toast.remove(), 220);
    };

    closeBtn.addEventListener("click", dismiss);
    toast.addEventListener("click", (e) => {
      if (e.target && e.target.closest(".net-toast-close")) return;
      dismiss();
    });

    setTimeout(dismiss, duration);
  };
})();
