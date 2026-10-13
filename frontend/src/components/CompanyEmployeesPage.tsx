
import React, { useCallback, useEffect, useState } from 'react';
import {
  Users, Search, RefreshCw, Mail, Phone, ScanFace,
  UserCheck, UserX, AlertCircle, Building2
} from 'lucide-react';
import {
  AuthResponse,
  CompanyEmployee,
  fetchCompanyEmployees,
} from '../services/api';

interface Props {
  authData: AuthResponse;
}

const CompanyEmployeesPage: React.FC<Props> = ({ authData }) => {
  const token =
    authData.tokens?.access_token ||
    (authData as any).access_token ||
    '';

  const companyName = authData.tenant?.name || 'My Company';

  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadEmployees = useCallback(async (term = search) => {
    if (!token) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      return;
    }

    setRefreshing(true);
    setError('');

    try {
      const response = await fetchCompanyEmployees(token, term);
      setEmployees(response.employees || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load employees.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, search]);

  useEffect(() => {
    void loadEmployees('');
  }, [loadEmployees]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEmployees(search);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search, loadEmployees]);

  const activeCount = employees.filter(e => e.is_active).length;
  const enrolledCount = employees.filter(e => e.face_enrolled).length;

  return (
    <div style={styles.page}>
      <style>{`
        .employee-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 850px;
        }
        .employee-table th {
          padding: 14px 16px;
          text-align: left;
          font-size: 11px;
          color: white;
          background: linear-gradient(100deg,#4f83f1,#8b5cf6);
        }
        .employee-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #edf1f7;
          font-size: 12px;
          color: #334155;
        }
        .employee-table tbody tr:nth-child(even) {
          background: #f8faff;
        }
        .employee-table tbody tr:hover {
          background: #eff6ff;
        }
        .employee-search:focus {
          outline: 2px solid #a5b4fc;
        }
        @media(max-width:700px) {
          .employee-cards { grid-template-columns:1fr !important; }
          .employee-page { padding:14px !important; }
        }
      `}</style>

      <header style={styles.header}>
        <h1 style={styles.title}>Employee Management</h1>
        <p style={styles.subtitle}>
          View and manage employees in your company
        </p>
        <div style={styles.company}>
          <Building2 size={14} /> {companyName}
        </div>
      </header>

      <section className="employee-cards" style={styles.cards}>
        <StatCard
          icon={<Users size={21} />}
          label="Employees Listed"
          value={loading ? '—' : employees.length}
          color="#4338ca"
          background="#e0e7ff"
        />
        <StatCard
          icon={<UserCheck size={21} />}
          label="Active Employees"
          value={loading ? '—' : activeCount}
          color="#15803d"
          background="#dcfce7"
        />
        <StatCard
          icon={<ScanFace size={21} />}
          label="Face Enrolled"
          value={loading ? '—' : enrolledCount}
          color="#7e22ce"
          background="#f3e8ff"
        />
      </section>

      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <Search size={17} color="#64748b" />
          <input
            className="employee-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, employee ID, or department"
            style={styles.searchInput}
          />
        </div>

        <span style={styles.count}>
          {employees.length} employee{employees.length === 1 ? '' : 's'}
        </span>

        <button
          onClick={() => void loadEmployees(search)}
          disabled={refreshing}
          style={styles.refresh}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div style={styles.error}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div style={styles.tableWrap}>
        <table className="employee-table">
          <thead>
            <tr>
              <th>EMPLOYEE</th>
              <th>DEPARTMENT / DESIGNATION</th>
              <th>CONTACT</th>
              <th>FACE ENROLLMENT</th>
              <th>STATUS</th>
              <th>JOINING DATE</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={styles.empty}>Loading employees...</td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.empty}>
                  {error ? 'Employee data could not be loaded.' : 'No employees found.'}
                </td>
              </tr>
            ) : employees.map(employee => (
              <tr key={employee.id}>
                <td>
                  <div style={styles.employee}>
                    <div style={styles.avatar}>
                      {employee.name
                        .split(/\s+/)
                        .map(part => part[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ color: '#172033' }}>{employee.name}</strong>
                      <div style={styles.muted}>ID: {employee.emp_id}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{employee.department || '—'}</div>
                  <div style={styles.muted}>{employee.designation || '—'}</div>
                </td>
                <td>
                  {employee.email && (
                    <div style={styles.contact}>
                      <Mail size={12} /> {employee.email}
                    </div>
                  )}
                  {employee.phone && (
                    <div style={styles.contact}>
                      <Phone size={12} /> {employee.phone}
                    </div>
                  )}
                  {!employee.email && !employee.phone && '—'}
                </td>
                <td>
                  <StatusBadge
                    active={employee.face_enrolled}
                    yes="Enrolled"
                    no="Not enrolled"
                  />
                </td>
                <td>
                  <StatusBadge
                    active={employee.is_active}
                    yes="Active"
                    no="Inactive"
                  />
                </td>
                <td>
                  {employee.joining_date
                    ? new Date(employee.joining_date).toLocaleDateString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatCard = ({
  icon, label, value, color, background,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  background: string;
}) => (
  <div style={styles.statCard}>
    <div style={{ ...styles.statIcon, color, background }}>{icon}</div>
    <div>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  </div>
);

const StatusBadge = ({
  active, yes, no,
}: {
  active: boolean;
  yes: string;
  no: string;
}) => (
  <span style={{
    ...styles.badge,
    background: active ? '#dcfce7' : '#fff7ed',
    color: active ? '#166534' : '#c2410c',
  }}>
    {active ? <UserCheck size={12} /> : <UserX size={12} />}
    {active ? yes : no}
  </span>
);

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100%',
    padding: 26,
    background: '#f3f7ff',
    color: '#172033',
    fontFamily: 'Inter, sans-serif',
  },
  header: {
    background: 'linear-gradient(110deg,#2563eb,#6366f1 55%,#8b5cf6)',
    color: 'white',
    borderRadius: 14,
    padding: '23px 25px',
    marginBottom: 22,
    boxShadow: '0 7px 18px #4f46e526',
  },
  title: { margin: 0, fontSize: 24, fontWeight: 800 },
  subtitle: { marginTop: 7, marginBottom: 0, fontSize: 13, color: '#e0e7ff' },
  company: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 13,
    fontSize: 12,
    background: '#ffffff20',
    padding: '6px 10px',
    borderRadius: 7,
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
    gap: 15,
    marginBottom: 20,
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 13,
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: 13,
    padding: '17px 19px',
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: 600 },
  statValue: { fontSize: 23, fontWeight: 800, marginTop: 4 },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    flex: 1,
    minWidth: 220,
    maxWidth: 490,
    height: 42,
    border: '1px solid #dbe3f0',
    background: 'white',
    borderRadius: 9,
    padding: '0 12px',
  },
  searchInput: {
    width: '100%',
    border: 0,
    outline: 0,
    background: 'transparent',
    fontSize: 13,
  },
  count: { fontSize: 12, color: '#64748b' },
  refresh: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    height: 40,
    border: 0,
    borderRadius: 8,
    padding: '0 14px',
    background: '#4f46e5',
    color: 'white',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  tableWrap: {
    overflow: 'auto',
    background: 'white',
    border: '1px solid #dfe7f2',
    borderRadius: 12,
  },
  employee: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 155 },
  avatar: {
    width: 34,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: '#e0e7ff',
    color: '#4338ca',
    fontSize: 12,
    fontWeight: 800,
    flexShrink: 0,
  },
  muted: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
  contact: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    padding: '5px 9px',
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  empty: { padding: 55, textAlign: 'center', color: '#64748b' },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: 13,
    marginBottom: 15,
    background: '#fff1f2',
    color: '#be123c',
    border: '1px solid #fecdd3',
    borderRadius: 10,
    fontSize: 13,
  },
};

export default CompanyEmployeesPage;
