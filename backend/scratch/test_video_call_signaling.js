const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const ioClient = require("socket.io-client");

const User = require("../models/User");
const TutorProfile = require("../models/TutorProfile");
const BookingRequest = require("../models/BookingRequest");
const ClassSchedule = require("../models/ClassSchedule");
const initVideoCallSocket = require("../utils/videoCallSocket");

async function runVideoCallSignalingTest() {
  console.log("Starting Video Call Signaling Integration Test...");
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/internn";
  await mongoose.connect(mongoUri);

  // Start temporary test HTTP + Socket.IO server on port 5055
  const server = http.createServer();
  const io = new Server(server, { cors: { origin: "*" } });

  const onlineUsers = new Map();
  io.on("connection", (socket) => {
    socket.on("join", (data) => {
      let userId = typeof data === "object" && data !== null ? data.userId : data;
      if (userId) {
        const uidStr = String(userId);
        onlineUsers.set(uidStr, socket.id);
        socket.join(uidStr);
      }
    });
  });

  initVideoCallSocket(io);

  await new Promise((resolve) => server.listen(5055, resolve));
  console.log("Test Socket.IO Server running on port 5055");

  // 1. Setup Test Users
  let student = await User.findOne({ email: "vcall_student_test@example.com" });
  if (!student) {
    student = await User.create({
      name: "VCall Student",
      email: "vcall_student_test@example.com",
      password: "password123",
      role: "student",
      isVerified: true
    });
  }

  let tutor = await User.findOne({ email: "vcall_tutor_test@example.com" });
  if (!tutor) {
    tutor = await User.create({
      name: "VCall Tutor",
      email: "vcall_tutor_test@example.com",
      password: "password123",
      role: "tutor",
      isVerified: true
    });
  }

  // 2. Setup Confirmed Booking Request
  let booking = await BookingRequest.findOne({ student: student._id, tutor: tutor._id });
  if (!booking) {
    booking = await BookingRequest.create({
      student: student._id,
      tutor: tutor._id,
      subject: "Advanced Mathematics",
      status: "Confirmed",
      adminApproved: true,
      tutorApproved: true,
      classType: "demo"
    });
  } else {
    booking.status = "Confirmed";
    booking.adminApproved = true;
    booking.tutorApproved = true;
    await booking.save();
  }

  const serverUrl = "http://localhost:5055";

  console.log(`\n--- Connecting Sockets to ${serverUrl} ---`);

  // Connect Student Socket
  const studentSocket = ioClient(serverUrl, {
    transports: ["websocket"],
    forceNew: true,
  });

  // Connect Tutor Socket
  const tutorSocket = ioClient(serverUrl, {
    transports: ["websocket"],
    forceNew: true,
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const studentIdStr = student._id.toString();
  const tutorIdStr = tutor._id.toString();
  const bookingIdStr = booking._id.toString();

  console.log(`Student ID: ${studentIdStr}`);
  console.log(`Tutor ID: ${tutorIdStr}`);
  console.log(`Booking ID: ${bookingIdStr}`);

  // Emit Join events from both using object payload (simulating real frontend)
  studentSocket.emit("join", { userId: studentIdStr, role: "student" });
  tutorSocket.emit("join", { userId: tutorIdStr, role: "tutor" });

  await new Promise((resolve) => setTimeout(resolve, 500));

  let incomingCallReceived = false;
  let callAckReceived = false;
  let callAcceptedReceived = false;

  studentSocket.on("incoming-video-call", (payload) => {
    console.log("\n✅ [STUDENT CLIENT] Received incoming-video-call event!");
    console.log("Payload:", payload);
    if (payload.bookingId === bookingIdStr && payload.callerName) {
      incomingCallReceived = true;
      // Step 2: Accept the call
      console.log("[STUDENT CLIENT] Emitting accept-video-call...");
      studentSocket.emit("accept-video-call", { bookingId: bookingIdStr });
    }
  });

  tutorSocket.on("call-initiated-ack", (ack) => {
    console.log("\n✅ [TUTOR CLIENT] Received call-initiated-ack!");
    console.log("Ack:", ack);
    if (ack.success) {
      callAckReceived = true;
    }
  });

  tutorSocket.on("call-accepted", (data) => {
    console.log("\n✅ [TUTOR CLIENT] Received call-accepted event!");
    console.log("Data:", data);
    if (data.bookingId === bookingIdStr) {
      callAcceptedReceived = true;
    }
  });

  console.log("\n--- TUTOR INITIATES VIDEO CALL ---");
  tutorSocket.emit("initiate-video-call", {
    bookingId: bookingIdStr,
    callerId: tutorIdStr,
    callerName: tutor.name,
    callerRole: "Tutor"
  });

  let joinVideoRoomSuccess = false;
  studentSocket.on("room-joined", (roomData) => {
    console.log("\n✅ [STUDENT CLIENT] Successfully joined WebRTC video room:", roomData);
    if (roomData && roomData.roomId === `room_${bookingIdStr}`) {
      joinVideoRoomSuccess = true;
    }
  });

  studentSocket.on("video-error", (errData) => {
    console.error("\n❌ [STUDENT CLIENT] Received video-error:", errData);
  });

  console.log("\n--- STUDENT JOINS WEBRTC VIDEO ROOM ---");
  studentSocket.emit("join-video-room", {
    bookingId: bookingIdStr,
    userId: studentIdStr,
    userName: student.name,
    userRole: "student"
  });

  // Wait for events to complete
  await new Promise((resolve) => setTimeout(resolve, 3000));

  studentSocket.close();
  tutorSocket.close();
  server.close();
  await mongoose.disconnect();

  console.log("\n--- TEST SUMMARY ---");
  console.log(`1. Tutor Call Ack Received: ${callAckReceived ? 'PASSED' : 'FAILED'}`);
  console.log(`2. Student Received Incoming Call Notification: ${incomingCallReceived ? 'PASSED' : 'FAILED'}`);
  console.log(`3. Tutor Received Call Accepted Notification: ${callAcceptedReceived ? 'PASSED' : 'FAILED'}`);
  console.log(`4. Student WebRTC Room Join ("Confirmed" status): ${joinVideoRoomSuccess ? 'PASSED' : 'FAILED'}`);

  if (incomingCallReceived && callAckReceived && callAcceptedReceived && joinVideoRoomSuccess) {
    console.log("\n🎉 ALL VIDEO CALL SIGNALING & ROOM JOIN TESTS PASSED CLEANLY!");
    process.exit(0);
  } else {
    console.error("\n❌ VIDEO CALL TEST FAILED.");
    process.exit(1);
  }
}

runVideoCallSignalingTest().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
