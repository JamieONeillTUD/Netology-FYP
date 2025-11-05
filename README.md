# Netology-FYP

Netology is a prototype security training platform that combines a FastAPI backend, a static frontend, and supporting infrastructure for local development and deployment experiments.

## 📁 Project structure

```
Netology-FYP/
├── backend/                    # FastAPI application and supporting modules
│   ├── main.py                 # Application entry point
│   ├── auth.py                 # Authentication helpers
│   ├── db.py                   # PostgreSQL connection utilities
│   ├── models.py               # SQLAlchemy models
│   ├── schemas.py              # Pydantic schemas
│   ├── routes/                 # API route definitions
│   └── simulation/             # Network simulation prototype code
├── frontend/                   # Static HTML/CSS/JS client
│   ├── login.html              # Authentication screens
│   ├── signup.html             # Registration page
│   ├── dashboard.html          # Authenticated dashboard
│   ├── sandbox.html            # Network sandbox interface
│   ├── css/                    # Stylesheets
│   └── js/                     # Client-side behaviour
└── infra/                      # Database schema and container configuration
    ├── database/               # SQL assets for PostgreSQL
    │   ├── schema.sql          # Database schema definition
    │   └── seed.sql            # Sample seed data
    └── docker/                 # Docker build + compose assets
        ├── Dockerfile-backend  # Backend container definition
        ├── Dockerfile-frontend # Frontend container definition
        └── docker-compose.yml  # Local development stack
```

## 🚀 Usage

### Prerequisites
- Python 3.10+
- Node-compatible static server or any HTTP server for the frontend (optional)
- Docker and Docker Compose (optional)
- PostgreSQL instance

### Backend
1. Create and activate a virtual environment.
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Provide the environment variables expected in `backend/db.py` (see `.env` or create your own `.env` file).
4. Run the API:
   ```bash
   uvicorn backend.main:app --reload
   ```

### Frontend
Serve the `frontend/` directory with any static file server (for example `python -m http.server`), or open the HTML files directly in a browser while developing.

### Docker
A compose setup that builds the backend and frontend containers lives in `infra/docker/docker-compose.yml`.

```bash
cd infra/docker
docker compose up --build
```

Update `backend/.env` (or create one based on it) with the connection information for your PostgreSQL database before running the stack.

### Database
Apply the schema located in `infra/database/schema.sql` to initialise the PostgreSQL database. Optional seed data is available in `infra/database/seed.sql`.

## 🧭 Notes
- The legacy `C22320301-Netology/` project layout has been consolidated into the top-level folders described above for easier navigation.
- Update paths in any local scripts or deployment pipelines to reference `backend/`, `frontend/`, and `infra/` directly.
