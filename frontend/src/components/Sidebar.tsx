import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Clock,
  FileText,
  BarChart3,
  Video,
  Eye,
  ShieldCheck,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  LogOut,
  ScanFace,
  ChevronDown,
  Users
} from 'lucide-react';
import { AuthResponse } from '../services/api';

export type ActivePage =
  | 'dashboard'
  | 'employees'
  | 'tenants'
  | 'billing'
  | 'attendance'
  | 'requests'
  | 'reports'
  | 'system'
  | 'anonymous'
  | 'audit';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  page: ActivePage;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'nav-dash', label: 'Dashboard', icon: LayoutDashboard, page: 'dashboard' },
  { id: 'nav-emp', label: 'Employee Management', icon: Users, page: 'employees' },
  { id: 'nav-tenants', label: 'Company', icon: Building2, page: 'tenants' },
  { id: 'nav-billing', label: 'Billing & Subscription', icon: CreditCard, page: 'billing' },
  { id: 'nav-attend', label: 'Attendance Logs', icon: Clock, page: 'attendance' },
  { id: 'nav-req', label: 'Attendance Requests', icon: FileText, page: 'requests' },
  { id: 'nav-report', label: 'Reports & Analytics', icon: BarChart3, page: 'reports' },
  { id: 'nav-cam', label: 'Camera Engine AI', icon: Video, page: 'system', badge: 'LIVE' },
  { id: 'nav-anon', label: 'Anonymous Logs', icon: Eye, page: 'anonymous' },
  { id: 'nav-audit', label: 'Security & Audit Logs', icon: ShieldCheck, page: 'audit' },
];


interface SidebarProps {
  authData: AuthResponse;
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ authData, activePage, onNavigate, onLogout }) => {
  const [userCollapsed, setUserCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const { user } = authData;

  const collapsed = userCollapsed && !isHovered;

  const isSuperAdmin = (user?.role || '').toLowerCase().includes('super');
  const roleLabel = isSuperAdmin
    ? 'Super Admin'
    : (user?.role || '').toLowerCase().includes('admin')
      ? 'Company Admin'
      : 'Employee';

  const W = collapsed ? '72px' : '250px';

  return (
    <aside
      className="sb"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <style>{`
        /* ── Blue-Purple Gradient Sidebar ── */
        .sb {
          width: ${W};
          min-height: 100vh;
          background: linear-gradient(180deg, #eef2ff 0%, #f5f3ff 50%, #fdf4ff 100%);
          border-right: 1px solid #e0e7ff;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: width .22s cubic-bezier(.4,0,.2,1);
          position: sticky;
          top: 0;
          height: 100vh;
          box-shadow: 2px 0 16px rgba(99,102,241,.07);
          user-select: none;
          z-index: 50;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* ── Header ── */
        .sb-head {
          display: flex;
          align-items: center;
          justify-content: ${collapsed ? 'center' : 'space-between'};
          padding: ${collapsed ? '16px 0' : '18px 20px'};
          border-bottom: 1px solid #ddd6fe;
          min-height: 68px;
          flex-shrink: 0;
          background: transparent;
        }
        .sb-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: hidden;
          min-width: 0;
        }
        .sb-logo-img {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          object-fit: cover;
          box-shadow: 0 4px 12px rgba(99,102,241,.3);
          flex-shrink: 0;
        }
        .sb-name-wrap {
          display: ${collapsed ? 'none' : 'flex'};
          flex-direction: column;
          overflow: hidden;
        }
        .sb-name {
          font-size: 1.05rem;
          font-weight: 800;
          color: #1e1b4b;
          white-space: nowrap;
          letter-spacing: -.3px;
          line-height: 1.1;
        }
        .sb-subname {
          font-size: .68rem;
          font-weight: 600;
          color: #6d28d9;
          white-space: nowrap;
          margin-top: 1px;
        }

        .sb-expand {
          position: absolute;
          right: -12px;
          top: 22px;
          z-index: 60;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid #c4b5fd;
          background: #ffffff;
          color: #7c3aed;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(124,58,237,.2);
          transition: all .13s;
        }
        .sb-expand:hover { background: #f5f3ff; color: #4f46e5; }

        /* ── Navigation Menu List ── */
        .sb-nav {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 14px 10px;
          scrollbar-width: none;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .sb-nav::-webkit-scrollbar { display: none; }

        /* Nav Item */
        .sb-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: ${collapsed ? '11px 0' : '9px 13px'};
          border-radius: 10px;
          cursor: pointer;
          transition: all .14s;
          justify-content: ${collapsed ? 'center' : 'flex-start'};
          white-space: nowrap;
          color: #475569;
          font-size: .85rem;
          font-weight: 600;
          position: relative;
        }
        .sb-item:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .sb-item.active {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: #ffffff;
          font-weight: 800;
          box-shadow: 0 4px 14px rgba(37,99,235,.35);
        }
        .sb-item.active svg {
          color: #ffffff !important;
        }

        .sb-item-lbl {
          display: ${collapsed ? 'none' : 'block'};
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sb-badge-live {
          font-size: .6rem;
          font-weight: 800;
          background: #d1fae5;
          color: #059669;
          border: 1px solid #a7f3d0;
          padding: 1px 7px;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: .04em;
          display: ${collapsed ? 'none' : 'block'};
        }

        .sb-divider {
          height: 1px;
          background: #ddd6fe;
          margin: 10px 0;
        }

        /* Footer */
        .sb-foot {
          padding: 12px;
          border-top: 1px solid #ddd6fe;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .sb-subitem {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          color: #6d28d9;
          font-size: .83rem;
          font-weight: 600;
          cursor: pointer;
          transition: all .12s;
        }
        .sb-subitem:hover { background: rgba(99,102,241,0.1); color: #3730a3; }

        .sb-user-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(79,70,229,0.1) 0%, rgba(124,58,237,0.1) 100%);
          border: 1px solid #c4b5fd;
          margin-top: 6px;
        }
        .sb-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #ffffff;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .8rem;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(99,102,241,.3);
        }
        .sb-user-info {
          flex: 1;
          min-width: 0;
          display: ${collapsed ? 'none' : 'block'};
        }
        .sb-user-name {
          font-size: .78rem;
          font-weight: 700;
          color: #3730a3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sb-user-role {
          font-size: .68rem;
          color: #6d28d9;
        }
        .sb-logout-btn {
          background: none;
          border: none;
          color: #a78bfa;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color .12s;
        }
        .sb-logout-btn:hover { color: #ef4444; }
      `}</style>

      <button className="sb-expand" onClick={() => setUserCollapsed(!userCollapsed)}>
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      <div className="sb-head">
        <div className="sb-brand">
          <img src="/image.png" alt="Attend AI Logo" className="sb-logo-img" />
          <div className="sb-name-wrap">
            <div className="sb-name">Attend AI</div>
            <div className="sb-subname">Face Attendance System</div>
          </div>
        </div>
      </div>

      <div className="sb-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.page;
          return (
            <div
              key={item.id}
              className={`sb-item${isActive ? ' active' : ''}`}
              onClick={() => onNavigate(item.page)}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} color={isActive ? '#ffffff' : '#64748b'} />
              <span className="sb-item-lbl">{item.label}</span>
              {item.badge && <span className="sb-badge-live">{item.badge}</span>}
            </div>
          );
        })}
      </div>

      <div className="sb-foot">
        {!collapsed && (
          <>
            <div className="sb-subitem" onClick={() => onNavigate('billing')}>
              <Settings size={16} color="#64748b" />
              <span>Settings</span>
            </div>
            <div className="sb-subitem">
              <HelpCircle size={16} color="#64748b" />
              <span>Help &amp; Support</span>
            </div>
          </>
        )}

        <div className="sb-user-card">
          <div className="sb-avatar">
            SA
          </div>
          <div className="sb-user-info">
            <div className="sb-user-name">{user?.name || 'Super Admin'}</div>
            <div className="sb-user-role">{user?.email || 'admin@attendai.com'}</div>
          </div>
          <button className="sb-logout-btn" onClick={onLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
