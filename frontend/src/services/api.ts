const API_BASE_URL = '/api/v1/auth';

export interface RegisterPayload {
  company_name: string;
  company_email: string;
  company_phone: string;
  timezone: string;
  admin_name: string;
  password: string;
  confirm_password: string;
  selected_plan?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  tokens?: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenant_id: string;
    last_login?: string;
    created_at?: string;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    trial_ends_at?: string;
    max_employees: number;
    max_cameras: number;
    timezone: string;
  };
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.detail || 'Login failed. Please check your credentials.');
  }
  return data;
}

export async function registerTenant(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.detail || 'Registration failed. Please check your details.');
  }
  return data;
}

export async function getCurrentUser(token: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch session.');
  }
  return data;
}

export async function requestForgotPassword(email: string): Promise<{ success: boolean; message: string; reset_token?: string; reset_link?: string }> {
  const res = await fetch(`${API_BASE_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.detail || 'Failed to request password reset.');
  }
  return data;
}

export async function submitResetPassword(token: string, new_password: string, confirm_password: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password, confirm_password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.detail || 'Password reset failed. Invalid or expired token.');
  }
  return data;
}

export interface PlanItem {
  id: string;
  name: string;
  price_usd: number;
  price_inr: number;
  interval: string;
  max_employees: number;
  max_cameras: number;
  trial_days: number;
  popular: boolean;
  features: string[];
}

export async function fetchPlans(): Promise<{ success: boolean; plans: PlanItem[] }> {
  const res = await fetch(`${API_BASE_URL.replace('/auth', '')}/billing/plans`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch billing plans.');
  return data;
}

export async function createCheckoutSession(token: string, planId: string): Promise<{ success: boolean; checkout_url: string; session_id: string }> {
  const res = await fetch(`${API_BASE_URL.replace('/auth', '')}/billing/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan_id: planId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.detail || 'Failed to initialize Stripe checkout.');
  return data;
}

export interface CompanyBillingItem {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  plan: string;
  plan_name: string;
  status: string;
  price_usd: number;
  price_inr: number;
  interval: string;
  max_employees: number;
  max_cameras: number;
  total_employees: number;
  total_cameras: number;
  created_at?: string;
  trial_ends_at?: string;
  current_period_end?: string;
  last_login?: string;
  invoice_number?: string;
}

export interface CompanyBillingListResponse {
  success: boolean;
  total_companies: number;
  total_mrr_usd: number;
  total_mrr_inr: number;
  active_subscriptions: number;
  trialing_subscriptions: number;
  companies: CompanyBillingItem[];
}

export async function fetchCompaniesBilling(): Promise<CompanyBillingListResponse> {
  const res = await fetch(`${API_BASE_URL.replace('/auth', '')}/billing/companies`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch companies billing data.');
  return data;
}

export interface MonthlyGrowthPoint { month: string; val: number; }
export interface HourlyCheckinPoint { hour: string; val: number; }
export interface PlanDistributionItem { name: string; count: number; percent: number; color: string; }
export interface OperationalMetricItem { icon: string; title: string; sub: string; val: string; change: string; color: string; }

export interface DashboardStatsResponse {
  success: boolean;
  total_arr_usd: number;
  total_mrr_usd: number;
  mrr_growth_percent: number;
  total_tenants: number;
  active_tenants: number;
  total_employees: number;
  total_cameras: number;
  camera_latency: string;
  monthly_growth: MonthlyGrowthPoint[];
  quarterly_growth: MonthlyGrowthPoint[];
  yearly_growth: MonthlyGrowthPoint[];
  hourly_checkins: HourlyCheckinPoint[];
  plan_distribution: PlanDistributionItem[];
  operational_metrics: OperationalMetricItem[];
}

export async function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  const res = await fetch(`${API_BASE_URL.replace('/auth', '')}/billing/dashboard-stats`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch dashboard stats.');
  return data;
}

export async function fetchSuperAdminDashboard() {
  const res = await fetch(`${API_BASE_URL.replace('/auth', '')}/dashboard/stats`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch dashboard stats.');
  return data;
}

export interface SuperAdminEmployeeItem {
  id: number;
  tenant_id: string;
  company_name: string;
  company_slug: string;
  emp_id: string;
  name: string;
  department?: string;
  designation?: string;
  email?: string;
  phone?: string;
  face_enrolled: boolean;
  photo_url?: string;
  joining_date?: string;
  is_active: boolean;
}

export interface SuperAdminEmployeeListResponse {
  success: boolean;
  total_employees: number;
  total_enrolled: number;
  employees: SuperAdminEmployeeItem[];
}

export interface SuperAdminCreateEmployeeRequest {
  company_slug: string;
  name: string;
  emp_id?: string;
  department?: string;
  designation?: string;
  email?: string;
  phone?: string;
}

export async function fetchSuperAdminEmployees(companySlug?: string): Promise<SuperAdminEmployeeListResponse> {
  const url = companySlug && companySlug !== 'all'
    ? `${API_BASE_URL.replace('/auth', '')}/billing/superadmin/employees?company_slug=${encodeURIComponent(companySlug)}`
    : `${API_BASE_URL.replace('/auth', '')}/billing/superadmin/employees`;

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch platform employees.');
  return data;
}

export async function createSuperAdminEmployee(payload: SuperAdminCreateEmployeeRequest): Promise<SuperAdminEmployeeItem> {
  const res = await fetch(`${API_BASE_URL.replace('/auth', '')}/billing/superadmin/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.detail || 'Failed to create employee.');
  return data;
}

export async function enrollEmployeeFacePhoto(tenantId: string, empId: string, imageFile: File): Promise<{ success: boolean; message: string }> {
  const formData = new FormData();
  formData.append('tenant_id', tenantId);
  formData.append('emp_id', empId);
  formData.append('photo', imageFile);
  formData.append('file', imageFile);

  const res = await fetch(`${API_BASE_URL.replace('/auth', '')}/face/enroll`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.detail || 'Failed to enroll face photo.');
  return data;
}


