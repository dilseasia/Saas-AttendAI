import React, { useState } from 'react';
import { Building2, Mail, Phone, User, Lock, Eye, EyeOff, Sparkles, Loader2, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle, CreditCard } from 'lucide-react';
import { registerTenant, createCheckoutSession, AuthResponse } from '../services/api';
import { PricingModal } from './PricingModal';

interface RegisterFormProps {
  onSuccess: (data: AuthResponse) => void;
  onSwitchToLogin: () => void;
  onStepChange?: (step: number) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin, onStepChange }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Form State
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  
  const [adminName, setAdminName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'enterprise'>('pro');
  const [showPricingModal, setShowPricingModal] = useState<boolean>(true);

  // Helper to change step and notify parent
  const updateStep = (newStep: 1 | 2 | 3) => {
    setStep(newStep);
    if (newStep === 3) {
      setShowPricingModal(true);
    }
    if (onStepChange) {
      onStepChange(newStep);
    }
  };

  // Auto-generate company slug preview
  const companySlug = companyName
    ? companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    : 'your-company-slug';

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (step === 1) {
      if (!companyName || !companyEmail || !companyPhone) {
        setError('Please fill in all company fields.');
        return;
      }
      updateStep(2);
    } else if (step === 2) {
      if (!adminName || !password || !confirmPassword) {
        setError('Please fill in all admin fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      updateStep(3);
    }
  };

  const handleRegisterSubmit = async (payNow: boolean = false, planOverride?: string) => {
    setError(null);
    setLoading(true);
    const planToUse = planOverride || selectedPlan;

    try {
      const response = await registerTenant({
        company_name: companyName,
        company_email: companyEmail,
        company_phone: companyPhone,
        timezone,
        admin_name: adminName,
        password,
        confirm_password: confirmPassword,
        selected_plan: planToUse,
      });

      if (payNow) {
        // Must go to Stripe — do NOT login on failure
        if (!response.tokens?.access_token) {
          throw new Error('Registration succeeded but no auth token was returned. Please try again.');
        }
        const checkoutRes = await createCheckoutSession(response.tokens.access_token, planToUse);
        if (checkoutRes.checkout_url) {
          // ✅ Redirect to Stripe Checkout — page navigates away
          window.location.href = checkoutRes.checkout_url;
          return; // stop execution — browser navigates away
        } else {
          throw new Error('Stripe checkout URL was not returned. Please contact support.');
        }
      }

      // Free trial path — log the user in
      onSuccess(response);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      if (step !== 3) updateStep(1); // only go back if not on plan step
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card">
      <div className="form-header">
        <h2>Register Company</h2>
        <p>Start your 14-day free trial with full feature access</p>
      </div>

      {/* Stepper Progress */}
      <div className="stepper">
        <div className={`step-item ${step >= 1 ? (step > 1 ? 'completed' : 'active') : ''}`}>
          {step > 1 ? <CheckCircle2 size={18} /> : '1'}
        </div>
        <div className={`step-item ${step >= 2 ? (step > 2 ? 'completed' : 'active') : ''}`}>
          {step > 2 ? <CheckCircle2 size={18} /> : '2'}
        </div>
        <div className={`step-item ${step === 3 ? 'active' : ''}`}>3</div>
      </div>

      {error && (
        <div className="toast error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Company Details */}
      {step === 1 && (
        <form onSubmit={handleNextStep}>
          <div className="form-group">
            <label className="form-label">Company / Tenant Name</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Building2 size={18} />
              </span>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Acme Technologies"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            {companyName && (
              <div className="slug-preview">
                Tenant Portal URL: <strong>{companySlug}.attendai.com</strong>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Company Work Email</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Mail size={18} />
              </span>
              <input
                type="email"
                className="form-input"
                placeholder="admin@company.com"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Phone size={18} />
              </span>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. 9876543210"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary">
            <span>Continue to Admin Setup</span>
            <ArrowRight size={18} />
          </button>
        </form>
      )}

      {/* STEP 2: Admin Account */}
      {step === 2 && (
        <form onSubmit={handleNextStep}>
          <div className="form-group">
            <label className="form-label">Admin Full Name</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <User size={18} />
              </span>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Nikhil Singh"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Create Admin Password</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input has-right-icon"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="input-icon-right"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="step-buttons">
            <button type="button" className="btn-secondary" onClick={() => updateStep(1)}>
              <ArrowLeft size={16} inline-block /> Back
            </button>
            <button type="submit" className="btn-primary" style={{ width: '50%' }}>
              <span>Review Plan</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Plan Selection & Checkout Screen matching User Screenshots */}
      {step === 3 && (
        <div>
          {/* Pricing Modal Pop-Up matching Screenshot 2 */}
          {showPricingModal && (
            <PricingModal
              currentPlan={selectedPlan}
              onClose={() => setShowPricingModal(false)}
              onSelectPlan={async (planId) => {
                setSelectedPlan(planId as any);
                await handleRegisterSubmit(true, planId);
              }}
            />
          )}

          {/* Plan Summary Header */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem 1.25rem', borderRadius: '14px', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Selected Plan</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedPlan === 'starter' && 'Starter Plan'}
                  {selectedPlan === 'pro' && 'Pro Plan (Popular)'}
                  {selectedPlan === 'enterprise' && 'Enterprise Plan'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563eb' }}>
                  {selectedPlan === 'starter' && '₹1,999'}
                  {selectedPlan === 'pro' && '₹4,999'}
                  {selectedPlan === 'enterprise' && '₹14,999'}
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}> / month</span>
                </div>
                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                  Billed monthly
                </span>
                <div style={{ marginTop: '0.3rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowPricingModal(true)}
                    style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Sparkles size={12} /> Compare Plans
                  </button>
                </div>
              </div>
            </div>

            {/* Change Plan Selector Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px dashed #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setSelectedPlan('starter')}
                style={{
                  flex: 1,
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: selectedPlan === 'starter' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                  background: selectedPlan === 'starter' ? '#eff6ff' : '#ffffff',
                  color: selectedPlan === 'starter' ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                Starter ₹1.9k
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlan('pro')}
                style={{
                  flex: 1,
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: selectedPlan === 'pro' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                  background: selectedPlan === 'pro' ? '#eff6ff' : '#ffffff',
                  color: selectedPlan === 'pro' ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                Pro ₹4.9k ★
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlan('enterprise')}
                style={{
                  flex: 1,
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: selectedPlan === 'enterprise' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                  background: selectedPlan === 'enterprise' ? '#eff6ff' : '#ffffff',
                  color: selectedPlan === 'enterprise' ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                Enterprise ₹14.9k
              </button>
            </div>
          </div>

          {/* Payment Method Selector matching User Screenshot 1 */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '0.6rem' }}>
              Payment Method
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {/* Option 1: Credit / Debit Card */}
              <div
                style={{
                  border: '2px solid #2563eb',
                  background: '#eff6ff',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '5px solid #2563eb', background: '#ffffff' }}></div>
                <CreditCard size={20} style={{ color: '#1d4ed8' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>Credit / Debit Card</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Visa, Mastercard, American Express, etc.</div>
                </div>
              </div>

              {/* Option 2: UPI */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  opacity: 0.85,
                  cursor: 'pointer',
                }}
                onClick={() => handleRegisterSubmit(true)}
              >
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #94a3b8', background: '#ffffff' }}></div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#16a34a', background: '#f0fdf4', padding: '2px 6px', borderRadius: '4px' }}>UPI</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>UPI / Netbanking</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Pay using any UPI app (Google Pay, PhonePe, etc.)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Details Form Mockup matching User Screenshot 1 */}
          <div style={{ marginBottom: '1.25rem', background: '#ffffff', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.6rem' }}>Card Details</div>

            <div style={{ marginBottom: '0.6rem' }}>
              <div style={{ fontSize: '0.74rem', color: '#475569', marginBottom: '0.2rem' }}>Card Number</div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '4.5rem', fontSize: '0.85rem' }}
                  placeholder="1234 5678 9012 3456"
                  readOnly
                  value="4242 •••• •••• 4242"
                />
                <CreditCard size={16} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
                <div style={{ position: 'absolute', right: '10px', display: 'flex', gap: '4px', fontSize: '0.65rem', fontWeight: 800, color: '#2563eb' }}>
                  <span style={{ background: '#eff6ff', padding: '1px 4px', borderRadius: '3px' }}>VISA</span>
                  <span style={{ background: '#fef2f2', color: '#dc2626', padding: '1px 4px', borderRadius: '3px' }}>MC</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.74rem', color: '#475569', marginBottom: '0.2rem' }}>Expiry Date</div>
                <input type="text" className="form-input" style={{ paddingLeft: '0.8rem', fontSize: '0.85rem' }} placeholder="MM / YY" readOnly value="12 / 28" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.74rem', color: '#475569', marginBottom: '0.2rem' }}>CVV</div>
                <input type="password" className="form-input" style={{ paddingLeft: '0.8rem', fontSize: '0.85rem' }} placeholder="123" readOnly value="•••" />
              </div>
            </div>
          </div>

          {/* Terms Checkbox */}
          <div style={{ marginBottom: '1.25rem', fontSize: '0.78rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" defaultChecked style={{ width: '16px', height: '16px', accentColor: '#2563eb' }} />
            <span>I agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong></span>
          </div>

          {/* Action Buttons */}
          <div className="step-buttons" style={{ flexDirection: 'column', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn-primary"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
                fontSize: '1rem',
                padding: '0.95rem',
              }}
              onClick={() => handleRegisterSubmit(true)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  <span>Redirecting to Stripe Gateway...</span>
                </>
              ) : (
                <>
                  <Lock size={18} />
                  <span>Pay {selectedPlan === 'starter' ? '₹1,999' : selectedPlan === 'pro' ? '₹4,999' : '₹14,999'} →</span>
                </>
              )}
            </button>

            <div style={{ display: 'flex', gap: '0.6rem', width: '100%' }}>
              <button type="button" className="btn-secondary" onClick={() => updateStep(2)} style={{ flex: 1 }}>
                Back
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 2, background: '#f8fafc', color: '#334155', fontWeight: 700 }}
                onClick={() => handleRegisterSubmit(false)}
                disabled={loading}
              >
                <span>Start 14-Day Free Trial</span>
              </button>
            </div>
          </div>

          {/* Security Footer Badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.25rem', fontSize: '0.72rem', color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} style={{ color: '#16a34a' }} />
              <span>256-Bit SSL Encrypted</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={14} style={{ color: '#2563eb' }} />
              <span>Powered by Stripe</span>
            </div>
          </div>
        </div>
      )}

      {/* Switch to Login */}
      <div className="form-footer-switch">
        <span>Already have an account?</span>
        <button type="button" className="switch-btn" onClick={onSwitchToLogin}>
          Sign In
        </button>
      </div>

      <div className="security-badge-wrapper">
        <div className="security-badge">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>INSTANT PROVISIONING • Multi-Tenant Architecture</span>
        </div>
      </div>
    </div>
  );
};
