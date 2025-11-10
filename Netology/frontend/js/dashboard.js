/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript - Netology Learning Platform
---------------------------------------
dashboard.js – Handles dashboard display.
Includes:
  - Loading user info and XP
  - Loading user courses
  - Grouping by progress (Continue / All / Completed)
  - Logout functionality
*/

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Redirect if not logged in
  if (!user.email) {
    window.location.href = "login.html";
    return;
  }

  await loadUserInfo(user.email);
  await loadUserCourses(user.email);

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("user");
      showPopup("You’ve been logged out.", "error");
      setTimeout(() => (window.location.href = "login.html"), 800);
    });
  }
});

/* ======================================================
   LOAD USER INFO
   ====================================================== */
async function loadUserInfo(email) {
  try {
    const res = await fetch(`/user-info?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (!data.success) return showPopup("Unable to load user info.", "error");

    document.getElementById("userName").textContent = data.first_name;
    document.getElementById("userLevel").textContent = data.level;
    document.getElementById("userXP").textContent = data.xp;

    const xp = data.xp;
    const next = 250 * (data.numeric_level + 1);
    const progress = Math.min(100, (xp / next) * 100);

    document.getElementById("xpProgress").style.width = `${progress}%`;
    document.getElementById("xpToNext").textContent = `${xp} / ${next} to next level`;
  } catch (err) {
    console.error("User info error:", err);
  }
}

/* ======================================================
   LOAD USER COURSES
   ====================================================== */
async function loadUserCourses(email) {
  const continueList = document.getElementById("continueList");
  const allCourses = document.getElementById("allCourses");
  const completedList = document.getElementById("completedList");

  try {
    const res = await fetch(`/user-courses?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!data.success) return showPopup("Error loading courses.", "error");

    const courses = data.courses || [];

    // Separate courses by status
    const inProgress = courses.filter(c => c.status === "in-progress");
    const notStarted = courses.filter(c => c.status === "not-started");
    const completed = courses.filter(c => c.status === "completed");

    // Render each section
    continueList.innerHTML = inProgress.length
      ? inProgress.map(renderCourseCard).join("")
      : `<p class="text-muted small text-center">No courses in progress yet.</p>`;

    allCourses.innerHTML = notStarted.length
      ? notStarted.map(renderCourseCard).join("")
      : `<p class="text-muted small text-center">All available courses started or completed.</p>`;

    completedList.innerHTML = completed.length
      ? completed.map(renderCourseCard).join("")
      : `<p class="text-muted small text-center">No completed courses yet.</p>`;
  } catch (err) {
    console.error("Courses error:", err);
  }
}

/* ======================================================
   COURSE CARD TEMPLATE
   ====================================================== */
function renderCourseCard(c) {
  return `
    <div class="card border-teal shadow-sm p-3 mb-3">
      <h5 class="text-teal mb-1">${c.title}</h5>
      <p class="text-muted small mb-2">${c.description || "No description available."}</p>
      <p class="small text-muted">${c.total_lessons} lessons • ${c.xp_reward} XP</p>
      <div class="d-flex justify-content-between">
        <span class="badge ${badgeColor(c.status)} text-white">${c.status.replace("-", " ")}</span>
        <button class="btn btn-teal btn-sm" onclick="viewCourse(${c.id})">View Course</button>
      </div>
    </div>
  `;
}

/* ======================================================
   BADGE COLOR HELPERS
   ====================================================== */
function badgeColor(status) {
  if (status === "completed") return "bg-success";
  if (status === "in-progress") return "bg-info";
  return "bg-secondary";
}

/* ======================================================
   VIEW COURSE
   ====================================================== */
function viewCourse(courseId) {
  window.location.href = `course.html?id=${courseId}`;
}

/* ======================================================
   POPUP MESSAGE
   ====================================================== */
function showPopup(message, type = "info") {
  const old = document.getElementById("alertBox");
  if (old) old.remove();
  const popup = document.createElement("div");
  popup.id = "alertBox";
  popup.className =
    "alert text-center fw-semibold position-fixed top-0 start-50 translate-middle-x mt-4 shadow";
  popup.style.zIndex = "9999";
  popup.style.minWidth = "260px";
  popup.style.borderRadius = "6px";
  popup.textContent = message;
  popup.classList.add(
    type === "success" ? "alert-success" :
    type === "error" ? "alert-danger" : "alert-info"
  );
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 2500);
}
