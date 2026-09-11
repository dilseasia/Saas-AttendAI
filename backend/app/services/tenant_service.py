"""
services/tenant_service.py
───────────────────────────
Business logic for tenant settings, dynamic employee ID format generation,
and managing secondary tenant users (HR, Viewer, Admin).
"""

import logging
import asyncpg
from typing import List

from app.core.exceptions import ConflictError, NotFoundError, AuthorizationError
from app.core.security import hash_password
from app.models.tenant import (
    TenantSettingsUpdate,
    TenantDetail,
    TenantDetailResponse,
    CreateTenantUserRequest,
    TenantUserInfo,
    TenantUserListResponse,
)

logger = logging.getLogger(__name__)


def _build_tenant_detail(row: asyncpg.Record) -> TenantDetail:
    return TenantDetail(
        id=str(row["id"]),
        name=row["name"],
        slug=row["slug"],
        email=row["email"],
        phone=row["phone"],
        logo_url=row["logo_url"],
        timezone=row["timezone"] or "Asia/Kolkata",
        emp_id_prefix=row["emp_id_prefix"] or "EMP",
        emp_id_digits=row["emp_id_digits"] or 4,
        plan=row["plan"],
        status=row["status"],
        max_employees=row["max_employees"],
        max_cameras=row["max_cameras"],
        trial_ends_at=row["trial_ends_at"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _build_user_info(row: asyncpg.Record) -> TenantUserInfo:
    return TenantUserInfo(
        id=str(row["id"]),
        tenant_id=str(row["tenant_id"]),
        name=row["name"],
        email=row["email"],
        role=row["role"],
        is_active=row["is_active"],
        last_login=row["last_login"],
        created_at=row["created_at"],
    )


# ── GET TENANT DETAILS ──────────────────────────────────────────────
async def get_tenant_details(db: asyncpg.Connection, tenant_id: str) -> TenantDetailResponse:
    row = await db.fetchrow(
        """
        SELECT
            id, name, slug, email, phone, logo_url, timezone,
            emp_id_prefix, emp_id_digits, plan, status,
            max_employees, max_cameras, trial_ends_at,
            created_at, updated_at
        FROM tenants
        WHERE id = $1
        """,
        tenant_id,
    )
    if not row:
        raise NotFoundError("Tenant")

    return TenantDetailResponse(tenant=_build_tenant_detail(row))


# ── UPDATE TENANT SETTINGS ──────────────────────────────────────────
async def update_tenant_settings(
    db: asyncpg.Connection, tenant_id: str, payload: TenantSettingsUpdate
) -> TenantDetailResponse:
    row = await db.fetchrow("SELECT * FROM tenants WHERE id = $1", tenant_id)
    if not row:
        raise NotFoundError("Tenant")

    name = payload.name if payload.name is not None else row["name"]
    phone = payload.phone if payload.phone is not None else row["phone"]
    logo_url = payload.logo_url if payload.logo_url is not None else row["logo_url"]
    timezone = payload.timezone if payload.timezone is not None else row["timezone"]
    prefix = payload.emp_id_prefix if payload.emp_id_prefix is not None else row["emp_id_prefix"]
    digits = payload.emp_id_digits if payload.emp_id_digits is not None else row["emp_id_digits"]

    updated_row = await db.fetchrow(
        """
        UPDATE tenants
        SET
            name = $1,
            phone = $2,
            logo_url = $3,
            timezone = $4,
            emp_id_prefix = $5,
            emp_id_digits = $6,
            updated_at = NOW()
        WHERE id = $7
        RETURNING
            id, name, slug, email, phone, logo_url, timezone,
            emp_id_prefix, emp_id_digits, plan, status,
            max_employees, max_cameras, trial_ends_at,
            created_at, updated_at
        """,
        name,
        phone,
        logo_url,
        timezone,
        prefix,
        digits,
        tenant_id,
    )

    logger.info("⚙️ Tenant settings updated for tenant_id=%s (Prefix=%s, Digits=%d)", tenant_id, prefix, digits)
    return TenantDetailResponse(tenant=_build_tenant_detail(updated_row))


# ── GENERATE NEXT DYNAMIC EMP ID ─────────────────────────────────────
async def generate_next_emp_id(db: asyncpg.Connection, tenant_id: str) -> str:
    """
    Auto-formats the next available employee ID based on tenant configuration.
    e.g. prefix="SEA", digits=4 → "SEA0001", "SEA0002"
    """
    tenant_row = await db.fetchrow(
        "SELECT emp_id_prefix, emp_id_digits FROM tenants WHERE id = $1", tenant_id
    )
    prefix = tenant_row["emp_id_prefix"] if tenant_row and tenant_row["emp_id_prefix"] else "EMP"
    digits = tenant_row["emp_id_digits"] if tenant_row and tenant_row["emp_id_digits"] else 4

    # Count current employees to determine sequence index
    count = await db.fetchval("SELECT COUNT(*) FROM employees WHERE tenant_id = $1", tenant_id)
    next_num = count + 1

    formatted_id = f"{prefix}{str(next_num).zfill(digits)}"

    # Ensure uniqueness if manual IDs exist
    while await db.fetchval("SELECT id FROM employees WHERE tenant_id = $1 AND emp_id = $2", tenant_id, formatted_id):
        next_num += 1
        formatted_id = f"{prefix}{str(next_num).zfill(digits)}"

    return formatted_id


# ── TENANT USERS MANAGEMENT ──────────────────────────────────────────
async def get_tenant_users(db: asyncpg.Connection, tenant_id: str) -> TenantUserListResponse:
    rows = await db.fetch(
        """
        SELECT id, tenant_id, name, email, role, is_active, last_login, created_at
        FROM tenant_users
        WHERE tenant_id = $1
        ORDER BY created_at ASC
        """,
        tenant_id,
    )
    users = [_build_user_info(r) for r in rows]
    return TenantUserListResponse(users=users)


async def create_tenant_user(
    db: asyncpg.Connection, tenant_id: str, payload: CreateTenantUserRequest
) -> TenantUserInfo:
    existing = await db.fetchval("SELECT id FROM tenant_users WHERE email = $1", payload.email)
    if existing:
        raise ConflictError("An account with this email address already exists")

    hashed_pw = await hash_password(payload.password)

    row = await db.fetchrow(
        """
        INSERT INTO tenant_users (tenant_id, name, email, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, tenant_id, name, email, role, is_active, last_login, created_at
        """,
        tenant_id,
        payload.name,
        payload.email,
        hashed_pw,
        payload.role,
    )

    logger.info("👤 Created tenant user: %s (role=%s, tenant_id=%s)", payload.email, payload.role, tenant_id)
    return _build_user_info(row)


async def update_tenant_user_status(
    db: asyncpg.Connection, tenant_id: str, user_id: str, is_active: bool
) -> TenantUserInfo:
    row = await db.fetchrow(
        """
        UPDATE tenant_users
        SET is_active = $1
        WHERE id = $2 AND tenant_id = $3
        RETURNING id, tenant_id, name, email, role, is_active, last_login, created_at
        """,
        is_active,
        user_id,
        tenant_id,
    )
    if not row:
        raise NotFoundError("Tenant User")

    return _build_user_info(row)


async def delete_tenant_user(db: asyncpg.Connection, tenant_id: str, user_id: str) -> bool:
    # Cannot delete the primary admin if it's the last admin
    user_row = await db.fetchrow(
        "SELECT role FROM tenant_users WHERE id = $1 AND tenant_id = $2", user_id, tenant_id
    )
    if not user_row:
        raise NotFoundError("Tenant User")

    if user_row["role"] == "admin":
        admin_count = await db.fetchval(
            "SELECT COUNT(*) FROM tenant_users WHERE tenant_id = $1 AND role = 'admin'", tenant_id
        )
        if admin_count <= 1:
            raise AuthorizationError("Cannot delete the sole admin user of the company")

    result = await db.execute("DELETE FROM tenant_users WHERE id = $1 AND tenant_id = $2", user_id, tenant_id)
    return result.endswith("1")
