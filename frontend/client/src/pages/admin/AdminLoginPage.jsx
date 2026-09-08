import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { useAuth } from '../../context/AuthContext';

export const AdminLoginPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuth, userRole } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    // If already logged in as admin, redirect to admin dashboard
    if (isAuth && userRole === 'admin') {
      window.location.replace('/dashboard/admin');
      return;
    }

    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');

    if (errorParam) setErrorMessage(errorParam);
    if (messageParam) setInfoMessage(messageParam);

    if (errorParam || messageParam) {
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete('error');
      newParams.delete('message');
      const newSearch = newParams.toString();
      const cleanUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [searchParams, isAuth, userRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both administrator email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role: 'admin',
          remember,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user && data.user.role === 'admin') {
        window.location.replace('/dashboard/admin');
      } else {
        setErrorMessage(data.message || 'Invalid administrator credentials or unauthorized account.');
      }
    } catch (err) {
      console.error('Admin Login request error:', err);
      setErrorMessage('Server connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="lg-page-root">
      <Header />

      <main className="lg-main-content">
        <section className="lg-login-section">
          <div className="lg-login-container" style={{ maxWidth: '960px', margin: '0 auto' }}>
            {/* LEFT SIDE BANNER */}
            <div className="lg-login-left" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
              <span className="lg-tag" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                RESTRICTED SYSTEM ACCESS
              </span>
              <h1 style={{ color: '#ffffff' }}>Admin Control Panel</h1>
              <p style={{ color: '#94a3b8' }}>
                System Administrator Portal. Please enter your verified administrator credentials to access the Smart HomeTutor Control Center.
              </p>

              <div className="lg-shield-box" style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <h4 style={{ color: '#f87171' }}>
                  <i className="fa-solid fa-shield-halved"></i> Security & Audit Notice
                </h4>
                <ul style={{ color: '#cbd5e1' }}>
                  <li>Authorized system administrators only</li>
                  <li>All authentication attempts are logged and monitored</li>
                  <li>Multi-factor session protection enabled</li>
                </ul>
              </div>
            </div>

            {/* RIGHT SIDE FORM */}
            <div className="lg-login-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ background: '#fee2e2', color: '#dc2626', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  <i className="fa-solid fa-user-shield"></i>
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '22px', color: '#0f172a' }}>Admin Sign In</h2>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Administrator Portal</span>
                </div>
              </div>

              <p className="lg-subtitle" style={{ marginTop: '8px' }}>Enter your administrator email address and password below.</p>

              {/* ERROR ALERT */}
              {errorMessage && (
                <div className="lg-login-alert lg-login-alert-error">
                  <div className="lg-alert-row">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* INFO ALERT */}
              {infoMessage && (
                <div className="lg-login-alert lg-login-alert-info">
                  <i className="fa-solid fa-circle-check"></i>
                  <span>{infoMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} id="adminLoginForm">
                {/* 1. EMAIL ADDRESS */}
                <div className="lg-input-box">
                  <label>Administrator Email Address</label>
                  <div className="lg-input-field">
                    <i className="fa-solid fa-envelope"></i>
                    <input
                      type="email"
                      name="email"
                      placeholder="admin@smarthometutor.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* 2. PASSWORD */}
                <div className="lg-input-box">
                  <label>Administrator Password</label>
                  <div className="lg-input-field" style={{ position: 'relative' }}>
                    <i className="fa-solid fa-lock"></i>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Enter administrator password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      style={{ paddingRight: '40px' }}
                    />
                    <i
                      className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} lg-toggle-password`}
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    ></i>
                  </div>
                </div>

                <div className="lg-options">
                  <label className="lg-remember-label">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>Remember Administrator Session</span>
                  </label>
                </div>

                <button type="submit" className="lg-login-btn" disabled={isSubmitting} style={{ background: '#0f172a' }}>
                  {isSubmitting ? (
                    <span>
                      <i className="fa-solid fa-spinner fa-spin"></i> Authenticating Admin Session...
                    </span>
                  ) : (
                    <span>
                      Authenticate Admin Panel <i className="fa-solid fa-shield-halved"></i>
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
