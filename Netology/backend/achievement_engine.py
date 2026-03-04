"""
achievement_engine.py
Central achievement catalog, rule evaluation, and unlock awarding.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any

from db import get_db_connection
from xp_system import add_xp_to_user, get_level_progress


_CATALOG_READY = False


# Single source of truth for all unlockable achievements.
ACHIEVEMENT_DEFINITIONS = [
    {
        "id": "first_login",
        "name": "Welcome Back",
        "description": "Log in for the first time.",
        "category": "Onboarding",
        "icon": "bi-door-open-fill",
        "xp_reward": 10,
        "rarity": "common",
        "unlock_criteria": {"type": "logins_total", "value": 1},
    },
    {
        "id": "login_streak_3",
        "name": "Momentum",
        "description": "Maintain a 3-day login streak.",
        "category": "Streak",
        "icon": "bi-calendar-check-fill",
        "xp_reward": 40,
        "rarity": "common",
        "unlock_criteria": {"type": "login_streak", "value": 3},
    },
    {
        "id": "five_day_streak",
        "name": "On Fire!",
        "description": "Maintain a 5-day login streak.",
        "category": "Streak",
        "icon": "bi-fire",
        "xp_reward": 75,
        "rarity": "rare",
        "unlock_criteria": {"type": "login_streak", "value": 5},
    },
    {
        "id": "login_streak_10",
        "name": "Unstoppable",
        "description": "Maintain a 10-day login streak.",
        "category": "Streak",
        "icon": "bi-fire",
        "xp_reward": 160,
        "rarity": "epic",
        "unlock_criteria": {"type": "login_streak", "value": 10},
    },
    {
        "id": "onboarding_complete",
        "name": "Tour Complete",
        "description": "Complete the onboarding walkthrough.",
        "category": "Onboarding",
        "icon": "bi-compass-fill",
        "xp_reward": 60,
        "rarity": "common",
        "unlock_criteria": {"type": "event", "event": "onboarding_complete"},
    },
    {
        "id": "course_starter",
        "name": "Course Starter",
        "description": "Start your first course.",
        "category": "Courses",
        "icon": "bi-journal-plus",
        "xp_reward": 20,
        "rarity": "common",
        "unlock_criteria": {"type": "courses_started", "value": 1},
    },
    {
        "id": "course_explorer",
        "name": "Course Explorer",
        "description": "Start 3 courses.",
        "category": "Courses",
        "icon": "bi-journals",
        "xp_reward": 60,
        "rarity": "rare",
        "unlock_criteria": {"type": "courses_started", "value": 3},
    },
    {
        "id": "first_lesson",
        "name": "First Steps",
        "description": "Complete your first lesson.",
        "category": "Learning",
        "icon": "bi-bookmark-check-fill",
        "xp_reward": 30,
        "rarity": "common",
        "unlock_criteria": {"type": "lessons_completed", "value": 1},
    },
    {
        "id": "speed_learner",
        "name": "Speed Learner",
        "description": "Complete 5 lessons.",
        "category": "Learning",
        "icon": "bi-lightning-charge-fill",
        "xp_reward": 100,
        "rarity": "rare",
        "unlock_criteria": {"type": "lessons_completed", "value": 5},
    },
    {
        "id": "lesson_marathon",
        "name": "Lesson Marathon",
        "description": "Complete 15 lessons.",
        "category": "Learning",
        "icon": "bi-lightning-fill",
        "xp_reward": 220,
        "rarity": "epic",
        "unlock_criteria": {"type": "lessons_completed", "value": 15},
    },
    {
        "id": "first_quiz",
        "name": "Quiz Rookie",
        "description": "Complete your first quiz.",
        "category": "Quizzes",
        "icon": "bi-patch-question-fill",
        "xp_reward": 35,
        "rarity": "common",
        "unlock_criteria": {"type": "quizzes_completed", "value": 1},
    },
    {
        "id": "quiz_machine",
        "name": "Quiz Machine",
        "description": "Complete 5 quizzes.",
        "category": "Quizzes",
        "icon": "bi-ui-checks-grid",
        "xp_reward": 120,
        "rarity": "rare",
        "unlock_criteria": {"type": "quizzes_completed", "value": 5},
    },
    {
        "id": "first_challenge",
        "name": "Challenge Accepted",
        "description": "Complete your first challenge.",
        "category": "Challenges",
        "icon": "bi-shield-check",
        "xp_reward": 45,
        "rarity": "common",
        "unlock_criteria": {"type": "challenges_completed", "value": 1},
    },
    {
        "id": "challenge_crusher",
        "name": "Challenge Crusher",
        "description": "Complete 5 challenges.",
        "category": "Challenges",
        "icon": "bi-trophy-fill",
        "xp_reward": 170,
        "rarity": "epic",
        "unlock_criteria": {"type": "challenges_completed", "value": 5},
    },
    {
        "id": "first_course_complete",
        "name": "Course Finisher",
        "description": "Complete your first course.",
        "category": "Courses",
        "icon": "bi-check2-square",
        "xp_reward": 200,
        "rarity": "rare",
        "unlock_criteria": {"type": "courses_completed", "value": 1},
    },
    {
        "id": "novice_master",
        "name": "Novice Master",
        "description": "Complete 3 courses.",
        "category": "Courses",
        "icon": "bi-mortarboard-fill",
        "xp_reward": 320,
        "rarity": "epic",
        "unlock_criteria": {"type": "courses_completed", "value": 3},
    },
    {
        "id": "level_3_reached",
        "name": "Rising Talent",
        "description": "Reach Level 3.",
        "category": "Progress",
        "icon": "bi-bar-chart-steps",
        "xp_reward": 120,
        "rarity": "rare",
        "unlock_criteria": {"type": "level_reached", "value": 3},
    },
    {
        "id": "level_5_reached",
        "name": "Advanced Path",
        "description": "Reach Level 5.",
        "category": "Progress",
        "icon": "bi-stars",
        "xp_reward": 260,
        "rarity": "epic",
        "unlock_criteria": {"type": "level_reached", "value": 5},
    },
    {
        "id": "xp_500_club",
        "name": "500 XP Club",
        "description": "Earn a total of 500 XP.",
        "category": "Progress",
        "icon": "bi-gem",
        "xp_reward": 150,
        "rarity": "rare",
        "unlock_criteria": {"type": "total_xp", "value": 500},
    },
    {
        "id": "all_rounder",
        "name": "All-Rounder",
        "description": "Complete at least one lesson, quiz, and challenge.",
        "category": "Mastery",
        "icon": "bi-award-fill",
        "xp_reward": 180,
        "rarity": "epic",
        "unlock_criteria": {
            "type": "all_of",
            "rules": [
                {"type": "lessons_completed", "value": 1},
                {"type": "quizzes_completed", "value": 1},
                {"type": "challenges_completed", "value": 1},
            ],
        },
    },
]


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def _norm_event(event_name: str | None) -> str:
    return str(event_name or "").strip().lower()


def _ensure_tables(cur) -> None:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS achievements (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            description TEXT,
            category VARCHAR(50),
            icon VARCHAR(500),
            xp_reward INTEGER DEFAULT 0,
            rarity VARCHAR(20) DEFAULT 'common',
            unlock_criteria JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS user_achievements (
            id SERIAL PRIMARY KEY,
            user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
            achievement_id VARCHAR(100) NOT NULL,
            name VARCHAR(150),
            description TEXT,
            tier VARCHAR(20),
            xp_awarded INTEGER DEFAULT 0,
            earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_email, achievement_id)
        );
        """
    )
    cur.execute("ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS name VARCHAR(150);")
    cur.execute("ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS description TEXT;")
    cur.execute("ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS tier VARCHAR(20);")
    cur.execute("ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0;")
    cur.execute("ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")
    cur.execute("ALTER TABLE achievements ADD COLUMN IF NOT EXISTS icon VARCHAR(500);")
    cur.execute("ALTER TABLE achievements ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 0;")
    cur.execute("ALTER TABLE achievements ADD COLUMN IF NOT EXISTS rarity VARCHAR(20) DEFAULT 'common';")
    cur.execute("ALTER TABLE achievements ADD COLUMN IF NOT EXISTS unlock_criteria JSONB;")
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_user_achievements_email
        ON user_achievements (user_email);
        """
    )


def ensure_achievement_catalog(force: bool = False) -> None:
    global _CATALOG_READY
    if _CATALOG_READY and not force:
        return

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        _ensure_tables(cur)
        payload_rows = [
            (
                item["id"],
                item["name"],
                item["description"],
                item["category"],
                item["icon"],
                _safe_int(item["xp_reward"]),
                item["rarity"],
                json.dumps(item["unlock_criteria"]),
            )
            for item in ACHIEVEMENT_DEFINITIONS
        ]

        cur.executemany(
            """
            INSERT INTO achievements
                (id, name, description, category, icon, xp_reward, rarity, unlock_criteria)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                category = EXCLUDED.category,
                icon = EXCLUDED.icon,
                xp_reward = EXCLUDED.xp_reward,
                rarity = EXCLUDED.rarity,
                unlock_criteria = EXCLUDED.unlock_criteria;
            """,
            payload_rows,
        )

        conn.commit()
        _CATALOG_READY = True
    finally:
        cur.close()
        conn.close()


def _compute_login_streak(login_dates_desc: list[Any]) -> int:
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


def _parse_criteria(criteria_value: Any) -> dict[str, Any]:
    if isinstance(criteria_value, dict):
        return criteria_value
    if isinstance(criteria_value, str):
        try:
            parsed = json.loads(criteria_value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _load_user_metrics(cur, email: str) -> dict[str, Any] | None:
    cur.execute(
        """
        SELECT COALESCE(xp, 0), COALESCE(numeric_level, 1), COALESCE(onboarding_completed, FALSE)
        FROM users
        WHERE email = %s;
        """,
        (email,),
    )
    row = cur.fetchone()
    if not row:
        return None

    total_xp = _safe_int(row[0], 0)
    calc_level, _xp_into_level, _next_level_xp = get_level_progress(total_xp)
    numeric_level = max(_safe_int(row[1], calc_level), calc_level)

    cur.execute("SELECT COUNT(*) FROM user_logins WHERE user_email = %s;", (email,))
    logins_total = _safe_int(cur.fetchone()[0], 0)

    cur.execute(
        """
        SELECT login_date
        FROM user_logins
        WHERE user_email = %s
        ORDER BY login_date DESC
        LIMIT 365;
        """,
        (email,),
    )
    login_dates = [r[0] for r in cur.fetchall()]

    cur.execute("SELECT COUNT(*) FROM user_courses WHERE user_email = %s;", (email,))
    courses_started = _safe_int(cur.fetchone()[0], 0)

    cur.execute("SELECT COUNT(*) FROM user_courses WHERE user_email = %s AND completed = TRUE;", (email,))
    courses_completed = _safe_int(cur.fetchone()[0], 0)

    cur.execute("SELECT COUNT(*) FROM user_lessons WHERE user_email = %s;", (email,))
    lessons_completed = _safe_int(cur.fetchone()[0], 0)

    cur.execute("SELECT COUNT(*) FROM user_quizzes WHERE user_email = %s;", (email,))
    quizzes_completed = _safe_int(cur.fetchone()[0], 0)

    cur.execute("SELECT COUNT(*) FROM user_challenges WHERE user_email = %s;", (email,))
    challenges_completed = _safe_int(cur.fetchone()[0], 0)

    cur.execute(
        """
        SELECT COUNT(*)
        FROM user_slide_progress
        WHERE user_email = %s AND completed_at IS NOT NULL;
        """,
        (email,),
    )
    slides_completed = _safe_int(cur.fetchone()[0], 0)

    return {
        "onboarding_completed": bool(row[2]),
        "total_xp": total_xp,
        "level": numeric_level,
        "logins_total": logins_total,
        "login_streak": _compute_login_streak(login_dates),
        "courses_started": courses_started,
        "courses_completed": courses_completed,
        "lessons_completed": lessons_completed,
        "quizzes_completed": quizzes_completed,
        "challenges_completed": challenges_completed,
        "slides_completed": slides_completed,
    }


def _criteria_met(criteria: dict[str, Any], metrics: dict[str, Any], event_name: str) -> bool:
    ctype = str(criteria.get("type") or "").strip().lower()
    if not ctype:
        return False

    if ctype == "event":
        expected_event = _norm_event(criteria.get("event"))
        return bool(expected_event and expected_event == event_name)

    if ctype == "all_of":
        rules = criteria.get("rules")
        if not isinstance(rules, list) or not rules:
            return False
        return all(_criteria_met(_parse_criteria(rule), metrics, event_name) for rule in rules)

    if ctype == "any_of":
        rules = criteria.get("rules")
        if not isinstance(rules, list) or not rules:
            return False
        return any(_criteria_met(_parse_criteria(rule), metrics, event_name) for rule in rules)

    if ctype == "onboarding_completed":
        return bool(metrics.get("onboarding_completed"))

    metric_key_by_type = {
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

    metric_key = metric_key_by_type.get(ctype)
    if not metric_key:
        return False

    current_value = _safe_int(metrics.get(metric_key), 0)
    target_value = max(1, _safe_int(criteria.get("value"), 1))
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
    normalized_event = _norm_event(event_name)

    conn = get_db_connection()
    cur = conn.cursor()
    unlocked_results: list[dict[str, Any]] = []

    try:
        # Multiple rounds allow chained unlocks when achievement XP pushes a user
        # into additional thresholds (e.g. level/XP-based achievements).
        for _round in range(5):
            metrics = _load_user_metrics(cur, email)
            if metrics is None:
                break

            cur.execute(
                """
                SELECT id, name, description, category, icon, xp_reward, rarity, unlock_criteria
                FROM achievements
                ORDER BY id;
                """
            )
            catalog_rows = cur.fetchall()

            cur.execute(
                """
                SELECT achievement_id
                FROM user_achievements
                WHERE user_email = %s;
                """,
                (email,),
            )
            already_unlocked_ids = {r[0] for r in cur.fetchall()}

            unlocked_this_round = 0
            for row in catalog_rows:
                achievement_id, name, description, category, icon, xp_reward, rarity, criteria_value = row
                if achievement_id in already_unlocked_ids:
                    continue

                criteria = _parse_criteria(criteria_value)
                if not _criteria_met(criteria, metrics, normalized_event):
                    continue

                cur.execute(
                    """
                    INSERT INTO user_achievements
                        (user_email, achievement_id, name, description, tier, xp_awarded)
                    VALUES
                        (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_email, achievement_id) DO NOTHING;
                    """,
                    (email, achievement_id, name, description, rarity, _safe_int(xp_reward)),
                )

                inserted = cur.rowcount == 1
                conn.commit()
                if not inserted:
                    continue

                already_unlocked_ids.add(achievement_id)
                unlocked_this_round += 1

                xp_added = 0
                new_level = metrics.get("level", 1)
                achievement_xp = max(0, _safe_int(xp_reward))
                if achievement_xp > 0:
                    xp_added, new_level = add_xp_to_user(
                        email, achievement_xp, action=f"Achievement: {achievement_id}"
                    )

                unlocked_results.append(
                    {
                        "id": achievement_id,
                        "name": name,
                        "description": description,
                        "category": category,
                        "icon": icon or "bi-award-fill",
                        "rarity": rarity or "common",
                        "xp_awarded": achievement_xp,
                        "xp_added": _safe_int(xp_added, 0),
                        "new_level": _safe_int(new_level, metrics.get("level", 1)),
                    }
                )

            if unlocked_this_round == 0:
                break

        return unlocked_results

    except Exception as e:
        conn.rollback()
        print("Achievement engine error:", e)
        return []
    finally:
        cur.close()
        conn.close()


def get_user_achievements_payload(user_email: str) -> dict[str, Any]:
    """
    Return unlocked + locked achievements for UI, with fallback to stored
    user_achievement fields when catalog entries are missing.
    """
    email = str(user_email or "").strip().lower()
    if not email:
        return {"success": False, "unlocked": [], "locked": [], "total_unlocked": 0, "total_available": 0}

    ensure_achievement_catalog()
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
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

        unlocked = []
        for row in cur.fetchall():
            unlocked.append(
                {
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "rarity": row[3],
                    "icon": row[4],
                    "xp_reward": _safe_int(row[5], 0),
                    "xp_awarded": _safe_int(row[6], 0),
                    "earned_at": row[7].isoformat() if row[7] else None,
                }
            )

        cur.execute(
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
                "xp_reward": _safe_int(row[5], 0),
            }
            for row in cur.fetchall()
        ]

        return {
            "success": True,
            "unlocked": unlocked,
            "locked": locked,
            "total_unlocked": len(unlocked),
            "total_available": len(unlocked) + len(locked),
        }
    except Exception as e:
        print("Achievement payload error:", e)
        return {"success": False, "unlocked": [], "locked": [], "total_unlocked": 0, "total_available": 0}
    finally:
        cur.close()
        conn.close()
