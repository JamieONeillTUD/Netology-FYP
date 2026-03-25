# test_utils.py — Unit tests for pure utility functions in db.py.

import pytest
from db import to_int, email_from


class TestToInt:
    def test_integer_input(self):
        assert to_int(5) == 5

    def test_string_integer(self):
        assert to_int("42") == 42

    def test_invalid_string_returns_default(self):
        assert to_int("abc") == 0

    def test_none_returns_default(self):
        assert to_int(None) == 0

    def test_custom_default_on_failure(self):
        assert to_int("abc", 99) == 99

    def test_float_truncates(self):
        assert to_int(3.9) == 3

    def test_negative_value(self):
        assert to_int(-5) == -5

    def test_zero(self):
        assert to_int(0) == 0

    def test_string_zero(self):
        assert to_int("0") == 0

    def test_empty_string_returns_default(self):
        assert to_int("") == 0


class TestEmailFrom:
    def test_lowercases_email(self):
        assert email_from("USER@EXAMPLE.COM") == "user@example.com"

    def test_strips_leading_whitespace(self):
        assert email_from("  user@example.com") == "user@example.com"

    def test_strips_trailing_whitespace(self):
        assert email_from("user@example.com  ") == "user@example.com"

    def test_strips_both_sides(self):
        assert email_from("  USER@EXAMPLE.COM  ") == "user@example.com"

    def test_none_returns_empty_string(self):
        assert email_from(None) == ""

    def test_empty_string_returns_empty_string(self):
        assert email_from("") == ""

    def test_already_lowercase_unchanged(self):
        assert email_from("user@example.com") == "user@example.com"
