"""
main.py
--------
This is the entry point of the backend FastAPI app.
It loads all routes (APIs), handles CORS for the frontend,
and verifies database connectivity to AWS RDS.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import user_routes  # Correct for Docker folder structure
from db import get_connection

# --- FastAPI app configuration ---
app = FastAPI(
    title="Netology API",
    description="Backend for Netology learning platform prototype",
    version="1.0.0",
)

# --- Enable CORS (allows frontend to access backend) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # allow all origins (frontend 8080 → backend 8000)
    allow_credentials=True,
    allow_methods=["*"],            # allow all HTTP methods (GET, POST, PUT, etc.)
    allow_headers=["*"],            # allow all headers
)

# --- Include user-related routes (login, signup, reset password) ---
app.include_router(user_routes.router)


# --- Basic health check route ---
@app.get("/")
def root():
    """Simple route to confirm backend is running."""
    return {"message": "Netology backend is running!"}


# --- Database connection check route ---
@app.get("/db-check")
def db_check():
    """Check connection to AWS RDS PostgreSQL database."""
    conn = get_connection()
    if conn:
        conn.close()
        return {"database": "Connected successfully"}
    return {"database": "Connection failed"}
