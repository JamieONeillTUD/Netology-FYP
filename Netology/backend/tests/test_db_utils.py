# test_db_utils.py
# Tests for db.py — shared data utility functions used across all routes.
#
# Functional Requirements: F01, F04, F09 — used by registration, topology, and progress
# Functions under test: to_int(), email_from()
#
# to_int(value, default=0):
#   Safely converts any value to an integer.
#   Returns default if the conversion fails.
#
# email_from(value):
#   Lowercases and strips whitespace from an email string.
#   Returns an empty string if the value is None or blank.

import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from db import to_int, email_from


# ─────────────────────────────────────────────────────────────
# TO_INT — HAPPY PATH
# ─────────────────────────────────────────────────────────────

def test_happy_integer_returned_unchanged():
    result = to_int(5)
    assert result == 5

def test_happy_string_number_converted_to_int():
    result = to_int("42")
    assert result == 42

def test_happy_float_truncated_to_int():
    result = to_int(3.9)
    assert result == 3


# ─────────────────────────────────────────────────────────────
# TO_INT — BOUNDARY CASES
# ─────────────────────────────────────────────────────────────

def test_boundary_zero_returns_zero():
    result = to_int(0)
    assert result == 0

def test_boundary_negative_number_returned():
    result = to_int(-10)
    assert result == -10

def test_boundary_string_zero_converted():
    result = to_int("0")
    assert result == 0

def test_boundary_custom_default_returned_on_failure():
    result = to_int(None, 99)
    assert result == 99


# ─────────────────────────────────────────────────────────────
# TO_INT — INVALID INPUT
# ─────────────────────────────────────────────────────────────

def test_invalid_none_returns_default_zero():
    result = to_int(None)
    assert result == 0

def test_invalid_empty_string_returns_default():
    result = to_int("")
    assert result == 0

def test_invalid_non_numeric_string_returns_default():
    result = to_int("abc")
    assert result == 0

def test_invalid_list_returns_default():
    result = to_int([1, 2, 3])
    assert result == 0

def test_invalid_dict_returns_default():
    result = to_int({"xp": 100})
    assert result == 0


# ─────────────────────────────────────────────────────────────
# EMAIL_FROM — HAPPY PATH
# ─────────────────────────────────────────────────────────────

def test_happy_uppercase_email_lowercased():
    result = email_from("USER@EXAMPLE.COM")
    assert result == "user@example.com"

def test_happy_whitespace_stripped():
    result = email_from("  user@example.com  ")
    assert result == "user@example.com"

def test_happy_already_lowercase_unchanged():
    result = email_from("student@tud.ie")
    assert result == "student@tud.ie"


# ─────────────────────────────────────────────────────────────
# EMAIL_FROM — BOUNDARY CASES
# ─────────────────────────────────────────────────────────────

def test_boundary_mixed_case_and_spaces_cleaned():
    result = email_from("  JAMIE@TUD.IE  ")
    assert result == "jamie@tud.ie"

def test_boundary_single_character_lowercased():
    result = email_from("A")
    assert result == "a"


# ─────────────────────────────────────────────────────────────
# EMAIL_FROM — INVALID INPUT
# ─────────────────────────────────────────────────────────────

def test_invalid_none_returns_empty_string():
    result = email_from(None)
    assert result == ""

def test_invalid_empty_string_returns_empty_string():
    result = email_from("")
    assert result == ""

def test_invalid_whitespace_only_returns_empty_string():
    result = email_from("   ")
    assert result == ""
