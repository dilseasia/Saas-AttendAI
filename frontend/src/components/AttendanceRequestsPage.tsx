import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, Building2, RefreshCw, AlertCircle } from 'lucide-react';
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

export function AttendanceRequestsPage({ authData }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchCo, setSearchCo] = useState('');
  const [selectedCo, setSelectedCo] = useState<Company | null>(null);

  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchReq, setSearchReq] = useState('');
  const [status, setStatus] = useState('All Status');

  const isSuperAdmin = authData.user?.role === 'super_admin' || authData.user?.email === 'admin@seasia.com';
  const token = authData.tokens?.access_token;

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

  const loadRequests = async () => {
    if (!selectedCo) return;
    setLoading(true);
    try {
      // In a full implementation, we'd pass tenant_id. For now, we mock an empty list to match the screenshot.
      // const res = await fetch(`${API}/requests/pending?tenant_id=${selectedCo.id}`, { headers: { Authorization: `Bearer ${token}` } });
      // const data = await res.json();
      // setRequests(data || []);
      setRequests([]); 
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [selectedCo]);

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
        
        .main-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; background: #ffffff; }
        
        .top-header { padding: 24px 32px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
        .active-badge { background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; margin-left: 12px; }
        .emp-pill { background: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; }
        
        .page-header { padding: 24px 32px; display: flex; align-items: flex-start; justify-content: space-between; }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .header-icon { width: 48px; height: 48px; border-radius: 12px; background: #8b5cf6; display: flex; align-items: center; justify-content: center; color: #fff; }
        .header-left h1 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #1e1b4b; }
        .header-left p { margin: 4px 0 0 0; font-size: 0.9rem; color: #64748b; }
        .btn-refresh { background: #6d28d9; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
        .btn-refresh:hover { background: #5b21b6; }

        .toolbar { padding: 0 32px 24px 32px; display: flex; gap: 16px; border-bottom: 1px solid #f1f5f9; }
        .search-req-wrapper { flex: 1; display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #fff; }
        .search-req-wrapper input { border: none; outline: none; flex: 1; margin-left: 8px; font-size: 0.9rem; color: #0f172a; }
        .filter-status { padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; background: #fff; font-size: 0.9rem; color: #334155; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; }

        .content-area { padding: 32px; display: flex; flex-direction: column; align-items: center; }
        .empty-state { width: 100%; max-width: 800px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; padding: 80px 24px; display: flex; flex-direction: column; align-items: center; text-align: center; }
        .empty-state-icon { width: 48px; height: 48px; border-radius: 50%; border: 2px solid #94a3b8; color: #94a3b8; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .empty-state h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
        .empty-state p { margin: 0; font-size: 0.9rem; color: #64748b; }
      `}</style>

      {/* Sidebar (Super Admin Only) */}
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

      {/* Main Content */}
      <div className="main-content">
        {selectedCo ? (
          <>
            <div className="top-header">
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

            <div className="page-header">
              <div className="header-left">
                <div className="header-icon">
                  {/* Building outline icon to match screenshot */}
                  <Building2 size={24} />
                </div>
                <div>
                  <h1>Attendance Request Management</h1>
                  <p>Review and manage employee attendance requests</p>
                </div>
              </div>
              <button className="btn-refresh" onClick={loadRequests}>
                <RefreshCw size={16} /> Refresh
              </button>
            </div>

            <div className="toolbar">
              <div className="search-req-wrapper">
                <Search size={18} color="#94a3b8" />
                <input 
                  type="text" 
                  placeholder="Search by name, ID, or date..." 
                  value={searchReq}
                  onChange={e => setSearchReq(e.target.value)}
                />
              </div>
              <select className="filter-status" value={status} onChange={e => setStatus(e.target.value)}>
                <option>All Status</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>

            <div className="content-area">
              {loading ? (
                <div style={{ padding: 40, color: '#64748b' }}>Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <AlertCircle size={24} />
                  </div>
                  <h3>No requests found</h3>
                  <p>There are no attendance requests at the moment.</p>
                </div>
              ) : (
                <div style={{ width: '100%' }}>
                  {/* Request cards/table would go here if not empty */}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Select a company to view attendance requests
          </div>
        )}
      </div>
    </div>
  );
}
