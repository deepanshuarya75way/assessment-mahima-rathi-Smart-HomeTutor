

const ClassSchedule = require("../models/ClassSchedule");
const BookingRequest = require("../models/BookingRequest");
const User = require("../models/User");
const { createNotification } = require("../utils/notificationHelper");
const { logUserActivity } = require("../utils/activityLogHelper");


exports.createClassSchedule = async (req, res) => {
  try {
    const { studentId, tutorId: requestedTutorId, bookingId, subject, frequency, days, date, startTime, endTime, mode } = req.body;
    
    // Admin can specify tutorId, while Tutor uses their own User ID
    const tutorId = req.user.role === "admin" ? (requestedTutorId || req.user.id) : req.user.id;

    if (!studentId || !tutorId || !subject || !date) {
      return res.status(400).json({ success: false, message: "Student, Tutor, subject, and date are required." });
    }

    const classMode = (mode && ["Online", "Offline"].includes(mode)) ? mode : "Online";

    const schedule = await ClassSchedule.create({
      tutor: tutorId,
      student: studentId,
      booking: bookingId || null,
      subject,
      frequency: frequency || "Weekly",
      days: days || "Mon, Wed",
      date: new Date(date),
      startTime: startTime || "18:00",
      endTime: endTime || "19:00",
      mode: classMode,
      status: "Scheduled",
      attendance: "Pending",
    });

    const dateStr = new Date(date).toLocaleDateString();

    // Send class notification to student
    await createNotification({
      userId: studentId,
      title: "Class Session Scheduled 📅",
      message: `Your upcoming ${classMode} class for ${subject} is scheduled for ${dateStr} at ${startTime || "18:00"}.`,
      type: "class",
      app: req.app,
    });

    // If scheduled by Admin, also notify the Tutor
    if (req.user.role === "admin" && tutorId.toString() !== req.user.id.toString()) {
      await createNotification({
        userId: tutorId,
        title: "New Teaching Session Assigned 🎓",
        message: `Admin scheduled a ${classMode} class for ${subject} on ${dateStr} at ${startTime || "18:00"}.`,
        type: "class",
        app: req.app,
      });
    }

    await logUserActivity(req.user.id, `Scheduled ${classMode} ${subject} class session for ${dateStr}`, req.ip);

    return res.status(201).json({
      success: true,
      message: "Class session scheduled successfully!",
      schedule,
    });
  } catch (err) {
    console.error("Create Schedule Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const { processClassRemindersAndTransitions } = require("../utils/classReminderScheduler");

exports.getSchedules = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Trigger auto-transition check so returned schedules are strictly up-to-date
    await processClassRemindersAndTransitions(req.app).catch(() => {});
    
    let filter = {};
    if (userRole === "tutor") {
      filter = { tutor: userId };
    } else if (userRole === "student") {
      filter = { student: userId };
    }

    if (req.query.type === "regular") {
      filter = {
        ...filter,
        $or: [
          { classType: "regular" },
          { classType: { $ne: "demo" }, isTrial: { $ne: true }, frequency: { $ne: "One-Time" } },
        ],
      };
    } else if (req.query.type === "demo") {
      filter = {
        ...filter,
        $or: [
          { classType: "demo" },
          { isTrial: true },
          { frequency: "One-Time" },
        ],
      };
    }

    const schedules = await ClassSchedule.find(filter)
      .populate("tutor", "name email phone")
      .populate("student", "name email phone")
      .sort({ date: 1, startTime: 1 });

    return res.status(200).json({ success: true, schedules });

  } catch (err) {
    console.error("Get Schedules Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.rescheduleClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime } = req.body;

    const schedule = await ClassSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Class schedule not found." });
    }

    schedule.date = new Date(date);
    if (startTime) schedule.startTime = startTime;
    if (endTime) schedule.endTime = endTime;
    schedule.status = "Rescheduled";
    await schedule.save();

    const recipientId = req.user.role === "tutor" ? schedule.student : schedule.tutor;
    const dateStr = new Date(date).toLocaleDateString();

    await createNotification({
      userId: recipientId,
      title: "Class Rescheduled 🕒",
      message: `The ${schedule.subject} class was rescheduled to ${dateStr} at ${schedule.startTime}.`,
      type: "class",
      app: req.app,
    });

    return res.status(200).json({
      success: true,
      message: "Class session rescheduled successfully!",
      schedule,
    });
  } catch (err) {
    console.error("Reschedule Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.markAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { attendance } = req.body; // Present or Absent

    if (!["Present", "Absent", "Late", "Pending"].includes(attendance)) {
      return res.status(400).json({ success: false, message: "Attendance status must be Present, Absent, Late, or Pending." });
    }

    const schedule = await ClassSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Class schedule not found." });
    }

    schedule.attendance = attendance;
    if (["Present", "Absent", "Late"].includes(attendance)) schedule.status = "Completed";
    await schedule.save();

    await createNotification({
      userId: schedule.student,
      title: "Attendance Recorded 📝",
      message: `Your attendance for ${schedule.subject} was marked as ${attendance}.`,
      type: "class",
      app: req.app,
    });

    await logUserActivity(req.user.id, `Marked student attendance as ${attendance} for ${schedule.subject}`, req.ip);

    return res.status(200).json({
      success: true,
      message: `Student attendance marked as ${attendance}.`,
      schedule,
    });
  } catch (err) {
    console.error("Mark Attendance Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
