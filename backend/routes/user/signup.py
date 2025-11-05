"""Signup route handlers."""

from fastapi import APIRouter, HTTPException, status

from auth import hash_password
from db import get_connection

from .schemas import ErrorResponse, SignupRequest, SignupResponse

router = APIRouter()


@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    responses={status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse}, status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse}},
)
def signup(payload: SignupRequest) -> SignupResponse:
    """Register a new user and persist a hashed password."""

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database connection failed")

    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO users (name, email, password, level, reason)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id;
            """,
            (
                payload.name,
                payload.email,
                hash_password(payload.password),
                payload.level,
                payload.reason,
            ),
        )
        user_id = cursor.fetchone()[0]
        conn.commit()
        return SignupResponse(message="User registered successfully!", user_id=user_id, name=payload.name, level=payload.level)
    except Exception as exc:  # pragma: no cover - branch outcome validated via response
        conn.rollback()
        message = "Signup failed: email may already be registered" if "duplicate" in str(exc).lower() else f"Signup failed: {exc}"
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    finally:
        cursor.close()
        conn.close()
