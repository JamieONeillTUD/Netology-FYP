"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

onboarding_routes.py - Onboarding Tour Routes
---
This file handles the backend routes used by the Netology
onboarding tour. It starts the tour, records completed steps,
marks the tour as completed or skipped, and returns the small
API response used by the onboarding flow.

These routes are mainly used by onboarding-tour.js.
"""

from flask import Blueprint, jsonify, request

from achievement_engine import evaluate_achievements_for_event
from db import email_from, get_db_connection

onboarding = Blueprint("onboarding", __name__)

def request_data():
    # Read JSON request data and fall back to an empty dictionary.
    return request.get_json(silent=True) or {}


def request_user_email():
    # Read and clean the user email sent to the onboarding routes.
    return email_from(request_data().get("user_email"))


@onboarding.post("/api/onboarding/start")
def start_onboarding():
    # Mark the onboarding tour as started.
    user_email = request_user_email()
    if not user_email:
        return jsonify({"error": "user_email required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO user_tour_progress (user_email, current_step) VALUES (%s, 1) ON CONFLICT (user_email) DO UPDATE SET current_step = 1",
            (user_email,),
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        print("start_onboarding error:", e)
        return jsonify({"error": "Could not start tour"}), 500
    finally:
        cur.close()
        conn.close()


@onboarding.post("/api/onboarding/complete")
def complete_onboarding():
    # Mark the onboarding tour as completed.
    user_email = request_user_email()
    if not user_email:
        return jsonify({"error": "user_email required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE users SET is_first_login = FALSE, onboarding_completed = TRUE, onboarding_completed_at = CURRENT_TIMESTAMP WHERE email = %s",
            (user_email,),
        )
        cur.execute(
            "UPDATE user_tour_progress SET tour_completed = TRUE, tour_completed_at = CURRENT_TIMESTAMP WHERE user_email = %s",
            (user_email,),
        )
        conn.commit()
    except Exception as e:
        print("complete_onboarding error:", e)
        return jsonify({"error": "Could not complete onboarding"}), 500
    finally:
        cur.close()
        conn.close()

    newly_unlocked = evaluate_achievements_for_event(user_email, "onboarding_complete")
    achievement_xp_added = sum(int(item.get("xp_added") or 0) for item in newly_unlocked)
    return jsonify({
        "success": True,
        "newly_unlocked": newly_unlocked,
        "achievement_xp_added": achievement_xp_added,
    })


@onboarding.post("/api/onboarding/skip")
def skip_onboarding():
    # Mark the onboarding tour as skipped.
    user_email = request_user_email()
    if not user_email:
        return jsonify({"error": "user_email required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE users SET is_first_login = FALSE, onboarding_completed = TRUE WHERE email = %s",
            (user_email,),
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        print("skip_onboarding error:", e)
        return jsonify({"error": "Could not skip tour"}), 500
    finally:
        cur.close()
        conn.close()


@onboarding.get("/api/onboarding/steps")
def get_onboarding_steps():
    # Return an empty list because the real tour steps live in onboarding-tour.js.
    return jsonify({"success": True, "steps": []})


@onboarding.post("/api/onboarding/step/<string:stage_id>")
def complete_onboarding_step(stage_id):
    # Record one completed onboarding stage.
    user_email = request_user_email()
    if not user_email:
        return jsonify({"error": "user_email required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO user_tour_progress (user_email, current_step, steps_completed)
            VALUES (%s, 1, 1)
            ON CONFLICT (user_email) DO UPDATE
              SET steps_completed = user_tour_progress.steps_completed + 1,
                  updated_at = CURRENT_TIMESTAMP
            """,
            (user_email,),
        )
        conn.commit()
        return jsonify({"success": True, "stage": stage_id})
    except Exception as e:
        print("complete_onboarding_step error:", e)
        return jsonify({"error": "Could not record step"}), 500
    finally:
        cur.close()
        conn.close()
