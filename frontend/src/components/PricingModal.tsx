import React, { useState, useEffect } from 'react';
import { Check, Zap, Sparkles, Shield, X, Loader2, CreditCard } from 'lucide-react';
import { fetchPlans, createCheckoutSession, PlanItem } from '../services/api';

interface PricingModalProps {
  token?: string;
  onClose: () => void;
  currentPlan?: string;
  onSelectPlan?: (planId: string) => Promise<void> | void;
}

const DEFAULT_PLANS: PlanItem[] = [
  {
    id: 'starter',
    name: 'Starter Plan',
    price_usd: 29,
    price_inr: 1999,
    interval: 'month',
    max_employees: 25,
    max_cameras: 2,
    trial_days: 14,
    popular: false,
    features: [
      'Up to 25 Employees',
      'Up to 2 Face Recognition Cameras',
      '14-Day Full Access Free Trial',
      'Real-Time Attendance Dashboard',
      'Standard Email Support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    price_usd: 69,
    price_inr: 4999,
    interval: 'month',
    max_employees: 100,
    max_cameras: 5,
    trial_days: 14,
    popular: true,
    features: [
      'Up to 100 Employees',
      'Up to 5 Face Recognition Cameras',
      '14-Day Full Access Free Trial',
      'Real-Time & Historical Analytics',
      'RTSP Multi-Camera Streaming Support',
      'Priority Email & Chat Support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    price_usd: 199,
    price_inr: 14999,
    interval: 'month',
    max_employees: 9999,
    max_cameras: 999,
    trial_days: 14,
    popular: false,
    features: [
      'Unlimited Employees',
      'Unlimited Face Recognition Cameras',
      'Custom Multi-Location Setup',
      'Dedicated Account Manager & 24/7 SLA Support',
      'Custom HRIS & Payroll Integrations',
      'On-Premise Backup Sync',
    ],
  },
];

export const PricingModal: React.FC<PricingModalProps> = ({ token, onClose, currentPlan = 'starter', onSelectPlan }) => {
  const [plans, setPlans] = useState<PlanItem[]>(DEFAULT_PLANS);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('INR');
  const [loading, setLoading] = useState(false);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track which plan the user has selected (clicked) inside the modal
  const [localSelected, setLocalSelected] = useState<string>(currentPlan);

  useEffect(() => {
    fetchPlans()
      .then((res) => {
        if (res.plans && res.plans.length > 0) {
          setPlans(res.plans);
        }
      })
      .catch(() => {
        // Fallback to default plans seamlessly
      });
  }, []);

  const handleSelectAndUpgrade = async (planId: string) => {
    // Step 1: Show tick immediately on click
    setLocalSelected(planId);
    setError(null);
    // Step 2: Trigger Stripe checkout or parent handler
    setUpgradingPlanId(planId);
    try {
      if (onSelectPlan) {
        await onSelectPlan(planId);
      } else if (token) {
        const res = await createCheckoutSession(token, planId);
        if (res.checkout_url) {
          window.location.href = res.checkout_url;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Stripe checkout initialization failed.');
      setUpgradingPlanId(null);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '1080px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative' }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 24, right: 24, border: 'none', background: '#f1f5f9', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ background: '#f5f3ff', color: '#7c3aed', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🎁 14-DAY FREE TRIAL INCLUDED ON ALL PLANS
          </span>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', margin: '0.8rem 0 0.4rem 0' }}>
            Choose the Perfect Plan for Your Team
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Scale your attendance management with automated AI face recognition. Upgrade or downgrade anytime.
          </p>

          {/* Currency Switcher */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', marginTop: '1.2rem' }}>
            <button
              onClick={() => setCurrency('INR')}
              style={{ border: 'none', padding: '0.4rem 1rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: currency === 'INR' ? '#ffffff' : 'transparent', color: currency === 'INR' ? '#7c3aed' : '#64748b', boxShadow: currency === 'INR' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
            >
              🇮🇳 INR (₹)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              style={{ border: 'none', padding: '0.4rem 1rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: currency === 'USD' ? '#ffffff' : 'transparent', color: currency === 'USD' ? '#7c3aed' : '#64748b', boxShadow: currency === 'USD' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
            >
              🇺🇸 USD ($)
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.8rem 1.2rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#7c3aed' }}>
            <Loader2 size={36} className="spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '1rem', fontWeight: 600 }}>Loading Pricing Packages...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'stretch' }}>
            {plans.map((plan) => {
              const isSelected = localSelected.toLowerCase() === plan.id.toLowerCase();
              const isUpgrading = upgradingPlanId === plan.id;
              const price = currency === 'INR' ? `₹${plan.price_inr.toLocaleString('en-IN')}` : `$${plan.price_usd}`;

              return (
                <div
                  key={plan.id}
                  onClick={() => !isUpgrading && setLocalSelected(plan.id)}
                  style={{
                    background: isSelected
                      ? plan.popular ? 'linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)' : '#f0f9ff'
                      : plan.popular ? 'linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)' : '#ffffff',
                    border: isSelected
                      ? '2px solid #2563eb'
                      : plan.popular ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    boxShadow: isSelected
                      ? '0 10px 30px -5px rgba(37, 99, 235, 0.2)'
                      : plan.popular ? '0 10px 30px -5px rgba(139, 92, 246, 0.2)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Selected Checkmark Badge */}
                  {isSelected && (
                    <div style={{ position: 'absolute', top: 16, right: 16, width: 28, height: 28, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(37,99,235,0.35)' }}>
                      <Check size={16} color="#ffffff" strokeWidth={3} />
                    </div>
                  )}

                  {plan.popular && !isSelected && (
                    <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#ffffff', padding: '0.25rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 4px 10px rgba(109, 40, 217, 0.3)' }}>
                      MOST POPULAR
                    </div>
                  )}
                  {isSelected && (
                    <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', padding: '0.25rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)', whiteSpace: 'nowrap' }}>
                      ✓ SELECTED
                    </div>
                  )}

                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>{plan.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '1.2rem' }}>
                      <span style={{ fontSize: '2.5rem', fontWeight: 900, color: isSelected ? '#2563eb' : '#0f172a' }}>{price}</span>
                      <span style={{ color: '#64748b', fontSize: '0.9rem' }}>/ month</span>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {plan.features.map((feat, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: '#334155' }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: isSelected ? '#eff6ff' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? '#2563eb' : '#16a34a' }}>
                            <Check size={13} strokeWidth={3} />
                          </div>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    disabled={!!upgradingPlanId}
                    onClick={(e) => { e.stopPropagation(); handleSelectAndUpgrade(plan.id); }}
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      border: 'none',
                      cursor: upgradingPlanId ? 'default' : 'pointer',
                      background: isSelected
                        ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                        : plan.popular
                          ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                          : '#0f172a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: isSelected
                        ? '0 4px 14px rgba(37, 99, 235, 0.4)'
                        : plan.popular ? '0 4px 14px rgba(109, 40, 217, 0.35)' : 'none',
                      opacity: upgradingPlanId && !isUpgrading ? 0.5 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 size={18} className="spinner" />
                        <span>Connecting to Stripe...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        <span>{isSelected ? `Subscribe — ${price}/mo` : 'Select this Plan'}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
