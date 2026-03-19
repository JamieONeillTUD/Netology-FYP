// toasts.js — Toast and banner notification system.

(() => {
  "use strict";

  if (window.NetologyToast?.show) return;

  const bannerTimers = new Map();

  // Makes a DOM element with optional class and text.
  function make(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  // Normalises type string to success/error/info.
  function cleanType(raw) {
    const t = String(raw || "info").toLowerCase();
    if (t === "success") return "success";
    if (t === "error") return "error";
    return "info";
  }

  // Gets or creates the toast stack container.
  function getStack(id, cls) {
    let stack = document.getElementById(id || "netToastStack");
    if (stack) return stack;
    stack = document.createElement("div");
    stack.id = id || "netToastStack";
    stack.className = cls;
    document.body.appendChild(stack);
    return stack;
  }

  // Removes a toast element by id (prevents duplicates).
  function removeById(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // Returns the icon class for regular toasts.
  function netIcon(type, custom) {
    if (custom) return custom;
    if (type === "success") return "bi-check2-circle";
    if (type === "error") return "bi-x-circle";
    return "bi-info-circle";
  }

  // Returns the icon class for sandbox toasts.
  function sandboxIcon(type, custom, wellDone) {
    if (custom) return custom;
    if (wellDone) return "bi-trophy-fill";
    if (type === "success") return "bi-check-lg";
    if (type === "error") return "bi-x-lg";
    return "bi-info-lg";
  }

  // Adds confetti pieces to a celebrate toast.
  function addConfetti(toast) {
    const wrap = make("div", "net-toast-confetti");
    const colors = ["teal", "cyan", "amber", "violet"];
    for (let i = 0; i < 14; i++) {
      const piece = make("span", `net-toast-confetti-piece is-${colors[i % colors.length]}`);
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.animationDelay = `${Math.random() * 0.3}s`;
      wrap.appendChild(piece);
    }
    toast.appendChild(wrap);
  }

  // Animates out and removes a regular toast.
  function dismissNet(toast) {
    toast.classList.remove("net-toast-enter");
    toast.classList.add("net-toast-exit");
    setTimeout(() => toast.remove(), 220);
  }

  // Animates out and removes a sandbox toast.
  function dismissSandbox(toast) {
    toast.classList.remove("is-show");
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 300);
  }

  // Returns the icon class for inline banners.
  function bannerIcon(type) {
    const t = String(type || "error").toLowerCase();
    if (t === "success") return "bi-check-circle-fill";
    if (t === "warning") return "bi-exclamation-triangle-fill";
    return "bi-x-circle-fill";
  }

  // Fills a banner element with icon and message text.
  function fillBanner(el, type, msg) {
    if (!el) return;
    const icon = make("span", "net-banner-icon");
    icon.setAttribute("aria-hidden", "true");
    icon.appendChild(make("i", `bi ${bannerIcon(type)}`));
    el.replaceChildren();
    el.append(icon, document.createTextNode(String(msg || "")));
  }

  // Shows an inline alert banner (signup, login, etc).
  function showInlineBanner(opts) {
    opts = opts || {};
    const id = String(opts.bannerId || "").trim();
    const msg = String(opts.message || "");
    const type = String(opts.type || "error").toLowerCase();
    const timeout = Number(opts.timeoutMs || 4500);
    const key = String(opts.timerKey || "");
    const fallback = String(opts.fallbackToPopupType || type || "error");

    if (!id) { showMessageToast(msg, fallback, 3200); return; }
    const el = document.getElementById(id);
    if (!el) { showMessageToast(msg, fallback, 3200); return; }

    el.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
    el.classList.add("alert");
    if (type === "success") el.classList.add("alert-success");
    else if (type === "warning") el.classList.add("alert-warning");
    else el.classList.add("alert-danger");

    fillBanner(el, type, msg);
    if (!key) return;

    const old = bannerTimers.get(key);
    if (old) clearTimeout(old);

    bannerTimers.set(key, setTimeout(() => {
      el.classList.add("d-none");
      bannerTimers.delete(key);
    }, timeout));
  }

  // Hides an inline banner and clears its timer.
  function hideInlineBanner(bannerId, timerKey) {
    const id = String(bannerId || "").trim();
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.classList.add("d-none");

    const key = String(timerKey || "").trim();
    if (!key || !bannerTimers.has(key)) return;
    clearTimeout(bannerTimers.get(key));
    bannerTimers.delete(key);
  }

  // Builds and shows a regular Netology toast.
  function showNetToast(opts) {
    opts = opts || {};
    const type = cleanType(opts.type);
    const stack = getStack(opts.stackId || "netToastStack", "net-toast-stack");
    removeById(opts.id);

    const toast = document.createElement("div");
    if (opts.id) toast.id = opts.id;

    const cls = ["net-toast", "net-toast-enter", "in-stack"];
    if (opts.celebrate) cls.push("net-toast--celebrate");
    if (opts.mini) cls.push("net-toast--mini");
    toast.className = cls.join(" ");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.dataset.type = type;

    const inner = make("div", "net-toast-inner");

    // Icon.
    const iconWrap = make("div", "net-toast-icon");
    const icon = document.createElement("i");
    icon.className = `bi ${netIcon(type, opts.icon)}`;
    icon.setAttribute("aria-hidden", "true");
    iconWrap.appendChild(icon);

    // Body text.
    const body = make("div", "net-toast-body");
    body.appendChild(make("div", "net-toast-title", opts.title || "Update"));
    if (opts.message) body.appendChild(make("div", "net-toast-sub", opts.message));
    if (opts.sub) body.appendChild(make("div", "net-toast-sub", opts.sub));

    // XP row (optional).
    if (opts.xp != null && !Number.isNaN(Number(opts.xp))) {
      const row = make("div", "net-toast-sub net-toast-xp-row");
      const bolt = document.createElement("i");
      bolt.className = "bi bi-lightning-charge-fill";
      bolt.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = `+${Number(opts.xp)} XP`;
      row.append(bolt, label);
      body.appendChild(row);
    }

    if (opts.hint) body.appendChild(make("div", "net-toast-sub", opts.hint));

    // Close button.
    const close = make("button", "net-toast-close");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss message");
    close.appendChild(make("span", "", "×"));

    inner.append(iconWrap, body, close);
    toast.appendChild(inner);
    if (opts.celebrate) addConfetti(toast);

    close.addEventListener("click", () => dismissNet(toast));
    toast.addEventListener("click", (e) => {
      if (e.target?.closest(".net-toast-close")) return;
      dismissNet(toast);
    });

    stack.appendChild(toast);
    const dur = Number(opts.duration || 0);
    if (dur > 0) setTimeout(() => dismissNet(toast), dur);
    return toast;
  }

  // Builds and shows a sandbox-style toast.
  function showSandboxInternal(opts) {
    opts = opts || {};
    const type = cleanType(opts.type);
    const stack = getStack(opts.stackId || "sbxToastStack", "sbx-toast-stack");
    removeById(opts.id);

    const toast = document.createElement("div");
    if (opts.id) toast.id = opts.id;

    const cls = ["sbx-toast", type];
    if (opts.wellDone) cls.push("is-welldone");
    toast.className = cls.join(" ");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    const iconWrap = make("div", "sbx-toast-icon");
    const icon = document.createElement("i");
    icon.className = `bi ${sandboxIcon(type, opts.icon, Boolean(opts.wellDone))}`;
    icon.setAttribute("aria-hidden", "true");
    iconWrap.appendChild(icon);

    const body = document.createElement("div");
    body.append(
      make("div", "sbx-toast-title", opts.title || "Update"),
      make("div", "sbx-toast-message", opts.message || "")
    );

    const close = make("button", "sbx-toast-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Close");

    toast.append(iconWrap, body, close);
    stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-show"));

    close.addEventListener("click", () => dismissSandbox(toast));
    const dur = Number(opts.duration || 0);
    if (dur > 0) setTimeout(() => dismissSandbox(toast), dur);
    return toast;
  }

  // Main entry point — picks regular or sandbox skin.
  function show(opts) {
    if (!document.body) return null;
    opts = opts || {};
    const skin = String(opts.skin || "net").toLowerCase();
    return skin === "sandbox" ? showSandboxInternal(opts) : showNetToast(opts);
  }

  // Shows a celebrate toast with confetti.
  function showCelebrateToast(opts) {
    opts = opts || {};
    return show({
      skin: "net", celebrate: true,
      title: opts.title || "Nice work!",
      message: opts.message || "", sub: opts.sub || "",
      xp: opts.xp, type: opts.type || "success",
      icon: opts.icon || "", mini: Boolean(opts.mini),
      duration: Number(opts.duration || 4200)
    });
  }

  // Shows a simple message toast (success, error, info).
  function showMessageToast(msg, type, duration) {
    type = type || "info";
    duration = duration || 3200;
    const titles = { success: "Success", error: "Error", warning: "Warning", info: "Info" };
    return show({
      skin: "net", celebrate: false, mini: true,
      title: titles[String(type).toLowerCase()] || "Info",
      message: String(msg || ""), type, duration
    });
  }

  // Shows a sandbox-style toast.
  function showSandboxToast(opts) {
    opts = opts || {};
    return show({
      skin: "sandbox",
      stackId: opts.stackId || "sbxToastStack",
      id: opts.id, title: opts.title || "Update",
      message: opts.message || "",
      type: opts.type || opts.variant || "info",
      icon: opts.icon || "",
      duration: Number(opts.duration || opts.timeout || 3200),
      wellDone: Boolean(opts.wellDone)
    });
  }

  // Escapes HTML for safe use in achievement toast markup.
  function esc(val) {
    return String(val ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Returns the icon HTML for an achievement toast.
  function achIcon(unlock) {
    const raw = String((unlock && unlock.icon) || "").trim();
    if (raw.startsWith("bi-")) return `<i class="bi ${esc(raw)}"></i>`;
    return esc(raw || "⭐");
  }

  // Gets or creates the achievement toast container.
  function achHost() {
    if (!document.body) return null;
    let host = document.getElementById("globalAchievementToastHost");
    if (host) return host;
    host = document.createElement("div");
    host.id = "globalAchievementToastHost";
    host.className = "net-achievement-toast-host";
    document.body.appendChild(host);
    return host;
  }

  // Shows an achievement unlock toast.
  function showAchievementToast(unlock) {
    unlock = unlock || {};
    const host = achHost();
    if (!host) return null;

    const xp = Number(unlock.xp_added || unlock.xp_awarded || unlock.xp_reward || 0);
    const toast = document.createElement("div");
    toast.className = "net-achievement-toast";
    toast.innerHTML = `
      <div class="net-achievement-toast-icon">${achIcon(unlock)}</div>
      <div class="net-achievement-toast-copy">
        <div class="net-achievement-toast-title">Achievement unlocked</div>
        <div class="net-achievement-toast-name">${esc(unlock.name || "Achievement")}</div>
      </div>
      <div class="net-achievement-toast-xp">${xp > 0 ? `+${xp} XP` : ""}</div>
    `;

    host.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => toast.remove(), 250);
    }, 2800);
    return toast;
  }

  // Public API used by signup, login, dashboard, sandbox, etc.
  window.NetologyToast = {
    show,
    showCelebrateToast,
    showMessageToast,
    showSandboxToast,
    showAchievementToast,
    showInlineBanner,
    hideInlineBanner
  };

  // Legacy global used by quiz.js.
  window.showCelebrateToast = showCelebrateToast;
})();
