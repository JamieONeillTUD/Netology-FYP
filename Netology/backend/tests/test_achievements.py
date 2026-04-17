"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

test_achievements.py - Achievement System Tests
---
This file checks the achievement engine and the achievements API.

It tests four parts:
  1. Rule parsing from plain dicts and JSON strings.
  2. Login streak counting.
  3. Rule matching against user stats.
  4. Saving achievements to the live database.

The tests are split into small unit tests and a few integration tests
so the achievement system stays easy to understand and easy to check.
"""

import json
from datetime import date, timedelta

import pytest

from achievement_engine import (
    evaluate_achievements_for_event,
    login_streak,
    parse_rule,
    rule_matches,
)


# parse_rule()

def test_parse_rule_keeps_dict():
    assert parse_rule({"type": "logins_total", "value": 1}) == {"type": "logins_total", "value": 1}

def test_parse_rule_reads_json():
    result = parse_rule('{"type": "total_xp", "value": 500}')
    assert result["type"] == "total_xp"
    assert result["value"] == 500

def test_parse_rule_empty_dict():
    assert parse_rule({}) == {}

def test_parse_rule_empty_string():
    assert parse_rule("") == {}

def test_parse_rule_none():
    assert parse_rule(None) == {}

def test_parse_rule_bad_json():
    assert parse_rule("{not valid json}") == {}


# login_streak()

def test_streak_one_day():
    assert login_streak([date.today()]) == 1

def test_streak_three_days():
    dates = [date.today() - timedelta(days=i) for i in range(3)]
    assert login_streak(dates) == 3

def test_streak_seven_days():
    dates = [date.today() - timedelta(days=i) for i in range(7)]
    assert login_streak(dates) == 7

def test_streak_breaks_on_gap():
    dates = [date.today(), date.today() - timedelta(days=3)]
    assert login_streak(dates) == 1

def test_streak_zero_without_today():
    assert login_streak([date.today() - timedelta(days=1)]) == 0

def test_streak_empty_list():
    assert login_streak([]) == 0

def test_streak_none():
    assert login_streak(None) == 0


# rule_matches()

def test_matches_logins_total():
    stats = {"logins_total": 5}
    rule = {"type": "logins_total", "value": 1}
    assert rule_matches(rule, stats, "login") is True

def test_matches_total_xp():
    stats = {"total_xp": 600}
    rule = {"type": "total_xp", "value": 500}
    assert rule_matches(rule, stats, "xp_gained") is True

def test_matches_lessons_completed():
    stats = {"lessons_completed": 3}
    rule = {"type": "lessons_completed", "value": 1}
    assert rule_matches(rule, stats, "lesson_complete") is True

def test_does_not_match_below_threshold():
    stats = {"total_xp": 100}
    rule = {"type": "total_xp", "value": 500}
    assert rule_matches(rule, stats, "xp_gained") is False

def test_matches_all_of():
    stats = {"lessons_completed": 2, "quizzes_completed": 1, "challenges_completed": 1}
    rule = {
        "type": "all_of",
        "rules": [
            {"type": "lessons_completed", "value": 1},
            {"type": "quizzes_completed", "value": 1},
            {"type": "challenges_completed", "value": 1},
        ],
    }
    assert rule_matches(rule, stats, "lesson_complete") is True

def test_does_not_match_all_of():
    stats = {"lessons_completed": 2, "quizzes_completed": 0, "challenges_completed": 1}
    rule = {
        "type": "all_of",
        "rules": [
            {"type": "lessons_completed", "value": 1},
            {"type": "quizzes_completed", "value": 1},
        ],
    }
    assert rule_matches(rule, stats, "lesson_complete") is False

def test_matches_any_of():
    stats = {"lessons_completed": 5, "quizzes_completed": 0}
    rule = {
        "type": "any_of",
        "rules": [
            {"type": "lessons_completed", "value": 3},
            {"type": "quizzes_completed", "value": 3},
        ],
    }
    assert rule_matches(rule, stats, "lesson_complete") is True

def test_does_not_match_unknown_rule():
    stats = {"lessons_completed": 1}
    rule = {"type": "made_up_type", "value": 1}
    assert rule_matches(rule, stats, "test") is False


# GET /api/user/achievements

def test_achievements_returns_lists(integration_client, make_user):
    make_user("ach_api@test.com")
    resp = integration_client.get("/api/user/achievements?user_email=ach_api@test.com")
    body = json.loads(resp.data)
    assert "unlocked" in body
    assert "locked" in body

def test_achievements_missing_email(integration_client):
    resp = integration_client.get("/api/user/achievements")
    assert resp.status_code == 400


@pytest.mark.integration
def test_first_login_awards(make_user):
    make_user("ach1@test.com", logins=1)
    awarded = evaluate_achievements_for_event("ach1@test.com", "login")
    assert "first_login" in [achievement["id"] for achievement in awarded]

@pytest.mark.integration
def test_award_is_saved(make_user, db):
    make_user("ach2@test.com", logins=1)
    evaluate_achievements_for_event("ach2@test.com", "login")
    count = db.execute(
        "SELECT COUNT(*) FROM user_achievements WHERE user_email = 'ach2@test.com'"
    ).fetchone()[0]
    assert count >= 1

@pytest.mark.integration
def test_xp_500_club_awards(make_user, db):
    make_user("ach3@test.com", xp=600)
    evaluate_achievements_for_event("ach3@test.com", "xp_gained")
    row = db.execute(
        "SELECT achievement_id FROM user_achievements "
        "WHERE user_email = 'ach3@test.com' AND achievement_id = 'xp_500_club'"
    ).fetchone()
    assert row is not None

@pytest.mark.integration
def test_award_is_not_duplicated(make_user, db):
    make_user("ach4@test.com", logins=1)
    evaluate_achievements_for_event("ach4@test.com", "login")
    evaluate_achievements_for_event("ach4@test.com", "login")
    count = db.execute(
        "SELECT COUNT(*) FROM user_achievements "
        "WHERE user_email = 'ach4@test.com' AND achievement_id = 'first_login'"
    ).fetchone()[0]
    assert count == 1

@pytest.mark.integration
def test_no_awards_for_new_user(make_user):
    make_user("ach5@test.com", xp=0, logins=0)
    awarded = evaluate_achievements_for_event("ach5@test.com", "login")
    assert awarded == []
