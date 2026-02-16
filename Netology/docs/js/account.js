/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/02/2026

account.js – Account settings, preferences, security, and activity tracking.
Features:
- Profile information display
- Learning statistics
- Preferences management (notifications, privacy)
- Security settings (password, sessions, account deletion)
- Activity heatmap and session history
*/

(() => {
  "use strict";

  const getApiBase = () => window.API_BASE || "";
  const BASE_XP = 100;
  const apiGet = window.apiGet || (async (path, params = {}) => {
    const base = getApiBase().trim();
    const url = base ? new URL(base.replace(/\/$/, "") + path) : new URL(path, window.location.origin);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
    const res = await fetch(url.toString());
    return res.json();
  });
  const listFrom = window.API_HELPERS?.list || ((data, ...keys) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  });
  const ENDPOINTS = window.ENDPOINTS || {};

  /* Initialization */
  document.addEventListener("DOMContentLoaded", () => {
    initAccountPage();
  });

  async function initAccountPage() {
    const user = getCurrentUser();
    if (!user?.email) {
      window.location.href = "login.html";
      return;
    }

    wireChrome(user);
    wireTabNavigation();
    wirePreferencesSave();
    initAppearanceControls();
    wireSecurityActions();

    await loadProfileData(user);
    await loadLearningStats(user);
    await loadActivityData(user);

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    if (typeof window.maybeStartOnboardingTour === "function") {
      window.maybeStartOnboardingTour("account", user.email);
    }
  }

  /* Appearance (theme + dyslexic font) */
  function initAppearanceControls() {
    const themeSelect = document.getElementById('themeSelect');
    const dyslexicToggle = document.getElementById('dyslexicToggle');

    if (themeSelect) {
      const savedTheme = localStorage.getItem('netology_theme') || 'light';
      themeSelect.value = savedTheme;
      themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value || 'light';
        if (window.NetologyTheme?.setTheme) {
          window.NetologyTheme.setTheme(theme);
        } else {
          localStorage.setItem('netology_theme', theme);
          document.body?.setAttribute('data-theme', theme);
        }
      });
    }

    if (dyslexicToggle) {
      const enabled = localStorage.getItem('netology_dyslexic') === 'true';
      dyslexicToggle.checked = enabled;
      dyslexicToggle.addEventListener('change', (e) => {
        const on = e.target.checked;
        if (window.NetologyTheme?.setDyslexic) {
          window.NetologyTheme.setDyslexic(on);
        } else {
          localStorage.setItem('netology_dyslexic', on ? 'true' : 'false');
          document.body?.classList.toggle('net-dyslexic', on);
        }
      });
    }
  }

  /* ── Chrome: sidebar, dropdown, identity ── */
  function wireChrome(user) {
    wireSidebar();
    wireUserDropdown();
    fillIdentity(user);

    const doLogout = () => {
      localStorage.removeItem('netology_user');
      localStorage.removeItem('user');
      localStorage.removeItem('netology_token');
      window.location.href = 'index.html';
    };
    const topLogout = document.getElementById('topLogoutBtn');
    const sideLogout = document.getElementById('sideLogoutBtn');
    if (topLogout) topLogout.addEventListener('click', doLogout);
    if (sideLogout) sideLogout.addEventListener('click', doLogout);
  }

  function wireSidebar() {
    const openBtn = document.getElementById('openSidebarBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('slideSidebar');
    const backdrop = document.getElementById('sideBackdrop');

    const open = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.add('is-open');
      backdrop.classList.add('is-open');
      document.body.classList.add('net-noscroll');
      sidebar.setAttribute('aria-hidden', 'false');
      backdrop.setAttribute('aria-hidden', 'false');
    };
    const close = () => {
      if (!sidebar || !backdrop) return;
      sidebar.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      document.body.classList.remove('net-noscroll');
      sidebar.setAttribute('aria-hidden', 'true');
      backdrop.setAttribute('aria-hidden', 'true');
    };

    if (openBtn) openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (backdrop) backdrop.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar?.classList.contains('is-open')) close();
    });
  }

  function wireUserDropdown() {
    const btn = document.getElementById('userBtn');
    const dd = document.getElementById('userDropdown');
    if (!btn || !dd) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dd.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', (e) => {
      if (!dd.contains(e.target) && !btn.contains(e.target)) {
        dd.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function fillIdentity(user) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Student';
    const email = user.email || '';
    const initial = (name.charAt(0) || 'S').toUpperCase();
    const xp = Number(user.xp || 0);
    const level = levelFromXP(xp);
    const rank = rankForLevel(level);

    // Top nav
    updateElement('topAvatar', initial);
    updateElement('ddAvatar', initial);
    updateElement('ddName', name);
    updateElement('ddEmail', email);
    updateElement('ddLevel', `Level ${level}`);
    updateElement('ddRank', rank);

    // Sidebar
    updateElement('sideAvatar', initial);
    updateElement('sideUserName', name);
    updateElement('sideUserEmail', email);
    updateElement('sideLevelBadge', `Lv ${level}`);

    // Profile hero
    updateElement('profileAvatar', initial);
  }

  /* ── Tab Navigation ── */
  function wireTabNavigation() {
    const tabButtons = document.querySelectorAll('[role="tab"]');
    const tabPanes = document.querySelectorAll('.account-tab');

    const switchTo = (tabName) => {
      tabButtons.forEach(b => {
        const isActive = b.dataset.tab === tabName;
        b.classList.toggle('btn-teal', isActive);
        b.classList.toggle('btn-outline-teal', !isActive);
        b.setAttribute('aria-selected', String(isActive));
      });
      tabPanes.forEach(pane => {
        if (pane.dataset.tab === tabName) {
          pane.classList.remove('d-none');
          pane.style.animation = 'none';
          pane.offsetHeight; // reflow
          pane.style.animation = '';
        } else {
          pane.classList.add('d-none');
        }
      });
      // Update URL hash without scrolling
      history.replaceState(null, '', `#${tabName}`);
    };

    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTo(btn.dataset.tab);
      });
    });

    // Handle initial hash (e.g. account.html#preferences)
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['profile', 'preferences', 'security', 'activity'];
    if (hash && validTabs.includes(hash)) {
      switchTo(hash);
    }

    // Handle hash changes (browser back/forward)
    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '');
      if (h && validTabs.includes(h)) switchTo(h);
    });
  }

  /* Load Profile Data */
  async function loadProfileData(user) {
    try {
      // Fetch user details
      const userData = await apiGet(ENDPOINTS.auth?.userInfo || "/user-info", { email: user.email });

      // Calculate level and rank from XP
      const totalXp = Number(userData.xp || 0);
      const level = Number.isFinite(Number(userData.numeric_level))
        ? Number(userData.numeric_level)
        : levelFromXP(totalXp);
      const rank = userData.rank || rankForLevel(level);
      const currentLevelXp = Number.isFinite(Number(userData.xp_into_level))
        ? Number(userData.xp_into_level)
        : totalXp - totalXpForLevel(level);
      const nextLevelXp = Number.isFinite(Number(userData.next_level_xp))
        ? Number(userData.next_level_xp)
        : xpForNextLevel(level);
      const progressPct = Math.round((currentLevelXp / nextLevelXp) * 100);
      const displayName = [userData.first_name, userData.last_name].filter(Boolean).join(" ") || "Student";

      // Update profile section
      updateElement('profileName', escapeHtml(displayName));
      updateElement('profileEmail', escapeHtml(user.email));
      updateElement('fullNameInput', escapeHtml(displayName));
      updateElement('emailInput', user.email);
      updateElement('currentLevelInput', level);
      updateElement('currentRankInput', rank);
      updateElement('rankBadge', rank);
      updateElement('levelBadge', `Level ${level}`);

      // Format joined date
      const joinedDate = userData.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recently';
      updateElement('joinedDate', joinedDate);
      updateElement('memberSinceInput', joinedDate);

      // Update rank display
      updateElement('rankDisplayLarge', level);
      updateElement('rankNameDisplay', rank);
      updateElement('levelProgressBar', progressPct);
      updateElement('levelProgressText', `${currentLevelXp} / ${nextLevelXp} XP`);

      // Update learning stats
      updateElement('totalXpDisplay', totalXp.toLocaleString());
      updateElement('totalXpStat', totalXp.toLocaleString());
      
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  }

  /* Load Learning Statistics */
  async function loadLearningStats(user) {
    try {
      // Fetch progress
      const coursesData = await apiGet(ENDPOINTS.courses?.userCourses || "/user-courses", { email: user.email });
      const courses = listFrom(coursesData, "courses");

      const completedCourses = courses.filter(c => {
        const status = (c.status || '').toLowerCase();
        const pct = Number.isFinite(Number(c.progress_pct)) ? Number(c.progress_pct) : 0;
        return status === 'completed' || pct >= 100;
      }).length;
      updateElement('coursesCompletedDisplay', completedCourses);
      updateElement('coursesCompletedStat', completedCourses);

      // Fetch achievements
      const achievementsData = await apiGet(ENDPOINTS.achievements?.list || "/api/user/achievements", { user_email: user.email });
      const unlocked = listFrom(achievementsData, "unlocked");
      const unlockedCount = unlocked.length;
      updateElement('achievementsDisplay', unlockedCount);
      updateElement('achievementsStat', unlockedCount);

      // Fetch streaks
      const streakData = await apiGet(ENDPOINTS.progress?.userStreaks || "/api/user/streaks", { user_email: user.email });
      updateElement('streakDisplay', `${streakData.current_streak || 0} days`);
      updateElement('streakStat', streakData.current_streak || 0);

      // Recent badges for profile sidebar
      if (unlocked.length > 0) {
        const recentBadges = unlocked.slice(0, 3);
        const badgesHtml = recentBadges.map(b => `<span title="${escapeHtml(b.name)}" style="font-size: 1.2rem; cursor: help;">${b.icon || '⭐'}</span>`).join('');
        document.getElementById('recentBadgesSmall').innerHTML = badgesHtml || '<span class="text-muted small">No badges yet</span>';
      }

    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }

  /* Load Activity Data */
  async function loadActivityData(user) {
    try {
      // Fetch activity for heatmap
      const activityPayload = await apiGet(ENDPOINTS.progress?.userActivity || "/api/user/activity", {
        user_email: user.email,
        range: 90
      });
      const activityData = listFrom(activityPayload, "activity");

      if (activityData && Array.isArray(activityData)) {
        renderActivityHeatmap(activityData);
      }

      // Update last active
      const lastActive = activityData && activityData.length > 0 ? activityData[activityData.length - 1].date : null;
      if (lastActive) {
        updateElement('lastActiveText', new Date(lastActive).toLocaleDateString());
      }

    } catch (err) {
      console.error('Error loading activity:', err);
    }
  }

  /* Render Activity Heatmap */
  function renderActivityHeatmap(activityData) {
    const container = document.getElementById('activityHeatmapContainer');
    if (!container) return;

    container.innerHTML = '';

    const dataMap = {};
    activityData.forEach(item => {
      const date = item.date || item.activity_date;
      const count = item.count || item.activity_count || item.logins || item.lessons || 0;
      if (date) dataMap[date] = Math.min(count, 4);
    });

    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const level = dataMap[dateStr] || 0;

      const cell = document.createElement('div');
      cell.className = `activity-cell level-${level}`;
      cell.title = `${dateStr}: ${level} activities`;
      container.appendChild(cell);
    }
  }

  /* Wire Preferences Save */
  async function wirePreferencesSave() {
    const prefs = [
      'notifWeekly', 'notifStreak', 'notifNewCourses', 'notifAchievements',
      'privacyProfile', 'privacyStats', 'privacyActivity'
    ];

    // Try to load preferences from the API first, fall back to localStorage
    const user = getCurrentUser();
    let serverPrefs = null;
    try {
      const prefsEndpoint = ENDPOINTS.preferences?.get || "/api/user/preferences";
      serverPrefs = await apiGet(prefsEndpoint, { user_email: user?.email });
    } catch (err) {
      console.warn('Could not load preferences from server, using localStorage:', err);
    }

    prefs.forEach(pref => {
      const el = document.getElementById(pref);
      if (!el) return;

      // Server prefs take priority, then localStorage, then HTML default
      if (serverPrefs && serverPrefs[pref] !== undefined && serverPrefs[pref] !== null) {
        el.checked = serverPrefs[pref] === true || serverPrefs[pref] === 'true';
        localStorage.setItem(`netology_pref_${pref}`, el.checked);
      } else {
        const saved = localStorage.getItem(`netology_pref_${pref}`);
        if (saved !== null) {
          el.checked = saved === 'true';
        }
      }

      // Save on change
      el.addEventListener('change', (e) => {
        localStorage.setItem(`netology_pref_${pref}`, e.target.checked);
        try {
          const API_BASE = getApiBase();
          const prefsEndpoint = ENDPOINTS.preferences?.update || "/api/user/preferences";
          fetch(`${API_BASE}${prefsEndpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_email: user?.email,
              [pref]: e.target.checked
            })
          }).catch(err => console.error('Preference save error:', err));
        } catch (err) {
          console.error('Preference update failed:', err);
        }
      });
    });
  }

  /* Wire Security Actions */
  function wireSecurityActions() {
    const logoutAllBtn = document.getElementById('logoutAllBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutAllBtn) {
      logoutAllBtn.addEventListener('click', () => {
        if (confirm('Log out from all devices? You will be signed out of this session.')) {
          try {
            const API_BASE = getApiBase();
            const logoutPath = ENDPOINTS.auth?.logout || "/logout";
            fetch(`${API_BASE}${logoutPath}`, { method: 'GET' }).finally(() => {
              localStorage.removeItem('netology_user');
              window.location.href = 'login.html';
            });
          } catch (err) {
            console.error('Logout error:', err);
          }
        }
      });
    }

    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener('click', () => {
        if (confirm('Are you sure? This action cannot be undone.\n\nType "DELETE" to confirm.')) {
          const confirmation = prompt('Type DELETE to confirm account deletion:');
          if (confirmation === 'DELETE') {
            try {
              alert('Account deletion is not enabled in this deployment. Logging you out instead.');
              localStorage.removeItem('netology_user');
              window.location.href = 'index.html';
            } catch (err) {
              console.error('Delete error:', err);
            }
          }
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        try {
          const API_BASE = getApiBase();
          const logoutPath = ENDPOINTS.auth?.logout || "/logout";
          fetch(`${API_BASE}${logoutPath}`, { method: 'GET' }).finally(() => {
            localStorage.removeItem('netology_user');
            window.location.href = 'login.html';
          });
        } catch (err) {
          console.error('Logout error:', err);
          localStorage.removeItem('netology_user');
          window.location.href = 'login.html';
        }
      });
    }
  }

  /* XP & Level Helpers */
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

  function xpForNextLevel(level) {
    const lvl = Math.max(1, Number(level) || 1);
    return BASE_XP * lvl;
  }

  function rankForLevel(level) {
    const lvl = Number(level) || 1;
    if (lvl >= 5) return 'Advanced';
    if (lvl >= 3) return 'Intermediate';
    return 'Novice';
  }

  /* Utility: Get current user */
  function getCurrentUser() {
    try {
      const stored = localStorage.getItem('netology_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Error getting user:', e);
      return null;
    }
  }

  /* Utility: HTML escape */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* Utility: Update element */
  function updateElement(id, value) {
    const el = document.getElementById(id);
    if (!el) return;

    // Progress bars need style.width
    if (el.classList.contains('progress-bar')) {
      el.style.width = `${Math.min(100, Math.max(0, Number(value) || 0))}%`;
      return;
    }
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = value;
    } else {
      el.textContent = value;
    }
  }

})();
