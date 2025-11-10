// frontend/js/dashboard.js
// Netology Dashboard – Clean, functional, and gamified

document.addEventListener("DOMContentLoaded", () => {
  const dashboard = document.querySelector(".dashboard-container");
  if (!dashboard) return;

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.email) {
    window.location.href = "login.html";
    return;
  }

  // Initial load
  loadUserInfo(user.email);
  loadUserCourses(user.email);

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("user");
      showPopup("You’ve been logged out.", "error");
      setTimeout(() => (window.location.href = "login.html"), 800);
    });
  }

  // Global click handler for Start / Lesson buttons
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const courseId = Number(btn.dataset.id);
    const email = user.email;

    try {
      if (action === "start") {
        const res = await fetch("/start-course", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, course_id: courseId }),
        });
        const data = await res.json();

        if (data.success) {
          showPopup("Course started!", "success");
          await loadUserCourses(email); // refresh dashboard immediately
          setTimeout(() => {
            window.location.href = `course.html?id=${courseId}`;
          }, 1000);
        } else {
          showPopup(data.message || "Could not start course.", "error");
        }
      }

      if (action === "lesson") {
        const res = await fetch("/complete-lesson", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, course_id: courseId }),
        });
        const data = await res.json();

        if (data.success) {
          showPopup(`+${data.xp_added} XP • ${data.progress_pct}% complete`, "success");
          await loadUserInfo(email);
          await loadUserCourses(email);
        } else {
          showPopup(data.message || "Could not complete lesson.", "error");
        }
      }
    } catch (err) {
      console.error("Action error:", err);
      showPopup("Server error. Try again.", "error");
    }
  });
});

/* ----------------- USER INFO ----------------- */
async function loadUserInfo(email) {
  try {
    const res = await fetch(`/user-info?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (!data.success) return showPopup("Unable to load user info.", "error");

    const xp = Number(data.xp || 0);
    const level = Number(data.numeric_level || 0);

    // Progressive XP requirement (250, 500, 750, 1000, ...)
    const xpForNext = 250 * (level + 1);
    const xpInLevel = xp - totalXpForLevel(level);
    const progressPct = Math.min(100, (xpInLevel / xpForNext) * 100);

    // Update dashboard display
    setText("userName", data.first_name);
    setText("userLevel", data.level ?? "Novice");
    setText("userXP", xp);
    const bar = document.getElementById("xpProgress");
    const txt = document.getElementById("xpToNext");
    if (bar) bar.style.width = `${progressPct}%`;
    if (txt) txt.textContent = `${xpInLevel} / ${xpForNext} to next level`;

    // Save locally
    localStorage.setItem(
      "user",
      JSON.stringify({ ...data, email, xp, numeric_level: level })
    );
  } catch (err) {
    console.error("loadUserInfo:", err);
    showPopup("Error fetching user data from server.", "error");
  }
}

// Calculates total XP needed to *reach* a specific level
function totalXpForLevel(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += 250 * (i + 1);
  return total;
}

/* ----------------- COURSES ----------------- */
async function loadUserCourses(email) {
  const continueList = document.getElementById("continueList");
  const allCourses = document.getElementById("allCourses");
  const completedList = document.getElementById("completedList");

  try {
    const res = await fetch(`/user-courses?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (!data.success)
      return showPopup(data.message || "Failed to load courses.", "error");

    const courses = data.courses || [];
    const inProgress = courses.filter((c) => c.status === "in-progress");
    const completed = courses.filter((c) => c.status === "completed");

    // Continue Learning
    continueList.innerHTML =
      inProgress.length > 0
        ? inProgress.map(renderCourseCard).join("")
        : `<p class="text-muted small">No in-progress courses yet.</p>`;

    // All Courses
    allCourses.innerHTML =
      courses.length > 0
        ? courses.map(renderCourseCard).join("")
        : `<p class="text-muted small">No courses available.</p>`;

    // Completed Courses
    if (completedList) {
      completedList.innerHTML =
        completed.length > 0
          ? completed.map(renderCourseCard).join("")
          : `<p class="text-muted small">No completed courses yet.</p>`;
    }
  } catch (err) {
    console.error("loadUserCourses:", err);
    showPopup("Error loading courses from server.", "error");
  }
}

/* ----------------- RENDERING ----------------- */
function renderCourseCard(course) {
  const progress = Number(course.progress_pct || 0);
  const color =
    course.status === "completed"
      ? "bg-success"
      : course.status === "in-progress"
      ? "bg-info"
      : "bg-secondary";

  return `
    <div class="p-3 border rounded mb-3 card border-teal shadow-sm">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h5 class="text-teal mb-1">${escapeHtml(course.title)}</h5>
          <p class="text-muted small mb-2">${escapeHtml(course.description || "")}</p>
          <div class="small text-muted">
            ${Number(course.total_lessons || 0)} lessons • ${Number(course.xp_reward || 0)} XP reward
          </div>
        </div>
        <span class="badge ${color} text-white">
          ${escapeHtml(course.status.replace("-", " "))}
        </span>
      </div>

      <div class="progress my-2" style="height:8px;">
        <div class="progress-bar bg-teal" style="width:${progress}%"></div>
      </div>

      <div class="d-flex gap-2">
        <button class="btn btn-teal btn-sm" data-action="start" data-id="${course.id}">
          ${course.status === "not-started" ? "Start" : "Restart"}
        </button>
        <button class="btn btn-outline-secondary btn-sm" data-action="lesson" data-id="${course.id}"
          ${course.status === "not-started" ? "disabled" : ""}>
          Complete Lesson
        </button>
      </div>
    </div>
  `;
}

/* ----------------- UTILITIES ----------------- */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showPopup(message, type = "info") {
  const existing = document.getElementById("alertBox");
  if (existing) existing.remove();

  const box = document.createElement("div");
  box.id = "alertBox";
  box.className =
    "alert position-fixed top-0 start-50 translate-middle-x mt-4 shadow-lg fw-semibold text-center";
  box.style.zIndex = "1055";
  box.style.padding = "0.8em 1.4em";
  box.style.minWidth = "260px";
  box.style.borderRadius = "6px";
  box.style.transition = "opacity 0.5s ease";

  if (type === "success") box.classList.add("bg-teal", "text-white");
  else if (type === "error") box.classList.add("alert-danger");
  else box.classList.add("alert-info");

  box.textContent = message;
  document.body.appendChild(box);

  setTimeout(() => {
    box.style.opacity = "0";
    setTimeout(() => box.remove(), 500);
  }, 2200);
}
