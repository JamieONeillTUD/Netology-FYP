# test_course_system.py
# Tests for course_routes.py — course data transformation.
#
# Functional Requirement: F09 — Progress Tracking
# Functions under test: course_row()
#
# course_row(row):
#   Converts a raw 10-column database tuple into a structured course dict.
#   Column order: id, title, description, total_lessons, module_count,
#                 xp_reward, difficulty, category, required_level, estimated_time

import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from course_routes import course_row


# ─────────────────────────────────────────────────────────────
# HAPPY PATH — a normal course row maps correctly
# ─────────────────────────────────────────────────────────────

def test_happy_id_is_mapped():
    row = (1, "Intro to Networking", "Learn the basics", 10, 3, 100, "Beginner", "Networking", 1, "2 hours")
    result = course_row(row)
    assert result["id"] == 1

def test_happy_title_is_mapped():
    row = (1, "Intro to Networking", "Learn the basics", 10, 3, 100, "Beginner", "Networking", 1, "2 hours")
    result = course_row(row)
    assert result["title"] == "Intro to Networking"

def test_happy_description_is_mapped():
    row = (1, "Intro to Networking", "Learn the basics", 10, 3, 100, "Beginner", "Networking", 1, "2 hours")
    result = course_row(row)
    assert result["description"] == "Learn the basics"

def test_happy_total_lessons_is_mapped():
    row = (1, "Intro to Networking", "Learn the basics", 10, 3, 100, "Beginner", "Networking", 1, "2 hours")
    result = course_row(row)
    assert result["total_lessons"] == 10

def test_happy_module_count_is_mapped():
    row = (1, "Intro to Networking", "Learn the basics", 10, 3, 100, "Beginner", "Networking", 1, "2 hours")
    result = course_row(row)
    assert result["module_count"] == 3

def test_happy_xp_reward_is_mapped():
    row = (1, "Intro to Networking", "Learn the basics", 10, 3, 100, "Beginner", "Networking", 1, "2 hours")
    result = course_row(row)
    assert result["xp_reward"] == 100

def test_happy_difficulty_is_mapped():
    row = (1, "Intro to Networking", "Learn the basics", 10, 3, 100, "Beginner", "Networking", 1, "2 hours")
    result = course_row(row)
    assert result["difficulty"] == "Beginner"

def test_happy_category_is_mapped():
    row = (1, "Intro to Networking", "Learn the basics", 10, 3, 100, "Beginner", "Networking", 1, "2 hours")
    result = course_row(row)
    assert result["category"] == "Networking"

def test_happy_required_level_is_mapped():
    row = (1, "Intro to Networking", "Learn the basics", 10, 3, 100, "Beginner", "Networking", 1, "2 hours")
    result = course_row(row)
    assert result["required_level"] == 1

def test_happy_estimated_time_is_mapped():
    row = (1, "Intro to Networking", "Learn the basics", 10, 3, 100, "Beginner", "Networking", 1, "2 hours")
    result = course_row(row)
    assert result["estimated_time"] == "2 hours"

def test_happy_returns_a_dict():
    row = (1, "Intro to Networking", "Learn the basics", 10, 3, 100, "Beginner", "Networking", 1, "2 hours")
    result = course_row(row)
    assert isinstance(result, dict)


# ─────────────────────────────────────────────────────────────
# BOUNDARY CASES — all expected keys are present
# ─────────────────────────────────────────────────────────────

def test_boundary_all_ten_keys_are_present():
    row = (1, "Intro to Networking", "Learn the basics", 10, 3, 100, "Beginner", "Networking", 1, "2 hours")
    result = course_row(row)
    assert "id"             in result
    assert "title"          in result
    assert "description"    in result
    assert "total_lessons"  in result
    assert "module_count"   in result
    assert "xp_reward"      in result
    assert "difficulty"     in result
    assert "category"       in result
    assert "required_level" in result
    assert "estimated_time" in result

def test_boundary_zero_xp_reward_is_preserved():
    row = (2, "Free Course", "No XP", 5, 1, 0, "Easy", "General", 1, "1 hour")
    result = course_row(row)
    assert result["xp_reward"] == 0

def test_boundary_zero_required_level_is_preserved():
    row = (3, "Open Course", "Anyone can join", 3, 1, 50, "Easy", "General", 0, "30 mins")
    result = course_row(row)
    assert result["required_level"] == 0


# ─────────────────────────────────────────────────────────────
# EDGE CASES — different valid course data maps correctly
# ─────────────────────────────────────────────────────────────

def test_edge_different_course_id_maps_correctly():
    row = (9, "Advanced Routing", "BGP and OSPF", 20, 5, 500, "Advanced", "Routing", 5, "10 hours")
    result = course_row(row)
    assert result["id"] == 9
    assert result["xp_reward"] == 500
    assert result["difficulty"] == "Advanced"

def test_edge_none_description_is_preserved():
    row = (4, "Course", None, 5, 2, 50, "Medium", "Networking", 1, "1 hour")
    result = course_row(row)
    assert result["description"] is None
