// js/signup.js
import { API_BASE_URL } from "./config.js";

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = {
    first_name: document.getElementById("first_name").value.trim(),
    last_name: document.getElementById("last_name").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value.trim(),
    level: document.getElementById("level").value,
    reason: document.getElementById("reason").value,
  };

  if (Object.values(form).some(v => !v)) {
    alert("Please fill in all fields.");
    return;
  }

  try {
    const query = new URLSearchParams(form);
    const res = await fetch(`${API_BASE_URL}/signup?${query}`, { method: "POST" });
    const data = await res.json();

    if (res.ok) {
      alert(`${data.message}`);
      window.location.href = "login.html";
    } else {
      alert(`${data.detail || "Signup failed."}`);
    }
  } catch {
    alert("Unable to connect to the server.");
  }
});