/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 12/02/2026

progress.js – Progress detail lists with tabbed interface (All / In Progress / Completed / Achievements / Activity).
*/

(() => {
  "use strict";

  /* API base + page config */
  const getApiBase = () => window.API_BASE || "";

  /* Page init wiring */
  document.addEventListener("DOMContentLoaded", () => {
    initProgressPage().catch((err) => console.error("Progress init failed:", err));
  });

  /* Main init flow */
  async function initProgressPage() {
    const user = getCurrentUser();
    if (!user?.email) {
      window.location.href = "login.html";
      return;
    }

    wireChrome(user);
    wireTabNavigation();
    
    const activeTab = getActiveTab();
    setActiveTabUI(activeTab);
    await loadTabContent(activeTab, user);

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");
  }

  /* Tab Navigation Wire */
  function wireTabNavigation() {
    const tabButtons = document.querySelectorAll('[data-tab]');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const tab = btn.dataset.tab;
        setActiveTab(tab);
        setActiveTabUI(tab);
        
        const user = getCurrentUser();
        await loadTabContent(tab, user);
      });
    });
  }

  /* Set active tab in UI */
  function setActiveTabUI(tab) {
    const tabButtons = document.querySelectorAll('[data-tab]');
    const panes = document.querySelectorAll('.progress-tab-pane');
    
    tabButtons.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    panes.forEach(p => {
      p.classList.add('d-none');
      p.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.setAttribute('aria-selected', 'true');
    }
    
    const tabId = `tab${tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', '')}`;
    const pane = document.getElementById(tabId);
    if (pane) {
      pane.classList.remove('d-none');
      pane.classList.add('active');
    }
  }

  /* Load content for selected tab */
  async function loadTabContent(tab, user) {
    try {
      switch(tab) {
        case 'all':
          await loadAllCoursesTab(user);
          break;
        case 'in-progress':
          await loadInProgressTab(user);
          break;
        case 'completed':
          await loadCompletedTab(user);
          break;
        case 'achievements':
          await loadAchievementsTab(user);
          break;
        case 'heatmap':
          await loadHeatmapTab(user);
          break;
      }
    } catch (err) {
      console.error(`Error loading ${tab} tab:`, err);
    }
  }

  /* All Courses Tab */
  async function loadAllCoursesTab(user) {
    const list = document.getElementById('allList');
    const empty = document.getElementById('allEmpty');
    if (!list || !empty) return;

    list.innerHTML = '<div class="text-center py-4"><i class="bi bi-hourglass-split me-2"></i> Loading...</div>';
    empty.classList.add('d-none');

    try {
      const API_BASE = getApiBase();
      const response = await fetch(`${API_BASE}/api/user/progress?user_email=${encodeURIComponent(user.email)}`);
      const courses = await response.json();

      list.innerHTML = '';
      
      if (!courses || courses.length === 0) {
        empty.classList.remove('d-none');
        updateTabCount('all', 0);
        return;
      }

      courses.forEach(course => {
        const pct = Math.round((course.lessons_completed || 0) / Math.max(course.total_lessons || 1, 1) * 100);
        const card = document.createElement('div');
        card.className = 'net-progress-item net-card p-3 mb-3';
        card.innerHTML = `
          <div class="d-flex align-items-start justify-content-between gap-3">
            <div class="flex-grow-1">
              <h5 class="mb-1">${escapeHtml(course.title || 'Untitled')}</h5>
              <div class="small text-muted mb-2">${escapeHtml(course.description || '')}</div>
              <div class="d-flex gap-2 align-items-center">
                <div class="progress flex-grow-1" style="height: 8px;">
                  <div class="progress-bar net-progress-fill" style="width: ${pct}%"></div>
                </div>
                <span class="small fw-semibold">${pct}%</span>
              </div>
              <div class="small text-muted mt-1">${course.lessons_completed || 0}/${course.total_lessons || 0} lessons</div>
            </div>
            <div class="text-end">
              <span class="badge ${pct === 100 ? 'text-bg-success' : pct >= 50 ? 'text-bg-info' : 'text-bg-secondary'}">${pct === 100 ? 'Complete' : pct >= 50 ? 'In Progress' : 'Started'}</span>
            </div>
          </div>
        `;
        list.appendChild(card);
      });

      updateTabCount('all', courses.length);
    } catch (err) {
      console.error('Error loading all courses:', err);
      empty.classList.remove('d-none');
    }
  }

  /* In Progress Tab */
  async function loadInProgressTab(user) {
    const list = document.getElementById('inProgressList');
    const empty = document.getElementById('inProgressEmpty');
    if (!list || !empty) return;

    list.innerHTML = '<div class="text-center py-4"><i class="bi bi-hourglass-split me-2"></i> Loading...</div>';
    empty.classList.add('d-none');

    try {
      const API_BASE = getApiBase();
      const response = await fetch(`${API_BASE}/api/user/progress?user_email=${encodeURIComponent(user.email)}`);
      const courses = await response.json();

      const inProgress = courses.filter(c => (c.lessons_completed || 0) > 0 && (c.lessons_completed || 0) < (c.total_lessons || 1));
      
      list.innerHTML = '';
      
      if (inProgress.length === 0) {
        empty.classList.remove('d-none');
        updateTabCount('in-progress', 0);
        return;
      }

      inProgress.forEach(course => {
        const pct = Math.round((course.lessons_completed || 0) / Math.max(course.total_lessons || 1, 1) * 100);
        const card = document.createElement('div');
        card.className = 'net-progress-item net-card p-3 mb-3';
        card.innerHTML = `
          <div class="d-flex align-items-start justify-content-between gap-3">
            <div class="flex-grow-1">
              <h5 class="mb-1">${escapeHtml(course.title || 'Untitled')}</h5>
              <div class="d-flex gap-2 align-items-center">
                <div class="progress flex-grow-1" style="height: 8px;">
                  <div class="progress-bar net-progress-fill" style="width: ${pct}%"></div>
                </div>
                <span class="small fw-semibold">${pct}%</span>
              </div>
              <div class="small text-muted mt-1">${course.lessons_completed || 0}/${course.total_lessons || 0} lessons</div>
            </div>
            <a href="lesson.html?course_id=${course.course_id}" class="btn btn-sm btn-outline-teal">Continue</a>
          </div>
        `;
        list.appendChild(card);
      });

      updateTabCount('in-progress', inProgress.length);
    } catch (err) {
      console.error('Error loading in-progress:', err);
      empty.classList.remove('d-none');
    }
  }

  /* Completed Tab */
  async function loadCompletedTab(user) {
    const list = document.getElementById('completedList');
    const empty = document.getElementById('completedEmpty');
    if (!list || !empty) return;

    list.innerHTML = '<div class="text-center py-4"><i class="bi bi-hourglass-split me-2"></i> Loading...</div>';
    empty.classList.add('d-none');

    try {
      const API_BASE = getApiBase();
      const response = await fetch(`${API_BASE}/api/user/progress?user_email=${encodeURIComponent(user.email)}`);
      const courses = await response.json();

      const completed = courses.filter(c => (c.lessons_completed || 0) >= (c.total_lessons || 1));
      
      list.innerHTML = '';
      
      if (completed.length === 0) {
        empty.classList.remove('d-none');
        updateTabCount('completed', 0);
        return;
      }

      completed.forEach(course => {
        const card = document.createElement('div');
        card.className = 'net-progress-item net-card p-3 mb-3';
        const completedDate = course.completed_date ? new Date(course.completed_date).toLocaleDateString() : 'Recently';
        card.innerHTML = `
          <div class="d-flex align-items-start justify-content-between gap-3">
            <div class="flex-grow-1">
              <h5 class="mb-1"><i class="bi bi-check-circle-fill text-success me-2"></i>${escapeHtml(course.title || 'Untitled')}</h5>
              <div class="small text-muted">Completed on ${escapeHtml(completedDate)}</div>
              <div class="d-flex gap-2 align-items-center mt-2">
                <div class="progress flex-grow-1" style="height: 8px;">
                  <div class="progress-bar net-progress-fill" style="width: 100%"></div>
                </div>
                <span class="small fw-semibold">100%</span>
              </div>
            </div>
            <span class="badge text-bg-success">Complete</span>
          </div>
        `;
        list.appendChild(card);
      });

      updateTabCount('completed', completed.length);
    } catch (err) {
      console.error('Error loading completed:', err);
      empty.classList.remove('d-none');
    }
  }

  /* Achievements Tab */
  async function loadAchievementsTab(user) {
    const container = document.getElementById('achievementsList');
    const empty = document.getElementById('achievementsEmpty');
    if (!container || !empty) return;

    container.innerHTML = '<div class="text-center py-4"><i class="bi bi-hourglass-split me-2"></i> Loading...</div>';
    empty.classList.add('d-none');

    try {
      const API_BASE = getApiBase();
      const response = await fetch(`${API_BASE}/api/user/achievements?user_email=${encodeURIComponent(user.email)}`);
      const achievements = await response.json();

      container.innerHTML = '';
      
      if (!achievements || achievements.length === 0) {
        empty.classList.remove('d-none');
        updateTabCount('achievements', 0);
        return;
      }

      achievements.forEach(ach => {
        const isLocked = !ach.unlocked;
        const card = document.createElement('div');
        card.className = `net-achievement-card ${isLocked ? 'locked' : ''}`;
        
        const icon = ach.icon || '<i class="bi bi-star-fill"></i>';
        const unlockedDate = ach.unlocked_date ? new Date(ach.unlocked_date).toLocaleDateString() : '';
        
        card.innerHTML = `
          <div class="net-achievement-icon">${icon}</div>
          <div class="net-achievement-name">${escapeHtml(ach.name || 'Achievement')}</div>
          <div class="net-achievement-desc">${escapeHtml(ach.description || '')}</div>
          ${unlockedDate ? `<div class="net-achievement-date">${unlockedDate}</div>` : ''}
        `;
        container.appendChild(card);
      });

      const unlockedCount = achievements.filter(a => a.unlocked).length;
      updateTabCount('achievements', unlockedCount);
    } catch (err) {
      console.error('Error loading achievements:', err);
      empty.classList.remove('d-none');
    }
  }

  /* Activity Heatmap Tab */
  async function loadHeatmapTab(user) {
    const heatmapContainer = document.getElementById('heatmapContainer');
    const streakInfo = document.getElementById('streakInfo');
    if (!heatmapContainer || !streakInfo) return;

    heatmapContainer.innerHTML = '<div class="text-center py-4"><i class="bi bi-hourglass-split me-2"></i> Loading...</div>';

    try {
      const API_BASE = getApiBase();
      
      // Fetch activity data
      const actResponse = await fetch(`${API_BASE}/api/user/activity?user_email=${encodeURIComponent(user.email)}&range=365`);
      const activityData = await actResponse.json();
      
      // Fetch streak data
      const streakResponse = await fetch(`${API_BASE}/api/user/streaks?user_email=${encodeURIComponent(user.email)}`);
      const streakData = await streakResponse.json();
      
      // Build heatmap
      renderHeatmap(heatmapContainer, activityData);
      
      // Render streak info
      const streak = streakData.current_streak || 0;
      const lastActivity = streakData.last_activity_date || 'Never';
      const lastActivityDate = lastActivity !== 'Never' ? new Date(lastActivity).toLocaleDateString() : lastActivity;
      
      document.getElementById('streakText').textContent = `${streak}-day streak`;
      document.getElementById('lastActivityText').textContent = `Last active: ${lastActivityDate}`;
      
      updateTabCount('heatmap', streak);
    } catch (err) {
      console.error('Error loading heatmap:', err);
      heatmapContainer.innerHTML = '<div class="text-center py-4 text-muted">Unable to load activity data</div>';
    }
  }

  /* Render GitHub-style heatmap */
  function renderHeatmap(container, activityData) {
    container.innerHTML = '';
    
    if (!activityData || !Array.isArray(activityData) || activityData.length === 0) {
      container.innerHTML = '<div class="text-center py-4 text-muted">No activity recorded yet</div>';
      return;
    }

    // Create data map
    const dataMap = {};
    activityData.forEach(item => {
      const date = item.date || item.activity_date;
      const count = item.count || item.activity_count || 0;
      if (date) dataMap[date] = Math.min(count, 4);
    });

    // Generate last 365 days
    const heatmap = document.createElement('div');
    heatmap.className = 'net-heatmap';
    
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const level = dataMap[dateStr] || 0;
      
      const cell = document.createElement('div');
      cell.className = `net-heatmap-cell level-${level}`;
      cell.title = `${dateStr}: ${dataMap[dateStr] || 0} activities`;
      heatmap.appendChild(cell);
    }
    
    container.appendChild(heatmap);
  }

  /* Utility: Update tab count badge */
  function updateTabCount(tab, count) {
    const btn = document.querySelector(`[data-tab="${tab}"]`);
    if (btn) {
      const badge = btn.querySelector('.net-progress-nav-count');
      if (badge) badge.textContent = count;
    }
  }

  /* Utility: Get active tab */
  function getActiveTab() {
    const saved = localStorage.getItem('netology_progress_tab');
    return saved || 'all';
  }

  /* Utility: Set active tab */
  function setActiveTab(tab) {
    localStorage.setItem('netology_progress_tab', tab);
  }

  /* Utility: Get user from session/storage */
  function getCurrentUser() {
    try {
      const stored = localStorage.getItem('netology_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Error getting current user:', e);
      return null;
    }
  }

  /* Utility: HTML escape */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

})();
