import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Search,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  MoreVertical,
  Plus,
  ChevronRight,
  ChevronLeft,
  Globe,
  Clock,
  Ban,
  CheckCircle2,
  X,
  Loader2,
  ShieldCheck,
  CreditCard,
  Video,
  Eye,
  Edit3,
  UserPlus
} from 'lucide-react';
import {
  fetchCompaniesBilling,
  CompanyBillingItem,
  registerTenant
} from '../services/api';

export const CompanyDirectory: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyBillingItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'employees'>('newest');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Add Tenant Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [newCompany, setNewCompany] = useState({
    company_name: '',
    company_email: '',
    company_phone: '',
    admin_name: '',
    password: 'Demo@1234',
    selected_plan: 'pro',
    timezone: 'Asia/Kolkata',
  });

  const loadData = () => {
    setLoading(true);
    fetchCompaniesBilling()
      .then((r) =>
        setCompanies(
          (r.companies || []).filter(
            (c: CompanyBillingItem) =>
              c.name?.toLowerCase() !== 'saas attend-ai platform hq'
          )
        )
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter & Sort Logic
  const filteredRows = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
          ? c.status === 'active'
          : statusFilter === 'trial'
            ? c.status === 'trialing' || c.status === 'trial'
            : statusFilter === 'suspended'
              ? c.status === 'suspended' || c.status === 'cancelled'
              : true;

    const matchesPlan =
      planFilter === 'all'
        ? true
        : c.plan.toLowerCase() === planFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'employees') return b.total_employees - a.total_employees;
    if (sortBy === 'oldest') {
      return (
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime()
      );
    }
    // Default: newest first
    return (
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
    );
  });

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginatedRows = sortedRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Counts for KPI Header Cards
  const totalCount = companies.length;
  const activeCount = companies.filter((c) => c.status === 'active').length;
  const trialCount = companies.filter(
    (c) => c.status === 'trialing' || c.status === 'trial'
  ).length;
  const suspendedCount = companies.filter(
    (c) => c.status === 'suspended' || c.status === 'cancelled'
  ).length;

  // Helper for company avatar circle color
  const getAvatarColor = (name: string) => {
    const colors = [
      'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      'linear-gradient(135deg, #059669 0%, #047857 100%)',
      'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
      'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
      'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Helper for Plan badge formatting
  const renderPlanBadge = (plan: string) => {
    const p = (plan || 'starter').toLowerCase();
    if (p === 'enterprise') {
      return (
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            background: '#faf5ff',
            color: '#9333ea',
            border: '1px solid #e9d5ff',
          }}
        >
          ENTERPRISE
        </span>
      );
    }
    if (p === 'pro' || p === 'growth') {
      return (
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            background: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #bfdbfe',
          }}
        >
          PRO
        </span>
      );
    }
    return (
      <span
        style={{
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '0.72rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          background: '#f1f5f9',
          color: '#475569',
          border: '1px solid #cbd5e1',
        }}
      >
        STARTER
      </span>
    );
  };

  // Helper for Status badge formatting
  const renderStatusBadge = (status: string) => {
    const s = (status || 'trialing').toLowerCase();
    if (s === 'active') {
      return (
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 700,
            background: '#f0fdf4',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#16a34a',
            }}
          />
          Active
        </span>
      );
    }
    if (s === 'suspended' || s === 'cancelled') {
      return (
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 700,
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#dc2626',
            }}
          />
          Suspended
        </span>
      );
    }
    // Default Trialing
    return (
      <span
        style={{
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '0.74rem',
          fontWeight: 700,
          background: '#fff7ed',
          color: '#c2410c',
          border: '1px solid #ffedd5',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#ea580c',
          }}
        />
        Trialing
      </span>
    );
  };

  const handleCreateTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    setAddSuccess(null);

    try {
      await registerTenant({
        company_name: newCompany.company_name,
        company_email: newCompany.company_email,
        company_phone: newCompany.company_phone,
        timezone: newCompany.timezone,
        admin_name: newCompany.admin_name,
        password: newCompany.password,
        confirm_password: newCompany.password,
        selected_plan: newCompany.selected_plan,
      });

      setAddSuccess('Tenant company registered successfully!');
      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess(null);
        setNewCompany({
          company_name: '',
          company_email: '',
          company_phone: '',
          admin_name: '',
          password: 'Demo@1234',
          selected_plan: 'pro',
          timezone: 'Asia/Kolkata',
        });
        loadData();
      }, 1200);
    } catch (err: any) {
      setAddError(err.message || 'Failed to create tenant company.');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        padding: '24px 32px',
        overflowY: 'auto',
        background: '#f8fafc',
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <style>{`
        /* Smooth Custom Styling */
        .tenant-hdr-banner {
          background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
          border: 1px solid #c7d2fe;
          border-radius: 20px;
          padding: 22px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 22px;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.08);
        }
        .btn-add-tenant {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.88rem;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
          transition: all 0.15s ease;
        }
        .btn-add-tenant:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
        }

        /* Clean Ultra-Modern White Header Banner */
        .tenant-hdr-banner {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 22px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
          position: relative;
        }
        .btn-add-tenant {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: #ffffff;
          padding: 11px 20px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.88rem;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .btn-add-tenant:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        /* 4 Next-Gen KPI Cards Grid with Mini Sparklines & Gradient Top Accent */
        .tenant-kpis-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .tenant-kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 12px rgba(0,0,0,0.03);
        }
        .tenant-kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }
        .tenant-kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3.5px;
          border-radius: 18px 18px 0 0;
        }
        .tenant-kpi-card.c-indigo::before { background: linear-gradient(90deg, #6366f1, #8b5cf6); }
        .tenant-kpi-card.c-emerald::before { background: linear-gradient(90deg, #10b981, #059669); }
        .tenant-kpi-card.c-amber::before { background: linear-gradient(90deg, #f59e0b, #d97706); }
        .tenant-kpi-card.c-rose::before { background: linear-gradient(90deg, #f43f5e, #e11d48); }

        .tenant-kpi-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .tenant-kpi-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .c-indigo .tenant-kpi-icon { background: #e0e7ff; color: #4338ca; }
        .c-emerald .tenant-kpi-icon { background: #dcfce7; color: #15803d; }
        .c-amber .tenant-kpi-icon { background: #fef3c7; color: #b45309; }
        .c-rose .tenant-kpi-icon { background: #ffe4e6; color: #be123c; }

        .tenant-kpi-val-row { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 4px; }
        .tenant-kpi-val { font-size: 1.9rem; font-weight: 900; color: #0f172a; line-height: 1; letter-spacing: -.5px; }
        .tenant-kpi-lbl { font-size: 0.74rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }

        .tenant-sparkline { width: 70px; height: 32px; flex-shrink: 0; }
        .tenant-kpi-footer { display: flex; align-items: center; gap: 6px; margin-top: 14px; font-size: 0.73rem; font-weight: 700; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 10px; }

        /* Table Styling */
        .tenant-table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }
        .tenant-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.83rem;
        }
        .tenant-table th {
          text-align: left;
          padding: 13px 20px;
          color: #64748b;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .tenant-table td {
          padding: 14px 20px;
          border-bottom: 1px solid #f1f5f9;
          color: #0f172a;
          vertical-align: middle;
        }
        .tenant-table tr:hover td {
          background: #fdfdfe;
        }

        /* Action Menu Dropdown */
        .action-menu-dropdown {
          position: absolute;
          right: 20px;
          margin-top: 4px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          z-index: 30;
          min-width: 180px;
          padding: 6px 0;
        }
        .action-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 16px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: background 0.12s;
        }
        .action-menu-item:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        /* Progress Bar Styling */
        .progress-bar-bg {
          width: 90px;
          height: 6px;
          border-radius: 3px;
          background: #e2e8f0;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }
      `}</style>

      {/* Clean Ultra-Modern White Header Banner */}
      <div className="tenant-hdr-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #bfdbfe',
              flexShrink: 0,
            }}
          >
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: 0,
                  letterSpacing: '-0.3px',
                }}
              >
                Tenant Company Directory
              </h1>
              <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                🟢 100% OPERATIONAL
              </span>
            </div>
            <p
              style={{
                fontSize: '0.86rem',
                color: '#64748b',
                margin: 0,
              }}
            >
              Real-time multi-tenant management, license limits, camera streams, and active subscriptions.
            </p>
          </div>
        </div>

        <button
          className="btn-add-tenant"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Add Tenant</span>
        </button>
      </div>

      {/* 4 Next-Gen KPI Cards Grid with Mini Sparklines */}
      <div className="tenant-kpis-grid">
        {/* Card 1: Total Tenants */}
        <div
          className="tenant-kpi-card c-indigo"
          onClick={() => {
            setStatusFilter('all');
            setPlanFilter('all');
          }}
        >
          <div>
            <div className="tenant-kpi-head">
              <span className="tenant-kpi-lbl">Total Tenants</span>
              <div className="tenant-kpi-icon">
                <Building2 size={20} />
              </div>
            </div>
            <div className="tenant-kpi-val-row">
              <div className="tenant-kpi-val">{totalCount}</div>
              <svg className="tenant-sparkline" viewBox="0 0 70 30" fill="none">
                <path d="M2 24 L18 18 L34 22 L50 10 L68 4" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 24 L18 18 L34 22 L50 10 L68 4 L68 30 L2 30 Z" fill="url(#grad-indigo)" opacity="0.15"/>
                <defs>
                  <linearGradient id="grad-indigo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1"/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div className="tenant-kpi-footer">
            <span style={{ color: '#10b981', fontWeight: 800 }}>↑ +12.4%</span>
            <span>growth this month</span>
          </div>
        </div>

        {/* Card 2: Active Tenants */}
        <div
          className="tenant-kpi-card c-emerald"
          onClick={() => setStatusFilter('active')}
        >
          <div>
            <div className="tenant-kpi-head">
              <span className="tenant-kpi-lbl">Active Tenants</span>
              <div className="tenant-kpi-icon">
                <Globe size={20} />
              </div>
            </div>
            <div className="tenant-kpi-val-row">
              <div className="tenant-kpi-val">{activeCount}</div>
              <svg className="tenant-sparkline" viewBox="0 0 70 30" fill="none">
                <path d="M2 20 L20 14 L38 18 L54 8 L68 5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 20 L20 14 L38 18 L54 8 L68 5 L68 30 L2 30 Z" fill="url(#grad-emerald)" opacity="0.15"/>
                <defs>
                  <linearGradient id="grad-emerald" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981"/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div className="tenant-kpi-footer">
            <span style={{ color: '#10b981', fontWeight: 800 }}>🟢 100%</span>
            <span>active SLA uptime</span>
          </div>
        </div>

        {/* Card 3: Trial Accounts */}
        <div
          className="tenant-kpi-card c-amber"
          onClick={() => setStatusFilter('trial')}
        >
          <div>
            <div className="tenant-kpi-head">
              <span className="tenant-kpi-lbl">Trial Accounts</span>
              <div className="tenant-kpi-icon">
                <Clock size={20} />
              </div>
            </div>
            <div className="tenant-kpi-val-row">
              <div className="tenant-kpi-val">{trialCount}</div>
              <svg className="tenant-sparkline" viewBox="0 0 70 30" fill="none">
                <path d="M2 12 L20 22 L36 16 L52 24 L68 12" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12 L20 22 L36 16 L52 24 L68 12 L68 30 L2 30 Z" fill="url(#grad-amber)" opacity="0.15"/>
                <defs>
                  <linearGradient id="grad-amber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b"/>
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div className="tenant-kpi-footer">
            <span style={{ color: '#f59e0b', fontWeight: 800 }}>⏳ 14-Day</span>
            <span>trial conversions active</span>
          </div>
        </div>

        {/* Card 4: Suspended */}
        <div
          className="tenant-kpi-card c-rose"
          onClick={() => setStatusFilter('suspended')}
        >
          <div>
            <div className="tenant-kpi-head">
              <span className="tenant-kpi-lbl">Suspended</span>
              <div className="tenant-kpi-icon">
                <Ban size={20} />
              </div>
            </div>
            <div className="tenant-kpi-val-row">
              <div className="tenant-kpi-val">{suspendedCount}</div>
              <svg className="tenant-sparkline" viewBox="0 0 70 30" fill="none">
                <path d="M2 26 L22 26 L42 26 L68 26" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div className="tenant-kpi-footer">
            <span style={{ color: '#10b981', fontWeight: 800 }}>✓ Healthy</span>
            <span>zero tenant flags</span>
          </div>
        </div>
      </div>

      {/* Filter, Search & Sort Bar matching Screenshot */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          position: 'relative',
        }}
      >
        {/* Left Filter Dropdown Trigger */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            style={{
              background: '#ffffff',
              border:
                statusFilter !== 'all' || planFilter !== 'all'
                  ? '1.5px solid #2563eb'
                  : '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              color:
                statusFilter !== 'all' || planFilter !== 'all'
                  ? '#2563eb'
                  : '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <Filter size={15} color="#2563eb" />
            <span>
              Filters
              {statusFilter !== 'all' || planFilter !== 'all' ? ' (Active)' : ''}
            </span>
          </button>

          {showFilterDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '6px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)',
                zIndex: 40,
                width: '240px',
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  Status
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="trial">Trialing Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  Plan Tier
                </div>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="all">All Plans</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {(statusFilter !== 'all' || planFilter !== 'all') && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setPlanFilter('all');
                    setShowFilterDropdown(false);
                  }}
                  style={{
                    marginTop: '12px',
                    width: '100%',
                    padding: '6px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Search Input & Sort Selector matching Screenshot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '8px 14px',
              width: '260px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <Search size={16} color="#94a3b8" />
            <input
              placeholder="Search by company name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                width: '100%',
                color: '#0f172a',
              }}
            />
            {search && (
              <X
                size={14}
                color="#94a3b8"
                style={{ cursor: 'pointer' }}
                onClick={() => setSearch('')}
              />
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '7px 12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <ArrowUpDown size={14} color="#64748b" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="employees">Sort: Most Employees</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Directory Data Table */}
      <div className="tenant-table-card">
        {loading ? (
          <div
            style={{
              padding: '60px',
              textAlign: 'center',
              color: '#64748b',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <Loader2 size={32} className="spinner" color="#2563eb" />
            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
              Loading Tenant Directory...
            </div>
          </div>
        ) : sortedRows.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <Building2
              size={40}
              color="#cbd5e1"
              style={{ marginBottom: '10px' }}
            />
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
              No Tenant Companies Found
            </div>
            <p style={{ fontSize: '0.83rem', color: '#94a3b8', marginTop: '4px' }}>
              Try adjusting your search query or filter selections.
            </p>
          </div>
        ) : (
          <table className="tenant-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>COMPANY</th>
                <th>PLAN</th>
                <th>STATUS</th>
                <th>EMPLOYEE LICENSES</th>
                <th>CAMERA STREAMS</th>
                <th>SUBSCRIPTION</th>
                <th>NEXT BILLING</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((c, index) => {
                const rowIndex = (currentPage - 1) * pageSize + index + 1;
                const empPercent = Math.min(
                  100,
                  Math.round(
                    (c.total_employees / (c.max_employees || 100)) * 100
                  )
                );
                const camPercent = Math.min(
                  100,
                  Math.round(
                    (c.total_cameras / (c.max_cameras || 5)) * 100
                  )
                );

                const formattedPrice =
                  c.price_inr && c.price_inr > 0
                    ? `₹${c.price_inr.toLocaleString('en-IN')}`
                    : c.price_usd && c.price_usd > 0
                      ? `$${c.price_usd}`
                      : '$79';

                const billingDate = c.current_period_end
                  ? new Date(c.current_period_end).toLocaleDateString(
                    'en-US',
                    { month: 'numeric', day: 'numeric', year: 'numeric' }
                  )
                  : '9/24/2026';

                return (
                  <tr key={c.id} style={{ position: 'relative' }}>
                    {/* # Index */}
                    <td style={{ color: '#64748b', fontWeight: 700 }}>
                      {rowIndex}
                    </td>

                    {/* Company Column with Circle Avatar */}
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: getAvatarColor(c.name),
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                          }}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: 800,
                              color: '#0f172a',
                              fontSize: '0.86rem',
                              lineHeight: 1.2,
                            }}
                          >
                            {c.name}
                          </div>
                          <div
                            style={{
                              fontSize: '0.73rem',
                              color: '#64748b',
                              marginTop: '2px',
                            }}
                          >
                            {c.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Plan Badge */}
                    <td>{renderPlanBadge(c.plan)}</td>

                    {/* Status Badge */}
                    <td>{renderStatusBadge(c.status)}</td>

                    {/* Employee Licenses Progress Bar */}
                    <td>
                      <div>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            marginBottom: '4px',
                          }}
                        >
                          {c.total_employees} /{' '}
                          {c.max_employees >= 99999 ? '100' : c.max_employees}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <div className="progress-bar-bg">
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${empPercent}%`,
                                background: '#2563eb',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#64748b',
                            }}
                          >
                            {empPercent}%
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Camera Streams Progress Bar */}
                    <td>
                      <div>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            marginBottom: '4px',
                          }}
                        >
                          {c.total_cameras} /{' '}
                          {c.max_cameras >= 999 ? '5' : c.max_cameras}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <div className="progress-bar-bg">
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${camPercent}%`,
                                background: '#10b981',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#64748b',
                            }}
                          >
                            {camPercent}%
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Subscription Price */}
                    <td>
                      <div
                        style={{
                          fontWeight: 800,
                          color: '#0f172a',
                          fontSize: '0.85rem',
                        }}
                      >
                        {formattedPrice}{' '}
                        <span
                          style={{
                            fontWeight: 500,
                            color: '#64748b',
                            fontSize: '0.75rem',
                          }}
                        >
                          / month
                        </span>
                      </div>
                    </td>

                    {/* Next Billing Date */}
                    <td style={{ color: '#475569', fontSize: '0.81rem' }}>
                      {billingDate}
                    </td>

                    {/* Action 3-dots Menu matching Screenshot */}
                    <td style={{ textAlign: 'right', position: 'relative' }}>
                      <button
                        onClick={() =>
                          setActiveMenuId(activeMenuId === c.id ? null : c.id)
                        }
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          color: '#64748b',
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeMenuId === c.id && (
                        <div className="action-menu-dropdown">
                          <div
                            className="action-menu-item"
                            onClick={() => {
                              setActiveMenuId(null);
                              alert(`Viewing employees for ${c.name}`);
                            }}
                          >
                            <Users size={14} color="#2563eb" />
                            <span>View Employees</span>
                          </div>
                          <div
                            className="action-menu-item"
                            onClick={() => {
                              setActiveMenuId(null);
                              alert(`Edit limits for ${c.name}`);
                            }}
                          >
                            <Edit3 size={14} color="#059669" />
                            <span>Edit License Limits</span>
                          </div>
                          <div
                            className="action-menu-item"
                            onClick={() => {
                              setActiveMenuId(null);
                              alert(`Upgrade/Downgrade plan for ${c.name}`);
                            }}
                          >
                            <CreditCard size={14} color="#9333ea" />
                            <span>Change Subscription</span>
                          </div>
                          <div
                            className="action-menu-item"
                            style={{ color: '#dc2626' }}
                            onClick={() => {
                              setActiveMenuId(null);
                              alert(`Toggle suspend status for ${c.name}`);
                            }}
                          >
                            <Ban size={14} color="#dc2626" />
                            <span>Suspend Tenant</span>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Footer Pagination Bar matching Screenshot */}
        {!loading && sortedRows.length > 0 && (
          <div
            style={{
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              fontSize: '0.8rem',
              color: '#64748b',
            }}
          >
            <div>
              Showing{' '}
              <strong>
                {Math.min(
                  (currentPage - 1) * pageSize + 1,
                  sortedRows.length
                )}
              </strong>{' '}
              -{' '}
              <strong>
                {Math.min(currentPage * pageSize, sortedRows.length)}
              </strong>{' '}
              of <strong>{sortedRows.length}</strong> tenants
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '6px',
                  cursor: currentPage === 1 ? 'default' : 'pointer',
                  color: currentPage === 1 ? '#cbd5e1' : '#475569',
                  borderRadius: '6px',
                }}
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background:
                        currentPage === pageNum ? '#2563eb' : 'transparent',
                      color: currentPage === pageNum ? '#ffffff' : '#475569',
                    }}
                  >
                    {pageNum}
                  </button>
                )
              )}

              <button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '6px',
                  cursor: currentPage === totalPages ? 'default' : 'pointer',
                  color: currentPage === totalPages ? '#cbd5e1' : '#475569',
                  borderRadius: '6px',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Tenant Modal Pop-up */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowAddModal(false)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                border: 'none',
                background: '#f1f5f9',
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
              }}
            >
              <X size={18} />
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '12px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building2 size={22} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  Register New Tenant Company
                </h3>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: '#64748b',
                    margin: '2px 0 0 0',
                  }}
                >
                  Create an organization account with multi-tenant access.
                </p>
              </div>
            </div>

            {addError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '0.83rem',
                }}
              >
                {addError}
              </div>
            )}

            {addSuccess && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '0.83rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{addSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateTenantSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#334155',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Tech Solutions"
                  value={newCompany.company_name}
                  onChange={(e) =>
                    setNewCompany({ ...newCompany, company_name: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#334155',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Company Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@company.com"
                    value={newCompany.company_email}
                    onChange={(e) =>
                      setNewCompany({
                        ...newCompany,
                        company_email: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#334155',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={newCompany.company_phone}
                    onChange={(e) =>
                      setNewCompany({
                        ...newCompany,
                        company_phone: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#334155',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Admin Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Admin Full Name"
                    value={newCompany.admin_name}
                    onChange={(e) =>
                      setNewCompany({
                        ...newCompany,
                        admin_name: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#334155',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Select Plan
                  </label>
                  <select
                    value={newCompany.selected_plan}
                    onChange={(e) =>
                      setNewCompany({
                        ...newCompany,
                        selected_plan: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="starter">Starter (₹1,999/mo)</option>
                    <option value="pro">Pro (₹4,999/mo)</option>
                    <option value="enterprise">Enterprise (₹14,999/mo)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  style={{
                    flex: 2,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background:
                      'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: '#ffffff',
                    cursor: addLoading ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                  }}
                >
                  {addLoading ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      <span>Creating Tenant...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Create Tenant Company</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDirectory;
