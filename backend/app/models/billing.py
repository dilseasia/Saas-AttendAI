"""
models/billing.py
──────────────────
Pydantic schemas for SaaS Subscription plans, Stripe Checkout Sessions, and Billing status.
"""

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class PlanItem(BaseModel):
    id: str
    name: str
    price_usd: int
    price_inr: int
    interval: str = "month"
    max_employees: int
    max_cameras: int
    trial_days: int = 14
    popular: bool = False
    features: list[str]


class PlansResponse(BaseModel):
    success: bool = True
    plans: list[PlanItem]


class CheckoutSessionRequest(BaseModel):
    plan_id: str = Field(..., description="Target plan ID: 'starter', 'pro', or 'enterprise'")
    tenant_id: str | None = Field(None, description="Optional tenant_id (for Super Admin upgrading a company)")
    success_url: str | None = None
    cancel_url: str | None = None


class AdminUpdateCompanyPlanRequest(BaseModel):
    tenant_id: str = Field(..., description="Target company tenant ID to update")
    plan_id: str = Field(..., description="Target plan ID: 'starter', 'pro', or 'enterprise'")


class CheckoutSessionResponse(BaseModel):
    success: bool = True
    checkout_url: str
    session_id: str


class SubscriptionStatusResponse(BaseModel):
    success: bool = True
    tenant_id: str
    plan: str
    status: Literal["trialing", "active", "past_due", "canceled", "incomplete"]
    trial_ends_at: datetime | None = None
    current_period_end: datetime | None = None
    max_employees: int
    max_cameras: int


class CompanyBillingItem(BaseModel):
    id: str
    name: str
    slug: str
    email: str
    phone: str | None = None
    plan: str
    plan_name: str
    status: str
    price_usd: int
    price_inr: int
    interval: str = "month"
    max_employees: int
    max_cameras: int
    total_employees: int = 0
    total_cameras: int = 0
    created_at: datetime | None = None
    trial_ends_at: datetime | None = None
    current_period_end: datetime | None = None
    last_login: datetime | None = None
    invoice_number: str | None = None


class CompanyBillingListResponse(BaseModel):
    success: bool = True
    total_companies: int
    total_mrr_usd: int
    total_mrr_inr: int
    active_subscriptions: int
    trialing_subscriptions: int
    companies: list[CompanyBillingItem]


# ── Super Admin Dashboard Analytics Models ──────────────────────────
class MonthlyGrowthPoint(BaseModel):
    month: str
    val: int


class HourlyCheckinPoint(BaseModel):
    hour: str
    val: int


class PlanDistributionItem(BaseModel):
    name: str
    count: int
    percent: int
    color: str


class OperationalMetricItem(BaseModel):
    icon: str
    title: str
    sub: str
    val: str
    change: str
    color: str


class DashboardStatsResponse(BaseModel):
    success: bool = True
    total_arr_usd: float
    total_mrr_usd: float
    mrr_growth_percent: float
    total_tenants: int
    active_tenants: int
    total_employees: int
    total_cameras: int
    camera_latency: str
    monthly_growth: list[MonthlyGrowthPoint]
    quarterly_growth: list[MonthlyGrowthPoint]
    yearly_growth: list[MonthlyGrowthPoint]
    hourly_checkins: list[HourlyCheckinPoint]
    plan_distribution: list[PlanDistributionItem]
    operational_metrics: list[OperationalMetricItem]


# ── Super Admin Employee Management Schemas ──────────────────────────
class SuperAdminEmployeeItem(BaseModel):
    id: int
    tenant_id: str
    company_name: str
    company_slug: str
    emp_id: str
    name: str
    department: str | None = None
    designation: str | None = None
    email: str | None = None
    phone: str | None = None
    face_enrolled: bool = False
    photo_url: str | None = None
    joining_date: datetime | str | None = None
    is_active: bool = True


class SuperAdminEmployeeListResponse(BaseModel):
    success: bool = True
    total_employees: int
    total_enrolled: int
    employees: list[SuperAdminEmployeeItem]


class SuperAdminCreateEmployeeRequest(BaseModel):
    company_slug: str
    name: str
    emp_id: str | None = None
    department: str | None = None
    designation: str | None = None
    email: str | None = None
    phone: str | None = None

