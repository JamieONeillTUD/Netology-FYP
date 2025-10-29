"""
schemas.py
-----------
Defines the data models (schemas) for requests and responses.
"""

from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    """Schema for registering a new user."""
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    """Schema for logging in."""
    email: EmailStr
    password: str

class UserOut(BaseModel):
    """Schema for sending user data back to the frontend."""
    id: int
    email: EmailStr
