"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

test_xp.py - XP and Level Tests
---
This file checks the XP progression helpers and the award-xp route.

It covers:
  1. Level calculation from XP.
  2. Rank labels for each level.
  3. Validation in add_xp_to_user().
  4. The /award-xp API route and database writes.

"""

import pytest

from xp_system import add_xp_to_user, get_level_progress, rank_for_level


# get_level_progress()

def test_xp_zero_is_level_one():
    level, _, _ = get_level_progress(0)
    assert level == 1


def test_xp_150_is_level_two():
    level, _, _ = get_level_progress(150)
    assert level == 2


def test_xp_450_is_level_three():
    level, _, _ = get_level_progress(450)
    assert level == 3


def test_xp_1250_is_level_five():
    level, _, _ = get_level_progress(1250)
    assert level == 5


def test_xp_150_returns_50_into_level():
    _, xp_into_level, _ = get_level_progress(150)
    assert xp_into_level == 50


def test_xp_99_is_level_one():
    level, _, _ = get_level_progress(99)
    assert level == 1


def test_xp_100_is_level_two():
    level, _, _ = get_level_progress(100)
    assert level == 2


def test_xp_299_is_level_two():
    level, _, _ = get_level_progress(299)
    assert level == 2


def test_xp_300_is_level_three():
    level, _, _ = get_level_progress(300)
    assert level == 3


def test_xp_999_is_level_four():
    level, _, _ = get_level_progress(999)
    assert level == 4


def test_xp_1000_is_level_five():
    level, _, _ = get_level_progress(1000)
    assert level == 5


def test_large_xp_still_works():
    level, _, _ = get_level_progress(999999)
    assert level >= 5


def test_none_xp_is_zero():
    level, _, _ = get_level_progress(None)
    assert level == 1


def test_negative_xp_is_zero():
    level, _, _ = get_level_progress(-100)
    assert level == 1


def test_string_xp_is_allowed():
    level, _, _ = get_level_progress("300")
    assert level == 3


# rank_for_level()

def test_level_one_is_novice():
    assert rank_for_level(1) == "Novice"


def test_level_two_is_novice():
    assert rank_for_level(2) == "Novice"


def test_level_three_is_intermediate():
    assert rank_for_level(3) == "Intermediate"


def test_level_four_is_intermediate():
    assert rank_for_level(4) == "Intermediate"


def test_level_five_is_advanced():
    assert rank_for_level(5) == "Advanced"


def test_level_ten_is_advanced():
    assert rank_for_level(10) == "Advanced"


# add_xp_to_user()

def test_add_xp_empty_email_returns_zero():
    assert add_xp_to_user("", 100) == (0, 1)


def test_add_xp_zero_amount_returns_zero():
    assert add_xp_to_user("user@test.com", 0) == (0, 1)


def test_add_xp_negative_amount_returns_zero():
    assert add_xp_to_user("user@test.com", -50) == (0, 1)


def test_add_xp_none_amount_returns_zero():
    assert add_xp_to_user("user@test.com", None) == (0, 1)


# POST /award-xp

def test_award_xp_ok(integration_client, make_user):
    make_user("xp_api@test.com")
    resp = integration_client.post(
        "/award-xp",
        json={"email": "xp_api@test.com", "action": "Lesson Completed", "xp": 50},
    )
    assert resp.status_code == 200


def test_award_xp_missing_email(integration_client):
    resp = integration_client.post("/award-xp", json={"action": "Lesson Completed", "xp": 50})
    assert resp.status_code == 400


def test_award_xp_zero_xp(integration_client):
    resp = integration_client.post("/award-xp", json={"email": "user@test.com", "action": "test", "xp": 0})
    assert resp.status_code == 400


def test_award_xp_missing_action(integration_client):
    resp = integration_client.post("/award-xp", json={"email": "user@test.com", "xp": 50})
    assert resp.status_code == 400


# Real database checks

@pytest.mark.integration
def test_add_xp_updates_user_xp(make_user, db):
    make_user("xp@test.com", xp=0)
    add_xp_to_user("xp@test.com", 150)
    row = db.execute("SELECT xp FROM users WHERE email = 'xp@test.com'").fetchone()
    assert row[0] == 150


@pytest.mark.integration
def test_add_xp_returns_new_level(make_user):
    make_user("xp2@test.com", xp=0)
    xp_added, new_level = add_xp_to_user("xp2@test.com", 150)
    assert xp_added == 150
    assert new_level == 2


@pytest.mark.integration
def test_add_xp_writes_log_row(make_user, db):
    make_user("xp3@test.com")
    add_xp_to_user("xp3@test.com", 50, action="Lesson Completed")
    count = db.execute("SELECT COUNT(*) FROM xp_log WHERE user_email = 'xp3@test.com'").fetchone()[0]
    assert count == 1


@pytest.mark.integration
def test_add_xp_updates_level_and_rank(make_user, db):
    make_user("xp4@test.com", xp=0)
    add_xp_to_user("xp4@test.com", 300)
    row = db.execute("SELECT numeric_level, level FROM users WHERE email = 'xp4@test.com'").fetchone()
    assert row[0] == 3
    assert row[1] == "Intermediate"


@pytest.mark.integration
def test_add_xp_unknown_user_returns_zero(clean_db):
    xp_added, level = add_xp_to_user("nobody@test.com", 100)
    assert xp_added == 0
    assert level == 1
