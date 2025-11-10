"""
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

Python (Flask) – Netology Learning Platform
-------------------------------------------
app.py – Main entry point for backend server.
Handles:
  - App setup and configuration
  - Registering routes for authentication and courses
  - Serving frontend from /frontend
Very simple and clear version.
"""

from flask import Flask, redirect
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from auth_routes import auth, bcrypt as auth_bcrypt
from course_routes import courses

# --- Create Flask app ---
app = Flask(__name__, static_folder="../frontend", static_url_path="/frontend")

# --- Enable Cross-Origin Resource Sharing (frontend ↔ backend) ---
CORS(app)

# --- Setup bcrypt for password hashing ---
auth_bcrypt.init_app(app)

# --- Register route blueprints ---
app.register_blueprint(auth)
app.register_blueprint(courses)

# --- Default route (redirect to login page) ---
@app.route("/")
def home():
    return redirect("/frontend/login.html")

# --- Run server ---
if __name__ == "__main__":
    app.run(debug=True)
