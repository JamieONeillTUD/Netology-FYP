"""User-related route groupings."""

from fastapi import APIRouter

from .password import router as password_router
from .signin import router as signin_router
from .signup import router as signup_router

router = APIRouter(prefix="/user", tags=["User"])
router.include_router(signup_router)
router.include_router(signin_router)
router.include_router(password_router)

__all__ = ["router"]
