"""
routers/auth.py
───────────────
Auth API endpoints — thin layer that delegates to auth_service.

Endpoints:
  POST  /api/v1/auth/login        → Login, returns JWT pair
  POST  /api/v1/auth/register     → New tenant signup
  POST  /api/v1/auth/refresh      → Get new access token
  POST  /api/v1/auth/logout       → Client-side logout helper
  GET   /api/v1/auth/me           → Current user info
  PATCH /api/v1/auth/me/password  → Change own password
"""

import asyncpg
from fastapi import APIRouter, Depends, status

from app.core.database import get_db
from app.core.dependencies import AuthUser
from app.models.auth import (
    LoginRequest,
    RegisterRequest,
    RefreshRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    LoginResponse,
    RegisterResponse,
    RefreshResponse,
    MeResponse,
    ForgotPasswordResponse,
    MessageResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── POST /auth/login ──────────────────────────────────────────────
@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Login",
    description="Authenticate with email and password. Returns JWT access + refresh tokens.",
)
async def login(
    payload: LoginRequest,
    db: asyncpg.Connection = Depends(get_db),
) -> LoginResponse:
    return await auth_service.login(db, payload)


# ── POST /auth/register ───────────────────────────────────────────
@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new company",
    description=(
        "Provisions a new tenant company with a 14-day free trial. "
        "Creates the company, admin user, and trial subscription atomically."
    ),
)
async def register(
    payload: RegisterRequest,
    db: asyncpg.Connection = Depends(get_db),
) -> RegisterResponse:
    return await auth_service.register(db, payload)


# ── POST /auth/refresh ────────────────────────────────────────────
@router.post(
    "/refresh",
    response_model=RefreshResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh access token",
    description="Exchange a valid refresh token for a new access token.",
)
async def refresh(
    payload: RefreshRequest,
    db: asyncpg.Connection = Depends(get_db),
) -> RefreshResponse:
    return await auth_service.refresh_token(db, payload.refresh_token)


# ── POST /auth/logout ─────────────────────────────────────────────
@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Logout",
    description=(
        "JWT logout is stateless — tokens are invalidated client-side by discarding them. "
        "This endpoint confirms the intent. For server-side revocation, add a Redis token blacklist."
    ),
)
async def logout(user: AuthUser) -> MessageResponse:
    return MessageResponse(success=True, message="Logged out successfully. Please discard your tokens.")


# ── GET /auth/me ──────────────────────────────────────────────────
@router.get(
    "/me",
    response_model=MeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user",
    description="Returns full user + tenant info for the currently authenticated user.",
)
async def me(
    user: AuthUser,
    db: asyncpg.Connection = Depends(get_db),
) -> MeResponse:
    return await auth_service.get_me(db, user.user_id, user.tenant_id)


# ── PATCH /auth/me/password ───────────────────────────────────────
@router.patch(
    "/me/password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Change own password",
)
async def change_password(
    payload: ChangePasswordRequest,
    user: AuthUser,
    db: asyncpg.Connection = Depends(get_db),
) -> MessageResponse:
    from app.core.security import verify_password_sync, hash_password_sync
    from app.core.exceptions import AuthenticationError

    # Verify current password
    row = await db.fetchrow(
        "SELECT password_hash FROM tenant_users WHERE id = $1", user.user_id
    )
    if not row or not verify_password_sync(payload.current_password, row["password_hash"]):
        raise AuthenticationError("Current password is incorrect")

    # Update
    await db.execute(
        "UPDATE tenant_users SET password_hash = $1 WHERE id = $2",
        hash_password_sync(payload.new_password),
        user.user_id,
    )

    return MessageResponse(success=True, message="Password changed successfully")


# ── POST /auth/forgot-password ────────────────────────────────────
@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    status_code=status.HTTP_200_OK,
    summary="Request password reset link",
    description="Generates a password reset token and link for the registered email.",
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: asyncpg.Connection = Depends(get_db),
) -> ForgotPasswordResponse:
    return await auth_service.forgot_password(db, payload.email)


# ── POST /auth/reset-password ─────────────────────────────────────
@router.post(
    "/reset-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Reset password using token",
    description="Resets the password using a valid reset token.",
)
async def reset_password(
    payload: ResetPasswordRequest,
    db: asyncpg.Connection = Depends(get_db),
) -> MessageResponse:
    return await auth_service.reset_password(db, payload.token, payload.new_password)

