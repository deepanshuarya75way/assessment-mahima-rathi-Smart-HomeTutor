const jwt = require("jsonwebtoken");
const { logUserActivity } = require("../utils/activityLogHelper");

const getJwtSecret = () => process.env.JWT_SECRET || "HomeTutor_Secret_Key_2026";

// Middleware to verify JWT authentication token
exports.requireAuth = async (req, res, next) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes("json")) || req.headers["content-type"]?.includes("json")) {
      return res.status(401).json({ success: false, message: "Authentication required. Please log in." });
    }
    return res.redirect("/login?error=" + encodeURIComponent("Authentication required. Please select your role and log in to access your dashboard."));
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    // Import User model to verify account status
    const User = require("../models/User");
    const dbUser = await User.findById(decoded.id).select("accountStatus name email role");

    if (dbUser && dbUser.accountStatus === "Discontinued") {
      res.clearCookie("token");
      const discMsg = "Your account has been discontinued. Please contact support if you believe this is an error.";
      if (req.xhr || (req.headers.accept && req.headers.accept.includes("json")) || req.headers["content-type"]?.includes("json")) {
        return res.status(401).json({ success: false, message: discMsg });
      }
      return res.redirect("/login?message=" + encodeURIComponent(discMsg));
    }

    let formattedName = decoded.name || decoded.email;
    if (formattedName && formattedName.includes('@')) {
      formattedName = formattedName.split('@')[0];
    }
    if (formattedName) {
      formattedName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
    }
    req.user = decoded; // { id, email, name, role }
    if (!res.locals) res.locals = {};
    res.locals.isAuth = true;
    res.locals.userRole = decoded.role;
    res.locals.userName = formattedName;
    res.locals.userEmail = decoded.email;
    res.locals.userId = decoded.id;
    next();
  } catch (error) {
    logUserActivity({
      action: `Invalid or expired JWT token attempt on ${req.originalUrl || req.url}`,
      ipAddress: req.ip,
      severity: "critical",
      category: "security",
    }).catch(() => {});

    res.clearCookie("token");
    if (req.xhr || (req.headers.accept && req.headers.accept.includes("json")) || req.headers["content-type"]?.includes("json")) {
      return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    }
    return res.redirect("/login?error=" + encodeURIComponent("Session expired. Please log in again."));
  }
};

exports.authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      if (req.xhr || (req.headers.accept && req.headers.accept.includes("json")) || req.headers["content-type"]?.includes("json")) {
        return res.status(401).json({ success: false, message: "Please log in to continue." });
      }
      return res.redirect("/login?error=" + encodeURIComponent("Please log in to continue."));
    }

    if (!roles.includes(req.user.role)) {
      const allowedRoleName = roles[0].toUpperCase();
      const currentRoleName = req.user.role.toUpperCase();
      const errorMessage = `Access Denied: You are logged in as ${currentRoleName}. You do not have permission to access the ${allowedRoleName} Dashboard.`;

      logUserActivity({
        userId: req.user.id,
        userEmail: req.user.email,
        action: `Unauthorized access attempt (403): ${currentRoleName} attempted to access ${allowedRoleName} route ${req.originalUrl || req.url}`,
        ipAddress: req.ip,
        severity: "critical",
        category: "security",
      }).catch(() => {});

      if (req.xhr || (req.headers.accept && req.headers.accept.includes("json")) || req.headers["content-type"]?.includes("json")) {
        return res.status(403).json({ success: false, message: errorMessage });
      }
      return res.redirect(`/dashboard/${req.user.role}?error=` + encodeURIComponent(errorMessage));
    }

    next();
  };
};

exports.requireApprovedTutor = async (req, res, next) => {
  if (!req.user) {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes("json")) || req.headers["content-type"]?.includes("json")) {
      return res.status(401).json({ success: false, message: "Please log in to continue." });
    }
    return res.redirect("/login?error=" + encodeURIComponent("Please log in to continue."));
  }

  if (req.user.role === "tutor") {
    try {
      const User = require("../models/User");
      const user = await User.findById(req.user.id);
      
      // Fallback synchronization if user.tutorStatus is not set
      if (user && user.tutorStatus !== "approved") {
        const TutorProfile = require("../models/TutorProfile");
        const profile = await TutorProfile.findOne({ user: user._id });
        if (profile) {
          if (profile.registrationStatus === "Approved") {
            user.tutorStatus = "approved";
            await user.save();
          } else if (profile.registrationStatus === "Pending") {
            user.tutorStatus = "pending";
            await user.save();
          } else if (profile.registrationStatus === "Rejected") {
            user.tutorStatus = "rejected";
            await user.save();
          }
        }
      }

      if (!user || user.tutorStatus !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Tutor approval is required to access this feature.",
          tutorStatus: user ? user.tutorStatus : "not_applied",
        });
      }
    } catch (err) {
      console.error("requireApprovedTutor Middleware Error:", err);
      return res.status(500).json({ success: false, message: "Server error verifying tutor approval status." });
    }
  }

  next();
};

