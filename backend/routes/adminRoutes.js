/**
 * ==========================================
 * ADMIN ROUTES
 * ==========================================
 * Router endpoints for administrator operations:
 * - System analytics & monthly report breakdowns
 * - Tutor verification & KYC document approvals
 * - Activity logs & security audit trails
 * - Bulk notifications & announcement broadcasting
 * - Blog & FAQ management
 * - Help Desk / Complaint ticket resolutions
 */

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const paymentController = require("../controllers/paymentController");
const { requireAuth, authorizeRole, requirePermission } = require("../middleware/authMiddleware");
const blogCoverUpload = require("../utils/blogUploadMiddleware");

// All admin routes require authentication and admin role
router.use(requireAuth, authorizeRole("admin"));

// ADMIN ACCESS MANAGEMENT ROUTES (Manage Access Permission Required)
router.get("/access-management", requirePermission("manageAccess"), adminController.getAdminStaffList);
router.post("/access-management", requirePermission("manageAccess"), adminController.createAdminStaffAccess);
router.put("/access-management/:id", requirePermission("manageAccess"), adminController.updateAdminStaffAccess);
router.delete("/access-management/:id", requirePermission("manageAccess"), adminController.revokeAdminStaffAccess);

// SECTION SPECIFIC ADMIN ROUTES WITH PERMISSION VERIFICATION
router.get("/stats", requirePermission("overview.view"), adminController.getStats);
router.get("/tutors", requirePermission("tutor-verifications.manage"), adminController.getAllTutors);
router.patch("/tutor/:id/verify", requirePermission("tutor-verifications.manage"), adminController.verifyTutor);
router.delete("/tutor/:id", requirePermission("tutor-verifications.manage"), adminController.deleteTutor);

router.get("/users", requirePermission("users.manage"), adminController.getAllUsers);
router.patch("/user/:id/role", requirePermission("users.manage"), adminController.updateUserRole);
router.delete("/user/:id", requirePermission("users.manage"), adminController.deleteUser);

router.get("/bookings", requirePermission("demo-requests.manage"), adminController.getAllBookings);
router.patch("/bookings/:id/approve", requirePermission("demo-requests.manage"), adminController.approveBookingRequest);
router.patch("/bookings/:id/reject", requirePermission("demo-requests.manage"), adminController.rejectBookingRequest);
router.delete("/bookings/:id", requirePermission("demo-requests.manage"), adminController.deleteBookingRequest);
router.post("/announcement", requirePermission("notifications.manage"), adminController.createAnnouncement);
router.get("/announcements", requirePermission("notifications.manage"), adminController.getAnnouncements);

// Bulk Notifications, Audit Logs, KYC Verification, Content & Complaints
router.post("/bulk-notification", requirePermission("notifications.manage"), adminController.sendBulkNotification);
router.get("/activity-logs", requirePermission("overview.view"), adminController.getActivityLogs);
router.get("/security-audit", requirePermission("overview.view"), adminController.getSecurityAudit);
router.get("/pending-documents", requirePermission("tutor-verifications.manage"), adminController.getPendingDocuments);
router.get("/tutor-applications", requirePermission("tutor-verifications.manage"), adminController.getTutorApplications);
router.get("/tutor-applications/:id", requirePermission("tutor-verifications.manage"), adminController.getTutorApplicationDetails);
router.post("/tutor-applications/:tutorProfileId/verify", requirePermission("tutor-verifications.manage"), adminController.verifyTutorDocument);
router.patch("/document-verify/:tutorProfileId", requirePermission("tutor-verifications.manage"), adminController.verifyTutorDocument);

// BLOG ARTICLES MANAGEMENT ROUTES (Full CRUD for blogs.view, blogs.create, blogs.edit, blogs.delete)
router.get("/blogs", requirePermission("blogs.view"), adminController.getAllBlogs);
router.post("/blogs", requirePermission("blogs.create"), adminController.createBlog);
router.post("/blogs/upload-cover", requirePermission("blogs.create"), blogCoverUpload, adminController.uploadBlogCover);
router.put("/blogs/:id", requirePermission("blogs.edit"), adminController.updateBlog);
router.patch("/blogs/:id/publish", requirePermission("blogs.edit"), adminController.togglePublishBlog);
router.delete("/blogs/:id", requirePermission("blogs.delete"), adminController.deleteBlog);

router.get("/complaints", requirePermission("disputes.manage"), adminController.getAllComplaints);
router.patch("/complaints/:id/resolve", requirePermission("disputes.manage"), adminController.resolveComplaint);
router.get("/export-pdf-report", requirePermission("overview.view"), adminController.exportPdfReport);

// Subjects & Academic Boards Catalog Routes
router.get("/subjects", requirePermission("catalog.manage"), adminController.getSubjects);
router.post("/subjects", requirePermission("catalog.manage"), adminController.addSubject);
router.put("/subjects/:id", requirePermission("catalog.manage"), adminController.updateSubject);
router.delete("/subjects/:id", requirePermission("catalog.manage"), adminController.deleteSubject);

// Finance & Platform Escrow Revenue Log Route
router.get("/finance-revenue", requirePermission("finance.view"), adminController.getFinanceRevenue);
router.get("/payments", requirePermission("payment-history.view"), paymentController.getAdminPaymentHistory);

// Certificate Approval & Issuance System Routes
router.get("/certificate-requests", requirePermission("certificates.manage"), adminController.getCertificateRequests);
router.post("/certificate-requests/:id/approve", requirePermission("certificates.manage"), adminController.approveCertificateRequest);
router.post("/certificate-requests/:id/reject", requirePermission("certificates.manage"), adminController.rejectCertificateRequest);

// Educator Payout Request Approval System Routes
router.get("/payout-requests", requirePermission("finance.view"), adminController.getPayoutRequests);
router.post("/payout-requests/:id/approve", requirePermission("finance.view"), adminController.approvePayoutRequest);
router.post("/payout-requests/:id/reject", requirePermission("finance.view"), adminController.rejectPayoutRequest);

// Admin Notifications Management Routes
router.get("/notifications", requirePermission("notifications.manage"), adminController.getAdminNotifications);
router.get("/notifications/unread-count", requirePermission("notifications.manage"), adminController.getAdminUnreadCount);
router.patch("/notifications/read-all", requirePermission("notifications.manage"), adminController.markAllAdminNotificationsAsRead);
router.patch("/notifications/:id/read", requirePermission("notifications.manage"), adminController.markAdminNotificationAsRead);
router.delete("/notifications/:id", requirePermission("notifications.manage"), adminController.deleteAdminNotification);

// Newsletter Subscriber Management Routes
const newsletterController = require("../controllers/newsletterController");
router.get("/newsletter/subscribers", requirePermission("newsletter.manage"), newsletterController.getSubscribers);
router.patch("/newsletter/subscribers/:id/unsubscribe", requirePermission("newsletter.manage"), newsletterController.unsubscribeSubscriber);

// Chat Unlock Overrides
router.patch("/booking/:id/toggle-chat-unlock", requirePermission("users.manage"), adminController.toggleBookingChatUnlock);
router.patch("/user/:id/toggle-chat-unlock", requirePermission("users.manage"), adminController.toggleUserChatUnlock);

module.exports = router;

