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
const Referral = require("../backend/models/Referral");
const ChildProfile = require("../backend/models/ChildProfile");
const ContactMessage = require("../backend/models/ContactMessage");
const Announcement = require("../backend/models/Announcement");
const Blog = require("../backend/models/Blog");

async function audit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB for Detailed Audit\n");

    // 1. Identify target test Users for "Avneesh Chauhan ReportTest"
    const targetTutorUsers = await User.find({
      name: "Avneesh Chauhan ReportTest"
    }).lean();

    const targetUserIds = targetTutorUsers.map(u => u._id);
    const targetUserIdsStr = targetUserIds.map(id => id.toString());

    console.log(`=== TARGET TEST TUTOR USERS ("Avneesh Chauhan ReportTest") ===`);
    console.log(`Count: ${targetTutorUsers.length}`);
    targetTutorUsers.forEach((u, i) => {
      console.log(`  [${i+1}] User ID: ${u._id} | Name: "${u.name}" | Email: "${u.email}" | Role: ${u.role}`);
    });

    // 2. Identify target TutorProfiles for "Avneesh Chauhan ReportTest"
    const targetProfiles = await TutorProfile.find({
      $or: [
        { user: { $in: targetUserIds } },
        { fullName: "Avneesh Chauhan ReportTest" },
        { firstName: "Avneesh Chauhan ReportTest" }
      ]
    }).lean();

    const targetProfileIds = targetProfiles.map(p => p._id);
    const targetProfileIdsStr = targetProfileIds.map(id => id.toString());

    console.log(`\n=== TARGET TEST TUTOR PROFILES ===`);
    console.log(`Count: ${targetProfiles.length}`);
    targetProfiles.forEach((p, i) => {
      console.log(`  [${i+1}] Profile ID: ${p._id} | UserRef: ${p.user} | FullName: "${p.fullName}" | Email: "${p.email}"`);
    });

    // Combined IDs (users and profiles)
    const allTargetIds = [...targetUserIds, ...targetProfileIds];

    // 3. Search for related records in ALL collections
    console.log("\n=== AUDITING RELATED RECORDS IN OTHER COLLECTIONS ===");

    // BookingRequest
    const bookings = await BookingRequest.find({
      $or: [
        { student: { $in: targetUserIds } },
        { tutor: { $in: targetUserIds } },
        { tutorProfile: { $in: targetProfileIds } }
      ]
    }).lean();
    console.log(`BookingRequests found: ${bookings.length}`);
    bookings.forEach(b => console.log(`  - Booking ${b._id}: student=${b.student}, tutor=${b.tutor}, profile=${b.tutorProfile}, status=${b.status}`));

    // ClassSchedule
    const classSchedules = await ClassSchedule.find({
      $or: [
        { student: { $in: targetUserIds } },
        { tutor: { $in: targetUserIds } },
        { tutorProfile: { $in: targetProfileIds } }
      ]
    }).lean();
    console.log(`ClassSchedules found: ${classSchedules.length}`);

    // Notification
    const notifications = await Notification.find({
      $or: [
        { user: { $in: targetUserIds } },
        { sender: { $in: targetUserIds } },
        { recipient: { $in: targetUserIds } }
      ]
    }).lean();
    console.log(`Notifications found: ${notifications.length}`);

    // Review
    const reviews = await Review.find({
      $or: [
        { student: { $in: targetUserIds } },
        { tutor: { $in: targetUserIds } },
        { tutorProfile: { $in: targetProfileIds } }
      ]
    }).lean();
    console.log(`Reviews found: ${reviews.length}`);

    // Attendance
    const attendances = await Attendance.find({
      $or: [
        { student: { $in: targetUserIds } },
        { tutor: { $in: targetUserIds } }
      ]
    }).lean();
    console.log(`Attendances found: ${attendances.length}`);

    // ActivityLog
    const activityLogs = await ActivityLog.find({
      user: { $in: targetUserIds }
    }).lean();
    console.log(`ActivityLogs found: ${activityLogs.length}`);

    // Payment
    const payments = await Payment.find({
      $or: [
        { student: { $in: targetUserIds } },
        { tutor: { $in: targetUserIds } },
        { user: { $in: targetUserIds } }
      ]
    }).lean();
    console.log(`Payments found: ${payments.length}`);

    // PayoutRequest
    const payouts = await PayoutRequest.find({
      $or: [
        { tutor: { $in: targetUserIds } },
        { user: { $in: targetUserIds } }
      ]
    }).lean();
    console.log(`PayoutRequests found: ${payouts.length}`);

    // Certificate & CertificateRequest
    const certs = await Certificate.find({
      $or: [{ student: { $in: targetUserIds } }, { tutor: { $in: targetUserIds } }]
    }).lean();
    const certReqs = await CertificateRequest.find({
      $or: [{ student: { $in: targetUserIds } }, { tutor: { $in: targetUserIds } }]
    }).lean();
    console.log(`Certificates found: ${certs.length}, CertificateRequests found: ${certReqs.length}`);

    // Message
    const messages = await Message.find({
      $or: [{ sender: { $in: targetUserIds } }, { receiver: { $in: targetUserIds } }]
    }).lean();
    console.log(`Messages found: ${messages.length}`);

    // Complaint
    const complaints = await Complaint.find({
      $or: [{ user: { $in: targetUserIds } }, { tutor: { $in: targetUserIds } }]
    }).lean();
    console.log(`Complaints found: ${complaints.length}`);

    // ProgressReport
    const progressReports = await ProgressReport.find({
      $or: [{ student: { $in: targetUserIds } }, { tutor: { $in: targetUserIds } }]
    }).lean();
    console.log(`ProgressReports found: ${progressReports.length}`);

    // StudyMaterial & StudyNote
    const studyMaterials = await StudyMaterial.find({ tutor: { $in: targetUserIds } }).lean();
    const studyNotes = await StudyNote.find({ tutor: { $in: targetUserIds } }).lean();
    console.log(`StudyMaterials: ${studyMaterials.length}, StudyNotes: ${studyNotes.length}`);

    // Transaction
    const transactions = await Transaction.find({ user: { $in: targetUserIds } }).lean();
    console.log(`Transactions found: ${transactions.length}`);

    // Favorites in User model (students who favorited these profiles)
    const userFavorites = await User.find({ favorites: { $in: targetProfileIds } }).lean();
    console.log(`Users with these profiles in favorites: ${userFavorites.length}`);

    console.log("\n=== REAL TUTORS SAFETY AUDIT ===");
    const realAvneesh = await User.find({ name: { $regex: /^avneesh$/i } }).lean();
    console.log(`Real 'Avneesh' users: ${realAvneesh.length}`);
    realAvneesh.forEach(u => console.log(`  - Real Avneesh ID: ${u._id}, Email: ${u.email}`));

    const realRahul = await User.find({ name: "Rahul Sharma" }).lean();
    console.log(`Real 'Rahul Sharma' users: ${realRahul.length}`);
    realRahul.forEach(u => console.log(`  - Real Rahul ID: ${u._id}, Email: ${u.email}`));

    const realAmardeep = await User.find({ name: { $regex: /amardeep/i } }).lean();
    console.log(`Real 'Amardeep' users: ${realAmardeep.length}`);
    realAmardeep.forEach(u => console.log(`  - Real Amardeep ID: ${u._id}, Email: ${u.email}`));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Audit error:", err);
  }
}

audit();
