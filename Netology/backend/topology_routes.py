"""
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

Python (Flask)
-------------------------------------------
Topology Routes – Save and Load Topologies

"""
from flask import Blueprint, request, jsonify
from db import get_db_connection
import json

topology = Blueprint("topology", __name__)


# AI Prompt: Explain the NEW (Part 3.2): section in clear, simple terms.
# ---------------------------
# NEW (Part 3.2):
# Lesson session save/load (per lesson sandbox state)
# Stores everything in DB (no localStorage dependency)
# ---------------------------
"""
AI PROMPTED CODE BELOW
"Can you create a table and routes that save/load the sandbox state for a specific course lesson
so the user can return to the exact same lesson session later?"
"""

# AI Prompt: Explain the Lesson session storage section in clear, simple terms.
# =========================================================
# Lesson session storage
# =========================================================
def ensure_lesson_sessions_table():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS lesson_sessions (
            id SERIAL PRIMARY KEY,
            user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
            course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            lesson_number INTEGER NOT NULL,
            devices JSONB NOT NULL,
            connections JSONB NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_email, course_id, lesson_number)
        );
    """)
    conn.commit()
    cur.close()
    conn.close()


# AI Prompt: Explain the Lesson session save route section in clear, simple terms.
# =========================================================
# Lesson session save route
# =========================================================
@topology.route("/lesson-session/save", methods=["POST"])
def save_lesson_session():
    """
    Saves a sandbox session for a specific lesson.
    Expected JSON:
      email, course_id, lesson_number, devices, connections
    """
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    course_id = data.get("course_id")
    lesson_number = data.get("lesson_number")
    devices = data.get("devices")
    connections = data.get("connections")

    if not email or not course_id or lesson_number is None:
        return jsonify({"success": False, "message": "email, course_id and lesson_number are required."}), 400

    # Devices/connections can be empty arrays, but must exist
    if devices is None or connections is None:
        return jsonify({"success": False, "message": "devices and connections are required (can be empty arrays)."}), 400

    try:
        ensure_lesson_sessions_table()

        conn = get_db_connection()
        cur = conn.cursor()

        # Upsert per (user, course, lesson)
        cur.execute("""
            INSERT INTO lesson_sessions (user_email, course_id, lesson_number, devices, connections)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_email, course_id, lesson_number)
            DO UPDATE SET
                devices = EXCLUDED.devices,
                connections = EXCLUDED.connections,
                updated_at = CURRENT_TIMESTAMP;
        """, (
            email,
            int(course_id),
            int(lesson_number),
            json.dumps(devices),
            json.dumps(connections)
        ))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Lesson session saved."})

    except Exception as e:
        print("save_lesson_session error:", e)
        return jsonify({"success": False, "message": "Could not save lesson session."}), 500


# AI Prompt: Explain the Lesson session load route section in clear, simple terms.
# =========================================================
# Lesson session load route
# =========================================================
@topology.route("/lesson-session/load", methods=["GET"])
def load_lesson_session():
    """
    Loads a sandbox session for a specific lesson.
    Query params:
      email, course_id, lesson_number
    """
    email = request.args.get("email")
    course_id = request.args.get("course_id")
    lesson_number = request.args.get("lesson_number")

    if not email or not course_id or lesson_number is None:
        return jsonify({"success": False, "message": "email, course_id and lesson_number are required."}), 400

    try:
        ensure_lesson_sessions_table()

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT devices, connections, updated_at
            FROM lesson_sessions
            WHERE user_email = %s AND course_id = %s AND lesson_number = %s
            LIMIT 1;
        """, (email, int(course_id), int(lesson_number)))

        row = cur.fetchone()
        cur.close()
        conn.close()

        # If nothing saved yet, return empty session (still success)
        if not row:
            return jsonify({
                "success": True,
                "found": False,
                "devices": [],
                "connections": [],
                "updated_at": None
            })

        return jsonify({
            "success": True,
            "found": True,
            "devices": row[0] or [],
            "connections": row[1] or [],
            "updated_at": row[2]
        })

    except Exception as e:
        print("load_lesson_session error:", e)
        return jsonify({"success": False, "message": "Could not load lesson session."}), 500


# saving and loading topologies
# AI Prompt: Explain the Save topology route section in clear, simple terms.
# =========================================================
# Save topology route
# =========================================================
@topology.route("/save-topology", methods=["POST"])
def save_topology():
    data = request.get_json()

    email = data.get("email")
    name = data.get("name")
    devices = data.get("devices")
    connections = data.get("connections")

    if not email or not devices:
        return jsonify({"success": False, "message": "Missing data"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO saved_topologies (user_email, name, devices, connections)
            VALUES (%s, %s, %s, %s)
        """, (email, name, json.dumps(devices), json.dumps(connections)))

        conn.commit()
        cur.close(); conn.close()

        return jsonify({"success": True, "message": "Topology saved!"})

    except Exception as e:
        print("Save error:", e)
        return jsonify({"success": False, "message": "Save failed"}), 500

# Loading saved topologies
# AI Prompt: Explain the Load topologies list section in clear, simple terms.
# =========================================================
# Load topologies list
# =========================================================
@topology.route("/load-topologies", methods=["GET"])
def load_topologies():
    email = request.args.get("email")

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, devices, connections, created_at
        FROM saved_topologies
        WHERE user_email = %s
        ORDER BY created_at DESC
    """, (email,))

    rows = cur.fetchall()
    cur.close(); conn.close()

    topologies = []
    for r in rows:
        topologies.append({
            "id": r[0],
            "name": r[1],
            "devices": r[2],
            "connections": r[3],
            "created_at": r[4]
        })

    return jsonify({"success": True, "topologies": topologies})

# Loading a specific topology by ID
# AI Prompt: Explain the Load single topology section in clear, simple terms.
# =========================================================
# Load single topology
# =========================================================
@topology.route("/load-topology/<int:tid>", methods=["GET"])
def load_topology(tid):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT devices, connections
        FROM saved_topologies
        WHERE id = %s
    """, (tid,))

    row = cur.fetchone()
    cur.close(); conn.close()

    if not row:
        return jsonify({"success": False, "message": "Not found"}), 404

    return jsonify({
        "success": True,
        "devices": row[0],
        "connections": row[1]
    })

# Deleting a topology by ID
# AI Prompt: Explain the Delete topology section in clear, simple terms.
# =========================================================
# Delete topology
# =========================================================
@topology.route("/delete-topology/<int:tid>", methods=["DELETE"])
def delete_topology(tid):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("DELETE FROM saved_topologies WHERE id = %s", (tid,))
        conn.commit()

        cur.close(); conn.close()

        return jsonify({"success": True, "message": "Topology deleted."})

    except Exception as e:
        print("Delete error:", e)
        return jsonify({"success": False, "message": "Delete failed"}), 500
