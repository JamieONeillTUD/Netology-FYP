/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 12/02/2026

progress.js – Progress detail lists for dashboard stats.
*/

(() => {
  "use strict";

  /* AI Prompt: Explain the API base + page config section in clear, simple terms. */
  /* =========================================================
     API base + page config
  ========================================================= */
  const getApiBase = () => window.API_BASE || "";
  const BASE_XP = 100;

  const TYPE_CONFIG = {
    lessons: {
      title: "Lessons completed",
      subtitle: "Every lesson you’ve finished so far, grouped by course.",
      badge: "Lessons",
      empty: "No lessons completed yet."
    },
    quizzes: {
      title: "Quizzes completed",
      subtitle: "All quizzes you’ve completed so far, grouped by course.",
      badge: "Quizzes",
      empty: "No quizzes completed yet."
    },
    challenges: {
      title: "Challenges completed",
      subtitle: "Your hands-on challenge completions, grouped by course.",
      badge: "Challenges",
      empty: "No challenges completed yet."
    },
    "in-progress": {
      title: "Courses in progress",
      subtitle: "Pick up right where you left off.",
      badge: "In progress",
      empty: "No courses in progress yet."
    },
    "completed-courses": {
      title: "Completed courses",
      subtitle: "A record of courses you’ve finished.",
      badge: "Completed",
      empty: "No completed courses yet."
    },
    tutorials: {
      title: "Sandbox tutorials",
      subtitle: "Step-by-step tutorials you’ve started in the sandbox.",
      badge: "Tutorials",
      empty: "No tutorials started yet."
    }
  };

  /* AI Prompt: Explain the Page init wiring section in clear, simple terms. */
  /* =========================================================
     Page init wiring
  ========================================================= */
  document.addEventListener("DOMContentLoaded", () => {
    initProgressPage().catch((err) => console.error("Progress init failed:", err));
  });

  /* AI Prompt: Explain the Main init flow section in clear, simple terms. */
  /* =========================================================
     Main init flow
  ========================================================= */
  async function initProgressPage() {
    const user = getCurrentUser();
    if (!user?.email) {
      window.location.href = "login.html";
      return;
    }

    wireChrome(user);

    const type = getTypeParam();
    const cfg = TYPE_CONFIG[type] || TYPE_CONFIG["completed-courses"];
    setText("progressTitle", cfg.title);
    setText("progressSubtitle", cfg.subtitle);
    setText("progressBadge", cfg.badge);
    setActiveNav(type);

    const list = getById("progressList");
    const empty = getById("progressEmpty");

    if (!list || !empty) return;

    list.replaceChildren();
    empty.classList.add("d-none");

    const courses = await fetchUserCourses(user.email);
    const content = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) ? COURSE_CONTENT : {};

    const navCounts = await buildNavCounts(courses, content, user.email);
    setNavCounts(navCounts);

    if (type === "completed-courses" || type === "in-progress") {
      const filtered = filterCoursesByStatus(courses, content, user.email, type);
      const startedMap = type === "in-progress" ? getStartedCourses(user.email) : null;
      setText("progressMeta", `${filtered.length} course${filtered.length === 1 ? "" : "s"}`);
      renderCourseCards(filtered, list, type, startedMap);
      if (!filtered.length) showEmpty(cfg.empty);
      return;
    }

    const grouped = await buildCompletionGroups(type, courses, content, user.email);
    const totalItems = grouped.reduce((sum, g) => sum + g.items.length, 0);
    setText("progressMeta", `${totalItems} item${totalItems === 1 ? "" : "s"} across ${grouped.length} course${grouped.length === 1 ? "" : "s"}`);
    renderCompletionGroups(grouped, list, type);
    if (!grouped.length) showEmpty(cfg.empty);

    function showEmpty(message) {
      empty.classList.remove("d-none");
      empty.querySelector(".small")?.replaceChildren(document.createTextNode(message));
    }
  }

  function setActiveNav(type) {
    document.querySelectorAll(".net-progress-nav-btn").forEach((btn) => {
      const t = btn.getAttribute("data-type");
      btn.classList.toggle("is-active", t === type);
    });
  }

  function setNavCounts(counts) {
    document.querySelectorAll(".net-progress-nav-btn").forEach((btn) => {
      const t = btn.getAttribute("data-type");
      if (!t || !counts || typeof counts[t] === "undefined") return;
      let badge = btn.querySelector(".net-progress-nav-count");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "net-progress-nav-count";
        btn.appendChild(badge);
      }
      badge.textContent = String(counts[t]);
      badge.classList.remove("is-animated");
      void badge.offsetWidth;
      badge.classList.add("is-animated");
    });
  }

  /* AI Prompt: Explain the URL + DOM helpers section in clear, simple terms. */
  /* =========================================================
     URL + DOM helpers
  ========================================================= */
  function getTypeParam() {
    const params = new URLSearchParams(window.location.search);
    const raw = String(params.get("type") || "").trim().toLowerCase();
    if (raw === "courses") return "in-progress";
    if (TYPE_CONFIG[raw]) return raw;
    return "in-progress";
  }

  function getById(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const node = getById(id);
    if (node) node.textContent = value;
  }

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

  function rankForLevel(level) {
    if (Number(level) >= 5) return "Advanced";
    if (Number(level) >= 3) return "Intermediate";
    return "Novice";
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

  /* AI Prompt: Explain the Storage + user helpers section in clear, simple terms. */
  /* =========================================================
     Storage + user helpers
  ========================================================= */
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

  /* AI Prompt: Explain the Chrome (sidebar + user dropdown) section in clear, simple terms. */
  /* =========================================================
     Chrome (sidebar + user dropdown)
  ========================================================= */
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
      if (e.key === "Escape") {
        close();
        toggleDropdown(false);
      }
    });
  }

  function wireUserDropdown() {
    const userBtn = getById("userBtn");
    const dd = getById("userDropdown");
    if (!userBtn || !dd) return;

    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    dd.addEventListener("click", (e) => e.stopPropagation());

    document.addEventListener("click", (e) => {
      const t = e.target;
      if (dd.contains(t) || userBtn.contains(t)) return;
      toggleDropdown(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") toggleDropdown(false);
    });
  }

  function toggleDropdown(force) {
    const dd = getById("userDropdown");
    const userBtn = getById("userBtn");
    if (!dd) return;

    const open = typeof force === "boolean" ? force : !dd.classList.contains("is-open");
    dd.classList.toggle("is-open", open);
    if (userBtn) userBtn.setAttribute("aria-expanded", String(open));
  }

  function fillIdentity(user) {
    const fullName =
      user?.name ||
      `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
      user?.username ||
      "Student";

    const initial = (fullName || "S").trim().charAt(0).toUpperCase();
    const totalXP = Number(user?.xp || 0) || 0;
    const progress = computeXPFromTotal(totalXP);
    const rank = rankForLevel(progress.level);

    setText("topAvatar", initial);
    setText("ddName", fullName);
    setText("ddEmail", user?.email || "");
    setText("ddAvatar", initial);
    setText("ddLevel", `Level ${progress.level}`);
    setText("ddRank", rank);

    setText("sideAvatar", initial);
    setText("sideUserName", fullName);
    setText("sideUserEmail", user?.email || "");
  }

  function fillSidebarXP(user) {
    const totalXP = Number(user?.xp || 0) || 0;
    const progress = computeXPFromTotal(totalXP);
    setText("sideLevelBadge", `Lv ${progress.level}`);
    setText("sideXPText", `${progress.currentLevelXP}/${progress.xpNext}`);
    const bar = getById("sideXPBar");
    if (bar) bar.style.width = `${progress.xpProgressPct}%`;
    setText("sideXpHint", `${progress.toNext} XP to next level`);
  }

  function logout() {
    localStorage.removeItem("netology_user");
    localStorage.removeItem("netology_token");
    localStorage.removeItem("user");
    window.location.href = "index.html";
  }

  /* AI Prompt: Explain the Data fetch (courses + progress) section in clear, simple terms. */
  /* =========================================================
     Data fetch (courses + progress)
  ========================================================= */
  async function fetchUserCourses(email) {
    const api = getApiBase();
    if (api && email) {
      try {
        const res = await fetch(`${api}/user-courses?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data && data.success && Array.isArray(data.courses)) {
          return data.courses;
        }
      } catch {
        // ignore
      }
    }

    const content = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) ? COURSE_CONTENT : {};
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

  function filterCoursesByStatus(courses, content, email, type) {
    const list = (courses || []).map((c) => {
      const merged = { ...c };
      merged.contentId = resolveContentIdByTitle(c.title, content);

      if (!merged.status || merged.status === "not-started") {
        const comps = getCourseCompletionsLocal(email, merged.id);
        const required = countRequiredItems(resolveCourseContent(merged, content));
        const done = comps.lesson.size + comps.quiz.size + comps.challenge.size;
        if (required > 0 && done >= required) merged.status = "completed";
        else if (done > 0) merged.status = "in-progress";
      }
      return merged;
    });

    if (type === "completed-courses") {
      return list.filter((c) => c.status === "completed");
    }
    if (type === "in-progress") {
      return list.filter((c) => c.status === "in-progress");
    }
    return list;
  }

  async function buildNavCounts(courses, content, email) {
    const counts = {
      "in-progress": 0,
      "completed-courses": 0,
      lessons: 0,
      quizzes: 0,
      challenges: 0,
      tutorials: 0
    };

    if (!Array.isArray(courses) || !courses.length) {
      counts.tutorials = countTutorialEntries(email);
      return counts;
    }

    const results = await Promise.all(
      courses.map(async (course) => {
        const courseContent = resolveCourseContent(course, content);
        const required = countRequiredItems(courseContent);
        const completions = await fetchCourseCompletions(email, course.id);
        const lessons = completions.lesson.size;
        const quizzes = completions.quiz.size;
        const challenges = completions.challenge.size;
        const done = lessons + quizzes + challenges;
        let status = "not-started";
        if (required > 0 && done >= required) status = "completed";
        else if (done > 0) status = "in-progress";
        return { lessons, quizzes, challenges, status };
      })
    );

    results.forEach((item) => {
      counts.lessons += item.lessons;
      counts.quizzes += item.quizzes;
      counts.challenges += item.challenges;
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

  /* AI Prompt: Explain the Render: course cards section in clear, simple terms. */
  /* =========================================================
     Render: course cards
  ========================================================= */
  function renderCourseCards(courses, list, viewType, startedMap) {
    if (!courses.length) return;

    courses.forEach((c) => {
      const card = document.createElement("div");
      const variant = viewType === "completed-courses" ? "green" : "teal";
      card.className = `net-card p-4 mb-3 net-progress-card net-progress-card--${variant}`;
      const link = buildCourseLink(c.id, c.contentId);
      const progress = Number(c.progress_pct || 0);
      const lastLesson = startedMap?.get(String(c.id));

      const row = document.createElement("div");
      row.className = "d-flex align-items-start gap-3 flex-wrap";

      const left = document.createElement("div");
      left.className = "d-flex align-items-start gap-3";

      const pill = document.createElement("div");
      pill.className = "net-progress-pill";
      const pillIcon = document.createElement("i");
      pillIcon.className =
        viewType === "completed-courses"
          ? "bi bi-check2-circle"
          : "bi bi-play-circle";
      pill.appendChild(pillIcon);

      const textWrap = document.createElement("div");
      const title = document.createElement("div");
      title.className = "fw-semibold";
      title.textContent = String(c.title || "Course");

      const desc = document.createElement("div");
      desc.className = "small text-muted";
      desc.textContent = String(c.description || "No description available.");

      const progressLine = document.createElement("div");
      progressLine.className = "small text-muted mt-2";
      const progIcon = document.createElement("i");
      progIcon.className = "bi bi-bar-chart me-1";
      progressLine.append(progIcon, document.createTextNode(`${progress}% complete`));

      textWrap.append(title, desc, progressLine);

      if (viewType === "in-progress" && lastLesson) {
        const hint = document.createElement("div");
        hint.className = "small text-muted mt-1";
        const hintIcon = document.createElement("i");
        hintIcon.className = "bi bi-play-circle me-1";
        hint.append(hintIcon, document.createTextNode(`Continue from lesson ${lastLesson}`));
        textWrap.append(hint);
      }
      left.append(pill, textWrap);

      const action = document.createElement("a");
      action.className = "btn btn-teal btn-sm net-progress-cta";
      action.href = (viewType === "in-progress" && lastLesson)
        ? buildLessonLink(c.id, c.contentId, lastLesson)
        : link;
      const actionIcon = document.createElement("i");
      actionIcon.className = "bi bi-arrow-right-circle me-2";
      action.append(actionIcon, document.createTextNode(viewType === "in-progress" ? "Continue" : "Open course"));

      row.append(left);
      card.appendChild(row);

      const ctaRow = document.createElement("div");
      ctaRow.className = "net-progress-cta-row mt-3";
      ctaRow.appendChild(action);
      card.appendChild(ctaRow);
      list.appendChild(card);
    });
  }

  /* AI Prompt: Explain the Build completion groups section in clear, simple terms. */
  /* =========================================================
     Build completion groups
  ========================================================= */
  async function buildCompletionGroups(type, courses, content, email) {
    if (type === "tutorials") {
      return buildTutorialGroups(courses, content, email);
    }
    const groups = [];
    for (const course of (courses || [])) {
      const courseId = course.id;
      const contentId = resolveContentIdByTitle(course.title, content) || courseId;
      const courseContent = resolveCourseContent(course, content);
      const titleMap = buildLessonTitleMap(courseContent);

      const completions = await fetchCourseCompletions(email, courseId);
      let set = completions.lesson;
      if (type === "quizzes") set = completions.quiz;
      if (type === "challenges") set = completions.challenge;
      if (!set.size) continue;

      const items = Array.from(set)
        .sort((a, b) => a - b)
        .map((n) => ({
          number: n,
          title: titleMap.get(n) || `Lesson ${n}`,
          link: type === "challenges"
            ? buildChallengeLink(courseId, contentId, n)
            : buildLessonLink(courseId, contentId, n)
        }));

      groups.push({
        courseId,
        contentId,
        title: course.title || `Course ${courseId}`,
        items
      });
    }

    return groups;
  }

  function buildTutorialGroups(courses, content, email) {
    const groupsMap = new Map();
    if (!email) return [];

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

      const items = groupsMap.get(courseId) || [];
      items.push({
        number: lessonNumber,
        title,
        link: buildTutorialLink(courseId, contentId, lessonNumber),
        meta: `Tutorial • ${checked}/${stepsTotal || 0} steps`
      });
      groupsMap.set(courseId, items);
    });

    const groups = [];
    groupsMap.forEach((items, courseId) => {
      const courseMeta = (courses || []).find((c) => String(c.id) === String(courseId));
      groups.push({
        courseId,
        contentId: resolveContentIdByTitle(courseMeta?.title, content) || courseId,
        title: courseMeta?.title || `Course ${courseId}`,
        items: items.sort((a, b) => a.number - b.number)
      });
    });

    return groups;
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

  /* AI Prompt: Explain the Render: completion groups section in clear, simple terms. */
  /* =========================================================
     Render: completion groups
  ========================================================= */
  function renderCompletionGroups(groups, list, type) {
    const icon =
      type === "challenges" ? "bi-flag" :
      type === "quizzes" ? "bi-patch-question" :
      type === "tutorials" ? "bi-diagram-3" :
      "bi-journal-check";
    const label =
      type === "challenges" ? "Challenge" :
      type === "quizzes" ? "Quiz" :
      type === "tutorials" ? "Tutorial" :
      "Lesson";
    const variant =
      type === "challenges" ? "violet" :
      type === "quizzes" ? "blue" :
      type === "tutorials" ? "teal" :
      "teal";
    groups.forEach((group) => {
      const card = document.createElement("div");
      card.className = `net-card p-4 mb-3 net-progress-card net-progress-card--${variant}`;

      const header = document.createElement("div");
      header.className = "d-flex align-items-start justify-content-between flex-wrap gap-3 mb-2";

      const left = document.createElement("div");
      left.className = "d-flex align-items-start gap-3";

      const pill = document.createElement("div");
      pill.className = "net-progress-pill";
      const pillIcon = document.createElement("i");
      pillIcon.className = `bi ${icon}`;
      pill.appendChild(pillIcon);

      const titleWrap = document.createElement("div");
      const title = document.createElement("div");
      title.className = "fw-semibold";
      title.textContent = String(group.title || "Course");
      const sub = document.createElement("div");
      sub.className = "small text-muted";
      sub.textContent = `${group.items.length} ${label.toLowerCase()}${group.items.length === 1 ? "" : "s"}`;
      titleWrap.append(title, sub);
      left.append(pill, titleWrap);

      const openLink = document.createElement("a");
      openLink.className = "btn btn-outline-secondary btn-sm";
      openLink.href = buildCourseLink(group.courseId, group.contentId);
      const openIcon = document.createElement("i");
      openIcon.className = "bi bi-arrow-right me-2";
      openLink.append(openIcon, document.createTextNode("Open course"));

      header.append(left, openLink);

      const listEl = document.createElement("ul");
      listEl.className = "net-progress-items";

      group.items.forEach((item) => {
        const li = document.createElement("li");
        const link = document.createElement("a");
        link.href = item.link;
        link.className = `net-progress-item net-progress-item--${variant}`;

        const pill = document.createElement("span");
        pill.className = "net-progress-item-pill";
        const iconEl = document.createElement("i");
        iconEl.className = `bi ${icon}`;
        pill.appendChild(iconEl);

        const textWrap = document.createElement("span");
        textWrap.className = "net-progress-item-text";

        const title = document.createElement("span");
        title.className = "net-progress-item-title";
        title.textContent = String(item.title || "");

        const meta = document.createElement("span");
        meta.className = "net-progress-item-meta";
        meta.textContent = item.meta ? String(item.meta) : `${label} ${item.number}`;

        textWrap.append(title, meta);
        link.append(pill, textWrap);
        li.appendChild(link);
        listEl.appendChild(li);
      });

      card.append(header, listEl);
      list.appendChild(card);
    });
  }

  /* AI Prompt: Explain the Completion lookup section in clear, simple terms. */
  /* =========================================================
     Completion lookup
  ========================================================= */
  async function fetchCourseCompletions(email, courseId) {
    const api = getApiBase();
    if (api && email && courseId) {
      try {
        const res = await fetch(`${api}/user-course-status?email=${encodeURIComponent(email)}&course_id=${encodeURIComponent(courseId)}`);
        const data = await res.json();
        if (data && data.success) {
          return {
            lesson: new Set((data.lessons || []).map(Number)),
            quiz: new Set((data.quizzes || []).map(Number)),
            challenge: new Set((data.challenges || []).map(Number))
          };
        }
      } catch {
        // ignore
      }
    }

    return getCourseCompletionsLocal(email, courseId);
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

  /* AI Prompt: Explain the Title + link helpers section in clear, simple terms. */
  /* =========================================================
     Title + link helpers
  ========================================================= */
  function buildLessonTitleMap(course) {
    const map = new Map();
    if (!course || !Array.isArray(course.units)) return map;
    let idx = 1;
    course.units.forEach((unit) => {
      (unit.lessons || []).forEach((lesson) => {
        map.set(idx, lesson.title || `Lesson ${idx}`);
        idx += 1;
      });
    });
    return map;
  }

  function countRequiredItems(course) {
    if (!course || !course.units) return 0;
    let total = 0;
    course.units.forEach((unit) => {
      (unit.sections || []).forEach((sec) => {
        (sec.items || []).forEach((item) => {
          const t = String(item.type || "").toLowerCase();
          if (t === "learn" || t === "quiz" || t === "practice" || t === "sandbox" || t === "challenge") {
            total += 1;
          }
        });
      });
    });
    return total;
  }

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

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
