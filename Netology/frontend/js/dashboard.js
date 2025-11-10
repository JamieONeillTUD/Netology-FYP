// frontend/js/dashboard.js
// --- DASHBOARD LOGIC ---
document.addEventListener("DOMContentLoaded", async () => {
  const dashboard = document.querySelector(".dashboard-container");
  if (!dashboard) return;

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!user.email) {
    window.location.href = "login.html";
    return;
  }

  try {
    // Fetch live data from backend
    const response = await fetch(`/user-info?email=${encodeURIComponent(user.email)}`);
    const data = await response.json();

    if (data.success) {
      document.getElementById("userName").textContent = data.first_name;
      document.getElementById("userLevel").textContent = data.level || "Novice";
      document.getElementById("userXP").textContent = data.xp || 0;

      // Update stored data
      localStorage.setItem("user", JSON.stringify({
        email: user.email,
        first_name: data.first_name,
        level: data.level,
        xp: data.xp
      }));

      showPopup(`👋 Welcome back, ${data.first_name}!`, "success");
    } else {
      showPopup("Unable to load user info.", "error");
    }
  } catch (err) {
    console.error("Error loading user info:", err);
    showPopup("Error fetching user data from server.", "error");
  }

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("user");
    showPopup("You’ve been logged out.", "error");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
  });
});
