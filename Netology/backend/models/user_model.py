import psycopg2
from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def create_user(first_name, last_name, username, email, password_hash, level, reasons_csv):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO users (first_name, last_name, username, email, password_hash, level, reasons)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (first_name, last_name, username, email, password_hash, level, reasons_csv))
    conn.commit()
    cur.close()
    conn.close()

def get_user_by_email(email):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    if user:
        return {
            'id': user[0],
            'first_name': user[1],
            'last_name': user[2],
            'username': user[3],
            'email': user[4],
            'password_hash': user[5],
            'level': user[6],
            'reasons': user[7],
            'xp': user[8]
        }
    return None
