# user_routes.py — Progress, activity, streak, and challenge APIs.

from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

from db import get_db_connection

user_api = Blueprint("user_api", __name__)


# ── Challenges ────────────────────────────────────────────────────────────────

@user_api.get("/api/user/challenges")
def get_user_challenges():
    # Daily or weekly challenges for the dashboard.
    challenge_type = request.args.get("type", "daily")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT c.title, c.description, c.xp_reward
            FROM challenges c
            WHERE c.challenge_type = %s AND c.is_active = TRUE
            LIMIT 5
            """,
            (challenge_type,),
        )
        challenges = [
            {"title": r[0], "description": r[1], "xp_reward": r[2]}
            for r in cur.fetchall()
        ]
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
        except Exception:
            pass

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
        except Exception:
            pass

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
        except Exception:
            pass

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

        if not dates:
            return jsonify({"success": True, "current_streak": 0})

        # Count back from today
        streak = 0
        check = datetime.now().date()
        for d in dates:
            if d == check:
                streak += 1
                check -= timedelta(days=1)
            elif d < check:
                break

        return jsonify({"success": True, "current_streak": streak})
    except Exception as e:
        print("get_user_streaks error:", e)
        return jsonify({"success": False, "message": "Could not load streaks"}), 500
    finally:
        cur.close()
        conn.close()
