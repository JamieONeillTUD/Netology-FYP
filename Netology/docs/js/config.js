// docs/js/config.js
// Local dev:
// window.API_BASE = "http://localhost:5001";

// Production:
window.API_BASE = window.API_BASE || "https://netology-fyp.onrender.com";

// Preview mode (for Live Server + direct link testing)
// - Activate by adding ?preview=1 once, or when on localhost
// - Seeds a lightweight demo user so protected pages don't redirect
(function () {
  try {
    const params = new URLSearchParams(window.location.search);
    const isLocal = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
    const wantsPreview = params.has("preview") || localStorage.getItem("netology_preview") === "1" || isLocal;

    if (wantsPreview) {
      localStorage.setItem("netology_preview", "1");

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

// Low motion / low effects mode (global)
// - Enable via ?lowfx=1 or localStorage netology_lowfx=1
// - Disable via ?lowfx=0 or localStorage netology_lowfx=0
// - Auto-enables on prefers-reduced-motion or Save-Data unless explicitly disabled
(function () {
  try {
    const params = new URLSearchParams(window.location.search);
    const key = "netology_lowfx";

    if (params.get("lowfx") === "1") localStorage.setItem(key, "1");
    if (params.get("lowfx") === "0") localStorage.setItem(key, "0");

    const stored = localStorage.getItem(key);
    const prefersReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = navigator.connection && navigator.connection.saveData;
    const lowFx = stored === "1" || (stored !== "0" && (prefersReduce || saveData));

    if (lowFx) {
      document.documentElement.classList.add("net-lowfx");
      document.documentElement.setAttribute("data-lowfx", "1");
      if (document.body) {
        document.body.classList.add("net-lowfx");
      } else {
        document.addEventListener("DOMContentLoaded", () => document.body?.classList.add("net-lowfx"));
      }
    }
  } catch {}
})();
