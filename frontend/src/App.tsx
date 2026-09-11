import React, { useState, useEffect } from 'react';
import { BrandPanel } from './components/BrandPanel';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import { Dashboard } from './components/Dashboard';
import { AuthResponse } from './services/api';

export function App() {
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [resetToken, setResetToken] = useState<string>('');
  
  const [authData, setAuthData] = useState<AuthResponse | null>(() => {
    const saved = localStorage.getItem('saas_auth');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });
  
  const [registerStep, setRegisterStep] = useState<number>(1);

  const handleSetAuthData = (data: AuthResponse | null) => {
    if (data) {
      localStorage.setItem('saas_auth', JSON.stringify(data));
    } else {
      localStorage.removeItem('saas_auth');
    }
    setAuthData(data);
  };

  // Check URL query parameters for reset token on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      setView('reset');
    }
  }, []);

  if (authData) {
    return <Dashboard authData={authData} onLogout={() => handleSetAuthData(null)} />;
  }

  // Determine BrandPanel view mode matching user screenshots
  const brandViewMode = view === 'register' ? (registerStep === 3 ? 'checkout' : 'register') : 'default';

  return (
    <div className="auth-container">
      {/* Left Branding Panel matching User Screenshots */}
      <BrandPanel viewMode={brandViewMode} />

      {/* Right Interactive Form Panel */}
      <div className="form-panel">
        {view === 'login' && (
          <LoginForm
            onSuccess={(data) => handleSetAuthData(data)}
            onSwitchToRegister={() => setView('register')}
            onForgotPassword={() => setView('forgot')}
          />
        )}

        {view === 'register' && (
          <RegisterForm
            onSuccess={(data) => handleSetAuthData(data)}
            onSwitchToLogin={() => setView('login')}
            onStepChange={(step) => setRegisterStep(step)}
          />
        )}

        {view === 'forgot' && (
          <ForgotPasswordForm
            onBackToLogin={() => setView('login')}
            onNavigateToResetToken={(token) => {
              setResetToken(token);
              setView('reset');
            }}
          />
        )}

        {view === 'reset' && (
          <ResetPasswordForm
            initialToken={resetToken}
            onSuccessReset={() => setView('login')}
          />
        )}
      </div>
    </div>
  );
}

export default App;
