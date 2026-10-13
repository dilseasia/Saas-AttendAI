"""
routers/billing.py
──────────────────
Billing & Stripe Subscription API endpoints.

Endpoints:
  GET  /api/v1/billing/plans                    → Get list of subscription packages
  POST /api/v1/billing/create-checkout-session  → Create Stripe Checkout session
  GET  /api/v1/billing/subscription             → Current subscription & plan status
  POST /api/v1/billing/webhook                  → Stripe webhook listener
"""

import asyncpg
from fastapi import APIRouter, Depends, Request, status, HTTPException
import stripe

from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import AuthUser
from app.models.billing import (
    PlansResponse,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    SubscriptionStatusResponse,
    CompanyBillingListResponse,
    DashboardStatsResponse,
    SuperAdminEmployeeListResponse,
    SuperAdminEmployeeItem,
    SuperAdminCreateEmployeeRequest,
    AdminUpdateCompanyPlanRequest,
)
from app.services import billing_service

router = APIRouter(prefix="/billing", tags=["Billing & Payments"])

settings = get_settings()


# ── GET /billing/companies ─────────────────────────────────────────
@router.get(
    "/companies",
    response_model=CompanyBillingListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Billing Dashboard for All Registered Companies",
    description="Returns all registered companies with their plan, pricing, renewal date, and billing status.",
)
async def get_companies_billing(
    db: asyncpg.Connection = Depends(get_db),
) -> CompanyBillingListResponse:
    return await billing_service.get_all_companies_billing(db)


# ── GET /billing/dashboard-stats ───────────────────────────────────
@router.get(
    "/dashboard-stats",
    response_model=DashboardStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Super Admin Dashboard Platform Analytics",
    description="Returns real-time MRR, ARR, tenant counts, monthly revenue curves, peak check-in waves, and subscription distribution.",
)
async def get_dashboard_stats(
    db: asyncpg.Connection = Depends(get_db),
) -> DashboardStatsResponse:
    return await billing_service.get_dashboard_stats(db)


# ── GET /billing/plans ─────────────────────────────────────────────
@router.get(
    "/plans",
    response_model=PlansResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Subscription Packages",
    description="Returns the 3 available SaaS pricing tiers (Starter, Pro, Enterprise) along with 14-day trial details.",
)
async def get_plans() -> PlansResponse:
    return billing_service.get_plans()


# ── POST /billing/create-checkout-session ─────────────────────────
@router.post(
    "/create-checkout-session",
    response_model=CheckoutSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Create Stripe Checkout Session",
    description="Generates a Stripe Checkout session link for upgrading the tenant plan.",
)
async def create_checkout_session(
    payload: CheckoutSessionRequest,
    user: AuthUser,
    db: asyncpg.Connection = Depends(get_db),
) -> CheckoutSessionResponse:
    is_super = user.role == "super_admin" or user.email == "admin@seasia.com"
    target_tenant_id = (payload.tenant_id if is_super and payload.tenant_id else user.tenant_id) or payload.tenant_id
    if not target_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A target tenant_id must be provided to upgrade the subscription plan.",
        )
    return await billing_service.create_checkout_session(db, target_tenant_id, payload)


# ── POST /billing/admin-update-plan ───────────────────────────────
@router.post(
    "/admin-update-plan",
    status_code=status.HTTP_200_OK,
    summary="Directly update tenant plan as Super Admin",
    description="Allows Super Admin to directly update any company's subscription plan without Stripe checkout.",
)
async def admin_update_company_plan(
    payload: AdminUpdateCompanyPlanRequest,
    user: AuthUser,
    db: asyncpg.Connection = Depends(get_db),
):
    if user.role != "super_admin" and user.email != "admin@seasia.com":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can directly update company plans.",
        )
    return await billing_service.update_tenant_plan_direct(db, payload.tenant_id, payload.plan_id)


# ── GET /billing/subscription ─────────────────────────────────────
@router.get(
    "/subscription",
    response_model=SubscriptionStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Current Subscription Status",
    description="Returns current active plan, trial expiry date, max employees, and camera limits.",
)
async def get_subscription(
    user: AuthUser,
    db: asyncpg.Connection = Depends(get_db),
) -> SubscriptionStatusResponse:
    return await billing_service.get_subscription_status(db, user.tenant_id)


# ── POST /billing/webhook ─────────────────────────────────────────
@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
    summary="Stripe Webhook Listener",
    description="Handles async subscription events from Stripe (e.g. checkout completed, subscription updated).",
)
async def stripe_webhook(
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
):
    payload_body = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if settings.STRIPE_WEBHOOK_SECRET and sig_header:
        try:
            event = stripe.Webhook.construct_event(
                payload_body, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Webhook Error: {str(e)}")
    else:
        event = await request.json()

    event_type = event.get("type") if isinstance(event, dict) else event.type
    event_data = event.get("data", {}).get("object") if isinstance(event, dict) else event.data.object

    if event_type == "checkout.session.completed":
        metadata = event_data.get("metadata", {})
        tenant_id = metadata.get("tenant_id")
        plan_id = metadata.get("plan_id")
        max_employees = int(metadata.get("max_employees", 25))
        max_cameras = int(metadata.get("max_cameras", 2))

        if tenant_id and plan_id:
            await db.execute(
                """
                UPDATE subscriptions
                SET plan = $1, status = 'active', current_period_end = NOW() + INTERVAL '30 days', updated_at = NOW()
                WHERE tenant_id = $2
                """,
                plan_id,
                tenant_id,
            )
            await db.execute(
                """
                UPDATE tenants
                SET plan = $1, max_employees = $2, max_cameras = $3, updated_at = NOW()
                WHERE id = $4
                """,
                plan_id,
                max_employees,
                max_cameras,
                tenant_id,
            )

    return {"status": "success"}


# ── GET /billing/superadmin/employees ──────────────────────────────
@router.get(
    "/superadmin/employees",
    response_model=SuperAdminEmployeeListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get All Platform Employees for Super Admin",
    description="Returns employees across all tenant companies or filtered by domain slug.",
)
async def get_superadmin_employees(
    company_slug: str | None = None,
    db: asyncpg.Connection = Depends(get_db),
) -> SuperAdminEmployeeListResponse:
    return await billing_service.get_superadmin_employees(db, company_slug=company_slug)


# ── POST /billing/superadmin/employees ─────────────────────────────
@router.post(
    "/superadmin/employees",
    response_model=SuperAdminEmployeeItem,
    status_code=status.HTTP_201_CREATED,
    summary="Create Employee for Target Company Slug",
    description="Allows Super Admin to create an employee directly under a target company specified by domain slug.",
)
async def create_superadmin_employee(
    payload: SuperAdminCreateEmployeeRequest,
    db: asyncpg.Connection = Depends(get_db),
) -> SuperAdminEmployeeItem:
    return await billing_service.create_superadmin_employee(db, payload=payload)

