# xp_system.py — XP award, level calculation, and rank helpers.

from db import get_db_connection


def rank_for_level(level):
    # Convert numeric level to a rank name.
    if level >= 5:
        return "Advanced"
    if level >= 3:
        return "Intermediate"
    return "Novice"


def get_level_progress(total_xp):
    # Returns (level, xp_into_level, xp_needed_for_next_level).
    xp = max(0, int(total_xp or 0))
    level = 1
    needed = 100

    while xp >= needed:
        xp -= needed
        level += 1
        needed += 100

    return level, xp, needed


def add_xp_to_user(email, amount, action="Lesson Completed"):
    # Add XP, update level, log it. Returns (xp_added, new_level).
    amount = max(0, int(amount or 0))
    if not email or amount <= 0:
        return 0, 1

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE users SET xp = xp + %s WHERE email = %s RETURNING xp", (amount, email))
        row = cur.fetchone()
        if not row:
            return 0, 1

        new_level, _, _ = get_level_progress(row[0])
        cur.execute(
            "UPDATE users SET numeric_level = %s, level = %s WHERE email = %s",
            (new_level, rank_for_level(new_level), email),
        )
        cur.execute(
            "INSERT INTO xp_log (user_email, action, xp_awarded) VALUES (%s, %s, %s)",
            (email, action, amount),
        )
        conn.commit()
        return amount, new_level
    except Exception as e:
        print("XP system error:", e)
        return 0, 1
    finally:
        cur.close()
        conn.close()
