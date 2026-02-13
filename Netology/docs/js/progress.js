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
  const completionCache = new Map();
  const completionPromiseCache = new Map();

  const SECTION_CONFIG = {
    courses: {
      title: "Courses",
      subtitle: "Active and completed courses at a glance.",
      empty: "No course activity yet."
    },
    lessons: {
      title: "Lessons",
      subtitle: "Lessons grouped by course, split by status.",
      empty: "No lesson progress yet."
    },
    quizzes: {
      title: "Quizzes",
      subtitle: "Quiz progress, split into in-progress and completed.",
      empty: "No quizzes completed yet."
    },
    tutorials: {
      title: "Tutorials",
      subtitle: "Sandbox tutorials and checklist progress.",
      empty: "No tutorials started yet."
    },
    challenges: {
      title: "Challenges",
      subtitle: "Sandbox challenges by completion state.",
      empty: "No challenges completed yet."
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
    setActiveNav(type);
    wireNavPersistence();
    localStorage.setItem("netology_progress_type", type);

    const list = getById("progressList");
    const empty = getById("progressEmpty");

    if (!list || !empty) return;

    list.replaceChildren();
    empty.classList.add("d-none");
    renderLoadingState(list);

    const courses = await fetchUserCourses(user.email);
    const content = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) ? COURSE_CONTENT : {};

    const completionsMapPromise = buildCompletionsMap(user.email, courses);
    const navCountsPromise = completionsMapPromise.then((map) => buildNavCounts(courses, content, user.email, map));
    const totalsPromise = completionsMapPromise.then((map) => renderSelectedSection(list, courses, content, user.email, map, type));

    const navCounts = await navCountsPromise;
    setNavCounts(navCounts);

    const totals = await totalsPromise;
    if (!totals.inTotal && !totals.doneTotal) {
      const cfg = SECTION_CONFIG[type] || SECTION_CONFIG.courses;
      showEmpty(cfg.empty || "No progress to show yet.");
    }

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");
  }

  function showEmpty(message) {
    const empty = getById("progressEmpty");
    if (!empty) return;
    empty.classList.remove("d-none");
    empty.querySelector(".small")?.replaceChildren(document.createTextNode(message));
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

  function setActiveNav(type) {
    document.querySelectorAll(".net-progress-nav-btn").forEach((btn) => {
      const t = btn.getAttribute("data-type");
      btn.classList.toggle("is-active", t === type);
    });
  }

  function wireNavPersistence() {
    document.querySelectorAll(".net-progress-nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-type");
        if (t) localStorage.setItem("netology_progress_type", t);
      });
    });
  }

  function setNavCounts(counts) {
    document.querySelectorAll(".net-progress-nav-btn").forEach((btn) => {
      const t = btn.getAttribute("data-type");
      if (!t || !counts) return;
      let badge = btn.querySelector(".net-progress-nav-count");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "net-progress-nav-count";
        btn.appendChild(badge);
      }
      const value = t === "courses"
        ? (counts["in-progress"] || 0) + (counts["completed-courses"] || 0)
        : (counts[t] || 0);
      animateCount(badge, value);
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
    if (raw === "courses") return "courses";
    if (raw === "in-progress" || raw === "completed-courses") return "courses";
    if (raw === "lessons") return "lessons";
    if (raw === "quizzes") return "quizzes";
    if (raw === "tutorials") return "tutorials";
    if (raw === "challenges") return "challenges";
    const stored = String(localStorage.getItem("netology_progress_type") || "").trim().toLowerCase();
    if (stored === "courses" || stored === "lessons" || stored === "quizzes" || stored === "tutorials" || stored === "challenges") {
      return stored;
    }
    return "courses";
  }

  function getById(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const node = getById(id);
    if (node) node.textContent = value;
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

  async function buildNavCounts(courses, content, email, completionsMap) {
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
        const completions = completionsMap?.get(String(course.id)) || await fetchCourseCompletions(email, course.id);
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
      card.className = "net-card net-progress-card net-card-fixed net-card--course net-focus-card mb-3";
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

      const chipRow = document.createElement("div");
      chipRow.className = "d-flex flex-wrap gap-2 mt-2";
      chipRow.appendChild(makeStatusChip(viewType === "completed-courses" ? "completed" : "progress"));

      textWrap.append(title, desc, progressLine, chipRow);

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
      const actionLabel = viewType === "in-progress"
        ? (lastLesson ? "Resume lesson" : "Resume course")
        : "Review course";
      action.append(actionIcon, document.createTextNode(actionLabel));

      row.append(left);

      const body = document.createElement("div");
      body.className = "net-card-body";
      body.appendChild(row);

      const footer = document.createElement("div");
      footer.className = "net-card-footer net-progress-cta-row";
      footer.appendChild(action);

      card.append(body, footer);
      list.appendChild(card);
    });
  }

  function renderCourseSplit(inProgress, completed, list, startedMap, totals) {
    const split = document.createElement("div");
    split.className = "net-progress-split";

    const inCol = buildCourseColumn("Active courses", inProgress.length, "in-progress", totals?.inXp);
    renderCourseCards(inProgress, inCol.body, "in-progress", startedMap);
    if (!inProgress.length) renderEmptyColumn(inCol.body, "No active courses yet.");

    const doneCol = buildCourseColumn("Completed courses", completed.length, "completed-courses", totals?.doneXp);
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

  function buildCourseItems(course) {
    if (!course || !Array.isArray(course.units)) return [];
    const items = [];
    let lessonCounter = 1;

    course.units.forEach((unit) => {
      const unitItems = [];

      if (Array.isArray(unit.sections)) {
        unit.sections.forEach((sec) => {
          (sec.items || []).forEach((li) => {
            const type = mapItemType(li?.type || "");
            unitItems.push({
              type,
              lesson_number: li?.lesson_number || li?.lessonNumber,
              xp: Number(li?.xp || 0)
            });
          });
        });
      }

      if (!unitItems.length && unit.sections && typeof unit.sections === "object" && !Array.isArray(unit.sections)) {
        const obj = unit.sections;
        (obj.learn || obj.lesson || obj.lessons || []).forEach((li) => unitItems.push(mapPlainItem("learn", li)));
        (obj.quiz || obj.quizzes || []).forEach((li) => unitItems.push(mapPlainItem("quiz", li)));
        (obj.practice || obj.sandbox || []).forEach((li) => unitItems.push(mapPlainItem("sandbox", li)));
        (obj.challenge || obj.challenges || []).forEach((li) => unitItems.push(mapPlainItem("challenge", li)));
      }

      if (!unitItems.length && Array.isArray(unit.lessons)) {
        unit.lessons.forEach((li) => {
          const t = mapItemType(li?.type || "learn");
          unitItems.push({
            type: t,
            lesson_number: li?.lesson_number || li?.lessonNumber,
            xp: Number(li?.xp || 0)
          });
        });
      }

      let lastLearn = lessonCounter - 1;
      unitItems.forEach((it) => {
        if (it.type === "learn") {
          if (!it.lesson_number) {
            it.lesson_number = lessonCounter++;
          } else {
            lessonCounter = Math.max(lessonCounter, Number(it.lesson_number) + 1);
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
        items.push(it);
      });
    });

    return items;
  }

  function mapItemType(raw) {
    const t = String(raw || "").toLowerCase();
    if (t === "quiz") return "quiz";
    if (t === "challenge") return "challenge";
    if (t === "practice" || t === "sandbox") return "sandbox";
    return "learn";
  }

  function mapPlainItem(type, li) {
    return {
      type,
      lesson_number: li?.lesson_number || li?.lessonNumber,
      xp: Number(li?.xp || 0)
    };
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

  /* AI Prompt: Explain the Build completion groups section in clear, simple terms. */
  /* =========================================================
     Build completion groups
  ========================================================= */
  async function buildCompletionGroups(type, courses, content, email, completionsMap) {
    if (type === "tutorials") {
      return buildTutorialGroups(courses, content, email);
    }
    const groups = [];
    for (const course of (courses || [])) {
      const courseId = course.id;
      const contentId = resolveContentIdByTitle(course.title, content) || courseId;
      const courseContent = resolveCourseContent(course, content);
      const titleMap = buildLessonTitleMap(courseContent);

      const completions = completionsMap?.get(String(courseId)) || await fetchCourseCompletions(email, courseId);
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

  /* AI Prompt: Explain the Split: in-progress vs completed groups section in clear, simple terms. */
  /* =========================================================
     Split: in-progress vs completed groups
  ========================================================= */
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
        meta: `Tutorial • ${checked}/${stepsTotal || 0} steps`
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

  /* AI Prompt: Explain the Single-section renderer section in clear, simple terms. */
  /* =========================================================
     Single-section renderer
  ========================================================= */
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

  function scrollToSection(type) {
    if (!type) return;
    const target = document.querySelector(`[data-progress-section="${type}"]`);
    if (!target) return;
    setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
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
  function renderCompletionGroups(groups, list, type, mode = "continue") {
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
      const cardType =
        type === "quizzes" ? "net-card--quiz" :
        type === "challenges" ? "net-card--challenge" :
        type === "tutorials" ? "net-card--tutorial" :
        "net-card--lesson";
      card.className = `net-card net-progress-card net-card-fixed net-focus-card mb-3 ${cardType}`;

      const header = document.createElement("div");
      header.className = "d-flex align-items-start justify-content-between flex-wrap gap-3 mb-2 net-progress-group-head";

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
        link.href = item.link;
        link.className = `net-progress-item net-progress-item--${variant} net-focus-card`;

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
        const cta = document.createElement("span");
        cta.className = "net-progress-item-cta";
        const ctaIcon = document.createElement("i");
        ctaIcon.className = "bi bi-arrow-right";
        const verb = mode === "review" ? "Review" : "Resume";
        const ctaLabel =
          type === "quizzes" ? `${verb} Quiz` :
          type === "challenges" ? `${verb} Challenge` :
          type === "tutorials" ? `${verb} Tutorial` :
          `${verb} Lesson`;
        cta.append(ctaIcon, document.createTextNode(` ${ctaLabel}`));

        link.append(pill, textWrap, cta);
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
    const key = `${email || ""}:${courseId || ""}`;
    if (completionCache.has(key)) return completionCache.get(key);
    if (completionPromiseCache.has(key)) return completionPromiseCache.get(key);

    const promise = (async () => {
      const api = getApiBase();
      if (api && email && courseId) {
        try {
          const res = await fetch(`${api}/user-course-status?email=${encodeURIComponent(email)}&course_id=${encodeURIComponent(courseId)}`);
          const data = await res.json();
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
