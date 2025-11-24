"""
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

Python (Flask) – Netology Learning Platform
-------------------------------------------
xp_system.py – Handles XP awards and level progression.
Includes:
  - add_xp_to_user(email, xp_amount)
  - Progressive level calculation (250, 500, 750 XP per level)
  - XP logging to xp_log table
Used by course_routes.py whenever lessons or courses are completed.
"""

from db import get_db_connection

# MAIN FUNCTION – ADD XP TO USER
def add_xp_to_user(email, xp_amount, action="Lesson Completed"):
    """
    Adds XP to a user's total and updates their numeric_level.
    Uses progressive leveling (250, 500, 750, 1000, ...).
    Also logs XP gains to the xp_log table.
    Returns the XP added and new level.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get current XP 
        cur.execute("SELECT xp FROM users WHERE email = %s;", (email,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return (0, 0)  # user not found

        current_xp = row[0] or 0
        new_xp = current_xp + int(xp_amount)

        # Calculate new level 
        new_level = calculate_level(new_xp)

        # Update user XP and numeric level 
        cur.execute("""
            UPDATE users
            SET xp = %s,
                numeric_level = %s
            WHERE email = %s;
        """, (new_xp, new_level, email))

        #  Log XP gain in xp_log
        cur.execute("""
            INSERT INTO xp_log (user_email, action, xp_awarded)
            VALUES (%s, %s, %s);
        """, (email, action, xp_amount))

        conn.commit()
        cur.close(); conn.close()

        return (xp_amount, new_level)

    except Exception as e:
        print("XP system error:", e)
        return (0, 0)

# LEVEL CALCULATION FUNCTION
def calculate_level(total_xp):
    """
    Converts total XP into a numeric level.
    XP required increases each level:
      Level 1: 250 XP
      Level 2: +500 XP
      Level 3: +750 XP, etc.
    """
    level = 0
    xp_needed = 250
    xp_remaining = total_xp

    while xp_remaining >= xp_needed:
        xp_remaining -= xp_needed
        level += 1
        xp_needed += 250  # each level requires 250 more XP

    return level
