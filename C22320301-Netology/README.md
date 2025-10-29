
# Netology — Project Skeleton (Base Structure)

This is the starting point for my Netology prototype.  
It’s a clean project structure that keeps everything separate and easy to work on.  
The idea is to have clear divisions between the **frontend**, **backend**, **database**, and **deployment setup**, so development stays organized as the project grows.

---

## 📁 Folder Structure

```
netology/
├── frontend/                  # All the visual and interactive parts
│   ├── index.html             # Landing page
│   ├── login.html             # Login page
│   ├── signup.html            # Registration page
│   ├── dashboard.html         # Dashboard for logged-in users
│   ├── sandbox.html           # Network sandbox (user simulation area)
│   ├── css/
│   │   ├── style.css          # Global styles for the site
│   │   └── dashboard.css      # Styles specific to the dashboard
│   ├── js/
│   │   ├── main.js            # General scripts and helpers
│   │   ├── auth.js            # Login/Signup logic
│   │   └── sandbox.js         # Sandbox functionality and API calls
│   └── assets/
│       └── images/            # Icons, logos, or visuals
│
├── backend/                   # Handles data, logic, and the API
│   ├── main.py                # FastAPI entry point
│   ├── db.py                  # Database connection setup
│   ├── models.py              # Database tables (users, progress, sandbox)
│   ├── schemas.py             # Input/output data validation
│   ├── auth.py                # Password hashing, tokens, etc.
│   ├── routes/
│   │   ├── user_routes.py     # Signup and login routes
│   │   ├── progress_routes.py # XP and badge routes
│   │   └── sandbox_routes.py  # Save/load sandbox data
│   └── simulation/
│       └── simulation_engine.py # Network simulation logic (Python/NetworkX)
│
├── database/
│   ├── schema.sql             # SQL to create tables
│   └── seed.sql               # Optional starter data for testing
│
├── docker/
│   ├── Dockerfile-frontend    # For serving frontend with Nginx
│   ├── Dockerfile-backend     # For backend (Python/FastAPI)
│   └── docker-compose.yml     # Runs everything (frontend + backend + PostgreSQL)
│
├── .env.example               # Environment variables template
└── README.md                  # This file
```

---

## 🧭 What Each Section Does

### Frontend (`/frontend`)
This folder contains all the static parts of the site — HTML, CSS, and JavaScript.  
It’s what users actually see and interact with.

- The JavaScript files will connect to the backend API using `fetch()` requests.  
- There’s no backend code here — it’s a completely static site that can later be hosted with Nginx.

Main pages:
- `index.html` – main landing page  
- `signup.html` / `login.html` – for registration and logging in  
- `dashboard.html` – user progress, XP, and badges  
- `sandbox.html` – where the user can build and test networks (interactive area)

---

### Backend (`/backend`)
The backend runs on **Python using FastAPI**.  
It handles all the logic, data, and API requests between the frontend and the database.

Files are broken up by purpose:
- `main.py` runs the FastAPI app and includes all routes  
- `db.py` connects to the PostgreSQL database  
- `models.py` defines the tables (Users, Progress, Sandbox)  
- `schemas.py` handles validation for incoming/outgoing data  
- `routes/` folder holds all API routes, separated by feature  
- `simulation/` will hold the Python code that runs network simulations

---

### Database (`/database`)
PostgreSQL is used for storing user accounts, progress, and sandbox data.  
- `schema.sql` will hold the SQL commands to create the necessary tables.  
- `seed.sql` can be used to pre-load test data.

---

### Docker (`/docker`)
Docker will make it easy to run everything together — the backend, frontend, and database — with one command.  
These files are placeholders for now, but later they’ll:
- Build containers for the backend and frontend  
- Connect them to a PostgreSQL container  
- Work locally or deploy to AWS using the same setup

---

## 🧩 Development Plan (in order)

1. **Frontend pages**  
   Build all basic pages and add simple styling and navigation.

2. **Backend API setup**  
   Create the FastAPI app and add routes for user signup and login.

3. **Database connection**  
   Connect the backend to PostgreSQL and test simple queries.

4. **Sandbox page**  
   Build the sandbox interface and basic backend endpoints for saving/loading network data.

5. **Simulation engine**  
   Add the Python script to simulate network topologies (later using NetworkX).

6. **Docker setup**  
   Create Dockerfiles and use Docker Compose to run everything together.

7. **Hosting on AWS**  
   Deploy using AWS Lightsail or EC2 when the local version is stable.

---

## ⚙️ Environment Setup

Copy `.env.example` to a new file called `.env`  
and fill in your real values when ready.

```
POSTGRES_USER=netology
POSTGRES_PASSWORD=netology_pwd
POSTGRES_DB=netology
POSTGRES_PORT=5432

API_URL=http://localhost:8000
```

---

## ✅ Summary

This is the base structure for my Netology prototype.  
It’s clean, modular, and follows modern web design principles:
- Frontend (HTML/CSS/JS)
- Backend (Python/FastAPI)
- Database (PostgreSQL)
- Docker (for easy deployment)

Now that the structure is in place, the next step is to start developing each part — probably beginning with the **frontend pages** and a simple **FastAPI login/register API** to connect them.
