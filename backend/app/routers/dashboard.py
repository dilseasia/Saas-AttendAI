
"""
routers/dashboard.py

Super Admin Dashboard and Company Admin Dashboard APIs.

Prefix: /api/v1/dashboard
Tag: Dashboard
"""

from datetime import date
from typing import List

import asyncpg
from fastapi import APIRouter, Depends, Query, status

from app.core.database import get_db
from app.core.dependencies import AuthUser

from app.models.dashboard import (
    SuperAdminDashboardResponse,
    KpiMetrics,
    OrganizationGrowthSeries,
    RevenueOverviewSeries,
    SystemAlertItem,
    PlatformActivityItem,
)

from app.services.dashboard_service import DashboardService
from app.services.admin_dashboard_service import AdminDashboardService


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ============================================================
# SUPER ADMIN DASHBOARD - EXISTING ENDPOINTS
# ============================================================

@router.get(
    "/stats",
    response_model=SuperAdminDashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Super Admin Full Telemetry Dashboard Data",
)
async def get_dashboard_stats(
    db: asyncpg.Connection = Depends(get_db),
) -> SuperAdminDashboardResponse:
    return await DashboardService.get_full_dashboard(db)


@router.get(
    "/kpis",
    response_model=KpiMetrics,
    status_code=status.HTTP_200_OK,
    summary="Get Platform Executive KPIs",
)
async def get_kpis(
    db: asyncpg.Connection = Depends(get_db),
) -> KpiMetrics:
    return await DashboardService.get_kpis(db)


@router.get(
    "/growth",
    response_model=OrganizationGrowthSeries,
    status_code=status.HTTP_200_OK,
    summary="Get Organization Growth Trends",
)
async def get_organization_growth(
    db: asyncpg.Connection = Depends(get_db),
) -> OrganizationGrowthSeries:
    return await DashboardService.get_organization_growth(db)


@router.get(
    "/revenue",
    response_model=RevenueOverviewSeries,
    status_code=status.HTTP_200_OK,
    summary="Get Revenue Overview",
)
async def get_revenue_overview(
    db: asyncpg.Connection = Depends(get_db),
) -> RevenueOverviewSeries:
    return await DashboardService.get_revenue_overview(db)


@router.get(
    "/alerts",
    response_model=List[SystemAlertItem],
    status_code=status.HTTP_200_OK,
    summary="Get System Health Alerts",
)
async def get_system_alerts(
    db: asyncpg.Connection = Depends(get_db),
) -> List[SystemAlertItem]:
    return await DashboardService.get_system_health_alerts(db)


@router.get(
    "/activity",
    response_model=List[PlatformActivityItem],
    status_code=status.HTTP_200_OK,
    summary="Get Recent Platform Activity",
)
async def get_recent_activity(
    db: asyncpg.Connection = Depends(get_db),
) -> List[PlatformActivityItem]:
    return await DashboardService.get_recent_activity(db)


# ============================================================
# COMPANY ADMIN DASHBOARD - NEW ENDPOINTS
# ============================================================

@router.get(
    "/admin/stats",
    status_code=status.HTTP_200_OK,
    summary="Get Company Admin Dashboard Summary",
)
async def get_admin_dashboard_stats(
    user: AuthUser,
    db: asyncpg.Connection = Depends(get_db),
    target_date: date = Query(
        default_factory=date.today,
        alias="date",
        description="Date for attendance metrics (YYYY-MM-DD)",
    ),
):
    """Return attendance summary cards for the authenticated company."""

    if not user.tenant_id:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No company is associated with this user.",
        )

    return await AdminDashboardService.get_stats(
        db=db,
        tenant_id=user.tenant_id,
        target_date=target_date,
    )


@router.get(
    "/admin/monthly-attendance",
    status_code=status.HTTP_200_OK,
    summary="Get Company Monthly Attendance",
)
async def get_admin_monthly_attendance(
    user: AuthUser,
    db: asyncpg.Connection = Depends(get_db),
    year: int = Query(
        default_factory=lambda: date.today().year,
        ge=2000,
        le=2100,
    ),
    month: int = Query(
        default_factory=lambda: date.today().month,
        ge=1,
        le=12,
    ),
):
    """Return daily attendance counts for a selected month."""

    if not user.tenant_id:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No company is associated with this user.",
        )

    return await AdminDashboardService.get_monthly_attendance(
        db=db,
        tenant_id=user.tenant_id,
        year=year,
        month=month,
    )


@router.get(
    "/admin/activity-hours",
    status_code=status.HTTP_200_OK,
    summary="Get Company Activity Hours",
)
async def get_admin_activity_hours(
    user: AuthUser,
    db: asyncpg.Connection = Depends(get_db),
    target_date: date = Query(
        default_factory=date.today,
        alias="date",
        description="Date for hourly activity metrics (YYYY-MM-DD)",
    ),
):
    """Return hourly entry and exit event counts for the company."""

    if not user.tenant_id:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No company is associated with this user.",
        )

    return await AdminDashboardService.get_activity_hours(
        db=db,
        tenant_id=user.tenant_id,
        target_date=target_date,
    )
