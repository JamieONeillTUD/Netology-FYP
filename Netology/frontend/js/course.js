// frontend/js/course.js

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!user.email || !courseId) {
    window.location.href = "login.html";
    return;
  }

  await loadCourseDetails(courseId, user.email);

  // Handle "Complete Lesson" button
  const completeBtn = document.getElementById("completeLessonBtn");
  completeBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("/complete-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, course_id: courseId }),
      });
      const result = await res.json();

      if (result.success) {
        showPopup(`+${result.xp_added} XP earned!`, "success");
        updateProgress(result.progress_pct);
      } else {
        showPopup(result.message || "Could not complete lesson.", "error");
      }
    } catch (err) {
      console.error("Lesson complete error:", err);
      showPopup("Server error completing lesson.", "error");
    }
  });
});

/* ---------------- FUNCTIONS ---------------- */

// Load course details and user progress
async function loadCourseDetails(courseId, email) {
  try {
    // Fetch main course info
    const res = await fetch(`/course?id=${courseId}`);
    const data = await res.json();
    if (!data.success) {
      showPopup("Course not found.", "error");
      return;
    }

    document.getElementById("courseTitle").textContent = data.title;
    document.getElementById("courseDesc").textContent = data.description;

    // Fetch user's progress for this course
    const progressRes = await fetch(`/user-courses?email=${encodeURIComponent(email)}`);
    const progressData = await progressRes.json();

    const course = (progressData.courses || []).find(c => c.id == courseId);
    const progressPct = course ? course.progress_pct : 0;

    // Display lessons list
    const totalLessons = data.total_lessons || 0;
    const lessonHtml =
      totalLessons > 0
        ? `<ul class="list-group">` +
          Array.from({ length: totalLessons }, (_, i) =>
            `<li class="list-group-item d-flex justify-content-between align-items-center">
              Lesson ${i + 1}
              ${i * (100 / totalLessons) < progressPct
                ? '<span class="badge bg-teal text-white">Done</span>'
                : ""}
            </li>`
          ).join("") +
          `</ul>`
        : `<p class="text-muted small">No lessons available for this course.</p>`;

    document.getElementById("lessonsList").innerHTML = lessonHtml;
    updateProgress(progressPct);
  } catch (err) {
    console.error("loadCourseDetails:", err);
    showPopup("Error loading course details.", "error");
  }
}

// Update progress bar & text
function updateProgress(percent) {
  const bar = document.getElementById("progressBar");
  const txt = document.getElementById("progressText");
  if (bar) bar.style.width = `${percent}%`;
  if (txt) txt.textContent = `${percent}%`;
}

// Popup message (same style as app.js)
function showPopup(message, type = "info") {
  const existing = document.getElementById("alertBox");
  if (existing) existing.remove();

  const popup = document.createElement("div");
  popup.id = "alertBox";
  popup.className =
    "alert position-fixed top-0 start-50 translate-middle-x mt-4 shadow-lg fw-semibold text-center";
  popup.style.zIndex = "1055";
  popup.style.padding = "0.8em 1.4em";
  popup.style.borderRadius = "6px";
  popup.style.transition = "opacity 0.5s ease";

  if (type === "success") popup.classList.add("bg-teal", "text-white");
  else if (type === "error") popup.classList.add("alert-danger");
  else popup.classList.add("alert-info");

  popup.textContent = message;
  document.body.appendChild(popup);
  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => popup.remove(), 500);
  }, 2200);
}
