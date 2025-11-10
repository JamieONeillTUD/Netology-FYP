
from flask import Flask
from flask_cors import CORS
from routes.auth_routes import auth_bp
import webbrowser

app = Flask(__name__)
app.secret_key = "supersecretkey"
CORS(app)
app.register_blueprint(auth_bp)

@app.route('/')
def home():
    return '<h3>Netology Backend Running</h3><p>Visit <a href="/login">Login</a></p>'

if __name__ == '__main__':
    frontend_url = "http://127.0.0.1:5500/Netology/frontend/login.html"
    print("\n===================================")
    print("🚀 Netology is now running!")
    print(f"Frontend: {frontend_url}")
    print("Backend:  http://127.0.0.1:5000")
    print("===================================\n")
    input("Press Enter to open the login page in your browser... ")
    try:
        webbrowser.open(frontend_url)
    except Exception:
        print("Could not open browser automatically, please open the link manually.")
    app.run(debug=True)
