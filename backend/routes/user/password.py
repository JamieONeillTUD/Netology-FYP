"""Password management route handlers."""

from fastapi import APIRouter, HTTPException, status

from auth import hash_password
from db import get_connection

from .schemas import (
    ErrorResponse,
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
)

router = APIRouter()


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
    },
)
def forgot_password(payload: ForgotPasswordRequest) -> MessageResponse:
    """Verify that an email exists before resetting a password."""

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database connection failed")

    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM users WHERE email=%s;", (payload.email,))
        row = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")

    return MessageResponse(message="Email verified")


@router.put(
    "/reset-password",
    response_model=MessageResponse,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
    },
)
def reset_password(payload: ResetPasswordRequest) -> MessageResponse:
    """Update the stored hashed password for a user."""

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database connection failed")

    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE users SET password=%s WHERE email=%s RETURNING id;",
            (hash_password(payload.new_password), payload.email),
        )
        updated = cursor.fetchone()
        conn.commit()
    finally:
        cursor.close()
        conn.close()

    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")

    return MessageResponse(message="Password updated successfully")
