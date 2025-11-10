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
        if not email or not password:
            flash('Please enter both email and password.', 'warning')
            return redirect(url_for('auth.login_page'))
        user = get_user_by_email(email)
        if user and bcrypt.check_password_hash(user['password_hash'], password):
            session['user'] = {
                'first_name': user['first_name'],
                'level': user['level'],
                'xp': user['xp']
            }
            flash('Logged in successfully.', 'success')
            return redirect(url_for('auth.dashboard'))
        flash('Invalid email or password.', 'danger')
        return redirect(url_for('auth.login_page'))
    return render_template('login.html')

@auth_bp.route('/signup', methods=['GET'])
def signup_page():
    return render_template('signup.html')

@auth_bp.route('/register', methods=['POST'])
def register():
    first_name = request.form.get('first_name','').strip()
    last_name  = request.form.get('last_name','').strip()
    username   = request.form.get('username','').strip()
    email      = request.form.get('email','').strip()
    raw_pwd    = request.form.get('password','')
    level      = request.form.get('level','').strip()
    reasons_list = request.form.getlist('reasons')
    reasons_csv = ",".join(reasons_list)

    if not (first_name and last_name and username and email and raw_pwd):
        flash('Please complete all required fields.', 'warning')
        return redirect(url_for('auth.signup_page'))
    if '@' not in email or '.' not in email.split('@')[-1]:
        flash('Please enter a valid email.', 'warning')
        return redirect(url_for('auth.signup_page'))
    if len(raw_pwd) < 8:
        flash('Password must be at least 8 characters.', 'warning')
        return redirect(url_for('auth.signup_page'))
    if level not in ['Novice', 'Intermediate', 'Advanced']:
        flash('Select your networking level.', 'warning')
        return redirect(url_for('auth.signup_page'))
    if not reasons_list:
        flash('Select at least one reason for learning.', 'warning')
        return redirect(url_for('auth.signup_page'))

    password_hash = bcrypt.generate_password_hash(raw_pwd).decode('utf-8')
    try:
        create_user(first_name, last_name, username, email, password_hash, level, reasons_csv)
        flash('Account created! You can now log in.', 'success')
        return redirect(url_for('auth.login_page'))
    except Exception as e:
        flash(f'Error creating account: {e}', 'danger')
        return redirect(url_for('auth.signup_page'))

@auth_bp.route('/dashboard')
def dashboard():
    if 'user' not in session:
        flash('Please log in to continue.', 'warning')
        return redirect(url_for('auth.login_page'))
    return render_template('dashboard.html', user=session['user'])

@auth_bp.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login_page'))
