"""
db.py – Database connection helper
"""

import os
import psycopg


def _build_database_url():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    # Build DSN from individual env vars (local dev fallback)
    host = os.getenv("DB_HOST", "localhost")
    dbname = os.getenv("DB_NAME", "postgres")
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "")
    port = os.getenv("DB_PORT", "5432")
    sslmode = os.getenv("DB_SSLMODE", "disable")
    return (
        f"host={host} dbname={dbname} user={user} password={password} "
        f"port={port} sslmode={sslmode}"
    )


def get_db_connection():
    return psycopg.connect(_build_database_url())
