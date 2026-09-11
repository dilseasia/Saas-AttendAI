import React, { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, ChevronRight, Eye, Building2, User, Camera as CameraIcon } from 'lucide-react';
import { AuthResponse } from '../services/api';

const API = '/api/v1';

interface Props {
  authData: AuthResponse;
}

interface Company {
  id: string;
  name: string;
  total_employees: number;
}

export function AttendanceLogsPage({ authData }: Props) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sidebar State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchCo, setSearchCo] = useState('');
  const [selectedCo, setSelectedCo] = useState<Company | null>(null);

  const isSuperAdmin = authData.user?.role === 'super_admin' || authData.user?.email === 'admin@seasia.com';
  const token = authData.tokens?.access_token;

  // 1. Load Companies (if Super Admin)
  useEffect(() => {
    if (isSuperAdmin) {
      fetch(`${API.replace('/auth', '')}/billing/companies`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setCompanies(d.companies);
            if (d.companies.length > 0) setSelectedCo(d.companies[0]);
          }
        })
        .catch(console.error);
    } else {
      // Default to their own tenant
      setSelectedCo({ id: authData.user!.tenant_id, name: authData.tenant?.name || 'My Company', total_employees: 0 });
    }
  }, [isSuperAdmin, token, authData]);

  // 2. Load Raw Logs
  const loadLogs = useCallback(async (tenantId: string, targetDate: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/attendance/raw-logs?date=${targetDate}&tenant_id=${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (selectedCo) {
      loadLogs(selectedCo.id, date);
    }
  }, [selectedCo, date, loadLogs]);

  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(searchCo.toLowerCase()));

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', background: '#f8fafc', fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <style>{`
        .sidebar { width: 340px; background: #ffffff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; flex-shrink: 0; }
        .sidebar-head { padding: 20px; border-bottom: 1px solid #e2e8f0; }
        .search-box { display: flex; align-items: center; background: #f1f5f9; border-radius: 8px; padding: 8px 12px; margin-top: 12px; border: 1px solid #e2e8f0; }
        .search-box input { border: none; background: transparent; outline: none; font-size: .85rem; width: 100%; margin-left: 8px; color: #0f172a; }
        .co-list { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
        .co-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; cursor: pointer; transition: all .15s; border: 1px solid transparent; }
        .co-item:hover { background: #f8fafc; border-color: #f1f5f9; }
        .co-item.active { background: #eff6ff; border-color: #bfdbfe; box-shadow: 0 2px 8px rgba(37,99,235,.05); }
        .co-icon { width: 36px; height: 36px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #64748b; flex-shrink: 0; }
        .co-item.active .co-icon { background: #3b82f6; color: #ffffff; }
        .co-name { font-weight: 700; font-size: .9rem; color: #0f172a; }
        .co-stats { font-size: .75rem; color: #64748b; margin-top: 2px; }
        
        .main-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; background: #ffffff; }
        .header { padding: 24px 32px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
        .active-badge { background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; margin-left: 12px; }
        .emp-pill { background: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; }
        
        .toolbar { display: flex; gap: 12px; padding: 24px 32px 12px 32px; align-items: center; }
        .tool-input { padding: 10px 16px; border-radius: 8px; border: 1px solid #cbd5e1; outline: none; font-size: 0.9rem; flex: 1; max-width: 250px; }
        .btn-export { background: #10b981; color: #fff; padding: 10px 20px; border-radius: 8px; border: none; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 8px; margin-left: auto; transition: background 0.2s; }
        .btn-export:hover { background: #059669; }
        
        .table-container { margin: 12px 32px 32px 32px; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        table { width: 100%; border-collapse: collapse; text-align: left; }
        th { background: #9333ea; color: #fff; padding: 16px 24px; font-size: 0.85rem; font-weight: 700; }
        td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; color: #334155; }
        tr:last-child td { border-bottom: none; }
        
        .avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; margin-right: 12px; background: #e2e8f0; }
        .cam-badge { display: inline-flex; align-items: center; gap: 6px; background: #f0fdf4; color: #16a34a; padding: 4px 10px; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; border: 1px solid #bbf7d0; }
        .cam-dot { width: 6px; height: 6px; background: #16a34a; border-radius: 50%; }
        
        .btn-view { color: #6366f1; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; cursor: pointer; }
        .btn-view:hover { color: #4f46e5; text-decoration: underline; }
      `}</style>

      {/* 1. Sidebar (Super Admin Only) */}
      {isSuperAdmin && (
        <div className="sidebar">
          <div className="sidebar-head">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Companies</h2>
            <div className="search-box">
              <Search size={16} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Search company.." 
                value={searchCo} 
                onChange={e => setSearchCo(e.target.value)} 
              />
            </div>
          </div>
          <div className="co-list">
            {filteredCompanies.map(c => (
              <div 
                key={c.id} 
                className={`co-item ${selectedCo?.id === c.id ? 'active' : ''}`}
                onClick={() => setSelectedCo(c)}
              >
                <div className="co-icon">
                  <Building2 size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="co-name">{c.name}</div>
                  <div className="co-stats">{c.total_employees} employees</div>
                </div>
                <ChevronRight size={16} color={selectedCo?.id === c.id ? '#3b82f6' : '#cbd5e1'} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Main Content */}
      <div className="main-content">
        {selectedCo ? (
          <>
            <div className="header">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#312e81', margin: 0 }}>
                  {selectedCo.name} - Attendance
                </h1>
                <span className="active-badge">● Active</span>
              </div>
              <div className="emp-pill">
                {selectedCo.total_employees} Employees
              </div>
            </div>
            
            <div style={{ padding: '4px 32px', color: '#6366f1', fontSize: '0.85rem', fontWeight: 500 }}>
              View attendance records for all employees in {selectedCo.name}
            </div>

            <div className="toolbar">
              <input type="text" className="tool-input" placeholder="Search by name" />
              <input 
                type="date" 
                className="tool-input" 
                style={{ maxWidth: 160 }} 
                value={date} 
                onChange={e => setDate(e.target.value)} 
              />
              <select className="tool-input" style={{ maxWidth: 160, background: '#fff' }}>
                <option>All Cameras</option>
                <option>Entry</option>
                <option>Exit</option>
              </select>
              <button 
                className="btn-export" 
                onClick={() => window.open(`${API}/attendance/export-csv?date=${date}&tenant_id=${selectedCo.id}&token=${token}`)}
              >
                ↓ Export CSV
              </button>
            </div>

            <div className="table-container">
              <table>
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
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>Loading records...</td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>No entries found for {date}</td></tr>
                  ) : (
                    logs.map((log: any, idx: number) => {
                      const dt = new Date(log.timestamp);
                      const tDate = dt.toISOString().split('T')[0];
                      const tTime = dt.toTimeString().split(' ')[0];
                      return (
                        <tr key={log.id || idx}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                              {log.photo_url ? (
                                <img src={log.photo_url} alt="" className="avatar" />
                              ) : (
                                <div className="avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <User size={18} color="#94a3b8" />
                                </div>
                              )}
                              {log.name}
                            </div>
                          </td>
                          <td style={{ color: '#64748b' }}>{log.emp_id}</td>
                          <td style={{ color: '#64748b' }}>{tDate}</td>
                          <td style={{ color: '#64748b' }}>{tTime}</td>
                          <td>
                            <div className="cam-badge" style={{
                              background: log.camera_type === 'exit' ? '#fee2e2' : '#f0fdf4',
                              color: log.camera_type === 'exit' ? '#b91c1c' : '#16a34a',
                              borderColor: log.camera_type === 'exit' ? '#fca5a5' : '#bbf7d0'
                            }}>
                              <div className="cam-dot" style={{ background: log.camera_type === 'exit' ? '#b91c1c' : '#16a34a' }}></div>
                              {log.camera_type.charAt(0).toUpperCase() + log.camera_type.slice(1)}
                            </div>
                          </td>
                          <td>
                            <div className="btn-view">
                              <Eye size={16} /> View
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Select a company to view attendance logs
          </div>
        )}
      </div>
    </div>
  );
}
