import React from 'react';
import { Link } from 'react-router-dom';

export const AboutCTA = () => {
  return (
    <section style={{ background: 'var(--primary)', color: '#ffffff', padding: '70px 20px', textAlign: 'center' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase' }}>
          Ready to Find Your Ideal Tutor?
        </h2>
        <p style={{ color: 'var(--primary-light)', fontSize: '16px', marginTop: '12px' }}>
          Browse top-rated tutors near you or submit a custom tutor requirement in under 2 minutes.
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '28px' }}>
          <Link to="/find" className="signup" style={{ padding: '12px 28px', fontSize: '14px' }}>
            Find Tutors Now
          </Link>
          <Link to="/tutor" className="login" style={{ background: '#ffffff', color: 'var(--primary)', padding: '12px 28px', fontSize: '14px' }}>
            Become a Tutor
          </Link>
        </div>
      </div>
    </section>
  );
};
