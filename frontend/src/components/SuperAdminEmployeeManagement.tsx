import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Building2,
  ScanFace,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Camera,
  Upload,
  X,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  Mail,
  Phone,
  Eye,
  Calendar,
  Clock,
  User,
  LogOut,
  Timer
} from 'lucide-react';

import {
  fetchSuperAdminEmployees,
  createSuperAdminEmployee,
  enrollEmployeeFacePhoto,
  fetchCompaniesBilling,
  SuperAdminEmployeeItem,
  CompanyBillingItem
} from '../services/api';

export const SuperAdminEmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<SuperAdminEmployeeItem[]>([]);
  const [companies, setCompanies] = useState<CompanyBillingItem[]>([]);
  const [selectedCompanySlug, setSelectedCompanySlug] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const getEmpRole = (emp: SuperAdminEmployeeItem): 'admin' | 'hr' | 'employee' => {
    const des = (emp.designation || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    const id = emp.emp_id.toLowerCase();
    if (des.includes('admin') || des.includes('director') || des.includes('ceo') || des.includes('founder') || id.includes('adm') || id.includes('dla9999')) {
      return 'admin';
    }
    if (dept.includes('hr') || dept.includes('human resources') || des.includes('hr') || des.includes('lead')) {
      return 'hr';
    }
    return 'employee';
  };


  // Modal & Drawer State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedEnrollEmp, setSelectedEnrollEmp] = useState<SuperAdminEmployeeItem | null>(null);
  const [viewPhotoEmp, setViewPhotoEmp] = useState<SuperAdminEmployeeItem | null>(null);
  const [selectedDrawerEmp, setSelectedDrawerEmp] = useState<SuperAdminEmployeeItem | null>(null);



  // Form State
  const [targetSlug, setTargetSlug] = useState<string>('');
  const [empName, setEmpName] = useState<string>('');
  const [empId, setEmpId] = useState<string>('');
  const [department, setDepartment] = useState<string>('Engineering');
  const [designation, setDesignation] = useState<string>('');

  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCompanyName = (name?: string): string => {
    if (!name) return '—';
    return name.replace(/\s+[a-f0-9]{8}$/i, '').trim();
  };

  // Load Companies and Employees on mount
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadEmployees(selectedCompanySlug);
  }, [selectedCompanySlug]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [compRes, empRes] = await Promise.all([
        fetchCompaniesBilling(),
        fetchSuperAdminEmployees(selectedCompanySlug)
      ]);
      setCompanies(compRes.companies || []);
      const emps = empRes.employees || [];
      setEmployees(emps);
      if (compRes.companies.length > 0 && !targetSlug) {
        setTargetSlug(compRes.companies[0].slug);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load employee data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async (slug: string) => {
    setRefreshing(true);
    try {
      const res = await fetchSuperAdminEmployees(slug);
      const emps = res.employees || [];
      setEmployees(emps);
    } catch (err: any) {

      showToast(err.message || 'Failed to filter employees', 'error');
    } finally {
      setRefreshing(false);
    }
  };


  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Photo Selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Submit New Employee Form
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSlug) {
      showToast('Please select a company', 'error');
      return;
    }
    if (!empName.trim()) {
      showToast('Please enter employee full name', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Employee Record
      const newEmp = await createSuperAdminEmployee({
        company_slug: targetSlug,
        name: empName,
        emp_id: empId.trim() || undefined,
        department,
        designation,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined
      });

      // 2. Enroll Photo if selected
      if (photoFile && newEmp) {
        await enrollEmployeeFacePhoto(newEmp.tenant_id, newEmp.emp_id, photoFile);
      }

      showToast(`Employee '${newEmp.name}' (${newEmp.emp_id}) added successfully!`, 'success');
      setShowAddModal(false);
      resetForm();
      loadEmployees(selectedCompanySlug);
    } catch (err: any) {
      showToast(err.message || 'Failed to add employee', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Enroll photo for existing employee
  const handleEnrollExistingPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollEmp || !photoFile) {
      showToast('Please choose a face photo file', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await enrollEmployeeFacePhoto(selectedEnrollEmp.tenant_id, selectedEnrollEmp.emp_id, photoFile);
      showToast(`Face photo enrolled for ${selectedEnrollEmp.name}!`, 'success');
      setSelectedEnrollEmp(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      loadEmployees(selectedCompanySlug);
    } catch (err: any) {
      showToast(err.message || 'Face enrollment failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmpName('');
    setEmpId('');
    setEmail('');
    setPhone('');
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Filtered List
  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (
      emp.name.toLowerCase().includes(q) ||
      emp.emp_id.toLowerCase().includes(q) ||
      (emp.company_name && emp.company_name.toLowerCase().includes(q)) ||
      (emp.company_slug && emp.company_slug.toLowerCase().includes(q)) ||
      (emp.department && emp.department.toLowerCase().includes(q)) ||
      (emp.email && emp.email.toLowerCase().includes(q))
    );

    if (!matchesSearch) return false;

    const role = getEmpRole(emp);
    if (selectedRoleFilter === 'admins') return role === 'admin';
    if (selectedRoleFilter === 'hr') return role === 'hr';
    if (selectedRoleFilter === 'employees') return role === 'employee';
    return true;
  });


  // KPI Calculations
  const totalEmployees = employees.length;
  const totalEnrolled = employees.filter((e) => e.face_enrolled).length;
  const totalPending = totalEmployees - totalEnrolled;
  const enrolledPercent = totalEmployees > 0 ? Math.round((totalEnrolled / totalEmployees) * 100) : 0;
  const pendingPercent = totalEmployees > 0 ? (100 - enrolledPercent) : 0;
  const adminCount = employees.filter((e) => getEmpRole(e) === 'admin').length;
  const hrCount = employees.filter((e) => getEmpRole(e) === 'hr').length;
  const empCount = totalEmployees - adminCount - hrCount;



  const renderRingChart = (percent: number, color: string) => {
    const size = 52;
    const strokeWidth = 5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
      <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <span style={{ position: 'absolute', fontSize: '.76rem', fontWeight: 800, color: '#0f172a' }}>
          {percent}%
        </span>
      </div>
    );
  };





  return (
    <div className="emp-mg-container">
      <style>{`
        .emp-mg-container {
          padding: 24px 32px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #0f172a;
        }

        /* Top Header */
        .emp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .emp-title-wrap h1 {
          font-size: 1.65rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -.5px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
        }
        .emp-title-wrap p {
          font-size: .88rem;
          color: #64748b;
          margin-top: 4px;
        }
        .emp-action-btns {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .btn-add-emp {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: .88rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(37,99,235,.25);
          transition: all .15s;
        }
        .btn-add-emp:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }
        .btn-refresh {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          font-size: .85rem;
          transition: all .15s;
        }
        .btn-refresh:hover { background: #f1f5f9; color: #0f172a; }

        /* KPI Overview Cards */
        .emp-kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .emp-kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,.02);
          transition: all .2s ease;
        }
        .emp-kpi-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 6px 18px rgba(0,0,0,.05);
          transform: translateY(-1px);
        }
        .card-accent-blue {
          border-left: 4px solid #3b82f6;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        }
        .card-accent-green {
          border-left: 4px solid #10b981;
          background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
        }
        .card-accent-rose {
          border-left: 4px solid #f43f5e;
          background: linear-gradient(135deg, #ffffff 0%, #fff1f2 100%);
        }
        .emp-kpi-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .kpi-blue { background: #eff6ff; color: #2563eb; }
        .kpi-green { background: #dcfce7; color: #059669; }
        .kpi-purple { background: #f5f3ff; color: #7c3aed; }
        .kpi-amber { background: #fffbeb; color: #d97706; }
        .kpi-rose { background: #fee2e2; color: #dc2626; }
        .emp-kpi-val { font-size: 1.65rem; font-weight: 800; color: #0f172a; line-height: 1.1; }
        .emp-kpi-lbl { font-size: .88rem; font-weight: 700; color: #334155; margin-top: 3px; }





        /* Filter Controls */
        .emp-controls-bar {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,.02);
        }
        .emp-search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 8px 14px;
          width: 340px;
        }
        .emp-search-box input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          font-size: .88rem;
          color: #0f172a;
        }
        .emp-company-filter {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .emp-company-filter label {
          font-size: .83rem;
          font-weight: 700;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .emp-company-select {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 8px 14px;
          font-size: .88rem;
          font-weight: 600;
          color: #0f172a;
          outline: none;
          cursor: pointer;
          min-width: 220px;
        }

        /* Table Card */
        .emp-table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0,0,0,.03);
        }
        .emp-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .emp-table th {
          background: #f8fafc;
          padding: 14px 20px;
          font-size: .78rem;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: .04em;
          border-bottom: 1px solid #e2e8f0;
        }
        .emp-table td {
          padding: 14px 20px;
          font-size: .88rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .emp-table tr:hover { background: #f8fafc; }

        /* Employee Avatar & Info */
        .emp-user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .emp-photo-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #2563eb;
          color: #ffffff;
          font-weight: 800;
          font-size: .9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(0,0,0,.1);
        }
        .emp-photo-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .emp-user-name { font-weight: 700; color: #0f172a; }
        .emp-user-email { font-size: .78rem; color: #64748b; }

        /* Company Pill with Domain Slug */
        .emp-company-pill {
          display: inline-flex;
          flex-direction: column;
          gap: 2px;
        }
        .company-name-txt { font-weight: 700; color: #1e293b; font-size: .85rem; }
        .slug-tag {
          display: inline-block;
          font-size: .7rem;
          font-family: monospace;
          background: #f1f5f9;
          color: #3b82f6;
          border: 1px solid #dbeafe;
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        /* Role Pills */
        .role-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: .75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
        }
        .role-admin {
          background: #f3e8ff;
          color: #7e22ce;
          border: 1px solid #d8b4fe;
        }
        .role-hr {
          background: #e0f2fe;
          color: #0369a1;
          border: 1px solid #7dd3fc;
        }
        .role-emp {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        /* Admin & HR ID Highlight Badges */
        .badge-admin-id {
          font-family: monospace;
          font-weight: 800;
          color: #7e22ce;
          background: #faf5ff;
          border: 1px solid #e9d5ff;
          padding: 3px 8px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .badge-hr-id {
          font-family: monospace;
          font-weight: 800;
          color: #0284c7;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          padding: 3px 8px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* Face Status Pill */
        .face-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: .75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
        }

        .badge-enrolled {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
        }
        .badge-pending {
          background: #fffbeb;
          color: #d97706;
          border: 1px solid #fde68a;
        }

        /* Actions */
        .btn-enroll-action {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: .78rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all .12s;
        }
        .btn-enroll-action:hover {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }

        /* Modal Backdrop & Dialog */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, .6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        .modal-card {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 580px;
          box-shadow: 0 20px 40px rgba(0,0,0,.2);
          overflow: hidden;
          animation: modalSlide .2s cubic-bezier(.16,1,.3,1);
        }
        @keyframes modalSlide {
          from { opacity: 0; transform: translateY(12px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-head {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
        }
        .modal-head h3 {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .modal-close {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
        }
        .modal-close:hover { background: #e2e8f0; color: #0f172a; }

        .modal-body { padding: 24px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group.full { grid-column: span 2; }
        .form-group label {
          font-size: .82rem;
          font-weight: 700;
          color: #334155;
        }
        .form-control {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: .88rem;
          color: #0f172a;
          outline: none;
          transition: border-color .15s;
        }
        .form-control:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.15); }

        /* Photo Upload Dropzone */
        .photo-dropzone {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          background: #f8fafc;
          transition: all .15s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .photo-dropzone:hover { border-color: #2563eb; background: #eff6ff; }
        .preview-img {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          box-shadow: 0 4px 12px rgba(0,0,0,.15);
          border: 2px solid #2563eb;
        }

        .modal-foot {
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: #f8fafc;
        }
        .btn-cancel {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-submit {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(37,99,235,.25);
        }

        /* Toast notification */
        .toast-banner {
          position: fixed;
          bottom: 24px;
          right: 24px;
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: .88rem;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,.15);
          z-index: 200;
          animation: modalSlide .2s ease-out;
        }
        .toast-success { background: #059669; color: #ffffff; }
        .toast-error { background: #dc2626; color: #ffffff; }
      `}</style>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-banner ${toastType === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toastType === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="emp-header">
        <div className="emp-title-wrap">
          <h1>
            <Users size={26} color="#2563eb" />
            Employee Management
          </h1>
          <p>Super Admin control panel to add, manage, and enroll employee face photos across all SaaS companies</p>
        </div>
        <div className="emp-action-btns">
          <button className="btn-refresh" onClick={() => loadEmployees(selectedCompanySlug)}>
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            Refresh
          </button>
          <button className="btn-add-emp" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add Employee for Company
          </button>
        </div>
      </div>

      {/* Main Flex Layout for Table + Right Drawer */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', position: 'relative' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* KPI Cards */}
          <div className="emp-kpi-grid">
            {/* Card 1: Total SaaS Employees */}
            <div className="emp-kpi-card card-accent-blue">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="emp-kpi-icon kpi-blue">
                  <Users size={24} />
                </div>
                <div>
                  <div className="emp-kpi-val">{totalEmployees}</div>
                  <div className="emp-kpi-lbl" style={{ fontSize: '.92rem', fontWeight: 700, color: '#334155' }}>Total SaaS Employees</div>
                </div>
              </div>
            </div>

            {/* Card 2: Face Photo Enrolled */}
            <div className="emp-kpi-card card-accent-green">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="emp-kpi-icon kpi-green">
                    <ScanFace size={24} />
                  </div>
                  <div>
                    <div className="emp-kpi-val" style={{ color: '#059669' }}>{totalEnrolled}</div>
                    <div className="emp-kpi-lbl" style={{ fontSize: '.92rem', fontWeight: 700, color: '#334155' }}>Face Photo Enrolled</div>
                  </div>
                </div>

                {renderRingChart(enrolledPercent, '#10b981')}
              </div>
            </div>

            {/* Card 3: Pending Face Enrollment */}
            <div className="emp-kpi-card card-accent-rose">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="emp-kpi-icon kpi-rose">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <div className="emp-kpi-val" style={{ color: '#dc2626' }}>{totalPending}</div>
                    <div className="emp-kpi-lbl" style={{ fontSize: '.92rem', fontWeight: 700, color: '#334155' }}>Pending Face Photo</div>
                  </div>
                </div>

                {renderRingChart(pendingPercent, '#f43f5e')}
              </div>
            </div>
          </div>





          {/* Filter Bar */}
          <div className="emp-controls-bar">
            <div className="emp-search-box">
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search by name, ID, company, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Right Aligned Filters Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div className="emp-company-filter">
                <label>
                  <Filter size={15} color="#475569" />
                  Company Filter:
                </label>
                <select
                  className="emp-company-select"
                  value={selectedCompanySlug}
                  onChange={(e) => setSelectedCompanySlug(e.target.value)}
                >
                  <option value="all">🏢 All Companies ({companies.length})</option>
                  {companies.map((comp) => (
                    <option key={comp.id} value={comp.slug}>
                      {comp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="emp-company-filter">
                <label>
                  <ShieldCheck size={15} color="#475569" />
                  Role Filter:
                </label>
                <select
                  className="emp-company-select"
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                >
                  <option value="all">👥 All Roles</option>
                  <option value="admins">🛡️ Company Admins</option>
                  <option value="hr">👤 HR Leads & Managers</option>
                  <option value="employees">💼 Regular Employees</option>
                </select>
              </div>
            </div>
          </div>


          {/* Employees Table */}
          <div className="emp-table-card">
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={28} className="spin" style={{ marginBottom: '12px', color: '#2563eb' }} />
                <p>Loading multi-tenant employee database...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <Users size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
                <h4>No employees found</h4>
                <p>Try clearing your search query or selecting a different role or company.</p>
              </div>
            ) : (
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Company</th>
                    <th>Employee ID</th>
                    <th>Role / Access</th>
                    <th>Department</th>
                    <th>Contact</th>
                    <th>Face Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => {
                    const initials = emp.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();

                    const photoUrl = emp.photo_url || `/api/v1/face/photo/${emp.emp_id}?tenant_id=${emp.tenant_id}`;
                    const isSelected = selectedDrawerEmp?.id === emp.id;
                    const role = getEmpRole(emp);

                    return (
                      <tr
                        key={emp.id}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? '#f0f9ff' : undefined,
                          transition: 'all .15s ease'
                        }}
                        onClick={() => setSelectedDrawerEmp(emp)}
                      >
                        <td>
                          <div className="emp-user-cell">
                            <div
                              className="emp-photo-avatar"
                              style={{ cursor: 'pointer' }}
                              title="Click to view biometric drawer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDrawerEmp(emp);
                              }}
                            >
                              {emp.face_enrolled ? (
                                <img
                                  src={photoUrl}
                                  alt={emp.name}
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                            <div>
                              <div className="emp-user-name" style={{ color: isSelected ? '#0284c7' : '#0f172a' }}>{emp.name}</div>
                              <div className="emp-user-email">{emp.email || 'No email registered'}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div
                            className="emp-company-pill"
                            title={`Click to filter employees for ${formatCompanyName(emp.company_name)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCompanySlug(emp.company_slug);
                            }}
                          >
                            <span className="company-name-txt">{formatCompanyName(emp.company_name)}</span>
                          </div>
                        </td>

                        <td>
                          {role === 'admin' ? (
                            <span className="badge-admin-id" title="Company Admin Role">
                              <ShieldCheck size={12} />
                              {emp.emp_id}
                            </span>
                          ) : role === 'hr' ? (
                            <span className="badge-hr-id" title="HR Manager Role">
                              <User size={12} />
                              {emp.emp_id}
                            </span>
                          ) : (
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                              {emp.emp_id}
                            </span>
                          )}
                        </td>

                        <td>
                          {role === 'admin' ? (
                            <span className="role-pill role-admin">
                              <ShieldCheck size={13} />
                              Company Admin
                            </span>
                          ) : role === 'hr' ? (
                            <span className="role-pill role-hr">
                              <User size={13} />
                              HR Lead
                            </span>
                          ) : (
                            <span className="role-pill role-emp">
                              <Briefcase size={13} />
                              Employee
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{emp.department || 'Engineering'}</div>
                          {emp.designation && emp.designation.trim() !== '' && emp.designation.toLowerCase() !== 'staff' && (
                            <div style={{ fontSize: '.78rem', color: '#64748b' }}>{emp.designation}</div>
                          )}
                        </td>

                        <td>
                          <div style={{ fontSize: '.82rem', color: '#475569' }}>{emp.phone || emp.email || '—'}</div>
                        </td>

                        <td>
                          {emp.face_enrolled ? (
                            <span className="face-badge badge-enrolled">
                              <CheckCircle2 size={13} />
                              Enrolled
                            </span>
                          ) : (
                            <span className="face-badge badge-pending">
                              <AlertCircle size={13} />
                              Pending Photo
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>


        {/* Right Side Drawer: Employee Biometric Profile Drawer */}
        {selectedDrawerEmp && (
          <div
            className="emp-drawer-card"
            style={{
              width: '360px',
              flexShrink: 0,
              background: '#ffffff',
              border: '1px solid #c4b5fd',
              borderRadius: '20px',
              padding: '20px',
              boxShadow: '0 10px 30px rgba(99,102,241,.12)',
              position: 'fixed',
              top: '140px',
              right: '24px',
              zIndex: 100,
              maxHeight: 'calc(100vh - 165px)',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Employee Biometric Profile Drawer
              </h3>
              <button
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', borderRadius: '6px', color: '#64748b' }}
                onClick={() => setSelectedDrawerEmp(null)}
                title="Close Drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Side-by-Side Employee Profile Card */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {/* Left Photo */}
                <div style={{
                  width: '120px',
                  height: '155px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  flexShrink: 0
                }}>
                  <img
                    src={selectedDrawerEmp.photo_url || `/api/v1/face/photo/${selectedDrawerEmp.emp_id}?tenant_id=${selectedDrawerEmp.tenant_id}`}
                    alt={selectedDrawerEmp.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                    onError={(e) => {
                      const femaleNames = ['priya', 'sharma', 'simran', 'kaur', 'anita'];
                      const isFemale = femaleNames.some(f => selectedDrawerEmp.name.toLowerCase().includes(f));
                      (e.target as HTMLImageElement).src = isFemale
                        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'
                        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>

                {/* Right Details Column */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Active Status Badge */}
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '.72rem',
                      fontWeight: 700,
                      color: selectedDrawerEmp.face_enrolled ? '#15803d' : '#b91c1c',
                      background: selectedDrawerEmp.face_enrolled ? '#dcfce7' : '#fee2e2',
                      border: `1px solid ${selectedDrawerEmp.face_enrolled ? '#86efac' : '#fca5a5'}`,
                      padding: '2px 9px',
                      borderRadius: '9999px'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedDrawerEmp.face_enrolled ? '#16a34a' : '#dc2626' }} />
                      {selectedDrawerEmp.face_enrolled ? 'Active' : 'Pending Photo'}
                    </span>
                  </div>

                  {/* Name */}
                  <h3 style={{ margin: '0 0 2px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                    {selectedDrawerEmp.name}
                  </h3>

                  {/* Subtitle: Email or Role (No duplicate company name!) */}
                  <div style={{ fontSize: '.8rem', color: '#64748b', fontWeight: 600, marginBottom: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedDrawerEmp.email || (getEmpRole(selectedDrawerEmp) === 'admin' ? 'Company Admin' : getEmpRole(selectedDrawerEmp) === 'hr' ? 'HR Lead' : 'Staff Member')}
                  </div>

                  {/* Details List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Employee ID */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={13} color="#2563eb" />
                      </div>
                      <div>
                        <div style={{ fontSize: '.68rem', color: '#64748b', fontWeight: 600, lineHeight: 1 }}>Employee ID</div>
                        <div style={{ fontSize: '.82rem', fontWeight: 800, color: '#0f172a', marginTop: '1px' }}>{selectedDrawerEmp.emp_id}</div>
                      </div>
                    </div>

                    {/* Tenant Company */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={13} color="#059669" />
                      </div>
                      <div>
                        <div style={{ fontSize: '.68rem', color: '#64748b', fontWeight: 600, lineHeight: 1 }}>Tenant Company</div>
                        <div style={{ fontSize: '.82rem', fontWeight: 800, color: '#0f172a', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {formatCompanyName(selectedDrawerEmp.company_name)}
                        </div>
                      </div>
                    </div>

                    {/* Department */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Briefcase size={13} color="#7c3aed" />
                      </div>
                      <div>
                        <div style={{ fontSize: '.68rem', color: '#64748b', fontWeight: 600, lineHeight: 1 }}>Department</div>
                        <div style={{ fontSize: '.82rem', fontWeight: 800, color: '#0f172a', marginTop: '1px' }}>{selectedDrawerEmp.department || 'Engineering'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Attendance Stats Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', marginBottom: '18px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '.88rem', fontWeight: 800, color: '#0f172a' }}>Attendance Stats</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Last Check-In */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 600 }}>
                      <Calendar size={15} color="#059669" /> Last Check-In
                    </span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>Sep 10, 2:15 PM</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: '75%', height: '100%', background: '#0d9488', borderRadius: '9999px' }} />
                  </div>
                </div>

                {/* Average In Time */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 600 }}>
                      <Clock size={15} color="#0284c7" /> Average In Time
                    </span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>09:15 AM</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: '85%', height: '100%', background: '#0284c7', borderRadius: '9999px' }} />
                  </div>
                </div>

                {/* Average Exit Time */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 600 }}>
                      <LogOut size={15} color="#8b5cf6" /> Average Exit Time
                    </span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>06:45 PM</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: '70%', height: '100%', background: '#8b5cf6', borderRadius: '9999px' }} />
                  </div>
                </div>

                {/* Overall Average Working Time */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 600 }}>
                      <Timer size={15} color="#10b981" /> Overall Average Time
                    </span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>8h 30m / day</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: '88%', height: '100%', background: '#10b981', borderRadius: '9999px' }} />
                  </div>
                </div>
              </div>
            </div>



            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#06b6d4', color: '#ffffff', border: 'none', padding: '11px 14px', borderRadius: '10px', fontWeight: 700, fontSize: '.84rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(6,182,212,.3)' }}
                onClick={() => { setSelectedEnrollEmp(selectedDrawerEmp); setPhotoFile(null); setPhotoPreview(null); }}
              >
                <ScanFace size={16} /> Re-enroll Face
              </button>
              <button
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '11px 14px', borderRadius: '10px', fontWeight: 700, fontSize: '.84rem', cursor: 'pointer' }}
                onClick={() => setViewPhotoEmp(selectedDrawerEmp)}
              >
                <User size={16} /> View Full Profile
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Modal 1: Add New Employee for Company */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                <Plus size={20} color="#2563eb" />
                Add Employee for Target Company
              </h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee}>
              <div className="modal-body">
                <div className="form-grid">
                  {/* Select Target Company */}
                  <div className="form-group full">
                    <label>Target Tenant Company *</label>
                    <select
                      className="form-control"
                      value={targetSlug}
                      onChange={(e) => setTargetSlug(e.target.value)}
                      required
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.slug}>
                          🏢 {c.name}
                        </option>
                      ))}
                    </select>
                  </div>


                  {/* Employee Name */}
                  <div className="form-group">
                    <label>Full Employee Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Vikram Sharma"
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Employee ID */}
                  <div className="form-group">
                    <label>Employee ID (Optional Auto-Gen)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. EMP0005 (or leave blank)"
                      value={empId}
                      onChange={(e) => setEmpId(e.target.value)}
                    />
                  </div>

                  {/* Department */}
                  <div className="form-group">
                    <label>Department</label>
                    <select
                      className="form-control"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="AI Research">AI Research</option>
                      <option value="Operations">Operations</option>
                      <option value="Sales & Marketing">Sales &amp; Marketing</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Finance">Finance</option>
                    </select>
                  </div>

                  {/* Designation */}
                  <div className="form-group">
                    <label>Designation</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Senior Software Engineer"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                    />
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="vikram@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Phone */}
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  {/* Photo Upload Zone */}
                  <div className="form-group full">
                    <label>Face Enrollment Photo (Optional)</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                    <div className="photo-dropzone" onClick={() => fileInputRef.current?.click()}>
                      {photoPreview ? (
                        <>
                          <img src={photoPreview} alt="Preview" className="preview-img" />
                          <span style={{ fontSize: '.78rem', color: '#2563eb', fontWeight: 700 }}>
                            Click to change face photo
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload size={24} color="#64748b" />
                          <span style={{ fontSize: '.85rem', fontWeight: 600, color: '#334155' }}>
                            Click to upload face photo for vector enrollment
                          </span>
                          <span style={{ fontSize: '.75rem', color: '#94a3b8' }}>
                            PNG, JPG or WEBP (Clear front-facing face)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? 'Creating Employee...' : 'Save & Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Quick Face Photo Enrollment */}
      {selectedEnrollEmp && (
        <div className="modal-overlay" onClick={() => setSelectedEnrollEmp(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                <Camera size={20} color="#2563eb" />
                Enroll Face Photo — {selectedEnrollEmp.name} ({selectedEnrollEmp.emp_id})
              </h3>
              <button className="modal-close" onClick={() => setSelectedEnrollEmp(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEnrollExistingPhoto}>
              <div className="modal-body">
                <p style={{ fontSize: '.85rem', color: '#64748b', marginBottom: '16px' }}>
                  Target Company: <strong>{selectedEnrollEmp.company_name}</strong>
                </p>


                <div className="form-group full">
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                  <div className="photo-dropzone" onClick={() => fileInputRef.current?.click()}>
                    {photoPreview ? (
                      <>
                        <img src={photoPreview} alt="Preview" className="preview-img" />
                        <span style={{ fontSize: '.8rem', color: '#2563eb', fontWeight: 700 }}>
                          Photo Selected! Ready for InsightFace Vector Extraction
                        </span>
                      </>
                    ) : (
                      <>
                        <Camera size={32} color="#2563eb" />
                        <span style={{ fontSize: '.9rem', fontWeight: 700, color: '#0f172a' }}>
                          Upload Front-Facing Face Photo
                        </span>
                        <span style={{ fontSize: '.78rem', color: '#64748b' }}>
                          Used by Camera AI Engine for instant attendance recognition
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn-cancel" onClick={() => setSelectedEnrollEmp(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={submitting || !photoFile}>
                  {submitting ? 'Extracting Embeddings...' : 'Enroll Face Vector'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: View High-Resolution Enrolled Face Photo */}

      {viewPhotoEmp && (
        <div className="modal-overlay" onClick={() => setViewPhotoEmp(null)}>
          <div className="modal-card" style={{ maxWidth: '440px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                <ScanFace size={20} color="#2563eb" />
                Enrolled Face Photo — {viewPhotoEmp.name}
              </h3>
              <button className="modal-close" onClick={() => setViewPhotoEmp(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '4px solid #2563eb',
                  boxShadow: '0 8px 24px rgba(37,99,235,.2)',
                  background: '#f1f5f9'
                }}
              >
                <img
                  src={viewPhotoEmp.photo_url || `/api/v1/face/photo/${viewPhotoEmp.emp_id}?tenant_id=${viewPhotoEmp.tenant_id}`}
                  alt={viewPhotoEmp.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {viewPhotoEmp.name} ({viewPhotoEmp.emp_id})
                </h4>
                <div style={{ fontSize: '.84rem', color: '#64748b' }}>
                  {viewPhotoEmp.company_name}
                </div>

                <div style={{ marginTop: '8px', fontSize: '.78rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '4px 12px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={13} /> Enrolled &amp; Active in AI Camera Engine
                </div>
              </div>
            </div>

            <div className="modal-foot" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setSelectedEnrollEmp(viewPhotoEmp);
                  setViewPhotoEmp(null);
                }}
              >
                Update Photo
              </button>
              <button type="button" className="btn-submit" onClick={() => setViewPhotoEmp(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminEmployeeManagement;

