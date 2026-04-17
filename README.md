# Netology Final Year Project
**Jamie O'Neill**  
**Student Number: C22320301**  
**Course Code: TU857/4**

## Overview

Netology is my final year project. It is a web app for learning Computer Netwokring with lessons, quizzes, progress tracking, achievements, and a network sandbox that runs in the browser.

I built it to make computer networking easier to understand. Instead of only reading theory, the user can build a network, configure devices, test it, and see if it works.

## What It Does

- Gives users 9 courses split across Novice, Intermediate, and Advanced.
- Lets users complete lessons and quizzes for XP.
- Tracks levels, ranks, achievements, and login streaks.
- Shows progress on the dashboard, progress page, and account page.
- Includes a computer network sandbox for building and testing topologies.
- Saves user data in PostgreSQL through a Flask backend.

## Main Features

- Course content is built into the frontend in `course_content.js`.
- User data like XP, achievements, streaks, and saved topologies comes from the backend.
- The sandbox supports devices, connections, IP settings, DHCP, ping, traceroute, and save and load.
- The onboarding tour helps new users learn the site step by step.
- The account page includes theme settings and the dyslexic font option.

## How It Works

The frontend uses plain HTML, CSS, and JavaScript. I did not use a frontend framework. Each page loads the shared scripts it needs, then its own page script.

The backend is a Flask app. It handles login, registration, XP, achievements, user progress, onboarding, and sandbox save and load. The same course id is used on the frontend and backend so both sides stay in sync.

## Sandbox

The sandbox is split into three JavaScript files because each one has a different job.

- `sandbox-core.js` holds the shared state, device setup, network rules, IP checks, ping logic, DHCP, and other helper code.
- `sandbox-ui.js` draws the sandbox, wires the buttons and panels, and handles the user interaction side.
- `sandbox-app.js` handles lesson setup, tutorial steps, challenge flow, auto-save, and the page level sandbox behaviour.

I kept these separate so the file that stores the shared logic stays clean and the UI code does not get mixed up with the lesson flow.

## Tech Used

- HTML
- CSS
- Vanilla JavaScript
- Python
- Flask
- Flask-Bcrypt
- PostgreSQL
- Bootstrap 5.3.3
- Bootstrap Icons
- Gunicorn

## Main Files

### Backend

- `Netology/backend/app.py` starts the Flask app and registers the blueprints.
- `Netology/backend/auth_routes.py` handles signup, login, forgot password, and profile data.
- `Netology/backend/course_routes.py` handles courses, lessons, quizzes, and challenge completion.
- `Netology/backend/user_routes.py` handles achievements, challenges, activity, and streaks.
- `Netology/backend/onboarding_routes.py` handles the guided tour.
- `Netology/backend/topology_routes.py` handles sandbox save and load.
- `Netology/backend/xp_system.py` handles XP, levels, and ranks.
- `Netology/backend/achievement_engine.py` checks achievement rules and unlocks badges.
- `Netology/backend/db.py` handles the database connection and small shared helpers.
- `Netology/backend/gunicorn.conf.py` is the deployment config.

### Frontend

- `Netology/docs/js/app.js` sets up the shared frontend data and API helpers.
- `Netology/docs/js/course_content.js` stores the course and lesson content.
- `Netology/docs/js/dashboard.js` handles the dashboard.
- `Netology/docs/js/account.js` handles the account page.
- `Netology/docs/js/courses.js` handles the course list page.
- `Netology/docs/js/course.js` handles the single course page.
- `Netology/docs/js/lesson.js` handles lesson pages.
- `Netology/docs/js/quiz.js` handles quizzes.
- `Netology/docs/js/progress.js` handles the progress page.
- `Netology/docs/js/login.js`, `signup.js`, and `forgotpassword.js` handle auth pages.
- `Netology/docs/js/theme.js` handles theme and accessibility settings.
- `Netology/docs/js/toasts.js` handles shared toast messages.
- `Netology/docs/js/background.js` handles the animated background.
- `Netology/docs/js/sandbox-core.js`, `sandbox-ui.js`, and `sandbox-app.js` handle the sandbox.

## Live Links

- Backend and frontend on Render: `https://netology-fyp.onrender.com`

## Notes

I kept the project simple on purpose. It is all plain HTML, CSS, JavaScript, and Flask, so the whole system is easy to read and easy to explain but the compelixty comes from how all parts of the system interact, the Methadologys and types of learning that helped design the Netology system. I have genuinely really enjoyed making this project,I have learned a lot about myself through the process, I have grown a lot by doing it and I am very proud of what I have created.
