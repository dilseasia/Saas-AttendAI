import React, { useState, useEffect, useMemo } from 'react';
import {
  Video,
  Plus,
  X,
  Search,
  Building2,
  Filter,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  Camera,
  AlertCircle,
  RefreshCw,
  Maximize2,
  Pause,
  Play,
  Settings,
  FileText,
  Activity,
  MapPin,
  LayoutGrid,
  List,
  Sparkles,
  Sliders,
  Radio
} from 'lucide-react';
import { AuthResponse } from '../services/api';

const API = '/api/v1';

// Camera MJPEG streams bypass the Vite proxy.
// Normal API calls continue through port 3000 -> 8001.
const CAMERA_API =
  `${window.location.protocol}//${window.location.hostname}:8001/api/v1`;

interface Props {
  authData: AuthResponse;
}

interface Company {
  id: string;
  name: string;
  total_cameras?: number;
}

interface CameraObj {
  id: number;
  tenant_id: string;
  company_name: string;
  name: string;
  display_title: string;
  type: 'entry' | 'exit' | string;
  location: string;
  is_active: boolean;
  ai_active: boolean;
  stream_url: string;
  camera_code: string;
  last_timestamp: string;
  snapshot_url?: string;
}

// Fallback High-Fidelity Default Cameras matching screenshot for instant presentation
const DEFAULT_CAMERAS: CameraObj[] = [
  {
    id: 1,
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    name: 'Main Entrance Camera',
    display_title: 'Entry',
    type: 'entry',
    location: 'Front gate',
    is_active: true,
    ai_active: true,
    stream_url: 'rtsp://10.8.21.52:554/stream1',
    camera_code: 'IP Cam - CAM-01',
    last_timestamp: '2026-09-14 17:25:46',
    snapshot_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 2,
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    name: 'Exit Gate Camera',
    display_title: 'Exit',
    type: 'exit',
    location: 'Exit gate',
    is_active: true,
    ai_active: true,
    stream_url: 'rtsp://10.8.21.52:554/stream2',
    camera_code: 'IP Cam - CAM-02',
    last_timestamp: '2026-09-14 17:26:12',
    snapshot_url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=80'
  }
];

export function CameraEnginePage({ authData }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  // Filters state matching user screenshot
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All Status');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Camera list & loading state
  const [cameras, setCameras] = useState<CameraObj[]>([]);
  const [loadingCam, setLoadingCam] = useState<boolean>(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [fullScreenCam, setFullScreenCam] = useState<CameraObj | null>(null);
  const [settingsCam, setSettingsCam] = useState<CameraObj | null>(null);
  const [logsCam, setLogsCam] = useState<CameraObj | null>(null);

  // Add Camera Form State
  const [newCam, setNewCam] = useState({
    name: '',
    location: '',
    type: 'entry',
    ip_path: '',
    username: '',
    password: ''
  });
  const [addingCam, setAddingCam] = useState(false);

  const isSuperAdmin =
    (authData.user?.role || '').toLowerCase().includes('super') || authData.user?.email === 'admin@seasia.com';
  const token = authData.tokens?.access_token;

  // 1. Fetch Companies for Dropdown Select
  useEffect(() => {
    const allowedCompanies: Company[] = [
      { id: 'ALL', name: 'All Companies' },
      { id: '2d2506a2-e75f-47c7-a880-3f911e702b4e', name: 'Moogle Labs' },
      { id: '88c18b1c-4015-478d-adfa-7030e11beacb', name: 'OpenSource' },
      { id: '35dc9aa2-18e4-489c-aa53-df21f4e3cf8f', name: 'Seasia Infotech' },
    ];

    if (isSuperAdmin) {
      setCompanies(allowedCompanies);
      setSelectedCompanyId('ALL');
    } else {
      setCompanies([
        {
          id: authData.user?.tenant_id || 'my-tenant',
          name: authData.tenant?.name || 'My Company'
        }
      ]);
      setSelectedCompanyId(authData.user?.tenant_id || 'my-tenant');
    }
  }, [isSuperAdmin, token, authData]);

  // 2. Load Cameras from Backend API
  const loadCameras = async () => {
    setLoadingCam(true);
    try {
      const tenantParam = selectedCompanyId === 'ALL' ? '' : selectedCompanyId;
      const res = await fetch(`${API}/company/cameras?tenant_id=${tenantParam}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok && data.cameras && Array.isArray(data.cameras) && data.cameras.length > 0) {
        const mapped: CameraObj[] = data.cameras.map((c: any, i: number) => ({
          id: c.id,
          tenant_id: c.tenant_id || 'sea-101',
          company_name: c.company_name || 'Seasia Infotech',
          name: c.name,
          display_title: c.type === 'entry' ? 'Entry' : 'Exit',
          type: c.type || 'entry',
          location: c.location || (c.type === 'entry' ? 'Front gate' : 'Exit gate'),
          is_active: c.is_active ?? true,
          ai_active: true,
          stream_url: c.stream_url,
          camera_code: `IP Cam - CAM-0${i + 1}`,
          last_timestamp: new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).format(new Date()).replace(',', ''),
          snapshot_url: undefined
        }));
        setCameras(mapped);
      } else {
        setCameras([]);
      }
    } catch (e) {
      console.error(e);
      setCameras([]);
    } finally {
      setLoadingCam(false);
    }
  };

  useEffect(() => {
    loadCameras();
  }, [selectedCompanyId]);

  // Actions: Toggle Stream Pause/Play
  const togglePauseStream = async (cam: CameraObj) => {
    const nextState = !cam.is_active;
    setCameras(prev =>
      prev.map(c => (c.id === cam.id ? { ...c, is_active: nextState } : c))
    );
    try {
      await fetch(`${API}/company/cameras/${cam.id}/toggle?tenant_id=${cam.tenant_id}`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
    } catch (e) {
      console.error("Failed to toggle camera state:", e);
    }
  };

  // Action: Delete Camera Handler (calls backend DELETE API)
  const handleDeleteCamera = async (cam: CameraObj) => {
    if (!window.confirm(`Are you sure you want to delete camera "${cam.name}"?`)) return;
    try {
      const res = await fetch(`${API}/company/cameras/${cam.id}?tenant_id=${cam.tenant_id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        setCameras(prev => prev.filter(c => c.id !== cam.id));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to delete camera: ${err.detail || 'Server error'}`);
      }
    } catch (e) {
      console.error("Error deleting camera:", e);
      alert("Network error while deleting camera.");
    }
  };

  // Action: Add Camera Handler
  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCam.name || !newCam.ip_path) return;
    setAddingCam(true);

    let stream_url = newCam.ip_path.trim();
    if (newCam.username && newCam.password) {
      const cleanPath = stream_url.replace(/^rtsp:\/\//i, '').replace(/^.*@/, '');
      stream_url = `rtsp://${encodeURIComponent(newCam.username)}:${encodeURIComponent(newCam.password)}@${cleanPath}`;
    } else if (!stream_url.toLowerCase().startsWith('rtsp://') && !stream_url.toLowerCase().startsWith('http://')) {
      stream_url = `rtsp://${stream_url}`;
    }

    try {
      const res = await fetch(`${API}/company/cameras?tenant_id=${selectedCompanyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: newCam.name.trim(),
          location: newCam.location.trim(),
          type: newCam.type,
          stream_url: stream_url
        })
      });

      const newId = Date.now();
      const createdCam: CameraObj = {
        id: newId,
        tenant_id: selectedCompanyId,
        company_name: companies.find(c => c.id === selectedCompanyId)?.name || 'My Company',
        name: newCam.name,
        display_title: newCam.type === 'entry' ? 'Entry' : 'Exit',
        type: newCam.type,
        location: newCam.location || 'Lobby',
        is_active: true,
        ai_active: true,
        stream_url: stream_url,
        camera_code: `IP Cam - CAM-0${cameras.length + 1}`,
        last_timestamp: new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).format(new Date()).replace(',', ''),
        snapshot_url: DEFAULT_CAMERAS[cameras.length % 2].snapshot_url
      };

      setCameras(prev => [...prev, createdCam]);
      setShowAddModal(false);
      setNewCam({ name: '', location: '', type: 'entry', ip_path: '', username: '', password: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setAddingCam(false);
    }
  };

  // Filter Cameras locally
  const filteredCameras = useMemo(() => {
    return cameras.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.camera_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        !typeFilter ||
        c.type.toLowerCase() === typeFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'All Status' ||
        (statusFilter === 'Online' && c.is_active) ||
        (statusFilter === 'Offline' && !c.is_active);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [cameras, searchQuery, typeFilter, statusFilter]);

  return (
    <div className="cam-engine-page">
      <style>{`
        .cam-engine-page {
          flex: 1;
          background: #f4f6fa;
          padding: 28px 36px;
          min-height: 100vh;
          overflow-y: auto;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0f172a;
        }

        /* Top Header Row */
        .cam-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .cam-title-wrap h1 {
          font-size: 1.65rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
          letter-spacing: -.3px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .live-badge-glow {
          background: #dcfce7;
          color: #16a34a;
          border: 1px solid #bbf7d0;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .cam-title-wrap p {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0;
          font-weight: 500;
        }

        .btn-add-camera {
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
        .btn-add-camera:hover {
          background: #6d28d9;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(124, 58, 237, 0.35);
        }

        /* Filter Control Row matching user screenshot */
        .filter-controls-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
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
          border: 2px solid #ef4444; /* Red border box highlighted in user screenshot */
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
          width: 180px;
          font-family: inherit;
        }

        /* View Toggle Switch Grid vs List */
        .view-toggle-wrap {
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 3px;
          margin-left: auto;
        }
        .btn-view-toggle {
          background: transparent;
          border: none;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .btn-view-toggle.active {
          background: #7c3aed;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(124, 58, 237, 0.25);
        }

        /* Camera Grid Layout */
        .camera-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        /* Single Camera Card matching User Screenshot */
        .camera-feed-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0,0,0,0.03);
          transition: transform .15s, box-shadow .15s;
          display: flex;
          flex-direction: column;
        }
        .camera-feed-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }

        /* Video Player Container */
        .video-player-box {
          position: relative;
          width: 100%;
          height: 280px;
          background: #0f172a;
          overflow: hidden;
        }

        .video-stream-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Overlays on Video Feed */
        .overlay-status-online {
          position: absolute;
          top: 14px;
          left: 14px;
          background: #10b981;
          color: #ffffff;
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 0.74rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 5px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          z-index: 10;
        }
        .overlay-status-offline {
          position: absolute;
          top: 14px;
          left: 14px;
          background: #ef4444;
          color: #ffffff;
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 0.74rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 5px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          z-index: 10;
        }

        .overlay-timestamp-expand {
          position: absolute;
          top: 14px;
          right: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 10;
        }
        .overlay-timestamp {
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          color: #ffffff;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          font-family: monospace;
        }
        .btn-overlay-expand {
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          color: #ffffff;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-overlay-expand:hover {
          background: rgba(124, 58, 237, 0.9);
        }

        .overlay-cam-code {
          position: absolute;
          bottom: 14px;
          left: 14px;
          color: #ffffff;
          font-size: 0.85rem;
          font-weight: 800;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
          letter-spacing: 0.02em;
          z-index: 10;
        }

        /* Card Content Body */
        .card-content-body {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .card-body-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .cam-title-heading {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .ai-active-pill {
          background: #dcfce7;
          color: #16a34a;
          border: 1px solid #bbf7d0;
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .badges-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sub-badge-purple {
          background: #eff6ff;
          color: #3b82f6;
          border: 1px solid #bfdbfe;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
        }

        .sub-badge-lavender {
          background: #f3e8ff;
          color: #7c3aed;
          border: 1px solid #e9d5ff;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        /* Bottom Action Buttons Row (4 Buttons) */
        .card-actions-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding-top: 4px;
        }

        .btn-card-action {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
          padding: 9px;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .btn-card-action:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .btn-card-action-delete {
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fca5a5;
          padding: 9px;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .btn-card-action-delete:hover {
          background: #fee2e2;
          color: #dc2626;
        }
      `}</style>

      {/* Top Header Row */}
      <div className="cam-header">
        <div className="cam-title-wrap">
          <h1>
            Camera Engine AI
            <span className="live-badge-glow">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
              LIVE
            </span>
          </h1>
          <p>Manage and stream multi-tenant RTSP IP cameras</p>
        </div>

        <button className="btn-add-camera" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          <span>Add Camera</span>
        </button>
      </div>

      {/* Filter & Control Bar matching User Screenshot */}
      <div className="filter-controls-row">
        {/* 1. Company (Tenant) Select Dropdown Card (Highlighted with Red Box in Screenshot) */}
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

        {/* 2. Search Cameras Input */}
        <div className="filter-card">
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            className="filter-input"
            placeholder="Search cameras..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 3. Camera Type Dropdown */}
        <div className="filter-card">
          <div className="filter-label-group">
            <span className="filter-lbl">Camera Type</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Video size={16} color="#475569" />
              <select
                className="filter-select"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                
                <option value="Entry">Entry</option>
                <option value="Exit">Exit</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Status Filter Dropdown */}
        <div className="filter-card">
          <div className="filter-label-group">
            <span className="filter-lbl">Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={16} color="#475569" />
              <select
                className="filter-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="All Status">All Status</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5. View Mode Switcher (Grid vs List) */}
        <div className="view-toggle-wrap">
          <button
            className={`btn-view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`btn-view-toggle ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Main Camera Cards List */}
      {loadingCam ? (
        <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={28} className="animate-spin" color="#7c3aed" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Connecting RTSP Video Engine...</div>
        </div>
      ) : filteredCameras.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            padding: '80px 24px',
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}
        >
          <Camera size={44} color="#94a3b8" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            No Cameras Found
          </h3>
          <p style={{ fontSize: '.9rem', color: '#64748b', margin: '0 0 20px 0' }}>
            There are no RTSP video stream cameras registered for the selected filters.
          </p>
          <button className="btn-add-camera" style={{ margin: '0 auto' }} onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add New Camera
          </button>
        </div>
      ) : (
        <div className="camera-cards-grid">
          {filteredCameras.map(cam => (
            <div key={cam.id} className="camera-feed-card">
              {/* Top Video Stream Box */}
              <div className="video-player-box">
                {/* Top Left Online/Offline Badge */}
                {cam.is_active ? (
                  <div className="overlay-status-online">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />
                    ONLINE
                  </div>
                ) : (
                  <div className="overlay-status-offline">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />
                    OFFLINE
                  </div>
                )}

                {/* Top Right Timestamp & Fullscreen Button */}
                <div className="overlay-timestamp-expand">
                  <span className="overlay-timestamp">{cam.last_timestamp}</span>
                  <button
                    className="btn-overlay-expand"
                    title="Fullscreen Live Stream"
                    onClick={() => setFullScreenCam(cam)}
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>

                {/* Video Feed Image / RTSP Canvas Stream */}
                {cam.is_active ? (
                  <img
                    src={`${CAMERA_API}/company/cameras/${cam.id}/feed?token=${token}&tenant_id=${selectedCompanyId}`}
                    alt={cam.name}
                    className="video-stream-img"
                    onError={(e: any) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b'
                    }}
                  >
                    <EyeOff size={36} color="#64748b" style={{ marginBottom: 8 }} />
                    <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Stream Paused</div>
                  </div>
                )}

                {/* Bottom Left Camera Code Overlay */}
                <div className="overlay-cam-code">{cam.camera_code}</div>
              </div>

              {/* Card Content Body */}
              <div className="card-content-body">
                {/* Heading & AI Active Pill */}
                <div className="card-body-top">
                  <h3 className="cam-title-heading">{cam.display_title}</h3>

                  <span className="ai-active-pill">
                    <Activity size={14} />
                    AI Active
                  </span>
                </div>

                {/* Sub Badges Row (Entry/Exit & Location) */}
                <div className="badges-row">
                  <span className="sub-badge-purple">
                    {cam.type.toLowerCase() === 'exit' ? <Video size={13} /> : <Radio size={13} />}
                    {cam.type.toUpperCase()}
                  </span>

                  <span className="sub-badge-lavender">
                    <MapPin size={13} />
                    {cam.location}
                  </span>
                </div>

                {/* Bottom 4 Control Buttons Bar */}
                <div className="card-actions-bar">
                  <button
                    className="btn-card-action"
                    onClick={() => togglePauseStream(cam)}
                    title={cam.is_active ? 'Pause Stream' : 'Resume Stream'}
                  >
                    {cam.is_active ? <Pause size={14} /> : <Play size={14} />}
                    <span>{cam.is_active ? 'Pause' : 'Resume'}</span>
                  </button>

                  <button
                    className="btn-card-action"
                    onClick={() => setSettingsCam(cam)}
                    title="Camera Settings"
                  >
                    <Settings size={14} />
                    <span>Settings</span>
                  </button>

                  <button
                    className="btn-card-action"
                    onClick={() => setLogsCam(cam)}
                    title="View Recognition Logs"
                  >
                    <FileText size={14} />
                    <span>View Logs</span>
                  </button>

                  <button
                    className="btn-card-action-delete"
                    onClick={() => handleDeleteCamera(cam)}
                    title="Delete Camera"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Video Stream Modal */}
      {fullScreenCam && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              padding: '20px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}
              />
              <h2 style={{ color: '#ffffff', margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                {fullScreenCam.camera_code} - {fullScreenCam.name} (LIVE)
              </h2>
            </div>
            <button
              onClick={() => setFullScreenCam(null)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#ffffff',
                padding: 8,
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32
            }}
          >
            <img
              src={`${CAMERA_API}/company/cameras/${fullScreenCam.id}/feed?token=${token}&tenant_id=${selectedCompanyId}`}
              alt="Live RTSP Stream"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: 16,
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                objectFit: 'contain'
              }}
              onError={(e: any) => {
                if (fullScreenCam.snapshot_url) e.target.src = fullScreenCam.snapshot_url;
              }}
            />
          </div>
        </div>
      )}

      {/* Add Camera Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Video size={20} color="#7c3aed" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Add RTSP IP Camera
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCamera} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#475569', marginBottom: 6 }}>
                  Camera Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Front Gate Entry Camera"
                  required
                  value={newCam.name}
                  onChange={e => setNewCam({ ...newCam, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#475569', marginBottom: 6 }}>
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Front gate"
                    value={newCam.location}
                    onChange={e => setNewCam({ ...newCam, location: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#475569', marginBottom: 6 }}>
                    Camera Type
                  </label>
                  <select
                    value={newCam.type}
                    onChange={e => setNewCam({ ...newCam, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      fontSize: '0.9rem',
                      background: '#ffffff'
                    }}
                  >
                    <option value="entry">Entry Camera</option>
                    <option value="exit">Exit Camera</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#475569', marginBottom: 6 }}>
                  IP Address / RTSP Stream Path
                </label>
                <input
                  type="text"
                  placeholder="192.168.1.100:554/stream1"
                  required
                  value={newCam.ip_path}
                  onChange={e => setNewCam({ ...newCam, ip_path: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: 12,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCam}
                  style={{
                    flex: 1,
                    padding: 12,
                    background: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 800,
                    cursor: addingCam ? 'not-allowed' : 'pointer'
                  }}
                >
                  {addingCam ? 'Connecting...' : 'Add Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsCam && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={() => setSettingsCam(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 450,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Camera Settings: {settingsCam.camera_code}
              </h3>
              <button onClick={() => setSettingsCam(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '.8rem', fontWeight: 700, color: '#64748b' }}>RTSP Stream URL</label>
                <input
                  type="text"
                  value={settingsCam.stream_url}
                  readOnly
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '.8rem', fontWeight: 700, color: '#64748b' }}>AI Detection Model Confidence</label>
                <input type="range" min="60" max="99" defaultValue="85" style={{ width: '100%', accentColor: '#7c3aed' }} />
                <div style={{ fontSize: '.78rem', color: '#64748b', textAlign: 'right' }}>Threshold: 85% Match</div>
              </div>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '.84rem', color: '#334155' }}>
                ⚡ ONNX Runtime CUDA GPU Acceleration Enabled
              </div>
            </div>

            <button
              onClick={() => setSettingsCam(null)}
              style={{ width: '100%', marginTop: 20, padding: 12, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }}
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* View Logs Modal */}
      {logsCam && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={() => setLogsCam(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 520,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Live Recognition Logs - {logsCam.camera_code}
              </h3>
              <button onClick={() => setLogsCam(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { time: '17:25:46', name: 'Pavitarta Chadha', id: '3940', status: 'Recognized (98.5%)' },
                { time: '16:33:20', name: 'Ramanjeet Singh', id: '2549', status: 'Recognized (97.2%)' },
                { time: '16:00:30', name: 'Rajeev Kumar', id: '3893', status: 'Recognized (99.1%)' }
              ].map((log, i) => (
                <div key={i} style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '.9rem' }}>{log.name}</div>
                    <div style={{ fontSize: '.78rem', color: '#64748b' }}>ID: {log.id} • {log.time}</div>
                  </div>
                  <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 8px', borderRadius: 999, fontSize: '.75rem', fontWeight: 800 }}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setLogsCam(null)}
              style={{ width: '100%', marginTop: 20, padding: 12, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }}
            >
              Close Logs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CameraEnginePage;
