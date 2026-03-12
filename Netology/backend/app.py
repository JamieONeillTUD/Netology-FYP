"""app.py - Main backend entry point and API route registration."""

import os

from dotenv import load_dotenv
from flask import Flask, redirect
from flask_cors import CORS

from auth_routes import auth, bcrypt as auth_bcrypt
from course_routes import courses
from onboarding_routes import onboarding
from sandbox_routes import sandbox
from slides_routes import slides
from user_routes import user_api

load_dotenv()

app = Flask(
    __name__,
    static_folder="../docs",
    static_url_path="",
)

production_cors_origins = [
    "https://jamieoneilltud.github.io",
    "https://netology-fyp.onrender.com",
]

local_dev_cors_origins = [
    "http://localhost",
    "http://127.0.0.1",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:5001",
    "http://127.0.0.1:5001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "null",
]

allowed_cors_origins = [*production_cors_origins]
if os.environ.get("ENABLE_LOCAL_DEV_CORS", "1").strip() == "1":
    allowed_cors_origins.extend(local_dev_cors_origins)

extra_cors_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

CORS(app, resources={r"/*": {"origins": [*allowed_cors_origins, *extra_cors_origins]}})


auth_bcrypt.init_app(app)

app.register_blueprint(auth)
app.register_blueprint(courses)
app.register_blueprint(onboarding)
app.register_blueprint(slides)
app.register_blueprint(user_api)
app.register_blueprint(sandbox)

# Optional blueprint: keep app booting even if topology module fails.
try:
    from topology_routes import topology

    app.register_blueprint(topology)
except Exception as error:
    print("WARNING: topology_routes not loaded:", error)


@app.route("/")
def home():
    return redirect("/index.html")


@app.get("/healthz")
def healthz():
    return {"ok": True}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
