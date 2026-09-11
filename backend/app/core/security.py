"""
core/security.py
────────────────
Password hashing (bcrypt) and JWT token creation / verification.

NOTE: bcrypt is CPU-blocking. hash_password / verify_password run in a
thread pool via asyncio.get_event_loop().run_in_executor() so they don't
block the async event loop.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()


# ── Password hashing (thread-safe async wrappers) ─────────────────

def _hash_sync(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def _verify_sync(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


async def hash_password(password: str) -> str:
    """Hash password in a thread pool — non-blocking."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _hash_sync, password)


async def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password in a thread pool — non-blocking."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _verify_sync, plain_password, hashed_password)


# Sync versions for use in non-async contexts (e.g. router inline code)
hash_password_sync   = _hash_sync
verify_password_sync = _verify_sync


# ── JWT helpers ───────────────────────────────────────────────────



def _create_token(payload: dict[str, Any], expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload.update({"iat": now, "exp": now + expires_delta})
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(
    user_id: str,
    tenant_id: str,
    role: str,
    name: str,
    email: str,
) -> str:
    return _create_token(
        {
            "sub": user_id,
            "tenant_id": tenant_id,
            "role": role,
            "name": name,
            "email": email,
            "token_type": "access",
        },
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str, tenant_id: str, role: str) -> str:
    return _create_token(
        {
            "sub": user_id,
            "tenant_id": tenant_id,
            "role": role,
            "token_type": "refresh",
        },
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def create_token_pair(
    user_id: str,
    tenant_id: str,
    role: str,
    name: str,
    email: str,
) -> dict[str, Any]:
    """Returns both access + refresh tokens ready for API response."""
    return {
        "access_token": create_access_token(user_id, tenant_id, role, name, email),
        "refresh_token": create_refresh_token(user_id, tenant_id, role),
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT.
    Raises jose.JWTError on any failure (expired, tampered, wrong algo).
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )


def decode_access_token(token: str) -> dict[str, Any]:
    payload = decode_token(token)
    if payload.get("token_type") != "access":
        raise JWTError("Not an access token")
    return payload


def decode_refresh_token(token: str) -> dict[str, Any]:
    payload = decode_token(token)
    if payload.get("token_type") != "refresh":
        raise JWTError("Not a refresh token")
    return payload


def create_reset_password_token(user_id: str, email: str) -> str:
    return _create_token(
        {
            "sub": user_id,
            "email": email,
            "token_type": "reset_password",
        },
        timedelta(minutes=30),
    )


def decode_reset_password_token(token: str) -> dict[str, Any]:
    payload = decode_token(token)
    if payload.get("token_type") != "reset_password":
        raise JWTError("Invalid or expired password reset token")
    return payload
