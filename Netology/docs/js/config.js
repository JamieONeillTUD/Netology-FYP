/* AI Prompt: Explain the API base configuration section in clear, simple terms. */
/* =========================================================
   API base configuration
========================================================= */
// docs/js/config.js
// Local dev:
// window.API_BASE = "http://localhost:5001";

// Production:
window.API_BASE = window.API_BASE || "https://netology-fyp.onrender.com";

/* =========================================================
   API ENDPOINTS MAPPING (Step 15)
   =========================================================
   Central configuration for all API endpoints.
   Use these constants throughout the frontend instead of hardcoding URLs.
   
   Example usage:
   - fetch(`${window.API_BASE}${ENDPOINTS.auth.login}`, { method: 'POST', ... })
   - fetch(`${window.API_BASE}${ENDPOINTS.courses.list}`, { ... })
========================================================= */
window.ENDPOINTS = {
  // ================================================
  // AUTHENTICATION (Auth Routes)
  // ================================================
  auth: {
    register: '/register',                      // POST - Create new account
    login: '/login',                            // POST - Sign in user
    logout: '/logout',                          // GET - Sign out user
    userInfo: '/user-info',                     // GET - Get user profile
    userPreferences: '/user-preferences',       // GET/POST - User settings
    userAchievements: '/user-achievements',     // GET - User earned achievements
    awardAchievement: '/award-achievement',     // POST - Award achievement badge
    awardXp: '/award-xp',                       // POST - Award XP to user
    recordLogin: '/record-login',               // POST - Track login for streaks
    forgotPassword: '/forgot-password'          // POST - Reset password
  },

  // ================================================
  // ONBOARDING (Onboarding Tour)
  // ================================================
  onboarding: {
    status: '/api/onboarding/status',           // POST - Check if first login
    steps: '/api/onboarding/steps',             // GET - Fetch all tour steps (7 total)
    start: '/api/onboarding/start',             // POST - Begin onboarding tour
    stepComplete: '/api/onboarding/step/:id',   // POST - Mark step complete (use :id)
    complete: '/api/onboarding/complete',       // POST - Finish entire tour
    skip: '/api/onboarding/skip'                // POST - Skip tour
  },

  // ================================================
  // LESSON SLIDES (Interactive Lessons)
  // ================================================
  slides: {
    list: '/api/lessons/:lessonId/slides',           // GET - List all slides for lesson
    content: '/api/lessons/:lessonId/slides/:slideId', // GET - Get slide full content
    complete: '/api/lessons/:lessonId/slides/:slideId/complete', // POST - Mark slide complete
    progress: '/api/lessons/:lessonId/progress',    // GET - Get lesson progress
    bookmark: '/api/slides/:slideId/bookmark',      // POST - Toggle bookmark
    bookmarks: '/api/user/bookmarks',               // GET - List all user bookmarks
    notes: '/api/slides/:slideId/notes'             // POST - Save slide notes
  },

  // ================================================
  // COURSES
  // ================================================
  courses: {
    list: '/courses',                           // GET - List all 9 courses
    courseDetails: '/course',                   // GET ?course_id= - Get single course details
    userCourses: '/user-courses',               // GET - Get user's courses with progress
    userCourseStatus: '/user-course-status',    // GET ?email=&course_id= - Lesson/quiz/challenge status
    userProgressSummary: '/user-progress-summary', // GET ?email= - Total counts overview
    start: '/start-course',                     // POST - Start a course
    completeLesson: '/complete-lesson',         // POST - Complete single lesson & award XP
    completeQuiz: '/complete-quiz',             // POST - Complete quiz & award XP
    completeChallenge: '/complete-challenge',   // POST - Complete challenge & award XP
    completeCourse: '/complete-course',         // POST - Complete entire course & award XP
    recentActivity: '/recent-activity',         // GET ?email= - Recent completions
    quizHistory: '/quiz-history'                // GET ?email= - Recent quiz results
  },

  // ================================================
  // PROGRESS & ANALYTICS
  // ================================================
  progress: {
    userProgress: '/api/user/progress',         // GET - Get all course progress (filters available)
    progressStats: '/api/user/progress/stats',  // GET - Progress statistics
    userActivity: '/api/user/activity',         // GET - Daily activity for heatmap
    userStreaks: '/api/user/streaks'            // GET - Current and longest streak
  },

  // ================================================
  // CHALLENGES & ACHIEVEMENTS
  // ================================================
  challenges: {
    list: '/api/user/challenges'                // GET ?user_email=&type=daily|weekly - Get challenges
  },

  achievements: {
    list: '/api/user/achievements',             // GET - Get all achievements (earned + locked)
    award: '/award-achievement'                 // POST - Award achievement (internal use)
  },

  // ================================================
  // SANDBOX / NETWORK TOPOLOGY
  // ================================================
  sandbox: {
    executeCommand: '/api/sandbox/execute-command', // POST - Run whitelisted commands
    allowedCommands: '/api/sandbox/allowed-commands', // GET - List allowed commands
    lessonSessionSave: '/lesson-session/save',     // POST - Save lesson sandbox state
    lessonSessionLoad: '/lesson-session/load',     // GET - Load lesson sandbox state
    saveTopology: '/save-topology',                // POST - Save topology
    loadTopologies: '/load-topologies',            // GET - Load all user topologies
    loadTopology: '/load-topology/:topologyId',    // GET - Load single topology
    deleteTopology: '/delete-topology/:topologyId' // DELETE - Delete topology
  },

  // ================================================
  // USER PREFERENCES
  // ================================================
  preferences: {
    get: '/api/user/preferences',               // GET - Get user settings
    update: '/api/user/preferences'             // POST - Update user settings
  },

  // ================================================
  // HEALTH CHECK
  // ================================================
  health: {
    check: '/healthz'                           // GET - Server health check
  }
};

/* AI Prompt: Explain the Preview mode seeding (demo user) section in clear, simple terms. */
/* =========================================================
   Preview mode seeding (demo user)
========================================================= */
// Preview mode (for Live Server + direct link testing)
// - Only activates on localhost — never on the live GitHub Pages site
// - Activate by adding ?preview=1 to the URL when running locally
(() => {
  try {
    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (!isLocalhost) return;  // safety: never run in production

    const params = new URLSearchParams(window.location.search);
    const wantsPreview = params.has("preview");

    if (wantsPreview) {
      const existing = localStorage.getItem("user") || localStorage.getItem("netology_user");
      if (!existing) {
        const demoUser = {
          email: "demo@netology.local",
          first_name: "Demo",
          last_name: "User",
          username: "demo_user",
          xp: 40,
          unlock_tier: "novice"
        };
        localStorage.setItem("user", JSON.stringify(demoUser));
        localStorage.setItem("netology_user", JSON.stringify(demoUser));
      }
    }
  } catch {}
})();

/* AI Prompt: Explain the Celebration toast helper section in clear, simple terms. */
/* =========================================================
   Celebration toast helper
========================================================= */
(() => {
  if (window.showCelebrateToast) return;

  const makeEl = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text !== "undefined") el.textContent = text;
    return el;
  };

  const ensureStack = () => {
    let stack = document.getElementById("netToastStack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "netToastStack";
      stack.className = "net-toast-stack";
      document.body.appendChild(stack);
    }
    return stack;
  };

  window.showCelebrateToast = (opts = {}) => {
    const {
      title = "Nice work!",
      message = "",
      sub = "",
      xp = null,
      type = "success",
      icon = "",
      mini = false,
      confetti = false,
      duration = 4200
    } = opts;

    if (!document.body) return;
    const stack = ensureStack();

    const toast = document.createElement("div");
    toast.className = `net-toast net-toast-enter net-toast--celebrate in-stack${mini ? " net-toast--mini" : ""}`;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.dataset.type = type;

    const iconMap = {
      success: "bi-check2-circle",
      error: "bi-x-circle",
      info: "bi-info-circle"
    };
    const resolvedIcon = iconMap[type] || icon || "bi-info-circle";

    const inner = makeEl("div", "net-toast-inner");
    const iconWrap = makeEl("div", "net-toast-icon");
    const iconEl = document.createElement("i");
    iconEl.className = `bi ${resolvedIcon}`;
    iconEl.setAttribute("aria-hidden", "true");
    iconWrap.appendChild(iconEl);

    const body = makeEl("div", "net-toast-body");
    const titleEl = makeEl("div", "net-toast-title", title);
    body.appendChild(titleEl);

    if (message) body.appendChild(makeEl("div", "net-toast-sub", message));
    if (sub) body.appendChild(makeEl("div", "net-toast-sub", sub));
    if (xp !== null && !Number.isNaN(Number(xp))) {
      const xpRow = makeEl("div", "net-toast-sub net-toast-xp-row");
      const xpIcon = document.createElement("i");
      xpIcon.className = "bi bi-lightning-charge-fill";
      xpIcon.setAttribute("aria-hidden", "true");
      const xpText = document.createElement("span");
      xpText.textContent = `+${Number(xp)} XP`;
      xpRow.append(xpIcon, xpText);
      body.appendChild(xpRow);
    }

    const closeBtn = makeEl("button", "net-toast-close");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Dismiss message");
    closeBtn.appendChild(makeEl("span", "", "×"));

    inner.append(iconWrap, body, closeBtn);
    toast.appendChild(inner);

    if (confetti && !mini) {
      const confettiWrap = makeEl("div", "net-toast-confetti");
      const colors = ["teal", "cyan", "amber", "violet"];
      for (let i = 0; i < 14; i += 1) {
        const piece = makeEl("span", `net-toast-confetti-piece is-${colors[i % colors.length]}`);
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.animationDelay = `${Math.random() * 0.3}s`;
        confettiWrap.appendChild(piece);
      }
      toast.appendChild(confettiWrap);
    }
    stack.appendChild(toast);

    const dismiss = () => {
      toast.classList.remove("net-toast-enter");
      toast.classList.add("net-toast-exit");
      setTimeout(() => toast.remove(), 220);
    };

    closeBtn.addEventListener("click", dismiss);
    toast.addEventListener("click", (e) => {
      if (e.target && e.target.closest(".net-toast-close")) return;
      dismiss();
    });

    setTimeout(dismiss, duration);
  };
})();
