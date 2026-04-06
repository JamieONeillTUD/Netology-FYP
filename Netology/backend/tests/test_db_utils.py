# test_db_utils.py
# Unit tests for the shared helper functions in db.py
#
# Functional Requirement: FR00 — Shared Utility Helpers
# Functions under test: to_int(), email_from()
# Test Type: Unit Tests (pure functions — no database, no HTTP needed)

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from db import to_int, email_from


# ─────────────────────────────────────────────────────────────
# to_int() — safely converts a value to an integer
# ─────────────────────────────────────────────────────────────

# Happy path

def test_to_int_converts_a_normal_integer():
    result = to_int(42)
    assert result == 42

def test_to_int_converts_a_number_string():
    result = to_int('7')
    assert result == 7

def test_to_int_truncates_a_float():
    result = to_int(3.9)
    assert result == 3

# Boundary cases

def test_to_int_zero_is_preserved():
    result = to_int(0)
    assert result == 0

def test_to_int_negative_number_is_preserved():
    result = to_int(-5)
    assert result == -5

def test_to_int_uses_custom_default_when_conversion_fails():
    result = to_int('not_a_number', 99)
    assert result == 99

# Invalid input

def test_to_int_none_returns_zero():
    result = to_int(None)
    assert result == 0

def test_to_int_empty_string_returns_zero():
    result = to_int('')
    assert result == 0

def test_to_int_letters_return_zero():
    result = to_int('abc')
    assert result == 0

def test_to_int_list_returns_zero():
    result = to_int([1, 2, 3])
    assert result == 0


# ─────────────────────────────────────────────────────────────
# email_from() — normalises an email to lowercase with no whitespace
# ─────────────────────────────────────────────────────────────

# Happy path

def test_email_from_converts_uppercase_to_lowercase():
    result = email_from('TEST@EXAMPLE.COM')
    assert result == 'test@example.com'

def test_email_from_strips_surrounding_whitespace():
    result = email_from('  user@test.com ')
    assert result == 'user@test.com'

def test_email_from_leaves_clean_email_unchanged():
    result = email_from('alice@example.com')
    assert result == 'alice@example.com'

# Boundary cases

def test_email_from_handles_mixed_case_and_spaces_together():
    result = email_from('  ALICE@TEST.COM  ')
    assert result == 'alice@test.com'

# Invalid input

def test_email_from_none_returns_empty_string():
    result = email_from(None)
    assert result == ''

def test_email_from_empty_string_returns_empty_string():
    result = email_from('')
    assert result == ''

def test_email_from_whitespace_only_returns_empty_string():
    result = email_from('   ')
    assert result == ''
