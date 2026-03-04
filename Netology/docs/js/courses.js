/*
---------------------------------------------------------
Student: C22320301 - Jamie O’Neill
File: courses.js
Purpose: Loads the courses page, shows course cards, and shows user progress.
Notes: Rewritten into small clear functions with simple comments and same page behavior.
---------------------------------------------------------
*/

(() => {
  "use strict";

  const TRACK_NAMES = ["novice", "intermediate", "advanced"];
  const ENDPOINTS = window.ENDPOINTS || {};
  const XP = window.NetologyXP || null;

  // Use shared API helper when available, otherwise use a simple fetch helper.
  const apiGet = typeof window.apiGet === "function"
    ? window.apiGet
    : async function apiGetFallback(path, params = {}) {
      const base = String(window.API_BASE || "").trim();
      const url = base
        ? new URL(base.replace(/\/$/, "") + path)
        : new URL(path, window.location.origin);

      Object.entries(params).forEach(([paramName, paramValue]) => {
        if (paramValue !== undefined && paramValue !== null && paramValue !== "") {
          url.searchParams.set(paramName, String(paramValue));
        }
      });

      const response = await fetch(url.toString());
      return response.json();
    };

  // Get arrays from API responses safely.
  const listFrom = window.API_HELPERS?.list || function listFromFallback(data, ...keys) {
    if (Array.isArray(data)) return data;
    for (const keyName of keys) {
      if (Array.isArray(data?.[keyName])) return data[keyName];
    }
    return [];
  };

  document.addEventListener("DOMContentLoaded", () => {
    initCoursesPage();
  });

  // Main page startup.
  async function initCoursesPage() {
    const currentUser = getCurrentUser();
    if (!currentUser?.email) {
      window.location.href = "login.html";
      return;
    }

    wirePageChrome(currentUser);
    wireTrackFilters();

    await loadAndRenderCourses(currentUser);
    await loadAndRenderProgress(currentUser);

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    if (typeof window.maybeStartOnboardingTour === "function") {
      window.maybeStartOnboardingTour("courses", currentUser.email);
    }
  }

  // Path filter buttons (All / Novice / Intermediate / Advanced).
  function wireTrackFilters() {
    const filterButtons = Array.from(document.querySelectorAll("[data-path]"));
    if (!filterButtons.length) return;

    const applyTrackFilter = (rawPath) => {
      const normalizedPath = String(rawPath || "all").toLowerCase();
      const selectedPath = normalizedPath === "all" || TRACK_NAMES.includes(normalizedPath)
        ? normalizedPath
        : "all";

      filterButtons.forEach((buttonElement) => {
        const buttonPath = String(buttonElement.dataset.path || "all").toLowerCase();
        const isActive = buttonPath === selectedPath;
        buttonElement.classList.toggle("active", isActive);
        buttonElement.classList.toggle("btn-teal", isActive);
        buttonElement.classList.toggle("btn-outline-teal", !isActive);
        buttonElement.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      document.querySelectorAll(".net-course-section").forEach((sectionElement) => {
        if (selectedPath === "all") {
          sectionElement.style.display = "block";
          return;
        }

        const sectionTrack = String(sectionElement.dataset.difficulty || "").toLowerCase();
        sectionElement.style.display = sectionTrack === selectedPath ? "block" : "none";
      });
    };

    filterButtons.forEach((filterButton) => {
      filterButton.addEventListener("click", (event) => {
        event.preventDefault();
        applyTrackFilter(filterButton.dataset.path || "all");
      });
    });

    // Always start in "All Paths" view so novice courses are visible by default.
    applyTrackFilter("all");

    // If browser restores the page from bfcache, reset to "All Paths" again.
    window.addEventListener("pageshow", () => {
      applyTrackFilter("all");
    });
  }

  // Load courses, apply lock rules, and render each track grid.
  async function loadAndRenderCourses(currentUser) {
    try {
      const courseList = await fetchCourseList();
      if (!courseList.length) {
        console.warn("No courses available");
        return;
      }

      const progressByCourseId = await fetchProgressMap(currentUser.email);
      const userLevel = readUserLevel(currentUser);
      const unlockTierIndex = readUnlockTierIndex(currentUser);
      const coursesByTrack = groupCoursesByTrack(courseList);

      TRACK_NAMES.forEach((trackName) => {
        const gridElement = document.getElementById(`${trackName}Grid`);
        if (!gridElement) return;

        gridElement.innerHTML = "";

        const trackIndex = TRACK_NAMES.indexOf(trackName);
        const isTrackLocked = trackIndex > unlockTierIndex;
        const trackCourses = coursesByTrack[trackName] || [];

        trackCourses.forEach((courseItem, courseIndex) => {
          const cardElement = createCourseCard(
            courseItem,
            progressByCourseId,
            userLevel,
            isTrackLocked,
            courseIndex
          );
          gridElement.appendChild(cardElement);
        });

      });
    } catch (error) {
      console.error("Error loading courses:", error);
    }
  }

  // Get courses from API, or fallback to COURSE_CONTENT.
  async function fetchCourseList() {
    const apiData = await apiGet(ENDPOINTS.courses?.list || "/courses");
    const apiCourses = listFrom(apiData, "courses");

    if (apiCourses.length > 0) {
      return apiCourses.map((apiCourse) => enrichCourse(apiCourse));
    }

    if (typeof COURSE_CONTENT === "undefined" || !COURSE_CONTENT) {
      return [];
    }

    return Object.keys(COURSE_CONTENT).map((contentKey) => {
      const contentCourse = COURSE_CONTENT[contentKey] || {};
      return enrichCourse({ id: contentKey, ...contentCourse });
    });
  }

  // Merge API values with static course content so cards always have full data.
  function enrichCourse(apiCourse) {
    const courseId = String(apiCourse?.id || "");
    const staticCourse = getStaticCourseById(courseId);
    const totalLessons = getCourseLessonCount(apiCourse, staticCourse);
    const moduleCount = getCourseModuleCount(apiCourse, staticCourse);
    const objectiveStats = getCourseObjectiveStats(staticCourse);

    return {
      ...apiCourse,
      id: courseId || String(staticCourse?.id || ""),
      title: apiCourse?.title || staticCourse?.title || "Course",
      description: apiCourse?.description || staticCourse?.description || "",
      difficulty: normalizeTrackName(apiCourse?.difficulty || staticCourse?.difficulty || "novice"),
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

  function getStaticCourseById(courseId) {
    if (typeof COURSE_CONTENT === "undefined" || !COURSE_CONTENT) return {};
    return COURSE_CONTENT[String(courseId)] || {};
  }

  function getCourseLessonCount(apiCourse, staticCourse) {
    const apiLessonCount = Number(apiCourse?.total_lessons);
    if (Number.isFinite(apiLessonCount) && apiLessonCount > 0) {
      return apiLessonCount;
    }

    let staticLessonCount = 0;
    if (Array.isArray(staticCourse?.units)) {
      staticCourse.units.forEach((unitEntry) => {
        staticLessonCount += Array.isArray(unitEntry?.lessons) ? unitEntry.lessons.length : 0;
      });
    }

    return staticLessonCount;
  }

  function getCourseModuleCount(apiCourse, staticCourse) {
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

  function getCourseObjectiveStats(staticCourse) {
    const staticUnits = Array.isArray(staticCourse?.units) ? staticCourse.units : [];
    if (!staticUnits.length) {
      return { totalObjectives: 0, moduleObjectiveCounts: [] };
    }

    const moduleObjectiveCounts = staticUnits.map((unitEntry) => countUnitObjectives(unitEntry));
    const totalObjectives = moduleObjectiveCounts.reduce((sum, count) => sum + count, 0);

    return {
      totalObjectives,
      moduleObjectiveCounts
    };
  }

  function countUnitObjectives(unitEntry) {
    let objectiveCount = 0;
    const lessons = Array.isArray(unitEntry?.lessons) ? unitEntry.lessons : [];

    lessons.forEach((lessonEntry) => {
      const explicitObjectives = Array.isArray(lessonEntry?.objectives) ? lessonEntry.objectives.length : 0;
      if (explicitObjectives > 0) {
        objectiveCount += explicitObjectives;
        return;
      }

      const blocks = Array.isArray(lessonEntry?.blocks) ? lessonEntry.blocks : [];
      const interactiveBlocks = blocks.filter((blockEntry) => {
        const type = String(blockEntry?.type || "").toLowerCase();
        return type === "check" || type === "activity" || type === "practice";
      }).length;
      objectiveCount += interactiveBlocks;
    });

    if (objectiveCount > 0) {
      return objectiveCount;
    }

    const sections = Array.isArray(unitEntry?.sections) ? unitEntry.sections : [];
    sections.forEach((sectionEntry) => {
      const items = Array.isArray(sectionEntry?.items) ? sectionEntry.items : [];
      items.forEach((itemEntry) => {
        const steps = Array.isArray(itemEntry?.steps) ? itemEntry.steps.length : 0;
        const challengeSteps = Array.isArray(itemEntry?.challenge?.steps)
          ? itemEntry.challenge.steps.length
          : 0;

        if (steps > 0 || challengeSteps > 0) {
          objectiveCount += Math.max(steps, challengeSteps);
          return;
        }

        objectiveCount += 1;
      });
    });

    return objectiveCount;
  }

  // Build a map so cards can read progress quickly by course id.
  async function fetchProgressMap(email) {
    const progressData = await apiGet(ENDPOINTS.courses?.userCourses || "/user-courses", { email });
    const progressList = listFrom(progressData, "courses");
    const progressByCourseId = {};

    progressList.forEach((progressEntry) => {
      progressByCourseId[String(progressEntry?.id)] = progressEntry;
    });

    return progressByCourseId;
  }

  function groupCoursesByTrack(courseList) {
    const grouped = { novice: [], intermediate: [], advanced: [] };

    courseList.forEach((courseItem) => {
      const trackName = normalizeTrackName(courseItem?.difficulty);
      grouped[trackName].push(courseItem);
    });

    return grouped;
  }

  function normalizeTrackName(rawTrackName) {
    const lowerTrackName = String(rawTrackName || "").trim().toLowerCase();
    return TRACK_NAMES.includes(lowerTrackName) ? lowerTrackName : "novice";
  }

  function readUnlockTierIndex(currentUser) {
    const unlockTier = normalizeTrackName(currentUser?.unlock_tier || currentUser?.start_level || "novice");
    return TRACK_NAMES.indexOf(unlockTier);
  }

  function readUserLevel(currentUser) {
    const numericLevel = Number(currentUser?.numeric_level);
    if (Number.isFinite(numericLevel) && numericLevel > 0) {
      return numericLevel;
    }

    const rawLevel = Number(currentUser?.level);
    if (Number.isFinite(rawLevel) && rawLevel > 0) {
      return rawLevel;
    }

    return 1;
  }

  function normalizeProgressPercent(rawPercent) {
    const numeric = Number(rawPercent);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  function getProgressMetrics(courseLike, staticCourse, progressPercent) {
    const safePercent = normalizeProgressPercent(progressPercent);
    const moduleCount = Math.max(1, Number(getCourseModuleCount(courseLike, staticCourse) || 1));
    const objectiveStats = getCourseObjectiveStats(staticCourse);
    const objectiveCount = Math.max(0, Number(courseLike?.objective_count || objectiveStats.totalObjectives || 0));
    const moduleObjectiveCounts = Array.isArray(courseLike?.module_objective_counts) && courseLike.module_objective_counts.length
      ? courseLike.module_objective_counts
      : objectiveStats.moduleObjectiveCounts;

    const totalLessons = Math.max(0, Number(courseLike?.total_lessons || getCourseLessonCount(courseLike, staticCourse) || 0));
    const completedLessons = Math.round((safePercent / 100) * totalLessons);
    const completedModules = Math.min(moduleCount, Math.round((safePercent / 100) * moduleCount));
    const completedObjectives = objectiveCount > 0
      ? Math.min(objectiveCount, Math.round((safePercent / 100) * objectiveCount))
      : 0;
    const remainingObjectives = Math.max(0, objectiveCount - completedObjectives);

    return {
      moduleCount,
      objectiveCount,
      moduleObjectiveCounts,
      totalLessons,
      completedLessons,
      completedModules,
      completedObjectives,
      remainingObjectives
    };
  }

  // Build one course card with lock/progress states.
  function createCourseCard(courseItem, progressByCourseId, userLevel, isTrackLocked, courseIndex = 0) {
    const cardElement = document.createElement("div");
    cardElement.className = "net-course-card";
    cardElement.setAttribute("data-difficulty", normalizeTrackName(courseItem?.difficulty));
    cardElement.style.setProperty("--course-card-delay", `${Math.min(Math.max(Number(courseIndex) || 0, 0), 10) * 70}ms`);

    const progress = progressByCourseId[String(courseItem.id)] || {};
    const progressPercent = normalizeProgressPercent(progress.progress_pct);
    const progressStatus = String(progress.status || "").toLowerCase();
    const staticCourse = getStaticCourseById(String(courseItem?.id || ""));
    const metrics = getProgressMetrics(courseItem, staticCourse, progressPercent);

    const requiredLevel = Number(courseItem?.required_level || 1);
    const isLocked = isTrackLocked || requiredLevel > Number(userLevel || 1);
    const isInProgress = progressStatus === "in-progress" || (progressPercent > 0 && progressPercent < 100);
    const isCompleted = progressStatus === "completed" || progressPercent >= 100;

    if (isLocked) {
      const lockMessage = getLockedCourseMessage(courseItem, requiredLevel, userLevel, isTrackLocked);
      cardElement.classList.add("locked");
      cardElement.setAttribute("data-lock-message", lockMessage);
      cardElement.setAttribute("title", lockMessage);
      cardElement.setAttribute("aria-label", lockMessage);
    }
    if (isInProgress) cardElement.classList.add("in-progress");

    const totalLessons = metrics.totalLessons;
    const xpReward = Number(courseItem?.xp_reward || 0);
    const estimatedTime = String(courseItem?.estimated_time || courseItem?.estimatedTime || "");
    const moduleObjectiveChips = buildModuleObjectiveChips(metrics.moduleObjectiveCounts);

    cardElement.innerHTML = `
      <div class="net-course-header">
        <div class="net-course-icon">${getTrackIcon(courseItem?.difficulty)}</div>
        <div class="net-course-meta">
          <div class="net-course-category">${escapeHtml(courseItem?.category || "Core")}</div>
          <div class="net-course-title">${escapeHtml(courseItem?.title || "Course")}</div>
        </div>
      </div>

      <div class="net-course-stats-row">
        <span class="net-course-stat-pill">
          <i class="bi bi-file-text"></i>${totalLessons} ${totalLessons === 1 ? "lesson" : "lessons"}
        </span>
        <span class="net-course-stat-pill">
          <i class="bi bi-diagram-3"></i>${metrics.moduleCount} ${metrics.moduleCount === 1 ? "module" : "modules"}
        </span>
        <span class="net-course-stat-pill">
          <i class="bi bi-check2-square"></i>${metrics.objectiveCount} ${metrics.objectiveCount === 1 ? "objective" : "objectives"}
        </span>
        ${estimatedTime ? `
          <span class="net-course-stat-pill">
            <i class="bi bi-clock"></i>${escapeHtml(estimatedTime)}
          </span>
        ` : ""}
      </div>

      ${moduleObjectiveChips ? `<div class="net-course-module-breakdown">${moduleObjectiveChips}</div>` : ""}

      <div class="net-course-desc">${escapeHtml(courseItem?.description || "")}</div>

      ${xpReward > 0 ? `
        <div class="net-course-xp">
          <i class="bi bi-lightning-charge-fill"></i>
          <span>${xpReward} XP</span>
        </div>
      ` : ""}

      <div class="net-course-footer">
        <div class="net-course-progress-block">
          <div class="net-course-progress-meta">
            <span class="net-course-progress-label">${progressPercent}% Complete</span>
            <span class="net-course-progress-label">${metrics.completedModules}/${metrics.moduleCount} modules</span>
          </div>
          <div class="net-course-bar net-course-bar--wide">
            <div class="net-course-bar-fill" style="width: ${progressPercent}%"></div>
          </div>
          ${metrics.objectiveCount > 0 ? `
            <div class="net-course-progress-sub">
              ${metrics.completedObjectives}/${metrics.objectiveCount} objectives complete • ${metrics.remainingObjectives} left
            </div>
          ` : ""}
        </div>

        <button class="net-course-cta ${isInProgress ? "btn-continue" : isCompleted ? "btn-review" : isLocked ? "btn-locked" : "btn-start"}"
                data-course-id="${escapeHtml(String(courseItem.id || ""))}"
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

    if (!isLocked) {
      const courseUrl = `course.html?id=${encodeURIComponent(String(courseItem.id || ""))}`;
      const actionButton = cardElement.querySelector(".net-course-cta");

      if (actionButton) {
        actionButton.addEventListener("click", () => {
          window.location.href = courseUrl;
        });
      }

      cardElement.style.cursor = "pointer";
      cardElement.addEventListener("click", (event) => {
        if (event.target.closest(".net-course-cta")) return;
        window.location.href = courseUrl;
      });
    }

    return cardElement;
  }

  function getTrackIcon(rawDifficulty) {
    const difficulty = normalizeTrackName(rawDifficulty);
    if (difficulty === "advanced") return '<i class="bi bi-star-fill"></i>';
    if (difficulty === "intermediate") return '<i class="bi bi-lightning-fill"></i>';
    return '<i class="bi bi-gem"></i>';
  }

  function buildModuleObjectiveChips(moduleObjectiveCounts) {
    const modules = Array.isArray(moduleObjectiveCounts)
      ? moduleObjectiveCounts
        .map((value, index) => ({
          moduleNumber: index + 1,
          objectiveCount: Math.max(0, Number(value) || 0)
        }))
        .filter((moduleEntry) => moduleEntry.objectiveCount > 0)
      : [];

    if (!modules.length) return "";

    const chips = modules.slice(0, 3).map((moduleEntry) => (
      `<span class="net-module-objective-chip" title="Module ${moduleEntry.moduleNumber}: ${moduleEntry.objectiveCount} objectives">M${moduleEntry.moduleNumber}: ${moduleEntry.objectiveCount}</span>`
    ));

    if (modules.length > 3) {
      chips.push(`<span class="net-module-objective-chip is-more">+${modules.length - 3} more</span>`);
    }

    return chips.join("");
  }

  function getLockedCourseMessage(courseItem, requiredLevel, userLevel, isTrackLocked) {
    const difficulty = normalizeTrackName(courseItem?.difficulty);
    if (difficulty === "intermediate") {
      return "Upgrade your learning path to access intermediate courses.";
    }
    if (difficulty === "advanced") {
      return "Upgrade your learning path to access advanced courses.";
    }
    if (isTrackLocked) {
      return "Upgrade your learning path to access this course.";
    }
    const safeLevel = Math.max(1, Number(requiredLevel || 1));
    const safeUserLevel = Math.max(1, Number(userLevel || 1));
    if (safeLevel > safeUserLevel) {
      return `Reach Level ${safeLevel} to unlock this course.`;
    }
    return "This course is currently locked.";
  }

  // Load and show the small "Your Learning Progress" cards.
  async function loadAndRenderProgress(currentUser) {
    const container = document.getElementById("myProgressContainer");
    const placeholder = document.getElementById("noProgressPlaceholder");
    if (!container || !placeholder) return;

    try {
      const responseData = await apiGet(ENDPOINTS.courses?.userCourses || "/user-courses", {
        email: currentUser.email
      });
      const userCourses = listFrom(responseData, "courses");

      const startedCourses = userCourses.filter((userCourse) => {
        const progressPercent = Number(userCourse?.progress_pct || 0);
        const status = String(userCourse?.status || "").toLowerCase();
        return progressPercent > 0 || status === "completed";
      });

      if (startedCourses.length === 0) {
        container.innerHTML = "";
        placeholder.classList.remove("d-none");
        return;
      }

      container.innerHTML = "";
      placeholder.classList.add("d-none");

      startedCourses.slice(0, 6).forEach((userCourse, index) => {
        const progressPercent = normalizeProgressPercent(userCourse?.progress_pct);
        const staticCourse = getStaticCourseById(String(userCourse?.id || ""));
        const metrics = getProgressMetrics(userCourse, staticCourse, progressPercent);
        const moduleChips = buildModuleObjectiveChips(metrics.moduleObjectiveCounts);
        const status = resolveProgressStatus(progressPercent, userCourse?.status);

        const columnElement = document.createElement("div");
        columnElement.className = "col-md-6 col-xl-4 mb-3";
        columnElement.style.setProperty("--progress-card-delay", `${Math.min(Math.max(index, 0), 10) * 80}ms`);
        columnElement.innerHTML = `
          <article class="net-progress-course-card">
            <div class="net-progress-course-head">
              <h6 class="net-progress-course-title">${escapeHtml(userCourse?.title || "Course")}</h6>
              <span class="net-progress-course-status ${status.className}">${status.label}</span>
            </div>

            <div class="net-progress-course-metrics">
              <span><i class="bi bi-diagram-3"></i>${metrics.completedModules}/${metrics.moduleCount} modules</span>
              ${metrics.objectiveCount > 0
                ? `<span><i class="bi bi-check2-square"></i>${metrics.completedObjectives}/${metrics.objectiveCount} objectives</span>`
                : `<span><i class="bi bi-file-text"></i>${metrics.completedLessons}/${metrics.totalLessons} lessons</span>`
              }
            </div>

            ${moduleChips ? `<div class="net-progress-course-breakdown">${moduleChips}</div>` : ""}

            <div class="net-progress-course-track" role="progressbar" aria-label="Course progress">
              <span class="net-progress-course-track-fill" style="width: ${progressPercent}%"></span>
            </div>

            <div class="net-progress-course-caption">
              ${progressPercent}% complete
              ${metrics.objectiveCount > 0
                ? ` • ${metrics.remainingObjectives} objectives left`
                : ` • ${Math.max(0, metrics.totalLessons - metrics.completedLessons)} lessons left`
              }
            </div>

            <a href="course.html?id=${encodeURIComponent(String(userCourse?.id || ""))}" class="net-progress-course-btn">
              <i class="bi bi-play-fill"></i>Continue
            </a>
          </article>
        `;

        container.appendChild(columnElement);
      });
    } catch (error) {
      console.error("Error loading progress:", error);
      placeholder.classList.remove("d-none");
    }
  }

  function resolveProgressStatus(progressPercent, statusValue) {
    const status = String(statusValue || "").toLowerCase();
    const safePercent = Math.max(0, Math.min(100, Number(progressPercent) || 0));

    if (status === "completed" || safePercent >= 100) {
      return { label: "Completed", className: "is-complete" };
    }
    if (safePercent >= 70) {
      return { label: "On Track", className: "is-on-track" };
    }
    if (safePercent > 0) {
      return { label: "In Progress", className: "is-progress" };
    }
    return { label: "Not Started", className: "is-idle" };
  }

  // Wire sidebar, dropdown, and logout actions.
  function wirePageChrome(currentUser) {
    wireSidebar();
    wireUserDropdown();
    fillIdentity(currentUser);
    wireLogoutButtons();
  }

  function wireLogoutButtons() {
    const topLogoutButton = document.getElementById("topLogoutBtn");
    const sideLogoutButton = document.getElementById("sideLogoutBtn");

    const logout = () => {
      localStorage.removeItem("netology_user");
      localStorage.removeItem("user");
      localStorage.removeItem("netology_token");
      window.location.href = "index.html";
    };

    if (topLogoutButton) topLogoutButton.addEventListener("click", logout);
    if (sideLogoutButton) sideLogoutButton.addEventListener("click", logout);
  }

  function wireSidebar() {
    const openButton = document.getElementById("openSidebarBtn");
    const closeButton = document.getElementById("closeSidebarBtn");
    const sidebar = document.getElementById("slideSidebar");
    const backdrop = document.getElementById("sideBackdrop");

    const openSidebar = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
      sidebar.setAttribute("aria-hidden", "false");
      backdrop.setAttribute("aria-hidden", "false");
    };

    const closeSidebar = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
      sidebar.setAttribute("aria-hidden", "true");
      backdrop.setAttribute("aria-hidden", "true");
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

  function wireUserDropdown() {
    const button = document.getElementById("userBtn");
    const dropdown = document.getElementById("userDropdown");
    if (!button || !dropdown) return;

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = dropdown.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (event) => {
      if (dropdown.contains(event.target) || button.contains(event.target)) return;
      dropdown.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    });
  }

  function fillIdentity(currentUser) {
    const fullName = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ")
      || currentUser?.username
      || "Student";
    const email = String(currentUser?.email || "");
    const avatarInitial = (fullName.charAt(0) || "S").toUpperCase();
    const xp = Number(currentUser?.xp || 0);
    const level = levelFromXP(xp);

    setTextById("topAvatar", avatarInitial);
    setTextById("ddName", fullName);
    setTextById("ddEmail", email);

    setTextById("sideAvatar", avatarInitial);
    setTextById("sideUserName", fullName);
    setTextById("sideUserEmail", email);
    setTextById("sideLevelBadge", `Lv ${level}`);
  }

  function setTextById(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = text;
  }

  function levelFromXP(totalXp) {
    return XP?.levelFromTotalXp ? XP.levelFromTotalXp(totalXp) : 1;
  }

  function getCurrentUser() {
    return parseJson(localStorage.getItem("netology_user"))
      || parseJson(localStorage.getItem("user"))
      || null;
  }

  function parseJson(rawValue) {
    try {
      return rawValue ? JSON.parse(rawValue) : null;
    } catch {
      return null;
    }
  }

  // Escape text before inserting into HTML templates.
  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value || "");
    return div.innerHTML;
  }
})();
