/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/02/2026

courses.js – Grid-based course browsing with lesson progression focus.
Features:
- Three difficulty tracks (Novice/Intermediate/Advanced)
- Responsive grid layout for each track (scrolls naturally)
- Lesson-focused cards showing course progression
- My Learning Progress section tracking enrolled courses
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
    initCoursesPage();
  });

  async function initCoursesPage() {
    const user = getCurrentUser();
    if (!user?.email) {
      window.location.href = "login.html";
      return;
    }

    wireChrome(user);
    wirePathFilters();

    await loadAllCourses(user);
    await loadMyLearningProgress(user);

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");

    if (typeof window.maybeStartOnboardingTour === "function") {
      window.maybeStartOnboardingTour("courses", user.email);
    }
  }

  /* Path Filtering */
  function wirePathFilters() {
    const filterButtons = document.querySelectorAll('[data-path]');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const path = btn.dataset.path;

        filterButtons.forEach(b => {
          b.classList.remove('active', 'btn-teal');
          b.classList.add('btn-outline-teal');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active', 'btn-teal');
        btn.classList.remove('btn-outline-teal');
        btn.setAttribute('aria-selected', 'true');

        document.querySelectorAll('.net-course-section').forEach(section => {
          if (path === 'all') {
            section.style.display = 'block';
          } else {
            section.style.display = section.dataset.difficulty === path ? 'block' : 'none';
          }
        });
      });
    });
  }

  /* Merge API course data with static COURSE_CONTENT for any missing fields */
  function enrichCourse(apiCourse) {
    const staticContent = (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT)
      ? (COURSE_CONTENT[String(apiCourse.id)] || {})
      : {};

    // Count total lessons from static content if API value is missing or 0
    let staticLessons = 0;
    if (staticContent.units) {
      for (const unit of staticContent.units) {
        staticLessons += (unit.lessons || []).length;
      }
    }

    return {
      ...apiCourse,
      title:          apiCourse.title       || staticContent.title       || "Course",
      description:    apiCourse.description || staticContent.description || "",
      difficulty:     apiCourse.difficulty  || staticContent.difficulty  || "novice",
      category:       apiCourse.category    || staticContent.category    || "Core",
      xp_reward:      apiCourse.xp_reward   || staticContent.xpReward   || staticContent.totalXP || 0,
      total_lessons:  apiCourse.total_lessons || staticLessons           || 0,
      estimated_time: apiCourse.estimated_time || staticContent.estimatedTime || "",
    };
  }

  /* Load all courses into grids */
  async function loadAllCourses(user) {
    try {
      const coursesData = await apiGet(ENDPOINTS.courses?.list || "/courses");
      const courses = listFrom(coursesData, "courses");

      // Fallback: if API returns nothing, build list from static COURSE_CONTENT
      let courseList = Array.isArray(courses) && courses.length
        ? courses.map(enrichCourse)
        : (typeof COURSE_CONTENT !== "undefined" && COURSE_CONTENT
            ? Object.keys(COURSE_CONTENT).map(k => enrichCourse({ id: k, ...COURSE_CONTENT[k] }))
            : []);

      if (!courseList.length) {
        console.warn('No courses available');
        return;
      }

      // Get user progress
      const progressData = await apiGet(ENDPOINTS.courses?.userCourses || "/user-courses", { email: user.email });
      const userProgress = listFrom(progressData, "courses");
      const progressMap = {};
      userProgress.forEach(p => { progressMap[String(p.id)] = p; });

      // User's unlock tier determines which courses they can access
      const unlockTier = String(user.unlock_tier || user.start_level || "novice").toLowerCase();
      const tierOrder = ["novice", "intermediate", "advanced"];
      const tierIndex = tierOrder.indexOf(unlockTier);

      // Get user level for lock checking
      const level = Number.isFinite(Number(user.numeric_level))
        ? Number(user.numeric_level)
        : (Number.isFinite(Number(user.level)) ? Number(user.level) : 1);

      // Group courses by difficulty
      const grouped = { novice: [], intermediate: [], advanced: [] };
      courseList.forEach(course => {
        const difficulty = String(course.difficulty || 'novice').toLowerCase();
        const track = ['novice', 'intermediate', 'advanced'].includes(difficulty) ? difficulty : 'novice';
        grouped[track].push(course);
      });

      // Render each grid
      ['novice', 'intermediate', 'advanced'].forEach(track => {
        const trackCourses = grouped[track] || [];
        const gridElement = document.getElementById(`${track}Grid`);

        if (gridElement) {
          gridElement.innerHTML = '';
          // Determine if this entire track is locked based on unlock tier
          const trackIndex = tierOrder.indexOf(track);
          const trackLocked = trackIndex > tierIndex;

          trackCourses.forEach(course => {
            const card = createCourseCard(course, progressMap, level, trackLocked);
            gridElement.appendChild(card);
          });

          // Show a lock notice if the whole track is unavailable
          if (trackLocked && trackCourses.length > 0) {
            const notice = document.createElement('div');
            notice.className = 'net-track-locked-notice text-muted small px-2 pb-2';
            notice.innerHTML = `<i class="bi bi-lock me-1"></i>Upgrade your learning path to access ${track} courses.`;
            gridElement.prepend(notice);
          }
        }
      });

    } catch (err) {
      console.error('Error loading courses:', err);
    }
  }

  /* Create a single course card */
  function createCourseCard(course, progressMap, userLevel, trackLocked) {
    const card = document.createElement('div');
    card.className = 'net-course-card';
    card.setAttribute('data-difficulty', (course.difficulty || 'novice').toLowerCase());

    const progress = progressMap[String(course.id)] || {};
    // Locked if the whole track is locked OR if the course has a level requirement above user's
    const isLocked = trackLocked || (course.required_level && course.required_level > userLevel);
    const status = (progress.status || '').toLowerCase();
    const progressPct = Number.isFinite(Number(progress.progress_pct)) ? Math.round(Number(progress.progress_pct)) : 0;
    const isInProgress = status === 'in-progress' || (progressPct > 0 && progressPct < 100);
    const isCompleted = status === 'completed' || progressPct >= 100;

    if (isLocked) card.classList.add('locked');
    if (isInProgress) card.classList.add('in-progress');

    const icon = getIconForDifficulty(course.difficulty || 'novice');
    const totalLessons = course.total_lessons || 0;
    const xpReward = Number(course.xp_reward) || 0;
    const estimatedTime = course.estimated_time || course.estimatedTime || "";

    card.innerHTML = `
      <div class="net-course-header">
        <div class="net-course-icon">${icon}</div>
        <div class="net-course-meta">
          <div class="net-course-category">${escapeHtml(course.category || 'Core')}</div>
          <div class="net-course-title">${escapeHtml(course.title || 'Course')}</div>
        </div>
      </div>

      <div class="net-course-lessons">
        <i class="bi bi-file-text"></i>
        <span>${totalLessons} ${totalLessons === 1 ? 'lesson' : 'lessons'}</span>
        ${estimatedTime ? `<span class="ms-2 text-muted"><i class="bi bi-clock me-1"></i>${escapeHtml(estimatedTime)}</span>` : ''}
      </div>

      <div class="net-course-desc">${escapeHtml(course.description || '')}</div>

      ${xpReward > 0 ? `
        <div class="net-course-xp">
          <i class="bi bi-lightning-charge-fill"></i>
          <span>${xpReward} XP</span>
        </div>
      ` : ''}

      <div class="net-course-footer">
        ${(isInProgress || isCompleted) ? `
          <div class="net-course-progress">
            <div class="net-course-bar">
              <div class="net-course-bar-fill" style="width: ${progressPct}%"></div>
            </div>
            <span>${progressPct}% Complete</span>
          </div>
        ` : ''}
        <button class="net-course-cta ${isInProgress ? 'btn-continue' : isCompleted ? 'btn-review' : isLocked ? 'btn-locked' : 'btn-start'}"
                data-course-id="${course.id}"
                ${isLocked ? 'disabled' : ''}>
          ${isLocked
            ? `<i class="bi bi-lock"></i> Locked`
            : isCompleted
              ? `<i class="bi bi-check-circle"></i> Review`
              : isInProgress
                ? `<i class="bi bi-play-fill"></i> Continue`
                : `<i class="bi bi-plus-circle"></i> Start`}
        </button>
      </div>

      ${isLocked ? `<div class="net-course-lock"><i class="bi bi-lock"></i></div>` : ''}
    `;

    // Wire course card click
    if (!isLocked) {
      const ctaBtn = card.querySelector('.net-course-cta');
      if (ctaBtn) {
        ctaBtn.addEventListener('click', () => {
          window.location.href = `course.html?id=${encodeURIComponent(ctaBtn.dataset.courseId)}`;
        });
      }
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (e.target.closest('.net-course-cta')) return;
        window.location.href = `course.html?id=${encodeURIComponent(course.id)}`;
      });
    }

    return card;
  }

  /* Get icon for difficulty */
  function getIconForDifficulty(difficulty) {
    const d = (difficulty || '').toLowerCase();
    if (d.includes('advanced')) return '<i class="bi bi-star-fill"></i>';
    if (d.includes('intermediate')) return '<i class="bi bi-lightning-fill"></i>';
    return '<i class="bi bi-gem"></i>';
  }

  /* Load My Learning Progress section */
  async function loadMyLearningProgress(user) {
    const container = document.getElementById('myProgressContainer');
    const placeholder = document.getElementById('noProgressPlaceholder');

    if (!container || !placeholder) return;

    try {
      const data = await apiGet(ENDPOINTS.courses?.userCourses || "/user-courses", { email: user.email });
      const userCourses = listFrom(data, "courses");

      const startedCourses = userCourses.filter(c => (c.progress_pct || 0) > 0 || (c.status || '').toLowerCase() === 'completed');

      if (startedCourses.length === 0) {
        placeholder.classList.remove('d-none');
        return;
      }

      container.innerHTML = '';

      startedCourses.slice(0, 4).forEach(course => {
        const pct = Number.isFinite(Number(course.progress_pct)) ? Number(course.progress_pct) : 0;
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-3 mb-3';
        col.innerHTML = `
          <div class="card border-0 h-100 shadow-sm">
            <div class="card-body">
              <h6 class="fw-bold mb-2">${escapeHtml(course.title || 'Course')}</h6>
              <div class="progress mb-2" style="height: 6px;">
                <div class="progress-bar net-progress-fill" style="width: ${pct}%"></div>
              </div>
              <div class="small text-muted mb-3">${Math.round((pct / 100) * Math.max(course.total_lessons || 0, 0))}/${course.total_lessons || 0} lessons</div>
              <a href="course.html?id=${encodeURIComponent(course.id)}" class="btn btn-sm btn-teal w-100">
                <i class="bi bi-play-fill me-1"></i>Continue
              </a>
            </div>
          </div>
        `;
        container.appendChild(col);
      });

    } catch (err) {
      console.error('Error loading progress:', err);
      placeholder.classList.remove('d-none');
    }
  }

  /* ── Chrome: sidebar, dropdown, identity, logout ── */
  function wireChrome(user) {
    wireSidebar();
    wireUserDropdown();
    fillIdentity(user);

    const topLogout = document.getElementById('topLogoutBtn');
    const sideLogout = document.getElementById('sideLogoutBtn');
    const doLogout = () => {
      localStorage.removeItem('netology_user');
      localStorage.removeItem('user');
      localStorage.removeItem('netology_token');
      window.location.href = 'index.html';
    };
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

    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    // Top nav
    set('topAvatar', initial);
    set('ddName', name);
    set('ddEmail', email);
    // Sidebar
    set('sideAvatar', initial);
    set('sideUserName', name);
    set('sideUserEmail', email);
    set('sideLevelBadge', `Lv ${level}`);
  }

  /* XP & Level Helpers */
  function levelFromXP(totalXP) {
    const xp = Math.max(0, Number(totalXP) || 0);
    const t = xp / BASE_XP;
    const lvl = Math.floor((1 + Math.sqrt(1 + 8 * t)) / 2);
    return Math.max(1, lvl);
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

})();
