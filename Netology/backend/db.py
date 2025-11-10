# backend/db.py
import psycopg

def get_db_connection():
    """Connect to AWS PostgreSQL instance and return connection."""
    return psycopg.connect(
        host="netology-db.c58saiqicrvi.eu-west-1.rds.amazonaws.com",
        dbname="postgres",
        user="postgres",
        password="netology"
    )
