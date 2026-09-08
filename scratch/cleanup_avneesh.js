const mongoose = require("mongoose");
const dns = require("dns");
const path = require("path");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../backend/models/User");
const TutorProfile = require("../backend/models/TutorProfile");
const BookingRequest = require("../backend/models/BookingRequest");
const ClassSchedule = require("../backend/models/ClassSchedule");
const Notification = require("../backend/models/Notification");
const Review = require("../backend/models/Review");
const Attendance = require("../backend/models/Attendance");
const ActivityLog = require("../backend/models/ActivityLog");
const Payment = require("../backend/models/Payment");
const PayoutRequest = require("../backend/models/PayoutRequest");
const Certificate = require("../backend/models/Certificate");
const CertificateRequest = require("../backend/models/CertificateRequest");
const Message = require("../backend/models/Message");
const Complaint = require("../backend/models/Complaint");
const ProgressReport = require("../backend/models/ProgressReport");
const StudyMaterial = require("../backend/models/StudyMaterial");
const StudyNote = require("../backend/models/StudyNote");
const Transaction = require("../backend/models/Transaction");

async function executeCleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB for Cleanup\n");

    // 1. Target User IDs
    const targetUsers = await User.find({ name: "Avneesh Chauhan ReportTest" }).lean();
    const targetUserIds = targetUsers.map(u => u._id);

    // 2. Target Profile IDs
    const targetProfiles = await TutorProfile.find({
      $or: [
        { user: { $in: targetUserIds } },
        { fullName: "Avneesh Chauhan ReportTest" },
        { firstName: "Avneesh Chauhan ReportTest" }
      ]
    }).lean();
    const targetProfileIds = targetProfiles.map(p => p._id);

    console.log("=== PRE-CLEANUP REPORT ===");
    console.log(`Target Test User Accounts ("Avneesh Chauhan ReportTest"): ${targetUserIds.length}`);
    console.log(`Target Test Tutor Profiles: ${targetProfileIds.length}`);

    // Perform deletions of related test records
    const resBookings = await BookingRequest.deleteMany({
      $or: [{ tutor: { $in: targetUserIds } }, { tutorProfile: { $in: targetProfileIds } }]
    });
    console.log(`Deleted BookingRequests: ${resBookings.deletedCount}`);

    const resSchedules = await ClassSchedule.deleteMany({
      $or: [{ tutor: { $in: targetUserIds } }, { tutorProfile: { $in: targetProfileIds } }]
    });
    console.log(`Deleted ClassSchedules: ${resSchedules.deletedCount}`);

    const resNotifications = await Notification.deleteMany({
      $or: [{ user: { $in: targetUserIds } }, { sender: { $in: targetUserIds } }, { recipient: { $in: targetUserIds } }]
    });
    console.log(`Deleted Notifications: ${resNotifications.deletedCount}`);

    const resReviews = await Review.deleteMany({
      $or: [{ tutor: { $in: targetUserIds } }, { tutorProfile: { $in: targetProfileIds } }]
    });
    console.log(`Deleted Reviews: ${resReviews.deletedCount}`);

    const resAttendances = await Attendance.deleteMany({
      tutor: { $in: targetUserIds }
    });
    console.log(`Deleted Attendances: ${resAttendances.deletedCount}`);

    const resPayments = await Payment.deleteMany({
      $or: [{ tutor: { $in: targetUserIds } }, { user: { $in: targetUserIds } }]
    });
    console.log(`Deleted Payments: ${resPayments.deletedCount}`);

    const resNotes = await StudyNote.deleteMany({ tutor: { $in: targetUserIds } });
    console.log(`Deleted StudyNotes: ${resNotes.deletedCount}`);

    const resMaterials = await StudyMaterial.deleteMany({ tutor: { $in: targetUserIds } });
    console.log(`Deleted StudyMaterials: ${resMaterials.deletedCount}`);

    const resActivity = await ActivityLog.deleteMany({ user: { $in: targetUserIds } });
    console.log(`Deleted ActivityLogs: ${resActivity.deletedCount}`);

    const resPayouts = await PayoutRequest.deleteMany({
      $or: [{ tutor: { $in: targetUserIds } }, { user: { $in: targetUserIds } }]
    });
    console.log(`Deleted PayoutRequests: ${resPayouts.deletedCount}`);

    const resCerts = await Certificate.deleteMany({ tutor: { $in: targetUserIds } });
    console.log(`Deleted Certificates: ${resCerts.deletedCount}`);

    const resCertReqs = await CertificateRequest.deleteMany({ tutor: { $in: targetUserIds } });
    console.log(`Deleted CertificateRequests: ${resCertReqs.deletedCount}`);

    const resMsgs = await Message.deleteMany({
      $or: [{ sender: { $in: targetUserIds } }, { receiver: { $in: targetUserIds } }]
    });
    console.log(`Deleted Messages: ${resMsgs.deletedCount}`);

    const resComplaints = await Complaint.deleteMany({
      $or: [{ user: { $in: targetUserIds } }, { tutor: { $in: targetUserIds } }]
    });
    console.log(`Deleted Complaints: ${resComplaints.deletedCount}`);

    const resReports = await ProgressReport.deleteMany({ tutor: { $in: targetUserIds } });
    console.log(`Deleted ProgressReports: ${resReports.deletedCount}`);

    const resTxns = await Transaction.deleteMany({ user: { $in: targetUserIds } });
    console.log(`Deleted Transactions: ${resTxns.deletedCount}`);

    // Remove from any student's favorites array
    await User.updateMany(
      { favorites: { $in: targetProfileIds } },
      { $pullAll: { favorites: targetProfileIds } }
    );

    // Delete TutorProfiles
    const resProfiles = await TutorProfile.deleteMany({ _id: { $in: targetProfileIds } });
    console.log(`Deleted TutorProfiles: ${resProfiles.deletedCount}`);

    // Delete Users
    const resUsers = await User.deleteMany({ _id: { $in: targetUserIds } });
    console.log(`Deleted Users: ${resUsers.deletedCount}`);

    console.log("\n=== POST-CLEANUP VERIFICATION ===");
    const remainingTestUsers = await User.countDocuments({ name: "Avneesh Chauhan ReportTest" });
    console.log(`Remaining "Avneesh Chauhan ReportTest" Users in DB: ${remainingTestUsers}`);

    const remainingTestProfiles = await TutorProfile.countDocuments({
      $or: [
        { fullName: "Avneesh Chauhan ReportTest" },
        { firstName: "Avneesh Chauhan ReportTest" },
        { user: { $in: targetUserIds } }
      ]
    });
    console.log(`Remaining "Avneesh Chauhan ReportTest" TutorProfiles in DB: ${remainingTestProfiles}`);

    const realAvneesh = await User.findOne({ name: "Avneesh", role: "tutor" });
    console.log(`Real Tutor "Avneesh" present: ${realAvneesh ? "YES (" + realAvneesh.email + ")" : "NO"}`);

    const realRahul = await User.findOne({ name: "Rahul Sharma", role: "tutor" });
    console.log(`Real Tutor "Rahul Sharma" present: ${realRahul ? "YES (" + realRahul.email + ")" : "NO"}`);

    const realAmardeep = await User.findOne({ name: "Amardeep Baliyan", role: "tutor" });
    console.log(`Real Tutor "Amardeep Baliyan" present: ${realAmardeep ? "YES (" + realAmardeep.email + ")" : "NO"}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}

executeCleanup();
