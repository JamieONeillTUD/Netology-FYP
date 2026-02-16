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
    wireSecurityActions();

    await loadProfileData(user);
    await loadLearningStats(user);
    await loadActivityData(user);

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");
  }

  /* Tab Navigation */
  function wireTabNavigation() {
    const tabButtons = document.querySelectorAll('[role="tab"]');
    const tabPanes = document.querySelectorAll('.account-tab');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = btn.dataset.tab;

        // Update buttons
        tabButtons.forEach(b => {
          b.classList.remove('btn-teal');
          b.classList.add('btn-outline-teal');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.remove('btn-outline-teal');
        btn.classList.add('btn-teal');
        btn.setAttribute('aria-selected', 'true');

        // Update panes
        tabPanes.forEach(pane => {
          if (pane.dataset.tab === tabName) {
            pane.classList.remove('d-none');
          } else {
            pane.classList.add('d-none');
          }
        });
      });
    });
  }

  /* Load Profile Data */
  async function loadProfileData(user) {
    try {
      const API_BASE = getApiBase();
      
      // Fetch user details
      const response = await fetch(`${API_BASE}/api/user?user_email=${encodeURIComponent(user.email)}`);
      const userData = await response.json();

      // Calculate level and rank from XP
      const totalXp = userData.xp || 0;
      const level = levelFromXP(totalXp);
      const rank = rankForLevel(level);
      const currentLevelXp = totalXp - totalXpForLevel(level);
      const nextLevelXp = xpForNextLevel(level);
      const progressPct = Math.round((currentLevelXp / nextLevelXp) * 100);

      // Update profile section
      updateElement('profileName', escapeHtml(userData.name || 'Student'));
      updateElement('profileEmail', escapeHtml(user.email));
      updateElement('fullNameInput', escapeHtml(userData.name || 'Student'));
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
      const API_BASE = getApiBase();

      // Fetch progress
      const progressResponse = await fetch(`${API_BASE}/api/user/progress?user_email=${encodeURIComponent(user.email)}`);
      const courses = await progressResponse.json();

      const completedCourses = courses.filter(c => c.completed).length;
      updateElement('coursesCompletedDisplay', completedCourses);
      updateElement('coursesCompletedStat', completedCourses);

      // Fetch achievements
      const achievementsResponse = await fetch(`${API_BASE}/api/user/achievements?user_email=${encodeURIComponent(user.email)}`);
      const achievements = await achievementsResponse.json();
      const unlockedCount = achievements.filter(a => a.unlocked).length;
      updateElement('achievementsDisplay', unlockedCount);
      updateElement('achievementsStat', unlockedCount);

      // Fetch streaks
      const streakResponse = await fetch(`${API_BASE}/api/user/streaks?user_email=${encodeURIComponent(user.email)}`);
      const streakData = await streakResponse.json();
      updateElement('streakDisplay', `${streakData.current_streak || 0} days`);
      updateElement('streakStat', streakData.current_streak || 0);

      // Recent badges for profile sidebar
      if (achievements.length > 0) {
        const recentBadges = achievements.filter(a => a.unlocked).slice(0, 3);
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
      const API_BASE = getApiBase();

      // Fetch activity for heatmap
      const actResponse = await fetch(`${API_BASE}/api/user/activity?user_email=${encodeURIComponent(user.email)}&range=90`);
      const activityData = await actResponse.json();

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
      const count = item.count || item.activity_count || 0;
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
  function wirePreferencesSave() {
    const prefs = [
      'notifWeekly', 'notifStreak', 'notifNewCourses', 'notifAchievements',
      'privacyProfile', 'privacyStats', 'privacyActivity'
    ];

    prefs.forEach(pref => {
      const el = document.getElementById(pref);
      if (el) {
        // Load saved preference
        const saved = localStorage.getItem(`netology_pref_${pref}`);
        if (saved !== null) {
          el.checked = saved === 'true';
        }

        // Save on change
        el.addEventListener('change', (e) => {
          localStorage.setItem(`netology_pref_${pref}`, e.target.checked);
          try {
            const user = getCurrentUser();
            const API_BASE = getApiBase();
            fetch(`${API_BASE}/api/user/preferences`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_email: user.email,
                [pref]: e.target.checked
              })
            }).catch(err => console.error('Preference save error:', err));
          } catch (err) {
            console.error('Preference update failed:', err);
          }
        });
      }
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
          const user = getCurrentUser();
          try {
            const API_BASE = getApiBase();
            fetch(`${API_BASE}/api/auth/logout-all`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_email: user.email })
            }).then(() => {
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
            const user = getCurrentUser();
            try {
              const API_BASE = getApiBase();
              fetch(`${API_BASE}/api/user`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: user.email })
              }).then(() => {
                localStorage.removeItem('netology_user');
                alert('Your account has been deleted.');
                window.location.href = 'index.html';
              });
            } catch (err) {
              console.error('Delete error:', err);
            }
          }
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        const user = getCurrentUser();
        try {
          const API_BASE = getApiBase();
          fetch(`${API_BASE}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_email: user.email })
          }).then(() => {
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
    if (el) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = value;
      } else {
        el.textContent = value;
      }
    }
  }

})();
