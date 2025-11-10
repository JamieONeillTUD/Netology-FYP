from db import get_db_connection

def award_xp(email, xp, action):
    """Awards XP to a user and updates their level."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Update XP & numeric level (every 500 XP = +1 level)
        cur.execute("""
            UPDATE users
            SET xp = xp + %s,
                numeric_level = FLOOR(xp / 500)
            WHERE email = %s
            RETURNING xp, numeric_level;
        """, (xp, email))
        result = cur.fetchone()

        # Log XP gain
        cur.execute(
            "INSERT INTO xp_log (user_email, action, xp_awarded) VALUES (%s, %s, %s)",
            (email, action, xp)
        )

        conn.commit()
        cur.close()
        conn.close()

        return {"success": True, "new_xp": result[0], "new_level": result[1]}
    except Exception as e:
        print("XP error:", e)
        return {"success": False, "message": str(e)}
