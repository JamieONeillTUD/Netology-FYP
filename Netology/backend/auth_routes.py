from flask import Blueprint, request, jsonify, redirect
from flask_bcrypt import Bcrypt
from db import get_db_connection

auth = Blueprint('auth', __name__)
bcrypt = Bcrypt()

# --- Signup route ---
@auth.route('/register', methods=['POST'])
def register():
    try:
        data = request.form
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        level = data.get('level', 'Novice')
        reasons = ', '.join(request.form.getlist('reasons'))
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO users (first_name, last_name, username, email, password_hash, level, reasons)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (first_name, last_name, username, email, hashed_password, level, reasons))

        conn.commit()
        cur.close()
        conn.close()

        # ✅ Return success as JSON
        return jsonify({"success": True})

    except Exception as e:
        print("Signup error:", e)
        return jsonify({"success": False, "message": "Signup failed. Please try again."})


# --- Login route ---
@auth.route('/login', methods=['POST'])
def login():
    email = request.form['email']
    password = request.form['password']

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT first_name, password_hash, level, xp FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if user and bcrypt.check_password_hash(user[1], password):
        return jsonify({
            "success": True,
            "first_name": user[0],
            "level": user[2],
            "xp": user[3]
        })
    else:
        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        })


# --- Logout route ---
@auth.route('/logout')
def logout():
    return redirect('/frontend/login.html')

@auth.route('/user-info')
def user_info():
    email = request.args.get('email')
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT first_name, level, xp FROM users WHERE email = %s;", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if user:
        return jsonify({"first_name": user[0], "level": user[1], "xp": user[2]})
    return jsonify({"error": "User not found"}), 404

