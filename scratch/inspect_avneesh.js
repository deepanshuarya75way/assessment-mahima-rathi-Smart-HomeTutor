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

async function inspect() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log("Connected to DB");

    // Find all users with Avneesh or ReportTest in name
    const users = await User.find({
      $or: [
        { name: { $regex: /avneesh/i } },
        { name: { $regex: /reporttest/i } },
        { email: { $regex: /avneesh/i } },
        { email: { $regex: /reporttest/i } }
      ]
    }).lean();

    console.log(`\n=== USERS MATCHING 'Avneesh' or 'ReportTest' (${users.length} found) ===`);
    users.forEach((u, i) => {
      console.log(`[${i+1}] ID: ${u._id} | Name: "${u.name}" | Email: "${u.email}" | Role: ${u.role} | Status: ${u.tutorStatus}`);
    });

    // Find all tutor profiles with Avneesh or ReportTest
    const tutorProfiles = await TutorProfile.find({
      $or: [
        { fullName: { $regex: /avneesh/i } },
        { firstName: { $regex: /avneesh/i } },
        { lastName: { $regex: /avneesh/i } },
        { fullName: { $regex: /reporttest/i } },
        { email: { $regex: /avneesh/i } },
        { email: { $regex: /reporttest/i } }
      ]
    }).lean();

    console.log(`\n=== TUTOR PROFILES MATCHING 'Avneesh' or 'ReportTest' (${tutorProfiles.length} found) ===`);
    tutorProfiles.forEach((tp, i) => {
      console.log(`[${i+1}] ID: ${tp._id} | UserRef: ${tp.user} | FullName: "${tp.fullName}" | FirstName: "${tp.firstName}" | LastName: "${tp.lastName}" | Email: "${tp.email}" | Qualification: "${tp.qualification}"`);
    });

    // Let's inspect all users with role 'tutor'
    const allTutorUsers = await User.find({ role: "tutor" }).lean();
    console.log(`\n=== ALL TUTOR USERS IN DB (${allTutorUsers.length}) ===`);
    allTutorUsers.forEach((u, i) => {
      console.log(`[${i+1}] ID: ${u._id} | Name: "${u.name}" | Email: "${u.email}"`);
    });

    // Let's inspect all Tutor Profiles
    const allTutorProfiles = await TutorProfile.find().lean();
    console.log(`\n=== ALL TUTOR PROFILES IN DB (${allTutorProfiles.length}) ===`);
    allTutorProfiles.forEach((tp, i) => {
      console.log(`[${i+1}] ID: ${tp._id} | UserRef: ${tp.user} | Name: "${tp.fullName || (tp.firstName + ' ' + tp.lastName)}" | Email: "${tp.email}"`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error inspecting:", err);
  }
}

inspect();
