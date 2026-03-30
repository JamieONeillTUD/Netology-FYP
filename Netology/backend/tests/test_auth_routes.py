# test_auth_routes.py
# Tests for auth_routes.py — /register and /login endpoints.
#
# Functional Requirement: F01 — User Registration and Login
#
# Validation tests send bad data and expect a 400 back.
# These return before the database is touched so no mock is needed.
#
# DB tests mock get_db_connection so no real database is required.

import pytest
from unittest.mock import MagicMock, patch


def mock_db():
    # Returns a fake (conn, cursor) pair for use in DB tests.
    conn = MagicMock()
    cur  = MagicMock()
    conn.cursor.return_value = cur
    return conn, cur


# ─────────────────────────────────────────────────────────────
# REGISTER — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_register_missing_fields_returns_400(client):
    resp = client.post('/register', data={})
    assert resp.status_code == 400

def test_register_missing_first_name_returns_400(client):
    resp = client.post('/register', data={
        'last_name': 'Test', 'username': 'testuser',
        'email': 'test@test.com', 'dob': '2000-01-01',
        'password': 'password123', 'confirm_password': 'password123',
        'reasons': 'learning'
    })
    assert resp.status_code == 400

def test_register_invalid_email_returns_400(client):
    resp = client.post('/register', data={
        'first_name': 'Jamie', 'last_name': 'Test', 'username': 'testuser',
        'email': 'notanemail', 'dob': '2000-01-01',
        'password': 'password123', 'confirm_password': 'password123',
        'reasons': 'learning'
    })
    assert resp.status_code == 400

def test_register_short_password_returns_400(client):
    resp = client.post('/register', data={
        'first_name': 'Jamie', 'last_name': 'Test', 'username': 'testuser',
        'email': 'test@test.com', 'dob': '2000-01-01',
        'password': 'abc', 'confirm_password': 'abc',
        'reasons': 'learning'
    })
    assert resp.status_code == 400

def test_register_mismatched_passwords_returns_400(client):
    resp = client.post('/register', data={
        'first_name': 'Jamie', 'last_name': 'Test', 'username': 'testuser',
        'email': 'test@test.com', 'dob': '2000-01-01',
        'password': 'password123', 'confirm_password': 'different123',
        'reasons': 'learning'
    })
    assert resp.status_code == 400

def test_register_no_reasons_returns_400(client):
    resp = client.post('/register', data={
        'first_name': 'Jamie', 'last_name': 'Test', 'username': 'testuser',
        'email': 'test@test.com', 'dob': '2000-01-01',
        'password': 'password123', 'confirm_password': 'password123'
    })
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# REGISTER — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_register_duplicate_email_returns_409(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = (1,)  # email already exists in DB
    with patch('auth_routes.get_db_connection', return_value=conn):
        resp = client.post('/register', data={
            'first_name': 'Jamie', 'last_name': 'Test', 'username': 'testuser',
            'email': 'test@test.com', 'dob': '2000-01-01',
            'password': 'password123', 'confirm_password': 'password123',
            'reasons': 'learning'
        })
    assert resp.status_code == 409

def test_register_success_returns_200(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = None  # email and username both free
    with patch('auth_routes.get_db_connection', return_value=conn):
        resp = client.post('/register', data={
            'first_name': 'Jamie', 'last_name': 'Test', 'username': 'jamietest',
            'email': 'jamie@test.com', 'dob': '2000-01-01',
            'password': 'password123', 'confirm_password': 'password123',
            'reasons': 'learning'
        })
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True


# ─────────────────────────────────────────────────────────────
# LOGIN — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_login_wrong_credentials_returns_401(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = None  # no user found
    with patch('auth_routes.get_db_connection', return_value=conn):
        resp = client.post('/login', data={
            'email': 'wrong@test.com', 'password': 'wrongpass'
        })
    assert resp.status_code == 401

def test_login_success_returns_200(client):
    conn, cur = mock_db()
    # Return a fake user row: (first_name, last_name, password_hash, xp,
    #                           username, start_level, is_first_login, onboarding_completed)
    cur.fetchone.return_value = ('Jamie', 'Test', 'hashed', 0, 'jamietest', 'novice', True, False)
    with patch('auth_routes.get_db_connection', return_value=conn):
        with patch('auth_routes.bcrypt.check_password_hash', return_value=True):
            resp = client.post('/login', data={
                'email': 'jamie@test.com', 'password': 'password123'
            })
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True

def test_login_success_response_contains_xp_and_level(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = ('Jamie', 'Test', 'hashed', 300, 'jamietest', 'intermediate', False, True)
    with patch('auth_routes.get_db_connection', return_value=conn):
        with patch('auth_routes.bcrypt.check_password_hash', return_value=True):
            resp = client.post('/login', data={
                'email': 'jamie@test.com', 'password': 'password123'
            })
    data = resp.get_json()
    assert 'xp' in data
    assert 'rank' in data


# ─────────────────────────────────────────────────────────────
# USER INFO — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_user_info_missing_email_returns_400(client):
    resp = client.get('/user-info')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# USER INFO — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_user_info_user_not_found_returns_404(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = None
    with patch('auth_routes.get_db_connection', return_value=conn):
        resp = client.get('/user-info?email=nobody@test.com')
    assert resp.status_code == 404

def test_user_info_success_returns_200(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = ('Jamie', 'Test', 300, 'jamietest', 'jamie@test.com', 'novice', None)
    with patch('auth_routes.get_db_connection', return_value=conn):
        resp = client.get('/user-info?email=jamie@test.com')
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True


# ─────────────────────────────────────────────────────────────
# AWARD XP — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_award_xp_missing_all_fields_returns_400(client):
    resp = client.post('/award-xp', json={})
    assert resp.status_code == 400

def test_award_xp_zero_xp_returns_400(client):
    resp = client.post('/award-xp', json={'email': 'test@test.com', 'action': 'login', 'xp': 0})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# AWARD XP — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_award_xp_already_awarded_returns_200_with_zero_xp(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = (1,)  # action already in xp_log
    with patch('auth_routes.get_db_connection', return_value=conn):
        with patch('auth_routes.evaluate_achievements_for_event', return_value=[]):
            resp = client.post('/award-xp', json={
                'email': 'test@test.com', 'action': 'login', 'xp': 50
            })
    assert resp.status_code == 200
    assert resp.get_json()['xp_added'] == 0


# ─────────────────────────────────────────────────────────────
# RECORD LOGIN — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_record_login_missing_email_returns_400(client):
    resp = client.post('/record-login', json={})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# RECORD LOGIN — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_record_login_success_returns_200(client):
    conn, cur = mock_db()
    cur.fetchall.return_value = []
    with patch('auth_routes.get_db_connection', return_value=conn):
        with patch('auth_routes.evaluate_achievements_for_event', return_value=[]):
            resp = client.post('/record-login', json={'email': 'test@test.com'})
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True


# ─────────────────────────────────────────────────────────────
# FORGOT PASSWORD — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_forgot_password_missing_fields_returns_400(client):
    resp = client.post('/forgot-password', json={})
    assert resp.status_code == 400

def test_forgot_password_invalid_email_returns_400(client):
    resp = client.post('/forgot-password', json={'email': 'notanemail', 'password': 'newpass123'})
    assert resp.status_code == 400
