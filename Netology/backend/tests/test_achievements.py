# test_achievements.py
# Tests for the achievement and badge system (achievement_engine.py)
#
# Functional Requirement: FR09 — Achievement and Badge System
# Functions under test: parse_rule(), login_streak(), rule_matches(),
#                       evaluate_achievements_for_event()
# Routes under test: GET /api/user/achievements
#
# ── Test Types ────────────────────────────────────────────────
#   UNIT TESTS        — pure function tests, no database needed
#   API TESTS         — HTTP endpoint tests, real database
#   INTEGRATION TESTS — real PostgreSQL, calls functions directly

import pytest
import json
from datetime import date, timedelta
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from achievement_engine import parse_rule, login_streak, rule_matches, evaluate_achievements_for_event


# ─────────────────────────────────────────────────────────────
# UNIT TESTS — parse_rule()
# Converts a JSON string or plain dict into a rule dictionary
# ─────────────────────────────────────────────────────────────

# Happy path

def test_parse_rule_returns_a_dict_unchanged():
    result = parse_rule({'type': 'logins_total', 'value': 1})
    assert result == {'type': 'logins_total', 'value': 1}

def test_parse_rule_parses_a_valid_json_string():
    result = parse_rule('{"type": "total_xp", "value": 500}')
    assert result['type'] == 'total_xp'
    assert result['value'] == 500

# Boundary cases

def test_parse_rule_returns_empty_dict_for_empty_dict():
    result = parse_rule({})
    assert result == {}

def test_parse_rule_returns_empty_dict_for_empty_string():
    result = parse_rule('')
    assert result == {}

# Invalid input

def test_parse_rule_returns_empty_dict_for_none():
    result = parse_rule(None)
    assert result == {}

def test_parse_rule_returns_empty_dict_for_broken_json():
    result = parse_rule('{not valid json}')
    assert result == {}


# ─────────────────────────────────────────────────────────────
# UNIT TESTS — login_streak()
# Counts how many consecutive days the user has logged in up to today
# ─────────────────────────────────────────────────────────────

# Happy path

def test_login_streak_single_login_today_is_one():
    dates = [date.today()]
    assert login_streak(dates) == 1

def test_login_streak_three_consecutive_days_is_three():
    dates = [date.today() - timedelta(days=i) for i in range(3)]
    assert login_streak(dates) == 3

def test_login_streak_seven_consecutive_days_is_seven():
    dates = [date.today() - timedelta(days=i) for i in range(7)]
    assert login_streak(dates) == 7

# Boundary and edge cases

def test_login_streak_gap_in_logins_breaks_the_streak():
    # Today, then a 2-day gap, then older logins — streak should be 1
    dates = [date.today(), date.today() - timedelta(days=3)]
    assert login_streak(dates) == 1

def test_login_streak_no_login_today_returns_zero():
    # Last login was yesterday so streak does not count today
    dates = [date.today() - timedelta(days=1)]
    assert login_streak(dates) == 0

# Invalid input

def test_login_streak_empty_list_returns_zero():
    assert login_streak([]) == 0

def test_login_streak_none_returns_zero():
    assert login_streak(None) == 0


# ─────────────────────────────────────────────────────────────
# UNIT TESTS — rule_matches()
# Checks whether a user's stats satisfy an achievement rule
# ─────────────────────────────────────────────────────────────

# Happy path — metric threshold rules

def test_rule_matches_logins_total_when_count_is_met():
    stats = {'logins_total': 5}
    rule  = {'type': 'logins_total', 'value': 1}
    assert rule_matches(rule, stats, 'login') is True

def test_rule_matches_total_xp_when_xp_is_above_threshold():
    stats = {'total_xp': 600}
    rule  = {'type': 'total_xp', 'value': 500}
    assert rule_matches(rule, stats, 'xp_gained') is True

def test_rule_matches_lessons_completed():
    stats = {'lessons_completed': 3}
    rule  = {'type': 'lessons_completed', 'value': 1}
    assert rule_matches(rule, stats, 'lesson_complete') is True

def test_rule_does_not_match_when_stat_is_below_threshold():
    stats = {'total_xp': 100}
    rule  = {'type': 'total_xp', 'value': 500}
    assert rule_matches(rule, stats, 'xp_gained') is False

# Composite rules

def test_rule_matches_all_of_when_all_conditions_are_met():
    stats = {'lessons_completed': 2, 'quizzes_completed': 1, 'challenges_completed': 1}
    rule  = {'type': 'all_of', 'rules': [
        {'type': 'lessons_completed',   'value': 1},
        {'type': 'quizzes_completed',   'value': 1},
        {'type': 'challenges_completed','value': 1},
    ]}
    assert rule_matches(rule, stats, 'lesson_complete') is True

def test_rule_does_not_match_all_of_when_one_condition_is_missing():
    stats = {'lessons_completed': 2, 'quizzes_completed': 0, 'challenges_completed': 1}
    rule  = {'type': 'all_of', 'rules': [
        {'type': 'lessons_completed', 'value': 1},
        {'type': 'quizzes_completed', 'value': 1},
    ]}
    assert rule_matches(rule, stats, 'lesson_complete') is False

def test_rule_matches_any_of_when_at_least_one_condition_is_met():
    stats = {'lessons_completed': 5, 'quizzes_completed': 0}
    rule  = {'type': 'any_of', 'rules': [
        {'type': 'lessons_completed', 'value': 3},
        {'type': 'quizzes_completed', 'value': 3},
    ]}
    assert rule_matches(rule, stats, 'lesson_complete') is True

# Invalid input

def test_rule_matches_returns_false_for_unknown_rule_type():
    stats = {'lessons_completed': 1}
    rule  = {'type': 'made_up_type', 'value': 1}
    assert rule_matches(rule, stats, 'test') is False


# ─────────────────────────────────────────────────────────────
# API TESTS — GET /api/user/achievements   (real database)
# ─────────────────────────────────────────────────────────────

# Happy path

def test_get_achievements_returns_unlocked_and_locked_keys(integration_client, make_user):
    make_user('ach_api@test.com')
    resp = integration_client.get('/api/user/achievements?user_email=ach_api@test.com')
    body = json.loads(resp.data)
    assert 'unlocked' in body
    assert 'locked' in body

# Invalid input

def test_get_achievements_missing_email_returns_400(integration_client):
    resp = integration_client.get('/api/user/achievements')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# INTEGRATION TESTS — evaluate_achievements_for_event() with a real database
# ─────────────────────────────────────────────────────────────

# Happy path

@pytest.mark.integration
def test_first_login_achievement_is_awarded_after_one_login(make_user):
    make_user('ach1@test.com', logins=1)
    awarded = evaluate_achievements_for_event('ach1@test.com', 'login')
    assert 'first_login' in [a['id'] for a in awarded]

@pytest.mark.integration
def test_awarded_achievement_is_saved_as_a_row_in_the_database(make_user, db):
    make_user('ach2@test.com', logins=1)
    evaluate_achievements_for_event('ach2@test.com', 'login')
    count = db.execute(
        "SELECT COUNT(*) FROM user_achievements WHERE user_email = 'ach2@test.com'"
    ).fetchone()[0]
    assert count >= 1

@pytest.mark.integration
def test_xp_500_club_is_awarded_to_user_with_600_xp(make_user, db):
    make_user('ach3@test.com', xp=600)
    evaluate_achievements_for_event('ach3@test.com', 'xp_gained')
    row = db.execute(
        "SELECT achievement_id FROM user_achievements "
        "WHERE user_email = 'ach3@test.com' AND achievement_id = 'xp_500_club'"
    ).fetchone()
    assert row is not None

# Edge case

@pytest.mark.integration
def test_same_achievement_is_not_awarded_twice(make_user, db):
    make_user('ach4@test.com', logins=1)
    evaluate_achievements_for_event('ach4@test.com', 'login')
    evaluate_achievements_for_event('ach4@test.com', 'login')
    count = db.execute(
        "SELECT COUNT(*) FROM user_achievements "
        "WHERE user_email = 'ach4@test.com' AND achievement_id = 'first_login'"
    ).fetchone()[0]
    assert count == 1

@pytest.mark.integration
def test_no_achievements_for_a_brand_new_user_with_no_activity(make_user):
    make_user('ach5@test.com', xp=0, logins=0)
    awarded = evaluate_achievements_for_event('ach5@test.com', 'login')
    assert awarded == []
