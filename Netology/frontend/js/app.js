/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript - Netology Learning Platform
---------------------------------------
app.js – Handles user authentication for the platform.
Includes:
  - Signup form validation and submission
  - Login form submission and localStorage setup
  - Popup notifications for user feedback
*/
document.addEventListener("DOMContentLoaded", () => {
  // --- SIGNUP FORM ---
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Get field values
      const first = document.getElementById("first_name").value.trim();
      const last = document.getElementById("last_name").value.trim();
      const username = document.getElementById("username").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      const level = document.querySelector('input[name="level"]:checked');
      const reasons = document.querySelectorAll('input[name="reasons"]:checked');

      // Basic validation
      if (!first || !last || !username || !email || !password) {
        showPopup("Please fill in all required fields.", "error");
        return;
      }
      if (!email.includes("@") || !email.includes(".")) {
        showPopup("Enter a valid email address.", "error");
        return;
      }
      if (password.length < 8) {
        showPopup("Password must be at least 8 characters.", "error");
        return;
      }
      if (!level) {
        showPopup("Please select your networking level.", "error");
        return;
      }
      if (reasons.length === 0) {
        showPopup("Please select at least one reason.", "error");
        return;
      }

      // Send to backend
      try {
        const res = await fetch("/register", {
          method: "POST",
          body: new FormData(signupForm),
        });
        const data = await res.json();

        if (data.success) {
          showPopup("Account created! Redirecting...", "success");
          setTimeout(() => (window.location.href = "login.html"), 1500);
        } else {
          showPopup(data.message || "Signup failed. Try again.", "error");
        }
      } catch {
        showPopup("Server error. Please try again.", "error");
      }
    });
  }

  // --- LOGIN FORM ---
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        const res = await fetch("/login", {
          method: "POST",
          body: new FormData(loginForm),
        });
        const data = await res.json();

        if (data.success) {
          localStorage.setItem(
            "user",
            JSON.stringify({
              email: document.getElementById("email").value,
              first_name: data.first_name,
              level: data.level,
              xp: data.xp,
            })
          );
          showPopup(`Welcome back, ${data.first_name}!`, "success");
          setTimeout(() => (window.location.href = "dashboard.html"), 1500);
        } else {
          showPopup(data.message || "Invalid email or password.", "error");
        }
      } catch {
        showPopup("Server error. Please try again.", "error");
      }
    });
  }
});

// --- POPUP MESSAGE ---
function showPopup(message, type) {
  const old = document.getElementById("alertBox");
  if (old) old.remove();

  const popup = document.createElement("div");
  popup.id = "alertBox";
  popup.className = "alert text-center fw-semibold position-fixed top-0 start-50 translate-middle-x mt-4 shadow";
  popup.style.zIndex = "9999";
  popup.style.minWidth = "260px";
  popup.style.borderRadius = "6px";

  if (type === "success") popup.classList.add("alert-success");
  else if (type === "error") popup.classList.add("alert-danger");
  else popup.classList.add("alert-info");

  popup.textContent = message;
  document.body.appendChild(popup);

  setTimeout(() => popup.remove(), 2500);
}
