import { login } from "../api/client.js";
import { saveSession } from "../state/session.js";
import { showToast, setButtonLoading, announceStatus } from "../ui/feedback.js";
import { initThemeToggle } from "../ui/theme.js";

initThemeToggle("[data-theme-toggle]");

const form = document.querySelector("[data-form='login']");
const submitBtn = form?.querySelector("button[type='submit']");

if (form && submitBtn) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const email = formData.get("email");
    const password = formData.get("password");

    setButtonLoading(submitBtn, true, { loadingLabel: "Signing in" });
    announceStatus("Authenticating...");

    try {
      const data = await login(email, password);
      saveSession({
        email,
        name: data.name,
        level: data.level,
        message: data.message,
      });
      showToast(`Welcome back, ${data.name}!`, { tone: "success" });
      announceStatus("Login successful. Redirecting to dashboard.");
      window.setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 500);
    } catch (error) {
      console.error(error);
      showToast(error.message, { tone: "error", title: "Login failed" });
      announceStatus("Login failed. Please review your credentials.");
    } finally {
      setButtonLoading(submitBtn, false, { idleLabel: "Sign in" });
    }
  });
}
