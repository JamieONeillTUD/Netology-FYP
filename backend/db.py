"""
db.py
-----
Database connection setup for AWS RDS PostgreSQL.
"""

from dotenv import load_dotenv
import os, psycopg2

# Load environment variables from .env
load_dotenv()

def get_connection():
    """Create and return a new PostgreSQL connection."""
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD")
        )
        print("Connected to AWS RDS successfully!")
        return conn
    except Exception as e:
        print("Database connection failed:", e)
        return None
