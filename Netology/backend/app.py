"""
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

Python (Flask)
-------------------------------------------
app.py – Main entry point for backend server.
"""

import os
from flask import Flask, redirect
from flask_cors import CORS
from dotenv import load_dotenv

from auth_routes import auth, bcrypt as auth_bcrypt
from course_routes import courses

load_dotenv()

# =========================================================
# App setup
# =========================================================
app = Flask(
    __name__,
    static_folder="../docs",  # your frontend folder
    static_url_path=""        # serve static at /
)

# =========================================================
# CORS configuration
# =========================================================
# Allow both GitHub Pages + your Render domain.
# (You can tighten this later if you want.)
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://jamieoneilltud.github.io",
            "https://netology-fyp.onrender.com"
        ]
    }
})

# =========================================================
# Auth + Blueprints
# =========================================================
auth_bcrypt.init_app(app)

app.register_blueprint(auth)
app.register_blueprint(courses)  # /courses routes

# Topology routes (optional: don't crash if file is missing)
try:
    from topology_routes import topology
    app.register_blueprint(topology)  # /topology routes
except Exception as e:
    print("WARNING: topology_routes not loaded:", e)

# =========================================================
# Core routes
# =========================================================
@app.route("/")
def home():
    return redirect("/index.html")

@app.get("/healthz")
def healthz():
    return {"ok": True}

# =========================================================
# Run server (Render fix)
# =========================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
