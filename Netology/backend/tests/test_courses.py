# test_courses.py
# Tests for the course and lesson progress system (course_routes.py)
#
# Functional Requirement: FR04 — View Course Catalogue
#                         FR05 — Complete Lessons and Track Progress
#                         FR06 — Complete Quizzes
#
# ── Test Types ────────────────────────────────────────────────
#   UNIT TESTS        — test the course_row() data-mapping helper
#   API TESTS         — HTTP endpoint tests, real database
#   INTEGRATION TESTS — real PostgreSQL, verifies DB writes

import pytest
import json
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from course_routes import course_row


# ─────────────────────────────────────────────────────────────
# UNIT TESTS — course_row()
# Converts a raw database tuple into a course dictionary
# ─────────────────────────────────────────────────────────────

SAMPLE_ROW = (1, 'Networking Foundations', 'Core networking concepts', 12, 3, 1295, 'Novice', 'Core', 1, '5.5 hrs')

# Happy path

def test_course_row_returns_a_dictionary():
    result = course_row(SAMPLE_ROW)
    assert isinstance(result, dict)

def test_course_row_maps_id_correctly():
    result = course_row(SAMPLE_ROW)
    assert result['id'] == 1

def test_course_row_maps_title_correctly():
    result = course_row(SAMPLE_ROW)
    assert result['title'] == 'Networking Foundations'

def test_course_row_maps_xp_reward_correctly():
    result = course_row(SAMPLE_ROW)
    assert result['xp_reward'] == 1295

def test_course_row_contains_all_expected_keys():
    result = course_row(SAMPLE_ROW)
    expected_keys = ['id', 'title', 'description', 'total_lessons', 'module_count',
                     'xp_reward', 'difficulty', 'category', 'required_level', 'estimated_time']
    for key in expected_keys:
        assert key in result

# Boundary cases

def test_course_row_handles_none_description():
    row_with_no_description = (2, 'Course Two', None, 5, 2, 500, 'Novice', 'Core', 1, '2 hrs')
    result = course_row(row_with_no_description)
    assert result['description'] is None

def test_course_row_handles_zero_xp_reward():
    row_with_zero_xp = (3, 'Free Course', 'No XP', 1, 1, 0, 'Novice', 'Core', 1, '1 hr')
    result = course_row(row_with_zero_xp)
    assert result['xp_reward'] == 0


# ─────────────────────────────────────────────────────────────
# API TESTS — GET /courses   (real database)
# ─────────────────────────────────────────────────────────────

# Happy path

def test_list_courses_returns_200_and_success_flag(integration_client):
    resp = integration_client.get('/courses')
    body = json.loads(resp.data)
    assert resp.status_code == 200
    assert body['success'] is True

def test_list_courses_returns_course_data_in_response(integration_client):
    resp = integration_client.get('/courses')
    body = json.loads(resp.data)
    assert len(body['courses']) >= 1
    assert 'title' in body['courses'][0]


# ─────────────────────────────────────────────────────────────
# API TESTS — GET /course   (real database)
# ─────────────────────────────────────────────────────────────

def test_get_course_returns_correct_course(integration_client):
    resp = integration_client.get('/course?id=1')
    body = json.loads(resp.data)
    assert body['success'] is True
    assert 'title' in body

# Boundary cases

def test_get_course_missing_id_returns_400(integration_client):
    resp = integration_client.get('/course')
    assert resp.status_code == 400

def test_get_course_id_zero_returns_400(integration_client):
    resp = integration_client.get('/course?id=0')
    assert resp.status_code == 400

# Edge case

def test_get_course_not_found_returns_404(integration_client):
    resp = integration_client.get('/course?id=99999')
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────
# API TESTS — POST /complete-lesson   (real database)
# ─────────────────────────────────────────────────────────────

# Happy path

def test_complete_lesson_valid_data_returns_200(integration_client, make_user):
    make_user('lesson_api@test.com')
    resp = integration_client.post('/complete-lesson', data={
        'email': 'lesson_api@test.com', 'course_id': '1', 'lesson_number': '1', 'earned_xp': '30'
    })
    assert resp.status_code == 200

# Boundary cases

def test_complete_lesson_missing_email_returns_400(integration_client):
    resp = integration_client.post('/complete-lesson', data={'course_id': '1', 'lesson_number': '1'})
    assert resp.status_code == 400

def test_complete_lesson_missing_course_id_returns_400(integration_client):
    resp = integration_client.post('/complete-lesson', data={'email': 'user@test.com', 'lesson_number': '1'})
    assert resp.status_code == 400

def test_complete_lesson_missing_lesson_number_returns_400(integration_client):
    resp = integration_client.post('/complete-lesson', data={'email': 'user@test.com', 'course_id': '1'})
    assert resp.status_code == 400

# Edge case

def test_complete_lesson_course_not_found_returns_404(integration_client, make_user):
    make_user('lesson_404@test.com')
    resp = integration_client.post('/complete-lesson', data={
        'email': 'lesson_404@test.com', 'course_id': '99999', 'lesson_number': '1'
    })
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────
# API TESTS — GET /user-courses   (real database)
# ─────────────────────────────────────────────────────────────

def test_user_courses_returns_all_courses_with_progress(integration_client, make_user):
    make_user('ucourses_api@test.com')
    resp = integration_client.get('/user-courses?email=ucourses_api@test.com')
    body = json.loads(resp.data)
    assert body['success'] is True
    assert len(body['courses']) >= 1
    assert 'status' in body['courses'][0]

def test_user_courses_missing_email_returns_400(integration_client):
    resp = integration_client.get('/user-courses')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# API TESTS — POST /complete-quiz   (real database)
# ─────────────────────────────────────────────────────────────

def test_complete_quiz_valid_data_returns_200(integration_client, make_user):
    make_user('quiz_api@test.com')
    resp = integration_client.post('/complete-quiz', data={
        'email': 'quiz_api@test.com', 'course_id': '1', 'lesson_number': '1', 'earned_xp': '10'
    })
    assert resp.status_code == 200

def test_complete_quiz_missing_email_returns_400(integration_client):
    resp = integration_client.post('/complete-quiz', data={'course_id': '1', 'lesson_number': '1'})
    assert resp.status_code == 400

def test_complete_quiz_missing_course_id_returns_400(integration_client):
    resp = integration_client.post('/complete-quiz', data={'email': 'user@test.com', 'lesson_number': '1'})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# API TESTS — POST /complete-challenge   (real database)
# ─────────────────────────────────────────────────────────────

def test_complete_challenge_valid_data_returns_200(integration_client, make_user):
    make_user('challenge_api@test.com')
    resp = integration_client.post('/complete-challenge', data={
        'email': 'challenge_api@test.com', 'course_id': '1', 'lesson_number': '1', 'earned_xp': '15'
    })
    assert resp.status_code == 200

def test_complete_challenge_missing_email_returns_400(integration_client):
    resp = integration_client.post('/complete-challenge', data={'course_id': '1', 'lesson_number': '1'})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# API TESTS — GET /user-course-status   (real database)
# ─────────────────────────────────────────────────────────────

def test_user_course_status_returns_lessons_quizzes_challenges(integration_client, make_user):
    make_user('status_api@test.com')
    resp = integration_client.get('/user-course-status?email=status_api@test.com&course_id=1')
    body = json.loads(resp.data)
    assert body['success'] is True
    assert 'lessons' in body
    assert 'quizzes' in body
    assert 'challenges' in body

def test_user_course_status_missing_email_returns_400(integration_client):
    resp = integration_client.get('/user-course-status?course_id=1')
    assert resp.status_code == 400

def test_user_course_status_missing_course_id_returns_400(integration_client):
    resp = integration_client.get('/user-course-status?email=user@test.com')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# API TESTS — GET /user-progress-summary   (real database)
# ─────────────────────────────────────────────────────────────

def test_user_progress_summary_returns_all_counts(integration_client, make_user):
    make_user('progress_api@test.com')
    resp = integration_client.get('/user-progress-summary?email=progress_api@test.com')
    body = json.loads(resp.data)
    assert body['success'] is True
    for key in ('lessons_done', 'quizzes_done', 'challenges_done', 'courses_done', 'total_courses'):
        assert key in body

def test_user_progress_summary_missing_email_returns_400(integration_client):
    resp = integration_client.get('/user-progress-summary')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# INTEGRATION TESTS — course routes with a real database
# ─────────────────────────────────────────────────────────────

# Happy path

@pytest.mark.integration
def test_list_courses_returns_all_nine_seeded_courses(integration_client):
    # The schema seeds 9 courses — all should come back from /courses
    resp = integration_client.get('/courses')
    body = json.loads(resp.data)
    assert body['success'] is True
    assert len(body['courses']) >= 9

@pytest.mark.integration
def test_complete_lesson_writes_a_row_to_the_user_lessons_table(integration_client, make_user, db):
    make_user('learner@test.com')
    integration_client.post('/complete-lesson', data={
        'email': 'learner@test.com', 'course_id': '1', 'lesson_number': '1', 'earned_xp': '30'
    })
    row = db.execute(
        "SELECT lesson_number FROM user_lessons "
        "WHERE user_email = 'learner@test.com' AND course_id = 1"
    ).fetchone()
    assert row is not None
    assert row[0] == 1

@pytest.mark.integration
def test_complete_lesson_adds_xp_to_the_users_account(integration_client, make_user, db):
    make_user('learner2@test.com', xp=0)
    integration_client.post('/complete-lesson', data={
        'email': 'learner2@test.com', 'course_id': '1', 'lesson_number': '1', 'earned_xp': '30'
    })
    row = db.execute("SELECT xp FROM users WHERE email = 'learner2@test.com'").fetchone()
    assert row[0] > 0

# Edge case

@pytest.mark.integration
def test_completing_the_same_lesson_twice_only_creates_one_row(integration_client, make_user, db):
    make_user('learner3@test.com')
    lesson_data = {'email': 'learner3@test.com', 'course_id': '1', 'lesson_number': '1', 'earned_xp': '30'}
    integration_client.post('/complete-lesson', data=lesson_data)
    integration_client.post('/complete-lesson', data=lesson_data)
    count = db.execute(
        "SELECT COUNT(*) FROM user_lessons "
        "WHERE user_email = 'learner3@test.com' AND course_id = 1 AND lesson_number = 1"
    ).fetchone()[0]
    assert count == 1
