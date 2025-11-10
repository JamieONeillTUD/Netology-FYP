document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("courseList");
  try {
    const res = await fetch("/courses");
    const data = await res.json();

    data.forEach(course => {
      const div = document.createElement("div");
      div.className = "col-md-6 col-lg-4";
      div.innerHTML = `
        <div class="card border-teal shadow-sm h-100 p-3">
          <h4 class="text-teal">${course.title}</h4>
          <p>${course.description}</p>
          <p class="text-muted small">${course.difficulty} • ${course.category}</p>
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <span class="badge bg-teal">${course.xp} XP</span>
            <button class="btn btn-teal btn-sm" onclick="startCourse(${course.id})">Start</button>
          </div>
        </div>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading courses:", err);
  }
});

function startCourse(id) {
  window.location.href = `course.html?id=${id}`;
}
