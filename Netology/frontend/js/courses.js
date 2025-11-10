/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript - Netology Learning Platform
---------------------------------------
courses.js – Displays all available courses.
Includes:
  - Fetching course list from backend
  - Rendering each course card
  - "Start" button to open course page
*/

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("courseList");
  if (!container) return;

  try {
    // Fetch all active courses from backend
    const res = await fetch("/courses");
    const result = await res.json();

    // If no courses or request failed
    if (!result.success || !result.courses || result.courses.length === 0) {
      container.innerHTML = `<p class="text-muted small text-center">No courses available right now.</p>`;
      return;
    }

    // Render each course card
    result.courses.forEach(course => {
      const div = document.createElement("div");
      div.className = "col-md-6 col-lg-4";

      div.innerHTML = `
        <div class="card border-teal shadow-sm h-100 p-3">
          <h4 class="text-teal mb-1">${course.title}</h4>
          <p class="text-muted small mb-2">${course.description || "No description available."}</p>
          <p class="text-muted small">${course.difficulty} • ${course.category}</p>

          <div class="d-flex justify-content-between align-items-center mt-3">
            <span class="badge bg-teal text-white">${course.xp_reward} XP</span>
            <button class="btn btn-teal btn-sm" onclick="startCourse(${course.id})">Start</button>
          </div>
        </div>
      `;

      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading courses:", err);
    container.innerHTML = `<p class="text-danger text-center">Error loading courses. Please try again.</p>`;
  }
});

/* ======================================================
   NAVIGATE TO COURSE PAGE
   ====================================================== */
function startCourse(id) {
  if (id) {
    window.location.href = `course.html?id=${id}`;
  }
}
