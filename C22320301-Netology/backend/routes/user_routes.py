"""
user_routes.py
---------------
Contains user-related API routes for registration and login.
Later, these will connect to PostgreSQL.
"""

from fastapi import APIRouter, HTTPException
from backend.schemas import UserCreate, UserLogin, UserOut
from backend.auth import hash_password, verify_password

router = APIRouter(prefix="/api/users", tags=["Users"])

# Temporary in-memory database (list)
users_db = []
user_id_counter = 1

@router.post("/register", response_model=UserOut)
def register_user(user: UserCreate):
    """Register a new user (temporary in-memory version)."""
    global user_id_counter

    # Check if email already exists
    if any(u["email"] == user.email for u in users_db):
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = {
        "id": user_id_counter,
        "email": user.email,
        "password_hash": hash_password(user.password),
    }

    users_db.append(new_user)
    user_id_counter += 1
    return {"id": new_user["id"], "email": new_user["email"]}


@router.post("/login", response_model=UserOut)
def login_user(credentials: UserLogin):
    """Authenticate user with email and password."""
    # Find user by email
    user = next((u for u in users_db if u["email"] == credentials.email), None)
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {"id": user["id"], "email": user["email"]}
# Future routes for user profile, update, delete can be added here