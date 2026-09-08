import React, { useState, useEffect } from 'react';
import { FiLock, FiClock, FiXCircle } from 'react-icons/fi';
import '../../styles/tutor-dashboard.css';
import { tutorApi } from '../../services/tutorApi';
import { TutorSidebar } from '../../components/tutor/TutorSidebar';
import { TutorHeaderBar } from '../../components/tutor/TutorHeaderBar';
import { TutorOverviewTab } from '../../components/tutor/tabs/TutorOverviewTab';
import { TutorSessionsTab } from '../../components/tutor/tabs/TutorSessionsTab';
import { TutorRequestsTab } from '../../components/tutor/tabs/TutorRequestsTab';
import { TutorHomeworkTab } from '../../components/tutor/tabs/TutorHomeworkTab';
import { TutorChatTab } from '../../components/tutor/tabs/TutorChatTab';
import { TutorRatesTab } from '../../components/tutor/tabs/TutorRatesTab';
import { UserComplaintsTab } from '../../components/common/UserComplaintsTab';
import { TutorApplicationForm } from '../../components/tutor/TutorApplicationForm';
import { PayoutModal } from '../../components/tutor/modals/PayoutModal';
import { RequestCertificateModal } from '../../components/tutor/modals/RequestCertificateModal';
import { EditTutorProfileModal } from '../../components/tutor/modals/EditTutorProfileModal';

import { NotificationsTab } from '../../components/common/NotificationsTab';
import { ReferralSection } from '../../components/common/ReferralSection';
import { useDashboardTab } from '../../hooks/useDashboardTab';

const TUTOR_VALID_TABS = [
  'overview',
  'notifications',
  'sessions',
  'requests',
  'assignments',
  'chat',
  'rates-availability',
  'referrals',
  'edit-profile',
  'complaints',
];

const TUTOR_TAB_ALIASES = {
  'session': 'sessions',
  'schedule': 'sessions',
  'schedules': 'sessions',
  'teaching-sessions': 'sessions',
  'request': 'requests',
  'demo-requests': 'requests',
  'homework': 'assignments',
  'notes': 'assignments',
  'messages': 'chat',
  'rates': 'rates-availability',
  'availability': 'rates-availability',
  'subjects': 'rates-availability',
  'referral': 'referrals',
  'profile': 'edit-profile',
  'notification': 'notifications',
  'complaint': 'complaints',
  'support': 'complaints',
};

export const TutorDashboardPage = () => {
  const [activeTab, setActiveTab] = useDashboardTab(
    'tutor_activeTab',
    'overview',
    TUTOR_VALID_TABS,
    TUTOR_TAB_ALIASES
  );
  const [loading, setLoading] = useState(true);
  const [tutorStatus, setTutorStatus] = useState('not_applied');
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [tutorUser, setTutorUser] = useState(null);
  const [tutorProfile, setTutorProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [demoSchedule, setDemoSchedule] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [referredUsers, setReferredUsers] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  const fetchUnreadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications/unread-count');
      const data = await res.json();
      if (data.success) {
        setUnreadNotifications(data.count || 0);
      }
    } catch (err) {
      console.error('Fetch tutor unread count error:', err);
    }
  };

  useEffect(() => {
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

    loadDashboardData();

    const handleCustomEvent = (e) => {
      if (e.detail && typeof e.detail.unreadCount === 'number') {
        setUnreadNotifications(e.detail.unreadCount);
        return;
      }
      fetchUnreadNotifications();
    };

    window.addEventListener('unreadCountUpdated', handleCustomEvent);
    window.addEventListener('refreshNotifications', fetchUnreadNotifications);

    if (window.socket) {
      window.socket.on('receiveNotification', fetchUnreadNotifications);
      window.socket.on('unreadCountChanged', (data) => {
        if (data && typeof data.unreadCount === 'number') {
          setUnreadNotifications(data.unreadCount);
        } else {
          fetchUnreadNotifications();
        }
      });
    }

    return () => {
      window.removeEventListener('unreadCountUpdated', handleCustomEvent);
      window.removeEventListener('refreshNotifications', fetchUnreadNotifications);
      if (window.socket) {
        window.socket.off('receiveNotification', fetchUnreadNotifications);
        window.socket.off('unreadCountChanged');
      }
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      fetchUnreadNotifications();
      // 1. Load Profile & Tutor Status
      const profRes = await tutorApi.getTutorProfile();
      let currentStatus = 'not_applied';

      if (profRes.success) {
        if (profRes.tutorStatus) {
          currentStatus = profRes.tutorStatus;
        } else if (profRes.tutorProfile && profRes.tutorProfile.user && profRes.tutorProfile.user.tutorStatus) {
          currentStatus = profRes.tutorProfile.user.tutorStatus;
        }

        if (profRes.tutorProfile) {
          setTutorProfile(profRes.tutorProfile);
          if (profRes.tutorProfile.user) {
            setTutorUser(profRes.tutorProfile.user);
          }
        }
      }

      setTutorStatus(currentStatus);

      // Only load full dashboard data if tutor is approved
      if (currentStatus === 'approved') {
        // 2. Load Stats
        const statsRes = await tutorApi.getDashboardStats();
        if (statsRes.success) {
          setStats(statsRes.stats || statsRes);
          if (statsRes.payoutRequests) setPayoutHistory(statsRes.payoutRequests);
          if (statsRes.reviews) setReviews(statsRes.reviews);
        }

        // 3. Load Regular Schedules & Demo Schedules
        let regSchedules = [];
        let demoScheds = [];
        try {
          const schedRes = await tutorApi.getSchedules();
          if (schedRes && schedRes.success && Array.isArray(schedRes.schedules)) {
            regSchedules = schedRes.schedules.filter(s => s.classType === 'regular' || (!s.isTrial && s.frequency !== 'One-Time' && s.classType !== 'demo'));
            demoScheds = schedRes.schedules.filter(s => s.classType === 'demo' || s.isTrial || s.frequency === 'One-Time');
          }
        } catch (sErr) {
          console.error('Error fetching schedules:', sErr);
        }

        if (regSchedules.length === 0 && statsRes?.regularSchedules) {
          regSchedules = statsRes.regularSchedules;
        }
        if (demoScheds.length === 0 && statsRes?.demoSchedules) {
          demoScheds = statsRes.demoSchedules;
        }

        setSchedule(regSchedules);
        setDemoSchedule(demoScheds);

        // 4. Load Demo Booking Requests & Scheduled Demos
        const reqRes = await tutorApi.getBookingRequests();
        if (reqRes.success && reqRes.requests) {
          setPendingRequests(reqRes.requests);
        } else {
          setPendingRequests([]);
        }

        // 5. Load Referral History
        try {
          const refRes = await tutorApi.getReferrals();
          if (refRes.success && refRes.referredUsers) {
            setReferredUsers(refRes.referredUsers);
          }
        } catch (rErr) {
          console.error('Error fetching tutor referrals:', rErr);
        }

      }
    } catch (err) {
      console.error('Error loading tutor dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const res = await tutorApi.acceptBookingRequest(requestId);
      if (res.success) {
        setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
        loadDashboardData();
      } else {
        alert(res.message || 'Failed to accept request.');
      }
    } catch (err) {
      console.error('Accept Request Error:', err);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const res = await tutorApi.rejectBookingRequest(requestId);
      if (res.success) {
        setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
        loadDashboardData();
      } else {
        alert(res.message || 'Failed to decline request.');
      }
    } catch (err) {
      console.error('Reject Request Error:', err);
    }
  };

  const tutorDisplayName = tutorProfile?.fullName || tutorUser?.name || 'Dr. Educator';
  const tutorEmail = tutorUser?.email || 'tutor@hometutor.com';
  const currentUserId = tutorUser?._id || tutorProfile?.user?._id || tutorProfile?.user || '';

  const renderContent = () => {
    // 1. Notifications Tab is ALWAYS accessible in all statuses
    if (activeTab === 'notifications') {
      return <NotificationsTab userRole="tutor" onSelectTab={setActiveTab} />;
    }

    // 2. Application Form mode when requested by Tutor
    if (showApplicationForm) {
      return (
        <div className="dash-tab-content" style={{ display: 'block', padding: '20px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0f2a4a' }}>Become a Tutor Application</h3>
            <button
              className="dash-btn dash-btn-outline"
              onClick={() => setShowApplicationForm(false)}
            >
              <i className="fa-solid fa-xmark"></i> Close Form
            </button>
          </div>
          <TutorApplicationForm
            onSuccess={() => {
              setShowApplicationForm(false);
              loadDashboardData();
            }}
          />
        </div>
      );
    }

    // 3. Status-based dashboard locks for tutor-specific features
    if (tutorStatus === 'not_applied') {
      return (
        <div className="dash-tab-content" style={{ display: 'block' }}>
          <div className="dash-card" style={{ textAlign: 'center', padding: '50px 20px', maxWidth: '700px', margin: '40px auto', borderRadius: '16px' }}>
            <FiLock size={48} style={{ color: '#0284c7', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f2a4a', marginBottom: '10px' }}>Tutor Dashboard</h2>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>Complete Registration</h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
              Submit your application to unlock tutor features.
            </p>
            <button
              className="dash-btn dash-btn-primary"
              style={{ padding: '12px 28px', fontSize: '15px', fontWeight: '600' }}
              onClick={() => setShowApplicationForm(true)}
            >
              <i className="fa-solid fa-graduation-cap" style={{ marginRight: '8px' }}></i> Complete Registration
            </button>
          </div>
        </div>
      );
    }

    if (tutorStatus === 'pending') {
      return (
        <div className="dash-tab-content" style={{ display: 'block' }}>
          <div className="dash-card" style={{ textAlign: 'center', padding: '50px 20px', maxWidth: '700px', margin: '40px auto', borderRadius: '16px' }}>
            <FiClock size={48} style={{ color: '#f59e0b', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f2a4a', marginBottom: '12px' }}>Application Under Review</h2>
            <p style={{ fontSize: '15px', color: '#475569', marginBottom: '20px', lineHeight: '1.6' }}>
              Your tutor application is currently being reviewed by the admin.
            </p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              You can check <strong style={{ color: '#0f2a4a', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveTab('notifications')}>Notifications</strong> for updates.
            </p>
          </div>
        </div>
      );
    }

    if (tutorStatus === 'rejected') {
      return (
        <div className="dash-tab-content" style={{ display: 'block' }}>
          <div className="dash-card" style={{ textAlign: 'center', padding: '50px 20px', maxWidth: '700px', margin: '40px auto', borderRadius: '16px' }}>
            <FiXCircle size={48} style={{ color: '#dc2626', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#dc2626', marginBottom: '12px' }}>Application Rejected</h2>
            <p style={{ fontSize: '15px', color: '#475569', marginBottom: '20px', lineHeight: '1.6' }}>
              Your tutor application was not approved.
            </p>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
              Check <strong style={{ color: '#0f2a4a', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveTab('notifications')}>Notifications</strong> for more information.
            </p>
            <button
              className="dash-btn dash-btn-outline"
              style={{ padding: '10px 24px', fontSize: '14px' }}
              onClick={() => setShowApplicationForm(true)}
            >
              <i className="fa-solid fa-rotate-right" style={{ marginRight: '8px' }}></i> Re-apply / Submit Application
            </button>
          </div>
        </div>
      );
    }

    // 4. Approved State: Render tutor dashboard tabs
    return (
      <>
        {activeTab === 'overview' && (
          <TutorOverviewTab
            stats={stats}
            schedule={schedule}
            pendingRequests={pendingRequests}
            payoutHistory={payoutHistory}
            reviews={reviews}
            referralCode={stats?.referralCode || tutorUser?.referralCode || ''}
            referralEarnings={stats?.referralEarnings || 0}
            referredCount={stats?.referredCount || 0}
            referredUsers={referredUsers}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
            onRequestPayout={() => setIsPayoutModalOpen(true)}
          />
        )}

        {activeTab === 'sessions' && (
          <TutorSessionsTab
            sessions={schedule}
            demoSessions={demoSchedule}
            demoRequests={pendingRequests}
            onRefresh={loadDashboardData}
          />
        )}

        {activeTab === 'requests' && (
          <TutorRequestsTab
            requests={pendingRequests}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
          />
        )}

        {activeTab === 'assignments' && (
          <TutorHomeworkTab />
        )}

        {activeTab === 'chat' && (
          <TutorChatTab
            currentUserId={currentUserId}
            currentUserName={tutorDisplayName}
          />
        )}

        {activeTab === 'rates-availability' && (
          <TutorRatesTab />
        )}

        {activeTab === 'referrals' && (
          <div className="dash-tab-content" style={{ display: 'block', maxWidth: '850px', margin: '0 auto' }}>
            <ReferralSection
              referralCode={stats?.referralCode || tutorUser?.referralCode || ''}
              referralEarnings={stats?.referralEarnings || 0}
              referredCount={stats?.referredCount || 0}
              referredUsers={referredUsers}
              userRole="tutor"
            />
          </div>
        )}

        {activeTab === 'complaints' && (
          <UserComplaintsTab roleName="Tutor" />
        )}
      </>
    );
  };

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
      <TutorSidebar
        activeTab={activeTab}
        onSelectTab={(tabId) => {
          setShowApplicationForm(false);
          if (tabId === 'edit-profile') {
            setIsEditProfileModalOpen(true);
          } else {
            setActiveTab(tabId);
          }
        }}
        tutorName={tutorDisplayName}
        tutorEmail={tutorEmail}
        unreadCount={0}
        unreadNotificationsCount={unreadNotifications}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* MAIN CONTENT AREA */}
      <main className="dashboard-main">
        <TutorHeaderBar
          isApproved={tutorStatus === 'approved'}
          onEditProfile={() => setIsEditProfileModalOpen(true)}
          onRequestPayout={() => setIsPayoutModalOpen(true)}
          onRequestCertificate={() => setIsCertModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* TAB CONTENT RENDERING */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', color: '#0f2a4a', marginBottom: '12px' }}></i>
            <p style={{ fontSize: '15px', fontWeight: '600' }}>Loading Educator Control Panel...</p>
          </div>
        ) : (
          renderContent()
        )}
      </main>

      {/* EDIT PROFILE MODAL */}
      <EditTutorProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        tutorProfile={tutorProfile}
        onSuccess={() => {
          loadAllData();
        }}
      />

      {/* PAYOUT REQUEST MODAL */}
      <PayoutModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        availableBalance={stats?.netEarnings || 0}
        onSuccess={loadDashboardData}
      />

      {/* CERTIFICATE REQUEST MODAL */}
      <RequestCertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        onSuccess={loadDashboardData}
      />
    </div>
  );
};
