# test_challenges.py
# Tests for the daily/weekly challenge and streak system (user_routes.py)
#
# Functional Requirement: FR10 — Daily and Weekly Challenges
#                         FR11 — User Activity Tracking
#                         FR12 — Login Streak Tracking
#
# ── Test Types ────────────────────────────────────────────────
#   UNIT TESTS — test the challenge calculation helper functions
#   API TESTS  — HTTP endpoint tests, real database

import pytest
import json
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from user_routes import _challenge_target, _challenge_progress_value


# ─────────────────────────────────────────────────────────────
# UNIT TESTS — _challenge_target()
# Calculates how many actions a user must complete to finish a challenge
# ─────────────────────────────────────────────────────────────

# Happy path

def test_challenge_target_daily_complete_lessons_is_two():
    result = _challenge_target('complete_lessons', 'daily', 'Study Session', '', None)
    assert result == 2

def test_challenge_target_weekly_complete_lessons_is_five():
    result = _challenge_target('complete_lessons', 'weekly', 'Knowledge Sprint', '', None)
    assert result == 5

def test_challenge_target_daily_login_is_seven():
    result = _challenge_target('daily_login', 'weekly', 'Consistency Wins', '', None)
    assert result == 7

def test_challenge_target_sandbox_topologies_is_three():
    result = _challenge_target('sandbox_topologies', 'weekly', 'Network Architect', '', None)
    assert result == 3

def test_challenge_target_complete_courses_is_three():
    result = _challenge_target('complete_courses', 'event', 'All Star', '', None)
    assert result == 3

def test_challenge_target_quiz_score_is_one():
    result = _challenge_target('quiz_score', 'weekly', 'Quiz Master', '', None)
    assert result == 1

# Boundary — explicit action_target overrides the default

def test_challenge_target_explicit_numeric_target_is_used_directly():
    result = _challenge_target('complete_lessons', 'daily', 'Custom', '', '10')
    assert result == 10

# Edge case

def test_challenge_target_unknown_action_defaults_to_one():
    result = _challenge_target('some_unknown_action', 'daily', 'Unknown', '', None)
    assert result == 1


# ─────────────────────────────────────────────────────────────
# UNIT TESTS — _challenge_progress_value()
# Returns the user's current progress for a given action type
# by looking up the correct key in a metrics dictionary
# ─────────────────────────────────────────────────────────────

SAMPLE_METRICS = {
    'lessons_done':        5,
    'quizzes_done':        3,
    'streak_days':         4,
    'courses_started':     2,
    'courses_done':        1,
    'topologies_saved':    2,
    'lesson_sessions':     1,
}

# Happy path

def test_progress_value_maps_complete_lesson_to_lessons_done():
    result = _challenge_progress_value('complete_lesson', SAMPLE_METRICS)
    assert result == 5

def test_progress_value_maps_pass_quiz_to_quizzes_done():
    result = _challenge_progress_value('pass_quiz', SAMPLE_METRICS)
    assert result == 3

def test_progress_value_maps_daily_login_to_streak_days():
    result = _challenge_progress_value('daily_login', SAMPLE_METRICS)
    assert result == 4

def test_progress_value_maps_start_course_to_courses_started():
    result = _challenge_progress_value('start_course', SAMPLE_METRICS)
    assert result == 2

def test_progress_value_maps_sandbox_practice_to_topologies_plus_sessions():
    # sandbox_practice adds topologies_saved + lesson_sessions
    result = _challenge_progress_value('sandbox_practice', SAMPLE_METRICS)
    assert result == 3  # 2 + 1

# Edge and invalid input

def test_progress_value_unknown_action_returns_zero():
    result = _challenge_progress_value('unknown_action', SAMPLE_METRICS)
    assert result == 0

def test_progress_value_empty_metrics_returns_zero():
    result = _challenge_progress_value('complete_lesson', {})
    assert result == 0

def test_progress_value_none_action_returns_zero():
    result = _challenge_progress_value(None, SAMPLE_METRICS)
    assert result == 0


# ─────────────────────────────────────────────────────────────
# API TESTS — GET /api/user/challenges   (real database)
# ─────────────────────────────────────────────────────────────

# Happy path

def test_get_challenges_returns_a_challenges_key(integration_client, make_user):
    make_user('chal_api@test.com')
    resp = integration_client.get('/api/user/challenges?user_email=chal_api@test.com')
    body = json.loads(resp.data)
    assert 'challenges' in body

# Invalid input — the route returns challenges with empty metrics when user_email is missing

def test_get_challenges_missing_user_email_returns_empty_list(integration_client):
    resp = integration_client.get('/api/user/challenges')
    body = json.loads(resp.data)
    assert 'challenges' in body


# ─────────────────────────────────────────────────────────────
# API TESTS — GET /api/user/streaks   (real database)
# ─────────────────────────────────────────────────────────────

# Happy path

def test_get_streaks_returns_streak_data(integration_client, make_user):
    make_user('streak_api@test.com')
    resp = integration_client.get('/api/user/streaks?user_email=streak_api@test.com')
    assert resp.status_code == 200

# Boundary case

def test_get_streaks_missing_user_email_returns_400(integration_client):
    resp = integration_client.get('/api/user/streaks')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# API TESTS — GET /api/user/activity   (real database)
# ─────────────────────────────────────────────────────────────

# Happy path

def test_get_activity_returns_activity_key(integration_client, make_user):
    make_user('activity_api@test.com')
    resp = integration_client.get('/api/user/activity?user_email=activity_api@test.com')
    body = json.loads(resp.data)
    assert 'activity' in body

# Boundary case

def test_get_activity_missing_user_email_returns_400(integration_client):
    resp = integration_client.get('/api/user/activity')
    assert resp.status_code == 400
