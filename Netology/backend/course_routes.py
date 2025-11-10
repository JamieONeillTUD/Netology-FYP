# backend/course_routes.py
from flask import Blueprint, request, jsonify
from db import get_db_connection
import math

courses = Blueprint("courses", __name__)

# =========================================================
#  LIST ALL COURSES
# =========================================================
@courses.get("/courses")
def list_courses():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT
            id,
            title,
            description,
            total_lessons,
            xp_reward,
            difficulty,
            category,
            is_active
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
        "is_active": r[7],
    } for r in rows]

    return jsonify({"success": True, "courses": data})


# =========================================================
#  GET SINGLE COURSE DETAILS
# =========================================================
@courses.get("/course")
def get_course():
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

    course = {
        "id": row[0],
        "title": row[1],
        "description": row[2],
        "total_lessons": row[3],
        "xp_reward": row[4],
        "difficulty": row[5],
        "category": row[6],
    }
    return jsonify({"success": True, **course})


# =========================================================
#  USER COURSES WITH PROGRESS
# =========================================================
@courses.get("/user-courses")
def user_courses():
    email = request.args.get("email")
    if not email:
        return jsonify({"success": False, "message": "email is required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT
            c.id,
            c.title,
            c.description,
            c.total_lessons,
            c.xp_reward,
            COALESCE(uc.progress, 0)  AS progress_pct,
            COALESCE(uc.completed, FALSE) AS completed
        FROM courses c
        LEFT JOIN user_courses uc
          ON uc.course_id = c.id AND uc.user_email = %s
        WHERE c.is_active = TRUE
        ORDER BY c.id;
    """, (email,))
    rows = cur.fetchall()
    cur.close(); conn.close()

    items = []
    for r in rows:
        course_id, title, desc, total_lessons, xp_reward, progress_pct, completed = r
        if completed:
            status = "completed"
        elif progress_pct > 0:
            status = "in-progress"
        else:
            status = "not-started"

        items.append({
            "id": course_id,
            "title": title,
            "description": desc,
            "total_lessons": total_lessons,
            "xp_reward": xp_reward,
            "progress_pct": int(progress_pct),
            "status": status,
        })

    return jsonify({"success": True, "courses": items})


# =========================================================
#  START A COURSE
# =========================================================
@courses.post("/start-course")
def start_course():
    data = request.get_json(silent=True) or request.form
    email = data.get("email")
    course_id = data.get("course_id")
    if not email or not course_id:
        return jsonify({"success": False, "message": "email and course_id are required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO user_courses (user_email, course_id, progress, completed)
        VALUES (%s, %s, 1, FALSE)
        ON CONFLICT (user_email, course_id) DO UPDATE
        SET progress = 1, completed = FALSE, updated_at = CURRENT_TIMESTAMP;
    """, (email, course_id))

    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True})


# =========================================================
#  COMPLETE ONE LESSON (XP + progress)
# =========================================================
@courses.post("/complete-lesson")
def complete_lesson():
    data = request.get_json(silent=True) or request.form
    email = data.get("email")
    course_id = data.get("course_id")
    if not email or not course_id:
        return jsonify({"success": False, "message": "email and course_id are required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT c.total_lessons, c.xp_reward,
               COALESCE(uc.progress, 0) AS progress_pct,
               COALESCE(uc.completed, FALSE)
        FROM courses c
        LEFT JOIN user_courses uc
          ON uc.course_id = c.id AND uc.user_email = %s
        WHERE c.id = %s AND c.is_active = TRUE;
    """, (email, course_id))
    row = cur.fetchone()

    if not row:
        cur.close(); conn.close()
        return jsonify({"success": False, "message": "Course not found"}), 404

    total_lessons, xp_reward, curr_pct, already_completed = row

    if total_lessons is None or total_lessons <= 0:
        new_pct = 100
        completed = True
        xp_to_add = xp_reward
    else:
        step = math.ceil(100 / total_lessons)
        new_pct = min(100, curr_pct + step)
        completed = new_pct >= 100
        xp_to_add = max(1, xp_reward // total_lessons)

    # ensure record exists
    cur.execute("""
        INSERT INTO user_courses (user_email, course_id, progress, completed)
        VALUES (%s, %s, 0, FALSE)
        ON CONFLICT DO NOTHING;
    """, (email, course_id))

    # update progress
    cur.execute("""
        UPDATE user_courses
           SET progress = %s,
               completed = %s,
               updated_at = CURRENT_TIMESTAMP
         WHERE user_email = %s AND course_id = %s;
    """, (new_pct, completed, email, course_id))

    # fetch user's current XP
    cur.execute("SELECT xp FROM users WHERE email = %s;", (email,))
    user_row = cur.fetchone()
    current_xp = user_row[0] if user_row else 0
    new_xp = current_xp + xp_to_add

    # recalc level using progressive scaling (250, 500, 750, …)
    numeric_level = calculate_level(new_xp)

    cur.execute("""
        UPDATE users
           SET xp = %s,
               numeric_level = %s
         WHERE email = %s;
    """, (new_xp, numeric_level, email))

    conn.commit()
    cur.close(); conn.close()

    return jsonify({
        "success": True,
        "progress_pct": int(new_pct),
        "completed": completed,
        "xp_added": int(xp_to_add),
        "new_level": numeric_level
    })


# =========================================================
#  COMPLETE WHOLE COURSE (instant full XP)
# =========================================================
@courses.post("/complete-course")
def complete_course():
    data = request.get_json(silent=True) or request.form
    email = data.get("email")
    course_id = data.get("course_id")
    if not email or not course_id:
        return jsonify({"success": False, "message": "email and course_id are required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT xp_reward FROM courses WHERE id = %s AND is_active = TRUE;", (course_id,))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        return jsonify({"success": False, "message": "Course not found"}), 404

    xp_reward = row[0] or 0

    cur.execute("""
        INSERT INTO user_courses (user_email, course_id, progress, completed)
        VALUES (%s, %s, 100, TRUE)
        ON CONFLICT (user_email, course_id) DO NOTHING;
    """, (email, course_id))

    cur.execute("""
        UPDATE user_courses
           SET progress = 100,
               completed = TRUE,
               updated_at = CURRENT_TIMESTAMP
         WHERE user_email = %s AND course_id = %s;
    """, (email, course_id))

    # Update XP and level (progressive scaling)
    cur.execute("SELECT xp FROM users WHERE email = %s;", (email,))
    user_row = cur.fetchone()
    current_xp = user_row[0] if user_row else 0
    new_xp = current_xp + xp_reward
    numeric_level = calculate_level(new_xp)

    cur.execute("""
        UPDATE users
           SET xp = %s,
               numeric_level = %s
         WHERE email = %s;
    """, (new_xp, numeric_level, email))

    conn.commit()
    cur.close(); conn.close()

    return jsonify({
        "success": True,
        "progress_pct": 100,
        "completed": True,
        "xp_added": int(xp_reward),
        "new_level": numeric_level
    })


# =========================================================
#  XP LEVEL CALCULATOR (progressive 250, 500, 750 ...)
# =========================================================
def calculate_level(total_xp: int) -> int:
    """Returns numeric level based on total XP using an increasing threshold curve."""
    level = 0
    xp_needed = 250
    xp_remaining = total_xp
    while xp_remaining >= xp_needed:
        xp_remaining -= xp_needed
        level += 1
        xp_needed += 250
    return level
