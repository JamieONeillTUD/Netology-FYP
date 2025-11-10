from flask import Flask, redirect, url_for
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from routes.auth_routes import auth_bp

app = Flask(__name__, template_folder="../frontend", static_folder="../frontend")
app.secret_key = "supersecretkey"
CORS(app)
bcrypt = Bcrypt(app)

# Register routes
app.register_blueprint(auth_bp)

@app.route('/')
def home():
    return redirect(url_for('auth.login_page'))

if __name__ == "__main__":
    app.run(debug=True)
