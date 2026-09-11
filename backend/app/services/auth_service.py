"""
services/auth_service.py
────────────────────────
Business logic for authentication and tenant registration.
All DB queries live here — routers stay thin.
"""

import logging
import re
import unicodedata
from datetime import datetime, timedelta, timezone

import asyncpg

from app.core.config import get_settings
from app.core.security import (
    create_token_pair,
    create_access_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.core.exceptions import (
    AuthenticationError,
    ConflictError,
    NotFoundError,
    TenantSuspendedError,
)
from app.models.auth import (
    LoginRequest,
    RegisterRequest,
    LoginResponse,
    RegisterResponse,
    RefreshResponse,
    MeResponse,
    TokenResponse,
    UserInfo,
    TenantInfo,
    ForgotPasswordResponse,
    MessageResponse,
)

logger = logging.getLogger(__name__)
settings = get_settings()


# ─────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    """Convert a company name to a URL-safe slug. e.g. 'SE Asia Pvt Ltd' → 'se-asia-pvt-ltd'"""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def _build_user_info(row: asyncpg.Record) -> UserInfo:
    return UserInfo(
        id=str(row["id"]),
        name=row["name"],
        email=row["email"],
        role=row["role"],
        tenant_id=str(row["tenant_id"]),
        last_login=row["last_login"],
        created_at=row["created_at"],
    )


def _build_tenant_info(row: asyncpg.Record) -> TenantInfo:
    return TenantInfo(
        id=str(row["id"]),
        name=row["name"],
        slug=row["slug"],
        plan=row["plan"],
        status=row["status"],
        trial_ends_at=row["trial_ends_at"],
        max_employees=row["max_employees"],
        max_cameras=row["max_cameras"],
        timezone=row["timezone"],
    )


def _build_tokens(user_id: str, tenant_id: str, role: str, name: str, email: str) -> TokenResponse:
    pair = create_token_pair(user_id, tenant_id, role, name, email)
    return TokenResponse(**pair)


# ─────────────────────────────────────────────────────────────────
#  1. LOGIN
# ─────────────────────────────────────────────────────────────────

async def login(db: asyncpg.Connection, payload: LoginRequest) -> LoginResponse:
    """
    Authenticate a tenant user by email + password.
    Returns JWT token pair + user & tenant metadata.
    """
    # ── Fetch user ────────────────────────────────────────────────
    user_row = await db.fetchrow(
        """
        SELECT
            u.id, u.tenant_id, u.name, u.email,
            u.password_hash, u.role, u.is_active,
            u.last_login, u.created_at
        FROM tenant_users u
        WHERE u.email = $1
        """,
        payload.email,
    )

    if user_row is None:
        raise AuthenticationError("Invalid email or password")

    # ── Verify password ───────────────────────────────────────────
    if not await verify_password(payload.password, user_row["password_hash"]):
        raise AuthenticationError("Invalid email or password")

    if not user_row["is_active"]:
        raise AuthenticationError("Your account has been deactivated. Contact your administrator.")

    # ── Fetch tenant ──────────────────────────────────────────────
    tenant_row = await db.fetchrow(
        "SELECT id, name, slug, plan, status, trial_ends_at, max_employees, max_cameras, timezone "
        "FROM tenants WHERE id = $1",
        user_row["tenant_id"],
    )

    if tenant_row is None:
        raise NotFoundError("Tenant")

    if tenant_row["status"] == "suspended":
        raise TenantSuspendedError()

    # ── Update last_login (fire-and-forget, best effort) ──────────
    await db.execute(
        "UPDATE tenant_users SET last_login = NOW() WHERE id = $1",
        user_row["id"],
    )

    user_id = str(user_row["id"])
    tenant_id = str(user_row["tenant_id"])

    logger.info("✅ Login: %s (role=%s, tenant=%s)", payload.email, user_row["role"], tenant_row["slug"])

    return LoginResponse(
        tokens=_build_tokens(user_id, tenant_id, user_row["role"], user_row["name"], user_row["email"]),
        user=_build_user_info(user_row),
        tenant=_build_tenant_info(tenant_row),
    )


# ─────────────────────────────────────────────────────────────────
#  2. REGISTER (New Tenant Onboarding)
# ─────────────────────────────────────────────────────────────────

async def register(db: asyncpg.Connection, payload: RegisterRequest) -> RegisterResponse:
    """
    Provision a new tenant company + admin user in a single DB transaction.

    Steps:
      1. Check for duplicate email / slug
      2. INSERT tenants row
      3. INSERT tenant_users row (role='admin')
      4. INSERT subscriptions row (trial plan)
      5. Return JWT pair + tenant info
    """
    # ── Check duplicate email ─────────────────────────────────────
    existing_tenant = await db.fetchval(
        "SELECT id FROM tenants WHERE email = $1", payload.company_email
    )
    if existing_tenant:
        raise ConflictError("A company with this email is already registered")

    existing_user = await db.fetchval(
        "SELECT id FROM tenant_users WHERE email = $1", payload.company_email
    )
    if existing_user:
        raise ConflictError("An account with this email already exists")

    # ── Generate unique slug ──────────────────────────────────────
    base_slug = _slugify(payload.company_name)
    slug = base_slug
    suffix = 1
    while await db.fetchval("SELECT id FROM tenants WHERE slug = $1", slug):
        slug = f"{base_slug}-{suffix}"
        suffix += 1

    # ── Map selected plan limits ──────────────────────────────────
    selected_plan = (payload.selected_plan or "pro").lower()
    plan_limits = {
        "starter": (25, 2),
        "pro": (100, 5),
        "enterprise": (99999, 999),
    }
    max_employees, max_cameras = plan_limits.get(selected_plan, (100, 5))

    trial_ends_at = datetime.utcnow() + timedelta(days=settings.TRIAL_DAYS)
    hashed_pw = await hash_password(payload.password)

    # ── Atomic transaction ────────────────────────────────────────
    async with db.transaction():
        # 1. Create tenant
        tenant_id = await db.fetchval(
            """
            INSERT INTO tenants (
                name, slug, email, phone, timezone,
                plan, status, max_employees, max_cameras, trial_ends_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9)
            RETURNING id
            """,
            payload.company_name,
            slug,
            payload.company_email,
            payload.company_phone,
            payload.timezone,
            selected_plan,
            max_employees,
            max_cameras,
            trial_ends_at,
        )

        # 2. Create admin user
        user_id = await db.fetchval(
            """
            INSERT INTO tenant_users (tenant_id, name, email, password_hash, role)
            VALUES ($1, $2, $3, $4, 'admin')
            RETURNING id
            """,
            tenant_id,
            payload.admin_name,
            payload.company_email,
            hashed_pw,
        )

        # 3. Create trial subscription
        await db.execute(
            """
            INSERT INTO subscriptions (tenant_id, plan, status, trial_ends_at, started_at, current_period_end)
            VALUES ($1, $2, 'trialing', $3, NOW(), $3)
            """,
            tenant_id,
            selected_plan,
            trial_ends_at,
        )

    # ── Fetch back full rows for response ─────────────────────────
    user_row = await db.fetchrow(
        "SELECT id, tenant_id, name, email, role, is_active, last_login, created_at "
        "FROM tenant_users WHERE id = $1",
        user_id,
    )
    tenant_row = await db.fetchrow(
        "SELECT id, name, slug, plan, status, trial_ends_at, max_employees, max_cameras, timezone "
        "FROM tenants WHERE id = $1",
        tenant_id,
    )

    str_user_id   = str(user_id)
    str_tenant_id = str(tenant_id)

    logger.info("🎉 New tenant registered: '%s' (slug=%s, admin=%s)", payload.company_name, slug, payload.company_email)

    return RegisterResponse(
        tokens=_build_tokens(str_user_id, str_tenant_id, "admin", payload.admin_name, payload.company_email),
        user=_build_user_info(user_row),
        tenant=_build_tenant_info(tenant_row),
    )


# ─────────────────────────────────────────────────────────────────
#  3. REFRESH TOKEN
# ─────────────────────────────────────────────────────────────────

async def refresh_token(db: asyncpg.Connection, token: str) -> RefreshResponse:
    """Exchange a valid refresh token for a new access token."""
    from jose import JWTError

    try:
        payload = decode_refresh_token(token)
    except JWTError as exc:
        raise AuthenticationError(f"Invalid or expired refresh token: {exc}")

    user_id   = payload["sub"]
    tenant_id = payload["tenant_id"]
    role      = payload["role"]

    # Verify user still active
    user_row = await db.fetchrow(
        "SELECT id, name, email, is_active FROM tenant_users WHERE id = $1",
        user_id,
    )
    if not user_row or not user_row["is_active"]:
        raise AuthenticationError("User account is inactive")

    access_token = create_access_token(
        user_id=user_id,
        tenant_id=tenant_id,
        role=role,
        name=user_row["name"],
        email=user_row["email"],
    )

    return RefreshResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# ─────────────────────────────────────────────────────────────────
#  4. GET CURRENT USER (me)
# ─────────────────────────────────────────────────────────────────

async def get_me(db: asyncpg.Connection, user_id: str, tenant_id: str) -> MeResponse:
    """Fetch full user + tenant info for the authenticated user."""
    user_row = await db.fetchrow(
        "SELECT id, tenant_id, name, email, role, is_active, last_login, created_at "
        "FROM tenant_users WHERE id = $1 AND tenant_id = $2",
        user_id,
        tenant_id,
    )
    if not user_row:
        raise NotFoundError("User")

    tenant_row = await db.fetchrow(
        "SELECT id, name, slug, plan, status, trial_ends_at, max_employees, max_cameras, timezone "
        "FROM tenants WHERE id = $1",
        tenant_id,
    )
    if not tenant_row:
        raise NotFoundError("Tenant")

    return MeResponse(
        user=_build_user_info(user_row),
        tenant=_build_tenant_info(tenant_row),
    )


# ─────────────────────────────────────────────────────────────────
#  5. FORGOT PASSWORD
# ─────────────────────────────────────────────────────────────────

async def forgot_password(db: asyncpg.Connection, email: str) -> ForgotPasswordResponse:
    """
    Generate password reset token and send email to registered address.
    """
    from app.core.security import create_reset_password_token
    from app.core.email import send_password_reset_email

    user_row = await db.fetchrow(
        "SELECT id, name, email FROM tenant_users WHERE LOWER(email) = LOWER($1) AND is_active = TRUE",
        email,
    )

    if not user_row:
        return ForgotPasswordResponse(
            success=True,
            message="If an account with that email exists, password reset instructions have been sent to your inbox.",
        )

    user_id = str(user_row["id"])
    user_name = user_row["name"]
    user_email = user_row["email"]
    reset_token = create_reset_password_token(user_id, user_email)
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    # Dispatch Email (Live SMTP if configured, or console simulation fallback)
    sent_live = await send_password_reset_email(user_email, reset_link, user_name)

    msg = (
        f"Password reset instructions have been sent to {user_email}. Please check your inbox/spam folder."
        if sent_live
        else f"Password reset link generated for {user_email}."
    )

    return ForgotPasswordResponse(
        success=True,
        message=msg,
        reset_token=reset_token,
        reset_link=reset_link,
    )


# ─────────────────────────────────────────────────────────────────
#  6. RESET PASSWORD
# ─────────────────────────────────────────────────────────────────

async def reset_password(db: asyncpg.Connection, token: str, new_password: str) -> MessageResponse:
    """
    Verify reset token and update user password.
    """
    from jose import JWTError
    from app.core.security import decode_reset_password_token

    try:
        payload = decode_reset_password_token(token)
    except JWTError as exc:
        raise AuthenticationError("Invalid, expired, or tampered password reset token.")

    user_id = payload["sub"]
    hashed_pw = await hash_password(new_password)

    # Verify user exists
    user_row = await db.fetchrow(
        "SELECT id FROM tenant_users WHERE id = $1 AND is_active = TRUE", user_id
    )
    if not user_row:
        raise NotFoundError("User account not found or inactive")

    # Update password
    await db.execute(
        "UPDATE tenant_users SET password_hash = $1 WHERE id = $2",
        hashed_pw,
        user_id,
    )

    logger.info("🔐 Password reset successful for user_id=%s", user_id)
    return MessageResponse(
        success=True,
        message="Password reset successfully! You can now log in with your new password.",
    )

