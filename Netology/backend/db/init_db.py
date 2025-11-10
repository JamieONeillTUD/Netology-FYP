import psycopg2
from config import DB_CONFIG

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    level VARCHAR(50) DEFAULT 'Novice',
    reasons TEXT, -- comma separated list
    xp INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")

conn.commit()
cur.close()
conn.close()
print("✅ Database initialized successfully.")
