# Netology — Final Year Project

**Student:** Jamie O'Neill — C22320301  
**Course:** TU857/4

---

## What is Netology?

Netology is a web-based interactive learning platform that teaches CompTIA Network+ concepts through visual lessons, quizzes, hands-on network sandbox simulations, gamification (XP, levels, achievements, streaks), and challenges. Users register an account, work through 9 courses grouped by difficulty (Novice, Intermediate, Advanced), earn XP, level up, and unlock higher-level content.

---

## Live URL

The production backend and frontend are hosted together on Render:

```
https://netology-fyp.onrender.com
```

The frontend is also available via GitHub Pages:

```
https://jamieoneilltud.github.io/Netology-FYP/Netology/docs/
```

---

## Repository

```
https://github.com/JamieONeillTUD/Netology-FYP.git
```

---

## Tech Stack

| Layer      | Technology                       |
|------------|----------------------------------|
| Frontend   | Vanilla JavaScript, HTML, CSS    |
| UI library | Bootstrap 5.3.3, Bootstrap Icons |
| Backend    | Python / Flask                   |
| Database   | PostgreSQL (hosted on Render)    |
| Hosting    | Render (Gunicorn)                |
| Auth       | Flask-Bcrypt (password hashing)  |

No frontend framework is used. Every page is a plain HTML file that loads shared scripts (app.js, course_content.js, theme.js, toasts.js) and then its own page-specific JS file.

---

## How to Run Locally

### 1. Clone the repo

```
git clone https://github.com/JamieONeillTUD/Netology-FYP.git
cd Netology-FYP
```

### 2. Install Python dependencies

```
cd Netology/backend
pip install -r requirements.txt
```

The requirements are: Flask, Flask-Bcrypt, psycopg (binary), Flask-CORS, gunicorn, python-dotenv.

### 3. Set up the database

Create a PostgreSQL database and run the schema file:

```
psql -d your_database -f netology_schema.sql
```

This creates all tables, indexes, and seeds the 9 courses and achievements.

### 4. Set environment variables

Create a `.env` file in the backend folder with:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

Or set individual variables: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, `DB_SSLMODE`.

### 5. Start the server

```
python app.py
```

The server runs on `http://127.0.0.1:5000` and serves the frontend from the `/docs` folder automatically. Open that URL in your browser to use the app.

For production, Render runs `gunicorn app:app` using `gunicorn.conf.py` (2 workers, port from environment, 120s timeout).

---

## Project Structure

```
Netology-FYP/
├── README.md                       ← this file
└── Netology/
    ├── backend/                    ← Flask API server
    │   ├── app.py                  ← entry point, registers all route blueprints
    │   ├── auth_routes.py          ← signup, login, user-info, record-login, forgot-password
    │   ├── course_routes.py        ← course list, progress tracking, lesson/quiz/challenge completion
    │   ├── user_routes.py          ← achievements, challenges, activity heatmap, streaks
    │   ├── onboarding_routes.py    ← onboarding tour start/complete/skip/steps
    │   ├── topology_routes.py      ← sandbox session save/load, named topology save/load/delete
    │   ├── db.py                   ← PostgreSQL connection helper (psycopg)
    │   ├── xp_system.py            ← XP award, level calculation, rank helpers
    │   ├── achievement_engine.py   ← rule-based achievement checking and unlock awarding
    │   ├── netology_schema.sql     ← full database schema (18 tables + seed data)
    │   ├── gunicorn.conf.py        ← Gunicorn config for Render deployment
    │   ├── requirements.txt        ← Python dependencies
    │   └── pytest.ini              ← test config
    │
    └── docs/                       ← frontend (served as static files by Flask)
        ├── index.html              ← landing page
        ├── login.html              ← login form
        ├── signup.html             ← registration form
        ├── forgot.html             ← password reset page
        ├── dashboard.html          ← main user dashboard
        ├── courses.html            ← course catalog (all courses by difficulty)
        ├── course.html             ← single course detail (modules, lessons, progress)
        ├── lesson.html             ← lesson viewer (reading content)
        ├── quiz.html               ← quiz page (multiple choice questions)
        ├── sandbox.html            ← interactive network sandbox
        ├── progress.html           ← progress and activity page
        ├── account.html            ← account settings page
        │
        ├── css/
        │   └── style.css           ← all custom styles, themes, layout, animations
        │
        └── js/
            ├── app.js              ← shared globals loaded on every page
            ├── course_content.js   ← static course data (all 9 courses)
            ├── theme.js            ← dark/light theme toggle
            ├── toasts.js           ← toast notification system
            ├── background.js       ← animated background effect
            ├── onboarding-tour.js  ← first-time user guided tour
            ├── dashboard.js        ← dashboard page logic
            ├── courses.js          ← course catalog page logic
            ├── course.js           ← single course detail page logic
            ├── lesson.js           ← lesson viewer page logic
            ├── quiz.js             ← quiz page logic
            ├── sandbox.js          ← sandbox entry point
            ├── sandbox-core.js     ← sandbox canvas, device placement, dragging
            ├── sandbox-network.js  ← sandbox connections and networking
            ├── sandbox-render.js   ← sandbox rendering and drawing
            ├── sandbox-actions.js  ← sandbox toolbar actions
            ├── sandbox-console.js  ← sandbox CLI/terminal emulator
            ├── sandbox-extras.js   ← sandbox extra features (zoom, shortcuts)
            ├── sandbox-learning.js ← sandbox guided tutorials and challenges
            ├── progress.js         ← progress page logic
            ├── account.js          ← account settings page logic
            ├── login.js            ← login form handling
            ├── signup.js           ← signup form handling
            ├── forgotpassword.js   ← password reset form handling
            └── index.js            ← landing page logic
```

---

## How the System Works

### Frontend / Backend Split

The frontend and backend have a clear division of responsibility:

- **Course content** (lesson text, quiz questions, sandbox steps, challenge rules) lives entirely in `course_content.js` on the frontend. This is a large JavaScript object keyed by course ID (1 through 9). Each course has a title, description, difficulty, XP reward, required level, and an array of units. Each unit contains lessons, a quiz, a sandbox, and a challenge. The frontend reads this data directly with no API call needed to display course content.

- **User-specific data** (who has completed what, how much XP they have, what achievements they have unlocked, login history) lives in PostgreSQL and is fetched from the Flask API. The API never sends lesson text. It only sends progress overlays like completion status, XP totals, and achievement lists.

The link between frontend content and backend records is the **course ID** (1 through 9). The same ID appears as a key in `COURSE_CONTENT`, as `courses.id` in the database, and as a URL parameter (`?course=3`).

### Shared Globals (app.js)

Every page loads `app.js` first. It sets up:

- `window.API_BASE` — the backend URL (defaults to the Render deployment)
- `window.ENDPOINTS` — an object mapping every API path used across the app
- `window.apiGet(path, params)` — a shared fetch helper for GET requests with query parameters
- `window.NetologyXP` — functions for XP and level calculation (getLevelProgress, rankForLevel, applyXpToUser, resolveUserProgress, etc.)
- `window.NetologyAchievements` — achievement popup queue and toast display system
- `window.recordLoginDay(email)` — logs today's login to local storage and syncs with the server
- `window.getLoginLog(email)` — reads login history from local storage

### Page Flow

1. **Landing (index.html)** — shows what Netology is, links to login and signup
2. **Signup (signup.html)** — collects name, email, password, date of birth, skill level, and learning reasons. Posts to `/register`
3. **Login (login.html)** — authenticates via `/login`, stores user data in local storage, redirects to dashboard
4. **Dashboard (dashboard.html)** — the main hub after logging in. Shows:
   - User profile, rank, and XP gauge (SVG arc)
   - Login streak calendar (30 days with green dots)
   - Continue Learning cards (courses in progress)
   - Stats carousel (lessons done, quizzes passed, challenges completed, courses finished)
   - Achievement badges (unlocked and locked)
   - Daily and weekly challenges
   - Networking tips rotation
   - First-time onboarding tour for new users
5. **Courses (courses.html)** — shows all 9 courses grouped into Novice, Intermediate, and Advanced grids. Filter buttons let users show one difficulty at a time. Each card shows title, description, XP, estimated time, and completion progress bar
6. **Course Detail (course.html)** — shows a single course with its modules and items:
   - Hero section with SVG progress ring, title, and difficulty pill
   - Up Next section pointing to the first incomplete item
   - Module tabs — click a tab to see that module's lessons, quizzes, sandboxes, and challenges
   - Each item row shows type icon, title, XP, completion tick, and a link to open it
   - Locked / Active / Completed status pills based on user level vs required level
7. **Lesson (lesson.html)** — displays lesson content from COURSE_CONTENT, marks complete via `/complete-lesson`
8. **Quiz (quiz.html)** — multiple choice questions from COURSE_CONTENT, scores and awards XP via `/complete-quiz`
9. **Sandbox (sandbox.html)** — full interactive network builder where users can:
   - Place routers, switches, PCs, and firewalls on a canvas
   - Connect them with cables
   - Configure IP addresses and network settings
   - Run CLI commands in a built-in terminal emulator
   - Follow guided tutorials (step-by-step instructions from COURSE_CONTENT)
   - Complete challenges (build a specific network topology)
   - Use free mode (open sandbox)
   - Auto-save session state to the server
   - Save and load named topologies
10. **Progress (progress.html)** — activity heatmap and detailed progress statistics
11. **Account (account.html)** — user profile and settings

---

## XP and Level System

- XP is awarded when a user completes a lesson, quiz, challenge, or earns an achievement
- Level formula: Level 1 needs 100 XP, Level 2 needs 200 more XP, Level 3 needs 300 more, and so on (100 x level per level)
- Ranks: Levels 1-2 = Novice, Levels 3-4 = Intermediate, Level 5+ = Advanced
- The rank controls which courses are accessible (each course has a `required_level`)
- Both the frontend (`NetologyXP` in app.js) and backend (`xp_system.py`) use the same formula so they always agree

---

## Achievement System

- Achievements are defined in the `achievements` database table with JSON `unlock_criteria` rules
- `achievement_engine.py` checks these rules against user stats whenever a relevant event happens (login, lesson complete, quiz complete, challenge complete, onboarding complete, XP award)
- Rule types include: event-based triggers, metric thresholds (e.g. total_xp >= 500, lessons_completed >= 10), login streak counts, and compound rules (all_of, any_of)
- When an achievement unlocks, bonus XP is awarded and the engine runs again (up to 5 passes) so that XP-based achievements can chain-trigger from the bonus
- The frontend queues newly unlocked achievements in local storage and shows them as toast popups via `NetologyAchievements`

---

## Login Streak Tracking

- Each login is recorded in the `user_logins` table (one row per day per user)
- The frontend calls `recordLoginDay(email)` on every page load via app.js
- The server records the date, returns the full login history, and checks for login-based achievements
- The dashboard shows a 30-day calendar highlighting which days the user logged in
- Consecutive day counts are calculated both server-side (in `achievement_engine.py`) and client-side (in `dashboard.js`)

---

## Database Tables

The schema (`netology_schema.sql`) contains 18 tables:

| Table                   | Purpose                                              |
|-------------------------|------------------------------------------------------|
| users                   | registered accounts (email, name, password, XP, level) |
| courses                 | course metadata (title, difficulty, XP reward, required level) |
| user_courses            | per-user course enrolment and overall progress percentage |
| user_lessons            | completed lessons per user per course                |
| user_quizzes            | completed quizzes per user per course                |
| user_challenges         | completed challenges per user per course             |
| xp_log                  | audit trail of every XP award                        |
| user_logins             | one row per login day per user (for streak tracking) |
| user_daily_activity     | aggregated daily activity (XP, lessons, quizzes)     |
| user_preferences        | user settings (theme preference, etc.)               |
| achievements            | achievement catalog with JSON unlock rules           |
| user_achievements       | which achievements each user has earned              |
| user_tour_progress      | onboarding tour state per user                       |
| saved_topologies        | user-saved sandbox network topologies                |
| lesson_sessions         | auto-saved sandbox session state per lesson          |
| challenges              | daily and weekly challenge definitions               |
| user_challenge_progress | per-user challenge tracking                          |

---

## API Endpoints

### Auth (auth_routes.py)

| Method | Path               | Description                          |
|--------|--------------------|--------------------------------------|
| POST   | /register          | create a new user account            |
| POST   | /login             | verify credentials, return profile   |
| GET    | /user-info         | get user profile and XP info         |
| POST   | /record-login      | log today's login, check achievements|
| POST   | /award-xp          | award XP for a one-time action       |
| POST   | /forgot-password   | reset a user's password              |

### Courses (course_routes.py)

| Method | Path                   | Description                               |
|--------|------------------------|-------------------------------------------|
| GET    | /courses               | list all active courses                   |
| GET    | /course                | get one course by ID                      |
| GET    | /user-courses          | all courses with user's progress status   |
| GET    | /user-course-status    | which lessons/quizzes/challenges are done |
| GET    | /user-progress-summary | overall completion counts                 |
| POST   | /complete-lesson       | mark a lesson done, award XP              |
| POST   | /complete-quiz         | mark a quiz done, award XP                |
| POST   | /complete-challenge    | mark a challenge done, award XP           |

### User Data (user_routes.py)

| Method | Path                   | Description                          |
|--------|------------------------|--------------------------------------|
| GET    | /api/user/challenges   | daily or weekly challenges           |
| GET    | /api/user/activity     | activity heatmap data (last N days)  |
| GET    | /api/user/achievements | unlocked and locked achievement lists|
| GET    | /api/user/streaks      | current login streak count           |

### Onboarding (onboarding_routes.py)

| Method | Path                        | Description                          |
|--------|-----------------------------|--------------------------------------|
| POST   | /api/onboarding/start       | begin the guided tour                |
| POST   | /api/onboarding/complete    | finish the tour, award achievements  |
| POST   | /api/onboarding/skip        | skip the tour                        |
| GET    | /api/onboarding/steps       | returns empty (steps are client-side)|
| POST   | /api/onboarding/step/:id    | mark a tour step complete            |

### Sandbox Persistence (topology_routes.py)

| Method | Path                       | Description                           |
|--------|----------------------------|---------------------------------------|
| POST   | /lesson-session/save       | auto-save sandbox state for a lesson  |
| GET    | /lesson-session/load       | load sandbox state for a lesson       |
| POST   | /save-topology             | save a named topology                 |
| GET    | /load-topologies           | list all named saves for a user       |
| GET    | /load-topology/:id         | load one named save by ID             |
| DELETE | /delete-topology/:id       | delete a named save                   |

---

## Frontend JavaScript Files

### Shared (loaded on every page)

- **app.js** — sets up API_BASE, ENDPOINTS, apiGet(), NetologyXP (level and rank math), NetologyAchievements (toast popup queue), recordLoginDay(), and getLoginLog()
- **course_content.js** — the full static course curriculum. 9 courses, each with units containing lessons, quizzes, sandboxes, and challenges. About 4000 lines. This is the single source of truth for all course content
- **theme.js** — dark and light mode toggle, saves preference to local storage
- **toasts.js** — toast notification system for achievements, errors, and success messages
- **background.js** — animated network-themed background on the landing and auth pages

### Page-Specific

- **dashboard.js** — fetches user profile, progress summary, achievements, challenges, and course data from the API. Renders the XP gauge, streak calendar, continue learning cards, stats carousel, achievement grid, challenge lists, and networking tips. Handles sidebar, dropdown, logout, onboarding tour, and auto-refresh
- **courses.js** — builds the course catalog directly from COURSE_CONTENT (no API call for course data). Fetches user progress from `/user-courses` to overlay completion percentages. Groups courses by difficulty, renders filter buttons, and builds course cards with progress bars
- **course.js** — reads course ID from the URL, loads the full course structure from COURSE_CONTENT, fetches completion status from `/user-course-status`. Renders the SVG progress ring, module tabs, lesson/quiz/sandbox/challenge rows, up-next section, and locked/active/completed pills
- **lesson.js** — loads lesson content from COURSE_CONTENT, renders it, and posts to `/complete-lesson` when the user finishes reading
- **quiz.js** — loads quiz questions from COURSE_CONTENT, handles answer selection, scoring, and posts to `/complete-quiz`
- **sandbox.js + sandbox-core.js + sandbox-network.js + sandbox-render.js + sandbox-actions.js + sandbox-console.js + sandbox-extras.js + sandbox-learning.js** — the full network sandbox split across 8 files. Canvas-based interactive builder where users drag and drop routers, switches, PCs, and firewalls, draw cable connections, configure IP addresses, and run CLI commands in a built-in terminal emulator. Supports guided tutorials, challenges, and free mode
- **onboarding-tour.js** — step-by-step guided tour for first-time users on the dashboard
- **progress.js** — progress page with activity heatmap and stats
- **account.js** — account settings page logic
- **login.js** — login form validation and API submission
- **signup.js** — signup form validation and API submission
- **forgotpassword.js** — password reset form handling
- **index.js** — landing page logic

---

## Code Style Conventions

All page-specific JavaScript files follow these rules:

- Wrapped in an IIFE: `(function () { "use strict"; ... })();`
- `var` for all variable declarations (no `const` or `let`)
- Regular `function` declarations or function expressions (no arrow functions)
- `for` loops for iteration (no `.map()`, `.filter()`, `.forEach()`)
- Descriptive function and variable names (e.g. `fetchUserAchievementsFromServer`, `displayContinueLearningCourses`)
- Simple `//` comments — one line, plain English, no decorations or dividers
- String concatenation instead of template literals
- Plain objects instead of `Set` / `Map` where possible
- No external dependencies beyond Bootstrap
