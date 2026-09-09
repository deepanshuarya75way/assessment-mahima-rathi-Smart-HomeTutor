import React from 'react';
import { FaVideo, FaGraduationCap, FaCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';

export const VideoHeader = ({
  subject = 'Online Tutoring Session',
  statusState = 'connecting',
  statusText = 'Connecting...',
  callTimerText = '00:00',
}) => {
  return (
    <header className="call-header">
      <div className="call-title-area">
        <div className="call-logo">
          <FaVideo style={{ marginRight: '6px' }} /> HomeTutor Classroom
        </div>
        <span className="class-badge">
          <FaGraduationCap style={{ marginRight: '6px' }} /> {subject}
        </span>
      </div>

      <div className="peer-info">
        <span className={`status-badge ${statusState}`}>
          {statusState === 'connected' ? (
            <FaCircle style={{ fontSize: '9px', color: '#34d399', marginRight: '6px' }} />
          ) : statusState === 'disconnected' ? (
            <FaExclamationTriangle style={{ marginRight: '6px' }} />
          ) : (
            <FaSpinner style={{ animation: 'spin 1s linear infinite', marginRight: '6px' }} />
          )}
          {' '}{statusText}
        </span>
        <span className="call-timer">{callTimerText}</span>
      </div>
    </header>
  );
};

