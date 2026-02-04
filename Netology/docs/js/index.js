document.addEventListener("DOMContentLoaded", async () => {
  document.body.classList.add("is-ready");

  const statusEl = document.getElementById("apiStatus");
  if (!statusEl) return;

  try {
    const res = await fetch(`${window.API_BASE}/healthz`);
    statusEl.textContent = res.ok ? "Online" : "Offline";
    statusEl.className = res.ok ? "fw-semibold text-success" : "fw-semibold text-danger";
  } catch {
    statusEl.textContent = "Offline";
    statusEl.className = "fw-semibold text-danger";
  }
});
