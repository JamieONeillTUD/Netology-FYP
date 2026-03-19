# app.py — Main backend entry point and API route registration.

from dotenv import load_dotenv
from flask import Flask, redirect
from flask_cors import CORS

from auth_routes import auth, bcrypt as auth_bcrypt
from course_routes import courses
from onboarding_routes import onboarding
from topology_routes import topology
from user_routes import user_api

load_dotenv()

app = Flask(
    __name__,
    static_folder="../docs",
    static_url_path="",
)

CORS(app, origins=[
    "https://jamieoneilltud.github.io",
    "https://netology-fyp.onrender.com",
])

auth_bcrypt.init_app(app)

app.register_blueprint(auth)
app.register_blueprint(courses)
app.register_blueprint(onboarding)
app.register_blueprint(user_api)
app.register_blueprint(topology)


@app.route("/")
def home():
    # Redirect root URL to the landing page.
    return redirect("/index.html")


@app.get("/healthz")
def healthz():
    # Health check endpoint for Render.
    return {"ok": True}
