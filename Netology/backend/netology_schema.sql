-- NETOLOGY LEARNING PLATFORM – DATABASE SCHEMA
-- Student: Jamie O’Neill (C22320301)
-- Course: TU857/4
-- Date: 10/11/2025

-- Users Table
DROP TABLE IF EXISTS xp_log CASCADE;
DROP TABLE IF EXISTS user_courses CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    level VARCHAR(50) DEFAULT 'Novice',
    numeric_level INTEGER DEFAULT 0,
    reasons TEXT,                         -- Stores reasons selected during signup
    xp INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses Table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    total_lessons INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 100,
    difficulty VARCHAR(50) DEFAULT 'Novice',
    category VARCHAR(50) DEFAULT 'General',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- User Courses Table
-- Tracks which user started/completed which course
CREATE TABLE user_courses (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- XP Log Table
-- Logs user XP gains
CREATE TABLE xp_log (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    action VARCHAR(255),
    xp_awarded INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Future addition : Lessons Table
-- Allows individual lesson tracking inside each course
CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    order_number INTEGER DEFAULT 1,
    xp_value INTEGER DEFAULT 10
);

-- Sample courses data
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

