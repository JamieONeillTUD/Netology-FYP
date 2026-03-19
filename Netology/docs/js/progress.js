// progress.js — progress page

(function () {
  "use strict";

  var ENDPOINTS = window.ENDPOINTS;
  var XP = window.NetologyXP;
  var STORAGE_KEY = "netology_progress_type";

  var TAB_ALIASES = {
    "sandbox-tutorials": "tutorials",
    "sandbox-challenges": "challenges"
  };

  var TAB_CONFIG = {
    courses:    { title: "Courses",            subtitle: "Active and completed courses at a glance.",            emptyTitle: "No courses yet",     emptyText: "Browse and enroll in courses to get started.",   icon: "bi-journal-bookmark", ctaText: "Browse courses", ctaLink: "courses.html" },
    modules:    { title: "Modules",            subtitle: "Track module progress across your courses.",           emptyTitle: "No module progress", emptyText: "Start a course to unlock modules.",              icon: "bi-layers",           ctaText: "View courses",   ctaLink: "courses.html" },
    lessons:    { title: "Lessons",            subtitle: "Lessons grouped by course, split by status.",          emptyTitle: "No lessons yet",     emptyText: "Complete your first lesson to see it here.",     icon: "bi-journal-check",    ctaText: "Start learning", ctaLink: "courses.html" },
    quizzes:    { title: "Quizzes",            subtitle: "Quiz progress, split into in-progress and completed.", emptyTitle: "No quizzes yet",     emptyText: "Take a quiz to track your results.",             icon: "bi-patch-question",   ctaText: "Browse courses", ctaLink: "courses.html" },
    tutorials:  { title: "Sandbox Tutorials",  subtitle: "Sandbox tutorials and checklist progress.",            emptyTitle: "No tutorials yet",   emptyText: "Launch a sandbox tutorial to track it here.",    icon: "bi-diagram-3",        ctaText: "Open sandbox",   ctaLink: "sandbox.html" },
    challenges: { title: "Sandbox Challenges", subtitle: "Challenge progress split by status.",                  emptyTitle: "No challenges yet",  emptyText: "Complete a sandbox challenge to see it here.",   icon: "bi-flag",             ctaText: "View challenges",ctaLink: "sandbox.html" }
  };

  var TYPE_CONFIG = {
    lessons:    { icon: "bi-journal-check",  label: "Lesson",    variant: "",       card: "net-card--lesson",    ctaContinue: "Resume Lesson",    ctaDone: "Review Lesson" },
    quizzes:    { icon: "bi-patch-question", label: "Quiz",      variant: "blue",   card: "net-card--quiz",      ctaContinue: "Resume Quiz",      ctaDone: "Review Quiz" },
    tutorials:  { icon: "bi-diagram-3",      label: "Tutorial",  variant: "",       card: "net-card--tutorial",  ctaContinue: "Resume Tutorial",  ctaDone: "Review Tutorial" },
    challenges: { icon: "bi-flag",           label: "Challenge", variant: "violet", card: "net-card--challenge", ctaContinue: "Resume Challenge", ctaDone: "Review Challenge" },
    modules:    { icon: "bi-layers",         label: "Module",    variant: "green",  card: "net-card--course",    ctaContinue: "Open Module",      ctaDone: "Review Module" }
  };

  var completionCacheStore = {};
  var pageData = { email: null, courses: null, completions: null, counts: null };

  // ── tiny helpers ──

  function objectHasKey(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function lookupHas(lookup, value) {
    return objectHasKey(lookup, String(value));
  }

  function parseJsonSafe(raw, fallback) {
    try { return JSON.parse(raw); } catch (error) { return fallback; }
  }

  function capitaliseWord(str) {
    var v = String(str || "");
    return v ? v.charAt(0).toUpperCase() + v.slice(1) : "";
  }

  function createElement(tag, className) {
    var el = document.createElement(tag);
    if (className) { el.className = className; }
    return el;
  }

  function setTextById(id, value) {
    var el = document.getElementById(id);
    if (el) { el.textContent = String(value != null ? value : ""); }
  }

  function readSavedUser() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem("netology_user")); } catch (error) { user = null; }
    if (!user) {
      try { user = JSON.parse(localStorage.getItem("user")); } catch (error) { user = null; }
    }
    return user;
  }

  function resolveTabName(value) {
    var key = String(value || "").trim().toLowerCase();
    return TAB_CONFIG[key] ? key : (TAB_ALIASES[key] || null);
  }

  function findCourseById(courseId) {
    var courses = pageData.courses || [];
    for (var i = 0; i < courses.length; i++) {
      if (String(courses[i].id) === String(courseId)) { return courses[i]; }
    }
    return null;
  }

  function arrayToLookup(list) {
    var lookup = {};
    for (var i = 0; i < list.length; i++) { lookup[String(Number(list[i]))] = true; }
    return lookup;
  }

  // sum the three completion buckets into one number
  function countTotalDone(completions) {
    return Object.keys(completions.lesson).length +
           Object.keys(completions.quiz).length +
           Object.keys(completions.challenge).length;
  }

  // count the number of non-sandbox items
  function countRequired(allItems) {
    var n = 0;
    for (var i = 0; i < allItems.length; i++) {
      if (allItems[i].type !== "sandbox") { n = n + 1; }
    }
    return n;
  }

  // resolve completions from cache / pageData / api
  function getCourseCompletions(email, courseId) {
    var cached = pageData.completions ? pageData.completions[courseId] : null;
    return cached ? Promise.resolve(cached) : fetchCompletions(email, courseId);
  }

  // ── sidebar / dropdown / logout / identity ──

  function setupSlideSidebar() {
    var sidebar = document.getElementById("slideSidebar");
    var backdrop = document.getElementById("sideBackdrop");

    function open() {
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
      sidebar.setAttribute("aria-hidden", "false");
      backdrop.setAttribute("aria-hidden", "false");
    }
    function close() {
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
      sidebar.setAttribute("aria-hidden", "true");
      backdrop.setAttribute("aria-hidden", "true");
    }

    var openBtn = document.getElementById("openSidebarBtn");
    var closeBtn = document.getElementById("closeSidebarBtn");
    if (openBtn) { openBtn.addEventListener("click", open); }
    if (closeBtn) { closeBtn.addEventListener("click", close); }
    if (backdrop) { backdrop.addEventListener("click", close); }
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { close(); } });
  }

  function setupUserDropdownMenu() {
    var btn = document.getElementById("userBtn");
    var dd = document.getElementById("userDropdown");
    if (!btn || !dd) { return; }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = dd.classList.contains("is-open");
      if (open) { dd.classList.remove("is-open"); } else { dd.classList.add("is-open"); }
      btn.setAttribute("aria-expanded", String(!open));
    });
    document.addEventListener("click", function (e) {
      if (!dd.contains(e.target) && !btn.contains(e.target)) {
        dd.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  function setupLogoutButtons() {
    function logout() {
      var keys = ["netology_user", "netology_token", "user"];
      for (var i = 0; i < keys.length; i++) { localStorage.removeItem(keys[i]); }
      location.href = "index.html";
    }
    var a = document.getElementById("topLogoutBtn");
    var b = document.getElementById("sideLogoutBtn");
    if (a) { a.addEventListener("click", logout); }
    if (b) { b.addEventListener("click", logout); }
  }

  function displayUserIdentity(user) {
    var fullName = "";
    if (user.first_name) { fullName = user.first_name; }
    if (user.last_name) { fullName = fullName + (fullName ? " " : "") + user.last_name; }
    if (!fullName) { fullName = user.username || "Student"; }

    var initial = fullName.charAt(0).toUpperCase();
    var totalXp = Number(user.xp || 0);
    var numericLevel = Number(user.numeric_level);
    var level = (numericLevel === numericLevel && numericLevel !== Infinity) ? numericLevel : XP.levelFromTotalXp(totalXp);
    var rank = user.rank || XP.rankForLevel(level);

    setTextById("topAvatar", initial);
    setTextById("ddAvatar", initial);
    setTextById("ddName", fullName);
    setTextById("ddEmail", user.email || "");
    setTextById("ddLevel", "Level " + level);
    setTextById("ddRank", rank);
    setTextById("sideAvatar", initial);
    setTextById("sideUserName", fullName);
    setTextById("sideUserEmail", user.email || "");
    setTextById("sideLevelBadge", "Lv " + level);

    var startXp = XP.totalXpForLevel(level);
    var into = Math.max(0, totalXp - startXp);
    var needed = XP.xpForNextLevel(level);
    var pct = Math.min(100, (into / Math.max(needed, 1)) * 100);

    setTextById("sideXpText", into + "/" + needed);
    setTextById("sideXpHint", Math.max(0, needed - into) + " XP to next level");
    var bar = document.getElementById("sideXpBar");
    if (bar) { bar.style.width = pct + "%"; }
  }

  // ── tab navigation ──

  function setupTabButtons() {
    var buttons = document.querySelectorAll(".net-progress-nav-btn");
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          var tab = resolveTabName(btn.getAttribute("data-type"));
          if (!tab) { return; }
          setActiveTab(tab);
          localStorage.setItem(STORAGE_KEY, tab);
          var user = readSavedUser();
          if (user && user.email) { loadTabContent(tab, user); }
        });
      })(buttons[i]);
    }
  }

  function setActiveTab(tab) {
    var buttons = document.querySelectorAll(".net-progress-nav-btn");
    for (var i = 0; i < buttons.length; i++) {
      var active = buttons[i].getAttribute("data-type") === tab;
      if (active) { buttons[i].classList.add("is-active"); } else { buttons[i].classList.remove("is-active"); }
      buttons[i].setAttribute("aria-selected", String(active));
    }
  }

  function updateTabBadges(counts) {
    var buttons = document.querySelectorAll(".net-progress-nav-btn");
    for (var i = 0; i < buttons.length; i++) {
      var tab = buttons[i].getAttribute("data-type");
      if (!tab || !counts) { continue; }

      var count = 0;
      if (tab === "courses") { count = (counts["in-progress"] || 0) + (counts["completed-courses"] || 0); }
      else if (tab === "modules") { count = (counts["modules-in-progress"] || 0) + (counts["modules-completed"] || 0); }
      else { count = counts[tab] || 0; }

      var badge = buttons[i].querySelector(".net-progress-nav-count");
      if (!badge) { badge = createElement("span", "net-progress-nav-count"); buttons[i].appendChild(badge); }
      animateCounterNumber(badge, count);
      badge.classList.remove("is-animated");
      void badge.offsetWidth;
      badge.classList.add("is-animated");
    }
  }

  // ── hero stats ──

  function loadHeroStatCards(user) {
    return Promise.all([
      window.apiGet(ENDPOINTS.courses.userProgressSummary, { email: user.email }).catch(function () { return null; }),
      window.apiGet(ENDPOINTS.progress.userStreaks, { user_email: user.email }).catch(function () { return null; }),
      window.apiGet(ENDPOINTS.achievements.list, { user_email: user.email }).catch(function () { return null; })
    ]).then(function (r) {
      setTextById("heroCoursesActive", r[0] ? r[0].in_progress || 0 : 0);
      setTextById("heroLessons",       r[0] ? r[0].lessons_done || 0 : 0);
      setTextById("heroStreak",        r[1] ? r[1].current_streak || 0 : 0);
      setTextById("heroAchievements",  r[2] ? r[2].total_unlocked || 0 : 0);
    });
  }

  // ── data loading ──

  function ensurePageDataLoaded(user) {
    if (pageData.email === user.email && pageData.courses && pageData.completions) {
      return Promise.resolve();
    }
    pageData.email = user.email;
    return fetchUserCourses(user.email).then(function (courses) {
      pageData.courses = courses;
      return fetchAllCompletions(user.email, courses);
    }).then(function (completions) {
      pageData.completions = completions;
      return buildTabCounts(user.email);
    }).then(function (counts) {
      pageData.counts = counts;
      updateTabBadges(counts);
    });
  }

  function fetchUserCourses(email) {
    var contentData = window.COURSE_CONTENT || {};
    var ids = Object.keys(contentData);
    var all = [];

    for (var i = 0; i < ids.length; i++) {
      var c = contentData[ids[i]];
      var total = 0;
      var units = c.units || [];
      for (var u = 0; u < units.length; u++) { total = total + (units[u].lessons ? units[u].lessons.length : 0); }
      all.push({ id: ids[i], title: c.title, description: c.description || "", difficulty: c.difficulty || "novice", estimated_time: c.estimatedTime || "", xp_reward: c.xpReward || 0, total_lessons: total, progress_pct: 0, status: "not-started" });
    }

    return window.apiGet(ENDPOINTS.courses.userCourses, { email: email }).then(function (data) {
      var list = (data && Array.isArray(data.courses)) ? data.courses : (Array.isArray(data) ? data : []);
      var lookup = {};
      for (var p = 0; p < list.length; p++) { lookup[String(list[p].id || list[p].course_id || "")] = list[p]; }
      for (var q = 0; q < all.length; q++) {
        var m = lookup[all[q].id];
        if (m) { all[q].progress_pct = Math.min(100, Math.max(0, Number(m.progress_pct || 0))); all[q].status = m.status || "not-started"; }
      }
      return all;
    }).catch(function (error) { console.warn("Could not overlay course progress:", error); return all; });
  }

  function fetchCompletions(email, courseId) {
    var ck = email + ":" + courseId;
    if (objectHasKey(completionCacheStore, ck)) { return Promise.resolve(completionCacheStore[ck]); }

    return window.apiGet(ENDPOINTS.courses.userCourseStatus, { email: email, course_id: courseId }).then(function (data) {
      if (data && data.success) {
        var r = { lesson: arrayToLookup(data.lessons || []), quiz: arrayToLookup(data.quizzes || []), challenge: arrayToLookup(data.challenges || []) };
        completionCacheStore[ck] = r;
        return r;
      }
      return buildLocalCompletions(email, courseId, ck);
    }).catch(function () { return buildLocalCompletions(email, courseId, ck); });
  }

  function buildLocalCompletions(email, courseId, ck) {
    var raw = parseJsonSafe(localStorage.getItem("netology_completions:" + email + ":" + courseId), {});
    var r = { lesson: arrayToLookup(raw.lesson || raw.lessons || raw.learn || []), quiz: arrayToLookup(raw.quiz || raw.quizzes || []), challenge: arrayToLookup(raw.challenge || raw.challenges || []) };
    completionCacheStore[ck] = r;
    return r;
  }

  function fetchAllCompletions(email, courses) {
    var list = courses || [];
    var out = {};
    var promises = [];
    for (var i = 0; i < list.length; i++) {
      (function (c) {
        var id = String(c.id);
        promises.push(fetchCompletions(email, id).then(function (comp) { out[id] = comp; }));
      })(list[i]);
    }
    return Promise.all(promises).then(function () { return out; });
  }

  function getStartedCoursesLookup(email) {
    var list = parseJsonSafe(localStorage.getItem("netology_started_courses:" + email), []) || [];
    var lookup = {};
    for (var i = 0; i < list.length; i++) {
      if (!list[i]) { continue; }
      var last = Number(list[i].lastLesson);
      if (last > 0) { lookup[String(list[i].id)] = last; }
    }
    return lookup;
  }

  // ── course content helpers ──

  function getCourseContent(course) {
    if (!course) { return null; }
    return (window.COURSE_CONTENT || {})[String(course.id)] || null;
  }

  function getCourseContentId(course) {
    var content = getCourseContent(course);
    return (content && content.id) ? String(content.id) : null;
  }

  function normaliseUnitItems(unit, unitIndex) {
    var items = [];
    var num = unitIndex + 1;
    var lessons = unit.lessons || [];
    for (var i = 0; i < lessons.length; i++) {
      items.push({ type: "learn", title: lessons[i].title || "Lesson", lesson_number: num, xp: Number(lessons[i].xp || 40) });
    }
    if (unit.quiz) { items.push({ type: "quiz", title: unit.quiz.title || "Quiz", lesson_number: num, xp: Number(unit.quiz.xp || 60) }); }
    if (unit.sandbox) { items.push({ type: "sandbox", title: unit.sandbox.title || "Practice", lesson_number: num, xp: Number(unit.sandbox.xp || 30), steps: unit.sandbox.steps || [] }); }
    if (unit.challenge) { items.push({ type: "challenge", title: unit.challenge.title || "Challenge", lesson_number: num, xp: Number(unit.challenge.xp || 80) }); }
    return items;
  }

  function getAllCourseItems(course) {
    if (!course || !course.units || !course.units.length) { return []; }
    var items = [];
    for (var i = 0; i < course.units.length; i++) {
      var ui = normaliseUnitItems(course.units[i], i);
      for (var j = 0; j < ui.length; j++) { items.push(ui[j]); }
    }
    return items;
  }

  function buildCourseModules(course) {
    if (!course || !course.units || !course.units.length) { return []; }
    var mods = [];
    for (var i = 0; i < course.units.length; i++) {
      mods.push({ id: "unit-" + i, index: i + 1, title: course.units[i].title || "Module " + (i + 1), items: normaliseUnitItems(course.units[i], i) });
    }
    return mods;
  }

  function getUniqueItemsByType(course, type) {
    var all = getAllCourseItems(course);
    var seen = {};
    var result = [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].type !== type) { continue; }
      var n = Number(all[i].lesson_number);
      if (!n || objectHasKey(seen, String(n))) { continue; }
      seen[String(n)] = true;
      result.push(all[i]);
    }
    return result;
  }

  function buildLessonTitleLookup(course) {
    var lookup = {};
    var units = (course && course.units) ? course.units : [];
    for (var i = 0; i < units.length; i++) {
      var key = String(i + 1);
      if (!objectHasKey(lookup, key)) {
        var lessons = units[i].lessons || [];
        lookup[key] = (lessons.length > 0 && lessons[0].title) ? lessons[0].title : (units[i].title || "Lesson " + (i + 1));
      }
    }
    return lookup;
  }

  function getTutorialStepCount(course, lessonNumber) {
    if (!course || !course.units) { return 0; }
    var unit = course.units[lessonNumber - 1];
    return (unit && unit.sandbox && unit.sandbox.steps) ? unit.sandbox.steps.length : 0;
  }

  function getModuleProgress(mod, completions) {
    var items = mod.items || [];
    var typeMap = { learn: completions.lesson, quiz: completions.quiz, challenge: completions.challenge };
    var total = 0;
    var done = 0;
    for (var i = 0; i < items.length; i++) {
      var lk = typeMap[items[i].type];
      if (!lk) { continue; }
      total = total + 1;
      if (lookupHas(lk, Number(items[i].lesson_number))) { done = done + 1; }
    }
    return { done: done, total: total, completed: total > 0 && done === total };
  }

  // ── link builders ──

  function buildCourseLink(courseId) { return "course.html?id=" + courseId; }

  function buildLessonLink(courseId, contentId, lessonNumber) {
    return "lesson.html?course=" + courseId + "&unit=" + (lessonNumber - 1) + "&lesson=0";
  }

  function buildSandboxLink(courseId, lessonNumber, mode) {
    return "sandbox.html?course=" + courseId + "&unit=" + (lessonNumber - 1) + "&mode=" + mode;
  }

  // ── tab content loading ──

  function loadTabContent(tab, user) {
    var list = document.getElementById("progressList");
    var empty = document.getElementById("progressEmpty");
    if (!list || !empty) { return Promise.resolve(); }
    showSkeletonLoader(list);
    empty.classList.add("d-none");

    return ensurePageDataLoaded(user).then(function () {
      return renderTab(list, tab, user.email);
    }).then(function (totals) {
      if (!totals.inProgress && !totals.completed) { showEmptyState(tab); }
    });
  }

  function renderTab(container, tab, email) {
    var started = getStartedCoursesLookup(email);
    container.innerHTML = "";
    var section = buildSectionWrapper(tab, TAB_CONFIG[tab]);
    container.appendChild(section.wrap);

    if (tab === "courses") { return renderCoursesTab(section.body, email, started); }
    if (tab === "modules") { return renderModulesTab(section.body, email, started); }
    return renderItemsTab(tab, section.body, email, started);
  }

  // ── courses tab ──

  function renderCoursesTab(parent, email, started) {
    return buildCourseProgressList(email, started).then(function (all) {
      var prog = [];
      var done = [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].status === "in-progress") { prog.push(all[i]); }
        else if (all[i].status === "completed") { done.push(all[i]); }
      }
      if (!prog.length && !done.length) { return { inProgress: 0, completed: 0 }; }

      var progXp = 0;
      for (var a = 0; a < prog.length; a++) { progXp = progXp + (prog[a].earnedXp || 0); }
      var doneXp = 0;
      for (var b = 0; b < done.length; b++) { doneXp = doneXp + (done[b].earnedXp || 0); }

      var row = createElement("div", "net-progress-split");
      var left = buildColumnHeader("In progress", prog.length, false, progXp);
      var right = buildColumnHeader("Completed", done.length, true, doneXp);

      renderCourseCards(prog, left.body, false, started);
      if (!prog.length) { showEmptyColumn(left.body, "No active courses yet."); }
      renderCourseCards(done, right.body, true, started);
      if (!done.length) { showEmptyColumn(right.body, "No completed courses yet."); }

      row.appendChild(left.wrap);
      row.appendChild(right.wrap);
      parent.appendChild(row);
      return { inProgress: prog.length, completed: done.length };
    });
  }

  function buildCourseProgressList(email, started) {
    var courses = pageData.courses || [];
    var promises = [];

    for (var i = 0; i < courses.length; i++) {
      (function (course) {
        var cid = String(course.id);
        var content = getCourseContent(course);

        promises.push(getCourseCompletions(email, cid).then(function (comp) {
          var allItems = getAllCourseItems(content);
          var earned = 0;
          var typeMap = { learn: comp.lesson, quiz: comp.quiz, challenge: comp.challenge };

          for (var j = 0; j < allItems.length; j++) {
            var lk = typeMap[allItems[j].type];
            if (lk && lookupHas(lk, Number(allItems[j].lesson_number))) { earned = earned + Number(allItems[j].xp || 0); }
          }

          var totalDone = countTotalDone(comp);
          var required = countRequired(allItems);
          var status = (course.status && course.status !== "not-started") ? course.status : "not-started";
          if (status === "not-started") {
            if (required > 0 && totalDone >= required) { status = "completed"; }
            else if (totalDone > 0) { status = "in-progress"; }
          }

          var result = {};
          var keys = Object.keys(course);
          for (var m = 0; m < keys.length; m++) { result[keys[m]] = course[keys[m]]; }
          result.contentId = getCourseContentId(course) || cid;
          result.earnedXp = earned;
          result.status = status;
          return result;
        }));
      })(courses[i]);
    }
    return Promise.all(promises);
  }

  function renderCourseCards(courses, parent, isCompleted, started) {
    for (var i = 0; i < courses.length; i++) {
      var c = courses[i];
      var last = started[String(c.id)] || null;
      var link = (!isCompleted && last) ? buildLessonLink(c.id, c.contentId, last) : buildCourseLink(c.id);
      var diff = String(c.difficulty || "novice").toLowerCase();
      var pct = Number(c.progress_pct || 0);
      var dc = "nov";
      if (diff === "intermediate") { dc = "int"; } else if (diff === "advanced") { dc = "adv"; }
      var ico = isCompleted ? "bi-check-circle-fill" : "bi-journal-album";
      var btnIco = isCompleted ? '<i class="bi bi-eye me-1"></i> Review' : '<i class="bi bi-play-fill me-1"></i> Resume';
      var time = c.estimated_time ? '<div class="small text-muted"><i class="bi bi-clock me-1"></i>' + c.estimated_time + "</div>" : "";

      var card = createElement("div", "net-card net-coursecard-enhanced mb-3");
      card.innerHTML =
        '<div class="d-flex flex-column flex-md-row gap-4 p-4">' +
        '<div class="net-course-visual"><i class="bi ' + ico + '"></i></div>' +
        '<div class="flex-grow-1">' +
        '<div class="d-flex align-items-center gap-2 mb-1"><span class="net-diffbadge net-badge-' + dc + '">' + capitaliseWord(diff) + "</span></div>" +
        '<h3 class="h5 fw-bold mb-2">' + (c.title || "Course") + "</h3>" +
        '<p class="text-muted small mb-3" style="max-width:600px">' + (c.description || "No description available.") + "</p>" +
        time +
        '<div class="mt-3" style="max-width:280px">' +
        '<div class="d-flex justify-content-between small mb-1"><span>Progress</span><span class="fw-semibold">' + pct + "%</span></div>" +
        '<div class="net-meter"><div class="net-meter-fill" style="width:' + pct + '%"></div></div></div></div>' +
        '<div class="d-flex flex-column align-items-md-end justify-content-center gap-2 min-w-150">' +
        '<a class="btn btn-teal" href="' + link + '">' + btnIco + "</a></div></div>";
      parent.appendChild(card);
    }
  }

  // ── modules tab ──

  function renderModulesTab(parent, email, started) {
    var courses = pageData.courses || [];
    var prog = [];
    var done = [];
    var promises = [];

    for (var i = 0; i < courses.length; i++) {
      (function (course) {
        var cid = String(course.id);
        var content = getCourseContent(course);
        if (!content || !content.units || !content.units.length) { return; }

        promises.push(getCourseCompletions(email, cid).then(function (comp) {
          var courseStarted = countTotalDone(comp) > 0 || objectHasKey(started, cid);
          var contentId = getCourseContentId(course) || cid;
          var modules = buildCourseModules(content);

          for (var m = 0; m < modules.length; m++) {
            var p = getModuleProgress(modules[m], comp);
            if (!p.total) { continue; }
            var item = {
              number: modules[m].index,
              title: modules[m].title,
              link: buildCourseLink(cid),
              meta: "Module " + modules[m].index + " \u2014 " + p.done + "/" + p.total + " items",
              ctaLabel: p.completed ? "Review Module" : "Open Module"
            };
            if (p.completed) { done.push({ courseId: cid, contentId: contentId, title: course.title, item: item }); }
            else if (courseStarted) { prog.push({ courseId: cid, contentId: contentId, title: course.title, item: item }); }
          }
        }));
      })(courses[i]);
    }

    return Promise.all(promises).then(function () {
      var pg = groupItemsByCourse(prog);
      var dg = groupItemsByCourse(done);
      if (pg.length || dg.length) { renderSplitColumns(pg, dg, parent, "modules"); }
      return { inProgress: prog.length, completed: done.length };
    });
  }

  // ── items tab (lessons / quizzes / challenges / tutorials) ──

  function renderItemsTab(tab, parent, email, started) {
    var promise = (tab === "tutorials") ? Promise.resolve(buildTutorialGroups(email)) : buildItemGroups(tab, email, started);
    return promise.then(function (groups) {
      if (groups.inProgress.length || groups.completed.length) {
        renderSplitColumns(groups.inProgress, groups.completed, parent, tab);
      }
      return { inProgress: countGroupItems(groups.inProgress), completed: countGroupItems(groups.completed) };
    });
  }

  function buildItemGroups(tab, email, started) {
    var prog = [];
    var done = [];
    var itemType = "learn";
    if (tab === "quizzes") { itemType = "quiz"; }
    else if (tab === "challenges") { itemType = "challenge"; }

    var courses = pageData.courses || [];
    var promises = [];

    for (var i = 0; i < courses.length; i++) {
      (function (course) {
        var cid = String(course.id);
        var contentId = getCourseContentId(course) || cid;
        var content = getCourseContent(course);

        promises.push(getCourseCompletions(email, cid).then(function (comp) {
          var courseStarted = countTotalDone(comp) > 0 || objectHasKey(started, cid);
          var titles = buildLessonTitleLookup(content);
          var completedLookup = comp.lesson;
          if (itemType === "quiz") { completedLookup = comp.quiz; }
          else if (itemType === "challenge") { completedLookup = comp.challenge; }

          var unique = getUniqueItemsByType(content, itemType);
          for (var j = 0; j < unique.length; j++) {
            var num = Number(unique[j].lesson_number);
            if (!num) { continue; }
            var link = (itemType === "challenge") ? buildSandboxLink(cid, num, "challenge") : buildLessonLink(cid, contentId, num);
            var entry = { number: num, title: titles[String(num)] || "Lesson " + num, link: link };

            if (lookupHas(completedLookup, num)) { done.push({ courseId: cid, contentId: contentId, title: course.title, item: entry }); }
            else if (courseStarted) { prog.push({ courseId: cid, contentId: contentId, title: course.title, item: entry }); }
          }
        }));
      })(courses[i]);
    }

    return Promise.all(promises).then(function () {
      prog.sort(function (a, b) { return a.item.number - b.item.number; });
      done.sort(function (a, b) { return a.item.number - b.item.number; });
      return { inProgress: groupItemsByCourse(prog), completed: groupItemsByCourse(done) };
    });
  }

  function buildTutorialGroups(email) {
    var progLk = {};
    var doneLk = {};
    var progOrd = [];
    var doneOrd = [];
    var prefix = "netology_tutorial_progress:" + email + ":";
    var keys = Object.keys(localStorage);

    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(prefix) !== 0) { continue; }
      var parts = keys[i].substring(prefix.length).split(":");
      var cid = parts[0];
      var num = Number(parts[1]);
      if (!cid || !num) { continue; }

      var saved = parseJsonSafe(localStorage.getItem(keys[i]), {});
      var checked = 0;
      if (Array.isArray(saved.checked)) { for (var c = 0; c < saved.checked.length; c++) { if (saved.checked[c]) { checked = checked + 1; } } }

      var course = findCourseById(cid);
      var content = getCourseContent(course || { id: cid });
      var total = getTutorialStepCount(content, num);
      var titles = buildLessonTitleLookup(content);

      var item = { number: num, title: titles[String(num)] || "Lesson " + num, link: buildSandboxLink(cid, num, "practice"), meta: "Tutorial \u2014 " + checked + "/" + (total || 0) + " steps" };
      var complete = total > 0 && checked >= total;
      var target = complete ? doneLk : progLk;
      var order = complete ? doneOrd : progOrd;

      if (!objectHasKey(target, cid)) { target[cid] = []; order.push(cid); }
      target[cid].push(item);
    }

    function toGroups(lk, ord) {
      var groups = [];
      for (var g = 0; g < ord.length; g++) {
        lk[ord[g]].sort(function (a, b) { return a.number - b.number; });
        var cr = findCourseById(ord[g]);
        groups.push({ courseId: ord[g], contentId: getCourseContentId(cr) || ord[g], title: cr ? cr.title : "Course " + ord[g], items: lk[ord[g]] });
      }
      return groups;
    }
    return { inProgress: toGroups(progLk, progOrd), completed: toGroups(doneLk, doneOrd) };
  }

  // ── tab badge counts ──

  function buildTabCounts(email) {
    var counts = { "in-progress": 0, "completed-courses": 0, "modules-in-progress": 0, "modules-completed": 0, lessons: 0, quizzes: 0, challenges: 0, tutorials: 0 };
    var started = getStartedCoursesLookup(email);
    var courses = pageData.courses || [];
    var promises = [];

    for (var i = 0; i < courses.length; i++) {
      (function (course) {
        var cid = String(course.id);
        var content = getCourseContent(course);

        promises.push(getCourseCompletions(email, cid).then(function (comp) {
          var lc = Object.keys(comp.lesson).length;
          var qc = Object.keys(comp.quiz).length;
          var cc = Object.keys(comp.challenge).length;
          var td = lc + qc + cc;
          var required = countRequired(getAllCourseItems(content));

          if (required > 0 && td >= required) { counts["completed-courses"] = counts["completed-courses"] + 1; }
          else if (td > 0) { counts["in-progress"] = counts["in-progress"] + 1; }

          counts.lessons = counts.lessons + lc;
          counts.quizzes = counts.quizzes + qc;
          counts.challenges = counts.challenges + cc;

          if (content && content.units && content.units.length) {
            var cs = td > 0 || objectHasKey(started, cid);
            var mods = buildCourseModules(content);
            for (var m = 0; m < mods.length; m++) {
              var p = getModuleProgress(mods[m], comp);
              if (p.completed) { counts["modules-completed"] = counts["modules-completed"] + 1; }
              else if (cs) { counts["modules-in-progress"] = counts["modules-in-progress"] + 1; }
            }
          }
        }));
      })(courses[i]);
    }

    return Promise.all(promises).then(function () {
      var tp = "netology_tutorial_progress:" + email + ":";
      var ak = Object.keys(localStorage);
      for (var t = 0; t < ak.length; t++) {
        if (ak[t].indexOf(tp) !== 0) { continue; }
        var pts = ak[t].substring(tp.length).split(":");
        if (pts[0] && Number(pts[1]) > 0) { counts.tutorials = counts.tutorials + 1; }
      }
      return counts;
    });
  }

  // ── grouping helper ──

  function groupItemsByCourse(items) {
    var grouped = {};
    var order = [];
    for (var i = 0; i < items.length; i++) {
      var k = items[i].courseId;
      if (!objectHasKey(grouped, k)) { grouped[k] = { courseId: k, contentId: items[i].contentId, title: items[i].title, items: [] }; order.push(k); }
      grouped[k].items.push(items[i].item);
    }
    var result = [];
    for (var j = 0; j < order.length; j++) { result.push(grouped[order[j]]); }
    return result;
  }

  function countGroupItems(groups) {
    var n = 0;
    for (var i = 0; i < (groups || []).length; i++) { n = n + (groups[i].items ? groups[i].items.length : 0); }
    return n;
  }

  // ── UI rendering ──

  function renderSplitColumns(progGroups, doneGroups, parent, tab) {
    var row = createElement("div", "net-progress-split");
    var left = buildColumnHeader("In progress", countGroupItems(progGroups), false);
    var right = buildColumnHeader("Completed", countGroupItems(doneGroups), true);

    renderGroupCards(progGroups, left.body, tab, false);
    if (!progGroups.length) { showEmptyColumn(left.body, "Nothing in progress yet."); }
    renderGroupCards(doneGroups, right.body, tab, true);
    if (!doneGroups.length) { showEmptyColumn(right.body, "Nothing completed yet."); }

    row.appendChild(left.wrap);
    row.appendChild(right.wrap);
    parent.appendChild(row);
  }

  function renderGroupCards(groups, parent, tab, isReview) {
    var cfg = TYPE_CONFIG[tab] || TYPE_CONFIG.lessons;
    for (var g = 0; g < groups.length; g++) {
      var grp = groups[g];
      var card = createElement("div", "net-card net-progress-card net-card-fixed net-focus-card mb-3 " + cfg.card);
      var head = createElement("div", "d-flex align-items-start justify-content-between flex-wrap gap-3 mb-2 net-progress-group-head");
      var lbl = cfg.label.toLowerCase();
      var cnt = grp.items.length;

      head.innerHTML =
        '<div class="d-flex align-items-start gap-3">' +
        '<div class="net-progress-pill"><i class="bi ' + cfg.icon + '"></i></div>' +
        "<div>" +
        '<div class="fw-semibold">' + (grp.title || "Course") + "</div>" +
        '<div class="small text-muted">' + cnt + " " + lbl + (cnt === 1 ? "" : "s") + "</div>" +
        '<div class="d-flex flex-wrap gap-2 mt-2"></div></div></div>' +
        '<a class="btn btn-outline-secondary btn-sm" href="' + buildCourseLink(grp.courseId) + '">' +
        '<i class="bi bi-arrow-right me-2"></i>Open course</a>';

      var slot = head.querySelector(".gap-2.mt-2");
      if (slot) { slot.appendChild(makeStatusChip(isReview ? "completed" : "progress")); }

      var list = createElement("ul", "net-progress-items net-card-body");
      for (var j = 0; j < grp.items.length; j++) {
        var item = grp.items[j];
        var li = createElement("li");
        var vc = cfg.variant ? " net-progress-item--" + cfg.variant : "";
        var cta = item.ctaLabel || (isReview ? cfg.ctaDone : cfg.ctaContinue);
        li.innerHTML =
          '<a href="' + item.link + '" class="net-progress-item' + vc + ' net-focus-card">' +
          '<span class="net-progress-item-pill"><i class="bi ' + cfg.icon + '"></i></span>' +
          '<span class="net-progress-item-text">' +
          '<span class="net-progress-item-title">' + (item.title || "") + "</span>" +
          '<span class="net-progress-item-meta">' + (item.meta || cfg.label + " " + item.number) + "</span></span>" +
          '<span class="net-progress-item-cta"><i class="bi bi-arrow-right"></i> ' + cta + "</span></a>";
        list.appendChild(li);
      }
      card.appendChild(head);
      card.appendChild(list);
      parent.appendChild(card);
    }
  }

  function buildSectionWrapper(id, config) {
    var wrap = createElement("section", "net-progress-section");
    wrap.id = id;
    wrap.setAttribute("data-progress-section", id);
    wrap.innerHTML =
      '<div class="net-card p-4 net-progress-section-head net-section-head">' +
      '<div class="net-progress-section-title net-section-title">' + config.title + "</div>" +
      '<div class="net-section-sub">' + config.subtitle + "</div></div>";
    var body = createElement("div", "net-progress-section-body");
    wrap.appendChild(body);
    return { wrap: wrap, body: body };
  }

  function buildColumnHeader(title, count, isCompleted, xpTotal) {
    var wrap = createElement("div", "net-progress-col");
    var ico = isCompleted ? "bi-check2-circle" : "bi-play-circle";
    var xp = (typeof xpTotal === "number") ? '<span class="net-progress-col-xp"><i class="bi bi-lightning-charge-fill"></i> ' + xpTotal + " XP</span>" : "";
    wrap.innerHTML =
      '<div class="net-card p-3 net-progress-col-head">' +
      '<div class="net-progress-col-title"><i class="bi ' + ico + ' text-teal"></i><span>' + title + "</span></div>" +
      '<div class="net-progress-col-meta"><span class="net-progress-col-count">' + count + "</span> " + xp + "</div></div>";
    var body = createElement("div", "net-progress-col-body");
    wrap.appendChild(body);
    return { wrap: wrap, body: body };
  }

  function showEmptyColumn(parent, message) {
    var div = createElement("div", "net-card p-4 net-progress-empty-col");
    div.innerHTML = '<i class="bi bi-info-circle"></i><div class="small text-muted">' + message + "</div>";
    parent.appendChild(div);
  }

  function showEmptyState(tab) {
    var el = document.getElementById("progressEmpty");
    if (!el) { return; }
    var cfg = TAB_CONFIG[tab];
    el.classList.remove("d-none");
    var icon = el.querySelector("i");
    if (icon) { icon.className = "bi " + cfg.icon; }
    setTextById("progressEmptyTitle", cfg.emptyTitle);
    setTextById("progressEmptyText", cfg.emptyText);
    var cta = document.getElementById("progressEmptyCta");
    if (cta) { cta.innerHTML = '<i class="bi ' + cfg.icon + ' me-2"></i>' + cfg.ctaText; cta.setAttribute("href", cfg.ctaLink); }
  }

  function showSkeletonLoader(parent) {
    var wrap = createElement("div", "net-progress-loading");
    for (var i = 0; i < 2; i++) {
      var card = createElement("div", "net-card p-4");
      card.innerHTML = '<div class="net-skel net-w-40 mb-2"></div><div class="net-skel net-w-80 mb-2"></div><div class="net-skel net-w-60"></div>';
      wrap.appendChild(card);
    }
    parent.innerHTML = "";
    parent.appendChild(wrap);
  }

  function makeStatusChip(status) {
    var map = {
      completed: { label: "Completed",   cls: "net-status-chip--completed", icon: "bi-check2-circle" },
      locked:    { label: "Locked",      cls: "net-status-chip--locked",    icon: "bi-lock-fill" },
      progress:  { label: "In progress", cls: "net-status-chip--progress",  icon: "bi-arrow-repeat" }
    };
    var f = map[status] || { label: "Active", cls: "net-status-chip--active", icon: "bi-play-circle" };
    var chip = createElement("span", "net-status-chip " + f.cls);
    chip.innerHTML = '<i class="bi ' + f.icon + '" aria-hidden="true"></i>' + f.label;
    return chip;
  }

  function animateCounterNumber(el, targetValue) {
    var target = Number(targetValue || 0);
    var current = Number(el.dataset.count || el.textContent || 0);
    if (target !== target || current === target) { el.textContent = target; el.dataset.count = target; return; }
    var start = performance.now();
    function tick(now) {
      var p = Math.min(1, (now - start) / 420);
      el.textContent = Math.round(current + (target - current) * p);
      if (p < 1) { requestAnimationFrame(tick); } else { el.dataset.count = target; }
    }
    requestAnimationFrame(tick);
  }

  // ── init ──

  function initialiseProgressPage() {
    var user = readSavedUser();
    if (!user || !user.email) { window.location.href = "login.html"; return; }

    setupSlideSidebar();
    setupUserDropdownMenu();
    setupLogoutButtons();
    displayUserIdentity(user);
    setupTabButtons();

    loadHeroStatCards(user).then(function () {
      var urlType = new URLSearchParams(location.search).get("type");
      var tab = resolveTabName(urlType) || resolveTabName(localStorage.getItem(STORAGE_KEY)) || "courses";
      setActiveTab(tab);
      localStorage.setItem(STORAGE_KEY, tab);
      return loadTabContent(tab, user);
    }).then(function () {
      document.body.classList.remove("net-loading");
      document.body.classList.add("net-loaded");
      if (window.maybeStartOnboardingTour) { window.maybeStartOnboardingTour("progress", user.email); }
    }).catch(function (error) { console.error("Progress init failed:", error); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { initialiseProgressPage(); }, { once: true });
  } else {
    initialiseProgressPage();
  }

}());
