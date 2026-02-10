# db.py
import os
import psycopg
from psycopg_pool import ConnectionPool

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

# Connection pool (cuts latency on Render)
pool = ConnectionPool(
    DATABASE_URL,
    min_size=1,
    max_size=5,
    timeout=10,
)

def get_db_connection():
    # Returns a pooled connection; close() returns it to the pool
    return pool.connection()
