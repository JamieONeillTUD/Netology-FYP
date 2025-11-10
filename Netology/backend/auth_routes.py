"""
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

Python (Flask) – Netology Learning Platform
-------------------------------------------
auth_routes.py – Handles user authentication.
Includes:
  - Register new users
  - Login existing users
  - Fetch basic user info
  - Logout route (redirects to frontend)
"""

from flask import Blueprint, request, jsonify, redirect
from flask_bcrypt import Bcrypt
from db import get_db_connection

# --- Setup Blueprint and Bcrypt ---
auth = Blueprint("auth", __name__)
bcrypt = Bcrypt()

# =====================================================
# REGISTER NEW USER
# =====================================================
@auth.route("/register", methods=["POST"])
def register():
    try:
        # Get form data from signup form
        data = request.form
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        level = data.get("level", "Novice")
        reasons = ", ".join(request.form.getlist("reasons"))  # store as comma text

        # Hash the password securely
        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

        # Insert into users table
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO users 
            (first_name, last_name, username, email, password_hash, level, numeric_level, reasons, xp)
            VALUES (%s, %s, %s, %s, %s, %s, 0, %s, 0)
            """,
            (first_name, last_name, username, email, hashed_password, level, reasons),
        )

        conn.commit()
        cur.close()
        conn.close()

        # Return success
        return jsonify({"success": True})

    except Exception as e:
        print("Signup error:", e)
        return jsonify({"success": False, "message": "Signup failed. Please try again."})


# =====================================================
# LOGIN USER
# =====================================================
@auth.route("/login", methods=["POST"])
def login():
    email = request.form.get("email")
    password = request.form.get("password")

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Match email with stored user
        cur.execute(
            "SELECT first_name, password_hash, level, xp FROM users WHERE email = %s",
            (email,),
        )
        user = cur.fetchone()
        cur.close()
        conn.close()

        # Check credentials
        if user and bcrypt.check_password_hash(user[1], password):
            return jsonify(
                {
                    "success": True,
                    "first_name": user[0],
                    "level": user[2],
                    "xp": user[3],
                }
            )
        else:
            return jsonify({"success": False, "message": "Invalid email or password."})

    except Exception as e:
        print("Login error:", e)
        return jsonify({"success": False, "message": "Login failed. Try again."})


# =====================================================
# LOGOUT (redirect to login page)
# =====================================================
@auth.route("/logout")
def logout():
    return redirect("/frontend/login.html")


# =====================================================
# FETCH BASIC USER INFO
# Used by dashboard.js to refresh XP, name, and level
# =====================================================
@auth.route("/user-info")
def user_info():
    email = request.args.get("email")

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT first_name, level, xp FROM users WHERE email = %s", (email,)
        )
        user = cur.fetchone()
        cur.close()
        conn.close()

        if user:
            return jsonify(
                {"first_name": user[0], "level": user[1], "xp": user[2], "success": True}
            )
        else:
            return jsonify({"success": False, "message": "User not found."}), 404

    except Exception as e:
        print("User info error:", e)
        return jsonify({"success": False, "message": "Error loading user info."}), 500
