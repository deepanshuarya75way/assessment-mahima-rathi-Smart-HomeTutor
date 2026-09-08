import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export const AdminSidebar = ({
  activeTab,
  onSelectTab,
  adminName,
  adminEmail,
  onOpenAnnouncement,
  onOpenSecurityCenter,
  isOpenMobile,
  onCloseMobile,
}) => {
  const auth = useAuth();
  const isSuper = Boolean(auth.isSuperAdmin || (auth.userEmail === 'useradmin2005@gmail.com'));
  const isFull = isSuper || Boolean(auth.fullAccess);
  const userPerms = Array.isArray(auth.permissions) ? auth.permissions : [];
  const roleBadgeText = auth.adminRoleName || (isSuper ? 'Super Admin' : (isFull ? 'Admin Staff (Full)' : 'Admin Staff'));

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/admin/notifications/unread-count');
        const data = await res.json();
        if (data.success) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Unread count fetch error:', err);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);

    const handleCustomEvent = (e) => {
      if (e.detail && typeof e.detail.unreadCount === 'number') {
        if (!e.detail.role || e.detail.role === 'admin') {
          setUnreadCount(e.detail.unreadCount);
          return;
        }
      }
      fetchUnreadCount();
    };

    window.addEventListener('unreadCountUpdated', handleCustomEvent);
    window.addEventListener('refreshNotifications', fetchUnreadCount);

    if (window.socket) {
      window.socket.on('receiveNotification', fetchUnreadCount);
      window.socket.on('receiveAdminNotification', fetchUnreadCount);
      window.socket.on('unreadCountChanged', fetchUnreadCount);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('unreadCountUpdated', handleCustomEvent);
      window.removeEventListener('refreshNotifications', fetchUnreadCount);
      if (window.socket) {
        window.socket.off('receiveNotification', fetchUnreadCount);
        window.socket.off('receiveAdminNotification', fetchUnreadCount);
        window.socket.off('unreadCountChanged', fetchUnreadCount);
      }
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return 'AD';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSelectTab = (id) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const allNavItems = [
    { id: 'overview', label: 'Overview & Metrics', icon: 'fa-gauge', permKey: 'overview.view' },
    { id: 'demo-requests', label: 'Demo Class Requests', icon: 'fa-calendar-check', permKey: 'demo-requests.manage' },
    { id: 'notifications', label: 'Notifications', icon: 'fa-bell', badge: unreadCount, permKey: 'notifications.manage' },
    { id: 'users', label: 'User Directory', icon: 'fa-users-gear', permKey: 'users.manage' },
    { id: 'tutor-verifications', label: 'Tutor Verifications', icon: 'fa-shield-check', permKey: 'tutor-verifications.manage' },
    { id: 'certificates', label: 'Certificate Approvals', icon: 'fa-award', permKey: 'certificates.manage' },
    { id: 'finance', label: 'Finance & Revenue', icon: 'fa-sack-dollar', permKey: 'finance.view' },
    { id: 'payment-history', label: 'Payment History', icon: 'fa-clock-rotate-left', permKey: 'payment-history.view' },
    { id: 'catalog', label: 'Catalog & Boards', icon: 'fa-layer-group', permKey: 'catalog.manage' },
    { id: 'disputes', label: 'Disputes & Complaints', icon: 'fa-scale-balanced', permKey: 'disputes.manage' },
    { id: 'newsletter', label: 'Newsletter Subscribers', icon: 'fa-envelope-open-text', permKey: 'newsletter.manage' },
    { id: 'blogs', label: 'Blog Articles', icon: 'fa-newspaper', permKey: 'blogs.view' },
    { id: 'manage-access', label: 'Manage Access', icon: 'fa-user-lock', permKey: 'manageAccess' },
  ];

  const visibleNavItems = allNavItems.filter((item) => {
    if (item.id === 'manage-access') return isSuper;
    if (isSuper) return true;
    if (isFull) return true;
    if (item.id === 'blogs') {
      return userPerms.includes('blogs.view') || userPerms.includes('blogs') || userPerms.includes('blog-articles');
    }
    return userPerms.includes(item.permKey);
  });

  return (
    <aside className={`dashboard-sidebar ${isOpenMobile ? 'mobile-open' : ''}`}>
      {onCloseMobile && (
        <button
          type="button"
          className="mobile-sidebar-close-btn"
          onClick={onCloseMobile}
          aria-label="Close Admin Management Menu"
          title="Close Menu"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      )}
      <div>
        <div className="sidebar-user">
          <div className="user-avatar" style={{ background: '#b45309' }}>
            {getInitials(adminName)}
          </div>
          <div className="user-info">
            <h4 title={adminName || 'System Administrator'}>{adminName || 'System Administrator'}</h4>
            <p title={adminEmail || 'admin@hometutor.com'}>{adminEmail || 'admin@hometutor.com'}</p>
            <span className="role-badge badge-admin">{roleBadgeText}</span>
          </div>
        </div>

        <div className="sidebar-menu-title">Admin Management</div>
        <ul className="sidebar-menu">
          {visibleNavItems.map((item) => (
            <li
              key={item.id}
              className={`dash-tab-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleSelectTab(item.id)}
              style={{ cursor: 'pointer' }}
            >
              <a href={`#${item.id}`} onClick={(e) => e.preventDefault()} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span><i className={`fa-solid ${item.icon}`}></i> {item.label}</span>
                {item.badge > 0 ? (
                  <span style={{ background: '#ef4444', color: '#ffffff', borderRadius: '10px', padding: '1px 8px', fontSize: '11px', fontWeight: '800' }}>
                    {item.badge}
                  </span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>

        {isSuper && (
          <>
            <div className="sidebar-menu-title" style={{ marginTop: '24px' }}>Security & Broadcasts</div>
            <ul className="sidebar-menu">
              <li>
                <a href="#announcements" onClick={(e) => { e.preventDefault(); onOpenAnnouncement(); if (onCloseMobile) onCloseMobile(); }}>
                  <i className="fa-solid fa-bullhorn"></i> Send Announcement
                </a>
              </li>
              <li>
                <a href="#security" onClick={(e) => { e.preventDefault(); onOpenSecurityCenter(); if (onCloseMobile) onCloseMobile(); }}>
                  <i className="fa-solid fa-shield-halved"></i> Security Center
                </a>
              </li>
            </ul>
          </>
        )}
      </div>

      <div className="sidebar-role-switch">
        <a
          href="/logout"
          onClick={(e) => {
            e.preventDefault();
            localStorage.removeItem('admin_activeTab');
            window.location.href = '/logout';
          }}
          className="dash-btn dash-btn-outline"
          style={{ width: '100%', justifyContent: 'center', color: '#dc2626', borderColor: '#fca5a5', background: '#fee2e2' }}
        >
          <i className="fa-solid fa-right-from-bracket"></i> Sign Out of Admin Panel
        </a>
      </div>
    </aside>
  );
};
