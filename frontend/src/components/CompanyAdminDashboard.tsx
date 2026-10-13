import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity, Users, UserCheck, LogIn, LogOut, RefreshCw,
  AlertCircle, CalendarDays, Building2
} from 'lucide-react';
import {
  AuthResponse,
  CompanyAdminStats,
  CompanyMonthlyAttendance,
  CompanyActivityHours,
  fetchCompanyAdminStats,
  fetchCompanyMonthlyAttendance,
  fetchCompanyActivityHours,
} from '../services/api';

interface Props {
  authData: AuthResponse;
}

const colors = {
  blue: '#4f46e5',
  green: '#059669',
  orange: '#ea580c',
  purple: '#7c3aed',
};

const formatHour = (hour: number) => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const value = hour % 12 || 12;
  return `${value} ${suffix}`;
};

const CompanyAdminDashboard: React.FC<Props> = ({ authData }) => {
  const token =
    authData.tokens?.access_token ||
    (authData as any).access_token ||
    '';

  const companyName = authData.tenant?.name || 'My Company';
  const userName = authData.user?.name || 'Company Admin';

  const [stats, setStats] = useState<CompanyAdminStats | null>(null);
  const [monthly, setMonthly] = useState<CompanyMonthlyAttendance | null>(null);
  const [activity, setActivity] = useState<CompanyActivityHours | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    if (!token) {
      setError('Your session token is missing. Please log in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const now = new Date();
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    try {
      const [statsData, monthlyData, activityData] = await Promise.all([
        fetchCompanyAdminStats(token, date),
        fetchCompanyMonthlyAttendance(token, now.getFullYear(), now.getMonth() + 1),
        fetchCompanyActivityHours(token, date),
      ]);

      setStats(statsData);
      setMonthly(monthlyData);
      setActivity(activityData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const cardData = [
    {
      title: 'Total Employees',
      value: stats?.total_employees ?? 0,
      note: 'Active employees',
      icon: Users,
      color: colors.blue,
      background: '#eef2ff',
    },
    {
      title: 'Present Today',
      value: stats?.present_today ?? 0,
      note: 'Employees with entry logs',
      icon: UserCheck,
      color: colors.green,
      background: '#ecfdf5',
    },
    {
      title: 'Entry Logs',
      value: stats?.entry_logs ?? 0,
      note: "Today's entry events",
      icon: LogIn,
      color: colors.purple,
      background: '#f5f3ff',
    },
    {
      title: 'Exit Logs',
      value: stats?.exit_logs ?? 0,
      note: "Today's exit events",
      icon: LogOut,
      color: colors.orange,
      background: '#fff7ed',
    },
  ];

  const maxAttendance = Math.max(
    1,
    ...(monthly?.data.map(item => item.present_count) ?? [])
  );
  const maxActivity = Math.max(
    1,
    ...(activity?.data.flatMap(item => [item.entry_count, item.exit_count]) ?? [])
  );

  const monthLabel = new Date().toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
  });

  const styles = `
    .ca-dashboard { padding: 28px; background: #f8fafc; min-height: 100%; color: #172033; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; }
    .ca-header { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:26px; }
    .ca-eyebrow { color:#64748b; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
    .ca-title { margin:7px 0; font-size:27px; font-weight:800; letter-spacing:-.7px; }
    .ca-subtitle { color:#64748b; font-size:13px; }
    .ca-refresh { display:flex; align-items:center; justify-content:center; gap:8px; border:1px solid #e2e8f0; background:white; color:#334155; padding:10px 14px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; }
    .ca-refresh:disabled { opacity:.55; cursor:wait; }
    .ca-cards { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:17px; margin-bottom:22px; }
    .ca-card { background:white; border:1px solid #e8edf4; border-radius:16px; padding:20px; min-width:0; box-shadow:0 3px 12px rgba(15,23,42,.025); }
    .ca-card-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .ca-card-icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
    .ca-card-label { font-size:13px; color:#64748b; font-weight:600; }
    .ca-card-value { font-size:30px; font-weight:800; margin-top:17px; letter-spacing:-1px; }
    .ca-card-note { font-size:12px; color:#94a3b8; margin-top:5px; }
    .ca-panels { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(0,1fr); gap:18px; }
    .ca-panel { background:white; border:1px solid #e8edf4; border-radius:16px; padding:22px; min-width:0; box-shadow:0 3px 12px rgba(15,23,42,.025); }
    .ca-panel-title { font-size:16px; font-weight:800; margin:0; }
    .ca-panel-subtitle { font-size:12px; color:#94a3b8; margin-top:5px; }
    .ca-chart { display:flex; align-items:flex-end; gap:8px; height:190px; padding-top:20px; overflow-x:auto; }
    .ca-bar-group { display:flex; flex:1; min-width:15px; height:100%; flex-direction:column; justify-content:flex-end; align-items:center; gap:7px; }
    .ca-bar { width:min(100%,24px); min-width:5px; border-radius:5px 5px 2px 2px; transition:height .2s; }
    .ca-bar-label { font-size:10px; color:#94a3b8; white-space:nowrap; }
    .ca-legend { display:flex; gap:16px; flex-wrap:wrap; margin-top:18px; color:#64748b; font-size:12px; }
    .ca-legend-item { display:flex; align-items:center; gap:6px; }
    .ca-dot { width:8px; height:8px; border-radius:3px; }
    .ca-hour-chart { display:flex; flex-direction:column; gap:14px; margin-top:22px; }
    .ca-hour-row { display:grid; grid-template-columns:55px minmax(0,1fr) 35px; gap:10px; align-items:center; }
    .ca-hour-label { font-size:11px; color:#64748b; }
    .ca-hour-bars { display:flex; flex-direction:column; gap:4px; }
    .ca-track { width:100%; height:7px; border-radius:8px; background:#f1f5f9; overflow:hidden; }
    .ca-fill { height:100%; border-radius:8px; }
    .ca-hour-count { text-align:right; font-size:11px; color:#64748b; }
    .ca-empty { display:flex; align-items:center; justify-content:center; text-align:center; color:#94a3b8; font-size:13px; min-height:140px; }
    .ca-message { background:white; border:1px solid #e2e8f0; border-radius:14px; padding:22px; display:flex; align-items:center; gap:12px; color:#475569; font-size:13px; }
    .ca-error { color:#b91c1c; background:#fef2f2; border-color:#fecaca; }
    .ca-spin { animation:ca-spin 1s linear infinite; }
    @keyframes ca-spin { to { transform:rotate(360deg); } }
    @media(max-width:1050px) { .ca-cards { grid-template-columns:repeat(2,minmax(0,1fr)); } .ca-panels { grid-template-columns:1fr; } }
    @media(max-width:600px) { .ca-dashboard { padding:16px; } .ca-title { font-size:22px; } .ca-cards { gap:10px; } .ca-card { padding:14px; } .ca-card-value { font-size:25px; } .ca-panel { padding:16px; } }
  `;

  return (
    <div className="ca-dashboard">
      <style>{styles}</style>

      <header className="ca-header">
        <div>
          <div className="ca-eyebrow">Company workspace</div>
          <h1 className="ca-title">Welcome, {userName}</h1>
          <div className="ca-subtitle">
            <Building2 size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            {companyName} · Attendance overview for {stats?.date || 'today'}
          </div>
        </div>
        <button className="ca-refresh" onClick={() => void loadDashboard()} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'ca-spin' : ''} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="ca-message ca-error" style={{ marginBottom: 18 }}>
          <AlertCircle size={20} />
          <div>
            <strong>Dashboard could not be loaded</strong>
            <div style={{ marginTop: 4 }}>{error}</div>
          </div>
          <button className="ca-refresh" style={{ marginLeft: 'auto' }} onClick={() => void loadDashboard()}>
            Retry
          </button>
        </div>
      )}

      <section className="ca-cards">
        {cardData.map(card => {
          const Icon = card.icon;
          return (
            <article className="ca-card" key={card.title}>
              <div className="ca-card-top">
                <span className="ca-card-label">{card.title}</span>
                <span className="ca-card-icon" style={{ color: card.color, background: card.background }}>
                  <Icon size={21} />
                </span>
              </div>
              <div className="ca-card-value">
                {loading && !stats ? '—' : card.value.toLocaleString()}
              </div>
              <div className="ca-card-note">{card.note}</div>
            </article>
          );
        })}
      </section>

      <section className="ca-panels">
        <article className="ca-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarDays size={19} color={colors.blue} />
            <div>
              <h2 className="ca-panel-title">Monthly Attendance</h2>
              <div className="ca-panel-subtitle">{monthLabel} · Employees present per day</div>
            </div>
          </div>

          {loading && !monthly ? (
            <div className="ca-empty">Loading attendance…</div>
          ) : monthly?.data.length ? (
            <>
              <div className="ca-chart">
                {monthly.data.map(item => {
                  const day = Number(item.date.slice(-2));
                  const height = Math.max(3, (item.present_count / maxAttendance) * 145);
                  return (
                    <div className="ca-bar-group" key={item.date} title={`${item.date}: ${item.present_count} present`}>
                      <div
                        className="ca-bar"
                        style={{ height, background: colors.blue }}
                      />
                      {day === 1 || day % 5 === 0 || day === monthly.data.length
                        ? <span className="ca-bar-label">{day}</span>
                        : <span className="ca-bar-label">&nbsp;</span>}
                    </div>
                  );
                })}
              </div>
              <div className="ca-legend">
                <span className="ca-legend-item"><span className="ca-dot" style={{ background: colors.blue }} />Employees present</span>
                <span style={{ marginLeft: 'auto' }}>{monthly.data.length} days with attendance records</span>
              </div>
            </>
          ) : (
            <div className="ca-empty">No attendance records found for this month.</div>
          )}
        </article>

        <article className="ca-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={19} color={colors.green} />
            <div>
              <h2 className="ca-panel-title">Hourly Activity</h2>
              <div className="ca-panel-subtitle">Today's entry and exit events</div>
            </div>
          </div>

          {loading && !activity ? (
            <div className="ca-empty">Loading hourly activity…</div>
          ) : activity?.data.length ? (
            <>
              <div className="ca-hour-chart">
                {activity.data.map(item => (
                  <div className="ca-hour-row" key={item.hour}>
                    <span className="ca-hour-label">{formatHour(item.hour)}</span>
                    <div className="ca-hour-bars">
                      <div className="ca-track" title={`Entries: ${item.entry_count}`}>
                        <div className="ca-fill" style={{ width: `${(item.entry_count / maxActivity) * 100}%`, background: colors.green }} />
                      </div>
                      <div className="ca-track" title={`Exits: ${item.exit_count}`}>
                        <div className="ca-fill" style={{ width: `${(item.exit_count / maxActivity) * 100}%`, background: colors.orange }} />
                      </div>
                    </div>
                    <span className="ca-hour-count">{item.entry_count + item.exit_count}</span>
                  </div>
                ))}
              </div>
              <div className="ca-legend">
                <span className="ca-legend-item"><span className="ca-dot" style={{ background: colors.green }} />Entries</span>
                <span className="ca-legend-item"><span className="ca-dot" style={{ background: colors.orange }} />Exits</span>
                <span style={{ marginLeft: 'auto' }}>Total events per hour shown at right</span>
              </div>
            </>
          ) : (
            <div className="ca-empty">No activity recorded today.</div>
          )}
        </article>
      </section>
    </div>
  );
};

export default CompanyAdminDashboard;
