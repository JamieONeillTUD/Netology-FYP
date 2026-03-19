# onboarding_routes.py — Onboarding tour API routes.

from flask import Blueprint, jsonify, request

from achievement_engine import evaluate_achievements_for_event
from db import email_from, get_db_connection

onboarding = Blueprint("onboarding", __name__)


@onboarding.post("/api/onboarding/start")
def start_onboarding():
    # Mark onboarding as started.
    data = request.get_json(silent=True) or {}
    user_email = email_from(data.get("user_email"))
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
    # Mark onboarding as complete.
    data = request.get_json(silent=True) or {}
    user_email = email_from(data.get("user_email"))
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
    # Skip the onboarding tour.
    data = request.get_json(silent=True) or {}
    user_email = email_from(data.get("user_email"))
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
    # Returns an empty steps list — steps are defined client-side in onboarding-tour.js.
    # This endpoint exists so the tour's API call doesn't 404.
    return jsonify({"success": True, "steps": []})


@onboarding.post("/api/onboarding/step/<string:stage_id>")
def complete_onboarding_step(stage_id):
    # Record completion of a single onboarding stage step.
    data = request.get_json(silent=True) or {}
    user_email = email_from(data.get("user_email"))
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
