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
"""

from flask import Blueprint, request, jsonify
from db import get_db_connection
from xp_system import add_xp_to_user

# Blueprint for all courseAPI routes
courses = Blueprint("courses", __name__)

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
            SELECT id, title, description, total_lessons, xp_reward, difficulty, category
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
                "xp_reward": r[4],
                "difficulty": r[5],
                "category": r[6],
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
            SELECT id, title, description, total_lessons, xp_reward, difficulty, category
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
            "xp_reward": row[4],
            "difficulty": row[5],
            "category": row[6],
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
                c.id, c.title, c.description, c.total_lessons, c.xp_reward,
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
            course_id, title, desc, lessons, xp_reward, progress, completed = r

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
                "xp_reward": xp_reward,
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
"""
@courses.route("/complete-lesson", methods=["POST"])
def complete_lesson():
    """Increases lesson progress and awards XP."""
    data = request.get_json(silent=True) or request.form
    email = data.get("email")
    course_id = data.get("course_id")

    if not email or not course_id:
        return jsonify({"success": False, "message": "Email and course_id required."}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Fetch course + user progress
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

        # Calculate progress step size
        step = 100 / max(total_lessons, 1)
        new_progress = min(100, current_progress + step)
        completed_flag = new_progress >= 100

        # Ensure user_course row exists
        cur.execute("""
            INSERT INTO user_courses (user_email, course_id, progress, completed)
            VALUES (%s, %s, 0, FALSE)
            ON CONFLICT DO NOTHING;
        """, (email, course_id))

        # Update progress
        cur.execute("""
            UPDATE user_courses
               SET progress = %s, completed = %s, updated_at = CURRENT_TIMESTAMP
             WHERE user_email = %s AND course_id = %s;
        """, (new_progress, completed_flag, email, course_id))

        conn.commit()
        cur.close(); conn.close()

        # XP reward per lesson
        xp_per_lesson = xp_reward // max(total_lessons, 1)

        xp_added, new_level = add_xp_to_user(email, xp_per_lesson)

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
        xp_added, new_level = add_xp_to_user(email, xp_reward)

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
