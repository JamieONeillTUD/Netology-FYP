"""
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

Python (Flask)
-------------------------------------------
app.py – Main entry point for backend server.

Create and configure the Flask application
Enable CORS (allows frontend and backend communication)
Register route blueprints (User Authentication and Courses)
Uses files from the frontend directory 
"""

from flask import Flask, redirect
from flask_cors import CORS
from auth_routes import auth, bcrypt as auth_bcrypt
from course_routes import courses
from topology_routes import topology
from dotenv import load_dotenv
load_dotenv()

 
# AI Prompt: Explain the App setup section in clear, simple terms.
# =========================================================
# App setup
# =========================================================
# Create Flask App
# static_folder points to where your HTML/CSS/JS is
app = Flask(
    __name__,
    static_folder="../docs",     # your frontend folder
    static_url_path=""           # serve static at /
)

# AI Prompt: Explain the CORS configuration section in clear, simple terms.
# =========================================================
# CORS configuration
# =========================================================
# Enables the frontend to send requests to this backend.
CORS(app, resources={r"/*": {"origins": ["https://jamieoneilltud.github.io"]}})


# AI Prompt: Explain the Auth + Blueprint registration section in clear, simple terms.
# =========================================================
# Auth + Blueprints
# =========================================================
# Setup Password Hashing (bcrypt)
auth_bcrypt.init_app(app)

# Register Blueprint Routes
# Blueprints organize routes into there own sections.
app.register_blueprint(auth)        
app.register_blueprint(courses)     # /courses routes
app.register_blueprint(topology)   # /topology routes


# AI Prompt: Explain the Core routes section in clear, simple terms.
# =========================================================
# Core routes
# =========================================================
# Default Route
@app.route("/")
def home():
    return redirect("/index.html")

@app.get("/healthz")
def healthz():
    return {"ok": True}

# AI Prompt: Explain the Run server section in clear, simple terms.
# =========================================================
# Run server
# =========================================================
# Run Server
if __name__ == "__main__":
    app.run(debug=True)
