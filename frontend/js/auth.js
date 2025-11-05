/**
 * auth.js
 * Handles login, signup, and password reset for Netology
 */

const API_BASE = "http://localhost:8000"; // FastAPI backend

document.addEventListener("DOMContentLoaded", () => {

  /* === LOGIN === */
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      try {
        const res = await fetch(`${API_BASE}/user/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
          localStorage.setItem("userData", JSON.stringify({
            name: data.name,
            level: data.level,
            email: email
          }));
          window.location.href = "dashboard.html";
        } else {
          alert(data.detail || "Invalid credentials.");
        }
      } catch (err) {
        alert("Server error — check backend connection.");
        console.error(err);
      }
    });
  }

  /* === SIGNUP === */
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("signupName").value;
      const email = document.getElementById("signupEmail").value;
      const password = document.getElementById("signupPassword").value;
      const level = document.getElementById("signupLevel").value;
      const reason = document.getElementById("signupReason").value;

      try {
        const res = await fetch(`${API_BASE}/user/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, level, reason })
        });
        const data = await res.json();

        if (res.ok) {
          localStorage.setItem("userData", JSON.stringify({ name, email, level }));
          window.location.href = "dashboard.html";
        } else {
          alert(data.detail || "Signup failed.");
        }
      } catch (err) {
        alert("Server error — check backend connection.");
        console.error(err);
      }
    });
  }

  /* === FORGOT PASSWORD === */
  const forgotForm = document.getElementById("forgotForm");
  const resetForm = document.getElementById("resetForm");
  const resetSection = document.getElementById("resetSection");

  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("forgotEmail").value;

      const res = await fetch(`${API_BASE}/user/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (res.ok) {
        document.getElementById("resetEmailDisplay").textContent = email;
        document.getElementById("resetEmailHidden").value = email;
        resetSection.style.display = "block";
        forgotForm.style.display = "none";
      } else {
        alert(data.detail || "Email not found.");
      }
    });
  }

  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("resetEmailHidden").value;
      const newPassword = document.getElementById("newPassword").value;

      const res = await fetch(`${API_BASE}/user/reset-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, new_password: newPassword })
      });
      const data = await res.json();

      if (res.ok) {
        alert("Password updated successfully!");
        window.location.href = "login.html";
      } else {
        alert(data.detail || "Failed to update password.");
      }
    });
  }
});
