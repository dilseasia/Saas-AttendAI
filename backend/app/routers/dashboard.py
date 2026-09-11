"""
routers/dashboard.py
────────────────────
FastAPI router for Super Admin Telemetry, Executive Dashboard Metrics,
Organization Growth, Revenue Overview, Diagnostics & Recent Activity.

Prefix: /api/v1/dashboard
Tag: Dashboard
"""

from typing import List
import asyncpg
from fastapi import APIRouter, Depends, status

from app.core.database import get_db
from app.models.dashboard import (
    SuperAdminDashboardResponse,
    KpiMetrics,
    OrganizationGrowthSeries,
    RevenueOverviewSeries,
    SystemAlertItem,
    PlatformActivityItem,
)
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/stats",
    response_model=SuperAdminDashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Super Admin Full Telemetry Dashboard Data",
    description=(
        "Returns executive KPIs (Organizations, Employees, Subscriptions, MRR), "
        "multi-series organization growth breakdown (New, Active, Churned), "
        "revenue overview, system diagnostics alerts, and recent audit activity feed."
    ),
)
async def get_dashboard_stats(
    db: asyncpg.Connection = Depends(get_db)
) -> SuperAdminDashboardResponse:
    """Fetch complete telemetry data for the Super Admin control center directly from PostgreSQL."""
    return await DashboardService.get_full_dashboard(db)


@router.get(
    "/kpis",
    response_model=KpiMetrics,
    status_code=status.HTTP_200_OK,
    summary="Get Platform Executive KPIs",
)
async def get_kpis(
    db: asyncpg.Connection = Depends(get_db)
) -> KpiMetrics:
    """Fetch platform high-level KPIs."""
    return await DashboardService.get_kpis(db)


@router.get(
    "/growth",
    response_model=OrganizationGrowthSeries,
    status_code=status.HTTP_200_OK,
    summary="Get Multi-Series Organization Growth Trends",
)
async def get_organization_growth(
    db: asyncpg.Connection = Depends(get_db)
) -> OrganizationGrowthSeries:
    """Fetch 12-month multi-series organization growth data (New, Active, Churned)."""
    return await DashboardService.get_organization_growth(db)


@router.get(
    "/revenue",
    response_model=RevenueOverviewSeries,
    status_code=status.HTTP_200_OK,
    summary="Get Revenue Overview & Breakdown",
)
async def get_revenue_overview(
    db: asyncpg.Connection = Depends(get_db)
) -> RevenueOverviewSeries:
    """Fetch revenue overview analytics and financial breakdown."""
    return await DashboardService.get_revenue_overview(db)


@router.get(
    "/alerts",
    response_model=List[SystemAlertItem],
    status_code=status.HTTP_200_OK,
    summary="Get System Diagnostics & Hardware Alerts",
)
async def get_system_alerts(
    db: asyncpg.Connection = Depends(get_db)
) -> List[SystemAlertItem]:
    """Fetch real-time diagnostic health alerts (cameras, licenses, subscriptions, payments)."""
    return await DashboardService.get_system_health_alerts(db)


@router.get(
    "/activity",
    response_model=List[PlatformActivityItem],
    status_code=status.HTTP_200_OK,
    summary="Get Recent Audit Activity Feed",
)
async def get_recent_activity(
    db: asyncpg.Connection = Depends(get_db)
) -> List[PlatformActivityItem]:
    """Fetch real-time audit feed of recent platform activities."""
    return await DashboardService.get_recent_activity(db)
