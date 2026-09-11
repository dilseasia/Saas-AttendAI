import React from 'react';
import { ScanFace, Sparkles, BarChart3, ShieldCheck, Users, Lock, TrendingUp, CheckCircle2 } from 'lucide-react';

interface BrandPanelProps {
  viewMode?: 'register' | 'checkout' | 'default';
  selectedPlanPrice?: string;
}

export const BrandPanel: React.FC<BrandPanelProps> = ({ viewMode = 'default' }) => {
  const isCheckout = viewMode === 'checkout';

  return (
    <div className="brand-panel">
      {/* Brand Header */}
      <div className="brand-header">
        <div className="brand-logo-box" style={{ background: 'transparent', padding: 0, overflow: 'hidden' }}>
          <img src="/image.png" alt="Attend AI Logo" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
        </div>
        <div className="brand-title-group">
          <h2>Attend AI</h2>
          <p>AI Face Registration & Attendance System</p>
        </div>
      </div>

      {/* Main Hero Section matching user screenshots */}
      <div className="brand-hero">
        {isCheckout ? (
          <>
            <h1>Invest in a<br /><span style={{ color: '#c4b5fd' }}>Smarter Workplace</span></h1>
            <p className="hero-desc">
              Choose a plan, complete your payment, and unlock the power of AI-driven attendance.
            </p>
          </>
        ) : (
          <>
            <h1>Join the Future<br />of <span style={{ color: '#c4b5fd' }}>Attendance</span></h1>
            <p className="hero-desc">
              Set up your company, choose a plan, and get started with AI-powered attendance in minutes.
            </p>
          </>
        )}

        {/* Feature Cards */}
        <div className="feature-list">
          {isCheckout ? (
            <>
              <div className="feature-item">
                <div className="feature-icon-box">
                  <Users size={20} className="text-white" />
                </div>
                <div className="feature-text">
                  <h4>Get Started Quickly</h4>
                  <p>Simple and secure payment</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-box">
                  <Lock size={20} className="text-white" />
                </div>
                <div className="feature-text">
                  <h4>Trusted & Secure</h4>
                  <p>Payments powered by Stripe</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-box">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <div className="feature-text">
                  <h4>Scale with Confidence</h4>
                  <p>Upgrade or downgrade anytime</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="feature-item">
                <div className="feature-icon-box">
                  <ScanFace size={20} className="text-white" />
                </div>
                <div className="feature-text">
                  <h4>Face Recognition</h4>
                  <p>Accurate and secure attendance</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-box">
                  <BarChart3 size={20} className="text-white" />
                </div>
                <div className="feature-text">
                  <h4>Real-time Analytics</h4>
                  <p>Insights at your fingertips</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-box">
                  <Users size={20} className="text-white" />
                </div>
                <div className="feature-text">
                  <h4>Easy Team Management</h4>
                  <p>Built for modern workplaces</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Status */}
      <div className="brand-footer">
        <div className="status-badge">
          <span className="pulse-dot"></span>
          System Online - All services operational
        </div>
        <div className="copyright-text">
          &copy; {new Date().getFullYear()} Attend AI. All rights reserved.
        </div>
      </div>
    </div>
  );
};
