"""
xp_system.py – XP and level progression helpers.
"""

from contextlib import contextmanager

from db import get_db_connection

# Keep all XP rules in one place so route files stay simple.

DEFAULT_LEVEL = 1
BASE_XP_FOR_NEXT_LEVEL = 100
LEVEL_STEP_XP = 100
DEFAULT_XP_ACTION = "Lesson Completed"
DEFAULT_QUIZ_XP = 5
DEFAULT_CHALLENGE_XP = 15


@contextmanager
def _db_cursor():
    """Open a DB connection/cursor and always close them."""
    db_connection = get_db_connection()
    db_cursor = db_connection.cursor()
    try:
        yield db_connection, db_cursor
    finally:
        try:
            db_cursor.close()
        finally:
            db_connection.close()


def _safe_non_negative_int(value) -> int:
    """Convert a value to int. Invalid/negative values become 0."""
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0


def rank_for_level(level_number: int) -> str:
    """Return the rank label for a numeric level."""
    if level_number >= 5:
        return "Advanced"
    if level_number >= 3:
        return "Intermediate"
    return "Novice"


def get_level_progress(total_xp: int) -> tuple[int, int, int]:
    """
    Return (numeric_level, xp_into_level, next_level_xp).

    Level 1 starts at 0 XP.
    Each new level needs 100 more XP than the previous one.
    """
    total_xp_value = _safe_non_negative_int(total_xp)
    current_level = DEFAULT_LEVEL
    xp_needed_for_next_level = BASE_XP_FOR_NEXT_LEVEL
    xp_progress_within_level = total_xp_value

    while xp_progress_within_level >= xp_needed_for_next_level:
        xp_progress_within_level -= xp_needed_for_next_level
        current_level += 1
        xp_needed_for_next_level += LEVEL_STEP_XP

    return current_level, xp_progress_within_level, xp_needed_for_next_level


def add_xp_to_user(email: str, xp_amount: int, action: str = DEFAULT_XP_ACTION) -> tuple[int, int]:
    """Add XP, recalculate level/rank, and write an xp_log record."""
    xp_amount_to_add = _safe_non_negative_int(xp_amount)
    if not email or xp_amount_to_add <= 0:
        return 0, DEFAULT_LEVEL

    try:
        with _db_cursor() as (db_connection, db_cursor):
            db_cursor.execute(
                """
                UPDATE users
                SET xp = xp + %s
                WHERE email = %s
                RETURNING xp;
                """,
                (xp_amount_to_add, email),
            )
            updated_user_row = db_cursor.fetchone()
            if not updated_user_row:
                return 0, DEFAULT_LEVEL

            new_total_xp = _safe_non_negative_int(updated_user_row[0])
            new_level, _, _ = get_level_progress(new_total_xp)
            new_rank = rank_for_level(new_level)

            db_cursor.execute(
                """
                UPDATE users
                SET numeric_level = %s,
                    level = %s
                WHERE email = %s;
                """,
                (new_level, new_rank, email),
            )

            db_cursor.execute(
                """
                INSERT INTO xp_log (user_email, action, xp_awarded)
                VALUES (%s, %s, %s);
                """,
                (email, action, xp_amount_to_add),
            )
            db_connection.commit()

        return xp_amount_to_add, new_level
    except Exception as error:
        print("XP system error:", error)
        return 0, DEFAULT_LEVEL
