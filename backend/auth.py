"""
auth.py
--------
Handles password hashing and verification using passlib.
This ensures user passwords are never stored in plain text.
"""

from passlib.context import CryptContext

# Initialize passlib's context with bcrypt (same as bcrypt in Node)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """
    Hash a plain text password.
    This is what we store in the database instead of the raw password.
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against its hashed version.
    Returns True if it matches, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)
