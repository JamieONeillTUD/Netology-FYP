"""
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

Python (Flask)
-------------------------------------------
app.py – Main entry point for backend server.
"""

import os
from flask import Flask, redirect, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime
import json

from auth_routes import auth, bcrypt as auth_bcrypt
from course_routes import courses

load_dotenv()

# =========================================================
# App setup
# =========================================================
app = Flask(
    __name__,
    static_folder="../docs",  # your frontend folder
    static_url_path=""        # serve static at /
)

# =========================================================
# CORS configuration
# =========================================================
# Allow both GitHub Pages + your Render domain.
# (You can tighten this later if you want.)
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://jamieoneilltud.github.io",
            "https://netology-fyp.onrender.com"
        ]
    }
})

# =========================================================
# Auth + Blueprints
# =========================================================
auth_bcrypt.init_app(app)

app.register_blueprint(auth)
app.register_blueprint(courses)  # /courses routes

# Topology routes (optional: don't crash if file is missing)
try:
    from topology_routes import topology
    app.register_blueprint(topology)  # /topology routes
except Exception as e:
    print("WARNING: topology_routes not loaded:", e)

# =========================================================
# Core routes
# =========================================================
@app.route("/")
def home():
    return redirect("/index.html")

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
        cur.execute("""
            UPDATE users 
            SET is_first_login = FALSE, onboarding_completed = TRUE, 
                onboarding_completed_at = CURRENT_TIMESTAMP
            WHERE email = %s
        """, (user_email,))
        
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
        cur.execute("""
            INSERT INTO user_slide_progress (user_email, slide_id, lesson_id, time_spent_seconds, notes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_email, slide_id) DO UPDATE 
            SET completed_at = CURRENT_TIMESTAMP, time_spent_seconds = %s
        """, (user_email, slide_id, lesson_id, time_spent, notes, time_spent))
        
        conn.commit()
        
        xp_awarded = 5
        add_xp_to_user(user_email, xp_awarded, f'Completed slide {slide_id}')
        
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
        cur.execute("SELECT COUNT(*) FROM lesson_slides WHERE lesson_id = %s", (lesson_id,))
        total = cur.fetchone()[0]
        
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
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT uc.course_id, c.title, uc.progress, uc.started_at
            FROM user_courses uc
            JOIN courses c ON uc.course_id = c.id
            WHERE uc.user_email = %s AND uc.completed = FALSE
            ORDER BY uc.updated_at DESC
        """, (user_email,))
        
        in_progress = [{'id': r[0], 'title': r[1], 'progress': r[2], 'started': str(r[3])} 
                       for r in cur.fetchall()]
        
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
            'completed': completed
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
        cur.execute("SELECT xp FROM users WHERE email = %s", (user_email,))
        total_xp = cur.fetchone()[0] if cur.fetchone() else 0
        
        level, xp_into_level, next_level_xp = get_level_progress(total_xp)
        
        cur.execute("""
            SELECT COUNT(*) as started,
                   SUM(CASE WHEN completed THEN 1 ELSE 0 END) as finished
            FROM user_courses WHERE user_email = %s
        """, (user_email,))
        
        courses_started, courses_completed = cur.fetchone()
        courses_completed = courses_completed or 0
        
        cur.execute("""
            SELECT COUNT(*) FROM user_lessons WHERE user_email = %s
        """, (user_email,))
        
        lessons_completed = cur.fetchone()[0]
        
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

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Ensure tables exist
        cur.execute("""
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
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_challenge_progress (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                challenge_id INTEGER NOT NULL,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                progress_percent INTEGER DEFAULT 0,
                UNIQUE (user_email, challenge_id)
            )
        """)
        conn.commit()

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
    except Exception as e:
        print(f"Challenges endpoint error: {e}")
        return jsonify({'success': False, 'challenges': [], 'message': str(e)}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

@app.get('/api/user/achievements')
def get_user_achievements():
    """Get user's achievements"""
    from db import get_db_connection

    user_email = request.args.get('user_email')

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT a.id, a.name, a.description, a.rarity, a.icon
            FROM achievements a
            JOIN user_achievements ua ON a.id = ua.achievement_id
            WHERE ua.user_email = %s
            ORDER BY ua.earned_at DESC
        """, (user_email,))

        unlocked = [{'id': r[0], 'name': r[1], 'description': r[2], 'rarity': r[3], 'icon': r[4]}
                    for r in cur.fetchall()]

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
    except Exception as e:
        print(f"Achievements endpoint error: {e}")
        return jsonify({'success': False, 'unlocked': [], 'locked': [], 'message': str(e)}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

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
        cur.execute("""
            SELECT login_date FROM user_logins 
            WHERE user_email = %s 
            ORDER BY login_date DESC
            LIMIT 365
        """, (user_email,))
        
        dates = [r[0] for r in cur.fetchall()]
        
        if not dates:
            return jsonify({'success': True, 'current_streak': 0, 'longest_streak': 0})
        
        today = datetime.now().date()
        current_streak = 0
        check_date = today
        
        for date in dates:
            if date == check_date:
                current_streak += 1
                check_date -= timedelta(days=1)
            else:
                break
        
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

@app.get("/healthz")
def healthz():
    return {"ok": True}

# =========================================================
# Run server (Render fix)
# =========================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
