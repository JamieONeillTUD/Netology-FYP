# test_topology.py
# Tests for the sandbox topology save and load system (topology_routes.py)
#
# Functional Requirement: FR14 — Save and Load Named Topologies
#                         FR15 — Lesson Session State
#
# ── Test Types ────────────────────────────────────────────────
#   API TESTS         — HTTP endpoint tests, real database
#   INTEGRATION TESTS — real PostgreSQL, verifies DB writes

import pytest
import json
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


# ─────────────────────────────────────────────────────────────
# API TESTS — POST /lesson-session/save   (real database)
# ─────────────────────────────────────────────────────────────

# Happy path

def test_save_lesson_session_valid_data_returns_200(integration_client, make_user):
    make_user('session_api@test.com')
    resp = integration_client.post('/lesson-session/save', json={
        'email': 'session_api@test.com',
        'course_id': 1,
        'lesson_number': 1,
        'devices': [{'id': 'router1'}],
        'connections': []
    })
    assert resp.status_code == 200

# Boundary cases

def test_save_lesson_session_missing_email_returns_400(integration_client):
    resp = integration_client.post('/lesson-session/save', json={
        'course_id': 1, 'lesson_number': 1, 'devices': [], 'connections': []
    })
    assert resp.status_code == 400

def test_save_lesson_session_missing_devices_returns_400(integration_client):
    resp = integration_client.post('/lesson-session/save', json={
        'email': 'user@test.com', 'course_id': 1, 'lesson_number': 1
    })
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# API TESTS — GET /lesson-session/load   (real database)
# ─────────────────────────────────────────────────────────────

# Happy path

def test_load_lesson_session_returns_devices_and_connections(integration_client, make_user):
    make_user('session_load_api@test.com')
    # Save a session first so there is something to load
    integration_client.post('/lesson-session/save', json={
        'email': 'session_load_api@test.com',
        'course_id': 1,
        'lesson_number': 1,
        'devices': [{'id': 'router1'}],
        'connections': []
    })
    resp = integration_client.get(
        '/lesson-session/load?email=session_load_api@test.com&course_id=1&lesson_number=1'
    )
    body = json.loads(resp.data)
    assert 'devices' in body
    assert 'connections' in body

# Boundary cases

def test_load_lesson_session_missing_email_returns_400(integration_client):
    resp = integration_client.get('/lesson-session/load?course_id=1&lesson_number=1')
    assert resp.status_code == 400

def test_load_lesson_session_missing_course_id_returns_400(integration_client):
    resp = integration_client.get('/lesson-session/load?email=user@test.com&lesson_number=1')
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# API TESTS — POST /save-topology   (real database)
# ─────────────────────────────────────────────────────────────

# Happy path

def test_save_topology_valid_data_returns_200(integration_client, make_user):
    make_user('topo_api@test.com')
    resp = integration_client.post('/save-topology', json={
        'email': 'topo_api@test.com',
        'name': 'My Network',
        'devices': [{'id': 'router1'}],
        'connections': []
    })
    assert resp.status_code == 200

# Boundary cases

def test_save_topology_missing_email_returns_400(integration_client):
    resp = integration_client.post('/save-topology', json={
        'name': 'My Network', 'devices': [{'id': 'router1'}], 'connections': []
    })
    assert resp.status_code == 400

def test_save_topology_missing_devices_returns_400(integration_client):
    resp = integration_client.post('/save-topology', json={
        'email': 'user@test.com', 'name': 'My Network', 'connections': []
    })
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# API TESTS — GET /load-topologies and DELETE /delete-topology
# ─────────────────────────────────────────────────────────────

def test_load_topologies_returns_list(integration_client, make_user):
    make_user('topo_load_api@test.com')
    resp = integration_client.get('/load-topologies?email=topo_load_api@test.com')
    body = json.loads(resp.data)
    assert 'topologies' in body

def test_load_topologies_missing_email_returns_400(integration_client):
    resp = integration_client.get('/load-topologies')
    assert resp.status_code == 400

def test_delete_topology_missing_email_returns_400(integration_client):
    resp = integration_client.delete('/delete-topology/1', json={})
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────
# INTEGRATION TESTS — topology routes with a real database
# ─────────────────────────────────────────────────────────────

# Happy path

@pytest.mark.integration
def test_save_and_load_topology_persists_data_in_database(integration_client, make_user, db):
    make_user('topo@test.com')
    integration_client.post('/save-topology', json={
        'email': 'topo@test.com',
        'name': 'Test Network',
        'devices': [{'id': 'router1', 'type': 'router'}],
        'connections': []
    })
    row = db.execute(
        "SELECT name FROM saved_topologies WHERE user_email = 'topo@test.com'"
    ).fetchone()
    assert row is not None
    assert row[0] == 'Test Network'

@pytest.mark.integration
def test_saved_topology_appears_in_load_topologies_response(integration_client, make_user):
    make_user('topo2@test.com')
    integration_client.post('/save-topology', json={
        'email': 'topo2@test.com',
        'name': 'My Topology',
        'devices': [{'id': 'switch1'}],
        'connections': []
    })
    resp = integration_client.get('/load-topologies?email=topo2@test.com')
    body = json.loads(resp.data)
    assert len(body['topologies']) == 1
    assert body['topologies'][0]['name'] == 'My Topology'

@pytest.mark.integration
def test_delete_topology_removes_the_row_from_the_database(integration_client, make_user, db):
    make_user('topo3@test.com')
    integration_client.post('/save-topology', json={
        'email': 'topo3@test.com',
        'name': 'To Delete',
        'devices': [{'id': 'pc1'}],
        'connections': []
    })
    # Get the id from the database since the save endpoint doesn't return it
    topology_id = db.execute(
        "SELECT id FROM saved_topologies WHERE user_email = 'topo3@test.com'"
    ).fetchone()[0]
    integration_client.delete(f'/delete-topology/{topology_id}', json={'email': 'topo3@test.com'})
    count = db.execute(
        "SELECT COUNT(*) FROM saved_topologies WHERE user_email = 'topo3@test.com'"
    ).fetchone()[0]
    assert count == 0
