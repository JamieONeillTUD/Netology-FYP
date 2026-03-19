# course_routes.py — Course and progress API routes.

from flask import Blueprint, jsonify, request

from achievement_engine import evaluate_achievements_for_event
from db import get_db_connection
from xp_system import add_xp_to_user

courses = Blueprint("courses", __name__)


def to_int(value, default=0):
    # Safely converts any value to int (DB rows and request params can be strings or None).
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def course_row(row):
    # Turns a courses table row (10 columns) into a dict to send back as JSON.
    return {
        "id": row[0], "title": row[1], "description": row[2],
        "total_lessons": row[3], "module_count": row[4], "xp_reward": row[5],
        "difficulty": row[6], "category": row[7], "required_level": row[8],
        "estimated_time": row[9],
    }


def check_achievements(email, event):
    # Run achievement checks; returns (list of unlocked, total xp from them).
    try:
        new_achievements = evaluate_achievements_for_event(email, event) or []
    except Exception as err:
        print(f"Achievement error ({event}):", err)
        new_achievements = []
    return new_achievements, sum(to_int(a.get("xp_added")) for a in new_achievements)


@courses.route("/courses", methods=["GET"])
def list_courses():
    # Return all active courses.
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, title, description, total_lessons, module_count,
                   xp_reward, difficulty, category, required_level, estimated_time
            FROM courses
            WHERE is_active = TRUE
            ORDER BY id
            """
        )
        return jsonify({"success": True, "courses": [course_row(r) for r in cur.fetchall()]})
    except Exception as e:
        print("List courses error:", e)
        return jsonify({"success": False, "message": "Could not load courses."}), 500
    finally:
        cur.close()
        conn.close()


@courses.route("/course", methods=["GET"])
def get_course():
    # Return a single course by ID.
    course_id = to_int(request.args.get("id"), 0)
    if course_id <= 0:
        return jsonify({"success": False, "message": "Course ID required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, title, description, total_lessons, module_count,
                   xp_reward, difficulty, category, required_level, estimated_time
            FROM courses
            WHERE id = %s AND is_active = TRUE
            """,
            (course_id,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Course not found."}), 404
        return jsonify({"success": True, **course_row(row)})
    except Exception as e:
        print("Get course error:", e)
        return jsonify({"success": False, "message": "Error fetching course."}), 500
    finally:
        cur.close()
        conn.close()


@courses.route("/user-courses", methods=["GET"])
def user_courses():
    # Return all courses with the user's progress status.
    email = (request.args.get("email") or "").strip().lower()
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT c.id, c.title, c.description, c.total_lessons, c.module_count,
                   c.xp_reward, c.difficulty, c.category, c.required_level, c.estimated_time,
                   COALESCE(uc.progress, 0), COALESCE(uc.completed, FALSE)
            FROM courses c
            LEFT JOIN user_courses uc ON uc.course_id = c.id AND uc.user_email = %s
            WHERE c.is_active = TRUE
            ORDER BY c.id
            """,
            (email,),
        )
        result = []
        for row in cur.fetchall():
            progress = to_int(row[10], 0)
            is_complete = bool(row[11])
            status = "completed" if is_complete else ("in-progress" if progress > 0 else "not-started")
            result.append({**course_row(row), "progress_pct": progress, "status": status})
        return jsonify({"success": True, "courses": result})
    except Exception as e:
        print("User courses error:", e)
        return jsonify({"success": False, "message": "Could not load user courses."}), 500
    finally:
        cur.close()
        conn.close()


@courses.route("/complete-lesson", methods=["POST"])
def complete_lesson():
    # Record a completed lesson, update progress, and award XP.
    data = request.get_json(silent=True) or request.form or {}
    email = (data.get("email") or "").strip().lower()
    course_id = to_int(data.get("course_id"), 0)
    lesson_number = to_int(data.get("lesson_number"), 0)
    if not email or course_id <= 0 or lesson_number <= 0:
        return jsonify({"success": False, "message": "Email, course_id and lesson_number required."}), 400

    xp = max(0, to_int(data.get("earned_xp") or data.get("xp"), 0))

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Get total lessons for this course
        cur.execute("SELECT total_lessons FROM courses WHERE id = %s AND is_active = TRUE", (course_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Course not found."}), 404
        total_lessons = max(1, to_int(row[0], 1))

        # Ensure user_courses row exists
        cur.execute(
            "INSERT INTO user_courses (user_email, course_id, progress, completed) VALUES (%s, %s, 0, FALSE) ON CONFLICT DO NOTHING",
            (email, course_id),
        )

        # Record the lesson (does nothing if already recorded)
        cur.execute(
            """
            INSERT INTO user_lessons (user_email, course_id, lesson_number, xp_awarded)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_email, course_id, lesson_number) DO NOTHING
            """,
            (email, course_id, lesson_number, xp),
        )
        first_time = cur.rowcount == 1

        # Calculate progress
        cur.execute("SELECT COUNT(*) FROM user_lessons WHERE user_email = %s AND course_id = %s", (email, course_id))
        lessons_done = to_int(cur.fetchone()[0], 0)
        progress = min(100, int(lessons_done / total_lessons * 100))
        is_complete = lessons_done >= total_lessons

        cur.execute(
            "UPDATE user_courses SET progress = %s, completed = %s, updated_at = CURRENT_TIMESTAMP WHERE user_email = %s AND course_id = %s",
            (progress, is_complete, email, course_id),
        )
        conn.commit()

        xp_added = 0
        if first_time:
            xp_added, _ = add_xp_to_user(email, xp, action="Lesson Completed")

        new_achievements, achievement_xp = check_achievements(email, "lesson_complete")
        return jsonify({
            "success": True,
            "xp_added": xp_added,
            "newly_unlocked": new_achievements,
            "achievement_xp_added": achievement_xp,
        })
    except Exception as e:
        print("Complete lesson error:", e)
        return jsonify({"success": False, "message": "Could not update lesson."}), 500
    finally:
        cur.close()
        conn.close()


@courses.route("/complete-quiz", methods=["POST"])
def complete_quiz():
    # Record a completed quiz and award XP.
    data = request.get_json(silent=True) or request.form or {}
    email = (data.get("email") or "").strip().lower()
    course_id = to_int(data.get("course_id"), 0)
    lesson_number = to_int(data.get("lesson_number"), -1)
    if not email or course_id <= 0 or lesson_number < 0:
        return jsonify({"success": False, "message": "Email, course_id and lesson_number required."}), 400

    xp_award = max(0, to_int(data.get("earned_xp") or data.get("xp"), 5))

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO user_quizzes (user_email, course_id, lesson_number, xp_awarded)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_email, course_id, lesson_number) DO NOTHING
            """,
            (email, course_id, lesson_number, xp_award),
        )
        first_time = cur.rowcount == 1
        conn.commit()

        xp_added = 0
        if first_time:
            xp_added, _ = add_xp_to_user(email, xp_award, action="Quiz Completed")

        new_achievements, achievement_xp = check_achievements(email, "quiz_complete")
        return jsonify({
            "success": True,
            "xp_added": xp_added,
            "already_completed": not first_time,
            "newly_unlocked": new_achievements,
            "achievement_xp_added": achievement_xp,
        })
    except Exception as e:
        print("Complete quiz error:", e)
        return jsonify({"success": False, "message": "Could not complete quiz."}), 500
    finally:
        cur.close()
        conn.close()


@courses.route("/complete-challenge", methods=["POST"])
def complete_challenge():
    # Record a completed challenge and award XP.
    data = request.get_json(silent=True) or request.form or {}
    email = (data.get("email") or "").strip().lower()
    course_id = to_int(data.get("course_id"), 0)
    lesson_number = to_int(data.get("lesson_number"), -1)
    if not email or course_id <= 0 or lesson_number < 0:
        return jsonify({"success": False, "message": "Email, course_id and lesson_number required."}), 400

    xp_award = max(0, to_int(data.get("earned_xp") or data.get("xp"), 15))

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO user_challenges (user_email, course_id, lesson_number, xp_awarded)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_email, course_id, lesson_number) DO NOTHING
            """,
            (email, course_id, lesson_number, xp_award),
        )
        first_time = cur.rowcount == 1
        conn.commit()

        xp_added = 0
        if first_time:
            xp_added, _ = add_xp_to_user(email, xp_award, action="Challenge Completed")

        new_achievements, achievement_xp = check_achievements(email, "challenge_complete")
        return jsonify({
            "success": True,
            "xp_added": xp_added,
            "already_completed": not first_time,
            "newly_unlocked": new_achievements,
            "achievement_xp_added": achievement_xp,
        })
    except Exception as e:
        print("Complete challenge error:", e)
        return jsonify({"success": False, "message": "Could not complete challenge."}), 500
    finally:
        cur.close()
        conn.close()


@courses.route("/user-course-status", methods=["GET"])
def user_course_status():
    # Return which lessons, quizzes, and challenges a user has done in a course.
    email = (request.args.get("email") or "").strip().lower()
    course_id = to_int(request.args.get("course_id"), 0)
    if not email or course_id <= 0:
        return jsonify({"success": False, "message": "Email and course_id required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT lesson_number FROM user_lessons WHERE user_email = %s AND course_id = %s ORDER BY lesson_number", (email, course_id))
        lessons = [to_int(r[0]) for r in cur.fetchall()]

        cur.execute("SELECT lesson_number FROM user_quizzes WHERE user_email = %s AND course_id = %s ORDER BY lesson_number", (email, course_id))
        quizzes = [to_int(r[0]) for r in cur.fetchall()]

        cur.execute("SELECT lesson_number FROM user_challenges WHERE user_email = %s AND course_id = %s ORDER BY lesson_number", (email, course_id))
        challenges = [to_int(r[0]) for r in cur.fetchall()]

        return jsonify({"success": True, "lessons": lessons, "quizzes": quizzes, "challenges": challenges})
    except Exception as e:
        print("User course status error:", e)
        return jsonify({"success": False, "message": "Could not load course status."}), 500
    finally:
        cur.close()
        conn.close()


@courses.route("/user-progress-summary", methods=["GET"])
def user_progress_summary():
    # Return overall progress counts (lessons, quizzes, challenges, courses).
    email = (request.args.get("email") or "").strip().lower()
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM user_lessons    WHERE user_email = %s),
                (SELECT COUNT(*) FROM user_quizzes    WHERE user_email = %s),
                (SELECT COUNT(*) FROM user_challenges WHERE user_email = %s),
                (SELECT COUNT(*) FROM user_courses    WHERE user_email = %s AND completed = TRUE),
                (SELECT COUNT(*) FROM user_courses    WHERE user_email = %s AND completed = FALSE AND progress > 0),
                (SELECT COUNT(*) FROM courses         WHERE is_active = TRUE)
            """,
            (email, email, email, email, email),
        )
        row = cur.fetchone()
        return jsonify({
            "success": True,
            "lessons_done":    to_int(row[0]),
            "quizzes_done":    to_int(row[1]),
            "challenges_done": to_int(row[2]),
            "courses_done":    to_int(row[3]),
            "in_progress":     to_int(row[4]),
            "total_courses":   to_int(row[5]),
        })
    except Exception as e:
        print("User progress summary error:", e)
        return jsonify({"success": False, "message": "Could not load progress summary."}), 500
    finally:
        cur.close()
        conn.close()
