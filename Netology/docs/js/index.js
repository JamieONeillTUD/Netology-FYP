document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("apiStatus");
  const dot = document.getElementById("apiDot");

  async function setStatus(ok) {
    if (!statusEl || !dot) return;
    if (ok) {
      statusEl.textContent = "Online";
      statusEl.className = "fw-semibold text-success";
      dot.style.background = "#198754";
    } else {
      statusEl.textContent = "Offline";
      statusEl.className = "fw-semibold text-danger";
      dot.style.background = "#dc3545";
    }
  }

  // Try a health check (won’t break anything if /healthz doesn’t exist yet)
  try {
    const base = String(window.API_BASE || "").replace(/\/$/, "");
    if (!base) return setStatus(false);

    const res = await fetch(`${base}/healthz`, { method: "GET" });
    setStatus(res.ok);
  } catch {
    setStatus(false);
  }

  // Tiny “parallax” tilt effect (simple, optional)
  const card = document.getElementById("heroVisual");
  if (!card) return;

  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rx = (y - 0.5) * -6;
    const ry = (x - 0.5) * 6;

    const inner = card.querySelector(".net-visual-card");
    if (!inner) return;
    inner.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  });

  card.addEventListener("mouseleave", () => {
    const inner = card.querySelector(".net-visual-card");
    if (!inner) return;
    inner.style.transform = "";
  });
});
