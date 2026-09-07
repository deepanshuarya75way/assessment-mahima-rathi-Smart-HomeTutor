const ClassSchedule = require("../models/ClassSchedule");
const BookingRequest = require("../models/BookingRequest");
const User = require("../models/User");
const TutorProfile = require("../models/TutorProfile");
const { createNotification } = require("./notificationHelper");
const { logUserActivity } = require("./activityLogHelper");

/**
 * Automatically creates ONE non-recurring Demo Class Schedule
 * ONLY when both Admin and Tutor have approved the demo request.
 * Enforces backend-side idempotency to prevent duplicate schedules.
 */
exports.createDemoClassScheduleIfBothApproved = async (bookingId, app = null) => {
  try {
    const booking = await BookingRequest.findById(bookingId)
      .populate("student", "name email")
      .populate("tutor", "name email")
      .populate("tutorProfile", "subjects primarySubject");

    if (!booking) return null;

    // RULE 4: Demo class created ONLY when adminApproved === true && tutorApproved === true
    if (!booking.adminApproved || !booking.tutorApproved) {
      return null;
    }

    // RULE 5: Backend Duplicate Protection — check if a demo schedule already exists
    const existingSchedule = await ClassSchedule.findOne({
      $or: [
        { booking: booking._id },
        {
          student: booking.student._id || booking.student,
          tutor: booking.tutor._id || booking.tutor,
          $or: [{ classType: "demo" }, { isTrial: true }],
        },
      ],
    });

    if (existingSchedule) {
      // Ensure booking status is marked Confirmed
      if (booking.status !== "Confirmed" && booking.status !== "Approved" && booking.status !== "Accepted") {
        booking.status = "Confirmed";
        await booking.save();
      }
      return existingSchedule;
    }

    // Determine subject name
    let subjectName = "Demo Session";
    if (booking.tutorProfile && Array.isArray(booking.tutorProfile.subjects) && booking.tutorProfile.subjects.length > 0) {
      subjectName = booking.tutorProfile.subjects.filter(Boolean).join(", ");
    } else if (booking.tutorProfile && booking.tutorProfile.primarySubject) {
      subjectName = booking.tutorProfile.primarySubject;
    }

    // Use the exact date and slot configured or scheduled in booking
    const demoDate = booking.scheduledDate || booking.date || new Date(Date.now() + 86400000);
    const demoStartTime = booking.scheduledStartTime || "18:00";
    const demoEndTime = booking.scheduledEndTime || "19:00";

    const newDemoSchedule = await ClassSchedule.create({
      tutor: booking.tutor._id || booking.tutor,
      student: booking.student._id || booking.student,
      booking: booking._id,
      subject: subjectName,
      date: demoDate,
      startTime: demoStartTime,
      endTime: demoEndTime,
      frequency: "One-Time",
      days: "One-Time Session",
      mode: booking.isHomeVisit ? "Offline" : "Online",
      classType: "demo",
      isRecurring: false,
      isTrial: true,
      status: "Scheduled",
      attendance: "Pending",
    });

    // Update booking status
    booking.status = "Confirmed";
    await booking.save();

    const studentName = booking.student ? (booking.student.name || "Student") : "Student";
    const tutorName = booking.tutor ? (booking.tutor.name || "Tutor") : "Tutor";
    const formattedDate = demoDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    const timeDisplay = demoEndTime ? `${demoStartTime} – ${demoEndTime}` : demoStartTime;

    // Notify Student
    if (booking.student) {
      await createNotification({
        userId: booking.student._id || booking.student,
        title: "Demo Class Scheduled! 🎉",
        message: `Your 1-on-1 trial demo class with ${tutorName} for ${subjectName} is confirmed for ${formattedDate} at ${timeDisplay} (${newDemoSchedule.mode}).`,
        type: "booking",
        actionUrl: "/dashboard/student?tab=classes",
        app,
      });
    }

    // Notify Tutor
    if (booking.tutor) {
      await createNotification({
        userId: booking.tutor._id || booking.tutor,
        title: "Demo Class Scheduled! 🎓",
        message: `Demo class with ${studentName} for ${subjectName} is confirmed for ${formattedDate} at ${timeDisplay} (${newDemoSchedule.mode}).`,
        type: "booking",
        actionUrl: "/dashboard/tutor?tab=sessions",
        app,
      });
    }

    await logUserActivity(
      booking.student._id || booking.student,
      `Demo class schedule created for ${studentName} with ${tutorName} (${newDemoSchedule.mode})`,
      "127.0.0.1"
    );

    return newDemoSchedule;
  } catch (err) {
    console.error("Create Demo Class Schedule Error:", err);
    return null;
  }
};
