/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/02/2026

courses.js – Carousel-based course browsing with lesson progression focus.
Features:
- Three difficulty tracks (Novice/Intermediate/Advanced)
- Horizontal carousel for each track
- Lesson-focused cards showing course progression
- My Learning Progress section tracking enrolled courses
*/

(() => {
  "use strict";

  const getApiBase = () => window.API_BASE || "";
  const BASE_XP = 100;

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
    wireCarouselButtons();

    await loadAllCoursesCarousels(user);
    await loadMyLearningProgress(user);

    document.body.classList.remove("net-loading");
    document.body.classList.add("net-loaded");
  }

  /* Path Filtering */
  function wirePathFilters() {
    const filterButtons = document.querySelectorAll('[data-path]');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const path = btn.dataset.path;

        filterButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
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

  /* Carousel Navigation */
  function wireCarouselButtons() {
    const carousels = ['novice', 'intermediate', 'advanced'];

    carousels.forEach(track => {
      const prevBtn = document.getElementById(`${track}Prev`);
      const nextBtn = document.getElementById(`${track}Next`);
      const carouselTrack = document.getElementById(`${track}Track`);

      if (!prevBtn || !nextBtn || !carouselTrack) return;

      prevBtn.addEventListener('click', () => {
        carouselTrack.scrollBy({ left: -300, behavior: 'smooth' });
      });

      nextBtn.addEventListener('click', () => {
        carouselTrack.scrollBy({ left: 300, behavior: 'smooth' });
      });
    });
  }

  /* Load all courses into carousels */
  async function loadAllCoursesCarousels(user) {
    try {
      const API_BASE = getApiBase();
      const response = await fetch(`${API_BASE}/api/courses?user_email=${encodeURIComponent(user.email)}`);
      const courses = await response.json();

      if (!courses || courses.length === 0) {
        console.warn('No courses available');
        return;
      }

      // Get user progress to check which courses are in progress
      const progressResponse = await fetch(`${API_BASE}/api/user/progress?user_email=${encodeURIComponent(user.email)}`);
      const userProgress = await progressResponse.json();
      const progressMap = {};
      userProgress.forEach(p => {
        progressMap[p.course_id] = p;
      });

      // Get user level for lock checking
      const level = user.level || 1;

      // Group courses by difficulty
      const grouped = {
        novice: [],
        intermediate: [],
        advanced: []
      };

      courses.forEach(course => {
        const difficulty = (course.difficulty || 'novice').toLowerCase();
        if (grouped[difficulty]) {
          grouped[difficulty].push(course);
        }
      });

      // Render each carousel
      ['novice', 'intermediate', 'advanced'].forEach(track => {
        const trackCourses = grouped[track] || [];
        const trackElement = document.getElementById(`${track}Track`);
        
        if (trackElement) {
          trackElement.innerHTML = '';
          trackCourses.forEach(course => {
            const card = createCourseCard(course, progressMap, level);
            trackElement.appendChild(card);
          });
        }
      });

    } catch (err) {
      console.error('Error loading courses:', err);
    }
  }

  /* Create a single course card */
  function createCourseCard(course, progressMap, userLevel) {
    const card = document.createElement('div');
    card.className = 'net-course-card';

    const progress = progressMap[course.id] || {};
    const isLocked = course.required_level && course.required_level > userLevel;
    const isInProgress = progress.course_id && !progress.completed;
    const isCompleted = progress.completed;

    if (isLocked) {
      card.classList.add('locked');
    }
    if (isInProgress) {
      card.classList.add('in-progress');
    }

    const icon = getIconForDifficulty(course.difficulty || 'novice');
    const totalLessons = course.total_lessons || 0;
    const completedLessons = progress.lessons_completed || 0;
    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

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
      </div>

      <div class="net-course-desc">${escapeHtml(course.description || '')}</div>

      ${course.xp_reward ? `
        <div class="net-course-xp">
          <i class="bi bi-star-fill"></i>
          <span>${course.xp_reward} XP</span>
        </div>
      ` : ''}

      <div class="net-course-footer">
        ${isInProgress ? `
          <div class="net-course-progress">
            <div class="net-course-bar">
              <div class="net-course-bar-fill" style="width: ${progressPct}%"></div>
            </div>
            <span>${progressPct}%</span>
          </div>
        ` : ''}
        <button class="net-course-cta ${isInProgress ? 'btn-continue' : isCompleted ? 'btn-review' : isLocked ? 'btn-locked' : 'btn-start'}" 
                data-course-id="${course.id}"
                ${isLocked ? 'disabled' : ''}>
          ${isLocked ? `<i class="bi bi-lock"></i> Level ${course.required_level}` : 
            isCompleted ? `<i class="bi bi-check-circle"></i> Review` : 
            isInProgress ? `<i class="bi bi-play-fill"></i> Continue` : 
            `<i class="bi bi-plus-circle"></i> Start`}
        </button>
      </div>

      ${isLocked ? `<div class="net-course-lock"><i class="bi bi-lock"></i></div>` : ''}
    `;

    // Wire course card click
    if (!isLocked) {
      const ctaBtn = card.querySelector('.net-course-cta');
      if (ctaBtn) {
        ctaBtn.addEventListener('click', () => {
          const courseId = ctaBtn.dataset.courseId;
          if (isInProgress) {
            window.location.href = `lesson.html?course_id=${courseId}`;
          } else {
            window.location.href = `lesson.html?course_id=${courseId}`;
          }
        });
      }
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
      const API_BASE = getApiBase();
      const response = await fetch(`${API_BASE}/api/user/progress?user_email=${encodeURIComponent(user.email)}`);
      const userCourses = await response.json();

      // Filter only started courses
      const startedCourses = userCourses.filter(c => c.lessons_completed > 0 || c.completed);

      if (startedCourses.length === 0) {
        placeholder.classList.remove('d-none');
        return;
      }

      container.innerHTML = '';

      startedCourses.slice(0, 4).forEach(course => {
        const pct = Math.round((course.lessons_completed || 0) / Math.max(course.total_lessons || 1, 1) * 100);
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-3 mb-3';
        col.innerHTML = `
          <div class="card border-0 h-100 shadow-sm">
            <div class="card-body">
              <h6 class="fw-bold mb-2">${escapeHtml(course.title || 'Course')}</h6>
              <div class="progress mb-2" style="height: 6px;">
                <div class="progress-bar net-progress-fill" style="width: ${pct}%"></div>
              </div>
              <div class="small text-muted mb-3">${course.lessons_completed}/${course.total_lessons} lessons</div>
              <a href="lesson.html?course_id=${course.course_id}" class="btn btn-sm btn-teal w-100">
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
