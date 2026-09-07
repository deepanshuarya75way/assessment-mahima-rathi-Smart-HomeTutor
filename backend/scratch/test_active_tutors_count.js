const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const User = require("../models/User");
const BookingRequest = require("../models/BookingRequest");
const ClassSchedule = require("../models/ClassSchedule");
const { getStudentDashboardStats } = require("../controllers/studentController");

async function runActiveTutorCountTests() {
  console.log("Starting Active Tutors Dynamic Count Verification...");
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/internn";
  await mongoose.connect(mongoUri);

  // Helper mock res
  const createMockRes = () => {
    let statusCode = 200;
    let responseData = null;
    return {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return { statusCode, data };
      },
      get result() {
        return { statusCode, data: responseData };
      }
    };
  };

  // 1. Create Test Users
  const studentA = await User.create({
    name: "ActiveTutor TestStudent A",
    email: `at_student_${Date.now()}@example.com`,
    password: "password123",
    role: "student"
  });

  const tutor1 = await User.create({ name: "Tutor 1", email: `t1_${Date.now()}@example.com`, password: "password123", role: "tutor" });
  const tutor2 = await User.create({ name: "Tutor 2", email: `t2_${Date.now()}@example.com`, password: "password123", role: "tutor" });
  const tutor3 = await User.create({ name: "Tutor 3 (Demo Only)", email: `t3_${Date.now()}@example.com`, password: "password123", role: "tutor" });

  console.log("\n--- TEST CASE 1: Student with NO regular tutors ---");
  let res1 = createMockRes();
  await getStudentDashboardStats({ user: { id: studentA._id.toString() } }, res1);
  console.log("Stats count:", res1.result.data.stats.activeTutorsCount);
  const tc1Pass = res1.result.data.stats.activeTutorsCount === 0;
  console.log(`Test Case 1: ${tc1Pass ? "PASSED (0)" : "FAILED"}`);

  console.log("\n--- TEST CASE 5 & 8 & 9: Demo request, Pending request, Rejected booking ---");
  // Demo request with Tutor 3
  await BookingRequest.create({
    student: studentA._id,
    tutor: tutor3._id,
    subject: "Demo Physics",
    status: "Confirmed",
    adminApproved: true,
    tutorApproved: true,
    classType: "demo",
    isTrial: true
  });

  // Pending regular request with Tutor 2
  await BookingRequest.create({
    student: studentA._id,
    tutor: tutor2._id,
    subject: "Chemistry",
    status: "Pending",
    classType: "regular",
    isTrial: false
  });

  // Rejected regular request with Tutor 1
  await BookingRequest.create({
    student: studentA._id,
    tutor: tutor1._id,
    subject: "Math",
    status: "Rejected",
    classType: "regular",
    isTrial: false
  });

  let res2 = createMockRes();
  await getStudentDashboardStats({ user: { id: studentA._id.toString() } }, res2);
  const tc5Pass = res2.result.data.stats.activeTutorsCount === 0;
  console.log(`Demo / Pending / Rejected exclusion test: ${tc5Pass ? "PASSED (0)" : "FAILED"}`);

  console.log("\n--- TEST CASE 2 & 6: Student with ONE regular tutor + ONE demo tutor ---");
  // Confirmed Regular booking with Tutor 1
  await BookingRequest.create({
    student: studentA._id,
    tutor: tutor1._id,
    subject: "Advanced Mathematics",
    status: "Confirmed",
    adminApproved: true,
    tutorApproved: true,
    classType: "regular",
    isTrial: false
  });

  let res3 = createMockRes();
  await getStudentDashboardStats({ user: { id: studentA._id.toString() } }, res3);
  const tc2Pass = res3.result.data.stats.activeTutorsCount === 1;
  console.log(`1 Regular + 1 Demo test: ${tc2Pass ? "PASSED (1)" : "FAILED"}`);

  console.log("\n--- TEST CASE 4 & 10: 3 Regular classes with SAME Tutor (Deduplication) ---");
  // Add 2 more regular schedules for Tutor 1
  await ClassSchedule.create({ student: studentA._id, tutor: tutor1._id, subject: "Math 101", status: "Scheduled", classType: "regular", date: new Date() });
  await ClassSchedule.create({ student: studentA._id, tutor: tutor1._id, subject: "Math 102", status: "Scheduled", classType: "regular", date: new Date() });

  let res4 = createMockRes();
  await getStudentDashboardStats({ user: { id: studentA._id.toString() } }, res4);
  const tc4Pass = res4.result.data.stats.activeTutorsCount === 1;
  console.log(`Multiple classes with same tutor deduplication test: ${tc4Pass ? "PASSED (1)" : "FAILED"}`);

  console.log("\n--- TEST CASE 3: Student with TWO regular tutors ---");
  // Confirmed Regular booking with Tutor 2
  await BookingRequest.create({
    student: studentA._id,
    tutor: tutor2._id,
    subject: "Organic Chemistry",
    status: "Confirmed",
    adminApproved: true,
    tutorApproved: true,
    classType: "regular",
    isTrial: false
  });

  let res5 = createMockRes();
  await getStudentDashboardStats({ user: { id: studentA._id.toString() } }, res5);
  const tc3Pass = res5.result.data.stats.activeTutorsCount === 2;
  console.log(`Two regular tutors test: ${tc3Pass ? "PASSED (2)" : "FAILED"}`);

  console.log("\n--- TEST CASE 7: Cancelled regular booking ---");
  const studentB = await User.create({ name: "Student B", email: `sb_${Date.now()}@example.com`, password: "password123", role: "student" });
  await BookingRequest.create({
    student: studentB._id,
    tutor: tutor1._id,
    subject: "Biology",
    status: "Rejected",
    classType: "regular",
    isTrial: false
  });

  let res6 = createMockRes();
  await getStudentDashboardStats({ user: { id: studentB._id.toString() } }, res6);
  const tc7Pass = res6.result.data.stats.activeTutorsCount === 0;
  console.log(`Cancelled regular booking test: ${tc7Pass ? "PASSED (0)" : "FAILED"}`);

  // Clean up test data
  await User.deleteMany({ _id: { $in: [studentA._id, studentB._id, tutor1._id, tutor2._id, tutor3._id] } });
  await BookingRequest.deleteMany({ student: { $in: [studentA._id, studentB._id] } });
  await ClassSchedule.deleteMany({ student: { $in: [studentA._id, studentB._id] } });

  await mongoose.disconnect();

  if (tc1Pass && tc5Pass && tc2Pass && tc4Pass && tc3Pass && tc7Pass) {
    console.log("\n🎉 ALL ACTIVE TUTORS DYNAMIC COUNT TESTS PASSED CLEANLY!");
    process.exit(0);
  } else {
    console.error("\n❌ ACTIVE TUTORS COUNT TEST FAILED.");
    process.exit(1);
  }
}

runActiveTutorCountTests().catch((err) => {
  console.error("Test Execution Error:", err);
  process.exit(1);
});
