# backend/app.py
from flask import Flask, redirect
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from auth_routes import auth, bcrypt as auth_bcrypt
from course_routes import courses

app = Flask(__name__, static_folder='../frontend', static_url_path='/frontend')
CORS(app)

# Initialize bcrypt in both app and routes
auth_bcrypt.init_app(app)

# Register blueprints
app.register_blueprint(auth)
app.register_blueprint(courses)

# --- Default route ---
@app.route('/')
def home():
    return redirect('/frontend/login.html')


if __name__ == '__main__':
    app.run(debug=True)
