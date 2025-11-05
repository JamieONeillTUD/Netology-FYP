const TONE_ICON = {
  info: "ℹ️",
  success: "✅",
  error: "⚠️",
  warning: "⚠️",
};

function ensureToastRoot() {
  let root = document.getElementById("toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    root.className = "toast-region";
    root.setAttribute("aria-live", "polite");
    root.setAttribute("aria-atomic", "false");
    document.body.appendChild(root);
  }
  return root;
}

export function showToast(message, { tone = "info", title, timeout = 4000 } = {}) {
  const root = ensureToastRoot();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.dataset.tone = tone;
  toast.setAttribute("role", "status");

  const icon = document.createElement("span");
  icon.className = "toast__icon";
  icon.textContent = TONE_ICON[tone] || "ℹ️";

  const body = document.createElement("div");
  body.className = "toast__body";

  const heading = document.createElement("p");
  heading.className = "toast__message";
  heading.textContent = title || message;
  body.appendChild(heading);

  if (title && title !== message) {
    const description = document.createElement("p");
    description.className = "helper-text";
    description.textContent = message;
    body.appendChild(description);
  }

  const dismiss = document.createElement("button");
  dismiss.className = "toast__dismiss";
  dismiss.setAttribute("aria-label", "Dismiss notification");
  dismiss.textContent = "✕";
  dismiss.addEventListener("click", () => {
    root.removeChild(toast);
  });

  toast.append(icon, body, dismiss);
  root.appendChild(toast);

  if (timeout) {
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, timeout);
  }
}

export function setButtonLoading(button, isLoading, { idleLabel, loadingLabel } = {}) {
  if (!button) return;
  const original = button.dataset.originalLabel || button.textContent;

  if (isLoading) {
    button.dataset.originalLabel = original;
    button.dataset.loading = "true";
    button.disabled = true;
    const spinner = document.createElement("span");
    spinner.className = "btn__spinner";
    spinner.setAttribute("aria-hidden", "true");

    button.textContent = "";
    button.append(spinner, document.createTextNode(loadingLabel || original));
  } else {
    button.dataset.loading = "false";
    button.disabled = false;
    button.textContent = idleLabel || original;
  }
}

export function announceStatus(message) {
  let region = document.getElementById("sr-status");
  if (!region) {
    region = document.createElement("div");
    region.id = "sr-status";
    region.className = "visually-hidden";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    document.body.appendChild(region);
  }
  region.textContent = message;
}
