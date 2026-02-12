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

  const TYPE_CONFIG = {
    lessons: {
      title: "Lessons completed",
      subtitle: "Every lesson you’ve finished so far, grouped by course.",
      badge: "Lessons",
      empty: "No lessons completed yet."
    },
    quizzes: {
      title: "Quizzes completed",
      subtitle: "All quizzes you’ve passed so far, grouped by course.",
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

    const list = getById("progressList");
    const empty = getById("progressEmpty");

    if (!list || !empty) return;

    list.replaceChildren();
    empty.classList.add("d-none");

    const courses = await fetchUserCourses(user.email);
    const content = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT) ? COURSE_CONTENT : {};

    if (type === "completed-courses" || type === "in-progress") {
      const filtered = filterCoursesByStatus(courses, content, user.email, type);
      setText("progressMeta", `${filtered.length} course${filtered.length === 1 ? "" : "s"}`);
      renderCourseCards(filtered, list);
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

  /* AI Prompt: Explain the URL + DOM helpers section in clear, simple terms. */
  /* =========================================================
     URL + DOM helpers
  ========================================================= */
  function getTypeParam() {
    const params = new URLSearchParams(window.location.search);
    return String(params.get("type") || "").trim().toLowerCase();
  }

  function getById(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const node = getById(id);
    if (node) node.textContent = value;
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
    setText("topUserName", user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user.username || "User"));
    setText("ddName", user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user.username || "User"));
    setText("ddEmail", user.email || "");

    const avatar = getById("topAvatar");
    if (avatar) avatar.textContent = String(user.first_name || user.username || "U").charAt(0).toUpperCase();

    const logoutBtn = getById("logoutBtn");
    logoutBtn?.addEventListener("click", () => {
      localStorage.removeItem("netology_user");
      localStorage.removeItem("user");
      window.location.href = "index.html";
    });
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

  /* AI Prompt: Explain the Render: course cards section in clear, simple terms. */
  /* =========================================================
     Render: course cards
  ========================================================= */
  function renderCourseCards(courses, list) {
    if (!courses.length) return;

    courses.forEach((c) => {
      const card = document.createElement("div");
      card.className = "net-card p-4 mb-3";
      const link = buildCourseLink(c.id, c.contentId);
      const progress = Number(c.progress_pct || 0);

      const row = document.createElement("div");
      row.className = "d-flex align-items-start justify-content-between flex-wrap gap-3";

      const left = document.createElement("div");
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

      left.append(title, desc, progressLine);

      const action = document.createElement("a");
      action.className = "btn btn-teal btn-sm";
      action.href = link;
      const actionIcon = document.createElement("i");
      actionIcon.className = "bi bi-arrow-right-circle me-2";
      action.append(actionIcon, document.createTextNode("Open course"));

      row.append(left, action);
      card.appendChild(row);
      list.appendChild(card);
    });
  }

  /* AI Prompt: Explain the Build completion groups section in clear, simple terms. */
  /* =========================================================
     Build completion groups
  ========================================================= */
  async function buildCompletionGroups(type, courses, content, email) {
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

  /* AI Prompt: Explain the Render: completion groups section in clear, simple terms. */
  /* =========================================================
     Render: completion groups
  ========================================================= */
  function renderCompletionGroups(groups, list, type) {
    const icon = type === "challenges" ? "bi-flag" : "bi-check2-circle";
    const label = type === "challenges" ? "Challenge" : "Lesson";
    groups.forEach((group) => {
      const card = document.createElement("div");
      card.className = "net-card p-4 mb-3";

      const header = document.createElement("div");
      header.className = "d-flex align-items-start justify-content-between flex-wrap gap-3 mb-2";

      const title = document.createElement("div");
      title.className = "fw-semibold";
      title.textContent = String(group.title || "Course");

      const openLink = document.createElement("a");
      openLink.className = "btn btn-outline-secondary btn-sm";
      openLink.href = buildCourseLink(group.courseId, group.contentId);
      const openIcon = document.createElement("i");
      openIcon.className = "bi bi-arrow-right me-2";
      openLink.append(openIcon, document.createTextNode("Open course"));

      header.append(title, openLink);

      const listEl = document.createElement("ul");
      listEl.className = "net-progress-items";

      group.items.forEach((item) => {
        const li = document.createElement("li");
        const link = document.createElement("a");
        link.href = item.link;

        const iconEl = document.createElement("i");
        iconEl.className = `bi ${icon} me-2`;

        const titleText = document.createTextNode(String(item.title || ""));
        const meta = document.createElement("span");
        meta.className = "text-muted";
        meta.textContent = `• ${label} ${item.number}`;

        link.append(iconEl, titleText, document.createTextNode(" "), meta);
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

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
