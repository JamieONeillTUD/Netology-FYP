"""
test_xp_system.py – Unit tests for the XP and level progression system.

Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4

These are pure unit tests — they test Python logic only.
No database connection or Flask server is required.

Functions under test (xp_system.py):
  - rank_for_level(level_num)  → rank string ("Novice" / "Intermediate" / "Advanced")
  - get_level_progress(total_xp) → (level, xp_into_level, next_level_xp)
  - calculate_level(total_xp)  → integer level (wrapper around get_level_progress)

Level progression rules (from xp_system.py):
  - Level 1: starts at 0 XP (needs 100 XP to reach level 2)
  - Level 2: needs 100 XP total (needs 200 more for level 3)
  - Level 3: needs 300 XP total (needs 300 more for level 4)
  - Level 4: needs 600 XP total (needs 400 more for level 5)
  - ...each level requires 100 * level XP to advance

Rank rules:
  - Levels 1-2  → "Novice"
  - Levels 3-4  → "Intermediate"
  - Level 5+    → "Advanced"
"""

import pytest
import sys
import os

# Import the functions we are testing
from xp_system import rank_for_level, get_level_progress, calculate_level


# =========================================================
# Tests for rank_for_level()
# =========================================================

class TestRankForLevel:
    """Tests for the rank_for_level() function."""

    def test_level_1_is_novice(self):
        """Level 1 users should be ranked Novice."""
        assert rank_for_level(1) == "Novice"

    def test_level_2_is_novice(self):
        """Level 2 users should still be ranked Novice."""
        assert rank_for_level(2) == "Novice"

    def test_level_3_is_intermediate(self):
        """Level 3 is the first Intermediate rank."""
        assert rank_for_level(3) == "Intermediate"

    def test_level_4_is_intermediate(self):
        """Level 4 is still Intermediate."""
        assert rank_for_level(4) == "Intermediate"

    def test_level_5_is_advanced(self):
        """Level 5 is the first Advanced rank."""
        assert rank_for_level(5) == "Advanced"

    def test_level_10_is_advanced(self):
        """High levels should still return Advanced."""
        assert rank_for_level(10) == "Advanced"

    def test_level_100_is_advanced(self):
        """Very high levels should still return Advanced."""
        assert rank_for_level(100) == "Advanced"

    def test_returns_string(self):
        """rank_for_level should always return a string."""
        assert isinstance(rank_for_level(1), str)
        assert isinstance(rank_for_level(3), str)
        assert isinstance(rank_for_level(5), str)


# =========================================================
# Tests for get_level_progress()
# =========================================================

class TestGetLevelProgress:
    """Tests for the get_level_progress() function.

    Returns: (level, xp_into_level, next_level_xp)

    XP thresholds:
      0   XP → Level 1 (needs 100 to advance)
      100 XP → Level 2 (needs 200 to advance)
      300 XP → Level 3 (needs 300 to advance)
      600 XP → Level 4 (needs 400 to advance)
      1000 XP → Level 5 (needs 500 to advance)
    """

    def test_zero_xp_is_level_1(self):
        """A brand new user with 0 XP should be Level 1."""
        level, xp_into, next_xp = get_level_progress(0)
        assert level == 1

    def test_zero_xp_progress_values(self):
        """At 0 XP the user is at the very start of level 1."""
        level, xp_into, next_xp = get_level_progress(0)
        assert xp_into == 0     # no progress into level 1 yet
        assert next_xp == 100   # need 100 XP to reach level 2

    def test_99_xp_still_level_1(self):
        """99 XP is one short of level 2 — should still be level 1."""
        level, xp_into, next_xp = get_level_progress(99)
        assert level == 1
        assert xp_into == 99
        assert next_xp == 100

    def test_100_xp_reaches_level_2(self):
        """Exactly 100 XP should push the user to level 2."""
        level, xp_into, next_xp = get_level_progress(100)
        assert level == 2

    def test_100_xp_level_2_progress(self):
        """At exactly 100 XP the user is at the start of level 2."""
        level, xp_into, next_xp = get_level_progress(100)
        assert xp_into == 0     # no progress into level 2 yet
        assert next_xp == 200   # need 200 XP to reach level 3

    def test_150_xp_is_level_2_with_50_into_level(self):
        """150 XP = level 2 with 50 XP progress into it."""
        level, xp_into, next_xp = get_level_progress(150)
        assert level == 2
        assert xp_into == 50
        assert next_xp == 200

    def test_300_xp_reaches_level_3(self):
        """300 XP (100+200) should reach exactly level 3."""
        level, xp_into, next_xp = get_level_progress(300)
        assert level == 3
        assert xp_into == 0
        assert next_xp == 300

    def test_600_xp_reaches_level_4(self):
        """600 XP (100+200+300) should reach exactly level 4."""
        level, xp_into, next_xp = get_level_progress(600)
        assert level == 4
        assert xp_into == 0
        assert next_xp == 400

    def test_1000_xp_reaches_level_5(self):
        """1000 XP (100+200+300+400) should reach exactly level 5."""
        level, xp_into, next_xp = get_level_progress(1000)
        assert level == 5
        assert xp_into == 0
        assert next_xp == 500

    def test_large_xp_returns_valid_tuple(self):
        """Very large XP values should still return a valid 3-tuple."""
        result = get_level_progress(99999)
        assert len(result) == 3
        level, xp_into, next_xp = result
        assert level >= 1
        assert xp_into >= 0
        assert next_xp > 0

    def test_string_xp_is_handled(self):
        """get_level_progress casts its input to int — '200' should work."""
        level, _, _ = get_level_progress("200")
        assert level == 2

    def test_none_xp_treated_as_zero(self):
        """None XP should be treated as 0 (level 1)."""
        level, xp_into, next_xp = get_level_progress(None)
        assert level == 1
        assert xp_into == 0

    def test_xp_into_level_never_exceeds_next_level_xp(self):
        """xp_into_level must always be less than next_level_xp."""
        for xp in [0, 50, 99, 100, 101, 299, 300, 599, 600, 999, 1000, 5000]:
            level, xp_into, next_xp = get_level_progress(xp)
            assert xp_into < next_xp, (
                f"At {xp} total XP: xp_into={xp_into} should be < next_xp={next_xp}"
            )

    def test_level_increases_monotonically_with_xp(self):
        """More XP should never result in a lower level."""
        prev_level = 1
        for xp in range(0, 2000, 25):
            level, _, _ = get_level_progress(xp)
            assert level >= prev_level, f"Level dropped at {xp} XP!"
            prev_level = level


# =========================================================
# Tests for calculate_level()
# =========================================================

class TestCalculateLevel:
    """Tests for the calculate_level() convenience wrapper.

    calculate_level() just calls get_level_progress() and returns the level.
    Tests verify it's consistent with get_level_progress().
    """

    def test_zero_xp_is_level_1(self):
        assert calculate_level(0) == 1

    def test_100_xp_is_level_2(self):
        assert calculate_level(100) == 2

    def test_300_xp_is_level_3(self):
        assert calculate_level(300) == 3

    def test_600_xp_is_level_4(self):
        assert calculate_level(600) == 4

    def test_1000_xp_is_level_5(self):
        assert calculate_level(1000) == 5

    def test_matches_get_level_progress(self):
        """calculate_level must always return the same level as get_level_progress."""
        test_xp_values = [0, 50, 100, 150, 299, 300, 600, 601, 999, 1000, 5000]
        for xp in test_xp_values:
            expected_level, _, _ = get_level_progress(xp)
            actual_level = calculate_level(xp)
            assert actual_level == expected_level, (
                f"At {xp} XP: calculate_level={actual_level}, "
                f"get_level_progress={expected_level}"
            )

    def test_returns_integer(self):
        """calculate_level must return an integer."""
        assert isinstance(calculate_level(0), int)
        assert isinstance(calculate_level(500), int)


# =========================================================
# Tests for rank + level integration
# =========================================================

class TestRankAndLevelIntegration:
    """Cross-function tests that verify rank_for_level and get_level_progress
    work correctly together — the way they are used in the real app."""

    def test_new_user_is_novice(self):
        """A brand new user (0 XP) should be ranked Novice."""
        level, _, _ = get_level_progress(0)
        rank = rank_for_level(level)
        assert rank == "Novice"

    def test_user_at_100_xp_is_novice(self):
        """100 XP puts user at level 2 which is still Novice."""
        level, _, _ = get_level_progress(100)
        rank = rank_for_level(level)
        assert rank == "Novice"

    def test_user_at_300_xp_is_intermediate(self):
        """300 XP puts user at level 3, the first Intermediate rank."""
        level, _, _ = get_level_progress(300)
        rank = rank_for_level(level)
        assert rank == "Intermediate"

    def test_user_at_1000_xp_is_advanced(self):
        """1000 XP puts user at level 5, the first Advanced rank."""
        level, _, _ = get_level_progress(1000)
        rank = rank_for_level(level)
        assert rank == "Advanced"
