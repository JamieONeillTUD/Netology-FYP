/*
Account page logic (simple)
- Shows localStorage user details
- Loads XP/Level from backend
- Logout
*/

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.email) {
    window.location.href = "login.html";
    return;
  }

  document.getElementById("nameText").textContent = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Student";
  document.getElementById("userText").textContent = user.username || "-";
  document.getElementById("emailText").textContent = user.email || "-";

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });
  }

  await loadStats(user.email);
});

async function loadStats(email) {
  try {
    const res = await fetch(`${window.API_BASE}/user-info?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!data.success) return;

    const XP_PER_LEVEL = 100;
    const xp = Number(data.xp || data.total_xp || 0);
    const level = Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
    const currentLevelXP = ((xp % XP_PER_LEVEL) + XP_PER_LEVEL) % XP_PER_LEVEL;
    const pct = Math.max(0, Math.min(100, Math.round((currentLevelXP / XP_PER_LEVEL) * 100)));

    document.getElementById("levelText").textContent = level;
    document.getElementById("xpText").textContent = xp;
    document.getElementById("nextText").textContent = `${currentLevelXP} / ${XP_PER_LEVEL}`;
    document.getElementById("xpBar").style.width = `${pct}%`;

  } catch (e) {
    console.error("loadStats error:", e);
  }
}
