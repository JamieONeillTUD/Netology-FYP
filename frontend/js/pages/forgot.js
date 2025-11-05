import { verifyEmail, resetPassword } from "../api/client.js";
import { showToast, setButtonLoading, announceStatus } from "../ui/feedback.js";
import { setupPasswordTools } from "../ui/passwordTools.js";
import { initThemeToggle } from "../ui/theme.js";

initThemeToggle("[data-theme-toggle]");

setupPasswordTools({
  input: "#resetPassword",
  meter: "#resetPasswordMeter",
  label: "#resetPasswordLabel",
  toggle: "#resetPasswordToggle",
});

const verifyForm = document.querySelector("[data-form='verify-email']");
const resetForm = document.querySelector("[data-form='reset-password']");
const resetSection = document.querySelector("[data-section='reset']");
const emailBadge = document.querySelector("[data-reset-email]");
let verifiedEmail = "";

if (verifyForm) {
  const verifyButton = verifyForm.querySelector("button[type='submit']");
  verifyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(verifyForm);
    const email = formData.get("email");

    setButtonLoading(verifyButton, true, { loadingLabel: "Checking" });
    announceStatus("Validating email address...");

    try {
      await verifyEmail(email);
      verifiedEmail = email;
      if (emailBadge) emailBadge.textContent = email;
      resetSection?.classList.remove("visually-hidden");
      showToast("Email verified. Choose a new password.", { tone: "success" });
      announceStatus("Email verified. Continue to set a new password.");
      resetForm?.querySelector("input")?.focus();
    } catch (error) {
      console.error(error);
      showToast(error.message, { tone: "error", title: "Email not recognised" });
      announceStatus("We could not verify that email address.");
    } finally {
      setButtonLoading(verifyButton, false, { idleLabel: "Verify email" });
    }
  });
}

if (resetForm) {
  const resetButton = resetForm.querySelector("button[type='submit']");
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(resetForm);
    const newPassword = formData.get("password");

    if (!verifiedEmail) {
      showToast("Verify your email before resetting.", { tone: "warning" });
      return;
    }

    setButtonLoading(resetButton, true, { loadingLabel: "Updating" });
    announceStatus("Updating password...");

    try {
      await resetPassword(verifiedEmail, newPassword);
      showToast("Password updated. Sign in with your new credentials.", { tone: "success" });
      announceStatus("Password updated successfully.");
      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 600);
    } catch (error) {
      console.error(error);
      showToast(error.message, { tone: "error", title: "Reset failed" });
      announceStatus("Password reset failed. Try again.");
    } finally {
      setButtonLoading(resetButton, false, { idleLabel: "Save new password" });
    }
  });
}
