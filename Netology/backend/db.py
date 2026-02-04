# db.py
import os
import psycopg

def get_db_connection():
    # Render-style single connection string
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        # If your DB requires SSL, keep sslmode=require
        return psycopg.connect(database_url, sslmode=os.getenv("DB_SSLMODE", "require"))

    # Fallback: individual env vars (nice for local dev)
    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        dbname=os.getenv("DB_NAME", "postgres"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
        port=os.getenv("DB_PORT", "5432"),
        sslmode=os.getenv("DB_SSLMODE", "disable"),  # local usually disable
    )
