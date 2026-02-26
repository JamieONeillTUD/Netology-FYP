"""
conftest.py – Pytest configuration and shared fixtures for Netology backend tests.

Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4

This file is loaded automatically by pytest before any tests run.

Key responsibilities:
  1. Load the .env file BEFORE db.py is imported so DATABASE_URL is available
     at module load time (db.py reads it at module level, not inside a function).
  2. Provide session-scoped Flask app and test client fixtures.
  3. Provide a session-scoped 'registered_user' fixture that creates a real test
     user in the database and cleans it up when all tests are done.
"""

import os
import sys
import time

# ------------------------------------------------------------------
# CRITICAL: Load .env before any app import so that db.py sees
# DATABASE_URL at module-load time (db.py reads os.getenv at the
# module level, not inside get_db_connection).
# ------------------------------------------------------------------
from dotenv import load_dotenv

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# Also make sure backend/ is on sys.path (belt-and-suspenders alongside pytest.ini)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Now it is safe to import the app (which pulls in db.py)
import pytest
from app import app as flask_application


# =========================================================
# Flask test app + client
# =========================================================

@pytest.fixture(scope="session")
def app():
    """
    Configure the Flask app for testing.
    session scope = created once for the entire test run.
    """
    flask_application.config.update({
        "TESTING": True,
        "WTF_CSRF_ENABLED": False,   # no CSRF tokens needed in tests
    })
    yield flask_application


@pytest.fixture(scope="session")
def client(app):
    """Flask test client — reused across all tests."""
    return app.test_client()


# =========================================================
# Test user credentials
# =========================================================

@pytest.fixture(scope="session")
def test_credentials():
    """
    Unique credentials for the session's test user.
    Using a timestamp suffix ensures we don't collide with existing users
    even if a previous test run left records behind.
    """
    ts = int(time.time())
    return {
        "first_name": "Pytest",
        "last_name": "Tester",
        "username": f"pytest_{ts}",
        "email": f"pytest_{ts}@test.invalid",
        "dob": "2000-01-01",
        "password": "Test1234!Secure",
        "level": "novice",
        "reasons": "automated testing",
    }


@pytest.fixture(scope="session")
def registered_user(client, test_credentials):
    """
    Register a test user via the real /register endpoint at the start of the
    session, yield the credentials dict for tests to use, then DELETE the user
    from the database when all tests are done.

    Because all child tables (user_courses, user_lessons, xp_log, etc.) have
    ON DELETE CASCADE on users.email, a single DELETE from users is sufficient.
    """
    creds = test_credentials

    resp = client.post("/register", data={
        "first_name": creds["first_name"],
        "last_name":  creds["last_name"],
        "username":   creds["username"],
        "email":      creds["email"],
        "dob":        creds["dob"],
        "password":         creds["password"],
        "confirm_password": creds["password"],
        "level":      creds["level"],
        "reasons":    creds["reasons"],
    })

    data = resp.get_json()
    assert resp.status_code == 200, (
        f"Test setup failed — could not register test user: {data}"
    )
    assert data.get("success") is True, (
        f"Test setup failed — register returned success=False: {data}"
    )

    yield creds  # <-- all Tier 2 + Tier 3 tests receive this dict

    # ---- TEARDOWN: remove test user and all cascade-related data ----
    try:
        from db import get_db_connection
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("DELETE FROM users WHERE email = %s", (creds["email"],))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as exc:
        # Non-fatal — a stale test user in DB is annoying but not catastrophic
        print(f"\n[conftest] WARNING: test user cleanup failed: {exc}")
