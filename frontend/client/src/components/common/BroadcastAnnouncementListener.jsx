import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const BroadcastAnnouncementListener = () => {
  const { userId, userRole } = useAuth();
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    if (!userId || typeof window === 'undefined' || !window.io) return;

    const socket = window.socket || window.io();
    window.socket = socket;

    // Join Socket.IO user ID & role rooms
    socket.emit('join', { userId, role: userRole });

    const handleAnnouncement = (data) => {
      if (!data || !data.title || !data.message) return;

      const target = (data.targetRole || 'all').toLowerCase();
      const currentRole = (userRole || '').toLowerCase();

      // Ensure target audience match
      if (target === 'all' || target === currentRole || currentRole === 'admin') {
        setAnnouncement({
          title: data.title,
          message: data.message,
          targetRole: data.targetRole,
          id: data._id || Date.now(),
        });
      }
    };

    socket.on('receiveAnnouncement', handleAnnouncement);

    return () => {
      socket.off('receiveAnnouncement', handleAnnouncement);
    };
  }, [userId, userRole]);

  if (!announcement) return null;

  const dismiss = () => setAnnouncement(null);

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        maxWidth: '440px',
        width: 'calc(100% - 40px)',
        maxHeight: 'calc(100vh - 40px)',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        border: '1px solid #fed7aa',
        borderLeft: '5px solid #f59e0b',
        borderRadius: '14px',
        padding: '16px 20px',
        boxShadow: '0 12px 28px -4px rgba(15, 42, 74, 0.2)',
        animation: 'slideInDown 0.3s ease-out forwards',
        color: '#0f2a4a',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <i className="fa-solid fa-bullhorn" style={{ color: '#d97706', fontSize: '16px', flexShrink: 0 }}></i>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f2a4a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            {announcement.title}
          </h4>
        </div>
        <button
          onClick={dismiss}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
            flexShrink: 0,
          }}
          title="Dismiss Announcement"
        >
          &times;
        </button>
      </div>

      <div
        className="announcement-content-body"
        style={{
          height: 'auto',
          maxHeight: 'none',
          overflow: 'visible',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          fontSize: '13.5px',
          color: '#334155',
          lineHeight: '1.6',
          margin: '0 0 12px 0',
        }}
      >
        {announcement.message}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: '800',
            textTransform: 'uppercase',
            background: '#fef3c7',
            color: '#b45309',
            padding: '3px 8px',
            borderRadius: '12px',
          }}
        >
          Announcement ({announcement.targetRole || 'All Users'})
        </span>

        <button
          type="button"
          onClick={dismiss}
          style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '6px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: '700',
            color: '#475569',
            cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
};
