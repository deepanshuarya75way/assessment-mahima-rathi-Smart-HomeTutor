const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const dns = require("dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const http = require("http");
const { Server } = require("socket.io");

const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db"); 

const authRoutes = require("./routes/authRoutes");
const authController = require("./controllers/authController");
const { requireAuth, authorizeRole } = require("./middleware/authMiddleware");

const studentRoutes = require("./routes/studentRoutes");
const tutorRoutes = require("./routes/tutorRoutes");
const contactRoutes = require("./routes/contactRoutes");
const newsletterRoutes = require("./routes/newsletterRoutes");
const chatRoutes = require("./routes/chatRoutes");
const adminRoutes = require("./routes/adminRoutes");
const parentRoutes = require("./routes/parentRoutes");
const videoCallRoutes = require("./routes/videoCallRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const couponRoutes = require("./routes/couponRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const aiRoutes = require("./routes/aiRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const contentRoutes = require("./routes/contentRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const Certificate = require("./models/Certificate");
const initVideoCallSocket = require("./utils/videoCallSocket");
const TutorProfile = require("./models/TutorProfile");
const Message = require("./models/Message");
const Review = require("./models/Review");
const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Initialize WebRTC Video Call Socket.IO Signaling Handlers
initVideoCallSocket(io);

const onlineUsers = new Map();

app.set("io", io);
app.set("onlineUsers", onlineUsers);

io.on("connection", (socket) => {
  console.log("🟢 User Connected:", socket.id);

  socket.on("join", (data) => {
    let userId, role;
    if (typeof data === "object" && data !== null) {
      userId = data.userId;
      role = data.role;
    } else {
      userId = data;
    }

    if (userId) {
      const uidStr = String(userId);
      onlineUsers.set(uidStr, socket.id);
      socket.join(uidStr);
      console.log(`🟢 ${uidStr} joined socket room`);
    }

    if (role) {
      const roleStr = String(role).toLowerCase();
      socket.join(roleStr);
      console.log(`🟢 Socket ${socket.id} joined role room: ${roleStr}`);
    }

    socket.join("all");
  });

  socket.on("typing", ({ recipientId, senderId, senderName }) => {
    const receiverSocketId = onlineUsers.get(recipientId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", { senderId, senderName });
    }
  });

  socket.on("stopTyping", ({ recipientId, senderId }) => {
    const receiverSocketId = onlineUsers.get(recipientId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStopTyping", { senderId });
    }
  });

  socket.on("sendMessage", async (data) => {
    try {
      const { senderId, recipientId, content, fileUrl, fileType, fileName } = data;
      if (!senderId || !recipientId) return;

      const messageDoc = await Message.create({
        sender: senderId,
        recipient: recipientId,
        content: content || "",
        fileUrl: fileUrl || "",
        fileType: fileType || "none",
        fileName: fileName || "",
        status: "sent",
      });

      const recipientSocketId = onlineUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receiveMessage", messageDoc);
      }
    } catch (err) {
      console.error("Socket sendMessage Error:", err);
    }
  });

  socket.on("markSeen", ({ senderId, recipientId }) => {
    const senderSocketId = onlineUsers.get(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesSeen", { seenBy: recipientId });
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    console.log("🔴 User Disconnected");
  });
});

app.set("io", io);
app.set("onlineUsers", onlineUsers);
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "HomeTutor_Secret_Key_2026";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../frontend/public")));
app.use("/uploads", express.static(path.join(__dirname, "../frontend/public/uploads")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Global middleware for ambient session identification & flash messages
app.use((req, res, next) => {
  res.locals.error = req.query.error || null;
  res.locals.message = req.query.message || null;
  res.locals.isAuth = false;
  res.locals.userRole = null;
  res.locals.userName = null;
  res.locals.userEmail = null;

  const token = req.cookies?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      let formattedName = decoded.name || decoded.email;
      if (formattedName && formattedName.includes('@')) {
        formattedName = formattedName.split('@')[0];
      }
      if (formattedName) {
        formattedName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
      }
      res.locals.isAuth = true;
      res.locals.userRole = decoded.role;
      res.locals.userName = formattedName;
      res.locals.userEmail = decoded.email;
      res.locals.userId = decoded.id;
      req.user = decoded;
    } catch (err) {
      res.clearCookie("token");
    }
  }
  next();
});

// Authentication API & Action Routes
const announcementRoutes = require("./routes/announcementRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const reportRoutes = require("./routes/reportRoutes");
const { initReportScheduler } = require("./services/reportScheduler");

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/tutor", tutorRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/coupon", couponRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/devices",deviceRoutes);

// Start Automated 30-Day Progress Report Background Scheduler Service
initReportScheduler();

// Backend Health Check Endpoint for Render & Monitoring
app.get(["/health", "/api/health"], (req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "Smart HomeTutor API",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Public Academic Subjects & Boards Catalog Endpoint
const adminController = require("./controllers/adminController");
app.get("/api/subjects", adminController.getSubjects);

// Public Certificate Verification Endpoint
app.get("/api/certificates/:certId", async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certificateId: req.params.certId.toUpperCase() })
      .populate("student", "name email")
      .populate("tutor", "name email");

    if (!cert) {
      return res.status(404).json({ success: false, message: "Certificate not found." });
    }

    return res.status(200).json({ success: true, certificate: cert });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.use("/api/video-call", videoCallRoutes);
app.post("/login", authController.login);
app.post("/signup", authController.signup);
app.get("/logout", authController.logout);

// Public View Routes
app.get(["/", "/about", "/privacy-policy", "/terms-of-service", "/forgot-password", "/verify-otp", "/video-call", "/video-call/:bookingId", "/blog/:idOrSlug", "/blogs", "/find", "/contact", "/subjects", "/subjects/:subjectSlug", "/tutor", "/tutor/:id", "/tutr", "/become-a-tutor", "/login", "/signup", "/admin-panel"], (req, res) => {
  if ((req.path === "/login" || req.path === "/signup") && res.locals.isAuth && res.locals.userRole) {
    return res.redirect(`/dashboard/${res.locals.userRole}`);
  }
  if (req.path === "/admin-panel" && res.locals.isAuth && res.locals.userRole === "admin") {
    return res.redirect("/dashboard/admin");
  }
  res.render("index");
});

app.get("/subjects", (req, res) => {
  res.render("index");
});

app.get("/subjects/:subjectSlug", (req, res) => {
  res.render("index");
});

app.get("/contact", (req, res) => {
  res.render("index");
});

app.get("/verify-otp", (req, res) => {
  res.render("index");
});

// DASHBOARD HUB & DASHBOARD PANEL ROUTES
app.get("/dashboard", requireAuth, (req, res) => {
  if (req.user && req.user.role) {
    return res.redirect(`/dashboard/${req.user.role}`);
  }
  return res.redirect("/login?message=" + encodeURIComponent("Please log in to access your dashboard."));
});

app.get(["/dashboard/student", "/student-dashboard"], requireAuth, authorizeRole("student"), (req, res) => {
  res.render("index");
});

app.get(["/dashboard/tutor", "/tutor-dashboard"], requireAuth, authorizeRole("tutor"), (req, res) => {
  res.render("index");
});

app.get(["/dashboard/admin", "/admin-dashboard"], requireAuth, authorizeRole("admin"), (req, res) => {
  res.render("index");
});

app.get(["/dashboard/parent", "/parent-dashboard"], requireAuth, authorizeRole("parent"), (req, res) => {
  res.render("index");
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render("index");
});
const seedAdminAccount = require("./utils/seedAdmin");
const { initFeeReminderScheduler } = require("./utils/feeReminderScheduler");
const { initClassReminderScheduler } = require("./utils/classReminderScheduler");

const startServer = async () => {
  try {
    await connectDB();
    await seedAdminAccount();
    initFeeReminderScheduler(app);
    initClassReminderScheduler(app);

    server.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
  }
};

startServer();