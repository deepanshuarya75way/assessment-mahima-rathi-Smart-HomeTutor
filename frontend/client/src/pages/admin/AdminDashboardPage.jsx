import React, { useState, useEffect } from 'react';
import '../../styles/admin-dashboard.css';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../services/adminApi';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { AdminHeaderBar } from '../../components/admin/AdminHeaderBar';
import { AdminOverviewTab } from '../../components/admin/tabs/AdminOverviewTab';
import { AdminUsersTab } from '../../components/admin/tabs/AdminUsersTab';
import { AdminTutorVerificationsTab } from '../../components/admin/tabs/AdminTutorVerificationsTab';
import { AdminCertificatesTab } from '../../components/admin/tabs/AdminCertificatesTab';
import { AdminFinanceTab } from '../../components/admin/tabs/AdminFinanceTab';
import { AdminPaymentHistoryTab } from '../../components/admin/tabs/AdminPaymentHistoryTab';
import { AdminCatalogTab } from '../../components/admin/tabs/AdminCatalogTab';
import { AdminDisputesTab } from '../../components/admin/tabs/AdminDisputesTab';
import { AdminNewsletterTab } from '../../components/admin/tabs/AdminNewsletterTab';
import { AdminBlogsTab } from '../../components/admin/tabs/AdminBlogsTab';
import { AdminNotificationsTab } from '../../components/admin/tabs/AdminNotificationsTab';
import { AdminDemoRequestsTab } from '../../components/admin/tabs/AdminDemoRequestsTab';
import { AdminAccessManagementTab } from '../../components/admin/tabs/AdminAccessManagementTab';
import { AnnouncementModal } from '../../components/admin/modals/AnnouncementModal';
import { SecurityCenterModal } from '../../components/admin/modals/SecurityCenterModal';
import { AddSubjectModal } from '../../components/admin/modals/AddSubjectModal';
import { AdminBlogModal } from '../../components/admin/modals/AdminBlogModal';
import { CreateScheduleModal } from '../../components/common/CreateScheduleModal';
import { useDashboardTab } from '../../hooks/useDashboardTab';

const ADMIN_VALID_TABS = [
  'overview',
  'demo-requests',
  'notifications',
  'users',
  'tutor-verifications',
  'certificates',
  'finance',
  'payment-history',
  'catalog',
  'disputes',
  'newsletter',
  'blogs',
  'manage-access',
];

const ADMIN_TAB_ALIASES = {
  'demos': 'demo-requests',
  'verifications': 'tutor-verifications',
  'tutor-apps': 'tutor-verifications',
  'payments': 'payment-history',
  'boards': 'catalog',
  'dispute': 'disputes',
  'complaints': 'disputes',
  'blog': 'blogs',
  'articles': 'blogs',
  'notification': 'notifications',
  'user-directory': 'users',
  'access': 'manage-access',
  'manage': 'manage-access',
  'access-management': 'manage-access',
  'admin-access': 'manage-access',
};

export const AdminDashboardPage = () => {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useDashboardTab(
    'admin_activeTab',
    'overview',
    ADMIN_VALID_TABS,
    ADMIN_TAB_ALIASES
  );

  const isSuper = Boolean(auth?.isSuperAdmin || (auth?.userEmail === 'useradmin2005@gmail.com'));
  const isFull = isSuper || Boolean(auth?.fullAccess);
  const userPerms = Array.isArray(auth?.permissions) ? auth.permissions : [];

  const isTabAllowed = (tabId) => {
    if (tabId === 'manage-access') return isSuper;
    if (isSuper) return true;
    if (isFull) return true;
    if (tabId === 'blogs') {
      return userPerms.includes('blogs.view') || userPerms.includes('blogs') || userPerms.includes('blog-articles');
    }
    const permMap = {
      'overview': 'overview.view',
      'demo-requests': 'demo-requests.manage',
      'notifications': 'notifications.manage',
      'users': 'users.manage',
      'tutor-verifications': 'tutor-verifications.manage',
      'certificates': 'certificates.manage',
      'finance': 'finance.view',
      'payment-history': 'payment-history.view',
      'catalog': 'catalog.manage',
      'disputes': 'disputes.manage',
      'newsletter': 'newsletter.manage',
    };
    return userPerms.includes(permMap[tabId]);
  };

  useEffect(() => {
    if (!auth.loading) {
      if (!isTabAllowed(activeTab)) {
        const firstAllowed = ADMIN_VALID_TABS.find((t) => isTabAllowed(t));
        if (firstAllowed) {
          setActiveTab(firstAllowed);
        }
      }
    }
  }, [activeTab, auth.loading, auth.isSuperAdmin, auth.fullAccess, auth.permissions]);
  const [loading, setLoading] = useState(true);

  // Dynamic MongoDB Data States
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [certificateRequests, setCertificateRequests] = useState([]);
  const [finance, setFinance] = useState({});
  const [payouts, setPayouts] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [blogs, setBlogs] = useState([]);

  // Modals States
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [isSecurityCenterOpen, setIsSecurityCenterOpen] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [selectedGradeForModal, setSelectedGradeForModal] = useState('');
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [blogToEdit, setBlogToEdit] = useState(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

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

    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        usersRes,
        docsRes,
        logsRes,
        certsRes,
        financeRes,
        payoutsRes,
        subjectsRes,
        blogsRes
      ] = await Promise.all([
        adminApi.getStats().catch(() => ({})),
        adminApi.getAllUsers().catch(() => ({})),
        adminApi.getTutorApplications('all').catch(() => ({})),
        adminApi.getActivityLogs().catch(() => ({})),
        adminApi.getCertificateRequests().catch(() => ({})),
        adminApi.getFinanceRevenue().catch(() => ({})),
        adminApi.getPayoutRequests().catch(() => ({})),
        adminApi.getSubjects().catch(() => ({})),
        adminApi.getAllBlogs().catch(() => ({}))
      ]);

      if (statsRes.success) setStats(statsRes.stats || statsRes);
      if (usersRes.success && usersRes.users) setUsers(usersRes.users);
      if (docsRes.success && (docsRes.tutors || docsRes.pendingDocuments)) setPendingDocs(docsRes.tutors || docsRes.pendingDocuments);
      if (logsRes.success && logsRes.activityLogs) setActivityLogs(logsRes.activityLogs);
      if (certsRes.success && certsRes.certificateRequests) setCertificateRequests(certsRes.certificateRequests);
      if (financeRes.success && financeRes.finance) setFinance(financeRes.finance);
      if (payoutsRes.success && payoutsRes.payoutRequests) setPayouts(payoutsRes.payoutRequests);
      if (subjectsRes.success && subjectsRes.subjects) setSubjects(subjectsRes.subjects);
      if (blogsRes.success && blogsRes.blogs) setBlogs(blogsRes.blogs);
    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const handleVerifyDoc = async (id, status = 'Approved') => {
    try {
      const res = await adminApi.verifyDocument(id, status);
      if (res.success) {
        setPendingDocs((prev) =>
          prev.map((d) => (d._id === id ? { ...d, registrationStatus: status, verificationStatus: status, verified: status === 'Approved' } : d))
        );
        loadAllAdminData();
      } else {
        alert(res.message || 'Failed to update tutor application status.');
      }
    } catch (err) {
      console.error('Verify Application Error:', err);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await adminApi.updateUserRole(userId, newRole);
      if (res.success) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
      } else {
        alert(res.message || 'Failed to update user role.');
      }
    } catch (err) {
      console.error('Role update error:', err);
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmed = window.showCustomConfirm
      ? await window.showCustomConfirm('Are you sure you want to delete this user account?', 'Delete User Account', 'Delete', 'Cancel')
      : window.confirm('Are you sure you want to delete this user account?');
    if (!confirmed) return;
    try {
      const res = await adminApi.deleteUser(userId);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u._id !== userId));
      } else {
        alert(res.message || 'Failed to delete user.');
      }
    } catch (err) {
      console.error('Delete User error:', err);
    }
  };

  const handleApproveCert = async (certId) => {
    try {
      const res = await adminApi.approveCertificate(certId);
      if (res.success) {
        setCertificateRequests((prev) =>
          prev.map((c) => (c._id === certId ? { ...c, status: 'Approved' } : c))
        );
        loadAllAdminData();
      } else {
        alert(res.message || 'Failed to approve certificate.');
      }
    } catch (err) {
      console.error('Approve cert error:', err);
    }
  };

  const handleRejectCert = async (certId) => {
    try {
      const res = await adminApi.rejectCertificate(certId);
      if (res.success) {
        setCertificateRequests((prev) =>
          prev.map((c) => (c._id === certId ? { ...c, status: 'Rejected' } : c))
        );
        loadAllAdminData();
      } else {
        alert(res.message || 'Failed to reject certificate.');
      }
    } catch (err) {
      console.error('Reject cert error:', err);
    }
  };

  const handleApprovePayout = async (payoutId) => {
    try {
      const res = await adminApi.approvePayout(payoutId);
      if (res.success) {
        setPayouts((prev) => prev.filter((p) => p._id !== payoutId));
        loadAllAdminData();
      } else {
        alert(res.message || 'Failed to approve payout.');
      }
    } catch (err) {
      console.error('Approve payout error:', err);
    }
  };

  const handleRejectPayout = async (payoutId) => {
    try {
      const res = await adminApi.rejectPayout(payoutId);
      if (res.success) {
        setPayouts((prev) => prev.filter((p) => p._id !== payoutId));
        loadAllAdminData();
      } else {
        alert(res.message || 'Failed to reject payout.');
      }
    } catch (err) {
      console.error('Reject payout error:', err);
    }
  };

  const handleUpdateSubject = async (subjectId, updatedData) => {
    try {
      const res = await adminApi.updateSubject(subjectId, updatedData);
      if (res.success) {
        setSubjects((prev) =>
          prev.map((s) => (s._id === subjectId ? { ...s, ...res.subject } : s))
        );
        loadAllAdminData();
      } else {
        alert(res.message || 'Failed to update subject name.');
      }
    } catch (err) {
      console.error('Update subject error:', err);
      alert('Failed to update subject name.');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    const confirmed = window.showCustomConfirm
      ? await window.showCustomConfirm('Delete this subject from academic catalog?', 'Delete Subject', 'Delete', 'Cancel')
      : window.confirm('Delete this subject from academic catalog?');
    if (!confirmed) return;
    try {
      const res = await adminApi.deleteSubject(subjectId);
      if (res.success) {
        setSubjects((prev) => prev.filter((s) => s._id !== subjectId));
      } else {
        alert(res.message || 'Failed to delete subject.');
      }
    } catch (err) {
      console.error('Delete subject error:', err);
    }
  };

  const handleTogglePublishBlog = async (blogId) => {
    try {
      const res = await adminApi.togglePublishBlog(blogId);
      if (res.success) {
        setBlogs((prev) =>
          prev.map((b) => (b._id === blogId ? { ...b, status: b.status === 'published' ? 'draft' : 'published' } : b))
        );
      } else {
        alert(res.message || 'Failed to update publish status.');
      }
    } catch (err) {
      console.error('Toggle publish blog error:', err);
    }
  };

  const handleDeleteBlog = async (blogId) => {
    const confirmed = window.showCustomConfirm
      ? await window.showCustomConfirm('Are you sure you want to delete this blog article?', 'Delete Blog Article', 'Delete', 'Cancel')
      : window.confirm('Are you sure you want to delete this blog article?');
    if (!confirmed) return;
    try {
      const res = await adminApi.deleteBlog(blogId);
      if (res.success) {
        setBlogs((prev) => prev.filter((b) => b._id !== blogId));
      } else {
        alert(res.message || 'Failed to delete blog.');
      }
    } catch (err) {
      console.error('Delete blog error:', err);
    }
  };

  const [userFilters, setUserFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
    sort: 'latest',
  });

  const handleExportPdf = () => {
    const params = new URLSearchParams();
    if (userFilters.search) params.append('search', userFilters.search);
    if (userFilters.role && userFilters.role !== 'all') params.append('role', userFilters.role);
    if (userFilters.status && userFilters.status !== 'all') params.append('status', userFilters.status);
    if (userFilters.sort && userFilters.sort !== 'latest') params.append('sort', userFilters.sort);

    const queryString = params.toString();
    const exportUrl = `/api/admin/export-pdf-report${queryString ? `?${queryString}` : ''}`;
    window.open(exportUrl, '_blank');
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
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        adminName={auth?.userName || 'System Administrator'}
        adminEmail={auth?.userEmail || 'useradmin2005@gmail.com'}
        onOpenAnnouncement={() => setIsAnnouncementOpen(true)}
        onOpenSecurityCenter={() => setIsSecurityCenterOpen(true)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* MAIN CONTENT AREA */}
      <main className="dashboard-main">
        <AdminHeaderBar
          onOpenAnnouncement={() => setIsAnnouncementOpen(true)}
          onExportPdf={handleExportPdf}
          onOpenScheduleClass={() => setIsScheduleModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* TAB RENDERING */}
        {auth.loading || loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', color: '#b45309', marginBottom: '12px' }}></i>
            <p style={{ fontSize: '15px', fontWeight: '600' }}>Loading Platform Governance Panel...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <AdminOverviewTab
                stats={stats}
                pendingDocs={pendingDocs}
                activityLogs={activityLogs}
                onVerifyDoc={handleVerifyDoc}
              />
            )}

            {activeTab === 'demo-requests' && (
              <AdminDemoRequestsTab />
            )}

            {activeTab === 'notifications' && (
              <AdminNotificationsTab onSelectTab={setActiveTab} />
            )}

            {activeTab === 'users' && (
              <AdminUsersTab
                onRoleChange={handleRoleChange}
                onDeleteUser={handleDeleteUser}
                onFilterChange={setUserFilters}
              />
            )}

            {activeTab === 'tutor-verifications' && (
              <AdminTutorVerificationsTab
                verifications={pendingDocs}
                onVerifyDoc={handleVerifyDoc}
              />
            )}

            {activeTab === 'certificates' && (
              <AdminCertificatesTab
                requests={certificateRequests}
                onApprove={handleApproveCert}
                onReject={handleRejectCert}
              />
            )}

            {activeTab === 'finance' && (
              <AdminFinanceTab
                finance={finance}
                payouts={payouts}
                onApprovePayout={handleApprovePayout}
                onRejectPayout={handleRejectPayout}
                onExportPdf={handleExportPdf}
              />
            )}

            {activeTab === 'payment-history' && (
              <AdminPaymentHistoryTab />
            )}

            {activeTab === 'catalog' && (
              <AdminCatalogTab
                subjects={subjects}
                onOpenAddSubject={(grade = '') => {
                  setSelectedGradeForModal(grade);
                  setIsAddSubjectOpen(true);
                }}
                onUpdateSubject={handleUpdateSubject}
                onDeleteSubject={handleDeleteSubject}
              />
            )}

            {activeTab === 'disputes' && (
              <AdminDisputesTab />
            )}

            {activeTab === 'newsletter' && (
              <AdminNewsletterTab />
            )}

            {activeTab === 'blogs' && (
              <AdminBlogsTab
                blogs={blogs}
                onRefresh={loadAllAdminData}
                onTogglePublish={handleTogglePublishBlog}
                onDeleteBlog={handleDeleteBlog}
              />
            )}

            {activeTab === 'manage-access' && isSuper && (
              <AdminAccessManagementTab />
            )}
          </>
        )}
      </main>

      {/* MODALS */}
      <AnnouncementModal
        isOpen={isAnnouncementOpen}
        onClose={() => setIsAnnouncementOpen(false)}
        onSuccess={loadAllAdminData}
      />

      <SecurityCenterModal
        isOpen={isSecurityCenterOpen}
        onClose={() => setIsSecurityCenterOpen(false)}
      />

      <AddSubjectModal
        isOpen={isAddSubjectOpen}
        defaultGrade={selectedGradeForModal}
        onClose={() => setIsAddSubjectOpen(false)}
        onSuccess={loadAllAdminData}
      />

      <AdminBlogModal
        isOpen={isBlogModalOpen}
        onClose={() => { setIsBlogModalOpen(false); setBlogToEdit(null); }}
        blogToEdit={blogToEdit}
        onSuccess={loadAllAdminData}
      />

      <CreateScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSuccess={loadAllAdminData}
        userRole="admin"
      />
    </div>
  );
};
