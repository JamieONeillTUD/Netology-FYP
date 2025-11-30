/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript 
---------------------------------------

dashboard.js – Handles the dashboard screen.


Loads and displays user info (name, XP, level)
Fetches and displays user courses
Groups courses (Continue / All / Completed)
Lets the user logout
Shows popup messages for feedback
*/

document.addEventListener("DOMContentLoaded", async () => {
  // Get logged-in user from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // If no user found, go back to login
  if (!user.email) {
    window.location.href = "login.html";
    return;
  }

  // Load user info and course progress from backend
  await loadUserInfo(user.email);
  await loadUserCourses(user.email);

  // Logout button click
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("user");
      showPopup("You’ve been logged out.", "error");
      setTimeout(() => window.location.href = "login.html", 800);
    });
  }
});



//Loads user info, level and XP from backend and updates dashboard
async function loadUserInfo(email) {
  try {
    const res = await fetch(`/user-info?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (!data.success) {
      return showPopup("Unable to load user info.", "error");
    }

    // Update the user info shown on the page
    document.getElementById("userName").textContent = data.first_name;
    document.getElementById("userLevel").textContent = data.level;
    document.getElementById("userXP").textContent = data.xp;

    // XP  and progress calculation
    const xp = data.xp;
    const nextLevelXP = 250 * (data.numeric_level + 1);
    const progress = Math.min(100, (xp / nextLevelXP) * 100);

    // Update progress bar and  text
    document.getElementById("xpProgress").style.width = `${progress}%`;
    document.getElementById("xpToNext").textContent = `${xp} / ${nextLevelXP} to next level`;

  } catch (err) {
    console.error("User info error:", err);
  }
}

//Loads user Courses , progress and displays them
async function loadUserCourses(email) {
  const continueList = document.getElementById("continueList");
  const allCourses = document.getElementById("allCourses");
  const completedList = document.getElementById("completedList");

  try {
    const res = await fetch(`/user-courses?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (!data.success) {
      return showPopup("Error loading courses.", "error");
    }

    const courses = data.courses || [];

    // Group courses based on progress
    const inProgress = courses.filter(c => c.status === "in-progress");
    const notStarted = courses.filter(c => c.status === "not-started");
    const completed = courses.filter(c => c.status === "completed");

    // Fill each section
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



//AI PROMPTED CODE BELOW:
// "Can you please help me write Write a JavaScript function that takes a course object and returns HTML for a course card. 
// The card should show the course title, description, lesson count, XP reward, status, and a button to open the course."
function renderCourseCard(c) {
  return `
    <div class="card border-teal shadow-sm p-3 mb-3">
      <h5 class="text-teal mb-1">${c.title}</h5>
      <p class="text-muted small mb-2">${c.description || "No description available."}</p>
      <p class="small text-muted">${c.total_lessons} lessons • ${c.xp_reward} XP</p>

      <div class="d-flex justify-content-between">
        <span class="badge ${badgeColor(c.status)} text-white">
          ${c.status.replace("-", " ")}
        </span>
        <button class="btn btn-teal btn-sm" onclick="viewCourse(${c.id})">
          View Course
        </button>
      </div>
    </div>
  `;
}


// Show the status of the course with a coloured badge
function badgeColor(status) {
  if (status === "completed") return "bg-success";
  if (status === "in-progress") return "bg-info";
  return "bg-secondary"; // Not started
}

//View course details page
function viewCourse(courseId) {
  window.location.href = `course.html?id=${courseId}`;
}


//AI Prompted Code Below:
// "Can you Please write me an pop up alert function in JavaScript that displays a  message to the user
// The function should accept a message string and a type (success, error, info) and style the popup accordingly. 
// The popup should automatically disappear after 2.5 seconds."
function showPopup(message, type = "info") {
  // Remove old popup if there is one
  const old = document.getElementById("alertBox");
  if (old) old.remove();

  // Create popup
  const popup = document.createElement("div");
  popup.id = "alertBox";
  popup.className =
    "alert text-center fw-semibold position-fixed top-0 start-50 translate-middle-x mt-4 shadow";

  popup.style.zIndex = "9999";
  popup.style.minWidth = "260px";
  popup.style.borderRadius = "6px";
  popup.textContent = message;

  // Colour based on message type
  popup.classList.add(
    type === "success" ? "alert-success" :
    type === "error"   ? "alert-danger" :
                         "alert-info"
  );

  document.body.appendChild(popup);

  // Remove popup automatically
  setTimeout(() => popup.remove(), 2500);
}
