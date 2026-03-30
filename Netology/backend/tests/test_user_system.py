# test_user_system.py
# Tests for auth_routes.py — registration validation and level bootstrap logic.
#
# Functional Requirement: F01 — User Registration and Login
# Functions under test: valid_email(), start_level(), level_bootstrap_for_start(), xp_payload()
#
# valid_email(email):
#   Returns True if the string contains "@" and a "." in the domain part.
#
# start_level(raw):
#   Returns the level string if it is "novice", "intermediate", or "advanced".
#   Falls back to "novice" for any other value.
#
# level_bootstrap_for_start(level):
#   Returns (starter_xp, numeric_level, rank) based on chosen onboarding level:
#   novice       →    0 XP, Level 1, Novice
#   intermediate →  300 XP, Level 3, Intermediate
#   advanced     → 1000 XP, Level 5, Advanced
#
# xp_payload(total_xp):
#   Builds the XP/level/rank response dict sent back on login.
#   Keys: xp, numeric_level, level, rank, xp_into_level, next_level_xp

import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from auth_routes import valid_email, start_level, level_bootstrap_for_start, xp_payload


# ─────────────────────────────────────────────────────────────
# VALID_EMAIL — HAPPY PATH
# ─────────────────────────────────────────────────────────────

def test_happy_standard_email_is_valid():
    result = valid_email("user@example.com")
    assert result is True

def test_happy_college_email_is_valid():
    result = valid_email("student@mail.tud.ie")
    assert result is True

def test_happy_email_with_numbers_is_valid():
    result = valid_email("c22320301@tud.ie")
    assert result is True


# ─────────────────────────────────────────────────────────────
# VALID_EMAIL — BOUNDARY CASES
# ─────────────────────────────────────────────────────────────

def test_boundary_email_missing_at_sign_is_invalid():
    result = valid_email("userexample.com")
    assert result is False

def test_boundary_email_missing_dot_in_domain_is_invalid():
    result = valid_email("user@examplecom")
    assert result is False


# ─────────────────────────────────────────────────────────────
# VALID_EMAIL — INVALID INPUT
# ─────────────────────────────────────────────────────────────

def test_invalid_empty_string_is_not_valid():
    result = valid_email("")
    assert result is False

def test_invalid_none_is_not_valid():
    result = valid_email(None)
    assert result is False

def test_invalid_whitespace_only_is_not_valid():
    result = valid_email("   ")
    assert result is False


# ─────────────────────────────────────────────────────────────
# START_LEVEL — HAPPY PATH
# ─────────────────────────────────────────────────────────────

def test_happy_novice_returned_unchanged():
    result = start_level("novice")
    assert result == "novice"

def test_happy_intermediate_returned_unchanged():
    result = start_level("intermediate")
    assert result == "intermediate"

def test_happy_advanced_returned_unchanged():
    result = start_level("advanced")
    assert result == "advanced"


# ─────────────────────────────────────────────────────────────
# START_LEVEL — BOUNDARY CASES
# ─────────────────────────────────────────────────────────────

def test_boundary_uppercase_input_accepted():
    # Input from a form may arrive in any case
    result = start_level("INTERMEDIATE")
    assert result == "intermediate"

def test_boundary_mixed_case_accepted():
    result = start_level("Advanced")
    assert result == "advanced"


# ─────────────────────────────────────────────────────────────
# START_LEVEL — INVALID INPUT
# ─────────────────────────────────────────────────────────────

def test_invalid_unknown_string_defaults_to_novice():
    result = start_level("expert")
    assert result == "novice"

def test_invalid_empty_string_defaults_to_novice():
    result = start_level("")
    assert result == "novice"

def test_invalid_none_defaults_to_novice():
    result = start_level(None)
    assert result == "novice"


# ─────────────────────────────────────────────────────────────
# LEVEL_BOOTSTRAP_FOR_START — HAPPY PATH
# ─────────────────────────────────────────────────────────────

def test_happy_novice_bootstrap_gives_zero_xp():
    xp, level, rank = level_bootstrap_for_start("novice")
    assert xp == 0

def test_happy_novice_bootstrap_gives_level_1():
    xp, level, rank = level_bootstrap_for_start("novice")
    assert level == 1

def test_happy_novice_bootstrap_gives_novice_rank():
    xp, level, rank = level_bootstrap_for_start("novice")
    assert rank == "Novice"

def test_happy_intermediate_bootstrap_gives_300_xp():
    xp, level, rank = level_bootstrap_for_start("intermediate")
    assert xp == 300

def test_happy_intermediate_bootstrap_gives_level_3():
    xp, level, rank = level_bootstrap_for_start("intermediate")
    assert level == 3

def test_happy_intermediate_bootstrap_gives_intermediate_rank():
    xp, level, rank = level_bootstrap_for_start("intermediate")
    assert rank == "Intermediate"

def test_happy_advanced_bootstrap_gives_1000_xp():
    xp, level, rank = level_bootstrap_for_start("advanced")
    assert xp == 1000

def test_happy_advanced_bootstrap_gives_level_5():
    xp, level, rank = level_bootstrap_for_start("advanced")
    assert level == 5

def test_happy_advanced_bootstrap_gives_advanced_rank():
    xp, level, rank = level_bootstrap_for_start("advanced")
    assert rank == "Advanced"


# ─────────────────────────────────────────────────────────────
# LEVEL_BOOTSTRAP_FOR_START — INVALID INPUT
# ─────────────────────────────────────────────────────────────

def test_invalid_bad_level_string_defaults_to_novice_values():
    xp, level, rank = level_bootstrap_for_start("garbage")
    assert xp == 0
    assert level == 1
    assert rank == "Novice"

def test_invalid_none_level_defaults_to_novice_values():
    xp, level, rank = level_bootstrap_for_start(None)
    assert xp == 0
    assert level == 1
    assert rank == "Novice"


# ─────────────────────────────────────────────────────────────
# XP_PAYLOAD — HAPPY PATH
# ─────────────────────────────────────────────────────────────

def test_happy_zero_xp_payload_is_level_1_novice():
    result = xp_payload(0)
    assert result["xp"] == 0
    assert result["numeric_level"] == 1
    assert result["rank"] == "Novice"

def test_happy_300_xp_payload_is_level_3_intermediate():
    result = xp_payload(300)
    assert result["numeric_level"] == 3
    assert result["rank"] == "Intermediate"

def test_happy_1000_xp_payload_is_level_5_advanced():
    result = xp_payload(1000)
    assert result["numeric_level"] == 5
    assert result["rank"] == "Advanced"


# ─────────────────────────────────────────────────────────────
# XP_PAYLOAD — BOUNDARY CASES
# ─────────────────────────────────────────────────────────────

def test_boundary_payload_contains_all_required_keys():
    result = xp_payload(0)
    assert "xp" in result
    assert "numeric_level" in result
    assert "level" in result
    assert "rank" in result
    assert "xp_into_level" in result
    assert "next_level_xp" in result

def test_boundary_level_and_rank_keys_match():
    # Both "level" and "rank" should hold the same rank string
    result = xp_payload(300)
    assert result["level"] == result["rank"]


# ─────────────────────────────────────────────────────────────
# XP_PAYLOAD — INVALID INPUT
# ─────────────────────────────────────────────────────────────

def test_invalid_none_xp_treated_as_zero():
    result = xp_payload(None)
    assert result["xp"] == 0
    assert result["numeric_level"] == 1

def test_invalid_negative_xp_gives_level_1():
    # xp field holds the raw value but level calculation clamps to 0
    result = xp_payload(-500)
    assert result["numeric_level"] == 1
