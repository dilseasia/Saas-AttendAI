import React, { useState } from 'react';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { requestForgotPassword } from '../services/api';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
  onNavigateToResetToken: (token: string) => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin, onNavigateToResetToken }) => {
  const [email, setEmail] = useState('admin@seasia.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ message: string; reset_token?: string; reset_link?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await requestForgotPassword(email);
      setSuccessData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card">
      <div className="form-header">
        <div style={{ width: 48, height: 48, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', color: '#7c3aed' }}>
          <KeyRound size={24} />
        </div>
        <h2>Forgot Password?</h2>
        <p>Enter your registered email address to receive password reset instructions.</p>
      </div>

      {error && (
        <div className="toast error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successData ? (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div className="toast success" style={{ textAlign: 'left', padding: '1.2rem', display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
            <CheckCircle2 size={24} style={{ minWidth: 24, marginTop: 2 }} />
            <div>
              <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem', fontWeight: 700 }}>Check your email</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5, color: '#065f46' }}>
                If an account exists for <strong>{email}</strong>, you will receive password reset instructions shortly. Please check your inbox and spam folder.
              </p>
            </div>
          </div>

          {successData.reset_token && (
            <div style={{ marginTop: '1.25rem', background: '#f5f3ff', border: '1px border-dashed #ddd6fe', padding: '0.85rem', borderRadius: '10px' }}>
              <p style={{ fontSize: '0.78rem', color: '#6d28d9', margin: '0 0 0.6rem 0', fontWeight: 600 }}>
                💡 Dev Shortcut: Test Password Reset UI & DB update directly:
              </p>
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.55rem', background: '#7c3aed' }}
                onClick={() => onNavigateToResetToken(successData.reset_token!)}
              >
                <span>Click Here to Test Reset Password Screen →</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: '1.25rem', background: '#475569' }}
            onClick={onBackToLogin}
          >
            <ArrowLeft size={16} />
            <span>Return to Sign In</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Registered Email</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Mail size={18} />
              </span>
              <input
                type="email"
                className="form-input"
                placeholder="enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1.5rem' }}>
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Sending Reset Link...</span>
              </>
            ) : (
              <>
                <span>Send Reset Instructions</span>
              </>
            )}
          </button>

          <div className="form-footer-switch">
            <button
              type="button"
              className="switch-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={onBackToLogin}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
