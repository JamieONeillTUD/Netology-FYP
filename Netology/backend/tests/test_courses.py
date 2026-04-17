"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

test_courses.py - Course and Progress Tests
---
This file checks the course routes and the course row helper.

It covers:
  1. Mapping one course row into a dictionary.
  2. The course list and single course routes.
  3. Lesson, quiz, and challenge completion routes.
  4. User progress and course status routes.

"""

import json

from course_routes import course_row

# course_row()

SAMPLE_ROW = (
    1,
    "Networking Foundations",
    "Core networking concepts",
    12,
    3,
    1295,
    "Novice",
    "Core",
    1,
    "5.5 hrs",
)


def test_course_row_returns_dict():
    assert isinstance(course_row(SAMPLE_ROW), dict)


def test_course_row_keeps_id():
    assert course_row(SAMPLE_ROW)["id"] == 1


def test_course_row_keeps_title():
    assert course_row(SAMPLE_ROW)["title"] == "Networking Foundations"


def test_course_row_keeps_xp_reward():
    assert course_row(SAMPLE_ROW)["xp_reward"] == 1295


def test_course_row_has_expected_keys():
    result = course_row(SAMPLE_ROW)
    expected_keys = [
        "id",
        "title",
        "description",
        "total_lessons",
        "module_count",
        "xp_reward",
        "difficulty",
        "category",
        "required_level",
        "estimated_time",
    ]
    for key in expected_keys:
        assert key in result


def test_course_row_allows_missing_description():
    row = (2, "Course Two", None, 5, 2, 500, "Novice", "Core", 1, "2 hrs")
    assert course_row(row)["description"] is None


def test_course_row_allows_zero_xp():
    row = (3, "Free Course", "No XP", 1, 1, 0, "Novice", "Core", 1, "1 hr")
    assert course_row(row)["xp_reward"] == 0


# GET /courses

def test_courses_list_returns_success(integration_client):
    resp = integration_client.get("/courses")
    body = json.loads(resp.data)
    assert resp.status_code == 200
    assert body["success"] is True


def test_courses_list_returns_courses(integration_client):
    resp = integration_client.get("/courses")
    body = json.loads(resp.data)
    assert len(body["courses"]) >= 1
    assert "title" in body["courses"][0]

# GET /course

def test_course_details_returns_course(integration_client):
    resp = integration_client.get("/course?id=1")
    body = json.loads(resp.data)
    assert body["success"] is True
    assert "title" in body


def test_course_details_missing_id(integration_client):
    resp = integration_client.get("/course")
    assert resp.status_code == 400


def test_course_details_zero_id(integration_client):
    resp = integration_client.get("/course?id=0")
    assert resp.status_code == 400


def test_course_details_not_found(integration_client):
    resp = integration_client.get("/course?id=99999")
    assert resp.status_code == 404

# POST /complete-lesson

def test_complete_lesson_ok(integration_client, make_user):
    make_user("lesson_api@test.com")
    resp = integration_client.post(
        "/complete-lesson",
        data={
            "email": "lesson_api@test.com",
            "course_id": "1",
            "lesson_number": "1",
            "earned_xp": "30",
        },
    )
    assert resp.status_code == 200


def test_complete_lesson_missing_email(integration_client):
    resp = integration_client.post("/complete-lesson", data={"course_id": "1", "lesson_number": "1"})
    assert resp.status_code == 400


def test_complete_lesson_missing_course_id(integration_client):
    resp = integration_client.post("/complete-lesson", data={"email": "user@test.com", "lesson_number": "1"})
    assert resp.status_code == 400


def test_complete_lesson_missing_lesson_number(integration_client):
    resp = integration_client.post("/complete-lesson", data={"email": "user@test.com", "course_id": "1"})
    assert resp.status_code == 400


def test_complete_lesson_missing_course(integration_client, make_user):
    make_user("lesson_404@test.com")
    resp = integration_client.post(
        "/complete-lesson",
        data={
            "email": "lesson_404@test.com",
            "course_id": "99999",
            "lesson_number": "1",
        },
    )
    assert resp.status_code == 404

# GET /user-courses

def test_user_courses_returns_statuses(integration_client, make_user):
    make_user("ucourses_api@test.com")
    resp = integration_client.get("/user-courses?email=ucourses_api@test.com")
    body = json.loads(resp.data)
    assert body["success"] is True
    assert len(body["courses"]) >= 1
    assert "status" in body["courses"][0]


def test_user_courses_missing_email(integration_client):
    resp = integration_client.get("/user-courses")
    assert resp.status_code == 400

# POST /complete-quiz

def test_complete_quiz_ok(integration_client, make_user):
    make_user("quiz_api@test.com")
    resp = integration_client.post(
        "/complete-quiz",
        data={
            "email": "quiz_api@test.com",
            "course_id": "1",
            "lesson_number": "1",
            "earned_xp": "10",
        },
    )
    assert resp.status_code == 200


def test_complete_quiz_missing_email(integration_client):
    resp = integration_client.post("/complete-quiz", data={"course_id": "1", "lesson_number": "1"})
    assert resp.status_code == 400


def test_complete_quiz_missing_course_id(integration_client):
    resp = integration_client.post("/complete-quiz", data={"email": "user@test.com", "lesson_number": "1"})
    assert resp.status_code == 400


#
# POST /complete-challenge
#

def test_complete_challenge_ok(integration_client, make_user):
    make_user("challenge_api@test.com")
    resp = integration_client.post(
        "/complete-challenge",
        data={
            "email": "challenge_api@test.com",
            "course_id": "1",
            "lesson_number": "1",
            "earned_xp": "15",
        },
    )
    assert resp.status_code == 200


def test_complete_challenge_missing_email(integration_client):
    resp = integration_client.post("/complete-challenge", data={"course_id": "1", "lesson_number": "1"})
    assert resp.status_code == 400

# GET /user-course-status

def test_user_course_status_returns_parts(integration_client, make_user):
    make_user("status_api@test.com")
    resp = integration_client.get("/user-course-status?email=status_api@test.com&course_id=1")
    body = json.loads(resp.data)
    assert body["success"] is True
    assert "lessons" in body
    assert "quizzes" in body
    assert "challenges" in body


def test_user_course_status_missing_email(integration_client):
    resp = integration_client.get("/user-course-status?course_id=1")
    assert resp.status_code == 400


def test_user_course_status_missing_course_id(integration_client):
    resp = integration_client.get("/user-course-status?email=user@test.com")
    assert resp.status_code == 400


#
# GET /user-progress-summary
#

def test_user_progress_summary_returns_counts(integration_client, make_user):
    make_user("progress_api@test.com")
    resp = integration_client.get("/user-progress-summary?email=progress_api@test.com")
    body = json.loads(resp.data)
    assert body["success"] is True
    for key in ("lessons_done", "quizzes_done", "challenges_done", "courses_done", "total_courses"):
        assert key in body


def test_user_progress_summary_missing_email(integration_client):
    resp = integration_client.get("/user-progress-summary")
    assert resp.status_code == 400

# Real database checks

def test_courses_list_returns_seeded_courses(integration_client):
    resp = integration_client.get("/courses")
    body = json.loads(resp.data)
    assert body["success"] is True
    assert len(body["courses"]) >= 9


def test_complete_lesson_writes_row(integration_client, make_user, db):
    make_user("learner@test.com")
    integration_client.post(
        "/complete-lesson",
        data={
            "email": "learner@test.com",
            "course_id": "1",
            "lesson_number": "1",
            "earned_xp": "30",
        },
    )
    row = db.execute(
        "SELECT lesson_number FROM user_lessons "
        "WHERE user_email = 'learner@test.com' AND course_id = 1"
    ).fetchone()
    assert row is not None
    assert row[0] == 1


def test_complete_lesson_adds_xp(integration_client, make_user, db):
    make_user("learner2@test.com", xp=0)
    integration_client.post(
        "/complete-lesson",
        data={
            "email": "learner2@test.com",
            "course_id": "1",
            "lesson_number": "1",
            "earned_xp": "30",
        },
    )
    row = db.execute("SELECT xp FROM users WHERE email = 'learner2@test.com'").fetchone()
    assert row[0] > 0


def test_complete_lesson_only_saves_once(integration_client, make_user, db):
    make_user("learner3@test.com")
    lesson_data = {
        "email": "learner3@test.com",
        "course_id": "1",
        "lesson_number": "1",
        "earned_xp": "30",
    }
    integration_client.post("/complete-lesson", data=lesson_data)
    integration_client.post("/complete-lesson", data=lesson_data)
    count = db.execute(
        "SELECT COUNT(*) FROM user_lessons "
        "WHERE user_email = 'learner3@test.com' AND course_id = 1 AND lesson_number = 1"
    ).fetchone()[0]
    assert count == 1
