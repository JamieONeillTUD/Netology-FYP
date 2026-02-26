/*
---------------------------------------------------------
Student: C22320301 - Jamie O’Neill
File: ui-toasts.js
Purpose: Provides one shared toast system for standard, celebrate, and sandbox toasts.
Notes: Merged toast behavior into one API and removed duplicate local builders.
---------------------------------------------------------
*/

(() => {
  if (window.NetologyToast?.show) return;

  // Create a DOM element with optional class and text.
  function createElement(tagName, className = "", text = null) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== null && text !== undefined) element.textContent = text;
    return element;
  }

  // Normalize toast type values.
  function normalizeType(type) {
    const rawType = String(type || "info").toLowerCase();
    if (rawType === "success") return "success";
    if (rawType === "error") return "error";
    if (rawType === "warning") return "info";
    return "info";
  }

  // Create or find a toast stack by id.
  function getOrCreateToastStack(stackId, className) {
    const targetId = stackId || "netToastStack";
    let stack = document.getElementById(targetId);
    if (stack) return stack;

    stack = document.createElement("div");
    stack.id = targetId;
    stack.className = className;
    document.body.appendChild(stack);
    return stack;
  }

  // Remove an existing toast when we want only one by id.
  function removeExistingToastById(toastId) {
    if (!toastId) return;
    const existingToast = document.getElementById(toastId);
    if (existingToast) existingToast.remove();
  }

  // Pick icon class for Netology toasts.
  function getNetIconClass(type, customIcon) {
    if (customIcon) return customIcon;
    if (type === "success") return "bi-check2-circle";
    if (type === "error") return "bi-x-circle";
    return "bi-info-circle";
  }

  // Pick icon class for sandbox toasts.
  function getSandboxIconClass(type, customIcon, wellDone) {
    if (customIcon) return customIcon;
    if (wellDone) return "bi-trophy-fill";
    if (type === "success") return "bi-check-lg";
    if (type === "error") return "bi-x-lg";
    return "bi-info-lg";
  }

  // Add confetti pieces to a celebrate toast.
  function addConfetti(toastElement) {
    const confettiWrap = createElement("div", "net-toast-confetti");
    const colors = ["teal", "cyan", "amber", "violet"];

    for (let pieceIndex = 0; pieceIndex < 14; pieceIndex += 1) {
      const colorName = colors[pieceIndex % colors.length];
      const piece = createElement("span", `net-toast-confetti-piece is-${colorName}`);
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.animationDelay = `${Math.random() * 0.3}s`;
      confettiWrap.appendChild(piece);
    }

    toastElement.appendChild(confettiWrap);
  }

  // Hide and remove a Netology toast.
  function dismissNetToast(toastElement) {
    toastElement.classList.remove("net-toast-enter");
    toastElement.classList.add("net-toast-exit");
    setTimeout(() => toastElement.remove(), 220);
  }

  // Hide and remove a sandbox toast.
  function dismissSandboxToast(toastElement) {
    toastElement.classList.remove("is-show");
    toastElement.classList.add("is-leaving");
    setTimeout(() => toastElement.remove(), 300);
  }

  // Render a standard Netology toast.
  function showNetToast(options = {}) {
    const toastType = normalizeType(options.type);
    const stack = getOrCreateToastStack(options.stackId || "netToastStack", "net-toast-stack");
    removeExistingToastById(options.id);

    const toast = document.createElement("div");
    if (options.id) toast.id = options.id;

    const classList = ["net-toast", "net-toast-enter", "in-stack"];
    if (options.celebrate) classList.push("net-toast--celebrate");
    if (options.mini) classList.push("net-toast--mini");

    toast.className = classList.join(" ");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.dataset.type = toastType;

    const inner = createElement("div", "net-toast-inner");

    const iconWrap = createElement("div", "net-toast-icon");
    const iconElement = document.createElement("i");
    iconElement.className = `bi ${getNetIconClass(toastType, options.icon)}`;
    iconElement.setAttribute("aria-hidden", "true");
    iconWrap.appendChild(iconElement);

    const body = createElement("div", "net-toast-body");
    body.appendChild(createElement("div", "net-toast-title", options.title || "Update"));

    if (options.message) {
      body.appendChild(createElement("div", "net-toast-sub", options.message));
    }
    if (options.sub) {
      body.appendChild(createElement("div", "net-toast-sub", options.sub));
    }

    if (options.xp !== null && options.xp !== undefined && !Number.isNaN(Number(options.xp))) {
      const xpRow = createElement("div", "net-toast-sub net-toast-xp-row");
      const xpIcon = document.createElement("i");
      xpIcon.className = "bi bi-lightning-charge-fill";
      xpIcon.setAttribute("aria-hidden", "true");
      const xpText = document.createElement("span");
      xpText.textContent = `+${Number(options.xp)} XP`;
      xpRow.append(xpIcon, xpText);
      body.appendChild(xpRow);
    }

    if (options.hint) {
      const hintRow = createElement("div", "net-toast-sub", options.hint);
      body.appendChild(hintRow);
    }

    const closeButton = createElement("button", "net-toast-close");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Dismiss message");
    closeButton.appendChild(createElement("span", "", "×"));

    inner.append(iconWrap, body, closeButton);
    toast.appendChild(inner);

    if (options.celebrate) {
      addConfetti(toast);
    }

    closeButton.addEventListener("click", () => dismissNetToast(toast));
    toast.addEventListener("click", (event) => {
      if (event.target && event.target.closest(".net-toast-close")) return;
      dismissNetToast(toast);
    });

    stack.appendChild(toast);

    const duration = Number(options.duration || 0);
    if (duration > 0) {
      setTimeout(() => dismissNetToast(toast), duration);
    }

    return toast;
  }

  // Render a sandbox-style toast.
  function showSandboxToastInternal(options = {}) {
    const toastType = normalizeType(options.type);
    const stack = getOrCreateToastStack(options.stackId || "sbxToastStack", "sbx-toast-stack");
    removeExistingToastById(options.id);

    const toast = document.createElement("div");
    if (options.id) toast.id = options.id;

    const classList = ["sbx-toast", toastType];
    if (options.wellDone) classList.push("is-welldone");
    toast.className = classList.join(" ");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    const iconWrap = createElement("div", "sbx-toast-icon");
    const iconElement = document.createElement("i");
    iconElement.className = `bi ${getSandboxIconClass(toastType, options.icon, Boolean(options.wellDone))}`;
    iconElement.setAttribute("aria-hidden", "true");
    iconWrap.appendChild(iconElement);

    const body = document.createElement("div");
    body.append(
      createElement("div", "sbx-toast-title", options.title || "Update"),
      createElement("div", "sbx-toast-message", options.message || "")
    );

    const closeButton = createElement("button", "sbx-toast-close", "×");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close");

    toast.append(iconWrap, body, closeButton);
    stack.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("is-show");
    });

    closeButton.addEventListener("click", () => dismissSandboxToast(toast));

    const duration = Number(options.duration || 0);
    if (duration > 0) {
      setTimeout(() => dismissSandboxToast(toast), duration);
    }

    return toast;
  }

  // Single entry point for all toast rendering.
  function show(options = {}) {
    if (!document.body) return null;

    const skin = String(options.skin || "net").toLowerCase();
    if (skin === "sandbox") {
      return showSandboxToastInternal(options);
    }
    return showNetToast(options);
  }

  // Shared celebrate toast helper.
  function showCelebrateToast(options = {}) {
    return show({
      skin: "net",
      celebrate: true,
      title: options.title || "Nice work!",
      message: options.message || "",
      sub: options.sub || "",
      xp: options.xp,
      type: options.type || "success",
      icon: options.icon || "",
      mini: Boolean(options.mini),
      duration: Number(options.duration || 4200)
    });
  }

  // Shared simple message toast helper.
  function showMessageToast(message, type = "info", duration = 3200) {
    const titleByType = {
      success: "Success",
      error: "Error",
      warning: "Warning",
      info: "Info"
    };

    return show({
      skin: "net",
      celebrate: false,
      mini: true,
      title: titleByType[String(type || "info").toLowerCase()] || "Info",
      message: String(message || ""),
      type,
      duration
    });
  }

  // Shared sandbox toast helper.
  function showSandboxToast(options = {}) {
    return show({
      skin: "sandbox",
      stackId: options.stackId || "sbxToastStack",
      id: options.id,
      title: options.title || "Update",
      message: options.message || "",
      type: options.type || options.variant || "info",
      icon: options.icon || "",
      duration: Number(options.duration || options.timeout || 3200),
      wellDone: Boolean(options.wellDone)
    });
  }

  window.NetologyToast = {
    show,
    showCelebrateToast,
    showMessageToast,
    showSandboxToast
  };

  window.showCelebrateToast = showCelebrateToast;

  if (typeof window.showPopup !== "function") {
    window.showPopup = showMessageToast;
  }
})();
