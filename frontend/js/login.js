// js/login.js
import { API_BASE_URL } from "./config.js";

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("⚠️ Please enter both email and password.");
    return;
  }

  try {
    const query = new URLSearchParams({ email, password });
    const res = await fetch(`${API_BASE_URL}/signin?${query}`, { method: "POST" });
    const data = await res.json();

    if (res.ok) {
      alert(`👋 Welcome back! ${data.message}`);
      window.location.href = "dashboard.html"; // redirect after success
    } else {
      alert(`❌ Login failed: ${data.detail || "Incorrect credentials."}`);
    }
  } catch (err) {
    console.error(err);
    alert("⚠️ Could not connect to the server.");
  }
});

// Optional “forgot password” click handler (UI only for now)
document.getElementById("forgot-link").addEventListener("click", (e) => {
  e.preventDefault();
  alert("Password reset feature coming soon!");
});
