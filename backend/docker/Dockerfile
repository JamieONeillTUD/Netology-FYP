# docker/Dockerfile
# Simple all-in-one Docker setup for Netology
# Runs FastAPI backend and serves static frontend at the same time

FROM python:3.11-slim

# Working directory inside container
WORKDIR /app

# Copy backend files
COPY ../backend /app/backend

# Copy frontend (HTML, CSS, JS)
COPY ../frontend /app/frontend

# Copy dependencies and environment variables
COPY ../backend/requirements.txt /app/requirements.txt
COPY ../backend/.env /app/backend/.env

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/requirements.txt

# Expose backend and frontend ports
EXPOSE 8000
EXPOSE 5500

# Start both servers (frontend + backend)
# Frontend served by simple Python HTTP server on port 5500
# Backend (FastAPI) runs on port 8000
CMD bash -c "python3 -m http.server 5500 --directory /app/frontend & uvicorn backend.main:app --host 0.0.0.0 --port 8000"
