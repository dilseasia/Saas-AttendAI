import React, { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, ChevronRight, Building2, Clock, Filter as FilterIcon } from 'lucide-react';
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

export function AnonymousLogsPage({ authData }: Props) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('All');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');

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
      setSelectedCo({ id: authData.user!.tenant_id, name: authData.tenant?.name || 'My Company', total_employees: 0 });
    }
  }, [isSuperAdmin, token, authData]);

  // 2. Load Anonymous Logs
  const loadLogs = useCallback(async (tenantId: string, targetDate: string) => {
    setLoading(true);
    try {
      // We pass tenant_id so the backend uses the selected company's tenant ID
      const res = await fetch(`${API}/attendance/anonymous-logs?date=${targetDate}&tenant_id=${tenantId}`, {
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
    <div style={{ flex: 1, display: 'flex', height: '100%', background: '#f4f6fb', fontFamily: "'Inter',-apple-system,sans-serif" }}>
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
        .co-item.active .co-icon { background: #4f46e5; color: #ffffff; }
        .co-name { font-weight: 700; font-size: .9rem; color: #0f172a; }
        .co-stats { font-size: .75rem; color: #64748b; margin-top: 2px; }
        
        .main-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; background: #f8fafc; }
        .header { padding: 24px 32px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
        .active-badge { background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; margin-left: 12px; }
        .emp-pill { background: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; }
        
        .banner { background: linear-gradient(90deg, #4f46e5 0%, #60a5fa 100%); margin: 24px 32px; padding: 20px 32px; border-radius: 12px; color: #fff; display: flex; align-items: center; }
        .banner h1 { margin: 0; font-size: 1.5rem; font-weight: 800; }

        .toolbar { display: flex; flex-wrap: wrap; gap: 20px; padding: 0 32px 24px 32px; align-items: center; font-size: 0.85rem; color: #334155; font-weight: 500; }
        .toolbar-group { display: flex; align-items: center; gap: 8px; }
        .tool-input { padding: 8px 12px; border-radius: 20px; border: 1px solid #cbd5e1; outline: none; font-size: 0.85rem; background: #fff; min-width: 130px; display: flex; align-items: center; justify-content: space-between; }
        
        .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; padding: 0 32px 32px 32px; overflow-y: auto; }
        .img-card { background: transparent; display: flex; flex-direction: column; gap: 8px; }
        .img-wrapper { position: relative; width: 100%; padding-top: 56.25%; border-radius: 12px; overflow: hidden; background: #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .img-wrapper img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
        
        .img-label { font-size: 0.75rem; color: #475569; font-weight: 600; text-align: center; }
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
                <ChevronRight size={16} color={selectedCo?.id === c.id ? '#4f46e5' : '#cbd5e1'} />
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
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#312e81', margin: 0 }}>
                  {selectedCo.name} - Attendance
                </h2>
                <span className="active-badge">● Active</span>
              </div>
              <div className="emp-pill">
                {selectedCo.total_employees} Employees
              </div>
            </div>

            <div className="banner">
              <h1>Anonymous Detections</h1>
            </div>

            <div className="toolbar">
              <div className="toolbar-group">
                Date:
                <input 
                  type="date" 
                  className="tool-input" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                />
              </div>
              <div className="toolbar-group">
                Filter:
                <select className="tool-input" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="All">All</option>
                  <option value="entry">Entry</option>
                  <option value="exit">Exit</option>
                </select>
              </div>
              <div className="toolbar-group">
                Camera:
                <select className="tool-input">
                  <option value="All">All</option>
                </select>
              </div>
              <div className="toolbar-group">
                From:
                <div style={{ position: 'relative' }}>
                  <input type="time" className="tool-input" value={fromTime} onChange={e => setFromTime(e.target.value)} />
                </div>
              </div>
              <div className="toolbar-group">
                To:
                <div style={{ position: 'relative' }}>
                  <input type="time" className="tool-input" value={toTime} onChange={e => setToTime(e.target.value)} />
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading captures...</div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No anonymous detections found for {date}</div>
            ) : (
              <div className="grid-container">
                {logs.filter(l => filterType === 'All' || l.camera_type === filterType).map((log: any, idx: number) => (
                  <div key={idx} className="img-card">
                    <div className="img-wrapper">
                      <img 
                        src={`${log.url}&token=${token}`} 
                        alt="Anonymous Capture" 
                      />
                    </div>
                    <div className="img-label">
                      {log.time} • {log.camera_type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Select a company to view anonymous logs
          </div>
        )}
      </div>
    </div>
  );
}
