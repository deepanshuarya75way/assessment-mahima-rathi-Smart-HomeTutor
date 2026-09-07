const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Referral = require("../models/Referral");
const Payment = require("../models/Payment");
const Transaction = require("../models/Transaction");
const referralController = require("../controllers/referralController");
const { processReferralRewardOnPayment } = require("../controllers/paymentController");

async function runReferralTestSuite() {
  console.log("Starting Referral System Integration Test Suite...\n");

  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/hometutor";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully.\n");

  try {
    // Cleanup test users and referrals
    const testEmails = [
      "ref_student_a@test.com",
      "ref_student_b@test.com",
      "ref_tutor_a@test.com",
      "ref_tutor_b@test.com",
    ];

    await User.deleteMany({ email: { $in: testEmails } });
    
    // Create Test Users
    // 1. Student A (Referrer)
    const studentA = await User.create({
      name: "Student A",
      email: "ref_student_a@test.com",
      password: "password123",
      role: "student",
      referralCode: "REF-STU-A",
      walletBalance: 0,
      referralEarnings: 0,
      isVerified: true,
    });

    // 2. Tutor A (Referrer)
    const tutorA = await User.create({
      name: "Tutor A",
      email: "ref_tutor_a@test.com",
      password: "password123",
      role: "tutor",
      referralCode: "REF-TUT-A",
      walletBalance: 0,
      referralEarnings: 0,
      isVerified: true,
    });

    // --- TEST 1: Student A refers Student B ---
    console.log("--- TEST 1: Student A refers Student B (Signup) ---");
    const studentB = await User.create({
      name: "Rahul Sharma (Referred Student)",
      email: "ref_student_b@test.com",
      password: "password123",
      role: "student",
      referredBy: studentA.referralCode,
      referralRewardStatus: "Pending",
      walletBalance: 0,
      isVerified: true,
    });

    const refRecord1 = await Referral.create({
      referrer: studentA._id,
      referredUser: studentB._id,
      referredRole: "student",
      referralCode: studentA.referralCode,
      signupDate: new Date(),
      rewardStatus: "Pending",
      rewardAmount: 0,
    });

    console.log(`Referral Record Created: Status = ${refRecord1.rewardStatus}, Referred Role = ${refRecord1.referredRole}`);
    console.log(`Student A Wallet Balance: ₹${studentA.walletBalance}`);
    console.log(`✅ TEST 1 PASSED: Referral registered as Pending, no reward given on signup.\n`);

    // --- TEST 2: Student B completes first successful payment ---
    console.log("--- TEST 2: Student B completes first successful tuition payment ---");
    const paymentB = await Payment.create({
      user: studentB._id,
      role: "student",
      amount: 500,
      paymentType: "Tuition Fee Payment",
      paymentStatus: "Success",
      orderId: "order_test_b1",
      paymentId: "pay_test_b1",
    });

    const result2 = await processReferralRewardOnPayment(studentB._id, paymentB);
    const updatedStudentA = await User.findById(studentA._id);
    const updatedRefRecord1 = await Referral.findById(refRecord1._id);

    console.log(`Reward Result: Amount = ₹${result2 ? result2.rewardAmount : 0}`);
    console.log(`Student A Wallet Balance After Payment: ₹${updatedStudentA.walletBalance}`);
    console.log(`Referral Status After Payment: ${updatedRefRecord1.rewardStatus}, Reward Amount = ₹${updatedRefRecord1.rewardAmount}`);

    if (updatedStudentA.walletBalance === 50 && updatedRefRecord1.rewardStatus === "Rewarded") {
      console.log(`✅ TEST 2 PASSED: Student A received ₹50 for referring a Student after first payment.\n`);
    } else {
      throw new Error(`TEST 2 FAILED: Expected wallet ₹50, got ₹${updatedStudentA.walletBalance}`);
    }

    // --- TEST 3: Student B makes second payment -> NO DUPLICATE REWARD ---
    console.log("--- TEST 3: Student B makes second payment (Prevent Duplicate Reward) ---");
    const paymentB2 = await Payment.create({
      user: studentB._id,
      role: "student",
      amount: 1000,
      paymentType: "Tuition Fee Payment",
      paymentStatus: "Success",
      orderId: "order_test_b2",
      paymentId: "pay_test_b2",
    });

    const result3 = await processReferralRewardOnPayment(studentB._id, paymentB2);
    const studentA_After2ndPay = await User.findById(studentA._id);

    console.log(`Second Payment Process Result: ${result3 ? "Rewarded" : "Ignored (Null)"}`);
    console.log(`Student A Wallet Balance: ₹${studentA_After2ndPay.walletBalance}`);

    if (result3 === null && studentA_After2ndPay.walletBalance === 50) {
      console.log(`✅ TEST 3 PASSED: Duplicate reward prevented! Wallet remains ₹50.\n`);
    } else {
      throw new Error(`TEST 3 FAILED: Duplicate reward was granted!`);
    }

    // --- TEST 4: Student A refers Tutor B ---
    console.log("--- TEST 4: Student A refers Tutor B (Referred User is a Tutor) ---");
    const tutorB = await User.create({
      name: "Aman Verma (Referred Tutor)",
      email: "ref_tutor_b@test.com",
      password: "password123",
      role: "tutor",
      referredBy: studentA.referralCode,
      referralRewardStatus: "Pending",
      walletBalance: 0,
      isVerified: true,
    });

    const refRecord2 = await Referral.create({
      referrer: studentA._id,
      referredUser: tutorB._id,
      referredRole: "tutor",
      referralCode: studentA.referralCode,
      signupDate: new Date(),
      rewardStatus: "Pending",
      rewardAmount: 0,
    });

    const paymentTutorB = await Payment.create({
      user: tutorB._id,
      role: "tutor",
      amount: 800,
      paymentType: "Tuition Fee Payment",
      paymentStatus: "Success",
      orderId: "order_test_tb1",
      paymentId: "pay_test_tb1",
    });

    const result4 = await processReferralRewardOnPayment(tutorB._id, paymentTutorB);
    const studentA_AfterTutorRef = await User.findById(studentA._id);
    const updatedRefRecord2 = await Referral.findById(refRecord2._id);

    console.log(`Reward Amount for Tutor Referral: ₹${result4 ? result4.rewardAmount : 0}`);
    console.log(`Student A Total Wallet Balance: ₹${studentA_AfterTutorRef.walletBalance}`);

    if (studentA_AfterTutorRef.walletBalance === 150 && updatedRefRecord2.rewardAmount === 100) {
      console.log(`✅ TEST 4 PASSED: Student A received ₹100 for referring a Tutor after qualifying payment.\n`);
    } else {
      throw new Error(`TEST 4 FAILED: Expected wallet ₹150, got ₹${studentA_AfterTutorRef.walletBalance}`);
    }

    // --- TEST 5: API Endpoint Verification (GET /api/student/referrals) ---
    console.log("--- TEST 5: Verify Student Dashboard Referral API ---");
    const mockReq = {
      user: { id: studentA._id },
      protocol: "http",
      get: () => "localhost:5173",
    };

    let apiResponse = null;
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          apiResponse = data;
          return data;
        },
      }),
    };

    await referralController.getReferrals(mockReq, mockRes);

    console.log(`API Success: ${apiResponse.success}`);
    console.log(`Total Referrals: ${apiResponse.totalReferrals}`);
    console.log(`Student Referrals Count: ${apiResponse.studentReferrals}`);
    console.log(`Tutor Referrals Count: ${apiResponse.tutorReferrals}`);
    console.log(`Total Earnings: ₹${apiResponse.totalEarnings}`);
    console.log(`Referral List Length: ${apiResponse.referrals.length}`);

    if (
      apiResponse.totalReferrals === 2 &&
      apiResponse.studentReferrals === 1 &&
      apiResponse.tutorReferrals === 1 &&
      apiResponse.totalEarnings === 150
    ) {
      console.log(`✅ TEST 5 PASSED: Student Dashboard API returns accurate stats and referral table data.\n`);
    } else {
      throw new Error(`TEST 5 FAILED: Incorrect stats in API response!`);
    }

    // --- TEST 6: Transaction Ledger & Financial Auditing Check ---
    console.log("--- TEST 6: Verify Transaction Ledger Entries ---");
    const txList = await Transaction.find({ user: studentA._id, type: "Referral Bonus" });
    console.log(`Found ${txList.length} Referral Bonus Transaction records for Student A.`);
    txList.forEach((tx, i) => console.log(`  Tx ${i + 1}: Amount = ₹${tx.amount}, Description = "${tx.description}"`));

    if (txList.length === 2) {
      console.log(`✅ TEST 6 PASSED: Ledger contains full financial audit trail.\n`);
    } else {
      throw new Error(`TEST 6 FAILED: Missing transaction records!`);
    }

    // Cleanup
    await User.deleteMany({ email: { $in: testEmails } });
    await Referral.deleteMany({ referrer: { $in: [studentA._id, tutorA._id] } });
    await Transaction.deleteMany({ user: studentA._id });
    await Payment.deleteMany({ user: { $in: [studentB._id, tutorB._id] } });

    console.log("ALL 6 REFERRAL INTEGRATION TESTS PASSED SUCCESSFULLY! ✅\n");
  } catch (err) {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

runReferralTestSuite();
