/**
 * ==========================================
 * AUTOMATIC CLASS REMINDER & EXPIRED CLASS SCHEDULER
 * ==========================================
 * - Sends same-day and 1-hour pre-class notifications to Student & Tutor.
 * - Auto-transitions past/expired classes out of "Scheduled" status.
 * - Saves notifications in MongoDB (for offline users) and emits Socket.IO events (for online users).
 * - Enforces duplicate prevention via remindedToday and remindedOneHour flags.
 */

const ClassSchedule = require("../models/ClassSchedule");
const User = require("../models/User");
const { createNotification } = require("./notificationHelper");

/**
 * Parses date + startTime / endTime string into exact JavaScript Date object.
 */
const parseScheduleTime = (baseDate, timeStr) => {
  const d = new Date(baseDate);
  if (!timeStr) return d;

  const str = String(timeStr).trim();

  // 12-hour format e.g. "06:00 PM" or "6:00PM"
  const twelveMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveMatch) {
    let hours = parseInt(twelveMatch[1], 10);
    const minutes = parseInt(twelveMatch[2], 10);
    const ampm = twelveMatch[3].toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  // 24-hour format e.g. "18:00" or "9:30"
  const twentyFourMatch = str.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    const hours = parseInt(twentyFourMatch[1], 10);
    const minutes = parseInt(twentyFourMatch[2], 10);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  return d;
};

/**
 * Formats time string into clean 12-hour format (e.g. "06:00 PM").
 */
const format12HourTime = (timeStr) => {
  if (!timeStr) return "scheduled time";
  const str = String(timeStr).trim();

  const twelveMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveMatch) return str;

  const twentyFourMatch = str.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    let hours = parseInt(twentyFourMatch[1], 10);
    const minutes = twentyFourMatch[2];
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${formattedHours}:${minutes} ${ampm}`;
  }

  return str;
};

/**
 * Checks whether two Date objects fall on the same calendar day (local time).
 */
const isSameCalendarDay = (d1, d2) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * Core function to check schedules, transition expired ones, and deliver reminders.
 */
const processClassRemindersAndTransitions = async (app, customNow = null) => {
  try {
    const now = customNow ? new Date(customNow) : new Date();

    // 1. AUTO-TRANSITION EXPIRED/PAST CLASSES
    // Find all active schedules (Scheduled or Rescheduled)
    const activeSchedules = await ClassSchedule.find({
      status: { $in: ["Scheduled", "Rescheduled"] },
    })
      .populate("tutor", "name email role")
      .populate("student", "name email role");

    let transitionedCount = 0;
    let sameDayRemindersSent = 0;
    let oneHourRemindersSent = 0;

    for (const schedule of activeSchedules) {
      if (!schedule.date) continue;

      const startDateTime = parseScheduleTime(schedule.date, schedule.startTime || "18:00");
      const endDateTime = parseScheduleTime(schedule.date, schedule.endTime || "19:00");

      // Check if class has ended in the past
      if (now > endDateTime) {
        schedule.status = "Completed";
        if (!schedule.attendance || schedule.attendance === "Pending") {
          schedule.attendance = "Absent";
        }
        await schedule.save();
        transitionedCount++;
        continue; // Skip sending future/upcoming reminders for expired class
      }

      // Skip reminder checks if class is cancelled/discontinued/rejected
      if (["Cancelled", "Discontinued", "Rejected"].includes(schedule.status)) {
        continue;
      }

      const tutorName = schedule.tutor ? (schedule.tutor.name || "Tutor") : "Tutor";
      const studentName = schedule.student ? (schedule.student.name || "Student") : "Student";
      const formattedTime = format12HourTime(schedule.startTime || "18:00");
      const subjectName = schedule.subject || "Tuition";

      // 2. SAME-DAY CLASS REMINDER
      if (
        isSameCalendarDay(now, startDateTime) &&
        now < startDateTime &&
        !schedule.remindedToday
      ) {
        // Send to Student
        if (schedule.student) {
          await createNotification({
            userId: schedule.student._id || schedule.student,
            role: "student",
            title: "Class Session Today! 📅",
            message: `You have a ${subjectName} class today at ${formattedTime} with ${tutorName}.`,
            type: "class",
            actionUrl: "/dashboard/student?tab=classes",
            app,
          });
        }

        // Send to Tutor
        if (schedule.tutor) {
          await createNotification({
            userId: schedule.tutor._id || schedule.tutor,
            role: "tutor",
            title: "Class Session Today! 🎓",
            message: `You have a ${subjectName} class today at ${formattedTime} with ${studentName}.`,
            type: "class",
            actionUrl: "/dashboard/tutor?tab=sessions",
            app,
          });
        }

        schedule.remindedToday = true;
        await schedule.save();
        sameDayRemindersSent++;
      }

      // 3. 1-HOUR-BEFORE CLASS REMINDER
      const diffMs = startDateTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (60 * 1000);

      if (diffMinutes >= 0 && diffMinutes <= 60 && !schedule.remindedOneHour) {
        // Send to Student
        if (schedule.student) {
          await createNotification({
            userId: schedule.student._id || schedule.student,
            role: "student",
            title: "Class Starts in 1 Hour! ⏰",
            message: `Reminder: Your ${subjectName} class with ${tutorName} starts in 1 hour (at ${formattedTime}).`,
            type: "class",
            actionUrl: "/dashboard/student?tab=classes",
            app,
          });
        }

        // Send to Tutor
        if (schedule.tutor) {
          await createNotification({
            userId: schedule.tutor._id || schedule.tutor,
            role: "tutor",
            title: "Class Starts in 1 Hour! ⏰",
            message: `Reminder: Your ${subjectName} class with ${studentName} starts in 1 hour (at ${formattedTime}).`,
            type: "class",
            actionUrl: "/dashboard/tutor?tab=sessions",
            app,
          });
        }

        schedule.remindedOneHour = true;
        await schedule.save();
        oneHourRemindersSent++;
      }
    }

    return {
      success: true,
      transitionedCount,
      sameDayRemindersSent,
      oneHourRemindersSent,
    };
  } catch (err) {
    console.error("Class Reminder Scheduler Error:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Initializes background interval scheduler for automatic class reminders & transitions.
 */
let classSchedulerInterval = null;

const initClassReminderScheduler = (app) => {
  // Initial check 5 seconds after server startup
  setTimeout(() => {
    processClassRemindersAndTransitions(app).catch((err) => {
      console.error("Initial Class Reminder Check Failed:", err.message);
    });
  }, 5000);

  // Recurring check every 3 minutes (180,000 ms)
  if (!classSchedulerInterval) {
    classSchedulerInterval = setInterval(() => {
      processClassRemindersAndTransitions(app).catch((err) => {
        console.error("Scheduled Class Reminder Check Failed:", err.message);
      });
    }, 3 * 60 * 1000);
  }
};

module.exports = {
  processClassRemindersAndTransitions,
  initClassReminderScheduler,
  parseScheduleTime,
  format12HourTime,
  isSameCalendarDay,
};
