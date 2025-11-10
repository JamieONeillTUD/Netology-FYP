from flask import Flask
from flask_cors import CORS
from routes.auth_routes import auth_bp

app = Flask(__name__)
app.secret_key = "supersecretkey"
CORS(app)

# Register blueprints
app.register_blueprint(auth_bp)

# Root redirect
@app.route('/')
def home():
    return '<h3>Netology Backend Running</h3><p>Visit <a href="/login">/login</a></p>'

if __name__ == '__main__':
    app.run(debug=True)
