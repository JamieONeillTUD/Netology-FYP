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

# Create Flask App
# static_folder points to where your HTML/CSS/JS is
app = Flask(
    __name__,
    static_folder="../frontend",     # Where frontend files live
    static_url_path="/frontend"      # URL path to access them
)

# Enable CORS
# Allows the frontend to send requests to this backend.
CORS(app)

# Setup Password Hashing (bcrypt)
auth_bcrypt.init_app(app)

# Register Blueprint Routes
# Blueprints organize routes into there own sections.
app.register_blueprint(auth)        
app.register_blueprint(courses)     # /courses routes


# Default Route
@app.route("/")
def home():
    return redirect("/frontend/login.html")

# Run Server
if __name__ == "__main__":
    app.run(debug=True)
