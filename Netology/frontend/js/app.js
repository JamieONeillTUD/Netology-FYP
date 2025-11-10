/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript - Netology Signup Wizard
-----------------------------------
Controls the 3-step signup process with smooth transitions.
Validates user input step-by-step before allowing progress.
No external libraries — pure JavaScript + Bootstrap + CSS fades.
*/

(function () {
  // --- DOM Elements ---
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const steps = [step1, step2, step3];

  const progressBar = document.getElementById('progressBar');
  const nextButton = document.getElementById('nextBtn');
  const submitButton = document.getElementById('submitBtn');
  const levelInputs = document.querySelectorAll('input[name="level"]');

  // --- Initial State ---
  let currentStep = 1;
  steps.forEach(el => el?.classList.add('fade-step'));

  // --- Helper: Update Progress Bar ---
  function updateProgress(stepNumber) {
    if (progressBar) {
      progressBar.style.width = ((stepNumber / 3) * 100) + '%';
    }
  }

  // --- Helper: Show Step with Fade ---
  function showStep(stepNumber) {
    steps.forEach((el, index) => {
      if (el) el.classList.toggle('show', index === (stepNumber - 1));
    });
    updateProgress(stepNumber);

    // Toggle buttons visibility
    if (stepNumber < 3) {
      nextButton?.classList.remove('d-none');
      submitButton?.classList.add('d-none');
    } else {
      nextButton?.classList.add('d-none');
      submitButton?.classList.remove('d-none');
    }
  }

  // --- Helper: Validate Step Inputs ---
  function validateStep(stepNumber) {
    // Step 1: Basic info
    if (stepNumber === 1) {
      const requiredFields = ['first_name', 'last_name', 'username', 'email', 'password'];
      for (const id of requiredFields) {
        const value = document.getElementById(id)?.value.trim();
        if (!value) {
          alert(`Please fill out: ${id.replace('_', ' ')}`);
          return false;
        }
      }

      const email = document.getElementById('email')?.value || '';
      if (!email.includes('@')) {
        alert('Please enter a valid email address.');
        return false;
      }

      const password = document.getElementById('password')?.value || '';
      if (password.length < 8) {
        alert('Password must be at least 8 characters long.');
        return false;
      }

      return true;
    }

    // Step 2: Select skill level
    if (stepNumber === 2) {
      let selected = false;
      levelInputs.forEach(input => { if (input.checked) selected = true; });
      if (!selected) {
        alert('Please select your networking knowledge level.');
        return false;
      }
      return true;
    }

    // Step 3: No validation required — user may select multiple reasons
    return true;
  }

  // --- Event: Next Button Click ---
  nextButton?.addEventListener('click', function () {
    if (!validateStep(currentStep)) return;
    currentStep = Math.min(3, currentStep + 1);
    showStep(currentStep);
  });

  // --- Initialize ---
  showStep(currentStep);
})();
