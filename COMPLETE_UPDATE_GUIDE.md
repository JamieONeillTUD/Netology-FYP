# 🚀 NETOLOGY FYP - COMPREHENSIVE UPDATE GUIDE
## All Updates to Existing Files Only (No New Files Created)

**Date**: February 16, 2026  
**Status**: Fresh Start - Ready to Implement All Updates

---

## 📋 FILE UPDATES REQUIRED (15 Existing Files)

### ✅ STEP 1: Update `Netology/backend/netology_schema.sql`

**What to Add**: All new database tables and columns for onboarding, lesson slides, preferences, achievements, challenges, daily activity, and heatmap tracking.

**Add AFTER the users ALTER statements and BEFORE the CREATE UNIQUE INDEX lines:**

```sql
-- ONBOARDING COLUMNS (added to existing users table via ALTER)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- LESSON SLIDES SYSTEM
CREATE TABLE IF NOT EXISTS lesson_slides (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    slide_number INTEGER NOT NULL,
    slide_type VARCHAR(50) DEFAULT 'text',
    title VARCHAR(255) NOT NULL,
    content TEXT,
    code_snippet TEXT,
    code_language VARCHAR(50),
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    explanation TEXT,
    challenge_id INTEGER,
    estimated_time_seconds INTEGER DEFAULT 300,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lesson_id, slide_number),
    INDEX (lesson_id),
    INDEX (course_id)
);

CREATE TABLE IF NOT EXISTS user_slide_progress (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    slide_id INTEGER NOT NULL REFERENCES lesson_slides(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    time_spent_seconds INTEGER DEFAULT 0,
    notes TEXT,
    is_bookmarked BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_email, slide_id),
    INDEX (user_email, lesson_id),
    INDEX (completed_at)
);

CREATE TABLE IF NOT EXISTS user_slide_bookmarks (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    slide_id INTEGER NOT NULL REFERENCES lesson_slides(id) ON DELETE CASCADE,
    note TEXT,
    bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, slide_id),
    INDEX (user_email)
);

-- ONBOARDING TOUR PROGRESS
CREATE TABLE IF NOT EXISTS user_tour_progress (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL UNIQUE REFERENCES users(email) ON DELETE CASCADE,
    tour_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tour_completed BOOLEAN DEFAULT FALSE,
    current_step INTEGER DEFAULT 0,
    steps_completed INTEGER DEFAULT 0,
    tour_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_email),
    INDEX (tour_completed)
);

-- UPDATE USER PREFERENCES TABLE
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'light';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS font_preference VARCHAR(50) DEFAULT 'standard';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS reduced_motion BOOLEAN DEFAULT FALSE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;

-- ACHIEVEMENTS SYSTEM
CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    icon VARCHAR(500),
    xp_reward INTEGER DEFAULT 0,
    rarity VARCHAR(20) DEFAULT 'common',
    unlock_criteria JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DAILY ACTIVITY TRACKING (for heatmap)
CREATE TABLE IF NOT EXISTS user_daily_activity (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    xp_earned INTEGER DEFAULT 0,
    lessons_completed INTEGER DEFAULT 0,
    quizzes_completed INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    sandbox_topologies_created INTEGER DEFAULT 0,
    login_count INTEGER DEFAULT 0,
    total_minutes_spent INTEGER DEFAULT 0,
    longest_session_minutes INTEGER DEFAULT 0,
    last_activity_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_email, activity_date),
    INDEX (user_email),
    INDEX (activity_date)
);

-- CHALLENGES SYSTEM
CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50),
    difficulty VARCHAR(50),
    xp_reward INTEGER DEFAULT 50,
    required_action VARCHAR(100),
    action_target VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_challenge_progress (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    progress_percent INTEGER DEFAULT 0,
    PRIMARY KEY (user_email, challenge_id),
    INDEX (user_email),
    INDEX (completed_at)
);

-- UPDATE LESSONS TABLE
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS slide_count INTEGER DEFAULT 0;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS avg_time_seconds INTEGER DEFAULT 0;

-- SEED SAMPLE ACHIEVEMENTS
INSERT INTO achievements (id, name, description, category, rarity, unlock_criteria) VALUES
('first_lesson', 'First Steps', 'Complete your first lesson', 'Learner', 'common', '{"type": "lessons_completed", "value": 1}'),
('five_day_streak', 'On Fire!', 'Maintain a 5-day learning streak', 'Explorer', 'rare', '{"type": "streak_days", "value": 5}'),
('novice_master', 'Novice Master', 'Complete all Novice courses', 'Master', 'epic', '{"type": "courses_by_difficulty", "difficulty": "Novice", "value": 5}'),
('sandbox_builder', 'Builder', 'Create 10 sandbox topologies', 'Builder', 'rare', '{"type": "topologies_created", "value": 10}'),
('speed_learner', 'Speed Learner', 'Complete 5 lessons in one day', 'Learner', 'rare', '{"type": "lessons_per_day", "value": 5}')
ON CONFLICT DO NOTHING;

-- SEED SAMPLE CHALLENGES
INSERT INTO challenges (title, description, challenge_type, difficulty, xp_reward, required_action) VALUES
('Learn IP Addressing', 'Complete the IP Addressing course lesson', 'daily', 'easy', 25, 'complete_lesson'),
('Build a Topology', 'Create 3 different network topologies', 'daily', 'medium', 50, 'sandbox_practice'),
('Quiz Master', 'Score 100% on any quiz', 'weekly', 'hard', 100, 'quiz_score'),
('Consistency Wins', 'Log in for 7 consecutive days', 'weekly', 'medium', 75, 'daily_login'),
('All Star', 'Complete 3 courses', 'event', 'hard', 200, 'complete_courses')
ON CONFLICT DO NOTHING;
```

---

### ✅ STEP 2: Update `Netology/backend/app.py`

**Add these imports at the top after existing imports:**

```python
from datetime import datetime
import json
```

**Add this code after the `app.register_blueprint(courses)` line:**

```python
# =========================================================
# ONBOARDING ENDPOINTS
# =========================================================
@app.post('/api/onboarding/status')
def get_onboarding_status():
    """Check if user needs onboarding tour"""
    from db import get_db_connection
    
    user_email = request.json.get('user_email')
    if not user_email:
        return jsonify({'error': 'user_email required'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT is_first_login, onboarding_completed
            FROM users WHERE email = %s
        """, (user_email,))
        
        result = cur.fetchone()
        if not result:
            return jsonify({'error': 'User not found'}), 404
        
        is_first_login, onboarding_completed = result
        
        return jsonify({
            'success': True,
            'is_first_login': is_first_login,
            'onboarding_completed': onboarding_completed,
            'total_steps': 7
        })
    finally:
        cur.close()
        conn.close()

@app.get('/api/onboarding/steps')
def get_tour_steps():
    """Return all onboarding tour steps"""
    steps = [
        {"id": 1, "title": "Welcome to Netology!", "description": "Let's get you started on your learning journey.", "target": "dashboard-header", "position": "bottom"},
        {"id": 2, "title": "Your Learning Courses", "description": "Browse 9 networking courses from Novice to Advanced.", "target": "courses-section", "position": "top"},
        {"id": 3, "title": "Track Your Progress", "description": "Watch your progress grow as you complete lessons.", "target": "progress-widget", "position": "left"},
        {"id": 4, "title": "Earn Achievements", "description": "Unlock badges as you advance through the platform.", "target": "achievements-section", "position": "bottom"},
        {"id": 5, "title": "Daily Challenges", "description": "Complete challenges to earn bonus XP and streaks.", "target": "challenges-section", "position": "top"},
        {"id": 6, "title": "Practice in Sandbox", "description": "Execute real commands and build network topologies.", "target": "sandbox-link", "position": "right"},
        {"id": 7, "title": "Let's Start Learning!", "description": "Start your first lesson and begin earning XP.", "target": "first-lesson-btn", "position": "center"}
    ]
    return jsonify({'success': True, 'steps': steps, 'total_steps': len(steps)})

@app.post('/api/onboarding/start')
def start_onboarding():
    """Mark onboarding as started"""
    from db import get_db_connection
    
    user_email = request.json.get('user_email')
    if not user_email:
        return jsonify({'error': 'user_email required'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO user_tour_progress (user_email, current_step) VALUES (%s, 1)
            ON CONFLICT (user_email) DO UPDATE SET current_step = 1
        """, (user_email,))
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Tour started', 'current_step': 1})
    finally:
        cur.close()
        conn.close()

@app.post('/api/onboarding/step/<int:step_id>')
def complete_tour_step(step_id):
    """Mark a tour step as completed"""
    from db import get_db_connection
    
    user_email = request.json.get('user_email')
    if not user_email:
        return jsonify({'error': 'user_email required'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            UPDATE user_tour_progress 
            SET current_step = %s, steps_completed = steps_completed + 1
            WHERE user_email = %s
        """, (step_id, user_email))
        conn.commit()
        
        return jsonify({'success': True, 'message': f'Step {step_id} completed'})
    finally:
        cur.close()
        conn.close()

@app.post('/api/onboarding/complete')
def complete_onboarding():
    """Mark onboarding tour as complete"""
    from db import get_db_connection
    
    user_email = request.json.get('user_email')
    if not user_email:
        return jsonify({'error': 'user_email required'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Update users table
        cur.execute("""
            UPDATE users 
            SET is_first_login = FALSE, onboarding_completed = TRUE, 
                onboarding_completed_at = CURRENT_TIMESTAMP
            WHERE email = %s
        """, (user_email,))
        
        # Update tour progress
        cur.execute("""
            UPDATE user_tour_progress 
            SET tour_completed = TRUE, tour_completed_at = CURRENT_TIMESTAMP
            WHERE user_email = %s
        """, (user_email,))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'Welcome to Netology!', 'redirectTo': '/dashboard'})
    finally:
        cur.close()
        conn.close()

@app.post('/api/onboarding/skip')
def skip_onboarding():
    """Skip the onboarding tour"""
    from db import get_db_connection
    
    user_email = request.json.get('user_email')
    if not user_email:
        return jsonify({'error': 'user_email required'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            UPDATE users SET is_first_login = FALSE, onboarding_completed = TRUE
            WHERE email = %s
        """, (user_email,))
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Tour skipped'})
    finally:
        cur.close()
        conn.close()

# =========================================================
# LESSON SLIDES ENDPOINTS
# =========================================================
@app.get('/api/lessons/<int:lesson_id>/slides')
def get_lesson_slides(lesson_id):
    """Get all slides for a lesson"""
    from db import get_db_connection
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT id, slide_number, title, slide_type, estimated_time_seconds
            FROM lesson_slides 
            WHERE lesson_id = %s 
            ORDER BY slide_number
        """, (lesson_id,))
        
        slides = [{'id': r[0], 'slide_number': r[1], 'title': r[2], 'type': r[3], 'est_time': r[4]} 
                  for r in cur.fetchall()]
        
        return jsonify({'success': True, 'slides': slides, 'total': len(slides)})
    finally:
        cur.close()
        conn.close()

@app.get('/api/lessons/<int:lesson_id>/slides/<int:slide_id>')
def get_slide_content(lesson_id, slide_id):
    """Get full slide content"""
    from db import get_db_connection
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT id, slide_number, title, slide_type, content, code_snippet, 
                   code_language, image_url, video_url, explanation, estimated_time_seconds
            FROM lesson_slides 
            WHERE id = %s AND lesson_id = %s
        """, (slide_id, lesson_id))
        
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Slide not found'}), 404
        
        slide = {
            'id': row[0], 'slide_number': row[1], 'title': row[2], 'type': row[3],
            'content': row[4], 'code_snippet': row[5], 'code_language': row[6],
            'image_url': row[7], 'video_url': row[8], 'explanation': row[9],
            'estimated_time': row[10]
        }
        
        return jsonify({'success': True, 'slide': slide})
    finally:
        cur.close()
        conn.close()

@app.post('/api/lessons/<int:lesson_id>/slides/<int:slide_id>/view')
def view_slide(lesson_id, slide_id):
    """Mark slide as viewed"""
    return jsonify({'success': True, 'message': 'Slide viewed'})

@app.post('/api/lessons/<int:lesson_id>/slides/<int:slide_id>/complete')
def complete_slide(lesson_id, slide_id):
    """Mark slide as complete and award XP"""
    from db import get_db_connection
    from xp_system import add_xp_to_user
    
    data = request.json
    user_email = data.get('user_email')
    time_spent = data.get('time_spent_seconds', 0)
    notes = data.get('notes', '')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Insert/update progress
        cur.execute("""
            INSERT INTO user_slide_progress (user_email, slide_id, lesson_id, time_spent_seconds, notes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_email, slide_id) DO UPDATE 
            SET completed_at = CURRENT_TIMESTAMP, time_spent_seconds = %s
        """, (user_email, slide_id, lesson_id, time_spent, notes, time_spent))
        
        conn.commit()
        
        # Award XP
        xp_awarded = 5
        add_xp_to_user(user_email, xp_awarded, f'Completed slide {slide_id} of lesson {lesson_id}')
        
        return jsonify({'success': True, 'xp_awarded': xp_awarded})
    finally:
        cur.close()
        conn.close()

@app.get('/api/lessons/<int:lesson_id>/progress')
def get_lesson_progress(lesson_id):
    """Get lesson completion progress"""
    from db import get_db_connection
    
    user_email = request.args.get('user_email')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get total slides
        cur.execute("SELECT COUNT(*) FROM lesson_slides WHERE lesson_id = %s", (lesson_id,))
        total = cur.fetchone()[0]
        
        # Get completed slides
        cur.execute("""
            SELECT COUNT(*) FROM user_slide_progress 
            WHERE lesson_id = %s AND user_email = %s AND completed_at IS NOT NULL
        """, (lesson_id, user_email))
        completed = cur.fetchone()[0]
        
        percent = int((completed / total * 100)) if total > 0 else 0
        
        return jsonify({
            'success': True,
            'lesson_id': lesson_id,
            'slides_total': total,
            'slides_completed': completed,
            'percent_complete': percent
        })
    finally:
        cur.close()
        conn.close()

@app.post('/api/slides/<int:slide_id>/bookmark')
def toggle_bookmark(slide_id):
    """Toggle bookmark on a slide"""
    from db import get_db_connection
    
    user_email = request.json.get('user_email')
    note = request.json.get('note', '')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO user_slide_bookmarks (user_email, slide_id, note)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_email, slide_id) DO DELETE
        """, (user_email, slide_id, note))
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Bookmark toggled'})
    finally:
        cur.close()
        conn.close()

@app.get('/api/user/bookmarks')
def get_user_bookmarks():
    """Get all user bookmarks"""
    from db import get_db_connection
    
    user_email = request.args.get('user_email')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT ls.id, ls.title, ls.slide_number, ls.lesson_id, usb.note
            FROM user_slide_bookmarks usb
            JOIN lesson_slides ls ON usb.slide_id = ls.id
            WHERE usb.user_email = %s
            ORDER BY usb.bookmarked_at DESC
        """, (user_email,))
        
        bookmarks = [{'slide_id': r[0], 'title': r[1], 'slide_number': r[2], 'lesson_id': r[3], 'note': r[4]} 
                     for r in cur.fetchall()]
        
        return jsonify({'success': True, 'bookmarks': bookmarks})
    finally:
        cur.close()
        conn.close()

@app.post('/api/slides/<int:slide_id>/notes')
def save_slide_notes(slide_id):
    """Save notes on a slide"""
    from db import get_db_connection
    
    user_email = request.json.get('user_email')
    note_text = request.json.get('note_text', '')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            UPDATE user_slide_progress 
            SET notes = %s 
            WHERE user_email = %s AND slide_id = %s
        """, (note_text, user_email, slide_id))
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Notes saved'})
    finally:
        cur.close()
        conn.close()

# =========================================================
# PROGRESS ENDPOINTS
# =========================================================
@app.get('/api/user/progress')
def get_user_progress():
    """Get user's learning progress with filtering"""
    from db import get_db_connection
    
    user_email = request.args.get('user_email')
    filter_type = request.args.get('filter', 'all')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get in-progress courses
        cur.execute("""
            SELECT uc.course_id, c.title, uc.progress, uc.started_at
            FROM user_courses uc
            JOIN courses c ON uc.course_id = c.id
            WHERE uc.user_email = %s AND uc.completed = FALSE
            ORDER BY uc.updated_at DESC
        """, (user_email,))
        
        in_progress = [{'id': r[0], 'title': r[1], 'progress': r[2], 'started': str(r[3])} 
                       for r in cur.fetchall()]
        
        # Get completed courses
        cur.execute("""
            SELECT uc.course_id, c.title, uc.completed_at
            FROM user_courses uc
            JOIN courses c ON uc.course_id = c.id
            WHERE uc.user_email = %s AND uc.completed = TRUE
            ORDER BY uc.completed_at DESC
        """, (user_email,))
        
        completed = [{'id': r[0], 'title': r[1], 'completed': str(r[2])} 
                     for r in cur.fetchall()]
        
        return jsonify({
            'success': True,
            'in_progress': in_progress,
            'completed': completed,
            'filter': filter_type
        })
    finally:
        cur.close()
        conn.close()

@app.get('/api/user/progress/stats')
def get_progress_stats():
    """Get user progress statistics"""
    from db import get_db_connection
    from xp_system import get_level_progress
    
    user_email = request.args.get('user_email')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get user XP and level
        cur.execute("SELECT xp FROM users WHERE email = %s", (user_email,))
        total_xp = cur.fetchone()[0] if cur.fetchone() else 0
        
        level, xp_into_level, next_level_xp = get_level_progress(total_xp)
        
        # Get course stats
        cur.execute("""
            SELECT COUNT(*) as started,
                   SUM(CASE WHEN completed THEN 1 ELSE 0 END) as finished
            FROM user_courses WHERE user_email = %s
        """, (user_email,))
        
        courses_started, courses_completed = cur.fetchone()
        courses_completed = courses_completed or 0
        
        # Get lesson count
        cur.execute("""
            SELECT COUNT(*) FROM user_lessons WHERE user_email = %s
        """, (user_email,))
        
        lessons_completed = cur.fetchone()[0]
        
        # Get achievements
        cur.execute("""
            SELECT COUNT(*) FROM user_achievements WHERE user_email = %s
        """, (user_email,))
        
        achievements = cur.fetchone()[0]
        
        return jsonify({
            'success': True,
            'total_xp': total_xp,
            'current_level': level,
            'xp_to_next_level': next_level_xp,
            'courses_started': courses_started,
            'courses_completed': courses_completed,
            'lessons_completed': lessons_completed,
            'achievements_earned': achievements
        })
    finally:
        cur.close()
        conn.close()

# =========================================================
# CHALLENGES & ACHIEVEMENTS ENDPOINTS
# =========================================================
@app.get('/api/user/challenges')
def get_user_challenges():
    """Get daily/weekly challenges for user"""
    from db import get_db_connection
    
    user_email = request.args.get('user_email')
    challenge_type = request.args.get('type', 'daily')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT c.id, c.title, c.description, c.xp_reward, c.challenge_type,
                   COALESCE(ucp.progress_percent, 0) as progress
            FROM challenges c
            LEFT JOIN user_challenge_progress ucp 
                ON c.id = ucp.challenge_id AND ucp.user_email = %s
            WHERE c.challenge_type = %s AND c.is_active = TRUE
            LIMIT 5
        """, (user_email, challenge_type))
        
        challenges = [{'id': r[0], 'title': r[1], 'description': r[2], 'xp': r[3], 'type': r[4], 'progress': r[5]} 
                      for r in cur.fetchall()]
        
        return jsonify({'success': True, 'challenges': challenges})
    finally:
        cur.close()
        conn.close()

@app.get('/api/user/achievements')
def get_user_achievements():
    """Get user's achievements"""
    from db import get_db_connection
    
    user_email = request.args.get('user_email')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get unlocked achievements
        cur.execute("""
            SELECT a.id, a.name, a.description, a.rarity, a.icon
            FROM achievements a
            JOIN user_achievements ua ON a.id = ua.achievement_id
            WHERE ua.user_email = %s
            ORDER BY ua.earned_at DESC
        """, (user_email,))
        
        unlocked = [{'id': r[0], 'name': r[1], 'description': r[2], 'rarity': r[3], 'icon': r[4]} 
                    for r in cur.fetchall()]
        
        # Get all achievements for locked status
        cur.execute("""
            SELECT id, name, description, rarity, icon
            FROM achievements
            WHERE id NOT IN (
                SELECT achievement_id FROM user_achievements WHERE user_email = %s
            )
        """, (user_email,))
        
        locked = [{'id': r[0], 'name': r[1], 'description': r[2], 'rarity': r[3], 'icon': r[4]} 
                  for r in cur.fetchall()]
        
        return jsonify({
            'success': True,
            'unlocked': unlocked,
            'locked': locked,
            'total_unlocked': len(unlocked),
            'total_available': len(unlocked) + len(locked)
        })
    finally:
        cur.close()
        conn.close()

# =========================================================
# USER PREFERENCES ENDPOINTS
# =========================================================
@app.get('/api/user/preferences')
def get_user_preferences():
    """Get user preferences"""
    from db import get_db_connection
    
    user_email = request.args.get('user_email')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT theme, font_preference, notifications_enabled, reduced_motion
            FROM user_preferences
            WHERE user_email = %s
        """, (user_email,))
        
        row = cur.fetchone()
        if not row:
            return jsonify({
                'success': True,
                'theme': 'light',
                'font_preference': 'standard',
                'notifications_enabled': True,
                'reduced_motion': False
            })
        
        return jsonify({
            'success': True,
            'theme': row[0],
            'font_preference': row[1],
            'notifications_enabled': row[2],
            'reduced_motion': row[3]
        })
    finally:
        cur.close()
        conn.close()

@app.post('/api/user/preferences')
def update_user_preferences():
    """Update user preferences"""
    from db import get_db_connection
    
    user_email = request.json.get('user_email')
    theme = request.json.get('theme', 'light')
    font = request.json.get('font_preference', 'standard')
    notifications = request.json.get('notifications_enabled', True)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO user_preferences (user_email, theme, font_preference, notifications_enabled)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_email) DO UPDATE
            SET theme = %s, font_preference = %s, notifications_enabled = %s
        """, (user_email, theme, font, notifications, theme, font, notifications))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'Preferences updated'})
    finally:
        cur.close()
        conn.close()

# =========================================================
# ACTIVITY HEATMAP ENDPOINTS
# =========================================================
@app.get('/api/user/activity')
def get_user_activity():
    """Get daily activity for heatmap"""
    from db import get_db_connection
    
    user_email = request.args.get('user_email')
    range_days = request.args.get('range', '365')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT activity_date, xp_earned, lessons_completed, login_count
            FROM user_daily_activity
            WHERE user_email = %s 
            AND activity_date >= CURRENT_DATE - INTERVAL '%s days'
            ORDER BY activity_date
        """, (user_email, range_days))
        
        activity = [{'date': str(r[0]), 'xp': r[1], 'lessons': r[2], 'logins': r[3]} 
                    for r in cur.fetchall()]
        
        return jsonify({'success': True, 'activity': activity})
    finally:
        cur.close()
        conn.close()

@app.get('/api/user/streaks')
def get_user_streaks():
    """Get user's current and longest streak"""
    from db import get_db_connection
    from datetime import datetime, timedelta
    
    user_email = request.args.get('user_email')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get login dates
        cur.execute("""
            SELECT login_date FROM user_logins 
            WHERE user_email = %s 
            ORDER BY login_date DESC
            LIMIT 365
        """, (user_email,))
        
        dates = [r[0] for r in cur.fetchall()]
        
        if not dates:
            return jsonify({'success': True, 'current_streak': 0, 'longest_streak': 0})
        
        # Calculate current streak
        today = datetime.now().date()
        current_streak = 0
        check_date = today
        
        for date in dates:
            if date == check_date:
                current_streak += 1
                check_date -= timedelta(days=1)
            else:
                break
        
        # Longest streak (simplified)
        longest_streak = current_streak
        
        return jsonify({
            'success': True,
            'current_streak': current_streak,
            'longest_streak': longest_streak,
            'last_login': str(dates[0]) if dates else None
        })
    finally:
        cur.close()
        conn.close()

# =========================================================
# SANDBOX COMMAND EXECUTION ENDPOINTS
# =========================================================
@app.post('/api/sandbox/execute-command')
def execute_sandbox_command():
    """Execute whitelisted network commands"""
    import subprocess
    
    command = request.json.get('command', '').lower().strip()
    args = request.json.get('args', [])
    
    ALLOWED_COMMANDS = {
        'ping': ['ping', '-c', '4'],
        'ipconfig': ['ipconfig'],
        'ifconfig': ['ifconfig'],
        'traceroute': ['traceroute'],
        'nslookup': ['nslookup'],
        'whoami': ['whoami'],
        'hostname': ['hostname'],
        'netstat': ['netstat'],
        'arp': ['arp', '-a'],
    }
    
    if command not in ALLOWED_COMMANDS:
        return jsonify({'error': f'Command "{command}" not allowed'}), 403
    
    # Validate args (prevent injection)
    dangerous_chars = [';', '|', '>', '<', '&', '$', '`', '\n']
    for arg in args:
        for char in dangerous_chars:
            if char in arg:
                return jsonify({'error': 'Invalid arguments'}), 400
    
    try:
        full_cmd = ALLOWED_COMMANDS[command] + args
        result = subprocess.run(full_cmd, capture_output=True, text=True, timeout=10)
        
        return jsonify({
            'success': True,
            'output': result.stdout,
            'error': result.stderr,
            'exit_code': result.returncode,
            'command': command
        })
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Command timed out'}), 504
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.get('/api/sandbox/allowed-commands')
def get_allowed_commands():
    """Return list of allowed sandbox commands"""
    commands = ['ping', 'ipconfig', 'ifconfig', 'traceroute', 'nslookup', 'whoami', 'hostname', 'netstat', 'arp']
    return jsonify({'success': True, 'commands': commands})
```

---

### ✅ STEP 3: Update `Netology/backend/auth_routes.py`

**After the login endpoint, add this onboarding detection:**

```python
# After successful login, add this before the return statement:
is_first_login = user.get('is_first_login', True)
onboarding_completed = user.get('onboarding_completed', False)

# Return includes onboarding status
response['is_first_login'] = is_first_login
response['onboarding_completed'] = onboarding_completed
```

---

### ✅ STEP 4: Update `Netology/docs/css/style.css`

**Add at the END of the file:**

```css
/* ============================================
   ONBOARDING & TOUR STYLES
   ============================================ */

.onboarding-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  z-index: 9998;
  animation: fadeIn 0.3s ease-in-out;
}

.onboarding-spotlight {
  position: fixed;
  border: 3px solid #00bcd4;
  border-radius: 8px;
  box-shadow: 0 0 30px rgba(0, 188, 212, 0.6);
  z-index: 9999;
  pointer-events: none;
  animation: spotlightPulse 2s ease-in-out infinite;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.onboarding-tooltip {
  position: fixed;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  max-width: 350px;
  animation: tooltipSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.onboarding-tooltip h3 {
  margin: 0 0 8px 0;
  color: #00bcd4;
  font-size: 18px;
  font-weight: 600;
}

.btn-tour,
.btn-tour-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-tour {
  background: #00bcd4;
  color: white;
}

.btn-tour:hover {
  background: #00a8c9;
  transform: translateY(-1px);
}

.btn-tour-secondary {
  background: #f0f0f0;
  color: #666;
}

/* ============================================
   DARK MODE THEME VARIABLES
   ============================================ */

:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #000000;
  --text-secondary: #666666;
  --accent: #00bcd4;
  --border: #ddd;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2d2d2d;
    --text-primary: #ffffff;
    --text-secondary: #aaaaaa;
    --accent: #00d9e9;
    --border: #444;
  }
}

body.dark-mode {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #aaaaaa;
  --border: #444;
}

body.light-mode {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #000000;
  --text-secondary: #666666;
  --border: #ddd;
}

/* ============================================
   ANIMATIONS
   ============================================ */

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes spotlightPulse {
  0% { box-shadow: 0 0 20px rgba(0, 188, 212, 0.4); }
  50% { box-shadow: 0 0 40px rgba(0, 188, 212, 0.8); }
  100% { box-shadow: 0 0 20px rgba(0, 188, 212, 0.4); }
}

@keyframes tooltipSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ============================================
   DYSLEXIA FRIENDLY FONT
   ============================================ */

@font-face {
  font-family: 'OpenDyslexic';
  src: url('https://cdn.jsdelivr.net/npm/opendyslexic@2.0.0/OpenDyslexic-Regular.otf') format('opentype');
}

body.dyslexic-font {
  font-family: 'OpenDyslexic', sans-serif;
  letter-spacing: 0.05em;
}

/* ============================================
   ACCESSIBLE COLOR CONTRAST
   ============================================ */

@media (prefers-contrast: more) {
  .onboarding-spotlight {
    border-color: #00d9e9;
    box-shadow: 0 0 50px rgba(0, 217, 233, 0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

---

### ✅ STEP 5: Update `Netology/docs/js/app.js`

**Add this code after the login function completes, before redirecting to dashboard:**

```javascript
// After successful login, check for onboarding
async function checkAndStartOnboarding(userEmail) {
  try {
    const response = await fetch('/api/onboarding/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: userEmail })
    });
    
    const data = await response.json();
    
    if (data.is_first_login && !data.onboarding_completed) {
      // Start the tour
      startOnboardingTour(userEmail);
    } else {
      // Go to dashboard
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('Onboarding check failed:', error);
    window.location.href = '/dashboard';
  }
}

// Onboarding Tour Implementation
class OnboardingTour {
  constructor(userEmail) {
    this.userEmail = userEmail;
    this.steps = [];
    this.currentStepIndex = 0;
    this.isActive = false;
    this.spotlightElement = null;
    this.backdropElement = null;
    this.tooltipElement = null;
  }

  async init() {
    try {
      const response = await fetch('/api/onboarding/steps');
      const data = await response.json();
      this.steps = data.steps;
      
      await fetch('/api/onboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: this.userEmail })
      });
      
      this.isActive = true;
      this.createBackdrop();
      this.createSpotlight();
      this.createTooltip();
      this.showStep(0);
    } catch (error) {
      console.error('Onboarding init failed:', error);
    }
  }

  createBackdrop() {
    this.backdropElement = document.createElement('div');
    this.backdropElement.className = 'onboarding-backdrop';
    document.body.appendChild(this.backdropElement);
  }

  createSpotlight() {
    this.spotlightElement = document.createElement('div');
    this.spotlightElement.className = 'onboarding-spotlight';
    document.body.appendChild(this.spotlightElement);
  }

  createTooltip() {
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'onboarding-tooltip';
    document.body.appendChild(this.tooltipElement);
  }

  showStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.steps.length) return;
    
    this.currentStepIndex = stepIndex;
    const step = this.steps[stepIndex];
    
    const targetElement = document.querySelector(`[data-tour="${step.target}"]`);
    if (!targetElement) return;
    
    this.updateSpotlight(targetElement);
    this.updateTooltip(step, targetElement);
  }

  updateSpotlight(element) {
    const rect = element.getBoundingClientRect();
    const padding = 8;
    
    this.spotlightElement.style.top = (rect.top - padding) + 'px';
    this.spotlightElement.style.left = (rect.left - padding) + 'px';
    this.spotlightElement.style.width = (rect.width + padding * 2) + 'px';
    this.spotlightElement.style.height = (rect.height + padding * 2) + 'px';
  }

  updateTooltip(step, targetElement) {
    const rect = targetElement.getBoundingClientRect();
    
    let html = `
      <h3>${step.title}</h3>
      <p>${step.description}</p>
      <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
        <span style="font-size: 12px; color: #999;">Step ${this.currentStepIndex + 1} of ${this.steps.length}</span>
        ${this.currentStepIndex > 0 ? '<button class="btn-tour-secondary" onclick="window.onboardingTour.prevStep()">← Back</button>' : ''}
        <button class="btn-tour-secondary" onclick="window.onboardingTour.skipTour()">Skip</button>
        ${this.currentStepIndex < this.steps.length - 1 
          ? '<button class="btn-tour" onclick="window.onboardingTour.nextStep()">Next →</button>'
          : '<button class="btn-tour" onclick="window.onboardingTour.completeTour()">Finish! 🎉</button>'}
      </div>
    `;
    
    this.tooltipElement.innerHTML = html;
    
    // Position tooltip
    const gap = 20;
    let top = rect.bottom + gap;
    let left = rect.left + rect.width / 2 - this.tooltipElement.offsetWidth / 2;
    
    if (left + this.tooltipElement.offsetWidth > window.innerWidth) {
      left = window.innerWidth - this.tooltipElement.offsetWidth - 16;
    }
    if (left < 0) left = 16;
    
    this.tooltipElement.style.top = top + 'px';
    this.tooltipElement.style.left = left + 'px';
  }

  nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.showStep(this.currentStepIndex + 1);
    }
  }

  prevStep() {
    if (this.currentStepIndex > 0) {
      this.showStep(this.currentStepIndex - 1);
    }
  }

  async completeTour() {
    await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: this.userEmail })
    });
    
    this.closeTour();
    window.location.href = '/dashboard';
  }

  async skipTour() {
    if (confirm('Skip the onboarding tour?')) {
      await fetch('/api/onboarding/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: this.userEmail })
      });
      
      this.closeTour();
      window.location.href = '/dashboard';
    }
  }

  closeTour() {
    this.isActive = false;
    if (this.backdropElement) this.backdropElement.remove();
    if (this.spotlightElement) this.spotlightElement.remove();
    if (this.tooltipElement) this.tooltipElement.remove();
  }
}

// Make tour available globally
function startOnboardingTour(userEmail) {
  window.onboardingTour = new OnboardingTour(userEmail);
  window.onboardingTour.init();
}
```

---

### ✅ STEPS 6-15: HTML & Frontend Files

**Continue in next message with updates to:**
- `dashboard.html` - Add data-tour attributes
- `progress.html` - Complete redesign with filters
- `courses.html` - Add slide-based format
- `account.html` - Settings redesign
- `lesson.html` - Slide viewer
- `sandbox.html` - Real command execution
- `index.html`, `login.html`, `signup.html` - Visual refresh

---

## 📝 SUMMARY

✅ Database schema updated (single file)  
✅ Backend endpoints added (single file)  
✅ Authentication onboarding added (single file)  
✅ CSS styling with dark mode (single file)  
✅ JavaScript onboarding logic (single file)  

**Next: HTML/frontend updates**

Ready for Step 6+?
