"""
test_helpers.py – Unit tests for input validation and helper functions.

Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4

These are pure unit tests — they test Python logic only.
No database connection or Flask server is required.

Functions under test:
  From auth_routes.py:
    - _norm_email(email)         → normalised email string
    - _is_valid_email(email)     → True/False
    - _clean_start_level(level)  → "novice" / "intermediate" / "advanced"

  From course_routes.py:
    - _coerce_xp(value, fallback, max_xp=None) → safe integer XP value
"""

import pytest

# Import the private helper functions directly from their modules.
# These are module-level functions (not class methods) so we can import them.
from auth_routes import _norm_email, _is_valid_email, _clean_start_level
from course_routes import _coerce_xp


# =========================================================
# Tests for _norm_email()
# =========================================================

class TestNormEmail:
    """Tests for _norm_email() — lowercase and strip whitespace."""

    def test_already_lowercase(self):
        assert _norm_email("user@example.com") == "user@example.com"

    def test_uppercase_is_lowercased(self):
        assert _norm_email("USER@EXAMPLE.COM") == "user@example.com"

    def test_mixed_case_is_lowercased(self):
        assert _norm_email("User@Example.Com") == "user@example.com"

    def test_leading_whitespace_stripped(self):
        assert _norm_email("  user@example.com") == "user@example.com"

    def test_trailing_whitespace_stripped(self):
        assert _norm_email("user@example.com  ") == "user@example.com"

    def test_both_sides_stripped(self):
        assert _norm_email("  User@Example.Com  ") == "user@example.com"

    def test_empty_string_returns_empty(self):
        assert _norm_email("") == ""

    def test_none_returns_empty(self):
        """None input should be treated as empty string (not crash)."""
        assert _norm_email(None) == ""

    def test_returns_string(self):
        assert isinstance(_norm_email("test@test.com"), str)


# =========================================================
# Tests for _is_valid_email()
# =========================================================

class TestIsValidEmail:
    """Tests for _is_valid_email() — basic format validation."""

    # --- Valid emails ---
    def test_standard_email_is_valid(self):
        assert _is_valid_email("user@example.com") is True

    def test_email_with_subdomain_is_valid(self):
        assert _is_valid_email("user@mail.example.co.uk") is True

    def test_email_with_dots_in_local_part(self):
        assert _is_valid_email("first.last@example.com") is True

    def test_email_with_plus_in_local_part(self):
        assert _is_valid_email("user+tag@example.com") is True

    def test_email_with_numbers_is_valid(self):
        assert _is_valid_email("c22320301@mytudublin.ie") is True

    # --- Invalid emails ---
    def test_missing_at_symbol_is_invalid(self):
        assert _is_valid_email("userexample.com") is False

    def test_missing_domain_is_invalid(self):
        assert _is_valid_email("user@") is False

    def test_missing_tld_is_invalid(self):
        """Domain with no TLD (e.g. 'example' not 'example.com') is invalid."""
        assert _is_valid_email("user@example") is False

    def test_space_in_email_is_invalid(self):
        assert _is_valid_email("user @example.com") is False

    def test_empty_string_is_invalid(self):
        assert _is_valid_email("") is False

    def test_none_is_invalid(self):
        """None should not crash — it should return False."""
        assert _is_valid_email(None) is False

    def test_just_at_symbol_is_invalid(self):
        assert _is_valid_email("@") is False

    def test_returns_bool(self):
        assert isinstance(_is_valid_email("user@example.com"), bool)


# =========================================================
# Tests for _clean_start_level()
# =========================================================

class TestCleanStartLevel:
    """Tests for _clean_start_level() — validates the user's starting level choice."""

    # --- Valid inputs ---
    def test_novice_lowercase(self):
        assert _clean_start_level("novice") == "novice"

    def test_intermediate_lowercase(self):
        assert _clean_start_level("intermediate") == "intermediate"

    def test_advanced_lowercase(self):
        assert _clean_start_level("advanced") == "advanced"

    def test_novice_uppercase_is_accepted(self):
        """Input is case-insensitive — 'NOVICE' should work."""
        assert _clean_start_level("NOVICE") == "novice"

    def test_intermediate_mixed_case_is_accepted(self):
        assert _clean_start_level("Intermediate") == "intermediate"

    def test_advanced_uppercase_is_accepted(self):
        assert _clean_start_level("ADVANCED") == "advanced"

    def test_whitespace_around_value_is_stripped(self):
        assert _clean_start_level("  novice  ") == "novice"

    # --- Invalid inputs fall back to "novice" ---
    def test_empty_string_defaults_to_novice(self):
        assert _clean_start_level("") == "novice"

    def test_none_defaults_to_novice(self):
        assert _clean_start_level(None) == "novice"

    def test_random_string_defaults_to_novice(self):
        assert _clean_start_level("expert") == "novice"

    def test_numeric_string_defaults_to_novice(self):
        assert _clean_start_level("1") == "novice"

    def test_returns_string(self):
        assert isinstance(_clean_start_level("novice"), str)


# =========================================================
# Tests for _coerce_xp()
# =========================================================

class TestCoerceXp:
    """Tests for _coerce_xp() — safely converts XP payloads to integers.

    Signature: _coerce_xp(value, fallback, max_xp=None) -> int

    Rules:
      - Returns int(value) if value is a valid non-negative integer
      - Returns int(fallback) if value is None, negative, or not parseable
      - Caps the result at max_xp if max_xp is provided
    """

    # --- Normal valid inputs ---
    def test_integer_input_returned_as_is(self):
        assert _coerce_xp(50, 0) == 50

    def test_string_integer_is_coerced(self):
        """String "25" should be treated as integer 25."""
        assert _coerce_xp("25", 0) == 25

    def test_zero_is_valid(self):
        assert _coerce_xp(0, 10) == 0

    def test_large_xp_is_valid(self):
        assert _coerce_xp(9999, 0) == 9999

    # --- Fallback cases ---
    def test_none_uses_fallback(self):
        """None value should return the fallback."""
        assert _coerce_xp(None, 50) == 50

    def test_negative_value_uses_fallback(self):
        """Negative XP should not be allowed — use fallback."""
        assert _coerce_xp(-10, 25) == 25

    def test_unparseable_string_uses_fallback(self):
        """A non-numeric string should fall back."""
        assert _coerce_xp("abc", 30) == 30

    def test_empty_string_uses_fallback(self):
        assert _coerce_xp("", 15) == 15

    def test_float_string_uses_fallback(self):
        """'12.5' cannot be parsed as int directly — falls back."""
        assert _coerce_xp("12.5", 10) == 10

    # --- max_xp cap ---
    def test_value_below_max_is_not_capped(self):
        assert _coerce_xp(40, 0, max_xp=100) == 40

    def test_value_at_max_is_not_capped(self):
        assert _coerce_xp(100, 0, max_xp=100) == 100

    def test_value_above_max_is_capped(self):
        """XP above max_xp should be capped at max_xp."""
        assert _coerce_xp(200, 0, max_xp=100) == 100

    def test_fallback_above_max_is_capped(self):
        """Even the fallback should be capped if max_xp is set."""
        assert _coerce_xp(None, 500, max_xp=100) == 100

    def test_no_max_xp_no_cap(self):
        """Without max_xp, large values should pass through."""
        assert _coerce_xp(9999, 0) == 9999

    # --- Return type ---
    def test_always_returns_int(self):
        assert isinstance(_coerce_xp(50, 0), int)
        assert isinstance(_coerce_xp(None, 10), int)
        assert isinstance(_coerce_xp("25", 0), int)
