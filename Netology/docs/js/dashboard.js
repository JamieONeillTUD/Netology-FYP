// dashboard.js — Main user dashboard with progress, achievements, and challenges.

(function () {
  "use strict";

  var ENDPOINTS = window.ENDPOINTS || {};
  var apiGet = window.apiGet;

  var dashboardState = {
    refreshTimer: null,
    carouselTimer: null,
    progress: null,
    achievements: { all: [], unlocked: [], locked: [] },
    challenges: { daily: [], weekly: [] },
    courses: [],
    listenersAttached: false
  };

  var NETWORKING_TIPS = [
    "CompTIA Network+ covers the physical, data link, network, transport, and application layers.",
    "A MAC address is 48 bits long and is burned into the network card.",
    "OSPF is a link-state routing protocol using Dijkstra's algorithm.",
    "TCP is connection-oriented, while UDP is connectionless.",
    "DNS translates human-readable domain names into IP addresses.",
    "DHCP automatically assigns IP addresses to devices on a network.",
    "VLANs segment a network to improve security and performance.",
    "A subnet mask defines the network and host portions of an IP address.",
    "ARP maps IP addresses to MAC addresses.",
    "A firewall filters traffic based on security rules."
  ];

  // Read the saved user object from local storage
  function readSavedUserFromLocalStorage() {
    try {
      var rawData = localStorage.getItem("netology_user") || localStorage.getItem("user");
      return rawData ? JSON.parse(rawData) : null;
    } catch (error) {
      return null;
    }
  }

  // Save the user object to local storage
  function saveUserToLocalStorage(userData) {
    if (!userData) return;
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("netology_user", JSON.stringify(userData));
  }

  // Get the user profile from the server and merge with saved data
  async function fetchUserProfileFromServer() {
    var savedUser = readSavedUserFromLocalStorage();
    var userEmail = "";

    if (savedUser && savedUser.email) {
      userEmail = savedUser.email;
    } else {
      userEmail = localStorage.getItem("netology_last_email") || "";
    }

    if (!userEmail) {
      return savedUser;
    }

    try {
      var endpoint = (ENDPOINTS.auth && ENDPOINTS.auth.userInfo) || "/user-info";
      var serverData = await apiGet(endpoint, { email: userEmail });

      if (!serverData || !serverData.success) {
        return savedUser;
      }

      var updatedUser = Object.assign({}, savedUser || {}, {
        email: userEmail,
        first_name: serverData.first_name || (savedUser && savedUser.first_name) || "",
        last_name: serverData.last_name || (savedUser && savedUser.last_name) || "",
        username: serverData.username || (savedUser && savedUser.username) || "",
        xp: Number.isFinite(Number(serverData.xp !== undefined ? serverData.xp : serverData.total_xp))
          ? Number(serverData.xp !== undefined ? serverData.xp : serverData.total_xp)
          : Number((savedUser && savedUser.xp) || 0),
        numeric_level: Number.isFinite(Number(serverData.numeric_level))
          ? Number(serverData.numeric_level)
          : ((savedUser && savedUser.numeric_level) || 1),
        rank: serverData.rank || serverData.level || (savedUser && savedUser.rank) || "",
        level: serverData.level || serverData.rank || (savedUser && savedUser.level) || "",
        xp_into_level: Number(serverData.xp_into_level || 0),
        next_level_xp: Number(serverData.next_level_xp || 100),
        is_first_login: typeof serverData.is_first_login !== "undefined"
          ? Boolean(serverData.is_first_login)
          : (savedUser && savedUser.is_first_login),
        onboarding_completed: typeof serverData.onboarding_completed !== "undefined"
          ? Boolean(serverData.onboarding_completed)
          : (savedUser && savedUser.onboarding_completed)
      });

      saveUserToLocalStorage(updatedUser);
      return updatedUser;
    } catch (error) {
      console.warn("Could not fetch user from server:", error);
      return savedUser;
    }
  }

  // Get the user's progress summary from the server
  async function fetchUserProgressFromServer(userEmail) {
    if (!userEmail) {
      dashboardState.progress = null;
      return null;
    }

    try {
      var endpoint = (ENDPOINTS.courses && ENDPOINTS.courses.userProgressSummary) || "/user-progress-summary";
      var serverData = await apiGet(endpoint, { email: userEmail });

      if (serverData && (serverData.lessons_done !== undefined || serverData.quizzes_done !== undefined || serverData.total_xp !== undefined)) {
        dashboardState.progress = {
          email: userEmail,
          lessonsCompleted: Number(serverData.lessons_done || 0),
          quizzesCompleted: Number(serverData.quizzes_done || 0),
          challengesCompleted: Number(serverData.challenges_done || 0),
          coursesFinished: Number(serverData.courses_done || 0),
          coursesInProgress: Number(serverData.in_progress || 0),
          coursesTotal: Number(serverData.total_courses || 0),
          totalExperiencePoints: Number(serverData.total_xp || 0),
          currentLevel: Number(serverData.level || 1),
          loginStreak: Number(serverData.login_streak || serverData.streak || 0)
        };
        return dashboardState.progress;
      }

      dashboardState.progress = null;
      return null;
    } catch (error) {
      console.warn("Could not fetch progress:", error);
      dashboardState.progress = null;
      return null;
    }
  }

  // Get unlocked and locked achievements from the server
  async function fetchUserAchievementsFromServer(userEmail) {
    var emptyAchievements = { all: [], unlocked: [], locked: [] };

    if (!userEmail) {
      dashboardState.achievements = emptyAchievements;
      return emptyAchievements;
    }

    try {
      var endpoint = (ENDPOINTS.achievements && ENDPOINTS.achievements.list) || "/api/user/achievements";
      var serverData = await apiGet(endpoint, { user_email: userEmail });

      if (serverData && (serverData.unlocked || serverData.locked || serverData.achievements)) {
        var unlockedList = (serverData.unlocked || []).map(function (achievement) {
          return Object.assign({}, achievement, { unlocked: true });
        });
        var lockedList = (serverData.locked || []).map(function (achievement) {
          return Object.assign({}, achievement, { unlocked: false });
        });
        dashboardState.achievements = {
          all: unlockedList.concat(lockedList),
          unlocked: unlockedList,
          locked: lockedList
        };
      } else {
        dashboardState.achievements = emptyAchievements;
      }

      return dashboardState.achievements;
    } catch (error) {
      console.warn("Could not fetch achievements:", error);
      dashboardState.achievements = emptyAchievements;
      return emptyAchievements;
    }
  }

  // Get challenges of a specific type (daily or weekly)
  async function fetchChallengesOfType(userEmail, challengeType) {
    var endpoint = (ENDPOINTS.challenges && ENDPOINTS.challenges.list) || "/api/user/challenges";
    try {
      var serverData = await apiGet(endpoint, { type: challengeType, user_email: userEmail });
      return Array.isArray(serverData) ? serverData : (serverData.challenges || []);
    } catch (error) {
      console.warn("Could not fetch " + challengeType + " challenges:", error);
      return [];
    }
  }

  // Get both daily and weekly challenges and display them
  async function fetchAllChallengesFromServer(userEmail) {
    var dailyTasksContainer = document.getElementById("dailyTasks");
    var weeklyTasksContainer = document.getElementById("weeklyTasks");

    if (!userEmail) {
      displayChallengeList(dailyTasksContainer, []);
      displayChallengeList(weeklyTasksContainer, []);
      return;
    }

    try {
      var results = await Promise.all([
        fetchChallengesOfType(userEmail, "daily"),
        fetchChallengesOfType(userEmail, "weekly")
      ]);
      var dailyChallenges = results[0];
      var weeklyChallenges = results[1];

      dashboardState.challenges.daily = dailyChallenges;
      dashboardState.challenges.weekly = weeklyChallenges;
      displayChallengeList(dailyTasksContainer, dailyChallenges);
      displayChallengeList(weeklyTasksContainer, weeklyChallenges);
    } catch (error) {
      console.warn("Error loading challenges:", error);
    }
  }

  // Build course list from COURSE_CONTENT and overlay progress from the server
  async function fetchCourseProgressFromServer(userEmail) {
    if (!userEmail) {
      dashboardState.courses = [];
      return [];
    }

    var courseContentData = window.COURSE_CONTENT || {};
    var courseIds = Object.keys(courseContentData);
    var allCourses = [];

    for (var index = 0; index < courseIds.length; index++) {
      var courseId = courseIds[index];
      var courseData = courseContentData[courseId];
      var units = courseData.units || [];
      var totalLessonsInCourse = 0;

      for (var unitIndex = 0; unitIndex < units.length; unitIndex++) {
        var unitLessons = units[unitIndex].lessons;
        if (unitLessons && unitLessons.length) {
          totalLessonsInCourse += unitLessons.length;
        }
      }

      allCourses.push({
        id: String(courseId),
        title: courseData.title || "Course",
        difficulty: courseData.difficulty || "novice",
        category: courseData.category || "Core",
        experiencePointsReward: courseData.xpReward || 0,
        totalLessons: totalLessonsInCourse,
        progressPercent: 0,
        status: "not-started"
      });
    }

    try {
      var endpoint = (ENDPOINTS.courses && ENDPOINTS.courses.userCourses) || "/user-courses";
      var serverData = await apiGet(endpoint, { email: userEmail });
      var courseList = Array.isArray(serverData)
        ? serverData
        : (Array.isArray(serverData.courses) ? serverData.courses : []);

      var progressLookup = {};
      for (var serverIndex = 0; serverIndex < courseList.length; serverIndex++) {
        var serverCourse = courseList[serverIndex];
        var serverCourseId = String(serverCourse.id || serverCourse.course_id || "");
        progressLookup[serverCourseId] = serverCourse;
      }

      for (var courseIndex = 0; courseIndex < allCourses.length; courseIndex++) {
        var currentCourse = allCourses[courseIndex];
        var progressData = progressLookup[currentCourse.id];
        if (progressData) {
          currentCourse.progressPercent = Math.min(100, Math.max(0, Number(progressData.progress_pct || 0)));
          currentCourse.status = progressData.status || "not-started";
        }
      }
    } catch (error) {
      console.warn("Could not fetch course progress:", error);
    }

    var startedCourses = [];
    for (var filterIndex = 0; filterIndex < allCourses.length; filterIndex++) {
      if (allCourses[filterIndex].progressPercent > 0) {
        startedCourses.push(allCourses[filterIndex]);
      }
    }

    dashboardState.courses = startedCourses;
    return startedCourses;
  }

  // Record today's login for streak tracking
  function recordTodaysLogin(userEmail) {
    if (typeof window.recordLoginDay === "function") {
      window.recordLoginDay(userEmail);
    }
  }

  // Point logo links to dashboard or home page
  function setupLogoLinks() {
    var savedUser = readSavedUserFromLocalStorage();
    var targetPage = (savedUser && savedUser.email) ? "dashboard.html" : "index.html";

    var topBrandLink = document.getElementById("topBrand");
    var sideBrandLink = document.getElementById("sideBrand");

    if (topBrandLink) topBrandLink.setAttribute("href", targetPage);
    if (sideBrandLink) sideBrandLink.setAttribute("href", targetPage);
  }

  // Update dashboard greeting names from user profile.
  function displayDashboardGreetingName(userData) {
    var firstName = String((userData && userData.first_name) || "").trim();
    var username = String((userData && userData.username) || "").trim();
    var fallback = firstName || username || "Student";

    var welcomeName = document.getElementById("welcomeName");
    if (welcomeName) {
      welcomeName.textContent = fallback;
    }

    var welcomeOverlayName = document.getElementById("dashboardWelcomeName");
    if (welcomeOverlayName) {
      welcomeOverlayName.textContent = fallback;
    }
  }

  // Wire up the daily/weekly challenge toggle buttons
  function setupChallengeToggleButtons() {
    var toggleButtons = Array.from(document.querySelectorAll(".dash-toggle-btn[data-panel]"));
    if (!toggleButtons.length) return;

    function setActivePanel(targetPanelId) {
      for (var buttonIndex = 0; buttonIndex < toggleButtons.length; buttonIndex++) {
        var button = toggleButtons[buttonIndex];
        var panelId = button.getAttribute("data-panel");
        var isActive = panelId === targetPanelId;

        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");

        if (!panelId) continue;
        var panel = document.getElementById(panelId);
        if (!panel) continue;

        if (isActive) {
          panel.hidden = false;
          panel.classList.add("is-active");
          panel.setAttribute("aria-hidden", "false");
        } else {
          panel.classList.remove("is-active");
          panel.hidden = true;
          panel.setAttribute("aria-hidden", "true");
        }
      }
    }

    var defaultPanelId = null;
    for (var index = 0; index < toggleButtons.length; index++) {
      if (toggleButtons[index].classList.contains("is-active")) {
        defaultPanelId = toggleButtons[index].getAttribute("data-panel");
        break;
      }
    }
    if (!defaultPanelId) {
      defaultPanelId = toggleButtons[0].getAttribute("data-panel");
    }
    setActivePanel(defaultPanelId);

    for (var buttonIndex = 0; buttonIndex < toggleButtons.length; buttonIndex++) {
      (function (clickedButton) {
        clickedButton.addEventListener("click", function () {
          var targetPanelId = clickedButton.getAttribute("data-panel");
          if (!targetPanelId) return;
          setActivePanel(targetPanelId);
        });
      })(toggleButtons[buttonIndex]);
    }
  }

  // Set up the stats carousel that auto-advances every 8 seconds
  function setupStatsCarousel() {
    var carouselTrack = document.getElementById("statsTrack");
    var carouselIndicators = document.getElementById("statsIndicators");

    if (!carouselTrack || !carouselIndicators) return;

    var slides = Array.from(carouselTrack.querySelectorAll(".net-carousel-slide"));
    var indicatorDots = Array.from(carouselIndicators.querySelectorAll(".net-indicator"));

    if (!slides.length || indicatorDots.length !== slides.length) return;

    var currentSlideIndex = 0;

    function goToSlide(slideIndex) {
      currentSlideIndex = (slideIndex + slides.length) % slides.length;
      for (var slideNumber = 0; slideNumber < slides.length; slideNumber++) {
        if (slideNumber === currentSlideIndex) {
          slides[slideNumber].classList.add("is-active");
        } else {
          slides[slideNumber].classList.remove("is-active");
        }
      }
      for (var dotNumber = 0; dotNumber < indicatorDots.length; dotNumber++) {
        if (dotNumber === currentSlideIndex) {
          indicatorDots[dotNumber].classList.add("active");
        } else {
          indicatorDots[dotNumber].classList.remove("active");
        }
      }
    }

    function restartAutoAdvance() {
      if (dashboardState.carouselTimer) {
        clearInterval(dashboardState.carouselTimer);
      }
      dashboardState.carouselTimer = setInterval(function () {
        goToSlide(currentSlideIndex + 1);
      }, 8000);
    }

    for (var dotIndex = 0; dotIndex < indicatorDots.length; dotIndex++) {
      (function (index) {
        indicatorDots[index].addEventListener("click", function (event) {
          event.stopPropagation();
          goToSlide(index);
          restartAutoAdvance();
        });
      })(dotIndex);
    }

    goToSlide(0);
    restartAutoAdvance();
  }

  // Rotate networking tips in the tip box every 10 seconds
  function startNetworkingTipsRotation() {
    var tipBox = document.getElementById("dailyTip");
    if (!tipBox) return;

    var tipIndex = 0;
    tipBox.textContent = NETWORKING_TIPS[0];
    tipIndex = 1;

    setInterval(function () {
      tipBox.style.transition = "opacity 0.6s ease";
      tipBox.style.opacity = "0";

      setTimeout(function () {
        tipBox.textContent = NETWORKING_TIPS[tipIndex % NETWORKING_TIPS.length];
        tipIndex++;
        tipBox.style.opacity = "1";
      }, 600);
    }, 10000);
  }

  // Activate Bootstrap tooltips on the page
  function activateBootstrapTooltips(scopeElement) {
    if (!window.bootstrap || !window.bootstrap.Tooltip) return;

    var container = scopeElement || document;
    var tooltipElements = container.querySelectorAll('[data-bs-toggle="tooltip"]');

    for (var tooltipIndex = 0; tooltipIndex < tooltipElements.length; tooltipIndex++) {
      var element = tooltipElements[tooltipIndex];
      var existingTooltip = window.bootstrap.Tooltip.getInstance(element);
      if (existingTooltip) existingTooltip.dispose();
      new window.bootstrap.Tooltip(element);
    }
  }

  // Set up onboarding for first-time users
  function setupFirstTimeOnboarding(userData) {
    if (!userData || !userData.email || !userData.is_first_login) return;

    var userEmail = String(userData.email).trim().toLowerCase();
    var previousOnboardingUser = String(localStorage.getItem("netology_onboarding_user") || "").trim().toLowerCase();

    var onboardingAlreadyDone = Boolean(userData.onboarding_completed)
      || localStorage.getItem("netology_onboarding_completed_" + userEmail) === "true"
      || localStorage.getItem("netology_onboarding_skipped_" + userEmail) === "true";

    if (onboardingAlreadyDone) return;

    if (!previousOnboardingUser || previousOnboardingUser !== userEmail) {
      localStorage.setItem("netology_onboarding_user", userEmail);
      localStorage.setItem("netology_onboarding_stage", "dashboard");
    }

    try {
      sessionStorage.setItem("netology_onboarding_session", "true");
    } catch (error) {}

  }

  // Start the onboarding tour if available
  function startOnboardingTourIfAvailable(userData) {
    if (!userData || !userData.email) return;
    if (typeof window.maybeStartOnboardingTour === "function") {
      window.maybeStartOnboardingTour("dashboard", userData.email);
    }
  }

  // Refresh the dashboard when the tab gets focus or storage changes
  function setupAutoRefreshListeners() {
    if (dashboardState.listenersAttached) return;
    dashboardState.listenersAttached = true;

    function scheduleRefresh() {
      if (document.hidden) return;
      if (dashboardState.refreshTimer) clearTimeout(dashboardState.refreshTimer);
      dashboardState.refreshTimer = setTimeout(function () {
        refreshEntireDashboard();
      }, 180);
    }

    window.addEventListener("focus", scheduleRefresh);

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) scheduleRefresh();
    });

    window.addEventListener("storage", function (event) {
      if (event.key === "user" || (event.key && event.key.indexOf("netology_") === 0)) {
        scheduleRefresh();
      }
    });
  }

  // Update the stat numbers in the carousel slides
  function displayProgressStatistics() {
    var progress = dashboardState.progress;
    if (!progress) return;

    var activeCoursesElement = document.getElementById("heroActive");
    if (activeCoursesElement) activeCoursesElement.textContent = progress.coursesInProgress || 0;

    var lessonsElement = document.getElementById("statLessons");
    if (lessonsElement) lessonsElement.textContent = progress.lessonsCompleted || 0;

    var quizzesElement = document.getElementById("statQuizzes");
    if (quizzesElement) quizzesElement.textContent = progress.quizzesCompleted || 0;

    var challengesElement = document.getElementById("statChallenges");
    if (challengesElement) challengesElement.textContent = progress.challengesCompleted || 0;
  }

  // Update the rank card and draw the semicircle XP gauge
  function displayRankAndExperienceGauge() {
    var userData = readSavedUserFromLocalStorage();
    if (!userData) return;

    var userLevel = Number(userData.numeric_level || userData.level || 1);
    var tierName = "Novice";
    if (userLevel >= 5) {
      tierName = "Advanced";
    } else if (userLevel >= 3) {
      tierName = "Intermediate";
    }

    var rankElement = document.getElementById("heroRank");
    if (rankElement) rankElement.textContent = userLevel;

    var difficultyElement = document.getElementById("heroRankDifficulty");
    if (difficultyElement) difficultyElement.textContent = tierName;

    var gaugeContainer = document.getElementById("heroXP");
    if (!gaugeContainer) return;

    var totalExperiencePoints = Number(userData.xp || 0);
    var experiencePointsForNextLevel = Number(userData.next_level_xp || userData.xp_for_next_level || 100);
    var experiencePointsIntoCurrentLevel = Number(userData.xp_into_level || 0);

    var experiencePointsAtLevelStart = 0;
    if (window.NetologyXP && window.NetologyXP.totalXpForLevel) {
      experiencePointsAtLevelStart = window.NetologyXP.totalXpForLevel(userLevel);
    } else {
      experiencePointsAtLevelStart = (100 * (userLevel - 1) * userLevel) / 2;
    }

    var currentExperienceInLevel = experiencePointsIntoCurrentLevel > 0
      ? experiencePointsIntoCurrentLevel
      : Math.max(0, totalExperiencePoints - experiencePointsAtLevelStart);

    var progressPercent = 0;
    if (experiencePointsForNextLevel > 0) {
      progressPercent = Math.min(100, Math.max(0, (currentExperienceInLevel / experiencePointsForNextLevel) * 100));
    }

    var radius = 54;
    var centerX = 100;
    var centerY = 90;
    var arcLength = Math.PI * radius;
    var dashOffset = arcLength * (1 - progressPercent / 100);

    var svgNamespace = "http://www.w3.org/2000/svg";

    var svgElement = document.createElementNS(svgNamespace, "svg");
    svgElement.setAttribute("viewBox", "0 0 200 100");
    svgElement.setAttribute("width", "200");
    svgElement.setAttribute("height", "100");
    svgElement.style.cssText = "max-width: 200px; display: block;";

    var backgroundArc = document.createElementNS(svgNamespace, "circle");
    backgroundArc.setAttribute("cx", centerX);
    backgroundArc.setAttribute("cy", centerY);
    backgroundArc.setAttribute("r", radius);
    backgroundArc.setAttribute("fill", "none");
    backgroundArc.setAttribute("stroke", "#e9ecef");
    backgroundArc.setAttribute("stroke-width", "10");
    backgroundArc.setAttribute("stroke-dasharray", arcLength + " " + arcLength);
    backgroundArc.setAttribute("stroke-dashoffset", "0");
    backgroundArc.setAttribute("stroke-linecap", "round");
    backgroundArc.setAttribute("transform", "rotate(180 " + centerX + " " + centerY + ")");
    svgElement.appendChild(backgroundArc);

    var progressArc = document.createElementNS(svgNamespace, "circle");
    progressArc.setAttribute("cx", centerX);
    progressArc.setAttribute("cy", centerY);
    progressArc.setAttribute("r", radius);
    progressArc.setAttribute("fill", "none");
    progressArc.setAttribute("stroke", "#0d9488");
    progressArc.setAttribute("stroke-width", "10");
    progressArc.setAttribute("stroke-dasharray", arcLength + " " + arcLength);
    progressArc.setAttribute("stroke-dashoffset", dashOffset);
    progressArc.setAttribute("stroke-linecap", "round");
    progressArc.setAttribute("transform", "rotate(180 " + centerX + " " + centerY + ")");
    svgElement.appendChild(progressArc);

    var levelText = document.createElementNS(svgNamespace, "text");
    levelText.setAttribute("x", centerX);
    levelText.setAttribute("y", "72");
    levelText.setAttribute("text-anchor", "middle");
    levelText.setAttribute("font-size", "30");
    levelText.setAttribute("font-weight", "700");
    levelText.setAttribute("fill", "#212529");
    levelText.textContent = userLevel;
    svgElement.appendChild(levelText);

    var experienceLabel = document.createElementNS(svgNamespace, "text");
    experienceLabel.setAttribute("x", centerX);
    experienceLabel.setAttribute("y", "90");
    experienceLabel.setAttribute("text-anchor", "middle");
    experienceLabel.setAttribute("font-size", "10");
    experienceLabel.setAttribute("fill", "#6c757d");
    experienceLabel.textContent = currentExperienceInLevel + " / " + experiencePointsForNextLevel + " XP";
    svgElement.appendChild(experienceLabel);

    gaugeContainer.innerHTML = "";
    gaugeContainer.classList.remove("visually-hidden");
    gaugeContainer.appendChild(svgElement);
  }

  // Count how many days in a row the user has logged in
  function countConsecutiveLoginDays(userEmail) {
    if (!userEmail || typeof window.getLoginLog !== "function") return 0;

    try {
      var loginHistory = window.getLoginLog(userEmail);
      if (!loginHistory || !loginHistory.length) return 0;

      var consecutiveDays = 0;
      var checkDate = new Date();
      checkDate.setHours(0, 0, 0, 0);

      while (true) {
        var year = checkDate.getFullYear();
        var month = String(checkDate.getMonth() + 1).padStart(2, "0");
        var day = String(checkDate.getDate()).padStart(2, "0");
        var dateString = year + "-" + month + "-" + day;

        if (loginHistory.indexOf(dateString) === -1) break;

        consecutiveDays++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      return consecutiveDays;
    } catch (error) {
      console.warn("Could not count login streak:", error);
      return (dashboardState.progress && dashboardState.progress.loginStreak) || 0;
    }
  }

  // Draw the 7-day login streak calendar
  function displayLoginStreakCalendar() {
    var userData = readSavedUserFromLocalStorage();
    if (!userData) return;

    var calendarContainer = document.getElementById("streakCalendar");
    if (!calendarContainer) return;

    var dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
    var today = new Date();
    calendarContainer.innerHTML = "";

    for (var daysAgo = 6; daysAgo >= 0; daysAgo--) {
      var calendarDate = new Date(today);
      calendarDate.setDate(calendarDate.getDate() - daysAgo);

      var dayElement = document.createElement("div");
      dayElement.className = "streak-day";
      dayElement.title = calendarDate.toLocaleDateString();
      dayElement.textContent = dayLabels[calendarDate.getDay()];
      calendarContainer.appendChild(dayElement);
    }

    var streakCountElement = document.getElementById("heroStreak");
    if (streakCountElement) {
      streakCountElement.textContent = countConsecutiveLoginDays(userData.email);
    }
  }

  // Render the continue learning course cards
  function displayContinueLearningCourses() {
    var coursesContainer = document.getElementById("continueBox");
    if (!coursesContainer) return;

    var inProgressCourses = [];
    var allCourses = dashboardState.courses || [];

    for (var filterIndex = 0; filterIndex < allCourses.length; filterIndex++) {
      var courseStatus = (allCourses[filterIndex].status || "").toLowerCase();
      var courseProgress = Number(allCourses[filterIndex].progressPercent || 0);

      if (courseStatus !== "completed" && (courseStatus === "in-progress" || courseProgress > 0)) {
        inProgressCourses.push(allCourses[filterIndex]);
      }
    }

    if (inProgressCourses.length === 0) {
      coursesContainer.className = "small text-muted text-center p-3";
      coursesContainer.textContent = "No courses in progress. Start a new course!";
      return;
    }

    coursesContainer.className = "continue-learning-list";
    coursesContainer.innerHTML = "";

    for (var courseIndex = 0; courseIndex < inProgressCourses.length; courseIndex++) {
      var course = inProgressCourses[courseIndex];
      var completionPercent = Math.min(100, Math.max(0, Number(course.progressPercent || 0)));
      var courseId = String(course.id || "");
      var courseLink = courseId ? "course.html?id=" + encodeURIComponent(courseId) : "courses.html";
      var courseTitle = course.title || "Course";
      var courseCategory = course.category || "";

      var difficultyLevel = (course.difficulty || "novice").toLowerCase();
      if (difficultyLevel !== "novice" && difficultyLevel !== "intermediate" && difficultyLevel !== "advanced") {
        difficultyLevel = "novice";
      }

      var difficultyIcon = '<i class="bi bi-circle-fill"></i>';
      if (difficultyLevel === "advanced") {
        difficultyIcon = '<i class="bi bi-diamond-fill"></i>';
      } else if (difficultyLevel === "intermediate") {
        difficultyIcon = '<i class="bi bi-hexagon-fill"></i>';
      }

      var staticCourseData = (window.COURSE_CONTENT && window.COURSE_CONTENT[courseId]) || {};
      var staticUnits = staticCourseData.units || [];
      var lessonCount = 0;

      for (var unitIndex = 0; unitIndex < staticUnits.length; unitIndex++) {
        var unitLessons = staticUnits[unitIndex].lessons;
        if (unitLessons && unitLessons.length) {
          lessonCount += unitLessons.length;
        }
      }

      if (lessonCount === 0) {
        lessonCount = course.totalLessons || 0;
      }

      var experiencePointsReward = staticCourseData.xpReward || course.experiencePointsReward || 0;

      var courseCard = document.createElement("div");
      courseCard.className = "net-course-card net-course-card--sm";
      courseCard.dataset.difficulty = difficultyLevel;
      courseCard.style.cursor = "pointer";

      var lessonsHtml = "";
      if (lessonCount) {
        lessonsHtml = '<span class="net-course-stat-pill"><i class="bi bi-file-text"></i>' + lessonCount + ' lessons</span>';
      }

      var experienceHtml = "";
      if (experiencePointsReward) {
        experienceHtml = '<span class="net-course-stat-pill"><i class="bi bi-lightning-charge-fill"></i>' + experiencePointsReward + ' XP</span>';
      }

      var categoryHtml = "";
      if (courseCategory) {
        categoryHtml = '<div class="net-course-category">' + courseCategory + '</div>';
      }

      courseCard.innerHTML =
        '<div class="net-course-header">' +
          '<div class="net-course-icon">' + difficultyIcon + '</div>' +
          '<div class="net-course-meta">' +
            categoryHtml +
            '<div class="net-course-title">' + courseTitle + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="net-course-stats-row">' +
          lessonsHtml +
          experienceHtml +
        '</div>' +
        '<div class="net-course-footer">' +
          '<div class="net-course-progress-block">' +
            '<div class="net-course-progress-meta">' +
              '<span class="net-course-progress-label">' + completionPercent + '% Complete</span>' +
            '</div>' +
            '<div class="net-course-bar net-course-bar--wide">' +
              '<div class="net-course-bar-fill" style="width:' + completionPercent + '%"></div>' +
            '</div>' +
          '</div>' +
          '<button class="net-course-cta btn-continue"><i class="bi bi-play-fill"></i> Continue</button>' +
        '</div>';

      (function (linkUrl) {
        courseCard.addEventListener("click", function () {
          window.location.href = linkUrl;
        });
        courseCard.querySelector(".net-course-cta").addEventListener("click", function (event) {
          event.stopPropagation();
          window.location.href = linkUrl;
        });
      })(courseLink);

      coursesContainer.appendChild(courseCard);
    }
  }

  // Render the achievement badges
  function displayAchievementBadges() {
    var achievementContainer = document.getElementById("achieveScroller");
    if (!achievementContainer) return;

    var achievementData = dashboardState.achievements;
    if (!achievementData || !achievementData.all || achievementData.all.length === 0) {
      achievementContainer.textContent = "No achievements yet";
      achievementContainer.classList.add("text-muted", "small");
      return;
    }

    achievementContainer.innerHTML = "";
    achievementContainer.classList.remove("text-muted", "small");

    var orderedAchievements = (achievementData.unlocked || []).concat(achievementData.locked || []);

    for (var achievementIndex = 0; achievementIndex < orderedAchievements.length; achievementIndex++) {
      var achievement = orderedAchievements[achievementIndex];

      var badgeElement = document.createElement("div");
      badgeElement.className = "achievement-badge " + (achievement.unlocked ? "unlocked" : "locked");
      badgeElement.setAttribute("data-bs-toggle", "tooltip");
      badgeElement.setAttribute("data-bs-placement", "top");

      var tooltipText = achievement.name + ": " + achievement.description;
      if (achievement.xp_reward) {
        tooltipText += " (+" + achievement.xp_reward + " XP)";
      }
      badgeElement.title = tooltipText;

      var iconElement = document.createElement("div");
      iconElement.className = "badge-icon";
      iconElement.innerHTML = '<i class="bi ' + (achievement.icon || "bi-star") + '"></i>';
      badgeElement.appendChild(iconElement);

      var nameElement = document.createElement("div");
      nameElement.className = "badge-name";
      nameElement.textContent = achievement.name;
      badgeElement.appendChild(nameElement);

      achievementContainer.appendChild(badgeElement);
    }

    var tooltipElements = achievementContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
    for (var tooltipIndex = 0; tooltipIndex < tooltipElements.length; tooltipIndex++) {
      new bootstrap.Tooltip(tooltipElements[tooltipIndex]);
    }
  }

  // Render a list of challenges into a container
  function displayChallengeList(container, challengeList) {
    if (!container) return;

    if (!challengeList || challengeList.length === 0) {
      container.className = "dash-tasklist small text-muted text-center p-2";
      container.textContent = "No challenges available";
      return;
    }

    container.className = "dash-tasklist";
    container.innerHTML = "";

    for (var challengeIndex = 0; challengeIndex < challengeList.length; challengeIndex++) {
      var challenge = challengeList[challengeIndex];
      var isCompleted = challenge.completed === true || challenge.status === "completed";
      var experienceReward = challenge.xp_reward || 0;
      var progressValue = Number(challenge.progress_value || 0);
      var progressTarget = Number(challenge.progress_target || 0);

      var challengeRow = document.createElement("div");
      challengeRow.className = "dash-challenge" + (isCompleted ? " is-done" : "");

      var challengeTopRow = document.createElement("div");
      challengeTopRow.className = "dash-challenge-top";

      var statusText = "";
      if (isCompleted) {
        statusText = "✓ Done";
      } else if (progressTarget > 0) {
        statusText = progressValue + "/" + progressTarget;
        if (experienceReward) {
          statusText += " • +" + experienceReward + " XP";
        }
      } else if (experienceReward) {
        statusText = "+" + experienceReward + " XP";
      }

      challengeTopRow.innerHTML =
        '<span class="dash-challenge-name">' + (challenge.title || challenge.name || "Challenge") + '</span>' +
        '<span class="dash-challenge-xp">' + statusText + '</span>';
      challengeRow.appendChild(challengeTopRow);

      if (challenge.description) {
        var descriptionElement = document.createElement("div");
        descriptionElement.className = "dash-challenge-desc";
        descriptionElement.textContent = challenge.description;
        challengeRow.appendChild(descriptionElement);
      }

      container.appendChild(challengeRow);
    }
  }

  // Fetch everything and redraw the whole dashboard
  async function refreshEntireDashboard() {
    var userData = await fetchUserProfileFromServer();

    if (userData && userData.email) {
      try {
        await Promise.all([
          fetchUserProgressFromServer(userData.email),
          fetchUserAchievementsFromServer(userData.email),
          fetchAllChallengesFromServer(userData.email),
          fetchCourseProgressFromServer(userData.email)
        ]);
      } catch (error) {
        console.warn("Error during refresh:", error);
      }
    }

    window.NetologyNav.displayNavUser(userData);
    displayDashboardGreetingName(userData);
    displayProgressStatistics();
    displayRankAndExperienceGauge();
    displayLoginStreakCalendar();
    displayAchievementBadges();
    displayContinueLearningCourses();
  }

  // Main entry point, sets up the page then fetches data
  async function initialiseDashboard() {
    setupLogoLinks();
    setupChallengeToggleButtons();
    setupStatsCarousel();
    activateBootstrapTooltips();
    startNetworkingTipsRotation();

    var cachedUser = readSavedUserFromLocalStorage();
    if (cachedUser) {
      window.NetologyNav.displayNavUser(cachedUser);
      displayDashboardGreetingName(cachedUser);
      displayProgressStatistics();
      displayRankAndExperienceGauge();
      displayLoginStreakCalendar();
      displayContinueLearningCourses();
    }

    var userData = await fetchUserProfileFromServer();

    if (userData && userData.email) {
      recordTodaysLogin(userData.email);
      try {
        await Promise.all([
          fetchUserProgressFromServer(userData.email),
          fetchUserAchievementsFromServer(userData.email),
          fetchAllChallengesFromServer(userData.email),
          fetchCourseProgressFromServer(userData.email)
        ]);
      } catch (error) {
        console.warn("Error during data fetch:", error);
      }
    } else {
      dashboardState.progress = null;
      dashboardState.achievements = { all: [], unlocked: [], locked: [] };
      dashboardState.challenges = { daily: [], weekly: [] };
      dashboardState.courses = [];
    }

    window.NetologyNav.displayNavUser(userData);
    displayDashboardGreetingName(userData);
    displayProgressStatistics();
    displayRankAndExperienceGauge();
    displayLoginStreakCalendar();
    displayContinueLearningCourses();
    displayAchievementBadges();

    if (userData && userData.email) {
      setupFirstTimeOnboarding(userData);
      setTimeout(function () {
        startOnboardingTourIfAvailable(userData);
      }, 600);
    }

    setupAutoRefreshListeners();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseDashboard, { once: true });
  } else {
    initialiseDashboard();
  }
})();
