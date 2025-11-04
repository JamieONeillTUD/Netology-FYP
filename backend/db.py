"""
db.py
-----
Simple connection to AWS RDS PostgreSQL using psycopg2.
"""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_connection():
    """Connect to the database and return the connection."""
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD")
        )
        print("Connected to AWS RDS PostgreSQL")
        return conn
    except psycopg2.Error as error:
        print("Database connection failed:", error)
        return None
