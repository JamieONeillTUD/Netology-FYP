# achievement_engine.py — Achievement rule checks and unlock awarding.

import json
from datetime import datetime, timedelta

from db import get_db_connection
from xp_system import add_xp_to_user, get_level_progress


def to_int(val, default=0):
    # Safe int conversion, returns default on failure.
    try:
        return int(val)
    except (TypeError, ValueError):
        return int(default)


def parse_rule(raw):
    # Accept dict or JSON string, return a dict.
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def login_streak(dates_desc):
    # Count consecutive login dates ending today.
    if not dates_desc:
        return 0
    check = datetime.now().date()
    streak = 0
    for d in dates_desc:
        if d == check:
            streak += 1
            check -= timedelta(days=1)
        else:
            break
    return streak


def row_count(cur, sql, params):
    # Run a COUNT query and return the result as int.
    cur.execute(sql, params)
    row = cur.fetchone()
    return to_int(row[0]) if row else 0


def load_stats(cur, email):
    # Load all user stats needed for achievement rule checks.
    cur.execute(
        "SELECT COALESCE(xp, 0), COALESCE(numeric_level, 1), COALESCE(onboarding_completed, FALSE) FROM users WHERE email = %s",
        (email,),
    )
    row = cur.fetchone()
    if not row:
        return None

    total_xp = to_int(row[0])
    level, _, _ = get_level_progress(total_xp)
    level = max(to_int(row[1], level), level)

    cur.execute("SELECT login_date FROM user_logins WHERE user_email = %s ORDER BY login_date DESC LIMIT 365", (email,))
    dates = [r[0] for r in cur.fetchall()]

    return {
        "onboarding_completed": bool(row[2]),
        "total_xp": total_xp,
        "level": level,
        "logins_total": row_count(cur, "SELECT COUNT(*) FROM user_logins WHERE user_email = %s", (email,)),
        "login_streak": login_streak(dates),
        "courses_started": row_count(cur, "SELECT COUNT(*) FROM user_courses WHERE user_email = %s", (email,)),
        "courses_completed": row_count(cur, "SELECT COUNT(*) FROM user_courses WHERE user_email = %s AND completed = TRUE", (email,)),
        "lessons_completed": row_count(cur, "SELECT COUNT(*) FROM user_lessons WHERE user_email = %s", (email,)),
        "quizzes_completed": row_count(cur, "SELECT COUNT(*) FROM user_quizzes WHERE user_email = %s", (email,)),
        "challenges_completed": row_count(cur, "SELECT COUNT(*) FROM user_challenges WHERE user_email = %s", (email,)),
    }


# Maps rule type to stats key for simple "value >= target" checks.
METRIC_KEYS = {
    "logins_total": "logins_total",
    "login_streak": "login_streak",
    "courses_started": "courses_started",
    "courses_completed": "courses_completed",
    "lessons_completed": "lessons_completed",
    "quizzes_completed": "quizzes_completed",
    "challenges_completed": "challenges_completed",
    "total_xp": "total_xp",
    "level_reached": "level",
}


def rule_matches(rule, stats, event):
    # Check if a single achievement rule is satisfied.
    kind = (rule.get("type") or "").strip().lower()
    if not kind:
        return False

    if kind == "event":
        expected = (rule.get("event") or "").strip().lower()
        return bool(expected and expected == event)

    if kind == "all_of":
        children = rule.get("rules")
        if not isinstance(children, list) or not children:
            return False
        return all(rule_matches(parse_rule(c), stats, event) for c in children)

    if kind == "any_of":
        children = rule.get("rules")
        if not isinstance(children, list) or not children:
            return False
        return any(rule_matches(parse_rule(c), stats, event) for c in children)

    if kind == "onboarding_completed":
        return bool(stats.get("onboarding_completed"))

    key = METRIC_KEYS.get(kind)
    if not key:
        return False
    return to_int(stats.get(key)) >= max(1, to_int(rule.get("value"), 1))


def evaluate_achievements_for_event(email, event=None):
    # Check all achievement rules for a user and award any newly earned badges.
    # Returns a list of newly unlocked achievement dicts.
    email = (email or "").strip().lower()
    if not email:
        return []

    event = (event or "").strip().lower()

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        unlocked = []

        # Multiple passes so XP from one unlock can chain-trigger another.
        for _ in range(5):
            stats = load_stats(cur, email)
            if not stats:
                break

            cur.execute("SELECT id, name, description, icon, xp_reward, rarity, unlock_criteria FROM achievements ORDER BY id")
            catalog = cur.fetchall()

            cur.execute("SELECT achievement_id FROM user_achievements WHERE user_email = %s", (email,))
            done = {r[0] for r in cur.fetchall()}

            new_this_pass = 0

            for aid, name, desc, icon, xp_reward, rarity, raw_rule in catalog:
                if aid in done:
                    continue
                if not rule_matches(parse_rule(raw_rule), stats, event):
                    continue

                xp = max(0, to_int(xp_reward))

                cur.execute(
                    "INSERT INTO user_achievements (user_email, achievement_id, name, description, tier, xp_awarded) VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (user_email, achievement_id) DO NOTHING",
                    (email, aid, name, desc, rarity, xp),
                )
                if cur.rowcount != 1:
                    continue

                conn.commit()
                done.add(aid)
                new_this_pass += 1

                xp_added = 0
                if xp > 0:
                    xp_added, _ = add_xp_to_user(email, xp, action=f"Achievement: {aid}")

                unlocked.append({
                    "id": aid,
                    "name": name,
                    "description": desc,
                    "icon": icon or "bi-award-fill",
                    "rarity": rarity or "common",
                    "xp_added": to_int(xp_added),
                })

            if new_this_pass == 0:
                break

        return unlocked

    except Exception as e:
        print("Achievement engine error:", e)
        return []
    finally:
        cur.close()
        conn.close()
