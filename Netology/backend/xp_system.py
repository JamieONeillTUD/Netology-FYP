"""
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

Python (Flask)
-------------------------------------------
xp_system.py – XP and Level Progression System

UPDATED (Part 3):
- Level thresholds are now: 100 then 200 then 300 then 400 ...
- Level starts at 1 (Level 1 at 0 XP)
- Rank label:
  Level 1-2 = Novice
  Level 3-4 = Intermediate
  Level 5+  = Advanced
- add_xp_to_user updates numeric_level AND level string
- Added get_level_progress(total_xp) so dashboard/account can display XP progress
"""

from db import get_db_connection

# AI Prompt: Explain the Rank label helper section in clear, simple terms.
# =========================================================
# Rank label helper
# =========================================================


def rank_for_level(level_num: int) -> str:
    if level_num >= 5:
        return "Advanced"
    if level_num >= 3:
        return "Intermediate"
    return "Novice"


""""
AI PROMPTED CODE BELOW
"Can you please update my XP system so level 1 is 0 XP, then level 2 needs 100 XP,
level 3 needs +200 XP, level 4 needs +300 XP, and so on. Also return progress info for UI."
"""

# AI Prompt: Explain the Level progression math section in clear, simple terms.
# =========================================================
# Level progression math
# =========================================================
def get_level_progress(total_xp: int):
    """
    Returns:
      numeric_level (starts at 1),
      xp_into_level (xp earned inside current level),
      next_level_xp (xp needed to reach the next level from current level)
    """

    total_xp = int(total_xp or 0)

    level = 1
    xp_needed = 100
    xp_remaining = total_xp

    while xp_remaining >= xp_needed:
        xp_remaining -= xp_needed
        level += 1
        xp_needed += 100

    # xp_remaining is how much XP is into the current level
    # xp_needed is how much XP needed to reach the NEXT level (from current level)
    return level, xp_remaining, xp_needed


def calculate_level(total_xp):
    # Keep for compatibility with existing code
    level, _, _ = get_level_progress(total_xp)
    return level


""""
AI PROMPTED CODE BELOW
"Cane you please help me write a function that adds XP to a user and updates their user Level""

Add XP to User
---
Adds XP to a user's total and updates their numeric_level and level label.
Logs the XP gain in the xp_log table in database.
"""

# AI Prompt: Explain the XP write + logging section in clear, simple terms.
# =========================================================
# XP write + logging
# =========================================================
def add_xp_to_user(email, xp_amount, action="Lesson Completed"):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Atomically increment XP and return the new total (avoids race conditions)
        cur.execute("""
            UPDATE users
            SET xp = xp + %s
            WHERE email = %s
            RETURNING xp;
        """, (int(xp_amount), email))
        row = cur.fetchone()

        if not row:
            cur.close(); conn.close()
            return (0, 1)

        new_xp = int(row[0] or 0)

        # Calculate updated level + rank from the actual new XP value
        new_level, _, _ = get_level_progress(new_xp)
        new_rank = rank_for_level(new_level)

        # Update level labels
        cur.execute("""
            UPDATE users
            SET numeric_level = %s,
                level = %s
            WHERE email = %s;
        """, (new_level, new_rank, email))

        # Log the XP gain
        cur.execute("""
            INSERT INTO xp_log (user_email, action, xp_awarded)
            VALUES (%s, %s, %s);
        """, (email, action, int(xp_amount)))

        conn.commit()
        cur.close(); conn.close()

        return (int(xp_amount), int(new_level))

    except Exception as e:
        print("XP system error:", e)
        return (0, 1)
