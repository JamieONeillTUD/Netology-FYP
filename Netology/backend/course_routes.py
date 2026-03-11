"""
course_routes.py — Course and progress API routes.
"""

from contextlib import contextmanager

from flask import Blueprint, jsonify, request

from achievement_engine import evaluate_achievements_for_event
from db import get_db_connection
from xp_system import add_xp_to_user, DEFAULT_CHALLENGE_XP, DEFAULT_QUIZ_XP

courses = Blueprint("courses", __name__)

# Architecture note:
# Routes decide when XP is awarded; xp_system.py is the source of XP math,
# persistence, and fallback XP policy constants.


@contextmanager
def _db_cursor():
    """Open a DB connection and cursor, always closing both."""
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        yield connection, cursor
    finally:
        try:
            cursor.close()
        finally:
            connection.close()


def _request_data():
    return request.get_json(silent=True) or request.form or {}


def _json_error(message, status_code):
    return jsonify({"success": False, "message": message}), status_code


def _to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def _coerce_xp(value, fallback, max_xp=None):
    xp_value = _to_int(value, fallback)
    if xp_value < 0:
        xp_value = _to_int(fallback, 0)
    if max_xp is not None:
        xp_value = min(xp_value, _to_int(max_xp, xp_value))
    return int(xp_value)


def _course_row_to_payload(row):
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


def _achievement_result(email, event_name):
    try:
        unlocked = evaluate_achievements_for_event(email, event_name) or []
    except Exception as error:
        print(f"Achievement evaluation error ({event_name}):", error)
        unlocked = []
    xp_added = sum(_to_int(item.get("xp_added"), 0) for item in unlocked)
    return unlocked, xp_added


def _require_email_and_course(data):
    email = (data.get("email") or "").strip().lower()
    course_id = _to_int(data.get("course_id"), 0)
    if not email or course_id <= 0:
        return None, None, _json_error("Email and course_id required.", 400)
    return email, course_id, None


@courses.route("/courses", methods=["GET"])
def list_courses():
    try:
        with _db_cursor() as (_connection, cursor):
            cursor.execute(
                """
                SELECT
                    id, title, description, total_lessons, module_count,
                    xp_reward, difficulty, category, required_level, estimated_time
                FROM courses
                WHERE is_active = TRUE
                ORDER BY id
                """
            )
            rows = cursor.fetchall()
        return jsonify({"success": True, "courses": [_course_row_to_payload(row) for row in rows]})
    except Exception as error:
        print("List courses error:", error)
        return _json_error("Could not load courses.", 500)


@courses.route("/course", methods=["GET"])
def get_course():
    course_id = _to_int(request.args.get("id"), 0)
    if course_id <= 0:
        return _json_error("Course ID required.", 400)

    try:
        with _db_cursor() as (_connection, cursor):
            cursor.execute(
                """
                SELECT
                    id, title, description, total_lessons, module_count,
                    xp_reward, difficulty, category, required_level, estimated_time
                FROM courses
                WHERE id = %s AND is_active = TRUE
                """,
                (course_id,),
            )
            row = cursor.fetchone()

        if not row:
            return _json_error("Course not found.", 404)

        return jsonify({"success": True, **_course_row_to_payload(row)})
    except Exception as error:
        print("Get course error:", error)
        return _json_error("Error fetching course.", 500)


@courses.route("/user-courses", methods=["GET"])
def user_courses():
    email = (request.args.get("email") or "").strip().lower()
    if not email:
        return _json_error("Email required.", 400)

    try:
        with _db_cursor() as (_connection, cursor):
            cursor.execute(
                """
                SELECT
                    c.id, c.title, c.description, c.total_lessons, c.module_count, c.xp_reward,
                    c.difficulty, c.category, c.required_level, c.estimated_time,
                    COALESCE(uc.progress, 0),
                    COALESCE(uc.completed, FALSE)
                FROM courses c
                LEFT JOIN user_courses uc
                    ON uc.course_id = c.id AND uc.user_email = %s
                WHERE c.is_active = TRUE
                ORDER BY c.id
                """,
                (email,),
            )
            rows = cursor.fetchall()

        course_list = []
        for row in rows:
            progress = _to_int(row[10], 0)
            completed = bool(row[11])
            if completed:
                status = "completed"
            elif progress > 0:
                status = "in-progress"
            else:
                status = "not-started"

            course_list.append(
                {
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
                    "progress_pct": progress,
                    "status": status,
                }
            )

        return jsonify({"success": True, "courses": course_list})
    except Exception as error:
        print("User courses error:", error)
        return _json_error("Could not load user courses.", 500)


@courses.route("/start-course", methods=["POST"])
def start_course():
    data = _request_data()
    email, course_id, error_response = _require_email_and_course(data)
    if error_response:
        return error_response

    try:
        with _db_cursor() as (connection, cursor):
            cursor.execute(
                """
                INSERT INTO user_courses (user_email, course_id, progress, completed)
                VALUES (%s, %s, 1, FALSE)
                ON CONFLICT (user_email, course_id)
                DO UPDATE SET progress = 1, completed = FALSE, updated_at = CURRENT_TIMESTAMP
                """,
                (email, course_id),
            )
            connection.commit()

        unlocked, achievement_xp_added = _achievement_result(email, "course_start")
        return jsonify(
            {
                "success": True,
                "message": "Course started.",
                "newly_unlocked": unlocked,
                "achievement_xp_added": achievement_xp_added,
            }
        )
    except Exception as error:
        print("Start course error:", error)
        return _json_error("Could not start course.", 500)


@courses.route("/complete-lesson", methods=["POST"])
def complete_lesson():
    data = _request_data()
    email, course_id, error_response = _require_email_and_course(data)
    if error_response:
        return error_response

    lesson_number_raw = data.get("lesson_number")
    lesson_number = _to_int(lesson_number_raw, 0) if lesson_number_raw is not None else None
    earned_xp = data.get("earned_xp") or data.get("xp")

    try:
        with _db_cursor() as (connection, cursor):
            cursor.execute(
                """
                SELECT
                    c.total_lessons,
                    c.xp_reward,
                    COALESCE(uc.progress, 0),
                    COALESCE(uc.completed, FALSE)
                FROM courses c
                LEFT JOIN user_courses uc
                    ON uc.course_id = c.id AND uc.user_email = %s
                WHERE c.id = %s
                """,
                (email, course_id),
            )
            row = cursor.fetchone()
            if not row:
                return _json_error("Course not found.", 404)

            total_lessons = max(1, _to_int(row[0], 1))
            course_xp_reward = max(0, _to_int(row[1], 0))
            current_progress = max(0, _to_int(row[2], 0))
            xp_per_lesson = course_xp_reward // total_lessons
            xp_award = _coerce_xp(earned_xp, xp_per_lesson, max_xp=course_xp_reward)

            cursor.execute(
                """
                INSERT INTO user_courses (user_email, course_id, progress, completed)
                VALUES (%s, %s, 0, FALSE)
                ON CONFLICT DO NOTHING
                """,
                (email, course_id),
            )

            if lesson_number is not None:
                cursor.execute(
                    """
                    INSERT INTO user_lessons (user_email, course_id, lesson_number, xp_awarded)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (user_email, course_id, lesson_number) DO NOTHING
                    """,
                    (email, course_id, lesson_number, xp_award),
                )
                newly_added = cursor.rowcount == 1

                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM user_lessons
                    WHERE user_email = %s AND course_id = %s
                    """,
                    (email, course_id),
                )
                completed_count = _to_int(cursor.fetchone()[0], 0)
                progress_pct = min(100, int((completed_count / total_lessons) * 100))
                completed_flag = completed_count >= total_lessons

                cursor.execute(
                    """
                    UPDATE user_courses
                    SET progress = %s, completed = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE user_email = %s AND course_id = %s
                    """,
                    (progress_pct, completed_flag, email, course_id),
                )
                connection.commit()

                xp_added, new_level = (0, 0)
                if newly_added:
                    xp_added, new_level = add_xp_to_user(email, xp_award, action="Lesson Completed")

                unlocked, achievement_xp_added = _achievement_result(email, "lesson_complete")
                return jsonify(
                    {
                        "success": True,
                        "progress_pct": int(progress_pct),
                        "completed": completed_flag,
                        "xp_added": xp_added,
                        "new_level": new_level,
                        "already_completed": not newly_added,
                        "newly_unlocked": unlocked,
                        "achievement_xp_added": achievement_xp_added,
                    }
                )

            step = 100 / total_lessons
            progress_pct = min(100, int(current_progress + step))
            completed_flag = progress_pct >= 100

            cursor.execute(
                """
                UPDATE user_courses
                SET progress = %s, completed = %s, updated_at = CURRENT_TIMESTAMP
                WHERE user_email = %s AND course_id = %s
                """,
                (progress_pct, completed_flag, email, course_id),
            )
            connection.commit()

        xp_added, new_level = add_xp_to_user(email, xp_award, action="Lesson Completed")
        unlocked, achievement_xp_added = _achievement_result(email, "lesson_complete")
        return jsonify(
            {
                "success": True,
                "progress_pct": int(progress_pct),
                "completed": completed_flag,
                "xp_added": xp_added,
                "new_level": new_level,
                "newly_unlocked": unlocked,
                "achievement_xp_added": achievement_xp_added,
            }
        )
    except Exception as error:
        print("Complete lesson error:", error)
        return _json_error("Could not update lesson.", 500)


@courses.route("/complete-quiz", methods=["POST"])
def complete_quiz():
    data = _request_data()
    email, course_id, error_response = _require_email_and_course(data)
    if error_response:
        return error_response

    lesson_number = _to_int(data.get("lesson_number"), -1)
    if lesson_number < 0:
        return _json_error("Email, course_id and lesson_number required.", 400)

    earned_xp = data.get("earned_xp") or data.get("xp")
    xp_award = _coerce_xp(earned_xp, DEFAULT_QUIZ_XP)

    try:
        with _db_cursor() as (connection, cursor):
            cursor.execute(
                """
                INSERT INTO user_quizzes (user_email, course_id, lesson_number, xp_awarded)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_email, course_id, lesson_number) DO NOTHING
                """,
                (email, course_id, lesson_number, xp_award),
            )
            newly_added = cursor.rowcount == 1
            connection.commit()

        xp_added, new_level = (0, 0)
        if newly_added:
            xp_added, new_level = add_xp_to_user(email, xp_award, action="Quiz Completed")

        unlocked, achievement_xp_added = _achievement_result(email, "quiz_complete")
        return jsonify(
            {
                "success": True,
                "xp_added": xp_added,
                "new_level": new_level,
                "already_completed": not newly_added,
                "newly_unlocked": unlocked,
                "achievement_xp_added": achievement_xp_added,
            }
        )
    except Exception as error:
        print("Complete quiz error:", error)
        return _json_error("Could not complete quiz.", 500)


@courses.route("/complete-challenge", methods=["POST"])
def complete_challenge():
    data = _request_data()
    email, course_id, error_response = _require_email_and_course(data)
    if error_response:
        return error_response

    lesson_number = _to_int(data.get("lesson_number"), -1)
    if lesson_number < 0:
        return _json_error("Email, course_id and lesson_number required.", 400)

    earned_xp = data.get("earned_xp") or data.get("xp")
    xp_award = _coerce_xp(earned_xp, DEFAULT_CHALLENGE_XP)

    try:
        with _db_cursor() as (connection, cursor):
            cursor.execute(
                """
                INSERT INTO user_challenges (user_email, course_id, lesson_number, xp_awarded)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_email, course_id, lesson_number) DO NOTHING
                """,
                (email, course_id, lesson_number, xp_award),
            )
            newly_added = cursor.rowcount == 1
            connection.commit()

        xp_added, new_level = (0, 0)
        if newly_added:
            xp_added, new_level = add_xp_to_user(email, xp_award, action="Challenge Completed")

        unlocked, achievement_xp_added = _achievement_result(email, "challenge_complete")
        return jsonify(
            {
                "success": True,
                "xp_added": xp_added,
                "new_level": new_level,
                "already_completed": not newly_added,
                "newly_unlocked": unlocked,
                "achievement_xp_added": achievement_xp_added,
            }
        )
    except Exception as error:
        print("Complete challenge error:", error)
        return _json_error("Could not complete challenge.", 500)


@courses.route("/complete-course", methods=["POST"])
def complete_course():
    data = _request_data()
    email, course_id, error_response = _require_email_and_course(data)
    if error_response:
        return error_response

    try:
        with _db_cursor() as (connection, cursor):
            cursor.execute(
                "SELECT xp_reward FROM courses WHERE id = %s AND is_active = TRUE",
                (course_id,),
            )
            row = cursor.fetchone()
            if not row:
                return _json_error("Course not found.", 404)

            xp_reward = max(0, _to_int(row[0], 0))

            cursor.execute(
                """
                SELECT completed
                FROM user_courses
                WHERE user_email = %s AND course_id = %s
                """,
                (email, course_id),
            )
            existing = cursor.fetchone()
            already_completed = bool(existing and existing[0])

            cursor.execute(
                """
                INSERT INTO user_courses (user_email, course_id, progress, completed)
                VALUES (%s, %s, 100, TRUE)
                ON CONFLICT (user_email, course_id)
                DO UPDATE SET progress = 100, completed = TRUE, updated_at = CURRENT_TIMESTAMP
                """,
                (email, course_id),
            )
            connection.commit()

        xp_added, new_level = (0, 0)
        if not already_completed:
            xp_added, new_level = add_xp_to_user(email, xp_reward, action="Course Completed")

        unlocked, achievement_xp_added = _achievement_result(email, "course_complete")
        return jsonify(
            {
                "success": True,
                "progress_pct": 100,
                "completed": True,
                "xp_added": xp_added,
                "new_level": new_level,
                "already_completed": already_completed,
                "newly_unlocked": unlocked,
                "achievement_xp_added": achievement_xp_added,
            }
        )
    except Exception as error:
        print("Complete course error:", error)
        return _json_error("Could not complete course.", 500)


@courses.route("/user-course-status", methods=["GET"])
def user_course_status():
    email = (request.args.get("email") or "").strip().lower()
    course_id = _to_int(request.args.get("course_id"), 0)
    if not email or course_id <= 0:
        return _json_error("Email and course_id required.", 400)

    try:
        with _db_cursor() as (_connection, cursor):
            cursor.execute(
                """
                SELECT lesson_number
                FROM user_lessons
                WHERE user_email = %s AND course_id = %s
                ORDER BY lesson_number
                """,
                (email, course_id),
            )
            lessons = [_to_int(row[0], 0) for row in cursor.fetchall()]

            cursor.execute(
                """
                SELECT lesson_number
                FROM user_quizzes
                WHERE user_email = %s AND course_id = %s
                ORDER BY lesson_number
                """,
                (email, course_id),
            )
            quizzes = [_to_int(row[0], 0) for row in cursor.fetchall()]

            cursor.execute(
                """
                SELECT lesson_number
                FROM user_challenges
                WHERE user_email = %s AND course_id = %s
                ORDER BY lesson_number
                """,
                (email, course_id),
            )
            challenges = [_to_int(row[0], 0) for row in cursor.fetchall()]

        return jsonify({"success": True, "lessons": lessons, "quizzes": quizzes, "challenges": challenges})
    except Exception as error:
        print("User course status error:", error)
        return _json_error("Could not load course status.", 500)


@courses.route("/recent-activity", methods=["GET"])
def recent_activity():
    email = (request.args.get("email") or "").strip().lower()
    limit = max(1, _to_int(request.args.get("limit"), 8))
    if not email:
        return _json_error("Email required.", 400)

    try:
        with _db_cursor() as (_connection, cursor):
            cursor.execute(
                """
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
                LIMIT %s
                """,
                (email, email, email, limit),
            )
            rows = cursor.fetchall()

        activity = []
        for row in rows:
            completed_at = row[4]
            activity.append(
                {
                    "type": row[0] or "lesson",
                    "course_id": row[1],
                    "course_title": row[2],
                    "lesson_number": _to_int(row[3], 0),
                    "xp": _to_int(row[5], 0),
                    "completed_at": completed_at.isoformat() if completed_at else None,
                }
            )

        return jsonify({"success": True, "activity": activity})
    except Exception as error:
        print("Recent activity error:", error)
        return _json_error("Could not load recent activity.", 500)


@courses.route("/quiz-history", methods=["GET"])
def quiz_history():
    email = (request.args.get("email") or "").strip().lower()
    limit = max(1, _to_int(request.args.get("limit"), 10))
    if not email:
        return _json_error("Email required.", 400)

    try:
        with _db_cursor() as (_connection, cursor):
            cursor.execute(
                """
                SELECT uq.course_id, c.title, uq.lesson_number, uq.completed_at
                FROM user_quizzes uq
                JOIN courses c ON c.id = uq.course_id
                WHERE uq.user_email = %s
                ORDER BY uq.completed_at DESC
                LIMIT %s
                """,
                (email, limit),
            )
            rows = cursor.fetchall()

        history = []
        for row in rows:
            completed_at = row[3]
            history.append(
                {
                    "course_id": row[0],
                    "course_title": row[1],
                    "lesson_number": _to_int(row[2], 0),
                    "completed_at": completed_at.isoformat() if completed_at else None,
                }
            )
        return jsonify({"success": True, "history": history})
    except Exception as error:
        print("Quiz history error:", error)
        return _json_error("Could not load quiz history.", 500)


@courses.route("/user-progress-summary", methods=["GET"])
def user_progress_summary():
    email = (request.args.get("email") or "").strip().lower()
    if not email:
        return _json_error("Email required.", 400)

    try:
        with _db_cursor() as (_connection, cursor):
            cursor.execute("SELECT COUNT(*) FROM user_lessons WHERE user_email = %s", (email,))
            lessons_done = _to_int(cursor.fetchone()[0], 0)

            cursor.execute("SELECT COUNT(*) FROM user_quizzes WHERE user_email = %s", (email,))
            quizzes_done = _to_int(cursor.fetchone()[0], 0)

            cursor.execute("SELECT COUNT(*) FROM user_challenges WHERE user_email = %s", (email,))
            challenges_done = _to_int(cursor.fetchone()[0], 0)

            cursor.execute(
                "SELECT COUNT(*) FROM user_courses WHERE user_email = %s AND completed = TRUE",
                (email,),
            )
            courses_done = _to_int(cursor.fetchone()[0], 0)

            cursor.execute(
                """
                SELECT COUNT(*)
                FROM user_courses
                WHERE user_email = %s AND completed = FALSE AND progress > 0
                """,
                (email,),
            )
            in_progress = _to_int(cursor.fetchone()[0], 0)

            cursor.execute("SELECT COUNT(*) FROM courses WHERE is_active = TRUE")
            total_courses = _to_int(cursor.fetchone()[0], 0)

        return jsonify(
            {
                "success": True,
                "lessons_done": lessons_done,
                "quizzes_done": quizzes_done,
                "challenges_done": challenges_done,
                "courses_done": courses_done,
                "in_progress": in_progress,
                "total_courses": total_courses,
            }
        )
    except Exception as error:
        print("User progress summary error:", error)
        return _json_error("Could not load progress summary.", 500)
