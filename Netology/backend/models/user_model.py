import psycopg2
from psycopg2.extras import RealDictCursor
from config import DB_CONFIG

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

def create_user(first_name, last_name, username, email, password_hash, level, reasons_csv):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO users (first_name, last_name, username, email, password_hash, level, reasons, xp)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 0);
        """, (first_name, last_name, username, email, password_hash, level, reasons_csv)
    )
    conn.commit()
    cur.close()
    conn.close()

def get_user_by_email(email):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    return user
