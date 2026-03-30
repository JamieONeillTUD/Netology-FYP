# test_user_routes.py
# Tests for user_routes.py — challenges, activity heatmap, and progress endpoints.
#
# Functional Requirements: F07 — Interactive Challenges, F09 — Progress Tracking
#
# Validation tests send bad data and expect a 400 back.
# These return before the database is touched so no mock is needed.
#
# DB tests mock get_db_connection so no real database is required.

import pytest
from unittest.mock import MagicMock, patch


def mock_db():
    conn = MagicMock()
    cur  = MagicMock()
    conn.cursor.return_value = cur
    return conn, cur


# ─────────────────────────────────────────────────────────────
# GET /api/user/challenges — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_get_challenges_daily_returns_200(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = (5,)  # challenges table not empty — skip seed
    cur.fetchall.return_value = []    # no challenges returned
    with patch('user_routes.get_db_connection', return_value=conn):
        resp = client.get('/api/user/challenges?type=daily')
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True

def test_get_challenges_weekly_returns_200(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = (5,)
    cur.fetchall.return_value = []
    with patch('user_routes.get_db_connection', return_value=conn):
        resp = client.get('/api/user/challenges?type=weekly')
    assert resp.status_code == 200

def test_get_challenges_returns_challenges_key(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = (5,)
    cur.fetchall.return_value = []
    with patch('user_routes.get_db_connection', return_value=conn):
        resp = client.get('/api/user/challenges?type=daily')
    assert 'challenges' in resp.get_json()


# ─────────────────────────────────────────────────────────────
# GET /api/user/activity — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_get_activity_missing_email_returns_400(client):
    resp = client.get('/api/user/activity')
    assert resp.status_code == 400

def test_get_activity_empty_email_returns_400(client):
    resp = client.get('/api/user/activity?user_email=')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# GET /api/user/activity — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_get_activity_success_returns_200(client):
    conn, cur = mock_db()
    cur.fetchall.return_value = []
    with patch('user_routes.get_db_connection', return_value=conn):
        resp = client.get('/api/user/activity?user_email=test@test.com')
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True

def test_get_activity_returns_activity_key(client):
    conn, cur = mock_db()
    cur.fetchall.return_value = []
    with patch('user_routes.get_db_connection', return_value=conn):
        resp = client.get('/api/user/activity?user_email=test@test.com')
    assert 'activity' in resp.get_json()


# ─────────────────────────────────────────────────────────────
# GET /api/user/challenges — with challenge data (covers seed path)
# ─────────────────────────────────────────────────────────────

def test_get_challenges_seeds_table_when_empty(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = (0,)  # count = 0 → seed is triggered
    cur.fetchall.return_value = []    # no challenges after seed
    with patch('user_routes.get_db_connection', return_value=conn):
        resp = client.get('/api/user/challenges?type=daily')
    assert resp.status_code == 200

def test_get_challenges_with_challenge_row_returns_it(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = (5,)  # table not empty — skip seed
    # (id, title, description, xp_reward, required_action, action_target)
    cur.fetchall.return_value = [(1, "Pass a Quiz", "Score 80%+", 30, "pass_quiz", None)]
    with patch('user_routes.get_db_connection', return_value=conn):
        resp = client.get('/api/user/challenges?type=daily&user_email=test@test.com')
    data = resp.get_json()
    assert data['success'] is True
    assert len(data['challenges']) == 1
    assert data['challenges'][0]['title'] == "Pass a Quiz"


# ─────────────────────────────────────────────────────────────
# GET /api/user/achievements — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_get_achievements_missing_email_returns_400(client):
    resp = client.get('/api/user/achievements')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# GET /api/user/achievements — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_get_achievements_success_returns_200(client):
    conn, cur = mock_db()
    cur.fetchall.return_value = []  # empty catalog and earned list
    with patch('user_routes.get_db_connection', return_value=conn):
        resp = client.get('/api/user/achievements?user_email=test@test.com')
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True

def test_get_achievements_returns_unlocked_and_locked_keys(client):
    conn, cur = mock_db()
    cur.fetchall.return_value = []
    with patch('user_routes.get_db_connection', return_value=conn):
        resp = client.get('/api/user/achievements?user_email=test@test.com')
    data = resp.get_json()
    assert 'unlocked' in data
    assert 'locked' in data

def test_get_achievements_with_catalog_entry_goes_to_locked(client):
    conn, cur = mock_db()
    # catalog has one achievement; user has not earned it
    cur.fetchall.side_effect = [
        [(1, "First Login", "Log in for the first time", "bi-star", 10, "common")],
        [],  # user has earned nothing
    ]
    with patch('user_routes.get_db_connection', return_value=conn):
        resp = client.get('/api/user/achievements?user_email=test@test.com')
    data = resp.get_json()
    assert len(data['locked']) == 1
    assert data['locked'][0]['name'] == "First Login"


# ─────────────────────────────────────────────────────────────
# GET /api/user/streaks — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_get_streaks_missing_email_returns_400(client):
    resp = client.get('/api/user/streaks')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# GET /api/user/streaks — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_get_streaks_success_returns_200(client):
    conn, cur = mock_db()
    cur.fetchall.return_value = []  # no login dates
    with patch('user_routes.get_db_connection', return_value=conn):
        resp = client.get('/api/user/streaks?user_email=test@test.com')
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True
