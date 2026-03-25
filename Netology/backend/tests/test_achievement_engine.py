# test_achievement_engine.py — Unit tests for achievement rule logic.
#
# Tests cover the three pure functions that have no database dependency:
#   parse_rule    — normalises a rule from dict or JSON string
#   rule_matches  — evaluates a single rule against user stats + event
#   login_streak  — counts consecutive login days ending today

import pytest
from unittest.mock import patch
from datetime import date, timedelta

from achievement_engine import parse_rule, rule_matches, login_streak


class TestParseRule:
    def test_dict_is_returned_unchanged(self):
        rule = {"type": "event", "event": "login"}
        assert parse_rule(rule) == rule

    def test_valid_json_string_parsed(self):
        result = parse_rule('{"type": "event", "event": "login"}')
        assert result == {"type": "event", "event": "login"}

    def test_invalid_json_string_returns_empty(self):
        assert parse_rule("not valid json {{") == {}

    def test_none_returns_empty(self):
        assert parse_rule(None) == {}

    def test_json_array_returns_empty(self):
        # Arrays are not valid rule dicts.
        assert parse_rule("[1, 2, 3]") == {}

    def test_empty_dict_returns_empty_dict(self):
        assert parse_rule({}) == {}

    def test_empty_string_returns_empty(self):
        assert parse_rule("") == {}


class TestRuleMatches:
    # ── Event rules ──────────────────────────────────────────────────────────

    def test_event_rule_matches_correct_event(self):
        rule = {"type": "event", "event": "login"}
        assert rule_matches(rule, {}, "login") is True

    def test_event_rule_no_match_wrong_event(self):
        rule = {"type": "event", "event": "login"}
        assert rule_matches(rule, {}, "quiz_complete") is False

    def test_event_rule_case_insensitive(self):
        rule = {"type": "event", "event": "LOGIN"}
        assert rule_matches(rule, {}, "login") is True

    def test_event_rule_missing_event_key_returns_false(self):
        rule = {"type": "event"}
        assert rule_matches(rule, {}, "login") is False

    # ── Metric rules ─────────────────────────────────────────────────────────

    def test_lessons_completed_passes_when_met(self):
        rule = {"type": "lessons_completed", "value": 5}
        assert rule_matches(rule, {"lessons_completed": 5}, "") is True

    def test_lessons_completed_fails_when_below(self):
        rule = {"type": "lessons_completed", "value": 5}
        assert rule_matches(rule, {"lessons_completed": 4}, "") is False

    def test_lessons_completed_passes_when_exceeded(self):
        rule = {"type": "lessons_completed", "value": 5}
        assert rule_matches(rule, {"lessons_completed": 100}, "") is True

    def test_total_xp_rule(self):
        rule = {"type": "total_xp", "value": 100}
        assert rule_matches(rule, {"total_xp": 500}, "") is True
        assert rule_matches(rule, {"total_xp": 99}, "") is False

    def test_level_reached_rule(self):
        rule = {"type": "level_reached", "value": 3}
        assert rule_matches(rule, {"level": 3}, "") is True
        assert rule_matches(rule, {"level": 2}, "") is False

    def test_login_streak_rule(self):
        rule = {"type": "login_streak", "value": 7}
        assert rule_matches(rule, {"login_streak": 7}, "") is True
        assert rule_matches(rule, {"login_streak": 6}, "") is False

    def test_quizzes_completed_rule(self):
        rule = {"type": "quizzes_completed", "value": 3}
        assert rule_matches(rule, {"quizzes_completed": 3}, "") is True

    def test_challenges_completed_rule(self):
        rule = {"type": "challenges_completed", "value": 1}
        assert rule_matches(rule, {"challenges_completed": 1}, "") is True

    def test_courses_completed_rule(self):
        rule = {"type": "courses_completed", "value": 1}
        assert rule_matches(rule, {"courses_completed": 1}, "") is True

    # ── Onboarding rule ──────────────────────────────────────────────────────

    def test_onboarding_completed_true(self):
        rule = {"type": "onboarding_completed"}
        assert rule_matches(rule, {"onboarding_completed": True}, "") is True

    def test_onboarding_completed_false(self):
        rule = {"type": "onboarding_completed"}
        assert rule_matches(rule, {"onboarding_completed": False}, "") is False

    # ── Composite: all_of ────────────────────────────────────────────────────

    def test_all_of_passes_when_all_children_pass(self):
        rule = {
            "type": "all_of",
            "rules": [
                {"type": "lessons_completed", "value": 1},
                {"type": "quizzes_completed", "value": 1},
            ],
        }
        stats = {"lessons_completed": 1, "quizzes_completed": 1}
        assert rule_matches(rule, stats, "") is True

    def test_all_of_fails_when_one_child_fails(self):
        rule = {
            "type": "all_of",
            "rules": [
                {"type": "lessons_completed", "value": 1},
                {"type": "quizzes_completed", "value": 5},
            ],
        }
        stats = {"lessons_completed": 1, "quizzes_completed": 2}
        assert rule_matches(rule, stats, "") is False

    def test_all_of_empty_rules_returns_false(self):
        rule = {"type": "all_of", "rules": []}
        assert rule_matches(rule, {}, "") is False

    # ── Composite: any_of ────────────────────────────────────────────────────

    def test_any_of_passes_when_one_child_passes(self):
        rule = {
            "type": "any_of",
            "rules": [
                {"type": "lessons_completed", "value": 100},
                {"type": "quizzes_completed", "value": 1},
            ],
        }
        stats = {"lessons_completed": 1, "quizzes_completed": 1}
        assert rule_matches(rule, stats, "") is True

    def test_any_of_fails_when_all_children_fail(self):
        rule = {
            "type": "any_of",
            "rules": [
                {"type": "lessons_completed", "value": 100},
                {"type": "quizzes_completed", "value": 100},
            ],
        }
        stats = {"lessons_completed": 1, "quizzes_completed": 1}
        assert rule_matches(rule, stats, "") is False

    def test_any_of_empty_rules_returns_false(self):
        rule = {"type": "any_of", "rules": []}
        assert rule_matches(rule, {}, "") is False

    # ── Edge cases ───────────────────────────────────────────────────────────

    def test_unknown_rule_type_returns_false(self):
        rule = {"type": "made_up_metric", "value": 1}
        assert rule_matches(rule, {}, "") is False

    def test_empty_rule_returns_false(self):
        assert rule_matches({}, {}, "") is False

    def test_missing_stat_key_treated_as_zero(self):
        # Stats dict doesn't have the key — should fail the threshold check.
        rule = {"type": "lessons_completed", "value": 1}
        assert rule_matches(rule, {}, "") is False


class TestLoginStreak:
    def _today(self):
        return date.today()

    def test_empty_list_returns_zero(self):
        assert login_streak([]) == 0

    def test_streak_of_one_today(self):
        today = self._today()
        with patch("achievement_engine.datetime") as mock_dt:
            mock_dt.now.return_value.date.return_value = today
            assert login_streak([today]) == 1

    def test_streak_of_three_consecutive(self):
        today = self._today()
        dates = [today - timedelta(days=i) for i in range(3)]
        with patch("achievement_engine.datetime") as mock_dt:
            mock_dt.now.return_value.date.return_value = today
            assert login_streak(dates) == 3

    def test_streak_breaks_on_gap(self):
        today = self._today()
        # today and two days ago — yesterday missing, so streak = 1
        dates = [today, today - timedelta(days=2)]
        with patch("achievement_engine.datetime") as mock_dt:
            mock_dt.now.return_value.date.return_value = today
            assert login_streak(dates) == 1

    def test_streak_requires_today(self):
        today = self._today()
        # Only yesterday in the list — streak starts from today, so 0
        dates = [today - timedelta(days=1)]
        with patch("achievement_engine.datetime") as mock_dt:
            mock_dt.now.return_value.date.return_value = today
            assert login_streak(dates) == 0

    def test_long_streak(self):
        today = self._today()
        dates = [today - timedelta(days=i) for i in range(30)]
        with patch("achievement_engine.datetime") as mock_dt:
            mock_dt.now.return_value.date.return_value = today
            assert login_streak(dates) == 30
