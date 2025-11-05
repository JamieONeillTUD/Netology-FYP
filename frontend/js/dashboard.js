// Shared frontend logic (vanilla JS placeholder)
/**
 * dashboard.js
 * Handles personalized display, user session, and logout
 */

// Simulate login data stored from auth.js
document.addEventListener("DOMContentLoaded", () => {
  const userData = JSON.parse(localStorage.getItem("userData"));

  if (!userData) {
    // not logged in — redirect to login
    window.location.href = "login.html";
    return;
  }

  // Fill dashboard content
  document.getElementById("userName").textContent = userData.name || "User";
  document.getElementById("userLevel").textContent = userData.level || "Novice";

  // Logout button
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "login.html";
  });
});
