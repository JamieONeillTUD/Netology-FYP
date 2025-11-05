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
- Node.js 18+ (for the Vite-powered frontend tooling)
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
The refreshed frontend runs on vanilla HTML, CSS, and JavaScript bundled with Vite. This keeps authoring simple while enabling fast module loading, hot reloading, and production bundling.

```bash
# install dependencies
npm install

# start a dev server at http://localhost:5173/login.html
npm run dev

# produce an optimised build in frontend/dist
npm run build
```

Set `VITE_API_BASE` in a `.env` file at the repository root if the FastAPI backend is not running on `http://localhost:8000`.

### Design principles
- **Nielsen's heuristics** inform system feedback, undo pathways, and consistent language across views.
- **Hick's and Miller's laws** guided the number of visible actions per page and chunked information blocks.
- **Accessibility research** (WCAG 2.2, British Dyslexia Association) shaped colour contrast, typography, and theme toggles.

### Docker
A compose setup that builds the backend and frontend containers lives in `infra/docker/docker-compose.yml`.

```bash
cd infra/docker
docker compose up --build
```

Update `backend/.env` (or create one based on it) with the connection information for your PostgreSQL database before running the stack.

### Database
Initialise the PostgreSQL database by applying the SQL schema:

```bash
python -m backend.migrate
```

By default the script looks for `database/schema.sql` (falling back to `infra/database/schema.sql` for legacy setups). Optional seed data is available in `infra/database/seed.sql`.

## 🧭 Notes
- The legacy `C22320301-Netology/` project layout has been consolidated into the top-level folders described above for easier navigation.
- Update paths in any local scripts or deployment pipelines to reference `backend/`, `frontend/`, and `infra/` directly.
