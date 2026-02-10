-- NETOLOGY LEARNING PLATFORM – DATABASE SCHEMA (SAFE MIGRATION)
-- Student: Jamie O’Neill (C22320301)
-- Course: TU857/4
-- Date: 2026-02-10

-- =========================================================
-- USERS
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    level VARCHAR(50) DEFAULT 'Novice',
    numeric_level INTEGER DEFAULT 1,
    reasons TEXT,
    xp INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns/defaults exist (safe for existing DBs)
ALTER TABLE users ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'Novice';
ALTER TABLE users ADD COLUMN IF NOT EXISTS numeric_level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reasons TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ALTER COLUMN numeric_level SET DEFAULT 1;
ALTER TABLE users ALTER COLUMN level SET DEFAULT 'Novice';

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users(username);

-- =========================================================
-- COURSES
-- =========================================================
CREATE TABLE IF NOT EXISTS courses (
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

ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_lessons INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 100;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50) DEFAULT 'Novice';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- =========================================================
-- USER COURSES
-- =========================================================
CREATE TABLE IF NOT EXISTS user_courses (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_courses ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE user_courses ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE user_courses ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE user_courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- De-duplicate (safe) before creating unique index for ON CONFLICT usage
DELETE FROM user_courses a
USING user_courses b
WHERE a.id < b.id
  AND a.user_email = b.user_email
  AND a.course_id = b.course_id;

CREATE UNIQUE INDEX IF NOT EXISTS user_courses_user_email_course_id_key
ON user_courses(user_email, course_id);

-- =========================================================
-- USER PREFERENCES
-- =========================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_email VARCHAR(255) PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
    weekly_summary BOOLEAN DEFAULT TRUE,
    streak_reminders BOOLEAN DEFAULT TRUE,
    new_course_alerts BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- USER ACHIEVEMENTS (PERSISTENT BADGES)
-- =========================================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    achievement_id VARCHAR(100) NOT NULL,
    name VARCHAR(150),
    description TEXT,
    tier VARCHAR(20),
    xp_awarded INTEGER DEFAULT 0,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_email, achievement_id)
);

-- =========================================================
-- LOGIN ACTIVITY (STREAKS)
-- =========================================================
CREATE TABLE IF NOT EXISTS user_logins (
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    login_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_email, login_date)
);

-- =========================================================
-- DETAILED COMPLETION TRACKING
-- =========================================================
CREATE TABLE IF NOT EXISTS user_lessons (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    xp_awarded INTEGER DEFAULT 0,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, course_id, lesson_number)
);

CREATE TABLE IF NOT EXISTS user_quizzes (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    xp_awarded INTEGER DEFAULT 0,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, course_id, lesson_number)
);

CREATE TABLE IF NOT EXISTS user_challenges (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    xp_awarded INTEGER DEFAULT 0,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, course_id, lesson_number)
);

-- Ensure xp_awarded exists if upgrading older tables
ALTER TABLE user_lessons ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0;
ALTER TABLE user_quizzes ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0;
ALTER TABLE user_challenges ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0;

-- =========================================================
-- XP LOG
-- =========================================================
CREATE TABLE IF NOT EXISTS xp_log (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    action VARCHAR(255),
    xp_awarded INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- LESSONS (OPTIONAL)
-- =========================================================
CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    order_number INTEGER DEFAULT 1,
    xp_value INTEGER DEFAULT 10
);

-- =========================================================
-- SANDBOX TOPOLOGIES
-- =========================================================
CREATE TABLE IF NOT EXISTS saved_topologies (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    devices JSONB NOT NULL,
    connections JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- LESSON SANDBOX SESSIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS lesson_sessions (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    devices JSONB NOT NULL DEFAULT '{}'::jsonb,
    connections JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_email, course_id, lesson_number)
);

-- =========================================================
-- LEGACY COMPLETION TABLES (SAFE TO KEEP)
-- =========================================================
CREATE TABLE IF NOT EXISTS lesson_completions (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_email, course_id, lesson_number)
);

CREATE TABLE IF NOT EXISTS quiz_completions (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_email, course_id, lesson_number)
);

CREATE TABLE IF NOT EXISTS challenge_completions (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_email, course_id, lesson_number)
);

-- =========================================================
-- SAMPLE COURSES (SAFE INSERT)
-- =========================================================
INSERT INTO courses (title, description, total_lessons, xp_reward, difficulty, category)
SELECT 'Network Fundamentals', 'Learn the building blocks of computer networking.', 10, 200, 'Novice', 'Core'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Network Fundamentals');

INSERT INTO courses (title, description, total_lessons, xp_reward, difficulty, category)
SELECT 'TCP/IP Protocol Suite', 'Understand how TCP/IP enables internet communication.', 15, 300, 'Intermediate', 'Core'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'TCP/IP Protocol Suite');

INSERT INTO courses (title, description, total_lessons, xp_reward, difficulty, category)
SELECT 'Routing & Switching Basics', 'Explore routing concepts and switch configuration.', 12, 250, 'Intermediate', 'Core'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Routing & Switching Basics');

INSERT INTO courses (title, description, total_lessons, xp_reward, difficulty, category)
SELECT 'Network Security Essentials', 'Introduction to securing networks and devices.', 8, 180, 'Novice', 'Security'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Network Security Essentials');

INSERT INTO courses (title, description, total_lessons, xp_reward, difficulty, category)
SELECT 'Subnetting Mastery', 'Master subnetting and IP addressing.', 10, 220, 'Advanced', 'IP'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Subnetting Mastery');

INSERT INTO courses (title, description, total_lessons, xp_reward, difficulty, category)
SELECT 'Wireless Networking', 'Configure and manage wireless LANs.', 6, 150, 'Intermediate', 'Wireless'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Wireless Networking');

INSERT INTO courses (title, description, total_lessons, xp_reward, difficulty, category)
SELECT 'WAN Technologies', 'Study wide area networking and VPNs.', 7, 170, 'Advanced', 'Core'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'WAN Technologies');

INSERT INTO courses (title, description, total_lessons, xp_reward, difficulty, category)
SELECT 'Cloud Networking', 'Learn networking concepts for cloud environments.', 9, 200, 'Advanced', 'Cloud'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Cloud Networking');
