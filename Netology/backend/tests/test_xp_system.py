# test_xp_system.py
# Tests for xp_system.py — XP level calculation and rank assignment.
#
# Functional Requirement: F08 — Gamification System
# Functions under test: get_level_progress(), rank_for_level()
#
# XP thresholds (cumulative):
#   Level 1:  0–99 XP
#   Level 2:  100–299 XP
#   Level 3:  300–599 XP
#   Level 4:  600–999 XP
#   Level 5:  1000+ XP
#
# Ranks:
#   Levels 1–2  → Novice
#   Levels 3–4  → Intermediate
#   Level  5+   → Advanced

import pytest
import sys
import os
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from xp_system import get_level_progress, rank_for_level, add_xp_to_user


# ─────────────────────────────────────────────────────────────
# HAPPY PATH — normal mid-level values work as expected
# ─────────────────────────────────────────────────────────────

def test_happy_zero_xp_is_level_1():
    level, xp_into, needed = get_level_progress(0)
    assert level == 1

def test_happy_mid_level_2_xp():
    # 150 XP is halfway through Level 2
    level, xp_into, needed = get_level_progress(150)
    assert level == 2
    assert xp_into == 50
    assert needed == 200

def test_happy_mid_level_3_xp():
    # 450 XP is halfway through Level 3
    level, xp_into, needed = get_level_progress(450)
    assert level == 3

def test_happy_level_5_mid():
    # 1250 XP is well into Level 5
    level, _, _ = get_level_progress(1250)
    assert level == 5


# ─────────────────────────────────────────────────────────────
# BOUNDARY CASES — exact edges where the level flips
# ─────────────────────────────────────────────────────────────

def test_boundary_99_xp_still_level_1():
    # One XP below the Level 2 threshold
    level, xp_into, needed = get_level_progress(99)
    assert level == 1
    assert xp_into == 99
    assert needed == 100

def test_boundary_100_xp_reaches_level_2():
    # Exactly at the Level 2 threshold
    level, xp_into, needed = get_level_progress(100)
    assert level == 2
    assert xp_into == 0
    assert needed == 200

def test_boundary_299_xp_still_level_2():
    level, xp_into, needed = get_level_progress(299)
    assert level == 2
    assert xp_into == 199
    assert needed == 200

def test_boundary_300_xp_reaches_level_3():
    level, xp_into, needed = get_level_progress(300)
    assert level == 3
    assert xp_into == 0
    assert needed == 300

def test_boundary_599_xp_still_level_3():
    level, xp_into, needed = get_level_progress(599)
    assert level == 3
    assert xp_into == 299
    assert needed == 300

def test_boundary_600_xp_reaches_level_4():
    level, xp_into, needed = get_level_progress(600)
    assert level == 4
    assert xp_into == 0
    assert needed == 400

def test_boundary_999_xp_still_level_4():
    level, xp_into, needed = get_level_progress(999)
    assert level == 4
    assert xp_into == 399
    assert needed == 400

def test_boundary_1000_xp_reaches_level_5():
    level, xp_into, needed = get_level_progress(1000)
    assert level == 5
    assert xp_into == 0
    assert needed == 500


# ─────────────────────────────────────────────────────────────
# EDGE CASES — extreme but valid inputs
# ─────────────────────────────────────────────────────────────

def test_edge_very_large_xp_does_not_crash():
    # A user with 10,000 XP should return a level above 5 without crashing
    level, _, _ = get_level_progress(10000)
    assert level > 5

def test_edge_exactly_zero_xp():
    level, xp_into, needed = get_level_progress(0)
    assert level == 1
    assert xp_into == 0
    assert needed == 100


# ─────────────────────────────────────────────────────────────
# INVALID INPUT — bad data the function must survive
# ─────────────────────────────────────────────────────────────

def test_invalid_none_treated_as_zero():
    # DB can return NULL — must not crash
    level, xp_into, _ = get_level_progress(None)
    assert level == 1
    assert xp_into == 0

def test_invalid_negative_xp_treated_as_zero():
    level, xp_into, _ = get_level_progress(-100)
    assert level == 1
    assert xp_into == 0

def test_invalid_string_number_coerced():
    # "300" should be treated as 300 XP → Level 3
    level, _, _ = get_level_progress("300")
    assert level == 3


# ─────────────────────────────────────────────────────────────
# RANK CONSISTENCY — rank and XP level agree end-to-end (F08)
# Tests both get_level_progress() and rank_for_level() together
# ─────────────────────────────────────────────────────────────

def test_rank_consistency_0_xp_is_novice():
    level, _, _ = get_level_progress(0)
    assert rank_for_level(level) == "Novice"

def test_rank_consistency_100_xp_still_novice():
    # Level 2 → still Novice
    level, _, _ = get_level_progress(100)
    assert rank_for_level(level) == "Novice"

def test_rank_consistency_300_xp_becomes_intermediate():
    # 300 XP crosses into Level 3 → Intermediate
    level, _, _ = get_level_progress(300)
    assert rank_for_level(level) == "Intermediate"

def test_rank_consistency_600_xp_still_intermediate():
    # Level 4 → still Intermediate
    level, _, _ = get_level_progress(600)
    assert rank_for_level(level) == "Intermediate"

def test_rank_consistency_1000_xp_becomes_advanced():
    # 1000 XP crosses into Level 5 → Advanced
    level, _, _ = get_level_progress(1000)
    assert rank_for_level(level) == "Advanced"


# ─────────────────────────────────────────────────────────────
# ADD_XP_TO_USER — HAPPY PATH (mock database)
# ─────────────────────────────────────────────────────────────

def test_add_xp_success_returns_amount_added():
    conn = MagicMock()
    cur  = MagicMock()
    conn.cursor.return_value = cur
    cur.fetchone.return_value = (500,)  # new total XP after update
    with patch('xp_system.get_db_connection', return_value=conn):
        xp_added, new_level = add_xp_to_user("test@test.com", 100)
    assert xp_added == 100

def test_add_xp_success_returns_correct_level():
    conn = MagicMock()
    cur  = MagicMock()
    conn.cursor.return_value = cur
    cur.fetchone.return_value = (300,)  # 300 XP → Level 3
    with patch('xp_system.get_db_connection', return_value=conn):
        xp_added, new_level = add_xp_to_user("test@test.com", 50)
    assert new_level == 3


# ─────────────────────────────────────────────────────────────
# ADD_XP_TO_USER — BOUNDARY CASES
# ─────────────────────────────────────────────────────────────

def test_add_xp_user_not_found_returns_zero():
    conn = MagicMock()
    cur  = MagicMock()
    conn.cursor.return_value = cur
    cur.fetchone.return_value = None  # UPDATE returned no row — user not in DB
    with patch('xp_system.get_db_connection', return_value=conn):
        xp_added, new_level = add_xp_to_user("nobody@test.com", 100)
    assert xp_added == 0
    assert new_level == 1


# ─────────────────────────────────────────────────────────────
# ADD_XP_TO_USER — INVALID INPUT (no database needed)
# ─────────────────────────────────────────────────────────────

def test_add_xp_empty_email_returns_zero_without_db():
    xp_added, new_level = add_xp_to_user("", 100)
    assert xp_added == 0
    assert new_level == 1

def test_add_xp_zero_amount_returns_zero_without_db():
    xp_added, new_level = add_xp_to_user("test@test.com", 0)
    assert xp_added == 0

def test_add_xp_negative_amount_returns_zero_without_db():
    xp_added, new_level = add_xp_to_user("test@test.com", -50)
    assert xp_added == 0

def test_add_xp_none_amount_returns_zero_without_db():
    xp_added, new_level = add_xp_to_user("test@test.com", None)
    assert xp_added == 0
