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

This file contains all user authentication logic and
connects directly to the PostgreSQL database.
"""

from flask import Blueprint, request, jsonify, redirect
from flask_bcrypt import Bcrypt
from db import get_db_connection

# NEW (Part 3 - XP/Level progression helpers)
# Keep simple: imports from xp_system (make sure xp_system.py has these functions)
from xp_system import get_level_progress, rank_for_level


# Blueprint and bcrypt setup
auth = Blueprint("auth", __name__)   # Groups all /auth routes together
bcrypt = Bcrypt()                    # Used to hash and verify passwords

""""
AI PROMPTED CODE BELOW
"Can you write a simple register route that creates a new user into my PostgreSQL database using the schemas I have created"

Regester New User
---
Creates a new user account.
Receives form data from the signup page
Hashes the password for security
Stores the user in the PostgreSQL database

UPDATED (Part 3):
- numeric_level should start at 1 (Level 1)
- level label should match rank rules (Novice / Intermediate / Advanced)
"""
@auth.route("/register", methods=["POST"])
def register():
    try:
        # Extract form fields on html
        data = request.form
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")

        # NOTE: We still accept the "level" input from signup page,
        # but we normalize the stored level label to "Novice" at account creation.
        # (Your rank is determined by numeric_level, which starts at 1)
        level = "Novice"

        reasons = ", ".join(request.form.getlist("reasons")) 

        # Hash password using bcrypt
        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

        # Insert user into database
        conn = get_db_connection()
        cur = conn.cursor()

        # IMPORTANT: numeric_level starts at 1, xp starts at 0
        cur.execute(
            """
            INSERT INTO users 
            (first_name, last_name, username, email, password_hash, level, 
             numeric_level, reasons, xp)
            VALUES (%s, %s, %s, %s, %s, %s, 1, %s, 0)
            """,
            (first_name, last_name, username, email, hashed_password, level, reasons),
        )

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True})

    except Exception as e:
        print("Signup error:", e)
        return jsonify({"success": False, "message": "Signup failed. Please try again."})


"""
AI PROMPTED CODE BELOW
"Can you write a login route that verifies a user's email and password using my PostgreSQL database using bcrypt for password hashing"

Login User
---
Logs a user in.
Checks if email exists
Verifies password using bcrypt
Returns basic user data (first name, level, XP)

UPDATED (Part 3):
- Returns numeric_level + rank + next_level_xp progress fields so dashboard/account can show correct level/rank and XP bar
"""
@auth.route("/login", methods=["POST"])
def login():
    email = request.form.get("email")
    password = request.form.get("password")

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Fetch user record from DB by email
        cur.execute(
            "SELECT first_name, password_hash, level, xp, numeric_level, username FROM users WHERE email = %s",
            (email,),
        )
        user = cur.fetchone()

        cur.close()
        conn.close()

        # Validate credentials
        if user and bcrypt.check_password_hash(user[1], password):
            first_name = user[0]
            xp = int(user[3] or 0)

            # Recalculate correct numeric level + rank from XP rules
            calc_level, xp_into_level, next_level_xp = get_level_progress(xp)
            rank = rank_for_level(calc_level)

            return jsonify({
                "success": True,
                "first_name": first_name,
                "username": user[5],
                "xp": xp,

                # Keep old field for compatibility (some frontend might use it)
                "level": rank,

                # New, more accurate fields
                "numeric_level": calc_level,
                "rank": rank,
                "xp_into_level": xp_into_level,
                "next_level_xp": next_level_xp
            })

        # Wrong password or no user
        return jsonify({"success": False, "message": "Invalid email or password."})

    except Exception as e:
        print("Login error:", e)
        return jsonify({"success": False, "message": "Login failed. Try again."})



# # Logout User
@auth.route("/logout")
def logout():
    return redirect("/frontend/login.html")


"""
AI PROMPTED CODE BELOW
"Can you write a route that gets user data like first name, level and XP from my PostgreSQL database"

Fetch User Info
--
Returns basic user information:
First name
User Level
XP
Used by dashboard.js when refreshing displayed data.

UPDATED (Part 3):
- Level thresholds: 100, 200, 300...
- Returns rank label based on numeric level:
  Level 1-2 = Novice
  Level 3-4 = Intermediate
  Level 5+  = Advanced
- Returns xp_into_level and next_level_xp for progress bars
"""
# Fetch User Info
@auth.route("/user-info")
def user_info():
    email = request.args.get("email")

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            "SELECT first_name, level, xp, numeric_level, username FROM users WHERE email = %s",
            (email,)
        )
        user = cur.fetchone()

        cur.close()
        conn.close()

        if user:
            first_name = user[0]
            xp = int(user[2] or 0)

            # Recalculate correct progression from XP rules
            calc_level, xp_into_level, next_level_xp = get_level_progress(xp)
            rank = rank_for_level(calc_level)

            return jsonify({
                "success": True,
                "first_name": first_name,
                "username": user[4],

                "xp": xp,

                # Keep fields your frontend already expects
                "numeric_level": calc_level,
                "level": rank,     # keep "level" for backwards compatibility

                # New fields for UI
                "rank": rank,
                "xp_into_level": xp_into_level,
                "next_level_xp": next_level_xp
            })

        return jsonify({"success": False, "message": "User not found."}), 404

    except Exception as e:
        print("User info error:", e)
        return jsonify({"success": False, "message": "Error loading user info."}), 500


"""
AI PROMPTED CODE BELOW
"Can you add a simple forgot password route where the user enters email + username
and if they match an account, they can set a new password?"
"""
@auth.route("/forgot-password", methods=["POST"])
def forgot_password():
    try:
        data = request.get_json()

        email = (data.get("email") or "").strip().lower()
        username = (data.get("username") or "").strip()
        new_password = data.get("password") or ""

        if not email or not username or not new_password:
            return jsonify({
                "success": False,
                "message": "All fields are required."
            }), 400

        if len(new_password) < 8:
            return jsonify({
                "success": False,
                "message": "Password must be at least 8 characters."
            }), 400

        conn = get_db_connection()
        cur = conn.cursor()

        # Check user exists with email + username
        cur.execute(
            "SELECT id FROM users WHERE email = %s AND username = %s",
            (email, username)
        )
        user = cur.fetchone()

        if not user:
            cur.close()
            conn.close()
            return jsonify({
                "success": False,
                "message": "No account found with that email and username."
            }), 404

        # Hash new password
        hashed_password = bcrypt.generate_password_hash(new_password).decode("utf-8")

        # Update password
        cur.execute(
            "UPDATE users SET password_hash = %s WHERE email = %s AND username = %s",
            (hashed_password, email, username)
        )

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True
        })

    except Exception as e:
        print("Forgot password error:", e)
        return jsonify({
            "success": False,
            "message": "Server error. Please try again."
        }), 500
