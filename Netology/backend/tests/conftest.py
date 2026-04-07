# conftest.py
# Shared fixtures used by all test files.
#
# All tests connect to the real PostgreSQL database via DATABASE_URL in .env.
# Test users (email ending @test.com) are deleted before each test so real data is never affected.

import pytest
import os
import sys
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app import app as flask_app  # this triggers load_dotenv() so DATABASE_URL is set
from db import get_db_connection


# ─────────────────────────────────────────────────────────────
# REAL DATABASE — connects to the live PostgreSQL database from .env
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def clean_db():
    # Delete all test user rows before each integration test.
    conn = get_db_connection()
    conn.autocommit = True
    conn.execute("DELETE FROM users WHERE email LIKE '%@test.com'")
    conn.close()
    yield


@pytest.fixture
def db(clean_db):
    # A live database connection for checking what a test actually saved.
    conn = get_db_connection()
    conn.autocommit = True
    yield conn
    conn.close()


@pytest.fixture
def make_user(clean_db):
    # Insert a test user directly into the database — faster than calling /register.
    # Usage:  make_user('alice@test.com')
    #         make_user('alice@test.com', xp=200, logins=3)
    from flask_bcrypt import Bcrypt
    from datetime import date, timedelta
    pw_hash = Bcrypt().generate_password_hash('TestPass123!').decode()

    def create(email='user@test.com', xp=0, numeric_level=1, level='Novice',
               logins=0, onboarding_completed=False):
        username = email.replace('@', '_at_').replace('.', '_')
        conn = get_db_connection()
        conn.autocommit = True
        conn.execute(
            'INSERT INTO users '
            '(first_name, last_name, username, email, password_hash, xp, numeric_level, level, onboarding_completed) '
            'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)',
            ('Test', 'User', username, email, pw_hash, xp, numeric_level, level, onboarding_completed)
        )
        for i in range(logins):
            conn.execute(
                'INSERT INTO user_logins (user_email, login_date) VALUES (%s, %s) ON CONFLICT DO NOTHING',
                (email, date.today() - timedelta(days=i))
            )
        conn.close()
        return email
    return create


# Every module that calls get_db_connection() must use the real DB during integration tests.
_DB_MODULES = [
    'auth_routes.get_db_connection',
    'course_routes.get_db_connection',
    'user_routes.get_db_connection',
    'onboarding_routes.get_db_connection',
    'topology_routes.get_db_connection',
    'xp_system.get_db_connection',
    'achievement_engine.get_db_connection',
]


@pytest.fixture
def integration_client(clean_db):
    # Flask test client that uses the real database instead of mocks.
    # Routes open real connections, run real SQL, commit real data — nothing is faked.
    patches = [patch(m, side_effect=get_db_connection) for m in _DB_MODULES]
    for p in patches:
        p.start()
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as c:
        yield c
    for p in patches:
        p.stop()
