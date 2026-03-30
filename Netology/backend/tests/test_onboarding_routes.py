# test_onboarding_routes.py
# Tests for onboarding_routes.py — onboarding tour API endpoints.
#
# Functional Requirement: F01 — User Registration and Login (onboarding flow)
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
# START ONBOARDING — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_start_onboarding_missing_email_returns_400(client):
    resp = client.post('/api/onboarding/start', json={})
    assert resp.status_code == 400

def test_start_onboarding_empty_email_returns_400(client):
    resp = client.post('/api/onboarding/start', json={'user_email': ''})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# START ONBOARDING — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_start_onboarding_success_returns_200(client):
    conn, cur = mock_db()
    with patch('onboarding_routes.get_db_connection', return_value=conn):
        resp = client.post('/api/onboarding/start', json={'user_email': 'test@test.com'})
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True


# ─────────────────────────────────────────────────────────────
# COMPLETE ONBOARDING — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_complete_onboarding_missing_email_returns_400(client):
    resp = client.post('/api/onboarding/complete', json={})
    assert resp.status_code == 400

def test_complete_onboarding_empty_email_returns_400(client):
    resp = client.post('/api/onboarding/complete', json={'user_email': ''})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# COMPLETE ONBOARDING — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_complete_onboarding_success_returns_200(client):
    conn, cur = mock_db()
    # complete_onboarding calls evaluate_achievements_for_event which needs DB too
    with patch('onboarding_routes.get_db_connection', return_value=conn):
        with patch('onboarding_routes.evaluate_achievements_for_event', return_value=[]):
            resp = client.post('/api/onboarding/complete', json={'user_email': 'test@test.com'})
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True
