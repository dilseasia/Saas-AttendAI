import React, { useState, useEffect } from 'react';
import {
  AuthResponse,
  fetchCompaniesBilling,
  CompanyBillingItem,
  fetchDashboardStats,
  DashboardStatsResponse,
  fetchSuperAdminDashboard
} from '../services/api';
import { Sidebar, ActivePage } from './Sidebar';
import { BillingPage } from './BillingPage';
import { SuperAdminEmployeeManagement } from './SuperAdminEmployeeManagement';
import { CompanyDirectory } from './CompanyDirectory';
import { CameraEnginePage } from './CameraEnginePage';
import { AttendanceLogsPage } from './AttendanceLogsPage';
import { AnonymousLogsPage } from './AnonymousLogsPage';
import { ReportsPage } from './ReportsPage';
import { AttendanceRequestsPage } from './AttendanceRequestsPage';

import {
  Users, Eye, X, Calendar, Clock, Camera, Search, Filter, Download,
  RefreshCw, CheckCircle, XCircle, AlertCircle, Building2, User,
  FileText, Shield, Video, Layers, Folder, ChevronRight, BarChart3, TrendingUp,
  Bell, Menu, ArrowUpRight, ArrowDownRight, Zap, Coins, Activity, Sparkles, CheckCircle2,
  AlertTriangle, AlertOctagon, CheckCircle as CheckIcon, ShieldCheck, CreditCard, Loader2
} from 'lucide-react';

// ── 1. Super Admin Overview Dashboard ────────────────────────────────
const SuperAdminOverview: React.FC<{ authData: AuthResponse; go: (p: ActivePage) => void }> = ({ authData, go }) => {
  const [loading, setLoading] = useState(true);
  const [superData, setSuperData] = useState<any>(null);

  const [error, setError] = useState(false);

  useEffect(() => {
    fetchSuperAdminDashboard()
      .then(res => setSuperData(res))
      .catch(err => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ flex: 1, padding: '48px', textAlign: 'center', color: '#64748b', background: '#f8fafc' }}>
        <Loader2 size={32} className="spinner" color="#2563eb" style={{ margin: '0 auto 12px auto' }} />
        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Loading Platform Dashboard Analytics...</div>
        <div style={{ fontSize: '.8rem', color: '#94a3b8', marginTop: 4 }}>Connecting to PostgreSQL Database Server</div>
      </div>
    );
  }

  if (error || !superData) {
    return (
      <div style={{ flex: 1, padding: '48px', textAlign: 'center', color: '#ef4444', background: '#fee2e2' }}>
        <AlertOctagon size={32} color="#ef4444" style={{ margin: '0 auto 12px auto' }} />
        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#7f1d1d' }}>Failed to load Platform Analytics</div>
        <div style={{ fontSize: '.8rem', color: '#991b1b', marginTop: 4 }}>Please check the API connection or your database.</div>
        <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 16px', background: '#ef4444', color: '#fff', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
          Retry Connection
        </button>
      </div>
    );
  }

  const kpis = superData.kpis || {};
  const revOverview = superData.revenue_overview || { months: [], recurring_mrr: [] };
  const systemAlerts = superData.system_health_alerts || [
    { title: 'All RTSP Cameras Online', subtitle: 'Video streams operating at 30 FPS', severity: 'healthy', badge_label: 'ONLINE' },
    { title: 'Database Healthy', subtitle: 'PostgreSQL, L6 Multi-Tenant DB operating optimal', severity: 'healthy', badge_label: 'STABLE' },
    { title: 'API System Healthy', subtitle: 'FastAPI backend cluster operating at 12ms avg latency', severity: 'healthy', badge_label: 'ONLINE' },
    { title: 'System Load', subtitle: 'CPU 42% | Memory 68% | Disk 71%', severity: 'warning', badge_label: 'NORMAL' },
  ];

  const recentActivities = superData.recent_activity || [
    { timestamp: '17:32', action: 'webtunix registered on platform', badge: 'ENTERPRISE', color: '#9333ea' },
    { timestamp: '17:28', action: 'sunrise registered on platform', badge: 'ENTERPRISE', color: '#9333ea' },
    { timestamp: '17:16', action: 'Seasia infotech registered on platform', badge: 'ENTERPRISE', color: '#9333ea' },
    { timestamp: '16:52', action: 'Camera 10.8.21.47 back online', badge: 'SYSTEM', color: '#0d9488' },
    { timestamp: '16:37', action: 'New invoice generated - ₹4,540', badge: 'BILLING', color: '#c2410c' },
  ];

  return (
    <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto', background: '#f8fafc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <style>{`
        .sa-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .sa-title-wrap h1 {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .sa-title-wrap p {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 3px;
          margin-bottom: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sa-action-btns {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sa-btn-refresh {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          transition: all 0.15s ease;
        }
        .sa-btn-refresh:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }
        .sa-status-badge {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 0.82rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* 4 KPI Grid */
        .sa-kpis {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 14px;
        }
        .sa-card {
          background: #fff;
          border-radius: 14px;
          padding: 14px 16px 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(.25,.8,.25,1);
          border: 1px solid #f0f4f8;
          position: relative;
          overflow: hidden;
          min-height: 100px;
        }
        .sa-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          border-radius: 18px 18px 0 0;
        }
        .sa-card-ghost {
          position: absolute;
          right: -8px;
          bottom: -10px;
          opacity: 0.07;
          pointer-events: none;
        }
        .sa-card:hover { transform: translateY(-4px); }
        .sa-card-1 { box-shadow: 0 4px 18px rgba(37,99,235,.13); }
        .sa-card-1::before { background: linear-gradient(90deg,#2563eb,#6366f1); }
        .sa-card-1:hover { box-shadow: 0 10px 30px rgba(37,99,235,.2); }
        .sa-card-2 { box-shadow: 0 4px 18px rgba(5,150,105,.13); }
        .sa-card-2::before { background: linear-gradient(90deg,#059669,#10b981); }
        .sa-card-2:hover { box-shadow: 0 10px 30px rgba(5,150,105,.2); }
        .sa-card-3 { box-shadow: 0 4px 18px rgba(147,51,234,.13); }
        .sa-card-3::before { background: linear-gradient(90deg,#9333ea,#c026d3); }
        .sa-card-3:hover { box-shadow: 0 10px 30px rgba(147,51,234,.2); }
        .sa-card-4 { box-shadow: 0 4px 18px rgba(234,88,12,.13); }
        .sa-card-4::before { background: linear-gradient(90deg,#ea580c,#f59e0b); }
        .sa-card-4:hover { box-shadow: 0 10px 30px rgba(234,88,12,.2); }
        .sa-kpi-label { font-size:0.68rem; font-weight:800; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; display:flex; align-items:center; gap:6px; }
        .sa-kpi-val { font-size:1.6rem; font-weight:900; line-height:1; letter-spacing:-1px; }
        .sa-kpi-bottom { display:flex; align-items:center; justify-content:space-between; margin-top:8px; }
        .sa-kpi-badge { font-size:0.65rem; font-weight:800; padding:2px 8px; border-radius:9999px; display:inline-flex; align-items:center; gap:3px; }

        /* Charts Grid */
        .sa-charts-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }
        .sa-chart-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px 18px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.02);
          position: relative;
        }
        .sa-chart-title {
          font-size: 0.88rem;
          font-weight: 800;
          color: #0f172a;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        /* Bottom 3-col grid */
        .sa-bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
          margin-bottom: 0;
        }
        .sa-alert-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 10px;
        }
        .sa-alert-item.healthy {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }
        .sa-alert-item.warning {
          background: #fffbe6;
          border: 1px solid #fde68a;
        }

        .sa-act-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          margin-bottom: 8px;
        }
      `}</style>

      {/* Top Header matching Employee Management Style */}
      <div className="sa-header">
        <div className="sa-title-wrap">
          <h1>
            <BarChart3 size={26} color="#2563eb" />
            Super Admin Overview
          </h1>

        </div>

        <div className="sa-action-btns">
          <button
            className="sa-btn-refresh"
            onClick={() => {
              setLoading(true);
              fetchSuperAdminDashboard()
                .then(res => setSuperData(res))
                .catch(console.error)
                .finally(() => setLoading(false));
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <div className="sa-status-badge">
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#16a34a',
              }}
            />
            System Online
          </div>
        </div>
      </div>


      {/* Top 4 KPI Cards — Premium New Design */}
      <div className="sa-kpis">
        {/* Card 1: Organizations — Blue */}
        <div className="sa-card sa-card-1" onClick={() => go('tenants')}>
          <Building2 size={90} color="#2563eb" className="sa-card-ghost" />
          <div className="sa-kpi-label" style={{ color: '#2563eb' }}>
            <Building2 size={14} />
            Organizations
          </div>
          <div className="sa-kpi-val" style={{ color: '#1e3a5f' }}>{kpis.total_organizations || 79}</div>
          <div className="sa-kpi-bottom">
            <span className="sa-kpi-badge" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
              <ArrowUpRight size={11} />+12.4%
            </span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>vs last month</span>
          </div>
        </div>

        {/* Card 2: Employees — Green */}
        <div className="sa-card sa-card-2" onClick={() => go('employees')}>
          <Users size={90} color="#059669" className="sa-card-ghost" />
          <div className="sa-kpi-label" style={{ color: '#059669' }}>
            <Users size={14} />
            Employees
          </div>
          <div className="sa-kpi-val" style={{ color: '#14532d' }}>{kpis.total_employees || 279}</div>
          <div className="sa-kpi-bottom">
            <span className="sa-kpi-badge" style={{ background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0' }}>
              <ArrowUpRight size={11} />+8.1%
            </span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>active users</span>
          </div>
        </div>

        {/* Card 3: Subscriptions — Purple */}
        <div className="sa-card sa-card-3" onClick={() => go('billing')}>
          <CreditCard size={90} color="#9333ea" className="sa-card-ghost" />
          <div className="sa-kpi-label" style={{ color: '#9333ea' }}>
            <CreditCard size={14} />
            Subscriptions
          </div>
          <div className="sa-kpi-val" style={{ color: '#3b0764' }}>{kpis.active_subscriptions || 79}</div>
          <div className="sa-kpi-bottom">
            <span className="sa-kpi-badge" style={{ background: '#faf5ff', color: '#9333ea', border: '1px solid #e9d5ff' }}>
              <CheckCircle2 size={11} />100% Active
            </span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>compliance</span>
          </div>
        </div>

        {/* Card 4: MRR Revenue — Orange */}
        <div className="sa-card sa-card-4" onClick={() => go('billing')}>
          <Coins size={90} color="#ea580c" className="sa-card-ghost" />
          <div className="sa-kpi-label" style={{ color: '#ea580c' }}>
            <Coins size={14} />
            MRR Revenue
          </div>
          <div className="sa-kpi-val" style={{ color: '#431407' }}>{kpis.mrr_formatted || '₹4.18L'}</div>
          <div className="sa-kpi-bottom">
            <span className="sa-kpi-badge" style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' }}>
              <ArrowUpRight size={11} />+18.4%
            </span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>MRR growth</span>
          </div>
        </div>
      </div>

      {/* Middle Grid: Organization Growth & Dedicated Revenue Overview */}
      <div className="sa-charts-grid">
        {/* Multi-Series Organization Growth Curve Chart matching Screenshot */}
        <div className="sa-chart-card">
          <div className="sa-chart-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#7c3aed" />
              <span>Organization Growth</span>
            </span>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '0.74rem',
                fontWeight: 700,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#7c3aed' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed' }} />
                New Orgs
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#06b6d4' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4' }} />
                Active
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f43f5e' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e' }} />
                Churned
              </span>
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', height: 150, marginTop: '8px' }}>
            <svg
              width="100%"
              height="150"
              viewBox="0 0 500 150"
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Horizontal Lines & Y-Axis Labels */}
              {[100, 60, 20].map((val, i) => {
                const y = 15 + i * 48;
                return (
                  <g key={val}>
                    <line x1="30" y1={y} x2="480" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    <text x="20" y={y + 3} fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="500">
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* X-Axis Month Labels */}
              <text x="50" y="140" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="600">Jul</text>
              <text x="260" y="140" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="600">Aug</text>
              <text x="470" y="140" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="600">Sep</text>

              <path d="M 50 100 C 160 75, 320 40, 470 15 L 470 130 L 50 130 Z" fill="url(#activeGrad)" />
              <path d="M 50 100 C 160 75, 320 40, 470 15" fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" />

              <path d="M 50 110 C 160 88, 320 55, 470 35 L 470 130 L 50 130 Z" fill="url(#newGrad)" />
              <path d="M 50 110 C 160 88, 320 55, 470 35" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />

              <path d="M 50 120 C 160 118, 320 115, 470 110" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeDasharray="5,3" />{/* End Point Badges matching Screenshot */}
              <circle cx="470" cy="50" r="5" fill="#06b6d4" />
              <rect x="480" y="40" width="22" height="18" rx="9" fill="#06b6d4" />
              <text x="491" y="52" fontSize="10" fill="#ffffff" fontWeight="800" textAnchor="middle">79</text>

              <circle cx="470" cy="75" r="5" fill="#7c3aed" />
              <rect x="480" y="66" width="22" height="18" rx="9" fill="#7c3aed" />
              <text x="491" y="78" fontSize="10" fill="#ffffff" fontWeight="800" textAnchor="middle">62</text>

              <circle cx="470" cy="160" r="5" fill="#f43f5e" />
              <rect x="480" y="151" width="18" height="18" rx="9" fill="#f43f5e" />
              <text x="489" y="163" fontSize="10" fill="#ffffff" fontWeight="800" textAnchor="middle">7</text>
            </svg>
          </div>
        </div>

        {/* Revenue Overview Bar Chart matching Screenshot */}
        <div
          className="sa-chart-card"
          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div>
            <div className="sa-chart-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={18} color="#9333ea" />
                <span>Revenue Overview</span>
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#15803d',
                  background: '#dcfce7',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  border: '1px solid #bbf7d0',
                }}
              >
                +18.4% MRR Growth
              </span>
            </div>

            <div style={{ position: 'relative', width: '100%', height: 120, marginTop: '8px' }}>
              <svg width="100%" height="120" viewBox="0 0 350 120" preserveAspectRatio="none">
                <defs>
                  {/* Nov: Coral Sunset Orange */}
                  <linearGradient id="barGradNov" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff7e5f" stopOpacity="1" />
                    <stop offset="100%" stopColor="#feb47b" stopOpacity="0.9" />
                  </linearGradient>

                  {/* Dec: Emerald Forest Green */}
                  <linearGradient id="barGradDec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.9" />
                  </linearGradient>

                  {/* Jan: Electric Cyan Sky Blue */}
                  <linearGradient id="barGradJan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00c6ff" stopOpacity="1" />
                    <stop offset="100%" stopColor="#0072ff" stopOpacity="0.9" />
                  </linearGradient>

                  {/* Feb: Vibrant Royal Purple */}
                  <linearGradient id="barGradFeb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8e2de2" stopOpacity="1" />
                    <stop offset="100%" stopColor="#4a00e0" stopOpacity="0.9" />
                  </linearGradient>

                  {/* Mar: Hot Magenta Rose Pink */}
                  <linearGradient id="barGradMar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f857a6" stopOpacity="1" />
                    <stop offset="100%" stopColor="#ff5858" stopOpacity="0.9" />
                  </linearGradient>

                  {/* Apr: Golden Sunburst Amber */}
                  <linearGradient id="barGradApr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f2994a" stopOpacity="1" />
                    <stop offset="100%" stopColor="#f2c94c" stopOpacity="0.9" />
                  </linearGradient>


                </defs>

                {/* Y-Axis Grid & Labels */}
                {[6, 4, 2, 0].map((val, i) => {
                  const y = 8 + i * 20;
                  return (
                    <g key={val}>
                      <line x1="0" y1={y} x2="350" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                      <text x="-2" y={y + 3} fontSize="9" fill="#94a3b8" textAnchor="end" fontWeight="500">{val}L</text>
                    </g>
                  );
                })}

                {/* Bars for Nov to Apr with colorful gradients */}
                {[
                  { month: 'Nov', val: 2.2, grad: 'url(#barGradNov)' },
                  { month: 'Dec', val: 3.1, grad: 'url(#barGradDec)' },
                  { month: 'Jan', val: 3.3, grad: 'url(#barGradJan)' },
                  { month: 'Feb', val: 4.1, grad: 'url(#barGradFeb)' },
                  { month: 'Mar', val: 4.6, grad: 'url(#barGradMar)' },
                  { month: 'Apr', val: 5.2, grad: 'url(#barGradApr)' },
                ].map((item, i) => {
                  const bw = 24;
                  const bx = 42 + i * 50;
                  const bh = (item.val / 6) * 80;
                  const by = 96 - bh;
                  return (
                    <g key={item.month}>
                      <rect x={bx} y={by} width={bw} height={bh} rx="6" fill={item.grad} />
                      <text x={bx + bw / 2} y="112" fontSize="10" fill="#64748b" textAnchor="middle" fontWeight="700">
                        {item.month}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

          </div>

          {/* 3 Bottom Financial Metric Summary Cards matching Screenshot */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                RECURRING MRR
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#2563eb', marginTop: '2px' }}>
                ₹4.82L <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>/ mo</span>
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '16px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                ADD-ON SERVICES
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#9333ea', marginTop: '2px' }}>
                ₹1.20L <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>/ mo</span>
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '16px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                ARPA / ACCOUNT
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
                ₹4,540 <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>/ mo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 3-Column Grid: Today's Attendance | Alerts & System Health | Top Orgs by Employees */}
      <div className="sa-bottom-grid">

        {/* Col 1: TODAY'S ATTENDANCE — Donut */}
        <div className="sa-chart-card">
          <div className="sa-chart-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={17} color="#2563eb" />
              <span>Today's Attendance</span>
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#eff6ff', color: '#2563eb', padding: '2px 9px', borderRadius: 9999, border: '1px solid #bfdbfe' }}>Today</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
              <svg width="110" height="110" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="13" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#2563eb" strokeWidth="13" strokeDasharray="130 239" strokeDashoffset="0" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#ef4444" strokeWidth="13" strokeDasharray="36 239" strokeDashoffset="-130" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="13" strokeDasharray="29 239" strokeDashoffset="-166" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#8b5cf6" strokeWidth="13" strokeDasharray="26 239" strokeDashoffset="-195" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="13" strokeDasharray="18 239" strokeDashoffset="-221" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b' }}>Total</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>279</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {[
                { label: 'Present',  val: 154, pct: '55%', color: '#2563eb', bg: '#eff6ff', bd: '#bfdbfe' },
                { label: 'Absent',   val: 42,  pct: '15%', color: '#ef4444', bg: '#fef2f2', bd: '#fca5a5' },
                { label: 'Late',     val: 34,  pct: '12%', color: '#f59e0b', bg: '#fffbeb', bd: '#fde68a' },
                { label: 'On Leave', val: 31,  pct: '11%', color: '#8b5cf6', bg: '#faf5ff', bd: '#e9d5ff' },
                { label: 'WFH',      val: 18,  pct: '7%',  color: '#10b981', bg: '#f0fdf4', bd: '#bbf7d0' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>{item.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>{item.val}</span>
                    <span style={{ fontSize: '0.63rem', fontWeight: 700, padding: '1px 6px', borderRadius: 9999, background: item.bg, color: item.color, border: `1px solid ${item.bd}` }}>{item.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 2: ALERTS & SYSTEM HEALTH */}
        <div className="sa-chart-card">
          <div className="sa-chart-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={17} color="#ef4444" />
              <span>Alerts &amp; System Health</span>
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', cursor: 'pointer' }}>View All</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {systemAlerts.map((alert: any, i: number) => (
              <div key={i} className={`sa-alert-item ${alert.severity}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: alert.severity === 'warning' ? '#fef3c7' : '#dcfce7', color: alert.severity === 'warning' ? '#d97706' : '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {i === 0 ? <Video size={15} /> : i === 1 ? <ShieldCheck size={15} /> : i === 2 ? <Zap size={15} /> : <AlertTriangle size={15} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{alert.title}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 1 }}>{alert.subtitle}</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 9999, background: alert.severity === 'warning' ? '#fef3c7' : '#dcfce7', color: alert.severity === 'warning' ? '#b45309' : '#15803d', border: alert.severity === 'warning' ? '1px solid #fde68a' : '1px solid #bbf7d0', whiteSpace: 'nowrap' }}>
                  {alert.badge_label || alert.severity.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: TOP ORGANIZATIONS BY EMPLOYEES */}
        <div className="sa-chart-card">
          <div className="sa-chart-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={17} color="#7c3aed" />
              <span>Top Orgs by Employees</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 4 }}>
            {[
              { name: 'webtunix',   val: 134, color: '#2563eb', pct: 100 },
              { name: 'Sunrise',    val: 98,  color: '#7c3aed', pct: 73  },
              { name: 'SeaAsia',    val: 76,  color: '#059669', pct: 57  },
              { name: 'AlphaCorp',  val: 54,  color: '#ea580c', pct: 40  },
              { name: 'FlowComm',   val: 38,  color: '#db2777', pct: 28  },
            ].map((org, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: org.color + '1a', color: org.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                      {org.name[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.81rem', fontWeight: 700, color: '#0f172a' }}>{org.name}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: org.color }}>{org.val}</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 9999, height: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${org.pct}%`, height: '100%', background: `linear-gradient(90deg,${org.color},${org.color}88)`, borderRadius: 9999 }} />
                </div>
              </div>
            ))}
          </div>
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
                ⚡ AttendAI Intelligence &amp; Control Center
              </span>
            </div>
            <div style={{ fontSize: '.8rem', color: '#64748b', marginTop: 2 }}>
              Real-time multi-tenant analytics, revenue MRR, system alerts &amp; live camera streams.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <Bell size={18} color="#64748b" />
              <div style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
            </div>

            {/* Super Admin User Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '4px 10px 4px 6px', borderRadius: 9999, border: '1px solid #e2e8f0' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#2563eb', color: '#fff', fontSize: '.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                SA
              </div>
              <span style={{ fontSize: '.8rem', fontWeight: 700, color: '#0f172a' }}>Super Admin</span>
            </div>
          </div>
        </div>

        {page === 'dashboard' && <SuperAdminOverview authData={authData} go={handleSetPage} />}
        {page === 'employees' && <SuperAdminEmployeeManagement />}
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
  );
};

export default Dashboard;
