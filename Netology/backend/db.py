"""
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

Python (Flask) – Netology Learning Platform
-------------------------------------------
db.py – Database connection module.
Creates and returns a connection to the AWS PostgreSQL database.
Used by all backend routes (auth_routes, course_routes, xp_system).
"""

import psycopg

# =====================================================
# DATABASE CONNECTION
# =====================================================
def get_db_connection():
    """
    Connect to AWS RDS PostgreSQL database and return the connection.
    Each route will open and close this connection as needed.
    """
    return psycopg.connect(
        host="netology-db.c58saiqicrvi.eu-west-1.rds.amazonaws.com",
        dbname="postgres",
        user="postgres",
        password="netology"
    )
