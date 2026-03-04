"""
test_achievements.py
Integration coverage for the achievement engine and unlock idempotency.
"""

from __future__ import annotations

import time
import uuid

import pytest


def _login_xp(client, email: str, password: str) -> int:
    response = client.post("/login", data={"email": email, "password": password})
    assert response.status_code == 200, f"Login failed while reading XP: {response.get_json()}"
    payload = response.get_json()
    assert payload.get("success") is True, f"Login failed while reading XP: {payload}"
    return int(payload.get("xp") or 0)


@pytest.fixture()
def novice_course_id(client) -> int:
    response = client.get("/courses")
    assert response.status_code == 200
    payload = response.get_json()
    courses = payload.get("courses") or []
    novice_courses = [item for item in courses if int(item.get("required_level", 99) or 99) <= 1]
    assert novice_courses, "No novice courses found for achievement tests."
    return int(novice_courses[0]["id"])


@pytest.fixture()
def fresh_user(client):
    token = f"{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
    creds = {
        "first_name": "Ach",
        "last_name": "Tester",
        "username": f"ach_{token}",
        "email": f"ach_{token}@test.invalid",
        "dob": "2000-01-01",
        "password": "Test1234!Secure",
        "level": "novice",
        "reasons": "achievement integration test",
    }

    response = client.post("/register", data={
        "first_name": creds["first_name"],
        "last_name": creds["last_name"],
        "username": creds["username"],
        "email": creds["email"],
        "dob": creds["dob"],
        "password": creds["password"],
        "confirm_password": creds["password"],
        "level": creds["level"],
        "reasons": creds["reasons"],
    })
    payload = response.get_json()
    assert response.status_code == 200, f"Could not register test user: {payload}"
    assert payload.get("success") is True, f"Could not register test user: {payload}"

    yield creds

    from db import get_db_connection

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM users WHERE email = %s", (creds["email"],))
        conn.commit()
    finally:
        cur.close()
        conn.close()


def test_achievement_catalog_has_engine_entries(client, fresh_user):
    response = client.get("/api/user/achievements", query_string={"user_email": fresh_user["email"]})
    payload = response.get_json()

    assert response.status_code == 200, payload
    assert payload.get("success") is True, payload
    assert int(payload.get("total_available") or 0) >= 20

    ids = {
        item.get("id")
        for item in (payload.get("locked") or []) + (payload.get("unlocked") or [])
    }
    expected_ids = {"first_login", "onboarding_complete", "first_lesson", "first_course_complete", "all_rounder"}
    assert expected_ids.issubset(ids), f"Missing expected achievement IDs. got={sorted(ids)}"


def test_login_achievement_unlock_is_idempotent(client, fresh_user):
    email = fresh_user["email"]
    password = fresh_user["password"]

    first = client.post("/record-login", json={"email": email})
    first_data = first.get_json()
    assert first.status_code == 200, first_data
    assert first_data.get("success") is True
    first_unlock_ids = {item.get("id") for item in (first_data.get("newly_unlocked") or [])}
    assert "first_login" in first_unlock_ids
    assert int(first_data.get("achievement_xp_added") or 0) >= 10

    xp_after_first = _login_xp(client, email, password)

    second = client.post("/record-login", json={"email": email})
    second_data = second.get_json()
    assert second.status_code == 200, second_data
    assert second_data.get("success") is True
    second_unlock_ids = {item.get("id") for item in (second_data.get("newly_unlocked") or [])}
    assert "first_login" not in second_unlock_ids
    assert int(second_data.get("achievement_xp_added") or 0) == 0

    xp_after_second = _login_xp(client, email, password)
    assert xp_after_second == xp_after_first


def test_lesson_achievement_unlock_and_duplicate_guard(client, fresh_user, novice_course_id):
    email = fresh_user["email"]
    password = fresh_user["password"]

    start = client.post("/start-course", json={"email": email, "course_id": novice_course_id})
    start_data = start.get_json()
    assert start.status_code == 200, start_data
    assert start_data.get("success") is True
    start_unlocks = {item.get("id") for item in (start_data.get("newly_unlocked") or [])}
    assert "course_starter" in start_unlocks

    first = client.post("/complete-lesson", json={
        "email": email,
        "course_id": novice_course_id,
        "lesson_number": 1,
        "earned_xp": 45,
    })
    first_data = first.get_json()
    assert first.status_code == 200, first_data
    assert first_data.get("success") is True
    unlock_ids = {item.get("id") for item in (first_data.get("newly_unlocked") or [])}
    assert "first_lesson" in unlock_ids

    xp_after_first = _login_xp(client, email, password)

    second = client.post("/complete-lesson", json={
        "email": email,
        "course_id": novice_course_id,
        "lesson_number": 1,
        "earned_xp": 45,
    })
    second_data = second.get_json()
    assert second.status_code == 200, second_data
    assert second_data.get("success") is True
    assert bool(second_data.get("already_completed")) is True
    assert int(second_data.get("xp_added") or 0) == 0
    unlock_ids_second = {item.get("id") for item in (second_data.get("newly_unlocked") or [])}
    assert "first_lesson" not in unlock_ids_second

    xp_after_second = _login_xp(client, email, password)
    assert xp_after_second == xp_after_first


def test_all_rounder_unlocks_once(client, fresh_user, novice_course_id):
    email = fresh_user["email"]

    start = client.post("/start-course", json={"email": email, "course_id": novice_course_id})
    assert start.status_code == 200

    lesson = client.post("/complete-lesson", json={
        "email": email,
        "course_id": novice_course_id,
        "lesson_number": 1,
        "earned_xp": 40,
    })
    assert lesson.status_code == 200

    quiz = client.post("/complete-quiz", json={
        "email": email,
        "course_id": novice_course_id,
        "lesson_number": 1,
        "earned_xp": 30,
    })
    quiz_data = quiz.get_json()
    assert quiz.status_code == 200, quiz_data
    assert quiz_data.get("success") is True

    challenge = client.post("/complete-challenge", json={
        "email": email,
        "course_id": novice_course_id,
        "lesson_number": 1,
        "earned_xp": 20,
    })
    challenge_data = challenge.get_json()
    assert challenge.status_code == 200, challenge_data
    assert challenge_data.get("success") is True

    challenge_unlocks = {item.get("id") for item in (challenge_data.get("newly_unlocked") or [])}
    assert "all_rounder" in challenge_unlocks

    second_challenge = client.post("/complete-challenge", json={
        "email": email,
        "course_id": novice_course_id,
        "lesson_number": 1,
        "earned_xp": 20,
    })
    second_challenge_data = second_challenge.get_json()
    assert second_challenge.status_code == 200, second_challenge_data
    assert second_challenge_data.get("success") is True
    second_unlocks = {item.get("id") for item in (second_challenge_data.get("newly_unlocked") or [])}
    assert "all_rounder" not in second_unlocks

    achievements = client.get("/api/user/achievements", query_string={"user_email": email}).get_json()
    unlocked_ids = [item.get("id") for item in (achievements.get("unlocked") or [])]
    assert unlocked_ids.count("all_rounder") == 1
