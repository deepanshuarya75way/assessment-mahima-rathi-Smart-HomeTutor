import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  const [email, setEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: data.message });
        setEmail('');
      } else {
        setStatusMsg({ type: 'error', text: (data.message || 'Subscription failed.') });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Subscription error. Please try again.' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  return (
    <footer className="footer">
      <div className="container footer-container">
        {/* Logo + Brand */}
        <div className="footer-box">
          <h2 className="footer-logo">
            <Link to="/" className="brand-logo-link">
              <img src="/images/logo.png" alt="Smart HomeTutor Logo" className="site-logo-img" />
              <div className="brand-text-stack">
                <span className="brand-smart">Smart</span>
                <span className="brand-hometutor" style={{ color: '#ffffff' }}>HomeTutor</span>
              </div>
            </Link>
          </h2>
          <p>
            Connecting expert tutors with students to build a brighter academic future through personalized, safe, and effective learning.
          </p>
          <div className="social-icons">
            <a href="https://www.instagram.com/smarthome_tutor?igsh=MWMwYnRrbnZjdjlnNw==" aria-label="Instagram"  rel="noopener noreferrer">
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61592827381793" aria-label="Facebook"  rel="noopener noreferrer">
              <i className="fa-brands fa-facebook-f"></i>
            </a>
            <a href="https://www.linkedin.com/company/143232958/admin/dashboard/" aria-label="LinkedIn"  rel="noopener noreferrer">
              <i className="fa-brands fa-linkedin-in"></i>
            </a>
            <a href="https://www.youtube.com/@smarthomeTutor-f9k" aria-label="YouTube"  rel="noopener noreferrer">
              <i className="fa-brands fa-youtube"></i>
            </a>
          </div>
        </div>

        {/* Company Links */}
        <div className="footer-box">
          <h3>Company</h3>
          <ul>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/blogs">Blogs</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/privacy-policy">Privacy Policy</Link></li>
            <li><Link to="/terms-of-service">Terms of Service</Link></li>
          </ul>
        </div>

        {/* Subject Links */}
        <div className="footer-box">
          <h3>Subjects</h3>
          <ul>
            <li><Link to="/subjects/mathematics">Mathematics</Link></li>
            <li><Link to="/subjects/science">Science</Link></li>
            <li><Link to="/subjects/languages">Languages</Link></li>
            <li><Link to="/subjects/test-prep">Test Prep</Link></li>
          </ul>
        </div>

        {/* Newsletter Box */}
        <div className="footer-box">
          <h3>Newsletter</h3>
          <p>Stay updated with the latest study tips and educational news.</p>
          <form className="newsletter" onSubmit={handleNewsletterSubmit}>
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
          {statusMsg && (
            <div
              style={{
                marginTop: '10px',
                fontSize: '13px',
                color: statusMsg.type === 'success' ? '#10b981' : '#f87171',
                fontWeight: 600,
              }}
            >
              {statusMsg.text}
            </div>
          )}
        </div>
      </div>

      <hr />
      <div className="copyright">
        © 2026 Smart HomeTutor. All rights reserved.
      </div>
    </footer>
  );
};
