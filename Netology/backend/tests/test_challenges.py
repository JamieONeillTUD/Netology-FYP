"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

test_challenges.py - Challenge and Activity Tests
---
This file checks the challenge helpers and the user progress routes.

It covers:
  1. Challenge target values.
  2. Challenge progress values from user stats.
  3. The challenge, streak, and activity API routes.

"""

import json

from user_routes import _challenge_progress_value, _challenge_target


# _challenge_target()

def test_daily_lessons_target():
    assert _challenge_target("complete_lessons", "daily", None) == 2


def test_weekly_lessons_target():
    assert _challenge_target("complete_lessons", "weekly", None) == 5


def test_login_target():
    assert _challenge_target("daily_login", "weekly", None) == 7


def test_topology_target():
    assert _challenge_target("sandbox_topologies", "weekly", None) == 3


def test_course_target():
    assert _challenge_target("complete_courses", "event", None) == 3


def test_quiz_target():
    assert _challenge_target("quiz_score", "weekly", None) == 1


def test_explicit_target_wins():
    assert _challenge_target("complete_lessons", "daily", "10") == 10


def test_unknown_target_defaults_to_one():
    assert _challenge_target("some_unknown_action", "daily", None) == 1

# _challenge_progress_value()

SAMPLE_METRICS = {
    "lessons_done": 5,
    "quizzes_done": 3,
    "streak_days": 4,
    "courses_started": 2,
    "courses_done": 1,
    "topologies_saved": 2,
    "lesson_sessions": 1,
}


def test_progress_for_complete_lesson():
    assert _challenge_progress_value("complete_lesson", SAMPLE_METRICS) == 5


def test_progress_for_quiz():
    assert _challenge_progress_value("pass_quiz", SAMPLE_METRICS) == 3


def test_progress_for_login():
    assert _challenge_progress_value("daily_login", SAMPLE_METRICS) == 4


def test_progress_for_course_start():
    assert _challenge_progress_value("start_course", SAMPLE_METRICS) == 2


def test_progress_for_sandbox_practice():
    assert _challenge_progress_value("sandbox_practice", SAMPLE_METRICS) == 3


def test_progress_unknown_action():
    assert _challenge_progress_value("unknown_action", SAMPLE_METRICS) == 0


def test_progress_empty_metrics():
    assert _challenge_progress_value("complete_lesson", {}) == 0


def test_progress_none_action():
    assert _challenge_progress_value(None, SAMPLE_METRICS) == 0


# GET /api/user/challenges

def test_challenges_returns_list(integration_client, make_user):
    make_user("chal_api@test.com")
    resp = integration_client.get("/api/user/challenges?user_email=chal_api@test.com")
    body = json.loads(resp.data)
    assert "challenges" in body


def test_challenges_missing_email_still_returns_key(integration_client):
    resp = integration_client.get("/api/user/challenges")
    body = json.loads(resp.data)
    assert "challenges" in body


# GET /api/user/streaks

def test_streaks_returns_data(integration_client, make_user):
    make_user("streak_api@test.com")
    resp = integration_client.get("/api/user/streaks?user_email=streak_api@test.com")
    assert resp.status_code == 200


def test_streaks_missing_email(integration_client):
    resp = integration_client.get("/api/user/streaks")
    assert resp.status_code == 400

# GET /api/user/activity

def test_activity_returns_data(integration_client, make_user):
    make_user("activity_api@test.com")
    resp = integration_client.get("/api/user/activity?user_email=activity_api@test.com")
    body = json.loads(resp.data)
    assert "activity" in body


def test_activity_missing_email(integration_client):
    resp = integration_client.get("/api/user/activity")
    assert resp.status_code == 400
