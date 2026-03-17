// User dashboard with progress tracking and achievements

(() => {
  "use strict";

  // CONFIGURATION & SETUP

  // Get API endpoints from the shared config
  const ENDPOINTS = window.ENDPOINTS || {};
  
  // Get the XP system from shared config (calculations, levels, etc.)
  const XP_SYSTEM = window.NetologyXP || null;
  
  // How long to cache challenge data before refreshing
  const CHALLENGE_CACHE_MILLISECONDS = 60000; // 60 seconds
  
  // How long to wait before updating dashboard after a change
  const REFRESH_DEBOUNCE_MILLISECONDS = 180;

  // The current state of the dashboard
  const dashboardState = {
    // Timers that we need to clean up
    refreshTimer: null,
    dailyTipTimer: null,
    statsCarouselTimer: null,

    // Cached data from API
    progressSummary: null,
    achievementCatalog: { all: [], unlocked: [], locked: [] },
    achievementsFetchedAtTime: 0,
    challenges: { daily: [], weekly: [] },
    challengesFetchedAtTime: 0,
    userCourses: [],

    // Tracking
    autoRefreshBound: false
  };

  // Tips shown each day (or from course data)
  const DAILY_NETWORKING_TIPS = [
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

  // Icon classes for each achievement (from Font Awesome)
  const ACHIEVEMENT_ICON_MAP = {
    first_lesson: "bi-journal-check",
    five_day_streak: "bi-fire",
    novice_master: "bi-mortarboard-fill",
    sandbox_builder: "bi-diagram-3-fill",
    speed_learner: "bi-lightning-charge-fill"
  };

  // HELPER: Get API or use fallback

  // Get the API helper function (from config.js or use fallback)
  const apiGet = typeof window.apiGet === "function"
    ? window.apiGet
    : createFallbackApiGet();

  // If no global API helper exists, create a simple version
  function createFallbackApiGet() {
    return async function apiGetFallback(apiPath, queryParameters = {}) {
      const apiBaseUrl = String(window.API_BASE || "").trim();
      const fullUrl = apiBaseUrl
        ? new URL(apiBaseUrl.replace(/\/$/, "") + apiPath)
        : new URL(apiPath, window.location.origin);

      // Add query parameters
      Object.entries(queryParameters).forEach(([paramName, paramValue]) => {
        if (paramValue !== undefined && paramValue !== null && paramValue !== "") {
          fullUrl.searchParams.set(paramName, String(paramValue));
        }
      });

      const response = await fetch(fullUrl.toString(), { cache: "no-store" });
      return response.json();
    };
  }

  // UTILITY FUNCTIONS

  // Get element by ID (shorthand)
  function getById(elementId) {
    return document.getElementById(elementId);
  }

  // Run callback when DOM is ready
  function onDOMReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
      return;
    }
    callback();
  }

  // Safely parse JSON without throwing errors
  function parseJsonSafely(textToParse, fallbackValue = null) {
    try {
      return textToParse ? JSON.parse(textToParse) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  }

  function normalizeEmail(emailValue) {
    return String(emailValue || "").trim().toLowerCase();
  }

  // USER DATA FUNCTIONS

  // Get the currently logged-in user from local storage
  function getCurrentUser() {
    const user = parseJsonSafely(localStorage.getItem("netology_user"), null)
      || parseJsonSafely(localStorage.getItem("user"), null)
      || null;
    return user;
  }

  // Save user data to local storage
  function saveCurrentUser(userObject) {
    if (!userObject) return;
    localStorage.setItem("user", JSON.stringify(userObject));
    localStorage.setItem("netology_user", JSON.stringify(userObject));
  }

  // MAIN DASHBOARD INITIALIZATION

  async function initializeDashboard() {
    console.log("Initializing dashboard...");

    // STEP 1: Setup UI chrome (navigation, sidebar, dropdowns)
    console.log("Step 1: Setting up UI...");
    setupBrandRouting();
    setupSidebar();
    setupUserDropdown();
    setupLogoutButtons();

    // Setup dashboard widgets (challenge toggle, stats carousel)
    setupChallengeToggle();
    setupStatsCarousel();
    setupChallengeRetryButton();

    // Initialize tooltips
    initializeBootstrapTooltips();
    setupDailyTipRotation();

    // STEP 2: Ensure rendering functions exist first
    console.log("Step 2: Setting up rendering functions...");
    ensureRenderingFunctions();

    // Display cached user data while we fetch fresh data
    console.log("Step 2b: Displaying cached user...");
    const cachedUser = getCurrentUser();
    if (cachedUser) {
      window.dashboardRender?.fillUserChrome(cachedUser);
      window.dashboardRender?.renderProgressWidgets(cachedUser);
      await window.dashboardRender?.renderContinueLearning(cachedUser);
    }

    // STEP 3: Fetch fresh user data from API
    console.log("Step 3: Fetching fresh user data...");
    const freshUser = await refreshUserFromServer();

    // STEP 4: Load user progress, achievements, challenges
    console.log("Step 4: Fetching user progress...");
    if (freshUser?.email) {
      // Record today's login for streaks
      recordLoginToday(freshUser.email);

      // Fetch all in parallel with error handling
      try {
        await Promise.all([
          fetchProgressFromServer(freshUser.email),
          fetchAchievementsFromServer(freshUser.email, { forceRefresh: true }),
          loadChallengesFromServer(freshUser.email, { forceRefresh: true }),
          fetchUserCoursesFromServer(freshUser.email)
        ]);
      } catch (error) {
        console.error("Error during data fetch:", error);
        // Continue even if some data fails to load
      }
    } else {
      // Guest user - clear cached data
      dashboardState.progressSummary = null;
      dashboardState.achievementCatalog = { all: [], unlocked: [], locked: [] };
      dashboardState.challenges = { daily: [], weekly: [] };
      dashboardState.userCourses = [];
    }

    // STEP 5: Render everything
    console.log("Step 5: Rendering dashboard...");
    window.dashboardRender?.fillUserChrome(freshUser);
    window.dashboardRender?.renderProgressWidgets(freshUser);
    window.dashboardRender?.renderContinueLearning(freshUser);
    window.dashboardRender?.renderAchievements();

    // STEP 6: Show onboarding tour if this is first login
    console.log("Step 6: Checking for first-time setup...");
    if (freshUser?.email) {
      prepareFirstTimeUser(freshUser);
      window.setTimeout(() => {
        maybeStartOnboardingTour(freshUser);
      }, 600);
    }

    // STEP 7: Set up auto-refresh when page becomes visible
    console.log("Step 7: Setting up auto-refresh...");
    setupAutoRefresh();

    console.log("Dashboard initialization complete!");
  }

  // REFRESH USER DATA FROM SERVER

  // Fetch fresh user data from the API
  async function refreshUserFromServer() {
    const cachedUser = getCurrentUser();
    const userEmail = cachedUser?.email || localStorage.getItem("netology_last_email") || "";
    
    if (!userEmail) {
      return cachedUser; // No email, can't fetch
    }

    try {
      // Fetch user info endpoint
      const endpoint = ENDPOINTS.auth?.userInfo || "/user-info";
      const data = await apiGet(endpoint, { email: userEmail });
      
      if (!data?.success) {
        return cachedUser; // API error, use cached
      }

      // Merge API data with cached data
      const mergedUser = {
        ...(cachedUser || {}),
        email: userEmail,
        first_name: data.first_name || cachedUser?.first_name,
        last_name: data.last_name || cachedUser?.last_name,
        username: data.username || cachedUser?.username,
        xp: Number.isFinite(Number(data.xp ?? data.total_xp)) ? Number(data.xp ?? data.total_xp) : Number(cachedUser?.xp || 0),
        numeric_level: Number.isFinite(Number(data.numeric_level)) ? Number(data.numeric_level) : (cachedUser?.numeric_level || 1),
        rank: data.rank || data.level || cachedUser?.rank,
        level: data.level || data.rank || cachedUser?.level,
        is_first_login: typeof data.is_first_login !== "undefined" ? Boolean(data.is_first_login) : cachedUser?.is_first_login,
        onboarding_completed: typeof data.onboarding_completed !== "undefined" ? Boolean(data.onboarding_completed) : cachedUser?.onboarding_completed
      };

      // Save the merged data
      saveCurrentUser(mergedUser);
      return mergedUser;

    } catch (error) {
      console.warn("Could not refresh user data:", error);
      return cachedUser; // Use what we have
    }
  }

  // FETCH PROGRESS DATA

  // Fetch progress summary from server
  async function fetchProgressFromServer(userEmail) {
    if (!userEmail) {
      console.log("No email provided to fetchProgressFromServer");
      dashboardState.progressSummary = null;
      return null;
    }

    try {
      const endpoint = ENDPOINTS.courses?.userProgressSummary || "/user-progress-summary";
      console.log("Fetching progress from:", endpoint);
      const data = await apiGet(endpoint, { email: userEmail });
      console.log("Got progress response:", data);

      // Be more forgiving - if we got a response with any progress data, use it
      if (data && (data.lessons_done !== undefined || data.quizzes_done !== undefined || data.total_xp !== undefined)) {
        // Store in dashboard state
        dashboardState.progressSummary = {
          email: userEmail,
          lessonsDone: Number(data.lessons_done || 0),
          quizzesDone: Number(data.quizzes_done || 0),
          challengesDone: Number(data.challenges_done || 0),
          coursesDone: Number(data.courses_done || 0),
          inProgress: Number(data.in_progress || 0),
          totalCourses: Number(data.total_courses || 0),
          totalXp: Number(data.total_xp || 0),
          level: Number(data.level || 1),
          loginStreak: Number(data.login_streak || data.streak || 0)
        };
        console.log("Stored progress:", dashboardState.progressSummary);

        return dashboardState.progressSummary;
      } else {
        console.log("No progress data in response");
        dashboardState.progressSummary = null;
        return null;
      }

    } catch (error) {
      console.error("ERROR fetching progress:", error);
      dashboardState.progressSummary = null;
      return null;
    }
  }

  // FETCH ACHIEVEMENTS

  // Fetch achievement catalog from server
  async function fetchAchievementsFromServer(userEmail, options = {}) {
    const shouldForceRefresh = options.forceRefresh === true;
    
    if (!userEmail) {
      console.log("No email provided to fetchAchievementsFromServer");
      dashboardState.achievementCatalog = { all: [], unlocked: [], locked: [] };
      return dashboardState.achievementCatalog;
    }

    // Check if we have fresh cached data
    if (!shouldForceRefresh && dashboardState.achievementCatalog.all.length > 0) {
      const ageMs = Date.now() - Number(dashboardState.achievementsFetchedAtTime || 0);
      if (ageMs < 60000) { // Less than 60 seconds old
        console.log("Using cached achievements");
        return dashboardState.achievementCatalog;
      }
    }

    try {
      const endpoint = ENDPOINTS.achievements?.list || "/api/user/achievements";
      console.log("Fetching achievements from:", endpoint, "for email:", userEmail);
      const data = await apiGet(endpoint, { user_email: userEmail });
      console.log("Got achievements response:", data);

      // If no success indicator, still process the data if it has achievement info
      if (data && (data.unlocked || data.locked || data.achievements)) {
        const unlockedAchievements = (data.unlocked || []).map(achievement => ({ ...achievement, unlocked: true }));
        const lockedAchievements = (data.locked || []).map(achievement => ({ ...achievement, unlocked: false }));

        dashboardState.achievementCatalog = {
          all: [...unlockedAchievements, ...lockedAchievements],
          unlocked: unlockedAchievements,
          locked: lockedAchievements
        };
        dashboardState.achievementsFetchedAtTime = Date.now();
        console.log("Stored achievements. Total:", dashboardState.achievementCatalog.all.length, "Unlocked:", unlockedAchievements.length);
      } else {
        console.log("No achievement data in response");
        dashboardState.achievementCatalog = { all: [], unlocked: [], locked: [] };
      }

      return dashboardState.achievementCatalog;

    } catch (error) {
      console.error("ERROR fetching achievements:", error);
      dashboardState.achievementCatalog = { all: [], unlocked: [], locked: [] };
      return dashboardState.achievementCatalog;
    }
  }

  // FETCH CHALLENGES

  // Load challenges from server
  async function loadChallengesFromServer(userEmail, options = {}) {
    const shouldForceRefresh = options.forceRefresh === true;
    
    if (!userEmail) {
      window.dashboardRender?.renderChallengeList(getById("dailyTasks"), [], "daily");
      window.dashboardRender?.renderChallengeList(getById("weeklyTasks"), [], "weekly");
      return;
    }

    // Check if we have fresh cached data
    if (!shouldForceRefresh && dashboardState.challengesFetchedAtTime > 0) {
      const ageMs = Date.now() - dashboardState.challengesFetchedAtTime;
      if (ageMs < CHALLENGE_CACHE_MILLISECONDS) {
        // Render from cache
        window.dashboardRender?.renderChallengeList(getById("dailyTasks"), dashboardState.challenges.daily, "daily");
        window.dashboardRender?.renderChallengeList(getById("weeklyTasks"), dashboardState.challenges.weekly, "weekly");
        return;
      }
    }

    try {
      // Fetch both daily and weekly challenges in parallel
      const [dailyResult, weeklyResult] = await Promise.all([
        fetchChallengesByType(userEmail, "daily"),
        fetchChallengesByType(userEmail, "weekly")
      ]);

      // Store results
      if (dailyResult.success) {
        dashboardState.challenges.daily = dailyResult.challenges || [];
      } else {
        console.warn("Daily challenges fetch failed");
      }
      if (weeklyResult.success) {
        dashboardState.challenges.weekly = weeklyResult.challenges || [];
      } else {
        console.warn("Weekly challenges fetch failed");
      }

      // Update timestamp
      dashboardState.challengesFetchedAtTime = Date.now();

      // Render both types
      window.dashboardRender?.renderChallengeList(getById("dailyTasks"), dashboardState.challenges.daily, "daily");
      window.dashboardRender?.renderChallengeList(getById("weeklyTasks"), dashboardState.challenges.weekly, "weekly");

    } catch (error) {
      console.error("Error loading challenges:", error);
    }
  }

  // Fetch one type of challenge (daily or weekly)
  async function fetchChallengesByType(userEmail, challengeType) {
    const apiBaseUrl = String(window.API_BASE || "").trim();
    const endpoint = ENDPOINTS.challenges?.list || "/api/user/challenges";

    const fullUrl = apiBaseUrl
      ? new URL(apiBaseUrl.replace(/\/$/, "") + endpoint)
      : new URL(endpoint, window.location.origin);

    fullUrl.searchParams.set("type", challengeType);
    fullUrl.searchParams.set("user_email", userEmail);

    try {
      const response = await fetch(fullUrl.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      // Be more forgiving - if we got an array or have challenges property, use it
      const challenges = Array.isArray(data) ? data : (data.challenges || []);
      
      return {
        success: challenges.length > 0 || data.challenges !== undefined,
        challenges: challenges
      };

    } catch (error) {
      console.warn(`Could not fetch ${challengeType} challenges:`, error);
      return {
        success: false,
        challenges: [],
        error
      };
    }
  }

  // FETCH USER COURSES
  async function fetchUserCoursesFromServer(userEmail) {
    if (!userEmail) {
      console.log("No email provided to fetchUserCoursesFromServer");
      dashboardState.userCourses = [];
      return [];
    }

    try {
      const endpoint = ENDPOINTS.courses?.list || "/api/courses/user";
      console.log("Fetching user courses from:", endpoint);
      const data = await apiGet(endpoint, { user_email: userEmail });
      console.log("Got user courses response:", data);

      // Extract courses array
      const courses = Array.isArray(data) ? data : (data.courses || data.userCourses || []);
      
      if (courses.length > 0) {
        dashboardState.userCourses = courses;
        console.log("Stored user courses:", dashboardState.userCourses);
        return courses;
      } else {
        dashboardState.userCourses = [];
        return [];
      }

    } catch (error) {
      console.warn("Could not fetch user courses:", error);
      dashboardState.userCourses = [];
      return [];
    }
  }

  // RECORD LOGIN

  // Record that user logged in today (for streaks)
  function recordLoginToday(userEmail) {
    if (typeof window.recordLoginDay === "function") {
      window.recordLoginDay(userEmail);
    }
  }

  // UI SETUP FUNCTIONS

  // Setup brand logo routing to dashboard or home
  function setupBrandRouting() {
    const user = getCurrentUser();
    const targetPage = user?.email ? "dashboard.html" : "index.html";

    const topBrand = getById("topBrand");
    const sideBrand = getById("sideBrand");

    if (topBrand) topBrand.setAttribute("href", targetPage);
    if (sideBrand) sideBrand.setAttribute("href", targetPage);
  }

  // Setup sidebar open/close buttons
  function setupSidebar() {
    const openButton = getById("openSidebarBtn");
    const closeButton = getById("closeSidebarBtn");
    const sidebar = getById("slideSidebar");
    const backdrop = getById("sideBackdrop");

    if (!sidebar) {
      console.warn("Sidebar elements not found in DOM");
      return;
    }

    const openSidebar = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("net-noscroll");
    };

    const closeSidebar = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("net-noscroll");
    };

    if (openButton) openButton.addEventListener("click", openSidebar);
    if (closeButton) closeButton.addEventListener("click", closeSidebar);
    if (backdrop) backdrop.addEventListener("click", closeSidebar);

    // Close on Escape key
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sidebar?.classList.contains("is-open")) {
        closeSidebar();
      }
    });
  }

  // Setup user dropdown menu
  function setupUserDropdown() {
    const button = getById("userBtn");
    const dropdown = getById("userDropdown");
    if (!button || !dropdown) {
      console.warn("User dropdown elements not found in DOM");
      return;
    }

    const closeDropdown = () => {
      dropdown.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    };

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = dropdown.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });

    // Close when clicking outside
    document.addEventListener("click", (event) => {
      if (!dropdown.contains(event.target) && !button.contains(event.target)) {
        closeDropdown();
      }
    });

    // Close on Escape
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDropdown();
    });
  }

  // Setup logout buttons
  function setupLogoutButtons() {
    const topLogoutButton = getById("topLogoutBtn");
    const sideLogoutButton = getById("sideLogoutBtn");

    const logout = () => {
      localStorage.removeItem("netology_user");
      localStorage.removeItem("user");
      localStorage.removeItem("netology_token");
      window.location.href = "index.html";
    };

    if (topLogoutButton) topLogoutButton.addEventListener("click", logout);
    if (sideLogoutButton) sideLogoutButton.addEventListener("click", logout);
  }

  // Setup challenge type toggle (daily vs weekly)
  function setupChallengeToggle() {
    const buttons = Array.from(document.querySelectorAll(".dash-toggle-btn[data-panel]"));
    if (!buttons.length) {
      console.warn("Challenge toggle buttons not found in DOM");
      return;
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        // Deactivate all buttons
        buttons.forEach((otherButton) => otherButton.classList.remove("is-active"));
        
        // Activate clicked button
        button.classList.add("is-active");

        // Get the panel to show
        const panelIdToShow = button.getAttribute("data-panel");

        // Hide/show panels
        buttons.forEach((panelButton) => {
          const panelId = panelButton.getAttribute("data-panel");
          if (!panelId) return;

          const panel = getById(panelId);
          if (!panel) return;

          if (panelId === panelIdToShow) {
            panel.hidden = false;
            requestAnimationFrame(() => panel.classList.add("is-active"));
          } else {
            panel.classList.remove("is-active");
            window.setTimeout(() => {
              panel.hidden = true;
            }, 200);
          }
        });
      });
    });
  }

  // Setup stats carousel rotation
  function setupStatsCarousel() {
    const track = getById("statsTrack");
    const indicators = getById("statsIndicators");
    if (!track || !indicators) {
      console.warn("Stats carousel elements not found in DOM");
      return;
    }

    const slides = Array.from(track.querySelectorAll(".net-carousel-slide"));
    const dots = Array.from(indicators.querySelectorAll(".net-indicator"));

    if (!slides.length || dots.length !== slides.length) return;

    let currentSlideIndex = 0;

    const showSlide = (slideIndex) => {
      currentSlideIndex = (slideIndex + slides.length) % slides.length;
      
      // Update slides
      slides.forEach((slide, index) => {
        slide.classList.toggle("is-active", index === currentSlideIndex);
      });
      
      // Update dots
      dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === currentSlideIndex);
      });
    };

    // Wire dot clicks
    dots.forEach((dot, index) => {
      dot.addEventListener("click", (event) => {
        event.stopPropagation();
        showSlide(index);
        restartCarouselTimer();
      });
    });

    // Auto-advance every 8 seconds
    const restartCarouselTimer = () => {
      if (dashboardState.statsCarouselTimer) {
        clearInterval(dashboardState.statsCarouselTimer);
      }
      dashboardState.statsCarouselTimer = setInterval(() => {
        showSlide(currentSlideIndex + 1);
      }, 8000);
    };

    showSlide(0);
    restartCarouselTimer();
  }

  // Setup daily tip rotation
  function setupDailyTipRotation() {
    const tipElement = getById("dailyTip");
    if (!tipElement) return;

    // Show a random tip based on the day of year
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const randomTip = DAILY_NETWORKING_TIPS[dayOfYear % DAILY_NETWORKING_TIPS.length];
    
    tipElement.textContent = randomTip;
  }

  // Setup challenge retry button
  function setupChallengeRetryButton() {
    const retryButton = getById("challengesRetryBtn");
    if (!retryButton || retryButton.dataset.bound === "true") return;

    retryButton.dataset.bound = "true";
    const originalHtml = retryButton.innerHTML;

    retryButton.addEventListener("click", async () => {
      const user = getCurrentUser();
      if (!user?.email) return;

      retryButton.disabled = true;
      
      // Show loading state
      const spinner = document.createElement("span");
      spinner.className = "spinner-border spinner-border-sm me-2";
      retryButton.innerHTML = "";
      retryButton.appendChild(spinner);
      const loadingText = document.createElement("span");
      loadingText.textContent = "Retrying";
      retryButton.appendChild(loadingText);

      await loadChallengesFromServer(user.email, { forceRefresh: true });

      retryButton.disabled = false;
      retryButton.innerHTML = originalHtml;
    });
  }

  // Initialize Bootstrap tooltips
  function initializeBootstrapTooltips(scope = document) {
    if (!window.bootstrap?.Tooltip) return;

    const elements = scope.querySelectorAll('[data-bs-toggle="tooltip"]');
    elements.forEach((element) => {
      const existing = window.bootstrap.Tooltip.getInstance(element);
      if (existing) existing.dispose();
      new window.bootstrap.Tooltip(element);
    });
  }

  // ONBOARDING

  // Prepare first-time user for onboarding
  function prepareFirstTimeUser(user) {
    if (!user?.email || !user?.is_first_login) return;

    const email = String(user.email || "").trim().toLowerCase();
    const savedOnboardingUser = String(localStorage.getItem("netology_onboarding_user") || "").trim().toLowerCase();

    const hasAlreadyOnboarded = Boolean(user.onboarding_completed)
      || localStorage.getItem(`netology_onboarding_completed_${email}`) === "true"
      || localStorage.getItem(`netology_onboarding_skipped_${email}`) === "true";

    if (hasAlreadyOnboarded) return;

    // Set up onboarding session
    if (!savedOnboardingUser || savedOnboardingUser !== email) {
      localStorage.setItem("netology_onboarding_user", email);
      localStorage.setItem("netology_onboarding_stage", "dashboard");
    }

    try {
      sessionStorage.setItem("netology_onboarding_session", "true");
    } catch {
      // Ignore storage errors
    }
  }

  // Start onboarding tour if conditions are met
  function maybeStartOnboardingTour(user) {
    if (!user?.email) return;
    if (typeof window.maybeStartOnboardingTour !== "function") return;

    window.maybeStartOnboardingTour("dashboard", user.email);
  }

  // AUTO-REFRESH ON VISIBILITY

  // Setup auto-refresh when user returns to page
  function setupAutoRefresh() {
    if (dashboardState.autoRefreshBound) return;
    dashboardState.autoRefreshBound = true;

    // Refresh when window gets focus
    window.addEventListener("focus", scheduleRefresh);

    // Refresh when tab becomes visible
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) scheduleRefresh();
    });

    // Refresh when user data changes in another tab
    window.addEventListener("storage", (event) => {
      if (event.key === "user" || (event.key && event.key.startsWith("netology_"))) {
        scheduleRefresh();
      }
    });
  }

  // Schedule a refresh with debounce
  function scheduleRefresh() {
    if (document.hidden) return;

    if (dashboardState.refreshTimer) {
      clearTimeout(dashboardState.refreshTimer);
    }

    dashboardState.refreshTimer = window.setTimeout(() => {
      refreshDashboard();
    }, REFRESH_DEBOUNCE_MILLISECONDS);
  }

  // Do a full dashboard refresh
  async function refreshDashboard() {
    const user = await refreshUserFromServer();

    if (user?.email) {
      try {
        await Promise.all([
          fetchProgressFromServer(user.email),
          fetchAchievementsFromServer(user.email),
          loadChallengesFromServer(user.email),
          fetchUserCoursesFromServer(user.email)
        ]);
      } catch (error) {
        console.warn("Error during refresh:", error);
      }
    }

    window.dashboardRender?.fillUserChrome(user);
    window.dashboardRender?.renderProgressWidgets(user);
    window.dashboardRender?.renderAchievements();
    await window.dashboardRender?.renderContinueLearning(user);
  }

  // Record login on dashboard initialization (uses app.js global function)
  function initializeLoginDay() {
    const user = getCurrentUser();
    if (user?.email && typeof window.recordLoginDay === "function") {
      window.recordLoginDay(user.email);
    }
  }

  // Fallback rendering functions if dashboardRender not available
  function ensureRenderingFunctions() {
    if (!window.dashboardRender) {
      window.dashboardRender = {
        fillUserChrome: (user) => {
          // Update user info in sidebar and top nav
          if (user?.first_name) {
            // Sidebar user name
            const sideName = document.getElementById("sideUserName");
            if (sideName) sideName.textContent = user.first_name;
            
            // Dropdown user name
            const ddName = document.getElementById("ddName");
            if (ddName) ddName.textContent = user.first_name;
          }
          
          if (user?.email) {
            // Sidebar user email
            const sideEmail = document.getElementById("sideUserEmail");
            if (sideEmail) sideEmail.textContent = user.email;
            
            // Dropdown user email
            const ddEmail = document.getElementById("ddEmail");
            if (ddEmail) ddEmail.textContent = user.email;
          }
          
          if (user?.numeric_level || user?.level) {
            // Get numeric level, not text level
            const numericLevel = user.numeric_level || (user.level && !isNaN(parseInt(user.level)) ? parseInt(user.level) : 1);
            
            // Sidebar level badge
            const levelBadge = document.getElementById("sideLevelBadge");
            if (levelBadge) levelBadge.textContent = `Lv ${numericLevel}`;
            
            // Dropdown level
            const ddLevel = document.getElementById("ddLevel");
            if (ddLevel) ddLevel.textContent = numericLevel;
          }
          
          if (user?.rank) {
            // Dropdown rank
            const ddRank = document.getElementById("ddRank");
            if (ddRank) ddRank.textContent = user.rank;
          }
        },
        
        renderProgressWidgets: (user) => {
          // This is called but actual progress rendering happens in renderStatsCarousel
          // since progress data comes from fetchProgressFromServer, not user object
          renderStatsCarousel();
          renderRankAndLevel();
          renderStreakCalendar();
        },
        
        renderContinueLearning: async (user) => {
          const continueBox = document.getElementById("continueBox");
          if (!continueBox) return;

          // Get in-progress courses from progress data or from user courses
          let courses = [];
          
          // Try to get from dashboard state first (from fetchProgressFromServer)
          if (dashboardState.userCourses && dashboardState.userCourses.length > 0) {
            courses = dashboardState.userCourses.filter(c => c.in_progress === true || c.status === 'in_progress');
          }

          if (courses.length === 0) {
            continueBox.innerHTML = "";
            continueBox.className = "small text-muted text-center p-3";
            continueBox.textContent = "No courses in progress. Start a new course!";
            return;
          }

          // Clear and render course cards
          continueBox.innerHTML = "";
          continueBox.className = "continue-learning-list";

          courses.forEach(course => {
            const progress = Math.round(((course.completed_lessons || 0) / (course.total_lessons || 1)) * 100) || 0;
            
            const card = document.createElement("div");
            card.className = "continue-item";

            // Title
            const titleDiv = document.createElement("div");
            titleDiv.className = "fw-semibold";
            titleDiv.textContent = course.name || course.title || "Course";
            card.appendChild(titleDiv);

            // Progress bar
            const progressContainer = document.createElement("div");
            progressContainer.className = "progress mt-2 mb-2";
            progressContainer.style.height = "0.5rem";

            const progressBar = document.createElement("div");
            progressBar.className = "progress-bar bg-success";
            progressBar.style.width = progress + "%";
            progressBar.setAttribute("role", "progressbar");
            progressContainer.appendChild(progressBar);
            card.appendChild(progressContainer);

            // Progress label
            const labelDiv = document.createElement("small");
            labelDiv.className = "text-muted";
            labelDiv.textContent = `${progress}% complete • ${course.completed_lessons || 0}/${course.total_lessons || 0} lessons`;
            card.appendChild(labelDiv);

            continueBox.appendChild(card);
          });
        },
        
        renderAchievements: () => {
          const scrollerEl = document.getElementById("achieveScroller");
          if (!scrollerEl) return;

          const catalog = dashboardState.achievementCatalog;
          if (!catalog || !catalog.all || catalog.all.length === 0) {
            scrollerEl.textContent = "No achievements yet";
            scrollerEl.classList.add("text-muted", "small");
            return;
          }

          // Clear existing
          scrollerEl.innerHTML = "";
          scrollerEl.classList.remove("text-muted", "small");

          // Show ALL achievements (unlocked first, then locked)
          const toShow = [
            ...(catalog.unlocked || []),
            ...(catalog.locked || [])
          ];

          toShow.forEach(achievement => {
            const badge = document.createElement("div");
            badge.className = `achievement-badge ${achievement.unlocked ? "unlocked" : "locked"}`;
            
            // Create tooltip content
            const tooltipText = `${achievement.name}: ${achievement.description}${achievement.xp_reward ? ` (+${achievement.xp_reward} XP)` : ''}`;
            badge.setAttribute("data-bs-toggle", "tooltip");
            badge.setAttribute("data-bs-placement", "top");
            badge.title = tooltipText;

            // Icon
            const icon = document.createElement("div");
            icon.className = "badge-icon";
            const iconElement = document.createElement("i");
            iconElement.className = `bi ${achievement.icon || "bi-star"}`;
            icon.appendChild(iconElement);
            badge.appendChild(icon);

            // Name (only show for unlocked to keep locked badges small)
            if (achievement.unlocked) {
              const name = document.createElement("div");
              name.className = "badge-name";
              name.textContent = achievement.name;
              badge.appendChild(name);
            }

            scrollerEl.appendChild(badge);
          });

          // Re-initialize tooltips for new badges
          const tooltips = scrollerEl.querySelectorAll('[data-bs-toggle="tooltip"]');
          tooltips.forEach(el => {
            new bootstrap.Tooltip(el);
          });
        },
        
        renderChallengeList: (el, challenges, type) => {
          if (!el) return;
          
          if (!challenges || challenges.length === 0) {
            el.innerHTML = "";
            el.className = "dash-tasklist small text-muted text-center p-2";
            el.textContent = "No challenges available";
            return;
          }

          // Clear and set up
          el.innerHTML = "";
          el.className = "dash-tasklist";

          challenges.forEach((challenge, index) => {
            const xpReward = challenge.xp_reward || 0;
            const isActive = challenge.active || index === 0;
            
            const item = document.createElement("div");
            item.className = `challenge-item ${isActive ? "is-active" : ""}`;

            // Left badge/indicator
            const leftBadge = document.createElement("div");
            leftBadge.className = "challenge-badge";
            if (isActive) {
              leftBadge.classList.add("bg-success");
              const badgeText = document.createElement("span");
              badgeText.className = "text-white small fw-bold";
              badgeText.textContent = "Active";
              leftBadge.appendChild(badgeText);
            } else {
              leftBadge.classList.add("bg-light", "text-secondary");
              const badgeText = document.createElement("span");
              badgeText.className = "small fw-bold";
              badgeText.textContent = "Next";
              leftBadge.appendChild(badgeText);
            }

            // Main content
            const content = document.createElement("div");
            content.className = "challenge-content";

            const nameDiv = document.createElement("div");
            nameDiv.className = "fw-semibold";
            nameDiv.textContent = challenge.title || challenge.name || "Challenge";
            content.appendChild(nameDiv);

            if (challenge.description) {
              const descDiv = document.createElement("small");
              descDiv.className = "text-muted";
              descDiv.textContent = challenge.description;
              content.appendChild(descDiv);
            }

            // Right XP reward
            const xpDiv = document.createElement("div");
            xpDiv.className = "challenge-xp";
            if (xpReward > 0) {
              const xpIcon = document.createElement("i");
              xpIcon.className = "bi bi-lightning-charge-fill text-warning me-1";
              xpDiv.appendChild(xpIcon);
              const xpText = document.createElement("span");
              xpText.className = "fw-bold text-warning";
              xpText.textContent = `+${xpReward}`;
              xpDiv.appendChild(xpText);
            }

            item.appendChild(leftBadge);
            item.appendChild(content);
            item.appendChild(xpDiv);
            el.appendChild(item);
          });
        }
      };
    }
  }

  // Helper: Render stats carousel with progress data
  function renderStatsCarousel() {
    const progress = dashboardState.progressSummary;
    if (!progress) return;

    // Update carousel slides with actual data
    const heroActive = document.getElementById("heroActive");
    if (heroActive) heroActive.textContent = progress.inProgress || 0;

    const statLessons = document.getElementById("statLessons");
    if (statLessons) statLessons.textContent = progress.lessonsDone || 0;

    const statQuizzes = document.getElementById("statQuizzes");
    if (statQuizzes) statQuizzes.textContent = progress.quizzesDone || 0;

    const statChallenges = document.getElementById("statChallenges");
    if (statChallenges) statChallenges.textContent = progress.challengesDone || 0;
  }

  // Helper: Render rank and level cards
  function renderRankAndLevel() {
    const user = getCurrentUser();
    if (!user) return;

    // Get numeric level (fallback to parsing text if needed)
    const numericLevel = user.numeric_level || (user.level && !isNaN(parseInt(user.level)) ? parseInt(user.level) : 1);

    // RANK box - show rank number and difficulty level
    const heroRank = document.getElementById("heroRank");
    if (heroRank) {
      heroRank.textContent = numericLevel;
    }

    const heroRankDifficulty = document.getElementById("heroRankDifficulty");
    if (heroRankDifficulty) {
      const difficulty = numericLevel >= 5 ? "Advanced" : (numericLevel >= 3 ? "Intermediate" : "Novice");
      heroRankDifficulty.textContent = difficulty;
    }

    // LEVEL box - show just level, XP will be shown in gauge
    const heroLevel = document.getElementById("heroLevel");
    if (heroLevel) {
      heroLevel.textContent = `Level ${numericLevel}`;
    }

    // Render XP arc gauge
    renderXpArcGauge();
  }

  // Helper: Create and render SVG arc gauge for XP progress
  function renderXpArcGauge() {
    const user = getCurrentUser();
    if (!user) return;

    const container = document.getElementById("heroXP");
    if (!container) return;

    const level = Number(user.numeric_level || user.level || 1);
    const currentXp = Number(user.xp || user.xp_current || 0);
    // Get next level XP from API or use 100 as fallback
    const nextLevelXp = Number(user.xp_for_next_level || user.next_level_xp || 100);
    const progress = Math.min(100, Math.max(0, nextLevelXp > 0 ? (currentXp / nextLevelXp) * 100 : 0));

    // Create SVG semi-circle arc gauge
    const width = 160;
    const height = 90;
    const centerX = width / 2;
    const centerY = 70;
    const radius = 50;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.style.cssText = "max-width: 160px; height: auto;";

    // Background semi-circle arc
    const bgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const bgD = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`;
    bgPath.setAttribute("d", bgD);
    bgPath.setAttribute("fill", "none");
    bgPath.setAttribute("stroke", "#e9ecef");
    bgPath.setAttribute("stroke-width", "6");
    bgPath.setAttribute("stroke-linecap", "round");
    svg.appendChild(bgPath);

    // Progress semi-circle arc (blue)
    const progressPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const endAngle = (Math.PI / 180) * (180 * (progress / 100));
    const endX = centerX + radius * Math.cos(Math.PI - endAngle);
    const endY = centerY - radius * Math.sin(Math.PI - endAngle);
    const largeArc = progress > 50 ? 1 : 0;
    const progressD = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
    
    progressPath.setAttribute("d", progressD);
    progressPath.setAttribute("fill", "none");
    progressPath.setAttribute("stroke", "#0d6efd");
    progressPath.setAttribute("stroke-width", "6");
    progressPath.setAttribute("stroke-linecap", "round");
    svg.appendChild(progressPath);

    // Level number in center
    const levelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    levelText.setAttribute("x", centerX);
    levelText.setAttribute("y", centerY - 12);
    levelText.setAttribute("text-anchor", "middle");
    levelText.setAttribute("font-size", "28");
    levelText.setAttribute("font-weight", "700");
    levelText.setAttribute("fill", "#212529");
    levelText.textContent = level;
    svg.appendChild(levelText);

    // XP progress text below level
    const xpLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    xpLabel.setAttribute("x", centerX);
    xpLabel.setAttribute("y", centerY + 10);
    xpLabel.setAttribute("text-anchor", "middle");
    xpLabel.setAttribute("font-size", "11");
    xpLabel.setAttribute("fill", "#6c757d");
    xpLabel.textContent = `${currentXp} / ${nextLevelXp} XP`;
    svg.appendChild(xpLabel);

    // Clear and insert
    container.innerHTML = "";
    container.classList.remove("visually-hidden");
    container.appendChild(svg);
  }

  // Helper: Render streak calendar (7 day activity)
  function renderStreakCalendar() {
    const user = getCurrentUser();
    if (!user) return;

    const calendarEl = document.getElementById("streakCalendar");
    if (!calendarEl) return;

    // Show last 7 days with proper day labels (S M T W T F S)
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date();
    
    // Clear existing
    calendarEl.innerHTML = "";

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayIndex = date.getDay();
      const dayLabel = dayLabels[dayIndex];
      
      const dayEl = document.createElement("div");
      dayEl.className = "streak-day";
      dayEl.title = date.toLocaleDateString();
      dayEl.textContent = dayLabel;
      calendarEl.appendChild(dayEl);
    }

    // Calculate and update streak count from local login log
    const streak = calculateCurrentStreak(user.email);
    const heroStreak = document.getElementById("heroStreak");
    if (heroStreak) {
      heroStreak.textContent = streak;
    }
  }

  // Calculate current streak from login log
  function calculateCurrentStreak(userEmail) {
    if (!userEmail || typeof window.readLoginLog !== "function") {
      return 0;
    }

    try {
      // Get login log (it's exposed from app.js if available)
      if (typeof window.getLoginLog === "function") {
        const loginLog = window.getLoginLog(userEmail);
        if (!loginLog || loginLog.length === 0) return 0;

        // Calculate streak by checking consecutive days backwards from today
        const today = new Date();
        let streak = 0;
        let currentDate = new Date(today);
        currentDate.setHours(0, 0, 0, 0);

        while (true) {
          const dateStr = dateToKey(currentDate);
          if (loginLog.includes(dateStr)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        }

        return streak;
      }

      // Fallback: use backend data
      return dashboardState.progressSummary?.loginStreak || 0;
    } catch (error) {
      console.warn("Could not calculate streak:", error);
      return dashboardState.progressSummary?.loginStreak || 0;
    }
  }

  // Helper to format date as YYYY-MM-DD
  function dateToKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // START THE APP

  // Initialize dashboard when page is ready
  onDOMReady(() => {
    ensureRenderingFunctions();
    initializeLoginDay();
    initializeDashboard();
  });
})();
