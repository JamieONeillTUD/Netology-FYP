
from flask import Blueprint, render_template, request, redirect, session, url_for, flash
from flask_bcrypt import Bcrypt
from models.user_model import create_user, get_user_by_email

auth_bp = Blueprint('auth', __name__)
bcrypt = Bcrypt()

@auth_bp.route('/login', methods=['GET', 'POST'])
def login_page():
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        user = get_user_by_email(email)
        if not email or not password:
            flash('Please enter both email and password.', 'warning')
        elif user and bcrypt.check_password_hash(user['password_hash'], password):
            session['user'] = {'first_name': user['first_name'], 'level': user['level'], 'xp': user['xp']}
            flash('Logged in successfully.', 'success')
            return redirect(url_for('auth.dashboard'))
        else:
            flash('Invalid email or password.', 'danger')
    return render_template('login.html')

@auth_bp.route('/signup')
def signup_page(): return render_template('signup.html')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = {k: request.form.get(k, '').strip() for k in ['first_name','last_name','username','email','password','level']}
    reasons = request.form.getlist('reasons')
    if not all(data.values()): flash('Please fill in all fields.', 'warning'); return redirect(url_for('auth.signup_page'))
    if len(data['password'])<8: flash('Password must be at least 8 chars.', 'warning'); return redirect(url_for('auth.signup_page'))
    pw_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    try:
        create_user(data['first_name'], data['last_name'], data['username'], data['email'], pw_hash, data['level'], ",".join(reasons))
        flash('Account created successfully!', 'success')
        return redirect(url_for('auth.login_page'))
    except Exception as e:
        flash(f'Error: {e}', 'danger'); return redirect(url_for('auth.signup_page'))

@auth_bp.route('/dashboard')
def dashboard():
    if 'user' not in session:
        flash('Please log in to continue.', 'warning'); return redirect(url_for('auth.login_page'))
    return render_template('dashboard.html', user=session['user'])

@auth_bp.route('/logout')
def logout():
    session.clear(); flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login_page'))
