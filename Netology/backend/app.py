from flask import Flask, render_template, request, redirect, session, url_for, flash
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from routes.auth_routes import auth_bp

# Serve templates & static directly from ../frontend
app = Flask(__name__,
            template_folder="../frontend",
            static_folder="../frontend")
app.secret_key = "supersecretkey"
CORS(app)
bcrypt = Bcrypt(app)

# Register routes
app.register_blueprint(auth_bp)

@app.route('/')
def root():
    return redirect(url_for('auth.login_page'))

if __name__ == '__main__':
    app.run(debug=True)
