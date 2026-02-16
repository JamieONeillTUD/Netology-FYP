/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/02/2026

progress.js - Progress overview with category navigation and split view.
*/

(() => {
  "use strict";

  /* API helpers */
  const getApiBase = () => window.API_BASE || "";
  const apiGet = window.apiGet || (async (path, params = {}) => {
    const base = getApiBase().trim();
    const url = base ? new URL(base.replace(/\/$/, "") + path) : new URL(path, window.location.origin);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
    const res = await fetch(url.toString());
    return res.json();
  });
  const listFrom = window.API_HELPERS?.list || ((data, ...keys) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  });
  const ENDPOINTS = window.ENDPOINTS || {};

  const BASE_XP = 100;
  const completionCache = new Map();
  const completionPromiseCache = new Map();

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

  const state = {
    courses: null,
    completionsMap: null,
    content: null,
    navCounts: null,
    email: null
  };

  document.addEventListener("DOMContentLoaded", () => {
    initProgressPage().catch((err) => console.error("Progress init failed:", err));
  });

  async function initProgressPage() {
    const user = getCurrentUser();
    if (!user?.email) {
      window.location.href = "login.html";
      return;
    }

    wireChrome(user);
    wireNav();

    await loadHeroStats(user);

    const type = getTypeParam();
    setActiveNav(type);
    setActiveType(type);
    await loadProgressType(type, user);

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    if (typeof window.maybeStartOnboardingTour === "function") {
      window.maybeStartOnboardingTour("progress", user.email);
    }
  }

  async function loadProgressType(type, user) {
    const list = getById("progressList");
    const empty = getById("progressEmpty");
    if (!list || !empty || !user?.email) return;

    renderLoadingState(list);
    empty.classList.add("d-none");

    await ensureData(user);

    const totals = await renderSelectedSection(
      list,
      state.courses,
      state.content,
      user.email,
      state.completionsMap,
      type
    );

    if (!totals.inTotal && !totals.doneTotal) {
      showEmpty(type);
    }
  }

  async function ensureData(user) {
    if (state.email === user.email && state.courses && state.completionsMap && state.content) return;

    state.email = user.email;
    state.content = getCourseContent();
    state.courses = await fetchUserCourses(user.email);
    state.completionsMap = await buildCompletionsMap(user.email, state.courses);
    state.navCounts = await buildNavCounts(state.courses, state.content, user.email, state.completionsMap);

    setNavCounts(state.navCounts);
  }

  function wireNav() {
    const buttons = document.querySelectorAll(".net-progress-nav-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const type = btn.getAttribute("data-type");
        if (!type) return;
        setActiveNav(type);
        setActiveType(type);
        const user = getCurrentUser();
        if (user?.email) await loadProgressType(type, user);
      });
    });
  }

  function setActiveNav(type) {
    document.querySelectorAll(".net-progress-nav-btn").forEach((btn) => {
      const isActive = btn.getAttribute("data-type") === type;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });
  }

  function setActiveType(type) {
    localStorage.setItem("netology_progress_type", type);
  }

  function getTypeParam() {
    const params = new URLSearchParams(window.location.search);
    const raw = String(params.get("type") || "").trim().toLowerCase();
    if (raw === "courses") return "courses";
    if (raw === "modules") return "modules";
    if (raw === "lessons") return "lessons";
    if (raw === "quizzes") return "quizzes";
    if (raw === "tutorials" || raw === "sandbox-tutorials") return "tutorials";
    if (raw === "challenges" || raw === "sandbox-challenges") return "challenges";

    const stored = String(localStorage.getItem("netology_progress_type") || "").trim().toLowerCase();
    if (["courses", "modules", "lessons", "quizzes", "tutorials", "challenges"].includes(stored)) {
      return stored;
    }
    return "courses";
  }

  function setNavCounts(counts) {
    document.querySelectorAll(".net-progress-nav-btn").forEach((btn) => {
      const type = btn.getAttribute("data-type");
      if (!type || !counts) return;

      let value = 0;
      if (type === "courses") {
        value = (counts["in-progress"] || 0) + (counts["completed-courses"] || 0);
      } else if (type === "modules") {
        value = (counts["modules-in-progress"] || 0) + (counts["modules-completed"] || 0);
      } else {
        value = counts[type] || 0;
      }

      let badge = btn.querySelector(".net-progress-nav-count");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "net-progress-nav-count";
        btn.appendChild(badge);
      }
      animateCount(badge, value);
      badge.classList.remove("is-animated");
      void badge.offsetWidth;
      badge.classList.add("is-animated");
    });
  }

  function showEmpty(type) {
    const empty = getById("progressEmpty");
    if (!empty) return;

    const cfg = SECTION_CONFIG[type] || SECTION_CONFIG.courses;
    empty.classList.remove("d-none");

    const icon = empty.querySelector("i");
    if (icon && cfg.icon) icon.className = `bi ${cfg.icon}`;

    const title = getById("progressEmptyTitle");
    if (title && cfg.emptyTitle) title.textContent = cfg.emptyTitle;

    const text = getById("progressEmptyText");
    if (text && cfg.emptyText) text.textContent = cfg.emptyText;

    const cta = getById("progressEmptyCta");
    if (cta) {
      const iconName = cfg.ctaIcon || "bi-journal-bookmark";
      const label = cfg.ctaText || "Browse courses";
      cta.innerHTML = `<i class="bi ${iconName} me-2"></i>${label}`;
      cta.setAttribute("href", cfg.ctaLink || "courses.html");
    }
  }

  /* Hero Stats */
  async function loadHeroStats(user) {
    try {
      const [summaryData, streakData, achieveData] = await Promise.all([
        apiGet(ENDPOINTS.courses?.userProgressSummary || "/user-progress-summary", { email: user.email }).catch(() => null),
        apiGet(ENDPOINTS.progress?.userStreaks || "/api/user/streaks", { user_email: user.email }).catch(() => null),
        apiGet(ENDPOINTS.achievements?.list || "/api/user/achievements", { user_email: user.email }).catch(() => null)
      ]);

      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      if (summaryData && summaryData.success) {
        set("heroCoursesActive", summaryData.in_progress || 0);
        set("heroLessons", summaryData.lessons_done || 0);
      }

      if (streakData && streakData.success) {
        set("heroStreak", streakData.current_streak || 0);
      }

      if (achieveData && achieveData.success) {
        set("heroAchievements", achieveData.total_unlocked || 0);
      }
    } catch (err) {
      console.error("Error loading hero stats:", err);
    }
  }

  /* Data fetch (courses + progress) */
  async function fetchUserCourses(email) {
    if (!email) return [];
    try {
      const data = await apiGet(ENDPOINTS.courses?.userCourses || "/user-courses", { email });
      const courses = listFrom(data, "courses");
      if (data && data.success && Array.isArray(courses)) return courses;
    } catch {
      // ignore
    }

    const content = getCourseContent();
    return Object.keys(content).map((id) => ({
      id,
      title: content[id]?.title || `Course ${id}`,
      description: content[id]?.description || "",
      difficulty: content[id]?.difficulty || "novice",
      estimated_time: content[id]?.estimatedTime || "",
      progress_pct: 0,
      status: "not-started"
    }));
  }

  function getStartedCourses(email) {
    if (!email) return new Map();
    const raw = localStorage.getItem(`netology_started_courses:${email}`);
    const list = parseJsonSafe(raw, []) || [];
    const map = new Map();
    list.forEach((entry) => {
      if (!entry) return;
      const key = String(entry.id);
      if (entry.lastLesson) map.set(key, Number(entry.lastLesson));
    });
    return map;
  }

  async function buildNavCounts(courses, content, email, completionsMap) {
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

    if (!Array.isArray(courses) || !courses.length) {
      counts.tutorials = countTutorialEntries(email);
      return counts;
    }

    const startedMap = getStartedCourses(email);

    const results = await Promise.all(
      courses.map(async (course) => {
        const courseContent = resolveCourseContent(course, content);
        const required = countRequiredItems(courseContent);
        const completions = completionsMap?.get(String(course.id)) || await fetchCourseCompletions(email, course.id);
        const lessons = completions.lesson.size;
        const quizzes = completions.quiz.size;
        const challenges = completions.challenge.size;
        const done = lessons + quizzes + challenges;

        let status = "not-started";
        if (required > 0 && done >= required) status = "completed";
        else if (done > 0) status = "in-progress";

        let modulesIn = 0;
        let modulesDone = 0;
        if (courseContent && Array.isArray(courseContent.units)) {
          const modules = buildModulesFromCourse(courseContent);
          const courseStarted = done > 0 || startedMap.has(String(course.id));
          modules.forEach((mod) => {
            const prog = computeModuleProgress(mod, completions);
            if (prog.completed) modulesDone += 1;
            else if (courseStarted) modulesIn += 1;
          });
        }

        return { lessons, quizzes, challenges, status, modulesIn, modulesDone };
      })
    );

    results.forEach((item) => {
      counts.lessons += item.lessons;
      counts.quizzes += item.quizzes;
      counts.challenges += item.challenges;
      counts["modules-in-progress"] += item.modulesIn;
      counts["modules-completed"] += item.modulesDone;
      if (item.status === "completed") counts["completed-courses"] += 1;
      if (item.status === "in-progress") counts["in-progress"] += 1;
    });

    counts.tutorials = countTutorialEntries(email);
    return counts;
  }

  function countTutorialEntries(email) {
    if (!email) return 0;
    const prefix = `netology_tutorial_progress:${email}:`;
    let count = 0;
    Object.keys(localStorage).forEach((key) => {
      if (!key.startsWith(prefix)) return;
      const parts = key.replace(prefix, "").split(":");
      if (parts.length < 2) return;
      const courseId = parts[0];
      const lessonNumber = Number(parts[1] || 0);
      if (!courseId || !lessonNumber) return;
      count += 1;
    });
    return count;
  }

  /* Render: course cards */
  function renderCourseCards(courses, list, viewType, startedMap) {
    if (!courses.length) return;

    courses.forEach((c) => {
      const card = document.createElement("div");
      card.className = "net-card net-coursecard-enhanced mb-3";

      const contentId = c.contentId;
      const lastLesson = startedMap?.get(String(c.id));
      const link = (viewType === "in-progress" && lastLesson)
        ? buildLessonLink(c.id, contentId, lastLesson)
        : buildCourseLink(c.id, contentId);

      const body = document.createElement("div");
      body.className = "d-flex flex-column flex-md-row gap-4 p-4";

      const visual = document.createElement("div");
      visual.className = "net-course-visual";
      const icon = document.createElement("i");
      icon.className = viewType === "completed-courses" ? "bi bi-check-circle-fill" : "bi bi-journal-album";
      visual.appendChild(icon);

      const info = document.createElement("div");
      info.className = "flex-grow-1";

      const header = document.createElement("div");
      header.className = "d-flex align-items-center gap-2 mb-1";
      const diffBadge = document.createElement("span");
      const diff = String(c.difficulty || "novice").toLowerCase();
      diffBadge.className = `net-diffbadge net-badge-${diff === "intermediate" ? "int" : diff === "advanced" ? "adv" : "nov"}`;
      diffBadge.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
      header.appendChild(diffBadge);

      const title = document.createElement("h3");
      title.className = "h5 fw-bold mb-2";
      title.textContent = c.title || "Course";

      const desc = document.createElement("p");
      desc.className = "text-muted small mb-3";
      desc.style.maxWidth = "600px";
      desc.textContent = c.description || "No description available.";

      const stats = document.createElement("div");
      stats.className = "d-flex flex-wrap gap-3 small text-muted";
      if (c.estimated_time) {
        stats.innerHTML += `<span><i class="bi bi-clock me-1"></i>${c.estimated_time}</span>`;
      }

      const progress = Number(c.progress_pct || 0);
      const progWrap = document.createElement("div");
      progWrap.className = "mt-3";
      progWrap.style.maxWidth = "280px";
      const progInfo = document.createElement("div");
      progInfo.className = "d-flex justify-content-between small mb-1";
      progInfo.innerHTML = `<span>Progress</span><span class="fw-semibold">${progress}%</span>`;

      const bar = document.createElement("div");
      bar.className = "net-meter";
      const fill = document.createElement("div");
      fill.className = "net-meter-fill";
      fill.style.width = `${progress}%`;
      bar.appendChild(fill);
      progWrap.append(progInfo, bar);

      info.append(header, title, desc, stats, progWrap);

      const actions = document.createElement("div");
      actions.className = "d-flex flex-column align-items-md-end justify-content-center gap-2 min-w-150";

      const primaryBtn = document.createElement("a");
      primaryBtn.className = "btn btn-teal";
      primaryBtn.href = link;
      primaryBtn.innerHTML = viewType === "in-progress"
        ? `<i class="bi bi-play-fill me-1"></i> Resume`
        : `<i class="bi bi-eye me-1"></i> Review`;

      actions.appendChild(primaryBtn);

      body.append(visual, info, actions);
      card.appendChild(body);
      list.appendChild(card);
    });
  }

  function renderCourseSplit(inProgress, completed, list, startedMap, totals) {
    const split = document.createElement("div");
    split.className = "net-progress-split";

    const inCol = buildCourseColumn("In progress", inProgress.length, "in-progress", totals?.inXp);
    renderCourseCards(inProgress, inCol.body, "in-progress", startedMap);
    if (!inProgress.length) renderEmptyColumn(inCol.body, "No active courses yet.");

    const doneCol = buildCourseColumn("Completed", completed.length, "completed-courses", totals?.doneXp);
    renderCourseCards(completed, doneCol.body, "completed-courses");
    if (!completed.length) renderEmptyColumn(doneCol.body, "No completed courses yet.");

    split.append(inCol.wrap, doneCol.wrap);
    list.appendChild(split);
  }

  function buildCourseColumn(title, count, type, xpTotal) {
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
    countPill.textContent = `${count}`;

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

  async function buildCourseProgressList(courses, content, email, completionsMap) {
    if (!Array.isArray(courses)) return [];
    return Promise.all(
      courses.map(async (course) => {
        const contentId = resolveContentIdByTitle(course.title, content) || course.id;
        const courseContent = resolveCourseContent(course, content);
        const completions = completionsMap?.get(String(course.id)) || await fetchCourseCompletions(email, course.id);
        const items = buildCourseItems(courseContent);
        const earnedXp = sumXpForCompletions(items, completions);

        let status = course.status;
        if (!status || status === "not-started") {
          const required = countRequiredItems(courseContent);
          const done = completions.lesson.size + completions.quiz.size + completions.challenge.size;
          if (required > 0 && done >= required) status = "completed";
          else if (done > 0) status = "in-progress";
          else status = "not-started";
        }

        return { ...course, contentId, earnedXp, status };
      })
    );
  }

  function sumXpForCompletions(items, completions) {
    if (!items || !items.length) return 0;
    let total = 0;
    items.forEach((it) => {
      const n = Number(it.lesson_number || 0);
      if (!n) return;
      if (it.type === "learn" && completions.lesson.has(n)) total += Number(it.xp || 0);
      if (it.type === "quiz" && completions.quiz.has(n)) total += Number(it.xp || 0);
      if (it.type === "challenge" && completions.challenge.has(n)) total += Number(it.xp || 0);
    });
    return total;
  }

  async function buildModuleSplitGroups(courses, content, email, startedMap, completionsMap) {
    const inGroups = [];
    const doneGroups = [];

    for (const course of (courses || [])) {
      const courseId = course.id;
      const contentId = resolveContentIdByTitle(course.title, content) || courseId;
      const courseContent = resolveCourseContent(course, content);
      if (!courseContent || !Array.isArray(courseContent.units)) continue;

      const completions = completionsMap?.get(String(courseId)) || await fetchCourseCompletions(email, courseId);
      const doneCount = completions.lesson.size + completions.quiz.size + completions.challenge.size;
      const courseStarted = doneCount > 0 || (startedMap && startedMap.has(String(courseId)));

      const modules = buildModulesFromCourse(courseContent);
      const inItems = [];
      const doneItems = [];

      modules.forEach((mod) => {
        const prog = computeModuleProgress(mod, completions);
        if (!prog.total) return;

        const label = mod.index || mod.number || "";
        const item = {
          number: label,
          title: mod.title || `Module ${label}`,
          link: buildModuleLink(courseId, contentId, mod.id || label),
          meta: `Module ${label} - ${prog.done}/${prog.total} items`,
          ctaLabel: prog.completed ? "Review Module" : "Open Module"
        };

        if (prog.completed) doneItems.push(item);
        else if (courseStarted) inItems.push(item);
      });

      if (inItems.length) {
        inGroups.push({
          courseId,
          contentId,
          title: course.title || `Course ${courseId}`,
          items: inItems
        });
      }
      if (doneItems.length) {
        doneGroups.push({
          courseId,
          contentId,
          title: course.title || `Course ${courseId}`,
          items: doneItems
        });
      }
    }

    return { inGroups, doneGroups };
  }

  function computeModuleProgress(module, completions) {
    const required = (module.items || []).filter((it) =>
      it.type === "learn" || it.type === "quiz" || it.type === "challenge"
    );
    const done = required.filter((it) => isItemCompleted(it, completions)).length;
    const total = required.length || 0;
    return { done, total, completed: total > 0 && done === total };
  }

  function isItemCompleted(item, completions) {
    if (!item || !completions) return false;
    const n = Number(item.lesson_number || 0);
    if (!n) return false;
    if (item.type === "learn") return completions.lesson.has(n);
    if (item.type === "quiz") return completions.quiz.has(n);
    if (item.type === "challenge") return completions.challenge.has(n);
    return false;
  }

  function renderSplitGroups(inGroups, doneGroups, list, type) {
    const split = document.createElement("div");
    split.className = "net-progress-split";

    const inCount = countGroupItems(inGroups);
    const doneCount = countGroupItems(doneGroups);

    const inCol = buildCourseColumn("In progress", inCount, "in-progress");
    renderCompletionGroups(inGroups, inCol.body, type, "continue");
    if (!inGroups.length) renderEmptyColumn(inCol.body, "Nothing in progress yet.");

    const doneCol = buildCourseColumn("Completed", doneCount, "completed-courses");
    renderCompletionGroups(doneGroups, doneCol.body, type, "review");
    if (!doneGroups.length) renderEmptyColumn(doneCol.body, "Nothing completed yet.");

    split.append(inCol.wrap, doneCol.wrap);
    list.appendChild(split);
  }

  function renderEmptyColumn(body, message) {
    const card = document.createElement("div");
    card.className = "net-card p-4 net-progress-empty-col";
    const icon = document.createElement("i");
    icon.className = "bi bi-info-circle";
    const text = document.createElement("div");
    text.className = "small text-muted";
    text.textContent = message;
    card.append(icon, text);
    body.appendChild(card);
  }

  function countGroupItems(groups) {
    return (groups || []).reduce((sum, g) => sum + (g.items ? g.items.length : 0), 0);
  }

  async function renderSelectedSection(list, courses, content, email, completionsMap, type) {
    const totals = { inTotal: 0, doneTotal: 0 };
    const startedMap = getStartedCourses(email);
    if (list) list.replaceChildren();

    const cfg = SECTION_CONFIG[type] || SECTION_CONFIG.courses;
    const section = buildProgressSection(type, cfg);
    list.appendChild(section.wrap);

    if (type === "courses") {
      const coursesWithProgress = await buildCourseProgressList(courses, content, email, completionsMap);
      const inProgress = coursesWithProgress.filter((c) => c.status === "in-progress");
      const completed = coursesWithProgress.filter((c) => c.status === "completed");
      const inXp = inProgress.reduce((sum, c) => sum + Number(c.earnedXp || 0), 0);
      const doneXp = completed.reduce((sum, c) => sum + Number(c.earnedXp || 0), 0);
      totals.inTotal += inProgress.length;
      totals.doneTotal += completed.length;
      if (totals.inTotal || totals.doneTotal) {
        renderCourseSplit(inProgress, completed, section.body, startedMap, { inXp, doneXp });
      }
      return totals;
    }

    if (type === "modules") {
      const split = await buildModuleSplitGroups(courses, content, email, startedMap, completionsMap);
      totals.inTotal += countGroupItems(split.inGroups);
      totals.doneTotal += countGroupItems(split.doneGroups);
      if (totals.inTotal || totals.doneTotal) {
        renderSplitGroups(split.inGroups, split.doneGroups, section.body, type);
      }
      return totals;
    }

    const split = await buildSplitGroups(type, courses, content, email, startedMap, completionsMap);
    totals.inTotal += countGroupItems(split.inGroups);
    totals.doneTotal += countGroupItems(split.doneGroups);
    if (totals.inTotal || totals.doneTotal) {
      renderSplitGroups(split.inGroups, split.doneGroups, section.body, type);
    }
    return totals;
  }

  function buildProgressSection(id, cfg) {
    const wrap = document.createElement("section");
    wrap.className = "net-progress-section";
    wrap.id = id;
    wrap.setAttribute("data-progress-section", id);

    const head = document.createElement("div");
    head.className = "net-card p-4 net-progress-section-head net-section-head";

    const title = document.createElement("div");
    title.className = "net-progress-section-title net-section-title";
    title.textContent = cfg?.title || "";

    const sub = document.createElement("div");
    sub.className = "net-section-sub";
    sub.textContent = cfg?.subtitle || "";

    head.append(title, sub);

    const body = document.createElement("div");
    body.className = "net-progress-section-body";

    wrap.append(head, body);
    return { wrap, body };
  }

  async function buildSplitGroups(type, courses, content, email, startedMap, completionsMap) {
    if (type === "tutorials") {
      return buildTutorialSplitGroups(courses, content, email);
    }

    const inGroups = [];
    const doneGroups = [];
    const targetType = type === "lessons" ? "learn" : type === "quizzes" ? "quiz" : "challenge";

    for (const course of (courses || [])) {
      const courseId = course.id;
      const contentId = resolveContentIdByTitle(course.title, content) || courseId;
      const courseContent = resolveCourseContent(course, content);
      const titleMap = buildLessonTitleMap(courseContent);

      const completions = completionsMap?.get(String(courseId)) || await fetchCourseCompletions(email, courseId);
      const doneCount = completions.lesson.size + completions.quiz.size + completions.challenge.size;
      const courseStarted = doneCount > 0 || (startedMap && startedMap.has(String(courseId)));

      const items = collectItemsForType(courseContent, targetType);
      if (!items.length) continue;

      const doneItems = [];
      const inItems = [];
      const doneSet = targetType === "quiz" ? completions.quiz
        : targetType === "challenge" ? completions.challenge
          : completions.lesson;

      items.forEach((it) => {
        const n = Number(it.lesson_number || 0);
        if (!n) return;
        const base = {
          number: n,
          title: titleMap.get(n) || `Lesson ${n}`,
          link: targetType === "challenge"
            ? buildChallengeLink(courseId, contentId, n)
            : buildLessonLink(courseId, contentId, n)
        };
        if (doneSet.has(n)) {
          doneItems.push(base);
        } else if (courseStarted) {
          inItems.push(base);
        }
      });

      if (inItems.length) {
        inGroups.push({
          courseId,
          contentId,
          title: course.title || `Course ${courseId}`,
          items: inItems.sort((a, b) => a.number - b.number)
        });
      }
      if (doneItems.length) {
        doneGroups.push({
          courseId,
          contentId,
          title: course.title || `Course ${courseId}`,
          items: doneItems.sort((a, b) => a.number - b.number)
        });
      }
    }

    return { inGroups, doneGroups };
  }

  function collectItemsForType(course, targetType) {
    const items = buildCourseItems(course).filter((it) => it.type === targetType);
    const seen = new Set();
    const unique = [];
    items.forEach((it) => {
      const n = Number(it.lesson_number || 0);
      if (!n || seen.has(n)) return;
      seen.add(n);
      unique.push(it);
    });
    return unique;
  }

  function buildTutorialSplitGroups(courses, content, email) {
    const inMap = new Map();
    const doneMap = new Map();
    if (!email) return { inGroups: [], doneGroups: [] };

    const prefix = `netology_tutorial_progress:${email}:`;
    Object.keys(localStorage).forEach((key) => {
      if (!key.startsWith(prefix)) return;
      const parts = key.replace(prefix, "").split(":");
      if (parts.length < 2) return;
      const courseId = parts[0];
      const lessonNumber = Number(parts[1] || 0);
      if (!courseId || !lessonNumber) return;

      const progress = parseJsonSafe(localStorage.getItem(key), {}) || {};
      const checked = Array.isArray(progress.checked) ? progress.checked.filter(Boolean).length : 0;

      const courseMeta = (courses || []).find((c) => String(c.id) === String(courseId));
      const contentId = resolveContentIdByTitle(courseMeta?.title, content) || courseId;
      const courseContent = resolveCourseContent(courseMeta || { id: courseId }, content);
      const titleMap = buildLessonTitleMap(courseContent);
      const stepsTotal = countTutorialSteps(courseContent, lessonNumber);
      const title = titleMap.get(lessonNumber) || `Lesson ${lessonNumber}`;

      const item = {
        number: lessonNumber,
        title,
        link: buildTutorialLink(courseId, contentId, lessonNumber),
        meta: `Tutorial - ${checked}/${stepsTotal || 0} steps`
      };

      const isComplete = stepsTotal > 0 ? checked >= stepsTotal : false;
      const targetMap = isComplete ? doneMap : inMap;
      const list = targetMap.get(courseId) || [];
      list.push(item);
      targetMap.set(courseId, list);
    });

    const buildGroups = (map) => {
      const groups = [];
      map.forEach((items, courseId) => {
        const courseMeta = (courses || []).find((c) => String(c.id) === String(courseId));
        groups.push({
          courseId,
          contentId: resolveContentIdByTitle(courseMeta?.title, content) || courseId,
          title: courseMeta?.title || `Course ${courseId}`,
          items: items.sort((a, b) => a.number - b.number)
        });
      });
      return groups;
    };

    return { inGroups: buildGroups(inMap), doneGroups: buildGroups(doneMap) };
  }

  function renderCompletionGroups(groups, list, type, mode = "continue") {
    const cfg = getTypeConfig(type);

    groups.forEach((group) => {
      const card = document.createElement("div");
      card.className = `net-card net-progress-card net-card-fixed net-focus-card mb-3 ${cfg.cardType}`;

      const header = document.createElement("div");
      header.className = "d-flex align-items-start justify-content-between flex-wrap gap-3 mb-2 net-progress-group-head";

      const left = document.createElement("div");
      left.className = "d-flex align-items-start gap-3";

      const pill = document.createElement("div");
      pill.className = "net-progress-pill";
      const pillIcon = document.createElement("i");
      pillIcon.className = `bi ${cfg.icon}`;
      pill.appendChild(pillIcon);

      const titleWrap = document.createElement("div");
      const title = document.createElement("div");
      title.className = "fw-semibold";
      title.textContent = String(group.title || "Course");
      const sub = document.createElement("div");
      sub.className = "small text-muted";
      sub.textContent = `${group.items.length} ${cfg.label.toLowerCase()}${group.items.length === 1 ? "" : "s"}`;
      titleWrap.append(title, sub);
      const statusRow = document.createElement("div");
      statusRow.className = "d-flex flex-wrap gap-2 mt-2";
      statusRow.appendChild(makeStatusChip(mode === "review" ? "completed" : "progress"));
      titleWrap.appendChild(statusRow);
      left.append(pill, titleWrap);

      const openLink = document.createElement("a");
      openLink.className = "btn btn-outline-secondary btn-sm";
      openLink.href = buildCourseLink(group.courseId, group.contentId);
      const openIcon = document.createElement("i");
      openIcon.className = "bi bi-arrow-right me-2";
      openLink.append(openIcon, document.createTextNode("Open course"));

      header.append(left, openLink);

      const listEl = document.createElement("ul");
      listEl.className = "net-progress-items net-card-body";

      group.items.forEach((item) => {
        const li = document.createElement("li");
        const link = document.createElement("a");
        const variant = cfg.variant ? ` net-progress-item--${cfg.variant}` : "";
        link.href = item.link;
        link.className = `net-progress-item${variant} net-focus-card`;

        const pill = document.createElement("span");
        pill.className = "net-progress-item-pill";
        const iconEl = document.createElement("i");
        iconEl.className = `bi ${cfg.icon}`;
        pill.appendChild(iconEl);

        const textWrap = document.createElement("span");
        textWrap.className = "net-progress-item-text";

        const title = document.createElement("span");
        title.className = "net-progress-item-title";
        title.textContent = String(item.title || "");

        const meta = document.createElement("span");
        meta.className = "net-progress-item-meta";
        meta.textContent = item.meta ? String(item.meta) : `${cfg.label} ${item.number}`;

        textWrap.append(title, meta);
        const cta = document.createElement("span");
        cta.className = "net-progress-item-cta";
        const ctaIcon = document.createElement("i");
        ctaIcon.className = "bi bi-arrow-right";
        const ctaLabel = item.ctaLabel || (mode === "review" ? cfg.ctaReview : cfg.ctaProgress);
        cta.append(ctaIcon, document.createTextNode(` ${ctaLabel}`));

        link.append(pill, textWrap, cta);
        li.appendChild(link);
        listEl.appendChild(li);
      });

      card.append(header, listEl);
      list.appendChild(card);
    });
  }

  function getTypeConfig(type) {
    const config = {
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

    return config[type] || config.lessons;
  }

  /* Completion lookup */
  async function fetchCourseCompletions(email, courseId) {
    const key = `${email || ""}:${courseId || ""}`;
    if (completionCache.has(key)) return completionCache.get(key);
    if (completionPromiseCache.has(key)) return completionPromiseCache.get(key);

    const promise = (async () => {
      const api = getApiBase();
      if (api && email && courseId) {
        try {
          const data = await apiGet(ENDPOINTS.courses?.userCourseStatus || "/user-course-status", {
            email,
            course_id: courseId
          });
          if (data && data.success) {
            const result = {
              lesson: new Set((data.lessons || []).map(Number)),
              quiz: new Set((data.quizzes || []).map(Number)),
              challenge: new Set((data.challenges || []).map(Number))
            };
            completionCache.set(key, result);
            completionPromiseCache.delete(key);
            return result;
          }
        } catch {
          // ignore
        }
      }

      const local = getCourseCompletionsLocal(email, courseId);
      completionCache.set(key, local);
      completionPromiseCache.delete(key);
      return local;
    })();

    completionPromiseCache.set(key, promise);
    return promise;
  }

  async function buildCompletionsMap(email, courses) {
    const map = new Map();
    if (!email || !Array.isArray(courses) || !courses.length) return map;
    await Promise.all(
      courses.map(async (course) => {
        const id = String(course.id || "");
        if (!id) return;
        const completions = await fetchCourseCompletions(email, id);
        map.set(id, completions);
      })
    );
    return map;
  }

  function getCourseCompletionsLocal(email, courseId) {
    if (!email || !courseId) {
      return { lesson: new Set(), quiz: new Set(), challenge: new Set() };
    }

    const raw = localStorage.getItem(`netology_completions:${email}:${courseId}`);
    const payload = parseJsonSafe(raw, {}) || {};
    const lessonArr = payload.lesson || payload.lessons || payload.learn || [];
    const quizArr = payload.quiz || payload.quizzes || [];
    const chArr = payload.challenge || payload.challenges || [];

    return {
      lesson: new Set((lessonArr || []).map(Number)),
      quiz: new Set((quizArr || []).map(Number)),
      challenge: new Set((chArr || []).map(Number))
    };
  }

  /* Content helpers */
  function getCourseContent() {
    if (typeof window.COURSE_CONTENT !== "undefined") return window.COURSE_CONTENT || {};
    if (typeof COURSE_CONTENT !== "undefined") return COURSE_CONTENT || {};
    return {};
  }

  function resolveCourseContent(course, content) {
    if (!course || !content) return null;
    const byTitle = resolveContentIdByTitle(course.title, content);
    if (byTitle && content[byTitle]) return content[byTitle];
    return content[String(course.id)] || null;
  }

  function resolveContentIdByTitle(title, content) {
    if (!title || !content) return null;
    const target = String(title).trim().toLowerCase();
    const list = Object.values(content);
    const match = list.find((c) => String(c?.title || "").trim().toLowerCase() === target);
    return match?.id ? String(match.id) : null;
  }

  function buildModulesFromCourse(course) {
    if (!course || !Array.isArray(course.units)) return [];
    const modules = [];
    let lessonCounter = 1;

    course.units.forEach((unit, idx) => {
      const normalized = normalizeUnitItems(unit, lessonCounter);
      const module = {
        id: unit.id || `module-${idx + 1}`,
        index: idx + 1,
        title: unit.title || `Module ${idx + 1}`,
        items: normalized.items
      };
      modules.push(module);
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

  function normalizeUnitItems(unit, startingLessonNumber) {
    const items = [];
    let lessonCounter = startingLessonNumber;

    const pushItem = (type, data) => {
      items.push({
        type,
        title: data.title || data.name || capitalize(type),
        lesson_number: Number(data.lesson_number || data.lessonNumber || 0),
        xp: Number(data.xp || data.xpReward || data.xp_reward || 0),
        steps: Array.isArray(data.steps) ? data.steps : []
      });
    };

    if (Array.isArray(unit.sections)) {
      unit.sections.forEach((sec) => {
        const t = String(sec.type || sec.kind || sec.title || "").toLowerCase();
        const secItems = sec.items || sec.lessons || [];
        if (!Array.isArray(secItems)) return;

        secItems.forEach((li) => {
          const type = mapSectionTypeToItemType(t, li);
          pushItem(type, li);
        });
      });
    }

    if (!items.length && unit.sections && typeof unit.sections === "object" && !Array.isArray(unit.sections)) {
      const obj = unit.sections;
      (obj.learn || obj.lesson || obj.lessons || []).forEach((li) => pushItem("learn", li));
      (obj.quiz || obj.quizzes || []).forEach((li) => pushItem("quiz", li));
      (obj.practice || obj.sandbox || []).forEach((li) => pushItem("sandbox", li));
      (obj.challenge || obj.challenges || []).forEach((li) => pushItem("challenge", li));
    }

    if (!items.length && Array.isArray(unit.lessons)) {
      unit.lessons.forEach((li) => {
        const t = String(li.type || "learn").toLowerCase();
        pushItem(
          t === "quiz" ? "quiz" :
            t === "sandbox" || t === "practice" ? "sandbox" :
              t === "challenge" ? "challenge" :
                "learn",
          li
        );
      });
    }

    let lastLearn = lessonCounter - 1;
    items.forEach((it) => {
      if (it.type === "learn") {
        if (!it.lesson_number) {
          it.lesson_number = lessonCounter++;
        } else {
          lessonCounter = Math.max(lessonCounter, it.lesson_number + 1);
        }
        lastLearn = it.lesson_number;
      } else {
        if (!it.lesson_number) {
          it.lesson_number = Math.max(1, lastLearn || 1);
        }
      }

      if (!it.xp) {
        it.xp =
          it.type === "quiz" ? 60 :
            it.type === "challenge" ? 80 :
              it.type === "sandbox" ? 30 :
                40;
      }
    });

    items.sort((a, b) => {
      if (a.lesson_number !== b.lesson_number) return a.lesson_number - b.lesson_number;
      const order = { learn: 1, quiz: 2, sandbox: 3, challenge: 4 };
      return (order[a.type] || 9) - (order[b.type] || 9);
    });

    return { items, nextLessonCounter: lessonCounter };
  }

  function mapSectionTypeToItemType(sectionType, item) {
    const t = String(item.type || "").toLowerCase();
    if (t === "quiz") return "quiz";
    if (t === "challenge") return "challenge";
    if (t === "sandbox" || t === "practice") return "sandbox";
    if (t === "learn") return "learn";

    if (sectionType.includes("quiz")) return "quiz";
    if (sectionType.includes("challenge")) return "challenge";
    if (sectionType.includes("practice") || sectionType.includes("sandbox") || sectionType.includes("hands-on")) return "sandbox";
    return "learn";
  }

  function buildLessonTitleMap(course) {
    const map = new Map();
    const items = buildCourseItems(course);
    items.forEach((it) => {
      if (it.type !== "learn") return;
      const n = Number(it.lesson_number || 0);
      if (!n || map.has(n)) return;
      map.set(n, it.title || `Lesson ${n}`);
    });
    return map;
  }

  function countRequiredItems(course) {
    const items = buildCourseItems(course);
    return items.filter((it) =>
      it.type === "learn" || it.type === "quiz" || it.type === "sandbox" || it.type === "challenge"
    ).length;
  }

  function countTutorialSteps(course, lessonNumber) {
    if (!course || !Array.isArray(course.units)) return 0;
    let lessonCounter = 1;
    let count = 0;

    course.units.forEach((unit) => {
      (unit.sections || []).forEach((sec) => {
        (sec.items || []).forEach((item) => {
          const type = String(item.type || "").toLowerCase();
          if (type === "learn") {
            if (lessonCounter === lessonNumber) {
              count = Math.max(count, (item.steps || []).length);
            }
            lessonCounter += 1;
          } else if (type === "practice" || type === "sandbox") {
            if (lessonCounter - 1 === lessonNumber) {
              count = Math.max(count, (item.steps || []).length);
            }
          }
        });
      });
    });

    return count;
  }

  /* URL + DOM helpers */
  function getById(id) {
    return document.getElementById(id);
  }

  function animateCount(el, target) {
    if (!el) return;
    const to = Number(target || 0);
    const from = Number(el.dataset.count || el.textContent || 0);
    if (!Number.isFinite(to) || !Number.isFinite(from) || from === to) {
      el.textContent = String(to);
      el.dataset.count = String(to);
      return;
    }
    const start = performance.now();
    const duration = 420;
    const tick = (now) => {
      const pct = Math.min(1, (now - start) / duration);
      const value = Math.round(from + (to - from) * pct);
      el.textContent = String(value);
      if (pct < 1) requestAnimationFrame(tick);
      else el.dataset.count = String(to);
    };
    requestAnimationFrame(tick);
  }

  function renderLoadingState(list) {
    if (!list) return;
    const wrap = document.createElement("div");
    wrap.className = "net-progress-loading";

    for (let i = 0; i < 2; i += 1) {
      const card = document.createElement("div");
      card.className = "net-card p-4";

      const line1 = document.createElement("div");
      line1.className = "net-skel net-w-40 mb-2";
      const line2 = document.createElement("div");
      line2.className = "net-skel net-w-80 mb-2";
      const line3 = document.createElement("div");
      line3.className = "net-skel net-w-60";

      card.append(line1, line2, line3);
      wrap.appendChild(card);
    }

    list.replaceChildren(wrap);
  }

  function makeStatusChip(status) {
    const chip = document.createElement("span");
    const icon = document.createElement("i");
    let label = "Active";
    let cls = "net-status-chip net-status-chip--active";
    let iconCls = "bi bi-play-circle";

    if (status === "completed") {
      label = "Completed";
      cls = "net-status-chip net-status-chip--completed";
      iconCls = "bi bi-check2-circle";
    } else if (status === "locked") {
      label = "Locked";
      cls = "net-status-chip net-status-chip--locked";
      iconCls = "bi bi-lock-fill";
    } else if (status === "progress") {
      label = "In progress";
      cls = "net-status-chip net-status-chip--progress";
      iconCls = "bi bi-arrow-repeat";
    }

    chip.className = cls;
    icon.className = iconCls;
    icon.setAttribute("aria-hidden", "true");
    chip.append(icon, document.createTextNode(label));
    return chip;
  }

  /* Link helpers */
  function buildCourseLink(courseId, contentId) {
    const params = new URLSearchParams();
    params.set("id", String(courseId));
    if (contentId) params.set("content_id", String(contentId));
    return `course.html?${params.toString()}`;
  }

  function buildLessonLink(courseId, contentId, lessonNumber) {
    const params = new URLSearchParams();
    params.set("course_id", String(courseId));
    if (contentId) params.set("content_id", String(contentId));
    params.set("lesson", String(lessonNumber));
    return `lesson.html?${params.toString()}`;
  }

  function buildChallengeLink(courseId, contentId, lessonNumber) {
    const params = new URLSearchParams();
    params.set("course_id", String(courseId));
    if (contentId) params.set("content_id", String(contentId));
    params.set("lesson", String(lessonNumber));
    params.set("mode", "challenge");
    params.set("challenge", "1");
    return `sandbox.html?${params.toString()}`;
  }

  function buildTutorialLink(courseId, contentId, lessonNumber) {
    const params = new URLSearchParams();
    params.set("course_id", String(courseId));
    if (contentId) params.set("content_id", String(contentId));
    params.set("lesson", String(lessonNumber));
    params.set("mode", "practice");
    return `sandbox.html?${params.toString()}`;
  }

  function buildModuleLink(courseId, contentId, moduleId) {
    const params = new URLSearchParams();
    params.set("id", String(courseId));
    if (contentId) params.set("content_id", String(contentId));
    if (moduleId) params.set("module", String(moduleId));
    return `course.html?${params.toString()}`;
  }

  /* Chrome: sidebar, dropdown, identity, logout */
  function wireChrome(user) {
    wireSidebar();
    wireUserDropdown();
    fillIdentity(user);
    fillSidebarXP(user);

    const topLogout = getById("topLogoutBtn");
    const sideLogout = getById("sideLogoutBtn");
    if (topLogout) topLogout.addEventListener("click", logout);
    if (sideLogout) sideLogout.addEventListener("click", logout);
  }

  function wireSidebar() {
    const openBtn = getById("openSidebarBtn");
    const closeBtn = getById("closeSidebarBtn");
    const sidebar = getById("slideSidebar");
    const backdrop = getById("sideBackdrop");

    const open = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
      sidebar.setAttribute("aria-hidden", "false");
      backdrop.setAttribute("aria-hidden", "false");
    };

    const close = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
      sidebar.setAttribute("aria-hidden", "true");
      backdrop.setAttribute("aria-hidden", "true");
    };

    openBtn?.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    backdrop?.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sidebar?.classList.contains("is-open")) close();
    });
  }

  function wireUserDropdown() {
    const btn = getById("userBtn");
    const dd = getById("userDropdown");
    if (!btn || !dd) return;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = dd.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", (e) => {
      if (!dd.contains(e.target) && !btn.contains(e.target)) {
        dd.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  function fillIdentity(user) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "Student";
    const email = user.email || "";
    const initial = (name.charAt(0) || "S").toUpperCase();
    const totalXP = Number(user.xp || 0);
    const level = Number.isFinite(Number(user.numeric_level)) ? Number(user.numeric_level) : levelFromXP(totalXP);
    const rank = user.rank || rankForLevel(level);

    const set = (id, text) => {
      const el = getById(id);
      if (el) el.textContent = text;
    };

    set("topAvatar", initial);
    set("ddName", name);
    set("ddEmail", email);
    set("ddAvatar", initial);
    set("ddLevel", `Level ${level}`);
    set("ddRank", rank);
    set("sideAvatar", initial);
    set("sideUserName", name);
    set("sideUserEmail", email);
    set("sideLevelBadge", `Lv ${level}`);
  }

  function fillSidebarXP(user) {
    const totalXP = Number(user?.xp || 0) || 0;
    const progress = computeXPFromTotal(totalXP);
    const set = (id, text) => {
      const el = getById(id);
      if (el) el.textContent = text;
    };
    set("sideLevelBadge", `Lv ${progress.level}`);
    set("sideXPText", `${progress.currentLevelXP}/${progress.xpNext}`);
    const bar = getById("sideXPBar");
    if (bar) bar.style.width = `${progress.xpProgressPct}%`;
    set("sideXpHint", `${progress.toNext} XP to next level`);
  }

  function logout() {
    localStorage.removeItem("netology_user");
    localStorage.removeItem("netology_token");
    localStorage.removeItem("user");
    window.location.href = "index.html";
  }

  /* XP helpers */
  function totalXpForLevel(level) {
    const lvl = Math.max(1, Number(level) || 1);
    return BASE_XP * (lvl - 1) * lvl / 2;
  }

  function levelFromXP(totalXP) {
    const xp = Math.max(0, Number(totalXP) || 0);
    const t = xp / BASE_XP;
    const lvl = Math.floor((1 + Math.sqrt(1 + 8 * t)) / 2);
    return Math.max(1, lvl);
  }

  function xpForNextLevel(level) {
    const lvl = Math.max(1, Number(level) || 1);
    return BASE_XP * lvl;
  }

  function computeXPFromTotal(totalXP) {
    const level = levelFromXP(totalXP);
    const levelStart = totalXpForLevel(level);
    const currentLevelXP = Math.max(0, totalXP - levelStart);
    const xpNext = xpForNextLevel(level);
    const xpProgressPct = Math.max(0, Math.min(100, (currentLevelXP / Math.max(xpNext, 1)) * 100));
    const toNext = Math.max(0, xpNext - currentLevelXP);
    return { level, currentLevelXP, xpNext, xpProgressPct, toNext };
  }

  function rankForLevel(level) {
    if (Number(level) >= 5) return "Advanced";
    if (Number(level) >= 3) return "Intermediate";
    return "Novice";
  }

  /* Storage helpers */
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
