-- Netology Database Schema
-- Final Year Project - Jamie O'Neill

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    level VARCHAR(50) DEFAULT 'Novice',
    reasons TEXT,
    xp INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example Queries
-- INSERT INTO users (first_name, last_name, username, email, password_hash, level, reasons, xp)
-- VALUES ('Jamie', 'O''Neill', 'jamieo', 'jamie@example.com', 'hashed_pass', 'Novice', 'career,academic', 0);

-- SELECT * FROM users WHERE email = 'jamie@example.com';
