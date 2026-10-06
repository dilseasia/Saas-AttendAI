import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  Key,
  Globe,
  User,
  Building2,
  Calendar,
  Clock,
  Eye,
  FileText,
  ChevronRight,
  Zap,
  Activity,
  Terminal,
  X,
  Copy,
  Check,
  ShieldAlert,
  Sliders,
  Cpu,
  Radio,
  Server
} from 'lucide-react';
import { AuthResponse } from '../services/api';

export interface AuditLogEvent {
  id: string;
  timestamp: string;
  user_email: string;
  user_role: string;
  tenant_name: string;
  category: 'AUTH' | 'BIOMETRICS' | 'TENANT' | 'API' | 'BILLING' | 'SECURITY';
  action: string;
  description: string;
  ip_address: string;
  location: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  payload: Record<string, any>;
  sha256: string;
}

const INITIAL_AUDIT_LOGS: AuditLogEvent[] = [
  {
    id: 'AUD-90821',
    timestamp: '2026-09-14 15:44:12 IST',
    user_email: 'singhdaljeet@gmail.com',
    user_role: 'Super Admin',
    tenant_name: 'Webtunix',
    category: 'BIOMETRICS',
    action: 'FACE_EMBEDDING_ENROLLED',
    description: 'Enrolled InsightFace 512-D vector for employee EMP-104 (Daljeet Singh)',
    ip_address: '10.8.21.52',
    location: 'Mohali, India',
    severity: 'INFO',
    status: 'SUCCESS',
    payload: { employee_id: 'EMP-104', vector_dim: 512, model: 'buffalo_l', confidence: 0.994, source_cam: 'RTSP_CAM_01' },
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  {
    id: 'AUD-90820',
    timestamp: '2026-09-14 15:41:05 IST',
    user_email: 'singhdaljeet@seasiaconnect.com',
    user_role: 'Company Admin',
    tenant_name: 'Seasia Infotech',
    category: 'AUTH',
    action: 'USER_LOGIN_SUCCESS',
    description: 'Authenticated via JWT Bearer Token on Web Control Center',
    ip_address: '10.8.14.83',
    location: 'Chandigarh, India',
    severity: 'INFO',
    status: 'SUCCESS',
    payload: { auth_method: 'PASSWORD_HASH', token_exp: '24h', user_agent: 'Mozilla/5.0 (Linux; x86_64)' },
    sha256: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4'
  },
  {
    id: 'AUD-90819',
    timestamp: '2026-09-14 15:38:22 IST',
    user_email: 'system.worker@attend.ai',
    user_role: 'System Daemon',
    tenant_name: 'Global Platform',
    category: 'BIOMETRICS',
    action: 'VECTOR_CACHE_RELOAD',
    description: 'Reloaded 284 employee face vector embeddings into camera engine memory',
    ip_address: '127.0.0.1',
    location: 'Local Engine Cluster',
    severity: 'INFO',
    status: 'SUCCESS',
    payload: { total_vectors: 284, memory_mb: 48.2, load_time_ms: 18.4, active_tenants: 84 },
    sha256: '4f296317b6697d8b584d4b31a388e404b90e9d6d53d71206d2039a04f2f01243'
  },
  {
    id: 'AUD-90818',
    timestamp: '2026-09-14 15:32:10 IST',
    user_email: 'unknown_attacker@185.220.101.5',
    user_role: 'Anonymous',
    tenant_name: 'Unknown',
    category: 'SECURITY',
    action: 'BRUTE_FORCE_PREVENTED',
    description: 'Multiple invalid SSH/API login attempts detected from untrusted Tor relay',
    ip_address: '185.220.101.5',
    location: 'Frankfurt, Germany',
    severity: 'CRITICAL',
    status: 'BLOCKED',
    payload: { attempt_count: 14, targeted_endpoint: '/api/v1/auth/login', firewall_rule: 'AUTO_BAN_IP_24H' },
    sha256: '9a31a98c772c638e88e20253459c07df7428f52236d8d9b891d4e41b9e0231aa'
  },
  {
    id: 'AUD-90817',
    timestamp: '2026-09-14 15:24:50 IST',
    user_email: 'sunrise@gmail.com',
    user_role: 'Company Admin',
    tenant_name: 'Sunrise Enterprises',
    category: 'BILLING',
    action: 'SUBSCRIPTION_UPGRADED',
    description: 'Upgraded tenant subscription plan to ENTERPRISE tier (₹14,999/mo)',
    ip_address: '10.8.21.102',
    location: 'Delhi, India',
    severity: 'INFO',
    status: 'SUCCESS',
    payload: { stripe_customer: 'cus_R8912jA', plan: 'ENTERPRISE', max_employees: 100, max_cams: 5 },
    sha256: '2b4c10712798e98348b9487c69992f801a61c390979601d0a1b6e41b9c9f0412'
  },
  {
    id: 'AUD-90816',
    timestamp: '2026-09-14 15:15:02 IST',
    user_email: 'singhdaljeet@gmail.com',
    user_role: 'Super Admin',
    tenant_name: 'SuperAdmin Alpha Corp',
    category: 'TENANT',
    action: 'TENANT_CREATED',
    description: 'Provisioned new tenant organization "SuperAdmin Alpha Corp e5116638"',
    ip_address: '10.8.21.52',
    location: 'Mohali, India',
    severity: 'INFO',
    status: 'SUCCESS',
    payload: { tenant_id: 'e5116638-3482-412a-89bc-902148109312', plan: 'PRO', initial_admin: 'sa_alpha@company.com' },
    sha256: '5d8f28b4987293a9c72e29304918e9a2b918e9182379182a93817e9127e91290'
  },
  {
    id: 'AUD-90815',
    timestamp: '2026-09-14 15:02:44 IST',
    user_email: 'system.camera@attend.ai',
    user_role: 'Camera Engine',
    tenant_name: 'Webtunix',
    category: 'BIOMETRICS',
    action: 'ATTENDANCE_LOGGED',
    description: 'Recognized employee Daljeet Singh via RTSP Stream Cam #01 with 98.2% similarity',
    ip_address: '10.8.21.47',
    location: 'Entry Gate Camera',
    severity: 'INFO',
    status: 'SUCCESS',
    payload: { camera_id: 'cam_01', cosine_similarity: 0.982, attendance_type: 'ENTRY', verification: 'PASS' },
    sha256: '1a98c7e91283719b28391c7a8291e921a8371928e1928a38192e1928e1928e91'
  },
  {
    id: 'AUD-90814',
    timestamp: '2026-09-14 14:48:19 IST',
    user_email: 'singhdaljeet@seasiaconnect.com',
    user_role: 'Company Admin',
    tenant_name: 'Seasia Infotech',
    category: 'API',
    action: 'API_KEY_ROTATED',
    description: 'Rotated API Secret Key for mobile app integration',
    ip_address: '10.8.14.83',
    location: 'Chandigarh, India',
    severity: 'WARNING',
    status: 'SUCCESS',
    payload: { key_id: 'key_sec_99182', scope: ['attendance:read', 'employees:write'], expires_in: '90_days' },
    sha256: '7c9812e91829e1928e1928e1928e1928e1928e1928e1928e1928e1928e918271'
  },
  {
    id: 'AUD-90813',
    timestamp: '2026-09-14 14:30:11 IST',
    user_email: 'singhdaljeet@gmail.com',
    user_role: 'Super Admin',
    tenant_name: 'Global Platform',
    category: 'SECURITY',
    action: 'DATABASE_BACKUP_COMPLETED',
    description: 'Automated daily backup archived & synced to SFTP backup storage (10.8.14.83)',
    ip_address: '127.0.0.1',
    location: 'Local Engine Cluster',
    severity: 'INFO',
    status: 'SUCCESS',
    payload: { backup_file: 'saas_backup_20260914.zip', size_mb: 184.2, checksum_valid: true },
    sha256: '3f9871e9128371928e1928e1928e1928e1928e1928e1928e1928e1928e918293'
  }
];

export const SecurityAuditLogsPage: React.FC<{ authData?: AuthResponse }> = () => {
  const [logs, setLogs] = useState<AuditLogEvent[]>(INITIAL_AUDIT_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogEvent | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Stats calculation
  const totalEvents = logs.length;
  const successCount = logs.filter(l => l.status === 'SUCCESS').length;
  const blockedCount = logs.filter(l => l.status === 'BLOCKED' || l.severity === 'CRITICAL').length;
  const uniqueUsers = new Set(logs.map(l => l.user_email)).size;

  // Filtering
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ip_address.includes(searchQuery) ||
      log.tenant_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || log.category === categoryFilter;
    const matchesSeverity = severityFilter === 'ALL' || log.severity === severityFilter;

    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const exportCSV = () => {
    const headers = 'ID,Timestamp,User,Role,Tenant,Category,Action,IP Address,Location,Severity,Status\n';
    const rows = filteredLogs.map(l =>
      `"${l.id}","${l.timestamp}","${l.user_email}","${l.user_role}","${l.tenant_name}","${l.category}","${l.action}","${l.ip_address}","${l.location}","${l.severity}","${l.status}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="audit-container">
      <style>{`
        .audit-container {
          padding: 24px 32px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #0f172a;
        }

        /* Clean White Header Banner */
        .audit-hdr-banner {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 22px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        }
        .audit-hdr-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .audit-hdr-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #bfdbfe;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
        }
        .audit-hdr-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -.3px;
        }
        .audit-hdr-sub {
          font-size: 0.86rem;
          color: #64748b;
          margin-top: 3px;
        }
        .audit-hdr-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .btn-audit-sec {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: .85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all .15s;
        }
        .btn-audit-sec:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .btn-audit-pri {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: #ffffff;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: .85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
          transition: all .15s;
        }
        .btn-audit-pri:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        /* 4 KPI Sparkline Grid */
        .audit-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .audit-kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.03);
          transition: transform .18s, box-shadow .18s;
        }
        .audit-kpi-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }
        .audit-kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3.5px;
          border-radius: 18px 18px 0 0;
        }
        .c-indigo::before { background: linear-gradient(90deg, #6366f1, #8b5cf6); }
        .c-emerald::before { background: linear-gradient(90deg, #10b981, #059669); }
        .c-amber::before { background: linear-gradient(90deg, #f59e0b, #d97706); }
        .c-cyan::before { background: linear-gradient(90deg, #06b6d4, #0284c7); }

        .audit-kpi-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .audit-kpi-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .c-indigo .audit-kpi-icon { background: #e0e7ff; color: #4338ca; }
        .c-emerald .audit-kpi-icon { background: #dcfce7; color: #15803d; }
        .c-amber .audit-kpi-icon { background: #fffbe2; color: #b45309; }
        .c-cyan .audit-kpi-icon { background: #cffafe; color: #0e7490; }

        .audit-kpi-val-row { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 4px; }
        .audit-kpi-val { font-size: 1.85rem; font-weight: 900; color: #0f172a; line-height: 1; letter-spacing: -.5px; }
        .audit-kpi-lbl { font-size: 0.74rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
        .audit-kpi-footer { display: flex; align-items: center; gap: 6px; margin-top: 14px; font-size: 0.73rem; font-weight: 700; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 10px; }

        /* Security Visual Widgets Row */
        .sec-widgets-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .sec-widget-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 22px 24px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.03);
        }
        .sec-widget-title {
          font-size: .95rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* Progress Bar Stack */
        .bar-stack {
          height: 12px;
          border-radius: 6px;
          background: #f1f5f9;
          display: flex;
          overflow: hidden;
          margin-bottom: 18px;
        }
        .bar-seg { height: 100%; transition: width 0.3s ease; }

        .legend-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.8rem;
          font-weight: 700;
          color: #334155;
        }
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Live Activity Ticker */
        .activity-feed-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
        }
        .activity-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 0.75rem;
          font-weight: 800;
        }

        /* Filter Controls */
        .audit-filter-bar {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
        }
        .audit-search-box {
          position: relative;
          flex: 1;
          max-width: 420px;
        }
        .audit-search-input {
          width: 100%;
          padding: 10px 14px 10px 38px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: .88rem;
          outline: none;
          transition: all .15s;
          background: #f8fafc;
        }
        .audit-search-input:focus {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
        .audit-pills-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
        }
        .filter-pill {
          padding: 7px 14px;
          border-radius: 20px;
          font-weight: 700;
          font-size: .78rem;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          transition: all .15s;
          white-space: nowrap;
        }
        .filter-pill:hover {
          border-color: #cbd5e1;
          color: #0f172a;
        }
        .filter-pill.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
          box-shadow: 0 2px 8px rgba(37,99,235,0.25);
        }

        /* Audit Table Card */
        .audit-table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }
        .audit-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: .86rem;
        }
        .audit-table th {
          background: #f8fafc;
          padding: 14px 20px;
          font-weight: 800;
          font-size: .74rem;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: .05em;
          border-bottom: 1px solid #e2e8f0;
        }
        .audit-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          color: #0f172a;
          vertical-align: middle;
        }
        .audit-table tr:hover td {
          background: #f8fafc;
        }

        /* Badges & Pills */
        .badge-cat {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: .7rem;
          font-weight: 800;
          letter-spacing: .03em;
        }
        .cat-BIOMETRICS { background: #e0e7ff; color: #3730a3; }
        .cat-AUTH { background: #dcfce7; color: #166534; }
        .cat-SECURITY { background: #fee2e2; color: #991b1b; }
        .cat-BILLING { background: #fff7ed; color: #9a3412; }
        .cat-TENANT { background: #fae8ff; color: #86198f; }
        .cat-API { background: #cffafe; color: #155e75; }

        .status-SUCCESS { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .status-BLOCKED { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }

        /* Slide-over Inspector Drawer */
        .drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          justify-content: flex-end;
        }
        .drawer-content {
          width: 540px;
          height: 100%;
          background: #ffffff;
          box-shadow: -10px 0 30px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          animation: slideIn .2s cubic-bezier(.16,1,.3,1);
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .drawer-hdr {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
        }
        .drawer-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }
        .code-box {
          background: #0f172a;
          color: #38bdf8;
          border-radius: 12px;
          padding: 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: .8rem;
          overflow-x: auto;
          line-height: 1.5;
        }
      `}</style>

      {/* Clean White Top Header Banner */}
      <div className="audit-hdr-banner">
        <div className="audit-hdr-left">
          <div className="audit-hdr-icon">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="audit-hdr-title">Security & Audit Logs</h1>
              <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                🟢 100% SECURE • AES-256
              </span>
            </div>
            <div className="audit-hdr-sub">
              System audit trail, API token access, security compliance &amp; multi-tenant authentication event monitoring.
            </div>
          </div>
        </div>

        <div className="audit-hdr-actions">
          <button className="btn-audit-sec" onClick={handleRefresh}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn-audit-pri" onClick={exportCSV}>
            <Download size={16} />
            <span>Export Logs (CSV)</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Sparkline Metric Cards */}
      <div className="audit-kpi-grid">
        {/* Card 1: Total Events */}
        <div className="audit-kpi-card c-indigo">
          <div>
            <div className="audit-kpi-head">
              <span className="audit-kpi-lbl">Total Audit Events</span>
              <div className="audit-kpi-icon">
                <Activity size={20} />
              </div>
            </div>
            <div className="audit-kpi-val-row">
              <div className="audit-kpi-val">{totalEvents}</div>
              <svg style={{ width: 68, height: 28 }} viewBox="0 0 70 30" fill="none">
                <path d="M2 24 L18 16 L34 20 L50 10 L68 4" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div className="audit-kpi-footer">
            <span style={{ color: '#10b981', fontWeight: 800 }}>↑ +8.4%</span>
            <span>logged today</span>
          </div>
        </div>

        {/* Card 2: Auth Success */}
        <div className="audit-kpi-card c-emerald">
          <div>
            <div className="audit-kpi-head">
              <span className="audit-kpi-lbl">Success Rate</span>
              <div className="audit-kpi-icon">
                <CheckCircle size={20} />
              </div>
            </div>
            <div className="audit-kpi-val-row">
              <div className="audit-kpi-val">{successCount}</div>
              <svg style={{ width: 68, height: 28 }} viewBox="0 0 70 30" fill="none">
                <path d="M2 18 L20 12 L38 16 L54 8 L68 4" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div className="audit-kpi-footer">
            <span style={{ color: '#10b981', fontWeight: 800 }}>🟢 100%</span>
            <span>granted authentication</span>
          </div>
        </div>

        {/* Card 3: Blocked Threats */}
        <div className="audit-kpi-card c-amber">
          <div>
            <div className="audit-kpi-head">
              <span className="audit-kpi-lbl">Blocked Threats</span>
              <div className="audit-kpi-icon">
                <ShieldAlert size={20} />
              </div>
            </div>
            <div className="audit-kpi-val-row">
              <div className="audit-kpi-val">{blockedCount}</div>
              <svg style={{ width: 68, height: 28 }} viewBox="0 0 70 30" fill="none">
                <path d="M2 14 L20 22 L36 16 L52 24 L68 12" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div className="audit-kpi-footer">
            <span style={{ color: '#10b981', fontWeight: 800 }}>✓ Auto-Ban</span>
            <span>firewall protected</span>
          </div>
        </div>

        {/* Card 4: Active Identities */}
        <div className="audit-kpi-card c-cyan">
          <div>
            <div className="audit-kpi-head">
              <span className="audit-kpi-lbl">Active Identities</span>
              <div className="audit-kpi-icon">
                <User size={20} />
              </div>
            </div>
            <div className="audit-kpi-val-row">
              <div className="audit-kpi-val">{uniqueUsers}</div>
              <svg style={{ width: 68, height: 28 }} viewBox="0 0 70 30" fill="none">
                <path d="M2 20 L22 14 L42 18 L68 6" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div className="audit-kpi-footer">
            <span style={{ color: '#0e7490', fontWeight: 800 }}>🔑 RBAC Active</span>
            <span>multi-tenant scopes</span>
          </div>
        </div>
      </div>

      {/* Security Widgets Row */}
      <div className="sec-widgets-grid">
        {/* Widget A: Category Breakdown */}
        <div className="sec-widget-card">
          <div className="sec-widget-title">
            <span>🛡️ Event Category Breakdown &amp; Volume</span>
            <span style={{ fontSize: '.75rem', color: '#64748b', fontWeight: 700 }}>LAST 24 HOURS</span>
          </div>

          <div className="bar-stack">
            <div className="bar-seg" style={{ width: '45%', background: '#6366f1' }} title="Biometrics (45%)"></div>
            <div className="bar-seg" style={{ width: '25%', background: '#10b981' }} title="Auth (25%)"></div>
            <div className="bar-seg" style={{ width: '15%', background: '#06b6d4' }} title="API (15%)"></div>
            <div className="bar-seg" style={{ width: '15%', background: '#f59e0b' }} title="Tenant & Security (15%)"></div>
          </div>

          <div className="legend-grid">
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#6366f1' }}></div>
              <span>Biometric Enrollment &amp; Matching (45%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#10b981' }}></div>
              <span>JWT Authentication &amp; Logins (25%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#06b6d4' }}></div>
              <span>API Scopes &amp; Key Rotations (15%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#f59e0b' }}></div>
              <span>Tenant Setup &amp; Security Alerts (15%)</span>
            </div>
          </div>
        </div>

        {/* Widget B: Real-Time Security Telemetry */}
        <div className="sec-widget-card">
          <div className="sec-widget-title">
            <span>⚡ Live Telemetry Ticker</span>
            <span style={{ fontSize: '.72rem', color: '#10b981', fontWeight: 800, background: '#dcfce7', padding: '2px 8px', borderRadius: 8 }}>STREAM</span>
          </div>

          <div className="activity-feed-list">
            <div className="activity-item">
              <div className="activity-icon" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                <Cpu size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '.8rem', fontWeight: 800, color: '#0f172a' }}>Vector Engine Synced</div>
                <div style={{ fontSize: '.72rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>284 face embeddings cached in memory</div>
              </div>
              <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#94a3b8' }}>15:38</span>
            </div>

            <div className="activity-item">
              <div className="activity-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                <ShieldAlert size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '.8rem', fontWeight: 800, color: '#0f172a' }}>Tor Relay Blocked</div>
                <div style={{ fontSize: '.72rem', color: '#64748b' }}>IP 185.220.101.5 auto-banned 24h</div>
              </div>
              <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#94a3b8' }}>15:32</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="audit-filter-bar">
        <div className="audit-search-box">
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            className="audit-search-input"
            placeholder="Search logs by Email, IP, Action, or Tenant..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Pills */}
        <div className="audit-pills-wrap">
          {['ALL', 'AUTH', 'BIOMETRICS', 'TENANT', 'API', 'BILLING', 'SECURITY'].map(cat => (
            <button
              key={cat}
              className={`filter-pill ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Data Table */}
      <div className="audit-table-card">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Log ID &amp; Time</th>
              <th>User &amp; Role</th>
              <th>Tenant Org</th>
              <th>Category &amp; Action</th>
              <th>IP &amp; Location</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id}>
                <td>
                  <div style={{ fontWeight: 800, fontSize: '.84rem', color: '#0f172a' }}>{log.id}</div>
                  <div style={{ fontSize: '.76rem', color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />
                    <span>{log.timestamp}</span>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{log.user_email}</div>
                  <span style={{ fontSize: '.72rem', fontWeight: 800, color: '#4f46e5', background: '#e0e7ff', padding: '2px 7px', borderRadius: 4, marginTop: 3, display: 'inline-block' }}>
                    {log.user_role}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#334155' }}>
                    <Building2 size={15} color="#64748b" />
                    <span>{log.tenant_name}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge-cat cat-${log.category}`}>
                    {log.category}
                  </span>
                  <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                    {log.action}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{log.ip_address}</div>
                  <div style={{ fontSize: '.76rem', color: '#64748b', marginTop: 2 }}>{log.location}</div>
                </td>
                <td>
                  <span className={`status-${log.status}`} style={{ padding: '4px 10px', borderRadius: 12, fontSize: '.74rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {log.status === 'SUCCESS' && <CheckCircle size={12} />}
                    {log.status === 'BLOCKED' && <XCircle size={12} />}
                    <span>{log.status}</span>
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => setSelectedLog(log)}
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: '.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Eye size={14} />
                    <span>Inspect</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slide-over Inspector Drawer */}
      {selectedLog && (
        <div className="drawer-overlay" onClick={() => setSelectedLog(null)}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
            <div className="drawer-hdr">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={22} color="#2563eb" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Audit Event Inspector</h3>
                  <div style={{ fontSize: '.78rem', color: '#64748b' }}>ID: {selectedLog.id}</div>
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Description</div>
                <div style={{ fontSize: '.95rem', fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{selectedLog.description}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '.72rem', color: '#64748b', fontWeight: 700 }}>IP ADDRESS</div>
                  <div style={{ fontSize: '.88rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{selectedLog.ip_address}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '.72rem', color: '#64748b', fontWeight: 700 }}>LOCATION</div>
                  <div style={{ fontSize: '.88rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{selectedLog.location}</div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Event Payload (JSON)</span>
                  <button
                    onClick={() => handleCopy(JSON.stringify(selectedLog.payload, null, 2), 'payload')}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, fontSize: '.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {copiedId === 'payload' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copiedId === 'payload' ? 'Copied!' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="code-box">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>

              <div>
                <div style={{ fontSize: '.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>SHA-256 Cryptographic Checksum</div>
                <div style={{ background: '#f1f5f9', padding: '10px 12px', borderRadius: 8, fontSize: '.75rem', fontFamily: 'monospace', color: '#334155', wordBreak: 'break-all', border: '1px solid #cbd5e1' }}>
                  {selectedLog.sha256}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
