"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

xp_system.py - XP and Level System
---
This file handles the XP and level system for Netology.
It works out the user's level, rank, and progress to the
next level, and it also saves new XP when the user earns it.

It is mainly used when lessons, quizzes, challenges,
and achievements give XP rewards.
"""

from db import email_from, get_db_connection, to_int

def rank_for_level(level):
    # Convert a numeric level into the matching rank name.
    if level >= 5:
        return "Advanced"
    if level >= 3:
        return "Intermediate"
    return "Novice"


def get_level_progress(total_xp):
    # Return the level, XP into that level, and XP needed for the next one.
    xp = max(0, to_int(total_xp))
    level = 1
    needed = 100

    while xp >= needed:
        xp -= needed
        level += 1
        needed += 100

    return level, xp, needed


def add_xp_to_user(email, amount, action="Lesson Completed"):
    # Add XP to a user, update their level, and save the XP log entry.
    email = email_from(email)
    amount = max(0, to_int(amount))
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
        new_rank = rank_for_level(new_level)
        cur.execute(
            "UPDATE users SET numeric_level = %s, level = %s WHERE email = %s",
            (new_level, new_rank, email),
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
