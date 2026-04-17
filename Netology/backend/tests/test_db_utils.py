"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

test_db_utils.py - Shared Database Helper Tests
---
This file checks the small helper functions in db.py.

It covers:
  1. Converting values to integers safely.
  2. Cleaning email values for database use.

These are simple pure-function tests, so they do not need a database.
"""

from db import email_from, to_int


# to_int()

def test_to_int_with_number():
    assert to_int(42) == 42


def test_to_int_with_string():
    assert to_int("7") == 7


def test_to_int_with_float():
    assert to_int(3.9) == 3


def test_to_int_with_zero():
    assert to_int(0) == 0


def test_to_int_with_negative():
    assert to_int(-5) == -5


def test_to_int_with_custom_default():
    assert to_int("not_a_number", 99) == 99


def test_to_int_with_none():
    assert to_int(None) == 0


def test_to_int_with_empty_string():
    assert to_int("") == 0


def test_to_int_with_letters():
    assert to_int("abc") == 0


def test_to_int_with_list():
    assert to_int([1, 2, 3]) == 0


# email_from()

def test_email_from_lowercases_email():
    assert email_from("TEST@EXAMPLE.COM") == "test@example.com"


def test_email_from_strips_spaces():
    assert email_from("  user@test.com ") == "user@test.com"


def test_email_from_keeps_clean_email():
    assert email_from("alice@example.com") == "alice@example.com"


def test_email_from_handles_spaces_and_case():
    assert email_from("  ALICE@TEST.COM  ") == "alice@test.com"


def test_email_from_with_none():
    assert email_from(None) == ""


def test_email_from_with_empty_string():
    assert email_from("") == ""


def test_email_from_with_whitespace():
    assert email_from("   ") == ""
