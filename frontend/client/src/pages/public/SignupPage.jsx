import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';

export const SignupPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const passedRole = location.state?.selectedRole || searchParams.get('role');
  const initialRole = passedRole && ['student', 'tutor', 'parent'].includes(passedRole.toLowerCase())
    ? passedRole.toLowerCase()
    : 'student';

  const [role, setRole] = useState(initialRole);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Read passed role if available (excluding admin)
    const roleFromNav = location.state?.selectedRole || searchParams.get('role');
    if (roleFromNav && ['student', 'tutor', 'parent'].includes(roleFromNav.toLowerCase())) {
      setRole(roleFromNav.toLowerCase());
    }

    // Read query params for error or referral code
    const errorParam = searchParams.get('error');
    const refParam = searchParams.get('ref');

    if (errorParam) setErrorMessage(errorParam);
    if (refParam) setReferralCode(refParam.trim().toUpperCase());

    if (errorParam) {
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete('error');
      const newSearch = newParams.toString();
      const cleanUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }

    // Scroll reveal observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('su-revealed');
          }
        });
      },
      { threshold: 0.15 }
    );

    const elements = document.querySelectorAll('.su-reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!agreedTerms) {
      setErrorMessage('You must agree to the Terms & Conditions to register.');
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      setErrorMessage('Mobile number must contain exactly 10 digits.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          role,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`,
          email: email.trim(),
          phone: phone.trim(),
          password,
          referralCode: referralCode.trim().toUpperCase(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        navigate(`/verify-otp?email=${encodeURIComponent(email.trim())}&message=${encodeURIComponent(data.message || '')}`);
      } else {
        setErrorMessage(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
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
    <div className="su-page-root">
      <Header activePage="signup" />

      <main className="su-main-content">
        <section className="su-signup-section su-reveal-on-scroll">
          <div className="su-signup-container">
            {/* LEFT SIDE BANNER */}
            <div className="su-signup-left">
              <span className="su-tag">JOIN SMART HOMETUTOR</span>
              <h1>Create Your Learning Account</h1>
              <p>
                Join thousands of students, tutors, parents, and administrators on Smart HomeTutor. Select your assigned account role below and start your journey today.
              </p>

              <div className="su-perks-box">
                <h4>
                  <i className="fa-solid fa-star"></i> Why Join Us?
                </h4>
                <ul>
                  <li>Verified 1-on-1 expert tutors & personalized learning</li>
                  <li>Flexible schedules & interactive progress tracking</li>
                  <li>Welcome referral bonus upon successful verification</li>
                </ul>
              </div>
            </div>

            {/* RIGHT SIDE FORM */}
            <div className="su-signup-card">
              <h2>Create Account</h2>
              <p className="su-subtitle">Please select your account panel role and fill in your details to register.</p>

              {/* ERROR ALERT */}
              {errorMessage && (
                <div className="su-alert su-alert-error">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} id="signupForm">
                {/* ROLE SELECTION */}
                <div className="su-role-select-container">
                  <label className="su-role-select-label">
                    <i className="fa-solid fa-id-badge"></i> Select Your Account Panel Role:
                  </label>
                  <div className="su-role-select-grid">
                    {roles.map((r) => (
                      <label key={r.id} className="su-role-option-card">
                        <input
                          type="radio"
                          name="role"
                          value={r.id}
                          checked={role === r.id}
                          onChange={() => setRole(r.id)}
                          required
                        />
                        <div className="su-role-card-content">
                          <i className={`fa-solid ${r.icon}`}></i>
                          <span>{r.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* NAME FIELDS ROW */}
                <div className="su-row">
                  <div className="su-input-box">
                    <label>First Name</label>
                    <div className="su-input-field">
                      <i className="fa-solid fa-user"></i>
                      <input
                        type="text"
                        name="firstName"
                        placeholder="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="su-input-box">
                    <label>Last Name</label>
                    <div className="su-input-field">
                      <i className="fa-solid fa-user"></i>
                      <input
                        type="text"
                        name="lastName"
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* EMAIL ADDRESS */}
                <div className="su-input-box">
                  <label>Email Address</label>
                  <div className="su-input-field">
                    <i className="fa-solid fa-envelope"></i>
                    <input
                      type="email"
                      name="email"
                      placeholder="Enter Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* PHONE NUMBER */}
                <div className="su-input-box">
                  <label>Phone Number</label>
                  <div className="su-input-field">
                    <i className="fa-solid fa-phone"></i>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div className="su-input-box">
                  <label>Password</label>
                  <div className="su-input-field" style={{ position: 'relative' }}>
                    <i className="fa-solid fa-lock"></i>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Create Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{ paddingRight: '40px' }}
                    />
                    <i
                      className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} su-toggle-password`}
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    ></i>
                  </div>
                </div>

                {/* REFERRAL CODE (OPTIONAL) */}
                <div className="su-input-box">
                  <label>Referral Code (Optional)</label>
                  <div className="su-input-field">
                    <i className="fa-solid fa-gift" style={{ color: '#10b981' }}></i>
                    <input
                      type="text"
                      name="referralCode"
                      placeholder="Enter Referral Code (e.g. REF-ABC123)"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                </div>

                {/* TERMS CHECKBOX */}
                <div className="su-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      required
                    />
                    <span>
                      I agree to the <a href="#">Terms & Conditions</a>
                    </span>
                  </label>
                </div>

                <button type="submit" className="su-signup-btn" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span>
                      <i className="fa-solid fa-spinner fa-spin"></i> Registering Account...
                    </span>
                  ) : (
                    <span>
                      Create Account & Go to Verification <i className="fa-solid fa-arrow-right"></i>
                    </span>
                  )}
                </button>

                <div className="su-divider">
                  <span>OR</span>
                </div>

                <p className="su-login-text">
                  Already have an account? <Link to="/login">Login</Link>
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
