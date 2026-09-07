/**
 * ==========================================
 * AUTOMATIC MONTHLY FEE REMINDER SCHEDULER
 * ==========================================
 * Automatically tracks 30-day student fee cycles and delivers
 * persistent MongoDB & real-time Socket.IO notifications to
 * Student and Parent Dashboards.
 */

const User = require("../models/User");
const Payment = require("../models/Payment");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");
const ChildProfile = require("../models/ChildProfile");
const { createNotification } = require("./notificationHelper");

const FEE_CYCLE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FEE_CYCLE_MS = FEE_CYCLE_DAYS * MS_PER_DAY;

/**
 * Calculates the last successful fee payment date or fallback registration date for a student.
 */
const getStudentFeeBaselineDate = async (studentId, createdAt) => {
  // 1. Check Payments collection for completed fee payments
  const lastPayment = await Payment.findOne({
    user: studentId,
    paymentStatus: { $in: ["Success", "Paid"] },
    paymentType: { $in: ["Tuition Fee Payment", "Tuition Invoice Payment"] },
  }).sort({ createdAt: -1 });

  if (lastPayment && lastPayment.createdAt) {
    return new Date(lastPayment.createdAt);
  }

  // 2. Check Transactions collection for completed fee payments
  const lastTransaction = await Transaction.findOne({
    user: studentId,
    type: "Tuition Fee Payment",
    status: "Completed",
  }).sort({ createdAt: -1 });

  if (lastTransaction && lastTransaction.createdAt) {
    return new Date(lastTransaction.createdAt);
  }

  // 3. Fallback to student registration date
  return new Date(createdAt);
};

/**
 * Checks all active student fee cycles and generates non-duplicate notifications
 * for Student and linked Parent dashboards.
 */
const checkAndSendFeeReminders = async (app, customNowDate = null) => {
  try {
    const now = customNowDate ? new Date(customNowDate) : new Date();

    // Find all student users
    const students = await User.find({ role: "student" }).select("_id name email createdAt");
    if (!students || students.length === 0) {
      return { success: true, processedCount: 0, notificationsSent: 0 };
    }

    let notificationsSent = 0;

    for (const student of students) {
      const baselineDate = await getStudentFeeBaselineDate(student._id, student.createdAt);
      const diffMs = now.getTime() - baselineDate.getTime();

      const UPCOMING_THRESHOLD_MS = 27 * MS_PER_DAY; // 3 days before 30-day due date
      if (diffMs < UPCOMING_THRESHOLD_MS) {
        // Fee cycle is still active and not yet approaching due date
        continue;
      }

      // Determine cycle window for current due cycle
      const cyclesElapsed = Math.max(1, Math.floor(diffMs / FEE_CYCLE_MS));
      const cycleStartDate = new Date(baselineDate.getTime() + (cyclesElapsed - 1) * FEE_CYCLE_MS);

      let reminderTitle = "Monthly Fee Due 💳";
      let reminderMessage = "Your monthly tuition fee is due today. Please complete your payment.";

      if (diffMs >= 33 * MS_PER_DAY) {
        // Overdue Fee Reminder (3+ days past due date)
        reminderTitle = "Overdue Fee Reminder ⚠️";
        reminderMessage = "Your monthly tuition fee is overdue. Please complete your payment immediately to avoid service interruption.";
      } else if (diffMs >= 27 * MS_PER_DAY && diffMs < 30 * MS_PER_DAY) {
        // Upcoming Fee Reminder (3 days before due date)
        reminderTitle = "Upcoming Fee Reminder 💳";
        reminderMessage = "Your monthly tuition fee will be due in 3 days. Please prepare your payment.";
      }

      // Duplicate check for this student and stage in current cycle
      const studentDuplicate = await Notification.findOne({
        user: student._id,
        type: "fee",
        title: reminderTitle,
        createdAt: { $gte: cycleStartDate },
      });

      if (!studentDuplicate) {
        // Calling createNotification for student automatically mirrors the fee notification
        // to linked parent(s) via ChildProfile with duplicate prevention and Socket.IO emission
        const studentNotif = await createNotification({
          userId: student._id,
          role: "student",
          title: reminderTitle,
          message: reminderMessage,
          type: "fee",
          actionUrl: "/dashboard/student?tab=payments",
          app,
        });

        if (studentNotif) {
          notificationsSent++;
        }
      }
    }

    return {
      success: true,
      processedCount: students.length,
      notificationsSent,
    };
  } catch (err) {
    console.error("Fee Reminder Scheduler Error:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Initializes background interval scheduler for automatic fee checks.
 */
let schedulerInterval = null;

const initFeeReminderScheduler = (app) => {
  // Run check immediately on server start
  setTimeout(() => {
    checkAndSendFeeReminders(app).catch((err) => {
      console.error("Initial Fee Reminder Check Failed:", err.message);
    });
  }, 3000);

  // Run recurring check every 1 hour (3600000 ms)
  if (!schedulerInterval) {
    schedulerInterval = setInterval(() => {
      checkAndSendFeeReminders(app).catch((err) => {
        console.error("Scheduled Fee Reminder Check Failed:", err.message);
      });
    }, 60 * 60 * 1000);
  }
};

module.exports = {
  checkAndSendFeeReminders,
  initFeeReminderScheduler,
  getStudentFeeBaselineDate,
};
