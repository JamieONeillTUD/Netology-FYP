"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

test_onboarding.py - Onboarding Tests
---
This file checks the onboarding tour routes.

It covers:
  1. Starting the tour.
  2. Completing the tour.
  3. Skipping the tour.
  4. Recording one onboarding step.

The tests stay small so the onboarding flow is easy to follow.
"""

import json

import pytest


# POST /api/onboarding/start

def test_start_onboarding_ok(integration_client, make_user):
    make_user("onboard_api@test.com")
    resp = integration_client.post("/api/onboarding/start", json={"user_email": "onboard_api@test.com"})
    assert resp.status_code == 200


def test_start_onboarding_missing_email(integration_client):
    resp = integration_client.post("/api/onboarding/start", json={})
    assert resp.status_code == 400


def test_start_onboarding_empty_email(integration_client):
    resp = integration_client.post("/api/onboarding/start", json={"user_email": ""})
    assert resp.status_code == 400


# POST /api/onboarding/complete

def test_complete_onboarding_ok(integration_client, make_user):
    make_user("onboard_complete_api@test.com")
    resp = integration_client.post("/api/onboarding/complete", json={"user_email": "onboard_complete_api@test.com"})
    assert resp.status_code == 200


def test_complete_onboarding_missing_email(integration_client):
    resp = integration_client.post("/api/onboarding/complete", json={})
    assert resp.status_code == 400


def test_complete_onboarding_empty_email(integration_client):
    resp = integration_client.post("/api/onboarding/complete", json={"user_email": ""})
    assert resp.status_code == 400


# POST /api/onboarding/skip

def test_skip_onboarding_ok(integration_client, make_user):
    make_user("skip_api@test.com")
    resp = integration_client.post("/api/onboarding/skip", json={"user_email": "skip_api@test.com"})
    assert resp.status_code == 200


def test_skip_onboarding_missing_email(integration_client):
    resp = integration_client.post("/api/onboarding/skip", json={})
    assert resp.status_code == 400


# GET /api/onboarding/steps

def test_onboarding_steps_returns_list(integration_client):
    resp = integration_client.get("/api/onboarding/steps")
    body = json.loads(resp.data)
    assert body["success"] is True
    assert "steps" in body


# POST /api/onboarding/step/<stage_id>

def test_complete_onboarding_step_ok(integration_client, make_user):
    make_user("step_api@test.com")
    resp = integration_client.post("/api/onboarding/step/welcome", json={"user_email": "step_api@test.com"})
    assert resp.status_code == 200


def test_complete_onboarding_step_missing_email(integration_client):
    resp = integration_client.post("/api/onboarding/step/welcome", json={})
    assert resp.status_code == 400


@pytest.mark.integration
def test_start_onboarding_creates_progress_row(integration_client, make_user, db):
    make_user("onboard@test.com")
    integration_client.post("/api/onboarding/start", json={"user_email": "onboard@test.com"})
    row = db.execute(
        "SELECT tour_started_at FROM user_tour_progress WHERE user_email = 'onboard@test.com'"
    ).fetchone()
    assert row is not None


@pytest.mark.integration
def test_complete_onboarding_sets_completed_flag(integration_client, make_user, db):
    make_user("onboard2@test.com")
    integration_client.post("/api/onboarding/complete", json={"user_email": "onboard2@test.com"})
    row = db.execute(
        "SELECT onboarding_completed FROM users WHERE email = 'onboard2@test.com'"
    ).fetchone()
    assert row[0] is True


@pytest.mark.integration
def test_start_onboarding_only_creates_one_row(integration_client, make_user, db):
    make_user("onboard3@test.com")
    integration_client.post("/api/onboarding/start", json={"user_email": "onboard3@test.com"})
    integration_client.post("/api/onboarding/start", json={"user_email": "onboard3@test.com"})
    count = db.execute(
        "SELECT COUNT(*) FROM user_tour_progress WHERE user_email = 'onboard3@test.com'"
    ).fetchone()[0]
    assert count == 1
