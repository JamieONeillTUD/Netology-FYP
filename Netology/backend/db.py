# db.py — Database connection helper and shared utilities.

import os
import psycopg


def get_db_connection():
    # Open a new PostgreSQL connection using DATABASE_URL or individual env vars.
    dsn = os.getenv("DATABASE_URL") or (
        f"host={os.getenv('DB_HOST', 'localhost')} "
        f"dbname={os.getenv('DB_NAME', 'postgres')} "
        f"user={os.getenv('DB_USER', 'postgres')} "
        f"password={os.getenv('DB_PASSWORD', '')} "
        f"port={os.getenv('DB_PORT', '5432')} "
        f"sslmode={os.getenv('DB_SSLMODE', 'disable')}"
    )
    return psycopg.connect(dsn)


def to_int(value, default=0):
    # Safely converts any value to int. Returns default on failure.
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def email_from(value):
    # Lowercase and strip whitespace from an email string.
    return str(value or "").strip().lower()
