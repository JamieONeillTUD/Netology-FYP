# test_xp_system.py — Unit tests for XP calculation and rank logic.
#
# XP thresholds (cumulative):
#   Level 1:  0  – 99   XP  (needs 100 to advance)
#   Level 2: 100 – 299  XP  (needs 200 to advance)
#   Level 3: 300 – 599  XP  (needs 300 to advance)
#   Level 4: 600 – 999  XP  (needs 400 to advance)
#   Level 5: 1000+      XP  (needs 500 to advance)
#
# Ranks:
#   Levels 1–2  → Novice
#   Levels 3–4  → Intermediate
#   Level  5+   → Advanced

import pytest
from xp_system import get_level_progress, rank_for_level


class TestGetLevelProgress:
    # ── Boundary: Level 1 ────────────────────────────────────────────────────

    def test_zero_xp_is_level_1(self):
        level, xp_into, needed = get_level_progress(0)
        assert level == 1
        assert xp_into == 0
        assert needed == 100

    def test_99_xp_still_level_1(self):
        level, xp_into, needed = get_level_progress(99)
        assert level == 1
        assert xp_into == 99
        assert needed == 100

    # ── Boundary: Level 2 ────────────────────────────────────────────────────

    def test_100_xp_reaches_level_2(self):
        level, xp_into, needed = get_level_progress(100)
        assert level == 2
        assert xp_into == 0
        assert needed == 200

    def test_150_xp_is_mid_level_2(self):
        level, xp_into, needed = get_level_progress(150)
        assert level == 2
        assert xp_into == 50
        assert needed == 200

    def test_299_xp_still_level_2(self):
        level, xp_into, needed = get_level_progress(299)
        assert level == 2
        assert xp_into == 199
        assert needed == 200

    # ── Boundary: Level 3 ────────────────────────────────────────────────────

    def test_300_xp_reaches_level_3(self):
        level, xp_into, needed = get_level_progress(300)
        assert level == 3
        assert xp_into == 0
        assert needed == 300

    def test_599_xp_still_level_3(self):
        level, xp_into, needed = get_level_progress(599)
        assert level == 3
        assert xp_into == 299
        assert needed == 300

    # ── Boundary: Level 4 ────────────────────────────────────────────────────

    def test_600_xp_reaches_level_4(self):
        level, xp_into, needed = get_level_progress(600)
        assert level == 4
        assert xp_into == 0
        assert needed == 400

    # ── Boundary: Level 5 ────────────────────────────────────────────────────

    def test_1000_xp_reaches_level_5(self):
        level, xp_into, needed = get_level_progress(1000)
        assert level == 5
        assert xp_into == 0
        assert needed == 500

    # ── Edge cases ───────────────────────────────────────────────────────────

    def test_negative_xp_treated_as_zero(self):
        level, xp_into, needed = get_level_progress(-100)
        assert level == 1
        assert xp_into == 0

    def test_none_treated_as_zero(self):
        level, xp_into, needed = get_level_progress(None)
        assert level == 1
        assert xp_into == 0

    def test_string_xp_coerced(self):
        level, xp_into, needed = get_level_progress("100")
        assert level == 2

    def test_large_xp_returns_high_level(self):
        level, _, _ = get_level_progress(10000)
        assert level > 5


class TestRankForLevel:
    def test_level_1_is_novice(self):
        assert rank_for_level(1) == "Novice"

    def test_level_2_is_novice(self):
        assert rank_for_level(2) == "Novice"

    def test_level_3_is_intermediate(self):
        assert rank_for_level(3) == "Intermediate"

    def test_level_4_is_intermediate(self):
        assert rank_for_level(4) == "Intermediate"

    def test_level_5_is_advanced(self):
        assert rank_for_level(5) == "Advanced"

    def test_level_10_is_advanced(self):
        assert rank_for_level(10) == "Advanced"

    def test_rank_and_level_consistent_at_boundary_100xp(self):
        # 100 XP → level 2 → Novice
        level, _, _ = get_level_progress(100)
        assert rank_for_level(level) == "Novice"

    def test_rank_and_level_consistent_at_boundary_300xp(self):
        # 300 XP → level 3 → Intermediate
        level, _, _ = get_level_progress(300)
        assert rank_for_level(level) == "Intermediate"

    def test_rank_and_level_consistent_at_boundary_1000xp(self):
        # 1000 XP → level 5 → Advanced
        level, _, _ = get_level_progress(1000)
        assert rank_for_level(level) == "Advanced"
