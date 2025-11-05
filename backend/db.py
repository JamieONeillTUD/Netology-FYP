"""
db.py
-----
Database connection setup for AWS RDS PostgreSQL.
"""

from dotenv import load_dotenv
import os
import psycopg2

# Load environment variables from .env
load_dotenv()

def get_connection():
    """Create and return a new PostgreSQL connection."""

    required_vars = ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD")
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        missing_str = ", ".join(sorted(missing))
        raise RuntimeError(
            f"Missing required database environment variables: {missing_str}. "
            "Check your .env configuration."
        )

    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
        )
        print("Connected to AWS RDS successfully!")
        return conn
    except psycopg2.OperationalError as exc:
        raise RuntimeError(
            "Database connection failed. Verify the credentials and network connectivity."
        ) from exc
    except Exception as exc:  # pragma: no cover - unexpected error path
        raise RuntimeError("Unexpected error while connecting to the database.") from exc
