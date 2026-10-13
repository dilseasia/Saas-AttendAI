import React, { useState, useEffect, useRef } from 'react';
import {
  AuthResponse,
  fetchCompaniesBilling,
  CompanyBillingItem,
  fetchDashboardStats,
  DashboardStatsResponse,
  fetchSuperAdminDashboard
} from '../services/api';
import CompanyAdminDashboard from './CompanyAdminDashboard';
import { Sidebar, ActivePage } from './Sidebar';
import { BillingPage } from './BillingPage';
import { SuperAdminEmployeeManagement } from './SuperAdminEmployeeManagement';
import { CompanyDirectory } from './CompanyDirectory';
import { CameraEnginePage } from './CameraEnginePage';
import { AttendanceLogsPage } from './AttendanceLogsPage';
import { AnonymousLogsPage } from './AnonymousLogsPage';
import { ReportsPage } from './ReportsPage';
import { AttendanceRequestsPage } from './AttendanceRequestsPage';
import CompanyEmployeesPage from './CompanyEmployeesPage';

import {
  Users, Eye, X, Calendar, Clock, Camera, Search, Filter, Download,
  RefreshCw, CheckCircle, XCircle, AlertCircle, Building2, User,
  FileText, Shield, Video, Layers, Folder, ChevronRight, BarChart3, TrendingUp,
  Bell, Menu, ArrowUpRight, ArrowDownRight, Zap, Coins, Activity, Sparkles, CheckCircle2,
  AlertTriangle, AlertOctagon, CheckCircle as CheckIcon, ShieldCheck, CreditCard, Loader2,
  LogOut, ChevronDown
} from 'lucide-react';

// ── 1. Super Admin Overview Dashboard ────────────────────────────────
const SuperAdminOverview: React.FC<{
  authData: AuthResponse;
  go: (p: ActivePage) => void;
}> = ({ authData, go }) => {
  const [loading, setLoading] = useState(true);
  const [superData, setSuperData] = useState<any>(null);
  const [error, setError] = useState(false);

  const loadDashboard = () => {
    setLoading(true);
    setError(false);

    fetchSuperAdminDashboard()
      .then((res) => setSuperData(res))
      .catch((err) => {
        console.error("Failed to load super admin dashboard:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fb",
        }}
      >
        <div
          style={{
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #e8ecf3",
            borderRadius: 18,
            padding: "34px 44px",
            boxShadow: "0 12px 35px rgba(15, 23, 42, 0.06)",
          }}
        >
          <Loader2
            size={34}
            className="spin"
            color="#3B82F6"
            style={{ marginBottom: 12 }}
          />
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#182033",
            }}
          >
            Loading dashboard...
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#8b95a7",
              marginTop: 5,
            }}
          >
            Fetching platform analytics
          </div>
        </div>
      </div>
    );
  }

  if (error || !superData) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fb",
          padding: 30,
        }}
      >
        <div
          style={{
            maxWidth: 430,
            width: "100%",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #eceff5",
            borderRadius: 18,
            padding: 34,
            boxShadow: "0 12px 35px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              margin: "0 auto 14px",
              borderRadius: 14,
              background: "#fff1f2",
              color: "#e11d48",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertOctagon size={25} />
          </div>

          <div
            style={{
              fontSize: 17,
              fontWeight: 850,
              color: "#182033",
            }}
          >
            Failed to load dashboard
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#8b95a7",
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            Please check the API connection and try again.
          </div>

          <button
            onClick={loadDashboard}
            style={{
              marginTop: 18,
              border: 0,
              borderRadius: 9,
              padding: "10px 16px",
              background: "#3B82F6",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const kpis = superData.kpis || {};
  const revOverview = superData.revenue_overview || {
    months: [],
    recurring_mrr: [],
  };

  const systemAlerts = superData.system_health_alerts || [
    {
      title: "All RTSP Cameras Online",
      subtitle: "Video streams operating at 30 FPS",
      severity: "healthy",
      badge_label: "ONLINE",
    },
    {
      title: "Database Healthy",
      subtitle: "PostgreSQL Multi-Tenant DB operating optimal",
      severity: "healthy",
      badge_label: "STABLE",
    },
    {
      title: "API System Healthy",
      subtitle: "FastAPI backend operating normally",
      severity: "healthy",
      badge_label: "ONLINE",
    },
    {
      title: "System Load",
      subtitle: "CPU 42% | Memory 68% | Disk 71%",
      severity: "warning",
      badge_label: "NORMAL",
    },
  ];

  const recentActivities = superData.recent_activity || [
    {
      timestamp: "17:32",
      action: "webtunix registered on platform",
      badge: "ENTERPRISE",
      color: "#3B82F6",
    },
    {
      timestamp: "17:28",
      action: "sunrise registered on platform",
      badge: "ENTERPRISE",
      color: "#3B82F6",
    },
    {
      timestamp: "17:16",
      action: "Seasia infotech registered on platform",
      badge: "ENTERPRISE",
      color: "#3B82F6",
    },
    {
      timestamp: "16:52",
      action: "Camera 10.8.21.47 back online",
      badge: "SYSTEM",
      color: "#0f9f8f",
    },
  ];

  const attendanceData = [
    { label: "Present", val: 154, pct: "55%", color: "#3B82F6", bg: "#f0f0ff" },
    { label: "Absent", val: 42, pct: "15%", color: "#8FA5B6", bg: "#fff1f3" },
    { label: "Late", val: 34, pct: "12%", color: "#e5a51b", bg: "#fff8e8" },
    { label: "On Leave", val: 31, pct: "11%", color: "#8b6bd6", bg: "#f5f0ff" },
    { label: "WFH", val: 18, pct: "7%", color: "#18a889", bg: "#eafaf6" },
  ];

  const topOrganizations = [
    { name: "webtunix", val: 134, color: "#3B82F6", pct: 100 },
    { name: "Sunrise", val: 98, color: "#8068d8", pct: 73 },
    { name: "SeaAsia", val: 76, color: "#18a889", pct: 57 },
    { name: "AlphaCorp", val: 54, color: "#e38a37", pct: 40 },
    { name: "FlowComm", val: 38, color: "#d45c9b", pct: 28 },
  ];

  const metricCards = [
    {
      label: "Organizations",
      value: kpis.total_organizations ?? 0,
      note: "vs last month",
      change: "+12.4%",
      icon: <Building2 size={19} />,
      color: "#3B82F6",
      light: "#f0f0ff",
      action: () => go("tenants"),
    },
    {
      label: "Employees",
      value: kpis.total_employees ?? 0,
      note: "active users",
      change: "+8.1%",
      icon: <Users size={19} />,
      color: "#2563EB",
      light: "#eafaf6",
      action: () => go("employees"),
    },
    {
      label: "Subscriptions",
      value: kpis.active_subscriptions ?? 0,
      note: "active plans",
      change: "100% Active",
      icon: <CreditCard size={19} />,
      color: "#3B82F6",
      light: "#f6efff",
      action: () => go("billing"),
    },
    {
      label: "MRR Revenue",
      value: kpis.mrr_formatted ?? "₹0",
      note: "MRR growth",
      change: "+18.4%",
      icon: <Coins size={19} />,
      color: "#df7b2d",
      light: "#fff3e8",
      action: () => go("billing"),
    },
  ];

  return (
    <div
      className="sa-dashboard"
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflowY: "auto",
        background: "#f5f7fb",
        padding: "24px 28px 34px",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <style>{`
        .sa-dashboard {
          box-sizing: border-box;
        }

        .sa-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 20px;
        }

        .sa-page-title {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .sa-page-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #ececff;
          color: #3B82F6;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sa-page-title h1 {
          margin: 0;
          color: #171d2b;
          font-size: 21px;
          font-weight: 850;
          letter-spacing: -0.55px;
        }

        .sa-page-title p {
          margin: 4px 0 0;
          color: #8b95a7;
          font-size: 11px;
        }

        .sa-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sa-refresh {
          height: 36px;
          border: 1px solid #e2e6ee;
          background: #ffffff;
          color: #505a6b;
          border-radius: 9px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
        }

        .sa-refresh:hover {
          border-color: #cfd5e1;
          background: #fafbfe;
        }

        .sa-online {
          height: 36px;
          padding: 0 11px;
          border-radius: 9px;
          border: 1px solid #c8eee5;
          background: #effbf8;
          color: #11826e;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 800;
        }

        .sa-online-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #19a982;
          box-shadow: 0 0 0 3px rgba(25,169,130,.10);
        }

        .sa-kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 13px;
          margin-bottom: 14px;
        }

        .sa-kpi {
          position: relative;
          overflow: hidden;
          min-height: 125px;
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 15px;
          padding: 17px 18px;
          box-sizing: border-box;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }

        .sa-kpi:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(25,35,55,.08);
          border-color: #d9deea;
        }

        .sa-kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sa-kpi-icon {
          width: 37px;
          height: 37px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sa-kpi-change {
          font-size: 9px;
          font-weight: 800;
          padding: 4px 7px;
          border-radius: 999px;
          background: #f1faf7;
          color: #16856f;
        }

        .sa-kpi-label {
          margin-top: 14px;
          color: #7d8798;
          font-size: 10px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: .055em;
        }

        .sa-kpi-value {
          margin-top: 4px;
          color: #171d2b;
          font-size: 24px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -.8px;
        }

        .sa-kpi-note {
          margin-top: 8px;
          color: #a0a8b6;
          font-size: 9px;
          font-weight: 600;
        }

        .sa-kpi-ghost {
          position: absolute;
          right: -12px;
          bottom: -18px;
          opacity: .045;
          pointer-events: none;
        }

        .sa-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(340px, .85fr);
          gap: 14px;
          margin-bottom: 14px;
        }

        .sa-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 15px;
          box-sizing: border-box;
          box-shadow: 0 2px 7px rgba(25,35,55,.025);
        }

        .sa-chart-card {
          padding: 17px 18px;
        }

        .sa-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 13px;
        }

        .sa-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #1a2030;
          font-size: 13px;
          font-weight: 850;
        }

        .sa-section-sub {
          color: #9aa3b2;
          font-size: 9px;
          margin-top: 2px;
        }

        .sa-select {
          border: 1px solid #e4e7ee;
          background: #ffffff;
          color: #667084;
          border-radius: 8px;
          height: 30px;
          padding: 0 8px;
          font-size: 10px;
          outline: none;
        }

        .sa-legend {
          display: flex;
          align-items: center;
          gap: 13px;
          font-size: 9px;
          font-weight: 700;
          color: #798395;
        }

        .sa-legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .sa-legend-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .sa-chart {
          width: 100%;
          height: 190px;
          display: block;
        }

        .sa-revenue-chart {
          height: 184px;
        }

        .sa-finance {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border-top: 1px solid #eef0f4;
          margin-top: 5px;
          padding-top: 12px;
        }

        .sa-finance-item {
          padding: 0 12px;
          min-width: 0;
        }

        .sa-finance-item:first-child {
          padding-left: 0;
        }

        .sa-finance-item + .sa-finance-item {
          border-left: 1px solid #edf0f4;
        }

        .sa-finance-label {
          color: #99a2b1;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .05em;
          text-transform: uppercase;
        }

        .sa-finance-value {
          margin-top: 4px;
          font-size: 15px;
          font-weight: 900;
        }

        .sa-bottom-grid {
          display: grid;
          grid-template-columns: 1.08fr 1fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }

        .sa-attendance-body {
          display: flex;
          align-items: center;
          gap: 22px;
          min-height: 170px;
        }

        .sa-donut {
          position: relative;
          width: 124px;
          height: 124px;
          flex: 0 0 124px;
        }

        .sa-donut svg {
          transform: rotate(-90deg);
        }

        .sa-donut-center {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }

        .sa-donut-total-label {
          color: #9aa3b2;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .sa-donut-total {
          color: #171d2b;
          font-size: 22px;
          font-weight: 900;
          line-height: 1;
          margin-top: 2px;
        }

        .sa-attendance-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sa-attendance-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .sa-attendance-name {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #687286;
          font-size: 10px;
          font-weight: 650;
        }

        .sa-attendance-value {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sa-attendance-number {
          color: #202638;
          font-size: 11px;
          font-weight: 850;
        }

        .sa-attendance-pct {
          font-size: 8px;
          font-weight: 800;
          padding: 3px 6px;
          border-radius: 999px;
        }

        .sa-alerts {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .sa-alert {
          min-height: 57px;
          box-sizing: border-box;
          border-radius: 11px;
          padding: 10px 11px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 9px;
        }

        .sa-alert.healthy {
          background: #effaf6;
          border: 1px solid #c8eee5;
        }

        .sa-alert.warning {
          background: #fff9eb;
          border: 1px solid #f5df9e;
        }

        .sa-alert-left {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .sa-alert-icon {
          width: 29px;
          height: 29px;
          border-radius: 9px;
          flex: 0 0 29px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sa-alert-title {
          color: #242b3b;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sa-alert-sub {
          color: #8992a2;
          font-size: 8px;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sa-alert-badge {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 4px 7px;
          font-size: 7px;
          font-weight: 850;
        }

        .sa-org-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-top: 3px;
        }

        .sa-org-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 5px;
        }

        .sa-org-name {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #252c3b;
          font-size: 10px;
          font-weight: 750;
        }

        .sa-org-avatar {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 900;
        }

        .sa-org-value {
          font-size: 10px;
          font-weight: 850;
        }

        .sa-org-track {
          width: 100%;
          height: 5px;
          background: #f0f2f6;
          border-radius: 999px;
          overflow: hidden;
        }

        .sa-org-bar {
          height: 100%;
          border-radius: 999px;
        }

        .sa-activity-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .sa-activity {
          background: #fafbfc;
          border: 1px solid #eceff4;
          border-radius: 11px;
          padding: 12px;
          min-width: 0;
        }

        .sa-activity-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 9px;
        }

        .sa-activity-time {
          color: #a0a8b6;
          font-size: 9px;
          font-weight: 700;
        }

        .sa-activity-badge {
          padding: 3px 6px;
          border-radius: 999px;
          background: #f0f0ff;
          color: #3B82F6;
          font-size: 7px;
          font-weight: 850;
        }

        .sa-activity-text {
          color: #4f596b;
          font-size: 10px;
          line-height: 1.45;
          font-weight: 650;
        }

        .sa-view-all {
          border: 0;
          background: transparent;
          color: #3B82F6;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 1150px) {
          .sa-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .sa-main-grid {
            grid-template-columns: 1fr;
          }

          .sa-bottom-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .sa-dashboard {
            padding: 18px;
          }

          .sa-page-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .sa-header-actions {
            width: 100%;
          }

          .sa-refresh,
          .sa-online {
            flex: 1;
            justify-content: center;
          }

          .sa-kpis {
            grid-template-columns: 1fr;
          }

          .sa-activity-grid {
            grid-template-columns: 1fr 1fr;
          }

          .sa-attendance-body {
            flex-direction: column;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .sa-activity-grid {
            grid-template-columns: 1fr;
          }

          .sa-finance {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .sa-finance-item {
            padding: 0 !important;
          }

          .sa-finance-item + .sa-finance-item {
            border-left: 0;
            border-top: 1px solid #edf0f4;
            padding-top: 10px !important;
          }
        }
      `}

</style>

      {/* PAGE HEADER */}
      <div className="sa-page-header">
        <div>
          <div className="sa-page-title">
            <div className="sa-page-icon">
              <BarChart3 size={19} />
            </div>

            <div>
              <h1>Super Admin Overview</h1>
              <p>
                Monitor organizations, employees, attendance, revenue and
                platform health.
              </p>
            </div>
          </div>
        </div>

        <div className="sa-header-actions">
          <button className="sa-refresh" onClick={loadDashboard}>
            <RefreshCw size={13} />
            Refresh
          </button>

          <div className="sa-online">
            <span className="sa-online-dot" />
            System Online
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="sa-kpis">
        {metricCards.map((item) => (
          <div
            key={item.label}
            className="sa-kpi"
            onClick={item.action}
          >
            <div className="sa-kpi-top">
              <div
                className="sa-kpi-icon"
                style={{
                  background: item.light,
                  color: item.color,
                }}
              >
                {item.icon}
              </div>

              <span className="sa-kpi-change">
                {item.change}
              </span>
            </div>

            <div
              className="sa-kpi-label"
              style={{ color: item.color }}
            >
              {item.label}
            </div>

            <div className="sa-kpi-value">
              {item.value}
            </div>

            <div className="sa-kpi-note">
              {item.note}
            </div>

            <div
              className="sa-kpi-ghost"
              style={{ color: item.color }}
            >
              {React.cloneElement(item.icon as React.ReactElement, {
                size: 95,
              })}
            </div>
          </div>
        ))}
      </div>

      {/* MAIN CHART ROW */}
      <div className="sa-main-grid">
        {/* ORGANIZATION GROWTH */}
        <div className="sa-card sa-chart-card">
          <div className="sa-section-head">
            <div>
              <div className="sa-section-title">
                <TrendingUp size={16} color="#3B82F6" />
                Organization Growth
              </div>
              <div className="sa-section-sub">
                New, active and churned organizations
              </div>
            </div>

            <div className="sa-legend">
              <span className="sa-legend-item">
                <span
                  className="sa-legend-dot"
                  style={{ background: "#3B82F6" }}
                />
                New Orgs
              </span>

              <span className="sa-legend-item">
                <span
                  className="sa-legend-dot"
                  style={{ background: "#2563EB" }}
                />
                Active
              </span>

              <span className="sa-legend-item">
                <span
                  className="sa-legend-dot"
                  style={{ background: "#8FA5B6" }}
                />
                Churned
              </span>
            </div>
          </div>

          <svg
            className="sa-chart"
            viewBox="0 0 700 190"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id="orgAreaPurple"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#3B82F6"
                  stopOpacity=".18"
                />
                <stop
                  offset="100%"
                  stopColor="#3B82F6"
                  stopOpacity="0"
                />
              </linearGradient>

              <linearGradient
                id="orgAreaCyan"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#2563EB"
                  stopOpacity=".12"
                />
                <stop
                  offset="100%"
                  stopColor="#2563EB"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {[25, 70, 115, 160].map((y) => (
              <line
                key={y}
                x1="45"
                y1={y}
                x2="650"
                y2={y}
                stroke="#E7ECF3"
                strokeWidth="1"
              />
            ))}

            <text
              x="28"
              y="29"
              fontSize="9"
              fill="#8492A6"
              textAnchor="end"
            >
              100
            </text>

            <text
              x="28"
              y="74"
              fontSize="9"
              fill="#8492A6"
              textAnchor="end"
            >
              75
            </text>

            <text
              x="28"
              y="119"
              fontSize="9"
              fill="#8492A6"
              textAnchor="end"
            >
              50
            </text>

            <text
              x="28"
              y="164"
              fontSize="9"
              fill="#8492A6"
              textAnchor="end"
            >
              25
            </text>

            <path
              d="M55 133 C160 115, 245 96, 335 79 C440 60, 525 55, 640 28 L640 170 L55 170 Z"
              fill="url(#orgAreaCyan)"
            />

            <path
              d="M55 133 C160 115, 245 96, 335 79 C440 60, 525 55, 640 28"
              fill="none"
              stroke="#2563EB"
              strokeWidth="3"
              strokeLinecap="round"
            />

            <path
              d="M55 146 C160 129, 245 110, 335 96 C440 78, 525 72, 640 48 L640 170 L55 170 Z"
              fill="url(#orgAreaPurple)"
            />

            <path
              d="M55 146 C160 129, 245 110, 335 96 C440 78, 525 72, 640 48"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="3"
              strokeLinecap="round"
            />

            <path
              d="M55 160 C180 158, 270 154, 350 151 C450 148, 540 147, 640 140"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2"
              strokeDasharray="6 4"
              strokeLinecap="round"
            />

            {[
              ["Jul", 70],
              ["Aug", 270],
              ["Sep", 470],
              ["Oct", 625],
            ].map(([month, x]) => (
              <text
                key={String(month)}
                x={Number(x)}
                y="184"
                fontSize="9"
                fill="#8492A6"
                textAnchor="middle"
                fontWeight="600"
              >
                {month}
              </text>
            ))}

            <circle cx="640" cy="28" r="4.5" fill="#2563EB" />
            <circle cx="640" cy="48" r="4.5" fill="#3B82F6" />
            <circle cx="640" cy="140" r="4.5" fill="#8FA5B6" />
          </svg>
        </div>

        {/* REVENUE OVERVIEW */}
        <div
          className="sa-card sa-chart-card"
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="sa-section-head">
            <div>
              <div className="sa-section-title">
                <Coins size={16} color="#F472B6" />
                Revenue Overview
              </div>
              <div className="sa-section-sub">
                Monthly recurring revenue performance
              </div>
            </div>

            <span
              style={{
                fontSize: 8,
                fontWeight: 850,
                color: "#16856f",
                background: "#effaf6",
                border: "1px solid #c8eee5",
                padding: "5px 8px",
                borderRadius: 999,
                whiteSpace: "nowrap",
              }}
            >
              +18.4% MRR Growth
            </span>
          </div>

          <svg
            className="sa-chart sa-revenue-chart"
            viewBox="0 0 430 180"
            preserveAspectRatio="none"
          >
            {[25, 65, 105, 145].map((y) => (
              <line
                key={y}
                x1="18"
                y1={y}
                x2="420"
                y2={y}
                stroke="#E7ECF3"
                strokeWidth="1"
              />
            ))}

            <text
              x="5"
              y="28"
              fontSize="8"
              fill="#8492A6"
            >
              6L
            </text>

            <text
              x="5"
              y="68"
              fontSize="8"
              fill="#8492A6"
            >
              4L
            </text>

            <text
              x="5"
              y="108"
              fontSize="8"
              fill="#8492A6"
            >
              2L
            </text>

            <text
              x="5"
              y="148"
              fontSize="8"
              fill="#8492A6"
            >
              0
            </text>

            {[
              { month: "Nov", val: 2.2, color: "#818CF8" },
              { month: "Dec", val: 3.1, color: "#2DD4BF" },
              { month: "Jan", val: 3.3, color: "#A78BFA" },
              { month: "Feb", val: 4.1, color: "#818CF8" },
              { month: "Mar", val: 4.6, color: "#F472B6" },
              { month: "Apr", val: 5.2, color: "#FB923C" },
            ].map((item, i) => {
              const width = 32;
              const x = 42 + i * 62;
              const height = (item.val / 6) * 115;
              const y = 148 - height;

              return (
                <g key={item.month}>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx="7"
                    fill={item.color}
                  />

                  <text
                    x={x + width / 2}
                    y="171"
                    fontSize="9"
                    fill="#7d8798"
                    textAnchor="middle"
                    fontWeight="700"
                  >
                    {item.month}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="sa-finance">
            <div className="sa-finance-item">
              <div className="sa-finance-label">Recurring MRR</div>
              <div
                className="sa-finance-value"
                style={{ color: "#F472B6" }}
              >
                ₹4.82L
                <span
                  style={{
                    fontSize: 8,
                    color: "#9aa3b2",
                    fontWeight: 600,
                    marginLeft: 3,
                  }}
                >
                  / mo
                </span>
              </div>
            </div>

            <div className="sa-finance-item">
              <div className="sa-finance-label">Add-on Services</div>
              <div
                className="sa-finance-value"
                style={{ color: "#F472B6" }}
              >
                ₹1.20L
                <span
                  style={{
                    fontSize: 8,
                    color: "#9aa3b2",
                    fontWeight: 600,
                    marginLeft: 3,
                  }}
                >
                  / mo
                </span>
              </div>
            </div>

            <div className="sa-finance-item">
              <div className="sa-finance-label">ARPA / Account</div>
              <div
                className="sa-finance-value"
                style={{ color: "#FB923C" }}
              >
                ₹4,540
                <span
                  style={{
                    fontSize: 8,
                    color: "#9aa3b2",
                    fontWeight: 600,
                    marginLeft: 3,
                  }}
                >
                  / mo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LOWER THREE-COLUMN AREA */}
      <div className="sa-bottom-grid">
        {/* TODAY'S ATTENDANCE */}
        <div className="sa-card sa-chart-card">
          <div className="sa-section-head">
            <div className="sa-section-title">
              <CheckCircle size={16} color="#3B82F6" />
              Today's Attendance
            </div>

            <span
              style={{
                fontSize: 8,
                fontWeight: 800,
                color: "#3B82F6",
                background: "#f0f0ff",
                border: "1px solid #dddfff",
                padding: "5px 8px",
                borderRadius: 999,
              }}
            >
              Today
            </span>
          </div>

          <div className="sa-attendance-body">
            <div className="sa-donut">
              <svg
                width="124"
                height="124"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#f0f2f6"
                  strokeWidth="12"
                />

                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#3B82F6"
                  strokeWidth="12"
                  strokeDasharray="131 239"
                  strokeDashoffset="0"
                />

                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#94A3B8"
                  strokeWidth="12"
                  strokeDasharray="36 239"
                  strokeDashoffset="-131"
                />

                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#e5a51b"
                  strokeWidth="12"
                  strokeDasharray="29 239"
                  strokeDashoffset="-167"
                />

                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#8b6bd6"
                  strokeWidth="12"
                  strokeDasharray="26 239"
                  strokeDashoffset="-196"
                />

                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#18a889"
                  strokeWidth="12"
                  strokeDasharray="18 239"
                  strokeDashoffset="-222"
                />
              </svg>

              <div className="sa-donut-center">
                <div className="sa-donut-total-label">Total</div>
                <div className="sa-donut-total">279</div>
              </div>
            </div>

            <div className="sa-attendance-list">
              {attendanceData.map((item) => (
                <div
                  className="sa-attendance-row"
                  key={item.label}
                >
                  <div className="sa-attendance-name">
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: item.color,
                      }}
                    />
                    {item.label}
                  </div>

                  <div className="sa-attendance-value">
                    <span className="sa-attendance-number">
                      {item.val}
                    </span>

                    <span
                      className="sa-attendance-pct"
                      style={{
                        color: item.color,
                        background: item.bg,
                      }}
                    >
                      {item.pct}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ALERTS & SYSTEM HEALTH */}
        <div className="sa-card sa-chart-card">
          <div className="sa-section-head">
            <div className="sa-section-title">
              <AlertTriangle size={16} color="#df6377" />
              Alerts &amp; System Health
            </div>

            <button className="sa-view-all">
              View All
            </button>
          </div>

          <div className="sa-alerts">
            {systemAlerts.map((alert: any, index: number) => {
              const isWarning = alert.severity === "warning";

              return (
                <div
                  key={index}
                  className={`sa-alert ${isWarning ? "warning" : "healthy"
                    }`}
                >
                  <div className="sa-alert-left">
                    <div
                      className="sa-alert-icon"
                      style={{
                        background: isWarning
                          ? "#fff0c9"
                          : "#dff6ef",
                        color: isWarning
                          ? "#c48611"
                          : "#2563EB",
                      }}
                    >
                      {index === 0 ? (
                        <Video size={14} />
                      ) : index === 1 ? (
                        <ShieldCheck size={14} />
                      ) : index === 2 ? (
                        <Zap size={14} />
                      ) : (
                        <AlertTriangle size={14} />
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div className="sa-alert-title">
                        {alert.title}
                      </div>

                      <div className="sa-alert-sub">
                        {alert.subtitle}
                      </div>
                    </div>
                  </div>

                  <span
                    className="sa-alert-badge"
                    style={{
                      background: isWarning
                        ? "#fff0c9"
                        : "#dff6ef",
                      color: isWarning
                        ? "#aa7310"
                        : "#137b69",
                    }}
                  >
                    {alert.badge_label ||
                      String(alert.severity || "online").toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* TOP ORGANIZATIONS */}
        <div className="sa-card sa-chart-card">
          <div className="sa-section-head">
            <div className="sa-section-title">
              <Building2 size={16} color="#3B82F6" />
              Top Orgs by Employees
            </div>
          </div>

          <div className="sa-org-list">
            {topOrganizations.map((org) => (
              <div key={org.name}>
                <div className="sa-org-head">
                  <div className="sa-org-name">
                    <div
                      className="sa-org-avatar"
                      style={{
                        background: `${org.color}15`,
                        color: org.color,
                      }}
                    >
                      {org.name.charAt(0).toUpperCase()}
                    </div>

                    {org.name}
                  </div>

                  <span
                    className="sa-org-value"
                    style={{ color: org.color }}
                  >
                    {org.val}
                  </span>
                </div>

                <div className="sa-org-track">
                  <div
                    className="sa-org-bar"
                    style={{
                      width: `${org.pct}%`,
                      background: org.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT PLATFORM ACTIVITY */}
      <div className="sa-card sa-chart-card">
        <div className="sa-section-head">
          <div>
            <div className="sa-section-title">
              <Activity size={16} color="#3B82F6" />
              Recent Platform Activity
            </div>
            <div className="sa-section-sub">
              Latest organization, camera and billing events
            </div>
          </div>

          <button className="sa-view-all">
            View All
          </button>
        </div>

        <div className="sa-activity-grid">
          {recentActivities.slice(0, 4).map(
            (activity: any, index: number) => (
              <div
                className="sa-activity"
                key={index}
              >
                <div className="sa-activity-top">
                  <span className="sa-activity-time">
                    {activity.timestamp}
                  </span>

                  <span className="sa-activity-badge">
                    {activity.badge || "ACTIVITY"}
                  </span>
                </div>

                <div className="sa-activity-text">
                  {activity.action}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ── 2. Company View — (Imported from ./CompanyDirectory.tsx) ───────


const AuditLogsPage = () => <div style={{ padding: 32, background: '#f8fafc', flex: 1 }}><h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Security & Audit Logs</h2><p style={{ color: '#64748b' }}>System audit trail and security events.</p></div>;

const PAGE_META: Record<ActivePage, { title: string; desc: string }> = {
  dashboard: { title: 'Dashboard', desc: 'Platform overview, MRR analytics, and system health.' },
  employees: { title: 'Employee Management', desc: 'Manage and enroll employee face data across all SaaS tenant companies.' },
  tenants: { title: 'Company', desc: 'Manage all registered tenant organizations and license limits.' },
  billing: { title: 'Billing & Subscription', desc: 'Manage your billing, subscriptions, and account preferences.' },
  attendance: { title: 'Attendance Logs', desc: 'View live and historical face recognition attendance records.' },
  requests: { title: 'Attendance Requests', desc: 'Review leave, correction, and manual attendance requests.' },
  reports: { title: 'Reports & Analytics', desc: 'Generate aggregate working hours and day-status analytics.' },
  system: { title: 'Camera Engine AI', desc: 'RTSP stream monitoring, ONNX CUDA performance, and backup logs.' },
  anonymous: { title: 'Anonymous Logs', desc: 'Manage unmatched face captures and backdated image logs.' },
  audit: { title: 'Security & Audit Logs', desc: 'Admin action traces, Stripe webhook events, and security logs.' },
};


interface DashboardProps { authData: AuthResponse; onLogout: () => void; }

export const Dashboard: React.FC<DashboardProps> = ({ authData, onLogout }) => {
  const [page, setPage] = useState<ActivePage>(() => {
    return (localStorage.getItem('saas_active_page') as ActivePage) || 'dashboard';
  });

  const handleSetPage = (p: ActivePage) => {
    localStorage.setItem('saas_active_page', p);
    setPage(p);
  };
  const meta = PAGE_META[page];
  const user = authData?.user;
  const userName = user?.name || 'Super Admin';
  const userEmail = user?.email || '';
  const userInitials = (userName || 'SA')
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SA';

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([
    {
      id: 'notif-1',
      name: 'Pavitarta Chadha',
      emp_id: '',
      date: '2026-10-12',
      time: '17:16:12',
      camera_type: 'Exit'
    },
    {
      id: 'notif-2',
      name: 'Pavitarta Chadha',
      emp_id: '',
      date: '2026-10-12',
      time: '17:15:12',
      camera_type: 'Entry'
    },
    {
      id: 'notif-3',
      name: 'Anuj Dhiman',
      emp_id: '',
      date: '2026-10-12',
      time: '17:01:01',
      camera_type: 'Entry'
    },
    {
      id: 'notif-4',
      name: 'Anuj Dhiman',
      emp_id: '',
      date: '2026-10-12',
      time: '17:00:59',
      camera_type: 'Entry'
    }
  ]);

  useEffect(() => {
    const token = authData.tokens?.access_token || (authData as any).access_token;
    if (!token) return;

    const today = new Date().toISOString().split('T')[0];
    fetch(`/api/v1/attendance/raw-logs?date=${today}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data.logs) && data.logs.length > 0) {
          setRecentLogs(data.logs.slice(0, 20));
        }
      })
      .catch(() => {
        // Fallback default mock remains active
      });
  }, [authData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setBellOpen(false);
      }
    };
    if (profileMenuOpen || bellOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen, bellOpen]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: '#f8fafc' }}>
      <Sidebar authData={authData} activePage={page} onNavigate={handleSetPage} onLogout={onLogout} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        {/* Main Header Banner with Title, Telemetry & User Controls */}
        <div style={{
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: '1.25rem',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-.3px'
              }}>
                AttendAI Intelligence &amp; Control Center
              </span>
            </div>
            <div style={{ fontSize: '.8rem', color: '#64748b', marginTop: 2 }}>
              {/* Real-time multi-tenant analytics, revenue MRR, system alerts &amp; live camera streams. */}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Notification Bell with Recent Attendance Dropdown */}
            <div ref={bellRef} style={{ position: 'relative' }}>
              <style>{`
                @keyframes mastBellRing {
                  0% { transform: rotate(0deg); }
                  15% { transform: rotate(14deg); }
                  30% { transform: rotate(-12deg); }
                  45% { transform: rotate(8deg); }
                  60% { transform: rotate(-5deg); }
                  75% { transform: rotate(2deg); }
                  100% { transform: rotate(0deg); }
                }

                @keyframes mastBeaconPing {
                  0% { transform: scale(1); opacity: 0.85; }
                  70% { transform: scale(2.1); opacity: 0; }
                  100% { transform: scale(2.1); opacity: 0; }
                }

                @keyframes mastDropdownFade {
                  0% { opacity: 0; transform: translateY(-8px) scale(0.97); }
                  100% { opacity: 1; transform: translateY(0) scale(1); }
                }

                .mast-bell-btn {
                  position: relative;
                  cursor: pointer;
                  width: 38px;
                  height: 38px;
                  border-radius: 11px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                  user-select: none;
                }

                .mast-bell-btn:hover {
                  transform: translateY(-1px);
                  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.22);
                  border-color: #a5b4fc !important;
                }

                .mast-bell-btn:hover .mast-bell-icon {
                  animation: mastBellRing 0.75s ease-in-out both;
                  transform-origin: top center;
                }

                .mast-bell-btn:active {
                  transform: translateY(0) scale(0.96);
                }

                .mast-log-item {
                  transition: all 0.15s ease;
                }
                .mast-log-item:hover {
                  background: #f8faff !important;
                  transform: translateX(2px);
                }
              `}</style>

              <div
                className="mast-bell-btn"
                onClick={() => setBellOpen(prev => !prev)}
                role="button"
                tabIndex={0}
                style={{
                  background: bellOpen
                    ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: bellOpen ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0',
                  boxShadow: bellOpen
                    ? '0 0 0 3px rgba(99, 102, 241, 0.2), 0 4px 12px rgba(99, 102, 241, 0.15)'
                    : '0 2px 6px rgba(15, 23, 42, 0.05)',
                }}
                title="Recent Attendance Notifications"
              >
                <div className="mast-bell-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell
                    size={18}
                    color={bellOpen ? '#4f46e5' : '#475569'}
                    strokeWidth={2.2}
                    style={{
                      filter: bellOpen ? 'drop-shadow(0 2px 4px rgba(79, 70, 229, 0.3))' : 'none',
                      transition: 'color 0.2s ease',
                    }}
                  />
                </div>

                {/* Animated Beacon Badge */}
                {recentLogs.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: 9999,
                        background: '#ef4444',
                        opacity: 0.7,
                        animation: 'mastBeaconPing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                      }}
                    />
                    <span
                      style={{
                        position: 'relative',
                        minWidth: 18,
                        height: 18,
                        padding: '0 4px',
                        borderRadius: 9999,
                        background: 'linear-gradient(135deg, #ef4444 0%, #e11d48 100%)',
                        border: '2px solid #ffffff',
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 800,
                        lineHeight: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(239, 68, 68, 0.45)',
                        letterSpacing: '-0.3px',
                      }}
                    >
                      {recentLogs.length > 9 ? '9+' : recentLogs.length}
                    </span>
                  </div>
                )}
              </div>

              {bellOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 9px)',
                    right: 0,
                    width: 340,
                    background: '#ffffff',
                    borderRadius: 16,
                    boxShadow: '0 20px 45px -8px rgba(15, 23, 42, 0.2), 0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(99, 102, 241, 0.08)',
                    zIndex: 100,
                    overflow: 'hidden',
                    animation: 'mastDropdownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {/* Glowing gradient accent line */}
                  <div style={{ height: 3, background: 'linear-gradient(90deg, #4f46e5 0%, #8b5cf6 50%, #ec4899 100%)' }} />

                  {/* Dropdown Header */}
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'linear-gradient(180deg, #f8faff 0%, #ffffff 100%)',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#4f46e5',
                          boxShadow: '0 1px 3px rgba(99, 102, 241, 0.12)',
                        }}
                      >
                        <Bell size={15} strokeWidth={2.4} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
                          Recent Attendance
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#10b981',
                              boxShadow: '0 0 6px #10b981',
                            }}
                          />
                          Live camera stream
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#4f46e5',
                        background: '#eef2ff',
                        padding: '3px 8px',
                        borderRadius: 9999,
                        border: '1px solid #c7d2fe',
                      }}
                    >
                      {recentLogs.length} events
                    </span>
                  </div>

                  {/* Scrollable List */}
                  <div
                    style={{
                      maxHeight: 260,
                      overflowY: 'auto',
                    }}
                  >
                    {recentLogs.length === 0 ? (
                      <div style={{ padding: '28px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>🔔</div>
                        No recent attendance activity
                      </div>
                    ) : (
                      recentLogs.map((log: any, idx: number) => {
                        const rawType = log.camera_type || log.event_type || 'Entry';
                        const isExit = rawType.toLowerCase() === 'exit';
                        const displayDate = log.date || (log.timestamp ? log.timestamp.split('T')[0] : '2026-10-12');
                        const displayTime = log.time || (log.timestamp ? log.timestamp.split('T')[1]?.slice(0, 8) : '17:00:00');
                        const empName = log.name || 'Unknown';
                        const empIdText = log.emp_id ? `ID: ${log.emp_id}` : '';

                        return (
                          <div
                            key={log.id || `notif-${idx}`}
                            className="mast-log-item"
                            style={{
                              padding: '10px 16px',
                              borderBottom: idx === recentLogs.length - 1 ? 'none' : '1px solid #f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              setBellOpen(false);
                              handleSetPage('attendance');
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                              {/* Avatar circle with initials */}
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: isExit
                                    ? 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)'
                                    : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                                  color: isExit ? '#b45309' : '#15803d',
                                  fontSize: 12,
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                }}
                              >
                                {empName.charAt(0).toUpperCase()}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: '#0f172a',
                                  lineHeight: 1.3,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}>
                                  {empName}{' '}
                                  {empIdText && (
                                    <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '11px' }}>
                                      ({empIdText})
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.3, marginTop: 2 }}>
                                  {displayDate} @ <span style={{ fontWeight: 600, color: '#334155' }}>{displayTime}</span>
                                </div>
                              </div>
                            </div>

                            {/* Entry/Exit Pill */}
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: isExit ? '#fff7ed' : '#ecfdf5',
                                color: isExit ? '#c2410c' : '#047857',
                                border: `1px solid ${isExit ? '#fed7aa' : '#a7f3d0'}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                flexShrink: 0,
                              }}
                            >
                              {isExit ? '↑ Exit' : '↓ Entry'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div
                    onClick={() => {
                      setBellOpen(false);
                      handleSetPage('attendance');
                    }}
                    style={{
                      padding: '11px 16px',
                      background: '#f8fafc',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#4f46e5',
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#eef2ff';
                      e.currentTarget.style.color = '#4338ca';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.color = '#4f46e5';
                    }}
                  >
                    <span>View All Attendance Logs</span>
                    <ChevronRight size={14} strokeWidth={2.5} />
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill with Click Dropdown */}
            <div ref={profileMenuRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setProfileMenuOpen(prev => !prev)}
                role="button"
                tabIndex={0}
                title="Account menu"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: profileMenuOpen ? '#f1f5f9' : '#f8fafc',
                  padding: '4px 10px 4px 5px',
                  borderRadius: 9999,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  color: '#fff',
                  fontSize: '.72rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(37,99,235,.25)',
                  flexShrink: 0,
                }}>
                  {userInitials}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', marginRight: 2 }}>
                  <span style={{ fontSize: '.78rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                    {userName}
                  </span>
                  {userEmail && (
                    <span style={{ fontSize: '.68rem', color: '#64748b', lineHeight: 1 }}>
                      {userEmail}
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={14}
                  color="#64748b"
                  style={{
                    transition: 'transform 0.2s ease',
                    transform: profileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Dropdown Menu (only visible when clicked) */}
              {profileMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 210,
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  padding: 6,
                  zIndex: 50,
                  animation: 'fadeIn 0.15s ease-out',
                }}>
                  {/* User info summary in dropdown */}
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#0f172a' }}>
                      {userName}
                    </div>
                    {userEmail && (
                      <div style={{ fontSize: '.7rem', color: '#64748b', marginTop: 1, wordBreak: 'break-all' }}>
                        {userEmail}
                      </div>
                    )}
                    <div style={{ marginTop: 6 }}>
                      <span style={{
                        fontSize: '.62rem',
                        fontWeight: 800,
                        color: '#2563eb',
                        background: '#eff6ff',
                        padding: '2px 8px',
                        borderRadius: 9999,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        {user?.role ? user.role.replace('_', ' ') : 'Super Admin'}
                      </span>
                    </div>
                  </div>

                  {/* Dropdown Logout Action */}
                  <div style={{ padding: '4px 0 2px' }}>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onLogout();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'transparent',
                        color: '#ef4444',
                        fontSize: '.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fef2f2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <LogOut size={14} color="#ef4444" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {page === 'dashboard' && (
            (user?.role || '').toLowerCase().includes('super') || user?.email === 'admin@seasia.com'
              ? <SuperAdminOverview authData={authData} go={handleSetPage} />
              : <CompanyAdminDashboard authData={authData} />
          )}
          {page === 'employees' && (
            <SuperAdminEmployeeManagement />
          )}
          {page === 'tenants' && <CompanyDirectory />}
          {page === 'billing' && <BillingPage authData={authData} />}

          {page === 'attendance' && <AttendanceLogsPage authData={authData} />}
          {page === 'requests' && <AttendanceRequestsPage authData={authData} />}
          {page === 'reports' && <ReportsPage authData={authData} />}
          {page === 'system' && <CameraEnginePage authData={authData} />}
          {page === 'anonymous' && <AnonymousLogsPage authData={authData} />}
          {page === 'audit' && <AuditLogsPage />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
