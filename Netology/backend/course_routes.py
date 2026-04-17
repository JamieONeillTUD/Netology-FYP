"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

course_routes.py - Course and Progress Routes
---
This file handles the main course routes for Netology.
It loads the course list, returns single course data, saves
lesson, quiz, and challenge completions, and returns progress
data for the logged-in user.

These routes are mainly used by the courses, course, lesson,
quiz, dashboard, progress, and sandbox pages.
"""

from flask import Blueprint, jsonify, request

from achievement_engine import evaluate_achievements_for_event
from db import email_from, get_db_connection, to_int
from xp_system import add_xp_to_user

courses = Blueprint("courses", __name__)

def course_row(row):
    # Turn one courses table row into a JSON-friendly dictionary.
    return {
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
    }


def recalculate_course_progress(cur, email, course_id):
    # Update user_courses.progress based on all completed activities.
    # Total activities = lessons + 1 quiz + 1 challenge per unit (module).
    cur.execute(
        "SELECT total_lessons, module_count FROM courses WHERE id = %s AND is_active = TRUE",
        (course_id,),
    )
    row = cur.fetchone()
    if not row:
        return
    total_lessons = max(1, to_int(row[0], 1))
    module_count = max(1, to_int(row[1], 1))
    total_activities = total_lessons + (module_count * 2)

    cur.execute(
        """
        SELECT
            (SELECT COUNT(*) FROM user_lessons    WHERE user_email = %s AND course_id = %s),
            (SELECT COUNT(*) FROM user_quizzes    WHERE user_email = %s AND course_id = %s),
            (SELECT COUNT(*) FROM user_challenges WHERE user_email = %s AND course_id = %s)
        """,
        (email, course_id, email, course_id, email, course_id),
    )
    counts = cur.fetchone()
    activities_done = sum(to_int(c, 0) for c in counts)
    progress = min(100, int(activities_done / total_activities * 100))
    is_complete = activities_done >= total_activities

    cur.execute(
        "INSERT INTO user_courses (user_email, course_id, progress, completed) VALUES (%s, %s, %s, %s) ON CONFLICT (user_email, course_id) DO UPDATE SET progress = GREATEST(user_courses.progress, EXCLUDED.progress), completed = EXCLUDED.completed, updated_at = CURRENT_TIMESTAMP",
        (email, course_id, progress, is_complete),
    )


def check_achievements(email, event):
    # Check for new achievements and return the unlocks plus their XP total.
    try:
        new_achievements = evaluate_achievements_for_event(email, event) or []
    except Exception as err:
        print(f"Achievement error ({event}):", err)
        new_achievements = []
    return new_achievements, sum(to_int(a.get("xp_added")) for a in new_achievements)


def request_data():
    # Read request data from JSON first, then fall back to form data.
    return request.get_json(silent=True) or request.form or {}


def course_exists(cur, course_id):
    # Check that a course is real and active before saving progress.
    cur.execute("SELECT 1 FROM courses WHERE id = %s AND is_active = TRUE", (course_id,))
    return cur.fetchone() is not None


@courses.get("/courses")
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


@courses.get("/course")
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


@courses.get("/user-courses")
def user_courses():
    # Return all courses with the user's progress status.
    email = email_from(request.args.get("email"))
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


@courses.post("/complete-lesson")
def complete_lesson():
    # Save a completed lesson, update the course progress, and award XP.
    data = request_data()
    email = email_from(data.get("email"))
    course_id = to_int(data.get("course_id"), 0)
    lesson_number = to_int(data.get("lesson_number"), 0)
    if not email or course_id <= 0 or lesson_number <= 0:
        return jsonify({"success": False, "message": "Email, course_id and lesson_number required."}), 400

    xp = max(0, to_int(data.get("earned_xp") or data.get("xp"), 0))

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if not course_exists(cur, course_id):
            return jsonify({"success": False, "message": "Course not found."}), 404

        # Save the lesson only once.
        cur.execute(
            """
            INSERT INTO user_lessons (user_email, course_id, lesson_number, xp_awarded)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_email, course_id, lesson_number) DO NOTHING
            """,
            (email, course_id, lesson_number, xp),
        )
        first_time = cur.rowcount == 1

        # Update progress any time a lesson is completed for the first time.
        if first_time:
            recalculate_course_progress(cur, email, course_id)

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


@courses.post("/complete-quiz")
def complete_quiz():
    # Record a completed quiz and award XP.
    data = request_data()
    email = email_from(data.get("email"))
    course_id = to_int(data.get("course_id"), 0)
    lesson_number = to_int(data.get("lesson_number"), -1)
    if not email or course_id <= 0 or lesson_number < 0:
        return jsonify({"success": False, "message": "Email, course_id and lesson_number required."}), 400

    xp_award = max(0, to_int(data.get("earned_xp") or data.get("xp"), 5))

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if not course_exists(cur, course_id):
            return jsonify({"success": False, "message": "Course not found."}), 404

        cur.execute(
            """
            INSERT INTO user_quizzes (user_email, course_id, lesson_number, xp_awarded)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_email, course_id, lesson_number) DO NOTHING
            """,
            (email, course_id, lesson_number, xp_award),
        )
        first_time = cur.rowcount == 1

        if first_time:
            recalculate_course_progress(cur, email, course_id)

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


@courses.post("/complete-challenge")
def complete_challenge():
    # Record a completed challenge and award XP.
    data = request_data()
    email = email_from(data.get("email"))
    course_id = to_int(data.get("course_id"), 0)
    lesson_number = to_int(data.get("lesson_number"), -1)
    if not email or course_id <= 0 or lesson_number < 0:
        return jsonify({"success": False, "message": "Email, course_id and lesson_number required."}), 400

    xp_award = max(0, to_int(data.get("earned_xp") or data.get("xp"), 15))

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if not course_exists(cur, course_id):
            return jsonify({"success": False, "message": "Course not found."}), 404

        cur.execute(
            """
            INSERT INTO user_challenges (user_email, course_id, lesson_number, xp_awarded)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_email, course_id, lesson_number) DO NOTHING
            """,
            (email, course_id, lesson_number, xp_award),
        )
        first_time = cur.rowcount == 1

        if first_time:
            recalculate_course_progress(cur, email, course_id)

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


@courses.get("/user-course-status")
def user_course_status():
    # Return which lessons, quizzes, and challenges a user has done in a course.
    email = email_from(request.args.get("email"))
    course_id = to_int(request.args.get("course_id"), 0)
    if not email or course_id <= 0:
        return jsonify({"success": False, "message": "Email and course_id required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Load lessons, quizzes, and challenges in one query.
        cur.execute(
            """
            SELECT 'lesson' AS kind, lesson_number FROM user_lessons WHERE user_email = %s AND course_id = %s
            UNION ALL
            SELECT 'quiz' AS kind, lesson_number FROM user_quizzes WHERE user_email = %s AND course_id = %s
            UNION ALL
            SELECT 'challenge' AS kind, lesson_number FROM user_challenges WHERE user_email = %s AND course_id = %s
            ORDER BY lesson_number
            """,
            (email, course_id, email, course_id, email, course_id),
        )
        lessons, quizzes, challenges = [], [], []
        for kind, lesson_number in cur.fetchall():
            n = to_int(lesson_number)
            if kind == "lesson":
                lessons.append(n)
            elif kind == "quiz":
                quizzes.append(n)
            else:
                challenges.append(n)

        return jsonify({"success": True, "lessons": lessons, "quizzes": quizzes, "challenges": challenges})
    except Exception as e:
        print("User course status error:", e)
        return jsonify({"success": False, "message": "Could not load course status."}), 500
    finally:
        cur.close()
        conn.close()


@courses.get("/user-progress-summary")
def user_progress_summary():
    # Return overall progress counts (lessons, quizzes, challenges, courses).
    email = email_from(request.args.get("email"))
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM user_lessons WHERE user_email = %s),
                (SELECT COUNT(*) FROM user_quizzes WHERE user_email = %s),
                (SELECT COUNT(*) FROM user_challenges WHERE user_email = %s),
                (SELECT COUNT(*) FROM user_courses WHERE user_email = %s AND completed = TRUE),
                (SELECT COUNT(*) FROM user_courses WHERE user_email = %s AND completed = FALSE AND progress > 0),
                (SELECT COUNT(*) FROM courses WHERE is_active = TRUE)
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
