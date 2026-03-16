// Course page: load, render, and track progress for course modules and lessons

(() => {
  "use strict";

  const getApiBaseUrl = () => (window.API_BASE || "").replace(/\/$/, "");
  const XP_SYSTEM = window.NetologyXP || null;
  const apiGet = window.apiGet || createFallbackApiHelper();
  const ENDPOINTS = window.ENDPOINTS || {};
  const API_PATHS = {
    userInfo: ENDPOINTS.auth?.userInfo || "/user-info"
  };

  // Get element by ID
  function getById(elementId) {
    return document.getElementById(elementId);
  }

  // Clear all children from an element
  function clearChildren(parentNode) {
    if (parentNode) {
      parentNode.replaceChildren();
    }
  }

  // Create a new element with optional class and text
  function createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (typeof textContent !== "undefined") {
      element.textContent = textContent;
    }
    return element;
  }

  // Create an icon element (Bootstrap Icons)
  function createIcon(iconClassName) {
    const iconElement = document.createElement("i");
    iconElement.className = iconClassName;
    return iconElement;
  }

  // Add text to element with line breaks preserved
  function appendTextWithLineBreaks(parentNode, textContent) {
    if (!parentNode) return;

    const lines = String(textContent || "").split(/\n/);
    lines.forEach((line, index) => {
      parentNode.appendChild(document.createTextNode(line));
      if (index < lines.length - 1) {
        parentNode.appendChild(document.createElement("br"));
      }
    });
  }

  // Set text of element by ID
  function setTextById(elementId, textContent) {
    const element = getById(elementId);
    if (element) {
      element.textContent = String(textContent ?? "");
    }
  }

  // Clamp number between min and max
  function clamp(numberValue, minimumValue, maximumValue) {
    const numericValue = Number(numberValue);
    if (Number.isNaN(numericValue)) {
      return minimumValue;
    }
    return Math.min(maximumValue, Math.max(minimumValue, numericValue));
  }

  // Safely parse JSON
  function parseJsonSafely(jsonString, fallbackValue = null) {
    try {
      return jsonString ? JSON.parse(jsonString) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  }

  function createFallbackApiHelper() {
    return async function apiGetFallback(apiPath, queryParameters = {}) {
      const baseUrl = getApiBaseUrl();
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

  const pageState = {
    currentUser: null,
    courseId: null,
    contentId: null,
    courseData: {
      id: null,
      title: "",
      description: "",
      difficulty: "novice",
      requiredLevel: 1,
      estimatedTime: "—",
      totalXP: 0,
      totalLessons: 0,
      modules: []
    },
    completionStatus: {
      lesson: new Set(),
      quiz: new Set(),
      challenge: new Set(),
      tutorial: new Set()
    },
    currentLessonIndex: -1,
    currentLesson: null,
    userStats: {
      level: 1,
      rank: "Novice",
      xp: 0,
      currentLevelXP: 0,
      xpProgressPercent: 0,
      accessLevel: 1
    }
  };

  function getCurrentUser() {
    return (
      parseJsonSafely(localStorage.getItem("netology_user")) ||
      parseJsonSafely(localStorage.getItem("user")) ||
      null
    );
  }

  function isUserLoggedIn(user) {
    return !!(user && (user.email || user.username));
  }

  async function refreshUserFromServer() {
    const cachedUser = getCurrentUser();
    const userEmail = cachedUser?.email || localStorage.getItem("netology_last_email") || "";

    if (!userEmail) {
      return cachedUser;
    }

    try {
      const userData = await apiGet(API_PATHS.userInfo, { email: userEmail });

      if (!userData?.success) {
        return cachedUser;
      }

      const mergedUser = {
        ...(cachedUser || {}),
        email: userEmail,
        first_name: userData.first_name || cachedUser?.first_name,
        last_name: userData.last_name || cachedUser?.last_name,
        username: userData.username || cachedUser?.username,
        xp: Number.isFinite(Number(userData.xp ?? userData.total_xp))
          ? Number(userData.xp ?? userData.total_xp)
          : Number(cachedUser?.xp || 0),
        numeric_level: Number.isFinite(Number(userData.numeric_level))
          ? Number(userData.numeric_level)
          : cachedUser?.numeric_level,
        rank: userData.rank || userData.level || cachedUser?.rank,
        level: userData.level || userData.rank || cachedUser?.level,
        isFirstLogin: typeof userData.is_first_login !== "undefined"
          ? Boolean(userData.is_first_login)
          : cachedUser?.isFirstLogin
      };

      localStorage.setItem("user", JSON.stringify(mergedUser));
      localStorage.setItem("netology_user", JSON.stringify(mergedUser));
      return mergedUser;

    } catch (error) {
      console.warn("Could not refresh user data:", error);
      return cachedUser;
    }
  }

  function loadCourseFromContent(courseId) {
    if (!window.COURSE_CONTENT) {
      return null;
    }

    const rawCourse = window.COURSE_CONTENT[String(courseId)];
    if (!rawCourse) {
      return null;
    }

    const normalizedCourse = {
      id: String(courseId),
      title: rawCourse.title || "Untitled Course",
      description: rawCourse.description || "",
      difficulty: String(rawCourse.difficulty || "novice").toLowerCase(),
      requiredLevel: Number(rawCourse.required_level || 1),
      estimatedTime: rawCourse.estimated_time || "—",
      totalXP: Number(rawCourse.total_xp || 0),
      totalLessons: Number(rawCourse.total_lessons || 0),
      modules: []
    };

    if (Array.isArray(rawCourse.units)) {
      let lessonCounter = 1;

      rawCourse.units.forEach((unit) => {
        const moduleItems = normalizeCourseItems(unit, lessonCounter);
        lessonCounter += moduleItems.length;

        normalizedCourse.modules.push({
          id: unit.id || `module-${normalizedCourse.modules.length}`,
          title: unit.title || "Module",
          description: unit.about || "",
          items: moduleItems
        });
      });
    }

    return normalizedCourse;
  }

  function normalizeCourseItems(unit, startingLessonNumber) {
    const items = [];
    let lessonCounter = startingLessonNumber;

    const addItem = (itemType, itemData) => {
      items.push({
        type: itemType,
        title: itemData.title || itemData.name || capitalize(itemType),
        content: itemData.content || itemData.learn || itemData.text || "",
        duration: itemData.duration || itemData.time || "—",
        xpReward: Number(itemData.xp || itemData.xpReward || itemData.xp_reward || 0),
        lessonNumber: Number(itemData.lesson_number || itemData.lessonNumber || 0),
        unitTitle: unit.title || "",
        unitDescription: unit.about || "",
        challengeRules: itemData.challenge || itemData.rules || null,
        steps: itemData.steps || [],
        tips: itemData.tips || "",
        isAutoAssigned: false
      });
    };

    if (Array.isArray(unit.sections)) {
      unit.sections.forEach((section) => {
        const sectionType = String(section.type || section.kind || section.title || "").toLowerCase();
        const sectionItems = section.items || section.lessons || [];

        if (Array.isArray(sectionItems)) {
          sectionItems.forEach((lessonItem) => {
            const itemType = mapSectionTypeToItemType(sectionType, lessonItem);
            addItem(itemType, lessonItem);
          });
        }
      });
    }

    if (!items.length && unit.sections && typeof unit.sections === "object" && !Array.isArray(unit.sections)) {
      const sectionsObject = unit.sections;
      (sectionsObject.learn || sectionsObject.lesson || sectionsObject.lessons || []).forEach((item) =>
        addItem("learn", item)
      );
      (sectionsObject.quiz || sectionsObject.quizzes || []).forEach((item) => addItem("quiz", item));
      (sectionsObject.practice || sectionsObject.sandbox || []).forEach((item) => addItem("sandbox", item));
      (sectionsObject.challenge || sectionsObject.challenges || []).forEach((item) =>
        addItem("challenge", item)
      );
    }

    if (!items.length && Array.isArray(unit.lessons)) {
      unit.lessons.forEach((lessonItem) => {
        const typeString = String(lessonItem.type || "learn").toLowerCase();
        const normalizedType =
          typeString === "quiz"
            ? "quiz"
            : typeString === "sandbox" || typeString === "practice"
            ? "sandbox"
            : typeString === "challenge"
            ? "challenge"
            : "learn";
        addItem(normalizedType, lessonItem);
      });
    }

    let lastLearnLessonNumber = lessonCounter - 1;

    items.forEach((item) => {
      if (item.type === "learn") {
        if (!item.lessonNumber) {
          item.lessonNumber = lessonCounter++;
          item.isAutoAssigned = true;
        } else {
          lessonCounter = Math.max(lessonCounter, item.lessonNumber + 1);
        }
        lastLearnLessonNumber = item.lessonNumber;
      } else {
        if (!item.lessonNumber) {
          item.lessonNumber = Math.max(1, lastLearnLessonNumber || 1);
          item.isAutoAssigned = true;
        }
      }

      if (!item.xpReward) {
        item.xpReward =
          item.type === "quiz"
            ? 60
            : item.type === "challenge"
            ? 80
            : item.type === "sandbox"
            ? 30
            : 40;
      }

      if (!item.duration || item.duration === "—") {
        item.duration =
          item.type === "quiz"
            ? "5–10 min"
            : item.type === "challenge"
            ? "10–15 min"
            : item.type === "sandbox"
            ? "10 min"
            : "8–12 min";
      }
    });

    return items;
  }

  function mapSectionTypeToItemType(sectionType, item) {
    if (sectionType.includes("quiz") || sectionType.includes("test")) return "quiz";
    if (sectionType.includes("sandbox") || sectionType.includes("practice")) return "sandbox";
    if (sectionType.includes("challenge")) return "challenge";
    if (item?.type === "quiz") return "quiz";
    if (item?.type === "sandbox" || item?.type === "practice") return "sandbox";
    if (item?.type === "challenge") return "challenge";
    return "learn";
  }

  function capitalize(string) {
    const str = String(string || "");
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function setupBrandRouting() {
    const user = getCurrentUser();
    const targetPage = isUserLoggedIn(user) ? "dashboard.html" : "index.html";

    const topBrand = getById("brandHome");
    const sideBrand = getById("sideBrandHome");
    const backLink = getById("backLink");

    if (topBrand) topBrand.setAttribute("href", targetPage);
    if (sideBrand) sideBrand.setAttribute("href", targetPage);
    if (backLink) backLink.setAttribute("href", targetPage);
  }

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

    // Close on Escape key
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sidebar?.classList.contains("is-open")) {
        closeSidebar();
      }
    });
  }

  function setupUserDropdown() {
    const userButton = getById("userBtn");
    const userDropdown = getById("userDropdown");
    if (!userButton || !userDropdown) return;

    const closeDropdown = () => {
      userDropdown.classList.remove("is-open");
      userButton.setAttribute("aria-expanded", "false");
    };

    userButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = userDropdown.classList.toggle("is-open");
      userButton.setAttribute("aria-expanded", String(isOpen));
    });

    // Close when clicking outside
    document.addEventListener("click", (event) => {
      if (!userDropdown.contains(event.target) && !userButton.contains(event.target)) {
        closeDropdown();
      }
    });

    // Close on Escape
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDropdown();
    });
  }

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

  function updateUserDisplay(user) {
    let displayName =
      user?.name ||
      `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
      user?.username ||
      "Student";

    const firstInitial = (displayName || "S").trim().charAt(0).toUpperCase();

    // Update top navbar
    setTextById("topAvatar", firstInitial);
    setTextById("topUserName", displayName);
    setTextById("ddName", displayName);
    setTextById("ddEmail", user?.email || "");

    // Update sidebar
    setTextById("sideAvatar", firstInitial);
    setTextById("sideUserName", displayName);
    setTextById("sideUserEmail", user?.email || "");
  }

  // Update user stats display
  function updateUserStats(user) {
    const level = user?.numeric_level || user?.level || 1;
    const xp = Number(user?.xp || 0);

    if (XP_SYSTEM) {
      const levelInfo = XP_SYSTEM.getLevelInfo?.(level) || {};
      const levelXP = levelInfo.xpToLevel || 0;
      const nextLevelXP = levelInfo.xpToNext || 1000;
      const progressInLevel = xp - levelXP;
      const progressPercent = Math.round((progressInLevel / nextLevelXP) * 100);

      pageState.userStats = {
        level: level,
        rank: levelInfo.rank || "Novice",
        xp: xp,
        currentLevelXP: progressInLevel,
        xpProgressPercent: Math.min(100, Math.max(0, progressPercent)),
        accessLevel: levelInfo.level || 1
      };
    }
  }

  async function initializeCoursePage() {
    console.log("Initializing course page...");

    // STEP 1: Parse URL parameters
    console.log("Step 1: Getting course ID from URL...");
    const urlParams = new URLSearchParams(window.location.search);
    pageState.courseId = urlParams.get("course_id") || "1";
    pageState.contentId = urlParams.get("content_id") || pageState.courseId;

    // STEP 2: Load cached user and show UI
    console.log("Step 2: Loading cached user...");
    const cachedUser = getCurrentUser();
    pageState.currentUser = cachedUser;

    if (cachedUser && isUserLoggedIn(cachedUser)) {
      setupBrandRouting();
      setupSidebar();
      setupUserDropdown();
      setupLogoutButtons();
      updateUserDisplay(cachedUser);
      updateUserStats(cachedUser);
    } else {
      setupBrandRouting();
      setupSidebar();
      setupUserDropdown();
    }

    // STEP 3: Load course from COURSE_CONTENT
    console.log("Step 3: Loading course from COURSE_CONTENT...");
    const courseData = loadCourseFromContent(pageState.courseId);
    if (courseData) {
      pageState.courseData = courseData;
    } else {
      console.warn("Could not load course data");
    }

    // STEP 4: Refresh user from API
    console.log("Step 4: Refreshing user from API...");
    const freshUser = await refreshUserFromServer();
    pageState.currentUser = freshUser;

    if (freshUser) {
      updateUserDisplay(freshUser);
      updateUserStats(freshUser);
    }

    // STEP 5: Render course to page
    console.log("Step 5: Rendering course...");
    renderCourseHeader();
    renderModules();

    console.log("Course page initialization complete!");
  }

  function renderCourseHeader() {
    const course = pageState.courseData;
    setTextById("courseTitle", course.title || "Course");
    setTextById("courseDescription", course.description || "");

    const progress = calculateCourseProgress();
    setTextById("courseProgress", `${progress.percent}%`);
  }

  // Render all modules
  function renderModules() {
    const modulesContainer = getById("modulesContainer");
    if (!modulesContainer) return;

    clearChildren(modulesContainer);

    pageState.courseData.modules.forEach((module, index) => {
      const moduleElement = renderModule(module, index + 1);
      modulesContainer.appendChild(moduleElement);
    });
  }

  function renderModule(module, moduleNumber) {
    const moduleContainer = createElement("div", "net-module");
    const moduleHeader = createElement("div", "net-module-header");

    const moduleTitle = createElement("h3", "net-module-title", `Module ${moduleNumber}: ${module.title}`);
    moduleHeader.appendChild(moduleTitle);

    if (module.description) {
      const moduleDescription = createElement("p", "net-module-description", module.description);
      moduleHeader.appendChild(moduleDescription);
    }

    moduleContainer.appendChild(moduleHeader);

    // Add items
    const itemsContainer = createElement("div", "net-module-items");
    module.items.forEach((item) => {
      const itemElement = renderLesson(item);
      itemsContainer.appendChild(itemElement);
    });

    moduleContainer.appendChild(itemsContainer);

    return moduleContainer;
  }

  function renderLesson(item) {
    const isCompleted = pageState.completionStatus.lesson.has(item.lessonNumber);

    const lessonElement = createElement("div", "net-lesson");
    if (isCompleted) {
      lessonElement.classList.add("is-completed");
    }

    // Icon
    const iconContainer = createElement("div", "net-lesson-icon");
    iconContainer.appendChild(getLessonIcon(item, isCompleted));
    lessonElement.appendChild(iconContainer);

    // Content
    const contentContainer = createElement("div", "net-lesson-content");

    const titleElement = createElement("h4", "net-lesson-title", item.title);
    contentContainer.appendChild(titleElement);

    const metaElement = createElement("div", "net-lesson-meta");
    metaElement.textContent = `${item.duration} · ${item.xpReward} XP`;
    contentContainer.appendChild(metaElement);

    lessonElement.appendChild(contentContainer);

    // Click to open lesson
    lessonElement.addEventListener("click", () => {
      openLessonModal(item);
    });

    return lessonElement;
  }

  function getLessonIcon(item, isCompleted) {
    const iconContainer = document.createElement("div");
    iconContainer.className = "net-ico-pill";

    if (isCompleted) {
      iconContainer.classList.add("net-ico-success");
      iconContainer.appendChild(createIcon("bi bi-check2-circle"));
      return iconContainer;
    }

    if (item.type === "quiz") {
      iconContainer.classList.add("net-ico-quiz");
      iconContainer.appendChild(createIcon("bi bi-patch-question"));
    } else if (item.type === "sandbox") {
      iconContainer.classList.add("net-ico-sandbox");
      iconContainer.appendChild(createIcon("bi bi-diagram-3"));
    } else if (item.type === "challenge") {
      iconContainer.classList.add("net-ico-challenge");
      iconContainer.appendChild(createIcon("bi bi-flag"));
    } else {
      iconContainer.classList.add("net-ico-learn");
      iconContainer.appendChild(createIcon("bi bi-file-text"));
    }

    return iconContainer;
  }

  // Lesson modal handling

  function openLessonModal(item) {
    pageState.currentLesson = item;
    pageState.currentLessonIndex = pageState.lessonsList.indexOf(item);

    // Show modal (implementation depends on your HTML structure)
    const modal = getById("lessonModal");
    if (modal) {
      updateLessonModalContent(item);
      modal.classList.add("is-open");
    }
  }

  function updateLessonModalContent(item) {
    setTextById("lessonModalTitle", item.title);
    setTextById("lessonModalDuration", item.duration);
    setTextById("lessonModalXP", item.xpReward);

    const contentElement = getById("lessonModalContent");
    if (contentElement && item.content) {
      clearChildren(contentElement);
      appendTextWithLineBreaks(contentElement, item.content);
    }
  }

  function onDOMReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  onDOMReady(() => {
    initializeCoursePage();
  });

})();
