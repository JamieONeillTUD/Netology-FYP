"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

test_auth.py - Authentication Tests
---
This file checks the main auth helpers and user account routes.

It covers:
  1. Simple helper functions like email and level checks.
  2. Register, login, user info, login recording, forgot password,
     and delete account routes.
  3. A few real-database checks for the full auth flow.

"""

import json

import pytest

from auth_routes import start_level, valid_email, xp_payload

# valid_email()

def test_valid_email_accepts_normal_address():
    assert valid_email("user@example.com") is True

def test_valid_email_accepts_college_address():
    assert valid_email("c22320301@mytudublin.ie") is True

def test_valid_email_accepts_numbers():
    assert valid_email("user123@test.org") is True

def test_valid_email_rejects_missing_at_sign():
    assert valid_email("userexample.com") is False

def test_valid_email_rejects_missing_dot():
    assert valid_email("user@examplecom") is False

def test_valid_email_rejects_empty_string():
    assert valid_email("") is False

def test_valid_email_rejects_none():
    assert valid_email(None) is False


# start_level()

def test_start_level_novice():
    assert start_level("novice") == "novice"

def test_start_level_intermediate():
    assert start_level("intermediate") == "intermediate"

def test_start_level_advanced():
    assert start_level("advanced") == "advanced"

def test_start_level_lowers_case():
    assert start_level("NOVICE") == "novice"

def test_start_level_defaults_to_novice():
    assert start_level("expert") == "novice"

def test_start_level_none_defaults_to_novice():
    assert start_level(None) == "novice"

def test_start_level_empty_defaults_to_novice():
    assert start_level("") == "novice"


# xp_payload()

def test_xp_payload_zero_xp():
    result = xp_payload(0)
    assert result["numeric_level"] == 1
    assert result["rank"] == "Novice"
    assert result["xp"] == 0

def test_xp_payload_300_xp():
    result = xp_payload(300)
    assert result["numeric_level"] == 3
    assert result["rank"] == "Intermediate"

def test_xp_payload_keys():
    result = xp_payload(100)
    for key in ("xp", "numeric_level", "level", "rank", "xp_into_level", "next_level_xp"):
        assert key in result


# POST /register

REGISTER_DATA = {
    "first_name": "Jamie",
    "last_name": "Test",
    "username": "jamietest",
    "email": "jamie@test.com",
    "dob": "2000-01-01",
    "password": "password123",
    "confirm_password": "password123",
    "reasons": "learning",
}

def test_register_ok(integration_client):
    resp = integration_client.post("/register", data=REGISTER_DATA)
    assert resp.status_code == 200

def test_register_missing_fields(integration_client):
    resp = integration_client.post("/register", data={})
    assert resp.status_code == 400

def test_register_missing_first_name(integration_client):
    data = {**REGISTER_DATA, "first_name": ""}
    resp = integration_client.post('/register', data=data)
    assert resp.status_code == 400

def test_register_bad_email(integration_client):
    data = {**REGISTER_DATA, "email": "notanemail"}
    resp = integration_client.post("/register", data=data)
    assert resp.status_code == 400

def test_register_short_password(integration_client):
    data = {**REGISTER_DATA, "password": "abc", "confirm_password": "abc"}
    resp = integration_client.post("/register", data=data)
    assert resp.status_code == 400

def test_register_password_mismatch(integration_client):
    data = {**REGISTER_DATA, "confirm_password": "different123"}
    resp = integration_client.post("/register", data=data)
    assert resp.status_code == 400

def test_register_missing_reasons(integration_client):
    data = {**REGISTER_DATA, "reasons": ""}
    resp = integration_client.post("/register", data=data)
    assert resp.status_code == 400

def test_register_duplicate_email(integration_client):
    integration_client.post("/register", data=REGISTER_DATA)
    resp = integration_client.post("/register", data=REGISTER_DATA)
    assert resp.status_code == 409


# POST /login

def test_login_ok(integration_client, make_user):
    make_user("login@test.com")
    resp = integration_client.post("/login", data={"email": "login@test.com", "password": "TestPass123!"})
    assert resp.status_code == 200

def test_login_returns_xp_and_level(integration_client, make_user):
    make_user("login2@test.com")
    resp = integration_client.post("/login", data={"email": "login2@test.com", "password": "TestPass123!"})
    body = json.loads(resp.data)
    assert "xp" in body
    assert "numeric_level" in body
    assert "rank" in body

def test_login_bad_password(integration_client, make_user):
    make_user("login3@test.com")
    resp = integration_client.post("/login", data={"email": "login3@test.com", "password": "wrongpassword"})
    assert resp.status_code == 401

def test_login_unknown_email(integration_client):
    resp = integration_client.post("/login", data={"email": "ghost@test.com", "password": "TestPass123!"})
    assert resp.status_code == 401


# GET /user-info

def test_user_info_ok(integration_client, make_user):
    make_user("info@test.com")
    resp = integration_client.get("/user-info?email=info@test.com")
    body = json.loads(resp.data)
    assert body["success"] is True
    assert body["first_name"] == "Test"

def test_user_info_unknown_email(integration_client):
    resp = integration_client.get("/user-info?email=nobody@test.com")
    assert resp.status_code == 404

def test_user_info_missing_email(integration_client):
    resp = integration_client.get("/user-info")
    assert resp.status_code == 400


# POST /record-login

def test_record_login_ok(integration_client, make_user):
    make_user("reclogin@test.com")
    resp = integration_client.post("/record-login", json={"email": "reclogin@test.com"})
    assert resp.status_code == 200

def test_record_login_returns_log(integration_client, make_user):
    make_user("reclogin2@test.com")
    resp = integration_client.post("/record-login", json={"email": "reclogin2@test.com"})
    body = json.loads(resp.data)
    assert "log" in body

def test_record_login_missing_email(integration_client):
    resp = integration_client.post("/record-login", json={})
    assert resp.status_code == 400


# POST /forgot-password

def test_forgot_password_ok(integration_client, make_user):
    make_user("forgot@test.com")
    resp = integration_client.post("/forgot-password", json={
        "email": "forgot@test.com", "password": "NewPassword1!"
    })
    assert resp.status_code == 200

def test_forgot_password_unknown_email(integration_client):
    resp = integration_client.post("/forgot-password", json={
        "email": "nobody@test.com", "password": "NewPassword1!"
    })
    assert resp.status_code == 404

def test_forgot_password_short_password(integration_client):
    resp = integration_client.post("/forgot-password", json={
        "email": "forgot@test.com", "password": "short"
    })
    assert resp.status_code == 400

def test_forgot_password_missing_email(integration_client):
    resp = integration_client.post("/forgot-password", json={"password": "NewPassword1!"})
    assert resp.status_code == 400


# POST /delete-account

def test_delete_account_ok(integration_client, make_user):
    make_user("delete@test.com")
    resp = integration_client.post("/delete-account", data={"email": "delete@test.com"})
    assert resp.status_code == 200

def test_delete_account_unknown_email(integration_client):
    resp = integration_client.post("/delete-account", data={"email": "missing@test.com"})
    assert resp.status_code == 404

def test_delete_account_missing_email(integration_client):
    resp = integration_client.post("/delete-account", data={})
    assert resp.status_code == 400



# Full auth flow

USER_DATA = {
    "first_name": "Alice",
    "last_name": "Smith",
    "username": "alicesmith",
    "email": "alice@test.com",
    "dob": "2000-06-15",
    "password": "SecurePass1!",
    "confirm_password": "SecurePass1!",
    "level": "novice",
    "reasons": "career",
}

@pytest.mark.integration
def test_register_saves_user(integration_client, db):
    integration_client.post("/register", data=USER_DATA)
    row = db.execute("SELECT email FROM users WHERE email = 'alice@test.com'").fetchone()
    assert row is not None

@pytest.mark.integration
def test_register_duplicate_email_real_db(integration_client):
    integration_client.post("/register", data=USER_DATA)
    resp = integration_client.post("/register", data=USER_DATA)
    assert resp.status_code == 409

@pytest.mark.integration
def test_login_success_real_db(integration_client):
    integration_client.post("/register", data=USER_DATA)
    resp = integration_client.post("/login", data={
        "email": "alice@test.com",
        "password": "SecurePass1!"
    })
    assert resp.status_code == 200

@pytest.mark.integration
def test_login_bad_password_real_db(integration_client):
    integration_client.post("/register", data=USER_DATA)
    resp = integration_client.post("/login", data={
        "email": "alice@test.com",
        "password": "WrongPassword!"
    })
    assert resp.status_code == 401

@pytest.mark.integration
def test_user_info_registered_user(integration_client):
    integration_client.post("/register", data=USER_DATA)
    resp = integration_client.get("/user-info?email=alice@test.com")
    body = json.loads(resp.data)
    assert body["first_name"] == "Alice"
    assert body["email"] == "alice@test.com"


@pytest.mark.integration
def test_delete_account_removes_user(integration_client, make_user, db):
    make_user("delete2@test.com")
    integration_client.post("/delete-account", data={"email": "delete2@test.com"})
    row = db.execute("SELECT email FROM users WHERE email = 'delete2@test.com'").fetchone()
    assert row is None
