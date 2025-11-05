"""Tests for user authentication routes without hitting a real database."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi import HTTPException

from auth import verify_password
from routes.user.password import forgot_password, reset_password
from routes.user.schemas import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    SigninRequest,
    SignupRequest,
)
from routes.user.signin import login
from routes.user.signup import signup


@dataclass
class FakeUser:
    """Representation of a stored user within the fake database."""

    id: int
    name: str
    email: str
    password: str
    level: str
    reason: str


class FakeCursor:
    """Minimal psycopg2-like cursor for exercising the routes."""

    def __init__(self, storage: Dict[str, Any]):
        self.storage = storage
        self._result: Optional[tuple[Any, ...]] = None

    def execute(self, query: str, params: tuple[Any, ...]) -> None:
        normalized = " ".join(query.split()).lower()
        if normalized.startswith("insert into users"):
            name, email, password, level, reason = params
            if email in self.storage["users"]:
                raise Exception('duplicate key value violates unique constraint "users_email_key"')
            user_id = self.storage["sequence"]
            self.storage["sequence"] += 1
            self.storage["users"][email] = FakeUser(user_id, name, email, password, level, reason)
            self._result = (user_id,)
        elif normalized.startswith("select id, name, level, password from users where email"):
            (email,) = params
            user = self.storage["users"].get(email)
            self._result = (user.id, user.name, user.level, user.password) if user else None
        elif normalized.startswith("select id from users where email"):
            (email,) = params
            user = self.storage["users"].get(email)
            self._result = (user.id,) if user else None
        elif normalized.startswith("update users set password"):
            new_password, email = params
            user = self.storage["users"].get(email)
            if user:
                self.storage["users"][email] = FakeUser(user.id, user.name, user.email, new_password, user.level, user.reason)
                self._result = (user.id,)
            else:
                self._result = None
        else:  # pragma: no cover - safeguard for unexpected SQL during development
            raise NotImplementedError(query)

    def fetchone(self) -> Optional[tuple[Any, ...]]:
        return self._result

    def close(self) -> None:  # pragma: no cover - method present for parity with psycopg2
        self._result = None


class FakeConnection:
    """Simplistic psycopg2-like connection object."""

    def __init__(self, storage: Dict[str, Any]):
        self.storage = storage

    def cursor(self) -> FakeCursor:
        return FakeCursor(self.storage)

    def commit(self) -> None:  # pragma: no cover - noop for fake connection
        return None

    def rollback(self) -> None:  # pragma: no cover - noop for fake connection
        return None

    def close(self) -> None:  # pragma: no cover - noop for fake connection
        return None


@pytest.fixture(autouse=True)
def storage(monkeypatch: pytest.MonkeyPatch) -> Dict[str, Any]:
    """Provide a fake database storage and patch connection helpers."""

    storage: Dict[str, Any] = {"users": {}, "sequence": 1}

    def _connection_factory() -> FakeConnection:
        return FakeConnection(storage)

    monkeypatch.setattr("routes.user.signup.get_connection", _connection_factory)
    monkeypatch.setattr("routes.user.signin.get_connection", _connection_factory)
    monkeypatch.setattr("routes.user.password.get_connection", _connection_factory)

    return storage


def _signup_payload(password: str = "SecurePass123") -> SignupRequest:
    return SignupRequest(
        name="Ada Lovelace",
        email="ada@example.com",
        password=password,
        level="Beginner",
        reason="Learn AI",
    )


def test_signup_success_hashes_password(storage: Dict[str, Any]) -> None:
    response = signup(_signup_payload())
    assert response.message == "User registered successfully!"
    stored_password = storage["users"]["ada@example.com"].password
    assert stored_password != "SecurePass123"
    assert verify_password("SecurePass123", stored_password)


def test_signup_duplicate_email_returns_400(storage: Dict[str, Any]) -> None:
    signup(_signup_payload())
    with pytest.raises(HTTPException) as exc_info:
        signup(_signup_payload())
    assert exc_info.value.status_code == 400
    assert "Signup failed" in exc_info.value.detail


def test_signin_success(storage: Dict[str, Any]) -> None:
    payload = _signup_payload()
    signup(payload)
    response = login(SigninRequest(email=payload.email, password=payload.password))
    assert response.message.startswith("Welcome back")


def test_signin_invalid_credentials(storage: Dict[str, Any]) -> None:
    payload = _signup_payload()
    signup(payload)
    with pytest.raises(HTTPException) as exc_info:
        login(SigninRequest(email=payload.email, password="WrongPassword!"))
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid credentials"


def test_forgot_password_email_not_found() -> None:
    with pytest.raises(HTTPException) as exc_info:
        forgot_password(ForgotPasswordRequest(email="nobody@example.com"))
    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Email not found"


def test_reset_password_updates_hash(storage: Dict[str, Any]) -> None:
    payload = _signup_payload()
    signup(payload)
    before_hash = storage["users"][payload.email].password
    response = reset_password(
        ResetPasswordRequest(email=payload.email, new_password="EvenMoreSecure456"),
    )
    assert response.message == "Password updated successfully"
    after_hash = storage["users"][payload.email].password
    assert after_hash != before_hash
    assert verify_password("EvenMoreSecure456", after_hash)
