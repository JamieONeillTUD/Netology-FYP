// Course page: load, render, and track progress for course modules and lessons

(() => {
  "use strict";

  const getApiBaseUrl = () => (window.API_BASE || "").replace(/\/$/, "");
  const XP_SYSTEM = window.NetologyXP || null;
  const ENDPOINTS = window.ENDPOINTS || {};
  const API_PATHS = {
    userInfo: ENDPOINTS.auth?.userInfo || "/user-info"
  };

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

  const apiGet = window.apiGet || createFallbackApiHelper();

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

  // Safely parse JSON
  function parseJsonSafely(jsonString, fallbackValue = null) {
    try {
      return jsonString ? JSON.parse(jsonString) : fallbackValue;
    } catch {
      return fallbackValue;
    }
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
      challenge: new Set()
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

  function findRawCourse(courseId, courseTitle) {
    if (!window.COURSE_CONTENT) return null;

    // Try direct key match first
    if (window.COURSE_CONTENT[String(courseId)]) {
      return window.COURSE_CONTENT[String(courseId)];
    }

    const entries = Object.values(window.COURSE_CONTENT);

    // Match by the id field stored inside the content object
    const byId = entries.find((c) => String(c.id) === String(courseId));
    if (byId) return byId;

    // Match by title (DB IDs differ from content keys)
    if (courseTitle) {
      const normalizedTitle = String(courseTitle).trim().toLowerCase();
      const byTitle = entries.find((c) => String(c.title || "").trim().toLowerCase() === normalizedTitle);
      if (byTitle) return byTitle;
    }

    return null;
  }

  function loadCourseFromContent(courseId, courseTitle) {
    const rawCourse = findRawCourse(courseId, courseTitle);
    if (!rawCourse) {
      return null;
    }

    const normalizedCourse = {
      id: String(courseId),
      title: rawCourse.title || "Untitled Course",
      description: rawCourse.description || "",
      difficulty: String(rawCourse.difficulty || "novice").toLowerCase(),
      requiredLevel: Number(rawCourse.required_level || 1),
      estimatedTime: rawCourse.estimatedTime || rawCourse.estimated_time || "—",
      totalXP: Number(rawCourse.xpReward || rawCourse.total_xp || 0),
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

  // ─── Progress helpers ────────────────────────────────────────────────────

  function getAllItems() {
    const items = [];
    pageState.courseData.modules.forEach((mod) => items.push(...mod.items));
    return items;
  }

  function calculateCourseProgress() {
    const allItems = getAllItems();
    const total = allItems.length;
    if (!total) return { percent: 0, completed: 0, total: 0, earnedXP: 0 };

    let completed = 0;
    let earnedXP = 0;
    allItems.forEach((item) => {
      const done =
        pageState.completionStatus.lesson.has(item.lessonNumber) ||
        pageState.completionStatus.quiz.has(item.lessonNumber) ||
        pageState.completionStatus.challenge.has(item.lessonNumber);
      if (done) {
        completed++;
        earnedXP += Number(item.xpReward || 0);
      }
    });

    const percent = Math.round((completed / total) * 100);
    return { percent, completed, total, earnedXP };
  }

  async function loadCompletionStatus() {
    const user = pageState.currentUser;
    if (!user?.email || !pageState.courseId) return;

    try {
      const baseUrl = getApiBaseUrl();
      const statusPath = (ENDPOINTS.courses?.userCourseStatus || "/user-course-status");
      const url = `${baseUrl}${statusPath}?email=${encodeURIComponent(user.email)}&course_id=${pageState.courseId}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data?.success) {
        pageState.completionStatus.lesson = new Set((data.lessons || []).map(Number));
        pageState.completionStatus.quiz = new Set((data.quizzes || []).map(Number));
        pageState.completionStatus.challenge = new Set((data.challenges || []).map(Number));
      }
    } catch (err) {
      console.warn("Could not load completion status:", err);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  function renderCourseHeader() {
    const course = pageState.courseData;

    // Basic text
    setTextById("courseTitle", course.title || "Course");
    setTextById("courseDescription", course.description || "");
    setTextById("breadcrumbCourse", course.title || "Course");

    // Difficulty pill
    const diffPill = getById("difficultyPill");
    if (diffPill) {
      const diff = capitalize(course.difficulty || "Novice");
      diffPill.textContent = diff;
      diffPill.className = `net-pill-badge badge px-3 py-2 net-diff-${course.difficulty || "novice"}`;
    }

    // Stats strip
    const moduleCount = course.modules.length;
    setTextById("metaModules", `${moduleCount} module${moduleCount !== 1 ? "s" : ""}`);
    setTextById("metaTime", course.estimatedTime || "—");
    setTextById("metaXP", `${course.totalXP} XP`);
    setTextById("moduleCountLabel", `${moduleCount} module${moduleCount !== 1 ? "s" : ""}`);

    // Progress
    const progress = calculateCourseProgress();
    renderProgress(progress);

    // Up-next card
    renderUpNext(progress);
  }

  function renderProgress(progress) {
    const pct = progress.percent;

    // Ring
    const ringEl = getById("progressRing");
    if (ringEl) {
      const circumference = 364.42;
      const offset = circumference - (pct / 100) * circumference;
      ringEl.style.strokeDashoffset = String(offset);
    }
    setTextById("progressPct", `${pct}%`);
    setTextById("progressCount", `${progress.completed}/${progress.total}`);

    // Hidden compat elements
    setTextById("progressText", `${pct}%`);
    const bar = getById("progressBar");
    if (bar) bar.style.width = `${pct}%`;

    // Status chips
    const lockedPill = getById("courseLockedPill");
    const activePill = getById("courseActivePill");
    const completedPill = getById("courseCompletedPill");

    const user = pageState.currentUser;
    const userLevel = pageState.userStats.accessLevel || user?.numeric_level || 1;
    const required = pageState.courseData.requiredLevel || 1;
    const isLocked = Number(userLevel) < Number(required);

    if (lockedPill) lockedPill.classList.toggle("d-none", !isLocked);
    if (activePill) activePill.classList.toggle("d-none", isLocked || pct === 0 || pct === 100);
    if (completedPill) completedPill.classList.toggle("d-none", pct < 100);

    const lockedExplainer = getById("lockedExplainer");
    if (lockedExplainer) {
      lockedExplainer.classList.toggle("d-none", !isLocked);
      if (isLocked) setTextById("lockedText", `Requires Level ${required} to unlock.`);
    }
  }

  function renderUpNext(progress) {
    const allItems = getAllItems();
    const nextItem = allItems.find((item) => {
      return (
        !pageState.completionStatus.lesson.has(item.lessonNumber) &&
        !pageState.completionStatus.quiz.has(item.lessonNumber) &&
        !pageState.completionStatus.challenge.has(item.lessonNumber)
      );
    });

    setTextById("nextStepText", nextItem ? nextItem.title : "All done!");
    setTextById("sidePct", `${progress.percent}%`);
    setTextById("sideModules", `${pageState.courseData.modules.length}/${pageState.courseData.modules.length}`);
    setTextById("sideXPEarned", String(progress.earnedXP));

    const continueBtn = getById("continueBtn");
    const reviewBtn = getById("reviewBtn");

    if (continueBtn) {
      continueBtn.onclick = () => {
        const target = nextItem || allItems[0];
        if (target) openLesson(target);
      };
    }

    if (reviewBtn) {
      if (progress.percent === 100) {
        reviewBtn.classList.remove("d-none");
        reviewBtn.onclick = () => {
          if (allItems[0]) openLesson(allItems[0]);
        };
      } else {
        reviewBtn.classList.add("d-none");
      }
    }
  }

  async function initializeCoursePage() {
    const urlParams = new URLSearchParams(window.location.search);
    pageState.courseId = urlParams.get("id") || urlParams.get("course_id") || "1";
    pageState.contentId = urlParams.get("content_id") || pageState.courseId;

    const cachedUser = getCurrentUser();
    pageState.currentUser = cachedUser;

    setupBrandRouting();
    setupSidebar();
    setupUserDropdown();
    setupLogoutButtons();

    if (cachedUser && isUserLoggedIn(cachedUser)) {
      updateUserDisplay(cachedUser);
      updateUserStats(cachedUser);
    }

    // Try to load from COURSE_CONTENT directly first
    let courseData = loadCourseFromContent(pageState.courseId);

    // If not found by ID, fetch the course title from the API and match by title
    if (!courseData) {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/course?id=${pageState.courseId}`);
        const apiCourse = await res.json();
        if (apiCourse?.title) {
          courseData = loadCourseFromContent(pageState.courseId, apiCourse.title);
          // Patch in any missing meta from the API response
          if (courseData) {
            courseData.totalXP = courseData.totalXP || Number(apiCourse.xp_reward || 0);
            courseData.estimatedTime = courseData.estimatedTime || apiCourse.estimated_time || "\u2014";
            courseData.totalLessons = courseData.totalLessons || Number(apiCourse.total_lessons || 0);
          }
        }
      } catch (err) {
        console.warn("Could not fetch course from API:", err);
      }
    }

    if (courseData) {
      pageState.courseData = courseData;
    } else {
      console.warn("Could not load course data for id:", pageState.courseId);
    }

    const freshUser = await refreshUserFromServer();
    pageState.currentUser = freshUser;
    if (freshUser) {
      updateUserDisplay(freshUser);
      updateUserStats(freshUser);
    }

    await loadCompletionStatus();

    renderCourseHeader();
    renderModules();
    setupLessonDrawer();

    document.body.classList.remove("net-loading");
  }

  // ─── Module / Lesson rendering ────────────────────────────────────────────

  // Render all modules
  function renderModules() {
    const modulesContainer = getById("modulesWrap");
    if (!modulesContainer) return;

    clearChildren(modulesContainer);

    if (!pageState.courseData.modules.length) {
      const empty = getById("modulesEmpty");
      if (empty) empty.classList.remove("d-none");
      return;
    }

    pageState.courseData.modules.forEach((module, index) => {
      const moduleElement = renderModule(module, index + 1);
      modulesContainer.appendChild(moduleElement);
    });
  }

  function renderModule(module, moduleNumber) {
    const article = createElement("article", "net-card p-4 mb-2");

    // Header
    const header = createElement("div", "net-module-header mb-3");
    const title = createElement("h3", "h5 fw-semibold mb-1", `Module ${moduleNumber}: ${module.title}`);
    header.appendChild(title);

    if (module.description) {
      const desc = createElement("p", "small text-muted mb-0", module.description);
      header.appendChild(desc);
    }
    article.appendChild(header);

    // Items
    const itemsContainer = createElement("div", "net-module-items d-grid gap-2");
    module.items.forEach((item) => {
      itemsContainer.appendChild(renderLesson(item));
    });
    article.appendChild(itemsContainer);

    return article;
  }

  function renderLesson(item) {
    const isCompleted =
      pageState.completionStatus.lesson.has(item.lessonNumber) ||
      pageState.completionStatus.quiz.has(item.lessonNumber) ||
      pageState.completionStatus.challenge.has(item.lessonNumber);

    const lessonEl = createElement("div", "net-lesson d-flex align-items-center gap-3 p-3 rounded");
    lessonEl.style.cursor = "pointer";
    if (isCompleted) lessonEl.classList.add("is-completed");

    // Icon
    lessonEl.appendChild(getLessonIcon(item, isCompleted));

    // Content
    const content = createElement("div", "flex-grow-1");
    content.appendChild(createElement("div", "fw-semibold", item.title));
    const meta = createElement("div", "small text-muted");
    meta.textContent = `${item.duration} · ${item.xpReward} XP`;
    content.appendChild(meta);
    lessonEl.appendChild(content);

    // Completed tick
    if (isCompleted) {
      lessonEl.appendChild(createIcon("bi bi-check2-circle text-success ms-auto"));
    }

    // Click: open preview drawer
    lessonEl.addEventListener("click", () => openLessonPreview(item));

    return lessonEl;
  }

  function getLessonIcon(item, isCompleted) {
    const pill = createElement("div", "net-ico-pill");

    if (isCompleted) {
      pill.classList.add("net-ico-success");
      pill.appendChild(createIcon("bi bi-check2-circle"));
    } else if (item.type === "quiz") {
      pill.classList.add("net-ico-quiz");
      pill.appendChild(createIcon("bi bi-patch-question"));
    } else if (item.type === "sandbox") {
      pill.classList.add("net-ico-sandbox");
      pill.appendChild(createIcon("bi bi-diagram-3"));
    } else if (item.type === "challenge") {
      pill.classList.add("net-ico-challenge");
      pill.appendChild(createIcon("bi bi-flag"));
    } else {
      pill.classList.add("net-ico-learn");
      pill.appendChild(createIcon("bi bi-file-text"));
    }

    return pill;
  }

  // ─── Lesson preview drawer (offcanvas) ───────────────────────────────────

  function setupLessonDrawer() {
    const prevBtn = getById("lessonPrevBtn");
    const nextBtn = getById("lessonNextBtn");

    if (prevBtn) prevBtn.addEventListener("click", () => navigateLesson(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => navigateLesson(1));
  }

  function openLessonPreview(item) {
    const allItems = getAllItems();
    pageState.currentLessonIndex = allItems.indexOf(item);
    pageState.currentLesson = item;
    updateDrawerContent(item);

    const drawerEl = getById("lessonPreviewDrawer");
    if (drawerEl && window.bootstrap?.Offcanvas) {
      const offcanvas = window.bootstrap.Offcanvas.getOrCreateInstance(drawerEl);
      offcanvas.show();
    }
  }

  function updateDrawerContent(item) {
    // Header
    setTextById("lessonPreviewLabel", item.title);
    setTextById("lessonMetaTime", item.duration || "—");
    setTextById("lessonMetaXP", String(item.xpReward || 0));

    // Preview ring
    const progress = calculateCourseProgress();
    const previewRing = getById("previewRing");
    if (previewRing) {
      const circ = 163.36;
      previewRing.style.strokeDashoffset = String(circ - (progress.percent / 100) * circ);
    }
    setTextById("previewRingPct", `${progress.percent}%`);

    // Body content
    const body = getById("lessonPreviewBody");
    if (body) {
      clearChildren(body);
      if (item.content) {
        appendTextWithLineBreaks(body, item.content);
      } else {
        body.textContent = "Open the full lesson to view content.";
      }
    }

    // Open lesson button
    const openBtn = getById("lessonOpenBtn");
    if (openBtn) {
      const params = new URLSearchParams();
      params.set("course_id", String(pageState.courseId));
      params.set("lesson", String(item.lessonNumber));
      if (pageState.contentId) params.set("content_id", String(pageState.contentId));
      openBtn.href = `lesson.html?${params.toString()}`;
    }

    // Prev / Next visibility
    const allItems = getAllItems();
    const idx = allItems.indexOf(item);
    const prevBtn = getById("lessonPrevBtn");
    const nextBtn = getById("lessonNextBtn");
    if (prevBtn) prevBtn.disabled = idx <= 0;
    if (nextBtn) nextBtn.disabled = idx >= allItems.length - 1;
  }

  function navigateLesson(direction) {
    const allItems = getAllItems();
    const newIndex = pageState.currentLessonIndex + direction;
    if (newIndex < 0 || newIndex >= allItems.length) return;
    pageState.currentLessonIndex = newIndex;
    pageState.currentLesson = allItems[newIndex];
    updateDrawerContent(allItems[newIndex]);
  }

  function openLesson(item) {
    const params = new URLSearchParams();
    params.set("course_id", String(pageState.courseId));
    params.set("lesson", String(item.lessonNumber));
    if (pageState.contentId) params.set("content_id", String(pageState.contentId));
    window.location.href = `lesson.html?${params.toString()}`;
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
