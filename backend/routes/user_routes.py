"""
user_routes.py
---------------
Handles user authentication and account creation routes.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db import get_connection

router = APIRouter(prefix="/user", tags=["User"])

# --- Pydantic models ---
class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str
    level: str
    reason: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str


# --- Routes ---

@router.post("/signup")
def signup(user: UserSignup):
    """Add a new user to the existing 'users' table."""
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO users (name, email, password, level, reason)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id;
            """,
            (user.name, user.email, user.password, user.level, user.reason)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return {
            "message": "User registered successfully!",
            "user_id": new_id,
            "name": user.name,
            "level": user.level
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Signup failed: {str(e)}")


@router.post("/login")
def login(credentials: UserLogin):
    """Login user (checks database for existing email and password)."""
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, level FROM users WHERE email=%s AND password=%s;",
        (credentials.email, credentials.password)
    )
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "message": f"Welcome back, {user[1]}!",
        "name": user[1],
        "level": user[2]
    }


@router.post("/forgot-password")
def forgot_password(data: dict):
    """Check if user exists by email."""
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email=%s;", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="Email not found")

    return {"message": "Email verified", "email": email}


@router.put("/reset-password")
def reset_password(data: dict):
    """Update user password directly."""
    email = data.get("email")
    new_password = data.get("new_password")

    if not email or not new_password:
        raise HTTPException(status_code=400, detail="Email and new password required")

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()
    cur.execute("UPDATE users SET password=%s WHERE email=%s RETURNING id;", (new_password, email))
    updated = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not updated:
        raise HTTPException(status_code=404, detail="Email not found")

    return {"message": "Password updated successfully"}
