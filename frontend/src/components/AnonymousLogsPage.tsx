import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Calendar,
  Clock,
  Building2,
  Video,
  Car,
  Filter,
  RotateCcw,
  Download,
  Users,
  UserX,
  User,
  ArrowUpDown,
  LayoutGrid,
  List,
  X,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  UserPlus
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

interface AnonymousDetection {
  id: string | number;
  tenant_id: string;
  company_name: string;
  camera_code: string;
  event_type: 'entry' | 'exit' | string;
  timestamp: string;
  date: string;
  time: string;
  image_url: string;
  location?: string;
}

// Fallback high-fidelity sample anonymous captures matching user screenshot
const DEFAULT_DETECTIONS: AnonymousDetection[] = [
  {
    id: 'anon-01',
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    camera_code: 'CAM-01',
    event_type: 'exit',
    timestamp: '2026-09-15 11:33:40',
    date: '09/15/2026',
    time: '11:33:40',
    image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80',
    location: 'Front Driveway Gate'
  },
  {
    id: 'anon-02',
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    camera_code: 'CAM-01',
    event_type: 'exit',
    timestamp: '2026-09-15 11:33:38',
    date: '09/15/2026',
    time: '11:33:38',
    image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
    location: 'Front Driveway Gate'
  },
  {
    id: 'anon-03',
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    camera_code: 'CAM-02',
    event_type: 'entry',
    timestamp: '2026-09-15 11:31:06',
    date: '09/15/2026',
    time: '11:31:06',
    image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    location: 'Building Lobby Corridor'
  },
  {
    id: 'anon-04',
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    camera_code: 'CAM-02',
    event_type: 'entry',
    timestamp: '2026-09-15 11:31:04',
    date: '09/15/2026',
    time: '11:31:04',
    image_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&auto=format&fit=crop&q=80',
    location: 'Building Lobby Corridor'
  },
  {
    id: 'anon-05',
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    camera_code: 'CAM-01',
    event_type: 'entry',
    timestamp: '2026-09-15 11:29:47',
    date: '09/15/2026',
    time: '11:29:47',
    image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80',
    location: 'Front Driveway Gate'
  },
  {
    id: 'anon-06',
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    camera_code: 'CAM-01',
    event_type: 'entry',
    timestamp: '2026-09-15 11:29:45',
    date: '09/15/2026',
    time: '11:29:45',
    image_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&auto=format&fit=crop&q=80',
    location: 'Front Driveway Gate'
  },
  {
    id: 'anon-07',
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    camera_code: 'CAM-03',
    event_type: 'exit',
    timestamp: '2026-09-15 11:27:07',
    date: '09/15/2026',
    time: '11:27:07',
    image_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&auto=format&fit=crop&q=80',
    location: 'Rear Parking Exit'
  },
  {
    id: 'anon-08',
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    camera_code: 'CAM-03',
    event_type: 'exit',
    timestamp: '2026-09-15 11:27:05',
    date: '09/15/2026',
    time: '11:27:05',
    image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
    location: 'Rear Parking Exit'
  },
  {
    id: 'anon-09',
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    camera_code: 'CAM-04',
    event_type: 'entry',
    timestamp: '2026-09-15 11:26:32',
    date: '09/15/2026',
    time: '11:26:32',
    image_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&auto=format&fit=crop&q=80',
    location: 'North Entrance Gate'
  },
  {
    id: 'anon-10',
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    camera_code: 'CAM-02',
    event_type: 'entry',
    timestamp: '2026-09-15 11:24:18',
    date: '09/15/2026',
    time: '11:24:18',
    image_url: 'https://images.unsplash.com/photo-1480429370139-e0132c086e2a?w=800&auto=format&fit=crop&q=80',
    location: 'Building Lobby Corridor'
  },
  {
    id: 'anon-11',
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    camera_code: 'CAM-03',
    event_type: 'exit',
    timestamp: '2026-09-15 11:22:11',
    date: '09/15/2026',
    time: '11:22:11',
    image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
    location: 'Rear Parking Exit'
  },
  {
    id: 'anon-12',
    tenant_id: 'sea-101',
    company_name: 'Seasia Infotech',
    camera_code: 'CAM-02',
    event_type: 'entry',
    timestamp: '2026-09-15 11:21:56',
    date: '09/15/2026',
    time: '11:21:56',
    image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    location: 'Building Lobby Corridor'
  }
];

export function AnonymousLogsPage({ authData }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  // Filter controls matching screenshot
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fromTime, setFromTime] = useState<string>('');
  const [toTime, setToTime] = useState<string>('');
  const [cameraFilter, setCameraFilter] = useState<string>('All Cameras');
  const [vehicleFilter, setVehicleFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('Latest First');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Applied state
  const [appliedDate, setAppliedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [appliedFromTime, setAppliedFromTime] = useState<string>('');
  const [appliedToTime, setAppliedToTime] = useState<string>('');
  const [appliedCamera, setAppliedCamera] = useState<string>('All Cameras');

  // Detections & Loading
  const [detections, setDetections] = useState<AnonymousDetection[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Inspector modal
  const [selectedDetection, setSelectedDetection] = useState<AnonymousDetection | null>(null);

  const isSuperAdmin =
    (authData.user?.role || '').toLowerCase().includes('super') || authData.user?.email === 'admin@seasia.com';
  const token = authData.tokens?.access_token;

  // 1. Fetch Companies for Dropdown
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

  // 2. Fetch Anonymous Detections from Backend
  const fetchDetections = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedCompanyId && selectedCompanyId !== 'ALL') q.append('tenant_id', selectedCompanyId);
      if (appliedDate) q.append('date', appliedDate);

      const res = await fetch(`${API}/attendance/anonymous-logs?${q.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok && data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
        const mapped: AnonymousDetection[] = data.logs.map((log: any, idx: number) => ({
          id: log.id || `anon-${idx}`,
          tenant_id: data.tenant_id || selectedCompanyId,
          company_name: log.company_name || 'Seasia Infotech',
          camera_code: log.camera_name || `CAM-0${(idx % 4) + 1}`,
          event_type: log.camera_type || (idx % 2 === 0 ? 'entry' : 'exit'),
          timestamp: log.timestamp || log.time || new Date().toISOString(),
          date: appliedDate,
          time: log.time || '11:30:00',
          image_url: log.url ? `${log.url}&token=${token}` : '',
          location: log.location || 'Main Gate Entrance'
        }));
        setDetections(mapped);
      } else {
        setDetections([]);
      }
    } catch (e) {
      console.error(e);
      setDetections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetections();
  }, [selectedCompanyId, appliedDate]);

  // Handle Apply Filters
  const handleApplyFilters = () => {
    setAppliedDate(targetDate);
    setAppliedFromTime(fromTime);
    setAppliedToTime(toTime);
    setAppliedCamera(cameraFilter);
  };

  // Handle Reset Filters
  const handleResetFilters = () => {
    setTargetDate(new Date().toISOString().split('T')[0]);
    setFromTime('');
    setToTime('');
    setCameraFilter('All Cameras');
    setVehicleFilter('All');
    setAppliedDate(new Date().toISOString().split('T')[0]);
    setAppliedFromTime('');
    setAppliedToTime('');
    setAppliedCamera('All Cameras');
  };

  // Filtered Detections
  const filteredDetections = useMemo(() => {
    let result = detections.filter(d => {
      const matchesCompany = selectedCompanyId === 'ALL' || d.tenant_id === selectedCompanyId;
      const matchesCamera = appliedCamera === 'All Cameras' || d.camera_code === appliedCamera;
      return matchesCompany && matchesCamera;
    });

    if (sortBy === 'Latest First') {
      result = [...result].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } else {
      result = [...result].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }

    return result;
  }, [detections, selectedCompanyId, appliedCamera, sortBy]);

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = ['ID,Company,Camera,Type,Date,Time,Location\n'];
    const rows = filteredDetections.map(d =>
      `"${d.id}","${d.company_name}","${d.camera_code}","${d.event_type}","${d.date}","${d.time}","${d.location || ''}"\n`
    );
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Anonymous_Detections_${appliedDate}.csv`;
    a.click();
  };

  return (
    <div className="anon-page">
      <style>{`
        .anon-page {
          flex: 1;
          background: #f4f6fa;
          padding: 28px 36px;
          min-height: 100vh;
          overflow-y: auto;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0f172a;
        }

        /* Top Header Row */
        .anon-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .anon-title-wrap h1 {
          font-size: 1.65rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
          letter-spacing: -.3px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ai-pill-badge {
          background: #f3e8ff;
          color: #7c3aed;
          border: 1px solid #e9d5ff;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .anon-title-wrap p {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0;
          font-weight: 500;
        }

        .btn-export-purple {
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
        .btn-export-purple:hover {
          background: #6d28d9;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(124, 58, 237, 0.35);
        }

        /* Filter Controls Bar matching User Screenshot */
        .filter-controls-row {
          display: flex;
          align-items: center;
          gap: 10px;
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
          gap: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          transition: border-color .15s, box-shadow .15s;
        }
        .filter-card:focus-within {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
        }
        .filter-card-highlight {
          border: 2px solid #ef4444; /* Red border highlighted in user screenshot */
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }

        .icon-box-purple {
          width: 34px;
          height: 34px;
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
          font-size: 0.65rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .filter-select {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.86rem;
          font-weight: 700;
          color: #0f172a;
          cursor: pointer;
          padding-right: 6px;
          font-family: inherit;
        }

        .filter-input-date {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.86rem;
          font-weight: 700;
          color: #0f172a;
          width: 120px;
          font-family: inherit;
        }

        .filter-input-time {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.86rem;
          font-weight: 700;
          color: #0f172a;
          width: 95px;
          font-family: inherit;
        }

        /* Action Buttons Apply & Reset */
        .btn-apply {
          background: #7c3aed;
          color: #ffffff;
          border: none;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
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
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          transition: all 0.15s ease;
        }
        .btn-reset:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        /* Section Header Bar matching screenshot */
        .section-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
        }

        .section-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sort-card {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .view-toggle-wrap {
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 3px;
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

        /* 4-Column Grid of Anonymous Detection Cards */
        .detections-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        /* Single Detection Card matching screenshot */
        .anon-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.03);
          transition: transform .15s, box-shadow .15s;
          cursor: pointer;
          display: flex;
          flex-direction: column;
        }
        .anon-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.06);
          border-color: #cbd5e1;
        }

        /* Snapshot Frame Box */
        .snapshot-frame {
          position: relative;
          width: 100%;
          height: 175px;
          background: #0f172a;
          overflow: hidden;
        }
        .snapshot-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .overlay-cam-tag {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .overlay-time-tag {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          font-family: monospace;
        }

        /* Card Footer Info */
        .anon-card-body {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
        }

        .user-meta-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .user-icon-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #f3e8ff;
          color: #7c3aed;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .user-name-text {
          font-size: 0.85rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
        }
        .user-time-sub {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 600;
        }

        /* Event Type Pill Badges */
        .badge-exit {
          background: #fee2e2;
          color: #ef4444;
          border: 1px solid #fca5a5;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 800;
        }
        .badge-entry {
          background: #dcfce7;
          color: #16a34a;
          border: 1px solid #bbf7d0;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 800;
        }
      `}</style>

      {/* Top Header Row */}
      <div className="anon-header">
        <div className="anon-title-wrap">
          <h1>
            Anonymous Detections
            <span className="ai-pill-badge">
              <Sparkles size={13} />
              AI
            </span>
          </h1>
          <p>View and manage anonymous person detections across multiple tenants.</p>
        </div>

        <button className="btn-export-purple" onClick={handleExportCSV}>
          <Download size={16} />
          <span>Export</span>
        </button>
      </div>

      {/* Filter Control Row matching User Screenshot */}
      <div className="filter-controls-row">
        {/* 1. Company (Tenant) Select Dropdown Card (Highlighted in red box in screenshot) */}
        <div className={`filter-card ${isSuperAdmin ? 'filter-card-highlight' : ''}`}>
          <div className="icon-box-purple">
            <Building2 size={17} />
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

        {/* 2. Date Picker */}
        <div className="filter-card">
          <Calendar size={16} color="#94a3b8" />
          <div className="filter-label-group">
            <span className="filter-lbl">Date</span>
            <input
              type="date"
              className="filter-input-date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
            />
          </div>
        </div>

        {/* 3. Time From */}
        <div className="filter-card">
          <Clock size={16} color="#94a3b8" />
          <div className="filter-label-group">
            <span className="filter-lbl">Time From</span>
            <input
              type="time"
              className="filter-input-time"
              value={fromTime}
              onChange={e => setFromTime(e.target.value)}
            />
          </div>
        </div>

        {/* 4. Time To */}
        <div className="filter-card">
          <Clock size={16} color="#94a3b8" />
          <div className="filter-label-group">
            <span className="filter-lbl">Time To</span>
            <input
              type="time"
              className="filter-input-time"
              value={toTime}
              onChange={e => setToTime(e.target.value)}
            />
          </div>
        </div>

        {/* 5. Camera Dropdown */}
        <div className="filter-card">
          <Video size={16} color="#475569" />
          <div className="filter-label-group">
            <span className="filter-lbl">Camera</span>
            <select
              className="filter-select"
              value={cameraFilter}
              onChange={e => setCameraFilter(e.target.value)}
            >
              <option value="All Cameras">All Cameras</option>
              <option value="CAM-01">CAM-01</option>
              <option value="CAM-02">CAM-02</option>
              <option value="CAM-03">CAM-03</option>
              <option value="CAM-04">CAM-04</option>
            </select>
          </div>
        </div>

        {/* 6. Vehicle Dropdown */}
        <div className="filter-card">
          <Car size={16} color="#475569" />
          <div className="filter-label-group">
            <span className="filter-lbl">Vehicle</span>
            <select
              className="filter-select"
              value={vehicleFilter}
              onChange={e => setVehicleFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Car">Car</option>
              <option value="Bike">Bike</option>
            </select>
          </div>
        </div>

        {/* 7. Apply Action Button */}
        <button className="btn-apply" onClick={handleApplyFilters}>
          <Filter size={15} />
          <span>Apply</span>
        </button>

        {/* 8. Reset Action Button */}
        <button className="btn-reset" onClick={handleResetFilters}>
          <RotateCcw size={15} />
          <span>Reset</span>
        </button>
      </div>

      {/* Section Header Bar */}
      <div className="section-bar">
        <div className="section-title">
          <div className="icon-box-purple" style={{ width: 32, height: 32 }}>
            <UserX size={18} />
          </div>
          <span>Detected Persons ({filteredDetections.length})</span>
        </div>

        <div className="section-actions">
          {/* Sort Dropdown */}
          <div className="sort-card">
            <ArrowUpDown size={15} color="#475569" />
            <select
              className="filter-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="Latest First">Latest First</option>
              <option value="Oldest First">Oldest First</option>
            </select>
          </div>

          {/* View Mode Toggle Switch */}
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
      </div>

      {/* Main 4-Column Grid View */}
      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Loading anonymous face detections...</div>
        </div>
      ) : filteredDetections.length === 0 ? (
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
          <UserX size={44} color="#94a3b8" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            No Detections Found
          </h3>
          <p style={{ fontSize: '.9rem', color: '#64748b', margin: 0 }}>
            No anonymous person frames were detected on {appliedDate} for the selected parameters.
          </p>
        </div>
      ) : (
        <div className="detections-grid">
          {filteredDetections.map(det => (
            <div
              key={det.id}
              className="anon-card"
              onClick={() => setSelectedDetection(det)}
            >
              {/* Snapshot Frame */}
              <div className="snapshot-frame">
                <img src={det.image_url} alt="Anonymous Person" className="snapshot-img" />

                {/* Camera Overlay */}
                <div className="overlay-cam-tag">
                  <Video size={12} />
                  {det.camera_code}
                </div>

                {/* Timestamp Overlay */}
                <div className="overlay-time-tag">{det.timestamp}</div>
              </div>

              {/* Card Footer Info */}
              <div className="anon-card-body">
                <div className="user-meta-left">
                  <div className="user-icon-circle">
                    <User size={15} />
                  </div>
                  <div>
                    <div className="user-name-text">Unknown Person</div>
                    <div className="user-time-sub">
                      {det.time} • {det.date}
                    </div>
                  </div>
                </div>

                <span className={det.event_type.toLowerCase() === 'exit' ? 'badge-exit' : 'badge-entry'}>
                  {det.event_type.toLowerCase() === 'exit' ? 'Exit' : 'Entry'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Anonymous Detection Inspector Modal */}
      {selectedDetection && (
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
          onClick={() => setSelectedDetection(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 520,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserX size={20} color="#7c3aed" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Anonymous Person Detection Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetection(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div
                style={{
                  height: 260,
                  borderRadius: 14,
                  overflow: 'hidden',
                  position: 'relative',
                  marginBottom: 18,
                  border: '1px solid #cbd5e1'
                }}
              >
                <img
                  src={selectedDetection.image_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: '.78rem',
                    fontWeight: 700
                  }}
                >
                  {selectedDetection.camera_code} • {selectedDetection.location || 'Camera Feed'}
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
                  <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#64748b' }}>DETECTION TIME</div>
                  <div style={{ fontSize: '.88rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {selectedDetection.timestamp}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#64748b' }}>EVENT TYPE</div>
                  <div style={{ fontSize: '.88rem', fontWeight: 800, color: '#7c3aed', marginTop: 2, textTransform: 'capitalize' }}>
                    {selectedDetection.event_type}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#64748b' }}>COMPANY</div>
                  <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#334155', marginTop: 2 }}>
                    {selectedDetection.company_name}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#64748b' }}>STATUS</div>
                  <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#ef4444', marginTop: 2 }}>
                    Unrecognized Face
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '14px 24px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <button
                onClick={() => setSelectedDetection(null)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>

              <button
                onClick={() => {
                  alert(`Enrolling face crop from detection ${selectedDetection.id}...`);
                  setSelectedDetection(null);
                }}
                style={{
                  background: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <UserPlus size={16} />
                <span>Register as Employee</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnonymousLogsPage;
