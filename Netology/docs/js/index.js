document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("apiStatus");
  const dot = document.getElementById("apiDot");

  // New landing uses this wrapper. If it's missing, we safely do nothing.
  const visualWrap = document.querySelector(".net-hero-visual-modern");
  const heroCard = document.querySelector(".net-hero-card");

  // Respect accessibility preference
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Make status updates accessible
  if (statusEl) {
    statusEl.setAttribute("role", "status");
    statusEl.setAttribute("aria-live", "polite");
  }

  function setDotColor(hex) {
    if (!dot) return;
    dot.style.background = hex;
    dot.style.boxShadow = `0 0 0 4px ${hex}22`;
  }

  function setStatus(state, ms = null) {
    if (!statusEl) return;

    // Reset classes first
    statusEl.className = "fw-semibold";

    if (state === "online") {
      statusEl.textContent = ms != null ? `Online (${ms}ms)` : "Online";
      statusEl.classList.add("text-success");
      setDotColor("#198754");
      return;
    }

    if (state === "slow") {
      statusEl.textContent = ms != null ? `Slow (${ms}ms)` : "Slow";
      statusEl.classList.add("text-warning");
      setDotColor("#ffc107");
      return;
    }

    // offline
    statusEl.textContent = "Offline";
    statusEl.classList.add("text-danger");
    setDotColor("#dc3545");
  }

  // --- Health check with timeout + latency ---
  async function fetchWithTimeout(url, opts = {}, timeoutMs = 2500) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(t);
    }
  }

  async function checkBackend() {
    try {
      const baseRaw = String(window.API_BASE || "").trim();
      const base = baseRaw.replace(/\/$/, "");
      if (!base) {
        setStatus("offline");
        return;
      }

      // Try /healthz first, then fallback to "/" if it doesn't exist (more compatible)
      const endpoints = [`${base}/healthz`, `${base}/`];

      const start = performance.now();

      let ok = false;
      let resOk = false;

      for (const url of endpoints) {
        try {
          const res = await fetchWithTimeout(url, { method: "GET" }, 2500);
          resOk = res && res.ok;
          ok = resOk;
          if (ok) break;
        } catch {
          // try next endpoint
        }
      }

      const ms = Math.round(performance.now() - start);

      if (!ok) {
        setStatus("offline");
        return;
      }

      // Decide online vs slow (tweak threshold if you want)
      if (ms >= 900) setStatus("slow", ms);
      else setStatus("online", ms);

    } catch {
      setStatus("offline");
    }
  }

  // Run once quickly, then refresh occasionally
  checkBackend();
  setInterval(checkBackend, 30000);

  // --- Modern tilt/parallax on hero card (only if motion allowed) ---
  if (!reduceMotion && visualWrap && heroCard) {
    // smooth transitions
    heroCard.style.transformStyle = "preserve-3d";
    heroCard.style.transition = "transform 120ms ease, box-shadow 200ms ease";

    function applyTilt(clientX, clientY) {
      const rect = visualWrap.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;  // 0..1
      const y = (clientY - rect.top) / rect.height;  // 0..1

      // tilt limits
      const maxTilt = 7;
      const rx = (y - 0.5) * -maxTilt;
      const ry = (x - 0.5) * maxTilt;

      heroCard.style.transform =
        `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;

      heroCard.style.boxShadow = "0 22px 70px rgba(0,0,0,.14)";
    }

    function resetTilt() {
      heroCard.style.transform = "";
      heroCard.style.boxShadow = "";
    }

    let raf = null;
    visualWrap.addEventListener("mousemove", (e) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => applyTilt(e.clientX, e.clientY));
    });

    visualWrap.addEventListener("mouseleave", resetTilt);
    visualWrap.addEventListener("blur", resetTilt, true);
  }
});
