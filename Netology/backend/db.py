"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

db.py - Database Helpers
---
This file contains the shared database helper functions used
across the Netology backend. It opens PostgreSQL connections
and also includes a couple of small utility helpers for
cleaning emails and safely converting values to integers.

These helpers are reused by most backend route files.
"""

import os
import psycopg

def connection_dsn():
    # Build the PostgreSQL connection string from environment variables.
    return os.getenv("DATABASE_URL") or (
        f"host={os.getenv('DB_HOST', 'localhost')} "
        f"dbname={os.getenv('DB_NAME', 'postgres')} "
        f"user={os.getenv('DB_USER', 'postgres')} "
        f"password={os.getenv('DB_PASSWORD', '')} "
        f"port={os.getenv('DB_PORT', '5432')} "
        f"sslmode={os.getenv('DB_SSLMODE', 'disable')}"
    )


def get_db_connection():
    # Open a new PostgreSQL connection for the app.
    return psycopg.connect(connection_dsn())


def to_int(value, default=0):
    # Convert a value to an integer and fall back if it fails.
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def email_from(value):
    # Clean an email value by trimming spaces and forcing lowercase.
    return str(value or "").strip().lower()
