// js/forgot.js
import { API_BASE_URL } from "./config.js";

const verifyForm = document.getElementById("verifyForm");
const resetForm  = document.getElementById("resetForm");
const emailInput = document.getElementById("email");
const newPass    = document.getElementById("new_password");
const confirmPass= document.getElementById("confirm_password");

let verifiedEmail = ""; // remember the email once verified

// Step 1: verify the email exists
verifyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  if (!email) {
    alert("Please enter your email.");
    return;
  }

  try {
    const query = new URLSearchParams({ email });
    const res = await fetch(`${API_BASE_URL}/verify_email?${query}`, { method: "POST" });
    const data = await res.json();

    if (res.ok) {
      verifiedEmail = email; // store email for step 2
      alert("Email verified. Please set a new password.");
      // toggle forms
      verifyForm.style.display = "none";
      resetForm.style.display = "block";
      newPass.focus();
    } else {
      alert(`${data.detail || "Email not found."}`);
    }
  } catch (err) {
    console.error(err);
    alert("Could not connect to the server.");
  }
});

// Step 2: set the new password
resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const p1 = newPass.value.trim();
  const p2 = confirmPass.value.trim();

  if (!p1 || !p2) {
    alert("Please fill in both password fields.");
    return;
  }
  if (p1 !== p2) {
    alert("Passwords do not match.");
    return;
  }
  if (p1.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }

  try {
    const query = new URLSearchParams({ email: verifiedEmail, new_password: p1 });
    const res = await fetch(`${API_BASE_URL}/reset_password?${query}`, { method: "POST" });
    const data = await res.json();

    if (res.ok) {
      alert("Password updated successfully. Please log in.");
      window.location.href = "login.html";
    } else {
      alert(`${data.detail || "Could not update password."}`);
    }
  } catch (err) {
    console.error(err);
    alert("Could not connect to the server.");
  }
});
