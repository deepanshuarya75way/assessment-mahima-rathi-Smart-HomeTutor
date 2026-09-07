import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';

export const VerifyOtp = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const [alert, setAlert] = useState({ type: '', message: '' });
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    const initialEmail = searchParams.get('email') || '';
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [searchParams]);

  useEffect(() => {
    let timer = null;
    if (cooldownSeconds > 0) {
      timer = setInterval(() => {
        setCooldownSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldownSeconds]);

  const handleSendOtp = async () => {
    setAlert({ type: '', message: '' });
    if (!email.trim()) {
      setAlert({ type: 'error', message: 'Please enter your registered email address first.' });
      return;
    }

    setSendLoading(true);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAlert({ type: 'info', message: 'Verification OTP has been sent to your registered email.' });
        setCooldownSeconds(60);
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to send verification OTP.' });
      }
    } catch (err) {
      console.error('Send OTP Error:', err);
      setAlert({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSendLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    const cleanEmail = email.trim();
    const cleanOtp = otp.trim();

    if (!cleanEmail || !cleanOtp) {
      setAlert({ type: 'error', message: 'Please enter both email and the 6-digit OTP code.' });
      return;
    }

    if (cleanOtp.length !== 6) {
      setAlert({ type: 'error', message: 'OTP code must be exactly 6 digits.' });
      return;
    }

    setVerifyLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp: cleanOtp }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAlert({ type: 'success', message: `${data.message || 'Email verified successfully!'} Redirecting to login...` });
        setTimeout(() => {
          navigate('/login?message=' + encodeURIComponent('Email verified successfully! You can now log in.'));
        }, 1500);
      } else {
        setAlert({ type: 'error', message: data.message || 'Invalid or expired verification OTP code.' });
      }
    } catch (err) {
      console.error('Verify OTP Error:', err);
      setAlert({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="verify-otp-page">
      <Header activePage="login" />

      {/* EMAIL VERIFICATION SECTION */}
      <section className="login-section" style={{ padding: '60px 0' }}>
        <div className="login-container">
          
          {/* LEFT SIDE BANNER */}
          <div className="login-left">
            <span className="tag">EMAIL EXISTENCE VERIFICATION</span>
            <h1>Verify Your Email Address</h1>
            <p>
              To complete your account registration and ensure security, enter the 6-digit OTP verification code sent to your registered email address.
            </p>

            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', marginTop: '20px', border: '1px solid rgba(255,255,255,0.2)' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent, #f59e0b)', marginBottom: '8px' }}>
                <i className="fa-solid fa-shield-halved"></i> 2-Step Verification Security
              </h4>
              <ul style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--primary-light, #e8eef5)', paddingLeft: '18px', margin: 0 }}>
                <li>Protects your account against unauthorized email usage</li>
                <li>6-digit verification OTP valid for 10 minutes</li>
                <li>Instant account activation upon verification</li>
              </ul>
            </div>
          </div>

          {/* RIGHT SIDE FORM CARD */}
          <div className="login-card">
            <h2>Enter 6-Digit OTP</h2>
            <p className="subtitle">Enter the verification code sent to your registered email.</p>

            {alert.message && (
              <div
                className={`login-alert ${alert.type === 'error' ? 'login-alert-error' : 'login-alert-info'}`}
                style={{
                  marginBottom: '16px',
                  background: alert.type === 'success' ? '#dcfce7' : undefined,
                  color: alert.type === 'success' ? '#166534' : undefined,
                  borderColor: alert.type === 'success' ? '#86efac' : undefined,
                }}
              >
                <i className={`fa-solid ${alert.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}`}></i>
                <span>{alert.message}</span>
              </div>
            )}

            <form onSubmit={handleVerifySubmit}>
              {/* REGISTERED EMAIL ADDRESS WITH INLINE SEND OTP BUTTON */}
              <div className="input-box">
                <label>Registered Email Address</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div className="input-field" style={{ flex: 1 }}>
                    <i className="fa-solid fa-envelope"></i>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    disabled={sendLoading || cooldownSeconds > 0}
                    onClick={handleSendOtp}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '0 16px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: sendLoading || cooldownSeconds > 0 ? 'not-allowed' : 'pointer',
                      opacity: sendLoading || cooldownSeconds > 0 ? 0.6 : 1,
                      border: 'none',
                      background: '#0284c7',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {sendLoading ? (
                      <><i className="fa-solid fa-spinner fa-spin"></i> Sending...</>
                    ) : cooldownSeconds > 0 ? (
                      `Resend OTP (${cooldownSeconds}s)`
                    ) : (
                      <><i className="fa-solid fa-paper-plane"></i> Send OTP</>
                    )}
                  </button>
                </div>
              </div>

              {/* 6-DIGIT OTP INPUT */}
              <div className="input-box" style={{ marginTop: '16px' }}>
                <label>6-Digit Verification Code (OTP)</label>
                <div className="input-field">
                  <i className="fa-solid fa-key"></i>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    required
                    style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '4px', textAlign: 'center' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={verifyLoading}
                className="login-btn"
                style={{ marginTop: '20px', width: '100%' }}
              >
                {verifyLoading ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Verifying...</>
                ) : (
                  <>Verify OTP & Continue to Login <i className="fa-solid fa-arrow-right"></i></>
                )}
              </button>

              <div className="divider" style={{ margin: '20px 0 14px 0' }}>
                <span>OR</span>
              </div>

              <p className="signup-text" style={{ textAlign: 'center' }}>
                Already verified? <Link to="/login">Return to Login</Link>
              </p>
            </form>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
};
