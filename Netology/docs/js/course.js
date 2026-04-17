/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

course.js - Single Course Page

This file runs the course.html page. It loads a single course by ID
from COURSE_CONTENT, fetches the user's completion status from the
backend, and renders the full course view.

The page has three main areas:
A header with the course title, difficulty, estimated time, XP reward,
and a progress ring showing how far through the course the user is.

An Up Next panel showing the next incomplete item and a continue button.

A module tab panel where each tab shows that module's lessons, quiz, 
sandbox, and challenge as a list of clickable rows.

Clicking any row navigates to lesson.html, quiz.html, or sandbox.html
with the right query parameters. For sandbox and challenge items the
activity data is also saved to localStorage before navigating.
*/

(function () {
  "use strict";

  var API_BASE = (window.API_BASE || "").replace(/\/$/, "");
  var XP_SYSTEM = window.NetologyXP || null;
  var ENDPOINTS = window.ENDPOINTS || {};
  var apiGet = window.apiGet;

  // Labels, tooltips, and icons for each item type in the lesson list.
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

  // All mutable state for the page lives here.
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

  // Read the saved user object from localStorage.
  function readSavedUserFromLocalStorage() {
    try {
      var raw = localStorage.getItem("netology_user") || localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Write the user object to both localStorage keys.
  function saveUserToLocalStorage(userData) {
    if (!userData) { return; }
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("netology_user", JSON.stringify(userData));
  }

  // Convert a value to a finite number, returning fallback if it is not valid.
  function safeNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  // Set the text content of an element found by id.
  function setTextById(id, text) {
    var el = document.getElementById(id);
    if (el) { el.textContent = String(text !== null && text !== undefined ? text : ""); }
  }

  // Add or remove Bootstrap's d-none class to show or hide an element.
  function toggleVisibility(id, shouldHide) {
    var el = document.getElementById(id);
    if (!el) { return; }
    el.classList.toggle("d-none", shouldHide);
  }

  // Create a DOM element with an optional class name and text content.
  function createElement(tag, className, text) {
    var el = document.createElement(tag);
    if (className) { el.className = className; }
    if (text !== undefined) { el.textContent = text; }
    return el;
  }

  // Create a Bootstrap icon element.
  function createIconElement(iconClass) {
    var el = document.createElement("i");
    el.className = iconClass;
    return el;
  }

  // Read and parse a JSON value from localStorage, returning null on failure.
  function readJsonFromStorage(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Build the numeric completion key for a specific lesson.
  // Each lesson gets a unique integer: (unit + 1) * 1000 + (lesson + 1).
  function buildLessonCompletionKey(unitIndex, lessonIndex) {
    return ((Number(unitIndex) + 1) * 1000) + (Number(lessonIndex) + 1);
  }

  // Fetch fresh user data from the server and update localStorage.
  // Falls back to the locally saved user if the request fails.
  async function fetchFreshUserDataFromServer() {
    var savedUser = readSavedUserFromLocalStorage();
    var email = (savedUser && savedUser.email)
      ? savedUser.email
      : (localStorage.getItem("netology_last_email") || "");
    if (!email) { return savedUser; }

    try {
      var endpoint = (ENDPOINTS.auth && ENDPOINTS.auth.userInfo) || "/user-info";
      var serverData = await apiGet(endpoint, { email: email });
      if (!serverData || !serverData.success) { return savedUser; }

      var xpFromServer = serverData.xp !== undefined ? serverData.xp : serverData.total_xp;

      var updated = Object.assign({}, savedUser, {
        email: email,
        first_name: serverData.first_name || (savedUser && savedUser.first_name) || "",
        last_name: serverData.last_name || (savedUser && savedUser.last_name) || "",
        username: serverData.username || (savedUser && savedUser.username) || "",
        xp: safeNumber(xpFromServer, (savedUser && savedUser.xp) || 0),
        numeric_level: safeNumber(serverData.numeric_level, (savedUser && savedUser.numeric_level) || 1),
        rank: serverData.rank || serverData.level || (savedUser && savedUser.rank) || "",
        level: serverData.level || serverData.rank || (savedUser && savedUser.level) || "",
        isFirstLogin: serverData.is_first_login !== undefined
          ? Boolean(serverData.is_first_login)
          : (savedUser && savedUser.isFirstLogin)
      });

      saveUserToLocalStorage(updated);
      return updated;
    } catch (e) {
      console.warn("Could not refresh user data:", e);
      return savedUser;
    }
  }

  // Load course data from COURSE_CONTENT and return a clean course object.
  function loadCourseDataFromContent(courseId) {
    var content = window.COURSE_CONTENT;
    if (!content) { return null; }
    var raw = content[String(courseId)];
    if (!raw) { return null; }

    var modules = (raw.units || []).map(function (unit, unitIndex) {
      return {
        id: "unit-" + unitIndex,
        title: unit.title || "Module",
        description: unit.about || "",
        items: buildItemsForUnit(unit, unitIndex)
      };
    });

    return {
      id: String(courseId),
      title: raw.title || "Untitled Course",
      description: raw.description || "",
      difficulty: String(raw.difficulty || "novice").toLowerCase(),
      requiredLevel: Number(raw.required_level || 1),
      estimatedTime: raw.estimatedTime || "—",
      totalExperiencePoints: Number(raw.xpReward || 0),
      modules: modules
    };
  }

  // Build the items list (lessons, quiz, sandbox, challenge) for one unit.
  function buildItemsForUnit(unit, unitIndex) {
    var items = [];

    (unit.lessons || []).forEach(function (lesson, lessonIndex) {
      items.push({
        type: "learn",
        title: lesson.title || ("Lesson " + (lessonIndex + 1)),
        xpReward: Number(lesson.xp || 0),
        unitIndex: unitIndex,
        lessonIndex: lessonIndex,
        unitTitle: unit.title || "",
        completionKey: buildLessonCompletionKey(unitIndex, lessonIndex)
      });
    });

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

  // Flatten every item from every module into one ordered list.
  function getAllItemsAsFlatList() {
    var all = [];
    pageState.course.modules.forEach(function (mod) {
      mod.items.forEach(function (item) { all.push(item); });
    });
    return all;
  }

  // Return true if a given item has been marked as complete.
  function isItemCompleted(item) {
    var key = String(item.completionKey || (item.unitIndex + 1));
    var type = item.type;
    if (type === "quiz") { return pageState.completedQuizzes[key] === true; }
    if (type === "challenge") { return pageState.completedChallenges[key] === true; }
    if (type === "sandbox") { return pageState.completedTutorials[key] === true; }
    return pageState.completedLessons[key] === true;
  }

  // Add a list of numeric completion keys into a lookup object.
  function mergeCompletionArrayIntoLookup(lookup, values) {
    var list = Array.isArray(values) ? values : [];
    for (var i = 0; i < list.length; i++) {
      var n = Number(list[i]);
      if (Number.isFinite(n) && n > 0) { lookup[String(n)] = true; }
    }
  }

  // Return the number of sandbox steps defined for a given unit index.
  function tutorialStepCountForUnit(unitIndex) {
    var mod = (pageState.course.modules || [])[unitIndex];
    if (!mod) { return 0; }
    for (var i = 0; i < mod.items.length; i++) {
      if (mod.items[i].type === "sandbox") {
        return (mod.items[i].steps || []).length;
      }
    }
    return 0;
  }

  // Check localStorage for sandbox tutorial progress and mark completed units.
  // A tutorial counts as done if completed is true, or all steps are checked.
  function loadTutorialCompletionFromLocalStorage() {
    var user = pageState.user;
    pageState.completedTutorials = {};
    if (!user || !user.email || !pageState.courseId) { return; }

    var prefix = "netology_tutorial_progress:" + user.email + ":" + pageState.courseId + ":";
    Object.keys(localStorage).forEach(function (storageKey) {
      if (storageKey.indexOf(prefix) !== 0) { return; }
      var unitNumber = Number(storageKey.substring(prefix.length));
      if (!Number.isFinite(unitNumber) || unitNumber <= 0) { return; }
      var saved = readJsonFromStorage(storageKey) || {};
      var checkedCount = Array.isArray(saved.checked) ? saved.checked.filter(Boolean).length : 0;
      var totalSteps = tutorialStepCountForUnit(unitNumber - 1);
      var isDone = Boolean(saved.completed) || (totalSteps > 0 && checkedCount >= totalSteps);
      if (isDone) { pageState.completedTutorials[String(unitNumber)] = true; }
    });
  }

  // Count how many items in a module the user has completed.
  function countCompletedItemsInModule(module) {
    return module.items.filter(function (item) { return isItemCompleted(item); }).length;
  }

  // Count completed items and total XP earned across the whole course.
  function calculateCourseProgress() {
    var all = getAllItemsAsFlatList();
    if (!all.length) { return { percent: 0, completed: 0, total: 0, earnedExperiencePoints: 0 }; }

    var completed = 0;
    var earned = 0;
    all.forEach(function (item) {
      if (isItemCompleted(item)) {
        completed++;
        earned += Number(item.xpReward || 0);
      }
    });

    return {
      percent: Math.round((completed / all.length) * 100),
      completed: completed,
      total: all.length,
      earnedExperiencePoints: earned
    };
  }

  // Fetch lesson, quiz, and challenge completion from the server.
  async function loadCompletionStatusFromServer() {
    var user = pageState.user;
    if (!user || !user.email || !pageState.courseId) { return; }

    pageState.completedLessons = {};
    pageState.completedQuizzes = {};
    pageState.completedChallenges = {};
    pageState.completedTutorials = {};

    try {
      var endpoint = (ENDPOINTS.courses && ENDPOINTS.courses.userCourseStatus) || "/user-course-status";
      var url = API_BASE + endpoint
        + "?email=" + encodeURIComponent(user.email)
        + "&course_id=" + pageState.courseId;
      var data = await (await fetch(url)).json();
      if (data && data.success) {
        mergeCompletionArrayIntoLookup(pageState.completedLessons, data.lessons || []);
        mergeCompletionArrayIntoLookup(pageState.completedQuizzes, data.quizzes || []);
        mergeCompletionArrayIntoLookup(pageState.completedChallenges, data.challenges || []);
      }
    } catch (e) {
      console.warn("Could not load completion status:", e);
    }

    loadTutorialCompletionFromLocalStorage();
  }

  // Calculate the user's level, rank, and XP stats and store them in pageState.stats.
  // Uses the shared NetologyXP module so the maths is always consistent.
  function calculateUserStats(userData) {
    if (!userData) { return; }
    var resolved = (XP_SYSTEM && XP_SYSTEM.resolveUserProgress)
      ? XP_SYSTEM.resolveUserProgress(userData)
      : null;
    pageState.stats = {
      level: resolved ? Number(resolved.level || 1) : Number(userData.numeric_level || 1),
      rank: resolved ? String(resolved.rank || "Novice") : String(userData.rank || "Novice"),
      experiencePoints: resolved ? Number(resolved.totalXp || 0) : Number(userData.xp || 0),
      currentLevelExperiencePoints: resolved ? Number(resolved.xpIntoLevel || 0) : 0,
      experiencePointsPercent: resolved ? Number(resolved.progressPercent || 0) : 0,
      accessLevel: resolved ? Number(resolved.level || 1) : Number(userData.numeric_level || 1)
    };
  }

  // Build the URL for a lesson, quiz, sandbox, or challenge item.
  function buildLessonUrl(item) {
    var courseId = String(pageState.courseId);
    var unitIndex = item.unitIndex;

    if (item.type === "learn") {
      return "lesson.html?" + new URLSearchParams({
        course: courseId,
        unit: String(unitIndex),
        lesson: String(item.lessonIndex)
      });
    }

    if (item.type === "quiz") {
      return "quiz.html?" + new URLSearchParams({
        course: courseId,
        unit: String(unitIndex)
      });
    }

    if (item.type === "sandbox") {
      return buildSandboxUrl(courseId, unitIndex, "practice", "netology_active_tutorial", {
        title: item.title || "Tutorial",
        steps: item.steps || [],
        tips: item.tips || "",
        xp: item.xpReward || 0
      });
    }

    if (item.type === "challenge") {
      var payload = Object.assign({}, item.challengeRules || {});
      if (!Number(payload.xp)) { payload.xp = Number(item.xpReward || 0); }
      return buildSandboxUrl(courseId, unitIndex, "challenge", "netology_active_challenge", {
        title: payload.title || item.title || "Challenge",
        description: payload.description || "",
        rules: payload.rules || {},
        steps: payload.steps || [],
        checks: payload.checks || [],
        tips: payload.tips || "",
        xp: payload.xp
      });
    }

    return "courses.html";
  }

  // Save sandbox or challenge data to localStorage and return the sandbox URL.
  function buildSandboxUrl(courseId, unitIndex, mode, storageKey, extraData) {
    var data = Object.assign({
      courseId: courseId,
      unit: unitIndex,
      courseTitle: pageState.course.title || ""
    }, extraData || {});
    try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch (e) {}
    return "sandbox.html?" + new URLSearchParams({ course: courseId, unit: String(unitIndex), mode: mode });
  }

  // Navigate to the page for a given item.
  function navigateToItem(item) {
    window.location.href = buildLessonUrl(item);
  }

  // Point the logo, sidebar brand, and back link to dashboard if the user is
  // logged in, or to the landing page if not.
  function setupBrandLinks() {
    var user = readSavedUserFromLocalStorage();
    var target = (user && (user.email || user.username)) ? "dashboard.html" : "index.html";
    ["brandHome", "sideBrandHome", "backLink"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.setAttribute("href", target); }
    });
  }

  // Render the course title, difficulty pill, metadata, and progress indicators.
  function renderCourseHeader() {
    var course = pageState.course;

    setTextById("courseTitle", course.title || "Course");
    setTextById("courseDescription", course.description || "");
    setTextById("breadcrumbCourse", course.title || "Course");

    var pill = document.getElementById("difficultyPill");
    if (pill) {
      var d = course.difficulty || "novice";
      pill.textContent = d.charAt(0).toUpperCase() + d.slice(1);
      pill.className = "crs-pill crs-" + d;
    }

    var modCount = course.modules.length;
    var modLabel = modCount + " module" + (modCount !== 1 ? "s" : "");
    setTextById("metaModules", modLabel);
    setTextById("metaTime", course.estimatedTime || "—");
    setTextById("metaXP", course.totalExperiencePoints + " XP");
    setTextById("moduleCountLabel", modLabel);

    var progress = calculateCourseProgress();
    renderProgressIndicators(progress);
    renderUpNextSection(progress);
  }

  // Fill in the progress ring, bar, and status pills.
  function renderProgressIndicators(progress) {
    var pct = progress.percent;

    var ring = document.getElementById("progressRing");
    if (ring) { ring.style.strokeDashoffset = String(314.16 - (pct / 100) * 314.16); }

    setTextById("progressPct", pct + "%");
    setTextById("progressText", pct + "%");
    setTextById("progressCount", progress.completed + "/" + progress.total);

    var bar = document.getElementById("progressBar");
    if (bar) { bar.style.width = pct + "%"; }

    var userLevel = pageState.stats.accessLevel || (pageState.user && pageState.user.numeric_level) || 1;
    var reqLevel = pageState.course.requiredLevel || 1;
    var isLocked = Number(userLevel) < Number(reqLevel);

    toggleVisibility("courseLockedPill", !isLocked);
    toggleVisibility("courseActivePill", isLocked || pct === 0 || pct === 100);
    toggleVisibility("courseCompletedPill", pct < 100);
    toggleVisibility("lockedExplainer", !isLocked);

    if (isLocked) { setTextById("lockedText", "Requires Level " + reqLevel + " to unlock."); }
  }

  // Show the next incomplete item and wire up the continue and review buttons.
  function renderUpNextSection(progress) {
    var all = getAllItemsAsFlatList();
    var nextItem = null;
    for (var i = 0; i < all.length; i++) {
      if (!isItemCompleted(all[i])) { nextItem = all[i]; break; }
    }

    var isDone = progress.percent === 100;

    setTextById("nextStepText", nextItem ? nextItem.title : "All done!");
    setTextById("sidePct", progress.percent + "%");
    setTextById("sideModules", pageState.course.modules.length + "/" + pageState.course.modules.length);
    setTextById("sideXPEarned", String(progress.earnedExperiencePoints));

    var continueBtn = document.getElementById("continueBtn");
    if (continueBtn) {
      continueBtn.onclick = function () {
        var target = nextItem || all[0];
        if (target) { navigateToItem(target); }
      };
    }

    var reviewBtn = document.getElementById("reviewBtn");
    if (reviewBtn) {
      toggleVisibility("reviewBtn", !isDone);
      if (isDone) {
        reviewBtn.onclick = function () { if (all[0]) { navigateToItem(all[0]); } };
      }
    }
  }

  // Render the module tabs and open the first incomplete module.
  function renderModuleTabs() {
    var tabsEl = document.getElementById("moduleTabs");
    var panelEl = document.getElementById("modulePanel");
    if (!tabsEl || !panelEl) { return; }

    tabsEl.innerHTML = "";
    panelEl.innerHTML = "";

    var modules = pageState.course.modules;
    if (!modules.length) { toggleVisibility("modulesEmpty", false); return; }

    // Find the first module that still has incomplete items.
    var activeIndex = 0;
    for (var i = 0; i < modules.length; i++) {
      if (countCompletedItemsInModule(modules[i]) < modules[i].items.length) {
        activeIndex = i;
        break;
      }
    }

    modules.forEach(function (module, tabIndex) {
      var done = countCompletedItemsInModule(module);
      var total = module.items.length;

      var tab = createElement("button", "crs-mod-tab");
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", tabIndex === activeIndex ? "true" : "false");
      tab.dataset.index = String(tabIndex);
      if (tabIndex === activeIndex) { tab.classList.add("is-active"); }

      tab.appendChild(createElement("span", "crs-mod-tab-label", "Module " + (tabIndex + 1)));
      tab.appendChild(createElement("span", "crs-mod-tab-count" + (done === total ? " is-done" : ""), done + "/" + total));

      tab.addEventListener("click", (function (idx) {
        return function () { selectModuleTab(idx); };
      })(tabIndex));

      tabsEl.appendChild(tab);
    });

    showModulePanel(activeIndex);
  }

  // Highlight the selected tab and show its panel.
  function selectModuleTab(selectedIndex) {
    var tabsEl = document.getElementById("moduleTabs");
    if (tabsEl) {
      var tabs = tabsEl.querySelectorAll(".crs-mod-tab");
      for (var i = 0; i < tabs.length; i++) {
        var isActive = i === selectedIndex;
        tabs[i].classList.toggle("is-active", isActive);
        tabs[i].setAttribute("aria-selected", String(isActive));
      }
    }
    showModulePanel(selectedIndex);
  }

  // Render one module's header and item list into the panel.
  function showModulePanel(moduleIndex) {
    var panelEl = document.getElementById("modulePanel");
    if (!panelEl) { return; }

    var module = pageState.course.modules[moduleIndex];
    if (!module) { return; }

    panelEl.innerHTML = "";

    var done = countCompletedItemsInModule(module);
    var total = module.items.length;

    var header = createElement("div", "crs-module-header");
    var titleRow = createElement("div", "crs-module-title-row");
    titleRow.appendChild(createElement("h3", "crs-module-title", module.title));
    titleRow.appendChild(createElement("span", "crs-module-prog" + (done === total ? " is-done" : ""), done + "/" + total + " done"));
    header.appendChild(titleRow);
    if (module.description) {
      header.appendChild(createElement("p", "crs-module-desc", module.description));
    }
    panelEl.appendChild(header);

    var list = createElement("div", "crs-module-items");
    module.items.forEach(function (item) { list.appendChild(buildLessonRow(item)); });
    panelEl.appendChild(list);
  }

  // Build a single lesson, quiz, sandbox, or challenge row element.
  function buildLessonRow(item) {
    var isCompleted = isItemCompleted(item);
    var itemUrl = buildLessonUrl(item);
    var itemType = item.type || "learn";

    var row = createElement("div", "crs-lesson" + (isCompleted ? " is-completed" : ""));
    row.appendChild(buildItemIcon(item, isCompleted));

    var body = createElement("div", "crs-lesson-body");
    body.appendChild(createElement("div", "crs-lesson-title", item.title));
    body.appendChild(createElement("div", "crs-lesson-meta", item.xpReward ? (item.xpReward + " XP") : ""));
    row.appendChild(body);

    var badge = createElement("span", "crs-lesson-type crs-type--" + itemType, TYPE_LABELS[itemType] || "Lesson");
    badge.title = TYPE_TOOLTIPS[itemType] || "";
    row.appendChild(badge);

    if (isCompleted) { row.appendChild(createIconElement("bi bi-check2-circle crs-done-tick")); }

    // Arrow button links directly to the item URL.
    var openBtn = createElement("a", "crs-open-btn");
    openBtn.href = itemUrl;
    openBtn.title = "Open lesson";
    openBtn.setAttribute("aria-label", "Open " + item.title);
    openBtn.appendChild(createIconElement("bi bi-arrow-right"));
    openBtn.addEventListener("click", function (e) { e.stopPropagation(); });
    row.appendChild(openBtn);

    row.addEventListener("click", function () { window.location.href = itemUrl; });
    return row;
  }

  // Return the correct icon element for a lesson row.
  // Completed items get a tick, others get the icon for their type.
  function buildItemIcon(item, isCompleted) {
    var itemType = item.type || "learn";
    if (isCompleted) {
      var done = createElement("div", "crs-ico crs-ico--done");
      done.appendChild(createIconElement("bi bi-check2-circle"));
      return done;
    }
    var wrap = createElement("div", "crs-ico crs-ico--" + itemType);
    wrap.appendChild(createIconElement("bi " + (TYPE_ICONS[itemType] || TYPE_ICONS.learn)));
    return wrap;
  }

  // Main entry point — reads the course ID from the URL, loads data, then renders.
  async function initialiseCoursePage() {
    var params = new URLSearchParams(window.location.search);
    pageState.courseId = params.get("id") || params.get("course") || params.get("course_id") || "1";

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

    var freshUser = await fetchFreshUserDataFromServer();
    pageState.user = freshUser;

    if (freshUser) {
      window.NetologyNav.displayNavUser(freshUser);
      calculateUserStats(freshUser);
    }

    await loadCompletionStatusFromServer();

    renderCourseHeader();
    renderModuleTabs();

    document.body.classList.remove("net-loading");

    var tourUser = freshUser || pageState.user;
    if (tourUser && tourUser.email && typeof window.maybeStartOnboardingTour === "function") {
      window.maybeStartOnboardingTour("course", tourUser.email);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { initialiseCoursePage(); }, { once: true });
  } else {
    initialiseCoursePage();
  }

}());
