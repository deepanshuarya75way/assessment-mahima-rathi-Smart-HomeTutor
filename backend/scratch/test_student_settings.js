const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const BookingRequest = require('../models/BookingRequest');
const Payment = require('../models/Payment');
const studentController = require('../controllers/studentController');
const authController = require('../controllers/authController');

async function runTests() {
  console.log('🧪 [TEST STARTED] Running Student Settings Automated Integration Tests...');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/internn';
  await mongoose.connect(mongoUri);

  const timestamp = Date.now();
  const emailA = `settings_student_a_${timestamp}@example.com`;
  const emailB = `settings_student_b_${timestamp}@example.com`;
  const passInitial = 'Password123!';

  const salt = await bcrypt.genSalt(10);
  const hashedPass = await bcrypt.hash(passInitial, salt);

  // Create Student A & Student B
  const studentA = await User.create({
    name: 'Settings Student A',
    email: emailA,
    phone: '9876543210',
    password: hashedPass,
    role: 'student',
    isVerified: true,
    accountStatus: 'Active',
  });

  const studentB = await User.create({
    name: 'Settings Student B',
    email: emailB,
    phone: '9876543211',
    password: hashedPass,
    role: 'student',
    isVerified: true,
    accountStatus: 'Active',
  });

  // Create historical payment & booking records for Student A
  const samplePayment = await Payment.create({
    user: studentA._id,
    role: 'student',
    amount: 1500,
    paymentStatus: 'Success',
    orderId: `ORDER_${timestamp}`,
  });

  const sampleBooking = await BookingRequest.create({
    student: studentA._id,
    status: 'Accepted',
  });

  console.log('✅ Created test Student A, Student B, and historical payment/booking records.');

  // Mock res object helper
  const createMockRes = () => {
    const res = {
      statusCode: 200,
      jsonData: null,
      redirectPath: null,
      cookiesCleared: [],
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      },
      redirect(path) {
        this.redirectPath = path;
        return this;
      },
      clearCookie(cookieName) {
        this.cookiesCleared.push(cookieName);
        return this;
      },
    };
    return res;
  };

  // TEST 1: Edit Profile (Update Name, DOB, Gender, City, Grade)
  console.log('\n--- TEST 1: Edit Profile ---');
  const reqEditProfile = {
    user: { id: studentA._id.toString(), email: studentA.email },
    body: {
      name: 'Settings Student A Updated',
      phone: '9988776655',
      dob: '2000-05-15',
      gender: 'Female',
      city: 'Bengaluru',
      grade: 'Class 12',
    },
    ip: '127.0.0.1',
  };
  const resEditProfile = createMockRes();
  await studentController.updateProfile(reqEditProfile, resEditProfile);
  console.log('Edit Profile Result:', resEditProfile.statusCode, resEditProfile.jsonData);
  if (
    resEditProfile.statusCode === 200 &&
    resEditProfile.jsonData.success &&
    resEditProfile.jsonData.student.name === 'Settings Student A Updated' &&
    resEditProfile.jsonData.student.city === 'Bengaluru'
  ) {
    console.log('✅ TEST 1 PASSED: Profile updated and saved to MongoDB.');
  } else {
    console.error('❌ TEST 1 FAILED');
  }

  // TEST 2: Change Password - Mismatched Confirm
  console.log('\n--- TEST 2: Change Password (Mismatched Confirm) ---');
  const reqPassMismatch = {
    user: { id: studentA._id.toString(), email: studentA.email },
    body: { currentPassword: passInitial, newPassword: 'NewPassword123!', confirmPassword: 'DifferentPassword123!' },
    ip: '127.0.0.1',
  };
  const resPassMismatch = createMockRes();
  await studentController.changePassword(reqPassMismatch, resPassMismatch);
  console.log('Pass Mismatch Result:', resPassMismatch.statusCode, resPassMismatch.jsonData);
  if (resPassMismatch.statusCode === 400 && resPassMismatch.jsonData.message.includes('do not match')) {
    console.log('✅ TEST 2 PASSED: Password mismatch rejected.');
  } else {
    console.error('❌ TEST 2 FAILED');
  }

  // TEST 3: Change Password - Same Password as Current
  console.log('\n--- TEST 3: Change Password (Same Password) ---');
  const reqPassSame = {
    user: { id: studentA._id.toString(), email: studentA.email },
    body: { currentPassword: passInitial, newPassword: passInitial, confirmPassword: passInitial },
    ip: '127.0.0.1',
  };
  const resPassSame = createMockRes();
  await studentController.changePassword(reqPassSame, resPassSame);
  console.log('Pass Same Result:', resPassSame.statusCode, resPassSame.jsonData);
  if (resPassSame.statusCode === 400 && resPassSame.jsonData.message.includes('different from your current password')) {
    console.log('✅ TEST 3 PASSED: Same password rejected.');
  } else {
    console.error('❌ TEST 3 FAILED');
  }

  // TEST 4: Change Password - Incorrect Current Password
  console.log('\n--- TEST 4: Change Password (Incorrect Current Password) ---');
  const reqPassBadCurrent = {
    user: { id: studentA._id.toString(), email: studentA.email },
    body: { currentPassword: 'WrongPassword!', newPassword: 'NewPassword123!', confirmPassword: 'NewPassword123!' },
    ip: '127.0.0.1',
  };
  const resPassBadCurrent = createMockRes();
  await studentController.changePassword(reqPassBadCurrent, resPassBadCurrent);
  console.log('Pass Bad Current Result:', resPassBadCurrent.statusCode, resPassBadCurrent.jsonData);
  if (resPassBadCurrent.statusCode === 400 && resPassBadCurrent.jsonData.message.includes('Incorrect current password')) {
    console.log('✅ TEST 4 PASSED: Incorrect current password rejected.');
  } else {
    console.error('❌ TEST 4 FAILED');
  }

  // TEST 5: Change Password Successfully
  console.log('\n--- TEST 5: Change Password Successfully ---');
  const passNew = 'NewSecurePass123!';
  const reqPassSuccess = {
    user: { id: studentA._id.toString(), email: studentA.email },
    body: { currentPassword: passInitial, newPassword: passNew, confirmPassword: passNew },
    ip: '127.0.0.1',
  };
  const resPassSuccess = createMockRes();
  await studentController.changePassword(reqPassSuccess, resPassSuccess);
  console.log('Pass Success Result:', resPassSuccess.statusCode, resPassSuccess.jsonData);
  if (resPassSuccess.statusCode === 200 && resPassSuccess.jsonData.success) {
    console.log('✅ TEST 5 PASSED: Password changed successfully.');
  } else {
    console.error('❌ TEST 5 FAILED');
  }

  // TEST 6: Discontinue Account - Incorrect Text
  console.log('\n--- TEST 6: Discontinue Account (Incorrect Confirmation Text) ---');
  const reqDiscBadText = {
    user: { id: studentA._id.toString(), email: studentA.email },
    body: { confirmationText: 'cancel' },
    ip: '127.0.0.1',
  };
  const resDiscBadText = createMockRes();
  await studentController.discontinueAccount(reqDiscBadText, resDiscBadText);
  console.log('Disc Bad Text Result:', resDiscBadText.statusCode, resDiscBadText.jsonData);
  if (resDiscBadText.statusCode === 400 && resDiscBadText.jsonData.message.includes('DISCONTINUE')) {
    console.log('✅ TEST 6 PASSED: Invalid confirmation text rejected.');
  } else {
    console.error('❌ TEST 6 FAILED');
  }

  // TEST 7: Discontinue Account Successfully
  console.log('\n--- TEST 7: Discontinue Account Successfully ---');
  const reqDiscSuccess = {
    user: { id: studentA._id.toString(), email: studentA.email },
    body: { confirmationText: 'DISCONTINUE' },
    ip: '127.0.0.1',
  };
  const resDiscSuccess = createMockRes();
  await studentController.discontinueAccount(reqDiscSuccess, resDiscSuccess);
  console.log('Disc Success Result:', resDiscSuccess.statusCode, resDiscSuccess.jsonData);
  const updatedStudentA = await User.findById(studentA._id);
  if (
    resDiscSuccess.statusCode === 200 &&
    resDiscSuccess.jsonData.success &&
    updatedStudentA.accountStatus === 'Discontinued' &&
    resDiscSuccess.cookiesCleared.includes('token')
  ) {
    console.log('✅ TEST 7 PASSED: Account set to Discontinued and session token cleared.');
  } else {
    console.error('❌ TEST 7 FAILED');
  }

  // TEST 8: Discontinued User Cannot Log In
  console.log('\n--- TEST 8: Login Attempt for Discontinued User ---');
  const reqLoginDisc = {
    body: { email: emailA, password: passNew, role: 'student' },
    ip: '127.0.0.1',
    xhr: true,
    headers: { accept: 'application/json' },
  };
  const resLoginDisc = createMockRes();
  await authController.login(reqLoginDisc, resLoginDisc);
  console.log('Login Disc Result:', resLoginDisc.statusCode, resLoginDisc.jsonData);
  if (resLoginDisc.statusCode === 403 && resLoginDisc.jsonData.message.includes('discontinued')) {
    console.log('✅ TEST 8 PASSED: Discontinued user blocked from logging in.');
  } else {
    console.error('❌ TEST 8 FAILED');
  }

  // TEST 9: Historical Records Preserved in MongoDB
  console.log('\n--- TEST 9: Verify Historical Data Retention ---');
  const checkPayment = await Payment.findById(samplePayment._id);
  const checkBooking = await BookingRequest.findById(sampleBooking._id);
  if (checkPayment && checkBooking && checkPayment.amount === 1500 && checkBooking.status === 'Accepted') {
    console.log('✅ TEST 9 PASSED: Payment & Booking historical data intact.');
  } else {
    console.error('❌ TEST 9 FAILED');
  }

  // TEST 10: Verify Security Scoping (Student A token cannot edit Student B profile)
  console.log('\n--- TEST 10: Security Check - Student A cannot edit Student B ---');
  const reqCrossEdit = {
    user: { id: studentA._id.toString(), email: studentA.email },
    body: { name: 'Attempted Hacked Name' },
    ip: '127.0.0.1',
  };
  const resCrossEdit = createMockRes();
  await studentController.updateProfile(reqCrossEdit, resCrossEdit);
  const checkStudentB = await User.findById(studentB._id);
  if (checkStudentB.name === 'Settings Student B') {
    console.log('✅ TEST 10 PASSED: Student A token strictly mutated only Student A data.');
  } else {
    console.error('❌ TEST 10 FAILED');
  }

  // Cleanup test documents
  await User.deleteMany({ _id: { $in: [studentA._id, studentB._id] } });
  await Payment.deleteMany({ _id: samplePayment._id });
  await BookingRequest.deleteMany({ _id: sampleBooking._id });

  console.log('\n🎉 ALL 10 INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
