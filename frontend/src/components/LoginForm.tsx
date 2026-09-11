import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { loginUser, AuthResponse } from '../services/api';

interface LoginFormProps {
  onSuccess: (data: AuthResponse) => void;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister, onForgotPassword }) => {
  const [email, setEmail] = useState('admin@seasia.com');
  const [password, setPassword] = useState('Admin@1234');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await loginUser({ email, password });
      onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card">
      <div className="form-header" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <img src="/image.png" alt="Attend AI Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <h2 style={{ margin: 0 }}>Sign In</h2>
        </div>
        <p>Enter your credentials to access your account</p>
      </div>

      {error && (
        <div className="toast error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Email / Username Field */}
        <div className="form-group">
          <label className="form-label">Email or Username</label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <User size={18} />
            </span>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your email or username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <Lock size={18} />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input has-right-icon"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="input-icon-right"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Options Row */}
        <div className="form-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              className="checkbox-input"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>
          <a href="#forgot" className="forgot-link" onClick={(e) => { e.preventDefault(); onForgotPassword(); }}>
            Forgot password?
          </a>
        </div>

        {/* Submit Button */}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={20} className="spinner" />
              <span>Signing In...</span>
            </>
          ) : (
            <>
              <LogIn size={20} />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      {/* Switch to Register */}
      <div className="form-footer-switch">
        <span>Don't have an account?</span>
        <button type="button" className="switch-btn" onClick={onSwitchToRegister}>
          Register Company
        </button>
      </div>

      {/* Security Badge */}
      <div className="security-badge-wrapper">
        <div className="security-badge">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>SECURE LOGIN • Highly Secured</span>
        </div>
      </div>
    </div>
  );
};
