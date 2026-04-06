# test_onboarding.py
# Tests for the onboarding tour system (onboarding_routes.py)
#
# Functional Requirement: FR13 — User Onboarding Tour
#
# ── Test Types ────────────────────────────────────────────────
#   API TESTS         — HTTP endpoint tests, real database
#   INTEGRATION TESTS — real PostgreSQL, verifies DB writes

import pytest
import json
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


# ─────────────────────────────────────────────────────────────
# API TESTS — POST /api/onboarding/start   (real database)
# ─────────────────────────────────────────────────────────────

# Happy path

def test_start_onboarding_valid_email_returns_200(integration_client, make_user):
    make_user('onboard_api@test.com')
    resp = integration_client.post('/api/onboarding/start', json={'user_email': 'onboard_api@test.com'})
    assert resp.status_code == 200

# Boundary case

def test_start_onboarding_missing_email_returns_400(integration_client):
    resp = integration_client.post('/api/onboarding/start', json={})
    assert resp.status_code == 400

# Invalid input

def test_start_onboarding_empty_email_returns_400(integration_client):
    resp = integration_client.post('/api/onboarding/start', json={'user_email': ''})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# API TESTS — POST /api/onboarding/complete   (real database)
# ─────────────────────────────────────────────────────────────

# Happy path

def test_complete_onboarding_valid_email_returns_200(integration_client, make_user):
    make_user('onboard_complete_api@test.com')
    resp = integration_client.post('/api/onboarding/complete', json={'user_email': 'onboard_complete_api@test.com'})
    assert resp.status_code == 200

# Boundary case

def test_complete_onboarding_missing_email_returns_400(integration_client):
    resp = integration_client.post('/api/onboarding/complete', json={})
    assert resp.status_code == 400

# Invalid input

def test_complete_onboarding_empty_email_returns_400(integration_client):
    resp = integration_client.post('/api/onboarding/complete', json={'user_email': ''})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# API TESTS — POST /api/onboarding/skip   (real database)
# ─────────────────────────────────────────────────────────────

def test_skip_onboarding_valid_email_returns_200(integration_client, make_user):
    make_user('skip_api@test.com')
    resp = integration_client.post('/api/onboarding/skip', json={'user_email': 'skip_api@test.com'})
    assert resp.status_code == 200

def test_skip_onboarding_missing_email_returns_400(integration_client):
    resp = integration_client.post('/api/onboarding/skip', json={})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# API TESTS — GET /api/onboarding/steps   (no database needed)
# ─────────────────────────────────────────────────────────────

def test_get_onboarding_steps_returns_empty_list(integration_client):
    resp = integration_client.get('/api/onboarding/steps')
    body = json.loads(resp.data)
    assert body['success'] is True
    assert 'steps' in body


# ─────────────────────────────────────────────────────────────
# API TESTS — POST /api/onboarding/step/<stage_id>   (real database)
# ─────────────────────────────────────────────────────────────

def test_complete_onboarding_step_returns_200(integration_client, make_user):
    make_user('step_api@test.com')
    resp = integration_client.post('/api/onboarding/step/welcome', json={'user_email': 'step_api@test.com'})
    assert resp.status_code == 200

def test_complete_onboarding_step_missing_email_returns_400(integration_client):
    resp = integration_client.post('/api/onboarding/step/welcome', json={})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# INTEGRATION TESTS — onboarding routes with a real database
# ─────────────────────────────────────────────────────────────

# Happy path

@pytest.mark.integration
def test_start_onboarding_creates_a_tour_progress_row(integration_client, make_user, db):
    make_user('onboard@test.com')
    integration_client.post('/api/onboarding/start', json={'user_email': 'onboard@test.com'})
    row = db.execute(
        "SELECT tour_started_at FROM user_tour_progress WHERE user_email = 'onboard@test.com'"
    ).fetchone()
    assert row is not None

@pytest.mark.integration
def test_complete_onboarding_sets_flag_to_true_on_users_table(integration_client, make_user, db):
    make_user('onboard2@test.com')
    integration_client.post('/api/onboarding/complete', json={'user_email': 'onboard2@test.com'})
    row = db.execute(
        "SELECT onboarding_completed FROM users WHERE email = 'onboard2@test.com'"
    ).fetchone()
    assert row[0] is True

# Edge case

@pytest.mark.integration
def test_start_onboarding_called_twice_does_not_create_duplicate_rows(integration_client, make_user, db):
    make_user('onboard3@test.com')
    integration_client.post('/api/onboarding/start', json={'user_email': 'onboard3@test.com'})
    integration_client.post('/api/onboarding/start', json={'user_email': 'onboard3@test.com'})
    count = db.execute(
        "SELECT COUNT(*) FROM user_tour_progress WHERE user_email = 'onboard3@test.com'"
    ).fetchone()[0]
    assert count == 1
