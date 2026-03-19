-- ==========================================================
-- NETOLOGY – CLEAN RESET: courses become 1-9, user data migrated
-- Safe to run multiple times. Wrapped in a transaction.
-- ==========================================================

BEGIN;

-- ── 1. Map old IDs → new IDs based on title ─────────────────

-- Build a temp mapping table: old course id → new 1-9 id
CREATE TEMP TABLE course_id_map (old_id INTEGER, new_id INTEGER, title TEXT);

INSERT INTO course_id_map (old_id, new_id, title)
SELECT id, ROW_NUMBER() OVER (ORDER BY
    CASE title
        WHEN 'Networking Foundations'       THEN 1
        WHEN 'Ethernet & Switching Basics'  THEN 2
        WHEN 'IP Addressing Essentials'     THEN 3
        WHEN 'Subnetting & VLANs'          THEN 4
        WHEN 'Routing Fundamentals'         THEN 5
        WHEN 'Wireless & Network Services'  THEN 6
        WHEN 'Network Security & Hardening' THEN 7
        WHEN 'WAN & BGP Design'             THEN 8
        WHEN 'Automation & Monitoring'      THEN 9
        ELSE 99
    END
), title
FROM courses
WHERE is_active = TRUE;

-- Show the mapping (visible in psql output)
SELECT old_id, new_id, title FROM course_id_map ORDER BY new_id;

-- ── 2. Disable FK constraints temporarily ────────────────────
-- We'll use a staging approach: copy data → delete → reinsert

-- ── 3. Migrate user progress to new IDs ──────────────────────
-- Update every table that references course_id

UPDATE user_courses      SET course_id = m.new_id FROM course_id_map m WHERE course_id = m.old_id;
UPDATE user_lessons      SET course_id = m.new_id FROM course_id_map m WHERE course_id = m.old_id;
UPDATE user_quizzes      SET course_id = m.new_id FROM course_id_map m WHERE course_id = m.old_id;
UPDATE user_challenges   SET course_id = m.new_id FROM course_id_map m WHERE course_id = m.old_id;
UPDATE lesson_completions SET course_id = m.new_id FROM course_id_map m WHERE course_id = m.old_id;
UPDATE quiz_completions  SET course_id = m.new_id FROM course_id_map m WHERE course_id = m.old_id;
UPDATE challenge_completions SET course_id = m.new_id FROM course_id_map m WHERE course_id = m.old_id;
UPDATE lesson_sessions   SET course_id = m.new_id FROM course_id_map m WHERE course_id = m.old_id;
UPDATE lessons           SET course_id = m.new_id FROM course_id_map m WHERE course_id = m.old_id;

-- ── 4. Delete ALL courses (old inactive + current active) ────
-- The FK updates above mean child rows already point to 1-9,
-- but the courses table still has old IDs. We need to:
--   a) Remove FK constraints temporarily
--   b) Delete all courses
--   c) Reinsert with explicit IDs 1-9
--   d) Reset the sequence

-- Drop orphan rows referencing courses that don't exist (old inactive IDs 1-17)
DELETE FROM user_courses       WHERE course_id NOT IN (SELECT new_id FROM course_id_map);
DELETE FROM user_lessons       WHERE course_id NOT IN (SELECT new_id FROM course_id_map);
DELETE FROM user_quizzes       WHERE course_id NOT IN (SELECT new_id FROM course_id_map);
DELETE FROM user_challenges    WHERE course_id NOT IN (SELECT new_id FROM course_id_map);
DELETE FROM lesson_completions WHERE course_id NOT IN (SELECT new_id FROM course_id_map);
DELETE FROM quiz_completions   WHERE course_id NOT IN (SELECT new_id FROM course_id_map);
DELETE FROM challenge_completions WHERE course_id NOT IN (SELECT new_id FROM course_id_map);
DELETE FROM lesson_sessions    WHERE course_id NOT IN (SELECT new_id FROM course_id_map);
DELETE FROM lesson_slides      WHERE course_id NOT IN (SELECT new_id FROM course_id_map);
DELETE FROM lessons            WHERE course_id NOT IN (SELECT new_id FROM course_id_map);

-- Now delete all courses and reinsert with clean IDs
DELETE FROM courses;

-- Reset the sequence so the next auto-ID is 10
ALTER SEQUENCE courses_id_seq RESTART WITH 1;

-- ── 5. Insert the 9 courses with explicit IDs 1-9 ───────────

INSERT INTO courses (id, title, description, total_lessons, module_count, xp_reward, difficulty, category, required_level, estimated_time, is_active)
VALUES
(1, 'Networking Foundations',
    'Build core networking knowledge from scratch: devices, Ethernet, and IP basics.',
    12, 3, 1295, 'Novice', 'Core', 1, '5.5 hrs', TRUE),

(2, 'Ethernet & Switching Basics',
    'Learn switching behavior and build your first switched network.',
    2, 1, 350, 'Novice', 'Switching', 1, '1.2 hrs', TRUE),

(3, 'IP Addressing Essentials',
    'Understand private vs public IPs and basic subnetting concepts.',
    2, 1, 360, 'Novice', 'IP', 1, '1.4 hrs', TRUE),

(4, 'Subnetting & VLANs',
    'Design efficient subnets, segment networks with VLANs, and connect them securely.',
    12, 3, 950, 'Intermediate', 'Routing', 3, '6 hrs', TRUE),

(5, 'Routing Fundamentals',
    'Learn how routers move traffic between networks and how routing protocols work.',
    2, 1, 420, 'Intermediate', 'Routing', 3, '1.6 hrs', TRUE),

(6, 'Wireless & Network Services',
    'Understand Wi-Fi standards and essential services like DHCP and DNS.',
    2, 1, 450, 'Intermediate', 'Services', 3, '1.8 hrs', TRUE),

(7, 'Network Security & Hardening',
    'Secure networks with hardening, firewalls, ACLs, and monitoring best practices.',
    12, 3, 1050, 'Advanced', 'Security', 5, '6.5 hrs', TRUE),

(8, 'WAN & BGP Design',
    'Explore WAN technologies and the basics of BGP routing.',
    2, 1, 520, 'Advanced', 'WAN', 5, '1.9 hrs', TRUE),

(9, 'Automation & Monitoring',
    'Automate routine tasks and monitor networks at scale.',
    2, 1, 560, 'Advanced', 'Automation', 5, '2.1 hrs', TRUE);

-- Bump the sequence past 9 so new courses start at 10
SELECT setval('courses_id_seq', 9, true);

-- ── 6. Verify ────────────────────────────────────────────────

SELECT id, title, difficulty, is_active FROM courses ORDER BY id;
SELECT 'user_courses'       AS tbl, COUNT(*) AS rows FROM user_courses
UNION ALL SELECT 'user_lessons',      COUNT(*) FROM user_lessons
UNION ALL SELECT 'user_quizzes',      COUNT(*) FROM user_quizzes
UNION ALL SELECT 'user_challenges',   COUNT(*) FROM user_challenges;

DROP TABLE IF EXISTS course_id_map;

COMMIT;
