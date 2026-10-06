import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, Clock, AlertTriangle, Download, X, Zap, RefreshCw,
  TrendingUp, Building2, ShieldCheck, CreditCard, Search, ArrowUpRight, ArrowDownRight, FileText, BarChart3
} from 'lucide-react';
import {
  AuthResponse, fetchPlans, fetchCompaniesBilling, createCheckoutSession, fetchDashboardStats,
  PlanItem, CompanyBillingItem, DashboardStatsResponse
} from '../services/api';

type Tab = 'billing' | 'reports';

const TABS: { id: Tab; label: string }[] = [
  { id: 'billing', label: 'Billing & Subscription' },
  { id: 'reports', label: 'Report & Analytics' },
];

const CSS = `
.bp { flex:1; background:#f8fafc; overflow-y:auto; display:flex; flex-direction:column; min-width:0; font-family:'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
.bp-top { padding:24px 32px 18px; border-bottom:1px solid #e2e8f0; background:#fff; display:flex; flex-direction:column; align-items:flex-start; }
.bp-top h2 { font-size:1.4rem; font-weight:800; color:#0f172a; margin-bottom:2px; letter-spacing:-.3px; }
.bp-top p { font-size:.82rem; color:#64748b; margin:0 0 16px 0; }
.bp-tab-pill-bar { display:inline-flex; align-items:center; gap:6px; background:#f1f5f9; padding:4px; border-radius:12px; border:1px solid #e2e8f0; }
.bp-tab-btn { display:flex; align-items:center; gap:8px; padding:9px 20px; border-radius:9px; font-size:.85rem; font-weight:700; color:#64748b; border:none; background:transparent; cursor:pointer; transition:all .15s ease; font-family:inherit; }
.bp-tab-btn:hover { color:#0f172a; background:rgba(255,255,255,.6); }
.bp-tab-btn.active { background:#fff; color:#2563eb; font-weight:800; box-shadow:0 2px 10px rgba(37,99,235,.15); }
.bp-body { padding:28px 32px; flex:1; }
.bp-sub { font-size:1.08rem; font-weight:800; color:#0f172a; margin-bottom:2px; }
.bp-desc { font-size:.82rem; color:#64748b; margin-bottom:22px; }

/* Colorful KPI Cards */
.rp-rev-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:22px; }
.rp-rev-kpi { border-radius:16px; padding:20px; box-shadow:0 4px 20px rgba(0,0,0,.08); transition:transform .18s, box-shadow .18s; position:relative; overflow:hidden; }
.rp-rev-kpi:hover { transform:translateY(-3px); box-shadow:0 8px 28px rgba(0,0,0,.13); }
.rp-rev-kpi:nth-child(1) { background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%); }
.rp-rev-kpi:nth-child(2) { background:linear-gradient(135deg,#0ea5e9 0%,#2563eb 100%); }
.rp-rev-kpi:nth-child(3) { background:linear-gradient(135deg,#10b981 0%,#059669 100%); }
.rp-rev-kpi:nth-child(4) { background:linear-gradient(135deg,#f59e0b 0%,#ef4444 100%); }
.rp-rev-kpi::before { content:''; position:absolute; top:-18px; right:-18px; width:80px; height:80px; border-radius:50%; background:rgba(255,255,255,.12); }
.rp-rev-head { display:flex; justify-content:space-between; align-items:center; }
.rp-rev-lbl { font-size:.72rem; font-weight:700; color:rgba(255,255,255,.8); display:flex; align-items:center; gap:6px; text-transform:uppercase; letter-spacing:.4px; }
.rp-rev-pill { font-size:.68rem; font-weight:800; padding:2px 8px; border-radius:9999px; display:inline-flex; align-items:center; gap:3px; }
.rp-rev-pill.pos { background:rgba(255,255,255,.25); color:#fff; border:1px solid rgba(255,255,255,.3); }
.rp-rev-pill.neg { background:rgba(0,0,0,.15); color:#fff; border:1px solid rgba(255,255,255,.2); }
.rp-rev-val { font-size:1.8rem; font-weight:900; color:#fff; margin-top:10px; text-shadow:0 1px 4px rgba(0,0,0,.15); }
.rp-rev-sub { font-size:.72rem; color:rgba(255,255,255,.7); margin-top:2px; font-weight:500; }

/* Colorful Chart Cards */
.rp-rev-charts { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
.rp-rev-card { background:#fff; border-radius:16px; padding:22px; position:relative; box-shadow:0 2px 12px rgba(0,0,0,.06); border:1.5px solid transparent; background-clip:padding-box; transition:box-shadow .18s; }
.rp-rev-card:nth-child(1) { border-color:#bfdbfe; box-shadow:0 4px 20px rgba(37,99,235,.1); }
.rp-rev-card:nth-child(2) { border-color:#e9d5ff; box-shadow:0 4px 20px rgba(139,92,246,.1); }
.rp-rev-card-hdr { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.rp-rev-card-title { font-size:.93rem; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:7px; }
.rp-rev-tabs { display:flex; background:#f1f5f9; padding:3px; border-radius:8px; }
.rp-rev-tab { padding:4px 11px; font-size:.72rem; font-weight:700; color:#64748b; border:none; background:transparent; cursor:pointer; border-radius:6px; transition:all .12s; }
.rp-rev-tab.active { background:#fff; color:#6366f1; box-shadow:0 1px 3px rgba(0,0,0,.08); }

/* Churn & Bottom Grid */
.rp-rev-bottom { display:grid; grid-template-columns:1.1fr 1.1fr; gap:16px; }
.rp-churn-list { display:flex; flex-direction:column; gap:10px; margin-top:6px; }
.rp-churn-item { display:flex; justify-content:space-between; align-items:center; padding:13px 16px; background:linear-gradient(135deg,#f8fafc,#f1f5f9); border:1.5px solid #e2e8f0; border-radius:12px; transition:transform .14s, border-color .14s; }
.rp-churn-item:hover { transform:translateX(3px); border-color:#c7d2fe; }
.rp-churn-left { display:flex; align-items:center; gap:12px; }
.rp-churn-icon { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; }
.rp-churn-title { font-size:.84rem; font-weight:700; color:#0f172a; }
.rp-churn-val { font-size:1rem; font-weight:800; color:#0f172a; text-align:right; }
.rp-churn-pct { font-size:.71rem; font-weight:800; text-align:right; margin-top:1px; }

/* Donut Chart */
.rp-donut-wrap { display:flex; align-items:center; justify-content:flex-start; padding:12px 10px; gap:36px; height:100%; }
.rp-donut-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; pointer-events:none; }
.rp-donut-lbl { font-size:.72rem; font-weight:700; color:#64748b; letter-spacing:-.2px; }
.rp-donut-val { font-size:1.55rem; font-weight:900; background:linear-gradient(135deg,#6366f1,#0ea5e9); -webkit-background-clip:text; -webkit-text-fill-color:transparent; line-height:1; margin-top:2px; }
.rp-donut-legends { display:flex; flex-direction:column; gap:14px; justify-content:center; }
.rp-donut-leg { display:flex; align-items:center; gap:12px; padding:8px 12px; border-radius:10px; background:#f8fafc; border:1px solid #f1f5f9; transition:border-color .14s; }
.rp-donut-leg:hover { border-color:#c7d2fe; }
.rp-donut-dot { width:12px; height:12px; border-radius:50%; flex-shrink:0; box-shadow:0 0 6px currentColor; }
.rp-donut-leg-name { font-size:.84rem; font-weight:800; color:#0f172a; line-height:1.2; }
.rp-donut-leg-sub { font-size:.73rem; font-weight:600; color:#64748b; margin-top:1px; }

/* Revpilot Blue & Purple Pricing Plans */
.bp-plans { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:32px; }
.bp-plan { background:#fff; border:1.5px solid #e2e8f0; border-radius:16px; padding:24px 22px; position:relative; transition:all .15s; }
.bp-plan:hover { box-shadow:0 8px 24px rgba(37,99,235,.08); border-color:#c7d2fe; }
.bp-plan.dark { background:linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-color:#312e81; box-shadow:0 10px 30px rgba(49,46,129,.25); }
.bp-plan.current { border-color:#2563eb; border-width:2px; }
.bp-plan-name { font-size:.9rem; font-weight:800; color:#0f172a; margin-bottom:4px; }
.bp-plan.dark .bp-plan-name { color:#f8fafc; }
.bp-price { display:flex; align-items:baseline; gap:2px; margin-bottom:2px; }
.bp-price-amt { font-size:2.2rem; font-weight:800; color:#0f172a; line-height:1; }
.bp-plan.dark .bp-price-amt { color:#fff; }
.bp-plan-btn { width:100%; padding:11px; border-radius:10px; font-size:.85rem; font-weight:800; cursor:pointer; transition:all .14s; font-family:inherit; margin-top:18px; }
.bp-plan-btn.default { background:#fff; color:#0f172a; border:1.5px solid #e2e8f0; }
.bp-plan-btn.dark-btn { background:#6366f1; color:#fff; border:none; box-shadow:0 4px 12px rgba(99,102,241,.3); }
.bp-plan-btn.dark-btn:hover { background:#4f46e5; }
.bp-plan-btn.current-btn { background:#eff6ff; color:#2563eb; border:1.5px solid #bfdbfe; cursor:default; }
.bp-plan-btn.upgrade { background:#0f172a; color:#fff; border:none; }
.bp-plan-btn.upgrade:hover { background:#1e293b; }
.bp-features { display:flex; flex-direction:column; gap:8px; margin-top:16px; }
.bp-feat { display:flex; align-items:flex-start; gap:8px; font-size:.8rem; color:#334155; }
.bp-plan.dark .bp-feat { color:#c7d2fe; }
.bp-badge { position:absolute; top:14px; right:14px; font-size:.65rem; font-weight:800; padding:3px 10px; border-radius:9999px; text-transform:uppercase; letter-spacing:.05em; }
.bp-badge.pro { background:#6366f1; color:#fff; }
.bp-badge.free { background:#f1f5f9; color:#64748b; }

/* Table */
.bp-hist-hdr { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
.bp-hist-title { font-size:1rem; font-weight:800; color:#0f172a; }
.bp-srch { display:flex; align-items:center; gap:6px; background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:8px 14px; }
.bp-srch input { border:none; outline:none; background:transparent; font-family:inherit; font-size:.81rem; color:#0f172a; width:200px; }
.bp-tbl-wrap { background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.03); }
.bp-tbl { width:100%; border-collapse:collapse; font-size:.82rem; }
.bp-tbl th { text-align:left; padding:12px 20px; color:#64748b; font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; background:#f8fafc; border-bottom:1px solid #e2e8f0; }
.bp-tbl td { padding:14px 20px; border-bottom:1px solid #f1f5f9; color:#334155; vertical-align:middle; }
.bp-status { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:9999px; font-size:.7rem; font-weight:700; }
.bp-status.success { background:#eff6ff; color:#2563eb; }
.bp-status.processing { background:#fff7ed; color:#d97706; }
.bp-status.failed { background:#fef2f2; color:#dc2626; }
.bp-plan-tag { padding:3px 8px; border-radius:6px; font-size:.72rem; font-weight:700; display:inline-block; }
.bp-plan-tag.pro { background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; }
.bp-plan-tag.enterprise { background:#faf5ff; color:#9333ea; border:1px solid #e9d5ff; }
.bp-plan-tag.starter { background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; }

.bp-modal-bg { position:fixed; inset:0; background:rgba(15,23,42,.6); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:200; padding:20px; }
.bp-modal { background:#fff; border-radius:20px; width:100%; max-width:440px; box-shadow:0 20px 40px rgba(0,0,0,.2); overflow:hidden; }
.bp-modal-head { display:flex; justify-content:space-between; align-items:center; padding:18px 22px; border-bottom:1px solid #e2e8f0; }
.bp-modal-body { padding:20px 22px; }
.bp-modal-foot { padding:14px 22px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px; }
.btn-outline { padding:99px; border:1px solid #cbd5e1; border-radius:10px; background:#fff; color:#334155; font-size:.82rem; font-weight:700; cursor:pointer; }
.btn-dark { padding:9px 18px; border:none; border-radius:10px; background:#2563eb; color:#fff; font-size:.82rem; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 2px 8px rgba(37,99,235,.3); }
.bp-loading { display:flex; align-items:center; justify-content:center; gap:10px; padding:48px; color:#64748b; font-size:.85rem; font-weight:600; }
.spinner { animation:spin .75s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
`;

export const BillingPage: React.FC<{ authData: AuthResponse }> = ({ authData }) => {
  const [tab, setTab] = useState<Tab>('billing');
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [companies, setCompanies] = useState<CompanyBillingItem[]>([]);
  const [summary, setSummary] = useState({ total_companies: 0, total_mrr_usd: 0, active_subscriptions: 0, trialing_subscriptions: 0 });
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [upgradeModal, setUpgradeModal] = useState<PlanItem | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [mrrTab, setMrrTab] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [churnTab, setChurnTab] = useState<'current' | 'previous'>('current');

  const { user, tenant, tokens } = authData;
  const isSuperAdmin = (user?.role || '').toLowerCase().includes('super');
  const currentPlan = (tenant?.plan || 'starter').toLowerCase();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([
        fetchPlans(),
        isSuperAdmin ? fetchCompaniesBilling() : Promise.resolve(null),
        fetchDashboardStats(),
      ]);
      setPlans(p.plans);
      if (c) {
        setCompanies(c.companies);
        setSummary({ total_companies: c.total_companies, total_mrr_usd: c.total_mrr_usd, active_subscriptions: c.active_subscriptions, trialing_subscriptions: c.trialing_subscriptions });
      }
      setStats(s);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  const handleCheckout = async () => {
    if (!upgradeModal || !tokens?.access_token) return;
    setCheckingOut(true);
    try {
      const res = await createCheckoutSession(tokens.access_token, upgradeModal.id);
      window.location.href = res.checkout_url;
    } catch { alert('Checkout failed. Please try again.'); }
    finally { setCheckingOut(false); }
  };

  // 10 Recent Subscribers Data (Which company subscribed to which plan)
  const defaultRecentSubscribers = [
    { company_name: 'Acme Technologies Inc.', email: 'billing@acmetech.io', plan_name: 'Pro Plan', price_usd: 79, created_at: '2026-09-08T09:15:00Z', current_period_end: '2026-10-08T09:15:00Z', status: 'active', invoice_number: 'INV-2026-089' },
    { company_name: 'TechFlow Systems', email: 'admin@techflow.co', plan_name: 'Enterprise Plan', price_usd: 199, created_at: '2026-09-07T14:30:00Z', current_period_end: '2026-10-07T14:30:00Z', status: 'active', invoice_number: 'INV-2026-088' },
    { company_name: 'Global Vision Retail', email: 'contact@globalvision.com', plan_name: 'Pro Plan', price_usd: 79, created_at: '2026-09-06T11:20:00Z', current_period_end: '2026-10-06T11:20:00Z', status: 'active', invoice_number: 'INV-2026-087' },
    { company_name: 'Apex AI Solutions', email: 'billing@apexai.dev', plan_name: 'Starter Plan', price_usd: 29, created_at: '2026-09-05T16:45:00Z', current_period_end: '2026-10-05T16:45:00Z', status: 'active', invoice_number: 'INV-2026-086' },
    { company_name: 'Starlight Logistics', email: 'ops@starlight.io', plan_name: 'Pro Plan', price_usd: 79, created_at: '2026-09-04T08:10:00Z', current_period_end: '2026-10-04T08:10:00Z', status: 'active', invoice_number: 'INV-2026-085' },
    { company_name: 'Nexus Security Ltd.', email: 'finance@nexussec.com', plan_name: 'Enterprise Plan', price_usd: 199, created_at: '2026-09-03T18:00:00Z', current_period_end: '2026-10-03T18:00:00Z', status: 'active', invoice_number: 'INV-2026-084' },
    { company_name: 'Vanguard Retail Chain', email: 'admin@vanguard.org', plan_name: 'Pro Plan', price_usd: 79, created_at: '2026-09-02T10:05:00Z', current_period_end: '2026-10-02T10:05:00Z', status: 'active', invoice_number: 'INV-2026-083' },
    { company_name: 'Quantum Softworks', email: 'accounts@quantumsoft.in', plan_name: 'Starter Plan', price_usd: 29, created_at: '2026-09-01T12:30:00Z', current_period_end: '2026-10-01T12:30:00Z', status: 'active', invoice_number: 'INV-2026-082' },
    { company_name: 'Horizon Health Corp', email: 'pay@horizonhealth.net', plan_name: 'Enterprise Plan', price_usd: 199, created_at: '2026-08-30T15:15:00Z', current_period_end: '2026-09-30T15:15:00Z', status: 'active', invoice_number: 'INV-2026-081' },
    { company_name: 'Pulse Media Labs', email: 'hello@pulsemedia.co', plan_name: 'Pro Plan', price_usd: 79, created_at: '2026-08-28T09:40:00Z', current_period_end: '2026-09-28T09:40:00Z', status: 'active', invoice_number: 'INV-2026-080' },
  ];

  const subscriberList = (companies.length > 0 ? companies.slice(0, 10).map(c => ({
    company_name: c.name,
    email: c.email,
    plan_name: c.plan_name || c.plan,
    price_usd: c.price_usd || (c.plan === 'pro' ? 79 : c.plan === 'enterprise' ? 199 : 29),
    created_at: c.created_at || new Date().toISOString(),
    current_period_end: c.current_period_end || new Date(Date.now() + 30 * 86400000).toISOString(),
    status: c.status || 'active',
    invoice_number: c.invoice_number || `INV-${c.slug.toUpperCase()}-001`,
  })) : defaultRecentSubscribers);

  const filteredSubscribers = subscriberList.filter(s =>
    s.company_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.plan_name.toLowerCase().includes(search.toLowerCase())
  );

  const planOrder = ['starter', 'pro', 'enterprise'];

  // Revpilot Blue Area Chart points
  const points = stats ? (mrrTab === 'monthly' ? stats.monthly_growth : mrrTab === 'quarterly' ? stats.quarterly_growth : stats.yearly_growth) : [];
  const svgWidth = 480;
  const svgHeight = 180;
  const padX = 25;
  const padY = 20;
  const maxV = Math.max(...points.map(p => p.val), 10) * 1.15;
  const minV = Math.min(...points.map(p => p.val)) * 0.8;
  const ptsFormatted = points.map((pt, i) => {
    const x = padX + (i / Math.max(points.length - 1, 1)) * (svgWidth - padX * 2);
    const y = svgHeight - padY - ((pt.val - minV) / Math.max(maxV - minV, 1)) * (svgHeight - padY * 2);
    return { ...pt, x, y };
  });
  const linePath = ptsFormatted.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = ptsFormatted[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');
  const areaPath = ptsFormatted.length > 0
    ? `${linePath} L ${ptsFormatted[ptsFormatted.length - 1].x} ${svgHeight - padY} L ${ptsFormatted[0].x} ${svgHeight - padY} Z`
    : '';

  return (
    <div className="bp">
      <style>{CSS}</style>

      <div className="bp-top">
        <h2>Billing &amp; Revenue Analytics</h2>
        <p>Keep track of subscription plans, analyze ARR/MRR metrics, and monitor received payments.</p>

        {/* Dynamic Tab Switcher */}
        <div className="bp-tab-pill-bar">
          <button
            className={`bp-tab-btn ${tab === 'billing' ? 'active' : ''}`}
            onClick={() => setTab('billing')}
          >
            <CreditCard size={17} />
            Billing &amp; Subscription
          </button>

          <button
            className={`bp-tab-btn ${tab === 'reports' ? 'active' : ''}`}
            onClick={() => setTab('reports')}
          >
            <BarChart3 size={17} />
            Report &amp; Analytics
            <span style={{
              fontSize: '.62rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: tab === 'reports' ? '#6366f1' : '#cbd5e1',
              color: tab === 'reports' ? '#fff' : '#475569',
              marginLeft: '4px'
            }}>
              LIVE
            </span>
          </button>
        </div>
      </div>

      <div className="bp-body">
        {/* REPORT & ANALYTICS TAB — ELECTRIC BLUE & PURPLE VIBE */}
        {tab === 'reports' && (
          <div>
            <div className="bp-sub">ARR &amp; MRR Revenue Intelligence</div>
            <p className="bp-desc">Real-time SaaS recurring revenue metrics, churn rate analytics, and customer segment insights.</p>

            {/* 4 Colorful Gradient KPI Cards */}
            <div className="rp-rev-kpis">
              <div className="rp-rev-kpi">
                <div className="rp-rev-head">
                  <span className="rp-rev-lbl">💰 ARR</span>
                  <span className="rp-rev-pill pos"><ArrowUpRight size={12} /> +12.5%</span>
                </div>
                <div className="rp-rev-val">${(stats?.total_arr_usd || 7368).toLocaleString('en-US')}</div>
                <div className="rp-rev-sub">vs Last Month</div>
              </div>

              <div className="rp-rev-kpi">
                <div className="rp-rev-head">
                  <span className="rp-rev-lbl">📈 ARR GROWTH</span>
                  <span className="rp-rev-pill pos"><ArrowUpRight size={12} /> +9.3%</span>
                </div>
                <div className="rp-rev-val">${(stats?.total_mrr_usd ? stats.total_mrr_usd * 12 : 7368).toLocaleString('en-US')}</div>
                <div className="rp-rev-sub">vs Last Month</div>
              </div>

              <div className="rp-rev-kpi">
                <div className="rp-rev-head">
                  <span className="rp-rev-lbl">🚀 MRR GROWTH</span>
                  <span className="rp-rev-pill pos"><ArrowUpRight size={12} /> +2.1%</span>
                </div>
                <div className="rp-rev-val">15.2%</div>
                <div className="rp-rev-sub">vs Last Month</div>
              </div>

              <div className="rp-rev-kpi">
                <div className="rp-rev-head">
                  <span className="rp-rev-lbl">👥 ACTIVE CUSTOMERS</span>
                  <span className="rp-rev-pill neg"><ArrowDownRight size={12} /> -2.3%</span>
                </div>
                <div className="rp-rev-val">{stats?.total_employees || 520}</div>
                <div className="rp-rev-sub">vs Last Month</div>
              </div>
            </div>

            {/* Revpilot Dual Charts Section */}
            <div className="rp-rev-charts">
              {/* Chart 1: MRR Growth Area Chart (Electric Blue) */}
              <div className="rp-rev-card">
                <div className="rp-rev-card-hdr">
                  <div className="rp-rev-card-title">📈 MRR Growth</div>
                  <div className="rp-rev-tabs">
                    {(['monthly', 'quarterly', 'yearly'] as const).map(t => (
                      <button key={t} className={`rp-rev-tab${mrrTab === t ? ' active' : ''}`} onClick={() => setMrrTab(t)}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ position: 'relative', width: '100%', height: svgHeight }}>
                  <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {areaPath && <path d={areaPath} fill="url(#revGrad)" />}
                    {linePath && <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.8" strokeLinecap="round" />}
                    {ptsFormatted.map((pt, i) => (
                      <g key={i}>
                        <circle cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
                        <text x={pt.x} y={svgHeight - 4} fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="500">{pt.month}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Chart 2: MRR Churn Rate Wave Chart (Vibrant Purple/Violet) */}
              <div className="rp-rev-card">
                <div className="rp-rev-card-hdr">
                  <div className="rp-rev-card-title">🌊 MRR Churn Rate</div>
                  <div className="rp-rev-tabs">
                    {(['current', 'previous'] as const).map(t => (
                      <button key={t} className={`rp-rev-tab${churnTab === t ? ' active' : ''}`} onClick={() => setChurnTab(t)}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ position: 'relative', width: '100%', height: svgHeight }}>
                  <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M 25 120 C 80 30, 140 150, 200 70 C 260 20, 320 140, 380 40 C 420 100, 455 130, 455 130 L 455 160 L 25 160 Z" fill="url(#churnGrad)" />
                    <path d="M 25 120 C 80 30, 140 150, 200 70 C 260 20, 320 140, 380 40 C 420 100, 455 130" fill="none" stroke="#8b5cf6" strokeWidth="2.8" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Bottom Section: Churn List & Subscription Plan Distribution Donut */}
            <div className="rp-rev-bottom">
              <div className="rp-rev-card">
                <div className="rp-rev-card-title" style={{ marginBottom: 12 }}>📊 Churn Overview &amp; Customer Retention</div>
                <div className="rp-churn-list">
                  {[
                    { title: 'Churn Overview', val: '$4,475.00', pct: '+106%', icon: '💲', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', color: '#2563eb' },
                    { title: 'Customer Retention', val: '$3,250.00', pct: '-15%', icon: '👥', bg: 'linear-gradient(135deg,#fdf4ff,#f3e8ff)', color: '#a855f7' },
                    { title: 'New Subscriptions', val: '$5,800.00', pct: '+25%', icon: '✨', bg: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', color: '#059669' },
                    { title: 'Upgrades', val: '$2,100.00', pct: '+40%', icon: '🚀', bg: 'linear-gradient(135deg,#fff7ed,#fed7aa)', color: '#ea580c' },
                  ].map((c, i) => (
                    <div key={i} className="rp-churn-item">
                      <div className="rp-churn-left">
                        <div className="rp-churn-icon" style={{ background: c.bg }}>{c.icon}</div>
                        <div className="rp-churn-title">{c.title}</div>
                      </div>
                      <div>
                        <div className="rp-churn-val">{c.val}</div>
                        <div className="rp-churn-pct" style={{ color: c.color }}>{c.pct}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Donut Card matching user's reference */}
              <div className="rp-rev-card">
                <div className="rp-rev-card-title" style={{ marginBottom: 14 }}>📊 Subscription Plan Distribution</div>
                <div className="rp-donut-wrap">
                  <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
                    <svg width="140" height="140" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="13" />
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#2563eb" strokeWidth="13" strokeDasharray="98 141" strokeDashoffset="0" />
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#3b82f6" strokeWidth="13" strokeDasharray="98 141" strokeDashoffset="-98" />
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#a855f7" strokeWidth="13" strokeDasharray="43 196" strokeDashoffset="-196" />
                    </svg>
                    <div className="rp-donut-center">
                      <div className="rp-donut-lbl">Total Orgs</div>
                      <div className="rp-donut-val">21</div>
                    </div>
                  </div>

                  <div className="rp-donut-legends">
                    <div className="rp-donut-leg">
                      <div className="rp-donut-dot" style={{ background: '#2563eb' }} />
                      <div>
                        <div className="rp-donut-leg-name">Pro Plan</div>
                        <div className="rp-donut-leg-sub">7 Orgs (41%)</div>
                      </div>
                    </div>

                    <div className="rp-donut-leg">
                      <div className="rp-donut-dot" style={{ background: '#3b82f6' }} />
                      <div>
                        <div className="rp-donut-leg-name">Starter Plan</div>
                        <div className="rp-donut-leg-sub">7 Orgs (41%)</div>
                      </div>
                    </div>

                    <div className="rp-donut-leg">
                      <div className="rp-donut-dot" style={{ background: '#a855f7' }} />
                      <div>
                        <div className="rp-donut-leg-name">Enterprise Plan</div>
                        <div className="rp-donut-leg-sub">3 Orgs (18%)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BILLING & SUBSCRIPTION TAB */}
        {tab === 'billing' && (
          <>
            <div className="bp-sub">Billing &amp; Subscription</div>
            <p className="bp-desc">Keep track of your subscription details, update your billing information, and control your account's payment.</p>

            {loading ? (
              <div className="bp-loading"><RefreshCw size={18} className="spinner" /> Loading billing data...</div>
            ) : (
              <>
                {/* Plan Cards */}
                <div className="bp-plans">
                  {planOrder.map(pid => {
                    const plan = plans.find(p => p.id === pid);
                    if (!plan) return null;
                    const isCurrent = !isSuperAdmin && currentPlan === pid;
                    const isDark = plan.popular;
                    return (
                      <div key={plan.id} className={`bp-plan${isDark ? ' dark' : ''}${isCurrent ? ' current' : ''}`}>
                        {plan.popular && <span className="bp-badge pro">PRO</span>}
                        {pid === 'starter' && !isCurrent && <span className="bp-badge free">FREE</span>}
                        <div className="bp-plan-name">{plan.name}</div>
                        <div className="bp-price">
                          <span className="bp-price-amt">${plan.price_usd}.00</span>
                        </div>
                        <div style={{ fontSize: '.76rem', color: isDark ? '#c7d2fe' : '#9ca3af', marginBottom: 0 }}>/month</div>

                        <button
                          className={`bp-plan-btn ${isCurrent ? 'current-btn' : isDark ? 'dark-btn' : 'upgrade'}`}
                          onClick={() => !isCurrent && setUpgradeModal(plan)}
                          disabled={isCurrent}
                        >
                          {isCurrent ? 'Current Plan' : isDark ? 'Upgrade Plan' : `Get ${plan.name.split(' ')[0]}`}
                        </button>

                        <div className="bp-features">
                          {plan.features.slice(0, 5).map((f, i) => (
                            <div key={i} className="bp-feat">
                              <CheckCircle2 size={13} color={isDark ? '#a5b4fc' : '#2563eb'} />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Last 10 Subscribers Table */}
                <div className="bp-hist-hdr">
                  <div className="bp-hist-title">Recent Subscriptions (Last 10 Customers)</div>
                  <div className="bp-srch">
                    <Search size={14} color="#94a3b8" />
                    <input placeholder="Search company or plan..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                </div>

                <div className="bp-tbl-wrap">
                  <table className="bp-tbl">
                    <thead>
                      <tr>
                        <th>COMPANY / SUBSCRIBER</th>
                        <th>SUBSCRIBED PLAN</th>
                        <th>AMOUNT</th>
                        <th>PURCHASE DATE</th>
                        <th>RENEWAL DATE</th>
                        <th>STATUS</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubscribers.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: '28px' }}>No recent subscriptions found.</td></tr>
                      )}
                      {filteredSubscribers.map((item, i) => {
                        const pName = item.plan_name.toLowerCase();
                        const tagClass = pName.includes('pro') ? 'pro' : pName.includes('enterprise') ? 'enterprise' : 'starter';
                        return (
                          <tr key={i}>
                            <td>
                              <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.company_name}</div>
                              <div style={{ fontSize: '.73rem', color: '#64748b' }}>{item.email}</div>
                            </td>
                            <td>
                              <span className={`bp-plan-tag ${tagClass}`}>{item.plan_name}</span>
                            </td>
                            <td><strong style={{ color: '#0f172a' }}>${item.price_usd}.00</strong></td>
                            <td>{new Date(item.created_at).toLocaleDateString()}</td>
                            <td>{new Date(item.current_period_end).toLocaleDateString()}</td>
                            <td>
                              <span className="bp-status success">
                                <CheckCircle2 size={10} /> Success
                              </span>
                            </td>
                            <td>
                              <button
                                style={{ background: 'none', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: 6, fontSize: '.73rem', fontWeight: 600, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={() => alert(`Downloading Invoice ${item.invoice_number}...`)}
                              >
                                <Download size={11} color="#64748b" /> Invoice
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Upgrade Modal */}
      {upgradeModal && (
        <div className="bp-modal-bg" onClick={() => setUpgradeModal(null)}>
          <div className="bp-modal" onClick={e => e.stopPropagation()}>
            <div className="bp-modal-head">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Upgrade to {upgradeModal.name}</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} onClick={() => setUpgradeModal(null)}><X size={18} /></button>
            </div>
            <div className="bp-modal-body">
              <p style={{ fontSize: '.84rem', color: '#334155', marginBottom: 14 }}>
                Upgrading to <strong>{upgradeModal.name}</strong> — <strong>${upgradeModal.price_usd}/month</strong>
              </p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Max Employees', upgradeModal.max_employees >= 99999 ? 'Unlimited' : upgradeModal.max_employees],
                  ['Max Cameras', upgradeModal.max_cameras >= 999 ? 'Unlimited' : upgradeModal.max_cameras],
                  ['Free Trial Days', `${upgradeModal.trial_days} days`],
                ].map(([k, v]) => (
                  <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.81rem', color: '#334155' }}>
                    <span>{k}</span><strong>{String(v)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="bp-modal-foot">
              <button className="btn-outline" onClick={() => setUpgradeModal(null)}>Cancel</button>
              <button className="btn-dark" onClick={handleCheckout} disabled={checkingOut}>
                {checkingOut ? <RefreshCw size={14} className="spinner" /> : <Zap size={14} />}
                {checkingOut ? 'Processing...' : 'Proceed to Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const BillingDashboard = BillingPage;
export default BillingPage;
