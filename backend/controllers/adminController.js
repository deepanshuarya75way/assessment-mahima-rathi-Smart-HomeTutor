
const mongoose = require("mongoose");
const User = require("../models/User");
const TutorProfile = require("../models/TutorProfile");
const BookingRequest = require("../models/BookingRequest");
const Transaction = require("../models/Transaction");
const ContactMessage = require("../models/ContactMessage");
const StudyMaterial = require("../models/StudyMaterial");
const ActivityLog = require("../models/ActivityLog");
const Complaint = require("../models/Complaint");
const Blog = require("../models/Blog");
const Certificate = require("../models/Certificate");
const CertificateRequest = require("../models/CertificateRequest");
const PayoutRequest = require("../models/PayoutRequest");
const PDFDocument = require("pdfkit");
const Notification = require("../models/Notification");
const { createNotification } = require("../utils/notificationHelper");
const { logUserActivity } = require("../utils/activityLogHelper");


exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalParents = await User.countDocuments({ role: "parent" });
    const totalTutors = await TutorProfile.countDocuments();
    const verifiedTutors = await TutorProfile.countDocuments({ verified: true });
    const pendingTutors = await TutorProfile.countDocuments({ verified: false });

    const totalBookings = await BookingRequest.countDocuments();
    const pendingBookings = await BookingRequest.countDocuments({ status: "Pending" });
    const acceptedBookings = await BookingRequest.countDocuments({ status: "Accepted" });
    const rejectedBookings = await BookingRequest.countDocuments({ status: "Rejected" });

    const totalContactMessages = await ContactMessage.countDocuments();
    const totalStudyMaterials = await StudyMaterial.countDocuments();

    
    const transactions = await Transaction.aggregate([
      { $match: { status: "Completed" } },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
    ]);
    const totalRevenue = transactions.length > 0 ? transactions[0].totalRevenue : 0;

    
    const monthlyRevenue = await Transaction.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id": 1 } },
    ]);

    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, role: "$role" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalStudents,
        totalParents,
        totalTutors,
        verifiedTutors,
        pendingTutors,
        totalBookings,
        pendingBookings,
        acceptedBookings,
        rejectedBookings,
        totalContactMessages,
        totalStudyMaterials,
        totalRevenue,
      },
      analytics: {
        monthlyRevenue,
        userGrowth,
        bookingBreakdown: {
          pending: pendingBookings,
          accepted: acceptedBookings,
          rejected: rejectedBookings,
        },
      },
    });
  } catch (err) {
    console.error("Get Admin Stats Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getAllTutors = async (req, res) => {
  try {
    const tutors = await TutorProfile.find().populate("user", "name email phone role");
    return res.status(200).json({ success: true, tutors });
  } catch (err) {
    console.error("Admin Get Tutors Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.verifyTutor = async (req, res) => {
  try {
    const { id } = req.params;
    const tutorProfile = await TutorProfile.findById(id).populate("user");

    if (!tutorProfile) {
      return res.status(404).json({ success: false, message: "Tutor profile not found" });
    }

    tutorProfile.verified = true;
    tutorProfile.verificationStatus = "Approved";
    tutorProfile.registrationStatus = "Approved";
    await tutorProfile.save();

    if (tutorProfile.user) {
      const tutorUserId = tutorProfile.user._id || tutorProfile.user;
      await User.findByIdAndUpdate(tutorUserId, { tutorStatus: "approved", isVerified: true });
      await createNotification({
        userId: tutorUserId,
        title: "Tutor Application Approved",
        message: "Congratulations! Your tutor application has been approved. You can now access your Tutor Dashboard and tutor features.",
        type: "system",
        app: req.app,
      });
    }

    const approvedTutorName = tutorProfile.fullName || (tutorProfile.user && tutorProfile.user.name) || "Tutor";
    await logUserActivity(req.user.id, `Admin verified tutor ${approvedTutorName}`, req.ip);

    return res.status(200).json({
      success: true,
      message: "Tutor profile approved and verified successfully!",
      tutorProfile,
    });
  } catch (err) {
    console.error("Verify Tutor Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.deleteTutor = async (req, res) => {
  try {
    const { id } = req.params;
    const tutorProfileToDelete = await TutorProfile.findById(id).populate("user", "name email");
    const delTutorName = (tutorProfileToDelete && tutorProfileToDelete.user && tutorProfileToDelete.user.name) ? tutorProfileToDelete.user.name : "Tutor";
    const tutorProfile = await TutorProfile.findByIdAndDelete(id);

    if (!tutorProfile) {
      return res.status(404).json({ success: false, message: "Tutor profile not found" });
    }

    await logUserActivity(req.user.id, `Admin deleted tutor account for ${delTutorName}`, req.ip);

    return res.status(200).json({
      success: true,
      message: "Tutor profile deleted / rejected successfully.",
    });
  } catch (err) {
    console.error("Delete Tutor Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, sort, status } = req.query;

    let query = {};

    if (role && role !== "all") {
      query.role = role.toLowerCase().trim();
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { role: searchRegex },
      ];
    }

    // Sort options: latest (default), oldest, name_asc, name_desc
    let sortOption = { createdAt: -1 };
    if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (sort === "name_asc") {
      sortOption = { name: 1 };
    } else if (sort === "name_desc") {
      sortOption = { name: -1 };
    }

    const users = await User.find(query).select("-password").sort(sortOption).lean();

    // Populate linked TutorProfiles for tutor verification status
    const tutorEmails = users.filter((u) => u.role === "tutor").map((u) => u.email.toLowerCase());
    const tutorProfiles = await TutorProfile.find({
      $or: [
        { user: { $in: users.map((u) => u._id) } },
        { email: { $in: tutorEmails } },
      ],
    }).lean();

    const profileMapByUserId = {};
    const profileMapByEmail = {};
    tutorProfiles.forEach((p) => {
      if (p.user) profileMapByUserId[p.user.toString()] = p;
      if (p.email) profileMapByEmail[p.email.toLowerCase()] = p;
    });

    const normalizedUsers = users.map((user) => {
      let computedStatus = "Unverified";

      if (user.role === "tutor") {
        const profile = profileMapByUserId[user._id.toString()] || profileMapByEmail[user.email.toLowerCase()];
        if (profile) {
          computedStatus =
            profile.verificationStatus === "Approved"
              ? "Approved"
              : profile.verificationStatus === "Rejected"
              ? "Rejected"
              : "Pending";
        } else {
          computedStatus = user.isVerified ? "Active" : "Unverified";
        }
      } else if (user.role === "student" || user.role === "parent") {
        computedStatus = user.isVerified ? "Active" : "Unverified";
      } else if (user.role === "admin") {
        computedStatus = "Active";
      }

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        createdAt: user.createdAt,
        isVerified: user.isVerified,
        status: computedStatus,
      };
    });

    // Optional Status Filter
    let finalUsers = normalizedUsers;
    if (status && status !== "all") {
      const targetStatus = status.toLowerCase().trim();
      finalUsers = normalizedUsers.filter((u) => u.status.toLowerCase() === targetStatus);
    }

    return res.status(200).json({ success: true, count: finalUsers.length, users: finalUsers });
  } catch (err) {
    console.error("Get All Users Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.role = role;
    await user.save();

    const targetRoleUserName = user.name || user.email;
    await logUserActivity(req.user.id, `Admin changed role of ${targetRoleUserName} to ${role.toUpperCase()}`, req.ip);

    return res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully.`,
      user,
    });
  } catch (err) {
    console.error("Update User Role Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role === "tutor") {
      await TutorProfile.findOneAndDelete({ user: user._id });
    }

    const targetDelUserName = user.name || user.email;
    await logUserActivity(req.user.id, `Admin deleted user account for ${targetDelUserName}`, req.ip);

    return res.status(200).json({
      success: true,
      message: `User ${user.name || user.email} deleted successfully.`,
    });
  } catch (err) {
    console.error("Delete User Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await BookingRequest.find()
      .populate("student", "name email phone")
      .populate("tutor", "name email phone")
      .populate("tutorProfile", "qualification fee subjects location")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, bookings });
  } catch (err) {
    console.error("Admin Get All Bookings Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const Announcement = require("../models/Announcement");
    const { title, message, targetRole } = req.body;
    const adminId = req.user.id;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message are required." });
    }

    const announcement = await Announcement.create({
      sender: adminId,
      title,
      message,
      targetRole: targetRole || "all",
    });

    const io = req.app.get("io");
    if (io) {
      const target = (targetRole || "all").toLowerCase();
      if (target === "all") {
        io.emit("receiveAnnouncement", announcement);
      } else {
        io.to(target).emit("receiveAnnouncement", announcement);
      }
    }

    await logUserActivity(req.user.id, `Admin created broadcast announcement: "${title}"`, req.ip);

    return res.status(201).json({
      success: true,
      message: "Announcement broadcasted successfully to Announcement section!",
      announcement,
    });
  } catch (err) {
    console.error("Create Announcement Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const Announcement = require("../models/Announcement");
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, announcements });
  } catch (err) {
    console.error("Get Announcements Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.sendBulkNotification = async (req, res) => {
  return exports.createAnnouncement(req, res);
};

const formatCleanLogAction = (log) => {
  if (!log || !log.action) return "";
  let action = log.action;
  let actorName = "User";
  if (log.user && log.user.name) {
    actorName = log.user.name;
  } else if (log.user && log.user.email) {
    actorName = log.user.email.toLowerCase().includes("smarthometutor26@gmail.com") 
      ? "Smart HomeTutor Admin" 
      : log.user.email.split("@")[0];
  } else if (log.userEmail) {
    actorName = log.userEmail.toLowerCase().includes("smarthometutor26@gmail.com")
      ? "Smart HomeTutor Admin"
      : log.userEmail.split("@")[0];
  }

  if (actorName && actorName.length > 0 && !actorName.includes(" ")) {
    actorName = actorName.charAt(0).toUpperCase() + actorName.slice(1);
  }

  action = action.replace(/#?[0-9a-fA-F]{24}/g, "").replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
  if (action.startsWith("Admin logged in successfully")) {
    return `${actorName} logged in successfully.`;
  }
  if (action.startsWith("User logged in successfully")) {
    return `${actorName} logged in successfully.`;
  }
  if (action.startsWith("User logged out") || action.startsWith("Admin logged out")) {
    return `${actorName} logged out.`;
  }
  if (action.startsWith("Email address verified successfully")) {
    return `${actorName} verified their email address successfully.`;
  }
  if (action.startsWith("Password reset completed successfully")) {
    return `${actorName} completed password reset.`;
  }
  if (action.startsWith("Password reset OTP requested")) {
    return `${actorName} requested a password reset OTP.`;
  }
  if (action.startsWith("User initiated registration")) {
    return `${actorName} initiated account registration.`;
  }
  if (action.startsWith("Submitted feedback for tutor") || action.startsWith("Submitted review")) {
    return `${actorName} submitted a review for their tutor.`;
  }
  if (action.startsWith("Updated feedback for tutor") || action.startsWith("Updated review")) {
    return `${actorName} updated their tutor review.`;
  }
  if (action.startsWith("Cancelled booking request")) {
    return `${actorName} cancelled a booking request.`;
  }
  if (action.startsWith("Accepted booking request")) {
    return `${actorName} accepted the student booking request.`;
  }
  if (action.startsWith("Declined booking request") || action.startsWith("Rejected booking request")) {
    return `${actorName} declined the student booking request.`;
  }
  if (action.startsWith("Admin verified tutor account") || action.startsWith("Admin approved KYC documents")) {
    return `${actorName} approved a tutor account verification.`;
  }
  if (action.startsWith("Admin deleted tutor account") || action.startsWith("Admin deleted tutor profile")) {
    return `${actorName} deleted a tutor account.`;
  }
  if (action.startsWith("Topped up wallet with")) {
    return `${actorName} ${action.toLowerCase()}.`;
  }
  if (action.startsWith("User ")) {
    action = action.replace(/^User\s+/, `${actorName} `);
  }
  if (!action.endsWith(".")) {
    action += ".";
  }

  return action;
};

exports.getActivityLogs = async (req, res) => {
  try {
    const rawLogs = await ActivityLog.find().populate("user", "name email role").sort({ createdAt: -1 }).limit(100);
    const logs = rawLogs.map(l => {
      const obj = l.toObject();
      obj.action = formatCleanLogAction(obj);
      return obj;
    });
    return res.status(200).json({ success: true, logs });
  } catch (err) {
    console.error("Get Activity Logs Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
exports.getSecurityAudit = async (req, res) => {
  try {
    const rawLogs = await ActivityLog.find()
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .limit(300);

    const logs = rawLogs.map(l => {
      const obj = l.toObject();
      obj.action = formatCleanLogAction(obj);
      return obj;
    });

    const totalLogins = await ActivityLog.countDocuments({ action: /logged in/i });
    const failedLogins = await ActivityLog.countDocuments({ action: /failed login/i });
    const passwordResets = await ActivityLog.countDocuments({ action: /password reset/i });
    const otpVerifications = await ActivityLog.countDocuments({ action: /otp|verified/i });
    const criticalAlerts = await ActivityLog.countDocuments({ severity: "critical" });
    const adminActions = await ActivityLog.countDocuments({
      $or: [
        { category: "admin" },
        { action: /admin/i }
      ]
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalLogins,
        failedLogins,
        passwordResets,
        otpVerifications,
        criticalAlerts,
        adminActions,
        totalLogs: logs.length,
      },
      logs,
      activityLogs: logs,
    });
  } catch (err) {
    console.error("Get Security Audit Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getPendingDocuments = async (req, res) => {
  try {
    const pendingTutors = await TutorProfile.find({
      verificationStatus: { $nin: ["Approved", "Rejected"] },
      registrationStatus: { $nin: ["Approved", "Rejected"] },
    })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: pendingTutors.length,
      tutors: pendingTutors,
      pendingDocuments: pendingTutors,
    });
  } catch (err) {
    console.error("Get Pending Documents Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getTutorApplications = async (req, res) => {
  try {
    const { status } = req.query; // 'pending' | 'approved' | 'rejected' | 'all'
    let query = {};
    if (status && status !== "all") {
      const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      query.$or = [
        { registrationStatus: formattedStatus },
        { verificationStatus: formattedStatus }
      ];
    }

    const tutors = await TutorProfile.find(query)
      .populate("user", "name email phone role tutorStatus")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: tutors.length,
      tutors: tutors,
      pendingDocuments: tutors,
    });
  } catch (err) {
    console.error("Get Tutor Applications Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getTutorApplicationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const tutorProfile = await TutorProfile.findById(id).populate("user", "name email phone role tutorStatus");
    if (!tutorProfile) {
      return res.status(404).json({ success: false, message: "Tutor application not found." });
    }
    return res.status(200).json({ success: true, tutorProfile });
  } catch (err) {
    console.error("Get Tutor Application Details Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.verifyTutorDocument = async (req, res) => {
  try {
    const { tutorProfileId } = req.params;
    const { status, docIndex } = req.body; // status: Approved / Rejected

    const profile = await TutorProfile.findById(tutorProfileId).populate("user");
    if (!profile) {
      return res.status(404).json({ success: false, message: "Tutor profile not found." });
    }

    const normStatus = (status || "").toLowerCase() === "approved" || status === "Approved" ? "Approved" : "Rejected";

    if (docIndex !== undefined && profile.documents[docIndex]) {
      profile.documents[docIndex].status = normStatus;
    } else if (profile.documents && profile.documents.length > 0) {
      profile.documents.forEach((d) => {
        d.status = normStatus;
      });
    }
    profile.verificationStatus = normStatus;
    profile.registrationStatus = normStatus;
    profile.verified = (normStatus === "Approved");
    await profile.save();

    if (profile.user) {
      const tutorUserId = profile.user._id || profile.user;
      const newTutorStatus = normStatus === "Approved" ? "approved" : "rejected";
      await User.findByIdAndUpdate(tutorUserId, { tutorStatus: newTutorStatus, isVerified: normStatus === "Approved" });

      const notifTitle = normStatus === "Approved" ? "Tutor Application Approved" : "Tutor Application Rejected";
      const notifMessage = normStatus === "Approved"
        ? "Congratulations! Your tutor application has been approved. You can now access your Tutor Dashboard and tutor features."
        : "Your tutor application has been rejected by the admin. Please review the application requirements and try again if applicable.";

      await createNotification({
        userId: tutorUserId,
        title: notifTitle,
        message: notifMessage,
        type: "system",
        app: req.app,
      });

      const tutorName = profile.user.name || "Tutor";
      await logUserActivity({
        userId: req.user ? req.user.id : null,
        action: `Admin ${normStatus.toLowerCase()} KYC documents for tutor ${tutorName}`,
        ipAddress: req.ip,
        severity: "info",
        category: "admin"
      });
    }

    return res.status(200).json({
      success: true,
      message: `Tutor verification status updated to ${normStatus}.`,
      tutorProfile: profile,
    });
  } catch (err) {
    console.error("Verify Tutor Document Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Helper for unique slug generation
const generateSlug = (text) => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

exports.getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: blogs.length, blogs });
  } catch (err) {
    console.error("Get All Admin Blogs Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.createBlog = async (req, res) => {
  try {
    const {
      title,
      content,
      category,
      author,
      readTime,
      tags,
      coverImage,
      excerpt,
      published,
      slug,
      metaTitle,
      metaDescription,
      metaKeywords,
      canonicalUrl,
      ogTitle,
      ogDescription,
      ogImage,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: "Title and content are required." });
    }

    let finalSlug = slug ? generateSlug(slug) : generateSlug(title);
    if (!finalSlug) finalSlug = "blog-" + Date.now();

    // Ensure slug uniqueness
    const existing = await Blog.findOne({ slug: finalSlug });
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    const defaultCover = "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80";

    const blog = await Blog.create({
      title,
      slug: finalSlug,
      content,
      category: category || "Learning Resources",
      author: author || "Smart HomeTutor Academic Team",
      readTime: readTime || "5 min read",
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim())) : [],
      coverImage: coverImage && coverImage.trim() !== "" ? coverImage.trim() : defaultCover,
      excerpt: excerpt || (content.length > 150 ? content.substring(0, 147) + "..." : content),
      published: published !== undefined ? Boolean(published) : true,
      metaTitle: metaTitle || "",
      metaDescription: metaDescription || "",
      metaKeywords: metaKeywords || "",
      canonicalUrl: canonicalUrl || "",
      ogTitle: ogTitle || "",
      ogDescription: ogDescription || "",
      ogImage: ogImage || "",
    });

    return res.status(201).json({
      success: true,
      message: "Blog article saved successfully!",
      blog,
    });
  } catch (err) {
    console.error("Create Blog Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      category,
      author,
      readTime,
      tags,
      coverImage,
      excerpt,
      published,
      slug,
      metaTitle,
      metaDescription,
      metaKeywords,
      canonicalUrl,
      ogTitle,
      ogDescription,
      ogImage,
    } = req.body;

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog article not found." });
    }

    if (title) blog.title = title;
    if (content) blog.content = content;
    if (category) blog.category = category;
    if (author) blog.author = author;
    if (readTime) blog.readTime = readTime;
    if (tags !== undefined) {
      blog.tags = Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim());
    }
    if (coverImage !== undefined && coverImage.trim() !== "") {
      blog.coverImage = coverImage.trim();
    }
    if (excerpt !== undefined) blog.excerpt = excerpt;
    if (published !== undefined) blog.published = Boolean(published);

    if (metaTitle !== undefined) blog.metaTitle = metaTitle;
    if (metaDescription !== undefined) blog.metaDescription = metaDescription;
    if (metaKeywords !== undefined) blog.metaKeywords = metaKeywords;
    if (canonicalUrl !== undefined) blog.canonicalUrl = canonicalUrl;
    if (ogTitle !== undefined) blog.ogTitle = ogTitle;
    if (ogDescription !== undefined) blog.ogDescription = ogDescription;
    if (ogImage !== undefined) blog.ogImage = ogImage;

    if (slug || title) {
      let newSlug = generateSlug(slug || title);
      if (newSlug && newSlug !== blog.slug) {
        const existing = await Blog.findOne({ slug: newSlug, _id: { $ne: id } });
        if (existing) newSlug = `${newSlug}-${Date.now().toString().slice(-4)}`;
        blog.slug = newSlug;
      }
    }

    await blog.save();

    return res.status(200).json({
      success: true,
      message: "Blog article updated successfully!",
      blog,
    });
  } catch (err) {
    console.error("Update Blog Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.togglePublishBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog article not found." });
    }

    blog.published = !blog.published;
    await blog.save();

    return res.status(200).json({
      success: true,
      message: `Blog article ${blog.published ? "published" : "unpublished"} successfully!`,
      blog,
    });
  } catch (err) {
    console.error("Toggle Publish Blog Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog article not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Blog article deleted successfully!",
    });
  } catch (err) {
    console.error("Delete Blog Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.uploadBlogCover = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please select an image file to upload." });
    }
    const relativeUrl = `/uploads/blogs/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      message: "Blog cover image uploaded successfully!",
      url: relativeUrl,
    });
  } catch (err) {
    console.error("Upload Blog Cover Error:", err);
    return res.status(500).json({ success: false, message: "Server error during image upload." });
  }
};

exports.getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("user", "name email role phone")
      .populate("relatedUser", "name email role phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, complaints });
  } catch (err) {
    console.error("Get All Complaints Admin Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.resolveComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminReply, status } = req.body;

    const complaint = await Complaint.findById(id).populate("user", "name email role");
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint ticket not found." });
    }

    if (status) {
      complaint.status = status;
      if (status === "Resolved" || status === "Closed") {
        complaint.resolvedAt = new Date();
        complaint.resolvedBy = req.user ? req.user.id : null;
      }
    }
    if (adminReply !== undefined) complaint.adminReply = adminReply;
    await complaint.save();

    if (complaint.user) {
      await createNotification({
        userId: complaint.user._id,
        title: "Help Desk Ticket Update 🎟️",
        message: `Your ticket regarding '${complaint.subject}' has been updated to '${complaint.status}'${adminReply ? `: "${adminReply}"` : '.'}`,
        type: "dispute",
        actionUrl: "/dashboard?tab=complaints",
        app: req.app,
      });
    }

    // Real-Time Socket Broadcast
    const io = req.app.get("io");
    if (io && complaint.user) {
      io.to(`complaint_${complaint._id.toString()}`).emit("complaintStatusUpdated", complaint);
      io.to(complaint.user._id.toString()).emit("complaintStatusUpdated", complaint);
    }

    return res.status(200).json({
      success: true,
      message: `Help ticket status updated to ${complaint.status}.`,
      complaint,
    });
  } catch (err) {
    console.error("Resolve Complaint Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
exports.exportPdfReport = async (req, res) => {
  try {
    const User = require("../models/User");
    const TutorProfile = require("../models/TutorProfile");
    const PDFDocument = require("pdfkit");

    const { search, role, sort, status } = req.query;

    let query = {};

    if (role && role !== "all") {
      query.role = role.toLowerCase().trim();
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { role: searchRegex },
      ];
    }

    // Sort options: latest (default), oldest, name_asc, name_desc
    let sortOption = { createdAt: -1 };
    if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (sort === "name_asc") {
      sortOption = { name: 1 };
    } else if (sort === "name_desc") {
      sortOption = { name: -1 };
    }

    // Fetch matching user directory data from database
    const users = await User.find(query).select("-password").sort(sortOption).lean();

    // Populate linked TutorProfiles for computed verification status
    const tutorEmails = users.filter((u) => u.role === "tutor").map((u) => u.email.toLowerCase());
    const tutorProfiles = await TutorProfile.find({
      $or: [
        { user: { $in: users.map((u) => u._id) } },
        { email: { $in: tutorEmails } },
      ],
    }).lean();

    const profileMapByUserId = {};
    const profileMapByEmail = {};
    tutorProfiles.forEach((p) => {
      if (p.user) profileMapByUserId[p.user.toString()] = p;
      if (p.email) profileMapByEmail[p.email.toLowerCase()] = p;
    });

    const normalizedUsers = users.map((user) => {
      let computedStatus = "Unverified";

      if (user.role === "tutor") {
        const profile = profileMapByUserId[user._id.toString()] || profileMapByEmail[user.email.toLowerCase()];
        if (profile) {
          computedStatus =
            profile.verificationStatus === "Approved"
              ? "Approved"
              : profile.verificationStatus === "Rejected"
              ? "Rejected"
              : "Pending";
        } else {
          computedStatus = user.isVerified ? "Active" : "Unverified";
        }
      } else if (user.role === "student" || user.role === "parent") {
        computedStatus = user.isVerified ? "Active" : "Unverified";
      } else if (user.role === "admin") {
        computedStatus = "Active";
      }

      return {
        ...user,
        status: computedStatus,
        createdAtFormatted: new Date(user.createdAt || Date.now()).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      };
    });

    // Optional Status Filter
    let finalUsers = normalizedUsers;
    if (status && status !== "all") {
      const targetStatus = status.toLowerCase().trim();
      finalUsers = normalizedUsers.filter((u) => u.status.toLowerCase() === targetStatus);
    }

    // Summary counts for Header overview
    const totalUsers = finalUsers.length;
    const totalStudents = finalUsers.filter((u) => u.role === "student").length;
    const totalTutors = finalUsers.filter((u) => u.role === "tutor").length;
    const totalParents = finalUsers.filter((u) => u.role === "parent").length;
    const totalAdmins = finalUsers.filter((u) => u.role === "admin").length;

    const generatedAt = new Date().toLocaleString("en-IN", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: "Asia/Kolkata",
    });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const filename = `SmartHomeTutor_User_Directory_Report_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Render Page Header function
    const renderHeader = () => {
      doc.rect(40, 30, 515, 60).fill("#0f2a4a");
      doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold").text("SMART HOMETUTOR", 55, 42);
      doc.fontSize(11).font("Helvetica").text("Official Platform User Directory Report", 55, 65);
      doc.fontSize(8).text(`Exported: ${generatedAt}`, 320, 65, { align: "right" });
    };

    // Render Summary Metric Card
    const renderSummary = () => {
      doc.rect(40, 100, 515, 40).fillAndStroke("#f8fafc", "#e2e8f0");
      doc.fillColor("#0f2a4a").fontSize(10).font("Helvetica-Bold");
      doc.text(`Total Accounts: ${totalUsers}`, 55, 115);
      doc.fillColor("#0284c7").text(`Students: ${totalStudents}`, 170, 115);
      doc.fillColor("#15803d").text(`Tutors: ${totalTutors}`, 270, 115);
      doc.fillColor("#b45309").text(`Parents: ${totalParents}`, 360, 115);
      doc.fillColor("#6b21a8").text(`Admins: ${totalAdmins}`, 460, 115);
    };

    // Render Table Headers
    const renderTableHeader = (yPos) => {
      doc.rect(40, yPos, 515, 22).fill("#1e293b");
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
      doc.text("#", 45, yPos + 6, { width: 20 });
      doc.text("User Name", 70, yPos + 6, { width: 110 });
      doc.text("Email Address", 185, yPos + 6, { width: 145 });
      doc.text("Role", 335, yPos + 6, { width: 60 });
      doc.text("Status", 400, yPos + 6, { width: 65 });
      doc.text("Reg. Date", 470, yPos + 6, { width: 80 });
    };

    renderHeader();
    renderSummary();

    let currentY = 150;
    renderTableHeader(currentY);
    currentY += 22;

    if (finalUsers.length === 0) {
      doc.rect(40, currentY, 515, 30).fill("#fef2f2");
      doc.fillColor("#dc2626").fontSize(10).font("Helvetica-Bold");
      doc.text("No user accounts found matching the current filter criteria.", 55, currentY + 10, { width: 480, align: "center" });
    } else {
      // Iterate and render each user row
      finalUsers.forEach((user, idx) => {
        if (currentY > 750) {
          doc.addPage();
          renderHeader();
          currentY = 100;
          renderTableHeader(currentY);
          currentY += 22;
        }

        // Alternate row background colors
        if (idx % 2 === 0) {
          doc.rect(40, currentY, 515, 20).fill("#f8fafc");
        } else {
          doc.rect(40, currentY, 515, 20).fill("#ffffff");
        }

        doc.fillColor("#334155").fontSize(8.5).font("Helvetica");
        doc.text(String(idx + 1), 45, currentY + 5, { width: 20 });
        doc.font("Helvetica-Bold").fillColor("#0f2a4a").text(user.name || "N/A", 70, currentY + 5, { width: 110, height: 12, ellipsis: true });
        doc.font("Helvetica").fillColor("#475569").text(user.email || "N/A", 185, currentY + 5, { width: 145, height: 12, ellipsis: true });

        // Role Badge Color
        let roleColor = "#0284c7";
        if (user.role === "tutor") roleColor = "#15803d";
        if (user.role === "parent") roleColor = "#b45309";
        if (user.role === "admin") roleColor = "#6b21a8";

        doc.fillColor(roleColor).font("Helvetica-Bold").text((user.role || "student").toUpperCase(), 335, currentY + 5, { width: 60 });

        // Status Color
        let statusColor = "#16a34a";
        if (user.status === "Pending") statusColor = "#d97706";
        if (user.status === "Unverified" || user.status === "Rejected") statusColor = "#dc2626";

        doc.fillColor(statusColor).font("Helvetica-Bold").text(user.status || "Active", 400, currentY + 5, { width: 65 });
        doc.fillColor("#64748b").font("Helvetica").text(user.createdAtFormatted || "", 470, currentY + 5, { width: 80 });

        currentY += 20;
      });
    }

    // Confidential Footer on last page or bottom
    if (currentY > 740) {
      doc.addPage();
      currentY = 100;
    }

    doc.rect(40, 780, 515, 30).fill("#0f2a4a");
    doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold").text("CONFIDENTIAL USER DIRECTORY REPORT • SMART HOMETUTOR PLATFORM", 55, 790);
    doc.fontSize(8).font("Helvetica").text(`TOTAL RECORDS EXPORTED: ${totalUsers}`, 370, 790, { align: "right" });

    doc.end();
  } catch (err) {
    console.error("Export User Directory PDF Report Error:", err);
    return res.status(500).json({ success: false, message: "Server Error generating User Directory PDF report." });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const Subject = require("../models/Subject");
    let subjects = await Subject.find().sort({ createdAt: -1 });

    if (subjects.length === 0) {
      subjects = await Subject.insertMany([
        { name: "CBSE / ICSE Core Science & Mathematics", category: "CBSE", grade: "Grade 1 to 12", description: "Comprehensive science, physics, chemistry, and math curriculum for Indian national boards." },
        { name: "IB / IGCSE International Curriculum", category: "IB / IGCSE", grade: "Middle & Diploma Years", description: "International Baccalaureate and Cambridge IGCSE advanced subject tuition." },
        { name: "Competitive Test Prep (JEE, NEET, SAT)", category: "Competitive Test Prep", grade: "Class 11, 12 & Droppers", description: "Targeted coaching and mock test preparation for national engineering & medical entrance exams." }
      ]);
    }

    return res.status(200).json({ success: true, count: subjects.length, subjects });
  } catch (err) {
    console.error("Get Subjects Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.addSubject = async (req, res) => {
  try {
    const Subject = require("../models/Subject");
    const { name, category, grade, description } = req.body;

    if (!name || !category || !grade) {
      return res.status(400).json({ success: false, message: "Subject Name, Category/Board, and Grade are required." });
    }

    const trimmedName = name.trim();
    const trimmedCat = category.trim();

    const existing = await Subject.findOne({
      name: { $regex: new RegExp(`^${trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") },
      category: trimmedCat
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A subject named "${trimmedName}" under category "${trimmedCat}" already exists.`
      });
    }

    const newSubject = await Subject.create({
      name: trimmedName,
      category: trimmedCat,
      grade: grade.trim(),
      description: description ? description.trim() : "",
    });

    await logUserActivity({
      userId: req.user ? req.user.id : null,
      action: `Admin created new subject category "${trimmedName}" (${trimmedCat})`,
      ipAddress: req.ip,
      severity: "info",
      category: "admin"
    });

    return res.status(201).json({
      success: true,
      message: `Subject "${trimmedName}" added successfully!`,
      subject: newSubject
    });
  } catch (err) {
    console.error("Add Subject Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const Subject = require("../models/Subject");
    const { id } = req.params;
    const { name, category, grade, description } = req.body;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found." });
    }

    if (name) subject.name = name.trim();
    if (category) subject.category = category.trim();
    if (grade) subject.grade = grade.trim();
    if (description !== undefined) subject.description = description.trim();

    await subject.save();

    await logUserActivity({
      userId: req.user ? req.user.id : null,
      action: `Admin updated subject to "${subject.name}"`,
      ipAddress: req.ip,
      severity: "info",
      category: "admin"
    });

    return res.status(200).json({
      success: true,
      message: `Subject updated successfully!`,
      subject
    });
  } catch (err) {
    console.error("Update Subject Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const Subject = require("../models/Subject");
    const { id } = req.params;
    const deleted = await Subject.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Subject not found." });
    }

    await logUserActivity({
      userId: req.user ? req.user.id : null,
      action: `Admin deleted subject category "${deleted.name}"`,
      ipAddress: req.ip,
      severity: "info",
      category: "admin"
    });

    return res.status(200).json({ success: true, message: "Subject removed successfully." });
  } catch (err) {
    console.error("Delete Subject Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getFinanceRevenue = async (req, res) => {
  try {
    const Transaction = require("../models/Transaction");
    // Only verified live/production transactions contribute to revenue and commissions
    const completedTransactions = await Transaction.find({ status: "Completed", isTestMode: { $ne: true } });
    const grossRevenue = completedTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);

    const tutorPayout = grossRevenue * 0.85;
    const platformCommission = grossRevenue * 0.15;

    return res.status(200).json({
      success: true,
      grossRevenue,
      tutorPayout,
      platformCommission,
      completedTransactionsCount: completedTransactions.length,
    });
  } catch (err) {
    console.error("Get Finance Revenue Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.getCertificateRequests = async (req, res) => {
  try {
    const requests = await CertificateRequest.find()
      .populate("student", "name email phone")
      .populate("tutor", "name email phone")
      .populate("certificate")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, requests });
  } catch (err) {
    console.error("Get Certificate Requests Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.approveCertificateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminRemarks } = req.body;

    const certRequest = await CertificateRequest.findById(id)
      .populate("student", "name email")
      .populate("tutor", "name email");

    if (!certRequest) {
      return res.status(404).json({ success: false, message: "Certificate request not found." });
    }

    if (certRequest.status === "Approved") {
      return res.status(400).json({ success: false, message: "Certificate request is already approved." });
    }

    const certId = "CERT-" + Math.random().toString(36).substring(2, 9).toUpperCase();

    const certificate = await Certificate.create({
      student: certRequest.student._id,
      tutor: certRequest.tutor._id,
      courseName: certRequest.courseName,
      certificateId: certId,
      issueDate: new Date(),
    });

    certRequest.status = "Approved";
    certRequest.certificate = certificate._id;
    if (adminRemarks) certRequest.adminRemarks = adminRemarks;
    await certRequest.save();

    await createNotification({
      userId: certRequest.student._id,
      title: "Certificate Approved & Issued! 🎓",
      message: `Congratulations! Your completion certificate for ${certRequest.courseName} has been approved by Admin and is ready for PDF download.`,
      type: "system",
      app: req.app,
    });

    await createNotification({
      userId: certRequest.tutor._id,
      title: "Certificate Request Approved 🎓",
      message: `Your certificate completion request for ${certRequest.student.name} (${certRequest.courseName}) has been approved by Admin. Certificate ID: ${certId}`,
      type: "system",
      app: req.app,
    });

    await logUserActivity(req.user.id, `Admin approved certificate ${certId} for ${certRequest.student.name}`, req.ip);

    return res.status(200).json({
      success: true,
      message: `Certificate approved and issued successfully! Certificate ID: ${certId}`,
      certificate,
      request: certRequest,
    });
  } catch (err) {
    console.error("Approve Certificate Request Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.rejectCertificateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminRemarks } = req.body;

    const certRequest = await CertificateRequest.findById(id)
      .populate("student", "name email")
      .populate("tutor", "name email");

    if (!certRequest) {
      return res.status(404).json({ success: false, message: "Certificate request not found." });
    }

    certRequest.status = "Rejected";
    certRequest.adminRemarks = adminRemarks || "Course completion criteria not fully satisfied.";
    await certRequest.save();

    await createNotification({
      userId: certRequest.tutor._id,
      title: "Certificate Request Decision",
      message: `Your certificate request for ${certRequest.student ? certRequest.student.name : 'Student'} (${certRequest.courseName}) was rejected by Admin. Reason: ${certRequest.adminRemarks}`,
      type: "system",
      app: req.app,
    });

    await logUserActivity(req.user.id, `Admin rejected certificate request for ${certRequest.courseName}`, req.ip);

    return res.status(200).json({
      success: true,
      message: "Certificate request rejected.",
      request: certRequest,
    });
  } catch (err) {
    console.error("Reject Certificate Request Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getPayoutRequests = async (req, res) => {
  try {
    const rawRequests = await PayoutRequest.find()
      .populate("tutor", "name email phone role walletBalance")
      .sort({ createdAt: -1 });

    const ClassSchedule = require("../models/ClassSchedule");

    const payoutRequests = await Promise.all(
      rawRequests.map(async (p) => {
        const pObj = p.toObject();
        if (p.tutor && p.tutor._id) {
          const tutorId = p.tutor._id;
          const profile = await TutorProfile.findOne({ user: tutorId });
          const userWallet = p.tutor.walletBalance || 0;

          const completedClasses = await ClassSchedule.find({ tutor: tutorId, status: "Completed" });
          const classEarnings = completedClasses.length * (profile ? profile.fee || profile.hourlyRate || 500 : 500);

          const creditTxns = await Transaction.find({ user: tutorId, status: "Completed", type: { $in: ["Credit", "Tuition Fee Payment", "Wallet Topup"] }, isTestMode: { $ne: true } });
          const creditEarnings = creditTxns.reduce((sum, t) => sum + (t.amount || 0), 0);

          const grossEarnings = classEarnings + creditEarnings + userWallet;

          const approvedPayouts = await PayoutRequest.find({ tutor: tutorId, status: "Approved" });
          const totalPayoutsDeducted = approvedPayouts.reduce((sum, pay) => sum + pay.amount, 0);

          pObj.availableBalance = Math.max(0, grossEarnings - totalPayoutsDeducted);
        } else {
          pObj.availableBalance = 0;
        }
        return pObj;
      })
    );

    return res.status(200).json({
      success: true,
      payoutRequests,
    });
  } catch (err) {
    console.error("Get Admin Payout Requests Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.approvePayoutRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const payout = await PayoutRequest.findById(id).populate("tutor", "name email walletBalance");
    if (!payout) {
      return res.status(404).json({ success: false, message: "Payout request not found." });
    }

    if (payout.status !== "Pending") {
      return res.status(400).json({ success: false, message: `Payout request is already ${payout.status.toLowerCase()}.` });
    }

    payout.status = "Approved";
    payout.processedAt = new Date();
    await payout.save();
    if (payout.tutor) {
      const tutorUser = await User.findById(payout.tutor._id);
      if (tutorUser) {
        tutorUser.walletBalance = Math.max(0, (tutorUser.walletBalance || 0) - payout.amount);
        await tutorUser.save();
      }
    }
    await Transaction.create({
      user: payout.tutor._id,
      type: "Payout Request",
      amount: payout.amount,
      description: `Tutor Earnings Withdrawal Approved (#PAY-${payout._id.toString().slice(-6).toUpperCase()})`,
      status: "Completed",
    });

    await createNotification({
      userId: payout.tutor._id,
      title: "Payout Request Approved 🎉",
      message: `Your payout request of ₹${payout.amount.toLocaleString("en-IN")} has been approved and transferred to your registered bank account/UPI!`,
      type: "payment",
      app: req.app,
    });

    await logUserActivity(req.user.id, `Admin approved payout of ₹${payout.amount} for tutor ${payout.tutor.name}`, req.ip);

    return res.status(200).json({
      success: true,
      message: `Payout request of ₹${payout.amount.toLocaleString("en-IN")} approved successfully!`,
      payout,
    });
  } catch (err) {
    console.error("Approve Payout Request Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.rejectPayoutRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const payout = await PayoutRequest.findById(id).populate("tutor", "name email");
    if (!payout) {
      return res.status(404).json({ success: false, message: "Payout request not found." });
    }

    if (payout.status !== "Pending") {
      return res.status(400).json({ success: false, message: `Payout request is already ${payout.status.toLowerCase()}.` });
    }

    payout.status = "Rejected";
    payout.rejectionReason = rejectionReason || "Account verification or bank details pending update.";
    payout.processedAt = new Date();
    await payout.save();

    await createNotification({
      userId: payout.tutor._id,
      title: "Payout Request Update",
      message: `Your payout request of ₹${payout.amount.toLocaleString("en-IN")} was rejected by Admin. Reason: ${payout.rejectionReason}`,
      type: "system",
      app: req.app,
    });

    await logUserActivity(req.user.id, `Admin rejected payout of ₹${payout.amount} for tutor ${payout.tutor.name}`, req.ip);

    return res.status(200).json({
      success: true,
      message: `Payout request of ₹${payout.amount.toLocaleString("en-IN")} rejected.`,
      payout,
    });
  } catch (err) {
    console.error("Reject Payout Request Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.sendBulkNotification = async (req, res) => {
  try {
    const Announcement = require("../models/Announcement");
    const Notification = require("../models/Notification");
    const User = require("../models/User");

    const { title, message, targetRole = "all" } = req.body;

    if (!title || !title.trim() || !message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Announcement title and message body are required." });
    }

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    const normalizedRole = targetRole.toLowerCase();

    // 1. Create Announcement Record
    const announcement = await Announcement.create({
      sender: req.user ? req.user.id : null,
      title: trimmedTitle,
      message: trimmedMessage,
      targetRole: normalizedRole,
    });

    // 2. Query Target Users for Persistence (Offline Users)
    let userFilter = { role: { $ne: "admin" } };
    if (normalizedRole === "student") {
      userFilter = { role: "student" };
    } else if (normalizedRole === "tutor") {
      userFilter = { role: "tutor" };
    } else if (normalizedRole === "parent") {
      userFilter = { role: "parent" };
    }

    const targetUsers = await User.find(userFilter).select("_id role");

    // 3. Bulk Create Persistent Notification Documents
    if (targetUsers.length > 0) {
      const notificationDocs = targetUsers.map((u) => ({
        user: u._id,
        title: trimmedTitle,
        message: trimmedMessage,
        type: "system",
        read: false,
      }));

      await Notification.insertMany(notificationDocs).catch((err) =>
        console.error("Bulk Insert Notifications Error:", err)
      );
    }

    // 4. Real-Time Socket.IO Broadcast (Online Users)
    const io = req.app.get("io");
    if (io) {
      const broadcastData = {
        _id: announcement._id,
        title: trimmedTitle,
        message: trimmedMessage,
        targetRole: normalizedRole,
        type: "system",
        createdAt: announcement.createdAt,
      };

      if (normalizedRole === "all") {
        io.emit("receiveAnnouncement", broadcastData);
      } else {
        io.to(normalizedRole).emit("receiveAnnouncement", broadcastData);
      }
    }

    await logUserActivity({
      userId: req.user ? req.user.id : null,
      action: `Admin broadcasted announcement "${trimmedTitle}" to audience [${normalizedRole}]`,
      ipAddress: req.ip,
      severity: "info",
      category: "admin"
    });

    return res.status(201).json({
      success: true,
      message: `Announcement broadcasted to ${targetUsers.length} target accounts successfully!`,
      announcement,
      targetCount: targetUsers.length,
    });
  } catch (err) {
    console.error("Send Bulk Notification Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * GET /api/admin/notifications
 * Fetch all admin notifications with populated source user details
 */
exports.getAdminNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id, role: "admin" })
      .populate("sourceUser", "name email role phone")
      .sort({ createdAt: -1 });

    const unreadCount = notifications.filter((n) => !n.isRead && !n.read).length;

    return res.status(200).json({
      success: true,
      unreadCount,
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    console.error("Get Admin Notifications Error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching admin notifications." });
  }
};

/**
 * GET /api/admin/notifications/unread-count
 */
exports.getAdminUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ user: req.user.id, role: "admin", $or: [{ isRead: false }, { read: false }] });
    return res.status(200).json({ success: true, unreadCount });
  } catch (err) {
    console.error("Get Admin Unread Count Error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching unread count." });
  }
};

const getAdminUnreadCountFromDB = async (userId) => {
  return await Notification.countDocuments({ user: userId, role: "admin", $or: [{ isRead: false }, { read: false }] });
};

/**
 * PATCH /api/admin/notifications/:id/read
 */
exports.markAdminNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { isRead: true, read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    const unreadCount = await getAdminUnreadCountFromDB(req.user.id);

    const io = req.app.get("io");
    if (io) {
      io.to(req.user.id.toString()).emit("unreadCountChanged", { role: "admin", unreadCount });
    }

    return res.status(200).json({ success: true, message: "Notification marked as read.", unreadCount, notification });
  } catch (err) {
    console.error("Mark Admin Notification Read Error:", err);
    return res.status(500).json({ success: false, message: "Server error updating notification." });
  }
};

/**
 * PATCH /api/admin/notifications/read-all
 */
exports.markAllAdminNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, role: "admin" }, { isRead: true, read: true });

    const io = req.app.get("io");
    if (io) {
      io.to(req.user.id.toString()).emit("unreadCountChanged", { role: "admin", unreadCount: 0 });
    }

    return res.status(200).json({ success: true, unreadCount: 0, message: "All admin notifications marked as read." });
  } catch (err) {
    console.error("Mark All Admin Notifications Read Error:", err);
    return res.status(500).json({ success: false, message: "Server error marking notifications as read." });
  }
};

/**
 * DELETE /api/admin/notifications/:id
 */
exports.deleteAdminNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Notification.findOneAndDelete({ _id: id, user: req.user.id });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Notification not found or unauthorized." });
    }

    const unreadCount = await getAdminUnreadCountFromDB(req.user.id);

    const io = req.app.get("io");
    if (io) {
      io.to(req.user.id.toString()).emit("unreadCountChanged", { role: "admin", unreadCount });
    }

    return res.status(200).json({ success: true, unreadCount, message: "Notification deleted successfully." });
  } catch (err) {
    console.error("Delete Admin Notification Error:", err);
    return res.status(500).json({ success: false, message: "Server error deleting notification." });
  }
};

/**
 * Certificate Request Management
 */
exports.getCertificateRequests = async (req, res) => {
  try {
    const requests = await CertificateRequest.find({})
      .populate("student", "name email phone")
      .populate("tutor", "name email phone")
      .populate("certificate")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      certificateRequests: requests,
      requests,
    });
  } catch (err) {
    console.error("Get Certificate Requests Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.updateCertificateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const status = body.status || "Approved";
    const adminRemarks = body.adminRemarks || "";

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Certificate Request ID." });
    }

    const normStatus = (status || "").toLowerCase() === "approved" || status === "Approved" ? "Approved" : "Rejected";

    const certReq = await CertificateRequest.findById(id)
      .populate("student", "name email")
      .populate("tutor", "name email");

    if (!certReq) {
      return res.status(404).json({ success: false, message: "Certificate request not found." });
    }

    certReq.status = normStatus;
    if (adminRemarks) {
      certReq.adminRemarks = adminRemarks;
    }

    if (normStatus === "Approved") {
      let cert = null;
      if (certReq.certificate) {
        cert = await Certificate.findById(certReq.certificate);
      }

      if (!cert) {
        const certId = "SHT-CERT-" + Math.floor(100000 + Math.random() * 900000);
        const studentId = certReq.student?._id || certReq.student;
        const tutorId = certReq.tutor?._id || certReq.tutor;

        cert = await Certificate.create({
          student: studentId,
          tutor: tutorId,
          courseName: certReq.courseName || "Tuition Course",
          certificateId: certId,
          issueDate: new Date(),
        });
      }

      certReq.certificate = cert._id;
      await certReq.save();

      if (certReq.student) {
        const studentUserId = certReq.student._id || certReq.student;
        await createNotification({
          userId: studentUserId,
          title: "Course Certificate Issued! 🎓",
          message: `Your official certificate for "${certReq.courseName}" has been approved and issued! Download it from your student dashboard.`,
          type: "certificate",
          app: req.app,
        }).catch(() => {});
      }

      if (certReq.tutor) {
        const tutorUserId = certReq.tutor._id || certReq.tutor;
        await createNotification({
          userId: tutorUserId,
          title: "Certificate Request Approved 🎉",
          message: `Your certificate request for ${certReq.student ? certReq.student.name : "Student"} (${certReq.courseName}) was approved by Admin.`,
          type: "certificate",
          app: req.app,
        }).catch(() => {});
      }

      return res.status(200).json({
        success: true,
        message: "Certificate Request APPROVED and official Certificate generated!",
        request: certReq,
        certificate: cert,
      });
    } else {
      await certReq.save();

      if (certReq.tutor) {
        const tutorUserId = certReq.tutor._id || certReq.tutor;
        await createNotification({
          userId: tutorUserId,
          title: "Certificate Request Declined",
          message: `Your certificate request for ${certReq.student ? certReq.student.name : "Student"} was declined. ${adminRemarks ? "Reason: " + adminRemarks : ""}`,
          type: "certificate",
          app: req.app,
        }).catch(() => {});
      }

      return res.status(200).json({
        success: true,
        message: "Certificate Request REJECTED.",
        request: certReq,
      });
    }
  } catch (err) {
    console.error("Update Certificate Request Status Error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server Error" });
  }
};

exports.approveCertificateRequest = async (req, res) => {
  if (!req.body) req.body = {};
  req.body.status = "Approved";
  return exports.updateCertificateRequestStatus(req, res);
};

exports.rejectCertificateRequest = async (req, res) => {
  if (!req.body) req.body = {};
  req.body.status = "Rejected";
  return exports.updateCertificateRequestStatus(req, res);
};

exports.toggleBookingChatUnlock = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await BookingRequest.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking request not found." });
    }

    booking.isChatUnlocked = !booking.isChatUnlocked;
    await booking.save();

    return res.status(200).json({
      success: true,
      message: `Chat ${booking.isChatUnlocked ? "UNLOCKED" : "LOCKED"} by Admin successfully!`,
      isChatUnlocked: booking.isChatUnlocked,
      booking,
    });
  } catch (err) {
    console.error("Toggle Booking Chat Unlock Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.toggleUserChatUnlock = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found." });
    }

    user.chatUnlockedByAdmin = !user.chatUnlockedByAdmin;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Chat ${user.chatUnlockedByAdmin ? "UNLOCKED" : "LOCKED"} by Admin for ${user.name}!`,
      chatUnlockedByAdmin: user.chatUnlockedByAdmin,
      user,
    });
  } catch (err) {
    console.error("Toggle User Chat Unlock Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.approveBookingRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await BookingRequest.findById(id)
      .populate("student", "name email phone")
      .populate("tutor", "name email phone")
      .populate("tutorProfile", "primarySubject subjects");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Demo class request not found." });
    }

    // Set Admin approval flag (Requirement 2)
    booking.adminApproved = true;
    booking.adminRejected = false;

    const { createDemoClassScheduleIfBothApproved } = require("../utils/demoScheduleHelper");
    const studentName = booking.student ? (booking.student.name || booking.student.email) : "A student";
    const tutorName = booking.tutor ? (booking.tutor.name || "Tutor") : "Tutor";
    const subjectName = (booking.tutorProfile && booking.tutorProfile.primarySubject) || "Tuition";

    // RULE 4: Check if BOTH Admin and Tutor have approved
    if (booking.tutorApproved) {
      booking.status = "Confirmed";
      await booking.save();

      // Trigger automatic demo class creation ONLY when adminApproved && tutorApproved
      await createDemoClassScheduleIfBothApproved(booking._id, req.app);

      return res.status(200).json({
        success: true,
        message: "Demo class request approved by both Admin & Tutor! Class scheduled.",
        booking,
      });
    }

    // Otherwise, keep request pending tutor approval
    booking.status = "Pending Tutor Acceptance";
    await booking.save();

    // Notify Student that Admin approved and tutor approval is pending
    if (booking.student) {
      await createNotification({
        userId: booking.student._id,
        title: "Demo Class Request Update ⌛",
        message: `Admin has approved your demo request for ${tutorName}. Waiting for tutor approval.`,
        type: "booking",
        app: req.app,
      });
    }

    // Notify Tutor
    if (booking.tutor) {
      await createNotification({
        userId: booking.tutor._id,
        title: "New Demo Class Request 🎓",
        message: `You have received a demo class request from ${studentName} for ${subjectName}. Please accept or reject the request.`,
        type: "booking",
        app: req.app,
      });
    }

    await logUserActivity(req.user.id, `Admin approved demo class request (${booking._id}) -> Waiting for Tutor acceptance`, req.ip);

    return res.status(200).json({
      success: true,
      message: "Demo class request approved by Admin! Sent to Tutor for acceptance.",
      booking,
    });
  } catch (err) {
    console.error("Approve Booking Request Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.rejectBookingRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await BookingRequest.findById(id)
      .populate("student", "name email phone");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Demo class request not found." });
    }

    booking.adminApproved = false;
    booking.adminRejected = true;
    booking.status = "Rejected by Admin";
    await booking.save();

    // Deliver user-specific notification to Student
    if (booking.student) {
      await createNotification({
        userId: booking.student._id,
        title: "Demo Class Request Update",
        message: "Your demo class request has been rejected by Admin.",
        type: "booking",
        app: req.app,
      });
    }

    await logUserActivity(req.user.id, `Admin rejected demo class request (${booking._id})`, req.ip);

    return res.status(200).json({
      success: true,
      message: "Demo class request REJECTED by Admin successfully!",
      booking,
    });
  } catch (err) {
    console.error("Reject Booking Request Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.deleteBookingRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await BookingRequest.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking request not found." });
    }

    await BookingRequest.findByIdAndDelete(id);
    await logUserActivity(req.user.id, `Admin deleted booking request (${id})`, req.ip);

    return res.status(200).json({
      success: true,
      message: "Booking request deleted successfully!",
    });
  } catch (err) {
    console.error("Delete Booking Request Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
