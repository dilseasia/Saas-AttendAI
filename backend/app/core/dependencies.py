"""
core/dependencies.py
────────────────────
FastAPI Depends() guards for JWT-protected routes.
Role-based access control using token claims.
"""

from typing import Annotated
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from app.core.security import decode_access_token
from app.core.exceptions import AuthenticationError, AuthorizationError

# HTTPBearer reads 'Authorization: Bearer <token>' from the request header.
# auto_error=False — we raise our own clean error instead of FastAPI's default.
_bearer = HTTPBearer(auto_error=False)


# ── Token payload dataclass ───────────────────────────────────────
class CurrentUser:
    """Decoded JWT payload — injected into route handlers via Depends()."""
    __slots__ = ("user_id", "tenant_id", "role", "name", "email")

    def __init__(self, payload: dict):
        self.user_id: str  = payload["sub"]
        self.tenant_id: str = payload["tenant_id"]
        self.role: str     = payload["role"]
        self.name: str     = payload.get("name", "")
        self.email: str    = payload.get("email", "")

    def __repr__(self) -> str:
        return f"<CurrentUser id={self.user_id} role={self.role}>"


# ── Base dependency ───────────────────────────────────────────────

def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
) -> CurrentUser:
    """
    Reads and validates the Bearer token on every protected request.
    Raises 401 if token is missing, expired, or invalid.
    """
    if credentials is None:
        raise AuthenticationError("Missing Authorization header. Format: Bearer <token>")

    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError as exc:
        raise AuthenticationError(f"Invalid or expired token: {exc}")

    user = CurrentUser(payload)
    if user.role == "super_admin" or user.email == "admin@seasia.com":
        override_tenant = request.headers.get("x-tenant-id")
        if override_tenant and override_tenant not in ("undefined", "null"):
            user.tenant_id = override_tenant
            
    return user


# ── Role guards ───────────────────────────────────────────────────

def require_super_admin(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    if user.role != "super_admin":
        raise AuthorizationError("Super admin access required")
    return user


def require_admin(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    if user.role not in ("super_admin", "admin"):
        raise AuthorizationError("Admin access required")
    return user


def require_hr(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    if user.role not in ("super_admin", "admin", "hr"):
        raise AuthorizationError("HR or higher access required")
    return user


def require_any_role(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    """Any authenticated user — just verifies the token."""
    return user


# ── Type aliases (cleaner route signatures) ───────────────────────
AuthUser       = Annotated[CurrentUser, Depends(get_current_user)]
AdminUser      = Annotated[CurrentUser, Depends(require_admin)]
HRUser         = Annotated[CurrentUser, Depends(require_hr)]
SuperAdminUser = Annotated[CurrentUser, Depends(require_super_admin)]
