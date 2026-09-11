"""
models/dashboard.py
───────────────────
Pydantic schemas for Super Admin Telemetry, Organization Growth,
Revenue Analytics, System Health Alerts & Platform Activity.
"""

from typing import List, Literal
from pydantic import BaseModel, Field


class KpiMetrics(BaseModel):
    total_organizations: int = Field(128, description="Total registered tenant organizations")
    org_growth_percentage: str = Field("+12.4%", description="Organization growth vs last month")
    total_employees: int = Field(12450, description="Total active employees across all tenants")
    emp_growth_percentage: str = Field("+8.1%", description="Employee count growth")
    active_subscriptions: int = Field(106, description="Total active paid subscriptions")
    compliance_rate: str = Field("98.4%", description="Compliance / active plan rate")
    mrr_revenue: float = Field(482000.0, description="Monthly Recurring Revenue in INR")
    mrr_formatted: str = Field("₹4.82L", description="Formatted MRR string")
    mrr_growth_percentage: str = Field("+18.4%", description="MRR growth vs last month")


class OrganizationGrowthSeries(BaseModel):
    months: List[str] = Field(
        default=["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
        description="X-axis labels for monthly trend"
    )
    new_orgs: List[int] = Field(
        default=[8, 12, 10, 15, 14, 18, 22, 20, 25, 28, 30, 34],
        description="New organizations onboarded per month"
    )
    active_orgs: List[int] = Field(
        default=[45, 52, 58, 67, 75, 84, 92, 100, 108, 114, 122, 128],
        description="Total active organizations per month"
    )
    churned_orgs: List[int] = Field(
        default=[1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 2],
        description="Churned or cancelled organizations per month"
    )


class RevenueOverviewSeries(BaseModel):
    months: List[str] = Field(
        default=["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
        description="X-axis labels for revenue trend"
    )
    recurring_mrr: List[float] = Field(
        default=[3.2, 3.8, 4.1, 4.4, 4.6, 4.82],
        description="MRR breakdown in Lakhs (₹)"
    )
    recurring_mrr_formatted: str = Field("₹4.82L / mo", description="Current MRR formatted")
    add_on_services_formatted: str = Field("₹1.20L / mo", description="Add-on services MRR")
    arpa_formatted: str = Field("₹4,540 / mo", description="Average Revenue Per Account")


class SystemAlertItem(BaseModel):
    id: str
    severity: Literal["critical", "warning", "healthy"]
    title: str
    subtitle: str
    badge_label: str


class PlatformActivityItem(BaseModel):
    id: str
    timestamp: str
    action: str
    badge: str
    color: str = "#2563eb"


class SuperAdminDashboardResponse(BaseModel):
    success: bool = True
    kpis: KpiMetrics
    organization_growth: OrganizationGrowthSeries
    revenue_overview: RevenueOverviewSeries
    system_health_alerts: List[SystemAlertItem]
    recent_activity: List[PlatformActivityItem]
