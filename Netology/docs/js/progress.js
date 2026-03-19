// progress.js – progress page: course/lesson/quiz/challenge tabs, charts, and completions

(() => {
  "use strict";

  // Core constants used across the page.
  const ENDPOINTS = window.ENDPOINTS || {};
  const XP = window.NetologyXP || null;
  const PROGRESS_TYPE_STORAGE_KEY = "netology_progress_type";
  const PROGRESS_TYPE_DEFAULT = "courses";
  const PROGRESS_TYPE_ALIASES = {
    courses: "courses",
    modules: "modules",
    lessons: "lessons",
    quizzes: "quizzes",
    tutorials: "tutorials",
    "sandbox-tutorials": "tutorials",
    challenges: "challenges",
    "sandbox-challenges": "challenges"
  };

  // Cache course completion lookups so repeated renders stay fast.
  const completionCache = new Map();
  const completionPromiseCache = new Map();

  // Keep loaded data in memory while the page is open.
  const progressState = {
    currentEmail: null,
    userCourses: null,
    courseCompletionsMap: null,
    courseContentMap: null,
    navCounts: null
  };

  // Labels and empty-state text for each progress tab.
  const SECTION_CONFIG = {
    courses: {
      title: "Courses",
      subtitle: "Active and completed courses at a glance.",
      emptyTitle: "No courses yet",
      emptyText: "Browse and enroll in courses to get started.",
      icon: "bi-journal-bookmark",
      ctaText: "Browse courses",
      ctaIcon: "bi-journal-bookmark",
      ctaLink: "courses.html"
    },
    modules: {
      title: "Modules",
      subtitle: "Track module progress across your courses.",
      emptyTitle: "No module progress",
      emptyText: "Start a course to unlock modules.",
      icon: "bi-layers",
      ctaText: "View courses",
      ctaIcon: "bi-layers",
      ctaLink: "courses.html"
    },
    lessons: {
      title: "Lessons",
      subtitle: "Lessons grouped by course, split by status.",
      emptyTitle: "No lessons yet",
      emptyText: "Complete your first lesson to see it here.",
      icon: "bi-journal-check",
      ctaText: "Start learning",
      ctaIcon: "bi-journal-check",
      ctaLink: "courses.html"
    },
    quizzes: {
      title: "Quizzes",
      subtitle: "Quiz progress, split into in-progress and completed.",
      emptyTitle: "No quizzes yet",
      emptyText: "Take a quiz to track your results.",
      icon: "bi-patch-question",
      ctaText: "Browse courses",
      ctaIcon: "bi-patch-question",
      ctaLink: "courses.html"
    },
    tutorials: {
      title: "Sandbox Tutorials",
      subtitle: "Sandbox tutorials and checklist progress.",
      emptyTitle: "No tutorials yet",
      emptyText: "Launch a sandbox tutorial to track it here.",
      icon: "bi-diagram-3",
      ctaText: "Open sandbox",
      ctaIcon: "bi-diagram-3",
      ctaLink: "sandbox.html"
    },
    challenges: {
      title: "Sandbox Challenges",
      subtitle: "Challenge progress split by status.",
      emptyTitle: "No challenges yet",
      emptyText: "Complete a sandbox challenge to see it here.",
      icon: "bi-flag",
      ctaText: "View challenges",
      ctaIcon: "bi-flag",
      ctaLink: "sandbox.html"
    }
  };

  // Shared GET helper.
  const apiGet = typeof window.apiGet === "function"
    ? window.apiGet
    : async (path, queryParams = {}) => {
        const baseUrl = String(window.API_BASE || "").trim();
        const requestUrl = baseUrl
          ? new URL(baseUrl.replace(/\/$/, "") + path)
          : new URL(path, window.location.origin);

        Object.entries(queryParams || {}).forEach(([paramName, paramValue]) => {
          if (paramValue === undefined || paramValue === null || paramValue === "") return;
          requestUrl.searchParams.set(paramName, String(paramValue));
        });

        const response = await fetch(requestUrl.toString());
        return response.json();
      };

  // Shared helper that safely reads list arrays from varying API response shapes.
  const getListFromResponse = window.API_HELPERS?.list || ((responseData, ...candidateKeys) => {
    if (Array.isArray(responseData)) return responseData;

    for (const candidateKey of candidateKeys) {
      if (Array.isArray(responseData?.[candidateKey])) {
        return responseData[candidateKey];
      }
    }

    return [];
  });

  document.addEventListener("DOMContentLoaded", () => {
    initializeProgressPage().catch((error) => {
      console.error("Progress page init failed:", error);
    });
  });

  // Main startup flow.
  async function initializeProgressPage() {
    const currentUser = getCurrentUser();
    if (!currentUser?.email) {
      window.location.href = "login.html";
      return;
    }

    setupPageChrome(currentUser);
    setupCategoryNavigation();

    await loadHeroStats(currentUser);

    const selectedType = getSelectedProgressType();
    setActiveNavigationButton(selectedType);
    saveSelectedProgressType(selectedType);
    await loadProgressSection(selectedType, currentUser);

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    if (typeof window.maybeStartOnboardingTour === "function") {
      window.maybeStartOnboardingTour("progress", currentUser.email);
    }
  }

  // Load data and render one selected section.
  async function loadProgressSection(type, currentUser) {
    const progressListElement = getElementById("progressList");
    const emptyStateElement = getElementById("progressEmpty");
    if (!progressListElement || !emptyStateElement || !currentUser?.email) return;

    renderLoadingState(progressListElement);
    emptyStateElement.classList.add("d-none");

    await ensureProgressDataLoaded(currentUser);

    const totals = await renderSection(
      progressListElement,
      progressState.userCourses,
      progressState.courseContentMap,
      currentUser.email,
      progressState.courseCompletionsMap,
      type
    );

    if (!totals.inProgressTotal && !totals.completedTotal) {
      renderEmptyState(type);
    }
  }

  // Load and cache common data needed for all section tabs.
  async function ensureProgressDataLoaded(currentUser) {
    const userEmail = currentUser.email;
    const canReuseCache =
      progressState.currentEmail === userEmail &&
      Array.isArray(progressState.userCourses) &&
      progressState.courseCompletionsMap instanceof Map &&
      progressState.courseContentMap;

    if (canReuseCache) return;

    progressState.currentEmail = userEmail;
    progressState.courseContentMap = getCourseContent();
    progressState.userCourses = await fetchUserCourses(userEmail);
    progressState.courseCompletionsMap = await buildCourseCompletionsMap(userEmail, progressState.userCourses);
    progressState.navCounts = await buildNavigationCounts(
      progressState.userCourses,
      progressState.courseContentMap,
      userEmail,
      progressState.courseCompletionsMap
    );

    updateNavigationCounts(progressState.navCounts);
  }

  // Wire top category buttons.
  function setupCategoryNavigation() {
    const navButtons = document.querySelectorAll(".net-progress-nav-btn");

    navButtons.forEach((buttonElement) => {
      buttonElement.addEventListener("click", async (event) => {
        event.preventDefault();

        const rawType = buttonElement.getAttribute("data-type");
        const targetType = normalizeProgressType(rawType, null);
        if (!targetType) return;

        setActiveNavigationButton(targetType);
        saveSelectedProgressType(targetType);

        const currentUser = getCurrentUser();
        if (currentUser?.email) {
          await loadProgressSection(targetType, currentUser);
        }
      });
    });
  }

  function setActiveNavigationButton(type) {
    document.querySelectorAll(".net-progress-nav-btn").forEach((buttonElement) => {
      const isActive = buttonElement.getAttribute("data-type") === type;
      buttonElement.classList.toggle("is-active", isActive);
      buttonElement.setAttribute("aria-selected", String(isActive));
    });
  }

  function saveSelectedProgressType(type) {
    const normalizedType = normalizeProgressType(type, PROGRESS_TYPE_DEFAULT);
    localStorage.setItem(PROGRESS_TYPE_STORAGE_KEY, normalizedType);
  }

  // Map a raw tab value to the supported tab keys.
  function normalizeProgressType(value, fallbackValue = PROGRESS_TYPE_DEFAULT) {
    const normalizedValue = String(value || "").trim().toLowerCase();
    if (!normalizedValue) return fallbackValue;
    return PROGRESS_TYPE_ALIASES[normalizedValue] || fallbackValue;
  }

  // Read selected type from URL first, then localStorage.
  function getSelectedProgressType() {
    const queryParams = new URLSearchParams(window.location.search);
    const typeFromQuery = normalizeProgressType(queryParams.get("type"), null);
    if (typeFromQuery) return typeFromQuery;

    const typeFromStorage = normalizeProgressType(localStorage.getItem(PROGRESS_TYPE_STORAGE_KEY), null);
    return typeFromStorage || PROGRESS_TYPE_DEFAULT;
  }

  // Convert nav button type into the count shown in its badge.
  function getNavigationCountForType(buttonType, counts) {
    if (buttonType === "courses") {
      return (counts["in-progress"] || 0) + (counts["completed-courses"] || 0);
    }

    if (buttonType === "modules") {
      return (counts["modules-in-progress"] || 0) + (counts["modules-completed"] || 0);
    }

    return counts[buttonType] || 0;
  }

  // Update small numeric badges on each nav button.
  function updateNavigationCounts(counts) {
    document.querySelectorAll(".net-progress-nav-btn").forEach((buttonElement) => {
      const buttonType = buttonElement.getAttribute("data-type");
      if (!buttonType || !counts) return;
      const countValue = getNavigationCountForType(buttonType, counts);

      let badgeElement = buttonElement.querySelector(".net-progress-nav-count");
      if (!badgeElement) {
        badgeElement = document.createElement("span");
        badgeElement.className = "net-progress-nav-count";
        buttonElement.appendChild(badgeElement);
      }

      animateCount(badgeElement, countValue);
      badgeElement.classList.remove("is-animated");
      void badgeElement.offsetWidth;
      badgeElement.classList.add("is-animated");
    });
  }

  // Render page-level empty state card.
  function renderEmptyState(type) {
    const emptyStateElement = getElementById("progressEmpty");
    if (!emptyStateElement) return;

    const config = SECTION_CONFIG[type] || SECTION_CONFIG.courses;
    emptyStateElement.classList.remove("d-none");

    const iconElement = emptyStateElement.querySelector("i");
    if (iconElement && config.icon) {
      iconElement.className = `bi ${config.icon}`;
    }

    const titleElement = getElementById("progressEmptyTitle");
    if (titleElement && config.emptyTitle) {
      titleElement.textContent = config.emptyTitle;
    }

    const textElement = getElementById("progressEmptyText");
    if (textElement && config.emptyText) {
      textElement.textContent = config.emptyText;
    }

    const actionElement = getElementById("progressEmptyCta");
    if (actionElement) {
      const iconName = config.ctaIcon || "bi-journal-bookmark";
      const buttonLabel = config.ctaText || "Browse courses";
      actionElement.innerHTML = `<i class="bi ${iconName} me-2"></i>${buttonLabel}`;
      actionElement.setAttribute("href", config.ctaLink || "courses.html");
    }
  }

  // Load quick stats shown at the top of the page.
  async function loadHeroStats(currentUser) {
    try {
      const [summaryData, streakData, achievementsData] = await Promise.all([
        apiGet(ENDPOINTS.courses?.userProgressSummary || "/user-progress-summary", { email: currentUser.email }).catch(() => null),
        apiGet(ENDPOINTS.progress?.userStreaks || "/api/user/streaks", { user_email: currentUser.email }).catch(() => null),
        apiGet(ENDPOINTS.achievements?.list || "/api/user/achievements", { user_email: currentUser.email }).catch(() => null)
      ]);

      setHeroValue("heroCoursesActive", summaryData?.success ? summaryData.in_progress || 0 : 0);
      setHeroValue("heroLessons", summaryData?.success ? summaryData.lessons_done || 0 : 0);
      setHeroValue("heroStreak", streakData?.success ? streakData.current_streak || 0 : 0);
      setHeroValue("heroAchievements", achievementsData?.success ? achievementsData.total_unlocked || 0 : 0);
    } catch (error) {
      console.error("Failed to load hero stats:", error);
    }
  }

  function setHeroValue(elementId, value) {
    const element = getElementById(elementId);
    if (element) {
      element.textContent = String(value);
    }
  }

  // Fetch courses for the logged-in user.
  async function fetchUserCourses(email) {
    if (!email) return [];

    try {
      const responseData = await apiGet(ENDPOINTS.courses?.userCourses || "/user-courses", { email });
      const courseList = getListFromResponse(responseData, "courses");

      if (responseData?.success && Array.isArray(courseList)) {
        return courseList;
      }
    } catch {
      // Fall back to course content map below.
    }

    const courseContent = getCourseContent();

    return Object.keys(courseContent).map((courseId) => ({
      id: courseId,
      title: courseContent[courseId]?.title || `Course ${courseId}`,
      description: courseContent[courseId]?.description || "",
      difficulty: courseContent[courseId]?.difficulty || "novice",
      estimated_time: courseContent[courseId]?.estimatedTime || "",
      progress_pct: 0,
      status: "not-started"
    }));
  }

  // Read list of started courses from local storage.
  function getStartedCourseMap(email) {
    if (!email) return new Map();

    const rawData = localStorage.getItem(`netology_started_courses:${email}`);
    const startedList = parseJsonSafe(rawData, []) || [];
    const startedMap = new Map();

    startedList.forEach((entry) => {
      if (!entry) return;

      const courseId = String(entry.id);
      const lessonNumber = Number(entry.lastLesson || 0);
      if (courseId && lessonNumber > 0) {
        startedMap.set(courseId, lessonNumber);
      }
    });

    return startedMap;
  }

  // Build the values displayed in top category badges.
  async function buildNavigationCounts(courseList, courseContent, email, completionsMap) {
    const counts = {
      "in-progress": 0,
      "completed-courses": 0,
      "modules-in-progress": 0,
      "modules-completed": 0,
      lessons: 0,
      quizzes: 0,
      challenges: 0,
      tutorials: 0
    };

    if (!Array.isArray(courseList) || !courseList.length) {
      counts.tutorials = countTutorialEntries(email);
      return counts;
    }

    const startedCourseMap = getStartedCourseMap(email);

    const summaryPerCourse = await Promise.all(
      courseList.map(async (course) => {
        const courseId = String(course.id || "");
        const resolvedCourseContent = resolveCourseContent(course, courseContent);

        const requiredItems = countRequiredItems(resolvedCourseContent);
        const completions = completionsMap?.get(courseId) || await fetchCourseCompletions(email, courseId);

        const completedLessons = completions.lesson.size;
        const completedQuizzes = completions.quiz.size;
        const completedChallenges = completions.challenge.size;
        const completedTotal = completedLessons + completedQuizzes + completedChallenges;

        let status = "not-started";
        if (requiredItems > 0 && completedTotal >= requiredItems) {
          status = "completed";
        } else if (completedTotal > 0) {
          status = "in-progress";
        }

        let modulesInProgress = 0;
        let modulesCompleted = 0;

        if (resolvedCourseContent && Array.isArray(resolvedCourseContent.units)) {
          const modules = buildModulesFromCourse(resolvedCourseContent);
          const courseHasStarted = completedTotal > 0 || startedCourseMap.has(courseId);

          modules.forEach((module) => {
            const moduleProgress = computeModuleProgress(module, completions);
            if (moduleProgress.completed) {
              modulesCompleted += 1;
            } else if (courseHasStarted) {
              modulesInProgress += 1;
            }
          });
        }

        return {
          status,
          completedLessons,
          completedQuizzes,
          completedChallenges,
          modulesInProgress,
          modulesCompleted
        };
      })
    );

    summaryPerCourse.forEach((courseSummary) => {
      counts.lessons += courseSummary.completedLessons;
      counts.quizzes += courseSummary.completedQuizzes;
      counts.challenges += courseSummary.completedChallenges;
      counts["modules-in-progress"] += courseSummary.modulesInProgress;
      counts["modules-completed"] += courseSummary.modulesCompleted;

      if (courseSummary.status === "completed") counts["completed-courses"] += 1;
      if (courseSummary.status === "in-progress") counts["in-progress"] += 1;
    });

    counts.tutorials = countTutorialEntries(email);
    return counts;
  }

  // Count stored tutorial entries used by the Tutorials tab.
  function countTutorialEntries(email) {
    if (!email) return 0;

    const storagePrefix = `netology_tutorial_progress:${email}:`;
    let total = 0;

    Object.keys(localStorage).forEach((storageKey) => {
      if (!storageKey.startsWith(storagePrefix)) return;

      const keyParts = storageKey.replace(storagePrefix, "").split(":");
      const courseId = keyParts[0];
      const lessonNumber = Number(keyParts[1] || 0);

      if (courseId && lessonNumber > 0) {
        total += 1;
      }
    });

    return total;
  }

  // Render selected tab content.
  async function renderSection(progressListElement, courseList, courseContent, email, completionsMap, type) {
    const totals = { inProgressTotal: 0, completedTotal: 0 };
    const startedCourseMap = getStartedCourseMap(email);

    progressListElement.replaceChildren();

    const sectionConfig = SECTION_CONFIG[type] || SECTION_CONFIG.courses;
    const sectionElements = buildProgressSection(type, sectionConfig);
    progressListElement.appendChild(sectionElements.wrap);

    if (type === "courses") {
      const coursesWithProgress = await buildCourseProgressList(courseList, courseContent, email, completionsMap);
      const inProgressCourses = coursesWithProgress.filter((courseItem) => courseItem.status === "in-progress");
      const completedCourses = coursesWithProgress.filter((courseItem) => courseItem.status === "completed");

      const inProgressXp = inProgressCourses.reduce((sum, courseItem) => sum + Number(courseItem.earnedXp || 0), 0);
      const completedXp = completedCourses.reduce((sum, courseItem) => sum + Number(courseItem.earnedXp || 0), 0);

      totals.inProgressTotal = inProgressCourses.length;
      totals.completedTotal = completedCourses.length;

      if (totals.inProgressTotal || totals.completedTotal) {
        renderCourseSplit(
          inProgressCourses,
          completedCourses,
          sectionElements.body,
          startedCourseMap,
          { inProgressXp, completedXp }
        );
      }

      return totals;
    }

    if (type === "modules") {
      const moduleGroups = await buildModuleSplitGroups(
        courseList,
        courseContent,
        email,
        startedCourseMap,
        completionsMap
      );

      totals.inProgressTotal = countGroupItems(moduleGroups.inProgressGroups);
      totals.completedTotal = countGroupItems(moduleGroups.completedGroups);

      if (totals.inProgressTotal || totals.completedTotal) {
        renderSplitGroups(moduleGroups.inProgressGroups, moduleGroups.completedGroups, sectionElements.body, type);
      }

      return totals;
    }

    const typeGroups = await buildTypeSplitGroups(
      type,
      courseList,
      courseContent,
      email,
      startedCourseMap,
      completionsMap
    );

    totals.inProgressTotal = countGroupItems(typeGroups.inProgressGroups);
    totals.completedTotal = countGroupItems(typeGroups.completedGroups);

    if (totals.inProgressTotal || totals.completedTotal) {
      renderSplitGroups(typeGroups.inProgressGroups, typeGroups.completedGroups, sectionElements.body, type);
    }

    return totals;
  }

  // Build one top-level section wrapper.
  function buildProgressSection(sectionId, config) {
    const wrap = document.createElement("section");
    wrap.className = "net-progress-section";
    wrap.id = sectionId;
    wrap.setAttribute("data-progress-section", sectionId);

    const header = document.createElement("div");
    header.className = "net-card p-4 net-progress-section-head net-section-head";

    const title = document.createElement("div");
    title.className = "net-progress-section-title net-section-title";
    title.textContent = config?.title || "";

    const subtitle = document.createElement("div");
    subtitle.className = "net-section-sub";
    subtitle.textContent = config?.subtitle || "";

    header.append(title, subtitle);

    const body = document.createElement("div");
    body.className = "net-progress-section-body";

    wrap.append(header, body);
    return { wrap, body };
  }

  // Build course data with completion status and earned XP.
  async function buildCourseProgressList(courseList, courseContent, email, completionsMap) {
    if (!Array.isArray(courseList)) return [];

    return Promise.all(
      courseList.map(async (course) => {
        const contentId = resolveContentIdByTitle(course.title, courseContent) || course.id;
        const resolvedCourseContent = resolveCourseContent(course, courseContent);

        const courseId = String(course.id || "");
        const completions = completionsMap?.get(courseId) || await fetchCourseCompletions(email, courseId);

        const allCourseItems = buildCourseItems(resolvedCourseContent);
        const earnedXp = sumXpForCompletions(allCourseItems, completions);

        let courseStatus = course.status;
        if (!courseStatus || courseStatus === "not-started") {
          const requiredItemCount = countRequiredItems(resolvedCourseContent);
          const doneCount = completions.lesson.size + completions.quiz.size + completions.challenge.size;

          if (requiredItemCount > 0 && doneCount >= requiredItemCount) {
            courseStatus = "completed";
          } else if (doneCount > 0) {
            courseStatus = "in-progress";
          } else {
            courseStatus = "not-started";
          }
        }

        return {
          ...course,
          contentId,
          earnedXp,
          status: courseStatus
        };
      })
    );
  }

  function sumXpForCompletions(items, completions) {
    if (!Array.isArray(items) || !items.length) return 0;

    let totalXp = 0;

    items.forEach((item) => {
      const lessonNumber = Number(item.lesson_number || 0);
      if (!lessonNumber) return;

      if (item.type === "learn" && completions.lesson.has(lessonNumber)) {
        totalXp += Number(item.xp || 0);
      }

      if (item.type === "quiz" && completions.quiz.has(lessonNumber)) {
        totalXp += Number(item.xp || 0);
      }

      if (item.type === "challenge" && completions.challenge.has(lessonNumber)) {
        totalXp += Number(item.xp || 0);
      }
    });

    return totalXp;
  }

  // Render two columns for course cards.
  function renderCourseSplit(inProgressCourses, completedCourses, parentElement, startedCourseMap, totals) {
    const splitWrap = document.createElement("div");
    splitWrap.className = "net-progress-split";

    const inProgressColumn = buildColumn(
      "In progress",
      inProgressCourses.length,
      "in-progress",
      totals?.inProgressXp
    );

    renderCourseCards(inProgressCourses, inProgressColumn.body, "in-progress", startedCourseMap);

    if (!inProgressCourses.length) {
      renderEmptyColumn(inProgressColumn.body, "No active courses yet.");
    }

    const completedColumn = buildColumn(
      "Completed",
      completedCourses.length,
      "completed-courses",
      totals?.completedXp
    );

    renderCourseCards(completedCourses, completedColumn.body, "completed-courses");

    if (!completedCourses.length) {
      renderEmptyColumn(completedColumn.body, "No completed courses yet.");
    }

    splitWrap.append(inProgressColumn.wrap, completedColumn.wrap);
    parentElement.appendChild(splitWrap);
  }

  function renderCourseCards(courseItems, parentElement, viewType, startedCourseMap) {
    if (!Array.isArray(courseItems) || !courseItems.length) return;

    courseItems.forEach((courseItem) => {
      const card = document.createElement("div");
      card.className = "net-card net-coursecard-enhanced mb-3";

      const contentId = courseItem.contentId;
      const lastLesson = startedCourseMap?.get(String(courseItem.id));

      const destinationLink = (viewType === "in-progress" && lastLesson)
        ? buildLessonLink(courseItem.id, contentId, lastLesson)
        : buildCourseLink(courseItem.id, contentId);

      const body = document.createElement("div");
      body.className = "d-flex flex-column flex-md-row gap-4 p-4";

      const visual = document.createElement("div");
      visual.className = "net-course-visual";

      const visualIcon = document.createElement("i");
      visualIcon.className = viewType === "completed-courses" ? "bi bi-check-circle-fill" : "bi bi-journal-album";
      visual.appendChild(visualIcon);

      const info = document.createElement("div");
      info.className = "flex-grow-1";

      const header = document.createElement("div");
      header.className = "d-flex align-items-center gap-2 mb-1";

      const difficultyBadge = document.createElement("span");
      const difficulty = String(courseItem.difficulty || "novice").toLowerCase();

      difficultyBadge.className = `net-diffbadge net-badge-${
        difficulty === "intermediate" ? "int" : difficulty === "advanced" ? "adv" : "nov"
      }`;

      difficultyBadge.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
      header.appendChild(difficultyBadge);

      const title = document.createElement("h3");
      title.className = "h5 fw-bold mb-2";
      title.textContent = courseItem.title || "Course";

      const description = document.createElement("p");
      description.className = "text-muted small mb-3";
      description.style.maxWidth = "600px";
      description.textContent = courseItem.description || "No description available.";

      const stats = document.createElement("div");
      stats.className = "d-flex flex-wrap gap-3 small text-muted";

      if (courseItem.estimated_time) {
        stats.innerHTML += `<span><i class="bi bi-clock me-1"></i>${courseItem.estimated_time}</span>`;
      }

      const progressPercent = Number(courseItem.progress_pct || 0);

      const progressWrap = document.createElement("div");
      progressWrap.className = "mt-3";
      progressWrap.style.maxWidth = "280px";

      const progressInfo = document.createElement("div");
      progressInfo.className = "d-flex justify-content-between small mb-1";
      progressInfo.innerHTML = `<span>Progress</span><span class="fw-semibold">${progressPercent}%</span>`;

      const progressBar = document.createElement("div");
      progressBar.className = "net-meter";

      const progressFill = document.createElement("div");
      progressFill.className = "net-meter-fill";
      progressFill.style.width = `${progressPercent}%`;

      progressBar.appendChild(progressFill);
      progressWrap.append(progressInfo, progressBar);

      info.append(header, title, description, stats, progressWrap);

      const actions = document.createElement("div");
      actions.className = "d-flex flex-column align-items-md-end justify-content-center gap-2 min-w-150";

      const primaryButton = document.createElement("a");
      primaryButton.className = "btn btn-teal";
      primaryButton.href = destinationLink;
      primaryButton.innerHTML = viewType === "in-progress"
        ? "<i class=\"bi bi-play-fill me-1\"></i> Resume"
        : "<i class=\"bi bi-eye me-1\"></i> Review";

      actions.appendChild(primaryButton);
      body.append(visual, info, actions);
      card.appendChild(body);
      parentElement.appendChild(card);
    });
  }

  // Build module split groups from course content + completions.
  async function buildModuleSplitGroups(courseList, courseContent, email, startedCourseMap, completionsMap) {
    const inProgressGroups = [];
    const completedGroups = [];

    for (const course of (courseList || [])) {
      const courseId = String(course.id || "");
      const contentId = resolveContentIdByTitle(course.title, courseContent) || courseId;
      const resolvedCourseContent = resolveCourseContent(course, courseContent);

      if (!resolvedCourseContent || !Array.isArray(resolvedCourseContent.units)) {
        continue;
      }

      const completions = completionsMap?.get(courseId) || await fetchCourseCompletions(email, courseId);
      const doneCount = completions.lesson.size + completions.quiz.size + completions.challenge.size;
      const courseHasStarted = doneCount > 0 || startedCourseMap?.has(courseId);

      const modules = buildModulesFromCourse(resolvedCourseContent);
      const inProgressItems = [];
      const completedItems = [];

      modules.forEach((module) => {
        const moduleProgress = computeModuleProgress(module, completions);
        if (!moduleProgress.total) return;

        const moduleLabel = module.index || module.number || "";

        const moduleItem = {
          number: moduleLabel,
          title: module.title || `Module ${moduleLabel}`,
          link: buildModuleLink(courseId, contentId, module.id || moduleLabel),
          meta: `Module ${moduleLabel} - ${moduleProgress.done}/${moduleProgress.total} items`,
          ctaLabel: moduleProgress.completed ? "Review Module" : "Open Module"
        };

        if (moduleProgress.completed) {
          completedItems.push(moduleItem);
        } else if (courseHasStarted) {
          inProgressItems.push(moduleItem);
        }
      });

      if (inProgressItems.length) {
        inProgressGroups.push({
          courseId,
          contentId,
          title: course.title || `Course ${courseId}`,
          items: inProgressItems
        });
      }

      if (completedItems.length) {
        completedGroups.push({
          courseId,
          contentId,
          title: course.title || `Course ${courseId}`,
          items: completedItems
        });
      }
    }

    return { inProgressGroups, completedGroups };
  }

  function computeModuleProgress(module, completions) {
    const requiredItems = (module.items || []).filter((item) => {
      return item.type === "learn" || item.type === "quiz" || item.type === "challenge";
    });

    const doneCount = requiredItems.filter((item) => isItemCompleted(item, completions)).length;
    const totalCount = requiredItems.length || 0;

    return {
      done: doneCount,
      total: totalCount,
      completed: totalCount > 0 && doneCount === totalCount
    };
  }

  function isItemCompleted(item, completions) {
    if (!item || !completions) return false;

    const lessonNumber = Number(item.lesson_number || 0);
    if (!lessonNumber) return false;

    if (item.type === "learn") return completions.lesson.has(lessonNumber);
    if (item.type === "quiz") return completions.quiz.has(lessonNumber);
    if (item.type === "challenge") return completions.challenge.has(lessonNumber);

    return false;
  }

  // Build lesson/quiz/challenge/tutorial split groups.
  async function buildTypeSplitGroups(type, courseList, courseContent, email, startedCourseMap, completionsMap) {
    if (type === "tutorials") {
      return buildTutorialSplitGroups(courseList, courseContent, email);
    }

    const inProgressGroups = [];
    const completedGroups = [];

    const targetType = type === "lessons"
      ? "learn"
      : type === "quizzes"
        ? "quiz"
        : "challenge";

    for (const course of (courseList || [])) {
      const courseId = String(course.id || "");
      const contentId = resolveContentIdByTitle(course.title, courseContent) || courseId;
      const resolvedCourseContent = resolveCourseContent(course, courseContent);
      const lessonTitleMap = buildLessonTitleMap(resolvedCourseContent);

      const completions = completionsMap?.get(courseId) || await fetchCourseCompletions(email, courseId);
      const doneCount = completions.lesson.size + completions.quiz.size + completions.challenge.size;
      const courseHasStarted = doneCount > 0 || startedCourseMap?.has(courseId);

      const items = collectUniqueItemsByType(resolvedCourseContent, targetType);
      if (!items.length) continue;

      const doneSet = targetType === "quiz"
        ? completions.quiz
        : targetType === "challenge"
          ? completions.challenge
          : completions.lesson;

      const inProgressItems = [];
      const completedItems = [];

      items.forEach((item) => {
        const lessonNumber = Number(item.lesson_number || 0);
        if (!lessonNumber) return;

        const baseItem = {
          number: lessonNumber,
          title: lessonTitleMap.get(lessonNumber) || `Lesson ${lessonNumber}`,
          link: targetType === "challenge"
            ? buildChallengeLink(courseId, contentId, lessonNumber)
            : buildLessonLink(courseId, contentId, lessonNumber)
        };

        if (doneSet.has(lessonNumber)) {
          completedItems.push(baseItem);
        } else if (courseHasStarted) {
          inProgressItems.push(baseItem);
        }
      });

      if (inProgressItems.length) {
        inProgressGroups.push({
          courseId,
          contentId,
          title: course.title || `Course ${courseId}`,
          items: inProgressItems.sort((firstItem, secondItem) => firstItem.number - secondItem.number)
        });
      }

      if (completedItems.length) {
        completedGroups.push({
          courseId,
          contentId,
          title: course.title || `Course ${courseId}`,
          items: completedItems.sort((firstItem, secondItem) => firstItem.number - secondItem.number)
        });
      }
    }

    return { inProgressGroups, completedGroups };
  }

  function collectUniqueItemsByType(course, targetType) {
    const typedItems = buildCourseItems(course).filter((item) => item.type === targetType);
    const seenLessonNumbers = new Set();
    const uniqueItems = [];

    typedItems.forEach((item) => {
      const lessonNumber = Number(item.lesson_number || 0);
      if (!lessonNumber || seenLessonNumbers.has(lessonNumber)) return;

      seenLessonNumbers.add(lessonNumber);
      uniqueItems.push(item);
    });

    return uniqueItems;
  }

  // Build tutorial groups from local checklist keys.
  function buildTutorialSplitGroups(courseList, courseContent, email) {
    const inProgressMap = new Map();
    const completedMap = new Map();

    if (!email) {
      return { inProgressGroups: [], completedGroups: [] };
    }

    const storagePrefix = `netology_tutorial_progress:${email}:`;

    Object.keys(localStorage).forEach((storageKey) => {
      if (!storageKey.startsWith(storagePrefix)) return;

      const keyParts = storageKey.replace(storagePrefix, "").split(":");
      if (keyParts.length < 2) return;

      const courseId = keyParts[0];
      const lessonNumber = Number(keyParts[1] || 0);
      if (!courseId || !lessonNumber) return;

      const progressPayload = parseJsonSafe(localStorage.getItem(storageKey), {}) || {};
      const checkedStepCount = Array.isArray(progressPayload.checked)
        ? progressPayload.checked.filter(Boolean).length
        : 0;

      const courseMeta = (courseList || []).find((courseItem) => String(courseItem.id) === String(courseId));
      const contentId = resolveContentIdByTitle(courseMeta?.title, courseContent) || courseId;
      const resolvedCourseContent = resolveCourseContent(courseMeta || { id: courseId }, courseContent);
      const lessonTitleMap = buildLessonTitleMap(resolvedCourseContent);
      const totalStepCount = countTutorialSteps(resolvedCourseContent, lessonNumber);

      const tutorialItem = {
        number: lessonNumber,
        title: lessonTitleMap.get(lessonNumber) || `Lesson ${lessonNumber}`,
        link: buildTutorialLink(courseId, contentId, lessonNumber),
        meta: `Tutorial - ${checkedStepCount}/${totalStepCount || 0} steps`
      };

      const isComplete = totalStepCount > 0 ? checkedStepCount >= totalStepCount : false;
      const targetMap = isComplete ? completedMap : inProgressMap;

      const list = targetMap.get(courseId) || [];
      list.push(tutorialItem);
      targetMap.set(courseId, list);
    });

    const buildGroupsFromMap = (map) => {
      const groups = [];

      map.forEach((items, courseId) => {
        const courseMeta = (courseList || []).find((courseItem) => String(courseItem.id) === String(courseId));

        groups.push({
          courseId,
          contentId: resolveContentIdByTitle(courseMeta?.title, courseContent) || courseId,
          title: courseMeta?.title || `Course ${courseId}`,
          items: items.sort((firstItem, secondItem) => firstItem.number - secondItem.number)
        });
      });

      return groups;
    };

    return {
      inProgressGroups: buildGroupsFromMap(inProgressMap),
      completedGroups: buildGroupsFromMap(completedMap)
    };
  }

  // Render in-progress vs completed columns for non-course tabs.
  function renderSplitGroups(inProgressGroups, completedGroups, parentElement, type) {
    const splitWrap = document.createElement("div");
    splitWrap.className = "net-progress-split";

    const inProgressCount = countGroupItems(inProgressGroups);
    const completedCount = countGroupItems(completedGroups);

    const inProgressColumn = buildColumn("In progress", inProgressCount, "in-progress");
    renderCompletionGroups(inProgressGroups, inProgressColumn.body, type, "continue");

    if (!inProgressGroups.length) {
      renderEmptyColumn(inProgressColumn.body, "Nothing in progress yet.");
    }

    const completedColumn = buildColumn("Completed", completedCount, "completed-courses");
    renderCompletionGroups(completedGroups, completedColumn.body, type, "review");

    if (!completedGroups.length) {
      renderEmptyColumn(completedColumn.body, "Nothing completed yet.");
    }

    splitWrap.append(inProgressColumn.wrap, completedColumn.wrap);
    parentElement.appendChild(splitWrap);
  }

  function renderCompletionGroups(groups, parentElement, type, mode = "continue") {
    const typeConfig = getTypeConfig(type);

    groups.forEach((group) => {
      const card = document.createElement("div");
      card.className = `net-card net-progress-card net-card-fixed net-focus-card mb-3 ${typeConfig.cardType}`;

      const header = document.createElement("div");
      header.className = "d-flex align-items-start justify-content-between flex-wrap gap-3 mb-2 net-progress-group-head";

      const leftBlock = document.createElement("div");
      leftBlock.className = "d-flex align-items-start gap-3";

      const typePill = document.createElement("div");
      typePill.className = "net-progress-pill";

      const typePillIcon = document.createElement("i");
      typePillIcon.className = `bi ${typeConfig.icon}`;
      typePill.appendChild(typePillIcon);

      const titleWrap = document.createElement("div");

      const groupTitle = document.createElement("div");
      groupTitle.className = "fw-semibold";
      groupTitle.textContent = String(group.title || "Course");

      const groupMeta = document.createElement("div");
      groupMeta.className = "small text-muted";
      groupMeta.textContent = `${group.items.length} ${typeConfig.label.toLowerCase()}${group.items.length === 1 ? "" : "s"}`;

      const statusRow = document.createElement("div");
      statusRow.className = "d-flex flex-wrap gap-2 mt-2";
      statusRow.appendChild(makeStatusChip(mode === "review" ? "completed" : "progress"));

      titleWrap.append(groupTitle, groupMeta, statusRow);
      leftBlock.append(typePill, titleWrap);

      const openCourseButton = document.createElement("a");
      openCourseButton.className = "btn btn-outline-secondary btn-sm";
      openCourseButton.href = buildCourseLink(group.courseId, group.contentId);

      const openCourseIcon = document.createElement("i");
      openCourseIcon.className = "bi bi-arrow-right me-2";
      openCourseButton.append(openCourseIcon, document.createTextNode("Open course"));

      header.append(leftBlock, openCourseButton);

      const itemList = document.createElement("ul");
      itemList.className = "net-progress-items net-card-body";

      group.items.forEach((groupItem) => {
        const listItem = document.createElement("li");

        const itemLink = document.createElement("a");
        const variantClass = typeConfig.variant ? ` net-progress-item--${typeConfig.variant}` : "";

        itemLink.href = groupItem.link;
        itemLink.className = `net-progress-item${variantClass} net-focus-card`;

        const iconPill = document.createElement("span");
        iconPill.className = "net-progress-item-pill";

        const itemIcon = document.createElement("i");
        itemIcon.className = `bi ${typeConfig.icon}`;
        iconPill.appendChild(itemIcon);

        const textWrap = document.createElement("span");
        textWrap.className = "net-progress-item-text";

        const itemTitle = document.createElement("span");
        itemTitle.className = "net-progress-item-title";
        itemTitle.textContent = String(groupItem.title || "");

        const itemMeta = document.createElement("span");
        itemMeta.className = "net-progress-item-meta";
        itemMeta.textContent = groupItem.meta
          ? String(groupItem.meta)
          : `${typeConfig.label} ${groupItem.number}`;

        textWrap.append(itemTitle, itemMeta);

        const cta = document.createElement("span");
        cta.className = "net-progress-item-cta";

        const ctaIcon = document.createElement("i");
        ctaIcon.className = "bi bi-arrow-right";

        const ctaLabel = groupItem.ctaLabel || (mode === "review" ? typeConfig.ctaReview : typeConfig.ctaProgress);
        cta.append(ctaIcon, document.createTextNode(` ${ctaLabel}`));

        itemLink.append(iconPill, textWrap, cta);
        listItem.appendChild(itemLink);
        itemList.appendChild(listItem);
      });

      card.append(header, itemList);
      parentElement.appendChild(card);
    });
  }

  function getTypeConfig(type) {
    const configMap = {
      lessons: {
        icon: "bi-journal-check",
        label: "Lesson",
        variant: "",
        cardType: "net-card--lesson",
        ctaProgress: "Resume Lesson",
        ctaReview: "Review Lesson"
      },
      quizzes: {
        icon: "bi-patch-question",
        label: "Quiz",
        variant: "blue",
        cardType: "net-card--quiz",
        ctaProgress: "Resume Quiz",
        ctaReview: "Review Quiz"
      },
      tutorials: {
        icon: "bi-diagram-3",
        label: "Tutorial",
        variant: "",
        cardType: "net-card--tutorial",
        ctaProgress: "Resume Tutorial",
        ctaReview: "Review Tutorial"
      },
      challenges: {
        icon: "bi-flag",
        label: "Challenge",
        variant: "violet",
        cardType: "net-card--challenge",
        ctaProgress: "Resume Challenge",
        ctaReview: "Review Challenge"
      },
      modules: {
        icon: "bi-layers",
        label: "Module",
        variant: "green",
        cardType: "net-card--course",
        ctaProgress: "Open Module",
        ctaReview: "Review Module"
      }
    };

    return configMap[type] || configMap.lessons;
  }

  function buildColumn(title, count, type, xpTotal) {
    const wrap = document.createElement("div");
    wrap.className = "net-progress-col";

    const head = document.createElement("div");
    head.className = "net-card p-3 net-progress-col-head";

    const left = document.createElement("div");
    left.className = "net-progress-col-title";

    const icon = document.createElement("i");
    icon.className = `bi ${type === "completed-courses" ? "bi-check2-circle" : "bi-play-circle"} text-teal`;

    const label = document.createElement("span");
    label.textContent = title;
    left.append(icon, label);

    const meta = document.createElement("div");
    meta.className = "net-progress-col-meta";

    const countPill = document.createElement("span");
    countPill.className = "net-progress-col-count";
    countPill.textContent = String(count);
    meta.append(countPill);

    if (typeof xpTotal === "number") {
      const xpPill = document.createElement("span");
      xpPill.className = "net-progress-col-xp";

      const xpIcon = document.createElement("i");
      xpIcon.className = "bi bi-lightning-charge-fill";

      xpPill.append(xpIcon, document.createTextNode(` ${Number(xpTotal || 0)} XP`));
      meta.append(xpPill);
    }

    head.append(left, meta);

    const body = document.createElement("div");
    body.className = "net-progress-col-body";

    wrap.append(head, body);
    return { wrap, body };
  }

  function renderEmptyColumn(parentElement, message) {
    const card = document.createElement("div");
    card.className = "net-card p-4 net-progress-empty-col";

    const icon = document.createElement("i");
    icon.className = "bi bi-info-circle";

    const text = document.createElement("div");
    text.className = "small text-muted";
    text.textContent = message;

    card.append(icon, text);
    parentElement.appendChild(card);
  }

  function countGroupItems(groups) {
    return (groups || []).reduce((sum, group) => sum + (group.items ? group.items.length : 0), 0);
  }

  // Completion lookup with API-first and local fallback.
  async function fetchCourseCompletions(email, courseId) {
    const cacheKey = `${email || ""}:${courseId || ""}`;

    if (completionCache.has(cacheKey)) {
      return completionCache.get(cacheKey);
    }

    if (completionPromiseCache.has(cacheKey)) {
      return completionPromiseCache.get(cacheKey);
    }

    const promise = (async () => {
      const apiBase = String(window.API_BASE || "").trim();

      if (apiBase && email && courseId) {
        try {
          const responseData = await apiGet(ENDPOINTS.courses?.userCourseStatus || "/user-course-status", {
            email,
            course_id: courseId
          });

          if (responseData?.success) {
            const result = {
              lesson: new Set((responseData.lessons || []).map(Number)),
              quiz: new Set((responseData.quizzes || []).map(Number)),
              challenge: new Set((responseData.challenges || []).map(Number))
            };

            completionCache.set(cacheKey, result);
            completionPromiseCache.delete(cacheKey);
            return result;
          }
        } catch {
          // Fall back to local data.
        }
      }

      const localResult = getCourseCompletionsFromLocal(email, courseId);
      completionCache.set(cacheKey, localResult);
      completionPromiseCache.delete(cacheKey);
      return localResult;
    })();

    completionPromiseCache.set(cacheKey, promise);
    return promise;
  }

  async function buildCourseCompletionsMap(email, courseList) {
    const resultMap = new Map();

    if (!email || !Array.isArray(courseList) || !courseList.length) {
      return resultMap;
    }

    await Promise.all(
      courseList.map(async (course) => {
        const courseId = String(course.id || "");
        if (!courseId) return;

        const completions = await fetchCourseCompletions(email, courseId);
        resultMap.set(courseId, completions);
      })
    );

    return resultMap;
  }

  function getCourseCompletionsFromLocal(email, courseId) {
    if (!email || !courseId) {
      return {
        lesson: new Set(),
        quiz: new Set(),
        challenge: new Set()
      };
    }

    const rawData = localStorage.getItem(`netology_completions:${email}:${courseId}`);
    const payload = parseJsonSafe(rawData, {}) || {};

    const lessonList = payload.lesson || payload.lessons || payload.learn || [];
    const quizList = payload.quiz || payload.quizzes || [];
    const challengeList = payload.challenge || payload.challenges || [];

    return {
      lesson: new Set((lessonList || []).map(Number)),
      quiz: new Set((quizList || []).map(Number)),
      challenge: new Set((challengeList || []).map(Number))
    };
  }

  // Course content helpers.
  function getCourseContent() {
    if (typeof window.COURSE_CONTENT !== "undefined") return window.COURSE_CONTENT || {};
    if (typeof COURSE_CONTENT !== "undefined") return COURSE_CONTENT || {};
    return {};
  }

  function resolveCourseContent(course, contentMap) {
    if (!course || !contentMap) return null;

    const matchedContentId = resolveContentIdByTitle(course.title, contentMap);
    if (matchedContentId && contentMap[matchedContentId]) {
      return contentMap[matchedContentId];
    }

    return contentMap[String(course.id)] || null;
  }

  function resolveContentIdByTitle(title, contentMap) {
    if (!title || !contentMap) return null;

    const targetTitle = String(title).trim().toLowerCase();
    const allCourses = Object.values(contentMap);

    const matchedCourse = allCourses.find((courseEntry) => {
      return String(courseEntry?.title || "").trim().toLowerCase() === targetTitle;
    });

    return matchedCourse?.id ? String(matchedCourse.id) : null;
  }

  function buildModulesFromCourse(course) {
    if (!course || !Array.isArray(course.units)) return [];

    const modules = [];
    let lessonCounter = 1;

    course.units.forEach((unit, unitIndex) => {
      const normalized = normalizeUnitItems(unit, lessonCounter);

      modules.push({
        id: unit.id || `module-${unitIndex + 1}`,
        index: unitIndex + 1,
        title: unit.title || `Module ${unitIndex + 1}`,
        items: normalized.items
      });

      lessonCounter = normalized.nextLessonCounter;
    });

    return modules;
  }

  function buildCourseItems(course) {
    if (!course || !Array.isArray(course.units)) return [];

    const items = [];
    let lessonCounter = 1;

    course.units.forEach((unit) => {
      const normalized = normalizeUnitItems(unit, lessonCounter);
      items.push(...normalized.items);
      lessonCounter = normalized.nextLessonCounter;
    });

    return items;
  }

  // Normalize old/new unit shapes into one item list.
  function normalizeUnitItems(unit, startingLessonNumber) {
    const items = [];
    let lessonCounter = startingLessonNumber;

    const pushItem = (type, rawItem) => {
      items.push({
        type,
        title: rawItem.title || rawItem.name || capitalize(type),
        lesson_number: Number(rawItem.lesson_number || rawItem.lessonNumber || 0),
        xp: Number(rawItem.xp || rawItem.xpReward || rawItem.xp_reward || 0),
        steps: Array.isArray(rawItem.steps) ? rawItem.steps : []
      });
    };

    if (Array.isArray(unit.sections)) {
      unit.sections.forEach((section) => {
        const sectionType = String(section.type || section.kind || section.title || "").toLowerCase();
        const sectionItems = section.items || section.lessons || [];
        if (!Array.isArray(sectionItems)) return;

        sectionItems.forEach((sectionItem) => {
          const itemType = mapSectionTypeToItemType(sectionType, sectionItem);
          pushItem(itemType, sectionItem);
        });
      });
    }

    if (!items.length && unit.sections && typeof unit.sections === "object" && !Array.isArray(unit.sections)) {
      const sectionsObject = unit.sections;

      (sectionsObject.learn || sectionsObject.lesson || sectionsObject.lessons || []).forEach((item) => {
        pushItem("learn", item);
      });

      (sectionsObject.quiz || sectionsObject.quizzes || []).forEach((item) => {
        pushItem("quiz", item);
      });

      (sectionsObject.practice || sectionsObject.sandbox || []).forEach((item) => {
        pushItem("sandbox", item);
      });

      (sectionsObject.challenge || sectionsObject.challenges || []).forEach((item) => {
        pushItem("challenge", item);
      });
    }

    if (!items.length && Array.isArray(unit.lessons)) {
      unit.lessons.forEach((item) => {
        const rawType = String(item.type || "learn").toLowerCase();

        const mappedType = rawType === "quiz"
          ? "quiz"
          : rawType === "sandbox" || rawType === "practice"
            ? "sandbox"
            : rawType === "challenge"
              ? "challenge"
              : "learn";

        pushItem(mappedType, item);
      });
    }

    let lastLearnLessonNumber = lessonCounter - 1;

    items.forEach((item) => {
      if (item.type === "learn") {
        if (!item.lesson_number) {
          item.lesson_number = lessonCounter;
          lessonCounter += 1;
        } else {
          lessonCounter = Math.max(lessonCounter, item.lesson_number + 1);
        }

        lastLearnLessonNumber = item.lesson_number;
      } else if (!item.lesson_number) {
        item.lesson_number = Math.max(1, lastLearnLessonNumber || 1);
      }

      if (!item.xp) {
        item.xp = item.type === "quiz"
          ? 60
          : item.type === "challenge"
            ? 80
            : item.type === "sandbox"
              ? 30
              : 40;
      }
    });

    items.sort((firstItem, secondItem) => {
      if (firstItem.lesson_number !== secondItem.lesson_number) {
        return firstItem.lesson_number - secondItem.lesson_number;
      }

      const typeOrder = {
        learn: 1,
        quiz: 2,
        sandbox: 3,
        challenge: 4
      };

      return (typeOrder[firstItem.type] || 9) - (typeOrder[secondItem.type] || 9);
    });

    return {
      items,
      nextLessonCounter: lessonCounter
    };
  }

  function mapSectionTypeToItemType(sectionType, item) {
    const itemType = String(item.type || "").toLowerCase();

    if (itemType === "quiz") return "quiz";
    if (itemType === "challenge") return "challenge";
    if (itemType === "sandbox" || itemType === "practice") return "sandbox";
    if (itemType === "learn") return "learn";

    if (sectionType.includes("quiz")) return "quiz";
    if (sectionType.includes("challenge")) return "challenge";
    if (sectionType.includes("practice") || sectionType.includes("sandbox") || sectionType.includes("hands-on")) return "sandbox";

    return "learn";
  }

  function buildLessonTitleMap(course) {
    const map = new Map();

    buildCourseItems(course).forEach((item) => {
      if (item.type !== "learn") return;

      const lessonNumber = Number(item.lesson_number || 0);
      if (!lessonNumber || map.has(lessonNumber)) return;

      map.set(lessonNumber, item.title || `Lesson ${lessonNumber}`);
    });

    return map;
  }

  function countRequiredItems(course) {
    return buildCourseItems(course).filter((item) => {
      return item.type === "learn" || item.type === "quiz" || item.type === "sandbox" || item.type === "challenge";
    }).length;
  }

  function countTutorialSteps(course, lessonNumber) {
    if (!course || !Array.isArray(course.units)) return 0;

    let lessonCounter = 1;
    let stepCount = 0;

    course.units.forEach((unit) => {
      (unit.sections || []).forEach((section) => {
        (section.items || []).forEach((item) => {
          const itemType = String(item.type || "").toLowerCase();

          if (itemType === "learn") {
            if (lessonCounter === lessonNumber) {
              stepCount = Math.max(stepCount, (item.steps || []).length);
            }
            lessonCounter += 1;
            return;
          }

          if ((itemType === "practice" || itemType === "sandbox") && lessonCounter - 1 === lessonNumber) {
            stepCount = Math.max(stepCount, (item.steps || []).length);
          }
        });
      });
    });

    return stepCount;
  }

  // Generic UI helpers.
  function getElementById(id) {
    return document.getElementById(id);
  }

  function animateCount(element, targetValue) {
    if (!element) return;

    const nextValue = Number(targetValue || 0);
    const currentValue = Number(element.dataset.count || element.textContent || 0);

    if (!Number.isFinite(nextValue) || !Number.isFinite(currentValue) || currentValue === nextValue) {
      element.textContent = String(nextValue);
      element.dataset.count = String(nextValue);
      return;
    }

    const startTime = performance.now();
    const durationMs = 420;

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const interpolated = Math.round(currentValue + (nextValue - currentValue) * progress);
      element.textContent = String(interpolated);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        element.dataset.count = String(nextValue);
      }
    };

    requestAnimationFrame(tick);
  }

  function renderLoadingState(parentElement) {
    if (!parentElement) return;

    const wrap = document.createElement("div");
    wrap.className = "net-progress-loading";

    for (let placeholderIndex = 0; placeholderIndex < 2; placeholderIndex += 1) {
      const card = document.createElement("div");
      card.className = "net-card p-4";

      const lineOne = document.createElement("div");
      lineOne.className = "net-skel net-w-40 mb-2";

      const lineTwo = document.createElement("div");
      lineTwo.className = "net-skel net-w-80 mb-2";

      const lineThree = document.createElement("div");
      lineThree.className = "net-skel net-w-60";

      card.append(lineOne, lineTwo, lineThree);
      wrap.appendChild(card);
    }

    parentElement.replaceChildren(wrap);
  }

  function makeStatusChip(status) {
    const chip = document.createElement("span");
    const icon = document.createElement("i");

    let chipLabel = "Active";
    let chipClassName = "net-status-chip net-status-chip--active";
    let iconClassName = "bi bi-play-circle";

    if (status === "completed") {
      chipLabel = "Completed";
      chipClassName = "net-status-chip net-status-chip--completed";
      iconClassName = "bi bi-check2-circle";
    } else if (status === "locked") {
      chipLabel = "Locked";
      chipClassName = "net-status-chip net-status-chip--locked";
      iconClassName = "bi bi-lock-fill";
    } else if (status === "progress") {
      chipLabel = "In progress";
      chipClassName = "net-status-chip net-status-chip--progress";
      iconClassName = "bi bi-arrow-repeat";
    }

    chip.className = chipClassName;
    icon.className = iconClassName;
    icon.setAttribute("aria-hidden", "true");

    chip.append(icon, document.createTextNode(chipLabel));
    return chip;
  }

  // Link builders for each destination.
  function buildCourseLink(courseId, contentId) {
    const queryParams = new URLSearchParams();
    queryParams.set("id", String(courseId));
    if (contentId) queryParams.set("content_id", String(contentId));
    return `course.html?${queryParams.toString()}`;
  }

  function buildLessonLink(courseId, contentId, lessonNumber) {
    const queryParams = new URLSearchParams();
    queryParams.set("course_id", String(courseId));
    if (contentId) queryParams.set("content_id", String(contentId));
    queryParams.set("lesson", String(lessonNumber));
    return `lesson.html?${queryParams.toString()}`;
  }

  function buildChallengeLink(courseId, contentId, lessonNumber) {
    const queryParams = new URLSearchParams();
    queryParams.set("course_id", String(courseId));
    if (contentId) queryParams.set("content_id", String(contentId));
    queryParams.set("lesson", String(lessonNumber));
    queryParams.set("mode", "challenge");
    queryParams.set("challenge", "1");
    return `sandbox.html?${queryParams.toString()}`;
  }

  function buildTutorialLink(courseId, contentId, lessonNumber) {
    const queryParams = new URLSearchParams();
    queryParams.set("course_id", String(courseId));
    if (contentId) queryParams.set("content_id", String(contentId));
    queryParams.set("lesson", String(lessonNumber));
    queryParams.set("mode", "practice");
    return `sandbox.html?${queryParams.toString()}`;
  }

  function buildModuleLink(courseId, contentId, moduleId) {
    const queryParams = new URLSearchParams();
    queryParams.set("id", String(courseId));
    if (contentId) queryParams.set("content_id", String(contentId));
    if (moduleId) queryParams.set("module", String(moduleId));
    return `course.html?${queryParams.toString()}`;
  }

  // Top nav + sidebar user chrome.
  function setupPageChrome(currentUser) {
    setupSidebar();
    setupUserDropdown();
    fillIdentity(currentUser);
    fillSidebarXp(currentUser);

    const topLogoutButton = getElementById("topLogoutBtn");
    const sideLogoutButton = getElementById("sideLogoutBtn");

    if (topLogoutButton) topLogoutButton.addEventListener("click", logout);
    if (sideLogoutButton) sideLogoutButton.addEventListener("click", logout);
  }

  function setupSidebar() {
    const openButton = getElementById("openSidebarBtn");
    const closeButton = getElementById("closeSidebarBtn");
    const sidebar = getElementById("slideSidebar");
    const backdrop = getElementById("sideBackdrop");

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

    openButton?.addEventListener("click", openSidebar);
    closeButton?.addEventListener("click", closeSidebar);
    backdrop?.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sidebar?.classList.contains("is-open")) {
        closeSidebar();
      }
    });
  }

  function setupUserDropdown() {
    const userButton = getElementById("userBtn");
    const dropdown = getElementById("userDropdown");
    if (!userButton || !dropdown) return;

    userButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = dropdown.classList.toggle("is-open");
      userButton.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (event) => {
      if (!dropdown.contains(event.target) && !userButton.contains(event.target)) {
        dropdown.classList.remove("is-open");
        userButton.setAttribute("aria-expanded", "false");
      }
    });
  }

  function fillIdentity(currentUser) {
    const displayName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ")
      || currentUser.username
      || "Student";

    const email = currentUser.email || "";
    const avatarInitial = (displayName.charAt(0) || "S").toUpperCase();
    const totalXp = Number(currentUser.xp || 0);

    const level = Number.isFinite(Number(currentUser.numeric_level))
      ? Number(currentUser.numeric_level)
      : levelFromXp(totalXp);

    const rank = currentUser.rank || rankForLevel(level);

    setText("topAvatar", avatarInitial);
    setText("ddName", displayName);
    setText("ddEmail", email);
    setText("ddAvatar", avatarInitial);
    setText("ddLevel", `Level ${level}`);
    setText("ddRank", rank);
    setText("sideAvatar", avatarInitial);
    setText("sideUserName", displayName);
    setText("sideUserEmail", email);
    setText("sideLevelBadge", `Lv ${level}`);
  }

  function fillSidebarXp(currentUser) {
    const totalXp = Number(currentUser?.xp || 0) || 0;
    const progress = computeXpProgress(totalXp);

    setText("sideLevelBadge", `Lv ${progress.level}`);
    setText("sideXpText", `${progress.currentLevelXp}/${progress.nextLevelXp}`);
    setText("sideXpHint", `${progress.toNextXp} XP to next level`);

    const progressBar = getElementById("sideXPBar");
    if (progressBar) {
      progressBar.style.width = `${progress.progressPercent}%`;
    }
  }

  function setText(elementId, text) {
    const element = getElementById(elementId);
    if (element) {
      element.textContent = String(text);
    }
  }

  function logout() {
    localStorage.removeItem("netology_user");
    localStorage.removeItem("netology_token");
    localStorage.removeItem("user");
    window.location.href = "index.html";
  }

  // XP helpers.
  function totalXpForLevel(level) {
    return XP?.totalXpForLevel ? XP.totalXpForLevel(level) : 0;
  }

  function levelFromXp(totalXp) {
    return XP?.levelFromTotalXp ? XP.levelFromTotalXp(totalXp) : 1;
  }

  function xpForNextLevel(level) {
    return XP?.xpForNextLevel ? XP.xpForNextLevel(level) : 100;
  }

  function computeXpProgress(totalXp) {
    const level = levelFromXp(totalXp);
    const levelStartXp = totalXpForLevel(level);
    const currentLevelXp = Math.max(0, totalXp - levelStartXp);
    const nextLevelXp = xpForNextLevel(level);

    const progressPercent = Math.max(
      0,
      Math.min(100, (currentLevelXp / Math.max(nextLevelXp, 1)) * 100)
    );

    return {
      level,
      currentLevelXp,
      nextLevelXp,
      progressPercent,
      toNextXp: Math.max(0, nextLevelXp - currentLevelXp)
    };
  }

  function rankForLevel(level) {
    return XP?.rankForLevel ? XP.rankForLevel(level) : "Novice";
  }

  // Storage helpers.
  function parseJsonSafe(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function getCurrentUser() {
    return (
      parseJsonSafe(localStorage.getItem("netology_user"), null) ||
      parseJsonSafe(localStorage.getItem("user"), null) ||
      null
    );
  }

  function capitalize(text) {
    const value = String(text || "");
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
})();
