import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  UserPlus,
  CheckCircle2,
  UserCheck,
  Check,
  Loader2,
  ChevronDown,
  ScanFace,
  Trash2
} from 'lucide-react';
import { AuthResponse } from '../services/api';

const API = '/api/v1';

const ALLOWED_COMPANIES = [
  { id: '2d2506a2-e75f-47c7-a880-3f911e702b4e', name: 'Moogle Labs' },
  { id: '88c18b1c-4015-478d-adfa-7030e11beacb', name: 'OpenSource' },
  { id: '35dc9aa2-18e4-489c-aa53-df21f4e3cf8f', name: 'Seasia Infotech' },
];

interface Props {
  authData: AuthResponse;
}

interface Company {
  id: string;
  name: string;
  total_employees?: number;
}

interface EmployeeItem {
  id: number;
  tenant_id: string;
  emp_id: string;
  name: string;
  department?: string;
  designation?: string;
  face_enrolled?: boolean;
}

interface AnonymousDetection {
  id: string | number;
  tenant_id: string;
  company_name: string;
  camera_code: string;
  camera_id?: number;
  event_type: 'entry' | 'exit' | string;
  timestamp: string;
  date: string;
  time: string;
  image_url: string;
  file_name?: string;
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
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('35dc9aa2-18e4-489c-aa53-df21f4e3cf8f');

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

  // Inspector modal & Conversion state
  const [selectedDetection, setSelectedDetection] = useState<AnonymousDetection | null>(null);
  const [showMarkModal, setShowMarkModal] = useState<boolean>(false);
  const [selectedCamType, setSelectedCamType] = useState<string>('entry');
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [empLoading, setEmpLoading] = useState<boolean>(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [converting, setConverting] = useState<boolean>(false);

  const isSuperAdmin =
    (authData.user?.role || '').toLowerCase().includes('super') || authData.user?.email === 'admin@seasia.com';
  const token = authData.tokens?.access_token;

  // 1. Fetch Companies for Dropdown
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

      setCompanies([
        { id: tenantId, name: tenantName }
      ]);

      setSelectedCompanyId(tenantId);
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
        const mapped: AnonymousDetection[] = data.logs.map((log: any, idx: number) => {
          let fileName = log.file_name;
          if (!fileName && log.url) {
            const m = log.url.match(/[?&]file=([^&]+)/);
            if (m) fileName = decodeURIComponent(m[1]);
          }
          return {
            id: log.id || `anon-${idx}`,
            tenant_id: data.tenant_id || selectedCompanyId,
            company_name: log.company_name || 'Seasia Infotech',
            camera_code: log.camera_name || `CAM-0${(idx % 4) + 1}`,
            event_type: log.camera_type || (idx % 2 === 0 ? 'entry' : 'exit'),
            timestamp: log.timestamp || log.time || new Date().toISOString(),
            date: log.date || appliedDate,
            time: log.time || '11:30:00',
            image_url: log.url ? `${log.url}&token=${token}` : '',
            file_name: fileName || `${(log.time || '11:30:00').replace(/:/g, '-')}.jpg`,
            location: log.location || 'Main Gate Entrance'
          };
        });
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

  // Fetch employees for the detection's company when modal opens
  useEffect(() => {
    if (selectedDetection) {
      setSelectedEmpId('');
      setSelectedCamType((selectedDetection.event_type || 'entry').toLowerCase());

      const loadEmployees = async () => {
        setEmpLoading(true);
        try {
          const tenantId = selectedDetection.tenant_id || selectedCompanyId;
          const q = tenantId && tenantId !== 'ALL' ? `?tenant_id=${tenantId}` : '';
          const res = await fetch(`${API}/company/employees${q}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.ok) {
            const data = await res.json();
            setEmployees(data.employees || []);
          } else {
            setEmployees([]);
          }
        } catch (err) {
          console.error('Failed to load employees for conversion', err);
          setEmployees([]);
        } finally {
          setEmpLoading(false);
        }
      };

      loadEmployees();
    }
  }, [selectedDetection, token, selectedCompanyId]);

  // Handle Delete Anonymous Capture
  const handleDeleteAnonymous = async () => {
    if (!selectedDetection) return;
    if (!confirm('Are you sure you want to delete this anonymous photo?')) return;

    try {
      const tenantId = selectedDetection.tenant_id || selectedCompanyId;
      const fileName = selectedDetection.file_name || `${(selectedDetection.time || '11-30-00').replace(/:/g, '-')}.jpg`;
      const dateStr = selectedDetection.date || appliedDate;
      const camType = selectedDetection.event_type || 'entry';

      const q = new URLSearchParams({
        tenant_id: tenantId,
        date: dateStr,
        cam_type: camType,
        file: fileName
      });

      const res = await fetch(`${API}/attendance/anonymous-photo?${q.toString()}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        setDetections(prev => prev.filter(d => d.id !== selectedDetection.id && d.image_url !== selectedDetection.image_url));
        setSelectedDetection(null);
        setShowMarkModal(false);
      } else {
        alert('Failed to delete anonymous photo.');
      }
    } catch (e) {
      console.error(e);
      alert('Error connecting to server.');
    }
  };

  // Handle Convert Anonymous to Recognized Employee (marks punch + face embeddings)
  const handleConvertAnonymous = async () => {
    if (!selectedDetection || !selectedEmpId) {
      alert('Please select an employee.');
      return;
    }

    setConverting(true);

    try {
      const tenantId = selectedDetection.tenant_id || selectedCompanyId;
      const fileName = selectedDetection.file_name || `${(selectedDetection.time || '11-30-00').replace(/:/g, '-')}.jpg`;
      const dateStr = selectedDetection.date || appliedDate;
      const camType = selectedCamType || selectedDetection.event_type || 'entry';

      const payload = {
        tenant_id: tenantId,
        date: dateStr,
        cam_type: camType,
        file: fileName,
        emp_id: selectedEmpId,
        mark_attendance: true,
        update_face: false
      };

      const res = await fetch(`${API}/attendance/convert-anonymous`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Remove this detection from view
        setDetections(prev => prev.filter(d => d.id !== selectedDetection.id && d.image_url !== selectedDetection.image_url));
        setShowMarkModal(false);
        setSelectedDetection(null);
      } else {
        alert(data.detail || data.message || 'Failed to convert anonymous detection.');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred while contacting server.');
    } finally {
      setConverting(false);
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
              onClick={() => {
                setSelectedDetection(det);
                setSelectedCamType((det.event_type || 'entry').toLowerCase());
                setSelectedEmpId('');
                setShowMarkModal(false);
              }}
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

      {/* Anonymous Detection Modal matching Screenshot 2 & 3 */}
      {selectedDetection && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={() => {
            if (!converting) {
              setSelectedDetection(null);
              setShowMarkModal(false);
            }
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 620,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              position: 'relative',
              padding: 18,
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top Action Bar (Green user button on left, Red trash button on right) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12
              }}
            >
              {/* Green circular user button (Opens Mark Attendance) */}
              <button
                type="button"
                onClick={() => setShowMarkModal(true)}
                title="Mark Attendance"
                disabled={converting}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: converting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 3px 8px rgba(22, 163, 74, 0.35)',
                  transition: 'transform 0.15s ease, background 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <UserPlus size={18} />
              </button>

              {/* Red circular trash button (Deletes anonymous photo) */}
              <button
                type="button"
                onClick={handleDeleteAnonymous}
                title="Delete Anonymous Photo"
                disabled={converting}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: converting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 3px 8px rgba(239, 68, 68, 0.35)',
                  transition: 'transform 0.15s ease, background 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Camera Snapshot Image */}
            <div
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
                position: 'relative',
                maxHeight: 440
              }}
            >
              <img
                src={selectedDetection.image_url}
                alt="Anonymous Capture"
                style={{
                  width: '100%',
                  maxHeight: 440,
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>

            {/* Bottom Info Bar: Centered Timestamp & Close Button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 4
              }}
            >
              <div
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: '.88rem',
                  color: '#475569',
                  fontWeight: 600
                }}
              >
                {selectedDetection.time} ({selectedDetection.event_type})
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedDetection(null);
                  setShowMarkModal(false);
                }}
                disabled={converting}
                style={{
                  background: '#e2e8f0',
                  color: '#475569',
                  border: 'none',
                  padding: '7px 20px',
                  borderRadius: 8,
                  fontSize: '.85rem',
                  fontWeight: 600,
                  cursor: converting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#cbd5e1')}
                onMouseLeave={e => (e.currentTarget.style.background = '#e2e8f0')}
              >
                Close
              </button>
            </div>

            {/* Inner "Mark Attendance" Modal Overlay (Screenshot 2) */}
            {showMarkModal && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.45)',
                  backdropFilter: 'blur(3px)',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20,
                  zIndex: 20
                }}
                onClick={() => setShowMarkModal(false)}
              >
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: 16,
                    padding: '24px 28px',
                    width: '100%',
                    maxWidth: 390,
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <h3
                    style={{
                      margin: '0 0 16px 0',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: '#7c3aed'
                    }}
                  >
                    Mark Attendance
                  </h3>

                  <div style={{ marginBottom: 14 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '.84rem',
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: 6
                      }}
                    >
                      Employee
                    </label>
                    <select
                      value={selectedEmpId}
                      onChange={e => setSelectedEmpId(e.target.value)}
                      disabled={empLoading || converting}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#0f172a',
                        fontSize: '.85rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">
                        {empLoading ? 'Loading employees...' : 'Select Employee'}
                      </option>
                      {employees.map(emp => (
                        <option key={emp.emp_id} value={emp.emp_id}>
                          {emp.name} ({emp.emp_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 22 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '.84rem',
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: 6
                      }}
                    >
                      Camera
                    </label>
                    <select
                      value={selectedCamType}
                      onChange={e => setSelectedCamType(e.target.value)}
                      disabled={converting}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#0f172a',
                        fontSize: '.85rem',
                        outline: 'none',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      <option value="entry">Entry</option>
                      <option value="exit">Exit</option>
                    </select>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 10
                    }}
                  >
                    <button
                      type="button"
                      disabled={converting}
                      onClick={() => setShowMarkModal(false)}
                      style={{
                        background: '#e2e8f0',
                        color: '#475569',
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: 8,
                        fontSize: '.85rem',
                        fontWeight: 600,
                        cursor: converting ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleConvertAnonymous}
                      disabled={!selectedEmpId || converting}
                      style={{
                        background: !selectedEmpId || converting ? '#94a3b8' : '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 24px',
                        borderRadius: 8,
                        fontSize: '.85rem',
                        fontWeight: 700,
                        cursor: !selectedEmpId || converting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {converting ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Converting...</span>
                        </>
                      ) : (
                        <span>Convert</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AnonymousLogsPage;
