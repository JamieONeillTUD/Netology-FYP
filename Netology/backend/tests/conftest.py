"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

conftest.py - Shared Test Setup
---
This file is the shared setup for backend tests.

It does three things:
  1. Clears test users before each test so the database stays clean.
  2. Gives tests a live database connection for checks and assertions.
  3. Patches the route modules so the Flask client uses the real DB helper.

It keeps the integration tests simple and close to the real system.
"""

from datetime import date, timedelta
from pathlib import Path
import sys
from unittest.mock import patch

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import app as flask_app  #
from db import get_db_connection  


# Test users all use the same email pattern so they are easy to delete.
TEST_USER_EMAIL_FILTER = "%@test.com"
TEST_USER_PASSWORD = "TestPass123!"

# These modules are patched so the routes use the real database connection.
DB_MODULES = (
    "auth_routes.get_db_connection",
    "course_routes.get_db_connection",
    "user_routes.get_db_connection",
    "onboarding_routes.get_db_connection",
    "topology_routes.get_db_connection",
    "xp_system.get_db_connection",
    "achievement_engine.get_db_connection",
)


@pytest.fixture
def clean_db():
    # Remove test users before each integration test.
    conn = get_db_connection()
    conn.autocommit = True
    conn.execute("DELETE FROM users WHERE email LIKE %s", (TEST_USER_EMAIL_FILTER,))
    conn.close()
    yield


@pytest.fixture
def db(clean_db):
    # Open a real database connection for assertions in tests.
    conn = get_db_connection()
    conn.autocommit = True
    yield conn
    conn.close()


@pytest.fixture
def make_user(clean_db):
    from flask_bcrypt import Bcrypt

    # Reuse one password hash for every test user we create.
    pw_hash = Bcrypt().generate_password_hash(TEST_USER_PASSWORD).decode()

    def create_user(
        email="user@test.com",
        xp=0,
        numeric_level=1,
        level="Novice",
        logins=0,
        onboarding_completed=False,
    ):
        # Keep the username simple and predictable for test data.
        username = email.replace("@", "_at_").replace(".", "_")
        conn = get_db_connection()
        conn.autocommit = True
        conn.execute(
            "INSERT INTO users "
            "(first_name, last_name, username, email, password_hash, xp, numeric_level, level, onboarding_completed) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            ("Test", "User", username, email, pw_hash, xp, numeric_level, level, onboarding_completed)
        )
        for day_offset in range(logins):
            # Add one login row per day when a test needs streak data.
            conn.execute(
                "INSERT INTO user_logins (user_email, login_date) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (email, date.today() - timedelta(days=day_offset))
            )
        conn.close()
        return email
    return create_user


@pytest.fixture
def integration_client(clean_db):
    # Patch each route module so every query goes through the real DB helper.
    patches = [patch(module_name, side_effect=get_db_connection) for module_name in DB_MODULES]
    for patcher in patches:
        patcher.start()
    flask_app.config['TESTING'] = True
    try:
        with flask_app.test_client() as client:
            yield client
    finally:
        for patcher in patches:
            patcher.stop()
