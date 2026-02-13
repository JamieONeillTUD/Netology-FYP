"""
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

Python (Flask)
-------------------------------------------
auth_routes.py – User Authentication Routes

Register new users
Login existing users
Shows basic user profile (XP, level, name)
Logout
Forgot password reset

UPDATED (Starting Level Unlock Change):
- The signup “level choice” (novice/intermediate/advanced) NO LONGER changes the user’s actual level.
  - Users always start at Level 1 (numeric_level = 1) with rank "Novice"
- The level choice is now stored as a "start_level" preference for unlocking courses/challenges.
  - To avoid changing your DB schema, we store it inside the existing `reasons` field as:
      start_level=<choice>; reason1, reason2...
- login + user-info now return "start_level" so your frontend can unlock content based on it.

IMPORTANT:
- Your real progression still comes from XP via get_level_progress().
"""

from flask import Blueprint, request, jsonify, redirect
from flask_bcrypt import Bcrypt
from db import get_db_connection

# XP/Level progression helpers (Part 3)
from xp_system import get_level_progress, rank_for_level, add_xp_to_user

auth = Blueprint("auth", __name__)
bcrypt = Bcrypt()


# AI Prompt: Explain the Helper Functions (Jamie style: small + readable) section in clear, simple terms.
# =========================================================
# Helper Functions (Jamie style: small + readable)
# =========================================================

def _norm_email(email: str) -> str:
    """Lowercase + trim email for consistent storage and login."""
    return (email or "").strip().lower()


def _is_valid_email(email: str) -> bool:
    """Basic email barrier for server-side validation."""
    import re
    return bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$", (email or "").strip()))


def _clean_start_level(level_value: str) -> str:
    """
    Ensures start_level is one of: novice / intermediate / advanced.
    This does NOT affect real user XP level (numeric_level).
    """
    v = (level_value or "").strip().lower()
    if v in ("novice", "intermediate", "advanced"):
        return v
    return "novice"


def _extract_start_level(reasons_text: str) -> str:
    """
    Reads start_level back from reasons text.
    Format we store:
      start_level=novice; career, certification
    """
    txt = (reasons_text or "").strip()
    if txt.lower().startswith("start_level="):
        # Split "start_level=xxx; rest..."
        first = txt.split(";", 1)[0]
        if "=" in first:
            return _clean_start_level(first.split("=", 1)[1])
    return "novice"


def _strip_start_level(reasons_text: str) -> str:
    """Returns reasons without the start_level prefix (for display)."""
    txt = (reasons_text or "").strip()
    if txt.lower().startswith("start_level=") and ";" in txt:
        return txt.split(";", 1)[1].strip()
    return txt


def ensure_user_preferences_table():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_preferences (
            user_email VARCHAR(255) PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
            weekly_summary BOOLEAN DEFAULT TRUE,
            streak_reminders BOOLEAN DEFAULT TRUE,
            new_course_alerts BOOLEAN DEFAULT FALSE,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    cur.close()
    conn.close()


def ensure_user_achievements_table():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
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
    """)
    conn.commit()
    cur.close()
    conn.close()


def ensure_user_logins_table():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_logins (
            user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
            login_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_email, login_date)
        );
    """)
    conn.commit()
    cur.close()
    conn.close()


# AI Prompt: Explain the Register New User section in clear, simple terms.
# =========================================================
# Register New User
# =========================================================
"""
Register
---
Creates a new user account.

Signup wizard sends:
- first_name, last_name, username, email, dob
- password + confirm_password
- level choice (novice/intermediate/advanced)  -> used for unlocking content ONLY
- reasons (list)

Stored:
- numeric_level starts at 1 (real progression from XP)
- level label stays "Novice" at creation
- start_level is stored inside reasons to avoid DB schema changes
"""
@auth.route("/register", methods=["POST"])
def register():
    try:
        data = request.form

        # Get fields from form (wizard)
        first_name = (data.get("first_name") or "").strip()
        last_name = (data.get("last_name") or "").strip()
        username = (data.get("username") or "").strip()
        email = _norm_email(data.get("email"))
        dob = (data.get("dob") or "").strip()

        password = data.get("password") or ""
        confirm_password = data.get("confirm_password") or ""

        # "Starting level" preference (unlocking only)
        start_level = _clean_start_level(data.get("level") or "novice")

        # Reasons (checkbox list)
        reasons_list = request.form.getlist("reasons")
        reasons_only = ", ".join([r.strip() for r in reasons_list if r.strip()])

        # Store start_level in reasons (no DB schema change)
        # Example: "start_level=intermediate; career, certification"
        reasons = f"start_level={start_level}; {reasons_only}".strip()

        # AI Prompt: Explain the Server-side validation (simple + strict) section in clear, simple terms.
        # -------------------------------------------------
        # Server-side validation (simple + strict)
        # -------------------------------------------------
        if not first_name or not last_name or not username or not email or not dob:
            return jsonify({"success": False, "message": "Please fill in all required fields."}), 400

        if not _is_valid_email(email):
            return jsonify({"success": False, "message": "Please enter a valid email address."}), 400

        if not password or len(password) < 8:
            return jsonify({"success": False, "message": "Password must be at least 8 characters."}), 400

        if password != confirm_password:
            return jsonify({"success": False, "message": "Passwords do not match."}), 400

        # Wizard requires at least one reason (as you wanted)
        if not reasons_list:
            return jsonify({"success": False, "message": "Please select at least one reason."}), 400

        # AI Prompt: Explain the REAL progression values (do NOT change from start_level) section in clear, simple terms.
        # -------------------------------------------------
        # REAL progression values (do NOT change from start_level)
        # -------------------------------------------------
        numeric_level = 1
        level_label = rank_for_level(numeric_level)  # should be "Novice"
        xp = 0

        # Hash password
        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

        # AI Prompt: Explain the Database insert (with duplicate checks) section in clear, simple terms.
        # -------------------------------------------------
        # Database insert (with duplicate checks)
        # -------------------------------------------------
        conn = get_db_connection()
        cur = conn.cursor()

        # Email already exists?
        cur.execute("SELECT 1 FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({
                "success": False,
                "message": "That email is already registered. Please login instead."
            }), 409

        # Username already exists?
        cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({
                "success": False,
                "message": "That username is already taken. Please choose another."
            }), 409

        # Insert user (includes dob column you added)
        cur.execute(
            """
            INSERT INTO users
            (first_name, last_name, username, email, password_hash, level,
             numeric_level, reasons, xp, dob)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (first_name, last_name, username, email, hashed_password, level_label,
             numeric_level, reasons, xp, dob),
        )

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True})

    except Exception as e:
        print("Signup error:", e)
        return jsonify({"success": False, "message": "Signup failed. Please try again."}), 500


# AI Prompt: Explain the Login User section in clear, simple terms.
# =========================================================
# Login User
# =========================================================
"""
Login
---
Logs a user in.
- Checks email exists
- Verifies password
- Returns user info for frontend

UPDATED:
- Returns start_level (for unlocking content)
- Keeps real XP progression as the source of truth
"""
@auth.route("/login", methods=["POST"])
def login():
    email = _norm_email(request.form.get("email"))
    password = request.form.get("password") or ""

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Also fetch reasons so we can return start_level preference
        cur.execute(
            """
            SELECT first_name, last_name, password_hash, level, xp, numeric_level, username, reasons
            FROM users
            WHERE email = %s
            """,
            (email,),
        )
        user = cur.fetchone()

        cur.close()
        conn.close()

        # Validate credentials
        if user and bcrypt.check_password_hash(user[2], password):
            first_name = user[0]
            last_name = user[1]
            xp = int(user[4] or 0)

            # Real level from XP rules
            calc_level, xp_into_level, next_level_xp = get_level_progress(xp)
            rank = rank_for_level(calc_level)

            # Start level preference from reasons
            start_level = _extract_start_level(user[7])

            return jsonify({
                "success": True,
                "first_name": first_name,
                "last_name": last_name,
                "username": user[6],
                "xp": xp,

                # Backwards-compatible field (some frontend uses "level")
                "level": rank,

                # Real progression fields
                "numeric_level": calc_level,
                "rank": rank,
                "xp_into_level": xp_into_level,
                "next_level_xp": next_level_xp,

                # Unlocking preference
                "start_level": start_level
            })

        return jsonify({"success": False, "message": "Invalid email or password."}), 401

    except Exception as e:
        print("Login error:", e)
        return jsonify({"success": False, "message": "Login failed. Try again."}), 500


# AI Prompt: Explain the Logout section in clear, simple terms.
# =========================================================
# Logout
# =========================================================
@auth.route("/logout")
def logout():
    return redirect("/docs/index.html")


# AI Prompt: Explain the Fetch User Info (dashboard/account refresh) section in clear, simple terms.
# =========================================================
# Fetch User Info (dashboard/account refresh)
# =========================================================
"""
User Info
---
Returns basic user information used by dashboard/account pages:
- first_name
- username
- xp
- numeric_level + rank + progress fields
- start_level (unlocking preference)
"""
@auth.route("/user-info")
def user_info():
    email = _norm_email(request.args.get("email"))

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Include reasons to read start_level
        cur.execute(
            """
            SELECT first_name, last_name, xp, username, reasons, email
            FROM users
            WHERE email = %s
            """,
            (email,)
        )
        user = cur.fetchone()

        cur.close()
        conn.close()

        if user:
            first_name = user[0]
            last_name = user[1]
            xp = int(user[2] or 0)
            username = user[3]
            reasons_text = user[4] or ""
            email_db = user[5]

            calc_level, xp_into_level, next_level_xp = get_level_progress(xp)
            rank = rank_for_level(calc_level)

            start_level = _extract_start_level(reasons_text)
            clean_reasons = _strip_start_level(reasons_text)

            return jsonify({
                "success": True,
                "first_name": first_name,
                "username": username,
                "xp": xp,
                "last_name": last_name,
                "email": email_db,

                # Real progression fields
                "numeric_level": calc_level,
                "level": rank,
                "rank": rank,
                "xp_into_level": xp_into_level,
                "next_level_xp": next_level_xp,

                # Unlocking preference
                "start_level": start_level,

                # Optional: clean reasons (nice for account page display)
                "reasons": clean_reasons
            })

        return jsonify({"success": False, "message": "User not found."}), 404

    except Exception as e:
        print("User info error:", e)
        return jsonify({"success": False, "message": "Error loading user info."}), 500


# AI Prompt: Explain the User Preferences (Account page) section in clear, simple terms.
# =========================================================
# User Preferences (Account page)
# =========================================================
@auth.route("/user-preferences", methods=["GET", "POST"])
def user_preferences():
    if request.method == "GET":
        email = _norm_email(request.args.get("email"))
        if not email:
            return jsonify({"success": False, "message": "Email required."}), 400

        try:
            ensure_user_preferences_table()
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("""
                SELECT weekly_summary, streak_reminders, new_course_alerts
                FROM user_preferences
                WHERE user_email = %s
            """, (email,))
            row = cur.fetchone()
            cur.close()
            conn.close()

            if row:
                return jsonify({
                    "success": True,
                    "weekly": bool(row[0]),
                    "streak": bool(row[1]),
                    "new_courses": bool(row[2])
                })

            return jsonify({
                "success": True,
                "weekly": True,
                "streak": True,
                "new_courses": False
            })

        except Exception as e:
            print("User prefs error:", e)
            return jsonify({"success": False, "message": "Error loading preferences."}), 500

    # POST
    data = request.get_json(silent=True) or {}
    email = _norm_email(data.get("email"))
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    weekly = bool(data.get("weekly", True))
    streak = bool(data.get("streak", True))
    new_courses = bool(data.get("newCourses", False))

    try:
        ensure_user_preferences_table()
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO user_preferences (user_email, weekly_summary, streak_reminders, new_course_alerts)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_email)
            DO UPDATE SET
                weekly_summary = EXCLUDED.weekly_summary,
                streak_reminders = EXCLUDED.streak_reminders,
                new_course_alerts = EXCLUDED.new_course_alerts,
                updated_at = CURRENT_TIMESTAMP;
        """, (email, weekly, streak, new_courses))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        print("Save prefs error:", e)
        return jsonify({"success": False, "message": "Could not save preferences."}), 500


# AI Prompt: Explain the User Achievements section in clear, simple terms.
# =========================================================
# User Achievements
# =========================================================
@auth.route("/user-achievements", methods=["GET"])
def user_achievements():
    email = _norm_email(request.args.get("email"))
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    try:
        ensure_user_achievements_table()
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT achievement_id, name, description, tier, xp_awarded, earned_at
            FROM user_achievements
            WHERE user_email = %s
            ORDER BY earned_at DESC;
        """, (email,))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        achievements = []
        for r in rows:
            achievements.append({
                "id": r[0],
                "name": r[1],
                "description": r[2],
                "tier": r[3],
                "xp": int(r[4] or 0),
                "earned_at": r[5].isoformat() if r[5] else None
            })

        return jsonify({"success": True, "achievements": achievements})
    except Exception as e:
        print("User achievements error:", e)
        return jsonify({"success": False, "message": "Error loading achievements."}), 500


@auth.route("/award-achievement", methods=["POST"])
def award_achievement():
    data = request.get_json(silent=True) or {}
    email = _norm_email(data.get("email"))
    achievement_id = (data.get("achievement_id") or data.get("id") or "").strip()
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    tier = (data.get("tier") or "").strip()
    xp = int(data.get("xp") or 0)

    if not email or not achievement_id:
        return jsonify({"success": False, "message": "Email and achievement_id required."}), 400

    try:
        ensure_user_achievements_table()
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO user_achievements (user_email, achievement_id, name, description, tier, xp_awarded)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_email, achievement_id) DO NOTHING;
        """, (email, achievement_id, name, description, tier, xp))
        inserted = (cur.rowcount == 1)
        conn.commit()
        cur.close()
        conn.close()

        xp_added = 0
        new_level = 0
        if inserted and xp > 0:
            xp_added, new_level = add_xp_to_user(email, xp, action=f"Achievement: {achievement_id}")

        return jsonify({
            "success": True,
            "awarded": inserted,
            "xp_added": xp_added,
            "new_level": new_level
        })
    except Exception as e:
        print("Award achievement error:", e)
        return jsonify({"success": False, "message": "Could not award achievement."}), 500


@auth.route("/award-xp", methods=["POST"])
def award_xp():
    data = request.get_json(silent=True) or {}
    email = _norm_email(data.get("email"))
    action = (data.get("action") or "").strip()
    xp = int(data.get("xp") or 0)

    if not email or not action or xp <= 0:
        return jsonify({"success": False, "message": "Email, action, and positive XP are required."}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Idempotency: only award once per action key
        cur.execute("SELECT 1 FROM xp_log WHERE user_email = %s AND action = %s LIMIT 1;", (email, action))
        exists = cur.fetchone() is not None

        xp_added = 0
        new_level = 0
        if not exists:
            xp_added, new_level = add_xp_to_user(email, xp, action=action)

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "awarded": (not exists),
            "xp_added": xp_added,
            "new_level": new_level
        })
    except Exception as e:
        print("Award XP error:", e)
        return jsonify({"success": False, "message": "Could not award XP."}), 500


# AI Prompt: Explain the Login Activity (streak tracking) section in clear, simple terms.
# =========================================================
# Login Activity (streak tracking)
# =========================================================
@auth.route("/record-login", methods=["POST"])
def record_login():
    data = request.get_json(silent=True) or {}
    email = _norm_email(data.get("email"))
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    try:
        ensure_user_logins_table()
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO user_logins (user_email, login_date)
            VALUES (%s, CURRENT_DATE)
            ON CONFLICT (user_email, login_date) DO NOTHING;
        """, (email,))
        is_new = cur.rowcount == 1

        cur.execute("""
            SELECT login_date
            FROM user_logins
            WHERE user_email = %s
            ORDER BY login_date;
        """, (email,))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        log = [r[0].isoformat() for r in rows]
        return jsonify({"success": True, "log": log, "is_new": is_new})

    except Exception as e:
        print("Record login error:", e)
        return jsonify({"success": False, "message": "Could not record login."}), 500


# AI Prompt: Explain the Forgot Password section in clear, simple terms.
# =========================================================
# Forgot Password
# =========================================================
"""
Forgot Password
---
User enters email + username + new password
If email + username match an account, update password hash.
"""
@auth.route("/forgot-password", methods=["POST"])
def forgot_password():
    try:
        data = request.get_json() or {}

        email = _norm_email(data.get("email"))
        new_password = data.get("password") or ""

        if not email or not new_password:
            return jsonify({"success": False, "message": "All fields are required."}), 400

        if not _is_valid_email(email):
            return jsonify({"success": False, "message": "Invalid email address."}), 400

        if len(new_password) < 8:
            return jsonify({"success": False, "message": "Password must be at least 8 characters."}), 400

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"success": False, "message": "No account found with that email."}), 404

        hashed = bcrypt.generate_password_hash(new_password).decode("utf-8")
        cur.execute("UPDATE users SET password_hash = %s WHERE email = %s", (hashed, email))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True})

    except Exception as e:
        print("Forgot password error:", e)
        return jsonify({"success": False, "message": "Server error."}), 500
