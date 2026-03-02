/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: sandbox-console.js
Purpose: Backward-compatible bridge to the console now managed in sandbox.js.
Notes: Removed duplicate command engine and event listeners to keep one console architecture.
---------------------------------------------------------
*/

(() => {
  "use strict";

  class SandboxConsoleBridge {
    constructor(consoleApi = null) {
      this.api = consoleApi;
    }

    setApi(consoleApi) {
      this.api = consoleApi;
      return this;
    }

    executeCommand(command) {
      const value = String(command || "").trim();
      if (!value) return;
      this.api?.runCommand?.(value);
    }

    addLine(text, type = "default") {
      this.api?.addLine?.(String(text || ""), type);
    }

    clearConsole() {
      this.api?.clear?.();
    }

    focus() {
      this.api?.focusInput?.();
    }

    showWelcome() {
      this.api?.showWelcome?.();
    }
  }

  function initBridge() {
    const bridge = new SandboxConsoleBridge(window.NetologySandboxConsoleApi || null);
    window.SandboxConsole = SandboxConsoleBridge;
    window.sandboxConsole = bridge;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBridge, { once: true });
    return;
  }
  initBridge();
})();
