/*
---------------------------------------------------------
Student: C22320301 - Jamie O’Neill
File: onboarding-config.js
Purpose: Stores onboarding tour flow, page links, and step content for each page.
Notes: Moved onboarding constants out of config.js into a dedicated file.
---------------------------------------------------------
*/

// Ordered list of onboarding stages.
window.ONBOARDING_FLOW = [
  "dashboard",
  "courses",
  "course",
  "sandbox",
  "progress",
  "account",
  "wrapup"
];

// Page URL for each onboarding stage.
window.ONBOARDING_STAGE_URLS = {
  dashboard: "dashboard.html",
  courses: "courses.html",
  course: "course.html?id=1",
  sandbox: "sandbox.html?mode=practice",
  progress: "progress.html",
  account: "account.html",
  wrapup: "dashboard.html"
};

// Step-by-step content shown in each stage.
window.ONBOARDING_STEPS = {
  dashboard: [
    { target: "dashboard-header", title: "Welcome to Netology", description: "An interactive, gamified way to learn computer networking by doing." },
    { target: "dashboard-stats", title: "Quick Stats", description: "XP, streaks, challenges, and sandbox activity in one place." },
    { target: "progress-widget", title: "Streaks & Progress", description: "Keep your learning momentum visible every day." },
    { target: "courses-section", title: "Continue Learning", description: "Pick up your courses with clear, step-by-step modules." },
    { target: "achievements-section", title: "Achievements", description: "Earn badges as you master new skills." },
    { target: "challenges-section", title: "Daily & Weekly Focus", description: "Short challenges help you learn by doing." },
    { target: "sandbox-link", title: "Network Sandbox", description: "Build and test real network topologies in a safe lab." }
  ],
  courses: [
    { target: "courses-hero", title: "Course Library", description: "Explore every course and unlock new skills." },
    { target: "courses-filter-all", title: "All Tracks", description: "See everything in one view." },
    { target: "courses-filter-novice", title: "Novice Track", description: "Start with core networking fundamentals." },
    { target: "courses-filter-intermediate", title: "Intermediate Track", description: "Build practical networking skills." },
    { target: "courses-filter-advanced", title: "Advanced Track", description: "Tackle complex topologies and challenges." },
    { target: "courses-my-progress", title: "My Progress", description: "See what you started, finished, or paused." }
  ],
  course: [
    { target: "course-hero", title: "Course Overview", description: "Your course title, difficulty, and progress ring — everything at a glance." },
    { target: "course-continue", title: "Up Next", description: "See what is coming up and jump straight in. Your stats are here too." },
    { target: "course-modules", title: "Modules", description: "Expand any module to see learning items, quizzes, and challenges." }
  ],
  sandbox: [
    { target: "sandbox-toolbar", title: "Sandbox Tools", description: "Select, connect, undo, and save your work." },
    { target: "sandbox-library", title: "Device Library", description: "Drag routers, switches, and hosts to the canvas." },
    { target: "sandbox-canvas", title: "Topology Canvas", description: "Build networks by hand and learn by doing." },
    { target: "sandbox-stats", title: "Live Stats", description: "Track devices and connections as you build." },
    { target: "sandbox-inspector", title: "Inspector", description: "Check status, pings, and diagnostics." },
    { target: "sandbox-console", title: "Console", description: "Run commands and view results instantly." }
  ],
  progress: [
    { target: "progress-categories", title: "Progress Views", description: "Switch between courses, modules, quizzes, and sandbox." },
    { target: "progress-split", title: "Split View", description: "See what’s in progress vs. completed." }
  ],
  account: [
    { target: "account-profile-hero", title: "Profile Snapshot", description: "Your stats, badges, and streaks live here." },
    { target: "account-tab-preferences", title: "Preferences", description: "Customize themes, accessibility, and privacy." },
    { target: "account-appearance", title: "Themes", description: "Choose a look that works for you.", tab: "preferences" },
    { target: "account-accessibility", title: "Dyslexic Font", description: "Accessibility options for better readability.", tab: "preferences" },
    { target: "account-tab-activity", title: "Activity", description: "See your learning activity over time." },
    { target: "account-activity-heatmap", title: "Activity Map", description: "A GitHub-style view of your learning streak.", tab: "activity" }
  ],
  wrapup: [
    { target: "dashboard-header", title: "You’re Ready", description: "Netology makes networking simple, visual, and hands-on." },
    { target: "courses-section", title: "Start Learning", description: "Continue your next course anytime." }
  ]
};
