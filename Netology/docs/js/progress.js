// progress.js — Progress page
// Student: C22320301 Jamie O'Neill TU857/4

(function () {
  "use strict";

  var API_BASE = String(window.API_BASE || "").replace(/\/$/, "");
  var ENDPOINTS = window.ENDPOINTS || {};
  var STORAGE_KEY = "netology_progress_tab";

  var pageUser = null;
  var courseData = [];
  var compCache = {};
  var dataReady = false;

  // ── helpers ──────────────────────────────────────────────────────────────

  function readUser() {
    try {
      return JSON.parse(localStorage.getItem("netology_user") || localStorage.getItem("user") || "null");
    } catch (e) {
      return null;
    }
  }

  function readJsonFromStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (e) {
      return null;
    }
  }

  function el(id) { return document.getElementById(id); }

  function setText(id, val) {
    var node = el(id);
    if (node) node.textContent = String(val);
  }

  function apiFetch(path, params) {
    var url = API_BASE + path;
    if (params) {
      var query = Object.keys(params).map(function (key) {
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      }).join("&");
      if (query) url += "?" + query;
    }
    return fetch(url).then(function (res) { return res.json(); }).catch(function () { return null; });
  }

  function animateCount(id, target) {
    var node = el(id);
    if (!node) return;
    var endValue = Number(target) || 0;
    var startTime = performance.now();

    (function tick(now) {
      var progress = Math.min(1, (now - startTime) / 600);
      node.textContent = Math.round(endValue * progress);
      if (progress < 1) requestAnimationFrame(tick);
    })(performance.now());
  }

  function diffBadge(diff) {
    var value = String(diff || "novice").toLowerCase();
    var classMap = {
      novice: "net-badge-nov",
      intermediate: "net-badge-int",
      advanced: "net-badge-adv"
    };
    var label = value.charAt(0).toUpperCase() + value.slice(1);
    return '<span class="net-diffbadge ' + (classMap[value] || "net-badge-nov") + '">' + label + "</span>";
  }

  function splitColumns(inProgressItems, completedItems, cardRenderer) {
    if (!inProgressItems.length && !completedItems.length) return "";
    return '<div class="net-progress-split">' +
      columnHtml("In Progress", inProgressItems, "bi-play-circle", cardRenderer) +
      columnHtml("Completed", completedItems, "bi-check2-circle", cardRenderer) +
      "</div>";
  }

  function columnHtml(title, items, iconClass, cardRenderer) {
    var html = '<div class="net-progress-col">' +
      '<div class="net-card p-3 mb-3 d-flex align-items-center justify-content-between">' +
      '<div class="d-flex align-items-center gap-2 fw-semibold">' +
      '<i class="bi ' + iconClass + ' text-teal"></i>' + title + "</div>" +
      '<span class="badge bg-light text-dark border">' + items.length + "</span>" +
      "</div>";

    if (!items.length) {
      html += '<div class="net-card p-4 text-center"><span class="small text-muted">Nothing here yet.</span></div>';
    } else {
      items.forEach(function (item) {
        html += cardRenderer(item);
      });
    }

    return html + "</div>";
  }

  function courseListFromContent() {
    var content = window.COURSE_CONTENT || {};
    return Object.keys(content).map(function (id) {
      var raw = content[id] || {};
      return {
        id: String(id),
        title: raw.title || "Course",
        description: raw.description || "",
        difficulty: raw.difficulty || "novice",
        units: Array.isArray(raw.units) ? raw.units : [],
        progress: 0,
        status: "not-started",
        completed: false
      };
    }).sort(function (a, b) {
      return Number(a.id) - Number(b.id);
    });
  }

  function findCourseById(courseId) {
    var cid = String(courseId);
    for (var index = 0; index < courseData.length; index++) {
      if (String(courseData[index].id) === cid) {
        return courseData[index];
      }
    }
    return null;
  }

  function addNumbersToLookup(lookup, values) {
    var list = Array.isArray(values) ? values : [];
    for (var index = 0; index < list.length; index++) {
      var numberValue = Number(list[index]);
      if (Number.isFinite(numberValue) && numberValue > 0) {
        lookup[String(numberValue)] = true;
      }
    }
  }

  function lessonCompletionKey(unitIndex, lessonIndex) {
    return ((Number(unitIndex) + 1) * 1000) + (Number(lessonIndex) + 1);
  }

  function isLessonDone(comp, unitIndex, lessonIndex) {
    var key = String(lessonCompletionKey(unitIndex, lessonIndex));
    return comp.lessons[key] === true;
  }

  function tutorialProgressMap(email, courseId) {
    var prefix = "netology_tutorial_progress:" + email + ":" + courseId + ":";
    var output = {};
    var keys = Object.keys(localStorage);

    for (var index = 0; index < keys.length; index++) {
      var storageKey = keys[index];
      if (storageKey.indexOf(prefix) !== 0) continue;

      var unitNumber = Number(storageKey.substring(prefix.length));
      if (!Number.isFinite(unitNumber) || unitNumber <= 0) continue;

      output[String(unitNumber)] = readJsonFromStorage(storageKey) || {};
    }

    return output;
  }

  function tutorialStepCount(course, unitIndex) {
    if (!course) return 0;
    var units = course.units || [];
    var unit = units[unitIndex] || null;
    if (!unit || !unit.sandbox) return 0;
    var steps = unit.sandbox.steps || [];
    return steps.length;
  }

  function isTutorialDone(record, totalSteps) {
    if (!record) return false;
    if (record.completed === true) return true;
    var checkedCount = Array.isArray(record.checked) ? record.checked.filter(Boolean).length : 0;
    return totalSteps > 0 && checkedCount >= totalSteps;
  }

  // ── hero stat cards ───────────────────────────────────────────────────────

  function loadHeroCards(email) {
    Promise.all([
      apiFetch((ENDPOINTS.courses && ENDPOINTS.courses.userProgressSummary) || "/user-progress-summary", { email: email }),
      apiFetch("/api/user/streaks", { user_email: email }),
      apiFetch("/api/user/achievements", { user_email: email })
    ]).then(function (results) {
      var summary = results[0] || {};
      var streaks = results[1] || {};
      var achievements = results[2] || {};

      animateCount("heroCoursesActive", summary.in_progress || summary.active_courses || 0);
      animateCount("heroLessons", summary.lessons_done || 0);
      animateCount("heroStreak", streaks.streak || streaks.current_streak || 0);
      animateCount("heroAchievements", Array.isArray(achievements.unlocked) ? achievements.unlocked.length : 0);
    });
  }

  // ── activity heatmap ──────────────────────────────────────────────────────

  function loadHeatmap(email) {
    apiFetch("/api/user/activity", { user_email: email, range: 84 }).then(function (data) {
      var activity = (data && data.activity) ? data.activity : [];
      var byDate = {};
      var totalActions = 0;

      activity.forEach(function (entry) {
        byDate[entry.date] = Number(entry.count) || 0;
        totalActions += byDate[entry.date];
      });

      var totalLabel = el("heatmapTotalLabel");
      if (totalLabel) {
        totalLabel.textContent = totalActions + " action" + (totalActions === 1 ? "" : "s") + " in the last 12 weeks";
      }

      renderHeatmap(byDate);
    });
  }

  function renderHeatmap(byDate) {
    var wrap = el("activityHeatmap");
    if (!wrap) return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var start = new Date(today);
    start.setDate(start.getDate() - 83);
    start.setDate(start.getDate() - start.getDay());

    var dayEntries = [];
    var cursor = new Date(start);
    while (cursor <= today) {
      var key = cursor.toISOString().slice(0, 10);
      dayEntries.push({ date: key, count: byDate[key] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    var dayLabels = ["Sun", "", "Tue", "", "Thu", "", "Sat"];

    var dayColumn = '<div class="prg-heatmap-days">';
    dayLabels.forEach(function (label) {
      dayColumn += '<div class="prg-heatmap-day">' + label + "</div>";
    });
    dayColumn += "</div>";

    var grid = '<div class="prg-heatmap-grid">';
    dayEntries.forEach(function (entry) {
      var count = entry.count;
      var level = count === 0 ? 0 : count < 2 ? 1 : count < 4 ? 2 : count < 7 ? 3 : 4;
      grid += '<div class="prg-hm prg-hm-' + level + '" title="' + entry.date + ": " + count + " action" + (count === 1 ? "" : "s") + '"></div>';
    });
    grid += "</div>";

    wrap.innerHTML = '<div class="prg-heatmap-inner">' + dayColumn + grid + "</div>";
  }

  // ── achievements ──────────────────────────────────────────────────────────

  function loadAchievements(email) {
    apiFetch("/api/user/achievements", { user_email: email }).then(function (data) {
      var unlocked = (data && Array.isArray(data.unlocked)) ? data.unlocked : [];
      var locked = (data && Array.isArray(data.locked)) ? data.locked : [];
      renderAchievements(unlocked, locked);
    });
  }

  function renderAchievements(unlocked, locked) {
    var grid = el("achievementGrid");
    var count = el("achievementCount");
    var total = el("achievementTotal");
    if (!grid) return;

    if (count) count.textContent = unlocked.length;
    if (total) total.textContent = unlocked.length + " / " + (unlocked.length + locked.length) + " unlocked";

    if (!unlocked.length && !locked.length) {
      grid.innerHTML = '<div class="small text-muted">Complete lessons to earn your first achievement.</div>';
      return;
    }

    var html = "";
    unlocked.forEach(function (achievement) { html += achievementBadgeHtml(achievement, true); });
    locked.forEach(function (achievement) { html += achievementBadgeHtml(achievement, false); });
    grid.innerHTML = html;
  }

  function achievementBadgeHtml(achievement, isUnlocked) {
    var icon = (achievement.icon || "bi-trophy").replace(/^bi:/, "bi-");
    var xp = Number(achievement.xp_reward || achievement.xp_added || 0);
    var className = isUnlocked ? "prg-ach-item unlocked" : "prg-ach-item locked";
    var lockHtml = isUnlocked ? "" : '<div class="prg-ach-lock"><i class="bi bi-lock-fill"></i></div>';

    return '<div class="' + className + '" title="' + (achievement.description || "") + '">' +
      '<div class="prg-ach-icon"><i class="bi ' + icon + '"></i>' + lockHtml + "</div>" +
      '<div class="prg-ach-name">' + (achievement.name || "Achievement") + "</div>" +
      (xp ? '<div class="prg-ach-xp">+' + xp + " XP</div>" : "") +
      "</div>";
  }

  // ── course/completion data ────────────────────────────────────────────────

  function ensureData(email) {
    if (dataReady) return Promise.resolve();

    courseData = courseListFromContent();
    var userCoursesEndpoint = (ENDPOINTS.courses && ENDPOINTS.courses.userCourses) || "/user-courses";

    return apiFetch(userCoursesEndpoint, { email: email })
      .then(function (data) {
        var serverCourses = (data && Array.isArray(data.courses)) ? data.courses : [];
        var serverLookup = {};

        serverCourses.forEach(function (course) {
          var cid = String(course.course_id || course.id || "");
          if (!cid) return;
          serverLookup[cid] = course;
        });

        for (var index = 0; index < courseData.length; index++) {
          var course = courseData[index];
          var server = serverLookup[String(course.id)] || null;
          if (!server) continue;

          var progress = Number(server.progress_pct || server.progress || 0);
          course.progress = Math.min(100, Math.max(0, progress));
          course.completed = Boolean(server.completed || server.status === "completed");
          course.status = server.status || (course.completed ? "completed" : (course.progress > 0 ? "in-progress" : "not-started"));
        }
      })
      .catch(function () {
        // Use COURSE_CONTENT-only fallback if server progress is unavailable.
      })
      .then(function () {
        dataReady = true;
        updateBadges(email);
      });
  }

  function emptyComp() {
    return {
      lessons: {},
      quizzes: {},
      challenges: {}
    };
  }

  function getComp(email, courseId) {
    var cid = String(courseId);
    if (compCache[cid]) {
      return Promise.resolve(compCache[cid]);
    }

    var courseStatusEndpoint = (ENDPOINTS.courses && ENDPOINTS.courses.userCourseStatus) || "/user-course-status";

    return apiFetch(courseStatusEndpoint, { email: email, course_id: cid })
      .then(function (data) {
        var comp = emptyComp();

        if (data && data.success) {
          addNumbersToLookup(comp.lessons, data.lessons || []);
          addNumbersToLookup(comp.quizzes, data.quizzes || []);
          addNumbersToLookup(comp.challenges, data.challenges || []);
        }

        compCache[cid] = comp;
        return comp;
      })
      .catch(function () {
        var comp = emptyComp();
        compCache[cid] = comp;
        return comp;
      });
  }

  // ── tab badges ────────────────────────────────────────────────────────────

  function setBadge(tab, count) {
    var button = document.querySelector('.net-progress-nav-btn[data-type="' + tab + '"]');
    if (!button) return;
    var badge = button.querySelector(".net-progress-nav-count");
    if (badge) badge.textContent = String(count);
  }

  function updateBadges(email) {
    var startedCourses = courseData.filter(function (course) {
      return course.status !== "not-started";
    });

    setBadge("courses", startedCourses.length);

    var tutorialsPrefix = "netology_tutorial_progress:" + email + ":";
    var tutorialCount = Object.keys(localStorage).filter(function (key) {
      return key.indexOf(tutorialsPrefix) === 0;
    }).length;
    setBadge("tutorials", tutorialCount);

    Promise.all(startedCourses.map(function (course) {
      return getComp(email, course.id);
    })).then(function (allComp) {
      var lessonCount = 0;
      var quizCount = 0;
      var challengeCount = 0;
      var moduleCount = 0;

      for (var courseIndex = 0; courseIndex < startedCourses.length; courseIndex++) {
        var course = startedCourses[courseIndex];
        var comp = allComp[courseIndex] || emptyComp();
        var units = course.units || [];
        moduleCount += units.length;

        for (var unitIndex = 0; unitIndex < units.length; unitIndex++) {
          var unit = units[unitIndex] || {};
          var lessons = unit.lessons || [];

          for (var lessonIndex = 0; lessonIndex < lessons.length; lessonIndex++) {
            if (isLessonDone(comp, unitIndex, lessonIndex)) {
              lessonCount++;
            }
          }

          if (unit.quiz && comp.quizzes[String(unitIndex + 1)] === true) {
            quizCount++;
          }

          if (unit.challenge && comp.challenges[String(unitIndex + 1)] === true) {
            challengeCount++;
          }
        }
      }

      setBadge("lessons", lessonCount);
      setBadge("quizzes", quizCount);
      setBadge("challenges", challengeCount);
      setBadge("modules", moduleCount);
    });
  }

  // ── tabs ──────────────────────────────────────────────────────────────────

  function setupTabs(email) {
    var buttons = document.querySelectorAll(".net-progress-nav-btn");
    for (var index = 0; index < buttons.length; index++) {
      buttons[index].addEventListener("click", (function (button) {
        return function () {
          var tab = button.dataset.type;
          localStorage.setItem(STORAGE_KEY, tab);
          activateTab(tab, email);
        };
      })(buttons[index]));
    }

    var urlTab = new URLSearchParams(location.search).get("type") || "";
    var savedTab = urlTab || localStorage.getItem(STORAGE_KEY) || "courses";
    activateTab(savedTab, email);
  }

  function activateTab(tab, email) {
    var validTabs = ["courses", "modules", "lessons", "quizzes", "tutorials", "challenges"];
    if (validTabs.indexOf(tab) === -1) tab = "courses";

    document.querySelectorAll(".net-progress-nav-btn").forEach(function (button) {
      var active = button.dataset.type === tab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });

    loadTab(tab, email);
  }

  // ── tab content ───────────────────────────────────────────────────────────

  function showSkeleton() {
    var list = el("progressList");
    if (!list) return;

    list.innerHTML =
      '<div class="net-progress-split">' +
      '<div class="net-progress-col"><div class="net-card p-4 mb-3">' +
      '<div class="net-skel net-w-40 mb-2"></div><div class="net-skel net-w-80 mb-2"></div><div class="net-skel net-w-60"></div>' +
      "</div></div>" +
      '<div class="net-progress-col"><div class="net-card p-4 mb-3">' +
      '<div class="net-skel net-w-40 mb-2"></div><div class="net-skel net-w-80 mb-2"></div><div class="net-skel net-w-60"></div>' +
      "</div></div>" +
      "</div>";

    var empty = el("progressEmpty");
    if (empty) empty.classList.add("d-none");
  }

  function loadTab(tab, email) {
    showSkeleton();

    ensureData(email).then(function () {
      var promise;

      if (tab === "courses") {
        promise = buildCourses(email);
      } else if (tab === "modules") {
        promise = buildModules(email);
      } else if (tab === "lessons") {
        promise = buildItems(email, "lessons");
      } else if (tab === "quizzes") {
        promise = buildItems(email, "quizzes");
      } else if (tab === "challenges") {
        promise = buildItems(email, "challenges");
      } else if (tab === "tutorials") {
        promise = Promise.resolve(buildTutorials(email));
      } else {
        promise = Promise.resolve("");
      }

      promise.then(function (html) {
        var list = el("progressList");
        var empty = el("progressEmpty");
        if (!list) return;

        if (html) {
          list.innerHTML = html;
          if (empty) empty.classList.add("d-none");
        } else {
          list.innerHTML = "";
          if (empty) empty.classList.remove("d-none");
        }
      });
    });
  }

  // ── courses tab ───────────────────────────────────────────────────────────

  function buildCourses(email) {
    var startedCourses = courseData.filter(function (course) {
      return course.status !== "not-started";
    });

    return Promise.all(startedCourses.map(function (course) {
      return getComp(email, course.id).then(function () {
        return { course: course, done: course.status === "completed" || Number(course.progress || 0) >= 100 };
      });
    })).then(function (entries) {
      var inProgressItems = entries.filter(function (entry) { return !entry.done; });
      var completedItems = entries.filter(function (entry) { return entry.done; });

      return splitColumns(inProgressItems, completedItems, function (entry) {
        return courseCard(entry.course, entry.done);
      });
    });
  }

  function courseCard(course, isCompleted) {
    var progress = Number(course.progress || 0);
    var iconClass = isCompleted ? "bi-check-circle-fill text-success" : "bi-journal-album text-teal";
    var button = isCompleted
      ? '<a href="course.html?id=' + course.id + '" class="btn btn-sm btn-outline-secondary"><i class="bi bi-eye me-1"></i>Review</a>'
      : '<a href="course.html?id=' + course.id + '" class="btn btn-sm btn-teal"><i class="bi bi-play-fill me-1"></i>Resume</a>';

    return '<div class="net-card p-3 mb-3"><div class="d-flex gap-3 align-items-start">' +
      '<i class="bi ' + iconClass + ' fs-3 mt-1 flex-shrink-0"></i>' +
      '<div class="flex-grow-1">' +
      '<div class="mb-1">' + diffBadge(course.difficulty) + "</div>" +
      '<div class="fw-semibold mb-1">' + course.title + "</div>" +
      '<div class="small text-muted mb-2" style="max-width:520px">' + course.description + "</div>" +
      '<div class="d-flex align-items-center gap-2" style="max-width:260px">' +
      '<div class="net-meter flex-grow-1"><div class="net-meter-fill" style="width:' + progress + '%"></div></div>' +
      '<span class="small text-muted fw-semibold">' + progress + "%</span></div>" +
      '</div><div class="flex-shrink-0">' + button + "</div>" +
      "</div></div>";
  }

  // ── modules tab ───────────────────────────────────────────────────────────

  function buildModules(email) {
    var startedCourses = courseData.filter(function (course) {
      return course.status !== "not-started";
    });

    return Promise.all(startedCourses.map(function (course) {
      return getComp(email, course.id).then(function (comp) {
        return {
          course: course,
          comp: comp,
          tutorials: tutorialProgressMap(email, course.id)
        };
      });
    })).then(function (entries) {
      var inProgressItems = [];
      var completedItems = [];

      entries.forEach(function (entry) {
        var units = entry.course.units || [];

        for (var unitIndex = 0; unitIndex < units.length; unitIndex++) {
          var unit = units[unitIndex] || {};
          var doneCount = 0;
          var totalCount = 0;

          var lessons = unit.lessons || [];
          for (var lessonIndex = 0; lessonIndex < lessons.length; lessonIndex++) {
            totalCount++;
            if (isLessonDone(entry.comp, unitIndex, lessonIndex)) {
              doneCount++;
            }
          }

          if (unit.quiz) {
            totalCount++;
            if (entry.comp.quizzes[String(unitIndex + 1)] === true) {
              doneCount++;
            }
          }

          if (unit.sandbox) {
            totalCount++;
            var tutorialRecord = entry.tutorials[String(unitIndex + 1)] || null;
            if (isTutorialDone(tutorialRecord, tutorialStepCount(entry.course, unitIndex))) {
              doneCount++;
            }
          }

          if (unit.challenge) {
            totalCount++;
            if (entry.comp.challenges[String(unitIndex + 1)] === true) {
              doneCount++;
            }
          }

          if (!totalCount) continue;

          var row = {
            courseId: entry.course.id,
            courseTitle: entry.course.title,
            unitTitle: unit.title || ("Module " + (unitIndex + 1)),
            done: doneCount,
            total: totalCount
          };

          if (doneCount >= totalCount) {
            completedItems.push(row);
          } else if (doneCount > 0) {
            inProgressItems.push(row);
          }
        }
      });

      return splitColumns(inProgressItems, completedItems, function (item) {
        var isCompleted = completedItems.indexOf(item) >= 0;
        var button = '<a href="course.html?id=' + item.courseId + '" class="btn btn-sm ' + (isCompleted ? "btn-outline-secondary" : "btn-teal") + '">' +
          (isCompleted ? '<i class="bi bi-eye me-1"></i>Review' : '<i class="bi bi-play-fill me-1"></i>Resume') + "</a>";

        return '<div class="net-card p-3 mb-3"><div class="d-flex align-items-center gap-3">' +
          '<i class="bi bi-layers fs-3 text-muted flex-shrink-0"></i>' +
          '<div class="flex-grow-1">' +
          '<div class="small text-muted mb-1">' + item.courseTitle + "</div>" +
          '<div class="fw-semibold">' + item.unitTitle + "</div>" +
          '<div class="small text-muted">' + item.done + " / " + item.total + " activities done</div>" +
          '</div><div class="flex-shrink-0">' + button + "</div>" +
          "</div></div>";
      });
    });
  }

  // ── lessons / quizzes / challenges tabs ──────────────────────────────────

  function buildItems(email, type) {
    var startedCourses = courseData.filter(function (course) {
      return course.status !== "not-started";
    });

    return Promise.all(startedCourses.map(function (course) {
      return getComp(email, course.id).then(function (comp) {
        return { course: course, comp: comp };
      });
    })).then(function (entries) {
      var inProgressItems = [];
      var completedItems = [];

      entries.forEach(function (entry) {
        var course = entry.course;
        var comp = entry.comp;
        var units = course.units || [];

        for (var unitIndex = 0; unitIndex < units.length; unitIndex++) {
          var unit = units[unitIndex] || {};

          if (type === "lessons") {
            var lessons = unit.lessons || [];
            for (var lessonIndex = 0; lessonIndex < lessons.length; lessonIndex++) {
              var lesson = lessons[lessonIndex] || {};
              var lessonDone = isLessonDone(comp, unitIndex, lessonIndex);
              var lessonEntry = {
                title: lesson.title || ("Lesson " + (lessonIndex + 1)),
                subtitle: "Unit " + (unitIndex + 1),
                courseTitle: course.title,
                link: "lesson.html?course=" + course.id + "&unit=" + unitIndex + "&lesson=" + lessonIndex,
                type: type
              };
              if (lessonDone) completedItems.push(lessonEntry);
              else inProgressItems.push(lessonEntry);
            }
          }

          if (type === "quizzes" && unit.quiz) {
            var quizDone = comp.quizzes[String(unitIndex + 1)] === true;
            var quizEntry = {
              title: unit.quiz.title || "Quiz",
              subtitle: "Unit " + (unitIndex + 1),
              courseTitle: course.title,
              link: "quiz.html?course=" + course.id + "&unit=" + unitIndex,
              type: type
            };
            if (quizDone) completedItems.push(quizEntry);
            else inProgressItems.push(quizEntry);
          }

          if (type === "challenges" && unit.challenge) {
            var challengeDone = comp.challenges[String(unitIndex + 1)] === true;
            var challengeEntry = {
              title: unit.challenge.title || "Challenge",
              subtitle: "Unit " + (unitIndex + 1),
              courseTitle: course.title,
              link: "sandbox.html?course=" + course.id + "&unit=" + unitIndex + "&mode=challenge",
              type: type
            };
            if (challengeDone) completedItems.push(challengeEntry);
            else inProgressItems.push(challengeEntry);
          }
        }
      });

      return splitColumns(inProgressItems, completedItems, function (item) {
        var iconMap = {
          lessons: "bi-journal-check",
          quizzes: "bi-patch-question",
          challenges: "bi-flag"
        };
        var isCompleted = completedItems.indexOf(item) >= 0;
        var button = '<a href="' + item.link + '" class="btn btn-sm ' + (isCompleted ? "btn-outline-secondary" : "btn-teal") + '">' +
          (isCompleted ? '<i class="bi bi-eye me-1"></i>Review' : '<i class="bi bi-play-fill me-1"></i>Go') + "</a>";

        return '<div class="net-card p-3 mb-2"><div class="d-flex align-items-center gap-3">' +
          '<i class="bi ' + (iconMap[item.type] || "bi-circle") + ' fs-5 text-muted flex-shrink-0"></i>' +
          '<div class="flex-grow-1">' +
          '<div class="small text-muted">' + item.courseTitle + "</div>" +
          '<div class="fw-semibold">' + item.title + "</div>" +
          '<div class="small text-muted">' + item.subtitle + "</div>" +
          '</div><div class="flex-shrink-0">' + button + "</div>" +
          "</div></div>";
      });
    });
  }

  // ── tutorials tab ────────────────────────────────────────────────────────

  function buildTutorials(email) {
    var prefix = "netology_tutorial_progress:" + email + ":";
    var inProgressItems = [];
    var completedItems = [];
    var keys = Object.keys(localStorage);

    for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
      var storageKey = keys[keyIndex];
      if (storageKey.indexOf(prefix) !== 0) continue;

      var parts = storageKey.substring(prefix.length).split(":");
      var courseId = parts[0];
      var unitNumber = Number(parts[1]);
      if (!courseId || !Number.isFinite(unitNumber) || unitNumber <= 0) continue;

      var course = findCourseById(courseId);
      var unitIndex = unitNumber - 1;
      var unit = course && course.units ? (course.units[unitIndex] || null) : null;
      var tutorial = unit && unit.sandbox ? unit.sandbox : null;

      var saved = readJsonFromStorage(storageKey) || {};
      var checkedCount = Array.isArray(saved.checked) ? saved.checked.filter(Boolean).length : 0;
      var total = tutorial ? (tutorial.steps || []).length : 0;
      var done = isTutorialDone(saved, total);

      var row = {
        title: tutorial && tutorial.title ? tutorial.title : ("Tutorial " + unitNumber),
        courseTitle: course ? course.title : ("Course " + courseId),
        checked: checkedCount,
        total: total,
        link: "sandbox.html?course=" + courseId + "&unit=" + unitIndex + "&mode=practice"
      };

      if (done) completedItems.push(row);
      else inProgressItems.push(row);
    }

    return splitColumns(inProgressItems, completedItems, function (item) {
      var isCompleted = completedItems.indexOf(item) >= 0;
      var button = '<a href="' + item.link + '" class="btn btn-sm ' + (isCompleted ? "btn-outline-secondary" : "btn-teal") + '">' +
        (isCompleted ? '<i class="bi bi-eye me-1"></i>Review' : '<i class="bi bi-play-fill me-1"></i>Resume') + "</a>";

      return '<div class="net-card p-3 mb-2"><div class="d-flex align-items-center gap-3">' +
        '<i class="bi bi-diagram-3 fs-5 text-muted flex-shrink-0"></i>' +
        '<div class="flex-grow-1">' +
        '<div class="small text-muted">' + item.courseTitle + "</div>" +
        '<div class="fw-semibold">' + item.title + "</div>" +
        (item.total ? '<div class="small text-muted">' + item.checked + " / " + item.total + " steps</div>" : "") +
        '</div><div class="flex-shrink-0">' + button + "</div>" +
        "</div></div>";
    });
  }

  // ── init ─────────────────────────────────────────────────────────────────

  function init() {
    pageUser = readUser();
    if (!pageUser || !pageUser.email) {
      location.href = "login.html";
      return;
    }

    var email = pageUser.email;

    if (window.NetologyNav && window.NetologyNav.displayNavUser) {
      window.NetologyNav.displayNavUser(pageUser);
    }

    var name = String(pageUser.first_name || "").trim();
    var level = pageUser.numeric_level || 1;
    var rank = pageUser.rank || pageUser.level || "Novice";

    if (name) {
      setText("bannerSub", "Welcome back, " + name + ". Here's your learning journey.");
    }
    setText("bannerLevel", rank + " · Level " + level);

    loadHeroCards(email);
    loadHeatmap(email);
    loadAchievements(email);
    setupTabs(email);

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    if (window.maybeStartOnboardingTour) {
      window.maybeStartOnboardingTour("progress", email);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
