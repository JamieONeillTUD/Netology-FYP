"""
Login, Signup (3-step), Dashboard, Logout — Flask Blueprint.
Compatible with new Bootstrap frontend + JS wizard.
"""
from flask import Blueprint, render_template, request, redirect, session, url_for, flash
from flask_bcrypt import Bcrypt
from models.user_model import create_user, get_user_by_email

# --- Blueprint setup ---
auth_bp = Blueprint('auth', __name__)
bcrypt = Bcrypt()

# --- LOGIN PAGE ---
@auth_bp.route('/login', methods=['GET', 'POST'])
def login_page():
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')

        if not email or not password:
            flash('Please enter both email and password.', 'warning')
            return redirect(url_for('auth.login_page'))

        user = get_user_by_email(email)
        if user and bcrypt.check_password_hash(user['password_hash'], password):
            # Save session info
            session['user'] = {
                'first_name': user['first_name'],
                'level': user['level'],
                'xp': user['xp']
            }
            flash('Logged in successfully.', 'success')
            return redirect(url_for('auth.dashboard'))
        else:
            flash('Invalid email or password.', 'danger')
            return redirect(url_for('auth.login_page'))

    # Render clean HTML (frontend/login.html)
    return render_template('login.html')


# --- SIGNUP PAGE ---
@auth_bp.route('/signup', methods=['GET'])
def signup_page():
    # Render your 3-step signup wizard (frontend/signup.html)
    return render_template('signup.html')


# --- HANDLE REGISTRATION ---
@auth_bp.route('/register', methods=['POST'])
def register():
    # Collect user inputs
    first_name = request.form.get('first_name', '').strip()
    last_name  = request.form.get('last_name', '').strip()
    username   = request.form.get('username', '').strip()
    email      = request.form.get('email', '').strip()
    raw_pwd    = request.form.get('password', '')
    level      = request.form.get('level', '').strip()
    reasons_list = request.form.getlist('reasons')
    reasons_csv = ",".join(reasons_list)

    # --- Basic validation ---
    if not all([first_name, last_name, username, email, raw_pwd]):
        flash('Please complete all required fields.', 'warning')
        return redirect(url_for('auth.signup_page'))

    if '@' not in email or '.' not in email.split('@')[-1]:
        flash('Please enter a valid email address.', 'warning')
        return redirect(url_for('auth.signup_page'))

    if len(raw_pwd) < 8:
        flash('Password must be at least 8 characters long.', 'warning')
        return redirect(url_for('auth.signup_page'))

    if level not in ['Novice', 'Intermediate', 'Advanced']:
        flash('Please select your networking level.', 'warning')
        return redirect(url_for('auth.signup_page'))

    if not reasons_list:
        flash('Select at least one reason for learning.', 'warning')
        return redirect(url_for('auth.signup_page'))

    # --- Create user ---
    password_hash = bcrypt.generate_password_hash(raw_pwd).decode('utf-8')

    try:
        create_user(first_name, last_name, username, email, password_hash, level, reasons_csv)
        flash('Account created successfully! You can now log in.', 'success')
        return redirect(url_for('auth.login_page'))

    except Exception as e:
        flash(f'Error creating account: {str(e)}', 'danger')
        return redirect(url_for('auth.signup_page'))


# --- DASHBOARD ---
@auth_bp.route('/dashboard')
def dashboard():
    if 'user' not in session:
        flash('Please log in to continue.', 'warning')
        return redirect(url_for('auth.login_page'))
    # Render frontend/dashboard.html with user session info
    return render_template('dashboard.html', user=session['user'])


# --- LOGOUT ---
@auth_bp.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login_page'))
