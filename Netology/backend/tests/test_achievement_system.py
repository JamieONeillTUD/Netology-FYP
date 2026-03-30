# test_achievement_system.py
# Tests for achievement_engine.py — rule parsing, streak counting, and rule matching.
#
# Functional Requirements: F07 — Interactive Challenges, F08 — Gamification System
# Functions under test: parse_rule(), login_streak(), rule_matches()
#
# parse_rule(raw):
#   Converts a JSON string or dict into a rule dict. Returns {} on bad input.
#
# login_streak(dates_desc):
#   Counts consecutive login days ending today (descending). Returns 0 if today not present.
#
# rule_matches(rule, stats, event):
#   Returns True when a single achievement rule is satisfied by the user's stats.
#   Supported rule types: event, logins_total, login_streak, total_xp, level_reached,
#   courses_started, courses_completed, lessons_completed, quizzes_completed,
#   challenges_completed, onboarding_completed, all_of, any_of.

import pytest
import sys
import os
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from achievement_engine import parse_rule, login_streak, rule_matches, load_stats, evaluate_achievements_for_event


# ─────────────────────────────────────────────────────────────
# PARSE_RULE — HAPPY PATH
# ─────────────────────────────────────────────────────────────

def test_happy_dict_rule_returned_unchanged():
    rule = {"type": "event", "event": "login"}
    assert parse_rule(rule) == rule

def test_happy_json_string_parsed_to_dict():
    result = parse_rule('{"type": "logins_total", "value": 5}')
    assert result == {"type": "logins_total", "value": 5}


# ─────────────────────────────────────────────────────────────
# PARSE_RULE — BOUNDARY CASES
# ─────────────────────────────────────────────────────────────

def test_boundary_empty_dict_returned_as_is():
    assert parse_rule({}) == {}

def test_boundary_empty_string_returns_empty_dict():
    assert parse_rule("") == {}


# ─────────────────────────────────────────────────────────────
# PARSE_RULE — INVALID INPUT
# ─────────────────────────────────────────────────────────────

def test_invalid_none_returns_empty_dict():
    assert parse_rule(None) == {}

def test_invalid_broken_json_string_returns_empty_dict():
    assert parse_rule("not-json") == {}

def test_invalid_json_array_returns_empty_dict():
    # Valid JSON but not a dict — must be rejected
    assert parse_rule("[1, 2, 3]") == {}


# ─────────────────────────────────────────────────────────────
# LOGIN_STREAK — HAPPY PATH
# ─────────────────────────────────────────────────────────────

def test_happy_today_only_is_streak_of_one():
    streak = login_streak([date.today()])
    assert streak == 1

def test_happy_three_consecutive_days():
    today = date.today()
    dates = [today, today - timedelta(1), today - timedelta(2)]
    streak = login_streak(dates)
    assert streak == 3

def test_happy_seven_consecutive_days():
    today = date.today()
    dates = [today - timedelta(i) for i in range(7)]
    streak = login_streak(dates)
    assert streak == 7


# ─────────────────────────────────────────────────────────────
# LOGIN_STREAK — BOUNDARY CASES
# ─────────────────────────────────────────────────────────────

def test_boundary_empty_list_returns_zero():
    streak = login_streak([])
    assert streak == 0

def test_boundary_none_returns_zero():
    streak = login_streak(None)
    assert streak == 0


# ─────────────────────────────────────────────────────────────
# LOGIN_STREAK — EDGE CASES
# ─────────────────────────────────────────────────────────────

def test_edge_gap_in_dates_stops_streak_at_one():
    today = date.today()
    # Logged in today and two days ago — yesterday was missed
    dates = [today, today - timedelta(2)]
    streak = login_streak(dates)
    assert streak == 1

def test_edge_no_login_today_returns_zero():
    # History exists but not for today
    yesterday = date.today() - timedelta(1)
    streak = login_streak([yesterday, yesterday - timedelta(1)])
    assert streak == 0


# ─────────────────────────────────────────────────────────────
# RULE_MATCHES — HAPPY PATH — metric rules
# ─────────────────────────────────────────────────────────────

def test_happy_logins_total_passes_when_threshold_met():
    result = rule_matches({"type": "logins_total", "value": 5}, {"logins_total": 10}, "")
    assert result is True

def test_happy_logins_total_fails_when_below_threshold():
    result = rule_matches({"type": "logins_total", "value": 20}, {"logins_total": 10}, "")
    assert result is False

def test_happy_total_xp_passes_when_threshold_met():
    result = rule_matches({"type": "total_xp", "value": 100}, {"total_xp": 500}, "")
    assert result is True

def test_happy_lessons_completed_passes_when_threshold_met():
    result = rule_matches({"type": "lessons_completed", "value": 5}, {"lessons_completed": 8}, "")
    assert result is True

def test_happy_quizzes_completed_passes_when_threshold_met():
    result = rule_matches({"type": "quizzes_completed", "value": 3}, {"quizzes_completed": 5}, "")
    assert result is True

def test_happy_challenges_completed_passes_when_threshold_met():
    result = rule_matches({"type": "challenges_completed", "value": 2}, {"challenges_completed": 2}, "")
    assert result is True

def test_happy_courses_completed_passes_when_threshold_met():
    result = rule_matches({"type": "courses_completed", "value": 1}, {"courses_completed": 1}, "")
    assert result is True

def test_happy_level_reached_passes_when_threshold_met():
    result = rule_matches({"type": "level_reached", "value": 3}, {"level": 3}, "")
    assert result is True

def test_happy_level_reached_fails_when_below_threshold():
    result = rule_matches({"type": "level_reached", "value": 5}, {"level": 3}, "")
    assert result is False


# ─────────────────────────────────────────────────────────────
# RULE_MATCHES — HAPPY PATH — event rules
# ─────────────────────────────────────────────────────────────

def test_happy_event_rule_passes_on_matching_event():
    result = rule_matches({"type": "event", "event": "login"}, {}, "login")
    assert result is True

def test_happy_event_rule_fails_on_wrong_event():
    result = rule_matches({"type": "event", "event": "course_complete"}, {}, "login")
    assert result is False


# ─────────────────────────────────────────────────────────────
# RULE_MATCHES — HAPPY PATH — onboarding flag
# ─────────────────────────────────────────────────────────────

def test_happy_onboarding_passes_when_completed():
    result = rule_matches({"type": "onboarding_completed"}, {"onboarding_completed": True}, "")
    assert result is True

def test_happy_onboarding_fails_when_not_completed():
    result = rule_matches({"type": "onboarding_completed"}, {"onboarding_completed": False}, "")
    assert result is False


# ─────────────────────────────────────────────────────────────
# RULE_MATCHES — HAPPY PATH — all_of composite rules
# ─────────────────────────────────────────────────────────────

def test_happy_all_of_passes_when_both_conditions_met():
    rule = {"type": "all_of", "rules": [
        {"type": "logins_total", "value": 5},
        {"type": "total_xp",     "value": 100},
    ]}
    result = rule_matches(rule, {"logins_total": 10, "total_xp": 500}, "")
    assert result is True

def test_happy_all_of_fails_when_one_condition_not_met():
    rule = {"type": "all_of", "rules": [
        {"type": "logins_total", "value": 5},
        {"type": "total_xp",     "value": 9999},
    ]}
    result = rule_matches(rule, {"logins_total": 10, "total_xp": 500}, "")
    assert result is False


# ─────────────────────────────────────────────────────────────
# RULE_MATCHES — HAPPY PATH — any_of composite rules
# ─────────────────────────────────────────────────────────────

def test_happy_any_of_passes_when_one_condition_met():
    rule = {"type": "any_of", "rules": [
        {"type": "logins_total", "value": 999},
        {"type": "total_xp",     "value": 100},
    ]}
    result = rule_matches(rule, {"logins_total": 10, "total_xp": 500}, "")
    assert result is True

def test_happy_any_of_fails_when_all_conditions_fail():
    rule = {"type": "any_of", "rules": [
        {"type": "logins_total", "value": 999},
        {"type": "total_xp",     "value": 9999},
    ]}
    result = rule_matches(rule, {"logins_total": 10, "total_xp": 500}, "")
    assert result is False


# ─────────────────────────────────────────────────────────────
# RULE_MATCHES — EDGE CASES
# ─────────────────────────────────────────────────────────────

def test_edge_all_of_empty_rules_list_returns_false():
    result = rule_matches({"type": "all_of", "rules": []}, {}, "")
    assert result is False

def test_edge_any_of_empty_rules_list_returns_false():
    result = rule_matches({"type": "any_of", "rules": []}, {}, "")
    assert result is False


# ─────────────────────────────────────────────────────────────
# RULE_MATCHES — INVALID INPUT
# ─────────────────────────────────────────────────────────────

def test_invalid_unknown_rule_type_returns_false():
    result = rule_matches({"type": "made_up_metric", "value": 1}, {}, "")
    assert result is False

def test_invalid_empty_rule_returns_false():
    result = rule_matches({}, {}, "")
    assert result is False


# ─────────────────────────────────────────────────────────────
# LOAD_STATS — HAPPY PATH (mock cursor, no real database needed)
# ─────────────────────────────────────────────────────────────

def test_load_stats_returns_none_when_user_not_found():
    cur = MagicMock()
    cur.fetchone.return_value = None
    cur.fetchall.return_value = []
    result = load_stats(cur, "test@test.com")
    assert result is None

def test_load_stats_returns_dict_when_user_exists():
    cur = MagicMock()
    # First fetchone: (xp, numeric_level, onboarding_completed)
    # Second fetchone: (logins_total, courses_started, courses_completed,
    #                   lessons_completed, quizzes_completed, challenges_completed)
    cur.fetchone.side_effect = [(500, 3, True), (10, 2, 1, 8, 5, 2)]
    cur.fetchall.return_value = []  # no login dates
    result = load_stats(cur, "test@test.com")
    assert result is not None

def test_load_stats_total_xp_matches_db_value():
    cur = MagicMock()
    cur.fetchone.side_effect = [(300, 3, False), (5, 1, 0, 4, 2, 1)]
    cur.fetchall.return_value = []
    result = load_stats(cur, "test@test.com")
    assert result["total_xp"] == 300

def test_load_stats_logins_total_matches_db_value():
    cur = MagicMock()
    cur.fetchone.side_effect = [(100, 2, False), (7, 1, 0, 3, 1, 0)]
    cur.fetchall.return_value = []
    result = load_stats(cur, "test@test.com")
    assert result["logins_total"] == 7

def test_load_stats_onboarding_flag_is_preserved():
    cur = MagicMock()
    cur.fetchone.side_effect = [(0, 1, True), (1, 0, 0, 0, 0, 0)]
    cur.fetchall.return_value = []
    result = load_stats(cur, "test@test.com")
    assert result["onboarding_completed"] is True


# ─────────────────────────────────────────────────────────────
# EVALUATE_ACHIEVEMENTS_FOR_EVENT — HAPPY PATH (mock database)
# ─────────────────────────────────────────────────────────────

def test_evaluate_achievements_empty_email_returns_empty_list():
    result = evaluate_achievements_for_event("", "login")
    assert result == []

def test_evaluate_achievements_blank_event_with_no_catalog_returns_empty():
    conn = MagicMock()
    cur  = MagicMock()
    conn.cursor.return_value = cur
    # catalog is empty so no achievements are evaluated
    cur.fetchall.side_effect = [[], [], []]
    cur.fetchone.side_effect = [(500, 3, True), (10, 2, 1, 8, 5, 2)]
    with patch('achievement_engine.get_db_connection', return_value=conn):
        result = evaluate_achievements_for_event("test@test.com", "login")
    assert result == []

def test_evaluate_achievements_returns_list():
    conn = MagicMock()
    cur  = MagicMock()
    conn.cursor.return_value = cur
    cur.fetchall.side_effect = [[], [], []]
    cur.fetchone.side_effect = [(0, 1, False), (0, 0, 0, 0, 0, 0)]
    with patch('achievement_engine.get_db_connection', return_value=conn):
        result = evaluate_achievements_for_event("new@test.com", "")
    assert isinstance(result, list)
