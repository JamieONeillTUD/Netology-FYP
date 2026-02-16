-- NETOLOGY LEARNING PLATFORM – DATABASE SCHEMA (SAFE MIGRATION)
-- Student: Jamie O’Neill (C22320301)
-- Course: TU857/4
-- Date: 2026-02-10

-- AI Prompt: Explain the USERS section in clear, simple terms.
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
    dob DATE,
    start_level VARCHAR(20) DEFAULT 'novice',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns/defaults exist (safe for existing DBs)
ALTER TABLE users ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'Novice';
ALTER TABLE users ADD COLUMN IF NOT EXISTS numeric_level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reasons TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS start_level VARCHAR(20) DEFAULT 'novice';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ALTER COLUMN numeric_level SET DEFAULT 1;
ALTER TABLE users ALTER COLUMN level SET DEFAULT 'Novice';

-- ONBOARDING & TOUR COLUMNS
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Migrate start_level out of the reasons text field into its own column.
-- Safe to run multiple times (only updates rows that still have the old format).
UPDATE users
SET start_level = CASE
    WHEN reasons LIKE 'start_level=advanced%'     THEN 'advanced'
    WHEN reasons LIKE 'start_level=intermediate%' THEN 'intermediate'
    ELSE 'novice'
END
WHERE reasons LIKE 'start_level=%'
  AND (start_level IS NULL OR start_level = 'novice');

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users(username);

-- AI Prompt: Explain the COURSES section in clear, simple terms.
-- =========================================================
-- COURSES
-- =========================================================
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    total_lessons INTEGER DEFAULT 0,
    module_count INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 100,
    difficulty VARCHAR(50) DEFAULT 'Novice',
    category VARCHAR(50) DEFAULT 'General',
    required_level INTEGER DEFAULT 1,
    estimated_time VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_lessons INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS module_count INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 100;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50) DEFAULT 'Novice';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS required_level INTEGER DEFAULT 1;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS estimated_time VARCHAR(50);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- AI Prompt: Explain the USER COURSES section in clear, simple terms.
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

-- AI Prompt: Explain the USER PREFERENCES section in clear, simple terms.
-- =========================================================
-- USER PREFERENCES
-- =========================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_email VARCHAR(255) PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
    weekly_summary BOOLEAN DEFAULT TRUE,
    streak_reminders BOOLEAN DEFAULT TRUE,
    new_course_alerts BOOLEAN DEFAULT FALSE,
    theme VARCHAR(20) DEFAULT 'light',
    font_preference VARCHAR(50) DEFAULT 'standard',
    reduced_motion BOOLEAN DEFAULT FALSE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure preference columns exist (safe for existing DBs)
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS weekly_summary BOOLEAN DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS streak_reminders BOOLEAN DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS new_course_alerts BOOLEAN DEFAULT FALSE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'light';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS font_preference VARCHAR(50) DEFAULT 'standard';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS reduced_motion BOOLEAN DEFAULT FALSE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- AI Prompt: Explain the USER ACHIEVEMENTS (PERSISTENT BADGES) section in clear, simple terms.
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

-- Ensure achievement columns exist (safe for existing DBs)
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS name VARCHAR(150);
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS tier VARCHAR(20);
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0;
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- AI Prompt: Explain the LOGIN ACTIVITY (STREAKS) section in clear, simple terms.
-- =========================================================
-- LOGIN ACTIVITY (STREAKS)
-- =========================================================
CREATE TABLE IF NOT EXISTS user_logins (
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    login_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_email, login_date)
);

-- AI Prompt: Explain the DETAILED COMPLETION TRACKING section in clear, simple terms.
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

-- AI Prompt: Explain the XP LOG section in clear, simple terms.
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

-- AI Prompt: Explain the LESSONS (OPTIONAL) section in clear, simple terms.
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

-- AI Prompt: Explain the SANDBOX TOPOLOGIES section in clear, simple terms.
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

-- AI Prompt: Explain the LESSON SANDBOX SESSIONS section in clear, simple terms.
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
-- LESSON SLIDES SYSTEM
-- =========================================================
CREATE TABLE IF NOT EXISTS lesson_slides (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    slide_number INTEGER NOT NULL,
    slide_type VARCHAR(50) DEFAULT 'text',
    title VARCHAR(255) NOT NULL,
    content TEXT,
    code_snippet TEXT,
    code_language VARCHAR(50),
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    explanation TEXT,
    challenge_id INTEGER,
    estimated_time_seconds INTEGER DEFAULT 300,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lesson_id, slide_number)
);

CREATE TABLE IF NOT EXISTS user_slide_progress (
    id SERIAL,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    slide_id INTEGER NOT NULL REFERENCES lesson_slides(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    time_spent_seconds INTEGER DEFAULT 0,
    notes TEXT,
    is_bookmarked BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_email, slide_id)
);

CREATE TABLE IF NOT EXISTS user_slide_bookmarks (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    slide_id INTEGER NOT NULL REFERENCES lesson_slides(id) ON DELETE CASCADE,
    note TEXT,
    bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, slide_id)
);

-- =========================================================
-- ONBOARDING TOUR PROGRESS
-- =========================================================
CREATE TABLE IF NOT EXISTS user_tour_progress (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL UNIQUE REFERENCES users(email) ON DELETE CASCADE,
    tour_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tour_completed BOOLEAN DEFAULT FALSE,
    current_step INTEGER DEFAULT 0,
    steps_completed INTEGER DEFAULT 0,
    tour_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- ACHIEVEMENTS SYSTEM
-- =========================================================
CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    icon VARCHAR(500),
    xp_reward INTEGER DEFAULT 0,
    rarity VARCHAR(20) DEFAULT 'common',
    unlock_criteria JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- (user_achievements table already defined above with richer fields)

-- =========================================================
-- DAILY ACTIVITY TRACKING (for heatmap)
-- =========================================================
CREATE TABLE IF NOT EXISTS user_daily_activity (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    xp_earned INTEGER DEFAULT 0,
    lessons_completed INTEGER DEFAULT 0,
    quizzes_completed INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    sandbox_topologies_created INTEGER DEFAULT 0,
    login_count INTEGER DEFAULT 0,
    total_minutes_spent INTEGER DEFAULT 0,
    longest_session_minutes INTEGER DEFAULT 0,
    last_activity_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_email, activity_date)
);

-- =========================================================
-- CHALLENGES SYSTEM
-- =========================================================
CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50),
    difficulty VARCHAR(50),
    xp_reward INTEGER DEFAULT 50,
    required_action VARCHAR(100),
    action_target VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_challenge_progress (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    progress_percent INTEGER DEFAULT 0,
    PRIMARY KEY (user_email, challenge_id)
);

-- Update existing tables with new columns
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS slide_count INTEGER DEFAULT 0;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS avg_time_seconds INTEGER DEFAULT 0;

-- SEED SAMPLE ACHIEVEMENTS
INSERT INTO achievements (id, name, description, category, rarity, unlock_criteria) VALUES
('first_lesson', 'First Steps', 'Complete your first lesson', 'Learner', 'common', '{"type": "lessons_completed", "value": 1}'),
('five_day_streak', 'On Fire!', 'Maintain a 5-day learning streak', 'Explorer', 'rare', '{"type": "streak_days", "value": 5}'),
('novice_master', 'Novice Master', 'Complete all Novice courses', 'Master', 'epic', '{"type": "courses_by_difficulty", "difficulty": "Novice", "value": 5}'),
('sandbox_builder', 'Builder', 'Create 10 sandbox topologies', 'Builder', 'rare', '{"type": "topologies_created", "value": 10}'),
('speed_learner', 'Speed Learner', 'Complete 5 lessons in one day', 'Learner', 'rare', '{"type": "lessons_per_day", "value": 5}')
ON CONFLICT DO NOTHING;

-- SEED SAMPLE CHALLENGES (5 daily + 5 weekly + 1 event)
INSERT INTO challenges (title, description, challenge_type, difficulty, xp_reward, required_action) VALUES
('Learn IP Addressing', 'Complete the IP Addressing course lesson', 'daily', 'easy', 25, 'complete_lesson'),
('Build a Topology', 'Create a network topology in the sandbox', 'daily', 'medium', 50, 'sandbox_practice'),
('Pass a Quiz', 'Score 80% or higher on any quiz', 'daily', 'easy', 30, 'pass_quiz'),
('Study Session', 'Complete 2 lessons in one sitting', 'daily', 'medium', 40, 'complete_lessons'),
('Review Notes', 'Revisit a completed lesson to reinforce knowledge', 'daily', 'easy', 20, 'review_lesson'),
('Quiz Master', 'Score 100% on any quiz', 'weekly', 'hard', 100, 'quiz_score'),
('Consistency Wins', 'Log in for 7 consecutive days', 'weekly', 'medium', 75, 'daily_login'),
('Course Explorer', 'Start a new course you have not tried before', 'weekly', 'easy', 60, 'start_course'),
('Network Architect', 'Build 3 different network topologies', 'weekly', 'hard', 120, 'sandbox_topologies'),
('Knowledge Sprint', 'Complete 5 lessons across any courses', 'weekly', 'medium', 80, 'complete_lessons'),
('All Star', 'Complete 3 courses', 'event', 'hard', 200, 'complete_courses')
ON CONFLICT DO NOTHING;

-- AI Prompt: Explain the LEGACY COMPLETION TABLES (SAFE TO KEEP) section in clear, simple terms.
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

-- AI Prompt: Explain the SAMPLE COURSES (SAFE INSERT + SAFE UPDATE BY TITLE) section in clear, simple terms.
-- =========================================================
-- SAMPLE COURSES (SAFE INSERT + SAFE UPDATE BY TITLE)
-- =========================================================
INSERT INTO courses (title, description, total_lessons, module_count, xp_reward, difficulty, category, required_level, estimated_time)
SELECT 'Networking Foundations',
       'Build core networking knowledge from scratch: devices, Ethernet, and IP basics.',
       12, 3, 800, 'Novice', 'Core', 1, '5.5 hrs'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Networking Foundations');

INSERT INTO courses (title, description, total_lessons, module_count, xp_reward, difficulty, category, required_level, estimated_time)
SELECT 'Ethernet & Switching Basics',
       'Learn switching behavior and build your first switched network.',
       3, 1, 350, 'Novice', 'Switching', 1, '1.2 hrs'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Ethernet & Switching Basics');

INSERT INTO courses (title, description, total_lessons, module_count, xp_reward, difficulty, category, required_level, estimated_time)
SELECT 'IP Addressing Essentials',
       'Understand private vs public IPs and basic subnetting concepts.',
       3, 1, 360, 'Novice', 'IP', 1, '1.4 hrs'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'IP Addressing Essentials');

INSERT INTO courses (title, description, total_lessons, module_count, xp_reward, difficulty, category, required_level, estimated_time)
SELECT 'Routing Fundamentals',
       'Learn how routers move traffic between networks and how routing protocols work.',
       3, 1, 420, 'Intermediate', 'Routing', 3, '1.6 hrs'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Routing Fundamentals');

INSERT INTO courses (title, description, total_lessons, module_count, xp_reward, difficulty, category, required_level, estimated_time)
SELECT 'Subnetting & VLANs',
       'Design efficient subnets, segment networks with VLANs, and connect them securely.',
       12, 3, 950, 'Intermediate', 'Routing', 3, '6 hrs'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Subnetting & VLANs');

INSERT INTO courses (title, description, total_lessons, module_count, xp_reward, difficulty, category, required_level, estimated_time)
SELECT 'Wireless & Network Services',
       'Understand Wi‑Fi standards and essential services like DHCP and DNS.',
       3, 1, 450, 'Intermediate', 'Services', 3, '1.8 hrs'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Wireless & Network Services');

INSERT INTO courses (title, description, total_lessons, module_count, xp_reward, difficulty, category, required_level, estimated_time)
SELECT 'Automation & Monitoring',
       'Automate routine tasks and monitor networks at scale.',
       3, 1, 560, 'Advanced', 'Automation', 5, '2.1 hrs'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Automation & Monitoring');

INSERT INTO courses (title, description, total_lessons, module_count, xp_reward, difficulty, category, required_level, estimated_time)
SELECT 'Network Security & Hardening',
       'Secure networks with hardening, firewalls, ACLs, and monitoring best practices.',
       12, 3, 1050, 'Advanced', 'Security', 5, '6.5 hrs'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Network Security & Hardening');

INSERT INTO courses (title, description, total_lessons, module_count, xp_reward, difficulty, category, required_level, estimated_time)
SELECT 'WAN & BGP Design',
       'Explore WAN technologies and the basics of BGP routing.',
       3, 1, 520, 'Advanced', 'WAN', 5, '1.9 hrs'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'WAN & BGP Design');

UPDATE courses
SET description = 'Build core networking knowledge from scratch: devices, Ethernet, and IP basics.',
    total_lessons = 12, module_count = 3, xp_reward = 800,
    difficulty = 'Novice', category = 'Core', required_level = 1, estimated_time = '5.5 hrs'
WHERE title = 'Networking Foundations';

UPDATE courses
SET description = 'Learn switching behavior and build your first switched network.',
    total_lessons = 3, module_count = 1, xp_reward = 350,
    difficulty = 'Novice', category = 'Switching', required_level = 1, estimated_time = '1.2 hrs'
WHERE title = 'Ethernet & Switching Basics';

UPDATE courses
SET description = 'Understand private vs public IPs and basic subnetting concepts.',
    total_lessons = 3, module_count = 1, xp_reward = 360,
    difficulty = 'Novice', category = 'IP', required_level = 1, estimated_time = '1.4 hrs'
WHERE title = 'IP Addressing Essentials';

UPDATE courses
SET description = 'Learn how routers move traffic between networks and how routing protocols work.',
    total_lessons = 3, module_count = 1, xp_reward = 420,
    difficulty = 'Intermediate', category = 'Routing', required_level = 3, estimated_time = '1.6 hrs'
WHERE title = 'Routing Fundamentals';

UPDATE courses
SET description = 'Design efficient subnets, segment networks with VLANs, and connect them securely.',
    total_lessons = 12, module_count = 3, xp_reward = 950,
    difficulty = 'Intermediate', category = 'Routing', required_level = 3, estimated_time = '6 hrs'
WHERE title = 'Subnetting & VLANs';

UPDATE courses
SET description = 'Understand Wi‑Fi standards and essential services like DHCP and DNS.',
    total_lessons = 3, module_count = 1, xp_reward = 450,
    difficulty = 'Intermediate', category = 'Services', required_level = 3, estimated_time = '1.8 hrs'
WHERE title = 'Wireless & Network Services';

UPDATE courses
SET description = 'Automate routine tasks and monitor networks at scale.',
    total_lessons = 3, module_count = 1, xp_reward = 560,
    difficulty = 'Advanced', category = 'Automation', required_level = 5, estimated_time = '2.1 hrs'
WHERE title = 'Automation & Monitoring';

UPDATE courses
SET description = 'Secure networks with hardening, firewalls, ACLs, and monitoring best practices.',
    total_lessons = 12, module_count = 3, xp_reward = 1050,
    difficulty = 'Advanced', category = 'Security', required_level = 5, estimated_time = '6.5 hrs'
WHERE title = 'Network Security & Hardening';

UPDATE courses
SET description = 'Explore WAN technologies and the basics of BGP routing.',
    total_lessons = 3, module_count = 1, xp_reward = 520,
    difficulty = 'Advanced', category = 'WAN', required_level = 5, estimated_time = '1.9 hrs'
WHERE title = 'WAN & BGP Design';
