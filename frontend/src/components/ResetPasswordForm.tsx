import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { submitResetPassword } from '../services/api';

interface ResetPasswordFormProps {
  initialToken?: string;
  onSuccessReset: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ initialToken = '', onSuccessReset }) => {
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('Password reset token is missing.');
      return;
    }

    setLoading(true);

    try {
      await submitResetPassword(token, newPassword, confirmPassword);
      setSuccess(true);
      setTimeout(() => {
        onSuccessReset();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Password reset failed. Token may be expired or invalid.');
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
        <h2>Reset Your Password</h2>
        <p>Enter a new secure password for your account.</p>
      </div>

      {error && (
        <div className="toast error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="toast success" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Password Reset Complete!</h4>
          <p style={{ fontSize: '0.85rem' }}>Your password has been updated successfully. Redirecting you to Sign In...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {!initialToken && (
            <div className="form-group">
              <label className="form-label">Reset Token</label>
              <input
                type="text"
                className="form-input"
                placeholder="Paste reset token here"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input has-right-icon"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
            <label className="form-label">Confirm New Password</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1.5rem' }}>
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Reset Password</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
