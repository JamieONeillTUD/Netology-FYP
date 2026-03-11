"""
achievement_engine.py
Achievement catalog, rule checks, and unlock awarding.
"""

import json
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Any

from db import get_db_connection
from xp_system import add_xp_to_user, get_level_progress


_CATALOG_READY = False
MAX_CHAIN_UNLOCK_ROUNDS = 5

# Achievement definitions now come from the SQL seed data
# in netology_schema.sql (achievements table).


def _as_int(value: Any, default: int = 0) -> int:
    """Return an int value, or a fallback when conversion fails."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def _normalize_event_name(event_name: str | None) -> str:
    """Normalize event text so comparisons are consistent."""
    return str(event_name or "").strip().lower()


@contextmanager
def _db_session():
    """Open a DB connection/cursor and always close them."""
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        yield connection, cursor
    finally:
        try:
            cursor.close()
        finally:
            connection.close()


def _count_rows(cursor, sql: str, params: tuple[Any, ...]) -> int:
    """Run a COUNT(*) query and return the integer result."""
    cursor.execute(sql, params)
    row = cursor.fetchone()
    return _as_int(row[0], 0) if row else 0


def ensure_achievement_catalog(force: bool = False) -> None:
    """Validate that the achievements catalog exists and is populated."""
    global _CATALOG_READY
    if _CATALOG_READY and not force:
        return

    try:
        with _db_session() as (connection, cursor):
            cursor.execute("SELECT to_regclass('public.achievements')")
            table_ref = cursor.fetchone()
            if not table_ref or table_ref[0] is None:
                raise RuntimeError(
                    "achievements table missing. Run netology_schema.sql."
                )

            count = _count_rows(cursor, "SELECT COUNT(*) FROM achievements;", ())
            if count <= 0:
                raise RuntimeError(
                    "achievements catalog is empty. Run netology_schema.sql seed."
                )

            connection.commit()
            _CATALOG_READY = True
    except Exception as error:
        _CATALOG_READY = False
        print("Achievement catalog check error:", error)
        raise


def _calculate_login_streak(login_dates_desc: list[Any]) -> int:
    """Count consecutive login dates ending today."""
    if not login_dates_desc:
        return 0

    today = datetime.now().date()
    check_date = today
    streak = 0

    for date_value in login_dates_desc:
        if date_value == check_date:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    return streak


def _to_criteria_dict(criteria_value: Any) -> dict[str, Any]:
    """Accept dict or JSON string criteria values."""
    if isinstance(criteria_value, dict):
        return criteria_value
    if isinstance(criteria_value, str):
        try:
            parsed = json.loads(criteria_value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _load_user_stats(cursor, email: str) -> dict[str, Any] | None:
    """Load all user stats used by achievement rule checks."""
    cursor.execute(
        """
        SELECT COALESCE(xp, 0), COALESCE(numeric_level, 1), COALESCE(onboarding_completed, FALSE)
        FROM users
        WHERE email = %s;
        """,
        (email,),
    )
    row = cursor.fetchone()
    if not row:
        return None

    total_xp = _as_int(row[0], 0)
    computed_level, _xp_into_level, _next_level_xp = get_level_progress(total_xp)
    numeric_level = max(_as_int(row[1], computed_level), computed_level)

    logins_total = _count_rows(
        cursor,
        "SELECT COUNT(*) FROM user_logins WHERE user_email = %s;",
        (email,),
    )

    cursor.execute(
        """
        SELECT login_date
        FROM user_logins
        WHERE user_email = %s
        ORDER BY login_date DESC
        LIMIT 365;
        """,
        (email,),
    )
    login_dates = [row[0] for row in cursor.fetchall()]

    courses_started = _count_rows(
        cursor,
        "SELECT COUNT(*) FROM user_courses WHERE user_email = %s;",
        (email,),
    )
    courses_completed = _count_rows(
        cursor,
        "SELECT COUNT(*) FROM user_courses WHERE user_email = %s AND completed = TRUE;",
        (email,),
    )
    lessons_completed = _count_rows(
        cursor,
        "SELECT COUNT(*) FROM user_lessons WHERE user_email = %s;",
        (email,),
    )
    quizzes_completed = _count_rows(
        cursor,
        "SELECT COUNT(*) FROM user_quizzes WHERE user_email = %s;",
        (email,),
    )
    challenges_completed = _count_rows(
        cursor,
        "SELECT COUNT(*) FROM user_challenges WHERE user_email = %s;",
        (email,),
    )
    slides_completed = _count_rows(
        cursor,
        """
        SELECT COUNT(*)
        FROM user_slide_progress
        WHERE user_email = %s AND completed_at IS NOT NULL;
        """,
        (email,),
    )

    return {
        "onboarding_completed": bool(row[2]),
        "total_xp": total_xp,
        "level": numeric_level,
        "logins_total": logins_total,
        "login_streak": _calculate_login_streak(login_dates),
        "courses_started": courses_started,
        "courses_completed": courses_completed,
        "lessons_completed": lessons_completed,
        "quizzes_completed": quizzes_completed,
        "challenges_completed": challenges_completed,
        "slides_completed": slides_completed,
    }


def _rule_matches(rule: dict[str, Any], stats: dict[str, Any], event_name: str) -> bool:
    """Return True if a single rule is satisfied."""
    rule_type = str(rule.get("type") or "").strip().lower()
    if not rule_type:
        return False

    if rule_type == "event":
        expected_event = _normalize_event_name(rule.get("event"))
        return bool(expected_event and expected_event == event_name)

    if rule_type == "all_of":
        child_rules = rule.get("rules")
        if not isinstance(child_rules, list) or not child_rules:
            return False
        return all(_rule_matches(_to_criteria_dict(item), stats, event_name) for item in child_rules)

    if rule_type == "any_of":
        child_rules = rule.get("rules")
        if not isinstance(child_rules, list) or not child_rules:
            return False
        return any(_rule_matches(_to_criteria_dict(item), stats, event_name) for item in child_rules)

    if rule_type == "onboarding_completed":
        return bool(stats.get("onboarding_completed"))

    metric_name_by_rule_type = {
        "logins_total": "logins_total",
        "login_streak": "login_streak",
        "courses_started": "courses_started",
        "courses_completed": "courses_completed",
        "lessons_completed": "lessons_completed",
        "quizzes_completed": "quizzes_completed",
        "challenges_completed": "challenges_completed",
        "slides_completed": "slides_completed",
        "total_xp": "total_xp",
        "level_reached": "level",
    }

    metric_name = metric_name_by_rule_type.get(rule_type)
    if not metric_name:
        return False

    current_value = _as_int(stats.get(metric_name), 0)
    target_value = max(1, _as_int(rule.get("value"), 1))
    return current_value >= target_value


def evaluate_achievements_for_event(user_email: str, event_name: str | None = None) -> list[dict[str, Any]]:
    """
    Evaluate all achievement rules for one user and award any newly satisfied badges.
    Returns a list of newly unlocked achievements.
    """
    email = str(user_email or "").strip().lower()
    if not email:
        return []

    ensure_achievement_catalog()
    normalized_event = _normalize_event_name(event_name)

    try:
        with _db_session() as (connection, cursor):
            unlocked_achievements: list[dict[str, Any]] = []

            # Run multiple passes so XP from one unlock can trigger another unlock.
            for _ in range(MAX_CHAIN_UNLOCK_ROUNDS):
                user_stats = _load_user_stats(cursor, email)
                if user_stats is None:
                    break

                cursor.execute(
                    """
                    SELECT id, name, description, category, icon, xp_reward, rarity, unlock_criteria
                    FROM achievements
                    ORDER BY id;
                    """
                )
                catalog_entries = cursor.fetchall()

                cursor.execute(
                    """
                    SELECT achievement_id
                    FROM user_achievements
                    WHERE user_email = %s;
                    """,
                    (email,),
                )
                unlocked_ids = {row[0] for row in cursor.fetchall()}

                unlocks_this_pass = 0

                for entry in catalog_entries:
                    achievement_id, name, description, category, icon, xp_reward, rarity, raw_rule = entry
                    if achievement_id in unlocked_ids:
                        continue

                    rule = _to_criteria_dict(raw_rule)
                    if not _rule_matches(rule, user_stats, normalized_event):
                        continue

                    achievement_xp = max(0, _as_int(xp_reward))

                    cursor.execute(
                        """
                        INSERT INTO user_achievements
                            (user_email, achievement_id, name, description, tier, xp_awarded)
                        VALUES
                            (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (user_email, achievement_id) DO NOTHING;
                        """,
                        (email, achievement_id, name, description, rarity, achievement_xp),
                    )
                    if cursor.rowcount != 1:
                        continue

                    connection.commit()
                    unlocked_ids.add(achievement_id)
                    unlocks_this_pass += 1

                    xp_added = 0
                    new_level = _as_int(user_stats.get("level"), 1)
                    if achievement_xp > 0:
                        xp_added, new_level = add_xp_to_user(
                            email, achievement_xp, action=f"Achievement: {achievement_id}"
                        )

                    unlocked_achievements.append(
                        {
                            "id": achievement_id,
                            "name": name,
                            "description": description,
                            "category": category,
                            "icon": icon or "bi-award-fill",
                            "rarity": rarity or "common",
                            "xp_awarded": achievement_xp,
                            "xp_added": _as_int(xp_added, 0),
                            "new_level": _as_int(new_level, _as_int(user_stats.get("level"), 1)),
                        }
                    )

                if unlocks_this_pass == 0:
                    break

            return unlocked_achievements

    except Exception as error:
        print("Achievement engine error:", error)
        return []


def get_user_achievements_payload(user_email: str) -> dict[str, Any]:
    """
    Return unlocked + locked achievements for UI, with fallback to stored
    user_achievement fields when catalog entries are missing.
    """
    email = str(user_email or "").strip().lower()
    if not email:
        return {"success": False, "unlocked": [], "locked": [], "total_unlocked": 0, "total_available": 0}

    ensure_achievement_catalog()
    try:
        with _db_session() as (_connection, cursor):
            cursor.execute(
                """
                SELECT
                    ua.achievement_id AS id,
                    COALESCE(a.name, ua.name, 'Achievement') AS name,
                    COALESCE(a.description, ua.description, '') AS description,
                    COALESCE(a.rarity, ua.tier, 'common') AS rarity,
                    COALESCE(NULLIF(a.icon, ''), 'bi-award-fill') AS icon,
                    COALESCE(a.xp_reward, ua.xp_awarded, 0) AS xp_reward,
                    COALESCE(ua.xp_awarded, 0) AS xp_awarded,
                    ua.earned_at
                FROM user_achievements ua
                LEFT JOIN achievements a
                    ON a.id = ua.achievement_id
                WHERE ua.user_email = %s
                ORDER BY ua.earned_at DESC;
                """,
                (email,),
            )

            unlocked = [
                {
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "rarity": row[3],
                    "icon": row[4],
                    "xp_reward": _as_int(row[5], 0),
                    "xp_awarded": _as_int(row[6], 0),
                    "earned_at": row[7].isoformat() if row[7] else None,
                }
                for row in cursor.fetchall()
            ]

            cursor.execute(
                """
                SELECT id, name, description, rarity, COALESCE(NULLIF(icon, ''), 'bi-award-fill'), COALESCE(xp_reward, 0)
                FROM achievements
                WHERE id NOT IN (
                    SELECT achievement_id
                    FROM user_achievements
                    WHERE user_email = %s
                )
                ORDER BY id;
                """,
                (email,),
            )
            locked = [
                {
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "rarity": row[3],
                    "icon": row[4],
                    "xp_reward": _as_int(row[5], 0),
                }
                for row in cursor.fetchall()
            ]

        return {
            "success": True,
            "unlocked": unlocked,
            "locked": locked,
            "total_unlocked": len(unlocked),
            "total_available": len(unlocked) + len(locked),
        }
    except Exception as error:
        print("Achievement payload error:", error)
        return {"success": False, "unlocked": [], "locked": [], "total_unlocked": 0, "total_available": 0}
