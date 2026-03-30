# test_course_routes.py
# Tests for course_routes.py — course listing, detail, and lesson completion endpoints.
#
# Functional Requirements: F02 — User Dashboard, F09 — Progress Tracking
#
# Validation tests send bad data and expect a 400 back.
# These return before the database is touched so no mock is needed.
#
# DB tests mock get_db_connection so no real database is required.

import pytest
from unittest.mock import MagicMock, patch

SAMPLE_COURSE = (1, "Intro to Networking", "Learn the basics", 10, 3, 100, "Beginner", "Networking", 1, "2 hours")


def mock_db():
    conn = MagicMock()
    cur  = MagicMock()
    conn.cursor.return_value = cur
    return conn, cur


# ─────────────────────────────────────────────────────────────
# GET /courses — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_list_courses_returns_200(client):
    conn, cur = mock_db()
    cur.fetchall.return_value = []
    with patch('course_routes.get_db_connection', return_value=conn):
        resp = client.get('/courses')
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True

def test_list_courses_returns_courses_list(client):
    conn, cur = mock_db()
    cur.fetchall.return_value = [SAMPLE_COURSE]
    with patch('course_routes.get_db_connection', return_value=conn):
        resp = client.get('/courses')
    data = resp.get_json()
    assert len(data['courses']) == 1
    assert data['courses'][0]['title'] == "Intro to Networking"


# ─────────────────────────────────────────────────────────────
# GET /course — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_get_course_missing_id_returns_400(client):
    resp = client.get('/course')
    assert resp.status_code == 400

def test_get_course_zero_id_returns_400(client):
    resp = client.get('/course?id=0')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# GET /course — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_get_course_not_found_returns_404(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = None
    with patch('course_routes.get_db_connection', return_value=conn):
        resp = client.get('/course?id=999')
    assert resp.status_code == 404

def test_get_course_found_returns_200(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = SAMPLE_COURSE
    with patch('course_routes.get_db_connection', return_value=conn):
        resp = client.get('/course?id=1')
    assert resp.status_code == 200
    assert resp.get_json()['title'] == "Intro to Networking"


# ─────────────────────────────────────────────────────────────
# GET /user-courses — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_user_courses_missing_email_returns_400(client):
    resp = client.get('/user-courses')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# GET /user-courses — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_user_courses_success_returns_200(client):
    conn, cur = mock_db()
    cur.fetchall.return_value = []
    with patch('course_routes.get_db_connection', return_value=conn):
        resp = client.get('/user-courses?email=test@test.com')
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True

def test_user_courses_returns_courses_with_status(client):
    conn, cur = mock_db()
    # Row has 12 columns: 10 course columns + progress + completed
    cur.fetchall.return_value = [SAMPLE_COURSE + (50, False)]
    with patch('course_routes.get_db_connection', return_value=conn):
        resp = client.get('/user-courses?email=test@test.com')
    data = resp.get_json()
    assert data['courses'][0]['status'] == 'in-progress'


# ─────────────────────────────────────────────────────────────
# POST /complete-lesson — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_complete_lesson_missing_email_returns_400(client):
    resp = client.post('/complete-lesson', json={'course_id': 1, 'lesson_number': 1})
    assert resp.status_code == 400

def test_complete_lesson_missing_course_id_returns_400(client):
    resp = client.post('/complete-lesson', json={'email': 'test@test.com', 'lesson_number': 1})
    assert resp.status_code == 400

def test_complete_lesson_missing_lesson_number_returns_400(client):
    resp = client.post('/complete-lesson', json={'email': 'test@test.com', 'course_id': 1})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# POST /complete-lesson — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_complete_lesson_course_not_found_returns_404(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = None  # course does not exist
    with patch('course_routes.get_db_connection', return_value=conn):
        resp = client.post('/complete-lesson', json={
            'email': 'test@test.com', 'course_id': 999, 'lesson_number': 1
        })
    assert resp.status_code == 404

def test_complete_lesson_already_done_returns_200(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = (10,)  # course has 10 lessons
    cur.rowcount = 0                   # lesson already recorded — not first time
    with patch('course_routes.get_db_connection', return_value=conn):
        with patch('course_routes.check_achievements', return_value=([], 0)):
            resp = client.post('/complete-lesson', json={
                'email': 'test@test.com', 'course_id': 1,
                'lesson_number': 1, 'earned_xp': 50
            })
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True
