# test_challenge_system.py
# Tests for user_routes.py — challenge target and progress calculations.
#
# Functional Requirement: F07 — Interactive Challenges
# Functions under test: _challenge_target(), _challenge_progress_value()
#
# _challenge_target(required_action, challenge_type, title, description, action_target):
#   Returns how many actions a user must complete to finish a challenge.
#   If action_target is a positive number it is used directly.
#   Otherwise the target is decided by the action type:
#     complete_lessons + daily  → 2
#     complete_lessons + weekly → 5
#     daily_login               → 7
#     sandbox_topologies        → 3
#     complete_courses          → 3
#     quiz_score                → 1
#     anything else             → 1 (default)
#
# _challenge_progress_value(required_action, metrics):
#   Returns the user's current progress count for a given action type
#   by reading the correct key from the metrics dict.

import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from user_routes import _challenge_target, _challenge_progress_value


# ─────────────────────────────────────────────────────────────
# _CHALLENGE_TARGET — HAPPY PATH — explicit target overrides action
# ─────────────────────────────────────────────────────────────

def test_happy_explicit_target_5_is_used():
    result = _challenge_target("complete_lessons", "daily", "", "", 5)
    assert result == 5

def test_happy_explicit_target_10_is_used():
    result = _challenge_target("daily_login", "weekly", "", "", 10)
    assert result == 10

def test_happy_explicit_target_string_number_is_used():
    result = _challenge_target("quiz_score", "daily", "", "", "3")
    assert result == 3


# ─────────────────────────────────────────────────────────────
# _CHALLENGE_TARGET — HAPPY PATH — action type decides target
# ─────────────────────────────────────────────────────────────

def test_happy_complete_lessons_daily_target_is_2():
    result = _challenge_target("complete_lessons", "daily", "", "", None)
    assert result == 2

def test_happy_complete_lessons_weekly_target_is_5():
    result = _challenge_target("complete_lessons", "weekly", "", "", None)
    assert result == 5

def test_happy_daily_login_target_is_7():
    result = _challenge_target("daily_login", "weekly", "", "", None)
    assert result == 7

def test_happy_sandbox_topologies_target_is_3():
    result = _challenge_target("sandbox_topologies", "daily", "", "", None)
    assert result == 3

def test_happy_complete_courses_target_is_3():
    result = _challenge_target("complete_courses", "weekly", "", "", None)
    assert result == 3

def test_happy_quiz_score_target_is_1():
    result = _challenge_target("quiz_score", "daily", "", "", None)
    assert result == 1


# ─────────────────────────────────────────────────────────────
# _CHALLENGE_TARGET — BOUNDARY CASES
# ─────────────────────────────────────────────────────────────

def test_boundary_unknown_action_defaults_to_1():
    result = _challenge_target("unknown_action", "daily", "", "", None)
    assert result == 1

def test_boundary_explicit_target_zero_falls_through_to_action():
    # Zero is not a positive number so action type is used instead
    result = _challenge_target("daily_login", "weekly", "", "", 0)
    assert result == 7

def test_boundary_explicit_target_negative_falls_through_to_action():
    result = _challenge_target("quiz_score", "daily", "", "", -5)
    assert result == 1


# ─────────────────────────────────────────────────────────────
# _CHALLENGE_TARGET — INVALID INPUT
# ─────────────────────────────────────────────────────────────

def test_invalid_none_action_target_uses_action_type():
    result = _challenge_target("sandbox_topologies", "daily", "", "", None)
    assert result == 3

def test_invalid_string_action_target_falls_through_to_action():
    result = _challenge_target("complete_courses", "weekly", "", "", "abc")
    assert result == 3

def test_invalid_none_action_type_defaults_to_1():
    result = _challenge_target(None, "daily", "", "", None)
    assert result == 1


# ─────────────────────────────────────────────────────────────
# _CHALLENGE_PROGRESS_VALUE — HAPPY PATH
# ─────────────────────────────────────────────────────────────

def test_happy_complete_lesson_reads_lessons_done():
    metrics = {"lessons_done": 4}
    result = _challenge_progress_value("complete_lesson", metrics)
    assert result == 4

def test_happy_review_lesson_reads_lessons_done():
    metrics = {"lessons_done": 2}
    result = _challenge_progress_value("review_lesson", metrics)
    assert result == 2

def test_happy_complete_lessons_reads_lessons_done():
    metrics = {"lessons_done": 6}
    result = _challenge_progress_value("complete_lessons", metrics)
    assert result == 6

def test_happy_pass_quiz_reads_quizzes_done():
    metrics = {"quizzes_done": 3}
    result = _challenge_progress_value("pass_quiz", metrics)
    assert result == 3

def test_happy_quiz_score_reads_quizzes_done():
    metrics = {"quizzes_done": 5}
    result = _challenge_progress_value("quiz_score", metrics)
    assert result == 5

def test_happy_daily_login_reads_streak_days():
    metrics = {"streak_days": 7}
    result = _challenge_progress_value("daily_login", metrics)
    assert result == 7

def test_happy_start_course_reads_courses_started():
    metrics = {"courses_started": 2}
    result = _challenge_progress_value("start_course", metrics)
    assert result == 2

def test_happy_complete_courses_reads_courses_done():
    metrics = {"courses_done": 1}
    result = _challenge_progress_value("complete_courses", metrics)
    assert result == 1

def test_happy_sandbox_practice_adds_topologies_and_sessions():
    metrics = {"topologies_saved": 2, "lesson_sessions": 3}
    result = _challenge_progress_value("sandbox_practice", metrics)
    assert result == 5

def test_happy_sandbox_topologies_adds_topologies_and_sessions():
    metrics = {"topologies_saved": 1, "lesson_sessions": 4}
    result = _challenge_progress_value("sandbox_topologies", metrics)
    assert result == 5


# ─────────────────────────────────────────────────────────────
# _CHALLENGE_PROGRESS_VALUE — BOUNDARY CASES
# ─────────────────────────────────────────────────────────────

def test_boundary_unknown_action_returns_zero():
    metrics = {"lessons_done": 10}
    result = _challenge_progress_value("unknown_action", metrics)
    assert result == 0

def test_boundary_empty_metrics_returns_zero():
    result = _challenge_progress_value("complete_lesson", {})
    assert result == 0


# ─────────────────────────────────────────────────────────────
# _CHALLENGE_PROGRESS_VALUE — INVALID INPUT
# ─────────────────────────────────────────────────────────────

def test_invalid_none_action_returns_zero():
    metrics = {"lessons_done": 5}
    result = _challenge_progress_value(None, metrics)
    assert result == 0
