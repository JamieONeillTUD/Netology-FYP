/*
---------------------------------------------------------
Student: C22320301 - Jamie O’Neill
File: config.js
Purpose: Stores the core backend URL and API endpoint map used across the site.
Notes: Removed theme, toast, preview, and onboarding helpers from this file.
---------------------------------------------------------
*/

// Local development option:
// window.API_BASE = "http://localhost:5001";

// Production default:
window.API_BASE = window.API_BASE || "https://netology-fyp.onrender.com";

// Central API route map.
window.ENDPOINTS = {
  auth: {
    register: "/register",
    login: "/login",
    logout: "/logout",
    userInfo: "/user-info",
    userPreferences: "/user-preferences",
    userAchievements: "/user-achievements",
    awardAchievement: "/award-achievement",
    awardXp: "/award-xp",
    recordLogin: "/record-login",
    forgotPassword: "/forgot-password"
  },

  onboarding: {
    status: "/api/onboarding/status",
    steps: "/api/onboarding/steps",
    start: "/api/onboarding/start",
    stepComplete: "/api/onboarding/step/:id",
    complete: "/api/onboarding/complete",
    skip: "/api/onboarding/skip"
  },

  slides: {
    list: "/api/lessons/:lessonId/slides",
    content: "/api/lessons/:lessonId/slides/:slideId",
    complete: "/api/lessons/:lessonId/slides/:slideId/complete",
    progress: "/api/lessons/:lessonId/progress",
    bookmark: "/api/slides/:slideId/bookmark",
    bookmarks: "/api/user/bookmarks",
    notes: "/api/slides/:slideId/notes"
  },

  courses: {
    list: "/courses",
    courseDetails: "/course",
    userCourses: "/user-courses",
    userCourseStatus: "/user-course-status",
    userProgressSummary: "/user-progress-summary",
    start: "/start-course",
    completeLesson: "/complete-lesson",
    completeQuiz: "/complete-quiz",
    completeChallenge: "/complete-challenge",
    completeCourse: "/complete-course",
    recentActivity: "/recent-activity",
    quizHistory: "/quiz-history"
  },

  progress: {
    userProgress: "/api/user/progress",
    progressStats: "/api/user/progress/stats",
    userActivity: "/api/user/activity",
    userStreaks: "/api/user/streaks"
  },

  challenges: {
    list: "/api/user/challenges"
  },

  achievements: {
    list: "/api/user/achievements",
    award: "/award-achievement"
  },

  sandbox: {
    executeCommand: "/api/sandbox/execute-command",
    allowedCommands: "/api/sandbox/allowed-commands",
    lessonSessionSave: "/lesson-session/save",
    lessonSessionLoad: "/lesson-session/load",
    saveTopology: "/save-topology",
    loadTopologies: "/load-topologies",
    loadTopology: "/load-topology/:topologyId",
    deleteTopology: "/delete-topology/:topologyId"
  },

  preferences: {
    get: "/api/user/preferences",
    update: "/api/user/preferences"
  },

  health: {
    check: "/healthz"
  }
};
