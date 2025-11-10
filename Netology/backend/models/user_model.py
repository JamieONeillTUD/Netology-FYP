
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
    cur.execute('''INSERT INTO users (first_name,last_name,username,email,password_hash,level,reasons)
                   VALUES (%s,%s,%s,%s,%s,%s,%s)''',
                (first_name,last_name,username,email,password_hash,level,reasons_csv))
    conn.commit(); cur.close(); conn.close()

def get_user_by_email(email):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    row = cur.fetchone(); cur.close(); conn.close()
    if not row: return None
    return {'id':row[0],'first_name':row[1],'last_name':row[2],'username':row[3],
            'email':row[4],'password_hash':row[5],'level':row[6],'reasons':row[7],'xp':row[8]}
