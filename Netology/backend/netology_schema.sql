-- =========================================================
-- NETOLOGY LEARNING PLATFORM – DATABASE SCHEMA
-- Student: Jamie O'Neill (C22320301)
-- Course:  TU857/4
-- Updated: 2026-03-19
--
-- Safe to run on a fresh DB or an existing one.
--   • CREATE TABLE IF NOT EXISTS  → won't break existing tables
--   • INSERT … ON CONFLICT DO UPDATE → upserts seed data cleanly
--   • ALTER TABLE ADD COLUMN IF NOT EXISTS → adds new cols safely
--
-- Architecture note:
--   Course curriculum (lesson text, quiz questions, sandbox steps)
--   lives in course_content.js on the frontend — zero API calls
--   for content, instant page loads. The DB stores course *metadata*
--   (title, XP, difficulty) and per-user *progress* (completions,
--   scores, streaks). The link between both sides is the course ID:
--   DB courses.id = COURSE_CONTENT key = URL course_id param (1–9).
-- =========================================================


-- ─── USERS ───────────────────────────────────────────────
-- Every registered student. Email is the main identifier used
-- across all progress tables. XP and level update as they
-- complete lessons, quizzes, and challenges.

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    username        VARCHAR(100) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    level           VARCHAR(50)  DEFAULT 'Novice',
    numeric_level   INTEGER      DEFAULT 1,
    xp              INTEGER      DEFAULT 0,
    dob             DATE,
    start_level     VARCHAR(20)  DEFAULT 'novice',
    reasons         TEXT,
    is_first_login       BOOLEAN   DEFAULT TRUE,
    onboarding_completed BOOLEAN   DEFAULT FALSE,
    onboarding_completed_at TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Safe column additions for existing DBs
ALTER TABLE users ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'Novice';
ALTER TABLE users ADD COLUMN IF NOT EXISTS numeric_level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS start_level VARCHAR(20) DEFAULT 'novice';
ALTER TABLE users ADD COLUMN IF NOT EXISTS reasons TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE users ALTER COLUMN numeric_level SET DEFAULT 1;
ALTER TABLE users ALTER COLUMN level SET DEFAULT 'Novice';

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key    ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users(username);


-- ─── COURSES ─────────────────────────────────────────────
-- Metadata for the 9 courses. IDs 1–9 match the keys in
-- COURSE_CONTENT on the frontend. This table does NOT store
-- lesson text or quiz questions — that lives client-side.

CREATE TABLE IF NOT EXISTS courses (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(150) NOT NULL,
    description     TEXT,
    total_lessons   INTEGER      DEFAULT 0,
    module_count    INTEGER      DEFAULT 0,
    xp_reward       INTEGER      DEFAULT 100,
    difficulty      VARCHAR(50)  DEFAULT 'Novice',
    category        VARCHAR(50)  DEFAULT 'General',
    required_level  INTEGER      DEFAULT 1,
    estimated_time  VARCHAR(50),
    is_active       BOOLEAN      DEFAULT TRUE,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_lessons  INTEGER     DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS module_count   INTEGER     DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS xp_reward      INTEGER     DEFAULT 100;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS difficulty     VARCHAR(50) DEFAULT 'Novice';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category      VARCHAR(50) DEFAULT 'General';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS required_level INTEGER     DEFAULT 1;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS estimated_time VARCHAR(50);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_active      BOOLEAN     DEFAULT TRUE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP;


-- ─── USER → COURSE ENROLMENT ─────────────────────────────
-- One row per user per course. Tracks overall progress % and
-- whether they have completed the full course.

CREATE TABLE IF NOT EXISTS user_courses (
    id          SERIAL PRIMARY KEY,
    user_email  VARCHAR(255) REFERENCES users(email)   ON DELETE CASCADE,
    course_id   INTEGER      REFERENCES courses(id)    ON DELETE CASCADE,
    progress    INTEGER      DEFAULT 0,
    completed   BOOLEAN      DEFAULT FALSE,
    started_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_courses ADD COLUMN IF NOT EXISTS progress   INTEGER   DEFAULT 0;
ALTER TABLE user_courses ADD COLUMN IF NOT EXISTS completed  BOOLEAN   DEFAULT FALSE;
ALTER TABLE user_courses ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE user_courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Deduplicate before creating unique constraint
WITH dups AS (
    SELECT user_email, course_id,
           MAX(progress) AS best_progress,
           BOOL_OR(completed) AS any_completed,
           MIN(started_at) AS first_started,
           MAX(updated_at) AS last_updated
    FROM user_courses GROUP BY user_email, course_id HAVING COUNT(*) > 1
),
keep AS (
    SELECT DISTINCT ON (uc.user_email, uc.course_id) uc.id, uc.user_email, uc.course_id
    FROM user_courses uc JOIN dups d ON d.user_email = uc.user_email AND d.course_id = uc.course_id
    ORDER BY uc.user_email, uc.course_id, uc.id
)
UPDATE user_courses uc SET
    progress   = d.best_progress,
    completed  = d.any_completed,
    started_at = COALESCE(d.first_started, uc.started_at),
    updated_at = COALESCE(d.last_updated, uc.updated_at)
FROM keep k JOIN dups d ON d.user_email = k.user_email AND d.course_id = k.course_id
WHERE uc.id = k.id;

WITH keep AS (
    SELECT MIN(id) AS keep_id, user_email, course_id
    FROM user_courses GROUP BY user_email, course_id HAVING COUNT(*) > 1
)
DELETE FROM user_courses uc USING keep k
WHERE uc.user_email = k.user_email AND uc.course_id = k.course_id AND uc.id <> k.keep_id;

CREATE UNIQUE INDEX IF NOT EXISTS user_courses_user_email_course_id_key
    ON user_courses(user_email, course_id);


-- ─── COMPLETION TRACKING ─────────────────────────────────
-- One row per completed lesson / quiz / challenge per user.
-- lesson_number is sequential across all units (1, 2, 3 … n).

CREATE TABLE IF NOT EXISTS user_lessons (
    id            SERIAL PRIMARY KEY,
    user_email    VARCHAR(255) REFERENCES users(email)  ON DELETE CASCADE,
    course_id     INTEGER      REFERENCES courses(id)   ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    xp_awarded    INTEGER DEFAULT 0,
    completed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, course_id, lesson_number)
);

CREATE TABLE IF NOT EXISTS user_quizzes (
    id            SERIAL PRIMARY KEY,
    user_email    VARCHAR(255) REFERENCES users(email)  ON DELETE CASCADE,
    course_id     INTEGER      REFERENCES courses(id)   ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    xp_awarded    INTEGER DEFAULT 0,
    completed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, course_id, lesson_number)
);

CREATE TABLE IF NOT EXISTS user_challenges (
    id            SERIAL PRIMARY KEY,
    user_email    VARCHAR(255) REFERENCES users(email)  ON DELETE CASCADE,
    course_id     INTEGER      REFERENCES courses(id)   ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    xp_awarded    INTEGER DEFAULT 0,
    completed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, course_id, lesson_number)
);

ALTER TABLE user_lessons    ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0;
ALTER TABLE user_quizzes    ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0;
ALTER TABLE user_challenges ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0;


-- ─── XP LOG ──────────────────────────────────────────────
-- Audit trail of every XP award.

CREATE TABLE IF NOT EXISTS xp_log (
    id          SERIAL PRIMARY KEY,
    user_email  VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    action      VARCHAR(255),
    xp_awarded  INTEGER,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ─── LOGIN ACTIVITY (STREAKS) ────────────────────────────
-- One row per user per calendar day. Backend calculates
-- current and longest streak from consecutive dates.

CREATE TABLE IF NOT EXISTS user_logins (
    user_email  VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    login_date  DATE NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_email, login_date)
);


-- ─── DAILY ACTIVITY (HEATMAP) ────────────────────────────
-- Aggregated daily stats powering the account-page heatmap.

CREATE TABLE IF NOT EXISTS user_daily_activity (
    id            SERIAL PRIMARY KEY,
    user_email    VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    xp_earned              INTEGER DEFAULT 0,
    lessons_completed      INTEGER DEFAULT 0,
    quizzes_completed      INTEGER DEFAULT 0,
    challenges_completed   INTEGER DEFAULT 0,
    sandbox_topologies_created INTEGER DEFAULT 0,
    login_count            INTEGER DEFAULT 0,
    total_minutes_spent    INTEGER DEFAULT 0,
    longest_session_minutes INTEGER DEFAULT 0,
    last_activity_time     TIMESTAMP,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_email, activity_date)
);


-- ─── USER PREFERENCES ────────────────────────────────────
-- Theme, font, notification settings per user.

CREATE TABLE IF NOT EXISTS user_preferences (
    user_email           VARCHAR(255) PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
    weekly_summary       BOOLEAN     DEFAULT TRUE,
    streak_reminders     BOOLEAN     DEFAULT TRUE,
    new_course_alerts    BOOLEAN     DEFAULT FALSE,
    theme                VARCHAR(20) DEFAULT 'light',
    font_preference      VARCHAR(50) DEFAULT 'standard',
    reduced_motion       BOOLEAN     DEFAULT FALSE,
    notifications_enabled BOOLEAN    DEFAULT TRUE,
    created_at           TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS weekly_summary       BOOLEAN     DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS streak_reminders     BOOLEAN     DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS new_course_alerts    BOOLEAN     DEFAULT FALSE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS theme                VARCHAR(20) DEFAULT 'light';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS font_preference      VARCHAR(50) DEFAULT 'standard';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS reduced_motion       BOOLEAN     DEFAULT FALSE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN    DEFAULT TRUE;


-- ─── ACHIEVEMENTS ────────────────────────────────────────
-- Master list of badges + per-user earned badges.

CREATE TABLE IF NOT EXISTS achievements (
    id              VARCHAR(100) PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    category        VARCHAR(50),
    icon            VARCHAR(500),
    xp_reward       INTEGER      DEFAULT 0,
    rarity          VARCHAR(20)  DEFAULT 'common',
    unlock_criteria JSONB,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id              SERIAL PRIMARY KEY,
    user_email      VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    achievement_id  VARCHAR(100) NOT NULL,
    name            VARCHAR(150),
    description     TEXT,
    tier            VARCHAR(20),
    xp_awarded      INTEGER   DEFAULT 0,
    earned_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_email, achievement_id)
);

ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS name        VARCHAR(150);
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS tier        VARCHAR(20);
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS xp_awarded  INTEGER DEFAULT 0;
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS earned_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP;


-- ─── ONBOARDING TOUR ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_tour_progress (
    id                SERIAL PRIMARY KEY,
    user_email        VARCHAR(255) NOT NULL UNIQUE REFERENCES users(email) ON DELETE CASCADE,
    tour_started_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tour_completed    BOOLEAN   DEFAULT FALSE,
    current_step      INTEGER   DEFAULT 0,
    steps_completed   INTEGER   DEFAULT 0,
    tour_completed_at TIMESTAMP,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ─── SANDBOX ─────────────────────────────────────────────
-- Saved topologies + per-lesson sandbox state.

CREATE TABLE IF NOT EXISTS saved_topologies (
    id          SERIAL PRIMARY KEY,
    user_email  VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    devices     JSONB NOT NULL,
    connections JSONB NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lesson_sessions (
    id             SERIAL PRIMARY KEY,
    user_email     VARCHAR(255) REFERENCES users(email)  ON DELETE CASCADE,
    course_id      INTEGER      REFERENCES courses(id)   ON DELETE CASCADE,
    lesson_number  INTEGER NOT NULL,
    devices        JSONB NOT NULL DEFAULT '{}'::jsonb,
    connections    JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_email, course_id, lesson_number)
);


-- ─── CHALLENGES SYSTEM ───────────────────────────────────

CREATE TABLE IF NOT EXISTS challenges (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(150) NOT NULL,
    description     TEXT,
    challenge_type  VARCHAR(50),
    difficulty      VARCHAR(50),
    xp_reward       INTEGER      DEFAULT 50,
    required_action VARCHAR(100),
    action_target   VARCHAR(255),
    is_active       BOOLEAN   DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS challenges_title_challenge_type_key
    ON challenges (title, challenge_type);

CREATE TABLE IF NOT EXISTS user_challenge_progress (
    id               SERIAL PRIMARY KEY,
    user_email       VARCHAR(255) NOT NULL REFERENCES users(email)     ON DELETE CASCADE,
    challenge_id     INTEGER      NOT NULL REFERENCES challenges(id)   ON DELETE CASCADE,
    started_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at     TIMESTAMP,
    progress_percent INTEGER   DEFAULT 0,
    UNIQUE (user_email, challenge_id)
);


-- =========================================================
-- SEED DATA
-- =========================================================

-- ─── 9 COURSES (IDs 1–9 = COURSE_CONTENT keys) ──────────

INSERT INTO courses
    (id, title, description, total_lessons, module_count,
     xp_reward, difficulty, category, required_level, estimated_time)
VALUES
    (1, 'Networking Foundations',
        'Build core networking knowledge from scratch: devices, Ethernet, and IP basics.',
        12, 3, 1295, 'Novice', 'Core', 1, '5.5 hrs'),
    (2, 'Ethernet & Switching Basics',
        'Learn switching behavior and build your first switched network.',
        2, 1, 350, 'Novice', 'Switching', 1, '1.2 hrs'),
    (3, 'IP Addressing Essentials',
        'Understand private vs public IPs and basic subnetting concepts.',
        2, 1, 360, 'Novice', 'IP', 1, '1.4 hrs'),
    (4, 'Subnetting & VLANs',
        'Design efficient subnets, segment networks with VLANs, and connect them securely.',
        12, 3, 950, 'Intermediate', 'Routing', 3, '6 hrs'),
    (5, 'Routing Fundamentals',
        'Learn how routers move traffic between networks and how routing protocols work.',
        2, 1, 420, 'Intermediate', 'Routing', 3, '1.6 hrs'),
    (6, 'Wireless & Network Services',
        'Understand Wi-Fi standards and essential services like DHCP and DNS.',
        2, 1, 450, 'Intermediate', 'Services', 3, '1.8 hrs'),
    (7, 'Network Security & Hardening',
        'Secure networks with hardening, firewalls, ACLs, and monitoring best practices.',
        12, 3, 1050, 'Advanced', 'Security', 5, '6.5 hrs'),
    (8, 'WAN & BGP Design',
        'Explore WAN technologies and the basics of BGP routing.',
        2, 1, 520, 'Advanced', 'WAN', 5, '1.9 hrs'),
    (9, 'Automation & Monitoring',
        'Automate routine tasks and monitor networks at scale.',
        2, 1, 560, 'Advanced', 'Automation', 5, '2.1 hrs')
ON CONFLICT (id) DO UPDATE SET
    title          = EXCLUDED.title,
    description    = EXCLUDED.description,
    total_lessons  = EXCLUDED.total_lessons,
    module_count   = EXCLUDED.module_count,
    xp_reward      = EXCLUDED.xp_reward,
    difficulty     = EXCLUDED.difficulty,
    category       = EXCLUDED.category,
    required_level = EXCLUDED.required_level,
    estimated_time = EXCLUDED.estimated_time;

SELECT setval('courses_id_seq', GREATEST((SELECT MAX(id) FROM courses), 9), true);


-- ─── 20 ACHIEVEMENTS (matching achievement_engine.py) ────

INSERT INTO achievements
    (id, name, description, category, icon, xp_reward, rarity, unlock_criteria)
VALUES
    ('first_login',           'Welcome Back',       'Log in for the first time.',                       'Onboarding', 'bi-door-open-fill',       10, 'common', '{"type":"logins_total","value":1}'),
    ('login_streak_3',        'Momentum',           'Maintain a 3-day login streak.',                   'Streak',     'bi-calendar-check-fill',  40, 'common', '{"type":"login_streak","value":3}'),
    ('five_day_streak',       'On Fire!',           'Maintain a 5-day login streak.',                   'Streak',     'bi-fire',                 75, 'rare',   '{"type":"login_streak","value":5}'),
    ('login_streak_10',       'Unstoppable',        'Maintain a 10-day login streak.',                  'Streak',     'bi-fire',                160, 'epic',   '{"type":"login_streak","value":10}'),
    ('onboarding_complete',   'Tour Complete',      'Complete the onboarding walkthrough.',              'Onboarding', 'bi-compass-fill',         60, 'common', '{"type":"event","event":"onboarding_complete"}'),
    ('course_starter',        'Course Starter',     'Start your first course.',                          'Courses',    'bi-journal-plus',         20, 'common', '{"type":"courses_started","value":1}'),
    ('course_explorer',       'Course Explorer',    'Start 3 courses.',                                  'Courses',    'bi-journals',             60, 'rare',   '{"type":"courses_started","value":3}'),
    ('first_lesson',          'First Steps',        'Complete your first lesson.',                        'Learning',   'bi-bookmark-check-fill',  30, 'common', '{"type":"lessons_completed","value":1}'),
    ('speed_learner',         'Speed Learner',      'Complete 5 lessons.',                               'Learning',   'bi-lightning-charge-fill',100, 'rare',   '{"type":"lessons_completed","value":5}'),
    ('lesson_marathon',       'Lesson Marathon',    'Complete 15 lessons.',                              'Learning',   'bi-lightning-fill',      220, 'epic',   '{"type":"lessons_completed","value":15}'),
    ('first_quiz',            'Quiz Rookie',        'Complete your first quiz.',                          'Quizzes',    'bi-patch-question-fill',  35, 'common', '{"type":"quizzes_completed","value":1}'),
    ('quiz_machine',          'Quiz Machine',       'Complete 5 quizzes.',                               'Quizzes',    'bi-ui-checks-grid',     120, 'rare',   '{"type":"quizzes_completed","value":5}'),
    ('first_challenge',       'Challenge Accepted', 'Complete your first challenge.',                     'Challenges', 'bi-shield-check',         45, 'common', '{"type":"challenges_completed","value":1}'),
    ('challenge_crusher',     'Challenge Crusher',  'Complete 5 challenges.',                             'Challenges', 'bi-trophy-fill',        170, 'epic',   '{"type":"challenges_completed","value":5}'),
    ('first_course_complete', 'Course Finisher',    'Complete your first course.',                        'Courses',    'bi-check2-square',      200, 'rare',   '{"type":"courses_completed","value":1}'),
    ('novice_master',         'Novice Master',      'Complete 3 courses.',                               'Courses',    'bi-mortarboard-fill',   320, 'epic',   '{"type":"courses_completed","value":3}'),
    ('level_3_reached',       'Rising Talent',      'Reach Level 3.',                                    'Progress',   'bi-bar-chart-steps',    120, 'rare',   '{"type":"level_reached","value":3}'),
    ('level_5_reached',       'Advanced Path',      'Reach Level 5.',                                    'Progress',   'bi-stars',              260, 'epic',   '{"type":"level_reached","value":5}'),
    ('xp_500_club',           '500 XP Club',        'Earn a total of 500 XP.',                           'Progress',   'bi-gem',                150, 'rare',   '{"type":"total_xp","value":500}'),
    ('all_rounder',           'All-Rounder',        'Complete at least one lesson, quiz, and challenge.', 'Mastery',    'bi-award-fill',         180, 'epic',   '{"type":"all_of","rules":[{"type":"lessons_completed","value":1},{"type":"quizzes_completed","value":1},{"type":"challenges_completed","value":1}]}')
ON CONFLICT (id) DO UPDATE SET
    name            = EXCLUDED.name,
    description     = EXCLUDED.description,
    category        = EXCLUDED.category,
    icon            = EXCLUDED.icon,
    xp_reward       = EXCLUDED.xp_reward,
    rarity          = EXCLUDED.rarity,
    unlock_criteria = EXCLUDED.unlock_criteria;


-- ─── 11 CHALLENGES (5 daily + 5 weekly + 1 event) ───────

INSERT INTO challenges
    (title, description, challenge_type, difficulty, xp_reward, required_action)
VALUES
    ('Learn IP Addressing',  'Complete the IP Addressing course lesson.',          'daily',  'easy',   25, 'complete_lesson'),
    ('Build a Topology',     'Create a network topology in the sandbox.',          'daily',  'medium', 50, 'sandbox_practice'),
    ('Pass a Quiz',          'Score 80%+ on any quiz.',                            'daily',  'easy',   30, 'pass_quiz'),
    ('Study Session',        'Complete 2 lessons in one sitting.',                  'daily',  'medium', 40, 'complete_lessons'),
    ('Review Notes',         'Revisit a completed lesson to reinforce knowledge.', 'daily',  'easy',   20, 'review_lesson'),
    ('Quiz Master',          'Score 100% on any quiz.',                             'weekly', 'hard',  100, 'quiz_score'),
    ('Consistency Wins',     'Log in for 7 consecutive days.',                      'weekly', 'medium', 75, 'daily_login'),
    ('Course Explorer',      'Start a new course you have not tried before.',       'weekly', 'easy',   60, 'start_course'),
    ('Network Architect',    'Build 3 different network topologies.',               'weekly', 'hard',  120, 'sandbox_topologies'),
    ('Knowledge Sprint',     'Complete 5 lessons across any courses.',              'weekly', 'medium', 80, 'complete_lessons'),
    ('All Star',             'Complete 3 courses.',                                 'event',  'hard',  200, 'complete_courses')
ON CONFLICT (title, challenge_type) DO UPDATE SET
    description     = EXCLUDED.description,
    difficulty      = EXCLUDED.difficulty,
    xp_reward       = EXCLUDED.xp_reward,
    required_action = EXCLUDED.required_action;


-- =========================================================
-- DONE – 13 tables | 9 courses | 20 achievements | 11 challenges
-- =========================================================
