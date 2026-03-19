# auth_routes.py — Auth and account management routes.

from flask import Blueprint, jsonify, request
from flask_bcrypt import Bcrypt

from achievement_engine import evaluate_achievements_for_event
from db import email_from, get_db_connection, to_int
from xp_system import add_xp_to_user, get_level_progress, rank_for_level

auth = Blueprint("auth", __name__)
bcrypt = Bcrypt()


def valid_email(email):
    # Quick check that an email has @ and a dot in the domain.
    e = (email or "").strip()
    return "@" in e and "." in e.split("@")[-1]


def start_level(raw):
    # Returns the level if valid, otherwise falls back to "novice".
    level = (raw or "").strip().lower()
    return level if level in ("novice", "intermediate", "advanced") else "novice"


def xp_payload(total_xp):
    # Builds the XP / level / rank block included in login and user-info responses.
    xp = to_int(total_xp)
    numeric_level, xp_into_level, next_level_xp = get_level_progress(xp)
    rank = rank_for_level(numeric_level)
    return {
        "xp": xp,
        "numeric_level": numeric_level,
        "level": rank,
        "rank": rank,
        "xp_into_level": xp_into_level,
        "next_level_xp": next_level_xp,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@auth.route("/register", methods=["POST"])
def register():
    # Create a new user account.
    form = request.form
    first_name = (form.get("first_name") or "").strip()
    last_name = (form.get("last_name") or "").strip()
    username = (form.get("username") or "").strip()
    email = email_from(form.get("email"))
    dob = (form.get("dob") or "").strip()
    password = form.get("password") or ""
    confirm = form.get("confirm_password") or ""
    level = start_level(form.get("level"))
    reasons = [r.strip() for r in form.getlist("reasons") if (r or "").strip()]

    if not all([first_name, last_name, username, email, dob]):
        return jsonify({"success": False, "message": "Please fill in all required fields."}), 400
    if not valid_email(email):
        return jsonify({"success": False, "message": "Please enter a valid email address."}), 400
    if len(password) < 8:
        return jsonify({"success": False, "message": "Password must be at least 8 characters."}), 400
    if password != confirm:
        return jsonify({"success": False, "message": "Passwords do not match."}), 400
    if not reasons:
        return jsonify({"success": False, "message": "Please select at least one reason."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({"success": False, "message": "That email is already registered. Please login instead."}), 409

        cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            return jsonify({"success": False, "message": "That username is already taken. Please choose another."}), 409

        pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
        cur.execute(
            """
            INSERT INTO users (
                first_name, last_name, username, email, password_hash,
                level, numeric_level, reasons, xp, dob, start_level,
                is_first_login, onboarding_completed
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, FALSE)
            """,
            (first_name, last_name, username, email, pw_hash,
             "Novice", 1, ", ".join(reasons), 0, dob, level),
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        print("Register error:", e)
        return jsonify({"success": False, "message": "Signup failed. Please try again."}), 500
    finally:
        cur.close()
        conn.close()


@auth.route("/login", methods=["POST"])
def login():
    # Verify credentials and return user profile + XP info.
    email = email_from(request.form.get("email"))
    password = request.form.get("password") or ""

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT first_name, last_name, password_hash, xp, username,
                   start_level, is_first_login, onboarding_completed
            FROM users WHERE email = %s
            """,
            (email,),
        )
        user = cur.fetchone()
        if not user or not bcrypt.check_password_hash(user[2], password):
            return jsonify({"success": False, "message": "Invalid email or password."}), 401

        return jsonify({
            "success": True,
            "first_name": user[0],
            "last_name": user[1],
            "username": user[4],
            **xp_payload(user[3]),
            "start_level": start_level(user[5]),
            "is_first_login": bool(user[6]),
            "onboarding_completed": bool(user[7]),
            "email": email,
        })
    except Exception as e:
        print("Login error:", e)
        return jsonify({"success": False, "message": "Login failed. Try again."}), 500
    finally:
        cur.close()
        conn.close()


@auth.route("/user-info")
def user_info():
    # Return profile and XP info for a user.
    email = email_from(request.args.get("email"))
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT first_name, last_name, xp, username, email, start_level, created_at
            FROM users WHERE email = %s
            """,
            (email,),
        )
        user = cur.fetchone()
        if not user:
            return jsonify({"success": False, "message": "User not found."}), 404

        created_at = user[6]
        return jsonify({
            "success": True,
            "first_name": user[0],
            "last_name": user[1],
            "username": user[3],
            "email": user[4],
            **xp_payload(user[2]),
            "start_level": start_level(user[5]),
            "created_at": created_at.isoformat() if created_at else None,
        })
    except Exception as e:
        print("User info error:", e)
        return jsonify({"success": False, "message": "Error loading user info."}), 500
    finally:
        cur.close()
        conn.close()


@auth.route("/award-xp", methods=["POST"])
def award_xp():
    # Award XP for a one-time action (skips if already awarded).
    # Check and award happen in one connection to minimise the race window.
    data = request.get_json(silent=True) or {}
    email = email_from(data.get("email"))
    action = (data.get("action") or "").strip()
    xp = to_int(data.get("xp"))

    if not email or not action or xp <= 0:
        return jsonify({"success": False, "message": "Email, action, and positive XP are required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM xp_log WHERE user_email = %s AND action = %s LIMIT 1", (email, action))
        already = cur.fetchone() is not None

        xp_added = 0
        if not already:
            cur.execute("UPDATE users SET xp = xp + %s WHERE email = %s RETURNING xp", (xp, email))
            row = cur.fetchone()
            if row:
                new_level, _, _ = get_level_progress(row[0])
                cur.execute(
                    "UPDATE users SET numeric_level = %s, level = %s WHERE email = %s",
                    (new_level, rank_for_level(new_level), email),
                )
                cur.execute(
                    "INSERT INTO xp_log (user_email, action, xp_awarded) VALUES (%s, %s, %s)",
                    (email, action, xp),
                )
                xp_added = xp
        conn.commit()
    except Exception as e:
        print("Award XP error:", e)
        return jsonify({"success": False, "message": "Could not award XP."}), 500
    finally:
        cur.close()
        conn.close()

    new_achievements = evaluate_achievements_for_event(email, "xp_award")
    achievement_xp = sum(to_int(a.get("xp_added")) for a in new_achievements)

    return jsonify({
        "success": True,
        "xp_added": xp_added,
        "newly_unlocked": new_achievements,
        "achievement_xp_added": achievement_xp,
    })


@auth.route("/record-login", methods=["POST"])
def record_login():
    # Log today's login and check for login-based achievements.
    data = request.get_json(silent=True) or {}
    email = email_from(data.get("email"))
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO user_logins (user_email, login_date) VALUES (%s, CURRENT_DATE) ON CONFLICT (user_email, login_date) DO NOTHING",
            (email,),
        )
        cur.execute(
            "SELECT login_date FROM user_logins WHERE user_email = %s ORDER BY login_date LIMIT 365",
            (email,),
        )
        rows = cur.fetchall()
        conn.commit()

        log = [row[0].isoformat() for row in rows]
        new_achievements = evaluate_achievements_for_event(email, "login")
        achievement_xp = sum(to_int(a.get("xp_added")) for a in new_achievements)

        return jsonify({
            "success": True,
            "log": log,
            "newly_unlocked": new_achievements,
            "achievement_xp_added": achievement_xp,
        })
    except Exception as e:
        print("Record login error:", e)
        return jsonify({"success": False, "message": "Could not record login."}), 500
    finally:
        cur.close()
        conn.close()


@auth.route("/forgot-password", methods=["POST"])
def forgot_password():
    # Reset a user's password.
    data = request.get_json(silent=True) or {}
    email = email_from(data.get("email"))
    new_password = data.get("password") or ""

    if not email or not new_password:
        return jsonify({"success": False, "message": "All fields are required."}), 400
    if not valid_email(email):
        return jsonify({"success": False, "message": "Invalid email address."}), 400
    if len(new_password) < 8:
        return jsonify({"success": False, "message": "Password must be at least 8 characters."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if not cur.fetchone():
            return jsonify({"success": False, "message": "No account found with that email."}), 404

        pw_hash = bcrypt.generate_password_hash(new_password).decode("utf-8")
        cur.execute("UPDATE users SET password_hash = %s WHERE email = %s", (pw_hash, email))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        print("Forgot password error:", e)
        return jsonify({"success": False, "message": "Server error."}), 500
    finally:
        cur.close()
        conn.close()
