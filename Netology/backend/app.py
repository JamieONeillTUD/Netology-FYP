"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

app.py - Main Flask App Setup
---
This file is the main starting point for the Netology backend.
It creates the Flask app, enables CORS for the frontend, and
registers the route files used across the project.

It also serves the frontend files from the docs folder, redirects
the root URL to the landing page, and provides a small health
check route for deployment.
"""

from dotenv import load_dotenv
from flask import Flask, redirect
from flask_cors import CORS

from auth_routes import auth, bcrypt as auth_bcrypt
from course_routes import courses
from onboarding_routes import onboarding
from topology_routes import topology
from user_routes import user_api

load_dotenv()

ALLOWED_ORIGINS = [
    "https://jamieoneilltud.github.io",
    "https://netology-fyp.onrender.com",
]

app = Flask(
    __name__,
    static_folder="../docs",
    static_url_path="",
)

CORS(app, origins=ALLOWED_ORIGINS)

auth_bcrypt.init_app(app)

app.register_blueprint(auth)
app.register_blueprint(courses)
app.register_blueprint(onboarding)
app.register_blueprint(user_api)
app.register_blueprint(topology)


@app.get("/")
def home():
    # Send the root URL to the landing page.
    return redirect("/index.html")


@app.get("/healthz")
def healthz():
    # Simple check used by Render to see if the app is running.
    return {"ok": True}
