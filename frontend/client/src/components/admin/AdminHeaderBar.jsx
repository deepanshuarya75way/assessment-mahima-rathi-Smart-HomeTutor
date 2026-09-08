import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const AdminHeaderBar = ({ onOpenAnnouncement, onExportPdf, onOpenScheduleClass, onToggleMobileMenu }) => {
  const auth = useAuth();
  const isSuper = Boolean(auth?.isSuperAdmin || (auth?.userEmail === 'useradmin2005@gmail.com'));
  const isFull = isSuper || Boolean(auth?.fullAccess);
  const userPerms = Array.isArray(auth?.permissions) ? auth.permissions : [];

  const canBroadcast = isSuper || isFull || userPerms.includes('notifications.manage');
  const canExport = isSuper || isFull || userPerms.includes('overview.view');

  return (
    <div className="dashboard-header-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={onToggleMobileMenu}
          aria-label="Open Admin Management Menu"
          title="Open Admin Management Menu"
        >
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="dashboard-title">
          <h1>Platform Control & Governance</h1>
          <p>Monitor platform statistics, verify tutor applications, manage users, and review financial metrics.</p>
        </div>
      </div>
      <div className="dashboard-actions">
        {isSuper && (
          <button className="dash-btn dash-btn-outline" onClick={onOpenScheduleClass}>
            <i className="fa-solid fa-calendar-plus"></i> Schedule Class
          </button>
        )}
        {canBroadcast && (
          <button className="dash-btn dash-btn-primary" style={{ background: '#b45309' }} onClick={onOpenAnnouncement}>
            <i className="fa-solid fa-paper-plane"></i> Broadcast Notification
          </button>
        )}
        {canExport && (
          <button className="dash-btn dash-btn-accent" onClick={onExportPdf}>
            <i className="fa-solid fa-file-export"></i> Export Report
          </button>
        )}
      </div>
    </div>
  );
};
