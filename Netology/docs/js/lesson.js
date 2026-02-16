/**
 * lesson.js – Netology Interactive Lesson System
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

class LessonViewer {
  constructor() {
    this.currentSlide = 0;
    this.totalSlides = 0;
    this.slides = [];
    this.bookmarks = [];
    this.lessonId = null;
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
  }

  /**
   * Load lesson from API
   */
  async loadLesson(lessonId) {
    try {
      document.body.classList.add('net-loading');
      this.lessonId = lessonId;
      
      const response = await fetch(`${API_BASE}/lessons/${lessonId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      
      const data = await response.json();
      this.slides = data.slides || [];
      this.totalSlides = this.slides.length;
      
      this.populateLessonInfo(data);
      this.loadBookmarks();
      this.renderSlidesList();
      this.loadSlide(0);
      
      document.body.classList.remove('net-loading');
    } catch (error) {
      console.error('Error loading lesson:', error);
      this.slideContent.innerHTML = '<div class="alert alert-danger">Failed to load lesson. Please try again.</div>';
      document.body.classList.remove('net-loading');
    }
  }

  /**
   * Populate lesson metadata in sidebar
   */
  populateLessonInfo(data) {
    this.sidebarCourseName.textContent = data.course_name || 'Course';
    this.sidebarEstimatedTime.textContent = data.estimated_time || '5 min';
    this.sidebarXpReward.innerHTML = `<i class="bi bi-star-fill me-1"></i>${data.xp_reward || 50} XP`;
    
    // Set difficulty badge
    const difficultyMap = {
      'novice': '<span class="badge text-bg-success">Novice</span>',
      'intermediate': '<span class="badge text-bg-warning">Intermediate</span>',
      'advanced': '<span class="badge text-bg-danger">Advanced</span>'
    };
    this.sidebarDifficulty.innerHTML = difficultyMap[data.difficulty] || '<span class="badge text-bg-light">—</span>';
    
    // Load resources
    if (data.resources && data.resources.length > 0) {
      this.resourcesList.innerHTML = data.resources
        .map(r => `<a href="${r.url}" target="_blank" class="d-block mb-2"><i class="bi bi-link-45deg me-1"></i>${r.title}</a>`)
        .join('');
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
  }

  /**
   * Render slide content
   */
  renderSlideContent(slide) {
    if (!slide.content) {
      this.slideContent.innerHTML = '<p class="text-muted">No content available</p>';
      return;
    }
    
    this.slideContent.innerHTML = `
      <div class="slide-body">
        ${slide.content_html || `<p>${slide.content}</p>`}
        ${slide.image_url ? `<img src="${slide.image_url}" alt="Slide image" class="img-fluid mt-3 rounded">` : ''}
      </div>
    `;
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
    if (!slide.quiz) {
      this.quizCard.style.display = 'none';
      this.quizAnswered = false;
      return;
    }
    
    this.quizCard.style.display = 'block';
    this.quizAnswered = false;
    
    this.quizQuestion.textContent = slide.quiz.question;
    this.quizOptions.innerHTML = (slide.quiz.options || [])
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
    const isCorrect = answer === slide.quiz.correct_answer;
    
    this.quizFeedback.className = isCorrect ? 'alert alert-success mt-3' : 'alert alert-danger mt-3';
    this.quizFeedback.innerHTML = isCorrect 
      ? `<i class="bi bi-check-circle me-2"></i>Correct! ${slide.quiz.explanation || ''}`
      : `<i class="bi bi-x-circle me-2"></i>Not quite. ${slide.quiz.explanation || ''}`;
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
    if (!slide.practice) {
      this.practiceCard.style.display = 'none';
      return;
    }
    
    this.practiceCard.style.display = 'block';
    const xpReward = slide.practice.xp_reward || 50;
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
    if (this.bookmarks.length === 0) {
      this.bookmarksList.innerHTML = '<span class="text-muted">No bookmarks yet. Click the bookmark icon to save slides.</span>';
      return;
    }
    
    this.bookmarksList.innerHTML = this.bookmarks
      .map(idx => {
        const slide = this.slides[idx];
        return `<div class="mb-2"><a href="#" data-slide="${idx}" class="link-teal small">${idx + 1}. ${slide.title}</a></div>`;
      }).join('');
    
    this.bookmarksList.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const slideIdx = parseInt(link.dataset.slide);
        this.loadSlide(slideIdx);
      });
    });
  }

  /**
   * Render slides outline in sidebar
   */
  renderSlidesList() {
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
      });
    });
  }

  /**
   * Launch sandbox from practice card
   */
  launchSandbox() {
    const slide = this.slides[this.currentSlide];
    if (slide.practice?.sandbox_task_id) {
      window.location.href = `sandbox.html?task=${slide.practice.sandbox_task_id}`;
    }
  }

  /**
   * Start challenge
   */
  startChallenge() {
    const slide = this.slides[this.currentSlide];
    if (slide.challenge?.challenge_id) {
      window.location.href = `sandbox.html?challenge=${slide.challenge.challenge_id}`;
    }
  }

  /**
   * Award XP to student
   */
  async awardXP(amount) {
    try {
      await fetch(`${API_BASE}/xp/add`, {
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
    
    if (percentage === 100) {
      this.statusText.textContent = 'Lesson complete! Great work.';
    } else {
      this.statusText.textContent = `${this.totalSlides - visited} slides remaining.`;
    }
  }
}

// Initialize lesson viewer when page loads
document.addEventListener('DOMContentLoaded', () => {
  const viewer = new LessonViewer();
  
  // Get lesson ID from URL or pass it when calling from course page
  const params = new URLSearchParams(window.location.search);
  const lessonId = params.get('lesson_id') || window.currentLessonId;
  
  if (lessonId) {
    viewer.loadLesson(lessonId);
  }
  
  // Make viewer globally accessible for testing/debugging
  window.lessonViewer = viewer;
});
