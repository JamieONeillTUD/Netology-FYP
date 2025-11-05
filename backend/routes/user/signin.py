"""Signin route handlers."""

from fastapi import APIRouter, HTTPException, status

from auth import verify_password
from db import get_connection

from .schemas import ErrorResponse, SigninRequest, SigninResponse

router = APIRouter()


@router.post(
    "/login",
    response_model=SigninResponse,
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
    },
)
def login(payload: SigninRequest) -> SigninResponse:
    """Verify credentials for an existing user."""

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database connection failed")

    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, name, level, password FROM users WHERE email=%s;", (payload.email,))
        row = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    if not row or not verify_password(payload.password, row[3]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return SigninResponse(message=f"Welcome back, {row[1]}!", name=row[1], level=row[2])
