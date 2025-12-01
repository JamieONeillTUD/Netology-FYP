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
        level = data.get("level", "Novice")
        reasons = ", ".join(request.form.getlist("reasons")) 

        # Hash password using bcrypt
        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

        # Insert user into database
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO users 
            (first_name, last_name, username, email, password_hash, level, 
             numeric_level, reasons, xp)
            VALUES (%s, %s, %s, %s, %s, %s, 0, %s, 0)
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
            "SELECT first_name, password_hash, level, xp FROM users WHERE email = %s",
            (email,),
        )
        user = cur.fetchone()

        cur.close()
        conn.close()

        # Validate credentials
        if user and bcrypt.check_password_hash(user[1], password):
            return jsonify({
                "success": True,
                "first_name": user[0],
                "level": user[2],
                "xp": user[3],
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
"""
# Fetch User Info
@auth.route("/user-info")
def user_info():
    email = request.args.get("email")

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            "SELECT first_name, level, xp, numeric_level FROM users WHERE email = %s",
            (email,)
        )
        user = cur.fetchone()

        cur.close()
        conn.close()

        if user:
            return jsonify({
                "success": True,
                "first_name": user[0],
                "level": user[1],
                "xp": user[2],
                "numeric_level": user[3]
            })

        return jsonify({"success": False, "message": "User not found."}), 404

    except Exception as e:
        print("User info error:", e)
        return jsonify({"success": False, "message": "Error loading user info."}), 500
