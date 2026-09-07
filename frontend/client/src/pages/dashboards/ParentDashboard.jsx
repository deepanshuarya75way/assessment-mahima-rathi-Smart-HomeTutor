import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ParentSidebar } from '../../components/dashboard/parent/ParentSidebar';
import { ParentStats } from '../../components/dashboard/parent/ParentStats';
import { LinkedChildren } from '../../components/dashboard/parent/LinkedChildren';
import { ChildSubjectProgress } from '../../components/dashboard/parent/ChildSubjectProgress';
import { ParentInvoices } from '../../components/dashboard/parent/ParentInvoices';
import { ParentNotificationsTab } from '../../components/dashboard/parent/ParentNotificationsTab';
import { ParentChatTab } from '../../components/dashboard/parent/ParentChatTab';
import { UserComplaintsTab } from '../../components/common/UserComplaintsTab';
import { AddChildModal } from '../../components/dashboard/parent/AddChildModal';
import { ParentCertificatesModal } from '../../components/dashboard/parent/ParentCertificatesModal';

import { useDashboardTab } from '../../hooks/useDashboardTab';

const PARENT_VALID_TABS = [
  'overview',
  'notifications',
  'search-tutors',
  'invoices',
  'chat',
  'complaints',
];

export const ParentDashboard = () => {
  const navigate = useNavigate();
  const { isAuth, userRole, userName, userEmail } = useAuth();

  // Navigation Tabs State ('overview' | 'notifications' | 'search-tutors' | 'invoices' | 'chat')
  const [activeTab, setActiveTab] = useDashboardTab('parent_activeTab', 'overview', PARENT_VALID_TABS);

  // Modals State
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [isCertificatesOpen, setIsCertificatesOpen] = useState(false);

  // Dynamic Dashboard Data State
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState({});
  const [children, setChildren] = useState([]);
  const [subjectProgress, setSubjectProgress] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [assignedTutors, setAssignedTutors] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Guard / Auth check
  useEffect(() => {
    window.scrollTo(0, 0);

    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    const messageParam = params.get('message');
    if (errorParam || messageParam) {
      const msg = errorParam || messageParam;
      if (window.showCustomAlert) {
        window.showCustomAlert(msg, errorParam ? 'Access Denied' : 'Notification', errorParam ? 'error' : 'info');
      }
      params.delete('error');
      params.delete('message');
      const newSearch = params.toString();
      const cleanUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications/unread-count');
      const data = await res.json();
      if (data.success) {
        setUnreadNotificationsCount(data.count || 0);
      }
    } catch (err) {
      console.error('Fetch parent unread count error:', err);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchUnreadCount();

    const handleCustomEvent = (e) => {
      if (e.detail && typeof e.detail.unreadCount === 'number') {
        setUnreadNotificationsCount(e.detail.unreadCount);
        return;
      }
      fetchUnreadCount();
    };

    window.addEventListener('unreadCountUpdated', handleCustomEvent);
    window.addEventListener('refreshNotifications', fetchUnreadCount);

    if (window.socket) {
      window.socket.on('receiveNotification', fetchUnreadCount);
      window.socket.on('unreadCountChanged', (data) => {
        if (data && typeof data.unreadCount === 'number') {
          setUnreadNotificationsCount(data.unreadCount);
        } else {
          fetchUnreadCount();
        }
      });
    }

    return () => {
      window.removeEventListener('unreadCountUpdated', handleCustomEvent);
      window.removeEventListener('refreshNotifications', fetchUnreadCount);
      if (window.socket) {
        window.socket.off('receiveNotification', fetchUnreadCount);
        window.socket.off('unreadCountChanged');
      }
    };
  }, []);

  const fetchDashboardStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/parent/dashboard-stats');
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.stats) setStats(data.stats);
        if (Array.isArray(data.children)) setChildren(data.children);
        if (Array.isArray(data.subjectProgress)) setSubjectProgress(data.subjectProgress);
        if (Array.isArray(data.invoices)) setInvoices(data.invoices);
        if (Array.isArray(data.assignedTutors)) setAssignedTutors(data.assignedTutors);
      }
    } catch (err) {
      console.error('Fetch Parent Dashboard Stats Error:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSelectTab = (tabId) => {
    if (tabId === 'search-tutors') {
      navigate('/find');
      return;
    }
    setActiveTab(tabId);
  };

  const activeChildName = children.length > 0
    ? (children[0].name || (children[0].student ? children[0].student.name : 'Child Profile'))
    : 'No Linked Children';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="dashboard-wrapper">
      {/* MOBILE BACKDROP OVERLAY */}
      <div
        className={`sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

        {/* SIDEBAR */}
        <ParentSidebar
          userName={userName || 'Rajesh Sharma'}
          userEmail={userEmail || 'parent@hometutor.com'}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenAddChildModal={() => setIsAddChildOpen(true)}
          onOpenCertificatesModal={() => setIsCertificatesOpen(true)}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* MAIN DASHBOARD CONTENT */}
        <main className="dashboard-main">
          {/* HEADER BAR */}
          <div className="dashboard-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px', minWidth: 0 }}>
              <button
                type="button"
                className="mobile-hamburger-btn"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Open Parent Portal Menu"
                title="Open Menu"
              >
                <i className="fa-solid fa-bars"></i>
              </button>
              <div className="dashboard-title">
                <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f2a4a', margin: '0 0 4px 0' }}>
                  Parent Supervision & Guardian Portal
                </h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                  Track your children's academic performance, class attendance, tutor reports, and pay tuition fees.
                </p>
              </div>
            </div>
            <div className="dashboard-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto', flexShrink: 0 }}>
              <button
                type="button"
                className="dash-btn dash-btn-outline"
                onClick={() => setIsAddChildOpen(true)}
                title="Link a new student account to your parent portal"
                style={{ fontSize: '13px' }}
              >
                <i className="fa-solid fa-user-plus" style={{ color: '#7e22ce' }}></i> Add Child Profile
              </button>
              <button
                type="button"
                className="dash-btn dash-btn-primary"
                style={{ background: '#7e22ce', borderColor: '#7e22ce', fontSize: '13px' }}
                onClick={() => setIsCertificatesOpen(true)}
                title="View certificates earned by your linked children"
              >
                <i className="fa-solid fa-award"></i> View Certificates
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f3e8ff', padding: '6px 14px', borderRadius: '20px', border: '1px solid #d8b4fe' }}>
                <i className="fa-solid fa-child" style={{ color: '#7e22ce' }}></i>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#7e22ce' }} id="parentActiveChildDisplay">
                  {children.length > 0 ? `${children.length} Linked ${children.length === 1 ? 'Child' : 'Children'} (${activeChildName})` : 'No Linked Children'}
                </span>
              </div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="dash-tab-content" style={{ display: 'block' }}>
              {/* STATS GRID */}
              <ParentStats stats={stats} />

              <div className="dash-content-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '20px', marginTop: '24px' }}>
                <div>
                  {/* LINKED CHILDREN */}
                  <LinkedChildren
                    children={children}
                    loading={loadingStats}
                    onOpenAddChildModal={() => setIsAddChildOpen(true)}
                  />

                  {/* CHILD SUBJECT PROGRESS & ATTENDANCE */}
                  <ChildSubjectProgress subjectProgress={subjectProgress} />
                </div>

                <div>
                  {/* TUTOR FEEDBACK & REVIEWS CARD */}
                  <div className="dash-card">
                    <div className="dash-card-header">
                      <h3>
                        <i className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i> Submit Feedback for Tutor
                      </h3>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                      Submit feedback and ratings for your children's assigned educators.
                    </p>
                    <button
                      className="dash-btn dash-btn-primary"
                      style={{ background: '#7e22ce', width: '100%', justifyContent: 'center' }}
                      onClick={() => setActiveTab('chat')}
                    >
                      <i className="fa-solid fa-comment-medical"></i> Contact & Review Educator
                    </button>
                  </div>

                  {/* QUICK FAMILY CONTROLS */}
                  <div className="dash-card" style={{ marginTop: '20px' }}>
                    <div className="dash-card-header">
                      <h3>
                        <i className="fa-solid fa-shield-halved" style={{ color: '#7e22ce' }}></i> Family Guardian Controls
                      </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                      <button
                        className="dash-btn dash-btn-outline"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => setIsAddChildOpen(true)}
                      >
                        <i className="fa-solid fa-user-plus" style={{ color: '#7e22ce' }}></i> Link New Child Account
                      </button>
                      <button
                        className="dash-btn dash-btn-outline"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => setIsCertificatesOpen(true)}
                      >
                        <i className="fa-solid fa-award" style={{ color: '#7e22ce' }}></i> View Academic Certificates
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="dash-tab-content" style={{ display: 'block', marginTop: '24px' }}>
              <ParentNotificationsTab onUnreadChange={(cnt) => setUnreadNotificationsCount(cnt)} onSelectTab={setActiveTab} />
            </div>
          )}

          {/* TAB 3: INVOICES & BILLING */}
          {activeTab === 'invoices' && (
            <div className="dash-tab-content" style={{ display: 'block', marginTop: '24px' }}>
              <ParentInvoices invoices={invoices} onInvoicePaid={fetchDashboardStats} />
            </div>
          )}

          {/* TAB 4: CHAT & FEEDBACK */}
          {activeTab === 'chat' && (
            <div className="dash-tab-content" style={{ display: 'block', marginTop: '24px' }}>
              <ParentChatTab assignedTutors={assignedTutors} />
            </div>
          )}

          {/* TAB 5: COMPLAINTS & SUPPORT */}
          {activeTab === 'complaints' && (
            <div className="dash-tab-content" style={{ display: 'block', marginTop: '24px' }}>
              <UserComplaintsTab roleName="Parent" />
            </div>
          )}
        </main>

        {/* MODALS */}
        <AddChildModal
          isOpen={isAddChildOpen}
          onClose={() => setIsAddChildOpen(false)}
          onSuccess={fetchDashboardStats}
        />

        <ParentCertificatesModal
          isOpen={isCertificatesOpen}
          onClose={() => setIsCertificatesOpen(false)}
        />
      </div>
    );
};
