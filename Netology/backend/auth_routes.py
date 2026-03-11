"""
auth_routes.py — Auth and account management routes.
"""

import re
from contextlib import contextmanager

from flask import Blueprint, jsonify, redirect, request
from flask_bcrypt import Bcrypt

from achievement_engine import (
    ensure_achievement_catalog,
    evaluate_achievements_for_event,
    get_user_achievements_payload,
)
from db import get_db_connection
from xp_system import add_xp_to_user, get_level_progress, rank_for_level

auth = Blueprint("auth", __name__)
bcrypt = Bcrypt()

# ── Constants ─────────────────────────────────────────────────────────────────

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
VALID_START_LEVELS = {"novice", "intermediate", "advanced"}
PASSWORD_MIN_LENGTH = 8


# ── Helpers ───────────────────────────────────────────────────────────────────

@contextmanager
def _db_cursor():
    """Open a DB connection and cursor, always closing both when done."""
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        yield connection, cursor
    finally:
        try:
            cursor.close()
        finally:
            connection.close()


def _to_int(value, default=0):
    """Safely cast value to int, returning default on failure."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _norm_email(email):
    """Lowercase and strip whitespace from an email string."""
    return (email or "").strip().lower()


def _is_valid_email(email):
    """Return True if the email looks valid."""
    return bool(EMAIL_PATTERN.match((email or "").strip()))


def _clean_start_level(level_value):
    """Return the level if valid, otherwise fall back to 'novice'."""
    level = (level_value or "").strip().lower()
    return level if level in VALID_START_LEVELS else "novice"


def _json_error(message, status_code):
    """Return a standard JSON error response."""
    return jsonify({"success": False, "message": message}), status_code


def _progress_payload(total_xp):
    """Build the XP / level / rank dict included in user responses."""
    xp_total = _to_int(total_xp)
    numeric_level, xp_into_level, next_level_xp = get_level_progress(xp_total)
    rank = rank_for_level(numeric_level)
    return {
        "xp": xp_total,
        "numeric_level": numeric_level,
        "level": rank,
        "rank": rank,
        "xp_into_level": xp_into_level,
        "next_level_xp": next_level_xp,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@auth.route("/register", methods=["POST"])
def register():
    """Create a new user account."""
    form = request.form
    first_name = (form.get("first_name") or "").strip()
    last_name = (form.get("last_name") or "").strip()
    username = (form.get("username") or "").strip()
    email = _norm_email(form.get("email"))
    dob = (form.get("dob") or "").strip()
    password = form.get("password") or ""
    confirm_password = form.get("confirm_password") or ""
    start_level = _clean_start_level(form.get("level"))
    reasons = [item.strip() for item in form.getlist("reasons") if (item or "").strip()]
    reasons_text = ", ".join(reasons)

    if not all([first_name, last_name, username, email, dob]):
        return _json_error("Please fill in all required fields.", 400)
    if not _is_valid_email(email):
        return _json_error("Please enter a valid email address.", 400)
    if len(password) < PASSWORD_MIN_LENGTH:
        return _json_error(f"Password must be at least {PASSWORD_MIN_LENGTH} characters.", 400)
    if password != confirm_password:
        return _json_error("Passwords do not match.", 400)
    if not reasons:
        return _json_error("Please select at least one reason.", 400)

    try:
        with _db_cursor() as (connection, cursor):
            cursor.execute("SELECT 1 FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                return _json_error("That email is already registered. Please login instead.", 409)

            cursor.execute("SELECT 1 FROM users WHERE username = %s", (username,))
            if cursor.fetchone():
                return _json_error("That username is already taken. Please choose another.", 409)

            password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
            cursor.execute(
                """
                INSERT INTO users (
                    first_name, last_name, username, email, password_hash,
                    level, numeric_level, reasons, xp, dob, start_level,
                    is_first_login, onboarding_completed
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, FALSE)
                """,
                (first_name, last_name, username, email, password_hash,
                 "Novice", 1, reasons_text, 0, dob, start_level),
            )
            connection.commit()

        return jsonify({"success": True})
    except Exception as error:
        print("Register error:", error)
        return _json_error("Signup failed. Please try again.", 500)


@auth.route("/login", methods=["POST"])
def login():
    """Verify credentials and return user data."""
    email = _norm_email(request.form.get("email"))
    password = request.form.get("password") or ""

    try:
        with _db_cursor() as (_connection, cursor):
            cursor.execute(
                """
                SELECT first_name, last_name, password_hash, xp, username,
                       start_level, is_first_login, onboarding_completed
                FROM users
                WHERE email = %s
                """,
                (email,),
            )
            user = cursor.fetchone()

        if not user or not bcrypt.check_password_hash(user[2], password):
            return _json_error("Invalid email or password.", 401)

        return jsonify({
            "success": True,
            "first_name": user[0],
            "last_name": user[1],
            "username": user[4],
            **_progress_payload(user[3]),
            "start_level": _clean_start_level(user[5]),
            "is_first_login": user[6] is not False,
            "onboarding_completed": bool(user[7]),
            "email": email,
        })
    except Exception as error:
        print("Login error:", error)
        return _json_error("Login failed. Try again.", 500)


@auth.route("/logout")
def logout():
    """Redirect to the home page."""
    return redirect("/docs/index.html")


@auth.route("/user-info")
def user_info():
    """Return profile data for a given email."""
    email = _norm_email(request.args.get("email"))
    if not email:
        return _json_error("Email required.", 400)

    try:
        with _db_cursor() as (_connection, cursor):
            cursor.execute(
                """
                SELECT first_name, last_name, xp, username, reasons, email, start_level, created_at
                FROM users
                WHERE email = %s
                """,
                (email,),
            )
            user = cursor.fetchone()

        if not user:
            return _json_error("User not found.", 404)

        created_at = user[7]
        return jsonify({
            "success": True,
            "first_name": user[0],
            "last_name": user[1],
            "username": user[3],
            "email": user[5],
            **_progress_payload(user[2]),
            "start_level": _clean_start_level(user[6]),
            "created_at": created_at.isoformat() if created_at else None,
            "reasons": user[4] or "",
        })
    except Exception as error:
        print("User info error:", error)
        return _json_error("Error loading user info.", 500)


@auth.route("/user-preferences", methods=["GET", "POST"])
def user_preferences():
    """Get or save notification preferences for a user."""
    if request.method == "GET":
        email = _norm_email(request.args.get("email"))
        if not email:
            return _json_error("Email required.", 400)

        try:
            with _db_cursor() as (_connection, cursor):
                cursor.execute(
                    """
                    SELECT weekly_summary, streak_reminders, new_course_alerts
                    FROM user_preferences
                    WHERE user_email = %s
                    """,
                    (email,),
                )
                row = cursor.fetchone()

            if row:
                return jsonify({"success": True, "weekly": bool(row[0]), "streak": bool(row[1]), "new_courses": bool(row[2])})

            # No row yet — return sensible defaults
            return jsonify({"success": True, "weekly": True, "streak": True, "new_courses": False})
        except Exception as error:
            print("User preferences GET error:", error)
            return _json_error("Error loading preferences.", 500)

    # POST — save preferences
    data = request.get_json(silent=True) or {}
    email = _norm_email(data.get("email"))
    if not email:
        return _json_error("Email required.", 400)

    weekly = bool(data.get("weekly", True))
    streak = bool(data.get("streak", True))
    new_courses = bool(data.get("newCourses", data.get("new_courses", False)))

    try:
        with _db_cursor() as (connection, cursor):
            # Simple flow: update existing row first, insert only if missing.
            cursor.execute(
                """
                UPDATE user_preferences
                SET weekly_summary = %s,
                    streak_reminders = %s,
                    new_course_alerts = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_email = %s
                """,
                (weekly, streak, new_courses, email),
            )

            if cursor.rowcount == 0:
                cursor.execute(
                    """
                    INSERT INTO user_preferences
                    (user_email, weekly_summary, streak_reminders, new_course_alerts)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (email, weekly, streak, new_courses),
                )

            connection.commit()
        return jsonify({"success": True})
    except Exception as error:
        print("User preferences POST error:", error)
        return _json_error("Could not save preferences.", 500)


@auth.route("/user-achievements", methods=["GET"])
def user_achievements():
    """Return all achievements earned by a user."""
    email = _norm_email(request.args.get("email"))
    if not email:
        return _json_error("Email required.", 400)

    try:
        payload = get_user_achievements_payload(email)
        if not payload.get("success"):
            return _json_error("Error loading achievements.", 500)

        achievements = [
            {
                "id": item.get("id"),
                "name": item.get("name"),
                "description": item.get("description"),
                "tier": item.get("rarity"),
                "xp": _to_int(item.get("xp_awarded") or item.get("xp_reward")),
                "earned_at": item.get("earned_at"),
            }
            for item in payload.get("unlocked", [])
        ]
        return jsonify({"success": True, "achievements": achievements})
    except Exception as error:
        print("User achievements error:", error)
        return _json_error("Error loading achievements.", 500)


@auth.route("/award-achievement", methods=["POST"])
def award_achievement():
    """Grant an achievement to a user (no-op if already earned)."""
    data = request.get_json(silent=True) or {}
    email = _norm_email(data.get("email"))
    achievement_id = (data.get("achievement_id") or data.get("id") or "").strip()
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    tier = (data.get("tier") or "").strip()
    xp = _to_int(data.get("xp"))

    if not email or not achievement_id:
        return _json_error("Email and achievement_id required.", 400)

    try:
        ensure_achievement_catalog()

        with _db_cursor() as (connection, cursor):
            # Pull canonical details from the achievements catalog if available
            cursor.execute(
                "SELECT name, description, rarity, xp_reward FROM achievements WHERE id = %s LIMIT 1",
                (achievement_id,),
            )
            catalog_row = cursor.fetchone()
            if catalog_row:
                name = catalog_row[0] or name
                description = catalog_row[1] or description
                tier = catalog_row[2] or tier
                xp = _to_int(catalog_row[3], xp)

            cursor.execute(
                """
                INSERT INTO user_achievements (user_email, achievement_id, name, description, tier, xp_awarded)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_email, achievement_id) DO NOTHING
                """,
                (email, achievement_id, name, description, tier, xp),
            )
            awarded = cursor.rowcount == 1
            connection.commit()

        xp_added = new_level = 0
        if awarded and xp > 0:
            xp_added, new_level = add_xp_to_user(email, xp, action=f"Achievement: {achievement_id}")

        return jsonify({"success": True, "awarded": awarded, "xp_added": xp_added, "new_level": new_level})
    except Exception as error:
        print("Award achievement error:", error)
        return _json_error("Could not award achievement.", 500)


@auth.route("/award-xp", methods=["POST"])
def award_xp():
    """Award XP for an action (idempotent — each action is only awarded once)."""
    data = request.get_json(silent=True) or {}
    email = _norm_email(data.get("email"))
    action = (data.get("action") or "").strip()
    xp = _to_int(data.get("xp"))

    if not email or not action or xp <= 0:
        return _json_error("Email, action, and positive XP are required.", 400)

    try:
        # Check whether this action has already been awarded
        with _db_cursor() as (_connection, cursor):
            cursor.execute(
                "SELECT 1 FROM xp_log WHERE user_email = %s AND action = %s LIMIT 1",
                (email, action),
            )
            already_awarded = cursor.fetchone() is not None

        xp_added = new_level = 0
        if not already_awarded:
            xp_added, new_level = add_xp_to_user(email, xp, action=action)

        newly_unlocked = evaluate_achievements_for_event(email, "xp_award")
        achievement_xp_added = sum(_to_int(item.get("xp_added")) for item in newly_unlocked)

        return jsonify({
            "success": True,
            "awarded": not already_awarded,
            "xp_added": xp_added,
            "new_level": new_level,
            "newly_unlocked": newly_unlocked,
            "achievement_xp_added": achievement_xp_added,
        })
    except Exception as error:
        print("Award XP error:", error)
        return _json_error("Could not award XP.", 500)


@auth.route("/record-login", methods=["POST"])
def record_login():
    """Record today's login and return the full login history."""
    data = request.get_json(silent=True) or {}
    email = _norm_email(data.get("email"))
    if not email:
        return _json_error("Email required.", 400)

    try:
        with _db_cursor() as (connection, cursor):
            cursor.execute(
                """
                INSERT INTO user_logins (user_email, login_date)
                VALUES (%s, CURRENT_DATE)
                ON CONFLICT (user_email, login_date) DO NOTHING
                """,
                (email,),
            )
            is_new = cursor.rowcount == 1

            cursor.execute(
                "SELECT login_date FROM user_logins WHERE user_email = %s ORDER BY login_date",
                (email,),
            )
            rows = cursor.fetchall()
            connection.commit()

        log = [row[0].isoformat() for row in rows]
        newly_unlocked = evaluate_achievements_for_event(email, "login")
        achievement_xp_added = sum(_to_int(item.get("xp_added")) for item in newly_unlocked)

        return jsonify({
            "success": True,
            "log": log,
            "is_new": is_new,
            "newly_unlocked": newly_unlocked,
            "achievement_xp_added": achievement_xp_added,
        })
    except Exception as error:
        print("Record login error:", error)
        return _json_error("Could not record login.", 500)


@auth.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Reset a user's password directly (no email token — dev simplicity)."""
    data = request.get_json(silent=True) or {}
    email = _norm_email(data.get("email"))
    new_password = data.get("password") or ""

    if not email or not new_password:
        return _json_error("All fields are required.", 400)
    if not _is_valid_email(email):
        return _json_error("Invalid email address.", 400)
    if len(new_password) < PASSWORD_MIN_LENGTH:
        return _json_error(f"Password must be at least {PASSWORD_MIN_LENGTH} characters.", 400)

    try:
        with _db_cursor() as (connection, cursor):
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            if not cursor.fetchone():
                return _json_error("No account found with that email.", 404)

            password_hash = bcrypt.generate_password_hash(new_password).decode("utf-8")
            cursor.execute("UPDATE users SET password_hash = %s WHERE email = %s", (password_hash, email))
            connection.commit()

        return jsonify({"success": True})
    except Exception as error:
        print("Forgot password error:", error)
        return _json_error("Server error.", 500)
