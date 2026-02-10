# db.py
import os
import psycopg

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Build DSN from individual env vars (local dev)
    host = os.getenv("DB_HOST", "localhost")
    dbname = os.getenv("DB_NAME", "postgres")
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "")
    port = os.getenv("DB_PORT", "5432")
    sslmode = os.getenv("DB_SSLMODE", "disable")
    DATABASE_URL = (
        f"host={host} dbname={dbname} user={user} password={password} "
        f"port={port} sslmode={sslmode}"
    )

def get_db_connection():
    return psycopg.connect(DATABASE_URL)
