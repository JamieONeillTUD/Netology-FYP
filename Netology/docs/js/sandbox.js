/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: sandbox.js
Purpose: Starts the sandbox after the shared sandbox files
have been loaded in the page.
---------------------------------------------------------
*/

(() => {
  "use strict";

  if (typeof stage === "undefined" || !stage) return;

async function init() {
  initChrome();
  bindTooltips();
  bindLibraryDrag();
  bindToolbar();
  loadConsoleHistory();
  bindPanels();
  initTerminalWindowControls();
  bindStage();
  registerConsoleApi();

  // New feature bindings
  bindKeyboardShortcuts();
  bindMouseWheelZoom();
  bindContextMenu();
  bindDeviceContextMenu();
  bindNewToolbarButtons();
  bindDeviceFilter();
  patchMultiSelect();

  if (saveModalEl) {
    saveModalEl.addEventListener("shown.bs.modal", () => {
      state.saveModalOpen = true;
      updateSaveModalLive();
    });
    saveModalEl.addEventListener("hidden.bs.modal", () => {
      state.saveModalOpen = false;
    });
  }

  state.devices = [];
  state.connections = [];
  state.selectedIds = [];
  pushHistory();

  applyCanvasWorldSize();
  resetViewport();
  updateGrid();
  updateZoomLabel();
  updateConnGroupVisibility();
  setTip("Select a device to view and edit its settings.");
  renderAllEnhanced();

  await initChallenge();
  await initTutorial();

  document.body.classList.remove("net-loading");
  document.body.classList.add("net-loaded");

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("netology_user") || localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  if (user?.email && typeof window.maybeStartOnboardingTour === "function") {
    window.maybeStartOnboardingTour("sandbox", user.email);
  }

  window.addEventListener("beforeunload", () => {
    saveLessonSessionToDb();
  });

  // ── Wire suggestion close button ──
  getById("sbxConnSuggestClose")?.addEventListener("click", dismissSuggestions);

  // ── Dismiss suggestions on any canvas click (not on a suggestion item) ──
  stage.addEventListener("click", () => dismissSuggestions());

  // ── Inspector quick-action buttons ──
  getById("inspActPing")?.addEventListener("click", () => {
    getById("pingBtn")?.click();
  });

  getById("inspActShowIp")?.addEventListener("click", () => {
    const dev = getSelectedDevice();
    if (!dev) return;
    const ip = dev.config?.ipAddress || "Not configured";
    const mask = dev.config?.subnetMask || "";
    const gw = dev.config?.defaultGateway || "";
    addConsoleOutput(`[${dev.name}] IP: ${ip}${mask ? " / " + mask : ""}${gw ? "  GW: " + gw : ""}`);
    setRightTab("inspector");
  });

  getById("inspActRestart")?.addEventListener("click", () => {
    const dev = getSelectedDevice();
    if (!dev) return;
    addConsoleOutput(`[${dev.name}] Restarting… done.`);
    addActionLog(`Restarted ${dev.name}`);
  });

  getById("inspActConfigure")?.addEventListener("click", () => {
    const dev = getSelectedDevice();
    if (!dev) return;
    showConfigTab();
    renderAll();
  });

  // ── Terminal: show bottom panel on device double-click ──
  deviceLayer.addEventListener("dblclick", (e) => {
    const deviceEl = e.target.closest(".sbx-device");
    if (!deviceEl) return;
    const id = deviceEl.dataset.id;
    const dev = id ? findDevice(id) : null;
    if (!dev) return;
    // Select the device and open the console panel
    state.selectedIds = [id];
    renderAll();
    if (bottomPanel) {
      setBottomCollapsed(false);
    }
    // Switch to console tab and focus input
    qsa(".sbx-bottom-panel", bottomPanel).forEach((p) => p.classList.remove("is-active"));
    getById("sbxConsolePanel")?.classList.add("is-active");
    state.bottomTab = "console";
    qsa(".sbx-tab", getById("sbxBottomTabs")).forEach((t) => t.classList.remove("is-active"));
    qs('.sbx-tab[data-bottom-tab="console"]', getById("sbxBottomTabs"))?.classList.add("is-active");
    addConsoleOutput(`[${dev.name}] Terminal ready. Type 'help' for commands.`);
    getById("sbxConsoleInput")?.focus();
  });

  // ── Idle guidance activity listeners (7 s timeout) ──
  ["mousemove", "mousedown", "keydown", "wheel", "touchstart"].forEach((ev) => {
    document.addEventListener(ev, resetIdleTimer, { passive: true });
  });
  resetIdleTimer(); // start the clock
}

  init();
})();
