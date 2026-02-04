/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript 
---------------------------------------
app.js – Handles authentication on the frontend.

Signup form validation
Sending signup data to the backend
Login form submission
Saving user info 
Popup alerts for feedback
*/

document.addEventListener("DOMContentLoaded", () => {
  //Signup form Handling, Checks inputs, validates, then sends data to backend.
  const signupForm = document.getElementById("signupForm");

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Get field values from the form
      const first = document.getElementById("first_name").value.trim();
      const last = document.getElementById("last_name").value.trim();
      const username = document.getElementById("username").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      const level = document.querySelector('input[name="level"]:checked');
      const reasons = document.querySelectorAll('input[name="reasons"]:checked');

      //Validation checks
      if (!first || !last || !username || !email || !password) {
        showPopup("Please fill in all required fields.", "error");
        return;
      }

      if (!email.includes("@") || !email.includes(".")) {
        showPopup("Enter a valid email address.", "error");
        return;
      }

      if (password.length < 8) {
        showPopup("Password must be at least 8 characters.", "error");
        return;
      }

      if (!level) {
        showPopup("Please select your networking level.", "error");
        return;
      }

      if (reasons.length === 0) {
        showPopup("Please select at least one reason.", "error");
        return;
      }

      //Sends Data to backend for registration
      try {
        const res = await fetch(`${window.API_BASE}/register`, {
          method: "POST",
          body: new FormData(signupForm),
        });

        const data = await res.json();

        if (data.success) {
          showPopup("Account created! Redirecting...", "success");

          // Redirect user to login page after short delay
          setTimeout(() => {
            window.location.href = "login.html";
          }, 1500);

        } else {
          showPopup(data.message || "Signup failed. Try again.", "error");
        }

      } catch {
        showPopup("Server error. Please try again.", "error");
      }
    });
  }

  //Login form handling, Sends login info to backend and stores returned user data.
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        // Send login form to backend
        const res = await fetch(`${window.API_BASE}/login`, {
          method: "POST",
          body: new FormData(loginForm),
        });

        const data = await res.json();

        // If login successful, save user data and send to dashboard
        if (data.success) {
          localStorage.setItem("user", JSON.stringify({
            email: document.getElementById("email").value,
            first_name: data.first_name,
            level: data.level,
            xp: data.xp,
          }));

          showPopup(`Welcome back, ${data.first_name}!`, "success");

          setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 1500);

        } else {
          showPopup(data.message || "Invalid email or password.", "error");
        }

      } catch {
        showPopup("Server error. Please try again.", "error");
      }
    });
  }
});

//AI Prompted Code Below:
// "Can you Please write me an pop up alert function in JavaScript that displays a  message to the user
// The function should accept a message string and a type (success, error, info) and style the popup accordingly. 
// The popup should automatically disappear after 2.5 seconds."
function showPopup(message, type) {

  // Remove any existing popup before creating a new one
  const old = document.getElementById("alertBox");
  if (old) old.remove();

  // Create alert box
  const popup = document.createElement("div");
  popup.id = "alertBox";
  popup.className =
    "alert text-center fw-semibold position-fixed top-0 start-50 translate-middle-x mt-4 shadow";

  popup.style.zIndex = "9999";
  popup.style.minWidth = "260px";
  popup.style.borderRadius = "6px";

  // Pick alert colour
  if (type === "success") popup.classList.add("alert-success");
  else if (type === "error") popup.classList.add("alert-danger");
  else popup.classList.add("alert-info");

  // Insert message text
  popup.textContent = message;

  document.body.appendChild(popup);

  // Auto-remove alert after 2.5 seconds
  setTimeout(() => popup.remove(), 2500);
}
