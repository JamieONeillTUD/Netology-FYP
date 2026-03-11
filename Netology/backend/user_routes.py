"""user_routes.py - Progress, achievements, preferences, activity, and streak APIs."""

from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

from achievement_engine import ensure_achievement_catalog, get_user_achievements_payload
from db import get_db_connection
from xp_system import get_level_progress

user_api = Blueprint("user_api", __name__)


def _request_data():
    return request.get_json(silent=True) or {}


@user_api.get("/api/user/progress")
def get_user_progress():
    """Get user's learning progress with filtering."""
    user_email = request.args.get("user_email")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT uc.course_id, c.title, uc.progress, uc.started_at
            FROM user_courses uc
            JOIN courses c ON uc.course_id = c.id
            WHERE uc.user_email = %s AND uc.completed = FALSE
            ORDER BY uc.updated_at DESC
            """,
            (user_email,),
        )
        in_progress = [{"id": r[0], "title": r[1], "progress": r[2], "started": str(r[3])} for r in cur.fetchall()]

        cur.execute(
            """
            SELECT uc.course_id, c.title, uc.updated_at AS completed_at
            FROM user_courses uc
            JOIN courses c ON uc.course_id = c.id
            WHERE uc.user_email = %s AND uc.completed = TRUE
            ORDER BY uc.updated_at DESC
            """,
            (user_email,),
        )
        completed = [{"id": r[0], "title": r[1], "completed": str(r[2])} for r in cur.fetchall()]

        return jsonify({"success": True, "in_progress": in_progress, "completed": completed})
    finally:
        cur.close()
        conn.close()


@user_api.get("/api/user/progress/stats")
def get_progress_stats():
    """Get user progress statistics."""
    user_email = request.args.get("user_email")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("SELECT xp FROM users WHERE email = %s", (user_email,))
        row = cur.fetchone()
        total_xp = row[0] if row else 0

        level, _xp_into_level, next_level_xp = get_level_progress(total_xp)

        cur.execute(
            """
            SELECT COUNT(*) as started,
                   SUM(CASE WHEN completed THEN 1 ELSE 0 END) as finished
            FROM user_courses WHERE user_email = %s
            """,
            (user_email,),
        )
        courses_started, courses_completed = cur.fetchone()
        courses_completed = courses_completed or 0

        cur.execute("SELECT COUNT(*) FROM user_lessons WHERE user_email = %s", (user_email,))
        lessons_completed = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM user_achievements WHERE user_email = %s", (user_email,))
        achievements = cur.fetchone()[0]

        return jsonify(
            {
                "success": True,
                "total_xp": total_xp,
                "current_level": level,
                "xp_to_next_level": next_level_xp,
                "courses_started": courses_started,
                "courses_completed": courses_completed,
                "lessons_completed": lessons_completed,
                "achievements_earned": achievements,
            }
        )
    finally:
        cur.close()
        conn.close()


@user_api.get("/api/user/challenges")
def get_user_challenges():
    """Get daily/weekly challenges for user."""
    user_email = request.args.get("user_email")
    challenge_type = request.args.get("type", "daily")

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT c.id, c.title, c.description, c.xp_reward, c.challenge_type,
                   COALESCE(ucp.progress_percent, 0) as progress
            FROM challenges c
            LEFT JOIN user_challenge_progress ucp
                ON c.id = ucp.challenge_id AND ucp.user_email = %s
            WHERE c.challenge_type = %s AND c.is_active = TRUE
            LIMIT 5
            """,
            (user_email, challenge_type),
        )

        challenges = [
            {"id": r[0], "title": r[1], "description": r[2], "xp": r[3], "type": r[4], "progress": r[5]}
            for r in cur.fetchall()
        ]
        return jsonify({"success": True, "challenges": challenges})
    except Exception as error:
        print(f"Challenges endpoint error: {error}")
        return jsonify({"success": False, "challenges": [], "message": str(error)}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


@user_api.get("/api/user/achievements")
def get_user_achievements():
    """Get user's achievements."""
    user_email = request.args.get("user_email")
    if not user_email:
        return jsonify({"success": False, "unlocked": [], "locked": [], "message": "user_email required"}), 400

    try:
        ensure_achievement_catalog()
        payload = get_user_achievements_payload(user_email)
        if not payload.get("success"):
            return (
                jsonify(
                    {
                        "success": False,
                        "unlocked": [],
                        "locked": [],
                        "message": "Could not load achievements",
                    }
                ),
                500,
            )
        return jsonify(payload)
    except Exception as error:
        print(f"Achievements endpoint error: {error}")
        return jsonify({"success": False, "unlocked": [], "locked": [], "message": str(error)}), 500


@user_api.get("/api/user/preferences")
def get_user_preferences():
    """Get user preferences."""
    user_email = request.args.get("user_email")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT theme, font_preference, notifications_enabled, reduced_motion
            FROM user_preferences
            WHERE user_email = %s
            """,
            (user_email,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify(
                {
                    "success": True,
                    "theme": "light",
                    "font_preference": "standard",
                    "notifications_enabled": True,
                    "reduced_motion": False,
                }
            )

        return jsonify(
            {
                "success": True,
                "theme": row[0],
                "font_preference": row[1],
                "notifications_enabled": row[2],
                "reduced_motion": row[3],
            }
        )
    finally:
        cur.close()
        conn.close()


@user_api.post("/api/user/preferences")
def update_user_preferences():
    """Update user preferences."""
    data = _request_data()
    user_email = data.get("user_email")
    theme = data.get("theme", "light")
    font = data.get("font_preference", "standard")
    notifications = data.get("notifications_enabled", True)

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO user_preferences (user_email, theme, font_preference, notifications_enabled)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_email) DO UPDATE
            SET theme = %s, font_preference = %s, notifications_enabled = %s
            """,
            (user_email, theme, font, notifications, theme, font, notifications),
        )

        conn.commit()
        return jsonify({"success": True, "message": "Preferences updated"})
    finally:
        cur.close()
        conn.close()


@user_api.get("/api/user/activity")
def get_user_activity():
    """Get merged daily activity for heatmap."""
    user_email = (request.args.get("user_email") or "").strip().lower()
    if not user_email:
        return jsonify({"success": False, "message": "user_email is required"}), 400

    try:
        range_days = int(request.args.get("range", 90))
    except (TypeError, ValueError):
        range_days = 90
    range_days = max(1, min(range_days, 365))

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        by_date = {}

        def day_entry(date_value):
            date_key = str(date_value)
            if date_key not in by_date:
                by_date[date_key] = {
                    "daily_xp": 0,
                    "daily_lessons": 0,
                    "daily_quizzes": 0,
                    "daily_challenges": 0,
                    "daily_logins": 0,
                    "log_xp": 0,
                    "log_lessons": 0,
                    "log_quizzes": 0,
                    "log_challenges": 0,
                    "log_xp_events": 0,
                    "login_table_count": 0,
                }
            return by_date[date_key]

        try:
            cur.execute(
                """
                SELECT
                    activity_date,
                    COALESCE(xp_earned, 0),
                    COALESCE(lessons_completed, 0),
                    COALESCE(quizzes_completed, 0),
                    COALESCE(challenges_completed, 0),
                    COALESCE(login_count, 0)
                FROM user_daily_activity
                WHERE user_email = %s
                  AND activity_date >= CURRENT_DATE - (%s::int - 1)
                ORDER BY activity_date
                """,
                (user_email, range_days),
            )
            for row in cur.fetchall():
                day = day_entry(row[0])
                day["daily_xp"] = int(row[1] or 0)
                day["daily_lessons"] = int(row[2] or 0)
                day["daily_quizzes"] = int(row[3] or 0)
                day["daily_challenges"] = int(row[4] or 0)
                day["daily_logins"] = int(row[5] or 0)
        except Exception as source_error:
            print("Activity source user_daily_activity error:", source_error)

        try:
            cur.execute(
                """
                SELECT
                    DATE(created_at) AS activity_date,
                    COALESCE(SUM(xp_awarded), 0) AS xp_earned,
                    COALESCE(SUM(CASE WHEN LOWER(action) LIKE 'lesson%' OR LOWER(action) LIKE '% lesson%' THEN 1 ELSE 0 END), 0) AS lessons_completed,
                    COALESCE(SUM(CASE WHEN LOWER(action) LIKE 'quiz%' OR LOWER(action) LIKE '% quiz%' THEN 1 ELSE 0 END), 0) AS quizzes_completed,
                    COALESCE(SUM(CASE WHEN LOWER(action) LIKE 'challenge%' OR LOWER(action) LIKE '% challenge%' THEN 1 ELSE 0 END), 0) AS challenges_completed,
                    COUNT(*) AS xp_events
                FROM xp_log
                WHERE user_email = %s
                  AND created_at >= CURRENT_DATE - (%s::int - 1) * INTERVAL '1 day'
                GROUP BY DATE(created_at)
                ORDER BY DATE(created_at)
                """,
                (user_email, range_days),
            )
            for row in cur.fetchall():
                day = day_entry(row[0])
                day["log_xp"] = int(row[1] or 0)
                day["log_lessons"] = int(row[2] or 0)
                day["log_quizzes"] = int(row[3] or 0)
                day["log_challenges"] = int(row[4] or 0)
                day["log_xp_events"] = int(row[5] or 0)
        except Exception as source_error:
            print("Activity source xp_log error:", source_error)

        try:
            cur.execute(
                """
                SELECT
                    login_date,
                    COUNT(*) AS login_count
                FROM user_logins
                WHERE user_email = %s
                  AND login_date >= CURRENT_DATE - (%s::int - 1)
                GROUP BY login_date
                ORDER BY login_date
                """,
                (user_email, range_days),
            )
            for row in cur.fetchall():
                day = day_entry(row[0])
                day["login_table_count"] = int(row[1] or 0)
        except Exception as source_error:
            print("Activity source user_logins error:", source_error)

        activity = []
        for date_key in sorted(by_date.keys()):
            day = by_date[date_key]
            lessons = max(day["daily_lessons"], day["log_lessons"])
            quizzes = max(day["daily_quizzes"], day["log_quizzes"])
            challenges = max(day["daily_challenges"], day["log_challenges"])
            logins = max(day["daily_logins"], day["login_table_count"])
            xp_earned = max(day["daily_xp"], day["log_xp"])
            completion_count = lessons + quizzes + challenges
            count = max(completion_count, day["log_xp_events"]) + logins

            activity.append(
                {
                    "date": date_key,
                    "xp": xp_earned,
                    "lessons": lessons,
                    "quizzes": quizzes,
                    "challenges": challenges,
                    "logins": logins,
                    "count": count,
                }
            )

        return jsonify({"success": True, "activity": activity})
    finally:
        cur.close()
        conn.close()


@user_api.get("/api/user/streaks")
def get_user_streaks():
    """Get user's current and longest streak."""
    user_email = request.args.get("user_email")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT login_date FROM user_logins
            WHERE user_email = %s
            ORDER BY login_date DESC
            LIMIT 365
            """,
            (user_email,),
        )
        dates = [r[0] for r in cur.fetchall()]

        if not dates:
            return jsonify({"success": True, "current_streak": 0, "longest_streak": 0})

        unique_dates = sorted(set(dates), reverse=True)
        today = datetime.now().date()

        current_streak = 0
        check_date = today
        for date in unique_dates:
            if date == check_date:
                current_streak += 1
                check_date -= timedelta(days=1)
            elif date < check_date:
                break

        longest_streak = 0
        run = 0
        previous_date = None
        for date in unique_dates:
            if previous_date is None:
                run = 1
            elif previous_date - timedelta(days=1) == date:
                run += 1
            else:
                run = 1
            previous_date = date
            if run > longest_streak:
                longest_streak = run

        return jsonify(
            {
                "success": True,
                "current_streak": current_streak,
                "longest_streak": longest_streak,
                "last_login": str(dates[0]) if dates else None,
            }
        )
    finally:
        cur.close()
        conn.close()
