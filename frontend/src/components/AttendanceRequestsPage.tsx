import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Calendar,
  Building2,
  RefreshCw,
  Filter,
  RotateCcw,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  User,
  Sparkles,
  FileSearch
} from 'lucide-react';
import { AuthResponse } from '../services/api';

const API = '/api/v1';

interface Props {
  authData: AuthResponse;
}

interface Company {
  id: string;
  name: string;
  total_employees?: number;
}

interface AttendanceRequest {
  id: number;
  tenant_id: string;
  company_name: string;
  emp_id: string;
  name: string;
  avatar_url?: string;
  request_type: string;
  from_date: string;
  to_date: string;
  status: 'Approved' | 'Pending' | 'Rejected' | string;
  requested_on: string;
  reason: string;
}

// Fallback high-fidelity sample requests for live demonstration when DB returns zero
const DEMO_REQUESTS: AttendanceRequest[] = [
  {
    id: 101,
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    emp_id: 'SEA3893',
    name: 'Rajeev Kumar',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    request_type: 'Regularization',
    from_date: '09/12/2026',
    to_date: '09/12/2026',
    status: 'Approved',
    requested_on: '09/12/2026 09:30 AM',
    reason: 'Biometric device camera misread entry frame'
  },
  {
    id: 102,
    tenant_id: 'web-102',
    company_name: 'Webtunix Solutions',
    emp_id: 'WEB2549',
    name: 'Pavitarta Chadha',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    request_type: 'WFH Request',
    from_date: '09/14/2026',
    to_date: '09/15/2026',
    status: 'Approved',
    requested_on: '09/13/2026 04:15 PM',
    reason: 'Working remotely for client architecture deployment'
  },
  {
    id: 103,
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    emp_id: 'SEA2080',
    name: 'Ramanjeet Singh',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    request_type: 'Manual Punch',
    from_date: '09/11/2026',
    to_date: '09/11/2026',
    status: 'Pending',
    requested_on: '09/11/2026 06:45 PM',
    reason: 'Off-site server maintenance at data center'
  },
  {
    id: 104,
    tenant_id: 'sun-103',
    company_name: 'Sunrise Enterprises',
    emp_id: 'SUN1940',
    name: 'Abhishek Vasudev',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    request_type: 'Casual Leave',
    from_date: '09/10/2026',
    to_date: '09/10/2026',
    status: 'Rejected',
    requested_on: '09/09/2026 11:20 AM',
    reason: 'Personal urgent work'
  }
];

export function AttendanceRequestsPage({ authData }: Props) {
  const [loading, setLoading] = useState<boolean>(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  // Filters State matching screenshot
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('');
  const [appliedDateRange, setAppliedDateRange] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('Approved'); // Matches screenshot default ("Approved")
  const [appliedStatusFilter, setAppliedStatusFilter] = useState<string>('Approved');

  // Requests Data
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [useDemoData, setUseDemoData] = useState<boolean>(false);

  // Selected Table Checkboxes
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Detail Modal State
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);

  const isSuperAdmin =
    (authData.user?.role || '').toLowerCase().includes('super') || authData.user?.email === 'admin@seasia.com';
  const token = authData.tokens?.access_token;

  // 1. Fetch Companies for Dropdown Select
  useEffect(() => {
    if (isSuperAdmin && token) {
      fetch(`${API.replace('/auth', '')}/billing/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(d => {
          if (d.success && Array.isArray(d.companies)) {
            setCompanies([
              { id: 'ALL', name: 'All Companies' },
              ...d.companies.filter(
                (c: Company) =>
                  c.name?.toLowerCase() !== 'saas attend-ai platform hq'
              )
            ]);
          } else {
            setCompanies([
              { id: 'ALL', name: 'All Companies' },
              { id: 'sea-101', name: 'Seasia Infotech' },
              { id: 'web-102', name: 'Webtunix Solutions' },
              { id: 'sun-103', name: 'Sunrise Enterprises' }
            ]);
          }
        })
        .catch(() => {
          setCompanies([
            { id: 'ALL', name: 'All Companies' },
            { id: 'sea-101', name: 'Seasia Infotech' },
            { id: 'web-102', name: 'Webtunix Solutions' },
            { id: 'sun-103', name: 'Sunrise Enterprises' }
          ]);
        });
    } else {
      setCompanies([
        { id: authData.user?.tenant_id || 'my-tenant', name: authData.tenant?.name || 'My Company' }
      ]);
      setSelectedCompanyId(authData.user?.tenant_id || 'my-tenant');
    }
  }, [isSuperAdmin, token, authData]);

  // 2. Fetch Requests from Backend API
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedCompanyId && selectedCompanyId !== 'ALL') q.append('tenant_id', selectedCompanyId);
      if (appliedStatusFilter && appliedStatusFilter !== 'All Status') q.append('status', appliedStatusFilter);
      if (appliedSearch) q.append('search', appliedSearch);

      const res = await fetch(`${API}/requests/all?${q.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.requests) && data.requests.length > 0) {
          setRequests(data.requests);
          setUseDemoData(false);
        } else {
          // If DB has 0 items, check if user switched filters or demo mode
          if (useDemoData) {
            setRequests(DEMO_REQUESTS);
          } else {
            setRequests([]);
          }
        }
      } else {
        setRequests(useDemoData ? DEMO_REQUESTS : []);
      }
    } catch (e) {
      console.error(e);
      setRequests(useDemoData ? DEMO_REQUESTS : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedCompanyId, appliedStatusFilter, appliedSearch, useDemoData]);

  // Apply Filter Handler
  const handleApplyFilters = () => {
    setAppliedSearch(searchQuery);
    setAppliedDateRange(dateRange);
    setAppliedStatusFilter(statusFilter);
    setCurrentPage(1);
  };

  // Reset Filter Handler
  const handleResetFilters = () => {
    setSearchQuery('');
    setAppliedSearch('');
    setDateRange('');
    setAppliedDateRange('');
    setStatusFilter('Approved');
    setAppliedStatusFilter('Approved');
    setCurrentPage(1);
  };

  // Compute Filtered Requests list
  const filteredRequests = useMemo(() => {
    let source = requests;

    // Filter by Company dropdown if selected
    if (selectedCompanyId !== 'ALL') {
      source = source.filter(r => r.tenant_id === selectedCompanyId);
    }

    // Filter by Search Query
    if (appliedSearch.trim() !== '') {
      const query = appliedSearch.toLowerCase();
      source = source.filter(
        r =>
          r.name.toLowerCase().includes(query) ||
          r.emp_id.toLowerCase().includes(query) ||
          r.company_name.toLowerCase().includes(query) ||
          r.request_type.toLowerCase().includes(query)
      );
    }

    // Filter by Status
    if (appliedStatusFilter !== 'All Status' && appliedStatusFilter !== 'All') {
      source = source.filter(
        r => r.status.toLowerCase() === appliedStatusFilter.toLowerCase()
      );
    }

    return source;
  }, [requests, selectedCompanyId, appliedSearch, appliedStatusFilter]);

  // KPI Metrics Calculations (Total, Approved, Rejected, Pending & Percentages)
  const totalCount = requests.length;
  const approvedCount = requests.filter(r => r.status.toLowerCase() === 'approved').length;
  const rejectedCount = requests.filter(r => r.status.toLowerCase() === 'rejected').length;
  const pendingCount = requests.filter(r => r.status.toLowerCase() === 'pending').length;

  const approvedPct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const rejectedPct = totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0;
  const pendingPct = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredRequests.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Bulk Actions
  const handleBulkAction = async (newStatus: 'Approved' | 'Rejected') => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      await fetch(`${API}/requests/bulk-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ids: selectedIds, status: newStatus.toLowerCase() })
      });
      // Locally update state for immediate feedback
      setRequests(prev =>
        prev.map(r => (selectedIds.includes(r.id) ? { ...r, status: newStatus } : r))
      );
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Single Review Action
  const handleSingleReview = async (id: number, newStatus: 'Approved' | 'Rejected') => {
    try {
      setRequests(prev =>
        prev.map(r => (r.id === id ? { ...r, status: newStatus } : r))
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Paginated View Slice
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;

  return (
    <div className="req-mgmt-page">
      <style>{`
        .req-mgmt-page {
          flex: 1;
          background: #f4f6fa;
          padding: 28px 36px;
          min-height: 100vh;
          overflow-y: auto;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0f172a;
        }

        /* Top Bar Header */
        .req-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .req-title-wrap h1 {
          font-size: 1.65rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
          letter-spacing: -.3px;
        }
        .req-title-wrap p {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0;
          font-weight: 500;
        }

        .btn-refresh-purple {
          background: #7c3aed;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
          transition: all 0.15s ease;
        }
        .btn-refresh-purple:hover {
          background: #6d28d9;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(124, 58, 237, 0.35);
        }

        /* Filter Controls Bar matching user screenshot */
        .filter-controls-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .filter-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          transition: border-color .15s, box-shadow .15s;
        }
        .filter-card:focus-within {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
        }
        .filter-card-highlight {
          border: 2px solid #ef4444; /* Highlighted in red box matching user screenshot */
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }

        .icon-box-purple {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #f3e8ff;
          color: #7c3aed;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .filter-label-group {
          display: flex;
          flex-direction: column;
        }
        .filter-lbl {
          font-size: 0.68rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .filter-select {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
          cursor: pointer;
          padding-right: 8px;
          font-family: inherit;
        }

        .filter-input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.88rem;
          font-weight: 600;
          color: #0f172a;
          width: 200px;
          font-family: inherit;
        }

        /* Action Buttons Apply & Reset */
        .btn-apply {
          background: #7c3aed;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.2);
          transition: all 0.15s ease;
        }
        .btn-apply:hover {
          background: #6d28d9;
        }

        .btn-reset {
          background: #ffffff;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          transition: all 0.15s ease;
        }
        .btn-reset:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        /* Quick Metrics Cards (4 Row Grid) */
        .kpi-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 18px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          transition: transform .15s;
        }
        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.04);
        }

        .kpi-icon-wrap {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: justify;
          justify-content: center;
          flex-shrink: 0;
        }

        .kpi-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 4px;
        }
        .kpi-val {
          font-size: 1.75rem;
          font-weight: 900;
          color: #0f172a;
          line-height: 1;
        }

        .kpi-pill-badge {
          font-size: 0.76rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
        }

        /* Attendance Requests Table Container Card */
        .table-container-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
        }

        .table-header-bar {
          padding: 18px 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .table-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
        }

        .table-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-bulk-approve {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.84rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
        }
        .btn-bulk-approve:hover:not(:disabled) {
          background: #dcfce7;
        }
        .btn-bulk-approve:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f8fafc;
          color: #94a3b8;
          border-color: #e2e8f0;
        }

        .btn-bulk-reject {
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fca5a5;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.84rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
        }
        .btn-bulk-reject:hover:not(:disabled) {
          background: #fee2e2;
        }
        .btn-bulk-reject:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f8fafc;
          color: #94a3b8;
          border-color: #e2e8f0;
        }

        /* Requests Table */
        .req-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .req-table th {
          background: #f8fafc;
          color: #475569;
          padding: 14px 20px;
          font-size: 0.8rem;
          font-weight: 800;
          border-bottom: 1px solid #e2e8f0;
          letter-spacing: 0.01em;
        }

        .req-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          font-size: 0.86rem;
          color: #334155;
        }
        .req-table tr:hover td {
          background: #f8fafc;
        }

        .user-info-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          color: #0f172a;
        }
        .user-avatar-sm {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid #cbd5e1;
        }

        /* Status Pills */
        .status-pill-approved {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .status-pill-pending {
          background: #fef3c7;
          color: #b45309;
          border: 1px solid #fde68a;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .status-pill-rejected {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* Empty State matching screenshot */
        .empty-state-card {
          padding: 80px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .empty-illustration {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #f3e8ff;
          color: #7c3aed;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 8px 24px rgba(124, 58, 237, 0.15);
        }
        .empty-state-card h3 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px 0;
        }
        .empty-state-card p {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0 0 16px 0;
          max-width: 440px;
        }

        /* Pagination Footer */
        .pagination-footer {
          padding: 16px 24px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
        }
        .pagination-left {
          font-size: 0.85rem;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .page-select {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 4px 8px;
          font-weight: 700;
          color: #0f172a;
          outline: none;
        }

        .pagination-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-page {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.15s;
        }
        .btn-page:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }
        .btn-page:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      {/* Top Header Row */}
      <div className="req-header">
        <div className="req-title-wrap">
          <h1>Attendance Request Management</h1>
          <p>Review and manage employee attendance requests across multiple companies (tenants).</p>
        </div>

        <button
          className="btn-refresh-purple"
          onClick={() => {
            fetchRequests();
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Control Bar matching User Screenshot */}
      <div className="filter-controls-row">
        {/* 1. Company (Tenant) Dropdown Card (Highlighted in red box in user screenshot) */}
        <div className={`filter-card ${isSuperAdmin ? 'filter-card-highlight' : ''}`}>
          <div className="icon-box-purple">
            <Building2 size={18} />
          </div>
          <div className="filter-label-group">
            <span className="filter-lbl">Company (Tenant)</span>
            <select
              className="filter-select"
              value={selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value)}
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Search Box */}
        <div className="filter-card">
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            className="filter-input"
            placeholder="Search by name, ID, or date..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
          />
        </div>

        {/* 3. Date Range Picker */}
        <div className="filter-card">
          <Calendar size={18} color="#94a3b8" />
          <input
            type="text"
            className="filter-input"
            style={{ width: 170 }}
            placeholder="mm/dd/yyyy - mm/dd/yyyy"
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
          />
          <Calendar size={16} color="#94a3b8" />
        </div>

        {/* 4. Status Filter Dropdown */}
        <div className="filter-card">
          <Filter size={18} color="#475569" />
          <div className="filter-label-group">
            <span className="filter-lbl">Status</span>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All Status">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* 5. Apply Button */}
        <button className="btn-apply" onClick={handleApplyFilters}>
          <Filter size={15} />
          <span>Apply</span>
        </button>

        {/* 6. Reset Button */}
        <button className="btn-reset" onClick={handleResetFilters}>
          <RotateCcw size={15} />
          <span>Reset</span>
        </button>

        {/* Toggle Demo Data Button for Testing */}
        <button
          onClick={() => setUseDemoData(!useDemoData)}
          style={{
            marginLeft: 'auto',
            background: useDemoData ? '#f3e8ff' : '#ffffff',
            border: '1px solid #cbd5e1',
            color: useDemoData ? '#7c3aed' : '#64748b',
            padding: '8px 14px',
            borderRadius: 10,
            fontSize: '.78rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Sparkles size={14} />
          {useDemoData ? 'Demo Data Active' : 'Toggle Demo Records'}
        </button>
      </div>

      {/* Top 4 KPI Quick Metric Cards Bar */}
      <div className="kpi-cards-grid">
        {/* Card 1: Total Requests */}
        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="kpi-icon-wrap" style={{ background: '#f3e8ff', color: '#8b5cf6' }}>
              <FileText size={20} />
            </div>
            <div>
              <div className="kpi-title">Total Requests</div>
              <div className="kpi-val">{totalCount}</div>
            </div>
          </div>
          <span className="kpi-pill-badge" style={{ background: '#f3e8ff', color: '#8b5cf6' }}>
            100%
          </span>
        </div>

        {/* Card 2: Approved */}
        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="kpi-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div className="kpi-title">Approved</div>
              <div className="kpi-val" style={{ color: '#16a34a' }}>
                {approvedCount}
              </div>
            </div>
          </div>
          <span className="kpi-pill-badge" style={{ background: '#dcfce7', color: '#16a34a' }}>
            {approvedPct}%
          </span>
        </div>

        {/* Card 3: Rejected */}
        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="kpi-icon-wrap" style={{ background: '#fee2e2', color: '#ef4444' }}>
              <XCircle size={22} />
            </div>
            <div>
              <div className="kpi-title">Rejected</div>
              <div className="kpi-val" style={{ color: '#ef4444' }}>
                {rejectedCount}
              </div>
            </div>
          </div>
          <span className="kpi-pill-badge" style={{ background: '#fee2e2', color: '#ef4444' }}>
            {rejectedPct}%
          </span>
        </div>

        {/* Card 4: Pending */}
        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="kpi-icon-wrap" style={{ background: '#fef3c7', color: '#f59e0b' }}>
              <Clock size={22} />
            </div>
            <div>
              <div className="kpi-title">Pending</div>
              <div className="kpi-val" style={{ color: '#f59e0b' }}>
                {pendingCount}
              </div>
            </div>
          </div>
          <span className="kpi-pill-badge" style={{ background: '#fef3c7', color: '#f59e0b' }}>
            {pendingPct}%
          </span>
        </div>
      </div>

      {/* Main Attendance Requests Table Container */}
      <div className="table-container-card">
        {/* Table Header Bar */}
        <div className="table-header-bar">
          <div className="table-header-title">
            <div className="icon-box-purple" style={{ width: 32, height: 32 }}>
              <FileText size={18} />
            </div>
            <span>Attendance Requests</span>
          </div>

          <div className="table-header-actions">
            <button
              className="btn-bulk-approve"
              disabled={selectedIds.length === 0}
              onClick={() => handleBulkAction('Approved')}
            >
              <Check size={16} />
              <span>Approve Selected</span>
            </button>
            <button
              className="btn-bulk-reject"
              disabled={selectedIds.length === 0}
              onClick={() => handleBulkAction('Rejected')}
            >
              <X size={16} />
              <span>Reject Selected</span>
            </button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        {/* Table Data or Empty State */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" color="#7c3aed" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ fontWeight: 700, fontSize: '.95rem' }}>Loading attendance requests...</div>
          </div>
        ) : filteredRequests.length === 0 ? (
          /* Empty State View matching user screenshot */
          <div className="empty-state-card">
            <div className="empty-illustration">
              <FileSearch size={38} />
            </div>
            <h3>No requests found</h3>
            <p>
              {appliedStatusFilter !== 'All Status'
                ? `There are no ${appliedStatusFilter.toLowerCase()} attendance requests at the moment.`
                : 'There are no attendance requests matching your filters.'}
            </p>
          </div>
        ) : (
          <table className="req-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={
                      paginatedRequests.length > 0 &&
                      paginatedRequests.every(r => selectedIds.includes(r.id))
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th style={{ width: 50 }}>#</th>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Company (Tenant)</th>
                <th>Request Type</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Status</th>
                <th>Requested On</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.map((req, idx) => {
                const isSelected = selectedIds.includes(req.id);
                return (
                  <tr key={req.id} style={{ background: isSelected ? '#faf5ff' : 'transparent' }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(req.id)}
                      />
                    </td>
                    <td style={{ color: '#64748b', fontWeight: 600 }}>
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td>
                      <div className="user-info-cell">
                        {req.avatar_url ? (
                          <img src={req.avatar_url} alt="" className="user-avatar-sm" />
                        ) : (
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: '#f1f5f9',
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <User size={16} />
                          </div>
                        )}
                        <span>{req.name}</span>
                      </div>
                    </td>
                    <td style={{ color: '#64748b', fontWeight: 600 }}>{req.emp_id}</td>
                    <td style={{ fontWeight: 600, color: '#334155' }}>{req.company_name}</td>
                    <td>
                      <span
                        style={{
                          background: '#f1f5f9',
                          color: '#334155',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: '0.78rem'
                        }}
                      >
                        {req.request_type}
                      </span>
                    </td>
                    <td style={{ color: '#475569', fontWeight: 600 }}>{req.from_date}</td>
                    <td style={{ color: '#475569', fontWeight: 600 }}>{req.to_date}</td>
                    <td>
                      <span
                        className={
                          req.status.toLowerCase() === 'approved'
                            ? 'status-pill-approved'
                            : req.status.toLowerCase() === 'rejected'
                            ? 'status-pill-rejected'
                            : 'status-pill-pending'
                        }
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background:
                              req.status.toLowerCase() === 'approved'
                                ? '#16a34a'
                                : req.status.toLowerCase() === 'rejected'
                                ? '#dc2626'
                                : '#d97706'
                          }}
                        />
                        {req.status}
                      </span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 500 }}>
                      {req.requested_on}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <button
                          title="Approve Request"
                          onClick={() => handleSingleReview(req.id, 'Approved')}
                          style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            border: 'none',
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          title="Reject Request"
                          onClick={() => handleSingleReview(req.id, 'Rejected')}
                          style={{
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: 'none',
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <X size={14} />
                        </button>
                        <button
                          title="View Details"
                          onClick={() => setSelectedRequest(req)}
                          style={{
                            background: '#f3e8ff',
                            color: '#7c3aed',
                            border: 'none',
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Table Pagination Footer */}
        <div className="pagination-footer">
          <div className="pagination-left">
            <span>Show</span>
            <select
              className="page-select"
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div className="pagination-right">
            <button
              className="btn-page"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', padding: '0 8px' }}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              className="btn-page"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Request Details Inspector Modal */}
      {selectedRequest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={() => setSelectedRequest(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={18} color="#7c3aed" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Attendance Request Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                {selectedRequest.avatar_url ? (
                  <img
                    src={selectedRequest.avatar_url}
                    alt=""
                    style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <User size={24} />
                  </div>
                )}
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedRequest.name}
                  </h4>
                  <div style={{ fontSize: '.84rem', color: '#64748b', fontWeight: 600 }}>
                    ID: {selectedRequest.emp_id} • {selectedRequest.company_name}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: 12,
                  padding: 16,
                  border: '1px solid #e2e8f0',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 18
                }}
              >
                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#64748b' }}>REQUEST TYPE</div>
                  <div style={{ fontSize: '.9rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {selectedRequest.request_type}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#64748b' }}>STATUS</div>
                  <div style={{ fontSize: '.9rem', fontWeight: 800, color: '#7c3aed', marginTop: 2 }}>
                    {selectedRequest.status}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#64748b' }}>FROM DATE</div>
                  <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#334155', marginTop: 2 }}>
                    {selectedRequest.from_date}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#64748b' }}>TO DATE</div>
                  <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#334155', marginTop: 2 }}>
                    {selectedRequest.to_date}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '.75rem', fontWeight: 800, color: '#64748b', marginBottom: 4 }}>
                  REASON / REMARKS
                </div>
                <div
                  style={{
                    fontSize: '.88rem',
                    color: '#334155',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: 12
                  }}
                >
                  {selectedRequest.reason || 'No remarks provided.'}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '12px 20px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10
              }}
            >
              <button
                onClick={() => {
                  handleSingleReview(selectedRequest.id, 'Approved');
                  setSelectedRequest(null);
                }}
                style={{
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Approve
              </button>

              <button
                onClick={() => {
                  handleSingleReview(selectedRequest.id, 'Rejected');
                  setSelectedRequest(null);
                }}
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceRequestsPage;
