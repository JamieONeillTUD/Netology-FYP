"""
main.py
--------
This is the entry point of the backend FastAPI app.
It loads all routes (APIs) and starts the server.
"""

from fastapi import FastAPI
from backend.routes import user_routes

app = FastAPI(
    title="Netology API",
    description="Backend for Netology learning platform prototype",
    version="1.0.0",
)

# Include user-related routes (login, register)
app.include_router(user_routes.router)

@app.get("/")
def root():
    """Simple test route to confirm the backend is running."""
    return {"message": "Netology backend is running!"}
