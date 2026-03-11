"""onboarding_routes.py - Onboarding API routes."""

from contextlib import contextmanager

from flask import Blueprint, jsonify, request

from achievement_engine import evaluate_achievements_for_event
from db import get_db_connection

onboarding = Blueprint("onboarding", __name__)


@contextmanager
def _db_cursor():
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


@onboarding.post("/api/onboarding/status")
def get_onboarding_status():
    """Check if user needs onboarding tour."""
    data = _request_data()
    user_email = data.get("user_email")
    if not user_email:
        return jsonify({"error": "user_email required"}), 400

    with _db_cursor() as (_connection, cursor):
        cursor.execute(
            """
            SELECT is_first_login, onboarding_completed
            FROM users WHERE email = %s
            """,
            (user_email,),
        )
        result = cursor.fetchone()
        if not result:
            return jsonify({"error": "User not found"}), 404

    is_first_login, onboarding_completed = result
    return jsonify(
        {
            "success": True,
            "is_first_login": is_first_login,
            "onboarding_completed": onboarding_completed,
            "total_steps": 7,
        }
    )


@onboarding.get("/api/onboarding/steps")
def get_tour_steps():
    """Return all onboarding tour steps."""
    steps = [
        {
            "id": 1,
            "title": "Welcome to Netology!",
            "description": "Let's get you started on your learning journey.",
            "target": "dashboard-header",
            "position": "bottom",
        },
        {
            "id": 2,
            "title": "Your Learning Courses",
            "description": "Browse 9 networking courses from Novice to Advanced.",
            "target": "courses-section",
            "position": "top",
        },
        {
            "id": 3,
            "title": "Track Your Progress",
            "description": "Watch your progress grow as you complete modules and challenges.",
            "target": "progress-widget",
            "position": "left",
        },
        {
            "id": 4,
            "title": "Earn Achievements",
            "description": "Unlock badges as you advance through the platform.",
            "target": "achievements-section",
            "position": "bottom",
        },
        {
            "id": 5,
            "title": "Daily Challenges",
            "description": "Complete challenges to earn bonus XP and streaks.",
            "target": "challenges-section",
            "position": "top",
        },
        {
            "id": 6,
            "title": "Practice in Sandbox",
            "description": "Execute real commands and build network topologies.",
            "target": "sandbox-link",
            "position": "right",
        },
        {
            "id": 7,
            "title": "Let's Start Learning!",
            "description": "Open your courses and continue building XP.",
            "target": "courses-section",
            "position": "center",
        },
    ]
    return jsonify({"success": True, "steps": steps, "total_steps": len(steps)})


@onboarding.post("/api/onboarding/start")
def start_onboarding():
    """Mark onboarding as started."""
    data = _request_data()
    user_email = data.get("user_email")
    if not user_email:
        return jsonify({"error": "user_email required"}), 400

    with _db_cursor() as (connection, cursor):
        cursor.execute(
            """
            INSERT INTO user_tour_progress (user_email, current_step) VALUES (%s, 1)
            ON CONFLICT (user_email) DO UPDATE SET current_step = 1
            """,
            (user_email,),
        )
        connection.commit()

    return jsonify({"success": True, "message": "Tour started", "current_step": 1})


@onboarding.post("/api/onboarding/step/<int:step_id>")
def complete_tour_step(step_id):
    """Mark a tour step as completed."""
    data = _request_data()
    user_email = data.get("user_email")
    if not user_email:
        return jsonify({"error": "user_email required"}), 400

    with _db_cursor() as (connection, cursor):
        cursor.execute(
            """
            UPDATE user_tour_progress
            SET current_step = %s, steps_completed = steps_completed + 1
            WHERE user_email = %s
            """,
            (step_id, user_email),
        )
        connection.commit()

    return jsonify({"success": True, "message": f"Step {step_id} completed"})


@onboarding.post("/api/onboarding/complete")
def complete_onboarding():
    """Mark onboarding tour as complete."""
    data = _request_data()
    user_email = data.get("user_email")
    if not user_email:
        return jsonify({"error": "user_email required"}), 400

    with _db_cursor() as (connection, cursor):
        cursor.execute(
            """
            UPDATE users
            SET is_first_login = FALSE, onboarding_completed = TRUE,
                onboarding_completed_at = CURRENT_TIMESTAMP
            WHERE email = %s
            """,
            (user_email,),
        )
        cursor.execute(
            """
            UPDATE user_tour_progress
            SET tour_completed = TRUE, tour_completed_at = CURRENT_TIMESTAMP
            WHERE user_email = %s
            """,
            (user_email,),
        )
        connection.commit()

    newly_unlocked = evaluate_achievements_for_event(user_email, "onboarding_complete")
    achievement_xp_added = sum(int(item.get("xp_added") or 0) for item in newly_unlocked)

    return jsonify(
        {
            "success": True,
            "message": "Welcome to Netology!",
            "redirectTo": "/dashboard",
            "newly_unlocked": newly_unlocked,
            "achievement_xp_added": achievement_xp_added,
        }
    )


@onboarding.post("/api/onboarding/skip")
def skip_onboarding():
    """Skip the onboarding tour."""
    data = _request_data()
    user_email = data.get("user_email")
    if not user_email:
        return jsonify({"error": "user_email required"}), 400

    with _db_cursor() as (connection, cursor):
        cursor.execute(
            """
            UPDATE users SET is_first_login = FALSE, onboarding_completed = TRUE
            WHERE email = %s
            """,
            (user_email,),
        )
        connection.commit()

    return jsonify({"success": True, "message": "Tour skipped"})
