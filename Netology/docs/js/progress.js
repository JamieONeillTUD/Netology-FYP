// progress.js — progress page

(function () {
  "use strict";

  const ENDPOINTS = window.ENDPOINTS;
  const XP = window.NetologyXP;
  const STORAGE_KEY = "netology_progress_type";

  const TAB_ALIASES = {
    courses: "courses",
    modules: "modules",
    lessons: "lessons",
    quizzes: "quizzes",
    tutorials: "tutorials",
    challenges: "challenges",
    "sandbox-tutorials": "tutorials",
    "sandbox-challenges": "challenges"
  };

  const TAB_CONFIG = {
    courses: {
      title: "Courses",
      subtitle: "Active and completed courses at a glance.",
      emptyTitle: "No courses yet",
      emptyText: "Browse and enroll in courses to get started.",
      icon: "bi-journal-bookmark",
      ctaText: "Browse courses",
      ctaLink: "courses.html"
    },
    modules: {
      title: "Modules",
      subtitle: "Track module progress across your courses.",
      emptyTitle: "No module progress",
      emptyText: "Start a course to unlock modules.",
      icon: "bi-layers",
      ctaText: "View courses",
      ctaLink: "courses.html"
    },
    lessons: {
      title: "Lessons",
      subtitle: "Lessons grouped by course, split by status.",
      emptyTitle: "No lessons yet",
      emptyText: "Complete your first lesson to see it here.",
      icon: "bi-journal-check",
      ctaText: "Start learning",
      ctaLink: "courses.html"
    },
    quizzes: {
      title: "Quizzes",
      subtitle: "Quiz progress, split into in-progress and completed.",
      emptyTitle: "No quizzes yet",
      emptyText: "Take a quiz to track your results.",
      icon: "bi-patch-question",
      ctaText: "Browse courses",
      ctaLink: "courses.html"
    },
    tutorials: {
      title: "Sandbox Tutorials",
      subtitle: "Sandbox tutorials and checklist progress.",
      emptyTitle: "No tutorials yet",
      emptyText: "Launch a sandbox tutorial to track it here.",
      icon: "bi-diagram-3",
      ctaText: "Open sandbox",
      ctaLink: "sandbox.html"
    },
    challenges: {
      title: "Sandbox Challenges",
      subtitle: "Challenge progress split by status.",
      emptyTitle: "No challenges yet",
      emptyText: "Complete a sandbox challenge to see it here.",
      icon: "bi-flag",
      ctaText: "View challenges",
      ctaLink: "sandbox.html"
    }
  };

  const TYPE_CONFIG = {
    lessons: {
      icon: "bi-journal-check",
      label: "Lesson",
      variant: "",
      card: "net-card--lesson",
      ctaContinue: "Resume Lesson",
      ctaDone: "Review Lesson"
    },
    quizzes: {
      icon: "bi-patch-question",
      label: "Quiz",
      variant: "blue",
      card: "net-card--quiz",
      ctaContinue: "Resume Quiz",
      ctaDone: "Review Quiz"
    },
    tutorials: {
      icon: "bi-diagram-3",
      label: "Tutorial",
      variant: "",
      card: "net-card--tutorial",
      ctaContinue: "Resume Tutorial",
      ctaDone: "Review Tutorial"
    },
    challenges: {
      icon: "bi-flag",
      label: "Challenge",
      variant: "violet",
      card: "net-card--challenge",
      ctaContinue: "Resume Challenge",
      ctaDone: "Review Challenge"
    },
    modules: {
      icon: "bi-layers",
      label: "Module",
      variant: "green",
      card: "net-card--course",
      ctaContinue: "Open Module",
      ctaDone: "Review Module"
    }
  };

  const completionCache = new Map();
  const pageData = { email: null, courses: null, completions: null, counts: null };

  // startup
  document.addEventListener("DOMContentLoaded", function () {
    init().catch(function (err) {
      console.error("Progress init failed:", err);
    });
  });

  async function init() {
    let user = null;
    try { user = JSON.parse(localStorage.getItem("netology_user")); } catch { user = null; }
    if (!user) {
      try { user = JSON.parse(localStorage.getItem("user")); } catch { user = null; }
    }

    if (!user || !user.email) {
      window.location.href = "login.html";
      return;
    }

    setupSidebar();
    setupUserDropdown();
    setupLogout();
    fillUserInfo(user);
    setupTabButtons();

    await loadHeroStats(user);

    const urlType = new URLSearchParams(location.search).get("type");
    const activeTab = resolveTabName(urlType) || resolveTabName(localStorage.getItem(STORAGE_KEY)) || "courses";

    setActiveTab(activeTab);
    localStorage.setItem(STORAGE_KEY, activeTab);
    await loadTab(activeTab, user);

    document.body.classList.replace("net-loading", "net-loaded");
    window.maybeStartOnboardingTour?.("progress", user.email);
  }

  function resolveTabName(value) {
    const key = String(value || "").trim().toLowerCase();
    return TAB_ALIASES[key] || null;
  }

  function getSavedUser() {
    let user = null;
    try { user = JSON.parse(localStorage.getItem("netology_user")); } catch { user = null; }
    if (!user) {
      try { user = JSON.parse(localStorage.getItem("user")); } catch { user = null; }
    }
    return user;
  }

  function parseJsonSafe(raw, fallback) {
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function capitalizeWord(str) {
    const value = String(str || "");
    return value ? value[0].toUpperCase() + value.slice(1) : "";
  }

  function makeElement(tag, className) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    return element;
  }

  function setElementText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value != null ? value : "");
  }

  // sidebar
  function setupSidebar() {
    const sidebar = document.getElementById("slideSidebar");
    const backdrop = document.getElementById("sideBackdrop");

    function openSidebar() {
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
      sidebar.setAttribute("aria-hidden", "false");
      backdrop.setAttribute("aria-hidden", "false");
    }

    function closeSidebar() {
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
      sidebar.setAttribute("aria-hidden", "true");
      backdrop.setAttribute("aria-hidden", "true");
    }

    const openBtn = document.getElementById("openSidebarBtn");
    const closeBtn = document.getElementById("closeSidebarBtn");
    if (openBtn) openBtn.addEventListener("click", openSidebar);
    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
    if (backdrop) backdrop.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape") closeSidebar();
    });
  }

  // user dropdown
  function setupUserDropdown() {
    const btn = document.getElementById("userBtn");
    const dropdown = document.getElementById("userDropdown");
    if (!btn || !dropdown) return;

    btn.addEventListener("click", function (evt) {
      evt.stopPropagation();
      const isOpen = dropdown.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", function (evt) {
      if (!dropdown.contains(evt.target) && !btn.contains(evt.target)) {
        dropdown.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // logout
  function setupLogout() {
    function doLogout() {
      ["netology_user", "netology_token", "user"].forEach(function (key) {
        localStorage.removeItem(key);
      });
      location.href = "index.html";
    }

    const topBtn = document.getElementById("topLogoutBtn");
    const sideBtn = document.getElementById("sideLogoutBtn");
    if (topBtn) topBtn.addEventListener("click", doLogout);
    if (sideBtn) sideBtn.addEventListener("click", doLogout);
  }

  // fill user name, avatar, xp bar
  function fillUserInfo(user) {
    const nameParts = [user.first_name, user.last_name].filter(Boolean);
    const fullName = nameParts.join(" ") || user.username || "Student";
    const initial = fullName[0].toUpperCase();
    const totalXp = Number(user.xp || 0);
    const level = Number.isFinite(Number(user.numeric_level))
      ? Number(user.numeric_level)
      : XP.levelFromTotalXp(totalXp);
    const rank = user.rank || XP.rankForLevel(level);

    setElementText("topAvatar", initial);
    setElementText("ddAvatar", initial);
    setElementText("ddName", fullName);
    setElementText("ddEmail", user.email || "");
    setElementText("ddLevel", "Level " + level);
    setElementText("ddRank", rank);
    setElementText("sideAvatar", initial);
    setElementText("sideUserName", fullName);
    setElementText("sideUserEmail", user.email || "");
    setElementText("sideLevelBadge", "Lv " + level);

    const levelStartXp = XP.totalXpForLevel(level);
    const xpIntoLevel = Math.max(0, totalXp - levelStartXp);
    const xpNeeded = XP.xpForNextLevel(level);
    const barPercent = Math.min(100, (xpIntoLevel / Math.max(xpNeeded, 1)) * 100);

    setElementText("sideXpText", xpIntoLevel + "/" + xpNeeded);
    setElementText("sideXpHint", Math.max(0, xpNeeded - xpIntoLevel) + " XP to next level");

    const xpBar = document.getElementById("sideXpBar");
    if (xpBar) xpBar.style.width = barPercent + "%";
  }

  // tab buttons
  function setupTabButtons() {
    const buttons = document.querySelectorAll(".net-progress-nav-btn");

    buttons.forEach(function (btn) {
      btn.addEventListener("click", async function (evt) {
        evt.preventDefault();

        const tab = resolveTabName(btn.getAttribute("data-type"));
        if (!tab) return;

        setActiveTab(tab);
        localStorage.setItem(STORAGE_KEY, tab);

        const user = getSavedUser();
        if (user && user.email) await loadTab(tab, user);
      });
    });
  }

  function setActiveTab(tab) {
    const buttons = document.querySelectorAll(".net-progress-nav-btn");

    buttons.forEach(function (btn) {
      const isActive = btn.getAttribute("data-type") === tab;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });
  }

  function updateTabBadges(counts) {
    const buttons = document.querySelectorAll(".net-progress-nav-btn");

    buttons.forEach(function (btn) {
      const tab = btn.getAttribute("data-type");
      if (!tab || !counts) return;

      let count = 0;
      if (tab === "courses") {
        count = (counts["in-progress"] || 0) + (counts["completed-courses"] || 0);
      } else if (tab === "modules") {
        count = (counts["modules-in-progress"] || 0) + (counts["modules-completed"] || 0);
      } else {
        count = counts[tab] || 0;
      }

      let badge = btn.querySelector(".net-progress-nav-count");
      if (!badge) {
        badge = makeElement("span", "net-progress-nav-count");
        btn.appendChild(badge);
      }

      animateNumber(badge, count);
      badge.classList.remove("is-animated");
      void badge.offsetWidth;
      badge.classList.add("is-animated");
    });
  }

  // hero stat cards
  async function loadHeroStats(user) {
    const [summary, streak, achievements] = await Promise.all([
      window.apiGet(ENDPOINTS.courses.userProgressSummary, { email: user.email }).catch(function () { return null; }),
      window.apiGet(ENDPOINTS.progress.userStreaks, { user_email: user.email }).catch(function () { return null; }),
      window.apiGet(ENDPOINTS.achievements.list, { user_email: user.email }).catch(function () { return null; })
    ]);

    setElementText("heroCoursesActive", summary ? summary.in_progress || 0 : 0);
    setElementText("heroLessons", summary ? summary.lessons_done || 0 : 0);
    setElementText("heroStreak", streak ? streak.current_streak || 0 : 0);
    setElementText("heroAchievements", achievements ? achievements.total_unlocked || 0 : 0);
  }

  // load common data once per session
  async function ensurePageData(user) {
    if (pageData.email === user.email && pageData.courses && pageData.completions) return;

    pageData.email = user.email;
    pageData.courses = await fetchUserCourses(user.email);
    pageData.completions = await fetchAllCompletions(user.email, pageData.courses);
    pageData.counts = await buildTabCounts(user.email);

    updateTabBadges(pageData.counts);
  }

  // load a tab
  async function loadTab(tab, user) {
    const listEl = document.getElementById("progressList");
    const emptyEl = document.getElementById("progressEmpty");
    if (!listEl || !emptyEl) return;

    showSkeleton(listEl);
    emptyEl.classList.add("d-none");

    await ensurePageData(user);

    const totals = await renderTab(listEl, tab, user.email);
    if (!totals.inProgress && !totals.completed) showEmptyState(tab);
  }

  async function renderTab(container, tab, email) {
    const started = getStartedCoursesMap(email);
    container.replaceChildren();

    const config = TAB_CONFIG[tab];
    const section = buildSectionWrapper(tab, config);
    container.appendChild(section.wrap);

    if (tab === "courses") return renderCoursesTab(section.body, email, started);
    if (tab === "modules") return renderModulesTab(section.body, email, started);
    return renderItemsTab(tab, section.body, email, started);
  }

  // courses tab
  async function renderCoursesTab(parent, email, started) {
    const allCourses = await buildCourseProgressList(email, started);
    const inProgress = allCourses.filter(function (course) { return course.status === "in-progress"; });
    const completed = allCourses.filter(function (course) { return course.status === "completed"; });

    if (!inProgress.length && !completed.length) return { inProgress: 0, completed: 0 };

    const inProgressXp = inProgress.reduce(function (sum, course) { return sum + (course.earnedXp || 0); }, 0);
    const completedXp = completed.reduce(function (sum, course) { return sum + (course.earnedXp || 0); }, 0);

    const splitRow = makeElement("div", "net-progress-split");
    const leftCol = buildColumnHeader("In progress", inProgress.length, false, inProgressXp);
    const rightCol = buildColumnHeader("Completed", completed.length, true, completedXp);

    renderCourseCards(inProgress, leftCol.body, false, started);
    if (!inProgress.length) showEmptyColumn(leftCol.body, "No active courses yet.");

    renderCourseCards(completed, rightCol.body, true, started);
    if (!completed.length) showEmptyColumn(rightCol.body, "No completed courses yet.");

    splitRow.append(leftCol.wrap, rightCol.wrap);
    parent.appendChild(splitRow);

    return { inProgress: inProgress.length, completed: completed.length };
  }

  async function buildCourseProgressList(email, started) {
    const promises = (pageData.courses || []).map(async function (course) {
      const courseId = String(course.id);
      const content = getCourseContent(course);
      const completions = pageData.completions.get(courseId) || await fetchCompletions(email, courseId);
      const allItems = getAllCourseItems(content);

      const earnedXp = allItems.reduce(function (sum, item) {
        let completedSet = null;
        if (item.type === "learn") completedSet = completions.lesson;
        else if (item.type === "quiz") completedSet = completions.quiz;
        else if (item.type === "challenge") completedSet = completions.challenge;
        return sum + (completedSet && completedSet.has(Number(item.lesson_number)) ? Number(item.xp || 0) : 0);
      }, 0);

      const totalDone = completions.lesson.size + completions.quiz.size + completions.challenge.size;
      const requiredCount = allItems.filter(function (item) { return item.type !== "sandbox"; }).length;

      let status = course.status && course.status !== "not-started" ? course.status : "not-started";
      if (status === "not-started") {
        if (requiredCount > 0 && totalDone >= requiredCount) status = "completed";
        else if (totalDone > 0) status = "in-progress";
      }

      const contentId = getCourseContentId(course) || courseId;
      return Object.assign({}, course, { contentId: contentId, earnedXp: earnedXp, status: status });
    });

    return Promise.all(promises);
  }

  function renderCourseCards(courses, parent, isCompleted, started) {
    courses.forEach(function (course) {
      const lastLesson = started ? started.get(String(course.id)) : null;
      const link = (!isCompleted && lastLesson)
        ? buildLessonLink(course.id, course.contentId, lastLesson)
        : buildCourseLink(course.id, course.contentId);

      const difficulty = String(course.difficulty || "novice").toLowerCase();
      const progressPct = Number(course.progress_pct || 0);
      const diffClass = difficulty === "intermediate" ? "int" : difficulty === "advanced" ? "adv" : "nov";

      const card = makeElement("div", "net-card net-coursecard-enhanced mb-3");
      card.innerHTML = [
        '<div class="d-flex flex-column flex-md-row gap-4 p-4">',
        '  <div class="net-course-visual">',
        '    <i class="bi ' + (isCompleted ? "bi-check-circle-fill" : "bi-journal-album") + '"></i>',
        "  </div>",
        '  <div class="flex-grow-1">',
        '    <div class="d-flex align-items-center gap-2 mb-1">',
        '      <span class="net-diffbadge net-badge-' + diffClass + '">' + capitalizeWord(difficulty) + "</span>",
        "    </div>",
        '    <h3 class="h5 fw-bold mb-2">' + (course.title || "Course") + "</h3>",
        '    <p class="text-muted small mb-3" style="max-width:600px">' + (course.description || "No description available.") + "</p>",
        course.estimated_time ? '    <div class="small text-muted"><i class="bi bi-clock me-1"></i>' + course.estimated_time + "</div>" : "",
        '    <div class="mt-3" style="max-width:280px">',
        '      <div class="d-flex justify-content-between small mb-1">',
        "        <span>Progress</span>",
        '        <span class="fw-semibold">' + progressPct + "%</span>",
        "      </div>",
        '      <div class="net-meter"><div class="net-meter-fill" style="width:' + progressPct + '%"></div></div>',
        "    </div>",
        "  </div>",
        '  <div class="d-flex flex-column align-items-md-end justify-content-center gap-2 min-w-150">',
        '    <a class="btn btn-teal" href="' + link + '">',
        isCompleted ? '      <i class="bi bi-eye me-1"></i> Review' : '      <i class="bi bi-play-fill me-1"></i> Resume',
        "    </a>",
        "  </div>",
        "</div>"
      ].join("\n");

      parent.appendChild(card);
    });
  }

  // modules tab
  async function renderModulesTab(parent, email, started) {
    const inProgressItems = [];
    const completedItems = [];

    for (const course of (pageData.courses || [])) {
      const courseId = String(course.id);
      const content = getCourseContent(course);
      if (!content || !content.units || !content.units.length) continue;

      const completions = pageData.completions.get(courseId) || await fetchCompletions(email, courseId);
      const totalDone = completions.lesson.size + completions.quiz.size + completions.challenge.size;
      const courseStarted = totalDone > 0 || started.has(courseId);
      const contentId = getCourseContentId(course) || courseId;

      buildCourseModules(content).forEach(function (mod) {
        const progress = getModuleProgress(mod, completions);
        if (!progress.total) return;

        const item = {
          number: mod.index,
          title: mod.title,
          link: buildModuleLink(courseId, contentId, mod.id || mod.index),
          meta: "Module " + mod.index + " \u2014 " + progress.done + "/" + progress.total + " items",
          ctaLabel: progress.completed ? "Review Module" : "Open Module"
        };

        if (progress.completed) {
          completedItems.push({ courseId: courseId, contentId: contentId, title: course.title, item: item });
        } else if (courseStarted) {
          inProgressItems.push({ courseId: courseId, contentId: contentId, title: course.title, item: item });
        }
      });
    }

    const inProgressGroups = groupItemsByCourse(inProgressItems);
    const completedGroups = groupItemsByCourse(completedItems);

    if (inProgressGroups.length || completedGroups.length) {
      renderSplitColumns(inProgressGroups, completedGroups, parent, "modules");
    }

    return { inProgress: inProgressItems.length, completed: completedItems.length };
  }

  function groupItemsByCourse(items) {
    const map = new Map();

    items.forEach(function (entry) {
      if (!map.has(entry.courseId)) {
        map.set(entry.courseId, { courseId: entry.courseId, contentId: entry.contentId, title: entry.title, items: [] });
      }
      map.get(entry.courseId).items.push(entry.item);
    });

    return Array.from(map.values());
  }

  // lessons / quizzes / challenges / tutorials tabs
  async function renderItemsTab(tab, parent, email, started) {
    let groups;

    if (tab === "tutorials") {
      groups = buildTutorialGroups(email);
    } else {
      groups = await buildItemGroups(tab, email, started);
    }

    if (groups.inProgress.length || groups.completed.length) {
      renderSplitColumns(groups.inProgress, groups.completed, parent, tab);
    }

    return {
      inProgress: countGroupItems(groups.inProgress),
      completed: countGroupItems(groups.completed)
    };
  }

  async function buildItemGroups(tab, email, started) {
    const inProgressItems = [];
    const completedItems = [];

    let itemType = "learn";
    if (tab === "quizzes") itemType = "quiz";
    else if (tab === "challenges") itemType = "challenge";

    for (const course of (pageData.courses || [])) {
      const courseId = String(course.id);
      const contentId = getCourseContentId(course) || courseId;
      const content = getCourseContent(course);
      const completions = pageData.completions.get(courseId) || await fetchCompletions(email, courseId);
      const totalDone = completions.lesson.size + completions.quiz.size + completions.challenge.size;
      const courseStarted = totalDone > 0 || started.has(courseId);
      const titleMap = buildLessonTitleMap(content);

      let completedSet = completions.lesson;
      if (itemType === "quiz") completedSet = completions.quiz;
      else if (itemType === "challenge") completedSet = completions.challenge;

      getUniqueItemsByType(content, itemType).forEach(function (item) {
        const lessonNum = Number(item.lesson_number);
        if (!lessonNum) return;

        const entry = {
          number: lessonNum,
          title: titleMap.get(lessonNum) || "Lesson " + lessonNum,
          link: itemType === "challenge"
            ? buildChallengeLink(courseId, contentId, lessonNum)
            : buildLessonLink(courseId, contentId, lessonNum)
        };

        if (completedSet.has(lessonNum)) {
          completedItems.push({ courseId: courseId, contentId: contentId, title: course.title, item: entry });
        } else if (courseStarted) {
          inProgressItems.push({ courseId: courseId, contentId: contentId, title: course.title, item: entry });
        }
      });
    }

    inProgressItems.sort(function (a, b) { return a.item.number - b.item.number; });
    completedItems.sort(function (a, b) { return a.item.number - b.item.number; });

    return {
      inProgress: groupItemsByCourse(inProgressItems),
      completed: groupItemsByCourse(completedItems)
    };
  }

  function buildTutorialGroups(email) {
    const inProgressMap = new Map();
    const completedMap = new Map();
    const storagePrefix = "netology_tutorial_progress:" + email + ":";

    Object.keys(localStorage).forEach(function (key) {
      if (!key.startsWith(storagePrefix)) return;

      const parts = key.replace(storagePrefix, "").split(":");
      const courseId = parts[0];
      const lessonNum = Number(parts[1]);
      if (!courseId || !lessonNum) return;

      const saved = parseJsonSafe(localStorage.getItem(key), {});
      const checkedCount = Array.isArray(saved.checked) ? saved.checked.filter(Boolean).length : 0;
      const course = (pageData.courses || []).find(function (c) { return String(c.id) === courseId; });
      const contentId = getCourseContentId(course) || courseId;
      const content = getCourseContent(course || { id: courseId });
      const totalSteps = getTutorialStepCount(content, lessonNum);
      const titleMap = buildLessonTitleMap(content);

      const item = {
        number: lessonNum,
        title: titleMap.get(lessonNum) || "Lesson " + lessonNum,
        link: buildTutorialLink(courseId, contentId, lessonNum),
        meta: "Tutorial \u2014 " + checkedCount + "/" + (totalSteps || 0) + " steps"
      };

      const targetMap = (totalSteps > 0 && checkedCount >= totalSteps) ? completedMap : inProgressMap;
      const existing = targetMap.get(courseId) || [];
      existing.push(item);
      targetMap.set(courseId, existing);
    });

    function toGroups(map) {
      return Array.from(map.entries()).map(function (entry) {
        const courseId = entry[0];
        const items = entry[1];
        const course = (pageData.courses || []).find(function (c) { return String(c.id) === courseId; });
        return {
          courseId: courseId,
          contentId: getCourseContentId(course) || courseId,
          title: course ? course.title : "Course " + courseId,
          items: items.sort(function (a, b) { return a.number - b.number; })
        };
      });
    }

    return { inProgress: toGroups(inProgressMap), completed: toGroups(completedMap) };
  }

  // split column layout
  function renderSplitColumns(inProgressGroups, completedGroups, parent, tab) {
    const splitRow = makeElement("div", "net-progress-split");
    const leftCol = buildColumnHeader("In progress", countGroupItems(inProgressGroups), false);
    const rightCol = buildColumnHeader("Completed", countGroupItems(completedGroups), true);

    renderGroupCards(inProgressGroups, leftCol.body, tab, false);
    if (!inProgressGroups.length) showEmptyColumn(leftCol.body, "Nothing in progress yet.");

    renderGroupCards(completedGroups, rightCol.body, tab, true);
    if (!completedGroups.length) showEmptyColumn(rightCol.body, "Nothing completed yet.");

    splitRow.append(leftCol.wrap, rightCol.wrap);
    parent.appendChild(splitRow);
  }

  function renderGroupCards(groups, parent, tab, isReview) {
    const config = TYPE_CONFIG[tab] || TYPE_CONFIG.lessons;

    groups.forEach(function (group) {
      const card = makeElement("div", "net-card net-progress-card net-card-fixed net-focus-card mb-3 " + config.card);
      const header = makeElement("div", "d-flex align-items-start justify-content-between flex-wrap gap-3 mb-2 net-progress-group-head");

      const itemLabel = config.label.toLowerCase();
      const itemCount = group.items.length;
      const courseLink = buildCourseLink(group.courseId, group.contentId);

      header.innerHTML = [
        '<div class="d-flex align-items-start gap-3">',
        '  <div class="net-progress-pill"><i class="bi ' + config.icon + '"></i></div>',
        "  <div>",
        '    <div class="fw-semibold">' + (group.title || "Course") + "</div>",
        '    <div class="small text-muted">' + itemCount + " " + itemLabel + (itemCount === 1 ? "" : "s") + "</div>",
        '    <div class="d-flex flex-wrap gap-2 mt-2"></div>',
        "  </div>",
        "</div>",
        '<a class="btn btn-outline-secondary btn-sm" href="' + courseLink + '">',
        '  <i class="bi bi-arrow-right me-2"></i>Open course',
        "</a>"
      ].join("\n");

      header.querySelector(".gap-2.mt-2").appendChild(makeStatusChip(isReview ? "completed" : "progress"));

      const list = makeElement("ul", "net-progress-items net-card-body");

      group.items.forEach(function (item) {
        const listItem = makeElement("li");
        const variantClass = config.variant ? " net-progress-item--" + config.variant : "";
        const ctaLabel = item.ctaLabel || (isReview ? config.ctaDone : config.ctaContinue);

        listItem.innerHTML = [
          '<a href="' + item.link + '" class="net-progress-item' + variantClass + ' net-focus-card">',
          '  <span class="net-progress-item-pill"><i class="bi ' + config.icon + '"></i></span>',
          '  <span class="net-progress-item-text">',
          '    <span class="net-progress-item-title">' + (item.title || "") + "</span>",
          '    <span class="net-progress-item-meta">' + (item.meta || config.label + " " + item.number) + "</span>",
          "  </span>",
          '  <span class="net-progress-item-cta"><i class="bi bi-arrow-right"></i> ' + ctaLabel + "</span>",
          "</a>"
        ].join("\n");

        list.appendChild(listItem);
      });

      card.append(header, list);
      parent.appendChild(card);
    });
  }

  // section and column builders
  function buildSectionWrapper(id, config) {
    const wrap = makeElement("section", "net-progress-section");
    wrap.id = id;
    wrap.setAttribute("data-progress-section", id);
    wrap.innerHTML = [
      '<div class="net-card p-4 net-progress-section-head net-section-head">',
      '  <div class="net-progress-section-title net-section-title">' + config.title + "</div>",
      '  <div class="net-section-sub">' + config.subtitle + "</div>",
      "</div>"
    ].join("\n");

    const body = makeElement("div", "net-progress-section-body");
    wrap.appendChild(body);
    return { wrap: wrap, body: body };
  }

  function buildColumnHeader(title, count, isCompleted, xpTotal) {
    const wrap = makeElement("div", "net-progress-col");
    const icon = isCompleted ? "bi-check2-circle" : "bi-play-circle";
    const xpHtml = typeof xpTotal === "number"
      ? '<span class="net-progress-col-xp"><i class="bi bi-lightning-charge-fill"></i> ' + xpTotal + " XP</span>"
      : "";

    wrap.innerHTML = [
      '<div class="net-card p-3 net-progress-col-head">',
      '  <div class="net-progress-col-title">',
      '    <i class="bi ' + icon + ' text-teal"></i>',
      "    <span>" + title + "</span>",
      "  </div>",
      '  <div class="net-progress-col-meta">',
      '    <span class="net-progress-col-count">' + count + "</span>",
      "    " + xpHtml,
      "  </div>",
      "</div>"
    ].join("\n");

    const body = makeElement("div", "net-progress-col-body");
    wrap.appendChild(body);
    return { wrap: wrap, body: body };
  }

  function showEmptyColumn(parent, message) {
    const div = makeElement("div", "net-card p-4 net-progress-empty-col");
    div.innerHTML = '<i class="bi bi-info-circle"></i><div class="small text-muted">' + message + "</div>";
    parent.appendChild(div);
  }

  function showEmptyState(tab) {
    const container = document.getElementById("progressEmpty");
    if (!container) return;

    const config = TAB_CONFIG[tab];
    container.classList.remove("d-none");

    const icon = container.querySelector("i");
    if (icon) icon.className = "bi " + config.icon;

    setElementText("progressEmptyTitle", config.emptyTitle);
    setElementText("progressEmptyText", config.emptyText);

    const ctaBtn = document.getElementById("progressEmptyCta");
    if (ctaBtn) {
      ctaBtn.innerHTML = '<i class="bi ' + config.icon + ' me-2"></i>' + config.ctaText;
      ctaBtn.setAttribute("href", config.ctaLink);
    }
  }

  function showSkeleton(parent) {
    const wrap = makeElement("div", "net-progress-loading");

    for (let i = 0; i < 2; i++) {
      const card = makeElement("div", "net-card p-4");
      card.innerHTML = [
        '<div class="net-skel net-w-40 mb-2"></div>',
        '<div class="net-skel net-w-80 mb-2"></div>',
        '<div class="net-skel net-w-60"></div>'
      ].join("\n");
      wrap.appendChild(card);
    }

    parent.replaceChildren(wrap);
  }

  function makeStatusChip(status) {
    const statusMap = {
      completed: { label: "Completed",   cls: "net-status-chip--completed", icon: "bi-check2-circle" },
      locked:    { label: "Locked",      cls: "net-status-chip--locked",    icon: "bi-lock-fill" },
      progress:  { label: "In progress", cls: "net-status-chip--progress",  icon: "bi-arrow-repeat" }
    };
    const found = statusMap[status] || { label: "Active", cls: "net-status-chip--active", icon: "bi-play-circle" };

    const chip = makeElement("span", "net-status-chip " + found.cls);
    chip.innerHTML = '<i class="bi ' + found.icon + '" aria-hidden="true"></i>' + found.label;
    return chip;
  }

  function animateNumber(element, targetValue) {
    const target = Number(targetValue || 0);
    const current = Number(element.dataset.count || element.textContent || 0);

    if (!Number.isFinite(target) || current === target) {
      element.textContent = target;
      element.dataset.count = target;
      return;
    }

    const startTime = performance.now();

    function tick(now) {
      const progress = Math.min(1, (now - startTime) / 420);
      element.textContent = Math.round(current + (target - current) * progress);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        element.dataset.count = target;
      }
    }

    requestAnimationFrame(tick);
  }

  // link builders
  function buildCourseLink(courseId, contentId) {
    return "course.html?id=" + courseId + (contentId ? "&content_id=" + contentId : "");
  }

  function buildLessonLink(courseId, contentId, lessonNumber) {
    return "lesson.html?course_id=" + courseId + (contentId ? "&content_id=" + contentId : "") + "&lesson=" + lessonNumber;
  }

  function buildChallengeLink(courseId, contentId, lessonNumber) {
    return "sandbox.html?course_id=" + courseId + (contentId ? "&content_id=" + contentId : "") + "&lesson=" + lessonNumber + "&mode=challenge&challenge=1";
  }

  function buildTutorialLink(courseId, contentId, lessonNumber) {
    return "sandbox.html?course_id=" + courseId + (contentId ? "&content_id=" + contentId : "") + "&lesson=" + lessonNumber + "&mode=practice";
  }

  function buildModuleLink(courseId, contentId, moduleId) {
    return "course.html?id=" + courseId + (contentId ? "&content_id=" + contentId : "") + (moduleId ? "&module=" + moduleId : "");
  }

  // data fetching
  async function fetchUserCourses(email) {
    const data = await window.apiGet(ENDPOINTS.courses.userCourses, { email: email });

    if (data && data.success && Array.isArray(data.courses)) return data.courses;

    return Object.entries(window.COURSE_CONTENT || {}).map(function (entry) {
      const id = entry[0];
      const course = entry[1];
      return {
        id: id,
        title: course.title,
        description: course.description || "",
        difficulty: course.difficulty || "novice",
        estimated_time: course.estimatedTime || "",
        progress_pct: 0,
        status: "not-started"
      };
    });
  }

  function getStartedCoursesMap(email) {
    const raw = localStorage.getItem("netology_started_courses:" + email);
    const list = parseJsonSafe(raw, []) || [];

    const entries = list
      .filter(Boolean)
      .map(function (entry) { return [String(entry.id), Number(entry.lastLesson)]; })
      .filter(function (entry) { return entry[1] > 0; });

    return new Map(entries);
  }

  async function fetchCompletions(email, courseId) {
    const cacheKey = email + ":" + courseId;
    if (completionCache.has(cacheKey)) return completionCache.get(cacheKey);

    let result = null;

    try {
      const data = await window.apiGet(ENDPOINTS.courses.userCourseStatus, { email: email, course_id: courseId });
      if (data && data.success) {
        result = {
          lesson: new Set((data.lessons || []).map(Number)),
          quiz: new Set((data.quizzes || []).map(Number)),
          challenge: new Set((data.challenges || []).map(Number))
        };
      }
    } catch (err) {
      // fall through to local storage
    }

    if (!result) {
      const raw = parseJsonSafe(localStorage.getItem("netology_completions:" + email + ":" + courseId), {});
      result = {
        lesson: new Set((raw.lesson || raw.lessons || raw.learn || []).map(Number)),
        quiz: new Set((raw.quiz || raw.quizzes || []).map(Number)),
        challenge: new Set((raw.challenge || raw.challenges || []).map(Number))
      };
    }

    completionCache.set(cacheKey, result);
    return result;
  }

  async function fetchAllCompletions(email, courses) {
    const map = new Map();

    await Promise.all((courses || []).map(async function (course) {
      const courseId = String(course.id);
      map.set(courseId, await fetchCompletions(email, courseId));
    }));

    return map;
  }

  async function buildTabCounts(email) {
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

    const started = getStartedCoursesMap(email);

    await Promise.all((pageData.courses || []).map(async function (course) {
      const courseId = String(course.id);
      const content = getCourseContent(course);
      const completions = pageData.completions.get(courseId) || await fetchCompletions(email, courseId);
      const totalDone = completions.lesson.size + completions.quiz.size + completions.challenge.size;
      const allItems = getAllCourseItems(content);
      const requiredCount = allItems.filter(function (item) { return item.type !== "sandbox"; }).length;

      if (requiredCount > 0 && totalDone >= requiredCount) counts["completed-courses"]++;
      else if (totalDone > 0) counts["in-progress"]++;

      counts.lessons += completions.lesson.size;
      counts.quizzes += completions.quiz.size;
      counts.challenges += completions.challenge.size;

      if (content && content.units && content.units.length) {
        const courseStarted = totalDone > 0 || started.has(courseId);

        buildCourseModules(content).forEach(function (mod) {
          const progress = getModuleProgress(mod, completions);
          if (progress.completed) counts["modules-completed"]++;
          else if (courseStarted) counts["modules-in-progress"]++;
        });
      }
    }));

    const tutorialPrefix = "netology_tutorial_progress:" + email + ":";
    Object.keys(localStorage).forEach(function (key) {
      if (!key.startsWith(tutorialPrefix)) return;
      const parts = key.replace(tutorialPrefix, "").split(":");
      if (parts[0] && Number(parts[1]) > 0) counts.tutorials++;
    });

    return counts;
  }

  // course content helpers
  function getCourseContent(course) {
    if (!course) return null;

    const allContent = window.COURSE_CONTENT || {};
    const courseTitle = String(course.title || "").trim().toLowerCase();

    const byTitle = Object.values(allContent).find(function (c) {
      return String(c && c.title ? c.title : "").trim().toLowerCase() === courseTitle;
    });

    return byTitle || allContent[String(course.id)] || null;
  }

  function getCourseContentId(course) {
    if (!course) return null;

    const allContent = window.COURSE_CONTENT || {};
    const courseTitle = String(course.title || "").trim().toLowerCase();

    const match = Object.values(allContent).find(function (c) {
      return String(c && c.title ? c.title : "").trim().toLowerCase() === courseTitle;
    });

    return match && match.id ? String(match.id) : null;
  }

  function getAllCourseItems(course) {
    if (!course || !course.units || !course.units.length) return [];

    const items = [];
    let lessonCounter = 1;

    course.units.forEach(function (unit) {
      const result = normalizeUnitItems(unit, lessonCounter);
      items.push.apply(items, result.items);
      lessonCounter = result.next;
    });

    return items;
  }

  function buildCourseModules(course) {
    if (!course || !course.units || !course.units.length) return [];

    const modules = [];
    let lessonCounter = 1;

    course.units.forEach(function (unit, index) {
      const result = normalizeUnitItems(unit, lessonCounter);
      modules.push({
        id: unit.id || "module-" + (index + 1),
        index: index + 1,
        title: unit.title || "Module " + (index + 1),
        items: result.items
      });
      lessonCounter = result.next;
    });

    return modules;
  }

  function normalizeUnitItems(unit, startNumber) {
    const items = [];
    let lessonNum = startNumber;

    function addItem(type, raw) {
      items.push({
        type: type,
        title: raw.title || raw.name || capitalizeWord(type),
        lesson_number: Number(raw.lesson_number || raw.lessonNumber || 0),
        xp: Number(raw.xp || raw.xpReward || raw.xp_reward || 0),
        steps: Array.isArray(raw.steps) ? raw.steps : []
      });
    }

    if (Array.isArray(unit.sections)) {
      unit.sections.forEach(function (section) {
        const sectionType = String(section.type || section.kind || section.title || "").toLowerCase();
        (section.items || section.lessons || []).forEach(function (item) {
          addItem(resolveItemType(sectionType, item), item);
        });
      });
    } else if (unit.sections && typeof unit.sections === "object") {
      const sec = unit.sections;
      (sec.learn || sec.lesson || sec.lessons || []).forEach(function (item) { addItem("learn", item); });
      (sec.quiz || sec.quizzes || []).forEach(function (item) { addItem("quiz", item); });
      (sec.practice || sec.sandbox || []).forEach(function (item) { addItem("sandbox", item); });
      (sec.challenge || sec.challenges || []).forEach(function (item) { addItem("challenge", item); });
    } else if (Array.isArray(unit.lessons)) {
      unit.lessons.forEach(function (item) {
        const type = String(item.type || "learn").toLowerCase();
        let resolved = "learn";
        if (type === "quiz") resolved = "quiz";
        else if (type === "challenge") resolved = "challenge";
        else if (type === "sandbox" || type === "practice") resolved = "sandbox";
        addItem(resolved, item);
      });
    }

    let lastLearnNumber = lessonNum - 1;

    items.forEach(function (item) {
      if (item.type === "learn") {
        item.lesson_number = item.lesson_number || lessonNum++;
        lastLearnNumber = item.lesson_number;
        lessonNum = Math.max(lessonNum, item.lesson_number + 1);
      } else if (!item.lesson_number) {
        item.lesson_number = Math.max(1, lastLearnNumber);
      }

      if (!item.xp) {
        if (item.type === "quiz") item.xp = 60;
        else if (item.type === "challenge") item.xp = 80;
        else if (item.type === "sandbox") item.xp = 30;
        else item.xp = 40;
      }
    });

    const typeOrder = { learn: 1, quiz: 2, sandbox: 3, challenge: 4 };

    items.sort(function (a, b) {
      if (a.lesson_number !== b.lesson_number) return a.lesson_number - b.lesson_number;
      return (typeOrder[a.type] || 9) - (typeOrder[b.type] || 9);
    });

    return { items: items, next: lessonNum };
  }

  function resolveItemType(sectionType, item) {
    const type = String(item.type || "").toLowerCase();

    if (type === "quiz" || type === "challenge" || type === "learn") return type;
    if (type === "sandbox" || type === "practice") return "sandbox";
    if (sectionType.includes("quiz")) return "quiz";
    if (sectionType.includes("challenge")) return "challenge";
    if (sectionType.includes("practice") || sectionType.includes("sandbox") || sectionType.includes("hands-on")) return "sandbox";

    return "learn";
  }

  function getUniqueItemsByType(course, type) {
    const seen = new Set();

    return getAllCourseItems(course).filter(function (item) {
      if (item.type !== type) return false;
      const num = Number(item.lesson_number);
      if (!num) return false;
      if (seen.has(num)) return false;
      seen.add(num);
      return true;
    });
  }

  function buildLessonTitleMap(course) {
    const map = new Map();

    getAllCourseItems(course).forEach(function (item) {
      if (item.type === "learn" && item.lesson_number && !map.has(item.lesson_number)) {
        map.set(Number(item.lesson_number), item.title || "Lesson " + item.lesson_number);
      }
    });

    return map;
  }

  function getTutorialStepCount(course, lessonNumber) {
    if (!course || !course.units || !course.units.length) return 0;

    let lessonCounter = 1;
    let stepCount = 0;

    course.units.forEach(function (unit) {
      (unit.sections || []).forEach(function (section) {
        (section.items || []).forEach(function (item) {
          const type = String(item.type || "").toLowerCase();

          if (type === "learn") {
            if (lessonCounter === lessonNumber) {
              stepCount = Math.max(stepCount, (item.steps || []).length);
            }
            lessonCounter++;
          } else if ((type === "practice" || type === "sandbox") && lessonCounter - 1 === lessonNumber) {
            stepCount = Math.max(stepCount, (item.steps || []).length);
          }
        });
      });
    });

    return stepCount;
  }

  function getModuleProgress(mod, completions) {
    const required = (mod.items || []).filter(function (item) {
      return item.type === "learn" || item.type === "quiz" || item.type === "challenge";
    });

    const setMap = {
      learn: completions.lesson,
      quiz: completions.quiz,
      challenge: completions.challenge
    };

    const doneCount = required.filter(function (item) {
      return setMap[item.type] && setMap[item.type].has(Number(item.lesson_number));
    }).length;

    return {
      done: doneCount,
      total: required.length,
      completed: required.length > 0 && doneCount === required.length
    };
  }

  function countGroupItems(groups) {
    return (groups || []).reduce(function (sum, group) {
      return sum + (group.items ? group.items.length : 0);
    }, 0);
  }

}());
