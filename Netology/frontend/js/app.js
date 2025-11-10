// frontend/js/app.js
// --- SIGNUP VALIDATION & SUBMIT ---
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const required = ["first_name", "last_name", "username", "email", "password"];
      for (const id of required) {
        const el = document.getElementById(id);
        if (!el.value.trim()) {
          showPopup(`Please fill out: ${id.replace("_", " ")}`, "error");
          return;
        }
      }

      const email = document.getElementById("email").value;
      if (!email.includes("@") || !email.includes(".")) {
        showPopup("Please enter a valid email address.", "error");
        return;
      }

      const pwd = document.getElementById("password").value;
      if (pwd.length < 8) {
        showPopup("Password must be at least 8 characters.", "error");
        return;
      }

      const levelSelected = document.querySelector('input[name="level"]:checked');
      if (!levelSelected) {
        showPopup("Please select your networking level.", "error");
        return;
      }

      const reasons = document.querySelectorAll('input[name="reasons"]:checked');
      if (reasons.length === 0) {
        showPopup("Please select at least one reason for learning.", "error");
        return;
      }

      const formData = new FormData(signupForm);

      try {
        const response = await fetch("/register", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          showPopup("✅ Account created successfully! Redirecting to login...", "success");
          setTimeout(() => {
            window.location.href = "login.html";
          }, 1500);
        } else {
          showPopup(data.message || "Signup failed. Please try again.", "error");
        }
      } catch (err) {
        console.error("Signup error:", err);
        showPopup("Error connecting to server. Please try again.", "error");
      }
    });
  }

  // --- LOGIN HANDLER ---
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(loginForm);

      try {
        const response = await fetch("/login", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          // Save user info for dashboard
          localStorage.setItem("user", JSON.stringify({
            email: document.getElementById("email").value,
            first_name: data.first_name,
            level: data.level,
            xp: data.xp
          }));

          showPopup(`Welcome back, ${data.first_name}! Redirecting...`, "success");
          setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 1500);
        } else {
          showPopup(data.message || "Invalid email or password.", "error");
        }
      } catch (err) {
        console.error("Login error:", err);
        showPopup("Error connecting to server. Please try again.", "error");
      }
    });
  }
});

// --- POPUP FUNCTION ---
function showPopup(message, type = "info") {
  const existing = document.getElementById("alertBox");
  if (existing) existing.remove();

  const popup = document.createElement("div");
  popup.id = "alertBox";
  popup.className =
    "alert position-fixed top-0 start-50 translate-middle-x mt-4 shadow-lg fw-semibold text-center";
  popup.style.zIndex = "1055";
  popup.style.padding = "0.8em 1.4em";
  popup.style.minWidth = "260px";
  popup.style.borderRadius = "6px";
  popup.style.transition = "opacity 0.5s ease";

  if (type === "success") {
    popup.classList.add("bg-teal", "text-white");
  } else if (type === "error") {
    popup.classList.add("alert-danger");
  } else {
    popup.classList.add("alert-info");
  }

  popup.textContent = message;
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => popup.remove(), 500);
  }, 2500);
}
