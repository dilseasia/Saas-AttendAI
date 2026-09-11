import React, { useState, useEffect } from 'react';
import { 
  Video, Plus, X, Search, Building2, Eye, EyeOff, Trash2, 
  CheckCircle2, Camera, AlertCircle, RefreshCw, ChevronRight, Edit3 
} from 'lucide-react';
import { AuthResponse } from '../services/api';

const API = '/api/v1';

interface Props {
  authData: AuthResponse;
}

interface Company {
  id: string;
  name: string;
  total_cameras: number;
}

interface CameraObj {
  id: number;
  name: string;
  type: string;
  location: string;
  is_active: boolean;
  stream_url: string;
}

export function CameraEnginePage({ authData }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCo, setLoadingCo] = useState(true);
  const [selected, setSelected] = useState<Company | null>(null);
  const [cameras, setCameras] = useState<CameraObj[]>([]);
  const [loadingCam, setLoadingCam] = useState(false);
  
  const [searchCo, setSearchCo] = useState('');
  const [searchCam, setSearchCam] = useState('');
  
  const [showAdd, setShowAdd] = useState(false);
  const [fullScreenCam, setFullScreenCam] = useState<CameraObj | null>(null);
  
  const isSuperAdmin = authData.user?.role === 'super_admin' || authData.user?.email === 'admin@seasia.com';
  const token = () => authData.tokens?.access_token || '';

  // Load Companies
  useEffect(() => {
    if (isSuperAdmin) {
      fetch(`${API.replace('/auth', '')}/billing/companies`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setCompanies(d.companies.map((c: any) => ({ ...c, total_cameras: c.total_cameras || 0 })));
            if (d.companies.length > 0) setSelected(d.companies[0]);
          }
        })
        .finally(() => setLoadingCo(false));
    } else {
      setSelected({ id: authData.user!.tenant_id, name: authData.tenant?.name || 'My Company', total_cameras: 0 });
      setLoadingCo(false);
    }
  }, [isSuperAdmin, authData]);

  // Load Cameras
  const loadCameras = async (tenantId: string) => {
    setLoadingCam(true);
    try {
      const res = await fetch(`${API}/company/cameras`, { 
        headers: { Authorization: `Bearer ${token()}`, 'X-Tenant-ID': tenantId } 
      });
      const data = await res.json();
      if (data.success) {
        setCameras(data.cameras);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCam(false);
    }
  };

  useEffect(() => {
    if (selected?.id) loadCameras(selected.id);
  }, [selected?.id]);

  // Actions
  const toggleCamera = async (cam: CameraObj) => {
    try {
      await fetch(`${API}/company/cameras/${cam.id}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'X-Tenant-ID': selected!.id },
      });
      loadCameras(selected!.id);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCamera = async (cam: CameraObj) => {
    if (!window.confirm(`Delete camera ${cam.name}?`)) return;
    try {
      await fetch(`${API}/company/cameras/${cam.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}`, 'X-Tenant-ID': selected!.id },
      });
      loadCameras(selected!.id);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(searchCo.toLowerCase()));
  const filteredCameras = cameras.filter(c => c.name.toLowerCase().includes(searchCam.toLowerCase()));

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', background: '#0f172a', fontFamily: "'Inter',-apple-system,sans-serif" }}>
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
        .co-name { font-weight: 700; font-size: .9rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .co-stats { font-size: .75rem; color: #64748b; margin-top: 2px; }
        
        .main-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; background: #f8fafc; }
        .main-head { padding: 24px 32px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
        .active-badge { background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; margin-left: 12px; }
        
        .page-header { padding: 32px; display: flex; align-items: flex-start; justify-content: space-between; }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .header-icon { width: 48px; height: 48px; border-radius: 12px; background: #4f46e5; display: flex; align-items: center; justify-content: center; color: #fff; }
        .btn-add { background: #4f46e5; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        
        .cam-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px; padding: 0 32px 32px 32px; }
        .cam-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; flex-direction: column; }
        .cam-video-box { height: 220px; background: #000; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; }
        .cam-video-box img { width: 100%; height: 100%; object-fit: cover; }
        .cam-status { position: absolute; top: 12px; left: 12px; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; color: #fff; z-index: 10; display: flex; align-items: center; gap: 6px; }
        .cam-status.online { background: rgba(22, 163, 74, 0.9); }
        .cam-status.offline { background: rgba(220, 38, 38, 0.9); }
        
        .cam-info { padding: 16px; }
        .cam-title { font-weight: 700; font-size: 1rem; color: #1e293b; margin-bottom: 4px; }
        .cam-meta { font-size: 0.85rem; color: #64748b; display: flex; gap: 12px; }
        .cam-actions { padding: 16px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .btn-action { background: #f1f5f9; color: #475569; border: none; padding: 8px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .btn-action.delete { color: #dc2626; background: #fef2f2; }
      `}</style>

      {/* Sidebar */}
      {isSuperAdmin && (
        <div className="sidebar">
          <div className="sidebar-head">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Companies</h2>
            <div className="search-box">
              <Search size={16} color="#94a3b8" />
              <input type="text" placeholder="Search company.." value={searchCo} onChange={e => setSearchCo(e.target.value)} />
            </div>
          </div>
          <div className="co-list">
            {filteredCompanies.map(c => (
              <div key={c.id} className={`co-item ${selected?.id === c.id ? 'active' : ''}`} onClick={() => setSelected(c)}>
                <div className="co-icon"><Building2 size={18} /></div>
                <div style={{ flex: 1 }}>
                  <div className="co-name">{c.name}</div>
                  <div className="co-stats">{c.total_cameras || 0} Cameras</div>
                </div>
                <ChevronRight size={16} color={selected?.id === c.id ? '#4f46e5' : '#cbd5e1'} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {selected ? (
          <>
            <div className="main-head">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  {selected.name}
                </h2>
                <span className="active-badge">● Active</span>
              </div>
            </div>

            <div className="page-header">
              <div className="header-left">
                <div className="header-icon">
                  <Video size={24} />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
                    Camera Engine AI <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 999, verticalAlign: 'middle', marginLeft: 8 }}>LIVE</span>
                  </h1>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#64748b' }}>
                    Manage and stream multi-tenant RTSP IP cameras
                  </p>
                </div>
              </div>
              <button className="btn-add" onClick={() => setShowAdd(true)}>
                <Plus size={18} /> Add Camera
              </button>
            </div>

            <div className="cam-grid">
              {cameras.map(cam => (
                <div key={cam.id} className="cam-card">
                  <div className="cam-video-box" onClick={() => setFullScreenCam(cam)}>
                    <div className={`cam-status ${cam.is_active ? 'online' : 'offline'}`}>
                      {cam.is_active ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      {cam.is_active ? 'ONLINE' : 'OFFLINE'}
                    </div>
                    {cam.is_active ? (
                      <img 
                        src={`${API}/company/cameras/${cam.id}/feed?token=${token()}&tenant_id=${selected.id}`} 
                        alt="Live Stream" 
                        onError={(e: any) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <EyeOff size={32} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Stream Paused</span>
                      </div>
                    )}
                  </div>
                  <div className="cam-info">
                    <div className="cam-title">{cam.name}</div>
                    <div className="cam-meta">
                      <span>{cam.type.toUpperCase()}</span>
                      <span>•</span>
                      <span>{cam.location}</span>
                    </div>
                  </div>
                  <div className="cam-actions">
                    <button className="btn-action" onClick={() => toggleCamera(cam)}>
                      {cam.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                      {cam.is_active ? 'Pause' : 'Resume'}
                    </button>
                    <button className="btn-action delete" onClick={() => deleteCamera(cam)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            Select a company to manage cameras
          </div>
        )}
      </div>

      {/* Full Screen Modal */}
      {fullScreenCam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: '#fff', margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }}></div>
              {fullScreenCam.name} (LIVE)
            </h2>
            <button onClick={() => setFullScreenCam(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: 8, borderRadius: 8, cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px 24px 24px' }}>
            <img 
              src={`${API}/company/cameras/${fullScreenCam.id}/feed?token=${token()}&tenant_id=${selected?.id}`} 
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }} 
              alt="Fullscreen Live Stream"
            />
          </div>
        </div>
      )}

      {/* Add Camera Modal - Mock UI */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 16, width: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Add RTSP Camera</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
            </div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 24 }}>
              To add a camera, use the backend API endpoint POST /api/v1/company/cameras.
            </div>
            <button onClick={() => setShowAdd(false)} style={{ width: '100%', padding: 12, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
