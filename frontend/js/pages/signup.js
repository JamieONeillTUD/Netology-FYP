import { signup } from "../api/client.js";
import { saveSession } from "../state/session.js";
import { showToast, setButtonLoading, announceStatus } from "../ui/feedback.js";
import { setupPasswordTools } from "../ui/passwordTools.js";
import { initThemeToggle } from "../ui/theme.js";

initThemeToggle("[data-theme-toggle]");

setupPasswordTools({
  input: "#signupPassword",
  meter: "#signupPasswordMeter",
  label: "#signupPasswordLabel",
  toggle: "#signupPasswordToggle",
});

const form = document.querySelector("[data-form='signup']");
const submitBtn = form?.querySelector("button[type='submit']");

if (form && submitBtn) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    setButtonLoading(submitBtn, true, { loadingLabel: "Creating account" });
    announceStatus("Creating your Netology account...");

    try {
      const data = await signup(payload);
      saveSession({
        email: payload.email,
        name: data.name,
        level: data.level,
        message: data.message,
      });
      showToast("Account ready!", { tone: "success", title: "Welcome to Netology" });
      announceStatus("Account created. Redirecting to dashboard.");
      window.setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 600);
    } catch (error) {
      console.error(error);
      showToast(error.message, { tone: "error", title: "Signup failed" });
      announceStatus("Account creation failed. Review highlighted fields.");
    } finally {
      setButtonLoading(submitBtn, false, { idleLabel: "Create account" });
    }
  });
}
