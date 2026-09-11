"""
models/auth.py
──────────────
Pydantic request & response schemas for the Auth module.
All inputs are validated and sanitized before hitting the service layer.
"""

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


# ─────────────────────────────────────────────────────────────────
#  REQUEST SCHEMAS
# ─────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="Account password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class RegisterRequest(BaseModel):
    # ── Company info ──────────────────────────────────────────────
    company_name: str = Field(..., min_length=2, max_length=255, description="Full company name")
    company_email: str = Field(..., description="Primary company email")
    company_phone: str | None = Field(None, max_length=20)
    timezone: str = Field("Asia/Kolkata", description="Company timezone")
    selected_plan: str = Field("pro", description="Selected plan: starter, pro, or enterprise")

    # ── Admin account ─────────────────────────────────────────────
    admin_name: str = Field(..., min_length=2, max_length=255, description="Admin full name")
    password: str = Field(..., min_length=8, description="Min 8 characters")
    confirm_password: str = Field(..., min_length=8)

    @field_validator("company_email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Invalid email address")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., description="Valid refresh token")


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @model_validator(mode="after")
    def passwords_match(self) -> "ChangePasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("New passwords do not match")
        return self


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., description="Registered email address")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password")
    confirm_password: str = Field(..., min_length=8, description="Confirm new password")

    @model_validator(mode="after")
    def passwords_match(self) -> "ResetPasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


# ─────────────────────────────────────────────────────────────────
#  RESPONSE SCHEMAS
# ─────────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TenantInfo(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    status: str
    trial_ends_at: datetime | None = None
    max_employees: int
    max_cameras: int
    timezone: str


class UserInfo(BaseModel):
    id: str
    name: str
    email: str
    role: Literal["super_admin", "admin", "hr", "viewer"]
    tenant_id: str
    last_login: datetime | None = None
    created_at: datetime


class LoginResponse(BaseModel):
    success: bool = True
    message: str = "Login successful"
    tokens: TokenResponse
    user: UserInfo
    tenant: TenantInfo


class RegisterResponse(BaseModel):
    success: bool = True
    message: str = "Company registered successfully! Your 14-day trial has started. 🎉"
    tokens: TokenResponse
    user: UserInfo
    tenant: TenantInfo


class MeResponse(BaseModel):
    success: bool = True
    user: UserInfo
    tenant: TenantInfo


class RefreshResponse(BaseModel):
    success: bool = True
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class MessageResponse(BaseModel):
    success: bool
    message: str


class ForgotPasswordResponse(BaseModel):
    success: bool = True
    message: str
    reset_token: str | None = None
    reset_link: str | None = None

