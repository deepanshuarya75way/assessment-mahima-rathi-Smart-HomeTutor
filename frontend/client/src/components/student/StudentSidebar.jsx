import React from 'react';

export const StudentSidebar = ({ activeTab, onSelectTab, studentUser, onOpenCertificates, unreadCount = 0, isOpenMobile, onCloseMobile }) => {
  const userName = studentUser ? studentUser.name || 'Student Account' : 'Student Account';
  const userEmail = studentUser ? studentUser.email || 'student@smart-hometutor.com' : 'student@smart-hometutor.com';
  const initials = userName.substring(0, 2).toUpperCase();

  const handleSelectTab = (key) => {
    onSelectTab(key);
    if (onCloseMobile) onCloseMobile();
  };

  const menuItems = [
    { key: 'overview', label: 'Overview & Progress', icon: 'fa-house' },
    { key: 'my-tutors', label: 'My Tutors', icon: 'fa-user-graduate' },
    { key: 'notifications', label: 'Notifications', icon: 'fa-bell', badge: unreadCount },
    { key: 'search-tutors', label: 'Find & Book Tutors', icon: 'fa-magnifying-glass' },
    { key: 'schedule', label: 'Scheduled Classes', icon: 'fa-calendar-days' },
    { key: 'learning', label: 'Homework & Notes', icon: 'fa-book-open-reader' },
    { key: 'chat', label: 'Messages', icon: 'fa-comments' },
    { key: 'payments', label: 'Smart Wallet & Billing', icon: 'fa-wallet' },
    { key: 'complaints', label: 'Help Desk & Complaints', icon: 'fa-circle-exclamation' },
    { key: 'settings', label: 'Settings', icon: 'fa-gear' },
  ];

  return (
    <aside className={`dashboard-sidebar ${isOpenMobile ? 'mobile-open' : ''}`}>
      {onCloseMobile && (
        <button
          type="button"
          className="mobile-sidebar-close-btn"
          onClick={onCloseMobile}
          aria-label="Close Student Hub Menu"
          title="Close Menu"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      )}
      <div>
        <div className="sidebar-user">
          <div className="user-avatar" style={{ background: '#0284c7' }}>{initials}</div>
          <div className="user-info">
            <h4 title={userName}>{userName}</h4>
            <p title={userEmail}>{userEmail}</p>
            <span className="role-badge badge-student">Student</span>
          </div>
        </div>

        <div className="sidebar-menu-title">Student Hub</div>
        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li
              key={item.key}
              className={`dash-tab-btn ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => handleSelectTab(item.key)}
            >
              <a href="#" onClick={(e) => e.preventDefault()} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span><i className={`fa-solid ${item.icon}`}></i> {item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span style={{ background: '#ef4444', color: '#ffffff', fontSize: '11px', fontWeight: '800', padding: '2px 7px', borderRadius: '10px' }}>
                    {item.badge}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>

        <div className="sidebar-menu-title" style={{ marginTop: '24px' }}>Support & Certificates</div>
        <ul className="sidebar-menu">
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); onOpenCertificates(); if (onCloseMobile) onCloseMobile(); }}>
              <i className="fa-solid fa-award"></i> Certificate Download
            </a>
          </li>
          <li>
            <a href="/contact" onClick={() => { if (onCloseMobile) onCloseMobile(); }}>
              <i className="fa-solid fa-circle-question"></i> Help Support
            </a>
          </li>
        </ul>
      </div>

      <div className="sidebar-role-switch">
        <a
          href="/logout"
          className="dash-btn dash-btn-outline"
          style={{ width: '100%', justifyContent: 'center', color: '#dc2626', borderColor: '#fca5a5', background: '#fee2e2' }}
        >
          <i className="fa-solid fa-right-from-bracket"></i> Sign Out of Student Panel
        </a>
      </div>
    </aside>
  );
};
