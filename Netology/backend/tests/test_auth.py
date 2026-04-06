# test_auth.py
# Tests for user registration, login, and profile (auth_routes.py)
#
# Functional Requirement: FR01 — User Registration
#                         FR02 — User Login and Authentication
#                         FR03 — User Profile Info
#
# ── Test Types ────────────────────────────────────────────────
#   UNIT TESTS        — test helper functions like valid_email()
#   API TESTS         — HTTP endpoint tests, real database
#   INTEGRATION TESTS — real PostgreSQL via real database

import pytest
import json
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from auth_routes import valid_email, start_level, level_bootstrap_for_start, xp_payload


# ─────────────────────────────────────────────────────────────
# UNIT TESTS — valid_email()
# ─────────────────────────────────────────────────────────────

# Happy path

def test_valid_email_accepts_a_standard_email():
    assert valid_email('user@example.com') is True

def test_valid_email_accepts_a_college_email():
    assert valid_email('c22320301@mytudublin.ie') is True

def test_valid_email_accepts_email_with_numbers():
    assert valid_email('user123@test.org') is True

# Invalid input

def test_valid_email_rejects_email_with_no_at_sign():
    assert valid_email('userexample.com') is False

def test_valid_email_rejects_email_with_no_dot_in_domain():
    assert valid_email('user@examplecom') is False

def test_valid_email_rejects_empty_string():
    assert valid_email('') is False

def test_valid_email_rejects_none():
    assert valid_email(None) is False


# ─────────────────────────────────────────────────────────────
# UNIT TESTS — start_level()
# ─────────────────────────────────────────────────────────────

# Happy path

def test_start_level_accepts_novice():
    assert start_level('novice') == 'novice'

def test_start_level_accepts_intermediate():
    assert start_level('intermediate') == 'intermediate'

def test_start_level_accepts_advanced():
    assert start_level('advanced') == 'advanced'

# Edge cases

def test_start_level_converts_uppercase_to_lowercase():
    assert start_level('NOVICE') == 'novice'

def test_start_level_unknown_value_defaults_to_novice():
    assert start_level('expert') == 'novice'

def test_start_level_none_defaults_to_novice():
    assert start_level(None) == 'novice'

def test_start_level_empty_string_defaults_to_novice():
    assert start_level('') == 'novice'


# ─────────────────────────────────────────────────────────────
# UNIT TESTS — xp_payload()
# ─────────────────────────────────────────────────────────────

def test_xp_payload_zero_xp_returns_level_one_novice():
    result = xp_payload(0)
    assert result['numeric_level'] == 1
    assert result['rank'] == 'Novice'
    assert result['xp'] == 0

def test_xp_payload_300_xp_returns_level_three_intermediate():
    result = xp_payload(300)
    assert result['numeric_level'] == 3
    assert result['rank'] == 'Intermediate'

def test_xp_payload_contains_all_required_keys():
    result = xp_payload(100)
    for key in ('xp', 'numeric_level', 'level', 'rank', 'xp_into_level', 'next_level_xp'):
        assert key in result


# ─────────────────────────────────────────────────────────────
# API TESTS — POST /register   (real database)
# ─────────────────────────────────────────────────────────────

VALID_REGISTER_DATA = {
    'first_name': 'Jamie', 'last_name': 'Test', 'username': 'jamietest',
    'email': 'jamie@test.com', 'dob': '2000-01-01',
    'password': 'password123', 'confirm_password': 'password123',
    'reasons': 'learning'
}

# Happy path

def test_register_valid_data_returns_200(integration_client):
    resp = integration_client.post('/register', data=VALID_REGISTER_DATA)
    assert resp.status_code == 200

# Boundary cases

def test_register_missing_all_fields_returns_400(integration_client):
    resp = integration_client.post('/register', data={})
    assert resp.status_code == 400

def test_register_missing_first_name_returns_400(integration_client):
    data = {**VALID_REGISTER_DATA, 'first_name': ''}
    resp = integration_client.post('/register', data=data)
    assert resp.status_code == 400

# Invalid input

def test_register_invalid_email_returns_400(integration_client):
    data = {**VALID_REGISTER_DATA, 'email': 'notanemail'}
    resp = integration_client.post('/register', data=data)
    assert resp.status_code == 400

def test_register_short_password_returns_400(integration_client):
    data = {**VALID_REGISTER_DATA, 'password': 'abc', 'confirm_password': 'abc'}
    resp = integration_client.post('/register', data=data)
    assert resp.status_code == 400

def test_register_mismatched_passwords_returns_400(integration_client):
    data = {**VALID_REGISTER_DATA, 'confirm_password': 'different123'}
    resp = integration_client.post('/register', data=data)
    assert resp.status_code == 400

def test_register_no_reasons_selected_returns_400(integration_client):
    data = {**VALID_REGISTER_DATA, 'reasons': ''}
    resp = integration_client.post('/register', data=data)
    assert resp.status_code == 400

def test_register_duplicate_email_returns_409(integration_client):
    integration_client.post('/register', data=VALID_REGISTER_DATA)
    resp = integration_client.post('/register', data=VALID_REGISTER_DATA)
    assert resp.status_code == 409


# ─────────────────────────────────────────────────────────────
# API TESTS — POST /login   (real database)
# ─────────────────────────────────────────────────────────────

# Happy path

def test_login_valid_credentials_returns_200(integration_client, make_user):
    make_user('login@test.com')
    resp = integration_client.post('/login', data={'email': 'login@test.com', 'password': 'TestPass123!'})
    assert resp.status_code == 200

def test_login_response_includes_xp_and_level_data(integration_client, make_user):
    make_user('login2@test.com')
    resp = integration_client.post('/login', data={'email': 'login2@test.com', 'password': 'TestPass123!'})
    body = json.loads(resp.data)
    assert 'xp' in body
    assert 'numeric_level' in body
    assert 'rank' in body

# Invalid input

def test_login_wrong_password_returns_401(integration_client, make_user):
    make_user('login3@test.com')
    resp = integration_client.post('/login', data={'email': 'login3@test.com', 'password': 'wrongpassword'})
    assert resp.status_code == 401

def test_login_unknown_email_returns_401(integration_client):
    resp = integration_client.post('/login', data={'email': 'ghost@test.com', 'password': 'TestPass123!'})
    assert resp.status_code == 401


# ─────────────────────────────────────────────────────────────
# API TESTS — GET /user-info   (real database)
# ─────────────────────────────────────────────────────────────

def test_user_info_returns_correct_data(integration_client, make_user):
    make_user('info@test.com')
    resp = integration_client.get('/user-info?email=info@test.com')
    body = json.loads(resp.data)
    assert body['success'] is True
    assert body['first_name'] == 'Test'

def test_user_info_unknown_email_returns_404(integration_client):
    resp = integration_client.get('/user-info?email=nobody@test.com')
    assert resp.status_code == 404

def test_user_info_missing_email_returns_400(integration_client):
    resp = integration_client.get('/user-info')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# API TESTS — POST /record-login   (real database)
# ─────────────────────────────────────────────────────────────

def test_record_login_valid_email_returns_200(integration_client, make_user):
    make_user('reclogin@test.com')
    resp = integration_client.post('/record-login', json={'email': 'reclogin@test.com'})
    assert resp.status_code == 200

def test_record_login_response_includes_log(integration_client, make_user):
    make_user('reclogin2@test.com')
    resp = integration_client.post('/record-login', json={'email': 'reclogin2@test.com'})
    body = json.loads(resp.data)
    assert 'log' in body

def test_record_login_missing_email_returns_400(integration_client):
    resp = integration_client.post('/record-login', json={})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# API TESTS — POST /forgot-password   (real database)
# ─────────────────────────────────────────────────────────────

def test_forgot_password_valid_data_returns_200(integration_client, make_user):
    make_user('forgot@test.com')
    resp = integration_client.post('/forgot-password', json={
        'email': 'forgot@test.com', 'password': 'NewPassword1!'
    })
    assert resp.status_code == 200

def test_forgot_password_unknown_email_returns_404(integration_client):
    resp = integration_client.post('/forgot-password', json={
        'email': 'nobody@test.com', 'password': 'NewPassword1!'
    })
    assert resp.status_code == 404

def test_forgot_password_short_password_returns_400(integration_client):
    resp = integration_client.post('/forgot-password', json={
        'email': 'forgot@test.com', 'password': 'short'
    })
    assert resp.status_code == 400

def test_forgot_password_missing_email_returns_400(integration_client):
    resp = integration_client.post('/forgot-password', json={'password': 'NewPassword1!'})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# INTEGRATION TESTS — register and login with a real database
# ─────────────────────────────────────────────────────────────

REAL_USER = {
    'first_name': 'Alice', 'last_name': 'Smith', 'username': 'alicesmith',
    'email': 'alice@test.com', 'dob': '2000-06-15',
    'password': 'SecurePass1!', 'confirm_password': 'SecurePass1!',
    'level': 'novice', 'reasons': 'career'
}

@pytest.mark.integration
def test_register_creates_a_row_in_the_users_table(integration_client, db):
    integration_client.post('/register', data=REAL_USER)
    row = db.execute("SELECT email FROM users WHERE email = 'alice@test.com'").fetchone()
    assert row is not None

@pytest.mark.integration
def test_register_duplicate_email_returns_409_with_real_database(integration_client):
    integration_client.post('/register', data=REAL_USER)
    resp = integration_client.post('/register', data=REAL_USER)
    assert resp.status_code == 409

@pytest.mark.integration
def test_login_with_correct_password_returns_200_with_real_database(integration_client):
    integration_client.post('/register', data=REAL_USER)
    resp = integration_client.post('/login', data={
        'email': 'alice@test.com',
        'password': 'SecurePass1!'
    })
    assert resp.status_code == 200

@pytest.mark.integration
def test_login_with_wrong_password_returns_401_with_real_database(integration_client):
    integration_client.post('/register', data=REAL_USER)
    resp = integration_client.post('/login', data={
        'email': 'alice@test.com',
        'password': 'WrongPassword!'
    })
    assert resp.status_code == 401

@pytest.mark.integration
def test_user_info_returns_registered_users_name_and_email(integration_client):
    integration_client.post('/register', data=REAL_USER)
    resp = integration_client.get('/user-info?email=alice@test.com')
    body = json.loads(resp.data)
    assert body['first_name'] == 'Alice'
    assert body['email'] == 'alice@test.com'
