"""
auth.py
--------
Handles password hashing and verification using passlib.
This ensures user passwords are never stored in plain text.
"""

import base64
import hashlib
import hmac
import os
from typing import Callable

try:  # pragma: no cover - exercised implicitly when passlib is available
    from passlib.context import CryptContext

    _hash_impl: Callable[[str], str]
    _verify_impl: Callable[[str, str], bool]

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def _hash_impl(password: str) -> str:
        return pwd_context.hash(password)

    def _verify_impl(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

except ModuleNotFoundError:  # pragma: no cover - used in CI where passlib is unavailable
    _ITERATIONS = 390_000
    _SALT_SIZE = 16

    def _hash_impl(password: str) -> str:
        salt = os.urandom(_SALT_SIZE)
        derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _ITERATIONS)
        return base64.b64encode(salt + derived).decode("ascii")

    def _verify_impl(plain_password: str, hashed_password: str) -> bool:
        decoded = base64.b64decode(hashed_password.encode("ascii"))
        salt, stored = decoded[:_SALT_SIZE], decoded[_SALT_SIZE:]
        computed = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, _ITERATIONS)
        return hmac.compare_digest(stored, computed)


def hash_password(password: str) -> str:
    """Hash a plain text password for storage."""

    return _hash_impl(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain text password against its hashed version."""

    return _verify_impl(plain_password, hashed_password)
