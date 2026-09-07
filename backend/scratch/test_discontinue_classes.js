const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const BookingRequest = require('../models/BookingRequest');
const ClassSchedule = require('../models/ClassSchedule');
const Payment = require('../models/Payment');
const studentController = require('../controllers/studentController');

async function runTests() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/internn');
    console.log('Connected to MongoDB');

    // Create test student
    const studentEmail = `teststudent_${Date.now()}@example.com`;
    const student = await User.create({
      name: 'Test Student Discontinue',
      email: studentEmail,
      password: 'password123',
      role: 'student',
      accountStatus: 'Active',
    });

    // Create test tutor A
    const tutorA = await User.create({
      name: 'Avneesh Chauhan',
      email: `tutorA_${Date.now()}@example.com`,
      password: 'password123',
      role: 'tutor',
    });
    const tutorProfileA = await TutorProfile.create({
      user: tutorA._id,
      primarySubject: 'Mathematics',
      hourlyRate: 600,
    });

    // Create test tutor B
    const tutorB = await User.create({
      name: 'Amardeep Baliyan',
      email: `tutorB_${Date.now()}@example.com`,
      password: 'password123',
      role: 'tutor',
    });
    const tutorProfileB = await TutorProfile.create({
      user: tutorB._id,
      primarySubject: 'Science',
      hourlyRate: 700,
    });

    // Active regular booking for Tutor A
    const bookingA = await BookingRequest.create({
      student: student._id,
      tutor: tutorA._id,
      tutorProfile: tutorProfileA._id,
      isTrial: false,
      classType: 'regular',
      status: 'Confirmed',
    });

    // Upcoming & completed class for Tutor A
    const completedClassA = await ClassSchedule.create({
      student: student._id,
      tutor: tutorA._id,
      booking: bookingA._id,
      subject: 'Mathematics',
      date: new Date(),
      status: 'Completed',
    });
    const upcomingClassA = await ClassSchedule.create({
      student: student._id,
      tutor: tutorA._id,
      booking: bookingA._id,
      subject: 'Mathematics',
      date: new Date(Date.now() + 86400000),
      status: 'Scheduled',
    });

    // Active regular booking for Tutor B
    const bookingB = await BookingRequest.create({
      student: student._id,
      tutor: tutorB._id,
      tutorProfile: tutorProfileB._id,
      isTrial: false,
      classType: 'regular',
      status: 'Confirmed',
      isChatUnlocked: true,
    });
    const upcomingClassB = await ClassSchedule.create({
      student: student._id,
      tutor: tutorB._id,
      booking: bookingB._id,
      subject: 'Science',
      date: new Date(Date.now() + 86400000),
      status: 'Scheduled',
    });

    // Payment history record for Tutor A
    const paymentA = await Payment.create({
      orderId: `ORD_${Date.now()}`,
      role: 'student',
      user: student._id,
      tutor: tutorA._id,
      booking: bookingA._id,
      amount: 600,
      paymentStatus: 'Paid',
      paymentType: 'Tuition Fee Payment',
    });

    // Test 1: Fetch active tutors for student
    let mockReq = { user: { id: student._id.toString() }, app: { get: () => null } };
    let mockRes = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };

    await studentController.getMyTutors(mockReq, mockRes);
    console.log('--- TEST 1: Active Tutors Count Before Discontinuation ---');
    console.log('StatusCode:', mockRes.statusCode);
    console.log('Tutors returned:', mockRes.data.tutors.map(t => t.name));
    if (mockRes.data.count !== 2) throw new Error('Expected 2 active tutors');

    // Test 2: Discontinue classes with Tutor A ONLY
    mockReq = {
      user: { id: student._id.toString() },
      body: { tutorId: tutorA._id.toString(), reason: 'Schedule conflict' },
      ip: '127.0.0.1',
      app: { get: () => null }
    };
    mockRes = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };

    await studentController.discontinueClass(mockReq, mockRes);
    console.log('--- TEST 2: Discontinue Regular Classes for Tutor A ---');
    console.log('StatusCode:', mockRes.statusCode);
    console.log('Message:', mockRes.data.message);

    // Test 3: Verify Student Account remains Active
    const updatedStudent = await User.findById(student._id);
    console.log('Student Account Status:', updatedStudent.accountStatus);
    if (updatedStudent.accountStatus !== 'Active') throw new Error('Student account status should remain Active!');

    // Test 4: Verify Tutor A booking is Discontinued & upcoming class is Cancelled
    const updatedBookingA = await BookingRequest.findById(bookingA._id);
    const updatedUpcomingA = await ClassSchedule.findById(upcomingClassA._id);
    const updatedCompletedA = await ClassSchedule.findById(completedClassA._id);
    const preservedPaymentA = await Payment.findById(paymentA._id);

    console.log('Booking A Status:', updatedBookingA.status);
    console.log('Upcoming Class A Status:', updatedUpcomingA.status);
    console.log('Completed Class A Status (Preserved):', updatedCompletedA.status);
    console.log('Payment A Status (Preserved):', preservedPaymentA.paymentStatus);

    if (updatedBookingA.status !== 'Discontinued') throw new Error('Booking A should be Discontinued');
    if (updatedUpcomingA.status !== 'Cancelled') throw new Error('Upcoming Class A should be Cancelled');
    if (updatedCompletedA.status !== 'Completed') throw new Error('Completed Class A must remain Completed');
    if (preservedPaymentA.paymentStatus !== 'Paid') throw new Error('Payment record must remain Paid');

    // Test 5: Verify Tutor B regular classes remain completely unaffected (Active & Scheduled)
    const updatedBookingB = await BookingRequest.findById(bookingB._id);
    const updatedUpcomingB = await ClassSchedule.findById(upcomingClassB._id);
    console.log('Tutor B Booking Status (Unaffected):', updatedBookingB.status);
    console.log('Tutor B Upcoming Class Status (Unaffected):', updatedUpcomingB.status);
    if (updatedBookingB.status !== 'Confirmed') throw new Error('Tutor B booking should remain Confirmed');

    // Test 6: Verify Active Tutors Count now shows 1 (Tutor B only)
    mockReq = { user: { id: student._id.toString() }, app: { get: () => null } };
    mockRes = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await studentController.getMyTutors(mockReq, mockRes);
    console.log('--- TEST 6: Active Tutors Count After Disconnecting Tutor A ---');
    console.log('StatusCode:', mockRes.statusCode);
    console.log('Tutors returned:', mockRes.data.tutors.map(t => t.name));
    if (mockRes.data.count !== 1) throw new Error('Expected 1 active tutor remaining');

    // Clean up test data
    await User.deleteMany({ _id: { $in: [student._id, tutorA._id, tutorB._id] } });
    await TutorProfile.deleteMany({ _id: { $in: [tutorProfileA._id, tutorProfileB._id] } });
    await BookingRequest.deleteMany({ _id: { $in: [bookingA._id, bookingB._id] } });
    await ClassSchedule.deleteMany({ _id: { $in: [completedClassA._id, upcomingClassA._id, upcomingClassB._id] } });
    await Payment.deleteMany({ _id: paymentA._id });

    console.log('\nALL 6 DISCONTINUATION TESTS PASSED SUCCESSFULLY! ✅');
  } catch (err) {
    console.error('TEST ERROR:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
