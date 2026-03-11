"""
topology_routes.py - Sandbox topology and lesson-session API routes.
"""

from contextlib import contextmanager
import json

from flask import Blueprint, jsonify, request

from db import get_db_connection

topology = Blueprint("topology", __name__)

# Architecture note:
# This module only handles runtime API behavior. Database tables should be
# managed by netology_schema.sql migrations, not created in request handlers.


@contextmanager
def _db_cursor():
    """Open a DB connection/cursor and always close both."""
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        yield connection, cursor
    finally:
        try:
            cursor.close()
        finally:
            connection.close()


def _request_data():
    return request.get_json(silent=True) or {}


def _json_error(message, status_code):
    return jsonify({"success": False, "message": message}), status_code


def _to_int(value, default=None):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _normalize_email(value):
    return str(value or "").strip().lower()


@topology.route("/lesson-session/save", methods=["POST"])
def save_lesson_session():
    """Save sandbox state for one user/course/lesson tuple."""
    data = _request_data()
    email = _normalize_email(data.get("email"))
    course_id = _to_int(data.get("course_id"))
    lesson_number = _to_int(data.get("lesson_number"))
    devices = data.get("devices")
    connections = data.get("connections")

    if not email or course_id is None or lesson_number is None:
        return _json_error("email, course_id and lesson_number are required.", 400)

    # Devices/connections can be empty arrays, but both keys must be present.
    if devices is None or connections is None:
        return _json_error("devices and connections are required (can be empty arrays).", 400)

    try:
        with _db_cursor() as (connection, cursor):
            cursor.execute(
                """
                INSERT INTO lesson_sessions (user_email, course_id, lesson_number, devices, connections)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_email, course_id, lesson_number)
                DO UPDATE SET
                    devices = EXCLUDED.devices,
                    connections = EXCLUDED.connections,
                    updated_at = CURRENT_TIMESTAMP;
                """,
                (
                    email,
                    course_id,
                    lesson_number,
                    json.dumps(devices),
                    json.dumps(connections),
                ),
            )
            connection.commit()

        return jsonify({"success": True, "message": "Lesson session saved."})
    except Exception as error:
        print("save_lesson_session error:", error)
        return _json_error("Could not save lesson session.", 500)


@topology.route("/lesson-session/load", methods=["GET"])
def load_lesson_session():
    """Load sandbox state for one user/course/lesson tuple."""
    email = _normalize_email(request.args.get("email"))
    course_id = _to_int(request.args.get("course_id"))
    lesson_number = _to_int(request.args.get("lesson_number"))

    if not email or course_id is None or lesson_number is None:
        return _json_error("email, course_id and lesson_number are required.", 400)

    try:
        with _db_cursor() as (_connection, cursor):
            cursor.execute(
                """
                SELECT devices, connections, updated_at
                FROM lesson_sessions
                WHERE user_email = %s AND course_id = %s AND lesson_number = %s
                LIMIT 1;
                """,
                (email, course_id, lesson_number),
            )
            row = cursor.fetchone()

        # If nothing saved yet, return empty session (still success).
        if not row:
            return jsonify(
                {
                    "success": True,
                    "found": False,
                    "devices": [],
                    "connections": [],
                    "updated_at": None,
                }
            )

        return jsonify(
            {
                "success": True,
                "found": True,
                "devices": row[0] or [],
                "connections": row[1] or [],
                "updated_at": row[2],
            }
        )
    except Exception as error:
        print("load_lesson_session error:", error)
        return _json_error("Could not load lesson session.", 500)


@topology.route("/save-topology", methods=["POST"])
def save_topology():
    """Save a named topology snapshot for a user."""
    data = _request_data()
    email = _normalize_email(data.get("email"))
    name = data.get("name")
    devices = data.get("devices")
    connections = data.get("connections")

    # Keep existing behavior for devices (must be truthy) and also guard
    # connections to avoid DB NOT NULL errors.
    if not email or not devices or connections is None:
        return _json_error("Missing data", 400)

    try:
        with _db_cursor() as (connection, cursor):
            cursor.execute(
                """
                INSERT INTO saved_topologies (user_email, name, devices, connections)
                VALUES (%s, %s, %s, %s)
                """,
                (email, name, json.dumps(devices), json.dumps(connections)),
            )
            connection.commit()

        return jsonify({"success": True, "message": "Topology saved!"})
    except Exception as error:
        print("save_topology error:", error)
        return _json_error("Save failed", 500)


@topology.route("/load-topologies", methods=["GET"])
def load_topologies():
    """Load all saved topologies for one user."""
    email = _normalize_email(request.args.get("email"))
    if not email:
        return _json_error("Email required.", 400)

    try:
        with _db_cursor() as (_connection, cursor):
            cursor.execute(
                """
                SELECT id, name, devices, connections, created_at
                FROM saved_topologies
                WHERE user_email = %s
                ORDER BY created_at DESC
                """,
                (email,),
            )
            rows = cursor.fetchall()

        topologies = [
            {
                "id": row[0],
                "name": row[1],
                "devices": row[2],
                "connections": row[3],
                "created_at": row[4],
            }
            for row in rows
        ]
        return jsonify({"success": True, "topologies": topologies})
    except Exception as error:
        print("load_topologies error:", error)
        return _json_error("Could not load topologies.", 500)


@topology.route("/load-topology/<int:tid>", methods=["GET"])
def load_topology(tid):
    """Load one saved topology by its ID."""
    try:
        with _db_cursor() as (_connection, cursor):
            cursor.execute(
                """
                SELECT devices, connections
                FROM saved_topologies
                WHERE id = %s
                """,
                (tid,),
            )
            row = cursor.fetchone()

        if not row:
            return _json_error("Not found", 404)

        return jsonify({"success": True, "devices": row[0], "connections": row[1]})
    except Exception as error:
        print("load_topology error:", error)
        return _json_error("Could not load topology.", 500)


@topology.route("/delete-topology/<int:tid>", methods=["DELETE"])
def delete_topology(tid):
    """Delete one topology if it belongs to the requesting user."""
    data = _request_data()
    email = _normalize_email(data.get("email"))
    if not email:
        return _json_error("Email required.", 400)

    try:
        with _db_cursor() as (connection, cursor):
            cursor.execute(
                "DELETE FROM saved_topologies WHERE id = %s AND user_email = %s",
                (tid, email),
            )
            connection.commit()

        return jsonify({"success": True, "message": "Topology deleted."})
    except Exception as error:
        print("delete_topology error:", error)
        return _json_error("Delete failed", 500)
