const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Referral = require("../models/Referral");
const { logUserActivity } = require("../utils/activityLogHelper");
const { createNotification } = require("../utils/notificationHelper");
const { sendVerificationEmail, sendPasswordResetEmail, isValidEmailFormat } = require("../utils/sendEmail");

const getJwtSecret = () => process.env.JWT_SECRET || "HomeTutor_Secret_Key_2026";
const sendTokenResponse = (user, statusCode, req, res) => {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name || user.email.split("@")[0],
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: "1d" }
  );

  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";

  const cookieOptions = {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  };

  res.cookie("token", token, cookieOptions);

  const redirectUrl = `/dashboard/${user.role}`;

  if (req.xhr || (req.headers.accept && req.headers.accept.includes("json")) || req.headers["content-type"]?.includes("json")) {
    return res.status(statusCode).json({
      success: true,
      message: "Authentication successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tutorStatus: user.role === "tutor" ? (user.tutorStatus || "not_applied") : undefined,
        referralCode: user.referralCode,
        walletBalance: user.walletBalance,
      },
      redirectUrl,
    });
  }

  return res.redirect(redirectUrl);
};

exports.signup = async (req, res) => {
  const isJsonRequest = req.xhr || (req.headers.accept && req.headers.accept.includes("json")) || req.headers["content-type"]?.includes("json");

  try {
    const { name, firstName, lastName, email, phone, password, role, referredBy, referralCode } = req.body;

    console.log(`📥 [REGISTRATION REQUEST] Incoming signup for email: ${email || "N/A"}, role: ${role || "student"}`);

    if (!email || !password) {
      const msg = "Please enter both email address and password.";
      if (isJsonRequest) return res.status(400).json({ success: false, message: msg });
      return res.redirect("/signup?error=" + encodeURIComponent(msg));
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    console.log(`📧 [REGISTRATION EMAIL] Normalized recipient: ${normalizedEmail}`);

    if (role && String(role).toLowerCase().trim() === "admin") {
      const msg = "Admin accounts cannot be created via public registration.";
      await logUserActivity({
        userEmail: normalizedEmail,
        action: `Unauthorized signup attempt with Admin role for ${normalizedEmail}`,
        ipAddress: req.ip,
        severity: "critical",
        category: "security",
      });
      if (isJsonRequest) return res.status(403).json({ success: false, message: msg });
      return res.redirect("/signup?error=" + encodeURIComponent(msg));
    }

    const requestedRole = role ? String(role).toLowerCase().trim() : "student";
    if (!["student", "tutor", "parent"].includes(requestedRole)) {
      const msg = "Invalid account role selected.";
      if (isJsonRequest) return res.status(400).json({ success: false, message: msg });
      return res.redirect("/signup?error=" + encodeURIComponent(msg));
    }
    if (!isValidEmailFormat(normalizedEmail)) {
      const msg = "Please enter a valid email address format.";
      if (isJsonRequest) return res.status(400).json({ success: false, message: msg });
      return res.redirect("/signup?error=" + encodeURIComponent(msg));
    }

    if (phone && !/^\d{10}$/.test(String(phone).trim())) {
      const msg = "Mobile number must contain exactly 10 digits.";
      if (isJsonRequest) return res.status(400).json({ success: false, message: msg });
      return res.redirect("/signup?error=" + encodeURIComponent(msg));
    }

    let initialWallet = 0;
    let validReferredBy = "";
    let referralRewardStatus = "None";
    const rawReferral = (referredBy || referralCode || (req.query && req.query.ref) || "").trim().toUpperCase();

    if (rawReferral) {
      const referrer = await User.findOne({ referralCode: rawReferral });
      if (!referrer) {
        const msg = "Invalid referral code. Please check your code or leave it blank.";
        if (isJsonRequest) return res.status(400).json({ success: false, message: msg });
        return res.redirect("/signup?error=" + encodeURIComponent(msg));
      }

      if (referrer.email.toLowerCase().trim() === normalizedEmail) {
        const msg = "Self-referral is not allowed. Please enter a valid friend's referral code or leave it blank.";
        if (isJsonRequest) return res.status(400).json({ success: false, message: msg });
        return res.redirect("/signup?error=" + encodeURIComponent(msg));
      }

      validReferredBy = referrer.referralCode;
      referralRewardStatus = "Pending";
      initialWallet = 0;
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (existingUser.isVerified) {
        const msg = "User already exists. Please login.";
        if (isJsonRequest) return res.status(400).json({ success: false, message: msg });
        return res.redirect("/signup?error=" + encodeURIComponent(msg));
      } else {
        // Resend verification email for unverified user
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`🎲 [OTP GENERATED] Resend OTP code for unverified account: ${normalizedEmail}`);

        existingUser.otp = otpCode;
        existingUser.otpExpires = Date.now() + 10 * 60 * 1000;
        await existingUser.save();
        console.log(`💾 [OTP SAVED] Resend OTP saved to database for ${normalizedEmail}. Expiry: 10 minutes.`);

        try {
          console.log(`📤 [EMAIL SENDING STARTED] Sending verification email to ${normalizedEmail}...`);
          await sendVerificationEmail({ to: normalizedEmail, otp: otpCode, name: existingUser.name });
          console.log(`✅ [EMAIL SENDING SUCCESSFUL] OTP email delivered to ${normalizedEmail}.`);
        } catch (emailErr) {
          console.error(`❌ [EMAIL SERVICE ERROR] Failed to deliver OTP to ${normalizedEmail}:`, emailErr.message);
          const msg = "Failed to send verification email. Please check your email configuration or try again.";
          if (isJsonRequest) return res.status(500).json({ success: false, message: msg });
          return res.redirect("/signup?error=" + encodeURIComponent(msg));
        }

        const msg = `Verification email sent to ${normalizedEmail}! Please enter your OTP code to verify.`;
        if (isJsonRequest) {
          return res.status(200).json({
            success: true,
            message: msg,
            requiresVerification: true,
            email: normalizedEmail,
            redirectUrl: "/verify-otp?email=" + encodeURIComponent(normalizedEmail),
          });
        }
        return res.redirect("/verify-otp?email=" + encodeURIComponent(normalizedEmail) + "&message=" + encodeURIComponent(msg));
      }
    }

    let userFullName = (typeof name === "string" ? name : "").trim();
    if (!userFullName) {
      const fName = (typeof firstName === "string" ? firstName : "").trim();
      const lName = (typeof lastName === "string" ? lastName : "").trim();
      userFullName = `${fName} ${lName}`.trim();
    }
    if (!userFullName) {
      userFullName = normalizedEmail.split("@")[0];
    }

    const cleanPhone = typeof phone === "string" ? phone.trim() : String(phone || "").trim();

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    let newReferralCode = "REF-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      const checkRef = await User.findOne({ referralCode: newReferralCode });
      if (!checkRef) {
        isUnique = true;
      } else {
        newReferralCode = "REF-" + crypto.randomBytes(3).toString("hex").toUpperCase();
        attempts++;
      }
    }

    const user = await User.create({
      name: userFullName,
      email: normalizedEmail,
      phone: cleanPhone,
      password: hashedPassword,
      role: requestedRole,
      tutorStatus: requestedRole === "tutor" ? "not_applied" : undefined,
      walletBalance: initialWallet,
      referralCode: newReferralCode,
      referredBy: validReferredBy,
      referralRewardStatus: referralRewardStatus,
      isVerified: false,
      otp: otpCode,
      otpExpires: Date.now() + 10 * 60 * 1000,
    });

    console.log(`💾 [OTP SAVED] User record created and OTP saved in database for ${normalizedEmail}. Expiry: 10 minutes.`);

    try {
      console.log(`📤 [EMAIL SENDING STARTED] Sending verification email to ${normalizedEmail}...`);
      await sendVerificationEmail({ to: normalizedEmail, otp: otpCode, name: userFullName });
      console.log(`✅ [EMAIL SENDING SUCCESSFUL] OTP email delivered to ${normalizedEmail}.`);
    } catch (emailDeliveryErr) {
      console.error(`❌ [EMAIL SERVICE ERROR] Delivery failed for ${normalizedEmail}:`, emailDeliveryErr.message);
      const msg = "Failed to send verification email. Please try again.";
      if (isJsonRequest) return res.status(500).json({ success: false, message: msg });
      return res.redirect("/signup?error=" + encodeURIComponent(msg));
    }

    if (validReferredBy) {
      try {
        const referrerObj = await User.findOne({ referralCode: validReferredBy });
        if (referrerObj) {
          await Referral.create({
            referrer: referrerObj._id,
            referredUser: user._id,
            referredRole: (user.role || "student").toLowerCase(),
            referralCode: validReferredBy,
            signupDate: new Date(),
            rewardStatus: "Pending",
            rewardAmount: 0,
          });
          console.log(`🎁 [REFERRAL RECORD CREATED] Linked ${user.email} (${user.role}) to referrer ${referrerObj.email}`);
        }
      } catch (refErr) {
        console.error("Error creating Referral record on signup:", refErr.message);
      }
    }

    if (initialWallet > 0) {
      await Transaction.create({
        user: user._id,
        type: "Credit",
        amount: 50,
        description: `Welcome Bonus for using referral code ${validReferredBy}`,
        status: "Completed",
      });
    }

    await logUserActivity(user._id, `User initiated registration. Verification email sent to ${normalizedEmail}`, req.ip);

    const successMsg = `Verification email sent successfully to ${normalizedEmail}! Please enter your 6-digit OTP code below to verify your account.`;
    if (isJsonRequest) {
      return res.status(201).json({
        success: true,
        message: successMsg,
        requiresVerification: true,
        email: normalizedEmail,
        redirectUrl: "/verify-otp?email=" + encodeURIComponent(normalizedEmail),
      });
    }

    return res.redirect("/verify-otp?email=" + encodeURIComponent(normalizedEmail) + "&message=" + encodeURIComponent(successMsg));

  } catch (error) {
    console.error("❌ [SIGNUP ERROR]:", error.message || error);
    const msg = error.message || "Registration failed due to a server error. Please try again.";
    if (isJsonRequest) return res.status(500).json({ success: false, message: msg });
    return res.redirect("/signup?error=" + encodeURIComponent(msg));
  }
};

exports.login = async (req, res) => {
  const isJsonRequest = Boolean(
    req.xhr ||
    (req.headers && req.headers.accept && req.headers.accept.includes("json")) ||
    (req.headers && req.headers["content-type"]?.includes("json"))
  );

  try {
    const { email, password, role } = req.body || {};

    if (!email || !password || !role) {
      const msg = "Please enter email, password and select your role.";
      if (isJsonRequest) return res.status(400).json({ success: false, message: msg });
      return res.redirect("/login?error=" + encodeURIComponent(msg));
    }

    const rawEmail = typeof email === "string" ? email : String(email || "");
    const rawPassword = typeof password === "string" ? password : String(password || "");
    const rawRole = typeof role === "string" ? role : String(role || "");

    const normalizedEmail = rawEmail.toLowerCase().trim();
    const selectedRole = rawRole.toLowerCase().trim();

    if (!normalizedEmail || !rawPassword || !selectedRole) {
      const msg = "Please enter email, password and select your role.";
      if (isJsonRequest) return res.status(400).json({ success: false, message: msg });
      return res.redirect("/login?error=" + encodeURIComponent(msg));
    }

    if (selectedRole === "admin") {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user || user.role !== "admin") {
        const msg = "Invalid admin credentials.";
        await logUserActivity({
          userId: user ? user._id : null,
          userEmail: normalizedEmail,
          action: `Failed admin login attempt (${normalizedEmail})`,
          ipAddress: req.ip,
          severity: "critical",
          category: "security",
        });
        if (isJsonRequest) return res.status(403).json({ success: false, message: msg });
        return res.redirect("/login?error=" + encodeURIComponent(msg));
      }

      let isMatch = false;
      try {
        isMatch = await bcrypt.compare(rawPassword, user.password || "");
      } catch (bcryptErr) {
        console.error("Bcrypt compare error (admin):", bcryptErr);
        isMatch = false;
      }

      if (!isMatch) {
        const msg = "Invalid admin credentials.";
        await logUserActivity({
          userId: user._id,
          userEmail: user.email,
          action: `Failed admin login attempt (incorrect password for ${user.email})`,
          ipAddress: req.ip,
          severity: "critical",
          category: "security",
        });
        if (isJsonRequest) return res.status(403).json({ success: false, message: msg });
        return res.redirect("/login?error=" + encodeURIComponent(msg));
      }

      await logUserActivity({
        userId: user._id,
        userEmail: user.email,
        action: `Admin logged in successfully (${user.email})`,
        ipAddress: req.ip,
        severity: "info",
        category: "auth",
      });

      return sendTokenResponse(user, 200, req, res);
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const msg = "No account found with this email.";
      await logUserActivity({ userEmail: normalizedEmail, action: `Failed login attempt (unregistered email: ${normalizedEmail})`, ipAddress: req.ip, severity: "warning", category: "auth" });
      if (isJsonRequest) return res.status(401).json({ success: false, message: msg });
      return res.redirect("/login?error=" + encodeURIComponent(msg));
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(rawPassword, user.password || "");
    } catch (bcryptErr) {
      console.error("Bcrypt compare error:", bcryptErr);
      isMatch = false;
    }

    if (!isMatch) {
      const msg = "Invalid password.";
      await logUserActivity({ userId: user._id, userEmail: user.email, action: `Failed login attempt (incorrect password for ${user.email})`, ipAddress: req.ip, severity: "warning", category: "auth" });
      if (isJsonRequest) return res.status(401).json({ success: false, message: msg });
      return res.redirect("/login?error=" + encodeURIComponent(msg));
    }

    if (user.accountStatus === "Discontinued") {
      const msg = "Your account has been discontinued. Please contact support if you believe this is an error.";
      await logUserActivity({ userId: user._id, userEmail: user.email, action: `Failed login attempt (discontinued account)`, ipAddress: req.ip, severity: "warning", category: "auth" });
      if (isJsonRequest) return res.status(403).json({ success: false, message: msg });
      return res.redirect("/login?error=" + encodeURIComponent(msg));
    }

    if (user.role !== selectedRole) {
      const msg = `This account is registered as ${user.role}.`;
      await logUserActivity({ userId: user._id, userEmail: user.email, action: `Failed login attempt (role mismatch: attempted ${selectedRole}, actual ${user.role})`, ipAddress: req.ip, severity: "warning", category: "auth" });
      if (isJsonRequest) return res.status(403).json({ success: false, message: msg });
      return res.redirect("/login?error=" + encodeURIComponent(msg));
    }

    if (!user.isVerified) {
      const msg = "Please verify your email address before logging in.";
      await logUserActivity({ userId: user._id, userEmail: user.email, action: `Failed login attempt (unverified email)`, ipAddress: req.ip, severity: "warning", category: "auth" });
      if (isJsonRequest) {
        return res.status(403).json({
          success: false,
          message: msg,
          requiresVerification: true,
          email: user.email,
        });
      }
      return res.redirect("/login?error=" + encodeURIComponent(msg) + "&unverifiedEmail=" + encodeURIComponent(user.email));
    }

    await logUserActivity({ userId: user._id, userEmail: user.email, action: "User logged in successfully", ipAddress: req.ip, severity: "info", category: "auth" });

    return sendTokenResponse(user, 200, req, res);

  } catch (error) {
    console.error("Login Error:", error);
    const msg = "Login failed due to a server error. Please try again.";
    if (isJsonRequest) return res.status(500).json({ success: false, message: msg });
    return res.redirect("/login?error=" + encodeURIComponent(msg));
  }
};

exports.logout = async (req, res) => {
  if (req.user && req.user.id) {
    await logUserActivity({ userId: req.user.id, action: "User logged out", ipAddress: req.ip, severity: "info", category: "auth" });
  }
  res.clearCookie("token", { path: "/" });
  if (req.xhr || req.headers["content-type"]?.includes("json")) {
    return res.status(200).json({ success: true, message: "Logged out successfully" });
  }
  return res.redirect("/login?message=" + encodeURIComponent("You have been logged out successfully."));
};


exports.updateLanguage = async (req, res) => {
  try {
    const { language } = req.body;
    if (!language) {
      return res.status(400).json({ success: false, message: "Language preference is required." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    user.preferredLanguage = language;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Preferred language updated to ${language}.`,
      preferredLanguage: user.preferredLanguage,
    });
  } catch (err) {
    console.error("Update Language Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(`📥 [SEND OTP REQUEST] Received OTP request for email: ${email || "N/A"}`);

    if (!email || !isValidEmailFormat(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email address." });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🎲 [OTP GENERATED] Resend OTP generated for ${normalizedEmail}.`);

    user.otp = otpCode;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    await user.save();
    console.log(`💾 [OTP SAVED] Resend OTP saved to database for ${normalizedEmail}. Expiry: 10 minutes.`);

    try {
      console.log(`📤 [EMAIL SENDING STARTED] Resending OTP email to ${normalizedEmail}...`);
      await sendVerificationEmail({ to: normalizedEmail, otp: otpCode, name: user.name });
      console.log(`✅ [EMAIL SENDING SUCCESSFUL] Resend OTP email delivered to ${normalizedEmail}.`);
    } catch (emailErr) {
      console.error(`❌ [EMAIL SERVICE ERROR] Resend OTP delivery failed for ${normalizedEmail}:`, emailErr.message);
      return res.status(500).json({ success: false, message: "Failed to send verification email. Please try again." });
    }

    return res.status(200).json({
      success: true,
      message: `Verification email sent successfully to ${user.email}.`,
    });
  } catch (err) {
    console.error("❌ [SEND OTP ERROR]:", err.message || err);
    return res.status(500).json({ success: false, message: err.message || "Server Error sending OTP." });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP code are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      email: normalizedEmail,
      otp: otp.toString().trim(),
      otpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification OTP code." });
    }

    user.isVerified = true;
    user.otp = "";
    user.otpExpires = null;
    await user.save();

    await logUserActivity(user._id, "Email address verified successfully", req.ip);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully! You can now log in.",
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    return res.status(500).json({ success: false, message: "Server Error verifying OTP." });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmailFormat(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid registered email address." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "No registered account found with this email address." });
    }

    // Generate secure 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetPasswordOtp = otpCode;
    user.resetPasswordOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendPasswordResetEmail({ to: normalizedEmail, otp: otpCode, name: user.name });
    } catch (emailErr) {
      console.error("Password reset email delivery error:", emailErr);
      return res.status(500).json({ success: false, message: "Failed to send password reset OTP. Please check email address or SMTP configuration." });
    }

    await logUserActivity(user._id, `Password reset OTP requested for ${normalizedEmail}`, req.ip);

    return res.status(200).json({
      success: true,
      message: `Password reset OTP code has been sent to ${user.email}.`,
      email: normalizedEmail,
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ success: false, message: "Server Error processing forgot password request." });
  }
};

exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and 6-digit OTP code are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: "No registered account found with this email address." });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.toString().trim()) {
      return res.status(400).json({ success: false, message: "Invalid 6-digit password reset OTP code." });
    }

    if (!user.resetPasswordOtpExpiry || new Date(user.resetPasswordOtpExpiry).getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: "Password reset OTP has expired. Please request a new code." });
    }

    return res.status(200).json({
      success: true,
      message: "OTP code verified successfully! Please enter your new password below.",
      email: normalizedEmail,
    });
  } catch (err) {
    console.error("Verify Reset OTP Error:", err);
    return res.status(500).json({ success: false, message: "Server Error verifying password reset OTP." });
  }
};
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, resetToken, newPassword } = req.body;
    const targetEmail = email ? email.toLowerCase().trim() : null;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long." });
    }

    let user = null;

    if (targetEmail && otp) {
      user = await User.findOne({ email: targetEmail });

      if (!user) {
        return res.status(404).json({ success: false, message: "No registered account found with this email address." });
      }

      if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.toString().trim()) {
        return res.status(400).json({ success: false, message: "Invalid 6-digit reset OTP code." });
      }

      if (!user.resetPasswordOtpExpiry || new Date(user.resetPasswordOtpExpiry).getTime() <= Date.now()) {
        return res.status(400).json({ success: false, message: "Password reset OTP has expired. Please request a new code." });
      }
    } else if (resetToken) {
      user = await User.findOne({
        resetPasswordToken: resetToken,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({ success: false, message: "Invalid or expired reset token." });
      }
    } else {
      return res.status(400).json({ success: false, message: "Email, OTP, and new password are required." });
    }

    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: "New password must be different from your previous password.",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordOtp = "";
    user.resetPasswordOtpExpiry = null;
    user.resetPasswordToken = "";
    user.resetPasswordExpires = null;
    await user.save();

    await logUserActivity(user._id, "Password reset completed successfully", req.ip);

    return res.status(200).json({
      success: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.status(500).json({ success: false, message: "Server Error resetting password." });
  }
};