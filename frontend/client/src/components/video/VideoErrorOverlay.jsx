import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

export const VideoErrorOverlay = ({ isOpen, title, message, userRole = 'student', onReturn }) => {
  if (!isOpen) return null;

  const dashboardPath = `/dashboard/${userRole ? userRole.toLowerCase() : 'student'}`;

  return (
    <div className="error-overlay" style={{ display: 'flex' }}>
      <div className="error-card">
        <FaExclamationTriangle style={{ fontSize: '48px', color: '#ef4444', marginBottom: '16px' }} />
        <h3>{title || 'Connection Error'}</h3>
        <p>{message || 'Unable to access media devices or establish WebRTC peer connection.'}</p>
        <button
          type="button"
          onClick={onReturn || (() => { window.location.href = dashboardPath; })}
          className="btn-return"
          style={{ border: 'none', cursor: 'pointer' }}
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

