import React from 'react';

export const TutorHeaderBar = ({ onRequestPayout, onRequestCertificate, onEditProfile, isApproved = true, onToggleMobileMenu }) => {
  return (
    <div className="dashboard-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', width: '100%', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px', minWidth: 0 }}>
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={onToggleMobileMenu}
          aria-label="Open Tutor Workspace Menu"
          title="Open Tutor Workspace Menu"
        >
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="dashboard-title">
          <h1>Educator Control Panel</h1>
          <p>Manage your teaching schedule, accept booking requests, review student attendance, and request payouts.</p>
        </div>
      </div>
      <div className="dashboard-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto', flexShrink: 0 }}>
        <button
          type="button"
          className="dash-btn dash-btn-outline"
          onClick={onEditProfile}
          title="Edit your subjects, rates, qualifications, and profile details"
        >
          <i className="fa-solid fa-user-pen"></i> Edit Profile
        </button>
        <button
          type="button"
          className="dash-btn dash-btn-primary"
          onClick={isApproved ? onRequestCertificate : undefined}
          disabled={!isApproved}
          style={!isApproved ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          title={!isApproved ? "Tutor approval is required to request certificates" : ""}
        >
          <i className="fa-solid fa-award"></i> Request Certificate
        </button>
        <button
          type="button"
          className="dash-btn dash-btn-accent"
          onClick={isApproved ? onRequestPayout : undefined}
          disabled={!isApproved}
          style={!isApproved ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          title={!isApproved ? "Tutor approval is required to request payouts" : ""}
        >
          <i className="fa-solid fa-hand-holding-dollar"></i> Request Payout
        </button>
      </div>
    </div>
  );
};
