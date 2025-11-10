
"""Minimal Flask app serving pages from ../frontend and registering auth routes."""
import os
from flask import Flask, redirect, url_for
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from routes.auth_routes import auth_bp

# Absolute paths so it works anywhere
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TEMPLATES_DIR = os.path.join(BASE_DIR, "frontend")
STATIC_DIR = os.path.join(BASE_DIR, "frontend")

app = Flask(__name__, template_folder=TEMPLATES_DIR, static_folder=STATIC_DIR)
app.secret_key = "supersecretkey"  # replace in production
CORS(app)
bcrypt = Bcrypt(app)

# Register routes
app.register_blueprint(auth_bp)

@app.route("/")
def root():
    return redirect(url_for("auth.login_page"))

if __name__ == "__main__":
    app.run(debug=True)
