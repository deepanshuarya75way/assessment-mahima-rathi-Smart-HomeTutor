const mongoose = require('mongoose');

// Mock or test schedule controller logic
const ClassSchedule = require('../models/ClassSchedule');
const BookingRequest = require('../models/BookingRequest');

async function testLogic() {
  console.log('Testing Demo Isolation Logic...');

  // 1. Verify schema defaults & values
  const demoScheduleData = {
    tutorId: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    subject: 'Mathematics',
    grade: 'Grade 10',
    mode: 'online',
    frequency: 'One-Time',
    days: ['Wed'],
    startTime: '05:00 PM',
    endTime: '06:00 PM',
    isTrial: true,
    classType: 'demo',
    status: 'Scheduled',
    ratePerHr: 0,
    hourlyRate: 0
  };

  const regularScheduleData = {
    tutorId: demoScheduleData.tutorId,
    studentId: demoScheduleData.studentId,
    subject: 'Mathematics',
    grade: 'Grade 10',
    mode: 'online',
    frequency: 'Weekly',
    days: ['Mon', 'Wed'],
    startTime: '05:00 PM',
    endTime: '06:00 PM',
    isTrial: false,
    classType: 'regular',
    status: 'Scheduled',
    ratePerHr: 500,
    hourlyRate: 500
  };

  // Check query filter logic
  const typeFilterRegular = {
    $or: [
      { classType: 'regular' },
      { classType: { $exists: false }, isTrial: { $ne: true }, frequency: { $ne: 'One-Time' } }
    ]
  };

  const typeFilterDemo = {
    $or: [
      { classType: 'demo' },
      { isTrial: true },
      { frequency: 'One-Time' }
    ]
  };

  // Test filter matching rules
  const matchesDemoFilter = (doc) => {
    return doc.classType === 'demo' || doc.isTrial === true || doc.frequency === 'One-Time';
  };

  const matchesRegularFilter = (doc) => {
    if (doc.classType === 'regular') return true;
    if (!doc.classType && !doc.isTrial && doc.frequency !== 'One-Time') return true;
    return false;
  };

  // Assertions
  if (matchesDemoFilter(demoScheduleData) && !matchesRegularFilter(demoScheduleData)) {
    console.log('PASS: Demo schedule correctly matches demo filter and is excluded from regular filter');
  } else {
    console.error('FAIL: Demo schedule filter mismatch', demoScheduleData);
    process.exit(1);
  }

  if (matchesRegularFilter(regularScheduleData) && !matchesDemoFilter(regularScheduleData)) {
    console.log('PASS: Regular schedule correctly matches regular filter and is excluded from demo filter');
  } else {
    console.error('FAIL: Regular schedule filter mismatch', regularScheduleData);
    process.exit(1);
  }

  console.log('ALL TESTS PASSED!');
}

testLogic();
