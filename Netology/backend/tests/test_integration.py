"""
test_integration.py – Tier 3 Integration tests for Netology.

Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4

These tests exercise complete end-to-end flows through the real database:
  - Course discovery and course enrolment
  - Lesson completion and XP awarding
  - Idempotency: completing the same lesson twice must NOT double-award XP
  - Quiz completion and idempotency
  - Topology save / load / delete lifecycle

All tests share a single test user created by the 'registered_user' session
fixture in conftest.py.  That user is deleted (with cascade) after the
entire session completes.

Module-level fixtures (scope="module") are used to share derived state
(course_id, topology_id) within each test class without tight test coupling.
"""

import json
import pytest


# =========================================================
# Module-level fixtures (shared per-file, not per-function)
# =========================================================

@pytest.fixture(scope="module")
def novice_course(client):
    """
    Fetch the first Novice-level course from the /courses endpoint.
    This avoids hardcoding a course_id that could differ between deployments.
    Returns the full course dict (id, title, total_lessons, xp_reward, …).
    """
    resp = client.get("/courses")
    assert resp.status_code == 200, f"/courses failed: {resp.get_json()}"
    courses = resp.get_json().get("courses", [])
    novice_courses = [c for c in courses if c.get("required_level", 99) <= 1]
    assert novice_courses, "No Novice courses found — check DB seed data"
    return novice_courses[0]


@pytest.fixture(scope="module")
def saved_topology_id(client, registered_user, novice_course):
    """
    Save a small test topology and return its ID.
    Used by TestTopologyFlow so all topology tests share the same saved record.
    Topology is NOT deleted here — deletion is tested inside TestTopologyFlow.
    """
    devices = [
        {"id": "pc1", "type": "pc", "label": "PC-1", "x": 100, "y": 100},
        {"id": "sw1", "type": "switch", "label": "Switch-1", "x": 300, "y": 100},
    ]
    connections = [
        {"from": "pc1", "to": "sw1", "label": "eth0"}
    ]
    resp = client.post("/save-topology", json={
        "email":       registered_user["email"],
        "name":        "Pytest Test Topology",
        "devices":     devices,
        "connections": connections,
    })
    assert resp.status_code == 200, f"/save-topology failed: {resp.get_json()}"

    # Get the topology ID by loading all saved topologies
    load_resp = client.get(f"/load-topologies?email={registered_user['email']}")
    assert load_resp.status_code == 200
    topologies = load_resp.get_json().get("topologies", [])
    test_topo = next(
        (t for t in topologies if t.get("name") == "Pytest Test Topology"),
        None
    )
    assert test_topo is not None, "Saved topology not found after saving"
    return test_topo["id"]


# =========================================================
# Tier 3a — Course discovery and enrolment
# =========================================================

class TestCourseFlow:
    """
    Integration tests for course listing, enrolment, lesson completion, and
    XP idempotency — the core learning loop of Netology.
    """

    def test_courses_endpoint_returns_list(self, client):
        """GET /courses should return a non-empty list of courses."""
        resp = client.get("/courses")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get("success") is True
        assert isinstance(data.get("courses"), list)
        assert len(data["courses"]) > 0

    def test_courses_have_required_fields(self, client):
        """Each course in /courses must contain expected metadata fields."""
        courses = client.get("/courses").get_json()["courses"]
        required = ["id", "title", "description",
                    "total_lessons", "xp_reward", "difficulty"]
        for course in courses:
            for field in required:
                assert field in course, (
                    f"Course '{course.get('title')}' missing field: '{field}'"
                )

    def test_start_course_success(self, client, registered_user, novice_course):
        """Starting a course for the test user should return success."""
        resp = client.post("/start-course", json={
            "email":     registered_user["email"],
            "course_id": novice_course["id"],
        })
        data = resp.get_json()
        assert resp.status_code == 200
        assert data.get("success") is True

    def test_start_course_twice_is_safe(self, client, registered_user, novice_course):
        """Calling start-course a second time should not error (idempotent enrolment)."""
        resp = client.post("/start-course", json={
            "email":     registered_user["email"],
            "course_id": novice_course["id"],
        })
        assert resp.status_code == 200

    def test_complete_lesson_returns_success(self, client, registered_user, novice_course):
        """Completing lesson 1 should return a success response."""
        resp = client.post("/complete-lesson", json={
            "email":         registered_user["email"],
            "course_id":     novice_course["id"],
            "lesson_number": 1,
            "earned_xp":     50,
        })
        data = resp.get_json()
        assert resp.status_code == 200
        assert data.get("success") is True

    def test_complete_lesson_awards_xp(self, client, registered_user, novice_course):
        """
        Completing a NEW lesson (lesson 2) should award XP > 0.
        We use lesson 2 here so this test is independent of previous lesson state.
        """
        # First get current XP
        login_resp = client.post("/login", data={
            "email":    registered_user["email"],
            "password": registered_user["password"],
        })
        xp_before = login_resp.get_json()["xp"]

        # Complete lesson 2
        resp = client.post("/complete-lesson", json={
            "email":         registered_user["email"],
            "course_id":     novice_course["id"],
            "lesson_number": 2,
            "earned_xp":     50,
        })
        data = resp.get_json()
        assert data.get("success") is True
        assert data.get("xp_added", 0) > 0, (
            "Expected XP to be awarded for completing a new lesson"
        )

        # Verify the XP actually increased in the DB
        login_after = client.post("/login", data={
            "email":    registered_user["email"],
            "password": registered_user["password"],
        }).get_json()
        assert login_after["xp"] > xp_before, (
            "User XP in DB did not increase after completing a lesson"
        )

    def test_complete_same_lesson_does_not_double_award_xp(
        self, client, registered_user, novice_course
    ):
        """
        IDEMPOTENCY TEST: Completing the same lesson a second time must NOT
        award additional XP.  This is the core guard against XP farming.
        """
        # Complete lesson 3 for the first time
        first = client.post("/complete-lesson", json={
            "email":         registered_user["email"],
            "course_id":     novice_course["id"],
            "lesson_number": 3,
            "earned_xp":     50,
        }).get_json()
        assert first.get("success") is True

        # Complete lesson 3 again
        second = client.post("/complete-lesson", json={
            "email":         registered_user["email"],
            "course_id":     novice_course["id"],
            "lesson_number": 3,
            "earned_xp":     50,
        }).get_json()

        assert second.get("success") is True
        assert second.get("already_completed") is True, (
            "Second completion should report already_completed=True"
        )
        assert second.get("xp_added") == 0, (
            f"XP must not be awarded twice for the same lesson. "
            f"Got xp_added={second.get('xp_added')}"
        )

    def test_complete_lesson_updates_progress_percentage(
        self, client, registered_user, novice_course
    ):
        """Progress percentage should increase after completing a lesson."""
        resp = client.post("/complete-lesson", json={
            "email":         registered_user["email"],
            "course_id":     novice_course["id"],
            "lesson_number": 4,
            "earned_xp":     50,
        })
        data = resp.get_json()
        assert data.get("success") is True
        assert "progress_pct" in data
        assert isinstance(data["progress_pct"], int)
        assert data["progress_pct"] > 0

    def test_complete_lesson_missing_email_returns_400(self, client, novice_course):
        """Completing a lesson without an email should return 400."""
        resp = client.post("/complete-lesson", json={
            "course_id":     novice_course["id"],
            "lesson_number": 99,
        })
        assert resp.status_code == 400

    def test_user_xp_increases_monotonically(
        self, client, registered_user, novice_course
    ):
        """
        After completing a new lesson (lesson 5), the user's total XP
        must be higher than before — XP never decreases.
        """
        xp_before = client.post("/login", data={
            "email":    registered_user["email"],
            "password": registered_user["password"],
        }).get_json()["xp"]

        client.post("/complete-lesson", json={
            "email":         registered_user["email"],
            "course_id":     novice_course["id"],
            "lesson_number": 5,
            "earned_xp":     50,
        })

        xp_after = client.post("/login", data={
            "email":    registered_user["email"],
            "password": registered_user["password"],
        }).get_json()["xp"]

        assert xp_after >= xp_before, (
            f"XP decreased after completing a lesson! Before={xp_before}, After={xp_after}"
        )


# =========================================================
# Tier 3b — Quiz completion and idempotency
# =========================================================

class TestQuizFlow:
    """
    Integration tests for quiz completion.

    /complete-quiz awards XP once per (user, course, lesson_number) tuple.
    Subsequent calls for the same quiz must return already_completed=True
    and xp_added=0.
    """

    def test_complete_quiz_returns_success(
        self, client, registered_user, novice_course
    ):
        """Completing a quiz for the first time should succeed."""
        resp = client.post("/complete-quiz", json={
            "email":         registered_user["email"],
            "course_id":     novice_course["id"],
            "lesson_number": 1,
            "earned_xp":     30,
        })
        data = resp.get_json()
        assert resp.status_code == 200
        assert data.get("success") is True

    def test_complete_quiz_awards_xp_first_time(
        self, client, registered_user, novice_course
    ):
        """
        Quiz 2 (new) should award XP on first completion.
        """
        xp_before = client.post("/login", data={
            "email":    registered_user["email"],
            "password": registered_user["password"],
        }).get_json()["xp"]

        resp = client.post("/complete-quiz", json={
            "email":         registered_user["email"],
            "course_id":     novice_course["id"],
            "lesson_number": 2,
            "earned_xp":     30,
        }).get_json()

        assert resp.get("xp_added", 0) > 0

        xp_after = client.post("/login", data={
            "email":    registered_user["email"],
            "password": registered_user["password"],
        }).get_json()["xp"]

        assert xp_after > xp_before

    def test_complete_same_quiz_idempotent(
        self, client, registered_user, novice_course
    ):
        """
        IDEMPOTENCY TEST: Completing the same quiz twice must not award XP twice.
        """
        # First completion
        first = client.post("/complete-quiz", json={
            "email":         registered_user["email"],
            "course_id":     novice_course["id"],
            "lesson_number": 3,
            "earned_xp":     30,
        }).get_json()
        assert first.get("success") is True

        # Second completion — same lesson_number
        second = client.post("/complete-quiz", json={
            "email":         registered_user["email"],
            "course_id":     novice_course["id"],
            "lesson_number": 3,
            "earned_xp":     30,
        }).get_json()

        assert second.get("success") is True
        assert second.get("already_completed") is True
        assert second.get("xp_added") == 0, (
            f"Quiz XP was double-awarded. Got xp_added={second.get('xp_added')}"
        )


# =========================================================
# Tier 3c — Topology save / load / delete lifecycle
# =========================================================

class TestTopologyFlow:
    """
    Integration tests for the network topology sandbox persistence.

    Tests the complete lifecycle:  save → load list → load single → delete.
    """

    def test_save_topology_returns_success(
        self, client, registered_user
    ):
        """Saving a topology should return HTTP 200 and success=true."""
        resp = client.post("/save-topology", json={
            "email":   registered_user["email"],
            "name":    "Integration Test Topology",
            "devices": [
                {"id": "r1", "type": "router", "label": "Router-1", "x": 50, "y": 50}
            ],
            "connections": [],
        })
        data = resp.get_json()
        assert resp.status_code == 200
        assert data.get("success") is True

    def test_load_topologies_returns_list(
        self, client, registered_user
    ):
        """GET /load-topologies should return a non-empty list for a user with saves."""
        resp = client.get(f"/load-topologies?email={registered_user['email']}")
        data = resp.get_json()
        assert resp.status_code == 200
        assert data.get("success") is True
        assert isinstance(data.get("topologies"), list)
        assert len(data["topologies"]) > 0

    def test_saved_topology_has_required_fields(
        self, client, registered_user, saved_topology_id
    ):
        """Each topology in the list should have id, name, devices, connections."""
        topologies = client.get(
            f"/load-topologies?email={registered_user['email']}"
        ).get_json()["topologies"]

        for topo in topologies:
            assert "id"          in topo
            assert "name"        in topo
            assert "devices"     in topo
            assert "connections" in topo

    def test_load_single_topology_by_id(
        self, client, saved_topology_id
    ):
        """GET /load-topology/<id> should return the topology's devices and connections."""
        resp = client.get(f"/load-topology/{saved_topology_id}")
        data = resp.get_json()
        assert resp.status_code == 200
        assert data.get("success") is True
        assert "devices"     in data
        assert "connections" in data

    def test_saved_topology_devices_match(
        self, client, saved_topology_id
    ):
        """The devices array returned should match what was saved."""
        data = client.get(f"/load-topology/{saved_topology_id}").get_json()
        devices = data.get("devices", [])

        # The fixture saved two devices: "pc1" and "sw1"
        device_ids = {d["id"] for d in devices}
        assert "pc1" in device_ids
        assert "sw1" in device_ids

    def test_delete_topology_returns_success(
        self, client, registered_user, saved_topology_id
    ):
        """Deleting an existing topology should return success."""
        resp = client.delete(
            f"/delete-topology/{saved_topology_id}",
            json={"email": registered_user["email"]},
        )
        data = resp.get_json()
        assert resp.status_code == 200
        assert data.get("success") is True

    def test_deleted_topology_no_longer_listed(
        self, client, registered_user, saved_topology_id
    ):
        """After deletion the topology should not appear in the user's list."""
        topologies = client.get(
            f"/load-topologies?email={registered_user['email']}"
        ).get_json().get("topologies", [])

        ids = [t["id"] for t in topologies]
        assert saved_topology_id not in ids, (
            "Deleted topology still appears in /load-topologies"
        )
