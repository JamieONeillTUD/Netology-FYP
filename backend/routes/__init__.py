"""Route packages for the FastAPI application."""

from .user import router as user_router

__all__ = ["user_router"]
