"""
models/tenant.py
────────────────
Pydantic request and response schemas for Tenant Settings & Tenant User Management.
"""

from datetime import datetime
from typing import Literal, List, Optional
from pydantic import BaseModel, Field, field_validator


class TenantSettingsUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255, description="Company display name")
    phone: Optional[str] = Field(None, max_length=20)
    logo_url: Optional[str] = Field(None, description="URL or base64 of company logo")
    timezone: Optional[str] = Field(None, description="Company timezone, e.g. Asia/Kolkata")
    emp_id_prefix: Optional[str] = Field(None, min_length=1, max_length=10, description="Employee ID Prefix (e.g. EMP, SEA, DLA)")
    emp_id_digits: Optional[int] = Field(None, ge=3, le=8, description="Employee ID Digits count (e.g. 4 for EMP0001)")

    @field_validator("emp_id_prefix")
    @classmethod
    def upper_prefix(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.strip().upper()
        return v


class TenantDetail(BaseModel):
    id: str
    name: str
    slug: str
    email: str
    phone: Optional[str] = None
    logo_url: Optional[str] = None
    timezone: str = "Asia/Kolkata"
    emp_id_prefix: str = "EMP"
    emp_id_digits: int = 4
    plan: str
    status: str
    max_employees: int
    max_cameras: int
    trial_ends_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class TenantDetailResponse(BaseModel):
    success: bool = True
    tenant: TenantDetail


class CreateTenantUserRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., description="User login email")
    password: str = Field(..., min_length=8)
    role: Literal["admin", "hr", "viewer"] = Field("hr", description="User role")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UpdateTenantUserStatusRequest(BaseModel):
    is_active: bool


class TenantUserInfo(BaseModel):
    id: str
    tenant_id: str
    name: str
    email: str
    role: Literal["super_admin", "admin", "hr", "viewer"]
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime


class TenantUserListResponse(BaseModel):
    success: bool = True
    users: List[TenantUserInfo]
