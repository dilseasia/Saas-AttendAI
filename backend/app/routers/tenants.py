"""
routers/tenants.py
──────────────────
Tenant API endpoints for company configuration, branding, dynamic employee ID prefix/digits,
and tenant user management (HR, Admin, Viewer).

Prefix: /api/v1/tenants
Tag: Tenant Management
"""

import asyncpg
from fastapi import APIRouter, Depends, status

from app.core.database import get_db
from app.core.dependencies import AuthUser, AdminUser
from app.models.tenant import (
    TenantSettingsUpdate,
    TenantDetailResponse,
    CreateTenantUserRequest,
    UpdateTenantUserStatusRequest,
    TenantUserInfo,
    TenantUserListResponse,
)
from app.models.auth import MessageResponse
from app.services import tenant_service

router = APIRouter(prefix="/tenants", tags=["Tenant Management"])


# ── GET /tenants/me ───────────────────────────────────────────────
@router.get(
    "/me",
    response_model=TenantDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current tenant settings & config",
)
async def get_tenant_details(
    user: AuthUser,
    db: asyncpg.Connection = Depends(get_db),
) -> TenantDetailResponse:
    return await tenant_service.get_tenant_details(db, user.tenant_id)


# ── PATCH /tenants/me ──────────────────────────────────────────────
@router.patch(
    "/me",
    response_model=TenantDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Update tenant settings (Branding, Timezone, Emp ID Prefix/Digits)",
)
async def update_tenant_settings(
    payload: TenantSettingsUpdate,
    user: AdminUser,
    db: asyncpg.Connection = Depends(get_db),
) -> TenantDetailResponse:
    return await tenant_service.update_tenant_settings(db, user.tenant_id, payload)


# ── GET /tenants/next-emp-id ──────────────────────────────────────
@router.get(
    "/next-emp-id",
    status_code=status.HTTP_200_OK,
    summary="Get next auto-formatted Employee ID for tenant",
)
async def get_next_emp_id(
    user: AuthUser,
    db: asyncpg.Connection = Depends(get_db),
):
    next_emp_id = await tenant_service.generate_next_emp_id(db, user.tenant_id)
    return {"success": True, "next_emp_id": next_emp_id}


# ── GET /tenants/users ────────────────────────────────────────────
@router.get(
    "/users",
    response_model=TenantUserListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all users for current tenant",
)
async def get_tenant_users(
    user: AdminUser,
    db: asyncpg.Connection = Depends(get_db),
) -> TenantUserListResponse:
    return await tenant_service.get_tenant_users(db, user.tenant_id)


# ── POST /tenants/users ───────────────────────────────────────────
@router.post(
    "/users",
    response_model=TenantUserInfo,
    status_code=status.HTTP_201_CREATED,
    summary="Add new user to tenant (Admin / HR / Viewer)",
)
async def create_tenant_user(
    payload: CreateTenantUserRequest,
    user: AdminUser,
    db: asyncpg.Connection = Depends(get_db),
) -> TenantUserInfo:
    return await tenant_service.create_tenant_user(db, user.tenant_id, payload)


# ── PATCH /tenants/users/{user_id}/status ─────────────────────────
@router.patch(
    "/users/{user_id}/status",
    response_model=TenantUserInfo,
    status_code=status.HTTP_200_OK,
    summary="Activate or Deactivate a tenant user",
)
async def update_tenant_user_status(
    user_id: str,
    payload: UpdateTenantUserStatusRequest,
    user: AdminUser,
    db: asyncpg.Connection = Depends(get_db),
) -> TenantUserInfo:
    return await tenant_service.update_tenant_user_status(db, user.tenant_id, user_id, payload.is_active)


# ── DELETE /tenants/users/{user_id} ───────────────────────────────
@router.delete(
    "/users/{user_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove user from tenant",
)
async def delete_tenant_user(
    user_id: str,
    user: AdminUser,
    db: asyncpg.Connection = Depends(get_db),
) -> MessageResponse:
    await tenant_service.delete_tenant_user(db, user.tenant_id, user_id)
    return MessageResponse(success=True, message="User removed successfully")
