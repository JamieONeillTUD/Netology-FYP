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
  const BASE_LEVEL_XP = 100;
  const ENDPOINTS = window.ENDPOINTS || {};

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
    const filterButtons = document.querySelectorAll("[data-path]");
    if (!filterButtons.length) return;

    filterButtons.forEach((filterButton) => {
      filterButton.addEventListener("click", (event) => {
        event.preventDefault();
        const selectedPath = String(filterButton.dataset.path || "all").toLowerCase();

        filterButtons.forEach((buttonElement) => {
          buttonElement.classList.remove("active", "btn-teal");
          buttonElement.classList.add("btn-outline-teal");
          buttonElement.setAttribute("aria-selected", "false");
        });

        filterButton.classList.add("active", "btn-teal");
        filterButton.classList.remove("btn-outline-teal");
        filterButton.setAttribute("aria-selected", "true");

        document.querySelectorAll(".net-course-section").forEach((sectionElement) => {
          if (selectedPath === "all") {
            sectionElement.style.display = "block";
            return;
          }

          const sectionTrack = String(sectionElement.dataset.difficulty || "").toLowerCase();
          sectionElement.style.display = sectionTrack === selectedPath ? "block" : "none";
        });
      });
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

        trackCourses.forEach((courseItem) => {
          const cardElement = createCourseCard(courseItem, progressByCourseId, userLevel, isTrackLocked);
          gridElement.appendChild(cardElement);
        });

        if (isTrackLocked && trackCourses.length > 0) {
          const lockNotice = document.createElement("div");
          lockNotice.className = "net-track-locked-notice text-muted small px-2 pb-2";
          lockNotice.innerHTML = `<i class="bi bi-lock me-1"></i>Upgrade your learning path to access ${trackName} courses.`;
          gridElement.prepend(lockNotice);
        }
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

    return {
      ...apiCourse,
      id: courseId || String(staticCourse?.id || ""),
      title: apiCourse?.title || staticCourse?.title || "Course",
      description: apiCourse?.description || staticCourse?.description || "",
      difficulty: normalizeTrackName(apiCourse?.difficulty || staticCourse?.difficulty || "novice"),
      category: apiCourse?.category || staticCourse?.category || "Core",
      required_level: Number(apiCourse?.required_level || staticCourse?.required_level || 1),
      xp_reward: Number(apiCourse?.xp_reward || staticCourse?.xpReward || staticCourse?.totalXP || 0),
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

  // Build one course card with lock/progress states.
  function createCourseCard(courseItem, progressByCourseId, userLevel, isTrackLocked) {
    const cardElement = document.createElement("div");
    cardElement.className = "net-course-card";
    cardElement.setAttribute("data-difficulty", normalizeTrackName(courseItem?.difficulty));

    const progress = progressByCourseId[String(courseItem.id)] || {};
    const progressPercent = Number.isFinite(Number(progress.progress_pct)) ? Math.round(Number(progress.progress_pct)) : 0;
    const progressStatus = String(progress.status || "").toLowerCase();

    const requiredLevel = Number(courseItem?.required_level || 1);
    const isLocked = isTrackLocked || requiredLevel > Number(userLevel || 1);
    const isInProgress = progressStatus === "in-progress" || (progressPercent > 0 && progressPercent < 100);
    const isCompleted = progressStatus === "completed" || progressPercent >= 100;

    if (isLocked) cardElement.classList.add("locked");
    if (isInProgress) cardElement.classList.add("in-progress");

    const totalLessons = Number(courseItem?.total_lessons || 0);
    const xpReward = Number(courseItem?.xp_reward || 0);
    const estimatedTime = String(courseItem?.estimated_time || courseItem?.estimatedTime || "");

    cardElement.innerHTML = `
      <div class="net-course-header">
        <div class="net-course-icon">${getTrackIcon(courseItem?.difficulty)}</div>
        <div class="net-course-meta">
          <div class="net-course-category">${escapeHtml(courseItem?.category || "Core")}</div>
          <div class="net-course-title">${escapeHtml(courseItem?.title || "Course")}</div>
        </div>
      </div>

      <div class="net-course-lessons">
        <i class="bi bi-file-text"></i>
        <span>${totalLessons} ${totalLessons === 1 ? "lesson" : "lessons"}</span>
        ${estimatedTime ? `<span class="ms-2 text-muted"><i class="bi bi-clock me-1"></i>${escapeHtml(estimatedTime)}</span>` : ""}
      </div>

      <div class="net-course-desc">${escapeHtml(courseItem?.description || "")}</div>

      ${xpReward > 0 ? `
        <div class="net-course-xp">
          <i class="bi bi-lightning-charge-fill"></i>
          <span>${xpReward} XP</span>
        </div>
      ` : ""}

      <div class="net-course-footer">
        ${(isInProgress || isCompleted) ? `
          <div class="net-course-progress">
            <div class="net-course-bar">
              <div class="net-course-bar-fill" style="width: ${progressPercent}%"></div>
            </div>
            <span>${progressPercent}% Complete</span>
          </div>
        ` : ""}
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
        placeholder.classList.remove("d-none");
        return;
      }

      container.innerHTML = "";
      placeholder.classList.add("d-none");

      startedCourses.slice(0, 4).forEach((userCourse) => {
        const progressPercent = Number.isFinite(Number(userCourse?.progress_pct))
          ? Number(userCourse.progress_pct)
          : 0;
        const totalLessons = Math.max(Number(userCourse?.total_lessons || 0), 0);
        const completedLessons = Math.round((progressPercent / 100) * totalLessons);

        const columnElement = document.createElement("div");
        columnElement.className = "col-md-6 col-lg-3 mb-3";
        columnElement.innerHTML = `
          <div class="card border-0 h-100 shadow-sm">
            <div class="card-body">
              <h6 class="fw-bold mb-2">${escapeHtml(userCourse?.title || "Course")}</h6>
              <div class="progress mb-2" style="height: 6px;">
                <div class="progress-bar net-progress-fill" style="width: ${progressPercent}%"></div>
              </div>
              <div class="small text-muted mb-3">${completedLessons}/${totalLessons} lessons</div>
              <a href="course.html?id=${encodeURIComponent(String(userCourse?.id || ""))}" class="btn btn-sm btn-teal w-100">
                <i class="bi bi-play-fill me-1"></i>Continue
              </a>
            </div>
          </div>
        `;

        container.appendChild(columnElement);
      });
    } catch (error) {
      console.error("Error loading progress:", error);
      placeholder.classList.remove("d-none");
    }
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
    const xp = Math.max(0, Number(totalXp) || 0);
    const xpFactor = xp / BASE_LEVEL_XP;
    const computedLevel = Math.floor((1 + Math.sqrt(1 + 8 * xpFactor)) / 2);
    return Math.max(1, computedLevel);
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
