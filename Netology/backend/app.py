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

CORS(app, resources={r"/*": {"origins": ["https://jamieoneilltud.github.io", "https://netology-fyp.onrender.com"]}})


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
