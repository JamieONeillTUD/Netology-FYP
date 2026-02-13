/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/02/2026

lesson.js – Lesson page
- Loads lesson content from COURSE_CONTENT
- Links to quiz and sandbox practice/challenge
- Persists completion using backend when available
*/

(() => {
  "use strict";

  const getApiBase = () => window.API_BASE || "";

  const state = {
    user: null,
    courseId: null,
    courseContentId: null,
    lessonNumber: null,
    course: null,
    lessonEntry: null,
    itemsForLesson: [],
    challengeItem: null,
    practiceItem: null,
    quizItem: null,
    completedLessons: new Set(),
    activityIds: [],
    activityProgress: { completed: [] },
    readCompletionHandler: null,
  };

  let completionTimer = null;
  let completionInterval = null;

  /* AI Prompt: Explain the Core helpers section in clear, simple terms. */
  /* =========================================================
     Core helpers
  ========================================================= */

  function parseJsonSafe(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getById(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const node = getById(id);
    if (node) node.textContent = value;
  }

  function clearChildren(node) {
    if (node) node.replaceChildren();
  }

  function makeIcon(className) {
    const icon = document.createElement("i");
    icon.className = className;
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  function appendTextWithBreaks(node, text) {
    if (!node) return;
    const parts = String(text || "").split(/\n/);
    parts.forEach((part, idx) => {
      node.appendChild(document.createTextNode(part));
      if (idx < parts.length - 1) node.appendChild(document.createElement("br"));
    });
  }

  function addParagraphs(node, content) {
    if (!node) return;
    if (Array.isArray(content)) {
      content.forEach((p) => {
        const para = document.createElement("p");
        para.textContent = String(p ?? "");
        node.appendChild(para);
      });
      return;
    }
    if (typeof content === "string") {
      const para = document.createElement("p");
      appendTextWithBreaks(para, content);
      node.appendChild(para);
      return;
    }
    const para = document.createElement("p");
    para.textContent = "Lesson content not available.";
    node.appendChild(para);
  }

  function setButtonIconText(btn, iconClass, label) {
    if (!btn) return;
    btn.replaceChildren();
    const icon = document.createElement("i");
    icon.className = iconClass;
    icon.setAttribute("aria-hidden", "true");
    const text = document.createTextNode(` ${label}`);
    btn.append(icon, text);
  }

  function lessonActivityKey(email, courseId, lessonNumber) {
    const keyEmail = email || "guest";
    return `netology_lesson_activity:${keyEmail}:${courseId}:${lessonNumber}`;
  }

  function loadLessonActivityProgress() {
    const key = lessonActivityKey(state.user?.email || "guest", state.courseId, state.lessonNumber);
    const data = parseJsonSafe(localStorage.getItem(key)) || {};
    const completed = Array.isArray(data.completed) ? data.completed : [];
    return { completed };
  }

  function saveLessonActivityProgress(progress) {
    const key = lessonActivityKey(state.user?.email || "guest", state.courseId, state.lessonNumber);
    localStorage.setItem(key, JSON.stringify(progress || { completed: [] }));
  }

  function getBlockId(block, idx) {
    if (block && block.id) return String(block.id);
    return `${block?.type || "block"}-${idx}`;
  }

  function getActivityIds(blocks) {
    const ids = [];
    (blocks || []).forEach((block, idx) => {
      const type = String(block?.type || "").toLowerCase();
      if (type === "check" || type === "activity") ids.push(getBlockId(block, idx));
    });
    return ids;
  }

  function getActivityState() {
    const total = state.activityIds.length;
    const completedSet = new Set(state.activityProgress.completed || []);
    const doneCount = state.activityIds.filter((id) => completedSet.has(id)).length;
    const allDone = total > 0 && doneCount >= total;
    return { total, doneCount, allDone };
  }

  function updateLessonStatus() {
    const status = getById("lessonStatus");
    if (!status) return;
    const isDone = state.completedLessons.has(Number(state.lessonNumber));
    const activityState = getActivityState();
    const setChip = (cls, iconCls, label) => {
      status.className = `net-status-chip ${cls}`;
      status.replaceChildren(makeIcon(iconCls), document.createTextNode(` ${label}`));
    };
    if (isDone) {
      setChip("net-status-chip--completed", "bi bi-check2-circle", "Completed");
      return;
    }
    if (activityState.doneCount > 0) {
      setChip("net-status-chip--progress", "bi bi-arrow-repeat", "In progress");
      return;
    }
    setChip("net-status-chip--active", "bi bi-play-circle", "Not started");
  }

  async function finalizeLessonCompletion() {
    if (!state.user?.email) return;
    if (state.completedLessons.has(Number(state.lessonNumber))) return;

    const earnedXp = getEarnedLessonXP();
    const completion = await completeLesson(state.user.email, state.courseId, state.lessonNumber, earnedXp);
    const xpAwarded = Number(completion?.xpAdded ?? earnedXp);
    markLessonCompletionLocal(state.user.email, state.courseId, state.lessonNumber, xpAwarded);
    trackCourseStart(state.user.email, state.courseId, state.lessonNumber);
    state.completedLessons.add(Number(state.lessonNumber));
    if (completion?.usedBackend) {
      await refreshUserFromServer(state.user.email);
    } else {
      refreshUserFromStorage();
    }
    renderLesson();
    const { nextInUnit } = getLessonNeighbors();
    if (typeof window.showCelebrateToast === "function") {
      window.showCelebrateToast({
        title: "Lesson completed",
        message: state.lessonEntry?.lesson?.title || "Lesson progress saved.",
        sub: nextInUnit ? "Next lesson unlocked." : "Return to the course to continue.",
        xp: xpAwarded || 0,
        mini: true,
        duration: 20000
      });
    }
    showCompletionToast(nextInUnit);
  }

  function markActivityDone(blockId) {
    const progress = loadLessonActivityProgress();
    progress.completed = Array.isArray(progress.completed) ? progress.completed : [];
    if (!progress.completed.includes(blockId)) {
      progress.completed.push(blockId);
      saveLessonActivityProgress(progress);
      state.activityProgress = progress;
      updateLessonStatus();
      const activityState = getActivityState();
      if (activityState.allDone) {
        finalizeLessonCompletion();
      }
    }
  }

  function enableReadCompletion(contentEl) {
    if (!contentEl) return;
    if (state.readCompletionHandler) {
      window.removeEventListener("scroll", state.readCompletionHandler);
      state.readCompletionHandler = null;
    }
    const handler = () => {
      const rect = contentEl.getBoundingClientRect();
      const viewH = window.innerHeight || 0;
      if (rect.bottom <= viewH + 120) {
        window.removeEventListener("scroll", handler);
        state.readCompletionHandler = null;
        finalizeLessonCompletion();
      }
    };
    state.readCompletionHandler = handler;
    window.addEventListener("scroll", handler, { passive: true });
    handler();
  }

  function disableReadCompletion() {
    if (state.readCompletionHandler) {
      window.removeEventListener("scroll", state.readCompletionHandler);
      state.readCompletionHandler = null;
    }
  }

  function getCurrentUser() {
    return (
      parseJsonSafe(localStorage.getItem("netology_user")) ||
      parseJsonSafe(localStorage.getItem("user")) ||
      null
    );
  }

  function refreshUserFromStorage() {
    const user = getCurrentUser();
    if (!user) return;
    state.user = user;
    fillIdentity(user);
  }

  async function refreshUserFromServer(email) {
    const api = getApiBase();
    if (!api || !email) return null;
    try {
      const res = await fetch(`${api}/user-info?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!data || data.success === false) return null;
      updateUserStorage(data);
      state.user = { ...(state.user || {}), ...data };
      fillIdentity(state.user);
      return data;
    } catch {
      return null;
    }
  }

  function coursePageUrl() {
    const params = new URLSearchParams();
    params.set("id", String(state.courseId));
    if (state.courseContentId) params.set("content_id", String(state.courseContentId));
    if (state.lessonNumber) params.set("lesson", String(state.lessonNumber));
    return `course.html?${params.toString()}`;
  }

  function lessonUrl(lessonNumber) {
    const params = new URLSearchParams();
    params.set("course_id", String(state.courseId));
    if (state.courseContentId) params.set("content_id", String(state.courseContentId));
    params.set("lesson", String(lessonNumber));
    return `lesson.html?${params.toString()}`;
  }

  function resolveCourseByParam(courseId) {
    if (typeof COURSE_CONTENT === "undefined") return { course: null, id: null, fallback: false };
    const content = COURSE_CONTENT || {};
    let course = content[String(courseId)];
    if (course) return { course, id: String(course.id || courseId), fallback: false };

    const list = Object.values(content);
    const byId = list.find((c) => String(c?.id || "") === String(courseId));
    if (byId) return { course: byId, id: String(byId.id || courseId), fallback: false };

    const target = String(courseId || "").trim().toLowerCase();
    if (target) {
      const byTitle = list.find((c) => String(c?.title || "").trim().toLowerCase() === target);
      if (byTitle) return { course: byTitle, id: String(byTitle.id || courseId), fallback: false };
    }

    const firstKey = Object.keys(content)[0];
    if (firstKey) {
      return { course: content[firstKey], id: String(content[firstKey]?.id || firstKey), fallback: true };
    }

    return { course: null, id: null, fallback: false };
  }

  async function fetchCourseTitle(courseId) {
    const api = getApiBase();
    if (!api || !courseId) return "";
    try {
      const res = await fetch(`${api}/course?id=${encodeURIComponent(courseId)}`);
      const data = await res.json();
      if (data && data.success && data.title) return data.title;
    } catch {
      // ignore
    }
    return "";
  }

  function isLoggedIn(user) {
    return !!(user && (user.email || user.username));
  }

  function capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function xpForNextLevel(level) {
    return Number(level || 1) * 100;
  }

  function totalXpForLevel(level) {
    const lvl = Math.max(1, Number(level) || 1);
    return (lvl - 1) * lvl * 50; // 100 * (n-1)*n/2
  }

  function levelFromTotalXp(totalXp) {
    let level = 1;
    let remaining = Math.max(0, Number(totalXp) || 0);
    let step = 100;
    while (remaining >= step) {
      remaining -= step;
      level += 1;
      step += 100;
    }
    return level;
  }

  function rankForLevel(level) {
    if (Number(level) >= 5) return "Advanced";
    if (Number(level) >= 3) return "Intermediate";
    return "Novice";
  }

  function resolveXpProgress(user) {
    const totalXp = Math.max(0, Number(user?.xp || 0));
    const numericLevel = Number(user?.numeric_level);
    const level = Number.isFinite(numericLevel) && numericLevel > 0 ? numericLevel : levelFromTotalXp(totalXp);
    const levelStart = totalXpForLevel(level);
    const xpInto = Number.isFinite(Number(user?.xp_into_level))
      ? Number(user?.xp_into_level)
      : Math.max(0, totalXp - levelStart);
    const nextXp = Number.isFinite(Number(user?.next_level_xp))
      ? Number(user?.next_level_xp)
      : xpForNextLevel(level);
    const pct = nextXp ? Math.round((xpInto / nextXp) * 100) : 0;
    return { totalXp, level, xpInto, nextXp, pct };
  }

  function applyXpToUser(user, addXP) {
    const nextTotal = Math.max(0, Number(user?.xp || 0) + Number(addXP || 0));
    const nextLevel = levelFromTotalXp(nextTotal);
    const nextStart = totalXpForLevel(nextLevel);
    const xpInto = Math.max(0, nextTotal - nextStart);
    const nextXp = xpForNextLevel(nextLevel);
    return {
      ...user,
      xp: nextTotal,
      numeric_level: nextLevel,
      level: rankForLevel(nextLevel),
      rank: rankForLevel(nextLevel),
      xp_into_level: xpInto,
      next_level_xp: nextXp
    };
  }

  function updateUserStorage(nextUser) {
    if (!nextUser || !nextUser.email) return;
    const keys = ["netology_user", "user"];
    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const existing = parseJsonSafe(raw) || {};
      if (existing.email && existing.email !== nextUser.email) return;
      localStorage.setItem(key, JSON.stringify({ ...existing, ...nextUser }));
    });
  }

  function bumpUserXP(email, addXP) {
    if (!email || !addXP) return;
    const raw = localStorage.getItem("netology_user") || localStorage.getItem("user");
    const user = parseJsonSafe(raw) || {};
    if (!user || user.email !== email) return;
    const updated = applyXpToUser(user, addXP);
    if (localStorage.getItem("netology_user")) localStorage.setItem("netology_user", JSON.stringify(updated));
    if (localStorage.getItem("user")) localStorage.setItem("user", JSON.stringify(updated));
  }

  function logProgressEvent(email, payload) {
    if (!email) return;
    const entry = {
      type: payload.type,
      course_id: payload.course_id,
      lesson_number: payload.lesson_number,
      xp: Number(payload.xp || 0),
      ts: Date.now(),
      date: new Date().toISOString().slice(0, 10)
    };
    const key = `netology_progress_log:${email}`;
    const list = parseJsonSafe(localStorage.getItem(key)) || [];
    list.push(entry);
    localStorage.setItem(key, JSON.stringify(list));
  }

  function markLessonCompletionLocal(email, courseId, lessonNumber, xp) {
    if (!email || !courseId || !lessonNumber) return;
    const key = `netology_completions:${email}:${courseId}`;
    const data = parseJsonSafe(localStorage.getItem(key)) || { lesson: [], quiz: [], challenge: [] };
    const lessonArr = data.lesson || data.lessons || data.learn || [];
    if (!lessonArr.includes(Number(lessonNumber))) {
      lessonArr.push(Number(lessonNumber));
      data.lesson = lessonArr;
      localStorage.setItem(key, JSON.stringify(data));
      logProgressEvent(email, {
        type: "learn",
        course_id: courseId,
        lesson_number: lessonNumber,
        xp: Number(xp || 0)
      });
      bumpUserXP(email, Number(xp || 0));
    }
  }

  function getEarnedLessonXP() {
    const learnItem = state.itemsForLesson.find((it) => it.type === "learn") || state.itemsForLesson[0];
    const fallbackXp = state.lessonEntry?.lesson?.xp;
    return Number(learnItem?.xp || fallbackXp || 40);
  }

  /* AI Prompt: Explain the Progress tracking (local + backend) section in clear, simple terms. */
  /* =========================================================
     Progress tracking (local + backend)
  ========================================================= */

  function trackCourseStart(email, courseId, lessonNumber) {
    if (!email || !courseId) return;
    const key = `netology_started_courses:${email}`;
    const list = parseJsonSafe(localStorage.getItem(key)) || [];
    const existing = list.find((c) => String(c.id) === String(courseId));

    const payload = {
      id: String(courseId),
      lastViewed: Date.now(),
      lastLesson: Number(lessonNumber || 0) || undefined
    };

    if (existing) {
      existing.lastViewed = payload.lastViewed;
      if (payload.lastLesson) existing.lastLesson = payload.lastLesson;
    } else {
      list.push(payload);
    }

    localStorage.setItem(key, JSON.stringify(list));
    startCourseBackend(email, courseId);
  }

  async function startCourseBackend(email, courseId) {
    if (!email || !courseId) return;
    try {
      await fetch(`${getApiBase()}/start-course`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, course_id: Number(courseId) })
      });
    } catch {
      // best effort
    }
  }

  /* AI Prompt: Explain the Default resources (fallback links) section in clear, simple terms. */
  /* =========================================================
     Default resources (fallback links)
  ========================================================= */

  function buildDefaultResources(title, courseTitle) {
    const t = `${title || ""} ${courseTitle || ""}`.toLowerCase();
    const list = [];
    const add = (label, url) => {
      if (!list.find((r) => r.url === url)) list.push({ label, url });
    };

    if (t.includes("network")) add("Computer network overview", "https://en.wikipedia.org/wiki/Computer_network");
    if (t.includes("lan")) add("Local area network", "https://en.wikipedia.org/wiki/Local_area_network");
    if (t.includes("wan")) add("Wide area network", "https://en.wikipedia.org/wiki/Wide_area_network");
    if (t.includes("ethernet")) add("Ethernet basics", "https://en.wikipedia.org/wiki/Ethernet");
    if (t.includes("mac")) add("MAC address", "https://en.wikipedia.org/wiki/MAC_address");
    if (t.includes("ip")) add("IP address", "https://en.wikipedia.org/wiki/IP_address");
    if (t.includes("subnet")) add("Subnetting", "https://en.wikipedia.org/wiki/Subnetting");
    if (t.includes("gateway")) add("Default gateway", "https://en.wikipedia.org/wiki/Default_gateway");
    if (t.includes("vlan")) add("Virtual LAN", "https://en.wikipedia.org/wiki/Virtual_LAN");
    if (t.includes("trunk")) add("IEEE 802.1Q", "https://en.wikipedia.org/wiki/IEEE_802.1Q");
    if (t.includes("routing") || t.includes("ospf")) add("Routing (overview)", "https://en.wikipedia.org/wiki/Routing");
    if (t.includes("firewall")) add("Firewall", "https://en.wikipedia.org/wiki/Firewall_(computing)");
    if (t.includes("acl")) add("Access control list", "https://en.wikipedia.org/wiki/Access_control_list");
    if (t.includes("siem") || t.includes("logging")) add("SIEM", "https://en.wikipedia.org/wiki/Security_information_and_event_management");
    if (t.includes("bgp")) add("BGP", "https://en.wikipedia.org/wiki/Border_Gateway_Protocol");
    if (t.includes("automation")) add("Network automation", "https://en.wikipedia.org/wiki/Network_automation");
    if (t.includes("snmp")) add("SNMP", "https://en.wikipedia.org/wiki/Simple_Network_Management_Protocol");

    if (list.length < 3) {
      add("Internet protocol suite", "https://en.wikipedia.org/wiki/Internet_protocol_suite");
      add("OSI model", "https://en.wikipedia.org/wiki/OSI_model");
      add("Computer network topologies", "https://en.wikipedia.org/wiki/Network_topology");
    }

    return list.slice(0, 4);
  }

  /* AI Prompt: Explain the Init section in clear, simple terms. */
  /* =========================================================
     Init
  ========================================================= */

  document.addEventListener("DOMContentLoaded", () => {
    initLessonPage().catch((err) => {
      console.error("Lesson init failed:", err);
    });
  });

  async function initLessonPage() {
    const params = new URLSearchParams(window.location.search);
    state.courseId = params.get("course_id") || params.get("course") || "1";
    const contentParam = params.get("content_id") || params.get("content");
    state.courseContentId = contentParam ? String(contentParam) : null;
    state.lessonNumber = Number(params.get("lesson") || "1");

    // User
    const user = getCurrentUser();
    state.user = isLoggedIn(user) ? user : null;

    // Course content
    if (typeof COURSE_CONTENT === "undefined") {
      setText("lessonTitle", "Course content unavailable");
      document.body.classList.remove("net-loading");
      document.body.classList.add("net-loaded");
      return;
    }
    let resolved = resolveCourseByParam(state.courseContentId || state.courseId);
    if ((resolved.fallback || !resolved.course) && state.courseId) {
      const titleHint = await fetchCourseTitle(state.courseId);
      if (titleHint) {
        resolved = resolveCourseByParam(titleHint);
      }
    }
    state.course = resolved.course;
    if (!state.course) {
      setText("lessonTitle", "Course not found");
      document.body.classList.remove("net-loading");
      document.body.classList.add("net-loaded");
      return;
    }

    if (resolved.id && String(resolved.id) !== String(state.courseContentId || "")) {
      state.courseContentId = String(resolved.id);
      const url = new URL(window.location.href);
      url.searchParams.set("content_id", String(state.courseContentId));
      url.searchParams.delete("content");
      history.replaceState(null, "", url.toString());
    }

    // Chrome (after course resolution so back link is correct)
    wireBrandRouting();
    if (!state.user) wireChromeGuest();
    else wireChrome(state.user);

    if (state.user?.email) {
      trackCourseStart(state.user.email, state.courseId, state.lessonNumber);
    }

    // Flatten lessons and items
    const flatLessons = flattenLessons(state.course);
    if (!flatLessons.length) {
      setText("lessonTitle", "Lesson content unavailable");
      document.body.classList.remove("net-loading");
      document.body.classList.add("net-loaded");
      return;
    }

    const matched = flatLessons.find((l) => l.lessonNumber === state.lessonNumber);
    state.lessonEntry = matched || flatLessons[0];
    if (!matched) {
      state.lessonNumber = state.lessonEntry.lessonNumber;
      const url = new URL(window.location.href);
      url.searchParams.set("lesson", String(state.lessonNumber));
      history.replaceState(null, "", url.toString());
    }

    const allItems = flattenItems(state.course);
    state.itemsForLesson = allItems.filter((it) => Number(it.lesson_number) === Number(state.lessonNumber));
    if (!state.itemsForLesson.length && state.lessonEntry?.lesson) {
      const fallback = state.lessonEntry.lesson;
      state.itemsForLesson = [
        {
          type: "learn",
          title: fallback.title || "Lesson",
          content: fallback.content || fallback.learn || "",
          duration: fallback.duration || "8–12 min",
          xp: Number(fallback.xp || 40),
          lesson_number: Number(state.lessonNumber),
          unit_title: state.lessonEntry.unitTitle || ""
        }
      ];
    }
    state.quizItem = state.itemsForLesson.find((it) => it.type === "quiz") || null;
    state.practiceItem = state.itemsForLesson.find((it) => it.type === "sandbox" || it.type === "practice") || null;
    state.challengeItem = state.itemsForLesson.find((it) => it.type === "challenge") || null;

    // Load completion (best effort)
    if (state.user?.email) {
      await loadCompletions(state.user.email, state.courseId);
    }

    renderLesson();
    wireActions();
  }

  /* AI Prompt: Explain the Chrome (sidebar + user dropdown) section in clear, simple terms. */
  /* =========================================================
     Chrome (sidebar + user dropdown)
  ========================================================= */

  function wireBrandRouting() {
    const brand = getById("topBrand") || getById("brandHome");
    const sideBrand = getById("sideBrandHome");
    const back = getById("backToCourse");

    const loggedIn = !!(state.user && state.user.email);
    const href = loggedIn ? "dashboard.html" : "index.html";

    if (brand) brand.setAttribute("href", href);
    if (sideBrand) sideBrand.setAttribute("href", href);
    if (back) back.setAttribute("href", coursePageUrl());
  }

  function wireChromeGuest() {
    setText("topUserName", "Guest");
    setText("ddName", "Guest");
    setText("ddEmail", "Sign in to track progress");
    setText("topAvatar", "G");
    setText("ddAvatar", "G");
    setText("ddLevel", "Level —");
    setText("ddRank", "Novice");

    setText("sideAvatar", "G");
    setText("sideUserName", "Guest");
    setText("sideUserEmail", "Sign in to save progress");
    setText("sideLevelBadge", "Lv —");
    setText("sideXPText", "—");
    const bar = getById("sideXPBar");
    if (bar) bar.style.width = "0%";

    const topLogout = getById("topLogoutBtn");
    const sideLogout = getById("sideLogoutBtn");
    if (topLogout) topLogout.style.display = "none";
    if (sideLogout) sideLogout.style.display = "none";

    wireSidebar();
    wireUserDropdown();
  }

  function wireChrome(user) {
    wireSidebar();
    wireUserDropdown();
    fillIdentity(user);

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

    userBtn?.addEventListener("click", () => {
      const expanded = userBtn.getAttribute("aria-expanded") === "true";
      toggleDropdown(!expanded);
    });

    document.addEventListener("click", (e) => {
      if (!dd || !userBtn) return;
      if (dd.contains(e.target) || userBtn.contains(e.target)) return;
      toggleDropdown(false);
    });
  }

  function toggleDropdown(open) {
    const userBtn = getById("userBtn");
    const dd = getById("userDropdown");
    if (!userBtn || !dd) return;
    dd.classList.toggle("is-open", !!open);
    userBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function fillIdentity(user) {
    const name = user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Student";
    const email = user?.email || "";
    const progress = resolveXpProgress(user);

    setText("topUserName", name);
    setText("ddName", name);
    setText("ddEmail", email || "email@example.com");
    setText("topAvatar", name.charAt(0).toUpperCase());
    setText("ddAvatar", name.charAt(0).toUpperCase());
    setText("ddLevel", `Level ${progress.level}`);
    setText("ddRank", rankForLevel(progress.level));

    setText("sideAvatar", name.charAt(0).toUpperCase());
    setText("sideUserName", name);
    setText("sideUserEmail", email || "email@example.com");
    setText("sideLevelBadge", `Lv ${progress.level}`);
    setText("sideXPText", `${progress.xpInto}/${progress.nextXp}`);
    const bar = getById("sideXPBar");
    if (bar) bar.style.width = `${Math.min(100, progress.pct)}%`;
  }

  function logout() {
    localStorage.removeItem("netology_user");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  }

  /* AI Prompt: Explain the Data helpers section in clear, simple terms. */
  /* =========================================================
     Data helpers
  ========================================================= */

  function flattenLessons(course) {
    const flat = [];
    let idx = 1;

    (course.units || []).forEach((unit) => {
      (unit.lessons || []).forEach((lesson) => {
        flat.push({
          lessonNumber: idx,
          unitTitle: unit.title || "",
          lesson
        });
        idx += 1;
      });
    });

    return flat;
  }

  function getLessonNeighbors() {
    const flat = flattenLessons(state.course);
    const idx = flat.findIndex((f) => f.lessonNumber === Number(state.lessonNumber));
    const prev = idx > 0 ? flat[idx - 1] : null;
    const next = idx >= 0 ? flat[idx + 1] : null;

    let nextInUnit = null;
    const currentUnit = flat[idx]?.unitTitle || "";
    if (currentUnit) {
      for (let i = idx + 1; i < flat.length; i += 1) {
        if (flat[i].unitTitle !== currentUnit) break;
        nextInUnit = flat[i];
        break;
      }
    }

    return { flat, idx, prev, next, nextInUnit };
  }

  function flattenItems(course) {
    const all = [];
    let lessonCounter = 1;

    (course.units || []).forEach((unit) => {
      const normalized = normalizeUnitItems(unit, lessonCounter);
      lessonCounter = normalized.nextLessonCounter;
      all.push(...normalized.items);
    });

    // Sort items in learning flow order
    all.sort((a, b) => {
      if (a.lesson_number !== b.lesson_number) return a.lesson_number - b.lesson_number;
      const order = { learn: 1, quiz: 2, sandbox: 3, challenge: 4 };
      return (order[a.type] || 9) - (order[b.type] || 9);
    });

    return all;
  }

  function mapSectionTypeToItemType(sectionType, item) {
    const t = String(item.type || "").toLowerCase();
    if (t === "quiz") return "quiz";
    if (t === "challenge") return "challenge";
    if (t === "practice" || t === "sandbox") return "sandbox";
    if (t === "learn") return "learn";

    if (sectionType.includes("quiz")) return "quiz";
    if (sectionType.includes("challenge")) return "challenge";
    if (sectionType.includes("practice") || sectionType.includes("sandbox") || sectionType.includes("hands-on")) return "sandbox";
    return "learn";
  }

  function normalizeUnitItems(unit, startingLessonNumber) {
    const items = [];
    let lessonCounter = startingLessonNumber;

    const pushItem = (type, data) => {
      items.push({
        type,
        title: data.title || data.name || capitalize(type),
        content: data.content || data.learn || data.text || "",
        duration: data.duration || data.time || "—",
        xp: Number(data.xp || data.xpReward || data.xp_reward || 0),
        lesson_number: Number(data.lesson_number || data.lessonNumber || 0),
        unit_title: unit.title || "",
        challenge: data.challenge || data.rules || null,
        steps: data.steps || [],
        tips: data.tips || ""
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

    let lastLearn = lessonCounter - 1;
    items.forEach((it) => {
      if (it.type === "learn") {
        if (!it.lesson_number) {
          it.lesson_number = lessonCounter++;
        } else {
          lessonCounter = Math.max(lessonCounter, it.lesson_number + 1);
        }
        lastLearn = it.lesson_number;
      } else if (!it.lesson_number) {
        it.lesson_number = Math.max(1, lastLearn || 1);
      }
    });

    return { items, nextLessonCounter: lessonCounter };
  }

  function readLocalCompletions(email, courseId) {
    const key = `netology_completions:${email}:${courseId}`;
    const data = parseJsonSafe(localStorage.getItem(key)) || {};
    const lessonArr = data.lesson || data.lessons || data.learn || [];
    return new Set((lessonArr || []).map(Number));
  }

  async function loadCompletions(email, courseId) {
    try {
      const res = await fetch(`${getApiBase()}/user-course-status?email=${encodeURIComponent(email)}&course_id=${encodeURIComponent(courseId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const lessons = data.lessons || data.lesson || [];
      const fromApi = new Set((lessons || []).map(Number));
      const fromLocal = readLocalCompletions(email, courseId);
      state.completedLessons = new Set([...fromApi, ...fromLocal]);
    } catch {
      // fallback to local storage
      state.completedLessons = readLocalCompletions(email, courseId);
    }
  }

  /* AI Prompt: Explain the Render section in clear, simple terms. */
  /* =========================================================
     Render
  ========================================================= */

  function createBlockWrap(type) {
    const wrap = document.createElement("div");
    wrap.className = `net-lesson-block net-lesson-block--${type}`;
    return wrap;
  }

  function createBlockTitle(text) {
    const title = document.createElement("div");
    title.className = "net-lesson-block-title";
    title.textContent = text;
    return title;
  }

  function renderExplainBlock(block) {
    const wrap = createBlockWrap("explain");
    const details = document.createElement("details");
    details.className = "net-lesson-explain";

    const summary = document.createElement("summary");
    summary.textContent = block.title || "Explain";
    details.appendChild(summary);

    const body = document.createElement("div");
    body.className = "net-lesson-explain-body";
    addParagraphs(body, block.content || block.text || "");
    details.appendChild(body);

    wrap.appendChild(details);
    return wrap;
  }

  function renderCheckBlock(block, idx, opts = {}) {
    const { isDone, onComplete } = opts;
    const wrap = createBlockWrap("check");
    const title = createBlockTitle(block.title || "Quick check");
    const question = document.createElement("div");
    question.className = "net-lesson-check-question";
    question.textContent = block.question || "";

    const options = Array.isArray(block.options) ? block.options : [];
    const optionsWrap = document.createElement("div");
    optionsWrap.className = "net-lesson-options";
    let selectedIndex = null;
    const optionButtons = [];

    options.forEach((opt, optIdx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "net-lesson-option";
      btn.textContent = String(opt ?? "");
      btn.addEventListener("click", () => {
        if (isDone) return;
        selectedIndex = optIdx;
        optionButtons.forEach((b, bIdx) => {
          b.classList.toggle("is-selected", bIdx === optIdx);
          b.classList.remove("is-correct", "is-wrong");
        });
        feedback.textContent = "";
        feedback.classList.remove("is-correct", "is-wrong");
      });
      optionButtons.push(btn);
      optionsWrap.appendChild(btn);
    });

    const actionRow = document.createElement("div");
    actionRow.className = "net-lesson-actions";
    const checkBtn = document.createElement("button");
    checkBtn.type = "button";
    checkBtn.className = "btn btn-teal btn-sm";
    checkBtn.textContent = "Check answer";
    const feedback = document.createElement("div");
    feedback.className = "net-lesson-feedback";
    feedback.setAttribute("aria-live", "polite");

    const applyCompletedState = () => {
      wrap.classList.add("is-complete");
      checkBtn.textContent = "Completed";
      checkBtn.disabled = true;
      optionButtons.forEach((btn) => (btn.disabled = true));
    };

    if (isDone) {
      applyCompletedState();
      feedback.textContent = "Completed";
      feedback.classList.add("is-correct");
    }

    checkBtn.addEventListener("click", () => {
      if (isDone) return;
      if (selectedIndex === null) {
        feedback.textContent = "Choose an answer first.";
        feedback.classList.remove("is-correct", "is-wrong");
        return;
      }
      const correctIndex = Number(block.correctIndex ?? block.correctAnswer ?? -1);
      const isCorrect = selectedIndex === correctIndex;
      feedback.textContent = isCorrect ? "Correct!" : "Not quite. Try again.";
      feedback.classList.toggle("is-correct", isCorrect);
      feedback.classList.toggle("is-wrong", !isCorrect);

      optionButtons.forEach((b, bIdx) => {
        b.classList.toggle("is-correct", bIdx === correctIndex && isCorrect);
        b.classList.toggle("is-wrong", bIdx === selectedIndex && !isCorrect);
      });

      if (block.explanation) {
        const explain = document.createElement("div");
        explain.className = "net-lesson-feedback-note";
        explain.textContent = String(block.explanation || "");
        feedback.appendChild(explain);
      }

      if (isCorrect) {
        applyCompletedState();
        if (onComplete) onComplete();
      }
    });

    actionRow.append(checkBtn, feedback);
    wrap.append(title, question, optionsWrap, actionRow);
    return wrap;
  }

  function renderSelectActivity(block, opts = {}) {
    const { isDone, onComplete } = opts;
    const wrap = createBlockWrap("activity");
    const title = createBlockTitle(block.title || "Mini activity");
    const prompt = document.createElement("div");
    prompt.className = "net-lesson-activity-prompt";
    prompt.textContent = block.prompt || "";

    const options = Array.isArray(block.options) ? block.options : [];
    const optionsWrap = document.createElement("div");
    optionsWrap.className = "net-lesson-options";
    let selectedIndex = null;
    const optionButtons = [];

    options.forEach((opt, optIdx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "net-lesson-option";
      btn.textContent = String(opt ?? "");
      btn.addEventListener("click", () => {
        if (isDone) return;
        selectedIndex = optIdx;
        optionButtons.forEach((b, bIdx) => {
          b.classList.toggle("is-selected", bIdx === optIdx);
          b.classList.remove("is-correct", "is-wrong");
        });
        feedback.textContent = "";
        feedback.classList.remove("is-correct", "is-wrong");
      });
      optionButtons.push(btn);
      optionsWrap.appendChild(btn);
    });

    const actionRow = document.createElement("div");
    actionRow.className = "net-lesson-actions";
    const checkBtn = document.createElement("button");
    checkBtn.type = "button";
    checkBtn.className = "btn btn-soft btn-sm";
    checkBtn.textContent = "Submit choice";
    const feedback = document.createElement("div");
    feedback.className = "net-lesson-feedback";
    feedback.setAttribute("aria-live", "polite");

    const applyCompletedState = () => {
      wrap.classList.add("is-complete");
      checkBtn.textContent = "Completed";
      checkBtn.disabled = true;
      optionButtons.forEach((btn) => (btn.disabled = true));
    };

    if (isDone) {
      applyCompletedState();
      feedback.textContent = "Completed";
      feedback.classList.add("is-correct");
    }

    checkBtn.addEventListener("click", () => {
      if (isDone) return;
      if (selectedIndex === null) {
        feedback.textContent = "Pick an option to continue.";
        feedback.classList.remove("is-correct", "is-wrong");
        return;
      }
      const correctIndex = Number(block.correctIndex ?? block.correctAnswer ?? -1);
      const isCorrect = selectedIndex === correctIndex;
      feedback.textContent = isCorrect ? "Nice work!" : "Not yet. Try again.";
      feedback.classList.toggle("is-correct", isCorrect);
      feedback.classList.toggle("is-wrong", !isCorrect);
      optionButtons.forEach((b, bIdx) => {
        b.classList.toggle("is-correct", bIdx === correctIndex && isCorrect);
        b.classList.toggle("is-wrong", bIdx === selectedIndex && !isCorrect);
      });
      if (block.explanation) {
        const note = document.createElement("div");
        note.className = "net-lesson-feedback-note";
        note.textContent = String(block.explanation || "");
        feedback.appendChild(note);
      }

      if (isCorrect) {
        applyCompletedState();
        if (onComplete) onComplete();
      }
    });

    actionRow.append(checkBtn, feedback);
    wrap.append(title, prompt, optionsWrap, actionRow);
    return wrap;
  }

  function renderDragActivity(block, opts = {}) {
    const { isDone, onComplete } = opts;
    const wrap = createBlockWrap("activity");
    const title = createBlockTitle(block.title || "Mini activity");
    const prompt = document.createElement("div");
    prompt.className = "net-lesson-activity-prompt";
    prompt.textContent = block.prompt || "";

    const dragArea = document.createElement("div");
    dragArea.className = "net-lesson-drag-area";

    const pool = document.createElement("div");
    pool.className = "net-lesson-drag-pool";

    const targetsWrap = document.createElement("div");
    targetsWrap.className = "net-lesson-drag-zones";

    const items = Array.isArray(block.items) ? block.items : [];
    const targets = Array.isArray(block.targets) ? block.targets : [];
    const itemMap = new Map();
    const itemData = new Map();

    items.forEach((item) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "net-lesson-drag-item";
      chip.textContent = String(item.label || item.text || "");
      chip.setAttribute("draggable", "true");
      chip.dataset.itemId = String(item.id || item.label || "");

      chip.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", chip.dataset.itemId);
        chip.classList.add("is-dragging");
      });

      chip.addEventListener("dragend", () => {
        chip.classList.remove("is-dragging");
      });

      itemMap.set(chip.dataset.itemId, chip);
      itemData.set(chip.dataset.itemId, item);
      pool.appendChild(chip);
    });

    targets.forEach((target) => {
      const zone = document.createElement("div");
      zone.className = "net-lesson-dropzone";
      zone.dataset.targetId = String(target.id || target.label || "");

      const label = document.createElement("div");
      label.className = "net-lesson-dropzone-title";
      label.textContent = String(target.label || "");

      const zoneItems = document.createElement("div");
      zoneItems.className = "net-lesson-dropzone-items";

      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("is-hover");
      });

      zone.addEventListener("dragleave", () => {
        zone.classList.remove("is-hover");
      });

      zone.addEventListener("drop", (event) => {
        event.preventDefault();
        zone.classList.remove("is-hover");
        const itemId = event.dataTransfer.getData("text/plain");
        const chip = itemMap.get(itemId);
        if (!chip) return;
        zoneItems.appendChild(chip);
        updateDragFeedback();
      });

      zone.append(label, zoneItems);
      targetsWrap.appendChild(zone);
    });

    const actionRow = document.createElement("div");
    actionRow.className = "net-lesson-actions";
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "btn btn-outline-secondary btn-sm";
    resetBtn.textContent = "Reset";

    const feedback = document.createElement("div");
    feedback.className = "net-lesson-feedback";
    feedback.setAttribute("aria-live", "polite");

    function countCorrect() {
      let correct = 0;
      itemMap.forEach((chip, itemId) => {
        const zone = chip.closest(".net-lesson-dropzone");
        if (!zone) {
          chip.classList.remove("is-correct", "is-wrong");
          return;
        }
        const targetId = zone.dataset.targetId;
        const item = itemData.get(itemId);
        const isCorrect = item && String(item.targetId || "") === String(targetId || "");
        chip.classList.toggle("is-correct", isCorrect);
        chip.classList.toggle("is-wrong", !isCorrect);
        if (isCorrect) correct += 1;
      });
      return correct;
    }

    function lockDragActivity() {
      itemMap.forEach((chip) => {
        chip.setAttribute("draggable", "false");
        chip.classList.add("is-locked");
      });
      resetBtn.disabled = true;
    }

    function updateDragFeedback() {
      const correct = countCorrect();
      if (!items.length) return;
      if (correct === items.length) {
        feedback.textContent = "All matched correctly!";
        feedback.classList.add("is-correct");
        feedback.classList.remove("is-wrong");
        if (!wrap.classList.contains("is-complete")) {
          wrap.classList.add("is-complete");
          lockDragActivity();
          if (onComplete) onComplete();
        }
        return;
      }
      feedback.textContent = `${correct}/${items.length} placed correctly.`;
      feedback.classList.remove("is-correct");
      feedback.classList.remove("is-wrong");
    }

    resetBtn.addEventListener("click", () => {
      if (isDone) return;
      itemMap.forEach((chip) => pool.appendChild(chip));
      feedback.textContent = "";
      feedback.classList.remove("is-correct", "is-wrong");
      itemMap.forEach((chip) => chip.classList.remove("is-correct", "is-wrong"));
    });

    actionRow.append(resetBtn, feedback);
    dragArea.append(pool, targetsWrap);
    if (isDone) {
      wrap.classList.add("is-complete");
      feedback.textContent = "Completed";
      feedback.classList.add("is-correct");
      lockDragActivity();
    }

    wrap.append(title, prompt, dragArea, actionRow);
    return wrap;
  }

  function renderActivityBlock(block, opts = {}) {
    const mode = String(block.mode || block.activity || "select").toLowerCase();
    if (mode === "drag") return renderDragActivity(block, opts);
    return renderSelectActivity(block, opts);
  }

  function getSectionTitle(type) {
    if (type === "check") return "Quick checks";
    if (type === "activity") return "Mini activities";
    if (type === "explain") return "Explain";
    return "Core ideas";
  }

  function renderLessonBlocks(container, blocks) {
    const progress = state.activityProgress || { completed: [] };
    const completed = new Set(progress.completed || []);

    let currentSection = null;
    let currentType = null;
    const sectionWrap = document.createElement("div");
    sectionWrap.className = "net-lesson-sections";

    blocks.forEach((block, idx) => {
      const type = String(block?.type || "text").toLowerCase();
      if (type !== currentType) {
        currentType = type;
        currentSection = document.createElement("section");
        currentSection.className = "net-lesson-section";
        const title = document.createElement("div");
        title.className = "net-lesson-section-title";
        title.textContent = getSectionTitle(type);
        currentSection.appendChild(title);
        sectionWrap.appendChild(currentSection);
      }

      let node = null;
      if (type === "text") {
        node = createBlockWrap("text");
        addParagraphs(node, block.text || block.content || "");
      } else if (type === "check") {
        const blockId = getBlockId(block, idx);
        node = renderCheckBlock(block, idx, {
          isDone: completed.has(blockId),
          onComplete: () => markActivityDone(blockId),
        });
      } else if (type === "explain") {
        node = renderExplainBlock(block);
      } else if (type === "activity") {
        const blockId = getBlockId(block, idx);
        node = renderActivityBlock(block, {
          isDone: completed.has(blockId),
          onComplete: () => markActivityDone(blockId),
        });
      }

      if (node && currentSection) currentSection.appendChild(node);
    });

    container.appendChild(sectionWrap);
  }

  function renderLesson() {
    const lessonData = state.lessonEntry?.lesson || {};
    const course = state.course;

    setText("lessonCourseTitle", course.title || "Course");
    setText("breadcrumbCourse", course.title || "Course");
    setText("lessonDifficulty", capitalize(course.difficulty || "novice"));
    setText("lessonUnitTitle", state.lessonEntry?.unitTitle || "Unit");
    setText("breadcrumbModule", state.lessonEntry?.unitTitle || "Module");

    const difficultyPill = getById("lessonDifficulty");
    if (difficultyPill) {
      difficultyPill.className = "net-pill-badge badge text-bg-light border px-3 py-2";
      if (course.difficulty === "novice") difficultyPill.classList.add("net-diff-novice");
      if (course.difficulty === "intermediate") difficultyPill.classList.add("net-diff-intermediate");
      if (course.difficulty === "advanced") difficultyPill.classList.add("net-diff-advanced");
    }

    setText("lessonTitle", lessonData.title || "Lesson");
    const crumbLesson = lessonData.title ? lessonData.title : `Lesson ${state.lessonNumber || ""}`;
    setText("breadcrumbLesson", crumbLesson);
    setText("lessonSubtitle", lessonData.learn || course.description || "");

    const metaTime = state.itemsForLesson[0]?.duration || lessonData.duration || "—";
    const metaXp = state.itemsForLesson[0]?.xp || lessonData.xp || 0;
    setText("lessonMetaTime", metaTime);
    setText("lessonMetaXP", Number(metaXp || 0));

    // Objectives
    const objWrap = getById("lessonObjectivesWrap");
    const objList = getById("lessonObjectives");
    if (objWrap && objList && Array.isArray(lessonData.objectives) && lessonData.objectives.length) {
      objWrap.classList.remove("d-none");
      clearChildren(objList);
      lessonData.objectives.forEach((o) => {
        const li = document.createElement("li");
        li.textContent = String(o ?? "");
        objList.appendChild(li);
      });
    }

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    // Content + activity progress
    const blocks = Array.isArray(lessonData.blocks) ? lessonData.blocks : [];
    state.activityIds = getActivityIds(blocks);
    state.activityProgress = loadLessonActivityProgress();

    const content = getById("lessonContent");
    if (content) {
      clearChildren(content);
      if (blocks.length) {
        renderLessonBlocks(content, blocks);
        disableReadCompletion();
      } else {
        const section = document.createElement("section");
        section.className = "net-lesson-section";
        const title = document.createElement("div");
        title.className = "net-lesson-section-title";
        title.textContent = "Core ideas";
        section.appendChild(title);
        addParagraphs(section, lessonData.content || lessonData.learn);
        const wrap = document.createElement("div");
        wrap.className = "net-lesson-sections";
        wrap.appendChild(section);
        content.appendChild(wrap);
        enableReadCompletion(content);
      }
    }

    // Summary
    const summaryWrap = getById("lessonSummaryWrap");
    if (summaryWrap && lessonData.summary) {
      summaryWrap.classList.remove("d-none");
      setText("lessonSummary", lessonData.summary);
    }

    // Resources
    const resources = Array.isArray(lessonData.resources) && lessonData.resources.length
      ? lessonData.resources
      : buildDefaultResources(lessonData.title || "", course.title || "");
    const resWrap = getById("lessonResources");
    if (resWrap) {
      clearChildren(resWrap);
      resources.forEach((r) => {
        const link = document.createElement("a");
        link.className = "net-resource-item";
        link.href = r.url || "#";
        link.target = "_blank";
        link.rel = "noopener";

        const icoWrap = document.createElement("span");
        icoWrap.className = "net-resource-ico";
        const ico = document.createElement("i");
        ico.className = "bi bi-book";
        icoWrap.appendChild(ico);

        const label = document.createElement("span");
        label.textContent = String(r.label || "");

        const ext = document.createElement("i");
        ext.className = "bi bi-box-arrow-up-right ms-auto text-muted";

        link.append(icoWrap, label, ext);
        resWrap.appendChild(link);
      });
    }

    // Practice
    const practiceCard = getById("lessonPracticeCard");
    if (practiceCard) {
      if (state.practiceItem) {
        practiceCard.classList.remove("d-none");
        setText("lessonPracticeMeta", state.practiceItem.title || "Sandbox tutorial");
      } else {
        practiceCard.classList.add("d-none");
      }
    }

    // Challenge
    const challengeCard = getById("lessonChallengeCard");
    if (challengeCard) {
      if (state.challengeItem) {
        challengeCard.classList.remove("d-none");
        const steps = (state.challengeItem.challenge && state.challengeItem.challenge.steps) || state.challengeItem.steps || [];
        const stepsEl = getById("lessonChallengeSteps");
        if (stepsEl) {
          clearChildren(stepsEl);
          steps.forEach((s) => {
            const line = document.createElement("div");
            line.textContent = `• ${String(s ?? "")}`;
            stepsEl.appendChild(line);
          });
        }
      } else {
        challengeCard.classList.add("d-none");
      }
    }

    updateLessonStatus();
    const activityState = getActivityState();
    if (activityState.allDone && !state.completedLessons.has(Number(state.lessonNumber))) {
      finalizeLessonCompletion();
    }

    // Progress + prev/next
    const { flat, idx, prev, next, nextInUnit } = getLessonNeighbors();

    const totalLessons = flat.length || 0;
    const completedCount = state.completedLessons.size || 0;
    const pct = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;
    setText("lessonProgressText", `${completedCount}/${totalLessons} lessons completed`);
    setText("lessonProgressPct", `${pct}%`);
    const bar = getById("lessonProgressBar");
    if (bar) bar.style.width = `${pct}%`;

    const unlockBanner = getById("lessonUnlockBanner");
    const unlockTitle = getById("lessonUnlockTitle");
    const isDone = state.completedLessons.has(Number(state.lessonNumber));
    if (unlockBanner) {
      if (isDone && next) {
        unlockBanner.classList.remove("d-none");
        if (unlockTitle) unlockTitle.textContent = next.lesson.title;
      } else {
        unlockBanner.classList.add("d-none");
      }
    }

    const prevLink = getById("prevLessonLink");
    const nextLink = getById("nextLessonLink");
    const nextUpTitle = getById("nextUpTitle");
    if (nextUpTitle) {
      const unitLabel = nextInUnit?.unitTitle || next?.unitTitle || "";
      const lessonLabel = nextInUnit?.lessonNumber || next?.lessonNumber || "";
      const prefix = [unitLabel, lessonLabel ? `Lesson ${lessonLabel}` : ""]
        .filter(Boolean)
        .join(" • ");

      if (nextInUnit?.lesson?.title) {
        nextUpTitle.textContent = `${prefix} • ${nextInUnit.lesson.title}`;
      } else if (next?.lesson?.title) {
        nextUpTitle.textContent = `${prefix} • ${next.lesson.title}`;
      } else {
        nextUpTitle.textContent = "End of unit reached";
      }
    }
    if (prevLink) {
      if (prev) {
        prevLink.href = lessonUrl(prev.lessonNumber);
        prevLink.textContent = "Previous lesson";
      } else {
        prevLink.classList.add("disabled");
        prevLink.textContent = "No previous lesson";
      }
    }
    if (nextLink) {
      if (next) {
        nextLink.href = lessonUrl(next.lessonNumber);
        nextLink.textContent = "Next lesson";
      } else {
        nextLink.classList.add("disabled");
        nextLink.textContent = "No next lesson";
      }
    }
  }

  /* AI Prompt: Explain the Actions section in clear, simple terms. */
  /* =========================================================
     Actions
  ========================================================= */

  function wireActions() {
    const practiceBtn = getById("lessonPracticeBtn");
    const challengeBtn = getById("lessonChallengeBtn");

    practiceBtn?.addEventListener("click", () => {
      if (state.practiceItem) {
        const payload = {
          courseId: state.courseId,
          courseTitle: state.course.title,
          unitTitle: state.practiceItem.unit_title || "",
          lesson: state.lessonNumber,
          lessonTitle: state.practiceItem.title || "",
          tutorial: {
            steps: state.practiceItem.steps || (state.practiceItem.tutorial && state.practiceItem.tutorial.steps) || [],
            tips: state.practiceItem.tips || (state.practiceItem.tutorial && state.practiceItem.tutorial.tips) || "",
            xp: Number(state.practiceItem.xp || 0)
          }
        };
        localStorage.setItem("netology_active_tutorial", JSON.stringify(payload));
      }

      const params = new URLSearchParams();
      params.set("course_id", String(state.courseId));
      if (state.courseContentId) params.set("content_id", String(state.courseContentId));
      params.set("lesson", String(state.lessonNumber));
      params.set("mode", "practice");
      window.location.href = `sandbox.html?${params.toString()}`;
    });

    challengeBtn?.addEventListener("click", () => {
      if (state.challengeItem) {
        const payload = {
          courseId: state.courseId,
          courseTitle: state.course.title,
          unitTitle: state.challengeItem.unit_title || "",
          lesson: state.lessonNumber,
          lessonTitle: state.challengeItem.title || "",
          challenge: {
            rules: (state.challengeItem.challenge && state.challengeItem.challenge.rules) || state.challengeItem.rules || state.challengeItem.challenge || null,
            steps: (state.challengeItem.challenge && state.challengeItem.challenge.steps) || state.challengeItem.steps || [],
            tips: (state.challengeItem.challenge && state.challengeItem.challenge.tips) || state.challengeItem.tips || "",
            xp: Number(state.challengeItem.xp || 0)
          }
        };
        localStorage.setItem("netology_active_challenge", JSON.stringify(payload));
      }

      const params = new URLSearchParams();
      params.set("course_id", String(state.courseId));
      if (state.courseContentId) params.set("content_id", String(state.courseContentId));
      params.set("lesson", String(state.lessonNumber));
      params.set("mode", "challenge");
      params.set("challenge", "1");
      window.location.href = `sandbox.html?${params.toString()}`;
    });

  }

  async function completeLesson(email, courseId, lessonNumber, xp) {
    const api = getApiBase();
    if (!api) {
      return { xpAdded: Number(xp || 0), usedBackend: false };
    }
    try {
      const res = await fetch(`${api}/complete-lesson`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          course_id: Number(courseId),
          lesson_number: Number(lessonNumber),
          earned_xp: Number(xp || 0)
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        return { xpAdded: Number(xp || 0), usedBackend: false };
      }
      return {
        xpAdded: Number(data?.xp_added || 0),
        alreadyCompleted: !!data?.already_completed,
        usedBackend: true
      };
    } catch {
      return { xpAdded: Number(xp || 0), usedBackend: false };
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clearCompletionToastTimers() {
    if (completionTimer) {
      clearTimeout(completionTimer);
      completionTimer = null;
    }
    if (completionInterval) {
      clearInterval(completionInterval);
      completionInterval = null;
    }
  }

  function showCompletionToast(nextInUnit) {
    clearCompletionToastTimers();

    const existing = document.getElementById("lessonToast");
    if (existing) existing.remove();

    const stack = (() => {
      let existingStack = document.getElementById("netToastStack");
      if (!existingStack) {
        existingStack = document.createElement("div");
        existingStack.id = "netToastStack";
        existingStack.className = "net-toast-stack";
        document.body.appendChild(existingStack);
      }
      return existingStack;
    })();

    const popup = document.createElement("div");
    popup.id = "lessonToast";
    popup.className = "net-toast net-toast-enter in-stack";
    popup.setAttribute("role", "status");
    popup.setAttribute("aria-live", "polite");
    popup.dataset.type = "success";

    const countdownId = "lessonToastCountdown";
    const barId = "lessonToastBar";

    const subText = nextInUnit
      ? "Continue to next lesson in "
      : "Lesson saved. Return to course page.";

    const inner = document.createElement("div");
    inner.className = "net-toast-inner";

    const icon = document.createElement("div");
    icon.className = "net-toast-icon";
    icon.setAttribute("aria-hidden", "true");
    const iconEl = document.createElement("i");
    iconEl.className = "bi bi-check2-circle";
    icon.appendChild(iconEl);

    const body = document.createElement("div");
    body.className = "net-toast-body";

    const title = document.createElement("div");
    title.className = "net-toast-title";
    title.textContent = "Lesson saved";

    const sub = document.createElement("div");
    sub.className = "net-toast-sub";

    if (nextInUnit) {
      const prefix = document.createTextNode(subText);
      const count = document.createElement("span");
      count.id = countdownId;
      count.className = "net-toast-countdown";
      count.textContent = "20";
      const suffix = document.createTextNode("s");
      sub.append(prefix, count, suffix);
    } else {
      sub.textContent = subText;
    }

    body.append(title, sub);

    if (nextInUnit) {
      const timer = document.createElement("div");
      timer.className = "net-toast-timer";
      const fill = document.createElement("div");
      fill.className = "net-toast-timer-fill";
      fill.id = barId;
      fill.style.width = "0%";
      timer.appendChild(fill);
      body.appendChild(timer);

      const actions = document.createElement("div");
      actions.className = "net-toast-actions";
      const continueBtn = document.createElement("button");
      continueBtn.className = "btn btn-teal btn-sm net-toast-continue";
      continueBtn.type = "button";
      continueBtn.textContent = "Continue now";
      actions.appendChild(continueBtn);
      body.appendChild(actions);
    }

    const closeBtn = document.createElement("button");
    closeBtn.className = "net-toast-close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Back to course");
    const closeSpan = document.createElement("span");
    closeSpan.setAttribute("aria-hidden", "true");
    closeSpan.textContent = "×";
    closeBtn.appendChild(closeSpan);

    inner.append(icon, body, closeBtn);
    popup.appendChild(inner);

    stack.appendChild(popup);

    closeBtn?.addEventListener("click", () => {
      clearCompletionToastTimers();
      window.location.href = coursePageUrl();
    });

    if (nextInUnit) {
      const continueBtn = popup.querySelector(".net-toast-continue");
      continueBtn?.addEventListener("click", () => {
        clearCompletionToastTimers();
        window.location.href = lessonUrl(nextInUnit.lessonNumber);
      });

      const duration = 20000;
      const start = Date.now();
      const bar = document.getElementById(barId);
      const counter = document.getElementById(countdownId);

      completionInterval = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, Math.max(0, (elapsed / duration) * 100));
        if (bar) bar.style.width = `${pct}%`;
        const remaining = Math.max(0, duration - elapsed);
        const seconds = Math.max(1, Math.ceil(remaining / 1000));
        if (counter) counter.textContent = String(seconds);
      }, 100);

      completionTimer = setTimeout(() => {
        clearCompletionToastTimers();
        window.location.href = lessonUrl(nextInUnit.lessonNumber);
      }, duration);
    }
  }
})();
