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


# saving and loading topologies
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
