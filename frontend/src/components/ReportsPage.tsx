import React, { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Eye } from 'lucide-react';
import { AuthResponse } from '../services/api';

const API = '/api/v1';

interface Props {
  authData: AuthResponse;
}

interface Company {
  id: string;
  name: string;
}

export function ReportsPage({ authData }: Props) {
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const DEFAULT_COMPANIES: Company[] = [
    { id: '2d2506a2-e75f-47c7-a880-3f911e702b4e', name: 'Moogle Labs' },
    { id: '88c18b1c-4015-478d-adfa-7030e11beacb', name: 'OpenSource' },
    { id: '35dc9aa2-18e4-489c-aa53-df21f4e3cf8f', name: 'Seasia Infotech' },
  ];
  const [companies, setCompanies] = useState<Company[]>(DEFAULT_COMPANIES);
  const [selectedCoId, setSelectedCoId] = useState<string>('ALL');
  const [department, setDepartment] = useState('All Departments');
  const [status, setStatus] = useState('All Status');
  const [searchName, setSearchName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('Attendance Photo');

  const openAttendancePhoto = async (photoUrl: string, title: string) => {
    try {
      console.log('Opening attendance photo:', photoUrl);

      const response = await fetch(photoUrl, {
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "PHOTO REQUEST FAILED:",
          response.status,
          response.statusText,
          errorText,
          "URL:",
          photoUrl
        );
        throw new Error(
          `Photo request failed: ${response.status} ${response.statusText}: ${errorText}`
        );
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error('Photo response is empty');
      }

      const imageUrl = URL.createObjectURL(blob);

      setPreviewTitle(title);
      setPreviewImage(imageUrl);
    } catch (error) {
      console.error('Failed to open attendance photo:', error);
      alert('Unable to load attendance photo. Please check the backend/photo endpoint.');
    }
  };

  const isSuperAdmin =
    authData.user?.role === 'super_admin' ||
    authData.user?.email === 'admin@seasia.com';

  const token = authData.tokens?.access_token;

  useEffect(() => {
    if (isSuperAdmin) {
      fetch(`${API.replace('/auth', '')}/billing/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => {
          const allowedNames = [
            'Moogle Labs',
            'OpenSource',
            'Seasia Infotech',
          ];

          const apiCompanies: Company[] =
            d.success && Array.isArray(d.companies)
              ? d.companies.filter(
                  (c: Company) => allowedNames.includes(c.name)
                )
              : [];

          const allowedCompanies =
            apiCompanies.length > 0
              ? apiCompanies
              : DEFAULT_COMPANIES;

          const dropdownCompanies: Company[] = [
            { id: 'ALL', name: 'All Companies' },
            ...allowedCompanies,
          ];

          setCompanies(dropdownCompanies);

          // Super Admin starts with All Companies
          setSelectedCoId('ALL');
        })
        .catch(() => {
          setCompanies([
            { id: 'ALL', name: 'All Companies' },
            ...DEFAULT_COMPANIES,
          ]);

          setSelectedCoId('ALL');
        });
    } else {
      setSelectedCoId(authData.user!.tenant_id);

      setCompanies([
        {
          id: authData.user!.tenant_id,
          name: authData.tenant?.name || 'My Company',
        },
      ]);
    }
  }, [isSuperAdmin, token, authData]);

  const loadData = useCallback(async () => {
    if (!selectedCoId) return;

    setLoading(true);

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      // =====================================================
      // ALL COMPANIES
      // =====================================================
      if (selectedCoId === 'ALL') {
        const allowedCompanies = companies.filter(
          company => company.id !== 'ALL'
        );

        const results = await Promise.all(
          allowedCompanies.map(async company => {
            const [logRes, sumRes] = await Promise.all([
              fetch(
                `${API}/attendance/daily?date=${encodeURIComponent(date)}&tenant_id=${encodeURIComponent(company.id)}`,
                { headers }
              ),
              fetch(
                `${API}/attendance/summary?date=${encodeURIComponent(date)}&tenant_id=${encodeURIComponent(company.id)}`,
                { headers }
              ),
            ]);

            const logData = await logRes.json();
            const sumData = await sumRes.json();

            const records = Array.isArray(logData.records)
              ? logData.records.map((record: any) => ({
                  ...record,
                  tenant_id: company.id,
                  company_name: company.name,
                  name: `${record.name} (${record.emp_id || record.employee_id || ''}) (${company.name})`,
                }))
              : [];

            return {
              company,
              records,
              summary: sumData?.success
                ? sumData
                : {
                    total_employees: 0,
                    present_count: 0,
                    absent_count: 0,
                    late_count: 0,
                    on_leave_count: 0,
                  },
            };
          })
        );

        // Combine all employees from the 3 companies
        const combinedLogs = results.flatMap(
          result => result.records
        );

        // Combine summary numbers
        const combinedSummary = results.reduce(
          (total, result) => ({
            total_employees:
              total.total_employees +
              Number(result.summary.total_employees || 0),

            present_count:
              total.present_count +
              Number(result.summary.present_count || 0),

            absent_count:
              total.absent_count +
              Number(result.summary.absent_count || 0),

            late_count:
              total.late_count +
              Number(result.summary.late_count || 0),

            on_leave_count:
              total.on_leave_count +
              Number(result.summary.on_leave_count || 0),
          }),
          {
            total_employees: 0,
            present_count: 0,
            absent_count: 0,
            late_count: 0,
            on_leave_count: 0,
          }
        );

        setLogs(combinedLogs);

        setSummary({
          success: true,
          ...combinedSummary,
        });

        return;
      }

      // =====================================================
      // SINGLE COMPANY
      // =====================================================
      const [logRes, sumRes] = await Promise.all([
        fetch(
          `${API}/attendance/daily?date=${encodeURIComponent(date)}&tenant_id=${encodeURIComponent(selectedCoId)}`,
          { headers }
        ),
        fetch(
          `${API}/attendance/summary?date=${encodeURIComponent(date)}&tenant_id=${encodeURIComponent(selectedCoId)}`,
          { headers }
        ),
      ]);

      const logData = await logRes.json();
      const sumData = await sumRes.json();

      const companyName =
        companies.find(c => c.id === selectedCoId)?.name || '';

      const records = Array.isArray(logData.records)
        ? logData.records.map((record: any) => ({
            ...record,
            tenant_id: selectedCoId,
            company_name: companyName,
            name: record.name,
          }))
        : [];

      setLogs(records);

      setSummary(
        sumData?.success
          ? sumData
          : {
              total_employees: 0,
              present_count: 0,
              absent_count: 0,
              late_count: 0,
              on_leave_count: 0,
            }
      );
    } catch (e) {
      console.error('Attendance load failed:', e);

      setLogs([]);

      setSummary({
        total_employees: 0,
        present_count: 0,
        absent_count: 0,
        late_count: 0,
        on_leave_count: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [date, selectedCoId, token, companies]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLogs = logs.filter(l => {
    if (status !== 'All Status' && l.status !== status) {
      return false;
    }

    if (
      department !== 'All Departments' &&
      l.department !== department
    ) {
      return false;
    }

    if (
      searchName &&
      !l.name.toLowerCase().includes(searchName.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  const SummaryCard = ({
    title,
    value,
    subtext,
    subtextColor,
    bgColor,
    titleColor,
  }: any) => (
    <div
      style={{
        background: bgColor,
        borderRadius: 12,
        padding: '20px 24px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: 180,
      }}
    >
      <div
        style={{
          color: titleColor || '#475569',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              border: `2px solid ${titleColor || '#475569'}`,
              borderRadius: 4,
            }}
          ></div>
        </div>

        {title}
      </div>

      <div
        style={{
          color: '#0f172a',
          fontSize: '1.8rem',
          fontWeight: 800,
          marginBottom: 4,
        }}
      >
        {value}
      </div>

      <div
        style={{
          color: subtextColor,
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        {subtext}
      </div>
    </div>
  );

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        height: 'auto',
        background: '#f8fafc',
        fontFamily: "'Inter',-apple-system,sans-serif",
        overflowY: 'visible',
        overflowX: 'hidden',
        paddingBottom: '80px',
      }}
    >
      <style>{`
        .header {
          padding: 32px 40px 16px 40px;
        }

        .header h1 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #1e1b4b;
          margin: 0 0 8px 0;
        }

        .header p {
          color: #64748b;
          font-size: 0.95rem;
          margin: 0;
        }

        .cards-row {
          display: flex;
          gap: 20px;
          padding: 0 40px;
          margin-bottom: 32px;
        }

        .filter-section {
          display: flex;
          align-items: flex-end;
          gap: 20px;
          padding: 24px 40px;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          background: #fff;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .filter-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #312e81;
        }

        .filter-select {
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
          outline: none;
          background: #fff;
          color: #0f172a;
          cursor: pointer;
        }

        .btn-reset {
          padding: 10px 20px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          background: #fff;
          color: #3b82f6;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: 0.2s;
        }

        .btn-reset:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .sub-toolbar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px 40px;
          background: #f1f5f9;
          flex-wrap: wrap;
        }

        .pill-input {
          padding: 10px 20px;
          border-radius: 999px;
          border: 1px solid #cbd5e1;
          outline: none;
          font-size: 0.9rem;
          background: #fff;
          color: #0f172a;
        }

        .btn-export {
          background: #10b981;
          color: #fff;
          padding: 10px 24px;
          border-radius: 999px;
          border: none;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
          transition: 0.2s;
        }

        .btn-export:hover {
          background: #059669;
        }

        .table-container {
          margin: 0 40px 40px 40px;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: center;
        }

        th {
          background: #f8fafc;
          color: #475569;
          padding: 16px 20px;
          font-size: 0.85rem;
          font-weight: 700;
          border-bottom: 2px solid #e2e8f0;
        }

        th:first-child {
          text-align: left;
        }

        td {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.9rem;
          color: #334155;
        }

        tr:last-child td {
          border-bottom: none;
        }

        td:first-child {
          text-align: left;
          font-weight: 500;
          color: #475569;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .status-present {
          background: #dcfce7;
          color: #16a34a;
        }

        .status-absent {
          background: #fee2e2;
          color: #dc2626;
        }

        .status-late {
          background: #fef3c7;
          color: #d97706;
        }

        .time-cell {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .eye-icon {
          color: #8b5cf6;
          cursor: pointer;
        }
      `}</style>

      <div className="header">
        <h1>Attendance</h1>

        <p>
          View and manage employee attendance across all companies
        </p>
      </div>

      <div className="cards-row">
        <SummaryCard
          title="TOTAL EMPLOYEES"
          value={summary?.total_employees || 0}
          subtext="↑ 12% vs last month"
          subtextColor="#10b981"
          bgColor="#f0f4ff"
          titleColor="#3b82f6"
        />

        <SummaryCard
          title="PRESENT"
          value={summary?.present_count || 0}
          subtext={
            summary
              ? `${(
                  (summary.present_count /
                    summary.total_employees) *
                    100 || 0
                ).toFixed(1)}%`
              : '0%'
          }
          subtextColor="#16a34a"
          bgColor="#ecfdf5"
          titleColor="#10b981"
        />

        <SummaryCard
          title="ABSENT"
          value={summary?.absent_count || 0}
          subtext={
            summary
              ? `${(
                  (summary.absent_count /
                    summary.total_employees) *
                    100 || 0
                ).toFixed(1)}%`
              : '0%'
          }
          subtextColor="#dc2626"
          bgColor="#fef2f2"
          titleColor="#ef4444"
        />

        <SummaryCard
          title="LATE"
          value={summary?.late_count || 0}
          subtext={
            summary
              ? `${(
                  (summary.late_count /
                    summary.total_employees) *
                    100 || 0
                ).toFixed(1)}%`
              : '0%'
          }
          subtextColor="#d97706"
          bgColor="#fffbeb"
          titleColor="#f59e0b"
        />

        <SummaryCard
          title="WFH / ON LEAVE"
          value="0"
          subtext="0%"
          subtextColor="#9333ea"
          bgColor="#faf5ff"
          titleColor="#a855f7"
        />
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <label>Select Company</label>

          <select
            className="filter-select"
            value={selectedCoId}
            onChange={e => setSelectedCoId(e.target.value)}
            disabled={!isSuperAdmin}
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Date Range</label>

          <input
            type="date"
            className="filter-select"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Department</label>

          <select
            className="filter-select"
            value={department}
            onChange={e => setDepartment(e.target.value)}
          >
            <option>All Departments</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status</label>

          <select
            className="filter-select"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option>All Status</option>
            <option>Present</option>
            <option>Absent</option>
            <option>Late</option>
          </select>
        </div>

        <button
          className="btn-reset"
          onClick={() => {
            setDepartment('All Departments');
            setStatus('All Status');
            setDate(
              new Date().toISOString().split('T')[0]
            );
            setSearchName('');
          }}
        >
          <RefreshCw size={16} />
          Reset Filters
        </button>
      </div>

      <div className="sub-toolbar">
        <input
          type="text"
          className="pill-input"
          placeholder="Search by name"
          value={searchName}
          onChange={e => setSearchName(e.target.value)}
        />


        <button
          className="btn-export"
          onClick={() =>
            window.open(
              `${API}/attendance/export-csv?date=${date}&tenant_id=${selectedCoId}&token=${token}`
            )
          }
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name (Emp ID)</th>
              <th>Status</th>
              <th>Working Hours</th>
              <th>Entry Count</th>
              <th>Exit Count</th>
              <th>First Entry</th>
              <th>Last Exit</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: 40,
                    color: '#64748b',
                  }}
                >
                  Loading records...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: 40,
                    color: '#64748b',
                  }}
                >
                  No records found.
                </td>
              </tr>
            ) : (
              filteredLogs.map(
                (log: any, idx: number) => {
                  const entryCount =
                    log.entry_count ?? (log.first_in ? 1 : 0);

                  const exitCount =
                    log.exit_count ?? (log.last_out ? 1 : 0);

                  return (
                    <tr key={idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {log.face_photo_url ? (
                            <img
                              src={log.face_photo_url}
                              alt={log.name}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid #e2e8f0',
                                flexShrink: 0,
                              }}
                              onError={(e: any) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: '#e2e8f0', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, fontWeight: 700, color: '#94a3b8', flexShrink: 0,
                            }}>
                              {log.name?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{log.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{log.emp_id}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-pill status-${log.status.toLowerCase()}`}
                        >
                          {log.status}
                        </span>
                      </td>

                      <td>
                        {log.total_hours
                          ? log.total_hours.toFixed(1) +
                            'h'
                          : '-'}
                      </td>

                      <td>{entryCount}</td>

                      <td>{exitCount}</td>

                      {/* FIRST ENTRY */}
                      <td>
                        {log.first_in ? (
                          <div className="time-cell">
                            {log.first_in}

                            {log.first_in_image_url && (
                              <button
                                type="button"
                                title="View Entry Photo"
                                onClick={() =>
                                  openAttendancePhoto(
                                    log.first_in_image_url,
                                    'Entry Photo'
                                  )
                                }
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  padding: 2,
                                  margin: 0,
                                  cursor: 'pointer',
                                  color: '#6366f1',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Eye size={15} />
                              </button>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* LAST EXIT */}
                      <td>
                        {log.last_out ? (
                          <div className="time-cell">
                            {log.last_out}

                            {log.last_out_image_url && (
                              <button
                                type="button"
                                title="View Exit Photo"
                                onClick={() =>
                                  openAttendancePhoto(
                                    log.last_out_image_url,
                                    'Exit Photo'
                                  )
                                }
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  padding: 2,
                                  margin: 0,
                                  cursor: 'pointer',
                                  color: '#6366f1',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Eye size={15} />
                              </button>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                }
              )
            )}
          </tbody>
        </table>
      </div>

      {previewImage && (
        <div
          onClick={() => {
            URL.revokeObjectURL(previewImage);
            setPreviewImage(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.62)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 18,
              width: 'min(900px, 92vw)',
              maxHeight: '90vh',
              padding: 18,
              boxShadow: '0 25px 60px rgba(0,0,0,0.28)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
                fontWeight: 800,
                fontSize: '1rem',
                color: '#1e293b',
              }}
            >
              <span>{previewTitle}</span>

              <button
                onClick={() => {
                  URL.revokeObjectURL(previewImage);
                  setPreviewImage(null);
                }}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: 20,
                  color: '#475569',
                }}
              >
                ×
              </button>
            </div>

            <img
              src={previewImage}
              alt={previewTitle}
              style={{
                display: 'block',
                width: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: 12,
                background: '#0f172a',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}