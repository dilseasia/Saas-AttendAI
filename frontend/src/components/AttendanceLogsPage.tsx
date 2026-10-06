import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Calendar,
  Eye,
  Building2,
  User,
  Camera as CameraIcon,
  Download,
  Clock,
  CheckCircle2,
  LogOut,
  LogIn,
  X,
  Sparkles,
  Filter,
  RefreshCw
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

interface AttendanceLog {
  id: string;
  photo_url?: string;
  name: string;
  emp_id: string;
  timestamp: string;
  camera_type: 'entry' | 'exit' | string;
  camera_id?: string;
  confidence?: number;
}

// Default fallback mock data matching screenshot for instant high-fidelity demonstration
const DEFAULT_MOCK_LOGS: AttendanceLog[] = [
  {
    id: 'log-101',
    name: 'Pavitarta Chadha',
    emp_id: '3940',
    timestamp: '2026-09-14T17:25:46',
    camera_type: 'exit',
    camera_id: 'CAM-01',
    confidence: 0.985,
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'log-102',
    name: 'Ramanjeet Singh',
    emp_id: '2549',
    timestamp: '2026-09-14T16:33:20',
    camera_type: 'exit',
    camera_id: 'CAM-02',
    confidence: 0.972,
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'log-103',
    name: 'Rajeev Kumar',
    emp_id: '3893',
    timestamp: '2026-09-14T16:00:30',
    camera_type: 'entry',
    camera_id: 'CAM-01',
    confidence: 0.991,
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'log-104',
    name: 'Ganesh Verma',
    emp_id: '2572',
    timestamp: '2026-09-14T14:52:14',
    camera_type: 'entry',
    camera_id: 'CAM-03',
    confidence: 0.968,
    photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'log-105',
    name: 'Abhishek Vasudev',
    emp_id: '1940',
    timestamp: '2026-09-14T14:23:37',
    camera_type: 'entry',
    camera_id: 'CAM-01',
    confidence: 0.989,
    photo_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'log-106',
    name: 'Gurpreet Singh',
    emp_id: '2080',
    timestamp: '2026-09-14T14:08:46',
    camera_type: 'entry',
    camera_id: 'CAM-02',
    confidence: 0.994,
    photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
  }
];

export function AttendanceLogsPage({ authData }: Props) {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Tenant / Company State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cameraFilter, setCameraFilter] = useState<string>('ALL');

  // Inspector Modal State
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null);

  const isSuperAdmin = (authData.user?.role || '').toLowerCase().includes('super') || authData.user?.email === 'admin@seasia.com';
  const token = authData.tokens?.access_token;

  // 1. Fetch Companies for Dropdown Select
  useEffect(() => {
    if (isSuperAdmin && token) {
      fetch(`/billing/companies`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.success && Array.isArray(d.companies)) {
            setCompanies([{ id: 'ALL', name: 'All Companies' }, ...d.companies]);
          } else {
            setCompanies([
              { id: 'ALL', name: 'All Companies' },
              { id: '35dc9aa2-18e4-489c-aa53-df21f4e3cf8f', name: 'Seasia Infotech' },
              { id: '2d2506a2-e75f-47c7-a880-3f911e702b4e', name: 'Moogle Labs' },
              { id: '88c18b1c-4015-478d-adfa-7030e11beacb', name: 'OpenSource' }
            ]);
          }
        })
        .catch(() => {
          setCompanies([
            { id: 'ALL', name: 'All Companies' },
            { id: '35dc9aa2-18e4-489c-aa53-df21f4e3cf8f', name: 'Seasia Infotech' },
            { id: '2d2506a2-e75f-47c7-a880-3f911e702b4e', name: 'Moogle Labs' },
            { id: '88c18b1c-4015-478d-adfa-7030e11beacb', name: 'OpenSource' }
          ]);
        });
    } else {
      setCompanies([{ id: authData.user?.tenant_id || 'my-tenant', name: authData.tenant?.name || 'My Company' }]);
      setSelectedCompanyId(authData.user?.tenant_id || 'my-tenant');
    }
  }, [isSuperAdmin, token, authData]);

  // 2. Fetch Raw Attendance Logs
  const loadLogs = useCallback(async (tenantId: string, targetDate: string) => {
    setLoading(true);
    try {
      const targetTenant = tenantId === 'ALL' ? '' : tenantId;
      const res = await fetch(`${API}/attendance/raw-logs?date=${targetDate}&tenant_id=${targetTenant}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
        setLogs(data.logs.map((log: any) => ({
          ...log,
          company_name: log.company_name || '',
          tenant_id: log.tenant_id || '',
        })));
      } else {
        setLogs([]);
      }
    } catch (e) {
      console.error(e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadLogs(selectedCompanyId, date);
  }, [selectedCompanyId, date, loadLogs]);

  // Filter logs locally
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.emp_id.includes(searchQuery) ||
      (log.camera_id && log.camera_id.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCam =
      cameraFilter === 'ALL' ||
      (cameraFilter === 'ENTRY' && log.camera_type === 'entry') ||
      (cameraFilter === 'EXIT' && log.camera_type === 'exit') ||
      log.camera_id === cameraFilter;

    return matchesSearch && matchesCam;
  });

  // Calculate Metrics
  const totalEntriesCount = filteredLogs.filter(l => l.camera_type === 'entry').length;
  const totalExitsCount = filteredLogs.filter(l => l.camera_type === 'exit').length;

  const exportCSV = () => {
    if (token) {
      window.open(`${API}/attendance/export-csv?date=${date}&tenant_id=${selectedCompanyId}&token=${token}`);
    } else {
      const headers = 'Name,Employee ID,Date,Time,Camera,Type\n';
      const rows = filteredLogs.map(l => {
        const dt = new Date(l.timestamp);
        return `"${l.name}","${l.emp_id}","${dt.toISOString().split('T')[0]}","${dt.toTimeString().split(' ')[0]}","${l.camera_id || 'CAM-01'}","${l.camera_type}"`;
      }).join('\n');

      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_logs_${date}.csv`;
      a.click();
    }
  };

  return (
    <div className="att-page">
      <style>{`
        .att-page {
          flex: 1;
          background: #f8fafc;
          padding: 28px 36px;
          min-height: 100vh;
          overflow-y: auto;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #0f172a;
        }

        /* Top Title Header */
        .att-header {
          margin-bottom: 24px;
        }
        .att-title {
          font-size: 1.8rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
          letter-spacing: -.3px;
        }
        .att-sub {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
          margin: 0;
        }

        /* KPI Quick Metrics Bar */
        .att-kpi-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .att-kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
          transition: transform .15s;
        }
        .att-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.05);
        }
        .att-kpi-val { font-size: 1.6rem; font-weight: 900; color: #0f172a; line-height: 1.1; }
        .att-kpi-lbl { font-size: 0.76rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .03em; }

        /* Toolbar Row - Exactly matching user screenshot */
        .att-toolbar {
          display: flex;
          align-items: flex-end;
          gap: 14px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .tool-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tool-label {
          font-size: 0.76rem;
          font-weight: 800;
          color: #475569;
          letter-spacing: .02em;
        }

        .tool-select-box {
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 12px;
          padding: 10px 14px;
          gap: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          transition: border-color .15s, box-shadow .15s;
        }
        .tool-select-box:focus-within {
          border-color: #9333ea;
          box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.12);
        }

        .tool-select {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
          cursor: pointer;
          font-family: inherit;
          min-width: 140px;
        }

        .tool-search-input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.88rem;
          font-weight: 600;
          color: #0f172a;
          width: 180px;
          font-family: inherit;
        }

        .btn-export-csv {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          padding: 11px 22px;
          border-radius: 9999px;
          border: none;
          font-weight: 800;
          font-size: 0.88rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
          transition: all 0.15s ease;
        }
        .btn-export-csv:hover {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(16, 185, 129, 0.4);
        }

        /* Attendance Table Card */
        .att-table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
        }

        .att-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .att-table th {
          background: #9333ea;
          color: #ffffff;
          padding: 16px 24px;
          font-size: 0.86rem;
          font-weight: 800;
          letter-spacing: .02em;
          border-bottom: 1px solid #7e22ce;
        }

        .att-table td {
          padding: 16px 24px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          font-size: 0.88rem;
          color: #334155;
        }
        .att-table tr:hover td {
          background: #fdf4ff;
        }

        /* Avatar & User Name */
        .user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 800;
          color: #0f172a;
        }
        .user-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e9d5ff;
          flex-shrink: 0;
        }
        .user-avatar-placeholder {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #f1f5f9;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #cbd5e1;
          flex-shrink: 0;
        }

        /* Status Pills */
        .pill-entry {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .pill-exit {
          background: #ffedd5;
          color: #c2410c;
          border: 1px solid #fed7aa;
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        /* View Button */
        .btn-view-purple {
          color: #9333ea;
          font-weight: 800;
          font-size: 0.85rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: color 0.15s;
          border: none;
          background: none;
        }
        .btn-view-purple:hover {
          color: #7e22ce;
          text-decoration: underline;
        }

        /* Modal Inspector */
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
          border-radius: 20px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          overflow: hidden;
          animation: popIn 0.2s cubic-bezier(.16,1,.3,1);
        }
        @keyframes popIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Top Title Header */}
      <div className="att-header">
        <h1 className="att-title">Attendance Dashboard</h1>
        <p className="att-sub">Monitor and manage employee attendance records across all tenant cameras.</p>
      </div>

      {/* Top 4 KPI Quick Metrics */}
      <div className="att-kpi-bar">
        <div className="att-kpi-card">
          <div>
            <div className="att-kpi-lbl">Total Logs Today</div>
            <div className="att-kpi-val">{filteredLogs.length}</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} />
          </div>
        </div>

        <div className="att-kpi-card">
          <div>
            <div className="att-kpi-lbl">Total Entries</div>
            <div className="att-kpi-val" style={{ color: '#15803d' }}>{totalEntriesCount}</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogIn size={20} />
          </div>
        </div>

        <div className="att-kpi-card">
          <div>
            <div className="att-kpi-lbl">Total Exits</div>
            <div className="att-kpi-val" style={{ color: '#c2410c' }}>{totalExitsCount}</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ffedd5', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={20} />
          </div>
        </div>

        <div className="att-kpi-card">
          <div>
            <div className="att-kpi-lbl">Active Cameras</div>
            <div className="att-kpi-val" style={{ color: '#2563eb' }}>3</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CameraIcon size={20} />
          </div>
        </div>
      </div>

      {/* Toolbar Controls - Exactly matching user screenshot */}
      <div className="att-toolbar">
        {/* 1. Company (Tenant) Select Dropdown - Highlighted in Red Box */}
        {isSuperAdmin && (
          <div className="tool-group">
            <span className="tool-label">Company (Tenant)</span>
            <div className="tool-select-box">
              <Building2 size={18} color="#9333ea" />
              <select
                className="tool-select"
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
        )}

        {/* 2. Search by Name */}
        <div className="tool-group">
          <span className="tool-label">&nbsp;</span>
          <div className="tool-select-box">
            <input
              type="text"
              className="tool-search-input"
              placeholder="Search by name"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <Search size={18} color="#94a3b8" />
          </div>
        </div>

        {/* 3. Date Picker */}
        <div className="tool-group">
          <span className="tool-label">&nbsp;</span>
          <div className="tool-select-box">
            <input
              type="date"
              className="tool-select"
              style={{ minWidth: 130 }}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            <Calendar size={18} color="#9333ea" />
          </div>
        </div>

        {/* 4. Camera Selector Dropdown */}
        <div className="tool-group">
          <span className="tool-label">&nbsp;</span>
          <div className="tool-select-box">
            <CameraIcon size={18} color="#9333ea" />
            <select
              className="tool-select"
              value={cameraFilter}
              onChange={e => setCameraFilter(e.target.value)}
            >
              <option value="ALL">All Cameras</option>
              <option value="ENTRY">Entry Cameras</option>
              <option value="EXIT">Exit Cameras</option>
              <option value="CAM-01">CAM-01</option>
              <option value="CAM-02">CAM-02</option>
              <option value="CAM-03">CAM-03</option>
            </select>
          </div>
        </div>

        {/* 5. Export CSV Button */}
        <button className="btn-export-csv" onClick={exportCSV}>
          <Download size={17} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Attendance Table */}
      <div className="att-table-card">
        <table className="att-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Employee ID</th>
              <th>Date</th>
              <th>Time</th>
              <th>Camera</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: 600 }}>
                  <RefreshCw size={24} className="animate-spin" color="#9333ea" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                  Loading Attendance Records...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: 600 }}>
                  No attendance records found for selected filters on {date}.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => {
                const dt = new Date(log.timestamp);
                const dateStr = !isNaN(dt.getTime()) ? dt.toISOString().split('T')[0] : date;
                const timeStr = log.time
  ? String(log.time).split('.')[0]
  : (!isNaN(dt.getTime()) ? dt.toTimeString().split(' ')[0] : '');
                const isExit = log.camera_type === 'exit';

                return (
                  <tr key={log.id}>
                    <td>
                      <div className="user-cell">
                        {log.photo_url ? (
                          <img src={log.photo_url} alt="" className="user-avatar" />
                        ) : (
                          <div className="user-avatar-placeholder">
                            <User size={18} />
                          </div>
                        )}
                        <span>{log.name}</span>
                      </div>
                    </td>
                    <td style={{ color: '#64748b', fontWeight: 600 }}>
  {selectedCompanyId === 'ALL' && log.company_name
    ? `${log.emp_id} (${log.company_name})`
    : log.emp_id}
</td>
                    <td style={{ color: '#475569', fontWeight: 600 }}>{dateStr}</td>
                    <td style={{ color: '#475569', fontWeight: 600 }}>{timeStr}</td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#334155', background: '#f1f5f9', padding: '4px 10px', borderRadius: 8, fontSize: '.8rem' }}>
                        {log.camera_id || 'CAM-01'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className={isExit ? 'pill-exit' : 'pill-entry'}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isExit ? '#c2410c' : '#15803d' }}></span>
                          {isExit ? 'Exit' : 'Entry'}
                        </span>

                        <button
                          className="btn-view-purple"
                          onClick={async () => {
                            setSelectedLog(log);

                            try {
                              const cleanTime = String(log.time || '00:00:00')
                                .split('.')[0];

                              const fileName =
                                cleanTime.replace(/:/g, '-') + '.jpg';

                              const photoUrl =
                                `${API}/attendance/recognized-photo` +
                                `?tenant_id=${encodeURIComponent(log.tenant_id)}` +
                                `&date=${encodeURIComponent(log.date)}` +
                                `&emp_id=${encodeURIComponent(log.emp_id)}` +
                                `&cam_type=${encodeURIComponent(log.camera_type || 'entry')}` +
                                `&file=${encodeURIComponent(fileName)}`;

                              const response = await fetch(photoUrl, {
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              });

                              if (!response.ok) {
                                throw new Error(
                                  `Photo request failed: ${response.status}`
                                );
                              }

                              const blob = await response.blob();
                              const imageUrl = URL.createObjectURL(blob);

                              setSelectedLog((current: any) =>
                                current
                                  ? { ...current, photo_url: imageUrl }
                                  : current
                              );
                            } catch (error) {
                              console.error(
                                'Failed to load attendance photo:',
                                error
                              );
                            }
                          }}
                        >
                          <Eye size={15} />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Face Snapshot Inspector Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => {
              if (selectedLog?.photo_url?.startsWith('blob:')) {
                URL.revokeObjectURL(selectedLog.photo_url);
              }
              setSelectedLog(null);
            }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Eye size={20} color="#9333ea" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Attendance Recognition Details</h3>
              </div>
              <button onClick={() => {
                  if (selectedLog?.photo_url?.startsWith('blob:')) {
                    URL.revokeObjectURL(selectedLog.photo_url);
                  }
                  setSelectedLog(null);
                }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '22px', textAlign: 'center' }}>
              {selectedLog.photo_url ? (
                <img
                  src={selectedLog.photo_url}
                  alt={selectedLog.name}
                  style={{
                    width: '100%',
                    height: 260,
                    borderRadius: 12,
                    objectFit: 'cover',
                    border: '1px solid #e2e8f0',
                    margin: '0 auto 18px auto',
                    display: 'block',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.10)'
                  }}
                />
              ) : (
                <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', border: '3px solid #cbd5e1' }}>
                  <User size={48} color="#94a3b8" />
                </div>
              )}

              <h4 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>{selectedLog.name}</h4>
              <div style={{ fontSize: '.84rem', fontWeight: 700, color: '#64748b', marginBottom: 18 }}>Employee ID: {selectedLog.emp_id}</div>

              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'left' }}>
                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#64748b' }}>CAMERA TYPE</div>
                  <div style={{ fontSize: '.88rem', fontWeight: 800, color: selectedLog.camera_type === 'exit' ? '#c2410c' : '#15803d', marginTop: 2 }}>
                    {selectedLog.camera_type === 'exit' ? '🟠 EXIT CAMERA' : '🟢 ENTRY CAMERA'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#64748b' }}>CONFIDENCE</div>
                  <div style={{ fontSize: '.88rem', fontWeight: 800, color: '#9333ea', marginTop: 2 }}>
                    {Math.round((selectedLog.confidence || 0.98) * 100)}% Match
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  textAlign: 'left'
                }}
              >
                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#64748b' }}>
                    DATE
                  </div>
                  <div style={{ fontSize: '.88rem', fontWeight: 800, color: '#0f172a', marginTop: 3 }}>
                    {selectedLog.date}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#64748b' }}>
                    TIME
                  </div>
                  <div style={{ fontSize: '.88rem', fontWeight: 800, color: '#0f172a', marginTop: 3 }}>
                    {String(selectedLog.time || '').split('.')[0]}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 22px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: '#9333ea', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
