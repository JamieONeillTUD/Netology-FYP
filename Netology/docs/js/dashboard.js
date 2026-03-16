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

    // STEP 2: Display cached user data while we fetch fresh data
    console.log("Step 2: Displaying cached user...");
    const cachedUser = getCurrentUser();
    if (cachedUser) {
      // These functions are in dashboard-render.js
      window.dashboardRender?.fillUserChrome(cachedUser);
      window.dashboardRender?.renderProgressWidgets(cachedUser);
    }
    await window.dashboardRender?.renderContinueLearning(cachedUser);

    // STEP 3: Fetch fresh user data from API
    console.log("Step 3: Fetching fresh user data...");
    const freshUser = await refreshUserFromServer();

    // STEP 4: Load user progress, achievements, challenges
    console.log("Step 4: Fetching user progress...");
    if (freshUser?.email) {
      // Record today's login for streaks
      recordLoginToday(freshUser.email);

      // Fetch all three in parallel
      await Promise.all([
        fetchProgressFromServer(freshUser.email),
        fetchAchievementsFromServer(freshUser.email, { forceRefresh: true }),
        loadChallengesFromServer(freshUser.email, { forceRefresh: true })
      ]);
    } else {
      // Guest user - clear cached data
      dashboardState.progressSummary = null;
      dashboardState.achievementCatalog = { all: [], unlocked: [], locked: [] };
      dashboardState.challenges = { daily: [], weekly: [] };
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
        numeric_level: Number.isFinite(Number(data.numeric_level)) ? Number(data.numeric_level) : cachedUser?.numeric_level,
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
          level: Number(data.level || 1)
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
      }
      if (weeklyResult.success) {
        dashboardState.challenges.weekly = weeklyResult.challenges || [];
      }

      // Update timestamp
      dashboardState.challengesFetchedAtTime = Date.now();

      // Render both types
      window.dashboardRender?.renderChallengeList(getById("dailyTasks"), dashboardState.challenges.daily, "daily");
      window.dashboardRender?.renderChallengeList(getById("weeklyTasks"), dashboardState.challenges.weekly, "weekly");

    } catch (error) {
      console.warn("Could not load challenges:", error);
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
    if (!button || !dropdown) return;

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
    if (!buttons.length) return;

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
    if (!track || !indicators) return;

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
      retryButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Retrying';

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
      await Promise.all([
        fetchProgressFromServer(user.email),
        fetchAchievementsFromServer(user.email),
        loadChallengesFromServer(user.email)
      ]);
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
          if (user?.first_name) {
            const nameEl = document.querySelector('[data-role="user-name"]');
            if (nameEl) nameEl.textContent = user.first_name;
          }
        },
        renderProgressWidgets: (user) => {
          // Basic progress display
          if (user?.level) {
            const levelEl = document.querySelector('[data-role="user-level"]');
            if (levelEl) levelEl.textContent = user.level || 'Level 1';
          }
        },
        renderContinueLearning: async (user) => {
          // Async rendering - can be empty if data loads separately
        },
        renderAchievements: () => {
          // Render achievements from dashboardState.achievementCatalog
          const scrollerEl = document.getElementById("achieveScroller");
          if (!scrollerEl) return;

          const catalog = dashboardState.achievementCatalog;
          if (!catalog || !catalog.all || catalog.all.length === 0) {
            scrollerEl.innerHTML = '<div class="small text-muted">No achievements yet. Start learning!</div>';
            return;
          }

          // Show unlocked first (if any), then first few locked
          const toShow = [
            ...(catalog.unlocked || []).slice(0, 3),
            ...(catalog.locked || []).slice(0, 3)
          ];

          const html = toShow.map(achievement => `
            <div class="achievement-badge ${achievement.unlocked ? 'unlocked' : 'locked'}" 
                 title="${achievement.name}: ${achievement.description}">
              <div class="badge-icon">
                <i class="bi ${achievement.icon}"></i>
              </div>
              <div class="badge-info">
                <div class="badge-name">${achievement.name}</div>
                <div class="badge-xp">+${achievement.xp_reward} XP</div>
              </div>
            </div>
          `).join('');

          scrollerEl.innerHTML = html || '<div class="small text-muted">No achievements yet.</div>';
        },
        renderChallengeList: (el, challenges, type) => {
          if (!el) return;
          
          if (!challenges || challenges.length === 0) {
            el.innerHTML = '<div class="small text-muted">No challenges available.</div>';
            return;
          }

          const html = challenges.map(challenge => `
            <div class="challenge-item mb-2 pb-2 border-bottom">
              <div class="d-flex align-items-start">
                <div class="flex-grow-1">
                  <div class="fw-semibold">${challenge.title || challenge.name || 'Challenge'}</div>
                  <div class="small text-muted">${challenge.description || ''}</div>
                  ${challenge.xp_reward ? `<div class="small text-warning"><i class="bi bi-gem me-1"></i>${challenge.xp_reward} XP</div>` : ''}
                </div>
              </div>
            </div>
          `).join('');

          el.innerHTML = html || '<div class="small text-muted">No challenges available.</div>';
        }
      };
    }
  }

  // START THE APP

  // Initialize dashboard when page is ready
  onDOMReady(() => {
    ensureRenderingFunctions();
    initializeLoginDay();
    initializeDashboard();
  });
})();
