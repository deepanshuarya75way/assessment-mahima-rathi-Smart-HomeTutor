import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import deviceId  from '../utils/deviceId';

export const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  useEffect(() => {
    // Read query params for error or message
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');
    const unverifiedParam = searchParams.get('unverifiedEmail');

    if (errorParam) setErrorMessage(errorParam);
    if (messageParam) setInfoMessage(messageParam);
    if (unverifiedParam) setUnverifiedEmail(unverifiedParam);

    if (errorParam || messageParam || unverifiedParam) {
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete('error');
      newParams.delete('message');
      newParams.delete('unverifiedEmail');
      const newSearch = newParams.toString();
      const cleanUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }

    // Scroll reveal observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lg-revealed');
          }
        });
      },
      { threshold: 0.15 }
    );

    const elements = document.querySelectorAll('.lg-reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setUnverifiedEmail('');

    if (!role) {
      setErrorMessage('Please select your account panel role.');
      return;
    }
    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    let deviceId = localStorage.getItem("deviceId");

      if(!deviceId){
        deviceId=crypto.randomUUID();
        localStorage.setItem("deviceId",deviceId);
      }
      console.log("Login",deviceId);
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
          role,
          remember,
          deviceId :deviceId(),
        }),
      });

      const data = await response.json();
    if(response.status ==409){
      const switchDevice = window.confirm(
        '${data.activeDevice?.deviceName || "Another Device" } is currently active.\n\n Do you want to switch?'
      );
      if(switchDevice && data.currentDevice?.id){
        try{
          const switchResponse = await fetch("/api/devices/switch",{
            method:"POST",
            headers:{
              "Content-Type": "application/json"
            },
            credentials:"include",
            body:JSON.stringify({
              deviceId:data.currentDevice.id
            })
          });

          const switchData = await switchResponse.json();
          if(switchResponse.ok && switchData.success){
            window.location.replace('/dashboard/${role}');
            return ;
          }
          setErrorMessage(switchData.message|| "unable to switch device.");
        }catch(switchError){
          console.err("Device switch error:",switchError);
          setErrorMessage("unable to switch device.");
        }
        return;
      }
      return ;
    }
      if (response.ok && data.success) {
        window.location.replace(data.redirectUrl || `/dashboard/${role}`);
      } else {
        setErrorMessage(data.message || 'Login failed. Please check your credentials.');
        if (data.requiresVerification && data.email) {
          setUnverifiedEmail(data.email);
        }
      }
    } catch (err) {
      console.error('Login request error:', err);
      setErrorMessage('Server connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles = [
    { id: 'student', label: 'Student', icon: 'fa-user-graduate' },
    { id: 'tutor', label: 'Tutor', icon: 'fa-chalkboard-user' },
    { id: 'parent', label: 'Parent', icon: 'fa-users' },
  ];

  return (
    <div className="lg-page-root">
      <Header activePage="login" />

      <main className="lg-main-content">
        <section className="lg-login-section lg-reveal-on-scroll">
          <div className="lg-login-container">
            {/* LEFT SIDE BANNER */}
            <div className="lg-login-left">
              <span className="lg-tag">SECURE ROLE AUTHENTICATION</span>
              <h1>Access Your Dedicated Panel</h1>
              <p>
                Please select your designated role (Student, Tutor, or Parent) before logging in. Your panel access is authenticated based on your role.
              </p>

              <div className="lg-shield-box">
                <h4>
                  <i className="fa-solid fa-shield-halved"></i> Role-Based Access Control
                </h4>
                <ul>
                  <li>Select your role panel before entering credentials</li>
                  <li>Credentials are verified against your registered role</li>
                  <li>Automatic redirection to your role-specific dashboard</li>
                </ul>
              </div>
            </div>

            {/* RIGHT SIDE FORM */}
            <div className="lg-login-card">
              <h2>Sign In to Panel</h2>
              <p className="lg-subtitle">Select your account panel role below, then enter your credentials.</p>

              {/* ERROR ALERT */}
              {errorMessage && (
                <div className="lg-login-alert lg-login-alert-error">
                  <div className="lg-alert-row">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span>{errorMessage}</span>
                  </div>
                  {(unverifiedEmail || errorMessage.toLowerCase().includes('verify your email')) && (
                    <Link
                      to={`/verify-otp?email=${encodeURIComponent(unverifiedEmail || email)}`}
                      className="lg-verify-btn"
                    >
                      <i className="fa-solid fa-key"></i> Verify Email Now (Enter 6-Digit OTP)
                    </Link>
                  )}
                </div>
              )}

              {/* INFO ALERT */}
              {infoMessage && (
                <div className="lg-login-alert lg-login-alert-info">
                  <i className="fa-solid fa-circle-check"></i>
                  <span>{infoMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} id="loginForm">
                {/* 1. MANDATORY ROLE SELECTION */}
                <div className="lg-role-select-container">
                  <label className="lg-role-select-label">
                    <i className="fa-solid fa-id-badge"></i> 1. Choose Account Panel Role (Mandatory):
                  </label>
                  <div className="lg-role-select-grid">
                    {roles.map((r) => (
                      <label key={r.id} className="lg-role-option-card">
                        <input
                          type="radio"
                          name="role"
                          value={r.id}
                          checked={role === r.id}
                          onChange={() => setRole(r.id)}
                          required
                        />
                        <div className="lg-role-card-content">
                          <i className={`fa-solid ${r.icon}`}></i>
                          <span>{r.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 2. EMAIL ADDRESS */}
                <div className="lg-input-box">
                  <label>2. Email Address</label>
                  <div className="lg-input-field">
                    <i className="fa-solid fa-envelope"></i>
                    <input
                      type="email"
                      name="email"
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* 3. PASSWORD */}
                <div className="lg-input-box">
                  <label>3. Password</label>
                  <div className="lg-input-field" style={{ position: 'relative' }}>
                    <i className="fa-solid fa-lock"></i>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
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
                    <span>Remember Me</span>
                  </label>
                  <Link to="/forgot-password">Forgot Password?</Link>
                </div>

                <button type="submit" className="lg-login-btn" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span>
                      <i className="fa-solid fa-spinner fa-spin"></i> Authenticating...
                    </span>
                  ) : (
                    <span>
                      Sign In to Selected Panel <i className="fa-solid fa-arrow-right"></i>
                    </span>
                  )}
                </button>

                <div className="lg-divider">
                  <span>OR</span>
                </div>

                <p className="lg-signup-text">
                  Don't have an account?{' '}
                  <Link to={`/signup?role=${role}`} state={{ selectedRole: role }}>
                    Sign Up
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
