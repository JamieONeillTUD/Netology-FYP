/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: courses.js
Purpose: Display all available courses with progress tracking and difficulty filtering
Simplified From: courses.js (771 lines)
---------------------------------------------------------

OVERVIEW: This page shows all courses grouped by difficulty level (Novice, Intermediate, Advanced).
Main responsibilities:
  1. Load courses from API or COURSE_CONTENT
  2. Track user progress on each course
  3. Display course cards with progress bars
  4. Filter courses by difficulty level
  5. Handle course locking based on user level
  6. Navigate to individual course pages

All code uses full variable names, clear comments, and logical sections
to make it easy to understand and modify.
---------------------------------------------------------
*/

(() => {
  "use strict";

  // ============================================================
  // CONFIGURATION & SETUP
  // ============================================================

  // Course difficulty levels
  const DIFFICULTY_LEVELS = ["novice", "intermediate", "advanced"];

  // API endpoints
  const ENDPOINTS = window.ENDPOINTS || {};

  // XP system for user level calculations
  const XP_SYSTEM = window.NetologyXP || null;

  // ============================================================
  // API HELPER
  // ============================================================

  // Shared API helper from config.js, or fallback to simple fetch
  const apiGet = typeof window.apiGet === "function"
    ? window.apiGet
    : createFallbackApiHelper();

  // Create fallback API helper if none provided
  function createFallbackApiHelper() {
    return async function apiGetFallback(apiPath, queryParameters = {}) {
      const baseUrl = String(window.API_BASE || "").trim();
      const fullUrl = baseUrl
        ? new URL(baseUrl.replace(/\/$/, "") + apiPath)
        : new URL(apiPath, window.location.origin);

      Object.entries(queryParameters || {}).forEach(([paramName, paramValue]) => {
        if (paramValue !== undefined && paramValue !== null && paramValue !== "") {
          fullUrl.searchParams.set(paramName, String(paramValue));
        }
      });

      const response = await fetch(fullUrl.toString());
      return response.json();
    };
  }

  // Helper to extract arrays from various API response shapes
  const getArrayFromResponse = window.API_HELPERS?.list || function getArrayFromResponseFallback(data, ...keys) {
    if (Array.isArray(data)) return data;
    for (const keyName of keys) {
      if (Array.isArray(data?.[keyName])) return data[keyName];
    }
    return [];
  };

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  // Get element by ID
  function getById(elementId) {
    return document.getElementById(elementId);
  }

  // Set text content of element by ID
  function setTextById(elementId, textContent) {
    const element = getById(elementId);
    if (element) {
      element.textContent = String(textContent || "");
    }
  }

  // Safely parse JSON
  function parseJsonSafely(jsonString) {
    try {
      return jsonString ? JSON.parse(jsonString) : null;
    } catch {
      return null;
    }
  }

  // Escape HTML to prevent injection
  function escapeHtmlString(textValue) {
    const tempDiv = document.createElement("div");
    tempDiv.textContent = String(textValue || "");
    return tempDiv.innerHTML;
  }

  // Get user level from XP
  function getLevelFromXP(totalXP) {
    return XP_SYSTEM?.levelFromTotalXp ? XP_SYSTEM.levelFromTotalXp(totalXP) : 1;
  }

  // ============================================================
  // USER DATA FUNCTIONS
  // ============================================================

  // Get current user from localStorage
  function getCurrentUser() {
    return (
      parseJsonSafely(localStorage.getItem("netology_user")) ||
      parseJsonSafely(localStorage.getItem("user")) ||
      null
    );
  }

  // Get user's level based on XP
  function getUserLevel(user) {
    return Number(user?.numeric_level) || getLevelFromXP(Number(user?.xp || 0)) || 1;
  }

  // ============================================================
  // COURSE DATA FUNCTIONS
  // ============================================================

  // Fetch all available courses
  async function fetchCourseList() {
    // Try to get from API first
    try {
      const apiResponse = await apiGet(ENDPOINTS.courses?.list || "/courses");
      const apiCourses = getArrayFromResponse(apiResponse, "courses");

      if (apiCourses.length > 0) {
        return apiCourses.map((course) => enrichCourseData(course));
      }
    } catch (error) {
      console.warn("Could not fetch courses from API:", error);
    }

    // Fallback to COURSE_CONTENT
    if (typeof window.COURSE_CONTENT === "undefined" || !window.COURSE_CONTENT) {
      return [];
    }

    return Object.entries(window.COURSE_CONTENT).map(([courseId, courseData]) => {
      return enrichCourseData({
        id: courseId,
        ...courseData
      });
    });
  }

  // Merge API data with static course content
  function enrichCourseData(apiCourse) {
    const courseId = String(apiCourse?.id || "");
    const staticCourse = getStaticCourseData(courseId);
    const totalLessons = countCourseLessons(apiCourse, staticCourse);
    const moduleCount = countCourseModules(apiCourse, staticCourse);
    const objectiveStats = calculateObjectiveStats(staticCourse);

    return {
      ...apiCourse,
      id: courseId || String(staticCourse?.id || ""),
      title: apiCourse?.title || staticCourse?.title || "Course",
      description: apiCourse?.description || staticCourse?.description || "",
      difficulty: normalizeDifficultyLevel(apiCourse?.difficulty || staticCourse?.difficulty || "novice"),
      category: apiCourse?.category || staticCourse?.category || "Core",
      required_level: Number(apiCourse?.required_level || staticCourse?.required_level || 1),
      xp_reward: Number(apiCourse?.xp_reward || staticCourse?.xpReward || staticCourse?.totalXP || 0),
      module_count: moduleCount,
      objective_count: objectiveStats.totalObjectives,
      module_objective_counts: objectiveStats.moduleObjectiveCounts,
      total_lessons: totalLessons,
      estimated_time: apiCourse?.estimated_time || staticCourse?.estimatedTime || ""
    };
  }

  // Get static course data from COURSE_CONTENT
  function getStaticCourseData(courseId) {
    if (typeof window.COURSE_CONTENT === "undefined" || !window.COURSE_CONTENT) {
      return {};
    }
    return window.COURSE_CONTENT[String(courseId)] || {};
  }

  // Count total lessons in course
  function countCourseLessons(apiCourse, staticCourse) {
    const apiLessonCount = Number(apiCourse?.total_lessons);
    if (Number.isFinite(apiLessonCount) && apiLessonCount > 0) {
      return apiLessonCount;
    }

    let staticLessonCount = 0;
    if (Array.isArray(staticCourse?.units)) {
      staticCourse.units.forEach((unit) => {
        staticLessonCount += Array.isArray(unit?.lessons) ? unit.lessons.length : 0;
      });
    }

    return staticLessonCount;
  }

  // Count modules in course
  function countCourseModules(apiCourse, staticCourse) {
    const apiModuleCount = Number(apiCourse?.module_count);
    if (Number.isFinite(apiModuleCount) && apiModuleCount > 0) {
      return Math.round(apiModuleCount);
    }

    const staticUnits = Array.isArray(staticCourse?.units) ? staticCourse.units : [];
    if (staticUnits.length > 0) {
      return staticUnits.length;
    }

    return 1;
  }

  // Calculate total and per-module objectives
  function calculateObjectiveStats(staticCourse) {
    const staticUnits = Array.isArray(staticCourse?.units) ? staticCourse.units : [];
    if (!staticUnits.length) {
      return { totalObjectives: 0, moduleObjectiveCounts: [] };
    }

    const moduleObjectiveCounts = staticUnits.map((unit) => countUnitObjectives(unit));
    const totalObjectives = moduleObjectiveCounts.reduce((sum, count) => sum + count, 0);

    return { totalObjectives, moduleObjectiveCounts };
  }

  // Count objectives in a single unit
  function countUnitObjectives(unit) {
    let objectiveCount = 0;
    const lessons = Array.isArray(unit?.lessons) ? unit.lessons : [];

    // Method 1: Count explicit objectives
    lessons.forEach((lesson) => {
      const explicitObjectives = Array.isArray(lesson?.objectives) ? lesson.objectives.length : 0;
      if (explicitObjectives > 0) {
        objectiveCount += explicitObjectives;
        return;
      }

      // Method 2: Count interactive blocks
      const blocks = Array.isArray(lesson?.blocks) ? lesson.blocks : [];
      const interactiveBlockCount = blocks.filter((block) => {
        const blockType = String(block?.type || "").toLowerCase();
        return blockType === "check" || blockType === "activity" || blockType === "practice";
      }).length;
      objectiveCount += interactiveBlockCount;
    });

    // Method 3: Count from sections
    if (objectiveCount === 0) {
      const sections = Array.isArray(unit?.sections) ? unit.sections : [];
      sections.forEach((section) => {
        const items = Array.isArray(section?.items) ? section.items : [];
        items.forEach((item) => {
          const stepCount = Array.isArray(item?.steps) ? item.steps.length : 0;
          const challengeStepCount = Array.isArray(item?.challenge?.steps) ? item.challenge.steps.length : 0;

          if (stepCount > 0 || challengeStepCount > 0) {
            objectiveCount += Math.max(stepCount, challengeStepCount);
          } else {
            objectiveCount += 1;
          }
        });
      });
    }

    return objectiveCount;
  }

  // Normalize difficulty level string
  function normalizeDifficultyLevel(rawDifficulty) {
    const normalized = String(rawDifficulty || "novice").toLowerCase();
    return DIFFICULTY_LEVELS.includes(normalized) ? normalized : "novice";
  }

  // ============================================================
  // COURSE PROGRESS FUNCTIONS
  // ============================================================

  // Fetch user's progress on all courses
  async function fetchUserProgressMap(userEmail) {
    try {
      const progressResponse = await apiGet(ENDPOINTS.courses?.userCourses || "/user-courses", { email: userEmail });
      const courseProgressList = getArrayFromResponse(progressResponse, "courses");

      // Build map for quick lookup by course ID
      const progressMap = new Map();
      courseProgressList.forEach((courseProgress) => {
        const courseId = String(courseProgress.id || courseProgress.course_id || "");
        if (courseId) {
          progressMap.set(courseId, courseProgress);
        }
      });

      return progressMap;
    } catch (error) {
      console.warn("Could not fetch user progress:", error);
      return new Map();
    }
  }

  // Group courses by difficulty level
  function groupCoursesByDifficulty(courseList) {
    const grouped = {};

    DIFFICULTY_LEVELS.forEach((level) => {
      grouped[level] = [];
    });

    courseList.forEach((course) => {
      const difficulty = normalizeDifficultyLevel(course.difficulty || "novice");
      if (grouped[difficulty]) {
        grouped[difficulty].push(course);
      }
    });

    return grouped;
  }

  // ============================================================
  // UI RENDERING FUNCTIONS
  // ============================================================

  // Load and render all courses
  async function loadAndRenderCourses(currentUser) {
    try {
      console.log("Loading courses...");

      const courseList = await fetchCourseList();
      if (!courseList.length) {
        console.warn("No courses available");
        return;
      }

      const userProgressMap = await fetchUserProgressMap(currentUser.email);
      const userLevel = getUserLevel(currentUser);
      const coursesByDifficulty = groupCoursesByDifficulty(courseList);

      // Render each difficulty tier
      DIFFICULTY_LEVELS.forEach((difficultyLevel) => {
        const gridContainer = getById(`${difficultyLevel}Grid`);
        if (!gridContainer) return;

        gridContainer.innerHTML = "";

        const tierCourses = coursesByDifficulty[difficultyLevel] || [];

        tierCourses.forEach((course) => {
          const courseCard = createCourseCard(course, userProgressMap, userLevel);
          gridContainer.appendChild(courseCard);
        });
      });

      console.log("Courses rendered successfully");
    } catch (error) {
      console.error("Error loading courses:", error);
    }
  }

  // Create a course card element
  function createCourseCard(courseData, progressMap, userLevel) {
    const card = document.createElement("div");
    card.className = "net-course-card";

    const courseId = String(courseData.id || "");
    const courseProgress = progressMap.get(courseId) || {};
    const progressPercent = Math.max(0, Math.min(100, Number(courseProgress.progress_pct || 0)));
    const isLocked = Number(courseData.required_level || 1) > userLevel;
    const isCompleted = progressPercent >= 100;
    const isInProgress = progressPercent > 0 && progressPercent < 100;

    // Add state classes
    if (isLocked) card.classList.add("locked");
    if (isInProgress) card.classList.add("in-progress");
    if (isCompleted) card.classList.add("completed");

    // Build card HTML
    const moduleChips = buildModuleChips(courseData.module_objective_counts || []);
    const xpDisplay = courseData.xp_reward > 0 ? `
      <div class="net-course-xp">
        <i class="bi bi-lightning-charge-fill"></i>
        <span>${courseData.xp_reward} XP</span>
      </div>
    ` : "";

    const estimatedTimeDisplay = courseData.estimated_time ? `
      <span class="net-course-stat-pill">
        <i class="bi bi-clock"></i>${escapeHtmlString(courseData.estimated_time)}
      </span>
    ` : "";

    card.innerHTML = `
      <div class="net-course-header">
        <div class="net-course-icon">${getDifficultyIcon(courseData.difficulty)}</div>
        <div class="net-course-meta">
          <div class="net-course-category">${escapeHtmlString(courseData.category || "Core")}</div>
          <div class="net-course-title">${escapeHtmlString(courseData.title || "Course")}</div>
        </div>
      </div>

      <div class="net-course-stats-row">
        <span class="net-course-stat-pill">
          <i class="bi bi-file-text"></i>${courseData.total_lessons} ${courseData.total_lessons === 1 ? "lesson" : "lessons"}
        </span>
        <span class="net-course-stat-pill">
          <i class="bi bi-diagram-3"></i>${courseData.module_count} ${courseData.module_count === 1 ? "module" : "modules"}
        </span>
        <span class="net-course-stat-pill">
          <i class="bi bi-check2-square"></i>${courseData.objective_count} ${courseData.objective_count === 1 ? "objective" : "objectives"}
        </span>
        ${estimatedTimeDisplay}
      </div>

      ${moduleChips ? `<div class="net-course-module-breakdown">${moduleChips}</div>` : ""}

      <div class="net-course-desc">${escapeHtmlString(courseData.description || "")}</div>

      ${xpDisplay}

      <div class="net-course-footer">
        <div class="net-course-progress-block">
          <div class="net-course-progress-meta">
            <span class="net-course-progress-label">${progressPercent}% Complete</span>
          </div>
          <div class="net-course-bar net-course-bar--wide">
            <div class="net-course-bar-fill" style="width: ${progressPercent}%"></div>
          </div>
        </div>

        <button class="net-course-cta ${isInProgress ? "btn-continue" : isCompleted ? "btn-review" : isLocked ? "btn-locked" : "btn-start"}"
                data-course-id="${escapeHtmlString(courseId)}"
                ${isLocked ? "disabled" : ""}>
          ${isLocked
            ? `<i class="bi bi-lock"></i> Locked`
            : isCompleted
              ? `<i class="bi bi-check-circle"></i> Review`
              : isInProgress
                ? `<i class="bi bi-play-fill"></i> Continue`
                : `<i class="bi bi-plus-circle"></i> Start`}
        </button>
      </div>

      ${isLocked ? `<div class="net-course-lock"><i class="bi bi-lock"></i></div>` : ""}
    `;

    // Add click handlers
    if (!isLocked) {
      const courseUrl = `course.html?course_id=${encodeURIComponent(courseId)}`;

      const actionButton = card.querySelector(".net-course-cta");
      if (actionButton) {
        actionButton.addEventListener("click", () => {
          window.location.href = courseUrl;
        });
      }

      card.style.cursor = "pointer";
      card.addEventListener("click", (event) => {
        if (event.target.closest(".net-course-cta")) return;
        window.location.href = courseUrl;
      });
    }

    return card;
  }

  // Build module objective chips
  function buildModuleChips(moduleCounts) {
    if (!Array.isArray(moduleCounts) || moduleCounts.length === 0) return "";

    const chips = moduleCounts.map((count, index) => {
      const moduleNumber = index + 1;
      return `<span class="net-module-chip">M${moduleNumber}: ${count} obj.</span>`;
    }).join("");

    return chips;
  }

  // Get icon for difficulty level
  function getDifficultyIcon(difficulty) {
    const level = normalizeDifficultyLevel(difficulty);
    if (level === "advanced") return '<i class="bi bi-diamond-fill"></i>';
    if (level === "intermediate") return '<i class="bi bi-hexagon-fill"></i>';
    return '<i class="bi bi-circle-fill"></i>';
  }

  // ============================================================
  // DIFFICULTY FILTER UI
  // ============================================================

  // Setup course difficulty filter buttons
  function setupDifficultyFilters() {
    const filterButtons = Array.from(document.querySelectorAll("[data-path]"));
    if (!filterButtons.length) return;

    const applyFilter = (selectedPath) => {
      const normalizedPath = String(selectedPath || "all").toLowerCase();
      const activePath = normalizedPath === "all" || DIFFICULTY_LEVELS.includes(normalizedPath)
        ? normalizedPath
        : "all";

      // Update button states
      filterButtons.forEach((button) => {
        const buttonPath = String(button.dataset.path || "all").toLowerCase();
        const isActive = buttonPath === activePath;
        button.classList.toggle("active", isActive);
        button.classList.toggle("btn-teal", isActive);
        button.classList.toggle("btn-outline-teal", !isActive);
        button.setAttribute("aria-selected", String(isActive));
      });

      // Show/hide course sections
      document.querySelectorAll(".net-course-section").forEach((section) => {
        if (activePath === "all") {
          section.style.display = "block";
        } else {
          const sectionDifficulty = String(section.dataset.difficulty || "").toLowerCase();
          section.style.display = sectionDifficulty === activePath ? "block" : "none";
        }
      });
    };

    // Wire up filter buttons
    filterButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyFilter(button.dataset.path || "all");
      });
    });

    // Show all courses by default
    applyFilter("all");

    // Reset on browser back/forward
    window.addEventListener("pageshow", () => {
      applyFilter("all");
    });
  }

  // ============================================================
  // PAGE CHROME (Navigation, User Display, etc.)
  // ============================================================

  // Setup page header and navigation
  function setupPageChrome(currentUser) {
    setupBrandRouting();
    setupSidebar();
    setupUserDropdown();
    setupLogoutButtons();
    updateUserDisplay(currentUser);
  }

  // Setup brand logo routing
  function setupBrandRouting() {
    const topBrand = getById("topBrand");
    const sideBrand = getById("sideBrand");

    const targetPage = "dashboard.html";

    if (topBrand) topBrand.setAttribute("href", targetPage);
    if (sideBrand) sideBrand.setAttribute("href", targetPage);
  }

  // Setup sidebar toggle
  function setupSidebar() {
    const openButton = getById("openSidebarBtn");
    const closeButton = getById("closeSidebarBtn");
    const sidebar = getById("slideSidebar");
    const backdrop = getById("sideBackdrop");

    const openSidebar = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
    };

    const closeSidebar = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
    };

    if (openButton) openButton.addEventListener("click", openSidebar);
    if (closeButton) closeButton.addEventListener("click", closeSidebar);
    if (backdrop) backdrop.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sidebar?.classList.contains("is-open")) {
        closeSidebar();
      }
    });
  }

  // Setup user dropdown
  function setupUserDropdown() {
    const userButton = getById("userBtn");
    const userDropdown = getById("userDropdown");
    if (!userButton || !userDropdown) return;

    userButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = userDropdown.classList.toggle("is-open");
      userButton.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (event) => {
      if (userDropdown.contains(event.target) || userButton.contains(event.target)) return;
      userDropdown.classList.remove("is-open");
      userButton.setAttribute("aria-expanded", "false");
    });
  }

  // Setup logout buttons
  function setupLogoutButtons() {
    const topLogoutButton = getById("topLogoutBtn");
    const sideLogoutButton = getById("sideLogoutBtn");

    const logout = () => {
      localStorage.removeItem("netology_user");
      localStorage.removeItem("user");
      localStorage.removeItem("netology_token");
      window.location.href = "index.html";
    };

    if (topLogoutButton) topLogoutButton.addEventListener("click", logout);
    if (sideLogoutButton) sideLogoutButton.addEventListener("click", logout);
  }

  // Update user info display
  function updateUserDisplay(currentUser) {
    const fullName = [currentUser?.first_name, currentUser?.last_name]
      .filter(Boolean)
      .join(" ") || currentUser?.username || "Student";

    const userEmail = String(currentUser?.email || "");
    const avatarInitial = (fullName.charAt(0) || "S").toUpperCase();
    const userXP = Number(currentUser?.xp || 0);
    const userLevel = getLevelFromXP(userXP);

    setTextById("topAvatar", avatarInitial);
    setTextById("ddName", fullName);
    setTextById("ddEmail", userEmail);

    setTextById("sideAvatar", avatarInitial);
    setTextById("sideUserName", fullName);
    setTextById("sideUserEmail", userEmail);
    setTextById("sideLevelBadge", `Lv ${userLevel}`);
  }

  // ============================================================
  // MAIN INITIALIZATION
  // ============================================================

  // Initialize the courses page
  async function initializeCoursesPage() {
    console.log("Initializing courses page...");

    // Check if user is logged in
    const currentUser = getCurrentUser();
    if (!currentUser?.email) {
      window.location.href = "login.html";
      return;
    }

    // Setup UI
    setupPageChrome(currentUser);
    setupDifficultyFilters();

    // Load and render courses
    await loadAndRenderCourses(currentUser);

    // Mark page as loaded
    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    // Show onboarding tour if needed
    if (typeof window.maybeStartOnboardingTour === "function") {
      window.maybeStartOnboardingTour("courses", currentUser.email);
    }

    console.log("Courses page initialization complete!");
  }

  // Start when DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    initializeCoursesPage();
  });

})();
