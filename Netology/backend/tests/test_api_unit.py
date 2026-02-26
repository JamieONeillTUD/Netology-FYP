"""
test_api_unit.py – Tier 2 API tests using the Flask test client.

Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4

These tests make real HTTP requests to the Flask app via the test client.
Some endpoints are tested without a database (static responses), while
auth and user endpoints use the real PostgreSQL database via the .env file.

Test classes:
  TestStaticEndpoints  – endpoints that return hardcoded data, no DB needed
  TestRegistration     – /register endpoint (creates + validates users)
  TestLogin            – /login endpoint (validates credentials, returns user object)
  TestUserInfo         – /user-info endpoint (returns live user data)
  TestOnboardingAPI    – /api/onboarding/* endpoints
"""

import time
import pytest


# =========================================================
# Helper
# =========================================================

def _cleanup_user(email: str):
    """Best-effort DB cleanup for one-off test users created inside tests."""
    try:
        from db import get_db_connection
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("DELETE FROM users WHERE email = %s", (email,))
        conn.commit()
        cur.close()
        conn.close()
    except Exception:
        pass  # cleanup failure should never fail the test


# =========================================================
# Tier 2a — Static endpoints (no database, always pass)
# =========================================================

class TestStaticEndpoints:
    """
    Tests for endpoints that return static / hardcoded responses.
    No database connection is required — these should always pass.
    """

    def test_healthcheck_returns_200(self, client):
        """GET /healthz should return HTTP 200."""
        resp = client.get("/healthz")
        assert resp.status_code == 200

    def test_healthcheck_body_has_ok_true(self, client):
        """GET /healthz should return JSON with ok=true."""
        resp  = client.get("/healthz")
        data  = resp.get_json()
        assert data.get("ok") is True

    def test_onboarding_steps_returns_200(self, client):
        """GET /api/onboarding/steps should return HTTP 200."""
        resp = client.get("/api/onboarding/steps")
        assert resp.status_code == 200

    def test_onboarding_steps_success_flag(self, client):
        """Response from /api/onboarding/steps should include success=true."""
        data = client.get("/api/onboarding/steps").get_json()
        assert data.get("success") is True

    def test_onboarding_steps_returns_seven_steps(self, client):
        """The onboarding tour has exactly 7 steps."""
        data  = client.get("/api/onboarding/steps").get_json()
        steps = data.get("steps", [])
        assert len(steps) == 7

    def test_onboarding_steps_have_required_fields(self, client):
        """Each onboarding step must have id, title, description, target, position."""
        steps = client.get("/api/onboarding/steps").get_json()["steps"]
        for step in steps:
            assert "id"          in step
            assert "title"       in step
            assert "description" in step
            assert "target"      in step
            assert "position"    in step

    def test_onboarding_total_steps_matches_list(self, client):
        """total_steps field must equal the length of the steps list."""
        data = client.get("/api/onboarding/steps").get_json()
        assert data["total_steps"] == len(data["steps"])

    def test_allowed_commands_returns_200(self, client):
        """GET /api/sandbox/allowed-commands should return HTTP 200."""
        resp = client.get("/api/sandbox/allowed-commands")
        assert resp.status_code == 200

    def test_allowed_commands_success_flag(self, client):
        data = client.get("/api/sandbox/allowed-commands").get_json()
        assert data.get("success") is True

    def test_allowed_commands_contains_ping(self, client):
        """'ping' must be in the allowed commands list."""
        data     = client.get("/api/sandbox/allowed-commands").get_json()
        commands = data.get("commands", [])
        assert "ping" in commands

    def test_allowed_commands_contains_expected_set(self, client):
        """All expected networking commands should be in the allowed list."""
        expected = {"ping", "ipconfig", "ifconfig", "traceroute",
                    "nslookup", "whoami", "hostname", "netstat", "arp"}
        data     = client.get("/api/sandbox/allowed-commands").get_json()
        commands = set(data.get("commands", []))
        assert expected.issubset(commands), (
            f"Missing commands: {expected - commands}"
        )


# =========================================================
# Tier 2b — Registration endpoint
# =========================================================

class TestRegistration:
    """
    Tests for POST /register.

    The 'registered_user' fixture (conftest.py) already registers the main
    test user for the session. Here we test validation rules using one-off
    disposable credentials.
    """

    def test_register_success(self, client):
        """A new user with valid data should register successfully."""
        unique_email = f"pytest_reg_{int(time.time())}@test.invalid"
        resp = client.post("/register", data={
            "first_name":       "Test",
            "last_name":        "Register",
            "username":         f"testreg_{int(time.time())}",
            "email":            unique_email,
            "dob":              "1999-06-15",
            "password":         "Secure1234!",
            "confirm_password": "Secure1234!",
            "level":            "novice",
            "reasons":          "learning",
        })
        data = resp.get_json()
        assert resp.status_code == 200
        assert data.get("success") is True
        _cleanup_user(unique_email)

    def test_register_duplicate_email_rejected(self, client, registered_user):
        """Trying to register with an already-used email should return 409."""
        resp = client.post("/register", data={
            "first_name":       "Duplicate",
            "last_name":        "User",
            "username":         f"dup_{int(time.time())}",
            "email":            registered_user["email"],  # already exists
            "dob":              "2000-01-01",
            "password":         "Secure1234!",
            "confirm_password": "Secure1234!",
            "level":            "novice",
            "reasons":          "testing",
        })
        data = resp.get_json()
        assert resp.status_code == 409
        assert data.get("success") is False

    def test_register_missing_required_fields_returns_400(self, client):
        """A registration with missing required fields should return 400."""
        resp = client.post("/register", data={
            "first_name": "Only",
            # missing: last_name, username, email, dob, password
        })
        assert resp.status_code == 400

    def test_register_invalid_email_format_rejected(self, client):
        """An email without '@' and a domain should be rejected."""
        resp = client.post("/register", data={
            "first_name":       "Bad",
            "last_name":        "Email",
            "username":         f"bademail_{int(time.time())}",
            "email":            "not-an-email",
            "dob":              "2000-01-01",
            "password":         "Secure1234!",
            "confirm_password": "Secure1234!",
            "level":            "novice",
            "reasons":          "testing",
        })
        data = resp.get_json()
        assert resp.status_code == 400
        assert data.get("success") is False

    def test_register_short_password_rejected(self, client):
        """A password under 8 characters should be rejected."""
        resp = client.post("/register", data={
            "first_name":       "Short",
            "last_name":        "Pass",
            "username":         f"shortpass_{int(time.time())}",
            "email":            f"shortpass_{int(time.time())}@test.invalid",
            "dob":              "2000-01-01",
            "password":         "abc",       # only 3 chars
            "confirm_password": "abc",
            "level":            "novice",
            "reasons":          "testing",
        })
        data = resp.get_json()
        assert resp.status_code == 400
        assert data.get("success") is False

    def test_register_password_mismatch_rejected(self, client):
        """Mismatched password and confirm_password should be rejected."""
        resp = client.post("/register", data={
            "first_name":       "Mismatch",
            "last_name":        "Test",
            "username":         f"mismatch_{int(time.time())}",
            "email":            f"mismatch_{int(time.time())}@test.invalid",
            "dob":              "2000-01-01",
            "password":         "Secure1234!",
            "confirm_password": "DifferentPass!",
            "level":            "novice",
            "reasons":          "testing",
        })
        data = resp.get_json()
        assert resp.status_code == 400
        assert data.get("success") is False


# =========================================================
# Tier 2c — Login endpoint
# =========================================================

class TestLogin:
    """
    Tests for POST /login.
    Uses the session-scoped 'registered_user' fixture from conftest.py.
    """

    def test_login_returns_200(self, client, registered_user):
        """Valid credentials should return HTTP 200."""
        resp = client.post("/login", data={
            "email":    registered_user["email"],
            "password": registered_user["password"],
        })
        assert resp.status_code == 200

    def test_login_success_flag(self, client, registered_user):
        """Successful login response must include success=true."""
        resp = client.post("/login", data={
            "email":    registered_user["email"],
            "password": registered_user["password"],
        })
        data = resp.get_json()
        assert data.get("success") is True

    def test_login_response_contains_user_fields(self, client, registered_user):
        """Login response must include all expected user profile fields."""
        resp = client.post("/login", data={
            "email":    registered_user["email"],
            "password": registered_user["password"],
        })
        data = resp.get_json()
        required_fields = [
            "first_name", "last_name", "username",
            "xp", "numeric_level", "rank",
            "xp_into_level", "next_level_xp",
            "level", "start_level",
            "is_first_login", "onboarding_completed",
            "email",
        ]
        for field in required_fields:
            assert field in data, f"Missing field in login response: '{field}'"

    def test_login_new_user_starts_at_level_1(self, client, registered_user):
        """A brand-new user should start at level 1 with 0 XP."""
        data = client.post("/login", data={
            "email":    registered_user["email"],
            "password": registered_user["password"],
        }).get_json()
        assert data["xp"] == 0
        assert data["numeric_level"] == 1

    def test_login_new_user_rank_is_novice(self, client, registered_user):
        """A level-1 user should have rank 'Novice'."""
        data = client.post("/login", data={
            "email":    registered_user["email"],
            "password": registered_user["password"],
        }).get_json()
        assert data["rank"] == "Novice"

    def test_login_wrong_password_returns_401(self, client, registered_user):
        """An incorrect password should be rejected with 401."""
        resp = client.post("/login", data={
            "email":    registered_user["email"],
            "password": "WrongPassword999!",
        })
        data = resp.get_json()
        assert resp.status_code == 401
        assert data.get("success") is False

    def test_login_unknown_email_returns_401(self, client):
        """An email that doesn't exist in the DB should return 401."""
        resp = client.post("/login", data={
            "email":    "ghost_user_who_does_not_exist@test.invalid",
            "password": "Irrelevant123!",
        })
        data = resp.get_json()
        assert resp.status_code == 401
        assert data.get("success") is False


# =========================================================
# Tier 2d — User Info endpoint
# =========================================================

class TestUserInfo:
    """
    Tests for GET /user-info?email=<email>
    """

    def test_user_info_returns_200(self, client, registered_user):
        """A valid email should return HTTP 200."""
        resp = client.get(f"/user-info?email={registered_user['email']}")
        assert resp.status_code == 200

    def test_user_info_success_flag(self, client, registered_user):
        data = client.get(f"/user-info?email={registered_user['email']}").get_json()
        assert data.get("success") is True

    def test_user_info_contains_required_fields(self, client, registered_user):
        """User-info response must include profile and XP fields."""
        data = client.get(f"/user-info?email={registered_user['email']}").get_json()
        required = [
            "first_name", "username", "xp",
            "numeric_level", "rank", "xp_into_level", "next_level_xp",
        ]
        for field in required:
            assert field in data, f"Missing field in user-info response: '{field}'"

    def test_user_info_name_matches_registration(self, client, registered_user):
        """First name in /user-info should match what was registered."""
        data = client.get(f"/user-info?email={registered_user['email']}").get_json()
        assert data["first_name"] == registered_user["first_name"]


# =========================================================
# Tier 2e — Onboarding status endpoint
# =========================================================

class TestOnboardingAPI:
    """
    Tests for POST /api/onboarding/status (requires a real registered user).
    """

    def test_onboarding_status_returns_200(self, client, registered_user):
        """A registered user's onboarding status should return HTTP 200."""
        resp = client.post("/api/onboarding/status",
                           json={"user_email": registered_user["email"]})
        assert resp.status_code == 200

    def test_onboarding_status_success_flag(self, client, registered_user):
        data = client.post("/api/onboarding/status",
                           json={"user_email": registered_user["email"]}).get_json()
        assert data.get("success") is True

    def test_onboarding_status_has_required_fields(self, client, registered_user):
        """Onboarding status response must include is_first_login, onboarding_completed, total_steps."""
        data = client.post("/api/onboarding/status",
                           json={"user_email": registered_user["email"]}).get_json()
        assert "is_first_login"       in data
        assert "onboarding_completed" in data
        assert "total_steps"          in data

    def test_onboarding_status_new_user_not_completed(self, client, registered_user):
        """A brand-new user should not have completed onboarding yet."""
        data = client.post("/api/onboarding/status",
                           json={"user_email": registered_user["email"]}).get_json()
        assert data["onboarding_completed"] is False

    def test_onboarding_status_missing_email_returns_400(self, client):
        """Calling /api/onboarding/status without user_email should return 400."""
        resp = client.post("/api/onboarding/status", json={})
        assert resp.status_code == 400

    def test_onboarding_status_unknown_user_returns_404(self, client):
        """An email that doesn't exist in the DB should return 404."""
        resp = client.post("/api/onboarding/status",
                           json={"user_email": "nobody@test.invalid"})
        assert resp.status_code == 404
