"""
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

Python (Flask) – Netology Learning Platform
-------------------------------------------
course_routes.py – Handles all course and progress routes.
Includes:
  - List all courses
  - Get course details
  - Track and update user course progress
  - Integrates with xp_system.py for XP and level updates
"""

from flask import Blueprint, request, jsonify
from db import get_db_connection
from xp_system import add_xp_to_user  # XP updates handled externally

courses = Blueprint("courses", __name__)

# =====================================================
# 1. LIST ALL COURSES
# =====================================================
@courses.route("/courses", methods=["GET"])
def list_courses():
    """Return all active courses from the database."""
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

        data = [{
            "id": r[0],
            "title": r[1],
            "description": r[2],
            "total_lessons": r[3],
            "xp_reward": r[4],
            "difficulty": r[5],
            "category": r[6],
        } for r in rows]

        return jsonify({"success": True, "courses": data})
    except Exception as e:
        print("Error listing courses:", e)
        return jsonify({"success": False, "message": "Error loading courses."}), 500


# =====================================================
# 2. GET SINGLE COURSE DETAILS
# =====================================================
@courses.route("/course", methods=["GET"])
def get_course():
    """Get full details for one course by ID."""
    course_id = request.args.get("id")
    if not course_id:
        return jsonify({"success": False, "message": "Course ID required."}), 400

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


# =====================================================
# 3. USER COURSES (with progress)
# =====================================================
@courses.route("/user-courses", methods=["GET"])
def user_courses():
    """Return all courses with the user's progress."""
    email = request.args.get("email")
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT
            c.id, c.title, c.description, c.total_lessons, c.xp_reward,
            COALESCE(uc.progress, 0) AS progress,
            COALESCE(uc.completed, FALSE) AS completed
        FROM courses c
        LEFT JOIN user_courses uc
          ON uc.course_id = c.id AND uc.user_email = %s
        WHERE c.is_active = TRUE
        ORDER BY c.id;
    """, (email,))
    rows = cur.fetchall()
    cur.close(); conn.close()

    courses_list = []
    for r in rows:
        cid, title, desc, lessons, xp_reward, progress, completed = r
        if completed:
            status = "completed"
        elif progress > 0:
            status = "in-progress"
        else:
            status = "not-started"

        courses_list.append({
            "id": cid,
            "title": title,
            "description": desc,
            "total_lessons": lessons,
            "xp_reward": xp_reward,
            "progress_pct": int(progress),
            "status": status,
        })

    return jsonify({"success": True, "courses": courses_list})


# =====================================================
# 4. START COURSE
# =====================================================
@courses.route("/start-course", methods=["POST"])
def start_course():
    """Marks a course as started for a user."""
    data = request.get_json(silent=True) or request.form
    email = data.get("email")
    course_id = data.get("course_id")

    if not email or not course_id:
        return jsonify({"success": False, "message": "Email and course_id required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # Add or reset entry in user_courses
    cur.execute("""
        INSERT INTO user_courses (user_email, course_id, progress, completed)
        VALUES (%s, %s, 1, FALSE)
        ON CONFLICT (user_email, course_id)
        DO UPDATE SET progress = 1, completed = FALSE, updated_at = CURRENT_TIMESTAMP;
    """, (email, course_id))

    conn.commit()
    cur.close(); conn.close()

    return jsonify({"success": True, "message": "Course started."})


# =====================================================
# 5. COMPLETE LESSON (adds XP via xp_system.py)
# =====================================================
@courses.route("/complete-lesson", methods=["POST"])
def complete_lesson():
    """Updates progress when user completes a lesson."""
    data = request.get_json(silent=True) or request.form
    email = data.get("email")
    course_id = data.get("course_id")

    if not email or not course_id:
        return jsonify({"success": False, "message": "Email and course_id required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # Get course info + user progress
    cur.execute("""
        SELECT c.total_lessons, c.xp_reward,
               COALESCE(uc.progress, 0) AS progress,
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

    # Calculate next progress
    step = 100 / (total_lessons or 1)
    new_progress = min(100, current_progress + step)
    is_completed = new_progress >= 100

    # Update user_courses
    cur.execute("""
        INSERT INTO user_courses (user_email, course_id, progress, completed)
        VALUES (%s, %s, 0, FALSE)
        ON CONFLICT DO NOTHING;
    """, (email, course_id))

    cur.execute("""
        UPDATE user_courses
           SET progress = %s, completed = %s, updated_at = CURRENT_TIMESTAMP
         WHERE user_email = %s AND course_id = %s;
    """, (new_progress, is_completed, email, course_id))

    conn.commit()
    cur.close(); conn.close()

    # Update XP through xp_system
    xp_added, new_level = add_xp_to_user(email, xp_reward // (total_lessons or 1))

    return jsonify({
        "success": True,
        "progress_pct": int(new_progress),
        "completed": is_completed,
        "xp_added": xp_added,
        "new_level": new_level
    })


# =====================================================
# 6. COMPLETE WHOLE COURSE (instant XP award)
# =====================================================
@courses.route("/complete-course", methods=["POST"])
def complete_course():
    """Marks entire course as completed and awards full XP."""
    data = request.get_json(silent=True) or request.form
    email = data.get("email")
    course_id = data.get("course_id")

    if not email or not course_id:
        return jsonify({"success": False, "message": "Email and course_id required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT xp_reward FROM courses WHERE id = %s AND is_active = TRUE;", (course_id,))
    row = cur.fetchone()
    cur.close(); conn.close()

    if not row:
        return jsonify({"success": False, "message": "Course not found."}), 404

    xp_reward = row[0] or 0

    # Award XP via xp_system
    xp_added, new_level = add_xp_to_user(email, xp_reward)

    # Mark course as complete
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
