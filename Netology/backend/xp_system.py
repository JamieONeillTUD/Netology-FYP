"""
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

Python (Flask)
-------------------------------------------
xp_system.py – XP and Level Progression System

add_xp_to_user(email, xp_amount):
Adds XP to a user’s total
Updates numeric level based on progressive XP requirements
Logs XP changes to xp_log table

calculate_level(total_xp):
Converts total XP into a number
Level XP needed grows by +250 XP each level
"""

from db import get_db_connection

""""
AI PROMPTED CODE BELOW
"Cane you please help me write a function that adds XP to a user and updates their user Level""

Add XP to User
---
Adds XP to a user's total and updates their level.
Logs the XP gain in the xp_log table in database.
"""
def add_xp_to_user(email, xp_amount, action="Lesson Completed"):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get current XP for this user
        cur.execute("SELECT xp FROM users WHERE email = %s;", (email,))
        row = cur.fetchone()

        if not row:
            # User does not exist
            cur.close(); conn.close()
            return (0, 0)

        current_xp = row[0] or 0
        new_xp = current_xp + int(xp_amount)

        # Calculate updated level
        new_level = calculate_level(new_xp)

        # Save updated XP and level to database
        cur.execute("""
            UPDATE users
            SET xp = %s,
                numeric_level = %s
            WHERE email = %s;
        """, (new_xp, new_level, email))

        # Log the XP gain
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


""""
AI PROMPTED CODE BELOW
"Can you please help me write a function that calculates a user's level based on their total XP"

Calculate XP Level
---
Converts total XP into a numeric level.
Level thresholds:
Level 1 is 250 XP
Level 2 is 500 XP total
Level 3 is 750 XP total 
XP requirement increases by +250 each level.
"""
def calculate_level(total_xp):

    level = 0
    xp_needed = 250   # XP needed to reach the next level
    xp_remaining = total_xp

    # Take away XP until the user no longer meets the next level threshold
    while xp_remaining >= xp_needed:
        xp_remaining -= xp_needed
        level += 1
        xp_needed += 250  # Each level requires more XP

    return level
