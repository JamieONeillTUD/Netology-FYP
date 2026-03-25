// course.js — shows a single course's modules and lessons

(function () {
  "use strict";

  var API_BASE = (window.API_BASE || "").replace(/\/$/, "");
  var XP_SYSTEM = window.NetologyXP || null;
  var ENDPOINTS = window.ENDPOINTS || {};
  var apiGet = window.apiGet;

  var TYPE_LABELS = {
    learn: "Lesson",
    quiz: "Quiz",
    sandbox: "Sandbox",
    challenge: "Challenge"
  };

  var TYPE_TOOLTIPS = {
    learn: "Lesson — read and learn the theory",
    quiz: "Quiz — test your knowledge with questions",
    sandbox: "Sandbox — hands-on network simulation",
    challenge: "Challenge — solve a real networking problem"
  };

  var TYPE_ICONS = {
    learn: "bi-book-half",
    quiz: "bi-patch-question-fill",
    sandbox: "bi-diagram-3",
    challenge: "bi-flag-fill"
  };

  // all the page state in one place
  var pageState = {
    user: null,
    courseId: null,
    course: {
      id: null,
      title: "",
      description: "",
      difficulty: "novice",
      requiredLevel: 1,
      estimatedTime: "—",
      totalExperiencePoints: 0,
      modules: []
    },
    completedLessons: {},
    completedQuizzes: {},
    completedChallenges: {},
    completedTutorials: {},
    stats: {
      level: 1,
      rank: "Novice",
      experiencePoints: 0,
      currentLevelExperiencePoints: 0,
      experiencePointsPercent: 0,
      accessLevel: 1
    }
  };

  // read the saved user from local storage
  function readSavedUserFromLocalStorage() {
    try {
      var rawData = localStorage.getItem("netology_user") || localStorage.getItem("user");
      return rawData ? JSON.parse(rawData) : null;
    } catch (error) {
      return null;
    }
  }

  // save the user object to local storage
  function saveUserToLocalStorage(userData) {
    if (!userData) return;
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("netology_user", JSON.stringify(userData));
  }

  // safely convert a value to a number, or return the fallback
  function safeNumber(value, fallback) {
    var converted = Number(value);
    return Number.isFinite(converted) ? converted : (fallback || 0);
  }

  // set text content on an element found by id
  function setTextById(elementId, text) {
    var element = document.getElementById(elementId);
    if (element) element.textContent = String(text !== null && text !== undefined ? text : "");
  }

  // show or hide an element's d-none class
  function toggleVisibility(elementId, shouldHide) {
    var element = document.getElementById(elementId);
    if (!element) return;
    if (shouldHide) {
      element.classList.add("d-none");
    } else {
      element.classList.remove("d-none");
    }
  }

  // create an html element with a class and optional text
  function createElement(tagName, className, textContent) {
    var element = document.createElement(tagName);
    if (className) element.className = className;
    if (textContent !== undefined) element.textContent = textContent;
    return element;
  }

  // create a bootstrap icon element
  function createIconElement(iconClass) {
    var iconElement = document.createElement("i");
    iconElement.className = iconClass;
    return iconElement;
  }

  // read json safely from localStorage
  function readJsonFromStorage(storageKey) {
    try {
      var raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  // stable lesson completion key (separate from old unit-level keys)
  function buildLessonCompletionKey(unitIndex, lessonIndex) {
    return ((Number(unitIndex) + 1) * 1000) + (Number(lessonIndex) + 1);
  }

  // fetch fresh user data from the server and save it
  async function fetchFreshUserDataFromServer() {
    var savedUser = readSavedUserFromLocalStorage();
    var userEmail = "";

    if (savedUser && savedUser.email) {
      userEmail = savedUser.email;
    } else {
      userEmail = localStorage.getItem("netology_last_email") || "";
    }

    if (!userEmail) return savedUser;

    try {
      var endpoint = (ENDPOINTS.auth && ENDPOINTS.auth.userInfo) || "/user-info";
      var serverData = await apiGet(endpoint, { email: userEmail });

      if (!serverData || !serverData.success) return savedUser;

      var xpFromServer = serverData.xp !== undefined ? serverData.xp : serverData.total_xp;

      var updatedUser = {};
      if (savedUser) {
        var savedKeys = Object.keys(savedUser);
        for (var keyIndex = 0; keyIndex < savedKeys.length; keyIndex++) {
          updatedUser[savedKeys[keyIndex]] = savedUser[savedKeys[keyIndex]];
        }
      }

      updatedUser.email = userEmail;
      updatedUser.first_name = serverData.first_name || (savedUser && savedUser.first_name) || "";
      updatedUser.last_name = serverData.last_name || (savedUser && savedUser.last_name) || "";
      updatedUser.username = serverData.username || (savedUser && savedUser.username) || "";
      updatedUser.xp = safeNumber(xpFromServer, (savedUser && savedUser.xp) || 0);
      updatedUser.numeric_level = safeNumber(serverData.numeric_level, (savedUser && savedUser.numeric_level) || 1);
      updatedUser.rank = serverData.rank || serverData.level || (savedUser && savedUser.rank) || "";
      updatedUser.level = serverData.level || serverData.rank || (savedUser && savedUser.level) || "";
      updatedUser.isFirstLogin = serverData.is_first_login !== undefined
        ? Boolean(serverData.is_first_login)
        : (savedUser && savedUser.isFirstLogin);

      saveUserToLocalStorage(updatedUser);
      return updatedUser;
    } catch (error) {
      console.warn("Could not refresh user data:", error);
      return savedUser;
    }
  }

  // load course data from COURSE_CONTENT and build a clean course object
  function loadCourseDataFromContent(courseId) {
    var courseContentData = window.COURSE_CONTENT;
    if (!courseContentData) return null;

    var rawCourse = courseContentData[String(courseId)];
    if (!rawCourse) return null;

    var units = rawCourse.units || [];
    var modules = [];

    for (var unitIndex = 0; unitIndex < units.length; unitIndex++) {
      var unit = units[unitIndex];
      var items = buildItemsForUnit(unit, unitIndex);

      modules.push({
        id: "unit-" + unitIndex,
        title: unit.title || "Module",
        description: unit.about || "",
        items: items
      });
    }

    return {
      id: String(courseId),
      title: rawCourse.title || "Untitled Course",
      description: rawCourse.description || "",
      difficulty: String(rawCourse.difficulty || "novice").toLowerCase(),
      requiredLevel: Number(rawCourse.required_level || 1),
      estimatedTime: rawCourse.estimatedTime || "—",
      totalExperiencePoints: Number(rawCourse.xpReward || 0),
      modules: modules
    };
  }

  // build all items (lessons, quiz, sandbox, challenge) for a single unit
  function buildItemsForUnit(unit, unitIndex) {
    var items = [];
    var lessons = unit.lessons || [];

    for (var lessonIndex = 0; lessonIndex < lessons.length; lessonIndex++) {
      var lesson = lessons[lessonIndex];
      items.push({
        type: "learn",
        title: lesson.title || ("Lesson " + (lessonIndex + 1)),
        xpReward: Number(lesson.xp || 0),
        unitIndex: unitIndex,
        lessonIndex: lessonIndex,
        unitTitle: unit.title || "",
        completionKey: buildLessonCompletionKey(unitIndex, lessonIndex)
      });
    }

    if (unit.quiz) {
      items.push({
        type: "quiz",
        title: unit.quiz.title || "Quiz",
        xpReward: Number(unit.quiz.xp || 0),
        unitIndex: unitIndex,
        lessonIndex: null,
        unitTitle: unit.title || "",
        completionKey: unitIndex + 1
      });
    }

    if (unit.sandbox) {
      items.push({
        type: "sandbox",
        title: unit.sandbox.title || "Practice",
        xpReward: Number(unit.sandbox.xp || 0),
        unitIndex: unitIndex,
        lessonIndex: null,
        unitTitle: unit.title || "",
        completionKey: unitIndex + 1,
        steps: unit.sandbox.steps || [],
        tips: unit.sandbox.tips || ""
      });
    }

    if (unit.challenge) {
      items.push({
        type: "challenge",
        title: unit.challenge.title || "Challenge",
        xpReward: Number(unit.challenge.xp || 0),
        unitIndex: unitIndex,
        lessonIndex: null,
        unitTitle: unit.title || "",
        completionKey: unitIndex + 1,
        challengeRules: unit.challenge
      });
    }

    return items;
  }

  // collect all items from every module into one flat list
  function getAllItemsAsFlatList() {
    var allItems = [];
    var modules = pageState.course.modules;

    for (var moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
      var items = modules[moduleIndex].items;
      for (var itemIndex = 0; itemIndex < items.length; itemIndex++) {
        allItems.push(items[itemIndex]);
      }
    }

    return allItems;
  }

  // check if a single item is completed
  function isItemCompleted(item) {
    var completionKey = String(item.completionKey || (item.unitIndex + 1));
    var type = item.type;
    if (type === "quiz")      return pageState.completedQuizzes[completionKey] === true;
    if (type === "challenge") return pageState.completedChallenges[completionKey] === true;
    if (type === "sandbox")   return pageState.completedTutorials[completionKey] === true;
    return pageState.completedLessons[completionKey] === true;
  }

  function mergeCompletionArrayIntoLookup(lookup, values) {
    var list = Array.isArray(values) ? values : [];
    for (var i = 0; i < list.length; i++) {
      var numberValue = Number(list[i]);
      if (Number.isFinite(numberValue) && numberValue > 0) {
        lookup[String(numberValue)] = true;
      }
    }
  }

  function tutorialStepCountForUnit(unitIndex) {
    var module = (pageState.course.modules || [])[unitIndex];
    if (!module) return 0;
    var items = module.items || [];
    for (var itemIndex = 0; itemIndex < items.length; itemIndex++) {
      if (items[itemIndex].type === "sandbox") {
        var steps = items[itemIndex].steps || [];
        return steps.length;
      }
    }
    return 0;
  }

  function loadTutorialCompletionFromLocalStorage() {
    var userData = pageState.user;
    pageState.completedTutorials = {};
    if (!userData || !userData.email || !pageState.courseId) return;

    var prefix = "netology_tutorial_progress:" + userData.email + ":" + pageState.courseId + ":";
    var keys = Object.keys(localStorage);

    for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
      var storageKey = keys[keyIndex];
      if (storageKey.indexOf(prefix) !== 0) continue;

      var unitNumber = Number(storageKey.substring(prefix.length));
      if (!Number.isFinite(unitNumber) || unitNumber <= 0) continue;

      var saved = readJsonFromStorage(storageKey) || {};
      var checkedCount = Array.isArray(saved.checked) ? saved.checked.filter(Boolean).length : 0;
      var totalSteps = tutorialStepCountForUnit(unitNumber - 1);
      var isCompleted = Boolean(saved.completed) || (totalSteps > 0 && checkedCount >= totalSteps);
      if (isCompleted) {
        pageState.completedTutorials[String(unitNumber)] = true;
      }
    }
  }

  // count how many items in a module are done
  function countCompletedItemsInModule(module) {
    var completedCount = 0;
    var items = module.items;

    for (var itemIndex = 0; itemIndex < items.length; itemIndex++) {
      if (isItemCompleted(items[itemIndex])) {
        completedCount++;
      }
    }

    return completedCount;
  }

  // calculate overall course progress
  function calculateCourseProgress() {
    var allItems = getAllItemsAsFlatList();
    if (!allItems.length) return { percent: 0, completed: 0, total: 0, earnedExperiencePoints: 0 };

    var completedCount = 0;
    var earnedExperiencePoints = 0;

    for (var itemIndex = 0; itemIndex < allItems.length; itemIndex++) {
      var item = allItems[itemIndex];
      if (isItemCompleted(item)) {
        completedCount++;
        earnedExperiencePoints += Number(item.xpReward || 0);
      }
    }

    var percent = Math.round((completedCount / allItems.length) * 100);
    return { percent: percent, completed: completedCount, total: allItems.length, earnedExperiencePoints: earnedExperiencePoints };
  }

  // load which lessons, quizzes, and challenges the user has finished
  async function loadCompletionStatusFromServer() {
    var userData = pageState.user;
    if (!userData || !userData.email || !pageState.courseId) return;

    pageState.completedLessons = {};
    pageState.completedQuizzes = {};
    pageState.completedChallenges = {};
    pageState.completedTutorials = {};

    try {
      var endpoint = (ENDPOINTS.courses && ENDPOINTS.courses.userCourseStatus) || "/user-course-status";
      var requestUrl = API_BASE + endpoint
        + "?email=" + encodeURIComponent(userData.email)
        + "&course_id=" + pageState.courseId;
      var response = await fetch(requestUrl);
      var serverData = await response.json();

      if (serverData && serverData.success) {
        var lessonNumbers = serverData.lessons || [];
        var quizNumbers = serverData.quizzes || [];
        var challengeNumbers = serverData.challenges || [];

        mergeCompletionArrayIntoLookup(pageState.completedLessons, lessonNumbers);
        mergeCompletionArrayIntoLookup(pageState.completedQuizzes, quizNumbers);
        mergeCompletionArrayIntoLookup(pageState.completedChallenges, challengeNumbers);
      }
    } catch (error) {
      console.warn("Could not load completion status:", error);
    }

    loadTutorialCompletionFromLocalStorage();
  }

  // calculate and store the user's level and xp stats
  function calculateUserStats(userData) {
    if (!userData) return;

    var resolved = (XP_SYSTEM && typeof XP_SYSTEM.resolveUserProgress === "function")
      ? XP_SYSTEM.resolveUserProgress(userData)
      : null;
    var userLevel = resolved ? Number(resolved.level || 1) : Number(userData.numeric_level || userData.level || 1);
    var totalExperiencePoints = Number(userData.xp || (resolved ? resolved.totalXp : 0) || 0);

    if (XP_SYSTEM && XP_SYSTEM.getLevelInfo) {
      var levelInfo = XP_SYSTEM.getLevelInfo(userLevel) || {};
      var experiencePointsToLevel = levelInfo.xpToLevel || 0;
      var experiencePointsToNext = levelInfo.xpToNext || 1000;
      var progressInLevel = totalExperiencePoints - experiencePointsToLevel;
      var progressPercent = Math.round((progressInLevel / experiencePointsToNext) * 100);

      pageState.stats = {
        level: userLevel,
        rank: levelInfo.rank || "Novice",
        experiencePoints: totalExperiencePoints,
        currentLevelExperiencePoints: progressInLevel,
        experiencePointsPercent: Math.min(100, Math.max(0, progressPercent)),
        accessLevel: levelInfo.level || 1
      };
    }
  }

  // build the url for a lesson item
  function buildLessonUrl(item) {
    var courseId = String(pageState.courseId);
    var unitIndex = item.unitIndex;

    if (item.type === "learn") {
      var lessonParams = new URLSearchParams({
        course: courseId,
        unit: String(unitIndex),
        lesson: String(item.lessonIndex)
      });
      return "lesson.html?" + lessonParams;
    }

    if (item.type === "quiz") {
      var quizParams = new URLSearchParams({
        course: courseId,
        unit: String(unitIndex)
      });
      return "quiz.html?" + quizParams;
    }

    if (item.type === "sandbox") {
      return buildSandboxUrl(courseId, unitIndex, "practice", "netology_active_tutorial", {
        steps: item.steps || [],
        tips: item.tips || "",
        xp: item.xpReward || 0
      });
    }

    if (item.type === "challenge") {
      var challengePayload = {};
      var sourceChallenge = item.challengeRules || {};
      var challengeKeys = Object.keys(sourceChallenge);
      for (var challengeKeyIndex = 0; challengeKeyIndex < challengeKeys.length; challengeKeyIndex++) {
        var challengeKey = challengeKeys[challengeKeyIndex];
        challengePayload[challengeKey] = sourceChallenge[challengeKey];
      }
      if (!Number(challengePayload.xp)) {
        challengePayload.xp = Number(item.xpReward || 0);
      }
      return buildSandboxUrl(courseId, unitIndex, "challenge", "netology_active_challenge", {
        title: challengePayload.title || item.title || "Challenge",
        description: challengePayload.description || "",
        rules: challengePayload.rules || {},
        steps: challengePayload.steps || [],
        checks: challengePayload.checks || [],
        tips: challengePayload.tips || "",
        xp: challengePayload.xp
      });
    }

    return "courses.html";
  }

  // save sandbox or challenge data to local storage and return the url
  function buildSandboxUrl(courseId, unitIndex, mode, storageKey, extraData) {
    var dataToStore = {
      courseId: courseId,
      unit: unitIndex,
      courseTitle: pageState.course.title || ""
    };

    var extraKeys = Object.keys(extraData || {});
    for (var keyIndex = 0; keyIndex < extraKeys.length; keyIndex++) {
      var key = extraKeys[keyIndex];
      dataToStore[key] = extraData[key];
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
    } catch (error) {}

    var sandboxParams = new URLSearchParams({
      course: courseId,
      unit: String(unitIndex),
      mode: mode
    });
    return "sandbox.html?" + sandboxParams;
  }

  // navigate to a lesson, quiz, sandbox, or challenge
  function navigateToItem(item) {
    window.location.href = buildLessonUrl(item);
  }

  // point logo and brand links to dashboard or home
  function setupBrandLinks() {
    var savedUser = readSavedUserFromLocalStorage();
    var targetPage = (savedUser && (savedUser.email || savedUser.username)) ? "dashboard.html" : "index.html";

    var topBrandLink = document.getElementById("brandHome");
    var sideBrandLink = document.getElementById("sideBrandHome");
    var backLink = document.getElementById("backLink");

    if (topBrandLink) topBrandLink.setAttribute("href", targetPage);
    if (sideBrandLink) sideBrandLink.setAttribute("href", targetPage);
    if (backLink) backLink.setAttribute("href", targetPage);
  }

  // render the course title, difficulty pill, stats, and progress ring
  function renderCourseHeader() {
    var course = pageState.course;

    setTextById("courseTitle", course.title || "Course");
    setTextById("courseDescription", course.description || "");
    setTextById("breadcrumbCourse", course.title || "Course");

    var difficultyPill = document.getElementById("difficultyPill");
    if (difficultyPill) {
      var difficultyLabel = course.difficulty || "novice";
      difficultyPill.textContent = difficultyLabel.charAt(0).toUpperCase() + difficultyLabel.slice(1);
      difficultyPill.className = "crs-pill crs-" + difficultyLabel;
    }

    var moduleCount = course.modules.length;
    var modulePlural = moduleCount !== 1 ? "s" : "";
    setTextById("metaModules", moduleCount + " module" + modulePlural);
    setTextById("metaTime", course.estimatedTime || "—");
    setTextById("metaXP", course.totalExperiencePoints + " XP");
    setTextById("moduleCountLabel", moduleCount + " module" + modulePlural);

    var progress = calculateCourseProgress();
    renderProgressIndicators(progress);
    renderUpNextSection(progress);
  }

  // fill in the progress ring, bar, and locked/active/completed pills
  function renderProgressIndicators(progress) {
    var progressPercent = progress.percent;

    var progressRing = document.getElementById("progressRing");
    if (progressRing) {
      progressRing.style.strokeDashoffset = String(314.16 - (progressPercent / 100) * 314.16);
    }

    setTextById("progressPct", progressPercent + "%");
    setTextById("progressText", progressPercent + "%");
    setTextById("progressCount", progress.completed + "/" + progress.total);

    var progressBar = document.getElementById("progressBar");
    if (progressBar) progressBar.style.width = progressPercent + "%";

    var userLevel = pageState.stats.accessLevel || (pageState.user && pageState.user.numeric_level) || 1;
    var requiredLevel = pageState.course.requiredLevel || 1;
    var isCourseLocked = Number(userLevel) < Number(requiredLevel);

    toggleVisibility("courseLockedPill", !isCourseLocked);
    toggleVisibility("courseActivePill", isCourseLocked || progressPercent === 0 || progressPercent === 100);
    toggleVisibility("courseCompletedPill", progressPercent < 100);
    toggleVisibility("lockedExplainer", !isCourseLocked);

    if (isCourseLocked) {
      setTextById("lockedText", "Requires Level " + requiredLevel + " to unlock.");
    }
  }

  // show what lesson is up next and wire continue/review buttons
  function renderUpNextSection(progress) {
    var allItems = getAllItemsAsFlatList();

    var nextItem = null;
    for (var itemIndex = 0; itemIndex < allItems.length; itemIndex++) {
      if (!isItemCompleted(allItems[itemIndex])) {
        nextItem = allItems[itemIndex];
        break;
      }
    }

    var isCourseComplete = progress.percent === 100;

    setTextById("nextStepText", nextItem ? nextItem.title : "All done!");
    setTextById("sidePct", progress.percent + "%");
    setTextById("sideModules", pageState.course.modules.length + "/" + pageState.course.modules.length);
    setTextById("sideXPEarned", String(progress.earnedExperiencePoints));

    var continueButton = document.getElementById("continueBtn");
    if (continueButton) {
      continueButton.onclick = function () {
        var targetItem = nextItem || allItems[0];
        if (targetItem) navigateToItem(targetItem);
      };
    }

    var reviewButton = document.getElementById("reviewBtn");
    if (reviewButton) {
      toggleVisibility("reviewBtn", !isCourseComplete);
      if (isCourseComplete) {
        reviewButton.onclick = function () {
          if (allItems[0]) navigateToItem(allItems[0]);
        };
      }
    }
  }

  // render the module tabs and the first incomplete module's panel
  function renderModuleTabs() {
    var tabsContainer = document.getElementById("moduleTabs");
    var panelContainer = document.getElementById("modulePanel");
    if (!tabsContainer || !panelContainer) return;

    tabsContainer.innerHTML = "";
    panelContainer.innerHTML = "";

    var modules = pageState.course.modules;
    if (!modules.length) {
      toggleVisibility("modulesEmpty", false);
      return;
    }

    var activeModuleIndex = 0;
    for (var findIndex = 0; findIndex < modules.length; findIndex++) {
      if (countCompletedItemsInModule(modules[findIndex]) < modules[findIndex].items.length) {
        activeModuleIndex = findIndex;
        break;
      }
    }

    for (var tabIndex = 0; tabIndex < modules.length; tabIndex++) {
      var module = modules[tabIndex];
      var completedInModule = countCompletedItemsInModule(module);
      var totalInModule = module.items.length;
      var allItemsDone = completedInModule === totalInModule;

      var tabButton = createElement("button", "crs-mod-tab");
      tabButton.setAttribute("role", "tab");
      tabButton.setAttribute("aria-selected", tabIndex === activeModuleIndex ? "true" : "false");
      tabButton.dataset.index = String(tabIndex);

      if (tabIndex === activeModuleIndex) {
        tabButton.classList.add("is-active");
      }

      var tabLabel = createElement("span", "crs-mod-tab-label", "Module " + (tabIndex + 1));
      var countClass = "crs-mod-tab-count" + (allItemsDone ? " is-done" : "");
      var tabCount = createElement("span", countClass, completedInModule + "/" + totalInModule);

      tabButton.appendChild(tabLabel);
      tabButton.appendChild(tabCount);

      (function (moduleIndex) {
        tabButton.addEventListener("click", function () {
          selectModuleTab(moduleIndex);
        });
      })(tabIndex);

      tabsContainer.appendChild(tabButton);
    }

    showModulePanel(activeModuleIndex);
  }

  // highlight the clicked tab and show its panel
  function selectModuleTab(selectedIndex) {
    var tabsContainer = document.getElementById("moduleTabs");
    if (tabsContainer) {
      var allTabs = tabsContainer.querySelectorAll(".crs-mod-tab");
      for (var tabIndex = 0; tabIndex < allTabs.length; tabIndex++) {
        var isActive = tabIndex === selectedIndex;
        if (isActive) {
          allTabs[tabIndex].classList.add("is-active");
        } else {
          allTabs[tabIndex].classList.remove("is-active");
        }
        allTabs[tabIndex].setAttribute("aria-selected", String(isActive));
      }
    }

    showModulePanel(selectedIndex);
  }

  // render one module's header and lesson list into the panel
  function showModulePanel(moduleIndex) {
    var panelContainer = document.getElementById("modulePanel");
    if (!panelContainer) return;

    var module = pageState.course.modules[moduleIndex];
    if (!module) return;

    panelContainer.innerHTML = "";

    var completedInModule = countCompletedItemsInModule(module);
    var totalInModule = module.items.length;
    var allDone = completedInModule === totalInModule;

    var headerElement = createElement("div", "crs-module-header");
    var titleRowElement = createElement("div", "crs-module-title-row");

    var titleElement = createElement("h3", "crs-module-title", module.title);
    var progressClass = "crs-module-prog" + (allDone ? " is-done" : "");
    var progressLabel = createElement("span", progressClass, completedInModule + "/" + totalInModule + " done");

    titleRowElement.appendChild(titleElement);
    titleRowElement.appendChild(progressLabel);
    headerElement.appendChild(titleRowElement);

    if (module.description) {
      var descriptionElement = createElement("p", "crs-module-desc", module.description);
      headerElement.appendChild(descriptionElement);
    }

    panelContainer.appendChild(headerElement);

    var itemListElement = createElement("div", "crs-module-items");
    var items = module.items;

    for (var itemIndex = 0; itemIndex < items.length; itemIndex++) {
      var lessonRow = buildLessonRow(items[itemIndex]);
      itemListElement.appendChild(lessonRow);
    }

    panelContainer.appendChild(itemListElement);
  }

  // build one lesson/quiz/sandbox/challenge row
  function buildLessonRow(item) {
    var isCompleted = isItemCompleted(item);
    var itemUrl = buildLessonUrl(item);
    var itemType = item.type || "learn";

    var rowElement = createElement("div", "crs-lesson" + (isCompleted ? " is-completed" : ""));

    var iconWrap = buildItemIcon(item, isCompleted);
    rowElement.appendChild(iconWrap);

    var bodyElement = createElement("div", "crs-lesson-body");
    var titleElement = createElement("div", "crs-lesson-title", item.title);
    var metaText = item.xpReward ? (item.xpReward + " XP") : "";
    var metaElement = createElement("div", "crs-lesson-meta", metaText);
    bodyElement.appendChild(titleElement);
    bodyElement.appendChild(metaElement);
    rowElement.appendChild(bodyElement);

    var badgeElement = createElement("span", "crs-lesson-type crs-type--" + itemType, TYPE_LABELS[itemType] || "Lesson");
    badgeElement.title = TYPE_TOOLTIPS[itemType] || "Read through this lesson";
    rowElement.appendChild(badgeElement);

    if (isCompleted) {
      rowElement.appendChild(createIconElement("bi bi-check2-circle crs-done-tick"));
    }

    var openButtonElement = createElement("a", "crs-open-btn");
    openButtonElement.href = itemUrl;
    openButtonElement.title = "Open lesson";
    openButtonElement.setAttribute("aria-label", "Open " + item.title);
    openButtonElement.appendChild(createIconElement("bi bi-arrow-right"));
    openButtonElement.addEventListener("click", function (event) {
      event.stopPropagation();
    });
    rowElement.appendChild(openButtonElement);

    (function (url) {
      rowElement.addEventListener("click", function () {
        window.location.href = url;
      });
    })(itemUrl);

    return rowElement;
  }

  // return the right icon element for a lesson row
  function buildItemIcon(item, isCompleted) {
    var itemType = item.type || "learn";

    if (isCompleted) {
      var doneWrap = createElement("div", "crs-ico crs-ico--done");
      doneWrap.appendChild(createIconElement("bi bi-check2-circle"));
      return doneWrap;
    }

    var iconClass = TYPE_ICONS[itemType] || TYPE_ICONS.learn;
    var wrap = createElement("div", "crs-ico crs-ico--" + itemType);
    wrap.appendChild(createIconElement("bi " + iconClass));
    return wrap;
  }

  // main entry point, runs when the page loads
  async function initialiseCoursePage() {
    var urlParams = new URLSearchParams(window.location.search);
    pageState.courseId = urlParams.get("id") || urlParams.get("course") || urlParams.get("course_id") || "1";

    var savedUser = readSavedUserFromLocalStorage();
    pageState.user = savedUser;

    setupBrandLinks();

    if (savedUser && (savedUser.email || savedUser.username)) {
      window.NetologyNav.displayNavUser(savedUser);
      calculateUserStats(savedUser);
    }

    var courseData = loadCourseDataFromContent(pageState.courseId);
    if (courseData) {
      pageState.course = courseData;
    } else {
      console.warn("Could not load course data for id:", pageState.courseId);
    }

    var freshUserData = await fetchFreshUserDataFromServer();
    pageState.user = freshUserData;

    if (freshUserData) {
      window.NetologyNav.displayNavUser(freshUserData);
      calculateUserStats(freshUserData);
    }

    await loadCompletionStatusFromServer();

    renderCourseHeader();
    renderModuleTabs();

    document.body.classList.remove("net-loading");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initialiseCoursePage();
    }, { once: true });
  } else {
    initialiseCoursePage();
  }
})();
