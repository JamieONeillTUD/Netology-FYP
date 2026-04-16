"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

topology_routes.py - Sandbox Save and Load Routes
---
This file handles the backend routes used by the Netology
sandbox. It saves lesson session work in the background,
stores named topologies, loads saved topologies, and deletes
them when the user chooses to remove one.

These routes are mainly used by sandbox-ui.js and sandbox-app.js.
"""

import json

from flask import Blueprint, jsonify, request

from db import email_from, get_db_connection, to_int

topology = Blueprint("topology", __name__)

def request_data():
    # Read JSON request data and fall back to an empty dictionary.
    return request.get_json(silent=True) or {}


# Auto-session (background save while in a lesson)

@topology.post("/lesson-session/save")
def save_lesson_session():
    # Save the current sandbox state for one lesson.
    data = request_data()
    email = email_from(data.get("email"))
    course_id = to_int(data.get("course_id"), None)
    lesson_number = to_int(data.get("lesson_number"), None)
    devices = data.get("devices")
    connections = data.get("connections")

    if not email or course_id is None or lesson_number is None:
        return jsonify({"success": False, "message": "email, course_id and lesson_number are required."}), 400
    if devices is None or connections is None:
        return jsonify({"success": False, "message": "devices and connections are required (can be empty arrays)."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO lesson_sessions (user_email, course_id, lesson_number, devices, connections)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_email, course_id, lesson_number)
            DO UPDATE SET
                devices = EXCLUDED.devices,
                connections = EXCLUDED.connections,
                updated_at = CURRENT_TIMESTAMP
            """,
            (email, course_id, lesson_number, json.dumps(devices), json.dumps(connections)),
        )
        conn.commit()
        return jsonify({"success": True, "message": "Lesson session saved."})
    except Exception as e:
        print("save_lesson_session error:", e)
        return jsonify({"success": False, "message": "Could not save lesson session."}), 500
    finally:
        cur.close()
        conn.close()


@topology.get("/lesson-session/load")
def load_lesson_session():
    # Load the saved sandbox state for one lesson.
    email = email_from(request.args.get("email"))
    course_id = to_int(request.args.get("course_id"), None)
    lesson_number = to_int(request.args.get("lesson_number"), None)

    if not email or course_id is None or lesson_number is None:
        return jsonify({"success": False, "message": "email, course_id and lesson_number are required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT devices, connections
            FROM lesson_sessions
            WHERE user_email = %s AND course_id = %s AND lesson_number = %s
            LIMIT 1
            """,
            (email, course_id, lesson_number),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"success": True, "found": False, "devices": [], "connections": []})
        return jsonify({"success": True, "found": True, "devices": row[0] or [], "connections": row[1] or []})
    except Exception as e:
        print("load_lesson_session error:", e)
        return jsonify({"success": False, "message": "Could not load lesson session."}), 500
    finally:
        cur.close()
        conn.close()


#  Named saves (user-triggered from toolbar)

@topology.post("/save-topology")
def save_topology():
    # Save a named topology snapshot.
    data = request_data()
    email = email_from(data.get("email"))
    name = (data.get("name") or "").strip() or "Untitled"
    devices = data.get("devices")
    connections = data.get("connections")

    if not email or devices is None or connections is None:
        return jsonify({"success": False, "message": "Missing data"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO saved_topologies (user_email, name, devices, connections) VALUES (%s, %s, %s, %s)",
            (email, name, json.dumps(devices), json.dumps(connections)),
        )
        conn.commit()
        return jsonify({"success": True, "message": "Topology saved!"})
    except Exception as e:
        print("save_topology error:", e)
        return jsonify({"success": False, "message": "Save failed"}), 500
    finally:
        cur.close()
        conn.close()


@topology.get("/load-topologies")
def load_topologies():
    # List all named saves for a user.
    email = email_from(request.args.get("email"))
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, name, created_at FROM saved_topologies WHERE user_email = %s ORDER BY created_at DESC",
            (email,),
        )
        topologies = [
            {"id": r[0], "name": r[1], "created_at": r[2].isoformat() if r[2] else None}
            for r in cur.fetchall()
        ]
        return jsonify({"success": True, "topologies": topologies})
    except Exception as e:
        print("load_topologies error:", e)
        return jsonify({"success": False, "message": "Could not load topologies."}), 500
    finally:
        cur.close()
        conn.close()


@topology.get("/load-topology/<int:tid>")
def load_topology(tid):
    # Load one named save by ID for the matching user.
    email = email_from(request.args.get("email"))
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT devices, connections FROM saved_topologies WHERE id = %s AND user_email = %s",
            (tid, email),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Not found"}), 404
        return jsonify({"success": True, "devices": row[0], "connections": row[1]})
    except Exception as e:
        print("load_topology error:", e)
        return jsonify({"success": False, "message": "Could not load topology."}), 500
    finally:
        cur.close()
        conn.close()


@topology.delete("/delete-topology/<int:tid>")
def delete_topology(tid):
    # Delete one named topology that belongs to the user.
    data = request_data()
    email = email_from(data.get("email"))
    if not email:
        return jsonify({"success": False, "message": "Email required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM saved_topologies WHERE id = %s AND user_email = %s", (tid, email))
        conn.commit()
        return jsonify({"success": True, "message": "Topology deleted."})
    except Exception as e:
        print("delete_topology error:", e)
        return jsonify({"success": False, "message": "Delete failed"}), 500
    finally:
        cur.close()
        conn.close()
