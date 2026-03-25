// courses.js — shows the course catalog page

(function () {
  "use strict";

  var DIFFICULTY_LEVELS = ["novice", "intermediate", "advanced"];
  var ENDPOINTS = window.ENDPOINTS || {};
  var XP_SYSTEM = window.NetologyXP || null;
  var apiGet = window.apiGet;

  // read the saved user from local storage
  function readSavedUserFromLocalStorage() {
    try {
      var rawData = localStorage.getItem("netology_user") || localStorage.getItem("user");
      return rawData ? JSON.parse(rawData) : null;
    } catch (error) {
      return null;
    }
  }

  // turn xp into a level number
  function getLevelFromExperiencePoints(experiencePoints) {
    if (XP_SYSTEM && XP_SYSTEM.levelFromTotalXp) {
      return XP_SYSTEM.levelFromTotalXp(experiencePoints);
    }
    return 1;
  }

  // clean a difficulty string to novice, intermediate, or advanced
  function normaliseDifficultyLevel(rawDifficulty) {
    var cleaned = String(rawDifficulty || "novice").toLowerCase();
    if (DIFFICULTY_LEVELS.indexOf(cleaned) !== -1) {
      return cleaned;
    }
    return "novice";
  }

  // safely escape text for use in html
  function escapeTextForHtml(text) {
    var tempElement = document.createElement("div");
    tempElement.textContent = String(text || "");
    return tempElement.innerHTML;
  }

  // return the right icon for a difficulty level
  function getDifficultyIcon(difficulty) {
    var normalised = normaliseDifficultyLevel(difficulty);
    if (normalised === "advanced") return '<i class="bi bi-diamond-fill"></i>';
    if (normalised === "intermediate") return '<i class="bi bi-hexagon-fill"></i>';
    return '<i class="bi bi-circle-fill"></i>';
  }

  // count the total lessons across all units in a course
  function countTotalLessonsInCourse(courseData) {
    var units = courseData.units || [];
    var totalLessons = 0;
    for (var unitIndex = 0; unitIndex < units.length; unitIndex++) {
      var lessons = units[unitIndex].lessons;
      if (lessons && lessons.length) {
        totalLessons += lessons.length;
      }
    }
    return totalLessons;
  }

  // count how many modules a course has
  function countModulesInCourse(courseData) {
    var units = courseData.units || [];
    return units.length || 1;
  }

  // count objectives in a single unit
  function countObjectivesInUnit(unit) {
    var objectiveCount = 0;
    var lessons = unit.lessons || [];

    for (var lessonIndex = 0; lessonIndex < lessons.length; lessonIndex++) {
      var lesson = lessons[lessonIndex];
      var explicitObjectives = lesson.objectives ? lesson.objectives.length : 0;

      if (explicitObjectives > 0) {
        objectiveCount += explicitObjectives;
      } else {
        var blocks = lesson.blocks || [];
        for (var blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
          var blockType = String(blocks[blockIndex].type || "").toLowerCase();
          if (blockType === "check" || blockType === "activity") {
            objectiveCount += 1;
          }
        }
      }
    }

    if (unit.quiz) objectiveCount += 1;
    if (unit.sandbox) objectiveCount += 1;
    if (unit.challenge) objectiveCount += 1;

    return objectiveCount;
  }

  // count total objectives across all modules
  function getObjectiveStatistics(courseData) {
    var units = courseData.units || [];
    var totalObjectives = 0;

    for (var unitIndex = 0; unitIndex < units.length; unitIndex++) {
      totalObjectives += countObjectivesInUnit(units[unitIndex]);
    }

    return { total: totalObjectives };
  }

  // build the full course list from COURSE_CONTENT
  function buildCourseListFromStaticContent() {
    var courseContentData = window.COURSE_CONTENT || {};
    var courseIds = Object.keys(courseContentData);
    var courseList = [];

    for (var index = 0; index < courseIds.length; index++) {
      var courseId = courseIds[index];
      var courseData = courseContentData[courseId];
      var objectiveStats = getObjectiveStatistics(courseData);

      courseList.push({
        id: String(courseId),
        title: courseData.title || "Course",
        description: courseData.description || "",
        difficulty: normaliseDifficultyLevel(courseData.difficulty),
        category: courseData.category || "Core",
        requiredLevel: Number(courseData.required_level || 1),
        experiencePointsReward: Number(courseData.xpReward || 0),
        moduleCount: countModulesInCourse(courseData),
        totalLessons: countTotalLessonsInCourse(courseData),
        totalObjectives: objectiveStats.total,
        estimatedTime: courseData.estimatedTime || ""
      });
    }

    return courseList;
  }

  // fetch the user's progress for each course from the server
  async function fetchUserCourseProgress(userEmail) {
    try {
      var endpoint = (ENDPOINTS.courses && ENDPOINTS.courses.userCourses) || "/user-courses";
      var serverData = await apiGet(endpoint, { email: userEmail });

      var courseList = Array.isArray(serverData)
        ? serverData
        : (Array.isArray(serverData.courses) ? serverData.courses : []);

      var progressLookup = {};
      for (var index = 0; index < courseList.length; index++) {
        var entry = courseList[index];
        var courseId = String(entry.id || entry.course_id || "");
        if (courseId) {
          progressLookup[courseId] = entry;
        }
      }

      return progressLookup;
    } catch (error) {
      console.warn("Could not fetch user progress:", error);
      return {};
    }
  }

  // split courses into novice, intermediate, and advanced groups
  function groupCoursesByDifficulty(courseList) {
    var grouped = { novice: [], intermediate: [], advanced: [] };

    for (var index = 0; index < courseList.length; index++) {
      var course = courseList[index];
      var difficulty = normaliseDifficultyLevel(course.difficulty);
      grouped[difficulty].push(course);
    }

    return grouped;
  }

  // return "lesson" or "lessons" depending on the count
  function pluralise(count, word) {
    return count + " " + (count === 1 ? word : word + "s");
  }

  // build one course card element
  function buildCourseCard(course, progressLookup, userLevel) {
    var cardElement = document.createElement("div");
    cardElement.className = "net-course-card";
    cardElement.dataset.difficulty = normaliseDifficultyLevel(course.difficulty);

    var courseId = String(course.id || "");
    var progressEntry = progressLookup[courseId] || {};
    var progressPercent = Math.max(0, Math.min(100, Number(progressEntry.progress_pct || 0)));
    var isLocked = Number(course.requiredLevel || 1) > userLevel;
    var isComplete = progressPercent >= 100;
    var isInProgress = progressPercent > 0 && progressPercent < 100;

    if (isLocked) cardElement.classList.add("locked");
    if (isInProgress) cardElement.classList.add("in-progress");
    if (isComplete) cardElement.classList.add("completed");

    var experiencePointsHtml = "";
    if (course.experiencePointsReward > 0) {
      experiencePointsHtml = '<div class="net-course-xp">'
        + '<i class="bi bi-lightning-charge-fill"></i>'
        + "<span>" + course.experiencePointsReward + " XP</span>"
        + "</div>";
    }

    var estimatedTimeHtml = "";
    if (course.estimatedTime) {
      estimatedTimeHtml = '<span class="net-course-stat-pill">'
        + '<i class="bi bi-clock"></i>' + escapeTextForHtml(course.estimatedTime)
        + "</span>";
    }

    var buttonClass = "";
    var buttonText = "";
    if (isLocked) {
      buttonClass = "btn-locked";
      buttonText = '<i class="bi bi-lock"></i> Locked';
    } else if (isComplete) {
      buttonClass = "btn-review";
      buttonText = '<i class="bi bi-check-circle"></i> Review';
    } else if (isInProgress) {
      buttonClass = "btn-continue";
      buttonText = '<i class="bi bi-play-fill"></i> Continue';
    } else {
      buttonClass = "btn-start";
      buttonText = '<i class="bi bi-plus-circle"></i> Start';
    }

    cardElement.innerHTML = ""
      + '<div class="net-course-header">'
      +   '<div class="net-course-icon">' + getDifficultyIcon(course.difficulty) + "</div>"
      +   '<div class="net-course-meta">'
      +     '<div class="net-course-category">' + escapeTextForHtml(course.category || "Core") + "</div>"
      +     '<div class="net-course-title">' + escapeTextForHtml(course.title || "Course") + "</div>"
      +   "</div>"
      + "</div>"
      + '<div class="net-course-stats-row">'
      +   '<span class="net-course-stat-pill"><i class="bi bi-file-text"></i>' + pluralise(course.totalLessons, "lesson") + "</span>"
      +   '<span class="net-course-stat-pill"><i class="bi bi-diagram-3"></i>' + pluralise(course.moduleCount, "module") + "</span>"
      +   '<span class="net-course-stat-pill"><i class="bi bi-check2-square"></i>' + pluralise(course.totalObjectives, "objective") + "</span>"
      +   estimatedTimeHtml
      + "</div>"
      + '<div class="net-course-desc">' + escapeTextForHtml(course.description || "") + "</div>"
      + experiencePointsHtml
      + '<div class="net-course-footer">'
      +   '<div class="net-course-progress-block">'
      +     '<div class="net-course-progress-meta">'
      +       '<span class="net-course-progress-label">' + progressPercent + "% Complete</span>"
      +     "</div>"
      +     '<div class="net-course-bar net-course-bar--wide">'
      +       '<div class="net-course-bar-fill" style="width:' + progressPercent + '%"></div>'
      +     "</div>"
      +   "</div>"
      +   '<button class="net-course-cta ' + buttonClass + '"'
      +     ' data-course-id="' + escapeTextForHtml(courseId) + '"'
      +     (isLocked ? " disabled" : "") + ">"
      +     buttonText
      +   "</button>"
      + "</div>"
      + (isLocked ? '<div class="net-course-lock"><i class="bi bi-lock"></i></div>' : "");

    if (!isLocked) {
      var courseUrl = "course.html?id=" + encodeURIComponent(courseId);

      var ctaButton = cardElement.querySelector(".net-course-cta");
      if (ctaButton) {
        ctaButton.addEventListener("click", function () {
          window.location.href = courseUrl;
        });
      }

      cardElement.style.cursor = "pointer";
      cardElement.addEventListener("click", function (event) {
        if (event.target.closest(".net-course-cta")) return;
        window.location.href = courseUrl;
      });
    }

    return cardElement;
  }

  // render course cards into the grid for each difficulty level
  function renderCourseCards(groupedCourses, progressLookup, userLevel) {
    for (var difficultyIndex = 0; difficultyIndex < DIFFICULTY_LEVELS.length; difficultyIndex++) {
      var difficulty = DIFFICULTY_LEVELS[difficultyIndex];
      var gridElement = document.getElementById(difficulty + "Grid");
      if (!gridElement) continue;

      gridElement.innerHTML = "";
      var coursesInGroup = groupedCourses[difficulty] || [];

      for (var courseIndex = 0; courseIndex < coursesInGroup.length; courseIndex++) {
        var cardElement = buildCourseCard(coursesInGroup[courseIndex], progressLookup, userLevel);
        gridElement.appendChild(cardElement);
      }
    }
  }

  // render the "your learning progress" section at the bottom
  function renderLearningProgressSection(courseList, progressLookup) {
    var container = document.getElementById("myProgressContainer");
    var placeholder = document.getElementById("noProgressPlaceholder");
    if (!container) return;

    var startedCourses = [];
    for (var index = 0; index < courseList.length; index++) {
      var course = courseList[index];
      var progressEntry = progressLookup[String(course.id)] || {};
      var progressPercent = Number(progressEntry.progress_pct || 0);
      if (progressPercent > 0) {
        startedCourses.push(course);
      }
    }

    if (!startedCourses.length) {
      container.innerHTML = "";
      if (placeholder) placeholder.classList.remove("d-none");
      return;
    }

    if (placeholder) placeholder.classList.add("d-none");
    container.innerHTML = "";

    for (var courseIndex = 0; courseIndex < startedCourses.length; courseIndex++) {
      var startedCourse = startedCourses[courseIndex];
      var entry = progressLookup[String(startedCourse.id)] || {};
      var percent = Math.min(100, Math.max(0, Number(entry.progress_pct || 0)));
      var courseId = String(startedCourse.id || "");
      var difficulty = normaliseDifficultyLevel(startedCourse.difficulty);

      var difficultyBadgeClass = "nov";
      if (difficulty === "intermediate") difficultyBadgeClass = "int";
      if (difficulty === "advanced") difficultyBadgeClass = "adv";

      var difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

      var columnElement = document.createElement("div");
      columnElement.className = "col-12 col-md-6 col-xl-4 mb-3";
      columnElement.innerHTML = ""
        + '<div class="net-card p-3" style="cursor:pointer"'
        + " onclick=\"location.href='course.html?id=" + encodeURIComponent(courseId) + "'\">"
        +   '<div class="d-flex align-items-center gap-2 mb-2">'
        +     '<span class="net-diffbadge net-badge-' + difficultyBadgeClass + '">' + difficultyLabel + "</span>"
        +     '<span class="fw-semibold text-truncate">' + escapeTextForHtml(startedCourse.title || "Course") + "</span>"
        +   "</div>"
        +   '<div class="d-flex justify-content-between small text-muted mb-1">'
        +     "<span>Progress</span><span>" + percent + "%</span>"
        +   "</div>"
        +   '<div class="net-course-bar net-course-bar--wide">'
        +     '<div class="net-course-bar-fill" style="width:' + percent + '%"></div>'
        +   "</div>"
        + "</div>";

      container.appendChild(columnElement);
    }
  }

  // wire up the difficulty filter buttons
  function setupDifficultyFilterButtons() {
    var filterButtons = Array.from(document.querySelectorAll("[data-path]"));
    if (!filterButtons.length) return;

    function applyFilter(selectedPath) {
      var activePath = selectedPath;
      if (activePath !== "all" && DIFFICULTY_LEVELS.indexOf(activePath) === -1) {
        activePath = "all";
      }

      for (var buttonIndex = 0; buttonIndex < filterButtons.length; buttonIndex++) {
        var button = filterButtons[buttonIndex];
        var buttonPath = String(button.dataset.path || "all").toLowerCase();
        var isMatch = buttonPath === activePath;

        if (isMatch) {
          button.classList.add("active");
          button.classList.add("btn-teal");
          button.classList.remove("btn-outline-teal");
        } else {
          button.classList.remove("active");
          button.classList.remove("btn-teal");
          button.classList.add("btn-outline-teal");
        }

        button.setAttribute("aria-selected", String(isMatch));
      }

      var courseSections = document.querySelectorAll(".net-course-section");
      for (var sectionIndex = 0; sectionIndex < courseSections.length; sectionIndex++) {
        var section = courseSections[sectionIndex];
        if (activePath === "all") {
          section.style.display = "block";
        } else {
          var sectionDifficulty = String(section.dataset.difficulty || "").toLowerCase();
          section.style.display = sectionDifficulty === activePath ? "block" : "none";
        }
      }
    }

    for (var index = 0; index < filterButtons.length; index++) {
      (function (clickedButton) {
        clickedButton.addEventListener("click", function (event) {
          event.preventDefault();
          applyFilter(String(clickedButton.dataset.path || "all").toLowerCase());
        });
      })(filterButtons[index]);
    }

    applyFilter("all");

    window.addEventListener("pageshow", function () {
      applyFilter("all");
    });
  }

  // load all courses and render everything on the page
  async function loadAndRenderAllCourses(userData) {
    try {
      var courseList = buildCourseListFromStaticContent();
      if (!courseList.length) return;

      var progressLookup = await fetchUserCourseProgress(userData.email);
      var resolved = (XP_SYSTEM && typeof XP_SYSTEM.resolveUserProgress === "function")
        ? XP_SYSTEM.resolveUserProgress(userData)
        : null;
      var userLevel = resolved
        ? Number(resolved.level || 1)
        : (Number(userData.numeric_level) || getLevelFromExperiencePoints(Number(userData.xp || 0)) || 1);
      var groupedCourses = groupCoursesByDifficulty(courseList);

      renderCourseCards(groupedCourses, progressLookup, userLevel);
      renderLearningProgressSection(courseList, progressLookup);
    } catch (error) {
      console.error("Error loading courses:", error);
    }
  }

  // point logo links to the dashboard
  function setupLogoLinks() {
    var topBrandLink = document.getElementById("topBrand");
    var sideBrandLink = document.getElementById("sideBrand");
    if (topBrandLink) topBrandLink.setAttribute("href", "dashboard.html");
    if (sideBrandLink) sideBrandLink.setAttribute("href", "dashboard.html");
  }

  // main entry point, runs when the page loads
  async function initialiseCoursesPage() {
    var userData = readSavedUserFromLocalStorage();
    if (!userData || !userData.email) {
      window.location.href = "login.html";
      return;
    }

    setupLogoLinks();
    window.NetologyNav.displayNavUser(userData);
    setupDifficultyFilterButtons();

    await loadAndRenderAllCourses(userData);

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    if (typeof window.maybeStartOnboardingTour === "function") {
      window.maybeStartOnboardingTour("courses", userData.email);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initialiseCoursesPage();
    }, { once: true });
  } else {
    initialiseCoursesPage();
  }
})();
