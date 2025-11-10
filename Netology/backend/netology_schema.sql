
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

ALTER TABLE users
ADD COLUMN numeric_level INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    total_lessons INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 100,
    difficulty VARCHAR(50) DEFAULT 'Novice',
    category VARCHAR(50) DEFAULT 'General',
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS user_courses (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email),
    course_id INTEGER REFERENCES courses(id),
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS xp_log (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email),
    action VARCHAR(255),
    xp_awarded INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO courses (title, description, total_lessons, xp_reward, difficulty, category)
VALUES
('Network Fundamentals', 'Learn the building blocks of computer networking.', 10, 200, 'Novice', 'Core'),
('TCP/IP Protocol Suite', 'Understand how TCP/IP enables internet communication.', 15, 300, 'Intermediate', 'Core'),
('Routing & Switching Basics', 'Explore routing concepts and switch configuration.', 12, 250, 'Intermediate', 'Core'),
('Network Security Essentials', 'Introduction to securing networks and devices.', 8, 180, 'Novice', 'Security'),
('Subnetting Mastery', 'Master subnetting and IP addressing.', 10, 220, 'Advanced', 'IP'),
('Wireless Networking', 'Configure and manage wireless LANs.', 6, 150, 'Intermediate', 'Wireless'),
('WAN Technologies', 'Study wide area networking and VPNs.', 7, 170, 'Advanced', 'Core'),
('Cloud Networking', 'Learn networking concepts for cloud environments.', 9, 200, 'Advanced', 'Cloud');
