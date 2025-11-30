/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript - Netology Learning Platform
---------------------------------------
course.js – Handles all course pages.
Includes:
  - Loading course details and lessons
  - Showing user progress
  - Completing lessons and updating XP
Universal and reusable for all course pages.
*/

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Redirect if not logged in or missing course ID
  if (!user.email || !courseId) {
    window.location.href = "login.html";
    return;
  }

  // Load course info and user progress
  await loadCourse(courseId, user.email);

  // Complete lesson button
  const completeBtn = document.getElementById("completeLessonBtn");
  if (completeBtn) {
    completeBtn.addEventListener("click", async () => {
      await completeLesson(courseId, user.email);
    });
  }
});

/* ======================================================
   LOAD COURSE DETAILS + USER PROGRESS
   ====================================================== */
async function loadCourse(courseId, email) {
  try {
    // Get course info
    const res = await fetch(`/course?id=${courseId}`);
    const data = await res.json();

    if (!data.success) {
      showPopup("Course not found.", "error");
      return;
    }

    // Display course title and description
    document.getElementById("courseTitle").textContent = data.title;
    document.getElementById("courseDesc").textContent = data.description;

    // Get user's progress for this course
    const progressRes = await fetch(`/user-courses?email=${encodeURIComponent(email)}`);
    const progressData = await progressRes.json();

    const course = (progressData.courses || []).find(c => c.id == courseId);
    const progressPct = course ? course.progress_pct : 0;

    // Render lessons visually
    renderLessons(data.total_lessons, progressPct);

    // Update progress bar
    updateProgress(progressPct);
  } catch (err) {
    console.error("loadCourse error:", err);
    showPopup("Error loading course details.", "error");
  }
}

/* ======================================================
   RENDER LESSON LIST
   ====================================================== */
function renderLessons(totalLessons, progressPct) {
  const lessonsContainer = document.getElementById("lessonsList");

  if (!totalLessons || totalLessons <= 0) {
    lessonsContainer.innerHTML = `<p class="text-muted small">No lessons available.</p>`;
    return;
  }

  const completedLessons = Math.floor((progressPct / 100) * totalLessons);
  let html = '<ul class="list-group">';
  for (let i = 1; i <= totalLessons; i++) {
    html += `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        Lesson ${i}
        ${i <= completedLessons
          ? '<span class="badge bg-teal text-white">Done</span>'
          : ""}
      </li>
    `;
  }
  html += "</ul>";
  lessonsContainer.innerHTML = html;
}

/* ======================================================
   COMPLETE LESSON
   ====================================================== */
async function completeLesson(courseId, email) {
  try {
    const res = await fetch("/complete-lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, course_id: courseId }),
    });
    const result = await res.json();

    if (result.success) {
      showPopup(`+${result.xp_added} XP earned!`, "success");
      updateProgress(result.progress_pct);
      renderLessons(
        document.querySelectorAll("#lessonsList li").length,
        result.progress_pct
      );
    } else {
      showPopup(result.message || "Could not complete lesson.", "error");
    }
  } catch (err) {
    console.error("completeLesson error:", err);
    showPopup("Server error completing lesson.", "error");
  }
}

/* ======================================================
   UPDATE PROGRESS BAR
   ====================================================== */
function updateProgress(percent) {
  const bar = document.getElementById("progressBar");
  const txt = document.getElementById("progressText");

  if (bar) bar.style.width = `${percent}%`;
  if (txt) txt.textContent = `${percent}%`;
}

//AI Prompted Code Below:
// "Can you Please write me an pop up alert function in JavaScript that displays a  message to the user
// The function should accept a message string and a type (success, error, info) and style the popup accordingly. 
// The popup should automatically disappear after 2.5 seconds."
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

  if (type === "success") popup.classList.add("alert-success");
  else if (type === "error") popup.classList.add("alert-danger");
  else popup.classList.add("alert-info");

  popup.textContent = message;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 2500);
}
