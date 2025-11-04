"""
main.py
--------
Simple FastAPI backend for Netology.
Handles user signup and XP tracking (XP does NOT affect user level).
"""

from fastapi import FastAPI, HTTPException
from db import get_connection

app = FastAPI(title="Netology Backend")

# --- Root route ---
@app.get("/")
def home():
    return {"message": "Netology backend is running!"}


# --- Signup route ---
@app.post("/signup")
def signup(
    first_name: str,
    last_name: str,
    email: str,
    password: str,
    level: str,
    reason: str
):
    """
    Create a new user with XP starting at 0.
    The user's chosen level (Novice, Intermediate, Advanced) is stored as-is.
    """
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()

    # Check if email already exists
    cur.execute("SELECT * FROM users WHERE email = %s;", (email,))
    if cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Email already exists")

    # Insert new user (XP starts at 0)
    cur.execute("""
        INSERT INTO users (first_name, last_name, email, password, level, reason, xp)
        VALUES (%s, %s, %s, %s, %s, %s, 0)
    """, (first_name, last_name, email, password, level, reason))

    conn.commit()
    cur.close()
    conn.close()

    return {"message": f"✅ {first_name} created successfully with 0 XP!"}


# --- Gain XP route ---
@app.post("/gain_xp")
def gain_xp(email: str, amount: int):
    """
    Add XP to a user's profile. XP is independent of their chosen level.
    """
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()

    # Add XP
    cur.execute("UPDATE users SET xp = xp + %s WHERE email = %s;", (amount, email))
    conn.commit()

    # Fetch updated XP
    cur.execute("SELECT xp FROM users WHERE email = %s;", (email,))
    new_xp = cur.fetchone()[0]

    cur.close()
    conn.close()

    return {
        "message": f"✅ {email} gained {amount} XP!",
        "new_xp": new_xp
    }
