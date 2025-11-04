"""
main.py
--------
This is the entry point of the backend FastAPI app.
It loads all routes (APIs) and starts the server.
"""

from fastapi import FastAPI
from routes import user_routes  # Import directly (matches Docker copy)
from db import get_connection

app = FastAPI(
    title="Netology API",
    description="Backend for Netology learning platform prototype",
    version="1.0.0",
)

# Include user-related routes
app.include_router(user_routes.router)

@app.get("/")
def root():
    """Simple route to confirm backend is running."""
    return {"message": "Netology backend is running!"}

@app.get("/db-check")
def db_check():
    """Check connection to AWS RDS database."""
    conn = get_connection()
    if conn:
        conn.close()
        return {"database": "Connected successfully"}
    return {"database": "Connection failed"}
