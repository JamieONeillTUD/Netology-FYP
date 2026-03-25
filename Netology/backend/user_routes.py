# user_routes.py — Progress, activity, streak, and challenge APIs.

from flask import Blueprint, jsonify, request

from achievement_engine import login_streak
from db import get_db_connection

user_api = Blueprint("user_api", __name__)


# ── Challenges ────────────────────────────────────────────────────────────────

_DEFAULT_CHALLENGES = [
    ("Learn IP Addressing",  "Complete the IP Addressing course lesson.",          "daily",  25),
    ("Build a Topology",     "Create a network topology in the sandbox.",          "daily",  50),
    ("Pass a Quiz",          "Score 80%+ on any quiz.",                            "daily",  30),
    ("Study Session",        "Complete 2 lessons in one sitting.",                 "daily",  40),
    ("Review Notes",         "Revisit a completed lesson to reinforce knowledge.", "daily",  20),
    ("Quiz Master",          "Score 100% on any quiz.",                            "weekly", 100),
    ("Consistency Wins",     "Log in for 7 consecutive days.",                     "weekly", 75),
    ("Course Explorer",      "Start a new course you have not tried before.",      "weekly", 60),
    ("Network Architect",    "Build 3 different network topologies.",              "weekly", 120),
    ("Knowledge Sprint",     "Complete 5 lessons across any courses.",             "weekly", 80),
]


def _seed_challenges_if_empty(cur, conn):
    cur.execute("SELECT COUNT(*) FROM challenges")
    if cur.fetchone()[0] == 0:
        cur.executemany(
            """
            INSERT INTO challenges (title, description, challenge_type, xp_reward, is_active)
            VALUES (%s, %s, %s, %s, TRUE)
            ON CONFLICT DO NOTHING
            """,
            _DEFAULT_CHALLENGES,
        )
        conn.commit()


def _challenge_target(required_action, challenge_type, title, description, action_target):
    default_target = 1

    try:
        explicit = int(action_target)
        if explicit > 0:
            return explicit
    except (TypeError, ValueError):
        pass

    action = str(required_action or "").strip().lower()
    if action == "complete_lessons":
        return 2 if str(challenge_type).lower() == "daily" else 5
    if action == "daily_login":
        return 7
    if action == "sandbox_topologies":
        return 3
    if action == "complete_courses":
        return 3
    if action == "quiz_score":
        return 1
    return default_target


def _challenge_progress_value(required_action, metrics):
    action = str(required_action or "").strip().lower()

    if action in ("complete_lesson", "review_lesson"):
        return metrics.get("lessons_done", 0)
    if action == "complete_lessons":
        return metrics.get("lessons_done", 0)
    if action in ("pass_quiz", "quiz_score"):
        return metrics.get("quizzes_done", 0)
    if action == "daily_login":
        return metrics.get("streak_days", 0)
    if action == "start_course":
        return metrics.get("courses_started", 0)
    if action == "complete_courses":
        return metrics.get("courses_done", 0)
    if action in ("sandbox_practice", "sandbox_topologies"):
        return metrics.get("topologies_saved", 0) + metrics.get("lesson_sessions", 0)
    return 0


def _load_challenge_metrics(cur, email):
    metrics = {
        "lessons_done": 0,
        "quizzes_done": 0,
        "challenges_done": 0,
        "courses_started": 0,
        "courses_done": 0,
        "topologies_saved": 0,
        "lesson_sessions": 0,
        "streak_days": 0,
    }
    if not email:
        return metrics

    try:
        cur.execute(
            """
            SELECT
              (SELECT COUNT(*) FROM user_lessons WHERE user_email = %s),
              (SELECT COUNT(*) FROM user_quizzes WHERE user_email = %s),
              (SELECT COUNT(*) FROM user_challenges WHERE user_email = %s),
              (SELECT COUNT(*) FROM user_courses WHERE user_email = %s AND progress > 0),
              (SELECT COUNT(*) FROM user_courses WHERE user_email = %s AND completed = TRUE),
              (SELECT COUNT(*) FROM saved_topologies WHERE user_email = %s),
              (SELECT COUNT(*) FROM lesson_sessions WHERE user_email = %s)
            """,
            (email, email, email, email, email, email, email),
        )
        row = cur.fetchone()
        if row:
            metrics["lessons_done"] = int(row[0] or 0)
            metrics["quizzes_done"] = int(row[1] or 0)
            metrics["challenges_done"] = int(row[2] or 0)
            metrics["courses_started"] = int(row[3] or 0)
            metrics["courses_done"] = int(row[4] or 0)
            metrics["topologies_saved"] = int(row[5] or 0)
            metrics["lesson_sessions"] = int(row[6] or 0)
    except Exception as e:
        print("challenge metrics count error:", e)

    try:
        cur.execute(
            "SELECT login_date FROM user_logins WHERE user_email = %s ORDER BY login_date DESC LIMIT 365",
            (email,),
        )
        dates = sorted({r[0] for r in cur.fetchall()}, reverse=True)
        metrics["streak_days"] = int(login_streak(dates))
    except Exception as e:
        print("challenge metrics streak error:", e)

    return metrics


@user_api.get("/api/user/challenges")
def get_user_challenges():
    # Daily or weekly challenges for the dashboard.
    challenge_type = request.args.get("type", "daily")
    user_email = (request.args.get("user_email") or "").strip().lower()

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        _seed_challenges_if_empty(cur, conn)
        try:
            cur.execute(
                """
                SELECT c.id, c.title, c.description, c.xp_reward, c.required_action, c.action_target
                FROM challenges c
                WHERE c.challenge_type = %s AND c.is_active = TRUE
                ORDER BY c.id
                LIMIT 5
                """,
                (challenge_type,),
            )
            rows = cur.fetchall()
        except Exception:
            cur.execute(
                """
                SELECT c.id, c.title, c.description, c.xp_reward, c.required_action, NULL::text AS action_target
                FROM challenges c
                WHERE c.challenge_type = %s AND c.is_active = TRUE
                ORDER BY c.id
                LIMIT 5
                """,
                (challenge_type,),
            )
            rows = cur.fetchall()

        metrics = _load_challenge_metrics(cur, user_email) if user_email else {}
        challenges = []
        for row in rows:
            required_action = row[4] if len(row) > 4 else None
            action_target = row[5] if len(row) > 5 else None
            target = _challenge_target(required_action, challenge_type, row[1], row[2], action_target)
            progress_value = _challenge_progress_value(required_action, metrics) if metrics else 0
            if target <= 0:
                progress_percent = 0
            else:
                progress_percent = max(0, min(100, int((progress_value / target) * 100)))
            challenges.append({
                "id": row[0],
                "title": row[1],
                "description": row[2],
                "xp_reward": row[3],
                "required_action": required_action,
                "progress_value": progress_value,
                "progress_target": target,
                "progress_percent": progress_percent,
                "completed": bool(progress_value >= target if target > 0 else False),
            })

        return jsonify({"success": True, "challenges": challenges})
    except Exception as e:
        print("get_user_challenges error:", e)
        return jsonify({"success": False, "challenges": [], "message": "Could not load challenges"}), 500
    finally:
        cur.close()
        conn.close()


# ── Activity heatmap ──────────────────────────────────────────────────────────

@user_api.get("/api/user/activity")
def get_user_activity():
    # Merged daily activity data for the heatmap (last N days).
    email = (request.args.get("user_email") or "").strip().lower()
    if not email:
        return jsonify({"success": False, "message": "user_email required"}), 400

    try:
        range_days = max(1, min(int(request.args.get("range", 90)), 365))
    except (TypeError, ValueError):
        range_days = 90

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        by_date = {}

        # Pull from user_daily_activity summary table if it exists
        try:
            cur.execute(
                """
                SELECT activity_date,
                       COALESCE(xp_earned, 0), COALESCE(lessons_completed, 0),
                       COALESCE(quizzes_completed, 0), COALESCE(challenges_completed, 0),
                       COALESCE(login_count, 0)
                FROM user_daily_activity
                WHERE user_email = %s AND activity_date >= CURRENT_DATE - (%s::int - 1)
                ORDER BY activity_date
                """,
                (email, range_days),
            )
            for row in cur.fetchall():
                key = str(row[0])
                by_date[key] = {
                    "xp": int(row[1]), "lessons": int(row[2]),
                    "quizzes": int(row[3]), "challenges": int(row[4]), "logins": int(row[5]),
                }
        except Exception as e:
            print("get_user_activity (daily_activity table) error:", e)

        # Fill in any gaps from xp_log
        try:
            cur.execute(
                """
                SELECT DATE(created_at),
                       COALESCE(SUM(xp_awarded), 0),
                       SUM(CASE WHEN LOWER(action) LIKE '%lesson%'    THEN 1 ELSE 0 END),
                       SUM(CASE WHEN LOWER(action) LIKE '%quiz%'      THEN 1 ELSE 0 END),
                       SUM(CASE WHEN LOWER(action) LIKE '%challenge%' THEN 1 ELSE 0 END)
                FROM xp_log
                WHERE user_email = %s
                  AND created_at >= CURRENT_DATE - (%s::int - 1) * INTERVAL '1 day'
                GROUP BY DATE(created_at)
                """,
                (email, range_days),
            )
            for row in cur.fetchall():
                key = str(row[0])
                ex = by_date.get(key, {})
                by_date[key] = {
                    "xp":        max(ex.get("xp", 0),         int(row[1])),
                    "lessons":   max(ex.get("lessons", 0),    int(row[2])),
                    "quizzes":   max(ex.get("quizzes", 0),    int(row[3])),
                    "challenges":max(ex.get("challenges", 0), int(row[4])),
                    "logins":    ex.get("logins", 0),
                }
        except Exception as e:
            print("get_user_activity (xp_log fallback) error:", e)

        # Login counts from user_logins
        try:
            cur.execute(
                """
                SELECT login_date, COUNT(*)
                FROM user_logins
                WHERE user_email = %s AND login_date >= CURRENT_DATE - (%s::int - 1)
                GROUP BY login_date
                """,
                (email, range_days),
            )
            for row in cur.fetchall():
                key = str(row[0])
                ex = by_date.get(key, {})
                ex["logins"] = max(ex.get("logins", 0), int(row[1]))
                by_date[key] = ex
        except Exception as e:
            print("get_user_activity (user_logins) error:", e)

        activity = []
        for date_key in sorted(by_date.keys()):
            d = by_date[date_key]
            lessons    = d.get("lessons", 0)
            quizzes    = d.get("quizzes", 0)
            challenges = d.get("challenges", 0)
            logins     = d.get("logins", 0)
            xp         = d.get("xp", 0)
            activity.append({
                "date": date_key,
                "xp": xp,
                "lessons": lessons,
                "quizzes": quizzes,
                "challenges": challenges,
                "logins": logins,
                "count": lessons + quizzes + challenges + logins,
            })

        return jsonify({"success": True, "activity": activity})
    except Exception as e:
        print("get_user_activity error:", e)
        return jsonify({"success": False, "message": "Could not load activity"}), 500
    finally:
        cur.close()
        conn.close()


# ── Achievements ─────────────────────────────────────────────────────────────

@user_api.get("/api/user/achievements")
def get_user_achievements():
    # Return all achievements split into unlocked and locked lists for a user.
    email = (request.args.get("user_email") or "").strip().lower()
    if not email:
        return jsonify({"success": False, "message": "user_email required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Fetch every achievement in the catalog.
        cur.execute(
            """
            SELECT id, name, description, icon, xp_reward, rarity
            FROM achievements
            ORDER BY id
            """
        )
        catalog = cur.fetchall()

        # Fetch the ones this user has already earned.
        cur.execute(
            """
            SELECT achievement_id, earned_at
            FROM user_achievements
            WHERE user_email = %s
            """,
            (email,),
        )
        earned = {row[0]: row[1] for row in cur.fetchall()}

        unlocked = []
        locked = []
        for aid, name, desc, icon, xp_reward, rarity in catalog:
            entry = {
                "id": aid,
                "name": name,
                "description": desc,
                "icon": icon or "bi-award-fill",
                "xp_reward": int(xp_reward or 0),
                "rarity": rarity or "common",
            }
            if aid in earned:
                entry["earned_at"] = earned[aid].isoformat() if earned[aid] else None
                unlocked.append(entry)
            else:
                locked.append(entry)

        return jsonify({"success": True, "unlocked": unlocked, "locked": locked})
    except Exception as e:
        print("get_user_achievements error:", e)
        return jsonify({"success": False, "unlocked": [], "locked": [], "message": "Could not load achievements"}), 500
    finally:
        cur.close()
        conn.close()


# ── Streaks ───────────────────────────────────────────────────────────────────

@user_api.get("/api/user/streaks")
def get_user_streaks():
    # Current login streak for a user.
    email = (request.args.get("user_email") or "").strip().lower()
    if not email:
        return jsonify({"success": False, "message": "user_email required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT login_date FROM user_logins WHERE user_email = %s ORDER BY login_date DESC LIMIT 365",
            (email,),
        )
        dates = sorted({r[0] for r in cur.fetchall()}, reverse=True)
        return jsonify({"success": True, "current_streak": login_streak(dates)})
    except Exception as e:
        print("get_user_streaks error:", e)
        return jsonify({"success": False, "message": "Could not load streaks"}), 500
    finally:
        cur.close()
        conn.close()
