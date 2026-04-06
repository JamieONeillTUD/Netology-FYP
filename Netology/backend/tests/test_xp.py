# test_xp.py
# Tests for the XP and level progression system (xp_system.py)
#
# Functional Requirement: FR08 — Gamification System (XP and Levels)
# Functions under test: get_level_progress(), rank_for_level(), add_xp_to_user()
# Routes under test: POST /award-xp
#
# XP thresholds:
#   Level 1:  0 – 99 XP     → Novice
#   Level 2:  100 – 299 XP  → Novice
#   Level 3:  300 – 599 XP  → Intermediate
#   Level 4:  600 – 999 XP  → Intermediate
#   Level 5:  1000+ XP      → Advanced
#
# ── Test Types ────────────────────────────────────────────────
#   UNIT TESTS        — pure function tests, no database needed
#   API TESTS         — HTTP endpoint tests, real database
#   INTEGRATION TESTS — real PostgreSQL, calls functions directly

import pytest
import json
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from xp_system import get_level_progress, rank_for_level, add_xp_to_user


# ─────────────────────────────────────────────────────────────
# UNIT TESTS — get_level_progress()
# ─────────────────────────────────────────────────────────────

# Happy path

def test_zero_xp_is_level_one():
    level, xp_into_level, xp_needed = get_level_progress(0)
    assert level == 1

def test_150_xp_is_level_two():
    level, xp_into_level, xp_needed = get_level_progress(150)
    assert level == 2

def test_450_xp_is_level_three():
    level, xp_into_level, xp_needed = get_level_progress(450)
    assert level == 3

def test_1250_xp_is_level_five():
    level, xp_into_level, xp_needed = get_level_progress(1250)
    assert level == 5

def test_returns_correct_xp_into_current_level():
    # 150 XP = level 2, and 50 XP into that level (100 spent reaching level 2)
    level, xp_into_level, xp_needed = get_level_progress(150)
    assert xp_into_level == 50

# Boundary cases — exact points where the level changes

def test_99_xp_is_still_level_one():
    level, _, _ = get_level_progress(99)
    assert level == 1

def test_100_xp_reaches_level_two():
    level, _, _ = get_level_progress(100)
    assert level == 2

def test_299_xp_is_still_level_two():
    level, _, _ = get_level_progress(299)
    assert level == 2

def test_300_xp_reaches_level_three():
    level, _, _ = get_level_progress(300)
    assert level == 3

def test_999_xp_is_still_level_four():
    level, _, _ = get_level_progress(999)
    assert level == 4

def test_1000_xp_reaches_level_five():
    level, _, _ = get_level_progress(1000)
    assert level == 5

# Edge and invalid input

def test_very_large_xp_does_not_crash():
    level, _, _ = get_level_progress(999999)
    assert level >= 5

def test_none_xp_is_treated_as_zero():
    level, _, _ = get_level_progress(None)
    assert level == 1

def test_negative_xp_is_treated_as_zero():
    level, _, _ = get_level_progress(-100)
    assert level == 1

def test_xp_as_string_is_accepted():
    # The function should coerce string numbers, e.g. from form data
    level, _, _ = get_level_progress('300')
    assert level == 3


# ─────────────────────────────────────────────────────────────
# UNIT TESTS — rank_for_level()
# ─────────────────────────────────────────────────────────────

def test_level_1_is_novice():
    assert rank_for_level(1) == 'Novice'

def test_level_2_is_novice():
    assert rank_for_level(2) == 'Novice'

def test_level_3_is_intermediate():
    assert rank_for_level(3) == 'Intermediate'

def test_level_4_is_intermediate():
    assert rank_for_level(4) == 'Intermediate'

def test_level_5_is_advanced():
    assert rank_for_level(5) == 'Advanced'

def test_level_10_is_advanced():
    assert rank_for_level(10) == 'Advanced'


# ─────────────────────────────────────────────────────────────
# UNIT TESTS — add_xp_to_user() input validation (no DB needed)
# ─────────────────────────────────────────────────────────────

def test_empty_email_returns_zero_without_hitting_database():
    result = add_xp_to_user('', 100)
    assert result == (0, 1)

def test_zero_amount_returns_zero_without_hitting_database():
    result = add_xp_to_user('user@test.com', 0)
    assert result == (0, 1)

def test_negative_amount_returns_zero_without_hitting_database():
    result = add_xp_to_user('user@test.com', -50)
    assert result == (0, 1)

def test_none_amount_returns_zero_without_hitting_database():
    result = add_xp_to_user('user@test.com', None)
    assert result == (0, 1)


# ─────────────────────────────────────────────────────────────
# API TESTS — POST /award-xp   (real database)
# ─────────────────────────────────────────────────────────────

# Happy path

def test_award_xp_valid_request_returns_200(integration_client, make_user):
    make_user('xp_api@test.com')
    resp = integration_client.post('/award-xp', json={
        'email': 'xp_api@test.com',
        'action': 'Lesson Completed',
        'xp': 50
    })
    assert resp.status_code == 200

# Invalid input

def test_award_xp_missing_email_returns_400(integration_client):
    resp = integration_client.post('/award-xp', json={'action': 'Lesson Completed', 'xp': 50})
    assert resp.status_code == 400

def test_award_xp_zero_xp_returns_400(integration_client):
    resp = integration_client.post('/award-xp', json={'email': 'user@test.com', 'action': 'test', 'xp': 0})
    assert resp.status_code == 400

def test_award_xp_missing_action_returns_400(integration_client):
    resp = integration_client.post('/award-xp', json={'email': 'user@test.com', 'xp': 50})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# INTEGRATION TESTS — add_xp_to_user() with a real database
# ─────────────────────────────────────────────────────────────

# Happy path

@pytest.mark.integration
def test_add_xp_updates_the_users_xp_in_the_database(make_user, db):
    make_user('xp@test.com', xp=0)
    add_xp_to_user('xp@test.com', 150)
    row = db.execute("SELECT xp FROM users WHERE email = 'xp@test.com'").fetchone()
    assert row[0] == 150

@pytest.mark.integration
def test_add_xp_returns_the_correct_new_level(make_user):
    # 150 XP pushes a level-1 user to level 2
    make_user('xp2@test.com', xp=0)
    xp_added, new_level = add_xp_to_user('xp2@test.com', 150)
    assert xp_added == 150
    assert new_level == 2

@pytest.mark.integration
def test_add_xp_creates_a_record_in_the_xp_log_table(make_user, db):
    make_user('xp3@test.com')
    add_xp_to_user('xp3@test.com', 50, action='Lesson Completed')
    count = db.execute(
        "SELECT COUNT(*) FROM xp_log WHERE user_email = 'xp3@test.com'"
    ).fetchone()[0]
    assert count == 1

@pytest.mark.integration
def test_add_xp_updates_the_level_and_rank_columns_on_the_users_row(make_user, db):
    # 300 XP should set numeric_level = 3 and level = 'Intermediate'
    make_user('xp4@test.com', xp=0)
    add_xp_to_user('xp4@test.com', 300)
    row = db.execute(
        "SELECT numeric_level, level FROM users WHERE email = 'xp4@test.com'"
    ).fetchone()
    assert row[0] == 3
    assert row[1] == 'Intermediate'

# Edge case

@pytest.mark.integration
def test_add_xp_for_unknown_user_returns_zero_and_does_not_crash(clean_db):
    xp_added, level = add_xp_to_user('nobody@test.com', 100)
    assert xp_added == 0
    assert level == 1
