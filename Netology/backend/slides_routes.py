"""slides_routes.py - Lesson slides and notes/bookmark API routes."""

from flask import Blueprint, jsonify, request

from db import get_db_connection
from xp_system import add_xp_to_user

slides = Blueprint("slides", __name__)


def _request_data():
    return request.get_json(silent=True) or {}


@slides.get("/api/lessons/<int:lesson_id>/slides")
def get_lesson_slides(lesson_id):
    """Get all slides for a lesson."""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT id, slide_number, title, slide_type, estimated_time_seconds
            FROM lesson_slides
            WHERE lesson_id = %s
            ORDER BY slide_number
            """,
            (lesson_id,),
        )

        slide_rows = cur.fetchall()
        payload = [
            {"id": r[0], "slide_number": r[1], "title": r[2], "type": r[3], "est_time": r[4]}
            for r in slide_rows
        ]

        return jsonify({"success": True, "slides": payload, "total": len(payload)})
    finally:
        cur.close()
        conn.close()


@slides.get("/api/lessons/<int:lesson_id>/slides/<int:slide_id>")
def get_slide_content(lesson_id, slide_id):
    """Get full slide content."""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT id, slide_number, title, slide_type, content, code_snippet,
                   code_language, image_url, video_url, explanation, estimated_time_seconds
            FROM lesson_slides
            WHERE id = %s AND lesson_id = %s
            """,
            (slide_id, lesson_id),
        )

        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Slide not found"}), 404

        slide = {
            "id": row[0],
            "slide_number": row[1],
            "title": row[2],
            "type": row[3],
            "content": row[4],
            "code_snippet": row[5],
            "code_language": row[6],
            "image_url": row[7],
            "video_url": row[8],
            "explanation": row[9],
            "estimated_time": row[10],
        }

        return jsonify({"success": True, "slide": slide})
    finally:
        cur.close()
        conn.close()


@slides.post("/api/lessons/<int:lesson_id>/slides/<int:slide_id>/complete")
def complete_slide(lesson_id, slide_id):
    """Mark slide as complete and award XP."""
    data = _request_data()
    user_email = data.get("user_email")
    time_spent = data.get("time_spent_seconds", 0)
    notes = data.get("notes", "")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO user_slide_progress (user_email, slide_id, lesson_id, time_spent_seconds, notes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_email, slide_id) DO UPDATE
            SET completed_at = CURRENT_TIMESTAMP, time_spent_seconds = %s
            """,
            (user_email, slide_id, lesson_id, time_spent, notes, time_spent),
        )

        conn.commit()

        xp_awarded = 5
        add_xp_to_user(user_email, xp_awarded, f"Completed slide {slide_id}")
        return jsonify({"success": True, "xp_awarded": xp_awarded})
    finally:
        cur.close()
        conn.close()


@slides.get("/api/lessons/<int:lesson_id>/progress")
def get_lesson_progress(lesson_id):
    """Get lesson completion progress."""
    user_email = request.args.get("user_email")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("SELECT COUNT(*) FROM lesson_slides WHERE lesson_id = %s", (lesson_id,))
        total = cur.fetchone()[0]

        cur.execute(
            """
            SELECT COUNT(*) FROM user_slide_progress
            WHERE lesson_id = %s AND user_email = %s AND completed_at IS NOT NULL
            """,
            (lesson_id, user_email),
        )

        completed = cur.fetchone()[0]
        percent = int((completed / total * 100)) if total > 0 else 0

        return jsonify(
            {
                "success": True,
                "lesson_id": lesson_id,
                "slides_total": total,
                "slides_completed": completed,
                "percent_complete": percent,
            }
        )
    finally:
        cur.close()
        conn.close()


@slides.post("/api/slides/<int:slide_id>/bookmark")
def toggle_bookmark(slide_id):
    """Toggle bookmark on a slide."""
    data = _request_data()
    user_email = data.get("user_email")
    note = data.get("note", "")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO user_slide_bookmarks (user_email, slide_id, note)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_email, slide_id) DO DELETE
            """,
            (user_email, slide_id, note),
        )
        conn.commit()
        return jsonify({"success": True, "message": "Bookmark toggled"})
    finally:
        cur.close()
        conn.close()


@slides.get("/api/user/bookmarks")
def get_user_bookmarks():
    """Get all user bookmarks."""
    user_email = request.args.get("user_email")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT ls.id, ls.title, ls.slide_number, ls.lesson_id, usb.note
            FROM user_slide_bookmarks usb
            JOIN lesson_slides ls ON usb.slide_id = ls.id
            WHERE usb.user_email = %s
            ORDER BY usb.bookmarked_at DESC
            """,
            (user_email,),
        )

        bookmarks = [
            {"slide_id": r[0], "title": r[1], "slide_number": r[2], "lesson_id": r[3], "note": r[4]}
            for r in cur.fetchall()
        ]
        return jsonify({"success": True, "bookmarks": bookmarks})
    finally:
        cur.close()
        conn.close()


@slides.post("/api/slides/<int:slide_id>/notes")
def save_slide_notes(slide_id):
    """Save notes on a slide."""
    data = _request_data()
    user_email = data.get("user_email")
    note_text = data.get("note_text", "")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            UPDATE user_slide_progress
            SET notes = %s
            WHERE user_email = %s AND slide_id = %s
            """,
            (note_text, user_email, slide_id),
        )
        conn.commit()
        return jsonify({"success": True, "message": "Notes saved"})
    finally:
        cur.close()
        conn.close()
