# test_topology_routes.py
# Tests for topology_routes.py — sandbox save and load endpoints.
#
# Functional Requirement: F04 — Save and Load Topologies
#
# Validation tests send bad data and expect a 400 back.
# These return before the database is touched so no mock is needed.
#
# DB tests mock get_db_connection so no real database is required.

import pytest
from unittest.mock import MagicMock, patch


def mock_db():
    # Returns a fake (conn, cursor) pair for use in DB tests.
    conn = MagicMock()
    cur  = MagicMock()
    conn.cursor.return_value = cur
    return conn, cur


# ─────────────────────────────────────────────────────────────
# LESSON SESSION SAVE — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_lesson_session_save_missing_email_returns_400(client):
    resp = client.post('/lesson-session/save', json={
        'course_id': 1, 'lesson_number': 1, 'devices': [], 'connections': []
    })
    assert resp.status_code == 400

def test_lesson_session_save_missing_course_id_returns_400(client):
    resp = client.post('/lesson-session/save', json={
        'email': 'test@test.com', 'lesson_number': 1, 'devices': [], 'connections': []
    })
    assert resp.status_code == 400

def test_lesson_session_save_missing_devices_returns_400(client):
    resp = client.post('/lesson-session/save', json={
        'email': 'test@test.com', 'course_id': 1, 'lesson_number': 1, 'connections': []
    })
    assert resp.status_code == 400

def test_lesson_session_save_missing_connections_returns_400(client):
    resp = client.post('/lesson-session/save', json={
        'email': 'test@test.com', 'course_id': 1, 'lesson_number': 1, 'devices': []
    })
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# LESSON SESSION SAVE — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_lesson_session_save_success_returns_200(client):
    conn, cur = mock_db()
    with patch('topology_routes.get_db_connection', return_value=conn):
        resp = client.post('/lesson-session/save', json={
            'email': 'test@test.com', 'course_id': 1, 'lesson_number': 1,
            'devices': [], 'connections': []
        })
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True


# ─────────────────────────────────────────────────────────────
# LESSON SESSION LOAD — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_lesson_session_load_missing_email_returns_400(client):
    resp = client.get('/lesson-session/load?course_id=1&lesson_number=1')
    assert resp.status_code == 400

def test_lesson_session_load_missing_course_id_returns_400(client):
    resp = client.get('/lesson-session/load?email=test@test.com&lesson_number=1')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# LESSON SESSION LOAD — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_lesson_session_load_not_found_returns_200_with_empty(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = None  # no saved session
    with patch('topology_routes.get_db_connection', return_value=conn):
        resp = client.get('/lesson-session/load?email=test@test.com&course_id=1&lesson_number=1')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['found'] is False
    assert data['devices'] == []

def test_lesson_session_load_found_returns_200_with_data(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = (['device1'], ['conn1'])  # saved session exists
    with patch('topology_routes.get_db_connection', return_value=conn):
        resp = client.get('/lesson-session/load?email=test@test.com&course_id=1&lesson_number=1')
    assert resp.status_code == 200
    assert resp.get_json()['found'] is True


# ─────────────────────────────────────────────────────────────
# SAVE NAMED TOPOLOGY — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_save_topology_missing_email_returns_400(client):
    resp = client.post('/save-topology', json={
        'devices': [], 'connections': []
    })
    assert resp.status_code == 400

def test_save_topology_missing_devices_returns_400(client):
    resp = client.post('/save-topology', json={
        'email': 'test@test.com', 'connections': []
    })
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# SAVE NAMED TOPOLOGY — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_save_topology_success_returns_200(client):
    conn, cur = mock_db()
    with patch('topology_routes.get_db_connection', return_value=conn):
        resp = client.post('/save-topology', json={
            'email': 'test@test.com', 'name': 'My Network',
            'devices': [], 'connections': []
        })
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True


# ─────────────────────────────────────────────────────────────
# LOAD TOPOLOGIES LIST — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_load_topologies_missing_email_returns_400(client):
    resp = client.get('/load-topologies')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# LOAD SINGLE TOPOLOGY — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_load_topology_missing_email_returns_400(client):
    resp = client.get('/load-topology/1')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# LOAD SINGLE TOPOLOGY — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_load_topology_not_found_returns_404(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = None
    with patch('topology_routes.get_db_connection', return_value=conn):
        resp = client.get('/load-topology/99?email=test@test.com')
    assert resp.status_code == 404

def test_load_topology_found_returns_200(client):
    conn, cur = mock_db()
    cur.fetchone.return_value = ([], [])  # devices and connections
    with patch('topology_routes.get_db_connection', return_value=conn):
        resp = client.get('/load-topology/1?email=test@test.com')
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True


# ─────────────────────────────────────────────────────────────
# DELETE TOPOLOGY — VALIDATION (no database needed)
# ─────────────────────────────────────────────────────────────

def test_delete_topology_missing_email_returns_400(client):
    resp = client.delete('/delete-topology/1', json={})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# DELETE TOPOLOGY — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_delete_topology_success_returns_200(client):
    conn, cur = mock_db()
    with patch('topology_routes.get_db_connection', return_value=conn):
        resp = client.delete('/delete-topology/1', json={'email': 'test@test.com'})
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True


# ─────────────────────────────────────────────────────────────
# LOAD TOPOLOGIES LIST — DATABASE TESTS (mock database)
# ─────────────────────────────────────────────────────────────

def test_load_topologies_success_returns_200(client):
    conn, cur = mock_db()
    cur.fetchall.return_value = []  # no saved topologies yet
    with patch('topology_routes.get_db_connection', return_value=conn):
        resp = client.get('/load-topologies?email=test@test.com')
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True
