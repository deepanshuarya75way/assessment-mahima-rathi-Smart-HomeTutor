import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';

export const ForgotPassword = () => {
  const [searchParams] = useSearchParams();

  // Wizard Step (1: Request OTP, 2: Verify OTP, 3: Set New Password, 4: Complete)
  const [step, setStep] = useState(1);

  // Form State
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility Toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Resend OTP Cooldown Timer State
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);

    const emailParam = searchParams.get('email');
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');

    if (emailParam) setEmail(emailParam);
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
  }, [searchParams]);

  // Cooldown countdown effect
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

  const startResendCooldown = () => {
    setCooldownSeconds(60);
  };

  // STEP 1: REQUEST OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    const targetEmail = email.trim();
    if (!targetEmail) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInfoMessage(data.message || 'OTP code sent to your email address.');
        setStep(2);
        startResendCooldown();
      } else {
        setErrorMessage(data.message || 'Failed to request password reset OTP.');
      }
    } catch (err) {
      console.error('Forgot Password Request Error:', err);
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // RESEND INLINE OTP
  const handleResendOtp = async () => {
    if (cooldownSeconds > 0 || isSubmitting) return;
    setErrorMessage('');
    setInfoMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInfoMessage(data.message || 'A new OTP code has been sent to your email address.');
        startResendCooldown();
      } else {
        setErrorMessage(data.message || 'Failed to resend OTP code.');
      }
    } catch (err) {
      console.error('Resend OTP Error:', err);
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 2: VERIFY OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    const targetOtp = otp.trim();
    if (!email.trim() || !targetOtp) {
      setErrorMessage('Please enter the 6-digit OTP code.');
      return;
    }

    if (targetOtp.length !== 6) {
      setErrorMessage('OTP code must be exactly 6 digits.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: targetOtp }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInfoMessage(data.message || 'OTP verified successfully!');
        setStep(3);
      } else {
        setErrorMessage(data.message || 'Invalid or expired 6-digit OTP code.');
      }
    } catch (err) {
      console.error('Verify OTP Error:', err);
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 3: RESET PASSWORD
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (!newPassword || !confirmPassword) {
      setErrorMessage('Please enter and confirm your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please enter matching passwords.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim(), newPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInfoMessage(data.message || 'Password reset successful!');
        setStep(4);
      } else {
        setErrorMessage(data.message || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      console.error('Reset Password Error:', err);
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for rendering Step Dot styles
  const getDotStyle = (dotNumber) => {
    let bg = '#e2e8f0';
    let color = '#64748b';

    if (step === dotNumber) {
      bg = 'var(--primary)';
      color = '#ffffff';
    } else if (step > dotNumber) {
      bg = '#059669';
      color = '#ffffff';
    }

    return {
      zIndex: 2,
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: bg,
      color: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      fontSize: '13px',
      transition: 'all 0.3s ease',
    };
  };

  // Dynamic Page Titles
  let titleText = 'Forgot Password';
  let subtitleText = 'Enter your registered email address to receive a 6-digit OTP code.';

  if (step === 2) {
    titleText = 'Verify Reset OTP';
    subtitleText = `Enter the 6-digit verification code sent to ${email}.`;
  } else if (step === 3) {
    titleText = 'Set New Password';
    subtitleText = 'Choose a strong new password for your account.';
  } else if (step === 4) {
    titleText = 'Password Reset Complete';
    subtitleText = 'Your password has been reset successfully.';
  }

  return (
    <div className="forgot-password-page">
      <Header activePage="login" />

      <main>
        <section className="login-section" style={{ padding: '60px 0' }}>
          <div className="login-container">
            {/* LEFT SIDE BANNER */}
            <div className="login-left">
              <span className="tag">SECURE ACCOUNT RECOVERY</span>
              <h1>Reset Your Password</h1>
              <p>
                Follow the 3-step verification process to securely reset your Smart HomeTutor account password using your registered email address.
              </p>

              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', marginTop: '20px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '8px' }}>
                  <i className="fa-solid fa-shield-halved"></i> Password Security Protocol
                </h4>
                <ul style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--primary-light)', paddingLeft: '18px', margin: 0 }}>
                  <li>6-digit security OTP sent to your registered email</li>
                  <li>OTP is valid for 10 minutes</li>
                  <li>Passwords are encrypted using bcrypt hashing</li>
                </ul>
              </div>
            </div>

            {/* RIGHT SIDE FORM CARD */}
            <div className="login-card">
              {/* STEP INDICATOR */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '2px', background: 'var(--border-color)', zIndex: 1, transform: 'translateY(-50%)' }}></div>
                <div style={getDotStyle(1)}>1</div>
                <div style={getDotStyle(2)}>2</div>
                <div style={getDotStyle(3)}>3</div>
              </div>

              {/* DYNAMIC HEADING & SUBTITLE */}
              <h2>{titleText}</h2>
              <p className="subtitle">{subtitleText}</p>

              {/* DYNAMIC ALERTS */}
              {errorMessage && (
                <div className="login-alert login-alert-error" style={{ marginBottom: '16px' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>{errorMessage}</span>
                </div>
              )}
              {infoMessage && (
                <div className="login-alert login-alert-info" style={{ marginBottom: '16px', background: '#dcfce7', color: '#166534', borderColor: '#86efac' }}>
                  <i className="fa-solid fa-circle-check"></i>
                  <span>{infoMessage}</span>
                </div>
              )}

              {/* STEP 1: ENTER EMAIL */}
              {step === 1 && (
                <form onSubmit={handleRequestOtp}>
                  <div className="input-box">
                    <label>Registered Email Address</label>
                    <div className="input-field">
                      <i className="fa-solid fa-envelope"></i>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="login-btn" style={{ marginTop: '10px' }}>
                    {isSubmitting ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i> Sending OTP...
                      </>
                    ) : (
                      <>
                        Send 6-Digit OTP <i className="fa-solid fa-paper-plane"></i>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: VERIFY OTP */}
              {step === 2 && (
                <form onSubmit={handleVerifyOtp}>
                  <div className="input-box">
                    <label>Registered Email Address</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div className="input-field" style={{ flex: 1, background: '#f1f5f9' }}>
                        <i className="fa-solid fa-envelope"></i>
                        <input type="email" value={email} readOnly style={{ color: '#475569', cursor: 'not-allowed' }} />
                      </div>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={cooldownSeconds > 0 || isSubmitting}
                        style={{
                          whiteSpace: 'nowrap',
                          padding: '0 14px',
                          fontSize: '12px',
                          borderRadius: '8px',
                          fontWeight: 600,
                          cursor: cooldownSeconds > 0 || isSubmitting ? 'not-allowed' : 'pointer',
                          opacity: cooldownSeconds > 0 || isSubmitting ? 0.6 : 1,
                          border: 'none',
                          background: '#0284c7',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <i className="fa-solid fa-rotate-right"></i>{' '}
                        <span>{cooldownSeconds > 0 ? `Resend (${cooldownSeconds}s)` : 'Resend OTP'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="input-box" style={{ marginTop: '16px' }}>
                    <label>6-Digit Reset Code (OTP)</label>
                    <div className="input-field">
                      <i className="fa-solid fa-key"></i>
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        required
                        style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '4px', textAlign: 'center' }}
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="login-btn" style={{ marginTop: '10px' }}>
                    {isSubmitting ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i> Verifying...
                      </>
                    ) : (
                      <>
                        Verify OTP Code <i className="fa-solid fa-check-circle"></i>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 3: NEW PASSWORD */}
              {step === 3 && (
                <form onSubmit={handleResetPassword}>
                  <div className="input-box">
                    <label>New Password</label>
                    <div className="input-field" style={{ position: 'relative' }}>
                      <i className="fa-solid fa-lock"></i>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        required
                        style={{ paddingRight: '40px' }}
                      />
                      <i
                        className={`fa-solid ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '15px' }}
                      ></i>
                    </div>
                  </div>

                  <div className="input-box">
                    <label>Confirm New Password</label>
                    <div className="input-field" style={{ position: 'relative' }}>
                      <i className="fa-solid fa-lock"></i>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                        style={{ paddingRight: '40px' }}
                      />
                      <i
                        className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '15px' }}
                      ></i>
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="login-btn" style={{ marginTop: '10px', background: '#059669' }}>
                    {isSubmitting ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i> Resetting Password...
                      </>
                    ) : (
                      <>
                        Reset Password & Save <i className="fa-solid fa-shield-check"></i>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 4: SUCCESS & LOGIN LINK */}
              {step === 4 && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 16px auto' }}>
                    <i className="fa-solid fa-check"></i>
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>
                    Password Reset Successfully!
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                    Your password has been updated in our system. You can now sign in using your new credentials.
                  </p>
                  <Link to="/login" className="login-btn" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                    Return to Sign In Page <i className="fa-solid fa-arrow-right"></i>
                  </Link>
                </div>
              )}

              <div className="divider" style={{ margin: '20px 0 14px 0' }}>
                <span>OR</span>
              </div>

              <p className="signup-text" style={{ textAlign: 'center' }}>
                Remember your password? <Link to="/login">Return to Login</Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
