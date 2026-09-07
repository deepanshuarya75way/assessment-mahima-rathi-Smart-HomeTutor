
const BookingRequest = require("../models/BookingRequest");
const ClassSchedule = require("../models/ClassSchedule");
const { parseScheduleTime, format12HourTime } = require("./classReminderScheduler");
const activeCalls = new Map();
const userSockets = new Map();

async function findBookingOrScheduleSocket(bIdStr) {
  if (!bIdStr) return null;
  const mongoose = require("mongoose");
  if (!mongoose.Types.ObjectId.isValid(bIdStr)) return null;

  let booking = await BookingRequest.findById(bIdStr)
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

  const schedule = await ClassSchedule.findById(bIdStr)
    .populate("student", "name email role")
    .populate("tutor", "name email role");

  if (schedule) {
    const studentObj = (schedule.student && typeof schedule.student === "object")
      ? schedule.student
      : { _id: schedule.student, name: "Student", email: "", role: "student" };

    const tutorObj = (schedule.tutor && typeof schedule.tutor === "object")
      ? schedule.tutor
      : { _id: schedule.tutor, name: "Tutor", email: "", role: "tutor" };

    booking = {
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
      tutorProfile: { subjects: [schedule.subject || "Tuition Session"] },
      subject: schedule.subject || "Tuition Session",
      mode: schedule.mode || "Online",
    };
    return booking;
  }
  return null;
}

function validateSocketSessionTime(booking) {
  if (!booking) return { valid: false, message: "Class session not found." };

  const inactiveStatuses = ["Completed", "Cancelled", "Rejected", "Rejected by Admin", "Rejected by Tutor", "Discontinued", "Missed"];
  if (inactiveStatuses.includes(booking.status)) {
    return {
      valid: false,
      message: booking.status === "Completed"
        ? "This demo class session has already completed."
        : `This class session is no longer active (${booking.status}).`,
    };
  }

  const validStatuses = ["Accepted", "Confirmed", "Approved", "Scheduled", "Rescheduled", "In Progress"];
  const isStatusValid = validStatuses.includes(booking.status) || (booking.adminApproved && booking.tutorApproved);
  if (!isStatusValid) {
    return { valid: false, message: "Video call is only available for active sessions or scheduled classes." };
  }

  const sessionDate = booking.date || booking.scheduledDate;
  const startTimeStr = booking.startTime || booking.scheduledStartTime;
  const endTimeStr = booking.endTime || booking.scheduledEndTime;

  if (sessionDate && startTimeStr) {
    const startDateTime = parseScheduleTime(sessionDate, startTimeStr);
    const endDateTime = endTimeStr ? parseScheduleTime(sessionDate, endTimeStr) : new Date(startDateTime.getTime() + 60 * 60 * 1000);
    const now = new Date();

    const joinWindowStart = new Date(startDateTime.getTime() - 15 * 60 * 1000);
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
        message: `This demo class is scheduled for ${formattedDate} at ${formattedStartTime}. You can join 15 minutes before the start time.`,
      };
    }

    if (now > joinWindowEnd) {
      return {
        valid: false,
        message: `The scheduled time for this class (${formattedDate} at ${formattedStartTime}) has passed.`,
      };
    }
  }

  return { valid: true };
}


function initVideoCallSocket(io) {

  function clearCallSession(bookingId, reason, ioInstance) {
    if (!bookingId) return;
    const bIdStr = bookingId.toString();
    const session = activeCalls.get(bIdStr);

    const eventName = (reason === "cancelled") 
      ? "call-cancelled" 
      : ((reason === "declined") 
          ? "call-declined" 
          : ((reason === "timeout") ? "call-timeout" : "call-ended"));

    const payload = { bookingId: bIdStr, reason: reason || "ended" };

    if (session) {
      if (session.timeoutTimer) {
        clearTimeout(session.timeoutTimer);
      }
      session.status = reason || "ended";
      ioInstance.to(`user_${session.callerId}`).emit(eventName, payload);
      ioInstance.to(`user_${session.recipientId}`).emit(eventName, payload);
      ioInstance.to(`room_${session.bookingId}`).emit(eventName, payload);
      
      activeCalls.delete(bIdStr);
      console.log(`🧹 [VideoCallSocket] Cleared active call session ${bIdStr} (Reason: ${reason})`);
    } else {
      
      ioInstance.to(`room_${bIdStr}`).emit(eventName, payload);
    }
  }

  io.on("connection", (socket) => {
    socket.on("join", (data) => {
      let uid = null;
      if (typeof data === "object" && data !== null) {
        if (data.userId) uid = String(data.userId);
      } else if (data) {
        uid = String(data);
      }

      if (uid && uid !== "[object Object]") {
        socket.userId = uid;
        socket.join(uid);
        socket.join(`user_${uid}`);

        if (!userSockets.has(uid)) {
          userSockets.set(uid, new Set());
        }
        userSockets.get(uid).add(socket.id);

        console.log(`👤 [VideoCallSocket] User ${uid} joined socket rooms: ${uid} & user_${uid} (Socket: ${socket.id})`);
      }
    });

    socket.on("register-user", (data) => {
      let uid = null;
      if (typeof data === "object" && data !== null) {
        if (data.userId) uid = String(data.userId);
      } else if (data) {
        uid = String(data);
      }

      if (uid && uid !== "[object Object]") {
        socket.userId = uid;
        socket.join(uid);
        socket.join(`user_${uid}`);

        if (!userSockets.has(uid)) {
          userSockets.set(uid, new Set());
        }
        userSockets.get(uid).add(socket.id);
      }
    });

    socket.on("check-active-call", ({ userId }) => {
      const uid = userId ? String(userId) : socket.userId;
      if (!uid) {
        socket.emit("active-call-status", { hasActiveCall: false });
        return;
      }

      let activeCall = null;
      for (const [bId, session] of activeCalls.entries()) {
        if (session.recipientId === uid && session.status === "calling") {
          activeCall = session;
          break;
        }
      }

      if (activeCall) {
        socket.emit("active-call-status", {
          hasActiveCall: true,
          call: {
            bookingId: activeCall.bookingId,
            callerId: activeCall.callerId,
            callerName: activeCall.callerName,
            callerRole: activeCall.callerRole,
            subject: activeCall.subject,
            status: activeCall.status
          }
        });
      } else {
        socket.emit("active-call-status", { hasActiveCall: false });
      }
    });

    socket.on("initiate-video-call", async ({ bookingId, callerId, callerName, callerRole }) => {
      try {
        if (!bookingId) {
          socket.emit("video-error", { message: "Booking ID is required." });
          return;
        }

        const bIdStr = bookingId.toString();

        // Clear any existing stale session for this booking
        if (activeCalls.has(bIdStr)) {
          const oldSession = activeCalls.get(bIdStr);
          if (oldSession && oldSession.timeoutTimer) clearTimeout(oldSession.timeoutTimer);
          activeCalls.delete(bIdStr);
        }

        const booking = await findBookingOrScheduleSocket(bIdStr);
        const validation = validateSocketSessionTime(booking);

        if (!booking || !validation.valid) {
          socket.emit("video-error", { message: validation.message || "Video call is unavailable for this session." });
          return;
        }

        let callerIdStr = "";
        if (callerId) {
          callerIdStr = String(callerId);
        } else if (socket.userId && socket.userId !== "[object Object]") {
          callerIdStr = String(socket.userId);
        } else if (booking.tutor && booking.tutor._id) {
          callerIdStr = booking.tutor._id.toString();
        }

        const studentIdStr = booking.student?._id ? booking.student._id.toString() : String(booking.student);
        const tutorIdStr = booking.tutor?._id ? booking.tutor._id.toString() : String(booking.tutor);

        const isCallerStudent = studentIdStr === callerIdStr;
        const recipientUser = isCallerStudent ? booking.tutor : booking.student;
        const recipientIdStr = isCallerStudent ? tutorIdStr : studentIdStr;

        const subject = (booking.tutorProfile && booking.tutorProfile.subjects && booking.tutorProfile.subjects.length) 
          ? booking.tutorProfile.subjects.join(", ") 
          : (booking.subject || "Tuition Session");

        const resolvedCallerName = callerName || (isCallerStudent ? (booking.student?.name || "Student") : (booking.tutor?.name || "Tutor"));
        const resolvedCallerRole = callerRole || (isCallerStudent ? "Student" : "Tutor");

        const roomId = `room_${bIdStr}`;
        socket.join(roomId);
        socket.videoRoomId = roomId;
        socket.videoUserId = callerIdStr;

        const timeoutTimer = setTimeout(() => {
          if (activeCalls.has(bIdStr) && activeCalls.get(bIdStr).status === "calling") {
            console.log(`⏰ [Video Call] Call ${bIdStr} timed out (30s elapsed).`);
            clearCallSession(bIdStr, "timeout", io);
          }
        }, 30000);

        const newSession = {
          bookingId: bIdStr,
          callerId: callerIdStr,
          callerName: resolvedCallerName,
          callerRole: resolvedCallerRole,
          recipientId: recipientIdStr,
          recipientName: recipientUser?.name || "User",
          subject,
          status: "calling",
          callerSocketId: socket.id,
          createdAt: Date.now(),
          timeoutTimer,
        };

        activeCalls.set(bIdStr, newSession);

        const isRecipientOnline = (userSockets.has(recipientIdStr) && userSockets.get(recipientIdStr).size > 0) ||
                                  (io.sockets.adapter.rooms.has(recipientIdStr) || io.sockets.adapter.rooms.has(`user_${recipientIdStr}`));

        console.log(`📞 [Video Call] Initiated call ${bIdStr} from ${resolvedCallerName} (${callerIdStr}) to ${recipientUser?.name || 'User'} (${recipientIdStr}). Recipient online: ${isRecipientOnline}`);

        const incomingCallPayload = {
          bookingId: bIdStr,
          callerId: callerIdStr,
          callerName: resolvedCallerName,
          callerRole: resolvedCallerRole,
          subject,
          roomId,
          timestamp: Date.now(),
          status: "calling",
        };

        // Emit call notifications to both user_recipientId and recipientId rooms for guaranteed delivery
        io.to(`user_${recipientIdStr}`).emit("incoming-video-call", incomingCallPayload);
        io.to(`user_${recipientIdStr}`).emit("incoming-call", incomingCallPayload);
        io.to(recipientIdStr).emit("incoming-video-call", incomingCallPayload);
        io.to(recipientIdStr).emit("incoming-call", incomingCallPayload);

        socket.emit("call-initiated-ack", {
          success: true,
          online: isRecipientOnline,
          recipientName: recipientUser?.name || "Student",
          bookingId: bIdStr
        });

      } catch (err) {
        console.error("Error initiating video call:", err);
        socket.emit("video-error", { message: "Server error while initiating call." });
      }
    });

    socket.on("accept-video-call", ({ bookingId }) => {
      if (!bookingId) return;
      const bIdStr = bookingId.toString();
      const session = activeCalls.get(bIdStr);

      if (session) {
        if (session.timeoutTimer) clearTimeout(session.timeoutTimer);
        session.status = "accepted";
      }

      console.log(`✅ [Video Call] Session ${bIdStr} ACCEPTED`);

      const roomId = `room_${bIdStr}`;
      if (session) {
        io.to(`user_${session.callerId}`).emit("call-accepted", { bookingId: bIdStr });
        io.to(`user_${session.recipientId}`).emit("call-accepted", { bookingId: bIdStr });
      }
      io.to(roomId).emit("call-accepted", { bookingId: bIdStr });
    });

    socket.on("decline-video-call", ({ bookingId }) => {
      if (!bookingId) return;
      console.log(`❌ [Video Call] Session ${bookingId} DECLINED`);
      clearCallSession(bookingId, "declined", io);
    });

    socket.on("cancel-video-call", ({ bookingId }) => {
      if (!bookingId) return;
      console.log(`🚫 [Video Call] Session ${bookingId} CANCELLED by caller`);
      clearCallSession(bookingId, "cancelled", io);
    });

    // Join Video Room (WebRTC Page)
    socket.on("join-video-room", async ({ bookingId, userId, userName, userRole }) => {
      try {
        const bIdStr = bookingId.toString();
        const booking = await findBookingOrScheduleSocket(bIdStr);
        const validation = validateSocketSessionTime(booking);

        if (!booking || !validation.valid) {
          socket.emit("video-error", { message: validation.message || "Class session is not active or scheduled." });
          return;
        }

        const studentIdStr = booking.student._id ? booking.student._id.toString() : booking.student.toString();
        const tutorIdStr = booking.tutor._id ? booking.tutor._id.toString() : booking.tutor.toString();

        const isStudent = studentIdStr === userId.toString();
        const isTutor = tutorIdStr === userId.toString();
        if (!isStudent && !isTutor) {
          socket.emit("video-error", { message: "Unauthorized call participant." });
          return;
        }

        const roomId = `room_${bIdStr}`;
        socket.videoRoomId = roomId;
        socket.videoUserId = userId.toString();
        socket.videoUserName = userName;

        socket.join(roomId);

        const roomMembers = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
        const peerCount = roomMembers.length;

        console.log(`📹 [WebRTC Signaling] User ${userName} joined room ${roomId}. Peers in room: ${peerCount}`);

        if (peerCount > 1) {
          socket.to(roomId).emit("peer-joined", {
            socketId: socket.id,
            userId: userId.toString(),
            userName,
            userRole,
            peerCount,
          });
        }

        socket.emit("room-joined", {
          roomId,
          peerCount,
        });

      } catch (err) {
        console.error("Error joining video room:", err);
      }
    });

    // WebRTC Offer/Answer/ICE relaying
    socket.on("webrtc-offer", ({ bookingId, offer, senderId }) => {
      const roomId = `room_${bookingId}`;
      socket.to(roomId).emit("webrtc-offer", { offer, senderId, socketId: socket.id });
    });

    socket.on("webrtc-answer", ({ bookingId, answer, senderId }) => {
      const roomId = `room_${bookingId}`;
      socket.to(roomId).emit("webrtc-answer", { answer, senderId, socketId: socket.id });
    });

    socket.on("webrtc-ice-candidate", ({ bookingId, candidate, senderId }) => {
      const roomId = `room_${bookingId}`;
      socket.to(roomId).emit("webrtc-ice-candidate", { candidate, senderId, socketId: socket.id });
    });

    socket.on("media-state-toggle", ({ bookingId, type, enabled, senderId }) => {
      const roomId = `room_${bookingId}`;
      socket.to(roomId).emit("peer-media-state-changed", { type, enabled, senderId });
    });

    // Leave Video Room / End Call
    socket.on("leave-video-room", ({ bookingId, userId }) => {
      if (!bookingId) return;
      console.log(`🚪 [Video Call] Session ${bookingId} ended by user ${userId}`);
      clearCallSession(bookingId, "ended", io);
    });

    // Disconnect Handler
    socket.on("disconnect", () => {
      if (socket.userId && userSockets.has(socket.userId)) {
        userSockets.get(socket.userId).delete(socket.id);
        if (userSockets.get(socket.userId).size === 0) {
          userSockets.delete(socket.userId);
        }
      }

      if (socket.videoRoomId) {
        const roomId = socket.videoRoomId;
        const bId = roomId.replace("room_", "");
        console.log(`🔴 [Video Call] Socket ${socket.id} disconnected from ${roomId}`);
        
        socket.to(roomId).emit("peer-disconnected", {
          userId: socket.videoUserId,
          reason: "Peer connection dropped.",
        });

        clearCallSession(bId, "ended", io);
      }
    });

  });
}

module.exports = initVideoCallSocket;
