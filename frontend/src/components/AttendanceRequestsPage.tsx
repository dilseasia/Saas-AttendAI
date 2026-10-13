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
  ChevronLeft,
  ChevronRight,
  User,
  Sparkles,
  FileSearch,
  Plus,
  Briefcase,
  Home,
  CalendarDays
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

interface EmployeeOption {
  emp_id: string;
  name: string;
  company_name?: string;
  tenant_id?: string;
}

interface AttendanceRequest {
  id: number;
  tenant_id: string;
  company_name: string;
  emp_id: string;
  name: string;
  avatar_url?: string;
  request_type: string;
  source_type?: 'attendance' | 'leave';
  from_date: string;
  to_date?: string;
  in_time?: string;
  out_time?: string;
  status: 'Approved' | 'Pending' | 'Rejected' | string;
  requested_on: string;
  reason: string;
  remarks?: string;
}

interface RequestStats {
  total: number;
  approved: number;
  approved_pct: number;
  rejected: number;
  rejected_pct: number;
  pending: number;
  pending_pct: number;
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
    request_type: 'Manual Entry',
    source_type: 'attendance',
    from_date: '2026-10-13',
    to_date: '2026-10-13',
    in_time: '09:30 AM',
    out_time: '06:30 PM',
    status: 'Approved',
    requested_on: '10/13/2026 09:30 AM',
    reason: 'Biometric device camera misread entry frame'
  },
  {
    id: 102,
    tenant_id: 'web-102',
    company_name: 'Webtunix Solutions',
    emp_id: 'WEB2549',
    name: 'Pavitarta Chadha',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    request_type: 'WFH',
    source_type: 'attendance',
    from_date: '2026-10-14',
    to_date: '2026-10-15',
    in_time: '09:00 AM',
    out_time: '06:00 PM',
    status: 'Approved',
    requested_on: '10/13/2026 04:15 PM',
    reason: 'Working remotely for client architecture deployment'
  },
  {
    id: 103,
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    emp_id: 'SEA2080',
    name: 'Gurpreet Singh',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    request_type: 'Casual Leave (CL)',
    source_type: 'leave',
    from_date: '2026-10-16',
    to_date: '2026-10-16',
    status: 'Pending',
    requested_on: '10/13/2026 11:20 AM',
    reason: 'Family occasion'
  }
];

export function AttendanceRequestsPage({ authData }: Props) {
  const [loading, setLoading] = useState<boolean>(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  // Request Type Tab Filter ('all' | 'manual' | 'wfh' | 'leave')
  const [selectedTypeTab, setSelectedTypeTab] = useState<string>('all');

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('');
  const [appliedDateRange, setAppliedDateRange] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All Status');
  const [appliedStatusFilter, setAppliedStatusFilter] = useState<string>('All Status');

  // Requests Data
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [apiStats, setApiStats] = useState<RequestStats | null>(null);
  const [useDemoData, setUseDemoData] = useState<boolean>(false);

  // Selected Table Checkboxes
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Detail Modal State
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);

  // Apply Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [applyType, setApplyType] = useState<'manual' | 'wfh' | 'leave'>('manual');
  const [applyCompanyId, setApplyCompanyId] = useState<string>('');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [applyEmpId, setApplyEmpId] = useState<string>('');
  const [applyDate, setApplyDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [applyToDate, setApplyToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [applyInTime, setApplyInTime] = useState<string>('09:30');
  const [applyOutTime, setApplyOutTime] = useState<string>('18:30');
  const [applyLeaveType, setApplyLeaveType] = useState<string>('CL');
  const [applyReason, setApplyReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const isSuperAdmin =
    (authData.user?.role || '').toLowerCase().includes('super') || authData.user?.email === 'admin@seasia.com';
  const token = authData.tokens?.access_token;

  // 1. Fetch Companies for Dropdown Select
  useEffect(() => {
    if (isSuperAdmin && token) {
      setCompanies([
        { id: 'ALL', name: 'All Companies' },
        { id: '2d2506a2-e75f-47c7-a880-3f911e702b4e', name: 'Moogle Labs' },
        { id: '88c18b1c-4015-478d-adfa-7030e11beacb', name: 'OpenSource' },
        { id: '35dc9aa2-18e4-489c-aa53-df21f4e3cf8f', name: 'Seasia Infotech' },
      ]);
    } else {
      const tenantId = authData.user?.tenant_id || 'my-tenant';
      const tenantName = authData.tenant?.name || 'My Company';
      setCompanies([{ id: tenantId, name: tenantName }]);
      setSelectedCompanyId(tenantId);
    }
  }, [isSuperAdmin, token, authData]);

  // Sync applyCompanyId with selectedCompanyId or first valid company
  useEffect(() => {
    if (companies.length > 0) {
      if (selectedCompanyId && selectedCompanyId !== 'ALL') {
        setApplyCompanyId(selectedCompanyId);
      } else if (!applyCompanyId) {
        const firstValid = companies.find(c => c.id !== 'ALL');
        if (firstValid) setApplyCompanyId(firstValid.id);
      }
    }
  }, [companies, selectedCompanyId]);

  // 2. Fetch Employees for Apply Modal Dropdown
  useEffect(() => {
    const fetchEmployeesList = async () => {
      try {
        const res = await fetch(`${API}/billing/superadmin/employees`);
        if (res.ok) {
          const data = await res.json();
          if (data.employees && Array.isArray(data.employees)) {
            const list = data.employees.map((e: any) => ({
              emp_id: e.emp_id,
              name: e.name,
              company_name: e.company_name,
              tenant_id: e.tenant_id,
            }));
            setEmployees(list);
          }
        }
      } catch (err) {
        console.error('Error fetching employees list:', err);
      }
    };
    fetchEmployeesList();
  }, []);

  // Filter employees for the apply modal by chosen company
  const filteredModalEmployees = useMemo(() => {
    if (!applyCompanyId || applyCompanyId === 'ALL') {
      return employees;
    }
    return employees.filter(emp => emp.tenant_id === applyCompanyId);
  }, [employees, applyCompanyId]);

  // Keep applyEmpId in sync with the filtered list
  useEffect(() => {
    if (filteredModalEmployees.length > 0) {
      if (!filteredModalEmployees.some(e => e.emp_id === applyEmpId)) {
        setApplyEmpId(filteredModalEmployees[0].emp_id);
      }
    } else {
      setApplyEmpId('');
    }
  }, [filteredModalEmployees, applyEmpId]);

  // 3. Fetch Requests from Backend API
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedCompanyId && selectedCompanyId !== 'ALL') q.append('tenant_id', selectedCompanyId);
      if (appliedStatusFilter && appliedStatusFilter !== 'All Status') q.append('status', appliedStatusFilter);
      if (selectedTypeTab && selectedTypeTab !== 'all') q.append('type', selectedTypeTab);
      if (appliedSearch) q.append('search', appliedSearch);

      const res = await fetch(`${API}/requests/all?${q.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.requests)) {
          if (data.requests.length > 0) {
            setRequests(data.requests);
            setUseDemoData(false);
          } else {
            setRequests(useDemoData ? DEMO_REQUESTS : []);
          }
          if (data.stats) {
            setApiStats(data.stats);
          }
        } else {
          setRequests(useDemoData ? DEMO_REQUESTS : []);
        }
      } else {
        setRequests(useDemoData ? DEMO_REQUESTS : []);
      }
    } catch (e) {
      console.error('Error fetching attendance requests:', e);
      setRequests(useDemoData ? DEMO_REQUESTS : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedCompanyId, appliedStatusFilter, selectedTypeTab, appliedSearch, useDemoData]);

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
    setStatusFilter('All Status');
    setAppliedStatusFilter('All Status');
    setSelectedTypeTab('all');
    setCurrentPage(1);
  };

  // Filtered Requests slice for local searching if needed
  const filteredRequests = useMemo(() => {
    let source = requests;

    if (selectedCompanyId !== 'ALL') {
      source = source.filter(r => r.tenant_id === selectedCompanyId);
    }

    if (selectedTypeTab !== 'all') {
      const tab = selectedTypeTab.toLowerCase();
      source = source.filter(r => {
        const rt = (r.request_type || '').toLowerCase();
        if (tab === 'manual') return rt.includes('manual');
        if (tab === 'wfh') return rt.includes('wfh');
        if (tab === 'leave') return r.source_type === 'leave' || rt.includes('leave');
        return true;
      });
    }

    if (appliedSearch.trim() !== '') {
      const query = appliedSearch.toLowerCase();
      source = source.filter(
        r =>
          r.name.toLowerCase().includes(query) ||
          r.emp_id.toLowerCase().includes(query) ||
          (r.company_name || '').toLowerCase().includes(query) ||
          r.request_type.toLowerCase().includes(query)
      );
    }

    if (appliedStatusFilter !== 'All Status' && appliedStatusFilter !== 'All') {
      source = source.filter(
        r => r.status.toLowerCase() === appliedStatusFilter.toLowerCase()
      );
    }

    return source;
  }, [requests, selectedCompanyId, selectedTypeTab, appliedSearch, appliedStatusFilter]);

  // KPI Metrics Calculations
  const totalCount = apiStats ? apiStats.total : requests.length;
  const approvedCount = apiStats
    ? apiStats.approved
    : requests.filter(r => r.status.toLowerCase() === 'approved').length;
  const rejectedCount = apiStats
    ? apiStats.rejected
    : requests.filter(r => r.status.toLowerCase() === 'rejected').length;
  const pendingCount = apiStats
    ? apiStats.pending
    : requests.filter(r => r.status.toLowerCase() === 'pending').length;

  const approvedPct = apiStats
    ? apiStats.approved_pct
    : totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const rejectedPct = apiStats
    ? apiStats.rejected_pct
    : totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0;
  const pendingPct = apiStats
    ? apiStats.pending_pct
    : totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;

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
      const res = await fetch(`${API}/requests/bulk-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ids: selectedIds,
          status: newStatus.toLowerCase(),
          remarks: `Bulk reviewed as ${newStatus}`
        })
      });

      if (res.ok) {
        setToastMsg(`${selectedIds.length} request(s) marked as ${newStatus}!`);
        setTimeout(() => setToastMsg(null), 3000);
        setSelectedIds([]);
        fetchRequests();
      }
    } catch (e) {
      console.error('Error during bulk review:', e);
    } finally {
      setLoading(false);
    }
  };

  // Single Review Action
  const handleSingleReview = async (id: number, newStatus: 'Approved' | 'Rejected', sourceType?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/requests/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id,
          status: newStatus.toLowerCase(),
          source_type: sourceType || 'attendance',
          remarks: `Reviewed as ${newStatus}`
        })
      });

      if (res.ok) {
        setToastMsg(`Request #${id} marked as ${newStatus}!`);
        setTimeout(() => setToastMsg(null), 3000);
        fetchRequests();
      }
    } catch (e) {
      console.error('Error reviewing request:', e);
    } finally {
      setLoading(false);
    }
  };

  // Submit New Request
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyReason.trim()) {
      alert('Please enter a reason for your request.');
      return;
    }
    setSubmitting(true);
    try {
      let reqTypePayload = 'manual_entry';
      if (applyType === 'wfh') reqTypePayload = 'wfh';
      if (applyType === 'leave') reqTypePayload = 'leave';

      const body: any = {
        tenant_id: applyCompanyId || undefined,
        emp_id: applyEmpId || undefined,
        request_type: reqTypePayload,
        request_date: applyDate,
        reason: applyReason,
      };

      if (applyType === 'manual') {
        body.in_time = applyInTime;
        body.out_time = applyOutTime;
      } else if (applyType === 'wfh') {
        body.to_date = applyToDate;
        body.in_time = applyInTime;
        body.out_time = applyOutTime;
      } else if (applyType === 'leave') {
        body.to_date = applyToDate;
        body.leave_type = applyLeaveType;
      }

      const res = await fetch(`${API}/requests/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setToastMsg('Request submitted successfully!');
        setIsApplyModalOpen(false);
        setApplyReason('');
        fetchRequests();
        setTimeout(() => setToastMsg(null), 3500);
      } else {
        const err = await res.json();
        alert(err.detail || err.message || 'Failed to submit request');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting request');
    } finally {
      setSubmitting(false);
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

        .header-actions-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-new-request {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          color: #ffffff;
          border: none;
          padding: 10px 22px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
          transition: all 0.15s ease;
        }
        .btn-new-request:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(124, 58, 237, 0.45);
        }

        .btn-refresh-purple {
          background: #ffffff;
          color: #6d28d9;
          border: 1px solid #ddd6fe;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          transition: all 0.15s ease;
        }
        .btn-refresh-purple:hover {
          background: #f5f3ff;
          border-color: #c4b5fd;
        }

        /* Module Tabs: All | Manual Entry | WFH | Leaves */
        .type-tabs-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          background: #e2e8f0;
          padding: 4px;
          border-radius: 12px;
          width: fit-content;
        }
        .type-tab-btn {
          border: none;
          background: transparent;
          color: #475569;
          font-weight: 700;
          font-size: 0.84rem;
          padding: 8px 18px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          transition: all 0.15s ease;
        }
        .type-tab-btn.active {
          background: #ffffff;
          color: #7c3aed;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
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
          border: 2px solid #ef4444;
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

        /* Type Badges */
        .badge-type-manual {
          background: #f3e8ff;
          color: #7c3aed;
          border: 1px solid #e9d5ff;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.78rem;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .badge-type-wfh {
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.78rem;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .badge-type-leave {
          background: #fffbeb;
          color: #d97706;
          border: 1px solid #fde68a;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.78rem;
          display: inline-flex;
          align-items: center;
          gap: 5px;
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

        /* Empty State */
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

        /* Modal backdrop & container */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-card {
          background: #ffffff;
          border-radius: 18px;
          width: 100%;
          max-width: 540px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.18);
          overflow: hidden;
          animation: modalAppear 0.15s ease-out;
        }
        @keyframes modalAppear {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }

        .modal-header {
          padding: 18px 24px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
        }

        .modal-body {
          padding: 24px;
          max-height: 80vh;
          overflow-y: auto;
        }

        /* Segmented Tabs inside Modal */
        .modal-seg-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .modal-seg-btn {
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 700;
          font-size: 0.8rem;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s;
        }
        .modal-seg-btn.active {
          background: #ffffff;
          color: #7c3aed;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }

        .form-group {
          margin-bottom: 16px;
        }
        .form-lbl {
          display: block;
          font-size: 0.78rem;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          margin-bottom: 6px;
        }
        .form-input, .form-select, .form-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 0.88rem;
          font-weight: 600;
          color: #0f172a;
          outline: none;
          background: #ffffff;
          transition: border-color 0.15s, box-shadow 0.15s;
          font-family: inherit;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
        }

        .toast-banner {
          position: fixed;
          top: 24px;
          right: 32px;
          background: #0f172a;
          color: #ffffff;
          padding: 12px 22px;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          z-index: 1000;
          font-weight: 700;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: slideIn 0.2s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="toast-banner">
          <CheckCircle2 size={18} color="#22c55e" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header Row */}
      <div className="req-header">
        <div className="req-title-wrap">
          <h1>Attendance Request Management</h1>
          <p>Streamlined review and approvals for Leaves, Work From Home (WFH), and Manual Punch Regularizations.</p>
        </div>

        <div className="header-actions-group">
          <button className="btn-new-request" onClick={() => setIsApplyModalOpen(true)}>
            <Plus size={16} />
            <span>Apply Request</span>
          </button>

          <button className="btn-refresh-purple" onClick={fetchRequests}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="type-tabs-bar">
        <button
          className={`type-tab-btn ${selectedTypeTab === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedTypeTab('all')}
        >
          <FileText size={15} />
          <span>All Requests</span>
        </button>
        <button
          className={`type-tab-btn ${selectedTypeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setSelectedTypeTab('manual')}
        >
          <Briefcase size={15} />
          <span>Manual Entry</span>
        </button>
        <button
          className={`type-tab-btn ${selectedTypeTab === 'wfh' ? 'active' : ''}`}
          onClick={() => setSelectedTypeTab('wfh')}
        >
          <Home size={15} />
          <span>WFH (Work From Home)</span>
        </button>
        <button
          className={`type-tab-btn ${selectedTypeTab === 'leave' ? 'active' : ''}`}
          onClick={() => setSelectedTypeTab('leave')}
        >
          <CalendarDays size={15} />
          <span>Leaves (CL/SL/PL)</span>
        </button>
      </div>

      {/* Filter Control Bar matching User Screenshot */}
      <div className="filter-controls-row">
        {/* 1. Company (Tenant) Dropdown Card */}
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
            placeholder="Search by name, ID, or company..."
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
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
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

        {/* Toggle Demo Data Button */}
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
          {useDemoData ? 'Demo Mode Active' : 'Toggle Demo Records'}
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
            <span>
              {selectedTypeTab === 'manual'
                ? 'Manual Regularization Requests'
                : selectedTypeTab === 'wfh'
                ? 'Work From Home (WFH) Requests'
                : selectedTypeTab === 'leave'
                ? 'Leave Applications (CL/SL/PL)'
                : 'All Attendance Requests'}
            </span>
          </div>

          <div className="table-header-actions">
            <button
              className="btn-bulk-approve"
              disabled={selectedIds.length === 0}
              onClick={() => handleBulkAction('Approved')}
            >
              <Check size={16} />
              <span>Approve Selected ({selectedIds.length})</span>
            </button>
            <button
              className="btn-bulk-reject"
              disabled={selectedIds.length === 0}
              onClick={() => handleBulkAction('Rejected')}
            >
              <X size={16} />
              <span>Reject Selected ({selectedIds.length})</span>
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
          <div className="empty-state-card">
            <div className="empty-illustration">
              <FileSearch size={38} />
            </div>
            <h3>No requests found</h3>
            <p>
              {appliedStatusFilter !== 'All Status'
                ? `There are no ${appliedStatusFilter.toLowerCase()} requests matching your filters.`
                : 'There are no attendance or leave requests found. Click "Apply Request" to create a new one.'}
            </p>
            <button className="btn-new-request" onClick={() => setIsApplyModalOpen(true)}>
              <Plus size={16} />
              <span>Create New Request</span>
            </button>
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
                <th>Time / Dates</th>
                <th>Status</th>
                <th>Requested On</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.map((req, idx) => {
                const isSelected = selectedIds.includes(req.id);
                const isWfh = req.request_type.toLowerCase().includes('wfh');
                const isManual = req.request_type.toLowerCase().includes('manual');

                return (
                  <tr key={`${req.source_type || 'att'}-${req.id}`} style={{ background: isSelected ? '#faf5ff' : 'transparent' }}>
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
                        <img
                          src={req.avatar_url || `/api/v1/face/photo/${req.emp_id}?tenant_id=${req.tenant_id}`}
                          alt={req.name}
                          className="user-avatar-sm"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div
                          style={{
                            display: 'none',
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)',
                            color: '#6366f1',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #c7d2fe',
                            flexShrink: 0
                          }}
                        >
                          {req.name.split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'EM'}
                        </div>
                        <span>{req.name}</span>
                      </div>
                    </td>
                    <td style={{ color: '#64748b', fontWeight: 600 }}>{req.emp_id}</td>
                    <td style={{ fontWeight: 600, color: '#334155' }}>{req.company_name}</td>
                    <td>
                      <span
                        className={
                          isWfh
                            ? 'badge-type-wfh'
                            : isManual
                            ? 'badge-type-manual'
                            : 'badge-type-leave'
                        }
                      >
                        {isWfh ? <Home size={12} /> : isManual ? <Briefcase size={12} /> : <CalendarDays size={12} />}
                        {req.request_type}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '.84rem' }}>
                          {req.from_date}
                          {req.to_date && req.to_date !== req.from_date ? ` to ${req.to_date}` : ''}
                        </div>
                        {req.in_time && (
                          <div style={{ fontSize: '.74rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                            {req.in_time} {req.out_time ? `— ${req.out_time}` : ''}
                          </div>
                        )}
                      </div>
                    </td>
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
                        {req.status.toLowerCase() === 'pending' ? (
                          <>
                            <button
                              title="Approve Request"
                              onClick={() => handleSingleReview(req.id, 'Approved', req.source_type)}
                              style={{
                                background: '#dcfce7',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Check size={14} />
                            </button>
                            <button
                              title="Reject Request"
                              onClick={() => handleSingleReview(req.id, 'Rejected', req.source_type)}
                              style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : req.status.toLowerCase() === 'approved' ? (
                          <span
                            style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Request Approved"
                          >
                            <Check size={13} strokeWidth={2.5} />
                            <span>Approved</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Request Rejected"
                          >
                            <X size={13} strokeWidth={2.5} />
                            <span>Rejected</span>
                          </span>
                        )}

                        <button
                          title="View Details"
                          onClick={() => setSelectedRequest(req)}
                          style={{
                            background: '#f3e8ff',
                            color: '#7c3aed',
                            border: '1px solid #e9d5ff',
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
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

      {/* Modal 1: Apply / Submit New Request */}
      {isApplyModalOpen && (
        <div className="modal-overlay" onClick={() => setIsApplyModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="icon-box-purple" style={{ width: 32, height: 32 }}>
                  <Plus size={18} />
                </div>
                <h3>Create Attendance Request</h3>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="modal-body">
              {/* Module Segmented Picker */}
              <div className="modal-seg-tabs">
                <button
                  type="button"
                  className={`modal-seg-btn ${applyType === 'manual' ? 'active' : ''}`}
                  onClick={() => setApplyType('manual')}
                >
                  <Briefcase size={14} />
                  <span>Manual Entry</span>
                </button>
                <button
                  type="button"
                  className={`modal-seg-btn ${applyType === 'wfh' ? 'active' : ''}`}
                  onClick={() => setApplyType('wfh')}
                >
                  <Home size={14} />
                  <span>WFH</span>
                </button>
                <button
                  type="button"
                  className={`modal-seg-btn ${applyType === 'leave' ? 'active' : ''}`}
                  onClick={() => setApplyType('leave')}
                >
                  <CalendarDays size={14} />
                  <span>Leave</span>
                </button>
              </div>

              {/* 1. Company Selection First */}
              <div className="form-group">
                <label className="form-lbl">Company (Tenant)</label>
                <select
                  className="form-select"
                  value={applyCompanyId}
                  onChange={e => {
                    const newComp = e.target.value;
                    setApplyCompanyId(newComp);
                    const matching = employees.filter(emp => !newComp || newComp === 'ALL' || emp.tenant_id === newComp);
                    if (matching.length > 0) {
                      setApplyEmpId(matching[0].emp_id);
                    } else {
                      setApplyEmpId('');
                    }
                  }}
                >
                  {companies
                    .filter(c => c.id !== 'ALL')
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* 2. Employee Selection Dependent on Chosen Company */}
              <div className="form-group">
                <label className="form-lbl">Employee</label>
                {filteredModalEmployees.length > 0 ? (
                  <select
                    className="form-select"
                    value={applyEmpId}
                    onChange={e => setApplyEmpId(e.target.value)}
                    required
                  >
                    {filteredModalEmployees.map(emp => (
                      <option key={emp.emp_id} value={emp.emp_id}>
                        {emp.name} (ID: {emp.emp_id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#f8fafc',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      color: '#64748b',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    No employees found for this company.
                  </div>
                )}
              </div>

              {/* Date Inputs based on Type */}
              {applyType === 'manual' && (
                <>
                  <div className="form-group">
                    <label className="form-lbl">Date of Missed Punch</label>
                    <input
                      type="date"
                      className="form-input"
                      value={applyDate}
                      onChange={e => setApplyDate(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-lbl">In Time</label>
                      <input
                        type="time"
                        className="form-input"
                        value={applyInTime}
                        onChange={e => setApplyInTime(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-lbl">Out Time</label>
                      <input
                        type="time"
                        className="form-input"
                        value={applyOutTime}
                        onChange={e => setApplyOutTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {applyType === 'wfh' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-lbl">Start Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={applyDate}
                        onChange={e => setApplyDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-lbl">End Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={applyToDate}
                        onChange={e => setApplyToDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-lbl">Work In Time</label>
                      <input
                        type="time"
                        className="form-input"
                        value={applyInTime}
                        onChange={e => setApplyInTime(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-lbl">Work Out Time</label>
                      <input
                        type="time"
                        className="form-input"
                        value={applyOutTime}
                        onChange={e => setApplyOutTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {applyType === 'leave' && (
                <>
                  <div className="form-group">
                    <label className="form-lbl">Leave Type</label>
                    <select
                      className="form-select"
                      value={applyLeaveType}
                      onChange={e => setApplyLeaveType(e.target.value)}
                    >
                      <option value="CL">Casual Leave (CL)</option>
                      <option value="SL">Sick Leave (SL)</option>
                      <option value="PL">Paid Leave (PL)</option>
                      <option value="LWP">Leave Without Pay (LWP)</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-lbl">From Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={applyDate}
                        onChange={e => setApplyDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-lbl">To Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={applyToDate}
                        onChange={e => setApplyToDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Reason Field */}
              <div className="form-group">
                <label className="form-lbl">Reason / Remarks</label>
                <textarea
                  rows={3}
                  className="form-textarea"
                  placeholder={
                    applyType === 'manual'
                      ? 'e.g. Camera missed entry punch at 9:30 AM due to lighting'
                      : applyType === 'wfh'
                      ? 'e.g. Remote client deployment architecture setup'
                      : 'e.g. Family medical emergency'
                  }
                  value={applyReason}
                  onChange={e => setApplyReason(e.target.value)}
                  required
                />
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn-reset"
                  onClick={() => setIsApplyModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-apply"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Request Details Inspector Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={18} color="#7c3aed" />
                <h3>Attendance Request Details</h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  <img
                    src={selectedRequest.avatar_url || `/api/v1/face/photo/${selectedRequest.emp_id}?tenant_id=${selectedRequest.tenant_id}`}
                    alt=""
                    style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e0e7ff' }}
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div
                    style={{
                      display: 'none',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)',
                      color: '#6366f1',
                      fontWeight: 800,
                      fontSize: '1rem',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #c7d2fe',
                      flexShrink: 0
                    }}
                  >
                    {selectedRequest.name.split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'EM'}
                  </div>
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
                  <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#64748b' }}>DATES</div>
                  <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#334155', marginTop: 2 }}>
                    {selectedRequest.from_date}
                    {selectedRequest.to_date && selectedRequest.to_date !== selectedRequest.from_date
                      ? ` to ${selectedRequest.to_date}`
                      : ''}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#64748b' }}>PUNCH TIMES</div>
                  <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#334155', marginTop: 2 }}>
                    {selectedRequest.in_time ? `${selectedRequest.in_time} - ${selectedRequest.out_time || ''}` : 'N/A (Full Day)'}
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
                  handleSingleReview(selectedRequest.id, 'Approved', selectedRequest.source_type);
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
                  handleSingleReview(selectedRequest.id, 'Rejected', selectedRequest.source_type);
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
