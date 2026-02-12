// docs/js/config.js
// Local dev:
// window.API_BASE = "http://localhost:5001";

// Production:
window.API_BASE = window.API_BASE || "https://netology-fyp.onrender.com";

// Preview mode (for Live Server + direct link testing)
// - Activate by adding ?preview=1 once, or when on localhost
// - Seeds a lightweight demo user so protected pages don't redirect
(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const wantsPreview = params.has("preview") || localStorage.getItem("netology_preview") === "1";

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
