"""
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

Python (Flask)
-------------------------------------------
course_routes.py – Handles all course backend logic.

List all courses
Get details for a single course
Load course list with user progress
Start a course
Complete a lesson (updates progress + XP)
Complete an entire course instantly

UPDATED (Part 2):
- Track lesson completion by lesson_number (optional, backwards compatible)
- Award XP for quiz completion (once per lesson)
- Award XP for sandbox challenge completion (once per lesson)
"""

from flask import Blueprint, request, jsonify
from db import get_db_connection
from xp_system import add_xp_to_user

# Blueprint for all courseAPI routes
courses = Blueprint("courses", __name__)


def _coerce_xp(value, fallback, max_xp=None):
    """Coerce XP payloads to a safe integer with optional cap."""
    try:
        xp_val = int(value)
    except (TypeError, ValueError):
        xp_val = None

    if xp_val is None or xp_val < 0:
        xp_val = int(fallback or 0)

    if max_xp is not None:
        try:
            xp_val = min(int(xp_val), int(max_xp))
        except (TypeError, ValueError):
            pass

    return int(xp_val)


"""
AI PROMPTED CODE BELOW
Can you write helper functions that create tables (if they do not exist) to store:
- completed lessons per user per course
- completed quizzes per user per course per lesson
- completed challenges per user per course per lesson
These tables should prevent duplicate completions using UNIQUE constraints.
"""

def ensure_user_lessons_table():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_lessons (
            id SERIAL PRIMARY KEY,
            user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
            course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            lesson_number INTEGER NOT NULL,
            xp_awarded INTEGER DEFAULT 0,
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_email, course_id, lesson_number)
        );
    """)
    conn.commit()
    cur.close()
    conn.close()


def ensure_user_quizzes_table():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_quizzes (
            id SERIAL PRIMARY KEY,
            user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
            course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            lesson_number INTEGER NOT NULL,
            xp_awarded INTEGER DEFAULT 0,
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_email, course_id, lesson_number)
        );
    """)
    conn.commit()
    cur.close()
    conn.close()


def ensure_user_challenges_table():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_challenges (
            id SERIAL PRIMARY KEY,
            user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
            course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            lesson_number INTEGER NOT NULL,
            xp_awarded INTEGER DEFAULT 0,
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_email, course_id, lesson_number)
        );
    """)
    conn.commit()
    cur.close()
    conn.close()


""""
AI PROMPTED CODE BELOW
Can you write a route that lists all courses from my PostgreSQL database

List All Courses
---
Returns a list of all active courses.
"""
@courses.route("/courses", methods=["GET"])
def list_courses():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, title, description, total_lessons, module_count, xp_reward, difficulty, category, required_level, estimated_time
            FROM courses
            WHERE is_active = TRUE
            ORDER BY id;
        """)

        rows = cur.fetchall()
        cur.close(); conn.close()

        # Convert rows  into JSON objects
        courses_list = [
            {
                "id": r[0],
                "title": r[1],
                "description": r[2],
                "total_lessons": r[3],
                "module_count": r[4],
                "xp_reward": r[5],
                "difficulty": r[6],
                "category": r[7],
                "required_level": r[8],
                "estimated_time": r[9],
            }
            for r in rows
        ]

        return jsonify({"success": True, "courses": courses_list})

    except Exception as e:
        print("Error listing courses:", e)
        return jsonify({"success": False, "message": "Could not load courses."}), 500


""""
AI PROMPTED CODE BELOW
Can you write a route that gets course details of a single from my PostgreSQL database

Get Course Details
---
Returns details for one Course
"""
@courses.route("/course", methods=["GET"])
def get_course():
    course_id = request.args.get("id")
    if not course_id:
        return jsonify({"success": False, "message": "Course ID required."}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, title, description, total_lessons, module_count, xp_reward, difficulty, category, required_level, estimated_time
            FROM courses
            WHERE id = %s AND is_active = TRUE;
        """, (course_id,))

        row = cur.fetchone()
        cur.close(); conn.close()

        if not row:
            return jsonify({"success": False, "message": "Course not found."}), 404

        return jsonify({
            "success": True,
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "total_lessons": row[3],
            "module_count": row[4],
            "xp_reward": row[5],
            "difficulty": row[6],
            "category": row[7],
            "required_level": row[8],
            "estimated_time": row[9],
        })

    except Exception as e:
        print("Error loading course:", e)
        return jsonify({"success": False, "message": "Error fetching course."}), 500


""""
AI PROMPTED CODE BELOW
Can you write me a route that shows all of the courses that are currently in progress for a user.

Courses with User Progress
---
Returns all courses with a user's progress (0–100%).
"""
@courses.route("/user-courses", methods=["GET"])
def user_courses():
    email = request.args.get("email")
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                c.id, c.title, c.description, c.total_lessons, c.module_count, c.xp_reward,
                c.difficulty, c.category, c.required_level, c.estimated_time,
                COALESCE(uc.progress, 0),
                COALESCE(uc.completed, FALSE)
            FROM courses c
            LEFT JOIN user_courses uc
                ON uc.course_id = c.id AND uc.user_email = %s
            WHERE c.is_active = TRUE
            ORDER BY c.id;
        """, (email,))

        rows = cur.fetchall()
        cur.close(); conn.close()

        # Convert rows to  JSON objects
        course_list = []
        for r in rows:
            course_id, title, desc, lessons, module_count, xp_reward, difficulty, category, required_level, estimated_time, progress, completed = r

            if completed:
                status = "completed"
            elif progress > 0:
                status = "in-progress"
            else:
                status = "not-started"

            course_list.append({
                "id": course_id,
                "title": title,
                "description": desc,
                "total_lessons": lessons,
                "module_count": module_count,
                "xp_reward": xp_reward,
                "difficulty": difficulty,
                "category": category,
                "required_level": required_level,
                "estimated_time": estimated_time,
                "progress_pct": int(progress),
                "status": status,
            })

        return jsonify({"success": True, "courses": course_list})

    except Exception as e:
        print("User course error:", e)
        return jsonify({"success": False, "message": "Could not load user courses."}), 500


""""
AI PROMPTED CODE BELOW
Can you write a route that allows a user to start a course in my PostgreSQL database

Start Course
---
Marks a course as started
"""
@courses.route("/start-course", methods=["POST"])
def start_course():
    data = request.get_json(silent=True) or request.form
    email = data.get("email")
    course_id = data.get("course_id")

    if not email or not course_id:
        return jsonify({"success": False, "message": "Email and course_id required."}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Insert or reset progress
        cur.execute("""
            INSERT INTO user_courses (user_email, course_id, progress, completed)
            VALUES (%s, %s, 1, FALSE)
            ON CONFLICT (user_email, course_id)
            DO UPDATE SET progress = 1, completed = FALSE, updated_at = CURRENT_TIMESTAMP;
        """, (email, course_id))

        conn.commit()
        cur.close(); conn.close()

        return jsonify({"success": True, "message": "Course started."})

    except Exception as e:
        print("Start course error:", e)
        return jsonify({"success": False, "message": "Could not start course."}), 500


""""
AI PROMPTED CODE BELOW
Can you write a route that allows a user to complete a lesson in my PostgreSQL database and uses the XP system to award XP from XP_system.py

Update courses progress
---
Increases lesson progress, makes course as complete and awards XP.

UPDATED (Backwards Compatible):
- If lesson_number is provided, we store a completion row in user_lessons to prevent duplicate XP.
- If lesson_number is NOT provided, we use the original progress step logic (your existing behavior).
"""
@courses.route("/complete-lesson", methods=["POST"])
def complete_lesson():
    """Increases lesson progress and awards XP."""
    data = request.get_json(silent=True) or request.form
    email = data.get("email")
    course_id = data.get("course_id")
    lesson_number = data.get("lesson_number")  # optional
    earned_xp = data.get("earned_xp") or data.get("xp")

    if not email or not course_id:
        return jsonify({"success": False, "message": "Email and course_id required."}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Fetch course and user progress
        cur.execute("""
            SELECT c.total_lessons, c.xp_reward,
                   COALESCE(uc.progress, 0),
                   COALESCE(uc.completed, FALSE)
            FROM courses c
            LEFT JOIN user_courses uc
                ON uc.course_id = c.id AND uc.user_email = %s
            WHERE c.id = %s;
        """, (email, course_id))

        row = cur.fetchone()

        if not row:
            cur.close(); conn.close()
            return jsonify({"success": False, "message": "Course not found."}), 404

        total_lessons, xp_reward, current_progress, completed = row

        # Ensure user_course row exists
        cur.execute("""
            INSERT INTO user_courses (user_email, course_id, progress, completed)
            VALUES (%s, %s, 0, FALSE)
            ON CONFLICT DO NOTHING;
        """, (email, course_id))

        xp_per_lesson = xp_reward // max(total_lessons, 1)
        xp_award = _coerce_xp(earned_xp, xp_per_lesson, max_xp=xp_reward)

        # --- NEW METHOD (lesson_number given): store completion and calculate progress from count ---
        if lesson_number is not None:
            ensure_user_lessons_table()

            # Try insert (only once)
            cur.execute("""
                INSERT INTO user_lessons (user_email, course_id, lesson_number, xp_awarded)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_email, course_id, lesson_number) DO NOTHING;
            """, (email, course_id, int(lesson_number), int(xp_award)))

            newly_added = (cur.rowcount == 1)

            # Count completed lessons
            cur.execute("""
                SELECT COUNT(*)
                FROM user_lessons
                WHERE user_email = %s AND course_id = %s;
            """, (email, course_id))
            completed_count = cur.fetchone()[0]

            new_progress = int((completed_count / max(total_lessons, 1)) * 100)
            completed_flag = completed_count >= total_lessons

            # Update progress
            cur.execute("""
                UPDATE user_courses
                   SET progress = %s, completed = %s, updated_at = CURRENT_TIMESTAMP
                 WHERE user_email = %s AND course_id = %s;
            """, (new_progress, completed_flag, email, course_id))

            conn.commit()
            cur.close(); conn.close()

            # Award XP only if new completion
            if newly_added:
                xp_added, new_level = add_xp_to_user(email, xp_award, action="Lesson Completed")
            else:
                xp_added, new_level = (0, 0)

            return jsonify({
                "success": True,
                "progress_pct": int(new_progress),
                "completed": completed_flag,
                "xp_added": xp_added,
                "new_level": new_level,
                "already_completed": (not newly_added)
            })

        # --- ORIGINAL METHOD (no lesson_number): keep your existing step behavior ---
        step = 100 / max(total_lessons, 1)
        new_progress = min(100, current_progress + step)
        completed_flag = new_progress >= 100

        # Update progress
        cur.execute("""
            UPDATE user_courses
               SET progress = %s, completed = %s, updated_at = CURRENT_TIMESTAMP
             WHERE user_email = %s AND course_id = %s;
        """, (new_progress, completed_flag, email, course_id))

        conn.commit()
        cur.close(); conn.close()

        xp_added, new_level = add_xp_to_user(email, xp_award, action="Lesson Completed")

        return jsonify({
            "success": True,
            "progress_pct": int(new_progress),
            "completed": completed_flag,
            "xp_added": xp_added,
            "new_level": new_level
        })

    except Exception as e:
        print("Complete lesson error:", e)
        return jsonify({"success": False, "message": "Could not update lesson."}), 500


""""
AI PROMPTED CODE BELOW
Can you write a route that awards XP when a user completes a quiz for a lesson.
The completion should be stored in the database so XP cannot be earned twice for the same quiz.

Complete Quiz
---
Marks a quiz as completed for (user, course, lesson_number) and awards XP once.
"""
@courses.route("/complete-quiz", methods=["POST"])
def complete_quiz():
    data = request.get_json(silent=True) or request.form
    email = data.get("email")
    course_id = data.get("course_id")
    lesson_number = data.get("lesson_number")
    earned_xp = data.get("earned_xp") or data.get("xp")

    if not email or not course_id or lesson_number is None:
        return jsonify({"success": False, "message": "Email, course_id and lesson_number required."}), 400

    try:
        ensure_user_quizzes_table()

        conn = get_db_connection()
        cur = conn.cursor()

        # Insert once
        xp_award = _coerce_xp(earned_xp, 5)

        cur.execute("""
            INSERT INTO user_quizzes (user_email, course_id, lesson_number, xp_awarded)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_email, course_id, lesson_number) DO NOTHING;
        """, (email, course_id, int(lesson_number), int(xp_award)))

        newly_added = (cur.rowcount == 1)

        conn.commit()
        cur.close(); conn.close()

        # Simple XP amount for quiz
        if newly_added:
            xp_added, new_level = add_xp_to_user(email, xp_award, action="Quiz Completed")
        else:
            xp_added, new_level = (0, 0)

        return jsonify({
            "success": True,
            "xp_added": xp_added,
            "new_level": new_level,
            "already_completed": (not newly_added)
        })

    except Exception as e:
        print("Complete quiz error:", e)
        return jsonify({"success": False, "message": "Could not complete quiz."}), 500


""""
AI PROMPTED CODE BELOW
Can you write a route that awards XP when a user completes a sandbox challenge for a lesson.
The completion should be stored in the database so XP cannot be earned twice for the same challenge.

Complete Challenge
---
Marks a challenge as completed for (user, course, lesson_number) and awards XP once.
"""
@courses.route("/complete-challenge", methods=["POST"])
def complete_challenge():
    data = request.get_json(silent=True) or request.form
    email = data.get("email")
    course_id = data.get("course_id")
    lesson_number = data.get("lesson_number")
    earned_xp = data.get("earned_xp") or data.get("xp")

    if not email or not course_id or lesson_number is None:
        return jsonify({"success": False, "message": "Email, course_id and lesson_number required."}), 400

    try:
        ensure_user_challenges_table()

        conn = get_db_connection()
        cur = conn.cursor()

        # Insert once
        xp_award = _coerce_xp(earned_xp, 15)

        cur.execute("""
            INSERT INTO user_challenges (user_email, course_id, lesson_number, xp_awarded)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_email, course_id, lesson_number) DO NOTHING;
        """, (email, course_id, int(lesson_number), int(xp_award)))

        newly_added = (cur.rowcount == 1)

        conn.commit()
        cur.close(); conn.close()

        # Simple XP amount for challenge
        if newly_added:
            xp_added, new_level = add_xp_to_user(email, xp_award, action="Challenge Completed")
        else:
            xp_added, new_level = (0, 0)

        return jsonify({
            "success": True,
            "xp_added": xp_added,
            "new_level": new_level,
            "already_completed": (not newly_added)
        })

    except Exception as e:
        print("Complete challenge error:", e)
        return jsonify({"success": False, "message": "Could not complete challenge."}), 500


""""
AI PROMPTED CODE BELOW
Can you write a route that allows a user to complete an entire course instantly in my PostgreSQL database and uses the XP system to award full XP from XP_system.py

Complete Course
---
Marks course as fully completed and awards full XP.
"""
@courses.route("/complete-course", methods=["POST"])
def complete_course():
    """Marks course as fully completed and awards full XP."""
    data = request.get_json(silent=True) or request.form
    email = data.get("email")
    course_id = data.get("course_id")

    if not email or not course_id:
        return jsonify({"success": False, "message": "Email and course_id required."}), 400

    try:
        # Fetch XP reward for this course
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT xp_reward FROM courses WHERE id = %s AND is_active = TRUE;", (course_id,))
        row = cur.fetchone()
        cur.close(); conn.close()

        if not row:
            return jsonify({"success": False, "message": "Course not found."}), 404

        xp_reward = row[0]

        # Award full XP
        xp_added, new_level = add_xp_to_user(email, xp_reward, action="Course Completed")

        # Mark course completed (100%)
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO user_courses (user_email, course_id, progress, completed)
            VALUES (%s, %s, 100, TRUE)
            ON CONFLICT (user_email, course_id)
            DO UPDATE SET progress = 100, completed = TRUE, updated_at = CURRENT_TIMESTAMP;
        """, (email, course_id))

        conn.commit()
        cur.close(); conn.close()

        return jsonify({
            "success": True,
            "progress_pct": 100,
            "completed": True,
            "xp_added": xp_added,
            "new_level": new_level
        })

    except Exception as e:
        print("Complete course error:", e)
        return jsonify({"success": False, "message": "Could not complete course."}), 500

""""
AI PROMPTED CODE BELOW
Can you write me a route that returns a user's completion status for a course:
- completed lesson numbers
- completed quiz lesson numbers
- completed challenge lesson numbers
So the frontend can show badges beside each lesson like Khan Academy.

User Course Status
---
GET /user-course-status?email=...&course_id=...
Returns lists of lesson_numbers the user has completed.
"""
@courses.route("/user-course-status", methods=["GET"])
def user_course_status():
    email = request.args.get("email")
    course_id = request.args.get("course_id")

    if not email or not course_id:
        return jsonify({"success": False, "message": "Email and course_id required."}), 400

    try:
        # Ensure tables exist (safe to call)
        ensure_user_lessons_table()
        ensure_user_quizzes_table()
        ensure_user_challenges_table()

        conn = get_db_connection()
        cur = conn.cursor()

        # Lessons
        cur.execute("""
            SELECT lesson_number
            FROM user_lessons
            WHERE user_email = %s AND course_id = %s
            ORDER BY lesson_number;
        """, (email, course_id))
        lessons = [r[0] for r in cur.fetchall()]

        # Quizzes
        cur.execute("""
            SELECT lesson_number
            FROM user_quizzes
            WHERE user_email = %s AND course_id = %s
            ORDER BY lesson_number;
        """, (email, course_id))
        quizzes = [r[0] for r in cur.fetchall()]

        # Challenges
        cur.execute("""
            SELECT lesson_number
            FROM user_challenges
            WHERE user_email = %s AND course_id = %s
            ORDER BY lesson_number;
        """, (email, course_id))
        challenges = [r[0] for r in cur.fetchall()]

        cur.close(); conn.close()

        return jsonify({
            "success": True,
            "lessons": lessons,
            "quizzes": quizzes,
            "challenges": challenges
        })

    except Exception as e:
        print("User course status error:", e)
        return jsonify({"success": False, "message": "Could not load course status."}), 500


"""
Recent Activity
---
GET /recent-activity?email=...&limit=...
Returns recent lesson/quiz/challenge completions with course info.
"""
@courses.route("/recent-activity", methods=["GET"])
def recent_activity():
    email = request.args.get("email")
    limit = int(request.args.get("limit") or 8)
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    try:
        ensure_user_lessons_table()
        ensure_user_quizzes_table()
        ensure_user_challenges_table()

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT 'lesson' AS kind, ul.course_id, c.title, ul.lesson_number, ul.completed_at, ul.xp_awarded
            FROM user_lessons ul
            JOIN courses c ON c.id = ul.course_id
            WHERE ul.user_email = %s
            UNION ALL
            SELECT 'quiz' AS kind, uq.course_id, c.title, uq.lesson_number, uq.completed_at, uq.xp_awarded
            FROM user_quizzes uq
            JOIN courses c ON c.id = uq.course_id
            WHERE uq.user_email = %s
            UNION ALL
            SELECT 'challenge' AS kind, uc.course_id, c.title, uc.lesson_number, uc.completed_at, uc.xp_awarded
            FROM user_challenges uc
            JOIN courses c ON c.id = uc.course_id
            WHERE uc.user_email = %s
            ORDER BY completed_at DESC
            LIMIT %s;
        """, (email, email, email, limit))

        rows = cur.fetchall()
        cur.close()
        conn.close()

        activity = []
        for r in rows:
            kind, course_id, title, lesson_number, completed_at, xp_awarded = r
            item_type = kind or "lesson"
            xp = int(xp_awarded or 0)

            activity.append({
                "type": item_type,
                "course_id": course_id,
                "course_title": title,
                "lesson_number": lesson_number,
                "xp": int(xp),
                "completed_at": completed_at.isoformat() if completed_at else None
            })

        return jsonify({"success": True, "activity": activity})

    except Exception as e:
        print("Recent activity error:", e)
        return jsonify({"success": False, "message": "Could not load recent activity."}), 500


"""
Quiz History
---
GET /quiz-history?email=...&limit=...
Returns recent quiz completions with course info.
"""
@courses.route("/quiz-history", methods=["GET"])
def quiz_history():
    email = request.args.get("email")
    limit = int(request.args.get("limit") or 10)
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    try:
        ensure_user_quizzes_table()
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT uq.course_id, c.title, uq.lesson_number, uq.completed_at
            FROM user_quizzes uq
            JOIN courses c ON c.id = uq.course_id
            WHERE uq.user_email = %s
            ORDER BY uq.completed_at DESC
            LIMIT %s;
        """, (email, limit))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        history = []
        for r in rows:
            course_id, title, lesson_number, completed_at = r
            history.append({
                "course_id": course_id,
                "course_title": title,
                "lesson_number": lesson_number,
                "completed_at": completed_at.isoformat() if completed_at else None
            })

        return jsonify({"success": True, "history": history})
    except Exception as e:
        print("Quiz history error:", e)
        return jsonify({"success": False, "message": "Could not load quiz history."}), 500

"""
User Progress Summary
---
GET /user-progress-summary?email=...
Returns total counts for lessons/quizzes/challenges and completed/in-progress courses.
Used by dashboard/account for real progress from DB.
"""
@courses.route("/user-progress-summary", methods=["GET"])
def user_progress_summary():
    email = request.args.get("email")
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    try:
        ensure_user_lessons_table()
        ensure_user_quizzes_table()
        ensure_user_challenges_table()

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM user_lessons WHERE user_email = %s", (email,))
        lessons_done = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM user_quizzes WHERE user_email = %s", (email,))
        quizzes_done = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM user_challenges WHERE user_email = %s", (email,))
        challenges_done = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM user_courses WHERE user_email = %s AND completed = TRUE", (email,))
        courses_done = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM user_courses WHERE user_email = %s AND completed = FALSE AND progress > 0", (email,))
        in_progress = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM courses WHERE is_active = TRUE")
        total_courses = cur.fetchone()[0] or 0

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "lessons_done": int(lessons_done),
            "quizzes_done": int(quizzes_done),
            "challenges_done": int(challenges_done),
            "courses_done": int(courses_done),
            "in_progress": int(in_progress),
            "total_courses": int(total_courses)
        })

    except Exception as e:
        print("User progress summary error:", e)
        return jsonify({"success": False, "message": "Could not load progress summary."}), 500
