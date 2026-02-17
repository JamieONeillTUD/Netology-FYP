/**
 * lesson.js - Netology Interactive Lesson System
 * 
 * Features:
 * - Slide viewer with bookmarking, navigation, and progress tracking
 * - Learning objectives display
 * - Interactive quiz integration
 * - Key takeaway highlighting
 * - Sandbox practice and challenge integration
 * - Lesson outline sidebar with clickable navigation
 * - Bookmark management system
 * - Progress tracking and completion status
 */

const LESSON_API_BASE = (window.API_BASE || "").replace(/\/$/, "");

class LessonViewer {
  constructor() {
    this.currentSlide = 0;
    this.totalSlides = 0;
    this.slides = [];
    this.bookmarks = [];
    this.lessonId = null;
    this.courseId = null;
    this.lessonNumber = null;
    this.contentId = null;
    this.quizAnswered = false;
    this.bookmarkKey = 'lesson_bookmarks';
    
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    // Main slide elements
    this.slideCounter = document.getElementById('slideCounter');
    this.slideTotal = document.getElementById('slideTotal');
    this.slideTitle = document.getElementById('slideTitle');
    this.slideSubtitle = document.getElementById('slideSubtitle');
    this.slideContent = document.getElementById('slideContent');
    this.slideProgressBar = document.getElementById('slideProgressBar');
    this.topProgressBars = document.getElementById('lessonTopProgressBars');
    this.topProgressText = document.getElementById('lessonTopProgressText');
    this.lessonProgressPct = document.getElementById('lessonProgressPct');
    
    // Navigation buttons
    this.prevSlideBtn = document.getElementById('prevSlideBtn');
    this.nextSlideBtn = document.getElementById('nextSlideBtn');
    this.bookmarkBtn = document.getElementById('bookmarkBtn');
    
    // Card sections
    this.objectivesCard = document.getElementById('objectivesCard');
    this.objectivesList = document.getElementById('objectivesList');
    this.quizCard = document.getElementById('quizCard');
    this.quizContent = document.getElementById('quizContent');
    this.quizQuestion = document.getElementById('quizQuestion');
    this.quizOptions = document.getElementById('quizOptions');
    this.quizFeedback = document.getElementById('quizFeedback');
    this.submitQuizBtn = document.getElementById('submitQuizBtn');
    this.takeawayCard = document.getElementById('takeawayCard');
    this.takeawayText = document.getElementById('takeawayText');
    this.practiceCard = document.getElementById('practiceCard');
    this.practiceLaunchBtn = document.getElementById('practiceLaunchBtn');
    this.challengeCard = document.getElementById('challengeCard');
    this.challengeStartBtn = document.getElementById('challengeStartBtn');
    
    // Sidebar elements
    this.sidebarCourseName = document.getElementById('sidebarCourseName');
    this.sidebarDifficulty = document.getElementById('sidebarDifficulty');
    this.sidebarEstimatedTime = document.getElementById('sidebarEstimatedTime');
    this.sidebarXpReward = document.getElementById('sidebarXpReward');
    this.slidesList = document.getElementById('slidesList');
    this.bookmarksList = document.getElementById('bookmarksList');
    this.completionPct = document.getElementById('completionPct');
    this.completionBar = document.getElementById('completionBar');
    this.statusText = document.getElementById('statusText');
    this.resourcesList = document.getElementById('resourcesList');
  }

  attachEventListeners() {
    this.prevSlideBtn?.addEventListener('click', () => this.previousSlide());
    this.nextSlideBtn?.addEventListener('click', () => this.nextSlide());
    this.bookmarkBtn?.addEventListener('click', () => this.toggleBookmark());
    this.submitQuizBtn?.addEventListener('click', () => this.submitQuiz());
    this.practiceLaunchBtn?.addEventListener('click', () => this.launchSandbox());
    this.challengeStartBtn?.addEventListener('click', () => this.startChallenge());
    this.wireToolbarTabs();
  }

  wireToolbarTabs() {
    const tabs = document.querySelectorAll('.net-lesson-tab');
    const panels = {
      tabSlides: document.getElementById('panelSlides'),
      tabOutline: document.getElementById('panelOutline'),
      tabBookmarks: document.getElementById('panelBookmarks'),
      tabOverview: document.getElementById('panelOverview')
    };

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');

        Object.values(panels).forEach(p => { if (p) p.classList.add('d-none'); });
        const panelId = tab.getAttribute('aria-controls');
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.remove('d-none');
      });
    });
  }

  /**
   * Load lesson from API
   */
  async loadLesson(lessonId) {
    try {
      document.body.classList.add('net-loading');
      this.lessonId = lessonId;
      
      const response = await fetch(`${LESSON_API_BASE}/lessons/${lessonId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      
      const data = await response.json();
      this.applyLessonData(data);
      
      document.body.classList.remove('net-loading');
    } catch (error) {
      console.error('Error loading lesson:', error);
      this.slideContent.innerHTML = '<div class="alert alert-danger">Failed to load lesson. Please try again.</div>';
      document.body.classList.remove('net-loading');
    }
  }

  /**
   * Load lesson content from local COURSE_CONTENT
   */
  async loadLessonFromContent(courseId, lessonNumber, contentId = null) {
    document.body.classList.add('net-loading');
    this.courseId = String(courseId || '');
    this.lessonNumber = Number(lessonNumber || 0);
    this.contentId = contentId ? String(contentId) : null;
    this.lessonId = `${this.courseId}:${this.lessonNumber}`;

    const course = resolveCourseContent(this.courseId, this.contentId);
    const lesson = getLessonByNumber(course, this.lessonNumber);

    if (!course || !lesson) {
      this.slideContent.innerHTML = '<div class="alert alert-danger">Lesson content not found.</div>';
      document.body.classList.remove('net-loading');
      return;
    }

    const slides = buildSlidesFromLesson(lesson);
    const data = {
      title: lesson.title,
      subtitle: lesson.learn || lesson.subtitle || lesson.about || '',
      difficulty: course.difficulty || 'novice',
      estimated_time: lesson.estimatedTime || lesson.duration || course.estimatedTime || '8-12 min',
      xp_reward: lesson.xp || course.xpReward || 50,
      course_name: course.title || 'Course',
      unit_title: lesson.unit_title || lesson.unit || 'Module',
      slides
    };

    this.applyLessonData(data);
    document.body.classList.remove('net-loading');
  }

  applyLessonData(data) {
    this.slides = Array.isArray(data?.slides) ? data.slides : [];
    this.totalSlides = this.slides.length || 1;

    this.populateLessonInfo(data || {});
    this.loadBookmarks();
    this.renderSlidesList();
    this.renderTopProgress();
    this.loadSlide(0);
  }

  /**
   * Populate lesson metadata in sidebar
   */
  populateLessonInfo(data) {
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    const courseName = data.course_name || data.course || 'Course';
    const lessonTitle = data.title || data.lesson_title || 'Lesson';
    const lessonSubtitle = data.subtitle || data.description || data.learn || '';
    const unitTitle = data.unit_title || data.unit || data.module || 'Module';
    const difficulty = String(data.difficulty || 'novice').toLowerCase();

    setText('lessonCourseTitle', courseName);
    setText('lessonTitle', lessonTitle);
    setText('lessonSubtitle', lessonSubtitle);
    setText('lessonUnitTitle', unitTitle);
    setText('lessonMetaTime', data.estimated_time || data.duration || '8-12 min');
    setText('lessonMetaXP', data.xp_reward || data.xp || 0);
    setText('breadcrumbCourse', courseName);
    setText('breadcrumbModule', unitTitle);
    setText('breadcrumbLesson', lessonTitle);

    // Update "Back to Course" link with course context
    const backLink = document.getElementById('backToCourse');
    if (backLink && this.courseId) {
      const bp = new URLSearchParams();
      bp.set('id', this.courseId);
      if (this.contentId) bp.set('content_id', this.contentId);
      backLink.href = `course.html?${bp.toString()}`;
    }
    setText('sidebarCourseName', courseName);
    setText('sidebarEstimatedTime', data.estimated_time || data.duration || '8-12 min');

    if (this.sidebarXpReward) {
      this.sidebarXpReward.innerHTML = `<i class="bi bi-star-fill me-1"></i>${data.xp_reward || data.xp || 0} XP`;
    }

    const difficultyMap = {
      novice: '<span class="badge text-bg-success">Novice</span>',
      intermediate: '<span class="badge text-bg-warning">Intermediate</span>',
      advanced: '<span class="badge text-bg-danger">Advanced</span>'
    };
    if (this.sidebarDifficulty) {
      this.sidebarDifficulty.innerHTML = difficultyMap[difficulty] || '<span class="badge text-bg-light">-</span>';
    }
    const heroDiff = document.getElementById('lessonDifficulty');
    if (heroDiff) {
      heroDiff.innerHTML = difficultyMap[difficulty] || '<span class="badge text-bg-light border">-</span>';
    }

    if (data.next_lesson?.title) {
      setText('nextUpTitle', data.next_lesson.title);
    }

    if (data.resources && data.resources.length > 0) {
      this.resourcesList.innerHTML = data.resources
        .map(r => `<a href="${r.url}" target="_blank" class="d-block mb-2"><i class="bi bi-link-45deg me-1"></i>${r.title}</a>`)
        .join('');
    } else {
      this.resourcesList.innerHTML = '<span class="text-muted">No additional resources for this lesson.</span>';
    }
  }

  /**
   * Load specific slide
   */
  loadSlide(index) {
    if (index < 0 || index >= this.totalSlides) return;
    
    this.currentSlide = index;
    const slide = this.slides[index];
    
    // Update header
    this.slideCounter.textContent = `Slide ${index + 1}`;
    this.slideTotal.textContent = `of ${this.totalSlides}`;
    this.slideTitle.textContent = slide.title || 'Lesson Slide';
    this.slideSubtitle.textContent = slide.subtitle || '';
    
    // Render content
    this.renderSlideContent(slide);
    
    // Update navigation buttons
    this.prevSlideBtn.disabled = index === 0;
    this.nextSlideBtn.disabled = index === this.totalSlides - 1;
    
    // Update progress bar
    const progress = ((index + 1) / this.totalSlides) * 100;
    this.slideProgressBar.style.width = progress + '%';

    this.updateTopProgress();
    
    // Update bookmark button
    const isBookmarked = this.bookmarks.includes(index);
    this.bookmarkBtn.classList.toggle('active', isBookmarked);
    
    // Render optional cards
    this.renderObjectives(slide);
    this.renderQuiz(slide);
    this.renderTakeaway(slide);
    this.renderPractice(slide);
    this.renderChallenge(slide);
    
    // Update completion
    this.updateCompletion();
    this.renderSlidesList();
  }

  /**
   * Render slide content
   */
  renderSlideContent(slide) {
    this.slideContent.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'net-slide-body';

    if (Array.isArray(slide.blocks) && slide.blocks.length) {
      slide.blocks.forEach((block) => {
        const node = this.renderBlock(block);
        if (node) wrapper.appendChild(node);
      });
    } else if (slide.content_html) {
      const rich = document.createElement('div');
      rich.className = 'net-slide-rich';
      rich.innerHTML = slide.content_html;
      wrapper.appendChild(rich);
    } else if (slide.content) {
      const p = document.createElement('p');
      p.textContent = slide.content;
      wrapper.appendChild(p);
    }

    if (slide.image_url) {
      const figure = document.createElement('figure');
      figure.className = 'net-slide-media';
      const img = document.createElement('img');
      img.src = slide.image_url;
      img.alt = slide.title || 'Slide image';
      figure.appendChild(img);
      wrapper.appendChild(figure);
    }

    if (!wrapper.childNodes.length) {
      const empty = document.createElement('p');
      empty.className = 'text-muted';
      empty.textContent = 'No content available';
      wrapper.appendChild(empty);
    }

    this.slideContent.appendChild(wrapper);
  }

  renderBlock(block) {
    if (!block) return null;
    const type = String(block.type || 'text').toLowerCase();

    if (type === 'text') {
      const wrap = document.createElement('div');
      wrap.className = 'net-slide-block';
      const lines = Array.isArray(block.text) ? block.text : [block.text || block.content || ''];
      lines.filter(Boolean).forEach((line) => {
        const p = document.createElement('p');
        p.textContent = line;
        wrap.appendChild(p);
      });
      return wrap;
    }

    if (type === 'callout' || type === 'explain') {
      const wrap = document.createElement('div');
      wrap.className = 'net-slide-block net-slide-callout';
      const title = document.createElement('div');
      title.className = 'net-slide-callout-title';
      title.textContent = block.title || 'Key idea';
      const body = document.createElement('div');
      body.className = 'net-slide-callout-body';
      const lines = Array.isArray(block.content) ? block.content : [block.content || block.text || ''];
      lines.filter(Boolean).forEach((line) => {
        const p = document.createElement('p');
        p.textContent = line;
        body.appendChild(p);
      });
      wrap.append(title, body);
      return wrap;
    }

    if (type === 'code') {
      return buildCodeBlock(block);
    }

    if (type === 'file') {
      return buildFileBlock(block);
    }

    if (type === 'image') {
      const figure = document.createElement('figure');
      figure.className = 'net-slide-media';
      const img = document.createElement('img');
      img.src = block.src || block.url || '';
      img.alt = block.caption || 'Slide image';
      figure.appendChild(img);
      if (block.caption) {
        const cap = document.createElement('figcaption');
        cap.textContent = block.caption;
        figure.appendChild(cap);
      }
      return figure;
    }

    if (type === 'steps') {
      const wrap = document.createElement('div');
      wrap.className = 'net-slide-block net-slide-steps';
      const title = document.createElement('div');
      title.className = 'net-slide-block-title';
      title.textContent = block.title || 'Steps';
      const ol = document.createElement('ol');
      const items = Array.isArray(block.steps) ? block.steps : [];
      items.forEach((step) => {
        const li = document.createElement('li');
        li.textContent = step;
        ol.appendChild(li);
      });
      wrap.append(title, ol);
      return wrap;
    }

    if (type === 'list') {
      const wrap = document.createElement('div');
      wrap.className = 'net-slide-block net-slide-list';
      const title = document.createElement('div');
      title.className = 'net-slide-block-title';
      title.textContent = block.title || 'Key points';
      const ul = document.createElement('ul');
      const items = Array.isArray(block.items) ? block.items : [];
      items.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      });
      wrap.append(title, ul);
      return wrap;
    }

    if (type === 'grid') {
      const wrap = document.createElement('div');
      wrap.className = 'net-slide-block net-slide-grid';
      const title = document.createElement('div');
      title.className = 'net-slide-block-title';
      title.textContent = block.title || 'Examples';
      const grid = document.createElement('div');
      grid.className = 'net-slide-grid-items';
      const items = Array.isArray(block.items) ? block.items : [];
      items.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'net-slide-grid-card';
        const icon = document.createElement('div');
        icon.className = 'net-slide-grid-icon';
        icon.innerHTML = `<i class="bi ${item.icon || 'bi-diagram-3'}"></i>`;
        const label = document.createElement('div');
        label.className = 'net-slide-grid-label';
        label.textContent = item.label || '';
        const desc = document.createElement('div');
        desc.className = 'net-slide-grid-desc';
        desc.textContent = item.desc || '';
        card.append(icon, label, desc);
        grid.appendChild(card);
      });
      wrap.append(title, grid);
      return wrap;
    }

    if (type === 'sandbox' || type === 'snippet') {
      const wrap = document.createElement('div');
      wrap.className = 'net-slide-block net-slide-snippet';
      const title = document.createElement('div');
      title.className = 'net-slide-snippet-title';
      title.textContent = block.title || 'Sandbox Snippet';
      const body = document.createElement('div');
      body.className = 'net-slide-snippet-body';
      body.textContent = block.text || 'Launch the sandbox to try this step.';

      const btn = document.createElement('a');
      btn.className = 'btn btn-outline-info btn-sm';
      btn.textContent = 'Open Sandbox';
      if (this.courseId && this.lessonNumber) {
        const params = new URLSearchParams();
        params.set('course_id', String(this.courseId));
        if (this.contentId) params.set('content_id', String(this.contentId));
        params.set('lesson', String(this.lessonNumber));
        params.set('mode', 'practice');
        btn.href = `sandbox.html?${params.toString()}`;
      } else {
        btn.href = 'sandbox.html';
      }

      wrap.append(title, body, btn);
      return wrap;
    }

    return null;
  }

  /**
   * Render learning objectives
   */
  renderObjectives(slide) {
    if (!slide.objectives || slide.objectives.length === 0) {
      this.objectivesCard.style.display = 'none';
      return;
    }
    
    this.objectivesCard.style.display = 'block';
    this.objectivesList.innerHTML = slide.objectives
      .map(obj => `<li class="mb-2"><i class="bi bi-check-circle-fill text-success me-2"></i><span>${obj}</span></li>`)
      .join('');
  }

  /**
   * Render interactive quiz
   */
  renderQuiz(slide) {
    const quiz = slide.quiz || slide.check || null;
    if (!quiz) {
      this.quizCard.style.display = 'none';
      this.quizAnswered = false;
      return;
    }
    
    this.quizCard.style.display = 'block';
    this.quizAnswered = false;
    this.submitQuizBtn.disabled = false;
    
    this.quizQuestion.textContent = quiz.question || quiz.prompt || '';
    const options = quiz.options || quiz.choices || [];
    this.quizOptions.innerHTML = options
      .map((opt, i) => `
        <label class="form-check">
          <input class="form-check-input" type="radio" name="quiz_answer" value="${i}">
          <span class="form-check-label">${opt}</span>
        </label>
      `).join('');
    
    this.quizFeedback.style.display = 'none';
  }

  /**
   * Submit quiz answer
   */
  submitQuiz() {
    const selected = document.querySelector('input[name="quiz_answer"]:checked');
    if (!selected) {
      alert('Please select an answer');
      return;
    }
    
    const answer = parseInt(selected.value);
    const slide = this.slides[this.currentSlide];
    const quiz = slide.quiz || slide.check || {};
    const correct = Number.isFinite(Number(quiz.correct_answer))
      ? Number(quiz.correct_answer)
      : Number.isFinite(Number(quiz.correctIndex))
        ? Number(quiz.correctIndex)
        : Number.isFinite(Number(quiz.correct))
          ? Number(quiz.correct)
          : -1;
    const isCorrect = answer === correct;
    
    this.quizFeedback.className = isCorrect ? 'alert alert-success mt-3' : 'alert alert-danger mt-3';
    this.quizFeedback.innerHTML = isCorrect 
      ? `<i class="bi bi-check-circle me-2"></i>Correct! ${quiz.explanation || ''}`
      : `<i class="bi bi-x-circle me-2"></i>Not quite. ${quiz.explanation || ''}`;
    this.quizFeedback.style.display = 'block';
    
    this.quizAnswered = true;
    this.submitQuizBtn.disabled = true;
    
    if (isCorrect) {
      this.awardXP(10);
    }
  }

  /**
   * Render key takeaway
   */
  renderTakeaway(slide) {
    if (!slide.takeaway) {
      this.takeawayCard.style.display = 'none';
      return;
    }
    
    this.takeawayCard.style.display = 'block';
    this.takeawayText.textContent = slide.takeaway;
  }

  /**
   * Render sandbox practice card
   */
  renderPractice(slide) {
    const practice = slide.practice || slide.sandbox || null;
    if (!practice) {
      this.practiceCard.style.display = 'none';
      return;
    }
    
    this.practiceCard.style.display = 'block';
    const xpReward = practice.xp_reward || practice.xp || 50;
    document.getElementById('practiceXpReward').textContent = `+${xpReward} XP`;
  }

  /**
   * Render challenge card
   */
  renderChallenge(slide) {
    if (!slide.challenge) {
      this.challengeCard.style.display = 'none';
      return;
    }
    
    this.challengeCard.style.display = 'block';
    document.getElementById('challengeDescription').textContent = slide.challenge.description || 'Complete the challenge';
    const xpReward = slide.challenge.xp_reward || 100;
    document.getElementById('challengeXpReward').textContent = `+${xpReward} XP`;
  }

  /**
   * Navigate to previous slide
   */
  previousSlide() {
    if (this.currentSlide > 0) {
      this.loadSlide(this.currentSlide - 1);
    }
  }

  /**
   * Navigate to next slide
   */
  nextSlide() {
    if (this.currentSlide < this.totalSlides - 1) {
      this.loadSlide(this.currentSlide + 1);
    }
  }

  /**
   * Toggle bookmark for current slide
   */
  toggleBookmark() {
    const idx = this.bookmarks.indexOf(this.currentSlide);
    
    if (idx > -1) {
      this.bookmarks.splice(idx, 1);
    } else {
      this.bookmarks.push(this.currentSlide);
    }
    
    this.saveBookmarks();
    this.bookmarkBtn.classList.toggle('active');
    this.renderBookmarksList();
  }

  /**
   * Save bookmarks to localStorage
   */
  saveBookmarks() {
    const bookmarkData = {
      lessonId: this.lessonId,
      bookmarks: this.bookmarks
    };
    const allBookmarks = JSON.parse(localStorage.getItem(this.bookmarkKey) || '[]');
    const idx = allBookmarks.findIndex(b => b.lessonId === this.lessonId);
    
    if (idx > -1) {
      allBookmarks[idx] = bookmarkData;
    } else {
      allBookmarks.push(bookmarkData);
    }
    
    localStorage.setItem(this.bookmarkKey, JSON.stringify(allBookmarks));
  }

  /**
   * Load bookmarks from localStorage
   */
  loadBookmarks() {
    const allBookmarks = JSON.parse(localStorage.getItem(this.bookmarkKey) || '[]');
    const found = allBookmarks.find(b => b.lessonId === this.lessonId);
    
    this.bookmarks = found ? found.bookmarks : [];
    this.renderBookmarksList();
  }

  /**
   * Render bookmarks list in sidebar
   */
  renderBookmarksList() {
    // Update count badge
    const countEl = document.getElementById('bookmarkCount');
    if (countEl) countEl.textContent = String(this.bookmarks.length);

    if (this.bookmarks.length === 0) {
      this.bookmarksList.innerHTML = '<div class="net-lesson-empty-state"><i class="bi bi-bookmark-plus"></i><p>No bookmarks yet. Click the bookmark icon on any slide to save it for later.</p></div>';
      return;
    }

    this.bookmarksList.innerHTML = this.bookmarks
      .map(idx => {
        const slide = this.slides[idx];
        return `<div class="mb-2"><a href="#" data-slide="${idx}" class="link-teal small"><i class="bi bi-bookmark-fill me-1 text-warning"></i>${idx + 1}. ${slide.title}</a></div>`;
      }).join('');

    this.bookmarksList.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const slideIdx = parseInt(link.dataset.slide);
        this.loadSlide(slideIdx);
        // Switch to slides tab
        const slidesTab = document.getElementById('tabSlides');
        if (slidesTab) slidesTab.click();
      });
    });
  }

  /**
   * Render slides outline in sidebar
   */
  renderSlidesList() {
    if (!this.slidesList) return;
    this.slidesList.innerHTML = this.slides
      .map((slide, i) => `
        <div class="mb-2">
          <a href="#" data-slide="${i}" class="link-teal small ${i === this.currentSlide ? 'fw-bold' : ''}">${i + 1}. ${slide.title}</a>
        </div>
      `).join('');

    this.slidesList.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const slideIdx = parseInt(link.dataset.slide);
        this.loadSlide(slideIdx);
        // Switch back to slides tab
        const slidesTab = document.getElementById('tabSlides');
        if (slidesTab) slidesTab.click();
      });
    });

    this.renderPagerDots();
  }

  renderPagerDots() {
    const pager = document.getElementById('slidePagerDots');
    if (!pager) return;
    pager.innerHTML = '';
    const max = Math.min(this.totalSlides, 20);
    for (let i = 0; i < max; i++) {
      const dot = document.createElement('button');
      dot.className = 'net-slide-pager-dot';
      dot.title = `Slide ${i + 1}`;
      if (i === this.currentSlide) dot.classList.add('is-current');
      if (i < this.currentSlide) dot.classList.add('is-complete');
      dot.dataset.slide = String(i);
      dot.addEventListener('click', () => this.loadSlide(i));
      pager.appendChild(dot);
    }
  }

  renderTopProgress() {
    if (!this.topProgressBars) return;
    this.topProgressBars.innerHTML = '';

    const total = Math.max(1, this.totalSlides);
    for (let i = 0; i < total; i++) {
      const bar = document.createElement('div');
      bar.className = 'net-quiz-progress-bar';
      bar.dataset.index = String(i);
      this.topProgressBars.appendChild(bar);
    }

    this.updateTopProgress();
  }

  updateTopProgress() {
    if (this.topProgressText) {
      this.topProgressText.textContent = `Slide ${this.currentSlide + 1} of ${this.totalSlides}`;
    }
    if (!this.topProgressBars) return;

    const bars = this.topProgressBars.querySelectorAll('.net-quiz-progress-bar');
    bars.forEach((bar, idx) => {
      bar.classList.toggle('is-current', idx === this.currentSlide);
      bar.classList.toggle('is-complete', idx < this.currentSlide);
    });

    // Update pager dots
    const pager = document.getElementById('slidePagerDots');
    if (pager) {
      pager.querySelectorAll('.net-slide-pager-dot').forEach((dot, idx) => {
        dot.classList.toggle('is-current', idx === this.currentSlide);
        dot.classList.toggle('is-complete', idx < this.currentSlide);
      });
    }
  }

  /**
   * Launch sandbox from practice card
   */
  launchSandbox() {
    const slide = this.slides[this.currentSlide];
    const practice = slide.practice || slide.sandbox || {};
    if (practice.sandbox_task_id) {
      window.location.href = `sandbox.html?task=${practice.sandbox_task_id}`;
      return;
    }
    if (this.courseId && this.lessonNumber) {
      const params = new URLSearchParams();
      params.set('course_id', String(this.courseId));
      if (this.contentId) params.set('content_id', String(this.contentId));
      params.set('lesson', String(this.lessonNumber));
      params.set('mode', 'practice');
      window.location.href = `sandbox.html?${params.toString()}`;
    }
  }

  /**
   * Start challenge
   */
  startChallenge() {
    const slide = this.slides[this.currentSlide];
    if (slide.challenge?.challenge_id) {
      window.location.href = `sandbox.html?challenge=${slide.challenge.challenge_id}`;
      return;
    }
    if (this.courseId && this.lessonNumber) {
      const params = new URLSearchParams();
      params.set('course_id', String(this.courseId));
      if (this.contentId) params.set('content_id', String(this.contentId));
      params.set('lesson', String(this.lessonNumber));
      params.set('mode', 'challenge');
      params.set('challenge', '1');
      window.location.href = `sandbox.html?${params.toString()}`;
    }
  }

  /**
   * Award XP to student
   */
  async awardXP(amount) {
    try {
      await fetch(`${LESSON_API_BASE}/xp/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ amount, source: 'lesson_quiz', lesson_id: this.lessonId })
      });
    } catch (error) {
      console.error('Error awarding XP:', error);
    }
  }

  /**
   * Update completion percentage
   */
  updateCompletion() {
    const visited = this.currentSlide + 1;
    const percentage = Math.floor((visited / this.totalSlides) * 100);
    
    this.completionPct.textContent = percentage + '%';
    this.completionBar.style.width = percentage + '%';
    if (this.lessonProgressPct) this.lessonProgressPct.textContent = `${percentage}%`;
    
    if (percentage === 100) {
      this.statusText.textContent = 'Lesson complete! Great work.';
    } else {
      this.statusText.textContent = `${this.totalSlides - visited} slides remaining.`;
    }
  }
}

/* -- Chrome: sidebar, dropdown, identity, logout -- */
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
  const name = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : (user?.username || 'Student');
  const initial = (name || 'S').charAt(0).toUpperCase();

  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('topAvatar', initial);
  set('ddName', name);
  set('ddEmail', user?.email || '');
  set('sideAvatar', initial);
  set('sideUserName', name);
  set('sideUserEmail', user?.email || '');
}

function getCurrentUser() {
  try {
    const stored = localStorage.getItem('netology_user');
    return stored ? JSON.parse(stored) : null;
  } catch (e) { return null; }
}

function resolveCourseContent(courseId, contentId) {
  const content = (window.COURSE_CONTENT || (typeof COURSE_CONTENT !== 'undefined' ? COURSE_CONTENT : {})) || {};
  if (contentId && content[String(contentId)]) return content[String(contentId)];
  if (courseId && content[String(courseId)]) return content[String(courseId)];
  return null;
}

function getLessonByNumber(course, lessonNumber) {
  if (!course || !Array.isArray(course.units)) return null;
  let idx = 0;
  for (const unit of course.units) {
    if (!Array.isArray(unit.lessons)) continue;
    for (const lesson of unit.lessons) {
      idx += 1;
      if (idx === Number(lessonNumber)) {
        return { ...lesson, unit_title: unit.title || unit.name || 'Module' };
      }
    }
  }
  return null;
}

function buildSlidesFromLesson(lesson) {
  const slides = [];
  const introBlocks = [];

  if (lesson.learn) {
    introBlocks.push({ type: 'text', text: [lesson.learn] });
  }
  if (Array.isArray(lesson.objectives) && lesson.objectives.length) {
    introBlocks.push({ type: 'list', title: 'Objectives', items: lesson.objectives });
  }

  introBlocks.push({
    type: 'grid',
    title: 'Sandbox devices you will use',
    items: [
      { icon: 'bi-router', label: 'Router', desc: 'Default gateway and WAN routing' },
      { icon: 'bi-diagram-3', label: 'Switch', desc: 'Local LAN connectivity' },
      { icon: 'bi-pc-display', label: 'Host', desc: 'End devices on the network' },
      { icon: 'bi-shield-lock', label: 'Firewall', desc: 'Filter and protect traffic' }
    ]
  });

  introBlocks.push({
    type: 'file',
    title: 'Real config example',
    filename: 'router.conf',
    language: 'bash',
    content: [
      'interface g0/0',
      ' ip address 192.168.1.1 255.255.255.0',
      ' no shutdown',
      '!',
      'ip route 0.0.0.0 0.0.0.0 203.0.113.1'
    ].join('\\n')
  });

  introBlocks.push({
    type: 'sandbox',
    title: 'Try it in the sandbox',
    text: 'Open the sandbox and build this topology as you read.'
  });

  slides.push({
    title: lesson.title || 'Lesson Overview',
    subtitle: 'Start here',
    blocks: introBlocks
  });

  if (Array.isArray(lesson.blocks) && lesson.blocks.length) {
    lesson.blocks.forEach((block, idx) => {
      const slide = { title: block.title || `Step ${idx + 1}`, subtitle: block.type || 'Lesson step', blocks: [] };

      if (block.type === 'text') {
        slide.blocks.push({ type: 'text', text: block.text || block.content || [] });
      } else if (block.type === 'explain') {
        slide.blocks.push({ type: 'callout', title: block.title || 'Explain', content: block.content || [] });
      } else if (block.type === 'check') {
        slide.quiz = {
          question: block.question || 'Quick check',
          options: block.options || [],
          correctIndex: block.correctIndex,
          explanation: block.explanation || ''
        };
        slide.blocks.push({ type: 'callout', title: 'Quick check', content: [block.question || 'Answer the question below.'] });
      } else if (block.type === 'activity') {
        slide.blocks.push({ type: 'steps', title: block.title || 'Mini activity', steps: block.steps || [] });
        slide.blocks.push({ type: 'sandbox', title: 'Practice', text: block.prompt || 'Complete this activity in the sandbox.' });
      } else {
        slide.blocks.push({ type: 'text', text: block.content || block.text || '' });
      }

      slides.push(slide);
    });
  }

  return slides;
}

function buildCodeBlock(block) {
  const wrap = document.createElement('div');
  wrap.className = 'net-slide-block net-slide-code';

  if (block.title || block.filename) {
    const head = document.createElement('div');
    head.className = 'net-slide-code-head';
    head.textContent = block.title || block.filename || 'Code';
    wrap.appendChild(head);
  }

  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = block.content || '';
  pre.appendChild(code);
  wrap.appendChild(pre);
  return wrap;
}

function buildFileBlock(block) {
  const wrap = document.createElement('div');
  wrap.className = 'net-slide-block net-slide-file';

  const head = document.createElement('div');
  head.className = 'net-slide-file-head';
  head.innerHTML = `<i class="bi bi-file-earmark-code"></i> <span>${block.filename || 'example.conf'}</span>`;
  wrap.appendChild(head);

  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = block.content || '';
  pre.appendChild(code);
  wrap.appendChild(pre);
  return wrap;
}

// Initialize lesson viewer when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Wire up the navbar chrome
  const user = getCurrentUser();
  if (user) {
    wireChrome(user);
  }

  const viewer = new LessonViewer();

  // Get lesson ID from URL or pass it when calling from course page
  const params = new URLSearchParams(window.location.search);
  const lessonId = params.get('lesson_id') || window.currentLessonId;
  const courseId = params.get('course_id') || params.get('course');
  const lessonNumber = params.get('lesson');
  const contentId = params.get('content_id') || params.get('content');

  if (courseId) viewer.courseId = String(courseId);
  if (lessonNumber) viewer.lessonNumber = Number(lessonNumber);
  if (contentId) viewer.contentId = String(contentId);

  if (lessonId) {
    viewer.loadLesson(lessonId).then(() => {
      if (user?.email && typeof window.maybeStartOnboardingTour === "function") {
        window.maybeStartOnboardingTour("lesson", user.email);
      }
    });
  } else if (courseId && lessonNumber) {
    viewer.loadLessonFromContent(courseId, lessonNumber, contentId).then(() => {
      if (user?.email && typeof window.maybeStartOnboardingTour === "function") {
        window.maybeStartOnboardingTour("lesson", user.email);
      }
    });
  } else {
    viewer.slideContent.innerHTML = '<div class="alert alert-warning">No lesson selected.</div>';
  }

  // Make viewer globally accessible for testing/debugging
  window.lessonViewer = viewer;
});
