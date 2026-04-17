"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

test_topology.py - Sandbox Save and Load Tests
---
This file checks the lesson session and saved topology routes.

It covers:
  1. Saving and loading lesson sessions.
  2. Saving, loading, and deleting named topologies.
  3. The database writes behind those routes.

The tests stay small so the sandbox data flow is easy to read.
"""

import json


# POST /lesson-session/save

def test_save_lesson_session_ok(integration_client, make_user):
    make_user("session_api@test.com")
    resp = integration_client.post(
        "/lesson-session/save",
        json={
            "email": "session_api@test.com",
            "course_id": 1,
            "lesson_number": 1,
            "devices": [{"id": "router1"}],
            "connections": [],
        },
    )
    assert resp.status_code == 200


def test_save_lesson_session_missing_email(integration_client):
    resp = integration_client.post(
        "/lesson-session/save",
        json={"course_id": 1, "lesson_number": 1, "devices": [], "connections": []},
    )
    assert resp.status_code == 400


def test_save_lesson_session_missing_devices(integration_client):
    resp = integration_client.post(
        "/lesson-session/save",
        json={"email": "user@test.com", "course_id": 1, "lesson_number": 1},
    )
    assert resp.status_code == 400


# GET /lesson-session/load

def test_load_lesson_session_returns_data(integration_client, make_user):
    make_user("session_load_api@test.com")
    integration_client.post(
        "/lesson-session/save",
        json={
            "email": "session_load_api@test.com",
            "course_id": 1,
            "lesson_number": 1,
            "devices": [{"id": "router1"}],
            "connections": [],
        },
    )
    resp = integration_client.get("/lesson-session/load?email=session_load_api@test.com&course_id=1&lesson_number=1")
    body = json.loads(resp.data)
    assert "devices" in body
    assert "connections" in body


def test_load_lesson_session_missing_email(integration_client):
    resp = integration_client.get("/lesson-session/load?course_id=1&lesson_number=1")
    assert resp.status_code == 400


def test_load_lesson_session_missing_course_id(integration_client):
    resp = integration_client.get("/lesson-session/load?email=user@test.com&lesson_number=1")
    assert resp.status_code == 400


# POST /save-topology

def test_save_topology_ok(integration_client, make_user):
    make_user("topo_api@test.com")
    resp = integration_client.post(
        "/save-topology",
        json={
            "email": "topo_api@test.com",
            "name": "My Network",
            "devices": [{"id": "router1"}],
            "connections": [],
        },
    )
    assert resp.status_code == 200


def test_save_topology_missing_email(integration_client):
    resp = integration_client.post(
        "/save-topology",
        json={"name": "My Network", "devices": [{"id": "router1"}], "connections": []},
    )
    assert resp.status_code == 400


def test_save_topology_missing_devices(integration_client):
    resp = integration_client.post(
        "/save-topology",
        json={"email": "user@test.com", "name": "My Network", "connections": []},
    )
    assert resp.status_code == 400


# GET /load-topologies and DELETE /delete-topology

def test_load_topologies_returns_list(integration_client, make_user):
    make_user("topo_load_api@test.com")
    resp = integration_client.get("/load-topologies?email=topo_load_api@test.com")
    body = json.loads(resp.data)
    assert "topologies" in body


def test_load_topologies_missing_email(integration_client):
    resp = integration_client.get("/load-topologies")
    assert resp.status_code == 400


def test_delete_topology_missing_email(integration_client):
    resp = integration_client.delete("/delete-topology/1", json={})
    assert resp.status_code == 400


# Real database checks

def test_save_topology_writes_row(integration_client, make_user, db):
    make_user("topo@test.com")
    integration_client.post(
        "/save-topology",
        json={
            "email": "topo@test.com",
            "name": "Test Network",
            "devices": [{"id": "router1", "type": "router"}],
            "connections": [],
        },
    )
    row = db.execute("SELECT name FROM saved_topologies WHERE user_email = 'topo@test.com'").fetchone()
    assert row is not None
    assert row[0] == "Test Network"


def test_saved_topology_appears_in_list(integration_client, make_user):
    make_user("topo2@test.com")
    integration_client.post(
        "/save-topology",
        json={
            "email": "topo2@test.com",
            "name": "My Topology",
            "devices": [{"id": "switch1"}],
            "connections": [],
        },
    )
    resp = integration_client.get("/load-topologies?email=topo2@test.com")
    body = json.loads(resp.data)
    assert len(body["topologies"]) == 1
    assert body["topologies"][0]["name"] == "My Topology"


def test_delete_topology_removes_row(integration_client, make_user, db):
    make_user("topo3@test.com")
    integration_client.post(
        "/save-topology",
        json={
            "email": "topo3@test.com",
            "name": "To Delete",
            "devices": [{"id": "pc1"}],
            "connections": [],
        },
    )
    topology_id = db.execute(
        "SELECT id FROM saved_topologies WHERE user_email = 'topo3@test.com'"
    ).fetchone()[0]
    integration_client.delete(f"/delete-topology/{topology_id}", json={"email": "topo3@test.com"})
    count = db.execute("SELECT COUNT(*) FROM saved_topologies WHERE user_email = 'topo3@test.com'").fetchone()[0]
    assert count == 0
