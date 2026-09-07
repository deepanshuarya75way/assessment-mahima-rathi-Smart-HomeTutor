

const BookingRequest = require("../models/BookingRequest");
const ClassSchedule = require("../models/ClassSchedule");
const mongoose = require("mongoose");
const { parseScheduleTime, format12HourTime } = require("../utils/classReminderScheduler");

async function findBookingOrSchedule(sessionId) {
  if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) return null;

  let booking = await BookingRequest.findById(sessionId)
    .populate("student", "name email role")
    .populate("tutor", "name email role")
    .populate({
      path: "tutorProfile",
      select: "subjects qualification fee user",
      populate: { path: "user", select: "name email role" },
    });

  if (booking) {
    if (!booking.tutor && booking.tutorProfile?.user) {
      booking.tutor = booking.tutorProfile.user;
    }
    return booking;
  }

  const schedule = await ClassSchedule.findById(sessionId)
    .populate("student", "name email role")
    .populate("tutor", "name email role");

  if (schedule) {
    const studentObj = (schedule.student && typeof schedule.student === "object")
      ? schedule.student
      : { _id: schedule.student, name: "Student", email: "", role: "student" };

    const tutorObj = (schedule.tutor && typeof schedule.tutor === "object")
      ? schedule.tutor
      : { _id: schedule.tutor, name: "Tutor", email: "", role: "tutor" };

    return {
      _id: schedule._id,
      student: studentObj,
      tutor: tutorObj,
      status: schedule.status,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      classType: schedule.classType,
      isTrial: schedule.isTrial,
      booking: schedule.booking,
      tutorProfile: {
        subjects: [schedule.subject || "Tuition Session"],
      },
      subject: schedule.subject || "Tuition Session",
      mode: schedule.mode || "Online",
    };
  }

  return null;
}

function validateSessionTimeAndStatus(session, isAdmin = false) {
  if (!session) {
    return { valid: false, message: "Class session not found." };
  }

  // 1. Inactive status checks
  const inactiveStatuses = ["Completed", "Cancelled", "Rejected", "Rejected by Admin", "Rejected by Tutor", "Discontinued", "Missed"];
  if (inactiveStatuses.includes(session.status)) {
    return {
      valid: false,
      message: session.status === "Completed"
        ? "This demo class session has already ended and is marked Completed."
        : `This class session is no longer active (Status: ${session.status}).`,
    };
  }

  const validStatuses = ["Accepted", "Confirmed", "Approved", "Scheduled", "Rescheduled", "In Progress"];
  const isStatusAllowed = validStatuses.includes(session.status) || (session.adminApproved && session.tutorApproved);
  if (!isStatusAllowed) {
    return { valid: false, message: "Video call is unavailable. The class session or booking request must be active." };
  }

  // Admin bypasses time restrictions for inspection
  if (isAdmin) {
    return { valid: true };
  }

  // 2. Date and Time Slot validation
  const sessionDate = session.date || session.scheduledDate;
  const startTimeStr = session.startTime || session.scheduledStartTime;
  const endTimeStr = session.endTime || session.scheduledEndTime;

  if (sessionDate && startTimeStr) {
    const startDateTime = parseScheduleTime(sessionDate, startTimeStr);
    const endDateTime = endTimeStr ? parseScheduleTime(sessionDate, endTimeStr) : new Date(startDateTime.getTime() + 60 * 60 * 1000);
    const now = new Date();

    // Allow joining starting 15 minutes before scheduled start time
    const joinWindowStart = new Date(startDateTime.getTime() - 15 * 60 * 1000);
    // Allow joining up to 2 hours past scheduled end time
    const joinWindowEnd = new Date(endDateTime.getTime() + 2 * 60 * 60 * 1000);

    const formattedDate = new Date(sessionDate).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const formattedStartTime = format12HourTime(startTimeStr);

    if (now < joinWindowStart) {
      return {
        valid: false,
        message: `This demo class is scheduled for ${formattedDate} at ${formattedStartTime}. You can start/join 15 minutes before the scheduled time.`,
        scheduledDate: formattedDate,
        scheduledStartTime: formattedStartTime,
        tooEarly: true,
      };
    }

    if (now > joinWindowEnd) {
      return {
        valid: false,
        message: `The scheduled time for this class (${formattedDate} at ${formattedStartTime}) has passed.`,
        tooLate: true,
      };
    }
  }

  return { valid: true };
}

exports.renderVideoCall = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).redirect(
        `/dashboard?error=${encodeURIComponent("Invalid video call session ID.")}`
      );
    }

    const booking = await findBookingOrSchedule(bookingId);

    if (!booking) {
      return res.status(404).redirect(
        `/dashboard?error=${encodeURIComponent("Class session or booking request not found.")}`
      );
    }

    const isAdmin = req.user?.role === "admin";
    const validation = validateSessionTimeAndStatus(booking, isAdmin);
    if (!validation.valid) {
      const userRole = req.user?.role || "user";
      return res.status(403).redirect(
        `/dashboard/${userRole}?error=${encodeURIComponent(validation.message)}`
      );
    }

    const userIdStr = (req.user?.id || req.user?._id || "").toString();
    const studentIdStr = (booking.student?._id || booking.student || "").toString();
    const tutorIdStr = (booking.tutor?._id || booking.tutor || "").toString();

    if (userIdStr !== studentIdStr && userIdStr !== tutorIdStr && !isAdmin) {
      const userRole = req.user?.role || "user";
      return res.status(403).redirect(
        `/dashboard/${userRole}?error=${encodeURIComponent(
          "Unauthorized Access: You are not a participant in this video call session."
        )}`
      );
    }

    const isStudent = userIdStr === studentIdStr;
    const peerUser = isStudent ? booking.tutor : booking.student;
    const peerRole = isStudent ? "Tutor" : "Student";
    const peerName = (peerUser && (peerUser.name || peerUser.email)) ? (peerUser.name || peerUser.email) : peerRole;
    const peerId = (peerUser && (peerUser._id || peerUser.id)) ? (peerUser._id || peerUser.id).toString() : "";

    return res.render("video-call", {
      bookingId: booking._id.toString(),
      roomId: `room_${booking._id.toString()}`,
      user: req.user,
      peerUser: {
        id: peerId,
        name: peerName,
        email: peerUser?.email || "",
        role: peerRole,
      },
      tutorProfile: booking.tutorProfile || {},
      isStudent: isStudent,
    });
  } catch (error) {
    console.error("Render Video Call Error:", error);
    return res.status(500).redirect(
      `/dashboard?error=${encodeURIComponent("Server error occurred while preparing video call.")}`
    );
  }
};

exports.getVideoCallStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid session ID." });
    }

    const booking = await findBookingOrSchedule(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Class session not found." });
    }

    const isAdmin = req.user?.role === "admin";
    const validation = validateSessionTimeAndStatus(booking, isAdmin);
    const userIdStr = (req.user?.id || req.user?._id || "").toString();
    const studentIdStr = (booking.student?._id || booking.student || "").toString();
    const tutorIdStr = (booking.tutor?._id || booking.tutor || "").toString();
    const isParticipant = userIdStr === studentIdStr || userIdStr === tutorIdStr || isAdmin;

    return res.status(200).json({
      success: true,
      isAccepted: validation.valid,
      isParticipant,
      status: booking.status,
      message: validation.valid ? "Session active" : validation.message,
      roomId: `room_${booking._id.toString()}`,
    });
  } catch (error) {
    console.error("Get Video Call Status Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.getVideoCallDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid video call session ID." });
    }

    const booking = await findBookingOrSchedule(bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Class session or booking request not found." });
    }

    const isAdmin = req.user?.role === "admin";
    const validation = validateSessionTimeAndStatus(booking, isAdmin);

    if (!validation.valid) {
      return res.status(403).json({
        success: false,
        message: validation.message,
        tooEarly: validation.tooEarly,
        tooLate: validation.tooLate,
      });
    }

    const userIdStr = (req.user?.id || req.user?._id || "").toString();
    const studentIdStr = (booking.student?._id || booking.student || "").toString();
    const tutorIdStr = (booking.tutor?._id || booking.tutor || "").toString();

    const isStudent = userIdStr === studentIdStr;
    const isTutor = userIdStr === tutorIdStr;

    if (!isStudent && !isTutor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized Access: You are not a participant in this video call session.",
      });
    }

    const peerUser = isStudent ? booking.tutor : booking.student;
    const peerRole = isStudent ? "Tutor" : "Student";
    const peerName = (peerUser && (peerUser.name || peerUser.email)) ? (peerUser.name || peerUser.email) : peerRole;
    const peerEmail = (peerUser && peerUser.email) ? peerUser.email : "";
    const peerId = (peerUser && (peerUser._id || peerUser.id)) ? (peerUser._id || peerUser.id).toString() : "";

    return res.status(200).json({
      success: true,
      bookingId: booking._id.toString(),
      roomId: `room_${booking._id.toString()}`,
      user: {
        id: req.user.id || req.user._id,
        name: req.user.name || req.user.email || "User",
        email: req.user.email || "",
        role: req.user.role || (isStudent ? "student" : "tutor"),
      },
      peerUser: {
        id: peerId,
        name: peerName,
        email: peerEmail,
        role: peerRole,
      },
      tutorProfile: booking.tutorProfile || {},
      isStudent,
    });
  } catch (error) {
    console.error("Get Video Call Details Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

exports.completeVideoCall = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid session ID." });
    }

    const schedule = await ClassSchedule.findById(bookingId);
    if (schedule) {
      schedule.status = "Completed";
      if (!schedule.attendance || schedule.attendance === "Pending") {
        schedule.attendance = "Present";
      }
      await schedule.save();

      if (schedule.booking) {
        await BookingRequest.findByIdAndUpdate(schedule.booking, { status: "Completed" });
      }

      return res.status(200).json({ success: true, message: "Demo class marked as Completed.", schedule });
    }

    const booking = await BookingRequest.findById(bookingId);
    if (booking) {
      booking.status = "Completed";
      await booking.save();
      await ClassSchedule.updateMany({ booking: booking._id }, { status: "Completed", attendance: "Present" });
      return res.status(200).json({ success: true, message: "Demo booking marked as Completed.", booking });
    }

    return res.status(404).json({ success: false, message: "Session not found." });
  } catch (err) {
    console.error("Complete Video Call Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

