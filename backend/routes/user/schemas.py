"""Pydantic request and response models for user authentication routes."""

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    """Incoming payload for user registration."""

    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)
    level: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)


class SignupResponse(BaseModel):
    """Response body returned after a successful registration."""

    message: str
    user_id: int
    name: str
    level: str


class SigninRequest(BaseModel):
    """Incoming payload for user sign in."""

    email: EmailStr
    password: str = Field(..., min_length=8)


class SigninResponse(BaseModel):
    """Response body returned after a successful sign in."""

    message: str
    name: str
    level: str


class ForgotPasswordRequest(BaseModel):
    """Payload for verifying whether an email exists before resetting."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Payload for updating a user's password."""

    email: EmailStr
    new_password: str = Field(..., min_length=8)


class MessageResponse(BaseModel):
    """Generic response payload for actions that only return a message."""

    message: str


class ErrorResponse(BaseModel):
    """Schema describing error payloads returned by the endpoints."""

    detail: str
